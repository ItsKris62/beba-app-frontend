'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Check, CheckCircle2, Copy, RefreshCw, Search, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import { applicationsApi, stagesApi } from '@/lib/locations-api';
import { LocationSelector } from '@/components/location-selector';
import { useAuth } from '@/lib/auth-context';

const PAGE_SIZE = 20;
const ALLOWED_ROLES = ['TENANT_ADMIN', 'MANAGER', 'SUPER_ADMIN'];

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const applicationSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  idNumber: z
    .string()
    .regex(/^\d{7,8}$/, 'National ID must be 7 or 8 digits'),
  phoneNumber: z
    .string()
    .regex(/^(254|0)\d{9}$/, 'Phone must be 07xxxxxxxxx or 2547xxxxxxxxx'),
  stageId: z.string().min(1, 'Stage is required'),
  // Mirrors the Prisma StagePosition enum (backend/src/prisma/schema.prisma) —
  // MemberApplication.position, Stage/StageAssignment.position all share it.
  position: z.enum(['CHAIRMAN', 'SECRETARY', 'TREASURER', 'MEMBER']).default('MEMBER'),
  wardId: z.string().min(1, 'Ward is required'),
  documentUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
    PENDING_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <Badge variant="outline" className={map[status] ?? 'bg-gray-100 text-gray-800'}>
      {status.split('_').join(' ')}
    </Badge>
  );
}

function CopyButton({
  value,
  field,
  copiedField,
  onCopy,
}: {
  value: string;
  field: string;
  copiedField: string | null;
  onCopy: (value: string, field: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground"
      onClick={() => onCopy(value, field)}
      title="Copy"
    >
      {copiedField === field ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─── Member Credentials Modal ─────────────────────────────────────────────────

interface MemberCredentials {
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  smsEnqueued: boolean;
}

function MemberCredentialsModal({
  credentials,
  onClose,
}: {
  credentials: MemberCredentials | null;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <Dialog open={!!credentials} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
            Member Account Created
          </DialogTitle>
          {credentials && (
            <DialogDescription>
              {credentials.smsEnqueued
                ? 'A temporary password has been queued for SMS delivery to '
                : 'SMS queue failed to send a temporary password to '}
              <strong>{credentials.firstName} {credentials.lastName}</strong>. They must change
              their password on first login.
            </DialogDescription>
          )}
        </DialogHeader>

        {credentials && (
          <>
            <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Member Number</Label>
                  <p className="font-mono text-sm font-semibold">{credentials.memberNumber}</p>
                </div>
                <CopyButton value={credentials.memberNumber} field="memberNumber" copiedField={copiedField} onCopy={copy} />
              </div>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Login Email</Label>
                  <p className="truncate font-mono text-sm font-medium">{credentials.email}</p>
                </div>
                <CopyButton value={credentials.email} field="email" copiedField={copiedField} onCopy={copy} />
              </div>
            </div>

            {!credentials.smsEnqueued && (
              <p className="text-xs text-muted-foreground">
                A Tenant Admin can retrieve the temporary password from this member&rsquo;s row menu on the Members page.
              </p>
            )}
          </>
        )}

        <DialogFooter>
          <Button className="w-full bg-green-600 text-white hover:bg-green-700" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Approve/Reject Modal ─────────────────────────────────────────────────────

interface ReviewModalProps {
  application: Record<string, unknown> | null;
  onClose: () => void;
  onApprove: (id: string, email?: string, notes?: string) => void;
  onReject: (id: string, notes: string) => void;
  isLoading: boolean;
}

function ReviewModal({ application, onClose, onApprove, onReject, isLoading }: ReviewModalProps) {
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setAction(null);
      setEmail('');
      setNotes('');
      onClose();
    }
  };

  const id = (application?.id as string) ?? '';

  return (
    <Dialog open={!!application} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Review Application {application ? `– ${application.firstName as string} ${application.lastName as string}` : ''}
          </DialogTitle>
          <DialogDescription>
            {application?.stageName as string} {application && <StatusBadge status={application.status as string} />}
          </DialogDescription>
        </DialogHeader>

        {application && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">ID Number</Label>
              <p className="mt-0.5 font-mono">{application.idNumber as string}</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Phone</Label>
              <p className="mt-0.5">{application.phoneNumber as string}</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Stage</Label>
              <p className="mt-0.5">{application.stageName as string}</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Position</Label>
              <p className="mt-0.5">{application.position as string}</p>
            </div>
            {!!application.documentUrl && (
              <div className="col-span-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">KYC Document</Label>
                <p className="mt-0.5">
                  <a
                    href={application.documentUrl as string}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    View Document
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {action === 'approve' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reviewEmail">Email (optional – auto-generated if blank)</Label>
              <Input
                id="reviewEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewApproveNotes">Notes (optional)</Label>
              <Textarea
                id="reviewApproveNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        {action === 'reject' && (
          <div className="space-y-1.5">
            <Label htmlFor="reviewRejectNotes">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reviewRejectNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Explain why this application is being rejected…"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          {!action && application ? (
            <>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setAction('reject')}
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
              <Button
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={() => setAction('approve')}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Approve
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setAction(null)} disabled={isLoading}>
                Back
              </Button>
              {action === 'approve' && (
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => onApprove(id, email || undefined, notes || undefined)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing…' : 'Confirm Approval'}
                </Button>
              )}
              {action === 'reject' && (
                <Button
                  variant="destructive"
                  onClick={() => notes.trim() && onReject(id, notes)}
                  disabled={isLoading || !notes.trim()}
                >
                  {isLoading ? 'Processing…' : 'Confirm Rejection'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Record<string, unknown> | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [memberCredentials, setMemberCredentials] = useState<MemberCredentials | null>(null);
  // Bumped on reset so <LocationSelector> (which owns its own county/constituency/ward
  // state internally) remounts clean instead of holding stale selections.
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (user && !ALLOWED_ROLES.includes(user.role)) {
      router.replace('/admin/dashboard');
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { position: 'MEMBER' },
  });

  const resetForm = useCallback(() => {
    reset();
    setFormKey((k) => k + 1);
  }, [reset]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['applications', 'pending', page, statusFilter, search],
    queryFn: () =>
      applicationsApi.getPending({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
      }),
  });

  // Stage picker is scoped to the selected ward — stages aren't a tenant-wide flat
  // list, so we only fetch once a ward is chosen and refetch whenever it changes.
  // react-hook-form's watch() is a known react-compiler incompatible-library case
  // (its return value can't be safely memoized) — acknowledged, not a bug here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedWardId = watch('wardId');
  const { data: stagesData, isLoading: stagesLoading } = useQuery({
    queryKey: ['stages', 'by-ward', selectedWardId],
    queryFn: () => stagesApi.list({ wardId: selectedWardId, limit: 100 }),
    enabled: !!selectedWardId,
  });
  const stages = stagesData?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: (data: ApplicationFormData) => applicationsApi.submit(data as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Application submitted successfully');
      resetForm();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submission failed';
      toast.error(msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, email, notes }: { id: string; email?: string; notes?: string }) =>
      applicationsApi.approve(id, { email, reviewNotes: notes }),
    onSuccess: (data) => {
      setSelectedApp(null);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setMemberCredentials({
        memberNumber: data.member?.memberNumber ?? '',
        firstName: data.user?.firstName ?? '',
        lastName: data.user?.lastName ?? '',
        email: data.user?.email ?? '',
        smsEnqueued: data.smsEnqueued ?? false,
      });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Approval failed';
      toast.error(msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      applicationsApi.reject(id, notes),
    onSuccess: () => {
      toast.success('Application rejected');
      setSelectedApp(null);
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Rejection failed';
      toast.error(msg);
    },
  });

  const handleWardChange = useCallback(
    (wardId: string) => {
      setValue('wardId', wardId, { shouldValidate: true });
      // Previously-selected stage almost certainly doesn't belong to the new ward.
      setValue('stageId', '', { shouldValidate: false });
    },
    [setValue],
  );

  const handleCancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
  }

  const applications: Record<string, unknown>[] = (queueData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const meta = (queueData as { meta?: { total: number; totalPages: number } })?.meta;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Member Applications</h1>
          <p className="text-muted-foreground">
            Review and approve member onboarding applications. This application status (Submitted /
            Pending Review / Approved / Rejected) is separate from the member&rsquo;s later KYC
            document review status, tracked on the{' '}
            <Link href="/admin/members/pending" className="underline">KYC Queue</Link> once they&rsquo;re approved here.
          </p>
        </div>
        <Button
          variant={showForm ? 'outline' : 'default'}
          size="sm"
          onClick={() => (showForm ? handleCancelForm() : setShowForm(true))}
        >
          {showForm ? (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </>
          ) : (
            '+ New Application'
          )}
        </Button>
      </div>

      {/* Submit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Member Application</CardTitle>
            <CardDescription>Staff submits a physical/digital KYC form on behalf of a prospective member.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => submitMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input id="firstName" {...register('firstName')} />
                  {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input id="lastName" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="idNumber">
                    National ID <span className="text-red-500">*</span>
                  </Label>
                  <Input id="idNumber" {...register('idNumber')} placeholder="12345678" maxLength={8} />
                  {errors.idNumber && <p className="text-xs text-red-600">{errors.idNumber.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input id="phoneNumber" {...register('phoneNumber')} placeholder="0712345678" />
                  {errors.phoneNumber && <p className="text-xs text-red-600">{errors.phoneNumber.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Position</Label>
                  <Select
                    value={watch('position')}
                    onValueChange={(value) =>
                      setValue('position', value as ApplicationFormData['position'], { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="CHAIRMAN">Chairman</SelectItem>
                      <SelectItem value="SECRETARY">Secretary</SelectItem>
                      <SelectItem value="TREASURER">Treasurer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location Selector */}
              <div>
                <p className="mb-2 text-sm font-medium">Location</p>
                <LocationSelector key={formKey} onWardChange={handleWardChange} />
                {errors.wardId && <p className="mt-1 text-xs text-red-600">{errors.wardId.message}</p>}
              </div>

              {/* Stage — scoped to the selected ward above */}
              <div className="space-y-1.5">
                <Label>
                  Stage <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('stageId') || undefined}
                  onValueChange={(value) => setValue('stageId', value, { shouldValidate: true })}
                  disabled={!selectedWardId || stagesLoading}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue
                      placeholder={
                        !selectedWardId
                          ? 'Select a ward first'
                          : stagesLoading
                            ? 'Loading stages…'
                            : stages.length === 0
                              ? 'No stages registered for this ward'
                              : 'Select stage'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.stageId && <p className="text-xs text-red-600">{errors.stageId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="documentUrl">KYC Document URL (optional)</Label>
                <Input
                  id="documentUrl"
                  {...register('documentUrl')}
                  placeholder="https://minio.example.com/kyc/form.pdf"
                />
                {errors.documentUrl && <p className="text-xs text-red-600">{errors.documentUrl.message}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancelForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? 'Submitting…' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {statusFilter === 'ALL'
              ? 'All applications awaiting or already reviewed.'
              : `Applications with status ${statusFilter.split('_').join(' ')}.`}
          </CardDescription>
          <form onSubmit={handleSearchSubmit} className="mt-2 flex flex-wrap gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID number, or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as typeof statusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline" size="sm">
              Search
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['applications'] })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {queueLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
              <p className="font-medium">No applications found</p>
              <p className="text-sm text-muted-foreground">Nothing matches the selected filters.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const ward = app.ward as { name?: string; constituency?: { name?: string; county?: { name?: string } } } | undefined;
                    return (
                      <TableRow key={app.id as string} className="cursor-pointer" onClick={() => setSelectedApp(app)}>
                        <TableCell className="font-medium">
                          {app.firstName as string} {app.lastName as string}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{app.idNumber as string}</TableCell>
                        <TableCell className="text-muted-foreground">{app.phoneNumber as string}</TableCell>
                        <TableCell className="text-muted-foreground">{app.stageName as string}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ward?.name}, {ward?.constituency?.name}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={app.status as string} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(app.createdAt as string).toLocaleDateString('en-KE')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {meta.totalPages} - {meta.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <ReviewModal
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onApprove={(id, email, notes) => approveMutation.mutate({ id, email, notes })}
        onReject={(id, notes) => rejectMutation.mutate({ id, notes })}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
      />

      {/* Member Credentials Modal — shown after successful approval */}
      <MemberCredentialsModal
        credentials={memberCredentials}
        onClose={() => setMemberCredentials(null)}
      />
    </div>
  );
}
