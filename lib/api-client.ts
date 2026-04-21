/**
 * Beba SACCO API Client
 *
 * Typed HTTP client for all backend endpoints.
 * - Automatically attaches Authorization + X-Tenant-ID headers
 * - Handles token refresh on 401
 * - Returns standard ApiResponse envelope
 * - Retries on 5xx (max 2 attempts)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

// ─── Standard response envelope ──────────────────────────────────────────────

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
  error: { code: string; message: string; details?: unknown } | null;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    mustChangePassword: boolean;
  };
}

export interface MemberDashboard {
  member: {
    id: string;
    memberNumber: string;
    name: string;
    email: string;
  };
  balances: {
    fosa: number;
    bosa: number;
    fosaAccountId: string | null;
    bosaAccountId: string | null;
  };
  activeLoans: {
    id: string;
    loanNumber: string;
    principalAmount: number;
    outstandingBalance: number;
    monthlyInstalment: number;
    dueDate: string | null;
  }[];
  recentTransactions: {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
    account: { accountType: string };
  }[];
  pendingGuarantorRequests: {
    guarantorId: string;
    loanId: string;
    loanNumber: string;
    applicantName: string;
    loanAmount: number;
    guaranteedAmount: number;
    purpose: string | null;
    invitedAt: string;
  }[];
}

export interface FosaStatement {
  account: { accountNumber: string; currentBalance: number };
  data: {
    id: string;
    type: string;
    status: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reference: string;
    description: string | null;
    createdAt: string;
  }[];
  meta: ApiMeta;
}

export interface LoanProduct {
  id: string;
  name: string;
  description: string | null;
  minAmount: string;
  maxAmount: string;
  interestRate: string;
  interestType: string;
  maxTenureMonths: number;
  processingFeeRate: string;
  gracePeriodMonths: number;
  isActive: boolean;
}

export interface Loan {
  id: string;
  loanNumber: string;
  status: string;
  purpose: string | null;
  principalAmount: string;
  interestRate: string;
  processingFee: string;
  tenureMonths: number;
  monthlyInstalment: string;
  outstandingBalance: string;
  totalRepaid: string;
  appliedAt: string;
  approvedAt: string | null;
  disbursedAt: string | null;
  dueDate: string | null;
  notes: string | null;
  member?: {
    memberNumber: string;
    user: { firstName: string; lastName: string; email?: string };
  };
  loanProduct?: { name: string; interestType: string };
  guarantors?: GuarantorRecord[];
}

export interface GuarantorRecord {
  id: string;
  memberId: string;
  status: string;
  guaranteedAmount: string;
  invitedAt: string;
  respondedAt: string | null;
  notes: string | null;
  member?: {
    memberNumber: string;
    user: { firstName: string; lastName: string; phone?: string };
  };
}

export interface AdminStats {
  members: { total: number; active: number; inactive: number };
  loans: {
    active: number;
    totalOutstandingAmount: number;
    pendingApprovals: number;
    defaulted: number;
    defaultRatePercent: number;
  };
  mpesa: {
    deposits7d: { count: number; totalAmount: number };
    deposits30d: { count: number; totalAmount: number };
  };
}

export interface AdminMember {
  id: string;
  memberNumber: string;
  nationalId: string | null;
  kraPin: string | null;
  employer: string | null;
  occupation: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt: string | null;
  };
  _count: { loans: number; accounts: number };
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
  user?: { firstName: string; lastName: string; email: string } | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; members: number };
}

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PendingMember {
  id: string;
  memberNumber: string;
  nationalId: string | null;
  kraPin: string | null;
  employer: string | null;
  occupation: string | null;
  dateOfBirth: string | null;
  kycStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    createdAt: string;
  };
}

export interface StkPushResponse {
  checkoutRequestId: string;
  merchantRequestId: string;
  customerMessage: string;
  mpesaTransactionId: string;
}

export interface DepositStatusResponse {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount?: string;
  completedAt?: string | null;
}

// ─── Token storage helpers ────────────────────────────────────────────────────

const TOKEN_KEY = 'beba_access_token';
const REFRESH_KEY = 'beba_refresh_token';
const USER_KEY = 'beba_user';

export const tokenStore = {
  getAccess: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  getUser: (): LoginResponse['user'] | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  set: (access: string, refresh: string, user: LoginResponse['user']) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function doRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID,
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      tokenStore.clear();
      return null;
    }
    const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
    if (!json.success || !json.data) {
      tokenStore.clear();
      return null;
    }
    const user = tokenStore.getUser();
    if (user) {
      tokenStore.set(json.data.accessToken, json.data.refreshToken, user);
    }
    return json.data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 2,
): Promise<ApiResponse<T>> {
  const accessToken = tokenStore.getAccess();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TENANT_ID,
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE}${path}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return apiFetch<T>(path, options, retries - 1);
    }
    throw new Error('Network error – please check your connection');
  }

  // Handle 403 – user lacks permission for this action
  if (response.status === 403) {
    return {
      success: false,
      data: null as T,
      error: { code: 'FORBIDDEN', message: "You don't have permission to perform this action" },
    };
  }

  // Handle 401 – attempt token refresh once
  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await doRefresh();
      isRefreshing = false;
      refreshQueue.forEach((cb) => cb(newToken ?? ''));
      refreshQueue = [];

      if (newToken) {
        return apiFetch<T>(path, options, 0);
      }
      // Redirect to login
      if (typeof window !== 'undefined') {
        tokenStore.clear();
        window.location.href = '/login';
      }
      return { success: false, data: null as T, error: { code: 'UNAUTHORIZED', message: 'Session expired' } };
    }

    // Queue concurrent requests while refresh is in progress
    return new Promise((resolve) => {
      refreshQueue.push((token) => {
        if (token) {
          resolve(apiFetch<T>(path, options, 0));
        } else {
          resolve({ success: false, data: null as T, error: { code: 'UNAUTHORIZED', message: 'Session expired' } });
        }
      });
    });
  }

  // Retry on 5xx
  if (response.status >= 500 && retries > 0) {
    await new Promise((r) => setTimeout(r, 1000));
    return apiFetch<T>(path, options, retries - 1);
  }

  // F3: Defence-in-depth guard for 204 No Content responses
  if (response.status === 204) {
    return { success: true, data: null as T, error: null };
  }

  const json = await response.json().catch(() => ({
    success: false,
    data: null,
    error: { code: 'PARSE_ERROR', message: 'Invalid response from server' },
  }));

  return json as ApiResponse<T>;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) =>
    apiFetch<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST' }),

  // F1 (auth): backend uses PATCH for change-password
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<void>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  /**
   * Request a password reset email.
   * Always returns success (prevents user enumeration).
   */
  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /**
   * Complete password reset using the signed JWT token from the email link.
   */
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

// ─── Member portal endpoints ──────────────────────────────────────────────────

export const memberApi = {
  getDashboard: () =>
    apiFetch<MemberDashboard>('/members/dashboard'),

  getFosaStatement: (params: { page?: number; limit?: number; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    return apiFetch<FosaStatement>(`/members/accounts/fosa/statement?${q}`);
  },

  applyForLoan: (data: {
    loanProductId: string;
    principalAmount: number;
    tenureMonths: number;
    purpose?: string;
    notes?: string;
  }, idempotencyKey: string) =>
    apiFetch<Loan>('/members/loans/apply', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    }),

  respondToGuarantor: (loanId: string, action: 'ACCEPT' | 'DECLINE', notes?: string) =>
    apiFetch<{ loanId: string; memberId: string; status: string }>(
      `/members/loans/${loanId}/guarantor-response`,
      {
        method: 'POST',
        body: JSON.stringify({ action, notes }),
      },
    ),

  initiateDeposit: (phone: string, amount: number, idempotencyKey: string) =>
    apiFetch<StkPushResponse>('/members/deposit/mpesa', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ phone, amount }),
    }),

  // F7: Proper deposit status polling endpoint (B5 backend)
  getDepositStatus: (checkoutRequestId: string) =>
    apiFetch<DepositStatusResponse>(
      `/members/deposit/status/${encodeURIComponent(checkoutRequestId)}`,
    ),

  requestUploadUrl: (fileName: string, contentType: string) =>
    apiFetch<{ uploadUrl: string; objectKey: string; expiresAt: string }>(
      '/members/documents/upload-url',
      {
        method: 'POST',
        body: JSON.stringify({ fileName, contentType }),
      },
    ),
};

// ─── Loan products (public-ish) ───────────────────────────────────────────────

export const loansApi = {
  getProducts: () =>
    apiFetch<LoanProduct[]>('/loans/products'),

  // F2: Member self-service loan list → /members/loans (not /loans)
  getMyLoans: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: Loan[]; meta: ApiMeta }>(`/members/loans?${q}`);
  },

  getLoan: (id: string) =>
    apiFetch<Loan>(`/loans/${id}`),

  getGuarantors: (loanId: string) =>
    apiFetch<GuarantorRecord[]>(`/loans/${loanId}/guarantors`),

  // Admin actions — F1: backend uses PATCH for these state transitions
  approveLoan: (id: string, comment?: string) =>
    apiFetch<Loan>(`/loans/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ comment }),
    }),

  rejectLoan: (id: string, reason: string) =>
    apiFetch<Loan>(`/loans/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  disburseLoan: (id: string) =>
    apiFetch<{ loan: Loan; newBalance: number }>(`/loans/${id}/disburse`, {
      method: 'PATCH',
    }),
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const adminApi = {
  getDashboardStats: () =>
    apiFetch<AdminStats>('/admin/dashboard/stats'),

  getMembers: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: 'active' | 'inactive';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    return apiFetch<{ data: AdminMember[]; meta: ApiMeta }>(`/admin/members?${q}`);
  },

  updateKyc: (memberId: string, data: {
    nationalId?: string;
    kraPin?: string;
    employer?: string;
    occupation?: string;
    dateOfBirth?: string;
    phone?: string;
  }) =>
    apiFetch<AdminMember>(`/admin/members/${memberId}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getLoans: (params?: { status?: string; page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: Loan[]; meta: ApiMeta }>(`/loans?${q}`);
  },

  getAuditLogs: (params?: { page?: number; limit?: number; action?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.action) q.set('action', params.action);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    return apiFetch<{ data: AuditLog[]; meta: ApiMeta }>(`/audit?${q}`);
  },

  getPendingMembers: (params?: { search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: PendingMember[]; meta: ApiMeta }>(`/admin/members/pending?${q}`);
  },

  reviewMember: (memberId: string, data: { action: 'APPROVE' | 'REJECT'; reason?: string }) =>
    apiFetch<{ success: boolean; action: string }>(`/admin/members/${memberId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// ─── Staff user management endpoints ─────────────────────────────────────────

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    return apiFetch<{ data: StaffUser[]; meta: ApiMeta }>(`/users?${q}`);
  },

  create: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: string;
  }) =>
    apiFetch<StaffUser>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deactivate: (id: string) =>
    apiFetch<StaffUser>(`/users/${id}/deactivate`, { method: 'PATCH' }),

  forcePasswordReset: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/${id}/force-password-reset`, {
      method: 'PATCH',
    }),
};

// ─── Tenants endpoints (SUPER_ADMIN only) ────────────────────────────────────

export const tenantsApi = {
  list: () =>
    apiFetch<Tenant[]>('/tenants'),

  suspend: (id: string) =>
    apiFetch<Tenant>(`/tenants/${id}/suspend`, { method: 'PATCH' }),

  activate: (id: string) =>
    apiFetch<Tenant>(`/tenants/${id}/activate`, { method: 'PATCH' }),
};

// ─── Utility ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
