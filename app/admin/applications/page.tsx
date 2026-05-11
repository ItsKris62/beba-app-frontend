'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { applicationsApi } from '@/lib/locations-api';
import { LocationSelector } from '@/components/location-selector';
import { CheckCircle2, Copy, Check, Eye, EyeOff } from 'lucide-react';

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
  stageName: z.string().min(2, 'Stage name is required'),
  position: z.enum(['CHAIRMAN', 'SECRETARY', 'TREASURER', 'MEMBER']).default('MEMBER'),
  wardId: z.string().min(1, 'Ward is required'),
  documentUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

// ─── Member Credentials Modal ─────────────────────────────────────────────────

interface MemberCredentials {
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword: string;
}

function MemberCredentialsModal({
  credentials,
  onClose,
}: {
  credentials: MemberCredentials | null;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!credentials) return null;

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copy(value, field)}
      className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      title="Copy"
    >
      {copiedField === field
        ? <Check className="h-3.5 w-3.5 text-green-600" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <h2 className="text-lg font-semibold text-gray-900">Member Account Created</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Share the credentials below with{' '}
          <strong>{credentials.firstName} {credentials.lastName}</strong>. They must change
          their password on first login.
        </p>

        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
          {/* Member Number */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Member Number</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{credentials.memberNumber}</p>
            </div>
            <CopyBtn value={credentials.memberNumber} field="memberNumber" />
          </div>

          {/* Email */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Login Email</p>
              <p className="truncate font-mono text-sm font-medium text-gray-900">{credentials.email}</p>
            </div>
            <CopyBtn value={credentials.email} field="email" />
          </div>

          {/* Temporary Password */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Temporary Password</p>
              <p className="font-mono text-sm font-semibold text-gray-900">
                {showPassword ? credentials.temporaryPassword : '••••••••••••'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => setShowPassword((s) => !s)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <CopyBtn value={credentials.temporaryPassword} field="password" />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-4">
          This is the only time the temporary password will be shown. Copy it before closing.
        </p>

        <button
          onClick={onClose}
          className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-800',
    PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ')}
    </span>
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

  if (!application) return null;

  const id = application.id as string;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Review Application – {application.firstName as string} {application.lastName as string}
        </h2>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <p><span className="font-medium">ID Number:</span> {application.idNumber as string}</p>
          <p><span className="font-medium">Phone:</span> {application.phoneNumber as string}</p>
          <p><span className="font-medium">Stage:</span> {application.stageName as string}</p>
          <p><span className="font-medium">Position:</span> {application.position as string}</p>
          {!!application.documentUrl && (
            <p>
              <span className="font-medium">KYC Document:</span>{' '}
              <a href={application.documentUrl as string} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                View Document
              </a>
            </p>
          )}
        </div>

        {action === 'approve' && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional – auto-generated if blank)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {action === 'reject' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required
              placeholder="Explain why this application is being rejected…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          {!action && (
            <>
              <button
                onClick={() => setAction('reject')}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => setAction('approve')}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Approve
              </button>
            </>
          )}
          {action === 'approve' && (
            <button
              onClick={() => onApprove(id, email || undefined, notes || undefined)}
              disabled={isLoading}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Processing…' : 'Confirm Approval'}
            </button>
          )}
          {action === 'reject' && (
            <button
              onClick={() => notes.trim() && onReject(id, notes)}
              disabled={isLoading || !notes.trim()}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Processing…' : 'Confirm Rejection'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Record<string, unknown> | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [memberCredentials, setMemberCredentials] = useState<MemberCredentials | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ApplicationFormData>({ resolver: zodResolver(applicationSchema) });

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['applications', 'pending', page, statusFilter],
    queryFn: () => applicationsApi.getPending({ page, limit: 20, status: statusFilter || undefined }),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: (data: ApplicationFormData) => applicationsApi.submit(data as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Application submitted successfully');
      reset();
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
        temporaryPassword: data.temporaryPassword ?? '',
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
    (wardId: string) => setValue('wardId', wardId, { shouldValidate: true }),
    [setValue],
  );

  const applications: Record<string, unknown>[] = (queueData as unknown as { data?: Record<string, unknown>[] })?.data ?? [];
  const meta = (queueData as { meta?: { total: number; totalPages: number } })?.meta;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve member onboarding applications
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Application'}
        </button>
      </div>

      {/* Submit Form */}
      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Member Application</h2>
          <form onSubmit={handleSubmit((d) => submitMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('firstName')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('lastName')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  National ID <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('idNumber')}
                  placeholder="12345678"
                  maxLength={8}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {errors.idNumber && <p className="mt-1 text-xs text-red-600">{errors.idNumber.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('phoneNumber')}
                  placeholder="0712345678"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('stageName')}
                  placeholder="Westlands Stage"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {errors.stageName && <p className="mt-1 text-xs text-red-600">{errors.stageName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <select
                  {...register('position')}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="MEMBER">Member</option>
                  <option value="CHAIRMAN">Chairman</option>
                  <option value="SECRETARY">Secretary</option>
                  <option value="TREASURER">Treasurer</option>
                </select>
              </div>
            </div>

            {/* Location Selector */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Location</p>
              <LocationSelector onWardChange={handleWardChange} />
              {errors.wardId && <p className="mt-1 text-xs text-red-600">{errors.wardId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KYC Document URL (optional)
              </label>
              <input
                {...register('documentUrl')}
                placeholder="https://minio.example.com/kyc/form.pdf"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {errors.documentUrl && <p className="mt-1 text-xs text-red-600">{errors.documentUrl.message}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { reset(); setShowForm(false); }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by status:</label>
        {['', 'SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s || 'All Pending'}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {queueLoading ? (
          <div className="p-8 text-center text-gray-500">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No applications found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'ID Number', 'Phone', 'Stage', 'Ward', 'Status', 'Submitted', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {applications.map((app) => {
                const ward = app.ward as { name?: string; constituency?: { name?: string; county?: { name?: string } } } | undefined;
                return (
                  <tr key={app.id as string} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedApp(app)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {app.firstName as string} {app.lastName as string}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.idNumber as string}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.phoneNumber as string}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.stageName as string}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ward?.name}, {ward?.constituency?.name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status as string} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(app.createdAt as string).toLocaleDateString('en-KE')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-500">
              Showing page {page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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
