"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { memberApi, formatCurrency, generateIdempotencyKey, type GuarantorRequest } from "@/lib/api-client"
import { useScrollToEnd } from "@/hooks/use-scroll-to-end"
import { TermsSummary } from "@/components/TermsSummary"

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

function GuarantorDisclosure({
  request,
  containerRef,
  sentinelRef,
}: {
  request: GuarantorRequest
  containerRef: React.RefObject<HTMLDivElement | null>
  sentinelRef: (node: HTMLDivElement | null) => void
}) {
  return (
    <div
      ref={containerRef}
      data-testid="guarantor-disclosure-scroll-area"
      className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-4 text-sm text-muted-foreground"
    >
      <p>
        By accepting this request, you agree to act as a guarantor for loan {request.loanNumber} applied for by{" "}
        {request.applicantName}, for a principal amount of {formatCurrency(request.amount)}.
      </p>
      <p>
        Your guaranteed portion is <strong className="text-foreground">{formatCurrency(request.guaranteedAmount)}</strong>.
        This amount will be placed on hold against your own account balance immediately upon acceptance and cannot be
        withdrawn while the hold is active.
      </p>
      <p>
        If the borrower defaults on this loan — misses repayments beyond the SACCO&apos;s grace period, or the loan is
        otherwise written off — up to {formatCurrency(request.guaranteedAmount)} may be deducted from your account to
        cover the shortfall, without further consent being requested from you at that time.
      </p>
      <p>
        The hold on your funds will be released when the loan is fully repaid, if you are removed as a guarantor by
        loan officer or manager override, or if the loan application is withdrawn or rejected before disbursement.
      </p>
      <p>
        This action is recorded against your account with a timestamp and your IP address as your acceptance of these
        terms, in accordance with the SACCO&apos;s obligations under the Kenya Data Protection Act.
      </p>
      <p>You may decline this request instead, in which case the borrower will need to find another guarantor.</p>
      <div ref={sentinelRef} data-testid="guarantor-disclosure-end" />
    </div>
  )
}

export function GuarantorRequestCard({ request, onSettled }: { request: GuarantorRequest; onSettled: () => void }) {
  const [notes, setNotes] = React.useState("")
  const [disclosureAcknowledged, setDisclosureAcknowledged] = React.useState(false)
  const { containerRef, sentinelRef, reachedEnd } = useScrollToEnd<HTMLDivElement>()
  // Generated once for this request card's lifetime and reused for whichever
  // action (accept/decline) the member actually submits — not regenerated on
  // every mutate() call, so a manual retry after a transient failure doesn't
  // silently become a second logical submission.
  const idempotencyKeyRef = React.useRef(generateIdempotencyKey())

  const mutation = useMutation({
    mutationFn: (action: "ACCEPT" | "DECLINE") =>
      memberApi.respondToGuarantor(
        request.loanId,
        action,
        notes,
        action === "ACCEPT" ? disclosureAcknowledged : false,
        idempotencyKeyRef.current,
      ),
    onSuccess: (res, action) => {
      if (!res.success) { toast.error(mapError(res.error?.message)); return }
      toast.success(action === "ACCEPT" ? "Guarantee accepted and funds locked." : "Guarantee declined.")
      onSettled()
    },
    onError: () => toast.error("Network error while submitting response."),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{request.applicantName}</span>
          <span className="text-sm text-muted-foreground">{request.loanNumber}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div><p className="text-muted-foreground">Loan amount</p><p className="font-semibold">{formatCurrency(request.amount)}</p></div>
          <div><p className="text-muted-foreground">Your obligation</p><p className="font-semibold text-amber-700">{formatCurrency(request.guaranteedAmount)}</p></div>
        </div>
        {request.purpose && <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Financial impact warning</AlertTitle>
          <AlertDescription>
            Accepting locks {formatCurrency(request.guaranteedAmount)} from your available balance until repayment,
            decline, expiry, or administrative rejection.
          </AlertDescription>
        </Alert>
        <Textarea placeholder="Optional note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <div className="flex gap-2">
          <AlertDialog onOpenChange={(open) => { if (!open) setDisclosureAcknowledged(false) }}>
            <AlertDialogTrigger asChild>
              <Button disabled={mutation.isPending}><CheckCircle2 className="mr-2 h-4 w-4" />Accept</Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Guarantor disclosure</AlertDialogTitle>
                <AlertDialogDescription>
                  Read the full disclosure below. You can accept once you&apos;ve reached the end.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Loan terms</p>
                <TermsSummary principalAmount={request.amount} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Interest rate, fees, and tenure aren&apos;t shown here — ask the borrower or the SACCO office for
                  the full loan terms before deciding.
                </p>
              </div>
              <GuarantorDisclosure request={request} containerRef={containerRef} sentinelRef={sentinelRef} />
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Up to <strong>{formatCurrency(request.guaranteedAmount)}</strong> may be recovered from you if this
                  loan defaults.
                </p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={disclosureAcknowledged}
                  disabled={!reachedEnd}
                  onCheckedChange={(checked) => setDisclosureAcknowledged(checked === true)}
                />
                <span>
                  {reachedEnd
                    ? "I have read and understood this disclosure."
                    : "Scroll to the end of the disclosure above to continue."}
                </span>
              </label>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={!disclosureAcknowledged || mutation.isPending}
                  onClick={() => mutation.mutate("ACCEPT")}
                >
                  Accept and lock funds
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={mutation.isPending}><XCircle className="mr-2 h-4 w-4" />Decline</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Decline guarantee?</AlertDialogTitle>
                <AlertDialogDescription>The borrower may need another guarantor before this loan can proceed.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => mutation.mutate("DECLINE")}>Decline</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
