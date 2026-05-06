"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Search, CheckCircle2, XCircle, Eye, Clock, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import { applicationsApi, type MemberApplication } from "@/lib/locations-api"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

// ─── Credentials display after approval ──────────────────────────────────────

interface ApprovalCredentials {
  memberNumber: string
  email: string
  temporaryPassword: string
  firstName: string
  lastName: string
}

function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: ApprovalCredentials | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!credentials) return null

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copy(value, field)}
      className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      title="Copy"
    >
      {copied === field
        ? <Check className="h-3.5 w-3.5 text-green-600" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  )

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Member Account Created
          </DialogTitle>
          <DialogDescription>
            Share these credentials with{" "}
            <strong>{credentials.firstName} {credentials.lastName}</strong>. They must change
            their password on first login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-gray-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Member Number</p>
              <p className="font-mono font-semibold">{credentials.memberNumber}</p>
            </div>
            <CopyBtn value={credentials.memberNumber} field="memberNumber" />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Login Email</p>
              <p className="truncate font-mono font-medium">{credentials.email}</p>
            </div>
            <CopyBtn value={credentials.email} field="email" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Temporary Password</p>
              <p className="font-mono font-semibold text-orange-600">{credentials.temporaryPassword}</p>
            </div>
            <CopyBtn value={credentials.temporaryPassword} field="password" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          This is the only time the temporary password will be shown. Copy it before closing.
        </p>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
    PENDING_REVIEW: "bg-amber-100 text-amber-800 border-amber-200",
  }
  return (
    <Badge variant="outline" className={map[status] ?? "bg-gray-100 text-gray-800"}>
      {status.replace("_", " ")}
    </Badge>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PendingKycPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !["TENANT_ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      router.replace("/admin/dashboard")
    }
  }, [user, router])

  const [applications, setApplications] = useState<MemberApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")

  const [viewApp, setViewApp] = useState<MemberApplication | null>(null)
  const [approveApp, setApproveApp] = useState<MemberApplication | null>(null)
  const [approveEmail, setApproveEmail] = useState("")
  const [rejectApp, setRejectApp] = useState<MemberApplication | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [credentials, setCredentials] = useState<ApprovalCredentials | null>(null)

  const loadApplications = useCallback(async (p = 1, q = "") => {
    setIsLoading(true)
    try {
      const result = await applicationsApi.getPending({ page: p, limit: 20, search: q || undefined })
      setApplications(result.data ?? [])
      setTotal(result.meta?.total ?? 0)
      setPage(p)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to load applications")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadApplications(1) }, [loadApplications])

  // ─── Approve ─────────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!approveApp) return
    setIsProcessing(true)
    try {
      const result = await applicationsApi.approve(approveApp.id, {
        email: approveEmail.trim() || undefined,
      })
      setCredentials({
        memberNumber: result.member.memberNumber,
        email: result.user.email,
        temporaryPassword: result.temporaryPassword,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      })
      setApproveApp(null)
      setApproveEmail("")
      setViewApp(null)
      loadApplications(page, search)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Approval failed")
    } finally {
      setIsProcessing(false)
    }
  }

  // ─── Reject ──────────────────────────────────────────────────────────────

  async function handleReject() {
    if (!rejectApp) return
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason")
      return
    }
    setIsProcessing(true)
    try {
      await applicationsApi.reject(rejectApp.id, rejectReason.trim())
      toast.success(`${rejectApp.firstName}'s application rejected`)
      setRejectApp(null)
      setRejectReason("")
      setViewApp(null)
      loadApplications(page, search)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Rejection failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC Review Queue</h1>
        <p className="text-muted-foreground">
          Review and action pending member applications. Oldest submissions appear first.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Awaiting Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>
            Applications submitted for membership — approve to create member account and assign FOSA &amp; BOSA accounts.
          </CardDescription>
          <div className="flex gap-2 mt-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadApplications(1, search)
                }}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => loadApplications(1, search)}>
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-400 mb-3" />
              <p className="font-medium">Queue is clear</p>
              <p className="text-sm text-muted-foreground">No pending applications to review.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>National ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <p className="font-medium">{app.firstName} {app.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.ward?.constituency?.county?.name ?? ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{app.idNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{app.phoneNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{app.stageName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{app.position}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(app.createdAt).toLocaleDateString("en-KE")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewApp(app)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => { setApproveApp(app); setApproveEmail("") }}
                            disabled={isProcessing}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => { setRejectApp(app); setRejectReason("") }}
                            disabled={isProcessing}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} · {total} pending
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={page <= 1}
                      onClick={() => loadApplications(page - 1, search)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={page >= totalPages}
                      onClick={() => loadApplications(page + 1, search)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── View Detail Dialog ── */}
      <Dialog open={!!viewApp} onOpenChange={(o) => { if (!isProcessing && !o) setViewApp(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewApp?.firstName} {viewApp?.lastName}</DialogTitle>
            <DialogDescription>
              Submitted {viewApp ? new Date(viewApp.createdAt).toLocaleDateString("en-KE") : ""}
              {viewApp && (
                <span className="ml-2">
                  · <StatusBadge status={viewApp.status} />
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewApp && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">National ID</Label>
                  <p className="mt-0.5 font-mono">{viewApp.idNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                  <p className="mt-0.5">{viewApp.phoneNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Stage</Label>
                  <p className="mt-0.5">{viewApp.stageName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Position</Label>
                  <p className="mt-0.5">{viewApp.position}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ward</Label>
                  <p className="mt-0.5">{viewApp.ward?.name ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">County</Label>
                  <p className="mt-0.5">{viewApp.ward?.constituency?.county?.name ?? "—"}</p>
                </div>
                {viewApp.documentUrl && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">KYC Document</Label>
                    <a
                      href={viewApp.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block text-blue-600 underline text-sm"
                    >
                      View Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => { setRejectApp(viewApp); setRejectReason(""); setViewApp(null) }}
              disabled={isProcessing}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => { setApproveApp(viewApp); setApproveEmail(""); setViewApp(null) }}
              disabled={isProcessing}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Approve Dialog (email + confirm) ── */}
      <Dialog open={!!approveApp} onOpenChange={(o) => { if (!isProcessing && !o) { setApproveApp(null); setApproveEmail("") } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Creating a member account for{" "}
              <strong>{approveApp?.firstName} {approveApp?.lastName}</strong>.
              FOSA &amp; BOSA accounts will be created automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="approveEmail">Email (optional)</Label>
              <Input
                id="approveEmail"
                type="email"
                placeholder="member@example.com — leave blank to auto-generate"
                value={approveEmail}
                onChange={(e) => setApproveEmail(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                If blank, a system email will be generated from the member&apos;s ID number.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setApproveApp(null); setApproveEmail("") }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {isProcessing ? "Creating Account…" : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
      <Dialog
        open={!!rejectApp}
        onOpenChange={(o) => { if (!isProcessing && !o) { setRejectApp(null); setRejectReason("") } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a clear reason. This will be noted on the application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejectReason">Rejection Reason <span className="text-red-500">*</span></Label>
            <Textarea
              id="rejectReason"
              placeholder="e.g. National ID number is invalid — please verify and resubmit."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectApp(null); setRejectReason("") }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {isProcessing ? "Submitting…" : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Credentials after approval ── */}
      <CredentialsDialog
        credentials={credentials}
        onClose={() => setCredentials(null)}
      />
    </div>
  )
}
