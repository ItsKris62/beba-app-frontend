'use client';

/**
 * Sprint 1 – Locations, Applications & Stages API helpers
 *
 * Delegates to the shared apiFetch() (lib/api-client.ts) so these calls
 * inherit the real RFC 7807 error parsing and 401→refresh→retry logic
 * instead of a separate hand-rolled fetch wrapper. Callers here rely on a
 * throw-on-error contract returning the unwrapped payload (not apiFetch's
 * own {success,data,error} shape), so locationsFetch() below translates that.
 *
 * Note: the old custom apiFetchWithRetry() blindly retried POST /approve on
 * a 5xx, which risked a duplicate approval (double member-account creation,
 * double SMS) on a slow-but-successful first attempt. The shared apiFetch()
 * only auto-retries GET/HEAD (see isSafeToAutoRetry in api-client.ts) — that
 * safer behavior now applies here too rather than being preserved.
 */
import { apiFetch } from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface County {
  id: string;
  code: string;
  name: string;
}

export interface Constituency {
  id: string;
  code: string;
  name: string;
  countyId: string;
}

export interface Ward {
  id: string;
  code: string;
  name: string;
  constituencyId: string;
}

export interface Stage {
  id: string;
  name: string;
  tenantId: string;
  createdAt: string;
  ward: {
    id: string;
    name: string;
    constituency: {
      id: string;
      name: string;
      county: { id: string; name: string };
    };
  };
  _count: { assignments: number };
}

export interface MemberApplication {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  phoneNumber: string;
  stageName: string;
  position: string;
  status: 'SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  documentUrl: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  ward: {
    id: string;
    name: string;
    constituency: {
      id: string;
      name: string;
      county: { id: string; name: string };
    };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function locationsFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const result = await apiFetch<T>(path, options);
  if (!result.success) {
    throw new Error(result.error?.message ?? 'Request failed. Please try again.');
  }
  return result.data;
}

// ─── Locations API ────────────────────────────────────────────────────────────

export const locationsApi = {
  getCounties: (): Promise<County[]> => locationsFetch<County[]>('/locations/counties'),

  getConstituencies: (countyId: string): Promise<Constituency[]> =>
    locationsFetch<Constituency[]>(`/locations/constituencies?countyId=${countyId}`),

  getWards: (constituencyId: string): Promise<Ward[]> =>
    locationsFetch<Ward[]>(`/locations/wards?constituencyId=${constituencyId}`),
};

// ─── Applications API ─────────────────────────────────────────────────────────

export const applicationsApi = {
  submit: (data: Record<string, unknown>): Promise<MemberApplication> =>
    locationsFetch<MemberApplication>('/admin/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPending: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<MemberApplication>> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return locationsFetch<PaginatedResponse<MemberApplication>>(`/admin/applications/pending${query}`);
  },

  getOne: (id: string): Promise<MemberApplication> =>
    locationsFetch<MemberApplication>(`/admin/applications/${id}`),

  approve: (
    id: string,
    data?: { email?: string; reviewNotes?: string },
  ): Promise<{
    success: boolean;
    user: { id: string; email: string; firstName: string; lastName: string };
    member: { id: string; memberNumber: string };
    accounts: { id: string; accountNumber: string; accountType: string }[];
    smsEnqueued: boolean;
    message: string;
  }> =>
    locationsFetch(`/admin/applications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  reject: (
    id: string,
    reviewNotes: string,
  ): Promise<{ success: boolean; message: string }> =>
    locationsFetch(`/admin/applications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewNotes }),
    }),
};

// ─── Stages API ───────────────────────────────────────────────────────────────

export const stagesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    countyId?: string;
    constituencyId?: string;
    wardId?: string;
    search?: string;
  }): Promise<PaginatedResponse<Stage>> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.countyId) qs.set('countyId', params.countyId);
    if (params?.constituencyId) qs.set('constituencyId', params.constituencyId);
    if (params?.wardId) qs.set('wardId', params.wardId);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return locationsFetch<PaginatedResponse<Stage>>(`/admin/stages${query}`);
  },

  create: (data: { name: string; wardId: string }): Promise<Stage> =>
    locationsFetch<Stage>('/admin/stages', { method: 'POST', body: JSON.stringify(data) }),

  getOne: (id: string): Promise<Stage> =>
    locationsFetch<Stage>(`/admin/stages/${id}`),

  update: (id: string, data: { name?: string; wardId?: string }): Promise<Stage> =>
    locationsFetch<Stage>(`/admin/stages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean; message: string }> =>
    locationsFetch<{ success: boolean; message: string }>(`/admin/stages/${id}`, {
      method: 'DELETE',
    }),

  assign: (stageId: string, data: { userId: string; position?: string }) =>
    locationsFetch(`/admin/stages/${stageId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
