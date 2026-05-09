"use client"

import * as React from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
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
  const productList = products.data?.success ? products.data.data ?? [] : []
  const product = productList.find((item) => item.id === loanProductId)
  const amount = Number(principalAmount || 0)
  const tenure = Number(tenureMonths || 0)
  const minGuarantors = product?.minGuarantors ?? 0
  const coverageRatio = Number(product?.guarantorCoverageRatio ?? 1)
  const requiredCoverage = amount * coverageRatio
  const coveragePasses = minGuarantors === 0 || guarantors.length >= minGuarantors
  const canSubmit = Boolean(product && amount > 0 && tenure > 0 && coveragePasses)
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
      <Card>
        <CardHeader><CardTitle>Loan Details</CardTitle><CardDescription>Product terms determine guarantor coverage.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Loan Product</Label><Select value={loanProductId} onValueChange={(value) => { setLoanProductId(value); setGuarantors([]) }}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{productList.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Amount (KES)</Label><Input type="number" value={principalAmount} onChange={(e) => setPrincipalAmount(e.target.value)} min={product ? Number(product.minAmount) : 100} /></div><div className="space-y-2"><Label>Tenure (months)</Label><Input type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} min={1} max={product?.maxTenureMonths ?? 60} /></div></div>
          <div className="space-y-2"><Label>Purpose</Label><Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} /></div>
          {product && <Alert><AlertTitle>Guarantor requirements</AlertTitle><AlertDescription>{minGuarantors} guarantor(s), coverage ratio {(coverageRatio * 100).toFixed(0)}%, required coverage {formatCurrency(requiredCoverage)}.</AlertDescription></Alert>}
          {product && <GuarantorLookup requiredAmount={requiredCoverage} minGuarantors={minGuarantors} guarantors={guarantors} onAdd={(g) => setGuarantors((prev) => [...prev, g])} onRemove={(id) => setGuarantors((prev) => prev.filter((g) => g.memberId !== id))} />}
          <Button className="w-full" disabled={!canSubmit || apply.isPending} onClick={() => apply.mutate()}>{apply.isPending ? "Submitting…" : "Submit Application"}</Button>
        </CardContent>
      </Card>
    </div>
  )
}