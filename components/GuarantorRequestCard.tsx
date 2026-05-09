"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { memberApi, formatCurrency, generateIdempotencyKey, type GuarantorRequest } from "@/lib/api-client"

const ERROR_TOASTS: Record<string, string> = {
  IDEMPOTENCY_KEY_REQUIRED: "Please retry. The security key was not generated.",
  GUARANTOR_INSUFFICIENT_FUNDS: "Your available balance is below the guarantee amount.",
  GUARANTOR_KYC_NOT_VERIFIED: "Your KYC status must be verified before accepting.",
  DISBURSEMENT_BLOCKED_COVERAGE: "This loan still has insufficient guarantor coverage.",
}

function mapError(message?: string) {
  const code = Object.keys(ERROR_TOASTS).find((key) => (message ?? "").includes(key))
  return code ? ERROR_TOASTS[code] : message ?? "Unable to submit guarantor response."
}

export function GuarantorRequestCard({ request, onSettled }: { request: GuarantorRequest; onSettled: () => void }) {
  const [notes, setNotes] = React.useState("")
  const mutation = useMutation({
    mutationFn: (action: "ACCEPT" | "DECLINE") => memberApi.respondToGuarantor(request.loanId, action, notes, generateIdempotencyKey()),
    onSuccess: (res, action) => {
      if (!res.success) { toast.error(mapError(res.error?.message)); return }
      toast.success(action === "ACCEPT" ? "Guarantee accepted and funds locked." : "Guarantee declined.")
      onSettled()
    },
    onError: () => toast.error("Network error while submitting response."),
  })

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>{request.applicantName}</span><span className="text-sm text-muted-foreground">{request.loanNumber}</span></CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-muted-foreground">Loan amount</p><p className="font-semibold">{formatCurrency(request.amount)}</p></div><div><p className="text-muted-foreground">Your obligation</p><p className="font-semibold text-amber-700">{formatCurrency(request.guaranteedAmount)}</p></div></div>
        {request.purpose && <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>}
        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Financial impact warning</AlertTitle><AlertDescription>Accepting locks {formatCurrency(request.guaranteedAmount)} from your available balance until repayment, decline, expiry, or administrative rejection.</AlertDescription></Alert>
        <Textarea placeholder="Optional note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <div className="flex gap-2">
          <AlertDialog><AlertDialogTrigger asChild><Button disabled={mutation.isPending}><CheckCircle2 className="mr-2 h-4 w-4" />Accept</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Accept guarantee?</AlertDialogTitle><AlertDialogDescription>{formatCurrency(request.guaranteedAmount)} will be locked from your account balance.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => mutation.mutate("ACCEPT")}>Accept and lock funds</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" />Decline</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Decline guarantee?</AlertDialogTitle><AlertDialogDescription>The borrower may need another guarantor before this loan can proceed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => mutation.mutate("DECLINE")}>Decline</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}