"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, FileText,
  Download, Upload, Loader2, RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { useDocumentUpload } from "@/hooks/use-document-upload"
import { adminApi, type KycDocument } from "@/lib/api-client"
import { getFormattedStatusLabel } from "@/lib/kyc-status"
import { UploadProgress } from "@/components/upload/UploadProgress"

const DOC_TYPES = [
  { value: "NATIONAL_ID_FRONT", label: "National ID (Front)" },
  { value: "NATIONAL_ID_BACK", label: "National ID (Back)" },
  { value: "KRA_PIN", label: "KRA PIN Certificate" },
  { value: "MEMBER_FORM", label: "Member Application Form" },
  { value: "OTHER", label: "Other Document" },
] as const

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  APPROVED: { icon: CheckCircle, label: "Approved", className: "bg-green-100 text-green-700 border-green-200" },
  REJECTED: { icon: XCircle, label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
  PENDING_REVIEW: { icon: Clock, label: "Pending Review", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  PENDING_UPLOAD: { icon: AlertCircle, label: "Pending Upload", className: "bg-gray-100 text-gray-600 border-gray-200" },
  QUARANTINE: { icon: AlertCircle, label: "Quarantined", className: "bg-orange-100 text-orange-700 border-orange-200" },
  DELETED: { icon: XCircle, label: "Deleted", className: "bg-gray-100 text-gray-400 border-gray-200" },
}

function DocStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING_UPLOAD
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {getFormattedStatusLabel(status) || cfg.label}
    </Badge>
  )
}

interface ReviewDialogProps {
  doc: KycDocument | null
  open: boolean
  onClose: () => void
  onSubmit: (docId: string, action: "APPROVED" | "REJECTED", reason?: string) => Promise<void>
  isSubmitting: boolean
}

function ReviewDialog({ doc, open, onClose, onSubmit, isSubmitting }: ReviewDialogProps) {
  const [action, setAction] = React.useState<"APPROVED" | "REJECTED">("APPROVED")
  const [reason, setReason] = React.useState("")

  React.useEffect(() => {
    if (open) { setAction("APPROVED"); setReason("") }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!doc) return
    if (action === "REJECTED" && !reason.trim()) {
      toast.error("Rejection reason is required.")
      return
    }
    await onSubmit(doc.id, action, action === "REJECTED" ? reason.trim() : undefined)
  }

  const typeLabel = DOC_TYPES.find((t) => t.value === doc?.type)?.label ?? doc?.type ?? ""

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Document</DialogTitle>
          <p className="text-sm text-muted-foreground">{typeLabel}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Decision</Label>
            <Select value={action} onValueChange={(v) => setAction(v as "APPROVED" | "REJECTED")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVED">Approve</SelectItem>
                <SelectItem value="REJECTED">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {action === "REJECTED" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this document is rejected…"
                rows={3}
                maxLength={1000}
                required
              />
              <p className="text-xs text-muted-foreground">{reason.length}/1000</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant={action === "REJECTED" ? "destructive" : "default"}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
              ) : action === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function MemberDocumentsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const memberId = params.id

  const [docs, setDocs] = React.useState<KycDocument[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false)
  const [reviewDoc, setReviewDoc] = React.useState<KycDocument | null>(null)
  const [uploadDocType, setUploadDocType] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const uploader = useDocumentUpload(undefined, undefined, {
    onTokenExpiry: () => toast.warning("Upload session expired. Please restart."),
    onQuarantine: (reason) => toast.error(reason),
  })

  const loadDocs = React.useCallback(async () => {
    setIsLoading(true)
    const res = await adminApi.listKycDocuments({ memberId })
    if (res.success && res.data) {
      setDocs(Array.isArray(res.data) ? res.data : [])
    } else {
      toast.error(res.error?.message ?? "Failed to load documents.")
    }
    setIsLoading(false)
  }, [memberId])

  React.useEffect(() => { loadDocs() }, [loadDocs])

  const handleDownload = async (doc: KycDocument) => {
    const res = await adminApi.getDocDownloadUrl(doc.id)
    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? "Failed to get download URL.")
      return
    }
    window.open(res.data.downloadUrl, "_blank", "noopener")
  }

  const handleUpload = async (file: File) => {
    if (!uploadDocType) {
      toast.error("Select a document type first.")
      return
    }
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedMimes.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, and PDF files are accepted.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds the 5 MB limit.")
      return
    }

    setIsUploading(true)
    let keepUploadPanelOpen = false
    try {
      const urlRes = await adminApi.requestUploadUrl({
        memberId,
        type: uploadDocType,
        mimeType: file.type,
        sizeBytes: file.size,
        originalFileName: file.name,
      })
      if (!urlRes.success || !urlRes.data) {
        toast.error(urlRes.error?.message ?? "Failed to get upload URL.")
        return
      }
      const result = await uploader.uploadToIntent(file, urlRes.data, async ({ documentId, checksum, uploadToken }) => {
        const confirmRes = await adminApi.confirmUpload({
          memberId,
          documentId,
          checksum,
          uploadToken,
        })
        if (!confirmRes.success) {
          const details = confirmRes.error?.details as { statusCode?: number } | undefined
          return {
            success: false,
            status: details?.statusCode,
            message: confirmRes.error?.message ?? "Failed to confirm upload.",
          }
        }
        return { success: true, documentId }
      })
      if (!result.success) {
        keepUploadPanelOpen = true
        toast.error(result.message)
        return
      }
      toast.success("Document uploaded — refreshing list…")
      setUploadDocType("")
      await loadDocs()
    } catch (error) {
      keepUploadPanelOpen = true
      toast.error(error instanceof Error ? error.message : "Upload failed. Please try again.")
    } finally {
      if (!keepUploadPanelOpen) setIsUploading(false)
    }
  }

  const handleReviewSubmit = async (
    docId: string,
    action: "APPROVED" | "REJECTED",
    rejectionReason?: string,
  ) => {
    setIsSubmittingReview(true)
    try {
      const res = await adminApi.enqueueDocReview(docId, {
        status: action,
        rejectionReason,
      })
      if (!res.success) {
        toast.error(res.error?.message ?? "Failed to submit review.")
        return
      }
      toast.success(`Review queued — the document will be ${action.toLowerCase()} shortly.`)
      setReviewDoc(null)
      await loadDocs()
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">KYC Documents</h1>
          <p className="text-muted-foreground text-sm">Member ID: {memberId}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadDocs} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>Upload a KYC document on behalf of this member (max 5 MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Select value={uploadDocType} onValueChange={setUploadDocType}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
              e.target.value = ""
            }}
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={isUploading || !uploadDocType}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading…" : "Choose & Upload"}
          </Button>
          </div>
          {isUploading && uploader.status !== "idle" && (
            <div className="max-w-md">
              <UploadProgress
                progress={uploader.progress}
                status={uploader.status}
                error={uploader.error}
                retryCount={uploader.retryCount}
                onRetry={async () => {
                  const retryResult = await uploader.retry()
                  if (retryResult.success) {
                    toast.success("Document uploaded. Refreshing list.")
                    await loadDocs()
                    setIsUploading(false)
                  } else {
                    toast.error(retryResult.message)
                  }
                }}
                onCancel={() => {
                  uploader.cancel()
                  setIsUploading(false)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents list */}
      <Card>
        <CardHeader>
          <CardTitle>Document Queue</CardTitle>
          <CardDescription>
            Click &ldquo;Review&rdquo; to approve or reject pending documents. Actions are processed asynchronously.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No documents found for this member.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {docs.map((doc) => {
                const typeLabel = DOC_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type
                const canReview = doc.status === "PENDING_REVIEW"
                return (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{typeLabel}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.originalFileName} · v{doc.version} ·{" "}
                          {new Date(doc.createdAt).toLocaleDateString("en-KE", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                        {doc.rejectionReason && (
                          <p className="text-xs text-red-600 mt-0.5 truncate">
                            Reason: {doc.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <DocStatusBadge status={doc.status} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Download"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canReview && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewDoc(doc)}
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ReviewDialog
        doc={reviewDoc}
        open={reviewDoc !== null}
        onClose={() => setReviewDoc(null)}
        onSubmit={handleReviewSubmit}
        isSubmitting={isSubmittingReview}
      />
    </div>
  )
}
