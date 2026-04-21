/**
 * Data Import API client – Sprint 2
 * Wraps all /admin/data-import endpoints
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
  const tenantId = typeof window !== 'undefined' ? (localStorage.getItem('tenantId') ?? '') : '';

  // Don't set Content-Type for FormData (browser sets it with boundary)
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? 'API error');
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportPreviewRow {
  rowNumber: number;
  legacyNo: string | null;
  firstName: string;
  lastName: string;
  rawIdNumber: string | null;
  idNumber: string | null;
  rawPhone: string | null;
  phoneNumber: string | null;
  stageName: string | null;
  position: string;
  nextOfKinPhone: string | null;
  status: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE';
  action: 'CREATE' | 'UPDATE' | 'SKIP';
  errors: Array<{ field: string; value: string | null; reason: string; errorCode: string }>;
  warnings: Array<{ field: string; value: string | null; reason: string; errorCode: string }>;
  fuzzyStageMatch?: { original: string; matched: string; confidence: number };
}

export interface ImportPreviewReport {
  importLogId: string;
  fileName: string;
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  rows: ImportPreviewRow[];
  stagesSummary: Array<{ name: string; count: number; isNew: boolean }>;
  canProceed: boolean;
}

export interface ImportJobStatus {
  jobId: string;
  importLogId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  warningCount: number;
  skippedCount: number;
  dryRun: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ImportHistoryItem {
  id: string;
  batchId: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  failedCount: number;
  warningCount: number;
  status: string;
  dryRun: boolean;
  queueJobId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** Upload CSV and get preview report (no DB writes) */
export async function previewImport(file: File, wardId: string): Promise<ImportPreviewReport> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('wardId', wardId);
  return apiFetch<ImportPreviewReport>('/admin/data-import/preview', {
    method: 'POST',
    body: formData,
  });
}

/** Execute the import job (queues BullMQ job) */
export async function executeImport(
  importLogId: string,
  dryRun = false,
): Promise<{ jobId: string; importLogId: string; status: string; message: string }> {
  return apiFetch('/admin/data-import/execute', {
    method: 'POST',
    body: JSON.stringify({ importLogId, dryRun }),
  });
}

/** Poll job status */
export async function getImportJobStatus(jobId: string): Promise<ImportJobStatus> {
  return apiFetch<ImportJobStatus>(`/admin/data-import/jobs/${jobId}`);
}

/** Get detailed job report */
export async function getImportJobReport(
  jobId: string,
): Promise<ImportJobStatus & { reportData: unknown; errorDetails: unknown }> {
  return apiFetch(`/admin/data-import/jobs/${jobId}/report`);
}

/** Get import history */
export async function getImportHistory(): Promise<{ data: ImportHistoryItem[]; total: number }> {
  return apiFetch('/admin/data-import/history');
}

/** Retry failed records from a completed job */
export async function retryFailedImport(
  importLogId: string,
): Promise<{ jobId: string; importLogId: string; retryCount: number; status: string }> {
  return apiFetch('/admin/data-import/retry-failed', {
    method: 'POST',
    body: JSON.stringify({ importLogId }),
  });
}
