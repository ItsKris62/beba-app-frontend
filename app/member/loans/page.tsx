"use client"

import * as React from "react"
import { toast } from "sonner"
import Link from "next/link"
import { CreditCard, CheckCircle2, XCircle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { GuarantorLookup, type SelectedGuarantor } from "@/components/GuarantorLookup"
import {
  memberApi, loansApi, formatCurrency, formatDate, generateIdempotencyKey,
  type Loan, type LoanProduct, type MemberDashboard,
} from "@/lib/api-client"

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

function GuarantorCard({ loanId, applicantName, loanNumber, loanAmount, guaranteedAmount, onRespond }: {
  loanId: string; applicantName: string; loanNumber: string
  loanAmount: number; guaranteedAmount: number; onRespond: () => void
}) {
  const [notes, setNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const respond = async (action: "ACCEPT" | "DECLINE") => {
    setIsSubmitting(true)
    try {
      const res = await memberApi.respondToGuarantor(loanId, action, notes, generateIdempotencyKey())
      if (!res.success) { toast.error(res.error?.message ?? "Failed"); return }
      toast.success(action === "ACCEPT" ? "Guarantee accepted!" : "Guarantee declined.")
      onRespond()
    } catch { toast.error("Network error.") }
    finally { setIsSubmitting(false) }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3" id={`guarantor-${loanId}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{applicantName}</p>
          <p className="text-sm text-muted-foreground">Loan {loanNumber} · {formatCurrency(loanAmount)}</p>
          <p className="text-sm font-medium text-amber-600">Your guarantee: {formatCurrency(guaranteedAmount)}</p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
      </div>
      <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond("ACCEPT")} disabled={isSubmitting} className="gap-1">
          <CheckCircle2 className="h-4 w-4" /> Accept
        </Button>
        <Button size="sm" variant="destructive" onClick={() => respond("DECLINE")} disabled={isSubmitting} className="gap-1">
          <XCircle className="h-4 w-4" /> Decline
        </Button>
      </div>
    </div>
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

function getPreviouslyAcceptedGuarantors(loans: Loan[]): SelectedGuarantor[] {
  const selected = new Map<string, SelectedGuarantor>()

  for (const loan of loans) {
    for (const guarantor of loan.guarantors ?? []) {
      if (guarantor.status !== "ACCEPTED" || !guarantor.member) continue
      selected.set(guarantor.memberId, {
        memberId: guarantor.memberId,
        maskedName: `${guarantor.member.user.firstName} ${guarantor.member.user.lastName}`,
        maskedMemberNumber: guarantor.member.memberNumber,
      })
    }
  }

  return Array.from(selected.values())
}

function getEligibleSavings(product: LoanProduct | undefined, dashboard: MemberDashboard | null) {
  if (!dashboard) return 0
  if (product?.requiredAccountType === "BOSA") return dashboard.balances.bosa
  if (product?.requiredAccountType === "FOSA") return dashboard.balances.fosa
  return dashboard.balances.bosa + dashboard.balances.fosa
}

function getProductLoanLimit(product: LoanProduct | undefined, dashboard: MemberDashboard | null) {
  if (!product) return 0
  const savingsLimit = getEligibleSavings(product, dashboard) * Number(product.savingsMultiplier ?? 3)
  return Math.min(Number(product.maxAmount), savingsLimit)
}

function getRequiredAccountLabel(product: LoanProduct | undefined) {
  return product?.requiredAccountType ?? "combined FOSA+BOSA"
}

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
  const [products, setProducts] = React.useState<LoanProduct[]>([])
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [dashboard, setDashboard] = React.useState<MemberDashboard | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [showApplyForm, setShowApplyForm] = React.useState(false)
  const [selectedProduct, setSelectedProduct] = React.useState("")
  const [principalAmount, setPrincipalAmount] = React.useState("")
  const [tenureMonths, setTenureMonths] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [applicationGuarantors, setApplicationGuarantors] = React.useState<SelectedGuarantor[]>([])
  const [isApplying, setIsApplying] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    const [pr, lr, dr] = await Promise.all([
      loansApi.getProducts(),
      loansApi.getMyLoans({ limit: 50 }),
      memberApi.getDashboard(),
    ])
    if (pr.success && pr.data) setProducts(Array.isArray(pr.data) ? pr.data : [])
    if (lr.success && lr.data) setLoans(lr.data.data ?? [])
    if (dr.success && dr.data) setDashboard(dr.data)
    setIsLoading(false)
  }, [])

  React.useEffect(() => { loadData() }, [loadData])

  const openLoan = loans.find((loan) => OPEN_LOAN_STATUSES.has(loan.status))
  const previousGuarantors = React.useMemo(() => getPreviouslyAcceptedGuarantors(loans), [loans])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(principalAmount)
    const tenure = parseInt(tenureMonths)
    if (!isKycApproved) {
      toast.error("KYC verification is required before applying for a loan.")
      return
    }
    if (openLoan) {
      toast.error(`You already have loan ${openLoan.loanNumber}. Apply again after it is fully paid.`)
      return
    }
    if (!selectedProduct || isNaN(amount) || isNaN(tenure)) {
      toast.error("Please fill all required fields"); return
    }
    if (product && amount < Number(product.minAmount)) {
      toast.error(`Minimum amount for this product is ${formatCurrency(Number(product.minAmount))}`)
      return
    }
    if (product && amount > productLoanLimit) {
      toast.error(`Loan amount exceeds your product limit of ${formatCurrency(productLoanLimit)}`)
      return
    }
    if (product && tenure > product.maxTenureMonths) {
      toast.error(`Maximum tenure for this product is ${product.maxTenureMonths} months`)
      return
    }
    const requiredGuarantors = product?.minGuarantors ?? 0
    if (applicationGuarantors.length < requiredGuarantors) {
      toast.error(`Please select ${requiredGuarantors} guarantor${requiredGuarantors === 1 ? "" : "s"}.`)
      return
    }
    setIsApplying(true)
    try {
      const res = await memberApi.applyForLoan(
        {
          loanProductId: selectedProduct,
          principalAmount: amount,
          tenureMonths: tenure,
          purpose,
          guarantorIds: applicationGuarantors.map((item) => item.memberId),
        },
        generateIdempotencyKey()
      )
      if (!res.success) { toast.error(res.error?.message ?? "Application failed"); return }
      toast.success(applicationGuarantors.length > 0 ? "Loan application submitted and guarantors requested." : "Loan application submitted!")
      setShowApplyForm(false)
      setPrincipalAmount(""); setTenureMonths(""); setPurpose(""); setSelectedProduct("")
      setApplicationGuarantors([])
      loadData()
    } catch { toast.error("Network error.") }
    finally { setIsApplying(false) }
  }

  const product = products.find((p) => p.id === selectedProduct)
  const selectedProductLimit = getProductLoanLimit(product, dashboard)
  const savingsVisible = dashboard ? dashboard.balances.bosa + dashboard.balances.fosa : 0
  const isKycApproved = dashboard?.member.kycStatus === "APPROVED"
  const applicationAmount = parseFloat(principalAmount || "0")
  const applicationMinGuarantors = product?.minGuarantors ?? 0
  const applicationCoverageRatio = Number(product?.guarantorCoverageRatio ?? 1)
  const applicationRequiredCoverage = applicationAmount * applicationCoverageRatio
  const productLoanLimit = selectedProductLimit
  const previousLoansCount = loans.filter((loan) => ["FULLY_PAID", "REJECTED", "REJECTED_GUARANTOR_DECLINE", "WRITTEN_OFF"].includes(loan.status)).length
  const pendingLoansCount = loans.filter((loan) => ["DRAFT", "PENDING_GUARANTORS", "PENDING_REVIEW", "PENDING_APPROVAL", "APPROVED"].includes(loan.status)).length
  const addApplicationGuarantor = (guarantor: SelectedGuarantor) => {
    setApplicationGuarantors((current) => {
      if (current.some((item) => item.memberId === guarantor.memberId)) return current
      if (product?.maxGuarantors && current.length >= product.maxGuarantors) {
        toast.error(`This product allows at most ${product.maxGuarantors} guarantor(s).`)
        return current
      }
      return [...current, guarantor]
    })
  }

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
        <Button onClick={() => setShowApplyForm(!showApplyForm)} className="gap-2" disabled={Boolean(openLoan)}>
          <CreditCard className="h-4 w-4" />
          {showApplyForm ? "Cancel" : "Apply for Loan"}
          {showApplyForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
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
              Your KYC status is {dashboard.member.kycStatus.replace(/_/g, " ")}. Staff must approve it before a loan can be submitted.
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

      {showApplyForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Loan Application</CardTitle>
            <CardDescription>Fill in the details to apply</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Loan Product</Label>
                <Select value={selectedProduct} onValueChange={(value) => { setSelectedProduct(value); setApplicationGuarantors([]) }} required>
                  <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {(parseFloat(p.interestRate) * 100).toFixed(1)}% p.a.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {product && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(parseFloat(product.minAmount))} – {formatCurrency(parseFloat(product.maxAmount))} · Max {product.maxTenureMonths} months
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="principal">Principal Amount (KES)</Label>
                <Input id="principal" type="number" placeholder="50000" value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  min={product ? parseFloat(product.minAmount) : 1000}
                  max={Math.max(product ? Number(product.minAmount) : 1000, productLoanLimit)} required />
                {product && (
                  <p className="text-xs text-muted-foreground">
                    Product limit: {formatCurrency(productLoanLimit)} based on {getRequiredAccountLabel(product)} savings x {Number(product.savingsMultiplier ?? 3)} and product max {formatCurrency(Number(product.maxAmount))}.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenure">Repayment Period (months)</Label>
                <Input id="tenure" type="number" placeholder="12" value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  min={1} max={product?.maxTenureMonths ?? 60} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Loan Purpose</Label>
                <Textarea id="purpose" placeholder="Describe the purpose…" value={purpose}
                  onChange={(e) => setPurpose(e.target.value)} rows={3} />
              </div>
              {product && applicationMinGuarantors > 0 && (
                <Alert>
                  <AlertTitle>Guarantors required</AlertTitle>
                  <AlertDescription>
                    This product needs {applicationMinGuarantors} guarantor{applicationMinGuarantors === 1 ? "" : "s"}.
                    {applicationAmount > 0 && <> Required coverage: {formatCurrency(applicationRequiredCoverage)}.</>}
                  </AlertDescription>
                </Alert>
              )}
              {product && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Choose guarantors</p>
                      <p className="text-xs text-muted-foreground">
                      Search an active member by name or National ID and add them as a guarantor.
                      {applicationAmount <= 0 ? " Enter the loan amount first so the system can check their savings capacity." : ""}
                    </p>
                  </div>
                  {previousGuarantors.length > 0 && (
                    <div className="space-y-2 rounded-md bg-muted p-3">
                      <p className="text-sm font-medium">Previously accepted guarantors</p>
                      <div className="flex flex-wrap gap-2">
                        {previousGuarantors.map((guarantor) => {
                          const alreadySelected = applicationGuarantors.some((item) => item.memberId === guarantor.memberId)
                          return (
                            <Button
                              key={guarantor.memberId}
                              type="button"
                              size="sm"
                              variant={alreadySelected ? "secondary" : "outline"}
                              disabled={alreadySelected}
                              onClick={() => addApplicationGuarantor(guarantor)}
                            >
                              {alreadySelected ? "Selected" : "Select"} {guarantor.maskedName}
                            </Button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The system will re-check their KYC and available savings before submitting.
                      </p>
                    </div>
                  )}
                  {applicationAmount > 0 ? (
                    <GuarantorLookup
                      requiredAmount={applicationRequiredCoverage}
                      minGuarantors={Math.max(applicationMinGuarantors, 1)}
                      maxGuarantors={product.maxGuarantors}
                      loanProductId={selectedProduct}
                      guarantors={applicationGuarantors}
                      onAdd={addApplicationGuarantor}
                      onRemove={(memberId) => setApplicationGuarantors((prev) => prev.filter((item) => item.memberId !== memberId))}
                    />
                  ) : (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Enter a loan amount to enable guarantor lookup.</p>
                  )}
                </div>
              )}
              <Button type="submit" disabled={isApplying || !isKycApproved || Boolean(openLoan)} className="w-full">
                {isApplying ? "Submitting…" : "Submit Application"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {dashboard && dashboard.pendingGuarantorRequests.length > 0 && (
        <Card id="guarantor">
          <CardHeader>
            <CardTitle>Pending Guarantor Requests</CardTitle>
            <CardDescription>Members requesting your guarantee</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.pendingGuarantorRequests.map((req) => (
              <GuarantorCard key={req.guarantorId} loanId={req.loanId} applicantName={req.applicantName}
                loanNumber={req.loanNumber} loanAmount={req.loanAmount}
                guaranteedAmount={req.guaranteedAmount} onRespond={loadData} />
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
              <Button className="mt-4" onClick={() => setShowApplyForm(true)}>Apply for Your First Loan</Button>
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
