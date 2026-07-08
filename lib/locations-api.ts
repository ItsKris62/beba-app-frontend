'use client';

/**
 * Sprint 1 – Locations, Applications & Stages API helpers
 *
 * Uses the same apiFetch pattern as the rest of api-client.ts.
 * All calls automatically attach Authorization + X-Tenant-ID headers.
 */
import { sanitizeHttpError, sanitizeThrownError } from './error-sanitizer';
import { tokenStore } from './api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

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

// ─── Internal fetch helper (mirrors api-client.ts pattern) ───────────────────

function getTenantId(): string {
  if (process.env.NEXT_PUBLIC_TENANT_ID) return process.env.NEXT_PUBLIC_TENANT_ID;
  if (typeof window !== 'undefined') return localStorage.getItem('beba_tenant_id') ?? '';
  return '';
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.getAccess();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': getTenantId(),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    throw sanitizeThrownError({
      error,
      endpoint: path,
      method: options.method ?? 'GET',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ errorCode: `HTTP_${res.status}` }));
    const sanitized = sanitizeHttpError({
      response: res,
      body,
      endpoint: path,
      method: options.method ?? 'GET',
    });
    throw Object.assign(sanitized, {
      response: { status: res.status, data: body },
    });
  }

  return res.json() as Promise<T>;
}

/** Like apiFetch but retries once on 5xx errors to handle transient server failures. */
async function apiFetchWithRetry<T>(path: string, options: RequestInit = {}, retries = 1): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (retries > 0 && status && status >= 500) {
      await new Promise(r => setTimeout(r, 1000));
      return apiFetchWithRetry<T>(path, options, retries - 1);
    }
    throw err;
  }
}

// ─── Locations API ────────────────────────────────────────────────────────────

export const locationsApi = {
  getCounties: (): Promise<County[]> =>
    apiFetch<any>('/locations/counties').then(res => res?.data || res),

  getConstituencies: (countyId: string): Promise<Constituency[]> =>
    apiFetch<any>(`/locations/constituencies?countyId=${countyId}`).then(res => res?.data || res),

  getWards: (constituencyId: string): Promise<Ward[]> =>
    apiFetch<any>(`/locations/wards?constituencyId=${constituencyId}`).then(res => res?.data || res),
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
    search?: string;
  }): Promise<PaginatedResponse<MemberApplication>> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    // The backend returns { data, meta } directly — normalize to PaginatedResponse shape
    return apiFetch<PaginatedResponse<MemberApplication>>(`/admin/applications/pending${query}`)
      .then(res => {
        // If the response is already { data, meta } return as-is
        if (res && typeof res === 'object' && 'data' in res) return res;
        // Otherwise wrap it
        return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      });
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
    smsEnqueued: boolean;
    message: string;
  }> =>
    apiFetchWithRetry(`/admin/applications/${id}/approve`, {
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
    return apiFetch<PaginatedResponse<Stage>>(`/admin/stages${query}`);
  },

  create: (data: { name: string; wardId: string }): Promise<Stage> =>
    apiFetch<Stage>('/admin/stages', { method: 'POST', body: JSON.stringify(data) }),

  getOne: (id: string): Promise<Stage> =>
    apiFetch<Stage>(`/admin/stages/${id}`),

  update: (id: string, data: { name?: string; wardId?: string }): Promise<Stage> =>
    apiFetch<Stage>(`/admin/stages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean; message: string }> =>
    apiFetch<{ success: boolean; message: string }>(`/admin/stages/${id}`, {
      method: 'DELETE',
    }),

  assign: (stageId: string, data: { userId: string; position?: string }) =>
    apiFetch(`/admin/stages/${stageId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
