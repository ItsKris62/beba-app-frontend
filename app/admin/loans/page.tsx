"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, ThumbsUp, ThumbsDown, Send, RefreshCw, CreditCard, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { loansApi, adminApi, formatCurrency, formatDate, type Loan } from "@/lib/api-client"
import { useAuth, canApproveLoans } from "@/lib/auth-context"
import { canSignApprovalChain } from "@/lib/permissions"
import { DUAL_APPROVAL_THRESHOLD_KES } from "@/lib/loan-math"

function ApprovalModeBadge({ principalAmount }: { principalAmount: string }) {
  const amount = parseFloat(principalAmount)
  if (amount >= DUAL_APPROVAL_THRESHOLD_KES) {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 text-amber-800"
        title={`Loans of ${formatCurrency(DUAL_APPROVAL_THRESHOLD_KES)} or more need one MANAGER and one TELLER to each sign off before disbursement, in addition to this approval.`}
      >
        Dual sign-off required
      </Badge>
    )
  }
  return <Badge variant="secondary">Single-approval</Badge>
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_GUARANTORS: "bg-amber-100 text-amber-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  PENDING_APPROVAL: "bg-purple-100 text-purple-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ACTIVE: "bg-teal-100 text-teal-700",
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

function getGuarantorSummary(loan: Loan) {
  const required = loan.loanProduct?.minGuarantors ?? loan.guarantors?.length ?? 0
  const accepted = (loan.guarantors ?? []).filter((g) => g.status === "ACCEPTED").length
  return { accepted, required }
}

function GuarantorSummaryBadge({ loan }: { loan: Loan }) {
  if (!loan.guarantors?.length && !loan.loanProduct?.minGuarantors) return null
  const { accepted, required } = getGuarantorSummary(loan)
  return (
    <Badge variant={accepted >= required && required > 0 ? "default" : "secondary"}>
      {accepted}/{required} Guarantors Verified
    </Badge>
  )
}

function LoanTableRow({
  loan,
  currentUserEmail,
  canApprove,
  canSignOff,
  onView,
  onApprove,
  onReject,
  onDisburse,
  onSignOff,
}: {
  loan: Loan
  currentUserEmail?: string
  canApprove: boolean
  canSignOff: boolean
  onView: () => void
  onApprove: () => void
  onReject: () => void
  onDisburse: () => void
  onSignOff: () => void
}) {
  const isPendingApproval = loan.status === "PENDING_APPROVAL"
  const isApproved = loan.status === "APPROVED"
  const needsDualSignOff = parseFloat(loan.principalAmount) >= DUAL_APPROVAL_THRESHOLD_KES

  // The list endpoint doesn't return the applicant's email (only name), so we
  // can't tell from list data alone whether the logged-in admin is also the
  // member who applied (a staff member can also be a SACCO member). Fetch the
  // loan detail — which does include it — only for rows where it actually
  // matters, so most rows never pay this extra request.
  const selfCheckEnabled = isPendingApproval && canApprove
  const detailQuery = useQuery({
    queryKey: ["admin-loan-detail", loan.id],
    queryFn: () => loansApi.getLoan(loan.id),
    enabled: selfCheckEnabled,
    staleTime: 60_000,
  })
  const applicantEmail = detailQuery.data?.success ? detailQuery.data.data?.member?.user.email : undefined
  const isSelfApproval = Boolean(
    selfCheckEnabled && currentUserEmail && applicantEmail && currentUserEmail.toLowerCase() === applicantEmail.toLowerCase(),
  )
  const approveDisabledReason = isSelfApproval
    ? "You applied for this loan yourself — another approver must review it."
    : selfCheckEnabled && detailQuery.isLoading
      ? "Checking applicant..."
      : undefined

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{loan.loanNumber}</TableCell>
      <TableCell className="text-sm">
        {loan.member ? `${loan.member.user.firstName} ${loan.member.user.lastName}` : "—"}
        <p className="text-xs text-muted-foreground">{loan.member?.memberNumber}</p>
      </TableCell>
      <TableCell className="text-sm">{loan.loanProduct?.name ?? "—"}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(parseFloat(loan.principalAmount))}</TableCell>
      <TableCell className="text-right text-sm">{formatCurrency(parseFloat(loan.outstandingBalance))}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1 items-start">
          <LoanStatusBadge status={loan.status} />
          <ApprovalModeBadge principalAmount={loan.principalAmount} />
          <GuarantorSummaryBadge loan={loan} />
        </div>
      </TableCell>
      <TableCell className="text-sm">{formatDate(loan.appliedAt)}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onView} aria-label={`View loan ${loan.loanNumber}`}>
            <Eye className="h-4 w-4" />
          </Button>
          {isPendingApproval && canApprove && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600"
                onClick={onApprove}
                disabled={isSelfApproval || detailQuery.isLoading}
                title={approveDisabledReason}
                aria-label={`Approve loan ${loan.loanNumber}`}
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600"
                onClick={onReject}
                aria-label={`Reject loan ${loan.loanNumber}`}
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </>
          )}
          {isApproved && canApprove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600"
              onClick={onDisburse}
              aria-label={`Disburse loan ${loan.loanNumber}`}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          {isApproved && needsDualSignOff && canSignOff && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-amber-700"
              onClick={onSignOff}
              title="Sign off on this large loan's disbursement (4-eyes)"
              aria-label={`Sign off on disbursement for loan ${loan.loanNumber}`}
            >
              <ShieldCheck className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function AdminLoansPage() {
  const { user } = useAuth()
  const canApprove = canApproveLoans(user?.role)
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL")
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isActionOpen, setIsActionOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject" | "disburse">("approve")
  const [actionComment, setActionComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signOffLoan, setSignOffLoan] = useState<Loan | null>(null)
  const [signOffDecision, setSignOffDecision] = useState<"approve" | "reject">("approve")
  const [signOffNotes, setSignOffNotes] = useState("")
  const [isSigningOff, setIsSigningOff] = useState(false)
  const canSignOff = canSignApprovalChain(user?.role)

  // Backstop for the self-approval guard: the row button already disables
  // Approve, but the loan detail dialog has its own Approve button that opens
  // this same confirmation dialog — re-check here too rather than trusting
  // the caller. React Query dedupes this against the row's own fetch of the
  // same loan (same query key), so opening the dialog after already seeing
  // the row doesn't re-fetch.
  const selectedLoanSelfCheckEnabled =
    Boolean(selectedLoan) && selectedLoan?.status === "PENDING_APPROVAL" && canApprove
  const selectedLoanDetailQuery = useQuery({
    queryKey: ["admin-loan-detail", selectedLoan?.id],
    queryFn: () => loansApi.getLoan(selectedLoan!.id),
    enabled: selectedLoanSelfCheckEnabled,
    staleTime: 60_000,
  })
  const selectedLoanApplicantEmail = selectedLoanDetailQuery.data?.success
    ? selectedLoanDetailQuery.data.data?.member?.user.email
    : undefined
  const isSelectedLoanSelfApproval = Boolean(
    selectedLoanSelfCheckEnabled &&
      user?.email &&
      selectedLoanApplicantEmail &&
      user.email.toLowerCase() === selectedLoanApplicantEmail.toLowerCase(),
  )

  const loadLoans = async (p = 1) => {
    setIsLoading(true)
    try {
      const res = await adminApi.getLoans({ status: statusFilter || undefined, page: p, limit: 20 })
      if (res.success && res.data) {
        setLoans(res.data.data ?? [])
        setTotal(res.data.meta?.total ?? 0)
        setPage(p)
      } else {
        toast.error(res.error?.message ?? "Failed to load loans")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error – please check your connection")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadLoans(1) }, [statusFilter])

  const openAction = (loan: Loan, type: "approve" | "reject" | "disburse") => {
    setSelectedLoan(loan)
    setActionType(type)
    setActionComment("")
    setIsActionOpen(true)
  }

  const handleAction = async () => {
    if (!selectedLoan) return
    if (actionType === "approve" && isSelectedLoanSelfApproval) {
      toast.error("You applied for this loan yourself — another approver must review it.")
      return
    }
    setIsSubmitting(true)
    try {
      let res
      if (actionType === "approve") {
        res = await loansApi.approveLoan(selectedLoan.id, actionComment)
      } else if (actionType === "reject") {
        if (!actionComment.trim()) { toast.error("Rejection reason is required"); setIsSubmitting(false); return }
        res = await loansApi.rejectLoan(selectedLoan.id, actionComment)
      } else {
        res = await loansApi.disburseLoan(selectedLoan.id)
      }
      if (!res.success) { toast.error(res.error?.message ?? "Action failed"); return }
      toast.success(`Loan ${actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "disbursed"} successfully!`)
      setIsActionOpen(false)
      loadLoans(page)
    } catch { toast.error("Network error.") }
    finally { setIsSubmitting(false) }
  }

  const handleSignOff = async () => {
    if (!signOffLoan) return
    setIsSigningOff(true)
    try {
      const res = await loansApi.signApprovalChain(signOffLoan.id, signOffDecision === "approve", signOffNotes || undefined)
      if (!res.success) { toast.error(res.error?.message ?? "Sign-off failed"); return }
      toast.success(
        signOffDecision === "approve"
          ? "Sign-off recorded. Disbursement can proceed once the other required sign-off is in too."
          : "Sign-off rejection recorded. This loan will not be disbursed.",
      )
      setSignOffLoan(null)
      setSignOffNotes("")
      loadLoans(page)
    } catch { toast.error("Network error.") }
    finally { setIsSigningOff(false) }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Management</h1>
          <p className="text-muted-foreground">Review, approve, and disburse member loans</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadLoans(page)}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <TabsList>
                <TabsTrigger value="PENDING_GUARANTORS">Pending Guarantors</TabsTrigger>
                <TabsTrigger value="PENDING_APPROVAL">Pending Approval</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="ACTIVE">Active</TabsTrigger>
                <TabsTrigger value="">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loans</CardTitle>
          <CardDescription>{isLoading ? <Skeleton className="h-4 w-24" /> : `${total} loans found`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : loans.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No loans found for this status</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan No.</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => (
                      <LoanTableRow
                        key={loan.id}
                        loan={loan}
                        currentUserEmail={user?.email}
                        canApprove={canApprove}
                        canSignOff={canSignOff}
                        onView={() => { setSelectedLoan(loan); setIsDetailOpen(true) }}
                        onApprove={() => openAction(loan, "approve")}
                        onReject={() => openAction(loan, "reject")}
                        onDisburse={() => openAction(loan, "disburse")}
                        onSignOff={() => { setSignOffLoan(loan); setSignOffDecision("approve"); setSignOffNotes("") }}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadLoans(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadLoans(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Loan Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loan Details — {selectedLoan?.loanNumber}</DialogTitle>
            <DialogDescription>{selectedLoan?.loanProduct?.name}</DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-muted-foreground">Member</Label><p className="font-medium">{selectedLoan.member?.user.firstName} {selectedLoan.member?.user.lastName}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><div className="mt-1 flex flex-wrap gap-1"><LoanStatusBadge status={selectedLoan.status} /><ApprovalModeBadge principalAmount={selectedLoan.principalAmount} /></div></div>
                <div><Label className="text-muted-foreground">Principal</Label><p className="font-medium">{formatCurrency(parseFloat(selectedLoan.principalAmount))}</p></div>
                <div><Label className="text-muted-foreground">Interest Rate</Label><p className="font-medium">{(parseFloat(selectedLoan.interestRate) * 100).toFixed(1)}% p.a.</p></div>
                <div><Label className="text-muted-foreground">Tenure</Label><p className="font-medium">{selectedLoan.tenureMonths} months</p></div>
                <div><Label className="text-muted-foreground">Monthly Instalment</Label><p className="font-medium">{formatCurrency(parseFloat(selectedLoan.monthlyInstalment))}</p></div>
                <div><Label className="text-muted-foreground">Processing Fee</Label><p className="font-medium">{formatCurrency(parseFloat(selectedLoan.processingFee))}</p></div>
                <div><Label className="text-muted-foreground">Outstanding</Label><p className="font-medium text-amber-600">{formatCurrency(parseFloat(selectedLoan.outstandingBalance))}</p></div>
                <div><Label className="text-muted-foreground">Applied</Label><p className="font-medium">{formatDate(selectedLoan.appliedAt)}</p></div>
                {selectedLoan.approvedAt && <div><Label className="text-muted-foreground">Approved</Label><p className="font-medium">{formatDate(selectedLoan.approvedAt)}</p></div>}
                {selectedLoan.disbursedAt && <div><Label className="text-muted-foreground">Disbursed</Label><p className="font-medium">{formatDate(selectedLoan.disbursedAt)}</p></div>}
              </div>
              {selectedLoan.purpose && (
                <div><Label className="text-muted-foreground">Purpose</Label><p className="mt-1">{selectedLoan.purpose}</p></div>
              )}
              {selectedLoan.notes && (
                <div><Label className="text-muted-foreground">Notes</Label><p className="mt-1 text-muted-foreground">{selectedLoan.notes}</p></div>
              )}
              {selectedLoan.guarantors && selectedLoan.guarantors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Guarantors</Label>
                    <GuarantorSummaryBadge loan={selectedLoan} />
                  </div>
                  <div className="mt-2 space-y-2">
                    {selectedLoan.guarantors.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded border p-2">
                        <span>{g.member?.user.firstName} {g.member?.user.lastName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{formatCurrency(parseFloat(g.guaranteedAmount))}</span>
                          <Badge variant={g.status === "ACCEPTED" ? "default" : g.status === "DECLINED" ? "destructive" : "secondary"}>
                            {g.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedLoan?.status === "PENDING_APPROVAL" && canApprove && (
              <>
                <Button variant="destructive" size="sm" onClick={() => { setIsDetailOpen(false); openAction(selectedLoan, "reject") }}>
                  <ThumbsDown className="mr-2 h-4 w-4" /> Reject
                </Button>
                <Button
                  size="sm"
                  disabled={isSelectedLoanSelfApproval}
                  title={isSelectedLoanSelfApproval ? "You applied for this loan yourself — another approver must review it." : undefined}
                  onClick={() => { setIsDetailOpen(false); openAction(selectedLoan, "approve") }}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" /> Approve
                </Button>
              </>
            )}
            {selectedLoan?.status === "APPROVED" && canApprove && (
              <Button size="sm" onClick={() => { setIsDetailOpen(false); openAction(selectedLoan, "disburse") }}>
                <Send className="mr-2 h-4 w-4" /> Disburse
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Loan" : actionType === "reject" ? "Reject Loan" : "Disburse Loan"}
            </DialogTitle>
            <DialogDescription>
              {selectedLoan?.loanNumber} — {selectedLoan?.member?.user.firstName} {selectedLoan?.member?.user.lastName} — {selectedLoan ? formatCurrency(parseFloat(selectedLoan.principalAmount)) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {actionType === "approve" && isSelectedLoanSelfApproval && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                You applied for this loan yourself. Another approver must review it — this action is disabled.
              </p>
            )}
            {actionType !== "disburse" && (
              <div className="space-y-2">
                <Label htmlFor="comment">{actionType === "reject" ? "Rejection Reason *" : "Comment (optional)"}</Label>
                <Textarea
                  id="comment"
                  placeholder={actionType === "reject" ? "Provide a reason for rejection…" : "Add a comment…"}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {actionType === "disburse" && (
              <p className="text-sm text-muted-foreground">
                This will credit {selectedLoan ? formatCurrency(parseFloat(selectedLoan.principalAmount)) : ""} to the member&apos;s FOSA account. This action cannot be undone.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionOpen(false)}>Cancel</Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={isSubmitting || (actionType === "approve" && isSelectedLoanSelfApproval)}
            >
              {isSubmitting ? "Processing…" : actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Disburse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dual sign-off dialog (loans >= DUAL_APPROVAL_THRESHOLD_KES) */}
      <Dialog open={Boolean(signOffLoan)} onOpenChange={(open) => { if (!open) setSignOffLoan(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign off on disbursement</DialogTitle>
            <DialogDescription>
              {signOffLoan?.loanNumber} — {signOffLoan?.member?.user.firstName} {signOffLoan?.member?.user.lastName} —{" "}
              {signOffLoan ? formatCurrency(parseFloat(signOffLoan.principalAmount)) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This loan requires one MANAGER and one TELLER to each sign off before it can be disbursed.
              The same person cannot fill both slots, and you cannot sign off twice.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={signOffDecision === "approve" ? "default" : "outline"}
                size="sm"
                onClick={() => setSignOffDecision("approve")}
              >
                Approve disbursement
              </Button>
              <Button
                type="button"
                variant={signOffDecision === "reject" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setSignOffDecision("reject")}
              >
                Reject disbursement
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signoff-notes">{signOffDecision === "reject" ? "Reason (recommended)" : "Notes (optional)"}</Label>
              <Textarea id="signoff-notes" value={signOffNotes} onChange={(e) => setSignOffNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOffLoan(null)}>Cancel</Button>
            <Button
              variant={signOffDecision === "reject" ? "destructive" : "default"}
              onClick={handleSignOff}
              disabled={isSigningOff}
            >
              {isSigningOff ? "Submitting…" : signOffDecision === "reject" ? "Submit rejection" : "Submit sign-off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
