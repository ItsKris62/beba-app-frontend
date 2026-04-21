"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Search,
  Download,
  Filter,
  CalendarIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ArrowRight,
  FileText,
  Link2,
  RefreshCw,
  Send,
  Check,
} from "lucide-react"
import { format } from "date-fns"

// Unmatched M-Pesa deposits
const unmatchedDeposits = [
  {
    id: "MPESA001",
    transactionId: "QKL2F5G8HJ",
    senderPhone: "254712345678",
    senderName: "JOHN KAMAU",
    amount: 25000,
    timestamp: "2024-01-15 14:32:00",
    reference: "Savings deposit",
    status: "unmatched",
  },
  {
    id: "MPESA002",
    transactionId: "RMS3N7P2KL",
    senderPhone: "254723456789",
    senderName: "MARY WANJIKU",
    amount: 15000,
    timestamp: "2024-01-15 13:45:00",
    reference: "Loan repayment L045",
    status: "unmatched",
  },
  {
    id: "MPESA003",
    transactionId: "TNV8Q1R4XY",
    senderPhone: "254734567890",
    senderName: "PETER OCHIENG",
    amount: 50000,
    timestamp: "2024-01-15 12:20:00",
    reference: "Share capital",
    status: "unmatched",
  },
  {
    id: "MPESA004",
    transactionId: "UWZ6B9C3DE",
    senderPhone: "254745678901",
    senderName: "GRACE MUTHONI",
    amount: 35000,
    timestamp: "2024-01-15 11:10:00",
    reference: "Monthly savings",
    status: "unmatched",
  },
  {
    id: "MPESA005",
    transactionId: "VXA4D2E7FG",
    senderPhone: "254756789012",
    senderName: "DAVID KIPROP",
    amount: 20000,
    timestamp: "2024-01-15 10:05:00",
    reference: "Deposit",
    status: "unmatched",
  },
]

// Members for matching
const members = [
  { id: "M001", name: "John Kamau", phone: "254712345678" },
  { id: "M002", name: "Mary Wanjiku", phone: "254723456789" },
  { id: "M003", name: "Peter Ochieng", phone: "254734567890" },
  { id: "M004", name: "Grace Muthoni", phone: "254745678901" },
  { id: "M005", name: "David Kiprop", phone: "254756789012" },
  { id: "M006", name: "Sarah Akinyi", phone: "254767890123" },
]

// GL Accounts
const glAccounts = [
  { code: "1000", name: "Cash at Bank - M-Pesa", type: "Asset" },
  { code: "1100", name: "Member Savings", type: "Liability" },
  { code: "1200", name: "Member Shares", type: "Liability" },
  { code: "1300", name: "Loan Portfolio - Development", type: "Asset" },
  { code: "1301", name: "Loan Portfolio - Jipange", type: "Asset" },
  { code: "2000", name: "Interest Income - Loans", type: "Revenue" },
  { code: "2100", name: "Fee Income", type: "Revenue" },
  { code: "3000", name: "Operating Expenses", type: "Expense" },
  { code: "3100", name: "Staff Costs", type: "Expense" },
  { code: "4000", name: "Retained Earnings", type: "Equity" },
]

// Recent journal entries
const recentJournals = [
  {
    id: "JE001",
    date: "2024-01-15",
    description: "Member savings deposit - John Kamau",
    debitAccount: "1000 - Cash at Bank",
    creditAccount: "1100 - Member Savings",
    amount: 25000,
    status: "approved",
    maker: "teller1@bebasacco.co.ke",
    checker: "manager@bebasacco.co.ke",
  },
  {
    id: "JE002",
    date: "2024-01-15",
    description: "Loan disbursement - Development Loan L045",
    debitAccount: "1300 - Loan Portfolio",
    creditAccount: "1000 - Cash at Bank",
    amount: 500000,
    status: "pending_approval",
    maker: "teller1@bebasacco.co.ke",
    checker: null,
  },
  {
    id: "JE003",
    date: "2024-01-14",
    description: "Interest income accrual - December",
    debitAccount: "1300 - Loan Portfolio",
    creditAccount: "2000 - Interest Income",
    amount: 1250000,
    status: "approved",
    maker: "system",
    checker: "manager@bebasacco.co.ke",
  },
]

// Pending approvals for current user
const pendingApprovals = [
  {
    id: "JE002",
    date: "2024-01-15",
    description: "Loan disbursement - Development Loan L045",
    amount: 500000,
    maker: "teller1@bebasacco.co.ke",
  },
  {
    id: "JE004",
    date: "2024-01-15",
    description: "Fee reversal - M001",
    amount: 500,
    maker: "teller2@bebasacco.co.ke",
  },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState("reconciliation")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDeposits, setSelectedDeposits] = useState<string[]>([])
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [isBulkMatchDialogOpen, setIsBulkMatchDialogOpen] = useState(false)
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const [journalDebitAccount, setJournalDebitAccount] = useState("")
  const [journalCreditAccount, setJournalCreditAccount] = useState("")
  const [journalDebitAmount, setJournalDebitAmount] = useState("")
  const [journalCreditAmount, setJournalCreditAmount] = useState("")
  const [journalDescription, setJournalDescription] = useState("")

  // User role simulation (maker vs checker)
  const [userRole] = useState<"maker" | "checker">("checker")

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.phone.includes(memberSearch)
  )

  const toggleDepositSelection = (id: string) => {
    setSelectedDeposits((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const selectAllDeposits = () => {
    if (selectedDeposits.length === unmatchedDeposits.length) {
      setSelectedDeposits([])
    } else {
      setSelectedDeposits(unmatchedDeposits.map((d) => d.id))
    }
  }

  const isBalanced = journalDebitAmount && journalCreditAmount && journalDebitAmount === journalCreditAmount

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">
            M-Pesa reconciliation and journal entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export GL
          </Button>
          <Button size="sm" onClick={() => setIsJournalDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {userRole === "checker" && pendingApprovals.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Your Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingApprovals.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border bg-background p-3"
                >
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.id} | By: {entry.maker} | {formatCurrency(entry.amount)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <XCircle className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                    <Button size="sm">
                      <Check className="mr-1 h-3 w-3" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reconciliation">M-Pesa Reconciliation</TabsTrigger>
          <TabsTrigger value="journals">Journal Entries</TabsTrigger>
        </TabsList>

        {/* M-Pesa Reconciliation Tab */}
        <TabsContent value="reconciliation" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PP") : "Filter by date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by transaction ID, phone, or name..." className="pl-8" />
                  </div>
                </div>
                {selectedDeposits.length > 0 && (
                  <Button onClick={() => setIsBulkMatchDialogOpen(true)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Bulk Match ({selectedDeposits.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Unmatched Deposits Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Unmatched M-Pesa Deposits</CardTitle>
                  <CardDescription>
                    {unmatchedDeposits.length} deposits pending reconciliation
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedDeposits.length === unmatchedDeposits.length}
                          onCheckedChange={selectAllDeposits}
                        />
                      </TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedDeposits.map((deposit) => (
                      <TableRow key={deposit.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDeposits.includes(deposit.id)}
                            onCheckedChange={() => toggleDepositSelection(deposit.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {deposit.transactionId}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{deposit.senderName}</p>
                            <p className="text-sm text-muted-foreground">
                              {deposit.senderPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(deposit.amount)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {deposit.reference}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {deposit.timestamp}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsMatchDialogOpen(true)}
                          >
                            <Link2 className="mr-1 h-3 w-3" />
                            Match
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries Tab */}
        <TabsContent value="journals" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Journal Entries</CardTitle>
                  <CardDescription>Manual and system-generated entries</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Maker/Checker</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentJournals.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono text-sm">{entry.id}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                        <TableCell className="text-sm">{entry.debitAccount}</TableCell>
                        <TableCell className="text-sm">{entry.creditAccount}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell>
                          {entry.status === "approved" ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <p>Maker: {entry.maker}</p>
                            <p className="text-muted-foreground">
                              Checker: {entry.checker || "-"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Single Match Dialog */}
      <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Match M-Pesa Deposit</DialogTitle>
            <DialogDescription>
              Search and select a member account to match this deposit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member by name, ID, or phone..."
                className="pl-8"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-colors ${
                    selectedMember === member.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedMember(member.id)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.id} | {member.phone}
                      </p>
                    </div>
                    {selectedMember === member.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Allocation</Label>
              <Select defaultValue="savings">
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="shares">Share Capital</SelectItem>
                  <SelectItem value="loan">Loan Repayment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!selectedMember} onClick={() => setIsMatchDialogOpen(false)}>
              <Link2 className="mr-2 h-4 w-4" />
              Match Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Match Dialog */}
      <Dialog open={isBulkMatchDialogOpen} onOpenChange={setIsBulkMatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Match Deposits</DialogTitle>
            <DialogDescription>
              Match {selectedDeposits.length} selected deposits to a single member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm">
                Total Amount:{" "}
                <span className="font-bold">
                  {formatCurrency(
                    unmatchedDeposits
                      .filter((d) => selectedDeposits.includes(d.id))
                      .reduce((sum, d) => sum + d.amount, 0)
                  )}
                </span>
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search member..."
                className="pl-8"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-colors ${
                    selectedMember === member.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedMember(member.id)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.id}</p>
                    </div>
                    {selectedMember === member.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Allocation</Label>
              <Select defaultValue="loan">
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="shares">Share Capital</SelectItem>
                  <SelectItem value="loan">Loan Repayment (Check-off)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkMatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedMember}
              onClick={() => {
                setIsBulkMatchDialogOpen(false)
                setSelectedDeposits([])
              }}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Match All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Journal Entry Dialog */}
      <Dialog open={isJournalDialogOpen} onOpenChange={setIsJournalDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manual Journal Entry</DialogTitle>
            <DialogDescription>
              Create a double-entry journal entry. Requires maker-checker approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter journal entry description..."
                value={journalDescription}
                onChange={(e) => setJournalDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Debit Side */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Debit (Dr)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Account</Label>
                    <Select value={journalDebitAccount} onValueChange={setJournalDebitAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GL account" />
                      </SelectTrigger>
                      <SelectContent>
                        {glAccounts.map((acc) => (
                          <SelectItem key={acc.code} value={acc.code}>
                            {acc.code} - {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KES)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={journalDebitAmount}
                      onChange={(e) => setJournalDebitAmount(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Credit Side */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Credit (Cr)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Account</Label>
                    <Select value={journalCreditAccount} onValueChange={setJournalCreditAccount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select GL account" />
                      </SelectTrigger>
                      <SelectContent>
                        {glAccounts.map((acc) => (
                          <SelectItem key={acc.code} value={acc.code}>
                            {acc.code} - {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KES)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={journalCreditAmount}
                      onChange={(e) => setJournalCreditAmount(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Message */}
            {journalDebitAmount && journalCreditAmount && !isBalanced && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-3">
                <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Debits ({formatCurrency(Number(journalDebitAmount))}) != Credits (
                  {formatCurrency(Number(journalCreditAmount))}). Entry must balance.
                </p>
              </div>
            )}

            {isBalanced && (
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Entry is balanced: {formatCurrency(Number(journalDebitAmount))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJournalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!isBalanced || !journalDescription}
              onClick={() => setIsJournalDialogOpen(false)}
            >
              <Send className="mr-2 h-4 w-4" />
              {userRole === "maker" ? "Submit for Approval" : "Post Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
