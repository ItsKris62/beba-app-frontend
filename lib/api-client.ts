/**
 * Beba SACCO API Client
 *
 * Typed HTTP client for all backend endpoints.
 * - Automatically attaches Authorization + X-Tenant-ID headers
 * - Handles token refresh on 401
 * - Returns standard ApiResponse envelope
 * - Retries on 5xx (max 2 attempts)
 */

import { sanitizeHttpError, sanitizeThrownError, type SanitizedApiError } from './error-sanitizer';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const AUTH_BASE = `${API_BASE}/auth`;

export const authClient = {
  baseURL: '/api/auth',
  withCredentials: true,
  post: (path: string, body?: unknown) =>
    fetch(`${AUTH_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': getTenantId(),
      },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    }),
  get: (path: string, accessToken?: string | null) =>
    fetch(`${AUTH_BASE}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': getTenantId(),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: 'include',
    }),
};

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
  error: SanitizedApiError | null;
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
  migrateRefreshToken?: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    mustChangePassword: boolean;
  };
  /** Mirrors user.mustChangePassword — not encoded in the JWT itself. */
  requiresPasswordChange?: boolean;
}

export interface MemberDashboard {
  member: {
    id: string;
    memberNumber: string;
    name: string;
    email: string;
    phone?: string | null;
    profileImageKey?: string | null;
    updatedAt?: string;
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
    status?: string;
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

export interface StatementTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
}

export interface StatementMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FosaStatement {
  memberId: string;
  memberNumber: string;
  memberName: string;
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  totalDisbursed: number;
  totalRepaid: number;
  transactions: StatementTransaction[];
  meta?: StatementMeta;
  auditHash: string;
}

export interface BosaStatement {
  memberId: string;
  memberNumber: string;
  memberName: string;
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
  closingBalance: number;
  totalSavings: number;
  welfareContributions: number;
  transactions: StatementTransaction[];
  meta?: StatementMeta;
  auditHash: string;
}

export interface ConsentRecord {
  consentType: string;
  version: string;
  acceptedAt: string;
  ipAddress: string;
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
  gracePeriodDays: number;
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
    accountStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
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

export interface TenantSettings {
  maxConcurrentGuarantees: number;
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string | null;
  logoUrl: string | null;
  security?: {
    require2FA?: boolean;
    sessionTimeoutMinutes?: number;
    passwordPolicy?: {
      minLength?: number;
      requireComplexity?: boolean;
      expiryDays?: number;
    };
  };
}

export interface TenantPublicInfo {
  name: string;
  contactEmail: string;
  contactPhone: string;
  address: string | null;
  logoUrl: string | null;
}

export interface UpdateTenantSettingsPayload {
  maxConcurrentGuarantees?: number;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  security?: {
    require2FA?: boolean;
    sessionTimeoutMinutes?: number;
    passwordPolicy?: {
      minLength?: number;
      requireComplexity?: boolean;
      expiryDays?: number;
    };
  };
}

export interface LogoUploadUrlResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  expiresIn: number;
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

export interface TransactionStats {
  pageVolume: number;
  inflows: number;
  outflows: number;
  netFlow: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export type JournalEntryStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'POSTED';
export type JournalEntryType =
  | 'MANUAL'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'FEE_CHARGE'
  | 'FEE_REVERSAL'
  | 'MPESA_DEPOSIT'
  | 'INTEREST_ACCRUAL';

export interface GLAccount {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  parentId: string | null;
  isSystemAccount: boolean;
  isActive: boolean;
}

export interface AccountingDashboardStats {
  pendingApprovalCount: number;
  unmatchedMpesaCount: number;
  postedJournalCount: number;
  totalGLAccounts: number;
}

export interface PendingApproval {
  id: string;
  entryNumber: string;
  type: JournalEntryType;
  description: string;
  amount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  referenceType: string | null;
  referenceId: string | null;
}

export interface UnmatchedMpesaTransaction {
  id: string;
  mpesaReference: string;
  type: string;
  amount: number;
  phoneNumber: string;
  accountReference: string | null;
  mpesaReceipt: string | null;
  createdAt: string;
  flagReason: string;
  reconciliationStatus: string;
  member: {
    id: string;
    memberNumber: string;
    name: string;
    email: string;
  } | null;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  type: JournalEntryType;
  status: JournalEntryStatus;
  description: string;
  totalAmount: number;
  referenceType: string | null;
  referenceId: string | null;
  approvalNotes?: string | null;
  postedAt?: string | null;
  createdAt: string;
  createdBy?: { id: string; firstName: string; lastName: string; email: string };
  approvedBy?: { id: string; firstName: string; lastName: string; email?: string } | null;
  rejectedBy?: { id: string; firstName: string; lastName: string; email?: string } | null;
  postings: {
    id: string;
    amount: number;
    description?: string | null;
    postingDate: string;
    debitAccount: Pick<GLAccount, 'id' | 'code' | 'name' | 'type'>;
    creditAccount: Pick<GLAccount, 'id' | 'code' | 'name' | 'type'>;
  }[];
}

export interface CreateJournalEntryPayload {
  description: string;
  type: JournalEntryType;
  postings: {
    debitAccountId: string;
    creditAccountId: string;
    amount: number;
    description?: string;
  }[];
  referenceType?: string;
  referenceId?: string;
}

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  accountStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
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
  status: 'PENDING_UPLOAD' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'QUARANTINE' | 'DELETED';
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

export interface DocumentUploadIntent {
  documentId: string;
  uploadUrl: string;
  preSignedUrl?: string;
  objectKey: string;
  uploadToken?: string;
  expiresIn: number;
  maxBytes: number;
}

export interface StkStatusResponse {
  checkoutRequestId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED' | 'RECON_PENDING';
  amount: string;
  lastUpdated: string;
  failureReason?: string;
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
  gracePeriodDays?: number;
  isActive?: boolean;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_MEMBER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory =
  | 'LOAN_QUERY'
  | 'MPESA_ISSUE'
  | 'ACCOUNT_ACCESS'
  | 'KYC_UPDATE'
  | 'GUARANTOR_DISPUTE'
  | 'GENERAL';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  content: string;
  attachments: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  memberId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  relatedLoanId: string | null;
  relatedTxId: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  member?: {
    id?: string;
    memberNumber: string;
    userId?: string;
    user?: {
      firstName: string;
      lastName: string;
      email?: string;
      phoneNumber?: string | null;
    };
  };
  messages?: TicketMessage[];
}

export interface CreateSupportTicketPayload {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  relatedLoanId?: string;
  relatedTxId?: string;
}

export interface AddTicketMessagePayload {
  content: string;
  attachments?: string[];
}

export interface SupportTicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
}

// ─── Token storage helpers ────────────────────────────────────────────────────

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

interface TokenStoreOptions {
  persistRefresh?: boolean;
}

/** Called by tokenStore.set/clear and by doRefresh — nowhere else. */
function setMemAccessToken(token: string | null): void {
  _memAccessToken = token;
}

// Cookie helpers — Next.js Edge middleware reads cookies (not localStorage) to
// make role-based routing decisions at the edge. We mirror the token into a
// same-site, short-lived cookie so middleware can decode the role without an
// extra network hop. The cookie is NOT httpOnly (Edge JS must set it), but it
// uses SameSite=Lax so top-level portal navigation carries it.
function getJwtMaxAgeSeconds(token: string): number {
  try {
    const [, payload] = token.split('.');
    if (!payload) return 15 * 60;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized)) as { exp?: number };
    if (!decoded.exp) return 15 * 60;
    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 15 * 60;
  }
}

function getCookieSecurityAttributes(): string {
  if (typeof window === 'undefined') return '';
  return window.location.protocol === 'https:' ? '; Secure' : '';
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = Math.max(0, Math.floor(maxAgeSeconds));
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; path=/; SameSite=Lax${getCookieSecurityAttributes()}`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax${getCookieSecurityAttributes()}`;
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
  set: (
    access: string,
    refresh: string,
    user: LoginResponse['user'],
    options: TokenStoreOptions = {},
  ) => {
    const persistRefresh = options.persistRefresh ?? true;
    setMemAccessToken(access);                     // access token: memory only
    if (persistRefresh) {
      localStorage.setItem(REFRESH_KEY, refresh);  // transition fallback only
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TENANT_KEY, user.tenantId);
    setCookie(TOKEN_KEY, access, getJwtMaxAgeSeconds(access)); // mirror for Next proxy
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
  const legacyRefreshToken = tokenStore.getRefresh();

  const refreshRequest = (refreshToken?: string) =>
    authClient.post('/refresh', refreshToken ? { refreshToken } : {});

  try {
    let usedLegacyFallback = false;
    let res = await refreshRequest();
    if (!res.ok && legacyRefreshToken) {
      usedLegacyFallback = true;
      res = await refreshRequest(legacyRefreshToken);
    }
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
      tokenStore.set(json.data.accessToken, json.data.refreshToken, user, {
        persistRefresh: usedLegacyFallback,
      });
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

// Only GET/HEAD are safe to retry blindly after a network error or 5xx: for
// those, the request either never reached the server or is known not to have
// mutated anything. A POST/PATCH/DELETE may have already been fully processed
// by the time the client sees a dropped connection or a 5xx (e.g. the mutation
// committed but the response never made it back) — auto-retrying it here would
// resubmit the same mutation a second time. Endpoints that need retry-safety
// for a real user-initiated resubmit carry their own X-Idempotency-Key instead.
function isSafeToAutoRetry(method?: string): boolean {
  const m = (method ?? 'GET').toUpperCase();
  return m === 'GET' || m === 'HEAD';
}

async function rawApiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 2,
): Promise<ApiResponse<T>> {
  const accessToken = tokenStore.getAccess();

  // Skip Content-Type for FormData bodies — the browser must generate its own
  // multipart boundary; forcing application/json here would corrupt the upload.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'X-Tenant-ID': getTenantId(),
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug('[api-request]', {
      endpoint: path.split('?')[0],
      hasAuthorization: Boolean(headers.Authorization),
      hasTenantId: Boolean(headers['X-Tenant-ID']),
    });
  }

  const url = `${API_BASE}${path}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch {
    if (retries > 0 && isSafeToAutoRetry(options.method)) {
      await new Promise((r) => setTimeout(r, 500));
      return rawApiFetch<T>(path, options, retries - 1);
    }
    throw new Error('Network error – please check your connection');
  }

  // Handle 429 – rate limited; parse Retry-After header and back off
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 8000)));
      return rawApiFetch<T>(path, options, retries - 1);
    }
    return {
      success: false,
      data: null as T,
      error: sanitizeHttpError({
        response,
        body: { errorCode: 'HTTP_429' },
        endpoint: path,
        method: options.method ?? 'GET',
      }),
    };
  }

  // Handle 403 – user lacks permission for this action. Parse the real body
  // rather than substituting a synthetic one: some 403s (e.g. login's
  // "phone verification required") carry extra signal fields callers need
  // to branch on, not just a generic permission-denied message.
  if (response.status === 403) {
    const body403 = await response.json().catch(() => ({ errorCode: 'HTTP_403' }));
    return {
      success: false,
      data: null as T,
      error: sanitizeHttpError({
        response,
        body: body403,
        endpoint: path,
        method: options.method ?? 'GET',
      }),
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
        return rawApiFetch<T>(path, options, 0);
      }
      // Redirect to login
      if (typeof window !== 'undefined') {
        tokenStore.clear();
        window.location.href = '/login';
      }
      return {
        success: false,
        data: null as T,
        error: sanitizeHttpError({
          response,
          body: { errorCode: 'AUTH_401_EXPIRED' },
          endpoint: path,
          method: options.method ?? 'GET',
        }),
      };
    }

    // Queue concurrent requests while refresh is in progress
    return new Promise((resolve) => {
      refreshQueue.push((token) => {
        if (token) {
          resolve(rawApiFetch<T>(path, options, 0));
        } else {
          resolve({
            success: false,
            data: null as T,
            error: sanitizeHttpError({
              response,
              body: { errorCode: 'AUTH_401_EXPIRED' },
              endpoint: path,
              method: options.method ?? 'GET',
            }),
          });
        }
      });
    });
  }

  // Retry on 5xx — only for requests that are safe to repeat (see isSafeToAutoRetry)
  if (response.status >= 500 && retries > 0 && isSafeToAutoRetry(options.method)) {
    await new Promise((r) => setTimeout(r, 1000));
    return rawApiFetch<T>(path, options, retries - 1);
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
    return {
      success: false,
      data: null as T,
      error: sanitizeHttpError({
        response,
        body: json,
        endpoint: path,
        method: options.method ?? 'GET',
      }),
    };
  }

  // Normalize: if the backend returns a raw object (no success/error fields),
  // wrap it so callers can use res.success and res.data consistently.
  if (json && typeof json === 'object' && !('success' in json) && !('error' in json)) {
    return { success: true, data: json as T, error: null };
  }

  const maybeEnvelope = json as ApiResponse<unknown>;
  if (
    maybeEnvelope.success &&
    maybeEnvelope.data &&
    typeof maybeEnvelope.data === 'object' &&
    'migrateRefreshToken' in maybeEnvelope.data &&
    typeof window !== 'undefined'
  ) {
    localStorage.removeItem(REFRESH_KEY);
  }

  return json as ApiResponse<T>;
}

// Exported so other client modules (support, incidents, locations, reports)
// can share the same 401→refresh→retry logic and RFC 7807 error parsing
// instead of hand-rolling their own fetch wrapper — see rawApiFetch above for
// the refresh/retry/queueing implementation this delegates to.
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 2,
): Promise<ApiResponse<T>> {
  try {
    return await rawApiFetch<T>(path, options, retries);
  } catch (error) {
    const sanitized = sanitizeThrownError({
      error,
      endpoint: path,
      method: options.method ?? 'GET',
      code: 'NETWORK_ERROR',
      status: 0,
    });
    return { success: false, data: null as T, error: sanitized };
  }
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  login: (identifier: string, password: string, totpToken?: string, backupCode?: string) => {
    const cleaned = identifier.replace(/\s+/g, '');
    // Treat as phone if it's 9–15 digits with an optional leading '+'.
    // Strip the '+' so the backend always receives the '254...' format.
    const isPhone = /^\+?[0-9]{9,15}$/.test(cleaned);
    const normalizedPhone = isPhone ? cleaned.replace(/^\+/, '') : cleaned;
    const payload = {
      ...(isPhone ? { phone: normalizedPhone } : { email: cleaned }),
      password,
      ...(totpToken ? { totpToken } : {}),
      ...(backupCode ? { backupCode } : {}),
    };
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

  generate2FA: (setupToken: string) =>
    apiFetch<{ qrCodeUrl: string; secret: string }>('/auth/2fa/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${setupToken}` },
    }),

  verify2FA: (setupToken: string, secret: string, token: string) =>
    apiFetch<LoginResponse & { backupCodes: string[] }>('/auth/2fa/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${setupToken}` },
      body: JSON.stringify({ secret, token }),
    }),

  // F1 (auth): backend uses PATCH for change-password.
  // currentPassword is optional — PIN-onboarded accounts have none yet and the
  // backend ignores it if sent; confirmPassword is required and must match newPassword.
  changePassword: (newPassword: string, confirmPassword: string, currentPassword?: string) =>
    apiFetch<void>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({
        ...(currentPassword ? { currentPassword } : {}),
        newPassword,
        confirmPassword,
      }),
    }),

  /**
   * First-login PIN → full session. Same response envelope as login().
   * See backend/docs/PIN_AUTH_FLOW.md Flow 2.
   */
  verifyPin: (phone: string, pin: string) =>
    apiFetch<LoginResponse>('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.replace(/^\+/, ''), pin }),
    }),

  /**
   * Phone-verification OTP required after a first-time temp-password login
   * (POST /auth/login responds with requiresPhoneVerification: true). Same
   * response envelope as login().
   */
  verifyLoginOtp: (phone: string, otp: string) =>
    apiFetch<LoginResponse>('/auth/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.replace(/^\+/, ''), otp }),
    }),

  /** Resend the phone-verification OTP. Always returns a generic success message. */
  resendLoginOtp: (phone: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/resend-login-otp', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.replace(/^\+/, '') }),
    }),

  /**
   * Request a PIN via SMS for password reset or a lost first-login PIN.
   * Always returns success (prevents phone-number enumeration).
   * See backend/docs/PIN_AUTH_FLOW.md Flow 3.
   */
  requestPasswordReset: (phone: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.replace(/^\+/, '') }),
    }),

  /**
   * Confirm the SMS PIN + set a new password. No tokens issued — log in afterward.
   * See backend/docs/PIN_AUTH_FLOW.md Flow 3.
   */
  resetPasswordConfirm: (phone: string, pin: string, newPassword: string, confirmPassword: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/reset-password/confirm', {
      method: 'POST',
      body: JSON.stringify({ phone: phone.replace(/^\+/, ''), pin, newPassword, confirmPassword }),
    }),

  /**
   * Legacy email-link password reset — kept for the existing /reset-password page.
   * Do not build new frontend work against this; use requestPasswordReset/resetPasswordConfirm.
   */
  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /**
   * Legacy email-link password reset — kept for the existing /reset-password page.
   * Do not build new frontend work against this; use requestPasswordReset/resetPasswordConfirm.
   */
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
};

// ─── Compliance / consent endpoints ───────────────────────────────────────────

export const complianceApi = {
  getConsents: () => apiFetch<ConsentRecord[]>('/compliance/consent'),

  checkConsents: () =>
    apiFetch<{ hasRequiredConsents: boolean }>('/compliance/consent/check'),

  acceptConsent: (consentType: 'DATA_PROCESSING' | 'STATEMENT_EXPORT' | 'LOAN_TERMS') =>
    apiFetch<{ id: string; acceptedAt: string }>('/compliance/consent/accept', {
      method: 'POST',
      body: JSON.stringify({ consentType }),
    }),
};

// ─── Member portal endpoints ──────────────────────────────────────────────────

export const memberApi = {
  getDashboard: () =>
    apiFetch<MemberDashboard>('/members/dashboard'),

  withdrawMpesa: (data: { phoneNumber: string; amount: number }, idempotencyKey: string) =>
    apiFetch<{ message: string; transactionId: string }>('/members/withdraw/mpesa', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify(data),
    }),

  getFosaStatement: (params?: { memberId?: string; periodFrom?: string; periodTo?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.memberId) q.set('memberId', params.memberId);
    if (params?.periodFrom) q.set('periodFrom', params.periodFrom);
    if (params?.periodTo) q.set('periodTo', params.periodTo);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<FosaStatement>(`/members/statement/fosa?${q}`);
  },

  getBosaStatement: (params?: { memberId?: string; periodFrom?: string; periodTo?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.memberId) q.set('memberId', params.memberId);
    if (params?.periodFrom) q.set('periodFrom', params.periodFrom);
    if (params?.periodTo) q.set('periodTo', params.periodTo);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiFetch<BosaStatement>(`/members/statement/bosa?${q}`);
  },

  downloadStatementPdf: (type: 'FOSA' | 'BOSA', params?: { memberId?: string; periodFrom?: string; periodTo?: string }) => {
    const q = new URLSearchParams({
      type,
      ...Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]),
    });
    return downloadAuthenticatedFile(`/statements/export/pdf?${q}`);
  },

  downloadStatementCsv: (type: 'FOSA' | 'BOSA', params?: { memberId?: string; periodFrom?: string; periodTo?: string }) => {
    const q = new URLSearchParams({
      type,
      ...Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][]),
    });
    return downloadAuthenticatedFile(`/statements/export/csv?${q}`);
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

  searchGuarantors: (query: string, requiredAmount: number, loanProductId?: string) =>
    apiFetch<GuarantorLookupResult[]>('/members/guarantors/search', {
      method: 'POST',
      body: JSON.stringify({ query, requiredAmount, loanProductId }),
    }),

  getGuarantorRequests: () =>
    apiFetch<GuarantorRequest[]>('/members/guarantor/requests'),

  // digitalAcknowledgment is a required field on the backend DTO (no @IsOptional()) —
  // omitting it fails validation for both actions, and for ACCEPT specifically the
  // service throws DIGITAL_ACKNOWLEDGMENT_REQUIRED unless it's true. It must reflect
  // that the member actually scrolled through and checked the disclosure, not just be
  // hardcoded true.
  respondToGuarantor: (
    loanId: string,
    action: 'ACCEPT' | 'DECLINE',
    notes: string | undefined,
    digitalAcknowledgment: boolean,
    idempotencyKey: string,
  ) =>
    apiFetch<{ loanId: string; memberId: string; status: string }>(
      `/members/loans/${loanId}/guarantor-response`,
      {
        method: 'POST',
        headers: { 'X-Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ action, notes, digitalAcknowledgment }),
      },
    ),

  initiateDeposit: (phone: string, amount: number, idempotencyKey: string) =>
    apiFetch<StkPushResponse>('/members/deposit/mpesa', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ phone, amount }),
    }),

  // F7: Proper deposit status polling endpoint.
  // Was calling GET /members/deposit/status/:id, which does not exist
  // anywhere in the backend (confirmed by grep — always 404s). The real,
  // live status endpoint is GET /mpesa/transactions/:checkoutRequestId/status
  // (same one mpesaApi.getStkStatus already calls) — every real deposit on
  // this page was silently polling a dead route to the 100s timeout.
  getDepositStatus: (checkoutRequestId: string) =>
    apiFetch<StkStatusResponse>(
      `/mpesa/transactions/${encodeURIComponent(checkoutRequestId)}/status`,
    ),

  patchProfile: (data: {
    phone?: string;
    email?: string;
    employer?: string;
    occupation?: string;
    stageIds?: string[];
    profileImageKey?: string | null;
  }) =>
    apiFetch<{
      id: string;
      user?: { profileImageKey?: string | null; updatedAt?: string };
    }>('/members/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  requestProfileImageUploadUrl: (fileName: string) =>
    apiFetch<{ uploadUrl: string; fileKey: string; contentType: string; expiresIn: number }>(
      '/members/profile/image-url',
      {
        method: 'POST',
        body: JSON.stringify({ fileName }),
      },
    ),

  getProfileImageUrl: () =>
    apiFetch<{ imageUrl: string | null; fileKey: string | null }>('/members/profile/image-url'),

  listDocuments: () =>
    apiFetch<KycDocument[]>('/members/documents'),

  requestDocUploadUrl: (data: {
    type: string;
    mimeType: string;
    sizeBytes: number;
    originalFileName?: string;
    checksum?: string;
  }) =>
    apiFetch<DocumentUploadIntent>(
      '/members/documents/upload-url',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  confirmDocUpload: (data: { documentId: string; checksum?: string; uploadToken?: string }) =>
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

  createTicket: (data: CreateSupportTicketPayload) =>
    apiFetch<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyTickets: () =>
    apiFetch<SupportTicket[]>('/support/tickets'),

  getTicketById: (id: string) =>
    apiFetch<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`),

  addMessageToTicket: (id: string, message: AddTicketMessagePayload) =>
    apiFetch<TicketMessage>(`/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    }),
};

// ─── Loan products (public-ish) ───────────────────────────────────────────────

export const mpesaApi = {
  getStkStatus: (checkoutRequestId: string) =>
    apiFetch<StkStatusResponse>(
      `/mpesa/transactions/${encodeURIComponent(checkoutRequestId)}/status`,
    ),
};

export const loansApi = {
  getProducts: (includeInactive = false) =>
    apiFetch<LoanProduct[]>(`/loans/products${includeInactive ? '?includeInactive=true' : ''}`),

  /** Unauthenticated feed for the public marketing site and loan calculator. Always active-only. */
  getPublicProducts: () => apiFetch<LoanProduct[]>('/loans/products/public'),

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

  // 4-eyes disbursement gate for loans >= DUAL_APPROVAL_THRESHOLD_KES (lib/loan-math.ts).
  // Restricted to MANAGER/TELLER server-side; the same person cannot fill both slots.
  signApprovalChain: (id: string, approve: boolean, notes?: string) =>
    apiFetch<{ chainComplete: boolean; allApproved: boolean }>(`/loans/${id}/approval-chain/sign`, {
      method: 'PATCH',
      body: JSON.stringify({ approve, notes }),
    }),
};

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const accountingApi = {
  getDashboardStats: () =>
    apiFetch<AccountingDashboardStats>('/admin/accounting/dashboard-stats'),

  getPendingApprovals: () =>
    apiFetch<{ items: PendingApproval[]; total: number }>('/admin/accounting/pending-approvals'),

  getGLAccounts: () =>
    apiFetch<{ data: GLAccount[] }>('/admin/accounting/gl-accounts'),

  getJournalEntries: (params?: {
    page?: number;
    limit?: number;
    status?: JournalEntryStatus;
    type?: JournalEntryType;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    if (params?.type) q.set('type', params.type);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.search) q.set('search', params.search);
    return apiFetch<{ data: JournalEntry[]; meta: ApiMeta }>(`/admin/accounting/journal-entries?${q}`);
  },

  createJournalEntry: (data: CreateJournalEntryPayload) =>
    apiFetch<JournalEntry>('/admin/accounting/journal-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveJournalEntry: (id: string, notes?: string) =>
    apiFetch<JournalEntry>(`/admin/accounting/journal-entries/${encodeURIComponent(id)}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  rejectJournalEntry: (id: string, notes?: string) =>
    apiFetch<JournalEntry>(`/admin/accounting/journal-entries/${encodeURIComponent(id)}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  getUnmatchedMpesa: (params?: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.search) q.set('search', params.search);
    return apiFetch<{ data: UnmatchedMpesaTransaction[]; meta: ApiMeta }>(`/admin/accounting/mpesa/unmatched?${q}`);
  },

  matchMpesa: (id: string, data: { accountId: string; note?: string }) =>
    apiFetch<{
      success: boolean;
      transactionId: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      accountNumber: string;
      memberName: string;
    }>(`/admin/accounting/mpesa/${encodeURIComponent(id)}/match`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  exportGL: (params?: { startDate?: string; endDate?: string }) =>
    downloadAuthenticatedFile('/admin/accounting/export-gl', {
      method: 'POST',
      body: JSON.stringify(params ?? {}),
    }),
};

export interface AdminDashboardStats {
  members: {
    total: number;
    totalActiveAccounts: number;
    engagedUsers30d: number;
    pendingKyc: number;
  };
  loans: {
    total: number;
    active: number;
    totalOutstandingAmount: number;
    pendingApprovals: number;
    defaulted: number;
    defaultRatePercent: number;
    portfolioAtRisk30d: {
      outstandingAmount: number;
      percentOfActivePortfolio: number;
    };
    disbursements: {
      thisMonth: { count: number; totalAmount: number };
      overall: { count: number; totalAmount: number };
    };
  };
  mpesa: {
    deposits7d: { count: number; totalAmount: number };
    deposits30d: { count: number; totalAmount: number };
  };
  // NOTE: no `shareCapital` field exists anywhere in the backend schema (verified
  // against prisma/schema.prisma) — don't add one here without a real backing field.
  liquidity: {
    totalFosaLiquidity: number;
    totalBosaSavings: number;
    fosa: { totalBalance: number; accountCount: number; avgBalance: number };
    bosa: { totalBalance: number; accountCount: number; avgBalance: number };
  };
}

export interface AdminDashboardReports {
  loansByStatus: Array<{ status: string; count: number; totalAmount: number }>;
  savingsByWeek: Array<{ weekNumber: number; totalAmount: number; memberCount: number }>;
  topDefaulters: Array<{ memberNumber: string; outstandingBalance: number; arrearsDays: number }>;
  // Loan products are per-tenant rows (name-based), not a fixed enum — this is
  // whatever products the tenant actually has, not a hardcoded pair.
  loanProductMix: Array<{ productId: string; productName: string; count: number; totalDisbursed: number; avgLoanSize: number }>;
  agingBuckets: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90Plus: number;
  };
  generatedAt: string;
}

export type ExecutiveOverviewRange = '30d' | '90d' | '1y';

// No `delinquency` series — the backend has no historical PAR/delinquency
// snapshot table to trend (see dashboard.service.ts doc comment). Don't add
// a delinquency line here without a real backing time series.
export interface ExecutiveOverview {
  range: ExecutiveOverviewRange;
  revenue: Array<{ date: string; amount: number }>;
  disbursements: Array<{ date: string; amount: number }>;
  newMembers: Array<{ date: string; count: number }>;
}

export interface GuarantorHealth {
  totalLoansWithGuarantors: number;
  totalActiveLoans: number;
  coveragePercent: number;
  loansWithPartialCoverage: number;
  loansWithFullCoverage: number;
  loansWithNoGuarantors: number;
  guarantorDefaultRate: number;
  averageGuarantorsPerLoan: number;
}

export interface MpesaHeatmap {
  days: number;
  buckets: Array<{ day: string; hour: number; totalAmount: number; transactionCount: number }>;
}

// Shape emitted by admin/analytics/real-time — same payload whether read via
// the JSON-snapshot fallback (what this app polls) or the SSE stream.
export interface RealTimeAnalyticsSnapshot {
  tenantId: string;
  timestamp: string;
  totalDepositsToday: number;
  activeLoans: number;
  pendingApplications: number;
  nplRatio: number;
  liquidityRatio: number;
  memberCount: number;
}

export interface FinancialPreviewResponse {
  sheetType: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  rows: Array<{
    rowNumber: number;
    status: 'VALID' | 'WARNING' | 'ERROR';
    message?: string;
    resolvedMemberId?: string;
    data: Record<string, unknown>;
  }>;
  totalAmount: number;
}

export interface FinancialExecuteResponse {
  batchId: string;
  sheetType: string;
  loansCreated: number;
  repaymentsCreated: number;
  savingsCreated: number;
  welfareCollectionsCreated: number;
  skipped: number;
  errors: number;
  errorDetails?: Array<{ row: number; reason: string }>;
}

export const adminApi = {
  getDashboardStats: () => apiFetch<AdminDashboardStats>('/admin/dashboard/stats'),

  getDashboardReports: () => apiFetch<AdminDashboardReports>('/admin/dashboard/reports'),

  getExecutiveOverview: (range: ExecutiveOverviewRange) =>
    apiFetch<ExecutiveOverview>(`/admin/dashboard/executive-overview?range=${range}`),

  getGuarantorHealth: () => apiFetch<GuarantorHealth>('/admin/dashboard/guarantor-health'),

  getMpesaHeatmap: (days = 7) =>
    apiFetch<MpesaHeatmap>(`/admin/dashboard/mpesa-heatmap?days=${days}`),

  // Deliberately NOT a browser EventSource — that endpoint requires an
  // Authorization header + X-Tenant-ID header neither EventSource nor cookies
  // can carry here (no cookie/query-token auth path exists on that route),
  // and the backend's broadcast trigger is never invoked anywhere in this
  // codebase today, so a real SSE connection would only ever emit one event.
  // The controller already has a documented non-SSE JSON-snapshot fallback
  // (triggered by not sending `Accept: text/event-stream`, which apiFetch
  // never does) — polling that via React Query gives the same live-feeling
  // UX without any backend auth workaround.
  getRealTimeAnalyticsSnapshot: () =>
    apiFetch<RealTimeAnalyticsSnapshot>('/admin/analytics/real-time'),

  previewFinancialImport: (file: File, sheetType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('sheetType', sheetType);
    return apiFetch<FinancialPreviewResponse>('/admin/data-import/financial-preview', {
      method: 'POST',
      body: form,
    });
  },

  executeFinancialImport: (file: File, sheetType: string, importBatchId?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('sheetType', sheetType);
    if (importBatchId) form.append('importBatchId', importBatchId);
    return apiFetch<FinancialExecuteResponse>('/admin/data-import/execute-financial', {
      method: 'POST',
      body: form,
    });
  },

  getMembers: (params?: {
    search?: string;
    page?: number;
    limit?: number;
    accountStatus?: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
    recentlyActive?: boolean;
    role?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.accountStatus) q.set('accountStatus', params.accountStatus);
    if (params?.recentlyActive !== undefined) q.set('recentlyActive', String(params.recentlyActive));
    if (params?.role) q.set('role', params.role);
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
    documentIds?: string[];
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

  getTransactionStats: (params?: {
    from?: string;
    to?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.search) q.set('search', params.search);
    return apiFetch<TransactionStats>(`/admin/transactions/stats?${q}`);
  },

  getAllTickets: (filters?: SupportTicketFilters) => {
    const q = new URLSearchParams();
    if (filters?.status) q.set('status', filters.status);
    return apiFetch<SupportTicket[]>(`/support/tickets${q.size ? `?${q}` : ''}`);
  },

  getTicketById: (id: string) =>
    apiFetch<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`),

  addMessageToTicket: (id: string, message: AddTicketMessagePayload) =>
    apiFetch<TicketMessage>(`/support/tickets/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    }),

  updateTicketStatus: (
    id: string,
    data: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string; note?: string },
  ) =>
    apiFetch<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

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
    checksum?: string;
  }) =>
    apiFetch<DocumentUploadIntent>(
      '/admin/kyc/documents/upload-url',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  confirmUpload: (data: { documentId: string; memberId: string; checksum?: string; uploadToken?: string }) =>
    apiFetch<KycDocument>(`/admin/kyc/documents/${data.documentId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        memberId: data.memberId,
        checksum: data.checksum,
        uploadToken: data.uploadToken,
      }),
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
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
  }) =>
    apiFetch<{
      success: boolean;
      smsEnqueued: boolean;
      emailEnqueued: boolean;
      user: StaffUser;
      message: string;
    }>('/users', {
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
      smsEnqueued: boolean;
      user: Pick<StaffUser, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>;
      message: string;
    }>(`/users/${id}/generate-temporary-password`, {
      method: 'PATCH',
    }),

  /**
   * TENANT_ADMIN only, rate-limited server-side (5/hour/admin). Once the
   * target has set their own password the backend clears the encrypted
   * blob and this 400s — that's the only 400 this endpoint returns, so
   * callers can key off `error.status === 400` to show the "already set"
   * explanation inline instead of a generic error toast.
   */
  revealTemporaryPassword: (id: string) =>
    apiFetch<{ temporaryPassword: string }>(`/users/${id}/reveal-temp-password`),
};

// ─── Tenants endpoints (SUPER_ADMIN only) ────────────────────────────────────

export const tenantsApi = {
  list: () =>
    apiFetch<Tenant[]>('/tenants'),

  suspend: (id: string) =>
    apiFetch<Tenant>(`/tenants/${id}/suspend`, { method: 'PATCH' }),

  activate: (id: string) =>
    apiFetch<Tenant>(`/tenants/${id}/activate`, { method: 'PATCH' }),

  getSettings: () =>
    apiFetch<TenantSettings>('/tenants/settings'),

  updateSettings: (payload: UpdateTenantSettingsPayload) =>
    apiFetch<TenantSettings>('/tenants/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  requestLogoUploadUrl: (fileName: string, contentType: string) =>
    apiFetch<LogoUploadUrlResponse>('/tenants/logo/upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    }),

  /** Unauthenticated feed for the public marketing site (footer, about, contact pages). */
  getPublicInfo: () =>
    apiFetch<TenantPublicInfo>('/tenants/public-info'),
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

async function downloadAuthenticatedFile(
  path: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<void> {
  const accessToken = tokenStore.getAccess();
  const headers: Record<string, string> = {
    'X-Tenant-ID': getTenantId(),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    throw sanitizeThrownError({
      error,
      endpoint: path,
      method: options.method ?? 'GET',
      code: 'NETWORK_ERROR',
      status: 0,
    });
  }

  // Same one-shot refresh-and-retry contract as rawApiFetch() — a long-lived
  // export/GL-download session shouldn't die on a plain expired access token.
  if (response.status === 401 && allowRefresh) {
    const newToken = await doRefresh();
    if (newToken) {
      return downloadAuthenticatedFile(path, options, false);
    }
    if (typeof window !== 'undefined') {
      tokenStore.clear();
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ errorCode: `HTTP_${response.status}` }));
    throw sanitizeHttpError({
      response,
      body,
      endpoint: path,
      method: options.method ?? 'GET',
    });
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
