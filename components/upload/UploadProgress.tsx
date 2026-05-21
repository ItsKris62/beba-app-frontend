"use client"

import { AlertCircle, CheckCircle, RefreshCw, ShieldAlert, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { UploadStatus } from "@/hooks/use-document-upload"

interface UploadProgressProps {
  progress: number
  status: UploadStatus
  error?: string | null
  retryCount: number
  onRetry: () => void | Promise<void>
  onCancel: () => void
}

function statusLabel(status: UploadStatus): string {
  switch (status) {
    case "requesting":
      return "Preparing upload"
    case "uploading":
      return "Uploading"
    case "confirming":
      return "Verifying integrity"
    case "success":
      return "Upload complete"
    case "quarantine":
      return "Security review required"
    case "error":
      return "Upload failed"
    default:
      return "Upload"
  }
}

export function UploadProgress({
  progress,
  status,
  error,
  retryCount,
  onRetry,
  onCancel,
}: UploadProgressProps) {
  const isBusy = status === "requesting" || status === "uploading" || status === "confirming"
  const clampedProgress = status === "confirming" ? 100 : Math.max(0, Math.min(100, progress))

  return (
    <div className="space-y-3 rounded-md border bg-muted/40 p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 font-medium">
            {status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
            {status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
            {status === "quarantine" && <ShieldAlert className="h-4 w-4 text-amber-600" />}
            <span className="truncate">{statusLabel(status)}</span>
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{clampedProgress}%</span>
        </div>
        <Progress value={clampedProgress} className="h-2" />
      </div>

      {(status === "error" || status === "quarantine") && (
        <p className="text-sm text-muted-foreground">
          {error ?? (status === "quarantine" ? "The file was held for manual review." : "Please try again.")}
          {retryCount > 0 && status === "error" ? ` Attempt ${Math.min(retryCount, 3)} of 3.` : ""}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "error" && retryCount < 3 && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
        {isBusy && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
