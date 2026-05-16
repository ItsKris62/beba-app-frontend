/**
 * Beba SACCO API Client
 *
 * Typed HTTP client for all backend endpoints.
 * - Automatically attaches Authorization + X-Tenant-ID headers
 * - Handles token refresh on 401
 * - Returns standard ApiResponse envelope
 * - Retries on 5xx (max 2 attempts)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Tenant ID resolved at runtime from env → localStorage fallback */
function getTenantId(): string {
  if (process.env.NEXT_PUBLIC_TENANT_ID) {
    return process.env.NEXT_PUBLIC_TENANT_ID;
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('beba_tenant_id') ?? '';
  }
  return '';
}

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

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errorCode?: string;
  correlationId?: string;
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
    kycStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | string;
    kycRejectionReason?: string | null;
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
  requiredAccountType?: string | null;
  savingsMultiplier?: string;
  minGuarantors: number;
  maxGuarantors: number;
  guarantorCoverageRatio: string;
  requiresPayslip?: boolean;
  minActiveMonths?: number;
  gracePeriodMonths: number;
  isActive: boolean;
}

export interface Loan {
  id: string;
  loanProductId?: string;
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
  loanProduct?: {
    name: string;
    interestType: string;
    minGuarantors?: number;
    maxGuarantors?: number;
    guarantorCoverageRatio?: string | number;
  };
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

export interface GuarantorLookupResult {
  memberId: string;
  maskedName: string;
  maskedMemberNumber?: string;
  kycStatus: 'KYC_VERIFIED';
  eligible: boolean;
  reason?: string;
}

export interface GuarantorRequest {
  loanId: string;
  loanNumber: string;
  applicantName: string;
  amount: number;
  guaranteedAmount: number;
  status: string;
  purpose: string | null;
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

export interface AdminMemberDetail {
  id: string;
  memberNumber: string;
  nationalId: string | null;
  kraPin: string | null;
  employer: string | null;
  occupation: string | null;
  dateOfBirth: string | null;
  kycStatus: string;
  isActive: boolean;
  joinedAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    role: string;
    lastLoginAt?: string | null;
  };
  accounts: {
    id: string;
    accountNumber: string;
    accountType: string;
    balance: string | number;
    isActive: boolean;
  }[];
  loans: {
    id: string;
    loanNumber: string;
    status: string;
    principalAmount: string | number;
    outstandingBalance: string | number;
  }[];
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId?: string | null;
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
  payload?: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId?: string | null;
  entryHash?: string | null;
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

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'INTEREST_EARNED'
  | 'INTEREST_ACCRUAL'
  | 'PENALTY'
  | 'DIVIDEND_PAYOUT'
  | 'FEE_CHARGE'
  | 'TRANSFER';

export type TransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED'
  | 'RECON_PENDING';

export interface AdminTransaction {
  id: string;
  tenantId: string;
  accountId: string;
  loanId: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  account: {
    id: string;
    accountNumber: string;
    accountType: 'FOSA' | 'BOSA';
    member: {
      id: string;
      memberNumber: string;
      user: { firstName: string; lastName: string };
    };
  };
}

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
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
  kycDocumentUrls?: string[] | null;
  kycChecklist?: Record<string, boolean> | null;
  kycReviewNotes?: string | null;
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

export interface KycDocument {
  id: string;
  memberId: string;
  type: string;
  status: 'PENDING_UPLOAD' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'DELETED';
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  version: number;
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    memberNumber: string;
    kycStatus: string;
    user: { firstName: string; lastName: string; email: string; phone: string | null };
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

export interface LoanProductPayload {
  name: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  interestType: 'FLAT' | 'REDUCING_BALANCE';
  maxTenureMonths: number;
  processingFeeRate?: number;
  requiredAccountType?: 'FOSA' | 'BOSA';
  savingsMultiplier?: number;
  minGuarantors?: number;
  maxGuarantors?: number;
  guarantorCoverageRatio?: number;
  requiresPayslip?: boolean;
  minActiveMonths?: number;
  gracePeriodMonths?: number;
  isActive?: boolean;
}

// ─── Token storage helpers ────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';

const TOKEN_KEY = 'beba_access_token';
const REFRESH_KEY = 'beba_refresh_token';
const USER_KEY = 'beba_user';
const TENANT_KEY = 'beba_tenant_id';

// ─── In-memory access token ────────────────────────────────────────────────────
// Phase 4 security: the access token is held ONLY in this module-level variable.
// It is never written to localStorage, so it cannot be exfiltrated via XSS
// cross-tab or cross-session. The token is lost on page refresh; auth-context
// re-acquires it transparently via the refresh endpoint on mount.
let _memAccessToken: string | null = null;

/** Called by tokenStore.set/clear and by doRefresh — nowhere else. */
function setMemAccessToken(token: string | null): void {
  _memAccessToken = token;
}

// Cookie helpers — Next.js Edge middleware reads cookies (not localStorage) to
// make role-based routing decisions at the edge. We mirror the token into a
// same-site, short-lived cookie so middleware can decode the role without an
// extra network hop. The cookie is NOT httpOnly (Edge JS must set it), but it
// is scoped to SameSite=Strict which blocks cross-origin reads.
function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
}

export const tokenStore = {
  /** Returns the in-memory access token (never reads localStorage). */
  getAccess: (): string | null => _memAccessToken,
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
    setMemAccessToken(access);                     // access token: memory only
    localStorage.setItem(REFRESH_KEY, refresh);    // refresh token: localStorage
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TENANT_KEY, user.tenantId);
    setCookie(TOKEN_KEY, access, 7);               // mirror for Edge middleware
  },
  clear: () => {
    setMemAccessToken(null);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TENANT_KEY);
    clearCookie(TOKEN_KEY);
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
        'X-Tenant-ID': getTenantId(),
      },
      // Phase 2: send cookies if backend sets httpOnly refresh cookie
      credentials: 'include',
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

/**
 * Re-acquire an access token using the stored refresh token.
 * Called by AuthProvider on page mount to populate the in-memory token
 * after a page refresh (which clears the memory-only access token).
 */
export const refreshAccessToken = doRefresh;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 2,
): Promise<ApiResponse<T>> {
  const accessToken = tokenStore.getAccess();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': getTenantId(),
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE}${path}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return apiFetch<T>(path, options, retries - 1);
    }
    throw new Error('Network error – please check your connection');
  }

  // Handle 429 – rate limited; parse Retry-After header and back off
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 8000)));
      return apiFetch<T>(path, options, retries - 1);
    }
    return {
      success: false,
      data: null as T,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
    };
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

  if (!response.ok) {
    const problem = json as ProblemDetails;
    const message =
      problem.detail ??
      problem.title ??
      (json as { error?: { message?: string } }).error?.message ??
      `Request failed with status ${response.status}`;

    return {
      success: false,
      data: null as T,
      error: {
        code: problem.errorCode ?? problem.title ?? `HTTP_${response.status}`,
        message,
        details: json,
      },
    };
  }

  // Normalize: if the backend returns a raw object (no success/error fields),
  // wrap it so callers can use res.success and res.data consistently.
  if (json && typeof json === 'object' && !('success' in json) && !('error' in json)) {
    return { success: true, data: json as T, error: null };
  }

  return json as ApiResponse<T>;
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  login: (identifier: string, password: string) => {
    const cleaned = identifier.replace(/\s+/g, '');
    // Treat as phone if it's 9–15 digits with an optional leading '+'.
    // Strip the '+' so the backend always receives the '254...' format.
    const isPhone = /^\+?[0-9]{9,15}$/.test(cleaned);
    const normalizedPhone = isPhone ? cleaned.replace(/^\+/, '') : cleaned;
    const payload = isPhone
      ? { phone: normalizedPhone, password }
      : { email: cleaned, password };
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

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
    guarantorIds?: string[];
  }, idempotencyKey: string) =>
    apiFetch<Loan>('/members/loans/apply', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    }),

  requestGuarantors: (loanId: string, guarantorIds: string[]) =>
    apiFetch<{
      loanId: string;
      invitedCount: number;
      totalGuaranteedAmount: number;
      minimumCoverageRequired: number;
      coverageMet: boolean;
      results: Array<{ memberId: string; guaranteedAmount: number; status: 'invited' | 'skipped'; reason?: string }>;
    }>(`/members/loans/${loanId}/guarantors/request`, {
      method: 'POST',
      body: JSON.stringify({ guarantorIds }),
    }),

  lookupGuarantor: (idNumber: string, requiredAmount: number, loanProductId?: string) =>
    apiFetch<GuarantorLookupResult>('/members/guarantors/lookup', {
      method: 'POST',
      body: JSON.stringify({ idNumber, requiredAmount, loanProductId }),
    }),

  searchGuarantors: (query: string, requiredAmount: number, loanProductId?: string) =>
    apiFetch<GuarantorLookupResult[]>('/members/guarantors/search', {
      method: 'POST',
      body: JSON.stringify({ query, requiredAmount, loanProductId }),
    }),

  getGuarantorRequests: () =>
    apiFetch<GuarantorRequest[]>('/members/guarantor/requests'),

  respondToGuarantor: (loanId: string, action: 'ACCEPT' | 'DECLINE', notes: string | undefined, idempotencyKey: string) =>
    apiFetch<{ loanId: string; memberId: string; status: string }>(
      `/members/loans/${loanId}/guarantor-response`,
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': idempotencyKey },
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

  patchProfile: (data: {
    phone?: string;
    email?: string;
    employer?: string;
    occupation?: string;
    stageIds?: string[];
  }) =>
    apiFetch<{ id: string }>('/members/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listDocuments: () =>
    apiFetch<KycDocument[]>('/members/documents'),

  requestDocUploadUrl: (data: {
    type: string;
    mimeType: string;
    sizeBytes: number;
    originalFileName?: string;
  }) =>
    apiFetch<{ documentId: string; uploadUrl: string; objectKey: string; expiresIn: number; maxBytes: number }>(
      '/members/documents/upload-url',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  confirmDocUpload: (data: { documentId: string; checksum?: string }) =>
    apiFetch<KycDocument>('/members/documents/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

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
  getProducts: (includeInactive = false) =>
    apiFetch<LoanProduct[]>(`/loans/products${includeInactive ? '?includeInactive=true' : ''}`),

  createProduct: (data: LoanProductPayload) =>
    apiFetch<LoanProduct>('/loans/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id: string, data: Partial<LoanProductPayload>) =>
    apiFetch<LoanProduct>(`/loans/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deactivateProduct: (id: string) =>
    apiFetch<LoanProduct>(`/loans/products/${id}`, {
      method: 'DELETE',
    }),

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

  getMember: (memberId: string) =>
    apiFetch<AdminMemberDetail>(`/members/${memberId}`),

  updateKyc: (memberId: string, data: {
    nationalId?: string;
    kraPin?: string;
    employer?: string;
    occupation?: string;
    dateOfBirth?: string;
    phone?: string;
    documentUrls?: string[];
    verified?: boolean;
    notes?: string;
    checklist?: Record<string, boolean>;
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
    if (params?.search) q.set('search', params.search ?? '');
    return apiFetch<{ data: Loan[]; meta: ApiMeta }>(`/loans?${q}`);
  },

  overrideGuarantor: (loanId: string, guarantorId: string, action: 'ACCEPT' | 'DECLINE', reason: string) =>
    apiFetch<{ loanId: string; guarantorId: string; memberId: string; status: string; loanStatus: string }>(
      `/admin/loans/${loanId}/guarantors/${guarantorId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      },
    ),

  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    actorId?: string;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.action) q.set('action', params.action);
    if (params?.entityType) q.set('entityType', params.entityType);
    if (params?.actorId) q.set('actorId', params.actorId);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    return apiFetch<{ data: AuditLog[]; meta: ApiMeta }>(`/audit?${q}`);
  },

  exportAuditLogs: (params?: {
    format?: 'csv' | 'pdf';
    action?: string;
    entityType?: string;
    actorId?: string;
    from?: string;
    to?: string;
  }) => {
    const q = new URLSearchParams();
    q.set('format', params?.format ?? 'csv');
    if (params?.action) q.set('action', params.action);
    if (params?.entityType) q.set('entityType', params.entityType);
    if (params?.actorId) q.set('actorId', params.actorId);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    return downloadAuthenticatedFile(`/audit/export?${q}`);
  },

  getPendingMembers: (params?: { search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: PendingMember[]; meta: ApiMeta }>(`/admin/members/pending?${q}`);
  },

  getTransactions: (params?: {
    type?: TransactionType;
    status?: TransactionStatus;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: AdminTransaction[]; meta: ApiMeta }>(`/admin/transactions?${q}`);
  },

  reviewMember: (memberId: string, data: { action: 'APPROVE' | 'REJECT'; reason?: string }) =>
    apiFetch<{ success: boolean; action: string }>(`/admin/members/${memberId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  listKycDocuments: (params?: { status?: string; memberId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.memberId) q.set('memberId', params.memberId);
    return apiFetch<KycDocument[]>(`/admin/kyc/documents?${q}`);
  },

  enqueueDocReview: (docId: string, data: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
    apiFetch<{ status: 'QUEUED'; jobId: string | undefined }>(`/admin/kyc/documents/${docId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDocDownloadUrl: (docId: string) =>
    apiFetch<{ downloadUrl: string; expiresIn: number }>(`/admin/kyc/documents/${docId}/download`),

  requestUploadUrl: (data: {
    memberId: string;
    type: string;
    mimeType: string;
    sizeBytes: number;
    originalFileName?: string;
  }) =>
    apiFetch<{ documentId: string; uploadUrl: string; objectKey: string; expiresIn: number; maxBytes: number }>(
      '/admin/kyc/documents/upload-url',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  confirmUpload: (data: { documentId: string; memberId: string; checksum?: string }) =>
    apiFetch<KycDocument>('/admin/kyc/documents/confirm-upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Admin stages endpoints ───────────────────────────────────────────────────

export interface AdminStage {
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

export const stagesAdminApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    return apiFetch<{ data: AdminStage[]; meta: ApiMeta }>(`/admin/stages?${q}`);
  },
};

// ─── System Health (SUPER_ADMIN) ──────────────────────────────────────────────

export interface SystemServiceStatus {
  id: string;
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number | null;
  uptime: number | null;
  lastCheckedAt: string;
  details?: Record<string, unknown>;
}

export interface SystemErrorLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  source: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SystemBackgroundJob {
  id: string;
  name: string;
  displayName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  status: 'idle' | 'running' | 'failed';
}

export interface SystemBlockedIP {
  id: string;
  ipAddress: string;
  reason: string;
  blockedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface SystemFailedLogin {
  username: string;
  ipAddress: string;
  attempts: number;
  lastAttemptAt: string;
}

export const systemHealthApi = {
  getServices: () =>
    apiFetch<SystemServiceStatus[]>('/admin/health/services'),

  testService: (serviceId: string) =>
    apiFetch<SystemServiceStatus>(`/admin/health/services/${serviceId}/test`, { method: 'POST' }),

  getErrorLogs: (params?: { level?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set('level', params.level);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: SystemErrorLog[]; total: number }>(`/admin/health/error-logs?${q}`);
  },

  getBackgroundJobs: () =>
    apiFetch<SystemBackgroundJob[]>('/admin/health/background-jobs'),

  getBlockedIPs: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<{ data: SystemBlockedIP[]; total: number }>(`/admin/health/blocked-ips?${q}`);
  },

  unblockIP: (id: string) =>
    apiFetch<void>(`/admin/health/blocked-ips/${id}`, { method: 'DELETE' }),

  getFailedLogins: () =>
    apiFetch<SystemFailedLogin[]>('/admin/health/failed-logins'),
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

  approveUser: (id: string) =>
    apiFetch<{ success: boolean; user: StaffUser }>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'APPROVED' }),
    }),

  deactivate: (id: string) =>
    apiFetch<StaffUser>(`/users/${id}/deactivate`, { method: 'PATCH' }),

  forcePasswordReset: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/${id}/force-password-reset`, {
      method: 'PATCH',
    }),

  generateTemporaryPassword: (id: string) =>
    apiFetch<{
      success: boolean;
      temporaryPassword: string;
      user: Pick<StaffUser, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
      message: string;
    }>(`/users/${id}/generate-temporary-password`, {
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

async function downloadAuthenticatedFile(path: string): Promise<void> {
  const accessToken = tokenStore.getAccess();
  const headers: Record<string, string> = {
    'X-Tenant-ID': getTenantId(),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, { headers, credentials: 'include' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error((err as { message?: string }).message ?? 'Download failed');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') ?? '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'export';
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

// ─── Deposit polling helper ───────────────────────────────────────────────────

export interface DepositPollResult {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  receipt?: string;
  error?: string;
}

export function useDepositPolling(
  checkoutRequestId: string,
  timeoutMs = 120000,
): { status: DepositPollResult['status'] | null; error: string | null; receipt: string | null; stop: () => void } {
  const [status, setStatus] = useState<DepositPollResult['status'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    const startTime = Date.now();

    const poll = async () => {
      while (!abortRef.current) {
        if (Date.now() - startTime > timeoutMs) {
          setError('Deposit timed out. Please check your M-Pesa messages.');
          setStatus('FAILED');
          return;
        }

        try {
          const res = await memberApi.getDepositStatus(checkoutRequestId);
          if (res.success && res.data) {
            setStatus(res.data.status);
            if (res.data.status === 'SUCCESS') {
              setReceipt(res.data.completedAt ?? null);
              return;
            }
            if (res.data.status === 'FAILED') {
              setError('M-Pesa payment failed. Please try again.');
              return;
  }
}
        } catch {
          // Network errors during polling are non-fatal — keep polling
        }

        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    poll();

    return () => { abortRef.current = true; };
  }, [checkoutRequestId, timeoutMs]);

  return { status, error, receipt, stop: () => { abortRef.current = true; } };
}
