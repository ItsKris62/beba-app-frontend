"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Server,
  Wifi,
  Database,
  Mail,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
  Play,
  Pause,
  Ban,
  Loader2,
} from "lucide-react"
import {
  systemHealthApi,
  type SystemServiceStatus,
  type SystemErrorLog,
  type SystemBackgroundJob,
  type SystemBlockedIP,
  type SystemFailedLogin,
} from "@/lib/api-client"

// ─── Icon map ──────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "core-banking": Server,
  database: Database,
  redis: Database,
  mpesa: Wifi,
  mail: Mail,
  default: Activity,
}

function serviceIcon(id: string): React.ElementType {
  return SERVICE_ICONS[id] ?? SERVICE_ICONS.default
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "online":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" />Online
        </Badge>
      )
    case "degraded":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          <AlertTriangle className="mr-1 h-3 w-3" />Degraded
        </Badge>
      )
    case "offline":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />Offline
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getSeverityBadge(level: string) {
  switch (level) {
    case "INFO":   return <Badge variant="secondary">INFO</Badge>
    case "WARN":   return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">WARN</Badge>
    case "ERROR":  return <Badge variant="destructive">ERROR</Badge>
    case "FATAL":  return <Badge className="bg-red-900 text-white hover:bg-red-900">FATAL</Badge>
    default:       return <Badge variant="secondary">{level}</Badge>
  }
}

function getJobStatusBadge(status: string) {
  switch (status) {
    case "running":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          <Activity className="mr-1 h-3 w-3 animate-pulse" />Running
        </Badge>
      )
    case "idle":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />Idle
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />Failed
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ─── Timestamp formatter ───────────────────────────────────────────────────────

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  })
}

function fmtExpiry(iso: string | null) {
  if (!iso) return <span className="text-red-600 font-medium">Permanent</span>
  const d = new Date(iso)
  const now = new Date()
  if (d < now) return <span className="text-muted-foreground line-through">{fmtTs(iso)}</span>
  return <span>{fmtTs(iso)}</span>
}

// ─── Section skeleton ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? "h-4 w-full"}`} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemHealthPage() {
  // Services
  const [services, setServices] = useState<SystemServiceStatus[] | null>(null)
  const [servicesLoading, setServicesLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)

  // Error logs
  const [errorLogs, setErrorLogs] = useState<SystemErrorLog[] | null>(null)
  const [errorLogsTotal, setErrorLogsTotal] = useState(0)
  const [errorLogsLoading, setErrorLogsLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState("all")

  // Background jobs
  const [jobs, setJobs] = useState<SystemBackgroundJob[] | null>(null)
  const [jobsLoading, setJobsLoading] = useState(true)

  // Blocked IPs
  const [blockedIPs, setBlockedIPs] = useState<SystemBlockedIP[] | null>(null)
  const [blockedIPsLoading, setBlockedIPsLoading] = useState(true)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)

  // Failed logins
  const [failedLogins, setFailedLogins] = useState<SystemFailedLogin[] | null>(null)
  const [failedLoginsLoading, setFailedLoginsLoading] = useState(true)

  const [isRefreshing, setIsRefreshing] = useState(false)

  // ─── Fetch functions ─────────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    setServicesLoading(true)
    const res = await systemHealthApi.getServices()
    if (res.success && Array.isArray(res.data)) setServices(res.data)
    setServicesLoading(false)
  }, [])

  const fetchErrorLogs = useCallback(async (level = severityFilter) => {
    setErrorLogsLoading(true)
    const res = await systemHealthApi.getErrorLogs({ level, limit: 50 })
    if (res.success && res.data) {
      setErrorLogs(res.data.data)
      setErrorLogsTotal(res.data.total)
    }
    setErrorLogsLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true)
    const res = await systemHealthApi.getBackgroundJobs()
    if (res.success && Array.isArray(res.data)) setJobs(res.data)
    setJobsLoading(false)
  }, [])

  const fetchBlockedIPs = useCallback(async () => {
    setBlockedIPsLoading(true)
    const res = await systemHealthApi.getBlockedIPs()
    if (res.success && res.data) setBlockedIPs(res.data.data)
    setBlockedIPsLoading(false)
  }, [])

  const fetchFailedLogins = useCallback(async () => {
    setFailedLoginsLoading(true)
    const res = await systemHealthApi.getFailedLogins()
    if (res.success && Array.isArray(res.data)) setFailedLogins(res.data)
    setFailedLoginsLoading(false)
  }, [])

  // ─── Initial load + polling ───────────────────────────────────────────────

  const servicesPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const securityPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logsPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Initial loads
    fetchServices()
    fetchErrorLogs(severityFilter)
    fetchJobs()
    fetchBlockedIPs()
    fetchFailedLogins()

    // Poll services + security every 30 s
    servicesPollRef.current = setInterval(() => {
      fetchServices()
      fetchBlockedIPs()
      fetchFailedLogins()
    }, 30_000)

    // Poll error logs every 60 s
    logsPollRef.current = setInterval(() => {
      fetchErrorLogs(severityFilter)
      fetchJobs()
    }, 60_000)

    return () => {
      if (servicesPollRef.current) clearInterval(servicesPollRef.current)
      if (securityPollRef.current) clearInterval(securityPollRef.current)
      if (logsPollRef.current) clearInterval(logsPollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch logs when severity filter changes
  useEffect(() => {
    fetchErrorLogs(severityFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severityFilter])

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    await Promise.all([
      fetchServices(),
      fetchErrorLogs(severityFilter),
      fetchJobs(),
      fetchBlockedIPs(),
      fetchFailedLogins(),
    ])
    setIsRefreshing(false)
  }

  const handleTestConnection = async (serviceId: string) => {
    setTestingId(serviceId)
    const res = await systemHealthApi.testService(serviceId)
    if (res.success && res.data) {
      setServices((prev) =>
        prev ? prev.map((s) => (s.id === serviceId ? (res.data as SystemServiceStatus) : s)) : prev,
      )
    }
    setTestingId(null)
  }

  const handleUnblockIP = async (id: string) => {
    setUnblockingId(id)
    await systemHealthApi.unblockIP(id)
    setBlockedIPs((prev) => prev ? prev.filter((ip) => ip.id !== id) : prev)
    setUnblockingId(null)
  }

  const handleExportLogs = () => {
    if (!errorLogs || errorLogs.length === 0) return
    const header = "ID,Level,Source,Timestamp,Message\n"
    const rows = errorLogs.map((l) =>
      `${l.id},"${l.level}","${l.source}","${l.timestamp}","${l.message.replace(/"/g, '""')}"`
    ).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `beba-error-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor service status, integrations, and background jobs — live data
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh All
        </Button>
      </div>

      {/* ── Service Status ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Service Status</h2>
        {servicesLoading && !services ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(services ?? []).map((svc) => {
              const IconComp = serviceIcon(svc.id)
              return (
                <Card key={svc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComp className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">{svc.name}</CardTitle>
                      </div>
                      {getStatusBadge(svc.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {svc.latencyMs !== null && (
                        <div>
                          <p className="text-muted-foreground">Latency</p>
                          <p className={`font-medium ${svc.latencyMs > 500 ? "text-amber-600" : ""}`}>
                            {svc.latencyMs}ms
                          </p>
                        </div>
                      )}
                      {svc.uptime !== null && (
                        <div>
                          <p className="text-muted-foreground">Uptime</p>
                          <p className="font-medium">
                            {svc.uptime >= 86400
                              ? `${Math.floor(svc.uptime / 86400)}d`
                              : svc.uptime >= 3600
                                ? `${Math.floor(svc.uptime / 3600)}h`
                                : `${Math.floor(svc.uptime / 60)}m`}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        {svc.lastCheckedAt ? fmtTs(svc.lastCheckedAt) : "—"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(svc.id)}
                        disabled={testingId === svc.id}
                      >
                        {testingId === svc.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : "Test"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Error Logs ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                System audit events from the last 7 days
                {errorLogsTotal > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">({errorLogsTotal} total)</span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="FATAL">FATAL</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportLogs}
                disabled={!errorLogs || errorLogs.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {errorLogsLoading && !errorLogs ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !errorLogs || errorLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No matching log entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Severity</TableHead>
                    <TableHead className="w-44">Timestamp</TableHead>
                    <TableHead className="w-36">Source</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getSeverityBadge(log.level)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {fmtTs(log.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.source}</TableCell>
                      <TableCell className="text-sm">{log.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Background Jobs ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
          <CardDescription>BullMQ queue status — live job counts</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading && !jobs ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !jobs || jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No queue data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Waiting</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right text-destructive">Failed</TableHead>
                    <TableHead className="text-right">Delayed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className={job.failed > 0 ? "bg-red-50/50" : ""}>
                      <TableCell className="font-medium">{job.displayName}</TableCell>
                      <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">{job.waiting}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {job.active > 0 ? (
                          <span className="font-semibold text-blue-600">{job.active}</span>
                        ) : job.active}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {job.completed.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {job.failed > 0 ? (
                          <span className="font-semibold text-destructive">{job.failed}</span>
                        ) : (
                          <span className="text-muted-foreground">{job.failed}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {job.delayed}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Security Monitor ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Blocked IPs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Blocked IPs
            </CardTitle>
            <CardDescription>Auto-blocked after {">"}5 failed logins; or manually blocked</CardDescription>
          </CardHeader>
          <CardContent>
            {blockedIPsLoading && !blockedIPs ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !blockedIPs || blockedIPs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No blocked IPs.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIPs.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono text-sm">{ip.ipAddress}</TableCell>
                        <TableCell>
                          <Badge variant={ip.reason.includes("SQLi") ? "destructive" : "secondary"}>
                            {ip.reason}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{fmtExpiry(ip.expiresAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnblockIP(ip.id)}
                            disabled={unblockingId === ip.id}
                          >
                            {unblockingId === ip.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <><Ban className="mr-1 h-3 w-3" />Unblock</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failed Logins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Failed Login Attempts (Last Hour)
            </CardTitle>
            <CardDescription>Grouped by IP address — sorted by attempt count</CardDescription>
          </CardHeader>
          <CardContent>
            {failedLoginsLoading && !failedLogins ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !failedLogins || failedLogins.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No failed login attempts in the last hour.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Last Attempt</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedLogins.map((login, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-sm">{login.username}</TableCell>
                        <TableCell className="font-mono text-sm">{login.ipAddress}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmtTs(login.lastAttemptAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={login.attempts >= 5 ? "destructive" : "secondary"}>
                            {login.attempts}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
