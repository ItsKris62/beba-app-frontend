"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CreditCard,
  ChevronRight,
} from "lucide-react"

interface Transaction {
  id: string
  type: "deposit" | "withdrawal" | "transfer" | "loan_repayment" | "loan_disbursement"
  amount: number
  description: string
  date: string
  status: "completed" | "pending" | "failed"
}

interface TransactionListProps {
  transactions: Transaction[]
  title?: string
  description?: string
  showViewAll?: boolean
  onViewAll?: () => void
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

function getTransactionIcon(type: Transaction["type"]) {
  switch (type) {
    case "deposit":
      return <ArrowDownRight className="h-4 w-4 text-green-500" />
    case "withdrawal":
      return <ArrowUpRight className="h-4 w-4 text-red-500" />
    case "transfer":
      return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
    case "loan_repayment":
      return <CreditCard className="h-4 w-4 text-purple-500" />
    case "loan_disbursement":
      return <CreditCard className="h-4 w-4 text-amber-500" />
    default:
      return <CreditCard className="h-4 w-4" />
  }
}

function getTransactionColor(type: Transaction["type"]) {
  switch (type) {
    case "deposit":
    case "loan_disbursement":
      return "text-green-600"
    case "withdrawal":
    case "loan_repayment":
      return "text-red-600"
    default:
      return ""
  }
}

function getTransactionSign(type: Transaction["type"]) {
  switch (type) {
    case "deposit":
    case "loan_disbursement":
      return "+"
    case "withdrawal":
    case "loan_repayment":
      return "-"
    default:
      return ""
  }
}

export function TransactionList({
  transactions,
  title = "Recent Transactions",
  description,
  showViewAll = false,
  onViewAll,
  className,
}: TransactionListProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No transactions found
          </p>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold",
                      getTransactionColor(transaction.type)
                    )}
                  >
                    {getTransactionSign(transaction.type)}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <Badge
                    variant={
                      transaction.status === "completed"
                        ? "default"
                        : transaction.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
