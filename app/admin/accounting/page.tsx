"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  CalendarIcon,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Link2,
  RefreshCw,
  Search,
  XCircle,
  Clock,
} from "lucide-react"

import { accountingApi, type GLAccount, type JournalEntry, type PendingApproval, type UnmatchedMpesaTransaction } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { MatchDepositForm } from "./components/MatchDepositForm"
import { JournalEntryForm } from "./components/JournalEntryForm"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function asDateOnly(date?: Date) {
  return date ? format(date, "yyyy-MM-dd") : undefined
}

function statusBadge(status: string) {
  if (status === "APPROVED" || status === "POSTED") {
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {status === "POSTED" ? "Posted" : "Approved"}
      </Badge>
    )
  }

  if (status === "REJECTED") {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    )
  }

  return (
    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
      <Clock className="mr-1 h-3 w-3" />
      Pending
    </Badge>
  )
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState("reconciliation")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [search, setSearch] = useState("")

  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [unmatchedDeposits, setUnmatchedDeposits] = useState<UnmatchedMpesaTransaction[]>([])
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isReconLoading, setIsReconLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false)
  const [isJournalDialogOpen, setIsJournalDialogOpen] = useState(false)

  const [selectedDeposit, setSelectedDeposit] = useState<UnmatchedMpesaTransaction | null>(null)

  const selectedDate = asDateOnly(date)

  const loadAccounting = useCallback(async () => {
    setIsLoading(true)
    const [approvalsRes, journalsRes, glRes] = await Promise.all([
      accountingApi.getPendingApprovals(),
      accountingApi.getJournalEntries({ page: 1, limit: 20 }),
      accountingApi.getGLAccounts(),
    ])

    if (approvalsRes.success) setPendingApprovals(approvalsRes.data.items)
    else toast.error(approvalsRes.error?.message ?? "Failed to load pending approvals")

    if (journalsRes.success) setJournals(journalsRes.data.data)
    else toast.error(journalsRes.error?.message ?? "Failed to load journal entries")

    if (glRes.success) setGlAccounts(glRes.data.data)
    else toast.error(glRes.error?.message ?? "Failed to load GL accounts")

    setIsLoading(false)
  }, [])

  const loadUnmatched = useCallback(async () => {
    setIsReconLoading(true)
    const res = await accountingApi.getUnmatchedMpesa({
      page: 1,
      limit: 20,
      dateFrom: selectedDate,
      dateTo: selectedDate,
      search: search.trim() || undefined,
    })
    if (res.success) setUnmatchedDeposits(res.data.data)
    else toast.error(res.error?.message ?? "Failed to load unmatched M-Pesa transactions")
    setIsReconLoading(false)
  }, [selectedDate, search])

  useEffect(() => {
    loadAccounting()
  }, [loadAccounting])

  useEffect(() => {
    loadUnmatched()
  }, [loadUnmatched])

  const filteredAccounts = useMemo(
    () => glAccounts.filter((account) => account.isActive),
    [glAccounts],
  )

  async function approveEntry(entryId: string) {
    setIsSubmitting(true)
    const res = await accountingApi.approveJournalEntry(entryId, "Approved from accounting dashboard")
    setIsSubmitting(false)
    if (!res.success) {
      toast.error(res.error?.message ?? "Approval failed")
      return
    }
    toast.success("Journal entry approved")
    await loadAccounting()
  }

  async function rejectEntry(entryId: string) {
    setIsSubmitting(true)
    const res = await accountingApi.rejectJournalEntry(entryId, "Rejected from accounting dashboard")
    setIsSubmitting(false)
    if (!res.success) {
      toast.error(res.error?.message ?? "Rejection failed")
      return
    }
    toast.success("Journal entry rejected")
    await loadAccounting()
  }

  async function exportGL() {
    try {
      await accountingApi.exportGL({ startDate: selectedDate, endDate: selectedDate })
      toast.success("General ledger export downloaded")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">M-Pesa reconciliation and journal entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportGL}>
            <Download className="mr-2 h-4 w-4" />
            Export GL
          </Button>
          <Button size="sm" onClick={() => setIsJournalDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      </div>

      {pendingApprovals.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-600" />
              Pending Your Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingApprovals.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 rounded-lg border bg-background p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.entryNumber} | By: {entry.createdBy} | {formatCurrency(entry.amount)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => rejectEntry(entry.id)}>
                      <XCircle className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                    <Button size="sm" disabled={isSubmitting} onClick={() => approveEntry(entry.id)}>
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

        <TabsContent value="reconciliation" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-40">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PP") : "Filter by date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <div className="min-w-64 flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by transaction ID, phone, or reference..."
                      className="pl-8"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Unmatched M-Pesa Deposits</CardTitle>
                  <CardDescription>
                    {isReconLoading ? "Loading deposits..." : `${unmatchedDeposits.length} deposits pending reconciliation`}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadUnmatched} disabled={isReconLoading}>
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
                        <TableCell className="font-mono text-sm">{deposit.mpesaReference}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{deposit.member?.name ?? "Unknown sender"}</p>
                            <p className="text-sm text-muted-foreground">{deposit.phoneNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(deposit.amount)}</TableCell>
                        <TableCell className="max-w-xs truncate">{deposit.accountReference ?? deposit.flagReason}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(deposit.createdAt), "PP p")}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDeposit(deposit)
                              setIsMatchDialogOpen(true)
                            }}
                          >
                            <Link2 className="mr-1 h-3 w-3" />
                            Match
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!isReconLoading && unmatchedDeposits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No unmatched M-Pesa deposits found for this filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Journal Entries</CardTitle>
              <CardDescription>{isLoading ? "Loading journal entries..." : "Manual and system-generated entries"}</CardDescription>
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
                    {journals.map((entry) => {
                      const firstPosting = entry.postings[0]
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">{entry.entryNumber}</TableCell>
                          <TableCell>{format(new Date(entry.createdAt), "yyyy-MM-dd")}</TableCell>
                          <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                          <TableCell className="text-sm">
                            {firstPosting ? `${firstPosting.debitAccount.code} - ${firstPosting.debitAccount.name}` : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {firstPosting ? `${firstPosting.creditAccount.code} - ${firstPosting.creditAccount.name}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(entry.totalAmount)}</TableCell>
                          <TableCell>{statusBadge(entry.status)}</TableCell>
                          <TableCell className="text-sm">
                            <p>Maker: {entry.createdBy?.email ?? "-"}</p>
                            <p className="text-muted-foreground">Checker: {entry.approvedBy?.email ?? entry.rejectedBy?.email ?? "-"}</p>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!isLoading && journals.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No journal entries have been created yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MatchDepositForm
        isOpen={isMatchDialogOpen}
        onClose={() => {
          setIsMatchDialogOpen(false)
          setSelectedDeposit(null)
        }}
        deposit={selectedDeposit}
        onMatched={() => {
          setIsMatchDialogOpen(false)
          setSelectedDeposit(null)
          loadUnmatched()
          loadAccounting()
        }}
      />

      <JournalEntryForm
        isOpen={isJournalDialogOpen}
        onClose={() => setIsJournalDialogOpen(false)}
        accounts={filteredAccounts}
        onCreated={() => {
          setIsJournalDialogOpen(false)
          loadAccounting()
        }}
      />
    </div>
  )
}
