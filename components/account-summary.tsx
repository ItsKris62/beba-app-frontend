"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Wallet, PiggyBank, TrendingUp, CreditCard } from "lucide-react"

interface AccountSummaryProps {
  savings: number
  shares: number
  deposits: number
  loanBalance: number
  loanLimit: number
  className?: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AccountSummary({
  savings,
  shares,
  deposits,
  loanBalance,
  loanLimit,
  className,
}: AccountSummaryProps) {
  const totalAssets = savings + shares + deposits
  const loanUtilization = loanLimit > 0 ? (loanBalance / loanLimit) * 100 : 0

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Account Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="rounded-lg bg-primary/10 p-2">
              <PiggyBank className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Savings</p>
              <p className="text-lg font-semibold">{formatCurrency(savings)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="rounded-lg bg-green-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Shares</p>
              <p className="text-lg font-semibold">{formatCurrency(shares)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fixed Deposits</p>
              <p className="text-lg font-semibold">{formatCurrency(deposits)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loan Balance</p>
              <p className="text-lg font-semibold">{formatCurrency(loanBalance)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Assets</span>
            <span className="font-semibold">{formatCurrency(totalAssets)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Loan Limit Utilization</span>
            <span className="font-medium">{loanUtilization.toFixed(1)}%</span>
          </div>
          <Progress value={loanUtilization} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Used: {formatCurrency(loanBalance)}</span>
            <span>Limit: {formatCurrency(loanLimit)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
