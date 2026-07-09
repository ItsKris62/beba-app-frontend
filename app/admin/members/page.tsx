'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Users, Search, RefreshCw, Download, UserPlus, Upload,
  Eye, MoreHorizontal, CheckCircle, XCircle, Loader2, X,
  AlertCircle, Check, ChevronsUpDown, MapPin, KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { adminApi, stagesAdminApi, usersApi, type AdminMember, type AdminStage } from '@/lib/api-client';
import { applicationsApi } from '@/lib/locations-api';
import { EditMemberModal } from './edit-member-modal';
import { RevealTempPasswordModal } from '@/components/RevealTempPasswordModal';
import { useAuth, isAdmin, canRevealTempPassword } from '@/lib/auth-context';

const ADMIN_MEMBERS_STALE_TIME_MS = 20_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
    : <Badge variant="secondary"><XCircle className="mr-1 h-3 w-3" />Inactive</Badge>;
}

// ─── Stage Combobox ───────────────────────────────────────────────────────────

function StageCombobox({
  value,
  onChange,
  stages,
  loading,
}: {
  value: string;
  onChange: (id: string) => void;
  stages: AdminStage[];
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = stages.find(s => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className={cn(
            'w-full justify-between font-normal bg-background px-3 py-2 text-sm text-left h-auto min-h-[40px]',
            !value && 'text-muted-foreground',
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading stages…
            </span>
          ) : selected ? (
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{selected.name}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {selected.ward.name} · {selected.ward.constituency.name} · {selected.ward.constituency.county.name}
              </span>
            </span>
          ) : (
            'Select Stage…'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 self-start mt-1" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[480px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by stage name, ward, or county…" />
          <CommandList className="max-h-64">
            {stages.length === 0 ? (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <MapPin className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No stages registered yet</p>
                  <p className="text-xs text-muted-foreground">
                    Go to Stages Management to add stages first.
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandEmpty>No matching stage found.</CommandEmpty>
            )}
            <CommandGroup>
              {stages.map(s => (
                <CommandItem
                  key={s.id}
                  // Include all location fields so the search works on county/ward too.
                  value={`${s.name} ${s.ward.name} ${s.ward.constituency.name} ${s.ward.constituency.county.name}`}
                  onSelect={() => {
                    onChange(s.id === value ? '' : s.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0 self-start mt-0.5',
                      value === s.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.ward.name} · {s.ward.constituency.name} · {s.ward.constituency.county.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Create Member Modal ──────────────────────────────────────────────────────

const STAGE_POSITIONS = new Set(['MEMBER', 'CHAIRMAN']);
function isStagePos(pos: string) { return STAGE_POSITIONS.has(pos); }

interface CreateMemberForm {
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber: string;
  email: string;
  stageId: string;
  position: string;
}

const EMPTY_FORM: CreateMemberForm = {
  firstName: '',
  lastName: '',
  idNumber: '',
  phoneNumber: '',
  email: '',
  stageId: '',
  position: 'MEMBER',
};

const KENYA_PHONE_REGEX = /^(?:\+?254|0)(7\d{8}|1\d{8})$/;

type SuccessState =
  | { type: 'member'; memberNumber: string; smsEnqueued: boolean }
  | { type: 'staff'; firstName: string; lastName: string; role: string; smsEnqueued: boolean };

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
  const [stages, setStages] = useState<AdminStage[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const submittedRef = useRef(false);

  // Load all tenant stages once when the modal opens.
  useEffect(() => {
    if (!open) return;
    setStagesError(null);
    setLoadingStages(true);

    stagesAdminApi.list({ limit: 100 })
      .then(res => {
        if (!res.success) {
          setStagesError(res.error?.message ?? 'Failed to load stages');
          return;
        }
        // Backend returns { data: Stage[], meta } — apiFetch wraps it in ApiResponse,
        // so res.data is { data: Stage[], meta }.
        const arr: AdminStage[] = (res.data as { data?: AdminStage[] })?.data ?? [];
        setStages(arr);
        if (arr.length === 0) {
          setStagesError('No stages registered yet. Add stages in Stages Management first.');
        }
      })
      .catch((err: unknown) => {
        setStagesError((err as { message?: string })?.message ?? 'Failed to load stages');
        setStages([]);
      })
      .finally(() => setLoadingStages(false));
  }, [open]);

  const set = (field: keyof CreateMemberForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm(f => {
        const next = { ...f, [field]: value };
        // When switching away from a stage position, clear the field that doesn't apply
        if (field === 'position' && !isStagePos(value) && isStagePos(f.position)) {
          next.stageId = '';
        }
        return next;
      });
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittedRef.current) return;
    setError(null);

    if (!form.phoneNumber.trim()) {
      setError('Phone Number is required — the temporary password is sent to this number');
      return;
    }
    if (!KENYA_PHONE_REGEX.test(form.phoneNumber.trim())) {
      setError('Phone must be a valid Kenyan number (e.g. 0712345678 or 2547XXXXXXXX)');
      return;
    }

    if (isStagePos(form.position)) {
      if (!form.idNumber.trim()) {
        setError('ID Number is required');
        return;
      }
      if (!/^\d{7,8}$/.test(form.idNumber.trim())) {
        setError('ID Number must be 7 or 8 digits (e.g. 31081907)');
        return;
      }
      if (!form.stageId) {
        setError('Please select a stage');
        return;
      }
    }

    submittedRef.current = true;
    setLoading(true);

    try {
      if (isStagePos(form.position)) {
        // ── Member / Chairman: application → approve flow ──────────────────────
        let appId: string;

        try {
          const app = await applicationsApi.submit({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            idNumber: form.idNumber.trim(),
            phoneNumber: form.phoneNumber.trim(),
            stageId: form.stageId,
            position: form.position,
          });
          appId = app.id;
        } catch (submitErr: unknown) {
          const submitMsg = (submitErr as { message?: string })?.message ?? '';
          if (
            submitMsg.toLowerCase().includes('already exists') &&
            (submitMsg.toLowerCase().includes('submitted') || submitMsg.toLowerCase().includes('pending'))
          ) {
            const pending = await applicationsApi.getPending({ limit: 100 });
            const existing = pending.data.find(
              a => a.idNumber === form.idNumber.trim() &&
                (a.status === 'SUBMITTED' || a.status === 'PENDING_REVIEW'),
            );
            if (existing) {
              appId = existing.id;
            } else {
              throw submitErr;
            }
          } else {
            throw submitErr;
          }
        }

        const result = await applicationsApi.approve(appId, {
          email: form.email.trim() || undefined,
        });

        setSuccess({
          type: 'member',
          memberNumber: result.member.memberNumber,
          smsEnqueued: result.smsEnqueued,
        });
      } else {
        // ── Staff roles: direct user creation ─────────────────────────────────
        if (!form.email.trim()) { setError('Email is required for staff accounts'); submittedRef.current = false; setLoading(false); return; }

        const staffResult = await usersApi.create({
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phoneNumber.trim(),
          role: form.position,
        });

        if (!staffResult.success || !staffResult.data) {
          throw new Error(staffResult.error?.message ?? 'Failed to create user');
        }

        setSuccess({
          type: 'staff',
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          role: form.position,
          smsEnqueued: staffResult.data.smsEnqueued,
        });
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to create user';
      setError(msg);
      submittedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setSuccess(null);
    setStages([]);
    setStagesError(null);
    submittedRef.current = false;
    onClose();
  };

  if (!open) return null;

  const stageMember = isStagePos(form.position);

  const ROLE_LABELS: Record<string, string> = {
    TENANT_ADMIN: 'Tenant Admin',
    MANAGER: 'Manager',
    TELLER: 'Teller',
    AUDITOR: 'Auditor',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Create New User</h2>
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
            {success.type === 'member' ? (
              <>
                <h3 className="text-lg font-semibold text-green-800">Member Created!</h3>
                <div className="rounded-lg bg-gray-50 p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Member Number</span>
                    <span className="font-mono font-semibold">{success.memberNumber}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {success.smsEnqueued
                    ? 'A temporary password has been queued for SMS delivery to the member.'
                    : 'SMS queue failed to send the temporary password.'}{' '}
                  They will be prompted to change it on first login.
                  {!success.smsEnqueued && ' A Tenant Admin can retrieve the temporary password from this member’s row menu.'}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-green-800">Account Created!</h3>
                <div className="rounded-lg bg-gray-50 p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="font-semibold">{success.firstName} {success.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Role</span>
                    <span className="font-semibold">{ROLE_LABELS[success.role] ?? success.role}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {success.smsEnqueued
                    ? 'A temporary password has been queued for SMS delivery to the user.'
                    : 'SMS queue failed to send the temporary password.'}{' '}
                  They will be prompted to change it on first login.
                </p>
              </>
            )}
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

            {/* Position — drives which fields are shown */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role / Position *</label>
              <select
                value={form.position}
                onChange={set('position')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <optgroup label="Stage Members">
                  <option value="MEMBER">Member</option>
                  <option value="CHAIRMAN">Chairman</option>
                </optgroup>
                <optgroup label="Staff">
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="TELLER">Teller</option>
                  <option value="AUDITOR">Auditor</option>
                </optgroup>
              </select>
            </div>

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

            {/* Phone — required for every role; the temp password is sent here via SMS */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
              <Input
                value={form.phoneNumber}
                onChange={set('phoneNumber')}
                placeholder="e.g. 0712345678"
                required
              />
              <p className="text-xs text-gray-400 mt-1">The temporary password is sent to this number via SMS.</p>
            </div>

            {stageMember ? (
              /* ── Member / Chairman fields ── */
              <>
                {/* ID Number */}
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

                {/* Email optional */}
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

                {/* Stage — searchable dropdown */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stage *</label>
                  {stagesError && !loadingStages && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {stagesError}
                    </div>
                  )}
                  <StageCombobox
                    value={form.stageId}
                    onChange={stageId => setForm(f => ({ ...f, stageId }))}
                    stages={stages}
                    loading={loadingStages}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Type to search by stage name, ward, or county
                  </p>
                </div>
              </>
            ) : (
              /* ── Staff fields ── */
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="staff@example.com"
                  required
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || (stageMember && (!form.stageId || loadingStages))}
              >
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                  : 'Create'}
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Gate the fetch itself (not just the rendered UI) — see the same note on
  // app/admin/dashboard/page.tsx for why the layout-level redirect alone
  // isn't sufficient here.
  const canViewMembers = isAdmin(user?.role);
  const canReveal = canRevealTempPassword(user?.role);

  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [revealMember, setRevealMember] = useState<AdminMember | null>(null);

  const membersQuery = useQuery({
    queryKey: ['admin-members', page, committedSearch],
    queryFn: () => adminApi.getMembers({ page, limit: 20, search: committedSearch || undefined }),
    enabled: canViewMembers,
    staleTime: ADMIN_MEMBERS_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });

  const membersPayload = membersQuery.data?.success ? membersQuery.data.data : undefined;
  const members = membersPayload?.data ?? [];
  const total = membersPayload?.meta?.total ?? 0;
  const totalPages = membersPayload?.meta?.totalPages ?? 1;
  const loading = canViewMembers && membersQuery.isLoading;

  const invalidateMembers = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['admin-members'] }),
    [queryClient],
  );

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setCommittedSearch(search);
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
          <Button variant="outline" size="sm" onClick={() => membersQuery.refetch()}>
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
            <UserPlus className="mr-2 h-4 w-4" /> Create User
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
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
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
            <div className="overflow-x-auto">
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
                          <DropdownMenuItem onClick={() => { setSelectedMember(m); setShowEdit(true); }}>
                            <Users className="mr-2 h-4 w-4" /> Edit Profile
                          </DropdownMenuItem>
                          {canReveal && (
                            <DropdownMenuItem onClick={() => setRevealMember(m)}>
                              <KeyRound className="mr-2 h-4 w-4" /> Reveal Temp Password
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
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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
        onSuccess={() => { setPage(1); void invalidateMembers(); }}
      />

      {/* ── Edit Member Modal ── */}
      <EditMemberModal
        open={showEdit}
        member={selectedMember}
        onClose={() => { setShowEdit(false); setSelectedMember(null); }}
        onSuccess={() => { void invalidateMembers(); setShowEdit(false); setSelectedMember(null); }}
      />

      {/* ── Reveal Temp Password Modal ── */}
      <RevealTempPasswordModal
        target={revealMember ? {
          userId: revealMember.user.id,
          name: `${revealMember.user.firstName} ${revealMember.user.lastName}`,
          detail: revealMember.memberNumber,
        } : null}
        onClose={() => setRevealMember(null)}
      />
    </div>
  );
}
