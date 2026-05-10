/**
 * Sprint 3 – API Client
 * Wraps all Sprint 3 endpoints: dashboard, financial import, statements, security/consent
 *
 * Uses the same tokenStore, API_BASE, and TENANT_ID as the main api-client.ts
 * to ensure consistent auth headers across all requests.
 */
import { tokenStore } from './api-client';

// Must match api-client.ts exactly so all requests go to the same backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Use tokenStore (keys: beba_access_token) – NOT localStorage.getItem('accessToken')
  const token = tokenStore.getAccess() ?? '';

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    'X-Tenant-ID': TENANT_ID,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...((options.headers as Record<string, string>) ?? {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? 'API error');
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingKyc: number;
  totalLoansCount: number;
  activeLoansCount: number;
  totalDisbursed: number;
  totalRepaid: number;
  outstandingBalance: number;
  defaultedLoans: number;
  defaultRate: number;
  collectionRate: number;
  totalSavings: number;
  welfareCollected: number;
  welfareDeficit: number;
  recentDisbursements: Array<{
    loanId: string;
    memberNumber: string;
    principal: number;
    disbursedAt: string;
    status: string;
  }>;
  repaymentHeatmap: Array<{ dayNumber: number; totalPaid: number; count: number }>;
  stageWelfareTable: Array<{
    stageName: string;
    weekNumber: number;
    amountCollected: number;
    weeklyTarget: number;
    deficit: number;
  }>;
  generatedAt: string;
  cachedUntil: string;
}

export interface DashboardReports {
  loansByStatus: Array<{ status: string; count: number; totalAmount: number }>;
  savingsByWeek: Array<{ weekNumber: number; totalAmount: number; memberCount: number }>;
  topDefaulters: Array<{
    memberNumber: string;
    outstandingBalance: number;
    arrearsDays: number;
  }>;
  generatedAt: string;
}

export interface StatementTransaction {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
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
  auditHash: string;
}

export interface BosaStatement {
  memberId: string;
  memberNumber: string;
  memberName: string;
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  totalSavings: number;
  welfareContributions: number;
  transactions: StatementTransaction[];
  auditHash: string;
}

export interface ConsentRecord {
  consentType: string;
  version: string;
  acceptedAt: string;
  ipAddress: string;
}

export interface SessionInfo {
  id: string;
  fingerprint: string;
  createdAt: string;
  expiresAt: string;
  isRevoked: boolean;
  isCurrent: boolean;
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

// ─── Dashboard API ────────────────────────────────────────────────────────────

// Shape returned by the backend /admin/dashboard/stats endpoint
interface BackendDashboardStats {
  members: { total: number; active: number; inactive: number; pendingKyc: number };
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

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const raw = await apiFetch<BackendDashboardStats>('/admin/dashboard/stats');
    const now = new Date().toISOString();
    const cachedUntil = new Date(Date.now() + 60_000).toISOString();

    // Map backend shape → frontend DashboardStats shape
    return {
      totalMembers: raw.members?.total ?? 0,
      activeMembers: raw.members?.active ?? 0,
      pendingKyc: raw.members?.pendingKyc ?? 0,
      totalLoansCount: (raw.loans?.active ?? 0) + (raw.loans?.defaulted ?? 0),
      activeLoansCount: raw.loans?.active ?? 0,
      totalDisbursed: raw.loans?.totalOutstandingAmount ?? 0,
      totalRepaid: 0, // not provided by this endpoint
      outstandingBalance: raw.loans?.totalOutstandingAmount ?? 0,
      defaultedLoans: raw.loans?.defaulted ?? 0,
      defaultRate: raw.loans?.defaultRatePercent ?? 0,
      collectionRate: raw.loans?.defaultRatePercent != null
        ? Math.max(0, 100 - raw.loans.defaultRatePercent)
        : 0,
      totalSavings: 0, // not provided by this endpoint
      welfareCollected: 0,
      welfareDeficit: 0,
      recentDisbursements: [],
      repaymentHeatmap: [],
      stageWelfareTable: [],
      generatedAt: now,
      cachedUntil,
    };
  },
  getReports: () => apiFetch<DashboardReports>('/admin/dashboard/reports'),
};

// ─── Financial Import API ─────────────────────────────────────────────────────

export const financialImportApi = {
  preview: (file: File, sheetType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('sheetType', sheetType);
    return apiFetch<FinancialPreviewResponse>('/admin/data-import/financial-preview', {
      method: 'POST',
      body: form,
    });
  },

  execute: (file: File, sheetType: string, importBatchId?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('sheetType', sheetType);
    if (importBatchId) form.append('importBatchId', importBatchId);
    return apiFetch<FinancialExecuteResponse>('/admin/data-import/execute-financial', {
      method: 'POST',
      body: form,
    });
  },
};

// ─── Statement API ────────────────────────────────────────────────────────────

export const statementApi = {
  getFosa: (params?: { memberId?: string; periodFrom?: string; periodTo?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
    ).toString();
    return apiFetch<FosaStatement>(`/members/statement/fosa${qs ? `?${qs}` : ''}`);
  },

  getBosa: (params?: { memberId?: string; periodFrom?: string; periodTo?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
    ).toString();
    return apiFetch<BosaStatement>(`/members/statement/bosa${qs ? `?${qs}` : ''}`);
  },

  downloadPdf: (
    type: 'FOSA' | 'BOSA',
    params?: { memberId?: string; periodFrom?: string; periodTo?: string },
  ) => {
    const token = tokenStore.getAccess() ?? '';
    const qs = new URLSearchParams({
      type,
      ...Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
      ),
    }).toString();
    const url = `${API_BASE}/statements/export/pdf?${qs}`;

    // Trigger browser download via fetch + blob (auth headers required)
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': TENANT_ID,
      },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.setAttribute('download', '');
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  },
};

// ─── Security / Consent API ───────────────────────────────────────────────────

export const securityApi = {
  getConsents: () => apiFetch<ConsentRecord[]>('/compliance/consent'),

  checkConsents: () =>
    apiFetch<{ hasRequiredConsents: boolean }>('/compliance/consent/check'),

  acceptConsent: (consentType: 'DATA_PROCESSING' | 'STATEMENT_EXPORT' | 'LOAN_TERMS') =>
    apiFetch<{ id: string; acceptedAt: string }>('/compliance/consent/accept', {
      method: 'POST',
      body: JSON.stringify({ consentType }),
    }),

  listSessions: () => apiFetch<SessionInfo[]>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    fetch(`${API_BASE}/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenStore.getAccess() ?? ''}`,
        'X-Tenant-ID': TENANT_ID,
      },
    }),
};
