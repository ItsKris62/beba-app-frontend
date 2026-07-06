/**
 * Sprint 3 – API Client
 * Wraps the admin dashboard-stats/reports and financial-import endpoints.
 * Statement and consent endpoints live in lib/api-client.ts (memberApi/complianceApi).
 *
 * Uses the same tokenStore, API_BASE, and TENANT_ID as the main api-client.ts
 * to ensure consistent auth headers across all requests.
 */
import { tokenStore } from './api-client';
import { sanitizeHttpError, sanitizeThrownError } from './error-sanitizer';

// Must match api-client.ts exactly so all requests go to the same backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
function getTenantId(): string {
  if (process.env.NEXT_PUBLIC_TENANT_ID) return process.env.NEXT_PUBLIC_TENANT_ID;
  if (typeof window !== 'undefined') return localStorage.getItem('beba_tenant_id') ?? '';
  return '';
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Use tokenStore (keys: beba_access_token) – NOT localStorage.getItem('accessToken')
  const token = tokenStore.getAccess() ?? '';

  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    'X-Tenant-ID': getTenantId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...headers, ...((options.headers as Record<string, string>) ?? {}) },
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

  if (!res.ok) {
    const body = await res.json().catch(() => ({ errorCode: `HTTP_${res.status}` }));
    throw sanitizeHttpError({
      response: res,
      body,
      endpoint: path,
      method: options.method ?? 'GET',
    });
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

