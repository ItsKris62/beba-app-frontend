"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Search, CheckCircle2, XCircle, Eye, Clock } from "lucide-react"
import { toast } from "sonner"
import { adminApi, formatDate, type PendingMember } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

export default function PendingKycPage() {
  const { user } = useAuth()
  const router = useRouter()

  // Only TENANT_ADMIN and MANAGER can access this page
  useEffect(() => {
    if (user && !["TENANT_ADMIN", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      router.replace("/admin/dashboard")
    }
  }, [user, router])

  const [searchQuery, setSearchQuery] = useState("")
  const [members, setMembers] = useState<PendingMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [viewMember, setViewMember] = useState<PendingMember | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingMember | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const loadMembers = async (p = 1) => {
    setIsLoading(true)
    const res = await adminApi.getPendingMembers({
      search: searchQuery || undefined,
      page: p,
      limit: 20,
    })
    if (res.success && res.data) {
      setMembers(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
      setPage(p)
    } else {
      toast.error(res.error?.message ?? "Failed to load pending members")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadMembers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // ─── Approve ────────────────────────────────────────────────────────────────

  async function handleApprove(member: PendingMember) {
    setIsProcessing(true)
    const res = await adminApi.reviewMember(member.id, { action: "APPROVE" })
    if (res.success) {
      toast.success(
        `${member.user.firstName} ${member.user.lastName} approved — FOSA & BOSA accounts created.`,
      )
      setViewMember(null)
      loadMembers(page)
    } else {
      toast.error(res.error?.message ?? "Approval failed")
    }
    setIsProcessing(false)
  }

  // ─── Reject ─────────────────────────────────────────────────────────────────

  async function handleReject() {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason")
      return
    }
    setIsProcessing(true)
    const res = await adminApi.reviewMember(rejectTarget.id, {
      action: "REJECT",
      reason: rejectReason.trim(),
    })
    if (res.success) {
      toast.success(`${rejectTarget.user.firstName}'s application rejected.`)
      setRejectTarget(null)
      setRejectReason("")
      setViewMember(null)
      loadMembers(page)
    } else {
      toast.error(res.error?.message ?? "Rejection failed")
    }
    setIsProcessing(false)
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
      <Card className="w-fit">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-sm font-medium">Awaiting Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{total}</div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>Each row is a new member whose KYC documents are awaiting approval.</CardDescription>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-400 mb-3" />
              <p className="font-medium">Queue is clear</p>
              <p className="text-sm text-muted-foreground">No pending KYC submissions.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Member No.</TableHead>
                    <TableHead>National ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {m.user.firstName} {m.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{m.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{m.memberNumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.nationalId ?? <span className="italic text-xs">Not provided</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.user.phone ?? <span className="italic text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(m.joinedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMember(m)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => handleApprove(m)}
                            disabled={isProcessing}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => { setRejectTarget(m); setRejectReason("") }}
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
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadMembers(page - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadMembers(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Member Detail Dialog */}
      <Dialog open={!!viewMember} onOpenChange={(o) => { if (!isProcessing && !o) setViewMember(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewMember?.user.firstName} {viewMember?.user.lastName}
            </DialogTitle>
            <DialogDescription>
              Member #{viewMember?.memberNumber} · Submitted {viewMember ? formatDate(viewMember.joinedAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {viewMember && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                  <p className="mt-0.5">{viewMember.user.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                  <p className="mt-0.5">{viewMember.user.phone ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">National ID</Label>
                  <p className="mt-0.5">{viewMember.nationalId ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">KRA PIN</Label>
                  <p className="mt-0.5">{viewMember.kraPin ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Employer</Label>
                  <p className="mt-0.5">{viewMember.employer ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Occupation</Label>
                  <p className="mt-0.5">{viewMember.occupation ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</Label>
                  <p className="mt-0.5">{viewMember.dateOfBirth ? formatDate(viewMember.dateOfBirth) : "—"}</p>
                </div>
              </div>

              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <Clock className="mr-1 h-3 w-3" />
                Pending Review
              </Badge>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => { setRejectTarget(viewMember); setRejectReason("") }}
              disabled={isProcessing}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => viewMember && handleApprove(viewMember)}
              disabled={isProcessing}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              {isProcessing ? "Processing…" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => { if (!isProcessing && !o) { setRejectTarget(null); setRejectReason("") } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Application</DialogTitle>
            <DialogDescription>
              Provide a clear reason. This will be sent to {rejectTarget?.user.firstName} via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejectReason">Rejection Reason</Label>
            <Textarea
              id="rejectReason"
              placeholder="e.g. National ID photo is too blurry — please re-upload a clear copy."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setRejectTarget(null); setRejectReason("") }}
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
    </div>
  )
}
