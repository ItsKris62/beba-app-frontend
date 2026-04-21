/**
 * Sprint 3 – API Client
 * Wraps all Sprint 3 endpoints: dashboard, financial import, statements, security/consent
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
  const tenantId =
    typeof window !== 'undefined' ? (localStorage.getItem('tenantId') ?? '') : '';

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
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

export const dashboardApi = {
  getStats: () => apiFetch<DashboardStats>('/admin/dashboard/stats'),
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
    const token =
      typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
    const tenantId =
      typeof window !== 'undefined' ? (localStorage.getItem('tenantId') ?? '') : '';
    const qs = new URLSearchParams({
      type,
      ...Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
      ),
    }).toString();
    const url = `${API_BASE}/statements/export/pdf?${qs}`;

    // Trigger browser download
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    // Add auth headers via fetch + blob
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
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
        Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : ''}`,
        'X-Tenant-ID': `${typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? '' : ''}`,
      },
    }),
};
