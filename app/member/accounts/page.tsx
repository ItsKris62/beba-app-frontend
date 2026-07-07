"use client"

import * as React from "react"
import { Smartphone, RefreshCw, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { memberApi, formatCurrency, formatDateTime, generateIdempotencyKey, type MemberDashboard } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

type DepositStatus = "idle" | "pending" | "success" | "failed" | "timeout" | "cancelled"

// STK push prompts typically resolve or expire within 60-120s. Poll on a
// jittered, gently increasing interval rather than a fixed 5s tick, so a slow
// connection doesn't get hammered and many concurrent members don't all poll
// in lockstep.
const POLL_BASE_DELAY_MS = 3000
const POLL_MAX_DELAY_MS = 10000
const POLL_WINDOW_MS = 100000

/** Exported for unit testing — jittered, capped backoff delay for STK status polls. */
export function getDepositPollDelayMs(attempt: number): number {
  const base = Math.min(POLL_BASE_DELAY_MS * Math.pow(1.3, attempt), POLL_MAX_DELAY_MS)
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.round(base + jitter)
}

export default function AccountsPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = React.useState<MemberDashboard | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  // Deposit form
  const [phone, setPhone] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [depositStatus, setDepositStatus] = React.useState<DepositStatus>("idle")
  const [checkoutId, setCheckoutId] = React.useState<string | null>(null)
  const [isDepositing, setIsDepositing] = React.useState(false)

  // Track the poll's retry timeout, elapsed window, and a cancellation flag
  // (the flag matters because a poll's in-flight request can resolve after
  // the user has already clicked Cancel).
  const pollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollAttemptRef = React.useRef(0)
  const pollStartedAtRef = React.useRef(0)
  const pollCancelledRef = React.useRef(false)

  const stopPolling = React.useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
    pollAttemptRef.current = 0
  }, [])

  // Cancel polling on unmount
  React.useEffect(() => {
    return () => {
      pollCancelledRef.current = true
      stopPolling()
    }
  }, [stopPolling])

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const res = await memberApi.getDashboard()
      if (res.success && res.data) {
        setDashboard(res.data)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phone || (!phone.startsWith("07") && !phone.startsWith("01")) || phone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number starting with 07 or 01")
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < 10) {
      toast.error("Enter a valid amount (min KES 10)")
      return
    }
    
    // Normalize phone: 07xx/01xx → 2547xx/2541xx
    const normalizedPhone = "254" + phone.slice(1)

    setIsDepositing(true)
    setDepositStatus("pending")
    try {
      const key = generateIdempotencyKey()
      const res = await memberApi.initiateDeposit(normalizedPhone, amountNum, key)
      if (!res.success || !res.data) {
        toast.error(res.error?.message ?? "Failed to initiate deposit")
        setDepositStatus("failed")
        return
      }
      const cid = res.data.checkoutRequestId
      setCheckoutId(cid)
      toast.success(res.data.customerMessage ?? "STK Push sent! Check your phone.")
      setDepositStatus("pending")
      startPolling(cid)
    } catch {
      toast.error("Network error. Please try again.")
      setDepositStatus("failed")
    } finally {
      setIsDepositing(false)
    }
  }

  const startPolling = (cid: string) => {
    stopPolling()
    pollCancelledRef.current = false
    pollStartedAtRef.current = Date.now()

    const poll = async () => {
      if (pollCancelledRef.current) return
      pollAttemptRef.current += 1

      const res = await memberApi.getDepositStatus(cid)
      if (pollCancelledRef.current) return // user cancelled while the request was in flight

      if (res.success && res.data) {
        const status = res.data.status

        if (status === "SUCCESS") {
          stopPolling()
          setDepositStatus("success")
          toast.success("Deposit confirmed! Your FOSA balance has been updated.")
          const dashRes = await memberApi.getDashboard()
          if (dashRes.success && dashRes.data) setDashboard(dashRes.data)
          setAmount("")
          setPhone("")
          return
        }

        if (status === "FAILED") {
          stopPolling()
          setDepositStatus("failed")
          toast.error("M-Pesa payment was not completed. Please try again.")
          return
        }
      }

      // Still pending (or a transient error reading status) — check the window
      if (Date.now() - pollStartedAtRef.current >= POLL_WINDOW_MS) {
        stopPolling()
        setDepositStatus("timeout")
        toast.warning("Payment status unknown. Please check your M-Pesa messages.")
        return
      }

      pollTimeoutRef.current = setTimeout(poll, getDepositPollDelayMs(pollAttemptRef.current))
    }

    pollTimeoutRef.current = setTimeout(poll, getDepositPollDelayMs(0))
  }

  const handleCancelDeposit = () => {
    pollCancelledRef.current = true
    stopPolling()
    setDepositStatus("cancelled")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Accounts</h1>
        <p className="text-muted-foreground">Manage your FOSA and BOSA accounts</p>
      </div>

      {/* Account Balances */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>FOSA Account</CardTitle>
            <CardDescription>Front Office Savings Account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-bold text-primary" aria-label={`FOSA available balance: ${formatCurrency(dashboard?.balances.fosa ?? 0)}`}>{formatCurrency(dashboard?.balances.fosa ?? 0)}</p>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              Account No: <span className="font-mono font-medium text-foreground">{dashboard?.balances.fosaAccountId?.slice(0, 12).toUpperCase() ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>BOSA Account</CardTitle>
            <CardDescription>Back Office Savings Account (Shares)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Share Capital</p>
              <p className="text-3xl font-bold text-green-600" aria-label={`BOSA share capital: ${formatCurrency(dashboard?.balances.bosa ?? 0)}`}>{formatCurrency(dashboard?.balances.bosa ?? 0)}</p>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground">
              Account No: <span className="font-mono font-medium text-foreground">{dashboard?.balances.bosaAccountId?.slice(0, 12).toUpperCase() ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* M-Pesa Deposit */}
      <Card id="deposit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            M-Pesa Deposit
          </CardTitle>
          <CardDescription>
            Deposit funds to your FOSA account via M-Pesa STK Push
          </CardDescription>
        </CardHeader>
        <CardContent>
          {depositStatus === "success" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">Deposit Successful!</p>
                <p className="text-sm text-muted-foreground">Your FOSA balance has been updated.</p>
              </div>
              <Button onClick={() => setDepositStatus("idle")}>Make Another Deposit</Button>
            </div>
          ) : depositStatus === "timeout" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertTriangle className="h-16 w-16 text-amber-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">Payment Status Unknown</p>
                <p className="text-sm text-muted-foreground">
                  Please check your M-Pesa messages to confirm if the payment went through.
                  If debited, your balance will be updated shortly.
                </p>
                {checkoutId && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {checkoutId}</p>}
              </div>
              <Button onClick={() => setDepositStatus("idle")}>Try Again</Button>
            </div>
          ) : depositStatus === "cancelled" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="h-16 w-16 text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-semibold">Deposit Cancelled</p>
                <p className="text-sm text-muted-foreground">
                  We stopped waiting for a status update. If you already entered your M-Pesa PIN,
                  the payment may still complete — check your M-Pesa messages before retrying.
                </p>
                {checkoutId && <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {checkoutId}</p>}
              </div>
              <Button onClick={() => setDepositStatus("idle")}>Make Another Deposit</Button>
            </div>
          ) : depositStatus === "pending" && checkoutId ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Clock className="h-16 w-16 text-amber-500 animate-pulse" />
              <div className="text-center">
                <p className="text-lg font-semibold">Waiting for Payment…</p>
                <p className="text-sm text-muted-foreground">
                  Check your phone and enter your M-Pesa PIN to complete the payment.
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {checkoutId}</p>
              </div>
              <Button variant="outline" onClick={handleCancelDeposit}>Cancel</Button>
            </div>
          ) : (
            <form onSubmit={handleDeposit} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "")
                    if (val.startsWith("254")) {
                      val = "0" + val.slice(3)
                    }
                    if (val.length <= 10) {
                      setPhone(val)
                    }
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">Enter the phone number registered with M-Pesa</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  placeholder="1000"
                  min="10"
                  max="150000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e" || e.key === "+") e.preventDefault()
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum KES 10 · Maximum KES 150,000 per transaction</p>
              </div>
              {depositStatus === "failed" && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  Deposit failed. Please try again.
                </div>
              )}
              <Button type="submit" disabled={isDepositing} className="w-full">
                {isDepositing ? "Sending STK Push…" : "Deposit via M-Pesa"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 5 transactions across your accounts</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={async () => {
            const res = await memberApi.getDashboard()
            if (res.success && res.data) setDashboard(res.data)
          }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {dashboard?.recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {dashboard?.recentTransactions.map((tx) => {
                const isCredit = ["DEPOSIT", "LOAN_DISBURSEMENT", "INTEREST_EARNED", "DIVIDEND_PAYOUT"].includes(tx.type)
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{tx.description ?? tx.type}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isCredit ? "text-green-600" : "text-destructive"}`}>
                        {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">Bal: {formatCurrency(tx.balanceAfter)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
