"use client"

import * as React from "react"
import {
  User, Mail, Phone, Shield, Key, Smartphone, FileText, Upload, Camera, Trash2,
  Eye, EyeOff, CheckCircle, XCircle, Clock, AlertCircle,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileAvatar } from "@/components/profile-avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { memberApi, authApi, type MemberDashboard, type KycDocument } from "@/lib/api-client"
import { getFormattedStatusLabel, isKycVerified } from "@/lib/kyc-status"
import { normalizeKenyanPhone } from "@/lib/utils"
import { useDocumentUpload } from "@/hooks/use-document-upload"
import { UploadProgress } from "@/components/upload/UploadProgress"

// Accepts 07XXXXXXXX, 01XXXXXXXX, 254XXXXXXXXX or +254XXXXXXXXX — normalized
// to +254XXXXXXXXX, the format the backend's patchProfile endpoint requires.
const KENYA_PHONE_REGEX = /^(?:\+?254|0)(7\d{8}|1\d{8})$/

const DOC_TYPES = [
  { value: "NATIONAL_ID_FRONT", label: "National ID (Front)" },
  { value: "NATIONAL_ID_BACK", label: "National ID (Back)" },
  { value: "KRA_PIN", label: "KRA PIN Certificate" },
  { value: "MEMBER_FORM", label: "Member Application Form" },
  { value: "OTHER", label: "Other Document" },
] as const

const ALLOWED_UPLOAD_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "image/heic", "image/heif"]
// iPhones capture photos as HEIC/HEIF, and some mobile browsers/file pickers
// don't populate File.type at all (it comes back "" or "application/octet-stream").
// When the reported MIME type isn't trustworthy, fall back to checking the
// file extension instead of rejecting outright.
const ALLOWED_UPLOAD_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf", ".heic", ".heif"]
const UPLOAD_TYPE_ERROR = "Only JPG, PNG, WebP, PDF, and HEIC/HEIF files are accepted."
const ALLOWED_AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"]
const ALLOWED_AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]

export function hasAllowedExtension(fileName: string): boolean {
  const dotIndex = fileName.lastIndexOf(".")
  if (dotIndex === -1) return false
  const extension = fileName.slice(dotIndex).toLowerCase()
  return ALLOWED_UPLOAD_EXTENSIONS.includes(extension)
}

/** Returns an error message if the file fails the type/size gate, or null if it's valid. */
export function getUploadValidationError(file: File): string | null {
  const mimeType = file.type || "application/octet-stream"
  const mimeTypeIsTrustworthy = mimeType !== "application/octet-stream"
  const isAllowed = mimeTypeIsTrustworthy
    ? ALLOWED_UPLOAD_MIMES.includes(mimeType)
    : hasAllowedExtension(file.name)
  if (!isAllowed) return UPLOAD_TYPE_ERROR
  if (file.size > 5 * 1024 * 1024) return "File exceeds the 5 MB limit."
  return null
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  APPROVED: { icon: CheckCircle, label: "Approved", className: "bg-green-100 text-green-700" },
  REJECTED: { icon: XCircle, label: "Rejected", className: "bg-red-100 text-red-700" },
  PENDING_REVIEW: { icon: Clock, label: "Under Review", className: "bg-yellow-100 text-yellow-700" },
  PENDING_UPLOAD: { icon: AlertCircle, label: "Pending Upload", className: "bg-gray-100 text-gray-600" },
  DELETED: { icon: XCircle, label: "Deleted", className: "bg-gray-100 text-gray-400" },
}

function DocStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING_UPLOAD
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {getFormattedStatusLabel(status) || cfg.label}
    </span>
  )
}

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [dashboard, setDashboard] = React.useState<MemberDashboard | null>(null)
  const [documents, setDocuments] = React.useState<KycDocument[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDocsLoading, setIsDocsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = React.useState(false)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false)

  // Profile form
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [employer, setEmployer] = React.useState("")
  const [occupation, setOccupation] = React.useState("")

  // Password form
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  // Upload form
  const [uploadDocType, setUploadDocType] = React.useState<string>("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)
  const uploader = useDocumentUpload(undefined, undefined, {
    onTokenExpiry: () => toast.warning("Upload session expired. Please restart the upload."),
    onQuarantine: (reason) => toast.error(reason),
  })

  const loadDocuments = React.useCallback(async () => {
    setIsDocsLoading(true)
    const res = await memberApi.listDocuments()
    if (res.success && res.data) {
      setDocuments(Array.isArray(res.data) ? res.data : [])
    }
    setIsDocsLoading(false)
  }, [])

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const res = await memberApi.getDashboard()
      if (res.success && res.data) {
        setDashboard(res.data)
        setEmail(res.data.member.email ?? "")
      }
      setIsLoading(false)
    }
    load()
    loadDocuments()
  }, [loadDocuments])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: { phone?: string; email?: string; employer?: string; occupation?: string } = {}
    if (phone) {
      const trimmedPhone = phone.trim()
      if (!KENYA_PHONE_REGEX.test(trimmedPhone)) {
        toast.error("Enter a valid Kenyan number (e.g. 0712345678)")
        return
      }
      payload.phone = normalizeKenyanPhone(trimmedPhone)
    }
    if (email) payload.email = email
    if (employer) payload.employer = employer
    if (occupation) payload.occupation = occupation

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.")
      return
    }

    setIsSaving(true)
    try {
      const res = await memberApi.patchProfile(payload)
      if (!res.success) {
        toast.error(res.error?.message ?? "Failed to update profile.")
        return
      }
      toast.success("Profile updated successfully.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }
    setIsChangingPassword(true)
    try {
      const res = await authApi.changePassword(currentPassword, newPassword)
      if (!res.success) {
        toast.error(res.error?.message ?? "Failed to change password.")
        return
      }
      toast.success("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleUploadDocument = async (file: File) => {
    if (!uploadDocType) {
      toast.error("Please select a document type first.")
      return
    }

    const validationError = getUploadValidationError(file)
    if (validationError) {
      toast.error(validationError)
      return
    }
    const mimeType = file.type || "application/octet-stream"

    setIsUploading(true)
    let keepUploadPanelOpen = false
    try {
      const urlRes = await memberApi.requestDocUploadUrl({
        type: uploadDocType,
        mimeType,
        sizeBytes: file.size,
        originalFileName: file.name,
      })
      if (!urlRes.success || !urlRes.data) {
        toast.error(urlRes.error?.message ?? "Failed to get upload URL.")
        return
      }

      const result = await uploader.uploadToIntent(file, urlRes.data, async ({ documentId, checksum, uploadToken }) => {
        const confirmRes = await memberApi.confirmDocUpload({ documentId, checksum, uploadToken })
        if (!confirmRes.success) {
          const details = confirmRes.error?.details as { status?: number; statusCode?: number } | undefined
          return {
            success: false,
            status: details?.status ?? details?.statusCode,
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

      toast.success("Document uploaded successfully! It will be reviewed by our team.")
      setUploadDocType("")
      await loadDocuments()
    } catch {
      keepUploadPanelOpen = true
      toast.error("Upload failed. Please check your connection and try again.")
    } finally {
      if (!keepUploadPanelOpen) setIsUploading(false)
    }
  }

  const expectedAvatarMimeType = (fileName: string) => {
    const lowerName = fileName.toLowerCase()
    if (lowerName.endsWith(".png")) return "image/png"
    if (lowerName.endsWith(".webp")) return "image/webp"
    if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg"
    return null
  }

  const inferAvatarMimeType = (file: File) => {
    const expected = expectedAvatarMimeType(file.name)
    if (file.type) return file.type
    if (expected) return expected
    return "image/jpeg"
  }

  const handleUploadAvatar = async (file: File) => {
    const lowerName = file.name.toLowerCase()
    const hasAvatarExtension = ALLOWED_AVATAR_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
    const expectedMimeType = expectedAvatarMimeType(file.name)
    const mimeType = inferAvatarMimeType(file)
    if (!hasAvatarExtension || !expectedMimeType || mimeType !== expectedMimeType || !ALLOWED_AVATAR_MIMES.includes(mimeType)) {
      toast.error("Choose a JPG, PNG, or WebP image.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be 5 MB or smaller.")
      return
    }

    setIsAvatarUploading(true)
    try {
      const urlRes = await memberApi.requestProfileImageUploadUrl(file.name)
      if (!urlRes.success || !urlRes.data) {
        toast.error(urlRes.error?.message ?? "Failed to prepare profile picture upload.")
        return
      }

      const uploadRes = await fetch(urlRes.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      })
      if (!uploadRes.ok) {
        toast.error("Profile picture upload failed.")
        return
      }

      const saveRes = await memberApi.patchProfile({ profileImageKey: urlRes.data.fileKey })
      if (!saveRes.success) {
        toast.error(saveRes.error?.message ?? "Failed to save profile picture.")
        return
      }

      const updatedAt = saveRes.data?.user?.updatedAt ?? new Date().toISOString()
      setDashboard((current) => current
        ? {
            ...current,
            member: {
              ...current.member,
              profileImageKey: urlRes.data.fileKey,
              updatedAt,
            },
          }
        : current)
      await queryClient.invalidateQueries({ queryKey: ["member-dashboard"] })
      toast.success("Profile picture updated.")
    } catch {
      toast.error("Profile picture upload failed. Please try again.")
    } finally {
      setIsAvatarUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setIsAvatarUploading(true)
    try {
      const res = await memberApi.patchProfile({ profileImageKey: null })
      if (!res.success) {
        toast.error(res.error?.message ?? "Failed to remove profile picture.")
        return
      }

      const updatedAt = res.data?.user?.updatedAt ?? new Date().toISOString()
      setDashboard((current) => current
        ? {
            ...current,
            member: {
              ...current.member,
              profileImageKey: null,
              updatedAt,
            },
          }
        : current)
      await queryClient.invalidateQueries({ queryKey: ["member-dashboard"] })
      toast.success("Profile picture removed.")
    } finally {
      setIsAvatarUploading(false)
    }
  }

  const displayName = dashboard?.member.name ?? "—"
  const memberNumber = dashboard?.member.memberNumber ?? "—"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and security</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="flex flex-col items-center gap-3">
                <ProfileAvatar
                  name={displayName}
                  profileImageKey={dashboard?.member.profileImageKey}
                  updatedAt={dashboard?.member.updatedAt}
                  className="h-24 w-24"
                  fallbackClassName="bg-primary text-primary-foreground text-2xl"
                />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadAvatar(file)
                    e.target.value = ""
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={isAvatarUploading}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    {isAvatarUploading ? "Uploading..." : "Photo"}
                  </Button>
                  {dashboard?.member.profileImageKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isAvatarUploading}
                      onClick={handleRemoveAvatar}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove profile picture</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <p className="text-muted-foreground">Member No: {memberNumber}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                  {dashboard?.member.kycStatus && (
                    <Badge
                      className={
                        isKycVerified(dashboard.member.kycStatus)
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                      }
                    >
                      KYC: {getFormattedStatusLabel(dashboard.member.kycStatus)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your contact details and employment information</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={displayName} disabled />
                        <p className="text-xs text-muted-foreground">Contact your branch to update</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Member Number</Label>
                        <Input value={memberNumber} disabled />
                      </div>
                    </div>
                    <Separator />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-9"
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="pl-9"
                            placeholder="0712345678"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">e.g. 0712345678 or +254712345678</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="employer">Employer</Label>
                        <Input
                          id="employer"
                          value={employer}
                          onChange={(e) => setEmployer(e.target.value)}
                          placeholder="Current employer name"
                          maxLength={255}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="occupation">Occupation</Label>
                        <Input
                          id="occupation"
                          value={occupation}
                          onChange={(e) => setOccupation(e.target.value)}
                          placeholder="Your occupation / role"
                          maxLength={255}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving || isLoading}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="pr-9"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-9"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? "Changing…" : "Change Password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled
                        ? "Your account is protected with 2FA"
                        : "Secure your account with time-based codes"}
                    </p>
                  </div>
                  <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                </div>
                {twoFactorEnabled && (
                  <div className="mt-4 rounded-lg bg-green-50 p-3">
                    <p className="text-sm text-green-700">
                      Two-factor authentication is enabled. Contact support to set up your authenticator.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents">
          <div className="space-y-4">
            {/* Upload card */}
            <Card>
              <CardHeader>
                <CardTitle>Upload KYC Document</CardTitle>
                <CardDescription>
                  Accepted formats: JPG, PNG, WebP, PDF · Max 5 MB per file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUploadDocument(file)
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
                  {isUploading ? "Uploading…" : "Choose File & Upload"}
                </Button>
                {isUploading && uploader.status !== "idle" && (
                  <UploadProgress
                    progress={uploader.progress}
                    status={uploader.status}
                    error={uploader.error}
                    retryCount={uploader.retryCount}
                    onRetry={async () => {
                      const result = await uploader.retry()
                      if (result.success) {
                        toast.success("Document uploaded successfully.")
                        await loadDocuments()
                        setIsUploading(false)
                      } else {
                        toast.error(result.message)
                      }
                    }}
                    onCancel={() => {
                      uploader.cancel()
                      setIsUploading(false)
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Document list */}
            <Card>
              <CardHeader>
                <CardTitle>My Documents</CardTitle>
                <CardDescription>All KYC documents you have submitted</CardDescription>
              </CardHeader>
              <CardContent>
                {isDocsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No documents uploaded yet. Use the form above to submit your KYC documents.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {documents.map((doc) => {
                      const typeLabel = DOC_TYPES.find((t) => t.value === doc.type)?.label ?? doc.type
                      return (
                        <li key={doc.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{typeLabel}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {doc.originalFileName} · v{doc.version}
                              </p>
                            </div>
                          </div>
                          <div className="ml-3 shrink-0">
                            <DocStatusBadge status={doc.status} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
