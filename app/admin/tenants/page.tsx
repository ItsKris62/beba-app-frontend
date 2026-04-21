"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, RefreshCw, ShieldOff, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { tenantsApi, formatDate, type Tenant } from "@/lib/api-client"
import { useAuth, isSuperAdmin } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

export default function TenantsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmTenant, setConfirmTenant] = useState<{ tenant: Tenant; action: "suspend" | "activate" } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Guard: only SUPER_ADMIN should reach this page
  useEffect(() => {
    if (user && !isSuperAdmin(user.role)) {
      router.replace("/admin/dashboard")
    }
  }, [user, router])

  const loadTenants = async () => {
    setIsLoading(true)
    const res = await tenantsApi.list()
    if (res.success && res.data) {
      setTenants(Array.isArray(res.data) ? res.data : [])
    } else {
      toast.error(res.error?.message ?? "Failed to load tenants")
    }
    setIsLoading(false)
  }

  useEffect(() => { loadTenants() }, [])

  const handleConfirmAction = async () => {
    if (!confirmTenant) return
    setIsSubmitting(true)
    const { tenant, action } = confirmTenant
    const res = action === "suspend"
      ? await tenantsApi.suspend(tenant.id)
      : await tenantsApi.activate(tenant.id)
    if (res.success) {
      toast.success(`Tenant ${action === "suspend" ? "suspended" : "activated"} successfully`)
      setConfirmTenant(null)
      loadTenants()
    } else {
      toast.error(res.error?.message ?? "Action failed")
    }
    setIsSubmitting(false)
  }

  const activeTenants = tenants.filter(t => t.status === "ACTIVE").length
  const suspendedTenants = tenants.filter(t => t.status === "SUSPENDED").length

  if (user && !isSuperAdmin(user.role)) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">Manage all SACCO organisations on the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTenants}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeTenants}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <ShieldOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{suspendedTenants}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>All SACCO organisations registered on Beba</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No tenants found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{tenant.slug}</TableCell>
                      <TableCell>
                        <Badge variant={tenant.status === "ACTIVE" ? "default" : "destructive"}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(tenant.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {tenant.status === "ACTIVE" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setConfirmTenant({ tenant, action: "suspend" })}
                          >
                            <ShieldOff className="mr-2 h-3.5 w-3.5" /> Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                            onClick={() => setConfirmTenant({ tenant, action: "activate" })}
                          >
                            <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Activate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Action Dialog */}
      <Dialog open={!!confirmTenant} onOpenChange={(open) => { if (!open) setConfirmTenant(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTenant?.action === "suspend" ? "Suspend Tenant" : "Activate Tenant"}
            </DialogTitle>
            <DialogDescription>
              {confirmTenant?.action === "suspend"
                ? `Suspending "${confirmTenant.tenant.name}" will prevent all its users from logging in.`
                : `Activating "${confirmTenant?.tenant.name}" will restore access for all its users.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTenant(null)}>Cancel</Button>
            <Button
              variant={confirmTenant?.action === "suspend" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing…" : confirmTenant?.action === "suspend" ? "Suspend" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
