"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Search,
  Ban,
} from "lucide-react"

// Icon map for health components
const SERVICE_ICONS: Record<string, React.ElementType> = {
  "core-banking": Server,
  database: Database,
  redis: Database,
  mpesa: Wifi,
  mail: Mail,
  sms: Mail,
  crb: Shield,
  default: Activity,
}

type ServiceStatus = {
  id: string
  name: string
  status: "online" | "degraded" | "offline"
  latency?: number
  uptime?: number
  lastCheck: string
  icon: React.ElementType
  details?: Record<string, unknown>
}

// Fallback static services shown while loading
const FALLBACK_SERVICES: ServiceStatus[] = [
  { id: "core-banking", name: "Core Banking API", status: "online", latency: 45, uptime: 99.98, lastCheck: "—", icon: Server },
  { id: "database", name: "Database", status: "online", latency: 5, uptime: 99.999, lastCheck: "—", icon: Database },
  { id: "redis", name: "Redis Cache", status: "online", latency: 1, uptime: 99.99, lastCheck: "—", icon: Database },
  { id: "mpesa", name: "M-Pesa Gateway", status: "online", latency: 120, uptime: 99.85, lastCheck: "—", icon: Wifi },
]

// Error logs
const errorLogs = [
  {
    id: 1,
    severity: "ERROR",
    timestamp: "2024-01-15 14:32:15",
    source: "M-Pesa Gateway",
    message: "M-Pesa Callback Signature Verification Failed from IP 41.90.1.2",
  },
  {
    id: 2,
    severity: "WARN",
    timestamp: "2024-01-15 14:28:42",
    source: "Loan Processor",
    message: "Loan Disbursement Queue Backlog: 5 items",
  },
  {
    id: 3,
    severity: "ERROR",
    timestamp: "2024-01-15 14:15:33",
    source: "CRB Integration",
    message: "TransUnion API timeout after 30000ms",
  },
  {
    id: 4,
    severity: "INFO",
    timestamp: "2024-01-15 14:00:00",
    source: "System",
    message: "Scheduled maintenance window completed successfully",
  },
  {
    id: 5,
    severity: "WARN",
    timestamp: "2024-01-15 13:45:21",
    source: "Auth Service",
    message: "High failed login rate detected from IP range 196.201.x.x",
  },
  {
    id: 6,
    severity: "FATAL",
    timestamp: "2024-01-15 02:15:00",
    source: "EOD Processor",
    message: "Critical: Interest calculation batch failed - manual intervention required",
  },
  {
    id: 7,
    severity: "INFO",
    timestamp: "2024-01-15 02:00:00",
    source: "Backup Service",
    message: "Daily backup completed: 15.2GB compressed",
  },
]

// Background jobs
const backgroundJobs = [
  {
    id: "eod",
    name: "EOD Processing",
    status: "idle",
    lastRun: "Today 02:15 AM",
    lastStatus: "success",
    nextRun: "Tomorrow 02:00 AM",
    duration: "45 min",
  },
  {
    id: "dividend",
    name: "Dividend Calculation",
    status: "idle",
    lastRun: "Dec 31, 2023",
    lastStatus: "success",
    nextRun: "Jun 30, 2024",
    duration: "2 hrs",
  },
  {
    id: "arrears",
    name: "Loan Arrears Penalty",
    status: "running",
    lastRun: "Today 00:00 AM",
    lastStatus: "success",
    nextRun: "Tomorrow 00:00 AM",
    duration: "15 min",
    progress: 65,
  },
  {
    id: "statements",
    name: "Statement Generation",
    status: "idle",
    lastRun: "Jan 1, 2024",
    lastStatus: "success",
    nextRun: "Feb 1, 2024",
    duration: "3 hrs",
  },
  {
    id: "crb-report",
    name: "CRB Reporting",
    status: "idle",
    lastRun: "Jan 10, 2024",
    lastStatus: "success",
    nextRun: "Jan 20, 2024",
    duration: "30 min",
  },
]

// Blocked IPs
const blockedIPs = [
  {
    ip: "41.90.123.45",
    reason: "Brute Force",
    blockedAt: "2024-01-15 10:32:00",
    expiry: "2024-01-15 22:32:00",
    attempts: 15,
  },
  {
    ip: "196.201.45.67",
    reason: "SQLi Attempt",
    blockedAt: "2024-01-14 18:45:00",
    expiry: "Permanent",
    attempts: 3,
  },
  {
    ip: "102.89.12.34",
    reason: "Rate Limit Exceeded",
    blockedAt: "2024-01-15 12:00:00",
    expiry: "2024-01-15 13:00:00",
    attempts: 1000,
  },
]

// Failed logins
const failedLogins = [
  { username: "admin@test.com", ip: "41.90.123.45", timestamp: "2024-01-15 14:30:15", attempts: 5 },
  { username: "john.doe", ip: "196.201.45.67", timestamp: "2024-01-15 14:25:42", attempts: 3 },
  { username: "unknown_user", ip: "102.89.12.34", timestamp: "2024-01-15 14:20:00", attempts: 10 },
  { username: "mary.wanjiku", ip: "105.163.0.1", timestamp: "2024-01-15 14:15:33", attempts: 2 },
]

function getStatusBadge(status: string) {
  switch (status) {
    case "online":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Online
        </Badge>
      )
    case "degraded":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Degraded
        </Badge>
      )
    case "offline":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Offline
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "INFO":
      return <Badge variant="secondary">INFO</Badge>
    case "WARN":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">WARN</Badge>
    case "ERROR":
      return <Badge variant="destructive">ERROR</Badge>
    case "FATAL":
      return <Badge className="bg-red-900 text-white hover:bg-red-900">FATAL</Badge>
    default:
      return <Badge variant="secondary">{severity}</Badge>
  }
}

function getJobStatusBadge(status: string) {
  switch (status) {
    case "running":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          <Activity className="mr-1 h-3 w-3 animate-pulse" />
          Running
        </Badge>
      )
    case "idle":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Idle
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function SystemHealthPage() {
  const [severityFilter, setSeverityFilter] = useState("all")
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null)
  // A2: Real health endpoint state — poll GET /api/health every 30s
  const [services, setServices] = useState<ServiceStatus[]>(FALLBACK_SERVICES)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchHealth = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"
      // NestJS Terminus health endpoint is at /health (not under /api/v1)
      const healthUrl = apiBase.replace(/\/api\/v1\/?$/, "") + "/health"
      const res = await fetch(healthUrl, {
        headers: {
          "X-Tenant-ID": process.env.NEXT_PUBLIC_TENANT_ID ?? "",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("beba_access_token") ?? "" : ""}`,
        },
      })
      if (!res.ok) return
      const json = await res.json()
      // Map Terminus response to ServiceStatus[]
      const details: Record<string, { status: string; [k: string]: unknown }> = json.details ?? {}
      const mapped: ServiceStatus[] = Object.entries(details).map(([key, val]) => {
        const IconComp = SERVICE_ICONS[key] ?? SERVICE_ICONS.default
        const status: "online" | "degraded" | "offline" =
          val.status === "up" ? "online" : val.status === "down" ? "offline" : "degraded"
        return {
          id: key,
          name: key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " "),
          status,
          lastCheck: new Date().toLocaleTimeString(),
          icon: IconComp,
          details: val as Record<string, unknown>,
        }
      })
      if (mapped.length > 0) setServices(mapped)
    } catch {
      // Keep fallback on error
    }
  }

  useEffect(() => {
    fetchHealth()
    pollRef.current = setInterval(fetchHealth, 30000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    await fetchHealth()
    setIsRefreshing(false)
  }

  const filteredLogs = errorLogs.filter(
    (log) => severityFilter === "all" || log.severity === severityFilter
  )

  const handleTestConnection = (serviceId: string) => {
    setIsTestingConnection(serviceId)
    setTimeout(() => setIsTestingConnection(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor system status, integrations, and background jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Service Status Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Service Status</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <service.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {service.latency !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Latency</p>
                      <p className={`font-medium ${service.latency > 500 ? "text-amber-600" : ""}`}>
                        {service.latency}ms
                      </p>
                    </div>
                  )}
                  {service.uptime !== undefined && (
                    <div>
                      <p className="text-muted-foreground">Uptime</p>
                      <p className="font-medium">{service.uptime}%</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Last check: {service.lastCheck}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(service.id)}
                    disabled={isTestingConnection === service.id}
                  >
                    {isTestingConnection === service.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Error Logs */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>System logs and error messages</CardDescription>
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
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Logs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Severity</TableHead>
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead className="w-32">Source</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {log.timestamp}
                    </TableCell>
                    <TableCell className="font-medium">{log.source}</TableCell>
                    <TableCell className="text-sm">{log.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Background Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Background Jobs</CardTitle>
          <CardDescription>Scheduled tasks and batch processes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Last Status</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backgroundJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      {getJobStatusBadge(job.status)}
                      {"progress" in job && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {job.progress}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{job.lastRun}</TableCell>
                    <TableCell>
                      {job.lastStatus === "success" ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{job.nextRun}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{job.duration}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        {job.status === "running" ? (
                          <>
                            <Pause className="mr-1 h-3 w-3" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 h-3 w-3" />
                            Run Now
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Security Monitor */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Blocked IPs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Blocked IPs
            </CardTitle>
            <CardDescription>IPs blocked due to suspicious activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((ip) => (
                    <TableRow key={ip.ip}>
                      <TableCell className="font-mono text-sm">{ip.ip}</TableCell>
                      <TableCell>
                        <Badge
                          variant={ip.reason === "SQLi Attempt" ? "destructive" : "secondary"}
                        >
                          {ip.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ip.expiry === "Permanent" ? (
                          <span className="text-red-600">Permanent</span>
                        ) : (
                          ip.expiry
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Ban className="mr-1 h-3 w-3" />
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Failed Logins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Failed Login Attempts (Last Hour)
            </CardTitle>
            <CardDescription>Recent failed authentication attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedLogins.map((login, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{login.username}</TableCell>
                      <TableCell className="font-mono text-sm">{login.ip}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {login.timestamp}
                      </TableCell>
                      <TableCell>
                        <Badge variant={login.attempts > 5 ? "destructive" : "secondary"}>
                          {login.attempts}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
