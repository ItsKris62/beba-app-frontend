"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Download, RefreshCw, Eye, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { adminApi, formatDateTime, type AuditLog } from "@/lib/api-client"

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  LOAN_APPROVED: "bg-green-100 text-green-700",
  LOAN_REJECTED: "bg-red-100 text-red-700",
  LOAN_DISBURSED: "bg-teal-100 text-teal-700",
  LOAN_APPLIED: "bg-purple-100 text-purple-700",
  KYC_UPDATED: "bg-amber-100 text-amber-700",
  DEPOSIT: "bg-green-100 text-green-700",
  WITHDRAWAL: "bg-orange-100 text-orange-700",
  GUARANTOR_ACCEPTED: "bg-green-100 text-green-700",
  GUARANTOR_DECLINED: "bg-red-100 text-red-700",
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState("all")
  const [entityTypeFilter, setEntityTypeFilter] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null)

  const loadLogs = async (p = 1) => {
    setIsLoading(true)
    const res = await adminApi.getAuditLogs({
      page: p,
      limit: 25,
      action: actionFilter === "all" ? undefined : actionFilter,
      entityType: entityTypeFilter || undefined,
      from: from || undefined,
      to: to || undefined,
    })
    if (res.success && res.data) {
      setLogs(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
      setPage(p)
    } else {
      toast.error(res.error?.message ?? "Failed to load audit logs")
    }
    setIsLoading(false)
  }

  useEffect(() => { loadLogs(1) }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadLogs(1)
  }

  const totalPages = Math.ceil(total / 25)
  const exportFilters = {
    action: actionFilter === "all" ? undefined : actionFilter,
    entityType: entityTypeFilter || undefined,
    from: from || undefined,
    to: to || undefined,
  }

  const handleExport = async (format: "csv" | "pdf") => {
    setExporting(format)
    try {
      await adminApi.exportAuditLogs({ ...exportFilters, format })
      toast.success(`Audit ${format.toUpperCase()} export started`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export audit logs")
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">Immutable log of all system actions and events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadLogs(page)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleExport("csv")} disabled={exporting != null}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleExport("pdf")} disabled={exporting != null}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="action">Action</Label>
              <Select value={actionFilter} onValueChange={(val) => setActionFilter(val)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                  <SelectItem value="LOAN_APPLIED">Loan Applied</SelectItem>
                  <SelectItem value="LOAN_APPROVED">Loan Approved</SelectItem>
                  <SelectItem value="LOAN_REJECTED">Loan Rejected</SelectItem>
                  <SelectItem value="LOAN_DISBURSED">Loan Disbursed</SelectItem>
                  <SelectItem value="KYC_UPDATED">KYC Updated</SelectItem>
                  <SelectItem value="DEPOSIT">Deposit</SelectItem>
                  <SelectItem value="GUARANTOR_ACCEPTED">Guarantor Accepted</SelectItem>
                  <SelectItem value="GUARANTOR_DECLINED">Guarantor Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="entityType">Resource</Label>
              <Input
                id="entityType"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                placeholder="Loan, User, Statement"
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button type="submit" className="gap-2">
              <Search className="h-4 w-4" /> Search
            </Button>
            <Button type="button" variant="outline" onClick={() => { setActionFilter("all"); setEntityTypeFilter(""); setFrom(""); setTo(""); setTimeout(() => loadLogs(1), 0) }}>
              Clear
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>{isLoading ? <Skeleton className="h-4 w-24" /> : `${total} entries found`}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead className="hidden md:table-cell">IP Address</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.user ? (
                            <div>
                              <p className="font-medium">{log.user.firstName} {log.user.lastName}</p>
                              <p className="text-xs text-muted-foreground">{log.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-medium">{log.resource ?? log.entityType}</span>
                          {log.resourceId && <p className="text-xs text-muted-foreground font-mono">{log.resourceId.slice(0, 12)}…</p>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">
                          {log.ipAddress ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedLog(log); setIsDetailOpen(true) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadLogs(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadLogs(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-muted-foreground">Timestamp</Label><p className="font-mono text-xs mt-1">{formatDateTime(selectedLog.timestamp)}</p></div>
                <div><Label className="text-muted-foreground">Action</Label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[selectedLog.action] ?? "bg-gray-100 text-gray-700"}`}>
                      {selectedLog.action.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                <div><Label className="text-muted-foreground">Actor</Label>
                  <p className="font-medium mt-1">
                    {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : "System"}
                  </p>
                  {selectedLog.user && <p className="text-xs text-muted-foreground">{selectedLog.user.email}</p>}
                </div>
                <div><Label className="text-muted-foreground">Resource</Label><p className="font-medium mt-1">{selectedLog.resource ?? selectedLog.entityType}</p></div>
                {selectedLog.resourceId && <div><Label className="text-muted-foreground">Resource ID</Label><p className="font-mono text-xs mt-1">{selectedLog.resourceId}</p></div>}
                {selectedLog.entryHash && <div className="col-span-2"><Label className="text-muted-foreground">Entry Hash</Label><p className="font-mono text-xs mt-1 break-all">{selectedLog.entryHash}</p></div>}
                {selectedLog.ipAddress && <div><Label className="text-muted-foreground">IP Address</Label><p className="font-mono text-xs mt-1">{selectedLog.ipAddress}</p></div>}
                {selectedLog.userAgent && <div className="col-span-2"><Label className="text-muted-foreground">User Agent</Label><p className="text-xs mt-1 break-all">{selectedLog.userAgent}</p></div>}
              </div>
              {selectedLog.metadata != null && (
                <div>
                  <Label className="text-muted-foreground">Metadata</Label>
                  <pre className="mt-2 rounded-lg bg-muted p-3 text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.metadata as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
