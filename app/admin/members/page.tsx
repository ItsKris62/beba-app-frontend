'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Search, RefreshCw, Download, UserPlus, Upload,
  Eye, MoreHorizontal, CheckCircle, XCircle, Loader2, X, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { adminApi, type AdminMember } from '@/lib/api-client';
import {
  locationsApi, stagesApi, applicationsApi,
  type County, type Constituency, type Ward, type Stage,
} from '@/lib/locations-api';

// ─── Create Member Form ───────────────────────────────────────────────────────

interface CreateMemberForm {
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  stageId: string;       // selected stage id (from dropdown)
  stageNameCustom: string; // fallback free-text if no stages loaded
  position: string;
  countyId: string;
  constituencyId: string;
  wardId: string;
}

const EMPTY_FORM: CreateMemberForm = {
  firstName: '',
  lastName: '',
  idNumber: '',
  phoneNumber: '',
  email: '',
  stageId: '',
  stageNameCustom: '',
  position: 'MEMBER',
  countyId: '',
  constituencyId: '',
  wardId: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
    : <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Inactive</Badge>;
}

// ─── Create Member Modal ──────────────────────────────────────────────────────

function CreateMemberModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateMemberForm>(EMPTY_FORM);
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingStages, setLoadingStages] = useState(false);
  const [countiesError, setCountiesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ memberNumber: string; tempPassword: string } | null>(null);

  // Load counties on open
  useEffect(() => {
    if (!open) return;
    setLoadingCounties(true);
    setCountiesError(null);
    locationsApi.getCounties()
      .then(data => {
        setCounties(data);
        if (data.length === 0) setCountiesError('No counties found. Please ensure location data is seeded.');
      })
      .catch((err: unknown) => {
        const msg = (err as { message?: string })?.message ?? 'Failed to load counties';
        setCountiesError(msg);
      })
      .finally(() => setLoadingCounties(false));
  }, [open]);

  // Load constituencies when county changes
  useEffect(() => {
    if (!form.countyId) {
      setConstituencies([]);
      setWards([]);
      setStages([]);
      return;
    }
    setLoadingConstituencies(true);
    locationsApi.getConstituencies(form.countyId)
      .then(setConstituencies)
      .catch(() => setConstituencies([]))
      .finally(() => setLoadingConstituencies(false));
    setForm(f => ({ ...f, constituencyId: '', wardId: '', stageId: '' }));
    setWards([]);
    setStages([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.countyId]);

  // Load wards when constituency changes
  useEffect(() => {
    if (!form.constituencyId) {
      setWards([]);
      setStages([]);
      return;
    }
    setLoadingWards(true);
    locationsApi.getWards(form.constituencyId)
      .then(setWards)
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
    setForm(f => ({ ...f, wardId: '', stageId: '' }));
    setStages([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.constituencyId]);

  // Load stages when ward changes
  useEffect(() => {
    if (!form.wardId) {
      setStages([]);
      return;
    }
    setLoadingStages(true);
    stagesApi.list({ wardId: form.wardId, limit: 100 })
      .then(res => setStages(res.data))
      .catch(() => setStages([]))
      .finally(() => setLoadingStages(false));
    setForm(f => ({ ...f, stageId: '' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.wardId]);

  const set = (field: keyof CreateMemberForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.wardId) { setError('Please select a ward'); return; }

    // Determine stage name: use selected stage name or custom text
    const stageName = form.stageId
      ? (stages.find(s => s.id === form.stageId)?.name ?? (form.stageNameCustom.trim() || 'UNASSIGNED'))
      : (form.stageNameCustom.trim() || 'UNASSIGNED');

    setLoading(true);
    try {
      // Step 1: Submit application
      const app = await applicationsApi.submit({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        idNumber: form.idNumber.trim(),
        phoneNumber: form.phoneNumber.trim(),
        stageName,
        position: form.position,
        wardId: form.wardId,
      });

      // Step 2: Immediately approve (admin-created members skip review queue)
      const result = await applicationsApi.approve(app.id, {
        email: form.email.trim() || undefined,
      });

      setSuccess({
        memberNumber: result.member.memberNumber,
        tempPassword: result.temporaryPassword,
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to create member';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
    setCounties([]);
    setConstituencies([]);
    setWards([]);
    setStages([]);
    setCountiesError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Create New Member</h2>
          <button onClick={handleClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          /* ── Success state ── */
          <div className="px-6 py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-800">Member Created!</h3>
            <div className="rounded-lg bg-gray-50 p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Member Number</span>
                <span className="font-mono font-semibold">{success.memberNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Temp Password</span>
                <span className="font-mono font-semibold text-orange-600">{success.tempPassword}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Share the temporary password with the member. They will be prompted to change it on first login.
            </p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                <Input value={form.firstName} onChange={set('firstName')} placeholder="e.g. John" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                <Input value={form.lastName} onChange={set('lastName')} placeholder="e.g. Odhiambo" required />
              </div>
            </div>

            {/* ID + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ID Number *</label>
                <Input
                  value={form.idNumber}
                  onChange={set('idNumber')}
                  placeholder="e.g. 31081907"
                  required
                  pattern="\d{7,8}"
                  title="7 or 8 digit national ID"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                <Input
                  value={form.phoneNumber}
                  onChange={set('phoneNumber')}
                  placeholder="e.g. 0712345678"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email (optional)</label>
              <Input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="member@example.com"
              />
              <p className="text-xs text-gray-400 mt-1">If blank, a system email will be generated</p>
            </div>

            {/* Position */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <select
                value={form.position}
                onChange={set('position')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="MEMBER">Member</option>
                <option value="CHAIRMAN">Chairman</option>
                <option value="SECRETARY">Secretary</option>
                <option value="TREASURER">Treasurer</option>
              </select>
            </div>

            {/* Location cascade */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">Location *</label>

              {/* County */}
              <div>
                {countiesError && (
                  <div className="mb-1 flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    {countiesError}
                  </div>
                )}
                <select
                  value={form.countyId}
                  onChange={set('countyId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  required
                  disabled={loadingCounties}
                >
                  <option value="">
                    {loadingCounties ? 'Loading counties…' : counties.length === 0 ? 'No counties available' : 'Select County…'}
                  </option>
                  {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Constituency */}
              {form.countyId && (
                <select
                  value={form.constituencyId}
                  onChange={set('constituencyId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  required
                  disabled={loadingConstituencies}
                >
                  <option value="">
                    {loadingConstituencies ? 'Loading sub-counties…' : 'Select Sub-County / Constituency…'}
                  </option>
                  {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              {/* Ward */}
              {form.constituencyId && (
                <select
                  value={form.wardId}
                  onChange={set('wardId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  required
                  disabled={loadingWards}
                >
                  <option value="">
                    {loadingWards ? 'Loading wards…' : 'Select Ward…'}
                  </option>
                  {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              )}
            </div>

            {/* Stage Name */}
            {form.wardId && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stage Name</label>
                {loadingStages ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading stages…
                  </div>
                ) : stages.length > 0 ? (
                  <select
                    value={form.stageId}
                    onChange={set('stageId')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select Stage (optional)…</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <div className="space-y-1">
                    <Input
                      value={form.stageNameCustom}
                      onChange={set('stageNameCustom')}
                      placeholder="e.g. KIBOS GALYNES (no stages in this ward yet)"
                    />
                    <p className="text-xs text-gray-400">No stages registered for this ward. You can type a stage name or leave blank.</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !form.wardId}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                  : 'Create Member'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  const loadMembers = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const res = await adminApi.getMembers({ page: p, limit: 20, search: q || undefined });
      if (res.success && res.data) {
        // adminApi.getMembers returns ApiResponse<{ data: AdminMember[]; meta: ApiMeta }>
        const payload = res.data as { data: AdminMember[]; meta: { total: number; totalPages: number } };
        setMembers(payload.data ?? []);
        setTotal(payload.meta?.total ?? 0);
        setTotalPages(payload.meta?.totalPages ?? 1);
      }
    } catch {
      // silent — user sees empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(1); }, [loadMembers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMembers(1, search);
  };

  const activeCount = members.filter(m => m.isActive).length;
  const inactiveCount = members.filter(m => !m.isActive).length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members Management</h1>
          <p className="text-muted-foreground">View and manage all SACCO members</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => loadMembers(page, search)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/import/upload')}
          >
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Create Member
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{inactiveCount}</div>
            <p className="text-xs text-muted-foreground">Inactive accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search ── */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, ID, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Users className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No members found</p>
              <p className="text-sm text-muted-foreground">Create a member manually or import from CSV</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Create Member
                </Button>
                <Button size="sm" variant="outline" onClick={() => router.push('/admin/import/upload')}>
                  <Upload className="mr-2 h-4 w-4" /> Import CSV
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>National ID</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm font-medium">{m.memberNumber}</TableCell>
                    <TableCell className="font-medium">
                      {m.user.firstName} {m.user.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.nationalId ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.user.phone ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[180px] truncate">
                      {m.user.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={m.isActive} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.joinedAt).toLocaleDateString('en-KE')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/members/${m.id}`)}>
                            <Eye className="mr-2 h-4 w-4" /> View Profile
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} members
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); loadMembers(p, search); }}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => { const p = page + 1; setPage(p); loadMembers(p, search); }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Create Member Modal ── */}
      <CreateMemberModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { setPage(1); loadMembers(1, search); }}
      />
    </div>
  );
}
