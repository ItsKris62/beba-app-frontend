"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { CreditCard, Calendar, Percent, ChevronRight } from "lucide-react"

interface LoanCardProps {
  id: string
  type: string
  principalAmount: number
  outstandingBalance: number
  interestRate: number
  monthlyPayment: number
  nextPaymentDate: string
  status: "active" | "completed" | "defaulted" | "pending"
  onViewDetails?: () => void
  onMakePayment?: () => void
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

export function LoanCard({
  id,
  type,
  principalAmount,
  outstandingBalance,
  interestRate,
  monthlyPayment,
  nextPaymentDate,
  status,
  onViewDetails,
  onMakePayment,
  className,
}: LoanCardProps) {
  const repaymentProgress = ((principalAmount - outstandingBalance) / principalAmount) * 100

  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "completed":
        return <Badge variant="secondary">Completed</Badge>
      case "defaulted":
        return <Badge variant="destructive">Defaulted</Badge>
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      default:
        return null
    }
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{type}</CardTitle>
              <CardDescription>{id}</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Principal</p>
            <p className="font-semibold">{formatCurrency(principalAmount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="font-semibold text-amber-600">{formatCurrency(outstandingBalance)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Repayment Progress</span>
            <span className="font-medium">{repaymentProgress.toFixed(1)}%</span>
          </div>
          <Progress value={repaymentProgress} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Percent className="h-3 w-3" />
              Rate
            </div>
            <p className="font-semibold text-sm">{interestRate}%</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <CreditCard className="h-3 w-3" />
              Monthly
            </div>
            <p className="font-semibold text-sm">{formatCurrency(monthlyPayment)}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              Next Due
            </div>
            <p className="font-semibold text-sm">
              {new Date(nextPaymentDate).toLocaleDateString("en-KE", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {status === "active" && onMakePayment && (
            <Button className="flex-1" onClick={onMakePayment}>
              Make Payment
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant={status === "active" ? "outline" : "default"}
              className="flex-1"
              onClick={onViewDetails}
            >
              View Details
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
