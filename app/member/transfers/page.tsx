"use client"

import * as React from "react"
import { ArrowLeftRight, Smartphone, Calendar, Copy, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
// F9: Import formatCurrency from api-client, not the legacy api.ts
import { memberApi, formatCurrency, generateIdempotencyKey, type MemberDashboard } from "@/lib/api-client"

export default function TransfersPage() {
  const [dashboard, setDashboard] = React.useState<MemberDashboard | null>(null)
  const [memberNo, setMemberNo] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isTransferring, setIsTransferring] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [transferSuccess, setTransferSuccess] = React.useState(false)

  const paybillNumber = "123456"

  React.useEffect(() => {
    const load = async () => {
      const res = await memberApi.getDashboard()
      if (res.success && res.data) setDashboard(res.data)
    }
    load()
  }, [])

  const accountNumber = dashboard?.member.memberNumber ?? "—"
  const fosaBalance = dashboard?.balances.fosa ?? 0

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = parseFloat(amount)
    if (!memberNo.trim()) {
      toast.error("Please enter a recipient member number.")
      return
    }
    if (isNaN(amountNum) || amountNum < 100) {
      toast.error("Minimum transfer amount is KES 100.")
      return
    }
    if (amountNum > fosaBalance) {
      toast.error("Insufficient FOSA balance.")
      return
    }

    setIsTransferring(true)
    try {
      const idempotencyKey = generateIdempotencyKey()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/members/transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": process.env.NEXT_PUBLIC_TENANT_ID ?? "",
            "X-Idempotency-Key": idempotencyKey,
            Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("beba_access_token") ?? "" : ""}`,
          },
          body: JSON.stringify({
            recipientMemberNumber: memberNo.trim(),
            amount: amountNum,
            description: description.trim() || undefined,
          }),
        }
      )
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error?.message ?? "Transfer failed. Please try again.")
        return
      }
      toast.success(`KES ${formatCurrency(amountNum)} sent to ${memberNo} successfully!`)
      setTransferSuccess(true)
      setMemberNo("")
      setAmount("")
      setDescription("")
      // Refresh balance
      const dashRes = await memberApi.getDashboard()
      if (dashRes.success && dashRes.data) setDashboard(dashRes.data)
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsTransferring(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfers</h1>
        <p className="text-muted-foreground">Send money and manage deposits</p>
      </div>

      <Tabs defaultValue="transfer">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transfer" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Transfer</span>
          </TabsTrigger>
          <TabsTrigger value="deposit" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">M-Pesa</span>
          </TabsTrigger>
          <TabsTrigger value="standing" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Standing Orders</span>
          </TabsTrigger>
        </TabsList>

        {/* FOSA to FOSA Transfer */}
        <TabsContent value="transfer">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>FOSA to FOSA Transfer</CardTitle>
                <CardDescription>Send money to another SACCO member</CardDescription>
              </CardHeader>
              {transferSuccess ? (
                <CardContent className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-lg font-semibold">Transfer Successful!</p>
                  <p className="text-sm text-muted-foreground mt-1">The funds have been sent.</p>
                  <Button className="mt-4" onClick={() => setTransferSuccess(false)}>
                    Make Another Transfer
                  </Button>
                </CardContent>
              ) : (
                <form onSubmit={handleTransfer}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="memberNo">Recipient Member Number</Label>
                      <Input
                        id="memberNo"
                        placeholder="e.g. M23456"
                        value={memberNo}
                        onChange={(e) => setMemberNo(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (KES)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        min="100"
                        max="500000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="What&apos;s this for?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        Available Balance:{" "}
                        <span className="font-semibold text-foreground">{formatCurrency(fosaBalance)}</span>
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full" disabled={isTransferring}>
                      {isTransferring ? "Processing…" : "Send Money"}
                    </Button>
                  </CardFooter>
                </form>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transfer Guidelines</CardTitle>
                <CardDescription>Important information about transfers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Transfer Limits</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Minimum transfer: KES 100</li>
                    <li>• Maximum per transaction: KES 500,000</li>
                    <li>• Daily limit: KES 1,000,000</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Processing Time</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• FOSA to FOSA: Instant</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Fees</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• FOSA to FOSA: Free</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* M-Pesa Deposit Instructions */}
        <TabsContent value="deposit">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  Deposit via M-Pesa Paybill
                </CardTitle>
                <CardDescription>Follow these steps to deposit from your M-Pesa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border bg-green-50 border-green-200 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Paybill Number</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold text-green-700">{paybillNumber}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(paybillNumber)}
                        >
                          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Number</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold">{accountNumber}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(accountNumber)}
                        >
                          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">How to Deposit</h4>
                  <ol className="space-y-3">
                    {[
                      "Go to M-Pesa on your phone",
                      "Select Lipa na M-Pesa",
                      "Select Pay Bill",
                      `Enter Business Number: ${paybillNumber}`,
                      `Enter Account Number: ${accountNumber}`,
                      "Enter Amount and your M-Pesa PIN",
                      "Confirm the transaction",
                    ].map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {index + 1}
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>STK Push Deposit</CardTitle>
                <CardDescription>Prefer a prompt on your phone? Use the Accounts page.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  For a faster experience, use the M-Pesa STK Push on the Accounts page — we&apos;ll send a payment
                  prompt directly to your phone.
                </p>
                <Button variant="outline" asChild>
                  <a href="/member/accounts#deposit">Go to Accounts → Deposit</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Standing Orders — Phase 2 */}
        <TabsContent value="standing">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Standing Orders
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </CardTitle>
                <CardDescription>Automated recurring transactions</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Phase 2 Feature:</strong> Standing orders (automated recurring transfers) are under
                  development and will be available in the next release. You will be notified when this feature
                  goes live.
                </AlertDescription>
              </Alert>
              <div className="mt-6 text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">Standing orders are not yet available.</p>
                <p className="text-xs mt-1">Contact your branch to set up recurring deductions.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
