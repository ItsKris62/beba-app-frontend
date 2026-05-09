"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminOverridePanel } from "@/components/AdminOverridePanel"
import { loansApi, formatCurrency, type GuarantorRecord } from "@/lib/api-client"

export default function AdminLoanDetailPage() {
  const params = useParams<{ id: string }>()
  const loan = useQuery({ queryKey: ["admin-loan", params.id], queryFn: () => loansApi.getLoan(params.id) })
  const guarantors = useQuery({ queryKey: ["admin-loan-guarantors", params.id], queryFn: () => loansApi.getGuarantors(params.id) })
  const data = loan.data?.success ? loan.data.data : null
  const g = guarantors.data?.success ? guarantors.data.data ?? [] : []
  const gate = evaluateGate(Number(data?.principalAmount ?? 0), Number(data?.loanProduct?.guarantorCoverageRatio ?? 1), data?.loanProduct?.minGuarantors ?? 0, g)

  if (loan.isLoading || guarantors.isLoading) return <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (!data) return <Card><CardHeader><CardTitle>Loan not found</CardTitle><CardDescription>Unable to load this loan.</CardDescription></CardHeader></Card>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Loan {data.loanNumber}</h1><p className="text-muted-foreground">{data.member?.user.firstName} {data.member?.user.lastName} · {data.status}</p></div>
      <Alert variant={gate.ready ? "default" : "destructive"}><AlertTitle>{gate.ready ? "✅ Ready for Disbursement" : "⚠️ Pending Guarantor Coverage"}</AlertTitle><AlertDescription>{gate.ready ? "All required guarantors accepted and coverage ratio is met." : gate.reasons.join(", ")}</AlertDescription></Alert>
      <Card><CardHeader><CardTitle>Loan Summary</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-muted-foreground">Principal</p><p className="font-semibold">{formatCurrency(Number(data.principalAmount))}</p></div><div><p className="text-muted-foreground">Outstanding</p><p className="font-semibold">{formatCurrency(Number(data.outstandingBalance))}</p></div><div><p className="text-muted-foreground">Product</p><p className="font-semibold">{data.loanProduct?.name}</p></div></CardContent></Card>
      <Card><CardHeader><CardTitle>Manager Overrides</CardTitle><CardDescription>Overrides require an audit reason and are restricted to pending guarantors.</CardDescription></CardHeader><CardContent><AdminOverridePanel loanId={params.id} guarantors={g} onUpdated={() => { loan.refetch(); guarantors.refetch() }} /></CardContent></Card>
    </div>
  )
}

function evaluateGate(principal: number, ratio: number, minGuarantors: number, guarantors: GuarantorRecord[]) {
  const accepted = guarantors.filter((item) => item.status === "ACCEPTED")
  const total = accepted.reduce((sum, item) => sum + Number(item.guaranteedAmount), 0)
  const required = principal * ratio
  const reasons: string[] = []
  if (minGuarantors > 0 && accepted.length < minGuarantors) reasons.push("Not enough accepted guarantors")
  if (minGuarantors > 0 && guarantors.some((item) => item.status !== "ACCEPTED")) reasons.push("Some guarantors are still pending or declined")
  if (minGuarantors > 0 && total < required) reasons.push(`Coverage ${formatCurrency(total)} / ${formatCurrency(required)}`)
  return { ready: reasons.length === 0, reasons }
}