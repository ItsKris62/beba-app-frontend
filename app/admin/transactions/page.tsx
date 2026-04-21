"use client"

import { useState } from "react"
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
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const transactions = [
  { id: "TXN001", memberId: "M001", memberName: "John Kamau", type: "deposit", amount: 25000, channel: "M-Pesa", date: "2024-01-15 14:32:00", status: "completed", reference: "QKL8H2M5N9" },
  { id: "TXN002", memberId: "M002", memberName: "Mary Wanjiku", type: "withdrawal", amount: 15000, channel: "Bank Transfer", date: "2024-01-15 13:45:00", status: "completed", reference: "BNK93847562" },
  { id: "TXN003", memberId: "M003", memberName: "Peter Ochieng", type: "loan_repayment", amount: 8500, channel: "M-Pesa", date: "2024-01-15 12:20:00", status: "completed", reference: "RPY456123789" },
  { id: "TXN004", memberId: "M004", memberName: "Grace Muthoni", type: "transfer", amount: 50000, channel: "Internal", date: "2024-01-15 11:15:00", status: "completed", reference: "TRF789012345" },
  { id: "TXN005", memberId: "M005", memberName: "David Kiprop", type: "loan_disbursement", amount: 100000, channel: "Bank Transfer", date: "2024-01-15 10:00:00", status: "completed", reference: "DSB012345678" },
  { id: "TXN006", memberId: "M006", memberName: "Sarah Akinyi", type: "deposit", amount: 30000, channel: "M-Pesa", date: "2024-01-15 09:30:00", status: "pending", reference: "MPE567890123" },
  { id: "TXN007", memberId: "M007", memberName: "Michael Njoroge", type: "withdrawal", amount: 20000, channel: "ATM", date: "2024-01-14 16:45:00", status: "completed", reference: "ATM890123456" },
  { id: "TXN008", memberId: "M008", memberName: "Jane Wambui", type: "deposit", amount: 12000, channel: "M-Pesa", date: "2024-01-14 15:20:00", status: "failed", reference: "MPE123456789" },
  { id: "TXN009", memberId: "M001", memberName: "John Kamau", type: "loan_repayment", amount: 10000, channel: "Standing Order", date: "2024-01-14 14:00:00", status: "completed", reference: "STO345678901" },
  { id: "TXN010", memberId: "M002", memberName: "Mary Wanjiku", type: "transfer", amount: 35000, channel: "Internal", date: "2024-01-14 11:30:00", status: "completed", reference: "TRF678901234" },
]

const dailyVolume = [
  { date: "Jan 9", deposits: 2500000, withdrawals: 1800000, volume: 4300000 },
  { date: "Jan 10", deposits: 3200000, withdrawals: 2100000, volume: 5300000 },
  { date: "Jan 11", deposits: 2800000, withdrawals: 1950000, volume: 4750000 },
  { date: "Jan 12", deposits: 3500000, withdrawals: 2400000, volume: 5900000 },
  { date: "Jan 13", deposits: 2900000, withdrawals: 2000000, volume: 4900000 },
  { date: "Jan 14", deposits: 3800000, withdrawals: 2600000, volume: 6400000 },
  { date: "Jan 15", deposits: 4200000, withdrawals: 2800000, volume: 7000000 },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AdminTransactions() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("7d")

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.reference.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || txn.type === typeFilter
    const matchesStatus = statusFilter === "all" || txn.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const todayStats = {
    totalVolume: 7000000,
    deposits: 4200000,
    withdrawals: 2800000,
    transactionCount: 1284,
  }

  const getTypeIcon = (type: string) => {
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

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      deposit: "Deposit",
      withdrawal: "Withdrawal",
      transfer: "Transfer",
      loan_repayment: "Loan Repayment",
      loan_disbursement: "Loan Disbursement",
    }
    const typeColors: Record<string, string> = {
      deposit: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      withdrawal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      transfer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      loan_repayment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      loan_disbursement: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    }
    return (
      <Badge className={typeColors[type] || ""} variant="outline">
        {getTypeIcon(type)}
        <span className="ml-1">{typeLabels[type] || type}</span>
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Monitor and manage all financial transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayStats.totalVolume)}</div>
            <p className="text-xs text-muted-foreground">{todayStats.transactionCount} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deposits</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(todayStats.deposits)}</div>
            <p className="text-xs text-muted-foreground">+12.5% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Withdrawals</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(todayStats.withdrawals)}</div>
            <p className="text-xs text-muted-foreground">+8.2% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(todayStats.deposits - todayStats.withdrawals)}
            </div>
            <p className="text-xs text-muted-foreground">Positive inflow</p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Volume</CardTitle>
          <CardDescription>Daily transaction volume over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyVolume}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#305CDE" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#305CDE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#305CDE"
                  fillOpacity={1}
                  fill="url(#volumeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>A detailed list of all transactions</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-8 w-full sm:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="transfer">Transfers</SelectItem>
                  <SelectItem value="loan_repayment">Loan Repayments</SelectItem>
                  <SelectItem value="loan_disbursement">Disbursements</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-mono text-sm">{txn.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{txn.memberName}</p>
                        <p className="text-sm text-muted-foreground">{txn.memberId}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(txn.type)}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={
                        txn.type === "deposit" || txn.type === "loan_disbursement"
                          ? "text-green-600"
                          : txn.type === "withdrawal"
                          ? "text-red-600"
                          : ""
                      }>
                        {txn.type === "deposit" || txn.type === "loan_disbursement" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </span>
                    </TableCell>
                    <TableCell>{txn.channel}</TableCell>
                    <TableCell className="text-sm">{txn.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          txn.status === "completed"
                            ? "default"
                            : txn.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{txn.reference}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
