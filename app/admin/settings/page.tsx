"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Shield,
  Bell,
  Mail,
  Globe,
  Database,
  Save,
  RefreshCw,
  Building2,
} from "lucide-react"
import { tenantsApi } from "@/lib/api-client"

type GeneralFormState = {
  name: string
  contactEmail: string
  contactPhone: string
  address: string
  logoUrl: string
}

const emptyGeneralForm: GeneralFormState = {
  name: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  logoUrl: "",
}

export default function AdminSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(true)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [autoLogout, setAutoLogout] = useState(true)

  const [general, setGeneral] = useState<GeneralFormState>(emptyGeneralForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    tenantsApi.getSettings().then((result) => {
      if (cancelled) return
      if (result.success && result.data) {
        setGeneral({
          name: result.data.name ?? "",
          contactEmail: result.data.contactEmail ?? "",
          contactPhone: result.data.contactPhone ?? "",
          address: result.data.address ?? "",
          logoUrl: result.data.logoUrl ?? "",
        })
      } else {
        toast.error(result.error?.message ?? "Failed to load organization settings")
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const updateGeneral = <K extends keyof GeneralFormState>(key: K, value: GeneralFormState[K]) => {
    setGeneral((current) => ({ ...current, [key]: value }))
  }

  const handleLogoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setUploadingLogo(true)
    try {
      const intentResult = await tenantsApi.requestLogoUploadUrl(file.name, file.type)
      if (!intentResult.success) {
        throw new Error(intentResult.error?.message ?? "Could not start logo upload")
      }

      const { uploadUrl, publicUrl } = intentResult.data
      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!putResponse.ok) throw new Error("Logo upload to storage failed")

      updateGeneral("logoUrl", publicUrl)
      toast.success("Logo uploaded. Click Save Changes to apply it.")
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? "Logo upload failed")
    } finally {
      setUploadingLogo(false)
    }
  }

  const saveGeneralSettings = async () => {
    setSaving(true)
    try {
      const result = await tenantsApi.updateSettings({
        name: general.name,
        contactEmail: general.contactEmail,
        contactPhone: general.contactPhone,
        address: general.address,
        ...(general.logoUrl ? { logoUrl: general.logoUrl } : {}),
      })
      if (!result.success) throw new Error(result.error?.message ?? "Could not save organization settings")
      toast.success("Organization settings saved")
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? "Could not save organization settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        <Button onClick={saveGeneralSettings} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle>Organization Settings</CardTitle>
              </div>
              <CardDescription>Basic information about your SACCO</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                  {general.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={general.logoUrl} alt="Organization logo" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoSelected}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo || loading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or GIF. Saved when you click Save Changes.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" value={general.name} disabled={loading} onChange={(e) => updateGeneral("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regNumber">Registration Number</Label>
                  <Input id="regNumber" defaultValue="CS/2024/001234" disabled />
                  <p className="text-xs text-muted-foreground">Not yet backed by a database field — display only.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" value={general.contactEmail} disabled={loading} onChange={(e) => updateGeneral("contactEmail", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Contact Phone</Label>
                  <Input id="phone" value={general.contactPhone} disabled={loading} onChange={(e) => updateGeneral("contactPhone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Textarea
                  id="address"
                  value={general.address}
                  disabled={loading}
                  onChange={(e) => updateGeneral("address", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <CardTitle>Regional Settings</CardTitle>
              </div>
              <CardDescription>Configure regional and display preferences (not yet persisted)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select defaultValue="kes">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kes">KES - Kenyan Shilling</SelectItem>
                      <SelectItem value="usd">USD - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="eat">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eat">East Africa Time (UTC+3)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select defaultValue="dmy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <CardTitle>Security Settings</CardTitle>
              </div>
              <CardDescription>Configure security policies and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin users
                  </p>
                </div>
                <Switch checked={twoFactorAuth} onCheckedChange={setTwoFactorAuth} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Logout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out inactive sessions after 30 minutes
                  </p>
                </div>
                <Switch checked={autoLogout} onCheckedChange={setAutoLogout} />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input type="number" defaultValue="30" />
                </div>
                <div className="space-y-2">
                  <Label>Password Expiry (days)</Label>
                  <Input type="number" defaultValue="90" />
                </div>
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input type="number" defaultValue="5" />
                </div>
                <div className="space-y-2">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input type="number" defaultValue="15" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>Define password requirements for all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum Length</Label>
                  <Input type="number" defaultValue="8" />
                </div>
                <div className="space-y-2">
                  <Label>Password History</Label>
                  <Input type="number" defaultValue="5" placeholder="Previous passwords to remember" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password Requirements</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Uppercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Lowercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Numbers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <span className="text-sm">Special characters</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Notification Preferences</CardTitle>
              </div>
              <CardDescription>Configure how notifications are sent to members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via email
                  </p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via SMS
                  </p>
                </div>
                <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Notification Events</Label>
                <div className="space-y-3">
                  {[
                    "Loan Application Status",
                    "Loan Disbursement",
                    "Loan Repayment Reminder",
                    "Deposit Confirmation",
                    "Withdrawal Confirmation",
                    "Statement Generation",
                    "System Maintenance",
                  ].map((event) => (
                    <div key={event} className="flex items-center justify-between py-2">
                      <span className="text-sm">{event}</span>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <span className="text-xs text-muted-foreground">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch defaultChecked />
                          <span className="text-xs text-muted-foreground">SMS</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>Third-Party Integrations</CardTitle>
              </div>
              <CardDescription>Configure external service integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center text-primary-foreground font-bold">
                      M
                    </div>
                    <div>
                      <h4 className="font-medium">M-Pesa Integration</h4>
                      <p className="text-sm text-muted-foreground">Safaricom M-Pesa API</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Consumer Key</Label>
                    <Input type="password" defaultValue="••••••••••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumer Secret</Label>
                    <Input type="password" defaultValue="••••••••••••••••" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-primary-foreground font-bold">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">Email Service</h4>
                      <p className="text-sm text-muted-foreground">SMTP Configuration</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input defaultValue="smtp.bebasacco.co.ke" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input defaultValue="587" />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input defaultValue="noreply@bebasacco.co.ke" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" defaultValue="••••••••••••••••" />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border opacity-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">Core Banking Integration</h4>
                      <p className="text-sm text-muted-foreground">Not configured</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
