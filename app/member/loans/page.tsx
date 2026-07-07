"use client"

import * as React from "react"
import { toast } from "sonner"
import Link from "next/link"
import { CreditCard, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { GuarantorLookup, type SelectedGuarantor } from "@/components/GuarantorLookup"
import { GuarantorRequestCard } from "@/components/GuarantorRequestCard"
import {
  memberApi, loansApi, formatCurrency, formatDate,
  type Loan, type MemberDashboard,
} from "@/lib/api-client"
import { getFormattedStatusLabel, isKycVerified } from "@/lib/kyc-status"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_GUARANTORS: "bg-amber-100 text-amber-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  PENDING_APPROVAL: "bg-purple-100 text-purple-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ACTIVE: "bg-green-100 text-green-700",
  FULLY_PAID: "bg-gray-100 text-gray-600",
  DEFAULTED: "bg-red-100 text-red-700",
}

function LoanStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

const ACTIVE_GUARANTOR_STATUSES = new Set(["PENDING", "ACCEPTED"])
const OPEN_LOAN_STATUSES = new Set([
  "DRAFT",
  "PENDING_GUARANTORS",
  "PENDING_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "DISBURSED",
  "ACTIVE",
  "DEFAULTED",
])

function getGuarantorRequirements(loan: Loan) {
  const principal = parseFloat(loan.principalAmount)
  const minGuarantors = loan.loanProduct?.minGuarantors ?? 0
  const coverageRatio = Number(loan.loanProduct?.guarantorCoverageRatio ?? 1)
  const requiredCoverage = principal * coverageRatio
  const activeGuarantors = (loan.guarantors ?? []).filter((item) => ACTIVE_GUARANTOR_STATUSES.has(item.status))
  const activeCoverage = activeGuarantors.reduce((sum, item) => sum + parseFloat(item.guaranteedAmount), 0)
  const remainingCoverage = Math.max(0, requiredCoverage - activeCoverage)
  const remainingCount = Math.max(0, minGuarantors - activeGuarantors.length)
  const maxGuarantors = loan.loanProduct?.maxGuarantors ?? 3
  const remainingSlots = Math.max(0, maxGuarantors - activeGuarantors.length)

  return {
    minGuarantors,
    maxGuarantors,
    remainingSlots,
    requiredCoverage,
    activeCoverage,
    remainingCoverage,
    remainingCount,
    requestAmount: remainingCoverage > 0
      ? remainingCoverage
      : remainingCount > 0 && minGuarantors > 0
        ? (requiredCoverage / minGuarantors) * remainingCount
        : requiredCoverage,
  }
}

function GuarantorStatusList({ loan }: { loan: Loan }) {
  if (!loan.guarantors?.length) return null

  return (
    <div className="border-t pt-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">Guarantors</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {loan.guarantors.map((guarantor) => (
          <div key={guarantor.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span>
              {guarantor.member
                ? `${guarantor.member.user.firstName} ${guarantor.member.user.lastName}`
                : guarantor.memberId}
            </span>
            <Badge variant={guarantor.status === "ACCEPTED" ? "default" : "secondary"}>
              {guarantor.status.replace(/_/g, " ")}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoanGuarantorRequestPanel({ loan, onRequested }: { loan: Loan; onRequested: () => void }) {
  const [guarantors, setGuarantors] = React.useState<SelectedGuarantor[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const requirements = getGuarantorRequirements(loan)
  const canRequest = ["DRAFT", "PENDING_GUARANTORS"].includes(loan.status)
  const needsGuarantors = requirements.minGuarantors > 0

  if (!canRequest || !needsGuarantors || requirements.remainingSlots <= 0) return null

  const submitRequests = async () => {
    if (guarantors.length === 0) {
      toast.error("Select at least one guarantor to request.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await memberApi.requestGuarantors(loan.id, guarantors.map((item) => item.memberId))
      if (!res.success) {
        toast.error(res.error?.message ?? "Could not request guarantors.")
        return
      }
      toast.success(`${res.data.invitedCount} guarantor request${res.data.invitedCount === 1 ? "" : "s"} sent.`)
      setGuarantors([])
      onRequested()
    } catch {
      toast.error("Network error while requesting guarantors.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-t pt-3">
      <Alert>
        <AlertTitle>Guarantor requests</AlertTitle>
        <AlertDescription>
          {requirements.remainingCount > 0
            ? `Request ${requirements.remainingCount} more guarantor${requirements.remainingCount === 1 ? "" : "s"}.`
            : "You can request another eligible member while this loan is waiting for guarantors."}
          {" "}Remaining coverage: {formatCurrency(requirements.remainingCoverage)}. Remaining slots: {requirements.remainingSlots}.
        </AlertDescription>
      </Alert>
      <div className="mt-3 space-y-3">
        <GuarantorLookup
          requiredAmount={Math.max(requirements.requestAmount, 1)}
          minGuarantors={Math.max(requirements.remainingCount, 1)}
          maxGuarantors={requirements.remainingSlots}
          loanProductId={loan.loanProductId}
          guarantors={guarantors}
          onAdd={(guarantor) => setGuarantors((prev) => [...prev, guarantor])}
          onRemove={(memberId) => setGuarantors((prev) => prev.filter((item) => item.memberId !== memberId))}
        />
        <Button type="button" disabled={isSubmitting || guarantors.length === 0} onClick={submitRequests}>
          {isSubmitting ? "Requesting..." : "Request selected guarantors"}
        </Button>
      </div>
    </div>
  )
}

export default function LoansPage() {
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [dashboard, setDashboard] = React.useState<MemberDashboard | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    const [lr, dr] = await Promise.all([
      loansApi.getMyLoans({ limit: 50 }),
      memberApi.getDashboard(),
    ])
    if (lr.success && lr.data) setLoans(lr.data.data ?? [])
    if (dr.success && dr.data) setDashboard(dr.data)
    setIsLoading(false)
  }, [])

  React.useEffect(() => { loadData() }, [loadData])

  const openLoan = loans.find((loan) => OPEN_LOAN_STATUSES.has(loan.status))
  const savingsVisible = dashboard ? dashboard.balances.bosa + dashboard.balances.fosa : 0
  const isKycApproved = isKycVerified(dashboard?.member.kycStatus)
  const previousLoansCount = loans.filter((loan) => ["FULLY_PAID", "REJECTED", "REJECTED_GUARANTOR_DECLINE", "WRITTEN_OFF"].includes(loan.status)).length
  const pendingLoansCount = loans.filter((loan) => ["DRAFT", "PENDING_GUARANTORS", "PENDING_REVIEW", "PENDING_APPROVAL", "APPROVED"].includes(loan.status)).length

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">Apply for loans and manage your applications</p>
        </div>
        <Link href="/member/loans/apply">
          <Button className="gap-2" disabled={Boolean(openLoan)}>
            <CreditCard className="h-4 w-4" />
            Apply for Loan
          </Button>
        </Link>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Available savings for loan rules</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(savingsVisible)}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>BOSA {formatCurrency(dashboard?.balances.bosa ?? 0)} × 3</p>
              <p>FOSA {formatCurrency(dashboard?.balances.fosa ?? 0)} × 1.5</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {dashboard && !isKycApproved && (
        <Alert className="border-amber-200 bg-amber-50">
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">KYC verification required</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Your KYC status is {getFormattedStatusLabel(dashboard.member.kycStatus)}. Staff must approve it before a loan can be submitted.
              {dashboard.member.kycRejectionReason ? ` Reason: ${dashboard.member.kycRejectionReason}` : ""}
            </span>
            <Link href="/member/profile">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                View Profile
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {openLoan && (
        <Alert className="border-amber-200 bg-amber-50">
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">One loan at a time</AlertTitle>
          <AlertDescription className="text-amber-800">
            You already have loan {openLoan.loanNumber} in {openLoan.status.replace(/_/g, " ")} status.
            New applications are available after the current loan is fully paid.
          </AlertDescription>
        </Alert>
      )}

      {dashboard && dashboard.pendingGuarantorRequests.length > 0 && (
        <Card id="guarantor">
          <CardHeader>
            <CardTitle>Pending Guarantor Requests</CardTitle>
            <CardDescription>Members requesting your guarantee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.pendingGuarantorRequests.map((req) => (
              <GuarantorRequestCard
                key={req.guarantorId}
                request={{
                  loanId: req.loanId,
                  loanNumber: req.loanNumber,
                  applicantName: req.applicantName,
                  amount: req.loanAmount,
                  guaranteedAmount: req.guaranteedAmount,
                  status: "PENDING",
                  purpose: req.purpose,
                }}
                onSettled={loadData}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Loan Status</CardTitle>
          <CardDescription>Current, pending, and previous loan applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border px-3 py-3">
              <p className="text-xs text-muted-foreground">Current loan</p>
              <p className="mt-1 text-lg font-semibold">{openLoan ? openLoan.loanNumber : "None"}</p>
              {openLoan && <LoanStatusBadge status={openLoan.status} />}
            </div>
            <div className="rounded-md border px-3 py-3">
              <p className="text-xs text-muted-foreground">Pending applications</p>
              <p className="mt-1 text-lg font-semibold">{pendingLoansCount}</p>
            </div>
            <div className="rounded-md border px-3 py-3">
              <p className="text-xs text-muted-foreground">Previous loans</p>
              <p className="mt-1 text-lg font-semibold">{previousLoansCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="active">
        <CardHeader>
          <CardTitle>My Loan Applications</CardTitle>
          <CardDescription>All your loan applications and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No loan applications yet</p>
              <Link href="/member/loans/apply">
                <Button className="mt-4">Apply for Your First Loan</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => (
                <div key={loan.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{loan.loanNumber}</p>
                      <p className="text-sm text-muted-foreground">{loan.loanProduct?.name ?? "Loan"}</p>
                    </div>
                    <LoanStatusBadge status={loan.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div><p className="text-muted-foreground">Principal</p><p className="font-medium">{formatCurrency(parseFloat(loan.principalAmount))}</p></div>
                    <div><p className="text-muted-foreground">Outstanding</p><p className="font-medium">{formatCurrency(parseFloat(loan.outstandingBalance))}</p></div>
                    <div><p className="text-muted-foreground">Monthly</p><p className="font-medium">{formatCurrency(parseFloat(loan.monthlyInstalment))}</p></div>
                    <div><p className="text-muted-foreground">Applied</p><p className="font-medium">{formatDate(loan.appliedAt)}</p></div>
                  </div>
                  {loan.dueDate && <p className="text-xs text-muted-foreground">Due: {formatDate(loan.dueDate)}</p>}
                  {loan.notes && <p className="text-xs text-muted-foreground border-t pt-2">{loan.notes}</p>}
                  <GuarantorStatusList loan={loan} />
                  <LoanGuarantorRequestPanel loan={loan} onRequested={loadData} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
