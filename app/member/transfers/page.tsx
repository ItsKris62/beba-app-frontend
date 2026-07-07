"use client"

import * as React from "react"
import { ArrowLeftRight, Smartphone, Calendar, Copy, Check, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { memberApi, type MemberDashboard } from "@/lib/api-client"

export default function TransfersPage() {
  const [dashboard, setDashboard] = React.useState<MemberDashboard | null>(null)
  const [copied, setCopied] = React.useState(false)

  const paybillNumber = "123456"

  React.useEffect(() => {
    const load = async () => {
      const res = await memberApi.getDashboard()
      if (res.success && res.data) setDashboard(res.data)
    }
    load()
  }, [])

  const accountNumber = dashboard?.member.memberNumber ?? "—"

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

        {/* FOSA to FOSA Transfer — not yet backed by an API endpoint, see note below */}
        <TabsContent value="transfer">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Member-to-Member Transfer
                  <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                </CardTitle>
                <CardDescription>Send money to another SACCO member</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Member-to-member transfers are not available yet. Support for sending money directly
                  to another member&apos;s account is under development.
                </AlertDescription>
              </Alert>
              <div className="mt-6 text-center py-8 text-muted-foreground">
                <ArrowLeftRight className="mx-auto h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">This feature is not yet available.</p>
                <p className="text-xs mt-1">Visit a branch or contact support to send funds to another member.</p>
              </div>
            </CardContent>
          </Card>
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
