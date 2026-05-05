"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search, MoreHorizontal, Plus, UserX, KeyRound, Users,
  Eye, EyeOff, Copy, Check, RefreshCw, ShieldCheck, CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { usersApi, formatDate, type StaffUser } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"

const ASSIGNABLE_ROLES: Record<string, { value: string; label: string }[]> = {
  SUPER_ADMIN: [
    { value: "TENANT_ADMIN", label: "Tenant Admin" },
    { value: "MANAGER", label: "Manager" },
    { value: "TELLER", label: "Teller" },
    { value: "AUDITOR", label: "Auditor" },
  ],
  TENANT_ADMIN: [
    { value: "TENANT_ADMIN", label: "Tenant Admin" },
    { value: "MANAGER", label: "Manager" },
    { value: "TELLER", label: "Teller" },
    { value: "AUDITOR", label: "Auditor" },
  ],
  MANAGER: [
    { value: "TELLER", label: "Teller" },
    { value: "AUDITOR", label: "Auditor" },
  ],
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  TENANT_ADMIN: "bg-blue-100 text-blue-800",
  MANAGER: "bg-green-100 text-green-800",
  TELLER: "bg-yellow-100 text-yellow-800",
  AUDITOR: "bg-gray-100 text-gray-800",
  MEMBER: "bg-slate-100 text-slate-800",
  CHAIRMAN: "bg-orange-100 text-orange-800",
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  TENANT_ADMIN: "Tenant Admin",
  MANAGER: "Manager",
  TELLER: "Teller",
  AUDITOR: "Auditor",
  MEMBER: "Member",
  CHAIRMAN: "Chairman",
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  REJECTED: "bg-gray-100 text-gray-800",
}

interface CreateForm {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: string
}

interface CreatedCredentials {
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
}

const EMPTY_FORM: CreateForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  role: "",
}

const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!"

function generateTempPassword(): string {
  return Array.from({ length: 12 }, () =>
    TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)],
  ).join("")
}

// ─── Credentials Dialog ───────────────────────────────────────────────────────

function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: CreatedCredentials | null
  onClose: () => void
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  if (!credentials) return null

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  return (
    <Dialog open={!!credentials} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <DialogTitle>Account Created Successfully</DialogTitle>
          </div>
          <DialogDescription>
            Share the credentials below with{" "}
            <strong>{credentials.firstName} {credentials.lastName}</strong>. They must change their
            password on first login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          <CredentialRow
            label="Name"
            value={`${credentials.firstName} ${credentials.lastName}`}
            fieldKey="name"
            copiedField={copiedField}
            onCopy={copy}
          />
          <CredentialRow
            label="Role"
            value={ROLE_LABELS[credentials.role] ?? credentials.role}
            fieldKey="role"
            copiedField={copiedField}
            onCopy={copy}
          />
          <CredentialRow
            label="Email (login)"
            value={credentials.email}
            fieldKey="email"
            copiedField={copiedField}
            onCopy={copy}
          />
          <CredentialRow
            label="Temporary Password"
            value={credentials.password}
            fieldKey="password"
            copiedField={copiedField}
            onCopy={copy}
            isPassword
          />
        </div>

        <p className="text-xs text-muted-foreground">
          This is the only time the password will be shown. Copy it before closing.
        </p>

        <DialogFooter>
          <Button onClick={onClose} className="w-full">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CredentialRow({
  label,
  value,
  fieldKey,
  copiedField,
  onCopy,
  isPassword = false,
}: {
  label: string
  value: string
  fieldKey: string
  copiedField: string | null
  onCopy: (v: string, k: string) => void
  isPassword?: boolean
}) {
  const [show, setShow] = useState(!isPassword)
  const copied = copiedField === fieldKey

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-medium">
          {isPassword && !show ? "••••••••••••" : value}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        {isPassword && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCopy(value, fieldKey)}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { user } = useAuth()
  const assignableRoles = ASSIGNABLE_ROLES[user?.role ?? ""] ?? []

  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [users, setUsers] = useState<StaffUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Partial<CreateForm>>({})
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)

  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "force-reset" | "approve"
    user: StaffUser
  } | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const loadUsers = async (p = 1) => {
    setIsLoading(true)
    const res = await usersApi.list({
      search: searchQuery || undefined,
      role: roleFilter || undefined,
      page: p,
      limit: 20,
    })
    if (res.success && res.data) {
      setUsers(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
      setPage(p)
    } else {
      toast.error(res.error?.message ?? "Failed to load users")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadUsers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, roleFilter])

  // ─── Create user ────────────────────────────────────────────────────────────

  function validateForm(): boolean {
    const errors: Partial<CreateForm> = {}
    if (!form.firstName.trim()) errors.firstName = "Required"
    if (!form.lastName.trim()) errors.lastName = "Required"
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errors.email = "Valid email required"
    if (!form.password || form.password.length < 8) errors.password = "Min 8 characters"
    if (!form.role) errors.role = "Required"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreate() {
    if (!validateForm()) return
    setIsSubmitting(true)
    const res = await usersApi.create({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
    })
    if (res.success) {
      setCreatedCredentials({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      })
      setIsCreateOpen(false)
      setForm(EMPTY_FORM)
      setFormErrors({})
      loadUsers(1)
    } else {
      toast.error(res.error?.message ?? "Failed to create user")
    }
    setIsSubmitting(false)
  }

  // ─── Confirm actions ─────────────────────────────────────────────────────────

  async function handleConfirmAction() {
    if (!confirmAction) return
    setIsConfirming(true)

    let res: { success: boolean; error?: { message: string } | null }

    if (confirmAction.type === "approve") {
      const r = await usersApi.approveUser(confirmAction.user.id)
      res = r
    } else if (confirmAction.type === "deactivate") {
      res = await usersApi.deactivate(confirmAction.user.id)
    } else {
      res = await usersApi.forcePasswordReset(confirmAction.user.id)
    }

    if (res.success) {
      const msg =
        confirmAction.type === "approve"
          ? `${confirmAction.user.firstName}'s account has been approved.`
          : confirmAction.type === "deactivate"
          ? `${confirmAction.user.firstName} has been deactivated.`
          : `Password reset forced for ${confirmAction.user.firstName}.`
      toast.success(msg)
      setConfirmAction(null)
      loadUsers(page)
    } else {
      toast.error(res.error?.message ?? "Action failed")
    }
    setIsConfirming(false)
  }

  const totalPages = Math.ceil(total / 20)
  const activeCount = users.filter((u) => u.isActive).length
  const pendingCount = users.filter((u) => u.status === "PENDING").length

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">All staff and member accounts in this tenant.</p>
        </div>
        {assignableRoles.length > 0 && (
          <Button
            onClick={() => {
              setForm({ ...EMPTY_FORM, password: generateTempPassword() })
              setShowPassword(false)
              setFormErrors({})
              setIsCreateOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === "ALL" ? "" : v); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Must Change PW</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.firstName} {u.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-800"}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-800"}`}>
                          {u.status ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "default" : "secondary"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.mustChangePassword && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {u.id !== user?.id && u.role !== "SUPER_ADMIN" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {u.status === "PENDING" && (
                                <DropdownMenuItem
                                  className="text-green-700"
                                  onClick={() => setConfirmAction({ type: "approve", user: u })}
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Approve Account
                                </DropdownMenuItem>
                              )}
                              {u.isActive && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setConfirmAction({ type: "deactivate", user: u })}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setConfirmAction({ type: "force-reset", user: u })}
                              >
                                <KeyRound className="mr-2 h-4 w-4" />
                                Force Password Reset
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} · {total} users
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadUsers(page - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadUsers(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(o) => { if (!isSubmitting) setIsCreateOpen(o) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Staff Account</DialogTitle>
            <DialogDescription>
              Creates a staff account (Admin, Manager, Teller, or Auditor). The temporary password
              is auto-generated — the user must change it on first login. To add a SACCO member,
              use <strong>Members Management → Create Member</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  className={formErrors.firstName ? "border-red-500" : ""}
                />
                {formErrors.firstName && <p className="text-xs text-red-500">{formErrors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  className={formErrors.lastName ? "border-red-500" : ""}
                />
                {formErrors.lastName && <p className="text-xs text-red-500">{formErrors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className={formErrors.password ? "border-red-500 pr-9" : "pr-9"}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate password"
                  onClick={() => {
                    setForm((f) => ({ ...f, password: generateTempPassword() }))
                    setShowPassword(true)
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              {formErrors.password && <p className="text-xs text-red-500">{formErrors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+254712345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger id="role" className={formErrors.role ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select role…" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-xs text-red-500">{formErrors.role}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog — shown after successful creation */}
      <CredentialsDialog
        credentials={createdCredentials}
        onClose={() => setCreatedCredentials(null)}
      />

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(o) => { if (!isConfirming && !o) setConfirmAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "approve"
                ? "Approve Account"
                : confirmAction?.type === "deactivate"
                ? "Deactivate User"
                : "Force Password Reset"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "approve"
                ? `This will approve ${confirmAction.user.firstName} ${confirmAction.user.lastName}'s account, allowing them to log in.`
                : confirmAction?.type === "deactivate"
                ? `This will immediately revoke all sessions for ${confirmAction?.user.firstName} ${confirmAction?.user.lastName} and mark their account inactive.`
                : `This will force ${confirmAction?.user.firstName} ${confirmAction?.user.lastName} to set a new password on next login and invalidate all current sessions.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={isConfirming}>
              Cancel
            </Button>
            <Button
              variant={confirmAction?.type === "deactivate" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={isConfirming}
            >
              {isConfirming ? "Processing…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
