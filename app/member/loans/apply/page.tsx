"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { GuarantorLookup, type SelectedGuarantor } from "@/components/GuarantorLookup"
import { TermsSummary } from "@/components/TermsSummary"
import { loansApi, memberApi, formatCurrency, type Loan, type LoanProduct, type MemberDashboard } from "@/lib/api-client"
import { getFormattedStatusLabel, isKycVerified } from "@/lib/kyc-status"
import { calculateLoanRepayment, type LoanRepaymentCalculation } from "@/lib/loan-math"
import { useLoanApplicationStore, type LoanWizardStep } from "@/store/useLoanApplicationStore"

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

const WIZARD_STEPS: { id: LoanWizardStep; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "terms", label: "Amount & Tenure" },
  { id: "guarantors", label: "Guarantors" },
  { id: "review", label: "Review & Submit" },
]

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

// ─── Step 1: Product ───────────────────────────────────────────────────────

const productStepSchema = z.object({
  loanProductId: z.string().min(1, "Select a loan product"),
})
type ProductStepValues = z.infer<typeof productStepSchema>

function ProductStep({
  productList,
  defaultValue,
  blocked,
  blockedReason,
  onNext,
}: {
  productList: LoanProduct[]
  defaultValue: string
  blocked: boolean
  blockedReason: string | null
  onNext: (values: ProductStepValues) => void
}) {
  const form = useForm<ProductStepValues>({
    resolver: zodResolver(productStepSchema),
    defaultValues: { loanProductId: defaultValue },
  })

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-2">
        <Label>Loan Product</Label>
        <Select
          value={form.watch("loanProductId")}
          onValueChange={(value) => form.setValue("loanProductId", value, { shouldValidate: true })}
        >
          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>
            {productList.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {form.formState.errors.loanProductId && (
          <p className="text-xs text-destructive">{form.formState.errors.loanProductId.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={blocked} title={blocked ? blockedReason ?? undefined : undefined}>
        Continue
      </Button>
    </form>
  )
}

// ─── Step 2: Amount & Tenure ───────────────────────────────────────────────

function buildTermsSchema(product: LoanProduct, productLoanLimit: number) {
  return z.object({
    principalAmount: z.coerce
      .number({ invalid_type_error: "Enter an amount" })
      .min(Number(product.minAmount), `Minimum amount is ${formatCurrency(Number(product.minAmount))}`)
      .max(productLoanLimit, `Maximum amount is ${formatCurrency(productLoanLimit)} based on your savings`),
    tenureMonths: z.coerce
      .number({ invalid_type_error: "Enter a tenure" })
      .min(1, "Tenure must be at least 1 month")
      .max(product.maxTenureMonths, `Maximum tenure is ${product.maxTenureMonths} months`),
    purpose: z.string().max(500, "Keep the purpose under 500 characters").optional(),
  })
}
type TermsStepInput = z.input<ReturnType<typeof buildTermsSchema>>
type TermsStepOutput = z.output<ReturnType<typeof buildTermsSchema>>

function TermsStep({
  product,
  productLoanLimit,
  defaultValues,
  onBack,
  onNext,
}: {
  product: LoanProduct
  productLoanLimit: number
  defaultValues: { principalAmount: string; tenureMonths: string; purpose: string }
  onBack: () => void
  onNext: (values: TermsStepOutput) => void
}) {
  const schema = React.useMemo(() => buildTermsSchema(product, productLoanLimit), [product, productLoanLimit])
  const form = useForm<TermsStepInput, unknown, TermsStepOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      principalAmount: defaultValues.principalAmount ? Number(defaultValues.principalAmount) : undefined,
      tenureMonths: defaultValues.tenureMonths ? Number(defaultValues.tenureMonths) : undefined,
      purpose: defaultValues.purpose,
    },
  })

  const amount = Number(form.watch("principalAmount") || 0)
  const tenure = Number(form.watch("tenureMonths") || 0)
  const repaymentPreview: LoanRepaymentCalculation | null =
    amount > 0 && tenure > 0 ? calculateLoanRepayment(amount, Number(product.interestRate), tenure, product.interestType) : null

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="principalAmount">Amount (KES)</Label>
          <Input
            id="principalAmount"
            type="number"
            inputMode="numeric"
            {...form.register("principalAmount")}
          />
          <p className="text-xs text-muted-foreground">Product limit: {formatCurrency(productLoanLimit)}.</p>
          {form.formState.errors.principalAmount && (
            <p className="text-xs text-destructive">{form.formState.errors.principalAmount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenureMonths">Tenure (months)</Label>
          <Input
            id="tenureMonths"
            type="number"
            inputMode="numeric"
            {...form.register("tenureMonths")}
          />
          {form.formState.errors.tenureMonths && (
            <p className="text-xs text-destructive">{form.formState.errors.tenureMonths.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose</Label>
        <Textarea id="purpose" rows={3} {...form.register("purpose")} />
      </div>
      {repaymentPreview && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">Estimated repayment</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div><p className="text-muted-foreground">Monthly</p><p className="font-semibold text-primary">{formatCurrency(repaymentPreview.monthlyInstalment)}</p></div>
            <div><p className="text-muted-foreground">Total interest</p><p className="font-semibold">{formatCurrency(repaymentPreview.totalInterest)}</p></div>
            <div><p className="text-muted-foreground">Total repayment</p><p className="font-semibold">{formatCurrency(repaymentPreview.totalRepayment)}</p></div>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" className="flex-1">Continue</Button>
      </div>
    </form>
  )
}

// ─── Step 3: Guarantors ─────────────────────────────────────────────────────

function GuarantorsStep({
  product,
  minGuarantors,
  maxGuarantors,
  requiredCoverage,
  guarantors,
  previousGuarantors,
  onAdd,
  onRemove,
  canProceed,
  onBack,
  onNext,
}: {
  product: LoanProduct
  minGuarantors: number
  maxGuarantors: number
  requiredCoverage: number
  guarantors: SelectedGuarantor[]
  previousGuarantors: SelectedGuarantor[]
  onAdd: (guarantor: SelectedGuarantor) => void
  onRemove: (memberId: string) => void
  canProceed: boolean
  onBack: () => void
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Guarantor requirements</AlertTitle>
        <AlertDescription>
          {minGuarantors} to {maxGuarantors > 0 ? maxGuarantors : "unlimited"} guarantor(s), coverage ratio{" "}
          {(Number(product.guarantorCoverageRatio ?? 1) * 100).toFixed(0)}%, required coverage {formatCurrency(requiredCoverage)}.
        </AlertDescription>
      </Alert>
      {previousGuarantors.length > 0 && (
        <div className="space-y-2 rounded-md bg-muted p-3">
          <p className="text-sm font-medium">Previously accepted guarantors</p>
          <div className="flex flex-wrap gap-2">
            {previousGuarantors.map((guarantor) => {
              const alreadySelected = guarantors.some((item) => item.memberId === guarantor.memberId)
              return (
                <Button
                  key={guarantor.memberId}
                  type="button"
                  size="sm"
                  variant={alreadySelected ? "secondary" : "outline"}
                  disabled={alreadySelected}
                  onClick={() => onAdd(guarantor)}
                >
                  {alreadySelected ? "Selected" : "Select"} {guarantor.maskedName}
                </Button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">The system will re-check their KYC and available savings before submitting.</p>
        </div>
      )}
      <GuarantorLookup
        requiredAmount={requiredCoverage}
        minGuarantors={Math.max(minGuarantors, 1)}
        maxGuarantors={maxGuarantors}
        loanProductId={product.id}
        guarantors={guarantors}
        onAdd={onAdd}
        onRemove={onRemove}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" className="flex-1" disabled={!canProceed} onClick={onNext}>Continue</Button>
      </div>
    </div>
  )
}

// ─── Step 4: Review & submit ────────────────────────────────────────────────

function ReviewStep({
  product,
  amount,
  tenure,
  purpose,
  guarantors,
  repaymentPreview,
  isSubmitting,
  onBack,
  onSubmit,
}: {
  product: LoanProduct
  amount: number
  tenure: number
  purpose: string
  guarantors: SelectedGuarantor[]
  repaymentPreview: LoanRepaymentCalculation | null
  isSubmitting: boolean
  onBack: () => void
  onSubmit: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <div><p className="text-muted-foreground">Product</p><p className="font-medium">{product.name}</p></div>
        <div><p className="text-muted-foreground">Amount</p><p className="font-medium">{formatCurrency(amount)}</p></div>
        <div><p className="text-muted-foreground">Tenure</p><p className="font-medium">{tenure} months</p></div>
        <div><p className="text-muted-foreground">Guarantors</p><p className="font-medium">{guarantors.length} selected</p></div>
        {purpose && <div className="sm:col-span-2"><p className="text-muted-foreground">Purpose</p><p className="font-medium">{purpose}</p></div>}
      </div>
      <TermsSummary
        principalAmount={amount}
        interestRate={Number(product.interestRate)}
        interestType={product.interestType}
        fees={amount * Number(product.processingFeeRate ?? 0)}
        tenureMonths={tenure}
        totalRepayable={repaymentPreview?.totalRepayment}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button type="button" className="flex-1" disabled={isSubmitting} onClick={onSubmit}>
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
      </div>
    </div>
  )
}

// ─── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: LoanWizardStep }) {
  const currentIndex = WIZARD_STEPS.findIndex((step) => step.id === current)
  return (
    <div className="flex items-center gap-2">
      {WIZARD_STEPS.map((step, index) => (
        <React.Fragment key={step.id}>
          <Badge variant={index <= currentIndex ? "default" : "secondary"} className="whitespace-nowrap">
            {index + 1}. {step.label}
          </Badge>
          {index < WIZARD_STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Wizard shell ───────────────────────────────────────────────────────────

export default function ApplyLoanPage() {
  const router = useRouter()
  const draft = useLoanApplicationStore()
  const products = useQuery({ queryKey: ["loan-products"], queryFn: () => loansApi.getProducts() })
  const dashboard = useQuery({ queryKey: ["member-dashboard"], queryFn: () => memberApi.getDashboard() })
  const memberLoans = useQuery({ queryKey: ["member-loans-for-apply"], queryFn: () => loansApi.getMyLoans({ limit: 50 }) })
  const productList = products.data?.success ? products.data.data ?? [] : []
  const dashboardData = dashboard.data?.success ? dashboard.data.data : null
  const loans = memberLoans.data?.success ? memberLoans.data.data?.data ?? [] : []
  const openLoan = loans.find((loan) => OPEN_LOAN_STATUSES.has(loan.status))
  const previousGuarantors = React.useMemo(() => getPreviouslyAcceptedGuarantors(loans), [loans])
  const member = dashboardData?.member ?? null
  const isKycApproved = isKycVerified(member?.kycStatus)
  const product = productList.find((item) => item.id === draft.loanProductId)
  const amount = Number(draft.principalAmount || 0)
  const tenure = Number(draft.tenureMonths || 0)
  const minGuarantors = product?.minGuarantors ?? 0
  const maxGuarantors = product?.maxGuarantors ?? 0
  const coverageRatio = Number(product?.guarantorCoverageRatio ?? 1)
  const requiredCoverage = amount * coverageRatio
  const coveragePasses = minGuarantors === 0 || draft.guarantors.length >= minGuarantors
  const maxPasses = maxGuarantors <= 0 || draft.guarantors.length <= maxGuarantors
  const productLoanLimit = getProductLoanLimit(product, dashboardData)
  const repaymentPreview = React.useMemo(() => {
    if (!product || amount <= 0 || tenure <= 0) return null
    return calculateLoanRepayment(amount, Number(product.interestRate), tenure, product.interestType)
  }, [product, amount, tenure])
  const isLoading = products.isLoading || dashboard.isLoading || memberLoans.isLoading
  const blocked = Boolean(openLoan) || (member ? !isKycApproved : false)
  const blockedReason = openLoan
    ? "Clear your existing loan before applying again."
    : member && !isKycApproved
      ? "Your KYC must be approved before applying."
      : null

  // Generated once per application draft, then reused for every retry of the
  // eventual submit — including a browser refresh, since it's part of the
  // persisted draft.
  React.useEffect(() => {
    draft.ensureIdempotencyKey()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A persisted draft can point at a step past "product" for a loan product
  // that no longer exists once product data loads (e.g. deactivated) — bounce
  // back to step 1 rather than rendering a step with no product to show.
  React.useEffect(() => {
    if (!isLoading && draft.step !== "product" && !product) {
      draft.setStep("product")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, product])

  const apply = useMutation({
    mutationFn: () =>
      memberApi.applyForLoan(
        {
          loanProductId: draft.loanProductId,
          principalAmount: amount,
          tenureMonths: tenure,
          purpose: draft.purpose,
          guarantorIds: draft.guarantors.map((g) => g.memberId),
        },
        draft.ensureIdempotencyKey(),
      ),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error?.message ?? "Application failed"); return }
      toast.success("Loan application submitted. Guarantors have been notified.")
      draft.reset()
      router.push("/member/loans")
    },
    onError: () => toast.error("Network error while submitting loan application."),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Apply for Loan</h1>
        <p className="text-muted-foreground">A few short steps — your progress is saved if you need to refresh.</p>
      </div>
      {member && !isKycApproved && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTitle className="text-amber-900">KYC verification required</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Your KYC status is {getFormattedStatusLabel(member.kycStatus)}. Staff must approve it before a loan can be submitted.
              {member.kycRejectionReason ? ` Reason: ${member.kycRejectionReason}` : ""}
            </span>
            <Link href="/member/profile">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">View Profile</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {openLoan && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTitle className="text-amber-900">Existing loan must be cleared first</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>You already have loan {openLoan.loanNumber} in {openLoan.status.replace(/_/g, " ")} status. You can apply again after it is fully paid.</span>
            <Link href="/member/loans">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">View Loan Status</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <StepIndicator current={draft.step} />

      <Card>
        <CardHeader>
          <CardTitle>{WIZARD_STEPS.find((step) => step.id === draft.step)?.label}</CardTitle>
          <CardDescription>Product terms determine guarantor coverage.</CardDescription>
        </CardHeader>
        <CardContent>
          {draft.step === "product" && (
            <ProductStep
              productList={productList}
              defaultValue={draft.loanProductId}
              blocked={blocked}
              blockedReason={blockedReason}
              onNext={(values) => draft.setProduct(values.loanProductId)}
            />
          )}
          {draft.step === "terms" && product && (
            <TermsStep
              product={product}
              productLoanLimit={productLoanLimit}
              defaultValues={{ principalAmount: draft.principalAmount, tenureMonths: draft.tenureMonths, purpose: draft.purpose }}
              onBack={() => draft.setStep("product")}
              onNext={(values) => draft.setTerms(String(values.principalAmount), String(values.tenureMonths), values.purpose ?? "")}
            />
          )}
          {draft.step === "guarantors" && product && (
            <GuarantorsStep
              product={product}
              minGuarantors={minGuarantors}
              maxGuarantors={maxGuarantors}
              requiredCoverage={requiredCoverage}
              guarantors={draft.guarantors}
              previousGuarantors={previousGuarantors}
              onAdd={draft.addGuarantor}
              onRemove={draft.removeGuarantor}
              canProceed={coveragePasses && maxPasses}
              onBack={() => draft.setStep("terms")}
              onNext={() => draft.setStep("review")}
            />
          )}
          {draft.step === "review" && product && (
            <ReviewStep
              product={product}
              amount={amount}
              tenure={tenure}
              purpose={draft.purpose}
              guarantors={draft.guarantors}
              repaymentPreview={repaymentPreview}
              isSubmitting={apply.isPending}
              onBack={() => draft.setStep("guarantors")}
              onSubmit={() => apply.mutate()}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
