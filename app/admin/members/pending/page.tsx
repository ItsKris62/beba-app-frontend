"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { adminApi, type KycDocument, type PendingMember } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

const PAGE_SIZE = 20

const CHECKLIST_ITEMS = [
  { key: "idDocument", label: "ID document verified" },
  { key: "phoneVerified", label: "Phone number verified" },
  { key: "memberFormSigned", label: "Member form complete" },
] as const

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"]
type KycChecklist = Record<ChecklistKey, boolean>

function createChecklist(): KycChecklist {
  return {
    idDocument: false,
    phoneVerified: false,
    memberFormSigned: false,
  }
}

// Mirrors REQUIRED_KYC_DOCUMENT_TYPES in backend/src/modules/admin/admin.service.ts —
// KYC approval requires an APPROVED document of each of these types.
const REQUIRED_DOC_TYPES = ["NATIONAL_ID_FRONT", "NATIONAL_ID_BACK", "KRA_PIN", "MEMBER_FORM"] as const

const DOC_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID_FRONT: "National ID (Front)",
  NATIONAL_ID_BACK: "National ID (Back)",
  KRA_PIN: "KRA PIN Certificate",
  MEMBER_FORM: "Signed Member Form",
  PASSPORT_PHOTO: "Passport Photo",
  OTHER: "Other Document",
}

function formatDate(value?: string | null): string {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-KE")
}

function fullName(member: PendingMember): string {
  return `${member.user.firstName} ${member.user.lastName}`.trim()
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING_REVIEW: "bg-amber-100 text-amber-800 border-amber-200",
    APPROVED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    PENDING_UPLOAD: "bg-orange-100 text-orange-800 border-orange-200",
  }

  return (
    <Badge variant="outline" className={map[status] ?? "bg-gray-100 text-gray-800"}>
      {status.split("_").join(" ")}
    </Badge>
  )
}

function KycProgressBadge({ documentsUploaded, isComplete }: { documentsUploaded: number; isComplete: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isComplete
          ? "bg-green-100 text-green-800 border-green-200"
          : "bg-orange-100 text-orange-800 border-orange-200"
      }
    >
      {documentsUploaded} / {REQUIRED_DOC_TYPES.length}
    </Badge>
  )
}

export default function PendingKycPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [members, setMembers] = useState<PendingMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  // Mirrors `search` without being a reactive effect dependency — lets the
  // mount/statusFilter-triggered load below read the current search box value
  // without re-running on every keystroke (see the effect further down).
  const searchRef = useRef(search)
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING_REVIEW" | "INCOMPLETE">("PENDING_REVIEW")

  const [viewMember, setViewMember] = useState<PendingMember | null>(null)
  const [approveMember, setApproveMember] = useState<PendingMember | null>(null)
  const [rejectMember, setRejectMember] = useState<PendingMember | null>(null)
  const [approveDocuments, setApproveDocuments] = useState<KycDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [checklist, setChecklist] = useState<KycChecklist>(() => createChecklist())
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (user && !["TENANT_ADMIN", "MANAGER", "SUPER_ADMIN", "LOAN_OFFICER"].includes(user.role)) {
      router.replace("/admin/dashboard")
    }
  }, [user, router])

  const loadMembers = useCallback(async (p = 1, q = "") => {
    setIsLoading(true)
    try {
      const result = await adminApi.getPendingMembers({
        page: p,
        limit: PAGE_SIZE,
        search: q || undefined,
        statusFilter,
      })

      if (!result.success) {
        throw new Error(result.error?.message ?? "Failed to load KYC queue")
      }

      setMembers(result.data?.data ?? [])
      setTotal(result.data?.meta?.total ?? 0)
      setTotalPages(result.data?.meta?.totalPages ?? 1)
      setPage(p)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Failed to load KYC queue")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    // loadMembers' own first statement (setIsLoading(true)) runs synchronously here,
    // which react-compiler's set-state-in-effect rule flags on principle. Restructuring
    // this into an ignore-flag/AbortController fetch-effect would change more than the
    // lint warning — not in scope here — so this is acknowledged rather than rewritten.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers(1, searchRef.current)
  }, [loadMembers])

  const checklistProgress = useMemo(() => {
    const passed = CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length
    return Math.round((passed / CHECKLIST_ITEMS.length) * 100)
  }, [checklist])

  const loadApproveDocuments = useCallback(async (memberId: string) => {
    setDocsLoading(true)
    try {
      const result = await adminApi.listKycDocuments({ memberId })
      if (result.success) {
        setApproveDocuments(result.data)
      } else {
        toast.error(result.error?.message ?? "Failed to load KYC documents")
      }
    } finally {
      setDocsLoading(false)
    }
  }, [])

  const openApproveDialog = (member: PendingMember) => {
    setApproveMember(member)
    setApprovalNotes("")
    setChecklist(createChecklist())
    void loadApproveDocuments(member.id)
  }

  const closeApproveDialog = () => {
    setApproveMember(null)
    setApproveDocuments([])
    setApprovalNotes("")
    setChecklist(createChecklist())
  }

  // Document review (POST /admin/kyc/documents/:id/review) is processed
  // asynchronously via BullMQ — the status doesn't flip immediately, so poll
  // briefly after triggering it rather than assuming it's done on response.
  async function handleApproveDocument(doc: KycDocument) {
    if (!approveMember) return
    setReviewingDocId(doc.id)
    try {
      const result = await adminApi.enqueueDocReview(doc.id, { status: "APPROVED" })
      if (!result.success) {
        toast.error(result.error?.message ?? "Failed to queue document review")
        return
      }
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200))
        const refreshed = await adminApi.listKycDocuments({ memberId: approveMember.id })
        if (refreshed.success) {
          setApproveDocuments(refreshed.data)
          const updated = refreshed.data.find((d) => d.id === doc.id)
          if (updated?.status === "APPROVED") break
        }
      }
    } finally {
      setReviewingDocId(null)
    }
  }

  const approvedDocumentIds = useMemo(
    () => approveDocuments.filter((doc) => doc.status === "APPROVED").map((doc) => doc.id),
    [approveDocuments],
  )

  const missingRequiredDocTypes = useMemo(() => {
    const approvedTypes = new Set(
      approveDocuments.filter((doc) => doc.status === "APPROVED").map((doc) => doc.type),
    )
    return REQUIRED_DOC_TYPES.filter((type) => !approvedTypes.has(type))
  }, [approveDocuments])

  const openRejectDialog = (member: PendingMember) => {
    setRejectMember(member)
    setRejectReason("")
  }

  const closeRejectDialog = () => {
    setRejectMember(null)
    setRejectReason("")
  }

  async function handleApprove() {
    if (!approveMember) return

    if (missingRequiredDocTypes.length > 0) {
      toast.error(
        `Approve all required documents first: ${missingRequiredDocTypes.map((t) => DOC_TYPE_LABELS[t] ?? t).join(", ")}`,
      )
      return
    }

    const incomplete = CHECKLIST_ITEMS.filter((item) => !checklist[item.key])
    if (incomplete.length > 0) {
      toast.error("Complete the KYC checklist before approval")
      return
    }

    setIsProcessing(true)
    try {
      const result = await adminApi.updateKyc(approveMember.id, {
        verified: true,
        documentIds: approvedDocumentIds,
        checklist,
        notes: approvalNotes.trim() || undefined,
      })

      if (!result.success) {
        throw new Error(result.error?.message ?? "KYC approval failed")
      }

      toast.success(`${fullName(approveMember)} approved`)
      closeApproveDialog()
      setViewMember(null)
      loadMembers(page, search)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "KYC approval failed")
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleReject() {
    if (!rejectMember) return

    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason")
      return
    }

    setIsProcessing(true)
    try {
      const result = await adminApi.updateKyc(rejectMember.id, {
        verified: false,
        notes: rejectReason.trim(),
      })

      if (!result.success) {
        throw new Error(result.error?.message ?? "KYC rejection failed")
      }

      toast.success(`${fullName(rejectMember)} rejected`)
      closeRejectDialog()
      setViewMember(null)
      loadMembers(page, search)
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "KYC rejection failed")
    } finally {
      setIsProcessing(false)
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    loadMembers(1, search)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KYC Review Queue</h1>
          <p className="text-muted-foreground">
            Review existing member KYC records awaiting approval.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => loadMembers(page, search)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/applications")}>
            New Application
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {statusFilter === "INCOMPLETE"
                ? "Incomplete Submissions"
                : statusFilter === "ALL"
                  ? "In Queue"
                  : "Awaiting Review"}
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{total}</div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Matching the selected status filter</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Members</CardTitle>
          <CardDescription>
            {statusFilter === "INCOMPLETE"
              ? "Members still missing required KYC documents, ordered oldest first."
              : statusFilter === "ALL"
                ? "Members awaiting review or still missing required documents, ordered oldest first."
                : "Members with all required documents uploaded, awaiting review, ordered oldest first."}
          </CardDescription>
          <form onSubmit={handleSearch} className="mt-2 flex flex-wrap gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, member number, ID, or email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  searchRef.current = event.target.value
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "ALL" | "PENDING_REVIEW" | "INCOMPLETE")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_REVIEW">Awaiting Review</SelectItem>
                <SelectItem value="INCOMPLETE">Incomplete Submissions</SelectItem>
                <SelectItem value="ALL">All (Review + Incomplete)</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
              <p className="font-medium">Queue is clear</p>
              <p className="text-sm text-muted-foreground">No members are pending KYC review.</p>
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
                    <TableHead>Status</TableHead>
                    <TableHead>KYC Progress</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-medium">{fullName(member)}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{member.memberNumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.nationalId ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.user.phone ?? "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.kycStatus} />
                      </TableCell>
                      <TableCell>
                        <KycProgressBadge
                          documentsUploaded={member.documentsUploaded}
                          isComplete={member.isComplete}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(member.joinedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setViewMember(member)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {member.kycStatus === "PENDING_REVIEW" ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() => openApproveDialog(member)}
                                disabled={isProcessing}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => openRejectDialog(member)}
                                disabled={isProcessing}
                              >
                                <XCircle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                              Awaiting documents
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} - {total} pending
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => loadMembers(page - 1, search)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => loadMembers(page + 1, search)}
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

      <Dialog open={!!viewMember} onOpenChange={(open) => { if (!open) setViewMember(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewMember ? fullName(viewMember) : "Member Details"}</DialogTitle>
            <DialogDescription>
              {viewMember?.memberNumber} {viewMember && <StatusBadge status={viewMember.kycStatus} />}
            </DialogDescription>
          </DialogHeader>

          {viewMember && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                <p className="mt-0.5 break-all">{viewMember.user.email}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Phone</Label>
                <p className="mt-0.5">{viewMember.user.phone ?? "-"}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">National ID</Label>
                <p className="mt-0.5 font-mono">{viewMember.nationalId ?? "-"}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">KRA PIN</Label>
                <p className="mt-0.5 font-mono">{viewMember.kraPin ?? "-"}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Employer</Label>
                <p className="mt-0.5">{viewMember.employer ?? "-"}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Occupation</Label>
                <p className="mt-0.5">{viewMember.occupation ?? "-"}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date of Birth</Label>
                <p className="mt-0.5">{formatDate(viewMember.dateOfBirth)}</p>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Joined</Label>
                <p className="mt-0.5">{formatDate(viewMember.joinedAt)}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {viewMember?.kycStatus === "PENDING_REVIEW" ? (
              <>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (viewMember) openRejectDialog(viewMember)
                    setViewMember(null)
                  }}
                  disabled={isProcessing}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => {
                    if (viewMember) openApproveDialog(viewMember)
                    setViewMember(null)
                  }}
                  disabled={isProcessing}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              </>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Missing {REQUIRED_DOC_TYPES.length - (viewMember?.documentsUploaded ?? 0)} required document(s) — cannot review yet.
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!approveMember}
        onOpenChange={(open) => { if (!isProcessing && !open) closeApproveDialog() }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Approve KYC</DialogTitle>
            <DialogDescription>
              {approveMember ? fullName(approveMember) : "Member"} will be marked as KYC approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>KYC Documents</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => approveMember && loadApproveDocuments(approveMember.id)}
                  disabled={docsLoading}
                >
                  <RefreshCw className={`mr-1 h-3 w-3 ${docsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {docsLoading && approveDocuments.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : approveDocuments.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No documents uploaded for this member yet. Upload documents from the member&rsquo;s
                  edit profile before approving KYC.
                </p>
              ) : (
                <div className="space-y-2 rounded-md border p-2">
                  {approveDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-md p-2 text-sm">
                      <div>
                        <p className="font-medium">{DOC_TYPE_LABELS[doc.type] ?? doc.type}</p>
                        <p className="text-xs text-muted-foreground">{doc.originalFileName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            doc.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : doc.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {doc.status.replace(/_/g, " ")}
                        </span>
                        {doc.status !== "APPROVED" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveDocument(doc)}
                            disabled={reviewingDocId === doc.id}
                          >
                            {reviewingDocId === doc.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!docsLoading && missingRequiredDocTypes.length > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Missing approved: {missingRequiredDocTypes.map((t) => DOC_TYPE_LABELS[t] ?? t).join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>KYC Checklist</Label>
                <span className="text-xs text-muted-foreground">{checklistProgress}%</span>
              </div>
              <Progress value={checklistProgress} />
              <div className="space-y-2 rounded-md border p-3">
                {CHECKLIST_ITEMS.map((item) => (
                  <label key={item.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checklist[item.key]}
                      onCheckedChange={(checked) => {
                        setChecklist((current) => ({
                          ...current,
                          [item.key]: checked === true,
                        }))
                      }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approvalNotes">Notes</Label>
              <Textarea
                id="approvalNotes"
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                placeholder="Optional review note"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeApproveDialog} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleApprove}
              disabled={isProcessing || docsLoading || missingRequiredDocTypes.length > 0}
            >
              <FileCheck2 className="mr-1 h-4 w-4" />
              {isProcessing ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectMember}
        onOpenChange={(open) => { if (!isProcessing && !open) closeRejectDialog() }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
            <DialogDescription>
              {rejectMember ? fullName(rejectMember) : "Member"} will be marked as KYC rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejectReason">Rejection Reason</Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Example: ID document is unreadable. Please upload a clearer copy."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {isProcessing ? "Rejecting..." : "Reject KYC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
