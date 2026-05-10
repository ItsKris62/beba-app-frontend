"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { CheckCircle2, ClipboardList, Send, ShieldCheck, UsersRound } from "lucide-react"
import { toast } from "sonner"

import { GuarantorLookup, type SelectedGuarantor } from "@/components/GuarantorLookup"
import { GuarantorRequestCard } from "@/components/GuarantorRequestCard"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, loansApi, memberApi, type Loan } from "@/lib/api-client"

const ACTIVE_GUARANTOR_STATUSES = new Set(["PENDING", "ACCEPTED"])
const INVITABLE_LOAN_STATUSES = new Set(["DRAFT", "PENDING_GUARANTORS"])

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
    activeCoverage,
    remainingCoverage: Math.max(0, requiredCoverage - activeCoverage),
  }
}

function ExistingGuarantors({ loan }: { loan: Loan }) {
  const guarantors = loan.guarantors ?? []

  if (guarantors.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
        No guarantor invitations have been sent for this loan.
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {guarantors.map((guarantor) => {
        const name = guarantor.member
          ? `${guarantor.member.user.firstName} ${guarantor.member.user.lastName}`
          : "Selected member"

        return (
          <div key={guarantor.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(Number(guarantor.guaranteedAmount))}</p>
            </div>
            <Badge variant={guarantor.status === "ACCEPTED" ? "default" : "secondary"}>
              {guarantor.status.replace(/_/g, " ")}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

function InviteGuarantorsForm({ loan, onInvited }: { loan: Loan; onInvited: () => void }) {
  const [selected, setSelected] = React.useState<SelectedGuarantor[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const requirements = getRequirements(loan)
  const progress = requirements.requiredCoverage > 0
    ? Math.min(100, (requirements.activeCoverage / requirements.requiredCoverage) * 100)
    : 100
  const lookupCoverage = requirements.remainingCoverage > 0
    ? requirements.remainingCoverage
    : requirements.requiredCoverage

  const invite = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one guarantor to invite.")
      return
    }
    if (requirements.remainingSlots > 0 && selected.length > requirements.remainingSlots) {
      toast.error(`This loan has only ${requirements.remainingSlots} guarantor slot${requirements.remainingSlots === 1 ? "" : "s"} left.`)
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
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border px-3 py-3">
          <p className="text-xs text-muted-foreground">Loan amount</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(Number(loan.principalAmount))}</p>
        </div>
        <div className="rounded-md border px-3 py-3">
          <p className="text-xs text-muted-foreground">Required coverage</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(requirements.requiredCoverage)}</p>
        </div>
        <div className="rounded-md border px-3 py-3">
          <p className="text-xs text-muted-foreground">Guarantor slots</p>
          <p className="mt-1 text-lg font-semibold">
            {requirements.activeCount}/{requirements.maxGuarantors}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">Coverage progress</span>
          <span className="text-muted-foreground">
            {formatCurrency(requirements.activeCoverage)} / {formatCurrency(requirements.requiredCoverage)}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Invite agreed guarantors</AlertTitle>
        <AlertDescription>
          Remaining coverage: {formatCurrency(requirements.remainingCoverage)}.
          {" "}Remaining slots: {requirements.remainingSlots}.
          {" "}Each selected guarantor receives an email and a pending request in their member portal.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Current guarantors</p>
          <p className="text-xs text-muted-foreground">Pending invitations and accepted guarantees for this loan.</p>
        </div>
        <ExistingGuarantors loan={loan} />
      </div>

      {requirements.remainingSlots > 0 ? (
        <GuarantorLookup
          requiredAmount={lookupCoverage}
          minGuarantors={Math.max(requirements.remainingCount, 1)}
          maxGuarantors={requirements.remainingSlots}
          loanProductId={loan.loanProductId}
          guarantors={selected}
          onAdd={(guarantor) => setSelected((current) => [...current, guarantor])}
          onRemove={(memberId) => setSelected((current) => current.filter((item) => item.memberId !== memberId))}
        />
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>No available guarantor slots</AlertTitle>
          <AlertDescription>This loan already has the maximum number of pending or accepted guarantors.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.length} selected for invitation.
        </p>
        <Button type="button" onClick={invite} disabled={submitting || selected.length === 0}>
          <Send className="mr-2 h-4 w-4" />
          {submitting ? "Inviting..." : "Send guarantor invitations"}
        </Button>
      </div>
    </div>
  )
}

function InviteGuarantorsSection({
  loans,
  invitables,
  onInvited,
}: {
  loans: Loan[]
  invitables: Loan[]
  onInvited: () => void
}) {
  const [selectedLoanId, setSelectedLoanId] = React.useState("")

  React.useEffect(() => {
    if (invitables.length === 0) {
      setSelectedLoanId("")
      return
    }
    if (!invitables.some((loan) => loan.id === selectedLoanId)) {
      setSelectedLoanId(invitables[0].id)
    }
  }, [invitables, selectedLoanId])

  const selectedLoan = invitables.find((loan) => loan.id === selectedLoanId) ?? invitables[0]

  if (invitables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            No loan is ready for guarantor invitations
          </CardTitle>
          <CardDescription>
            Guarantor invitations are available for draft loans or loans already waiting for guarantors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loans.length > 0 ? (
            <div className="space-y-2">
              {loans.slice(0, 5).map((loan) => {
                const requirements = getRequirements(loan)
                return (
                  <div key={loan.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{loan.loanNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan.loanProduct?.name ?? "Loan"} - {requirements.minGuarantors} guarantor{requirements.minGuarantors === 1 ? "" : "s"} required
                      </p>
                    </div>
                    <Badge variant="outline">{loan.status.replace(/_/g, " ")}</Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
              You do not have any loan applications yet.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/member/loans">Open Loans</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/member/loans/apply">Apply for Loan</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Invite Guarantors
            </CardTitle>
            <CardDescription>
              Search by member name or National ID, then send the guarantor invitation for the selected loan.
            </CardDescription>
          </div>
          <div className="w-full lg:w-80">
            <Select value={selectedLoan?.id ?? ""} onValueChange={setSelectedLoanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select loan" />
              </SelectTrigger>
              <SelectContent>
                {invitables.map((loan) => (
                  <SelectItem key={loan.id} value={loan.id}>
                    {loan.loanNumber} - {formatCurrency(Number(loan.principalAmount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedLoan && <InviteGuarantorsForm loan={selectedLoan} onInvited={onInvited} />}
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
    if (!INVITABLE_LOAN_STATUSES.has(loan.status)) return false
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
        <Tabs defaultValue="invite" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:w-fit">
            <TabsTrigger value="invite">Invite Guarantors</TabsTrigger>
            <TabsTrigger value="incoming">Requests for Me</TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
            <InviteGuarantorsSection
              loans={myLoans}
              invitables={invitables}
              onInvited={() => {
                loans.refetch()
                requests.refetch()
              }}
            />
          </TabsContent>

          <TabsContent value="incoming">
            <Card>
              <CardHeader>
                <CardTitle>Requests for Me</CardTitle>
                <CardDescription>Loans where another member nominated you as guarantor.</CardDescription>
              </CardHeader>
              <CardContent>
                {incoming.length === 0 ? (
                  <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    You do not have pending guarantor requests.
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {incoming.map((request) => (
                      <GuarantorRequestCard key={request.loanId} request={request} onSettled={() => requests.refetch()} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
