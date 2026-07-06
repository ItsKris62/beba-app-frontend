"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, ThumbsUp, ThumbsDown, Send, RefreshCw, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { loansApi, adminApi, formatCurrency, formatDate, type Loan } from "@/lib/api-client"
import { useAuth, canApproveLoans } from "@/lib/auth-context"

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
                <TabsTrigger value="PENDING_APPROVAL">Pending Approval</TabsTrigger>
                <TabsTrigger value="PENDING_REVIEW">Under Review</TabsTrigger>
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
          <CardDescription>{total} loans found</CardDescription>
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
                      <TableRow key={loan.id}>
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
                            <GuarantorSummaryBadge loan={loan} />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(loan.appliedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedLoan(loan); setIsDetailOpen(true) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {loan.status === "PENDING_APPROVAL" && canApprove && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => openAction(loan, "approve")}>
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => openAction(loan, "reject")}>
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {loan.status === "APPROVED" && canApprove && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openAction(loan, "disburse")}>
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
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
                <div><Label className="text-muted-foreground">Status</Label><div className="mt-1"><LoanStatusBadge status={selectedLoan.status} /></div></div>
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
                <Button size="sm" onClick={() => { setIsDetailOpen(false); openAction(selectedLoan, "approve") }}>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing…" : actionType === "approve" ? "Approve" : actionType === "reject" ? "Reject" : "Disburse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
