"use client"

import * as React from "react"
import { User, Mail, Phone, Shield, Key, Smartphone, FileText, Upload, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { memberApi, authApi, type MemberDashboard } from "@/lib/api-client"

export default function ProfilePage() {
  const [dashboard, setDashboard] = React.useState<MemberDashboard | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false)
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false)

  // Password form state
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  // Document upload state
  const [isUploading, setIsUploading] = React.useState(false)

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const res = await memberApi.getDashboard()
      if (res.success && res.data) {
        setDashboard(res.data)
      }
      setIsLoading(false)
    }
    load()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    // Profile update (email/phone) is a Phase 2 feature requiring admin approval
    toast.info("Profile update requests must be submitted to the branch. Contact support.")
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
    setIsUpdating(true)
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
      setIsUpdating(false)
    }
  }

  const handleUploadDocument = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*,.pdf"
    input.onchange = async (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0]
      if (!file) return
      setIsUploading(true)
      try {
        const urlRes = await memberApi.requestUploadUrl(file.name, file.type)
        if (!urlRes.success || !urlRes.data) {
          toast.error("Failed to get upload URL.")
          return
        }
        const putRes = await fetch(urlRes.data.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        })
        if (!putRes.ok) {
          toast.error("Upload failed. Please try again.")
          return
        }
        toast.success("Document uploaded successfully! It will be reviewed by our team.")
      } catch {
        toast.error("Upload failed. Please check your connection.")
      } finally {
        setIsUploading(false)
      }
    }
    input.click()
  }

  const displayName = dashboard?.member.name ?? "—"
  const memberNumber = dashboard?.member.memberNumber ?? "—"
  const email = dashboard?.member.email ?? "—"
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and security</p>
      </div>

      {/* Profile Overview Card */}
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
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                <p className="text-muted-foreground">Member No: {memberNumber}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
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
              <CardDescription>Your registered details with the SACCO</CardDescription>
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
                        <p className="text-xs text-muted-foreground">Contact support to update</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Member Number</Label>
                        <Input value={memberNumber} disabled />
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="pl-9"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Contact support to update your email</p>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="outline">
                  Request Profile Update
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Security Settings */}
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
                        placeholder="Enter new password (min 8 chars)"
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
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? "Changing…" : "Change Password"}
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
                    <p className="font-medium">Google Authenticator</p>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled
                        ? "Your account is protected with 2FA"
                        : "Secure your account with time-based codes"}
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
                {/* TODO Phase 2: Implement Google Authenticator setup flow */}
                {twoFactorEnabled && (
                  <div className="mt-4 rounded-lg bg-green-50 p-3">
                    <p className="text-sm text-green-700">
                      Two-factor authentication is enabled. You&apos;ll need to enter a code when logging in.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Document Vault */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Document Vault</CardTitle>
              <CardDescription>Upload and manage your KYC documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your KYC documents (National ID, Passport Photo, Proof of Address)
                </p>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleUploadDocument}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading…" : "Upload Document"}
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Accepted formats: JPG, PNG, PDF. Max size: 10MB. Documents will be reviewed within 2 business days.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
