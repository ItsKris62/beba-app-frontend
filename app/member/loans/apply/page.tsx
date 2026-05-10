"use client"

import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { GuarantorLookup, type SelectedGuarantor } from "@/components/GuarantorLookup"
import { loansApi, memberApi, formatCurrency, generateIdempotencyKey } from "@/lib/api-client"

export default function ApplyLoanPage() {
  const router = useRouter()
  const [loanProductId, setLoanProductId] = React.useState("")
  const [principalAmount, setPrincipalAmount] = React.useState("")
  const [tenureMonths, setTenureMonths] = React.useState("")
  const [purpose, setPurpose] = React.useState("")
  const [guarantors, setGuarantors] = React.useState<SelectedGuarantor[]>([])
  const products = useQuery({ queryKey: ["loan-products"], queryFn: () => loansApi.getProducts() })
  const dashboard = useQuery({ queryKey: ["member-dashboard"], queryFn: () => memberApi.getDashboard() })
  const productList = products.data?.success ? products.data.data ?? [] : []
  const member = dashboard.data?.success ? dashboard.data.data?.member : null
  const isKycApproved = member?.kycStatus === "APPROVED"
  const product = productList.find((item) => item.id === loanProductId)
  const amount = Number(principalAmount || 0)
  const tenure = Number(tenureMonths || 0)
  const minGuarantors = product?.minGuarantors ?? 0
  const maxGuarantors = product?.maxGuarantors ?? 0
  const coverageRatio = Number(product?.guarantorCoverageRatio ?? 1)
  const requiredCoverage = amount * coverageRatio
  const coveragePasses = minGuarantors === 0 || guarantors.length >= minGuarantors
  const maxPasses = maxGuarantors <= 0 || guarantors.length <= maxGuarantors
  const canSubmit = Boolean(product && amount > 0 && tenure > 0 && coveragePasses && maxPasses)
  const apply = useMutation({
    mutationFn: () => memberApi.applyForLoan({ loanProductId, principalAmount: amount, tenureMonths: tenure, purpose, guarantorIds: guarantors.map((g) => g.memberId) }, generateIdempotencyKey()),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error?.message ?? "Application failed"); return }
      toast.success("Loan application submitted. Guarantors have been notified.")
      router.push("/member/loans")
    },
    onError: () => toast.error("Network error while submitting loan application."),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Apply for Loan</h1><p className="text-muted-foreground">Select guarantors by National ID only.</p></div>
      {member && !isKycApproved && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTitle className="text-amber-900">KYC verification required</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Your KYC status is {member.kycStatus.replace(/_/g, " ")}. Staff must approve it before a loan can be submitted.
              {member.kycRejectionReason ? ` Reason: ${member.kycRejectionReason}` : ""}
            </span>
            <Link href="/member/profile">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                View Profile
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader><CardTitle>Loan Details</CardTitle><CardDescription>Product terms determine guarantor coverage.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Loan Product</Label><Select value={loanProductId} onValueChange={(value) => { setLoanProductId(value); setGuarantors([]) }}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{productList.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Amount (KES)</Label><Input type="number" value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} min={product ? Number(product.minAmount) : 100} /></div><div className="space-y-2"><Label>Tenure (months)</Label><Input type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} min={1} max={product?.maxTenureMonths ?? 60} /></div></div>
          <div className="space-y-2"><Label>Purpose</Label><Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} /></div>
          {product && <Alert><AlertTitle>Guarantor requirements</AlertTitle><AlertDescription>{minGuarantors} to {maxGuarantors} guarantor(s), coverage ratio {(coverageRatio * 100).toFixed(0)}%, required coverage {formatCurrency(requiredCoverage)}.</AlertDescription></Alert>}
          {product && (
            <div className="space-y-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">Choose guarantors</p>
                <p className="text-xs text-muted-foreground">
                  Search an active member by National ID and add them as a guarantor.
                  {amount <= 0 ? " Enter the loan amount first so the system can check their savings capacity." : ""}
                </p>
              </div>
              {amount > 0 ? (
                <GuarantorLookup
                  requiredAmount={requiredCoverage}
                  minGuarantors={Math.max(minGuarantors, 1)}
                  maxGuarantors={maxGuarantors}
                  loanProductId={loanProductId}
                  guarantors={guarantors}
                  onAdd={(g) => setGuarantors((prev) => maxGuarantors > 0 && prev.length >= maxGuarantors ? prev : [...prev, g])}
                  onRemove={(id) => setGuarantors((prev) => prev.filter((g) => g.memberId !== id))}
                />
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Enter a loan amount to enable guarantor lookup.</p>
              )}
            </div>
          )}
          <Button className="w-full" disabled={!canSubmit || apply.isPending || !isKycApproved} onClick={() => apply.mutate()}>{apply.isPending ? "Submitting…" : "Submit Application"}</Button>
        </CardContent>
      </Card>
    </div>
  )
}
