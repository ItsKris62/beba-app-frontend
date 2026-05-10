"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Send, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { GuarantorLookup, type SelectedGuarantor } from "@/components/GuarantorLookup"
import { GuarantorRequestCard } from "@/components/GuarantorRequestCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, loansApi, memberApi, type Loan } from "@/lib/api-client"

const ACTIVE_GUARANTOR_STATUSES = new Set(["PENDING", "ACCEPTED"])

function getRequirements(loan: Loan) {
  const principal = Number(loan.principalAmount)
  const minGuarantors = loan.loanProduct?.minGuarantors ?? 0
  const maxGuarantors = loan.loanProduct?.maxGuarantors ?? 3
  const coverageRatio = Number(loan.loanProduct?.guarantorCoverageRatio ?? 1)
  const activeGuarantors = (loan.guarantors ?? []).filter((item) => ACTIVE_GUARANTOR_STATUSES.has(item.status))
  const activeCoverage = activeGuarantors.reduce((sum, item) => sum + Number(item.guaranteedAmount), 0)
  const requiredCoverage = principal * coverageRatio

  return {
    minGuarantors,
    maxGuarantors,
    activeCount: activeGuarantors.length,
    remainingSlots: Math.max(0, maxGuarantors - activeGuarantors.length),
    remainingCount: Math.max(0, minGuarantors - activeGuarantors.length),
    requiredCoverage,
    remainingCoverage: Math.max(0, requiredCoverage - activeCoverage),
  }
}

function InviteGuarantorsCard({ loan, onInvited }: { loan: Loan; onInvited: () => void }) {
  const [selected, setSelected] = React.useState<SelectedGuarantor[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const requirements = getRequirements(loan)
  const lookupCoverage = requirements.remainingCoverage > 0
    ? requirements.remainingCoverage
    : requirements.requiredCoverage

  const invite = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one guarantor to invite.")
      return
    }

    setSubmitting(true)
    try {
      const result = await memberApi.requestGuarantors(loan.id, selected.map((item) => item.memberId))
      if (!result.success) {
        throw new Error(result.error?.message ?? "Could not invite guarantors")
      }
      toast.success(`${result.data.invitedCount} guarantor request${result.data.invitedCount === 1 ? "" : "s"} sent.`)
      setSelected([])
      onInvited()
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? "Could not invite guarantors")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{loan.loanNumber}</CardTitle>
            <CardDescription>{loan.loanProduct?.name ?? "Loan"} - {formatCurrency(Number(loan.principalAmount))}</CardDescription>
          </div>
          <Badge variant="outline">{loan.status.replace(/_/g, " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Invite agreed guarantors</AlertTitle>
          <AlertDescription>
            Needs {requirements.minGuarantors} guarantor{requirements.minGuarantors === 1 ? "" : "s"}.
            Remaining slots: {requirements.remainingSlots}. Remaining coverage: {formatCurrency(requirements.remainingCoverage)}.
          </AlertDescription>
        </Alert>

        <GuarantorLookup
          requiredAmount={lookupCoverage}
          minGuarantors={Math.max(requirements.remainingCount, 1)}
          maxGuarantors={requirements.remainingSlots}
          loanProductId={loan.loanProductId}
          guarantors={selected}
          onAdd={(guarantor) => setSelected((current) => [...current, guarantor])}
          onRemove={(memberId) => setSelected((current) => current.filter((item) => item.memberId !== memberId))}
        />

        <Button type="button" onClick={invite} disabled={submitting || selected.length === 0}>
          <Send className="mr-2 h-4 w-4" />
          {submitting ? "Inviting..." : "Invite selected guarantors"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function MemberGuarantorsPage() {
  const requests = useQuery({
    queryKey: ["guarantor-requests"],
    queryFn: () => memberApi.getGuarantorRequests(),
    refetchInterval: 5000,
  })
  const loans = useQuery({
    queryKey: ["member-loans-for-guarantors"],
    queryFn: () => loansApi.getMyLoans({ limit: 50 }),
  })

  const incoming = requests.data?.success ? requests.data.data ?? [] : []
  const myLoans = loans.data?.success ? loans.data.data?.data ?? [] : []
  const invitables = myLoans.filter((loan) => {
    if (!["DRAFT", "PENDING_GUARANTORS"].includes(loan.status)) return false
    const requirements = getRequirements(loan)
    return requirements.minGuarantors > 0 && requirements.remainingSlots > 0
  })
  const loading = requests.isLoading || loans.isLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Guarantors</h1>
        <p className="text-muted-foreground">Respond to guarantor requests and invite agreed guarantors for your loans.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Requests for Me</CardTitle>
              <CardDescription>Loans where another member nominated you as guarantor.</CardDescription>
            </CardHeader>
            <CardContent>
              {incoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">You do not have pending guarantor requests.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {incoming.map((request) => (
                    <GuarantorRequestCard key={request.loanId} request={request} onSettled={() => requests.refetch()} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Invite Guarantors</h2>
              <p className="text-sm text-muted-foreground">
                Select guarantors who have agreed to support your draft or pending-guarantor loans.
              </p>
            </div>
            {invitables.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">
                  No loans currently need guarantor invitations.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {invitables.map((loan) => (
                  <InviteGuarantorsCard
                    key={loan.id}
                    loan={loan}
                    onInvited={() => {
                      loans.refetch()
                      requests.refetch()
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
