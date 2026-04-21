'use client';

/**
 * Sprint 1 – Locations, Applications & Stages API helpers
 *
 * Uses the same apiFetch pattern as the rest of api-client.ts.
 * All calls automatically attach Authorization + X-Tenant-ID headers.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

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

// ─── Internal fetch helper (mirrors api-client.ts pattern) ───────────────────

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('beba_access_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TENANT_ID,
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    throw Object.assign(new Error(body.message ?? res.statusText), {
      response: { status: res.status, data: body },
    });
  }

  return res.json() as Promise<T>;
}

// ─── Locations API ────────────────────────────────────────────────────────────

export const locationsApi = {
  getCounties: (): Promise<County[]> =>
    apiFetch<County[]>('/locations/counties'),

  getConstituencies: (countyId: string): Promise<Constituency[]> =>
    apiFetch<Constituency[]>(`/locations/constituencies?countyId=${countyId}`),

  getWards: (constituencyId: string): Promise<Ward[]> =>
    apiFetch<Ward[]>(`/locations/wards?constituencyId=${constituencyId}`),
};

// ─── Applications API ─────────────────────────────────────────────────────────

export const applicationsApi = {
  submit: (data: Record<string, unknown>): Promise<MemberApplication> =>
    apiFetch<MemberApplication>('/admin/applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPending: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedResponse<MemberApplication>> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<PaginatedResponse<MemberApplication>>(`/admin/applications/pending${query}`);
  },

  getOne: (id: string): Promise<MemberApplication> =>
    apiFetch<MemberApplication>(`/admin/applications/${id}`),

  approve: (
    id: string,
    data?: { email?: string; reviewNotes?: string },
  ): Promise<{
    success: boolean;
    user: { id: string; email: string; firstName: string; lastName: string };
    member: { id: string; memberNumber: string };
    accounts: { id: string; accountNumber: string; accountType: string }[];
    temporaryPassword: string;
    message: string;
  }> =>
    apiFetch(`/admin/applications/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  reject: (
    id: string,
    reviewNotes: string,
  ): Promise<{ success: boolean; message: string }> =>
    apiFetch(`/admin/applications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewNotes }),
    }),
};

// ─── Stages API ───────────────────────────────────────────────────────────────

export const stagesApi = {
  list: (params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<{ id: string; name: string; tenantId: string; createdAt: string }>> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch(`/admin/stages${query}`);
  },

  create: (data: { name: string; wardId: string }) =>
    apiFetch('/admin/stages', { method: 'POST', body: JSON.stringify(data) }),

  getOne: (id: string) =>
    apiFetch(`/admin/stages/${id}`),

  assign: (stageId: string, data: { userId: string; position?: string }) =>
    apiFetch(`/admin/stages/${stageId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
