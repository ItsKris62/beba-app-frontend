"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, MoreHorizontal, Download, Filter, Users, UserCheck, UserX, Eye, Edit, Mail, Phone, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { adminApi, formatCurrency, formatDate, type AdminMember } from "@/lib/api-client"
import { useAuth, canWrite } from "@/lib/auth-context"

export default function AdminMembers() {
  const { user } = useAuth()
  const canEdit = canWrite(user?.role)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isKycDialogOpen, setIsKycDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null)
  const [viewTab, setViewTab] = useState("overview")
  const [members, setMembers] = useState<AdminMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [kycData, setKycData] = useState({ nationalId: "", kraPin: "", employer: "", occupation: "", phone: "" })
  const [isSavingKyc, setIsSavingKyc] = useState(false)

  const loadMembers = async (p = 1) => {
    setIsLoading(true)
    const res = await adminApi.getMembers({
      search: searchQuery || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      page: p,
      limit: 20,
    })
    if (res.success && res.data) {
      setMembers(res.data.data ?? [])
      setTotal(res.data.meta?.total ?? 0)
      setPage(p)
    } else {
      toast.error(res.error?.message ?? "Failed to load members")
    }
    setIsLoading(false)
  }

  useEffect(() => { loadMembers(1) }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadMembers(1)
  }

  const handleViewMember = (member: AdminMember) => {
    setSelectedMember(member)
    setViewTab("overview")
    setIsViewDialogOpen(true)
  }

  const handleOpenKyc = (member: AdminMember) => {
    setSelectedMember(member)
    setKycData({
      nationalId: member.nationalId ?? "",
      kraPin: member.kraPin ?? "",
      employer: member.employer ?? "",
      occupation: member.occupation ?? "",
      phone: member.user.phone ?? "",
    })
    setIsKycDialogOpen(true)
  }

  const handleSaveKyc = async () => {
    if (!selectedMember) return
    setIsSavingKyc(true)
    const res = await adminApi.updateKyc(selectedMember.id, kycData)
    if (res.success) {
      toast.success("KYC updated successfully")
      setIsKycDialogOpen(false)
      loadMembers(page)
    } else {
      toast.error(res.error?.message ?? "Failed to update KYC")
    }
    setIsSavingKyc(false)
  }

  const activeCount = members.filter((m) => m.isActive).length
  const inactiveCount = members.filter((m) => !m.isActive).length
  const totalPages = Math.ceil(total / 20)

  const getInitials = (m: AdminMember) =>
    `${m.user.firstName[0] ?? ""}${m.user.lastName[0] ?? ""}`.toUpperCase()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members Management</h1>
          <p className="text-muted-foreground">View and manage all SACCO members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadMembers(page)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Members</CardTitle>
              <CardDescription>A list of all registered SACCO members</CardDescription>
            </div>
            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  className="pl-8 w-full sm:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-full sm:w-36">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" size="sm">Search</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : members.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No members found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Member No.</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Loans</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                {getInitials(member)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {member.user.firstName} {member.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{member.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            {member.user.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {member.user.phone}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{member.user.role}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{member.memberNumber}</TableCell>
                        <TableCell className="text-sm">{formatDate(member.joinedAt)}</TableCell>
                        <TableCell>
                          <Badge variant={member.isActive ? "default" : "secondary"}>
                            {member.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{member._count.loans}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleViewMember(member)}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleOpenKyc(member)}>
                                  <Edit className="mr-2 h-4 w-4" /> Update KYC
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} total</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadMembers(page - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadMembers(page + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Member Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Profile</DialogTitle>
            <DialogDescription>
              {selectedMember?.memberNumber} — {selectedMember?.user.firstName} {selectedMember?.user.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <Tabs value={viewTab} onValueChange={setViewTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="kyc">KYC Details</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                      {getInitials(selectedMember)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedMember.user.firstName} {selectedMember.user.lastName}</h3>
                    <p className="text-muted-foreground">{selectedMember.memberNumber}</p>
                    <Badge variant={selectedMember.isActive ? "default" : "secondary"} className="mt-1">
                      {selectedMember.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{selectedMember.user.email}</p></div>
                  <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{selectedMember.user.phone ?? "—"}</p></div>
                  <div><Label className="text-muted-foreground">Role</Label><p className="font-medium">{selectedMember.user.role}</p></div>
                  <div><Label className="text-muted-foreground">Joined</Label><p className="font-medium">{formatDate(selectedMember.joinedAt)}</p></div>
                  <div><Label className="text-muted-foreground">Loans</Label><p className="font-medium">{selectedMember._count.loans}</p></div>
                  <div><Label className="text-muted-foreground">Accounts</Label><p className="font-medium">{selectedMember._count.accounts}</p></div>
                </div>
              </TabsContent>
              <TabsContent value="kyc" className="space-y-3 mt-4 text-sm">
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label className="text-muted-foreground">National ID</Label><p className="font-medium">{selectedMember.nationalId ?? "—"}</p></div>
                  <div><Label className="text-muted-foreground">KRA PIN</Label><p className="font-medium">{selectedMember.kraPin ?? "—"}</p></div>
                  <div><Label className="text-muted-foreground">Employer</Label><p className="font-medium">{selectedMember.employer ?? "—"}</p></div>
                  <div><Label className="text-muted-foreground">Occupation</Label><p className="font-medium">{selectedMember.occupation ?? "—"}</p></div>
                  <div><Label className="text-muted-foreground">Date of Birth</Label><p className="font-medium">{selectedMember.dateOfBirth ? formatDate(selectedMember.dateOfBirth) : "—"}</p></div>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => { setIsViewDialogOpen(false); handleOpenKyc(selectedMember) }}>
                    <Edit className="mr-2 h-4 w-4" /> Update KYC
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KYC Update Dialog */}
      <Dialog open={isKycDialogOpen} onOpenChange={setIsKycDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Update KYC</DialogTitle>
            <DialogDescription>
              Update KYC details for {selectedMember?.user.firstName} {selectedMember?.user.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nationalId">National ID</Label>
                <Input id="nationalId" value={kycData.nationalId} onChange={(e) => setKycData({ ...kycData, nationalId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kraPin">KRA PIN</Label>
                <Input id="kraPin" value={kycData.kraPin} onChange={(e) => setKycData({ ...kycData, kraPin: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer">Employer</Label>
              <Input id="employer" value={kycData.employer} onChange={(e) => setKycData({ ...kycData, employer: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" value={kycData.occupation} onChange={(e) => setKycData({ ...kycData, occupation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kycPhone">Phone</Label>
              <Input id="kycPhone" value={kycData.phone} onChange={(e) => setKycData({ ...kycData, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKycDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveKyc} disabled={isSavingKyc}>
              {isSavingKyc ? "Saving…" : "Save KYC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
