"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react"
import {
  adminApi,
  formatCurrency,
  formatDateTime,
  type AdminTransaction,
  type TransactionType,
  type TransactionStatus,
  type ApiMeta,
  type TransactionStats,
} from "@/lib/api-client"

// ─── Label / colour maps ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  LOAN_DISBURSEMENT: "Loan Disbursement",
  LOAN_REPAYMENT: "Loan Repayment",
  INTEREST_EARNED: "Interest Earned",
  INTEREST_ACCRUAL: "Interest Accrual",
  PENALTY: "Penalty",
  DIVIDEND_PAYOUT: "Dividend",
  FEE_CHARGE: "Fee",
  TRANSFER: "Transfer",
}

const TYPE_COLORS: Record<TransactionType, string> = {
  DEPOSIT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  WITHDRAWAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  LOAN_DISBURSEMENT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  LOAN_REPAYMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  INTEREST_EARNED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  INTEREST_ACCRUAL: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  PENALTY: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  DIVIDEND_PAYOUT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  FEE_CHARGE: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
  TRANSFER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
}

const STATUS_VARIANT: Record<
  TransactionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  COMPLETED: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REVERSED: "outline",
  RECON_PENDING: "outline",
}

const STATUS_LABELS: Record<TransactionStatus, string> = {
  COMPLETED: "Completed",
  PENDING: "Pending",
  FAILED: "Failed",
  REVERSED: "Reversed",
  RECON_PENDING: "Recon Pending",
}

// ─── Type icon ────────────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: TransactionType }) {
  switch (type) {
    case "DEPOSIT":
    case "INTEREST_EARNED":
    case "DIVIDEND_PAYOUT":
      return <ArrowDownRight className="h-4 w-4 text-green-500" />
    case "WITHDRAWAL":
    case "PENALTY":
    case "FEE_CHARGE":
      return <ArrowUpRight className="h-4 w-4 text-red-500" />
    case "TRANSFER":
      return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
    default:
      return <CreditCard className="h-4 w-4 text-muted-foreground" />
  }
}

// Whether a type should be displayed with a + prefix (inflow from account perspective)
function isInflow(type: TransactionType): boolean {
  return ["DEPOSIT", "INTEREST_EARNED", "DIVIDEND_PAYOUT", "LOAN_DISBURSEMENT"].includes(type)
}

// ─── Stat summary derived from current page ───────────────────────────────────

function StatAmount({
  value,
  loading,
  error,
  className,
}: {
  value: number | undefined
  loading: boolean
  error: string | null
  className?: string
}) {
  if (loading) return <div className="h-8 w-28 rounded bg-muted animate-pulse" />
  if (error) return <div className="text-lg font-semibold text-muted-foreground">Unavailable</div>
  return <div className={`text-2xl font-bold ${className ?? ""}`}>{formatCurrency(value ?? 0)}</div>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all")
  const [page, setPage] = useState(1)

  // Debounce search so we don't hammer the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getTransactions({
        ...(typeFilter !== "all" && { type: typeFilter }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch }),
        page,
        limit: 20,
      })

      if (!res.success) {
        setError(res.error?.message ?? "Failed to load transactions")
        return
      }

      const payload = res.data as { data: AdminTransaction[]; meta: ApiMeta }
      setTransactions(payload.data)
      setMeta(payload.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, debouncedSearch, page])

  const fetchTransactionStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const res = await adminApi.getTransactionStats({
        ...(debouncedSearch && { search: debouncedSearch }),
      })

      if (!res.success) {
        setStatsError(res.error?.message ?? "Failed to load transaction stats")
        return
      }

      setStats(res.data)
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setStatsLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    fetchTransactionStats()
  }, [fetchTransactionStats])

  // Reset to page 1 when filters change
  const handleTypeChange = (v: string) => {
    setTypeFilter(v as TransactionType | "all")
    setPage(1)
  }
  const handleStatusChange = (v: string) => {
    setStatusFilter(v as TransactionStatus | "all")
    setPage(1)
  }

  const refreshAll = () => {
    fetchTransactions()
    fetchTransactionStats()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Monitor and manage all financial transactions</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading || statsLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading || statsLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {statsError && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{statsError}</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Page Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatAmount value={stats?.pageVolume} loading={statsLoading} error={statsError} />
            <p className="text-xs text-muted-foreground">Completed transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inflows</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <StatAmount value={stats?.inflows} loading={statsLoading} error={statsError} className="text-green-600" />
            <p className="text-xs text-muted-foreground">Deposits &amp; disbursements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outflows</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <StatAmount value={stats?.outflows} loading={statsLoading} error={statsError} className="text-red-600" />
            <p className="text-xs text-muted-foreground">Withdrawals &amp; fees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatAmount
              value={stats?.netFlow}
              loading={statsLoading}
              error={statsError}
              className={(stats?.netFlow ?? 0) >= 0 ? "text-green-600" : "text-red-600"}
            />
            <p className="text-xs text-muted-foreground">All filtered records</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>
                {meta ? `${meta.total.toLocaleString()} total records` : "Loading…"}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Reference or account…"
                  className="pl-8 w-full sm:w-56"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="DEPOSIT">Deposit</SelectItem>
                  <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                  <SelectItem value="LOAN_DISBURSEMENT">Loan Disbursement</SelectItem>
                  <SelectItem value="LOAN_REPAYMENT">Loan Repayment</SelectItem>
                  <SelectItem value="INTEREST_EARNED">Interest Earned</SelectItem>
                  <SelectItem value="INTEREST_ACCRUAL">Interest Accrual</SelectItem>
                  <SelectItem value="PENALTY">Penalty</SelectItem>
                  <SelectItem value="DIVIDEND_PAYOUT">Dividend</SelectItem>
                  <SelectItem value="FEE_CHARGE">Fee</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REVERSED">Reversed</SelectItem>
                  <SelectItem value="RECON_PENDING">Recon Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Member / Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-4 rounded bg-muted animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">{tx.reference}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {tx.account.member.user.firstName} {tx.account.member.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.account.member.memberNumber} · {tx.account.accountNumber} ({tx.account.accountType})
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={TYPE_COLORS[tx.type]} variant="outline">
                          <TypeIcon type={tx.type} />
                          <span className="ml-1">{TYPE_LABELS[tx.type]}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={isInflow(tx.type) ? "text-green-600" : "text-red-600"}>
                          {isInflow(tx.type) ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(tx.balanceAfter)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[tx.status]}>
                          {STATUS_LABELS[tx.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages} &mdash; {meta.total.toLocaleString()} records
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (meta.totalPages ?? 1) || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
