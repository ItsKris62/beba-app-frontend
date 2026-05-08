/**
 * Enhanced API Client with Retry/Backoff Logic
 *
 * Extends the base api-client.ts with:
 * - RFC 7807 problem+json parsing
 * - Exponential backoff for 5xx and 429 errors
 * - Idempotency-Key injection for mutations
 * - Circuit breaker pattern for repeated failures
 * - Shared retry queue to prevent thundering herd
 */

import { parseProblemDetailAsync, type ParsedError } from './rfc7807-parser';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Tenant ID resolved at runtime */
function getTenantId(): string {
  if (process.env.NEXT_PUBLIC_TENANT_ID) return process.env.NEXT_PUBLIC_TENANT_ID;
  if (typeof window !== 'undefined') return localStorage.getItem('beba_tenant_id') ?? '';
  return '';
}

/** Token storage helpers */
const TOKEN_KEY = 'beba_access_token';
const REFRESH_KEY = 'beba_refresh_token';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('beba_user');
  localStorage.removeItem('beba_tenant_id');
}

// ─── Circuit Breaker State ───────────────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitStates: Record<string, CircuitState> = {};
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_TIMEOUT_MS = 30000;

function getCircuitState(endpoint: string): CircuitState {
  if (!circuitStates[endpoint]) {
    circuitStates[endpoint] = { failures: 0, lastFailure: 0, isOpen: false };
  }
  return circuitStates[endpoint];
}

function recordFailure(endpoint: string) {
  const state = getCircuitState(endpoint);
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= CIRCUIT_THRESHOLD) {
    state.isOpen = true;
    // eslint-disable-next-line no-console
    console.warn(`[CircuitBreaker] OPEN for ${endpoint}`);
  }
}

function recordSuccess(endpoint: string) {
  const state = getCircuitState(endpoint);
  state.failures = 0;
  state.isOpen = false;
}

function isCircuitOpen(endpoint: string): boolean {
  const state = getCircuitState(endpoint);
  if (!state.isOpen) return false;
  if (Date.now() - state.lastFailure > CIRCUIT_TIMEOUT_MS) {
    state.isOpen = false;
    state.failures = 0;
    return false;
  }
  return true;
}

// ─── Exponential Backoff ─────────────────────────────────────────────────────

function backoffDelay(attempt: number, baseDelay = 500, maxDelay = 8000): number {
  const jitter = Math.random() * 200;
  return Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

let isRefreshing = false;
const refreshSubscribers: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': getTenantId(),
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const json = await res.json();
    const accessToken = json.data?.accessToken ?? json.accessToken;
    const newRefresh = json.data?.refreshToken ?? json.refreshToken;

    if (accessToken && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, accessToken);
      if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
    }
    return accessToken || null;
  } catch {
    clearAuth();
    return null;
  }
}

// ─── Core Fetch with Retry ───────────────────────────────────────────────────

export interface FetchOptions extends RequestInit {
  retries?: number;
  idempotencyKey?: string;
  skipCircuitBreaker?: boolean;
}

export interface ApiResult<T> {
  success: boolean;
  data: T | null;
  error: ParsedError | null;
  status: number;
}

export async function apiFetchWithRetry<T>(
  path: string,
  options: FetchOptions = {},
): Promise<ApiResult<T>> {
  const {
    retries = 2,
    idempotencyKey,
    skipCircuitBreaker = false,
    ...fetchOptions
  } = options;

  const endpoint = path.split('?')[0];

  // Circuit breaker check
  if (!skipCircuitBreaker && isCircuitOpen(endpoint)) {
    return {
      success: false,
      data: null,
      error: {
        code: 'CIRCUIT_OPEN',
        title: 'Service Temporarily Unavailable',
        message: 'Too many failures on this endpoint. Please try again later.',
        userMessage: 'Huduma haipatikani kwa sasa. Tafadhali jaribu tena baadaye.',
        correlationId: null,
        status: 503,
        isRetryable: true,
        retryAfterMs: 30000,
      },
      status: 503,
    };
  }

  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': getTenantId(),
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  const url = `${API_BASE}${path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });

      // Handle 429 — parse Retry-After and back off
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffDelay(attempt);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        const problem = await parseProblemDetailAsync(res);
        return { success: false, data: null, error: problem, status: 429 };
      }

      // Handle 401 — attempt refresh once
      if (res.status === 401) {
        if (!isRefreshing) {
          isRefreshing = true;
          const newToken = await doRefresh();
          isRefreshing = false;
          refreshSubscribers.forEach((cb) => cb(newToken));
          refreshSubscribers.length = 0;

          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            // Retry immediately with new token
            const retryRes = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });
            if (retryRes.ok) {
              const data = await retryRes.json();
              recordSuccess(endpoint);
              return { success: true, data, error: null, status: retryRes.status };
            }
          }
        } else {
          // Queue this request behind the in-flight refresh
          const newToken = await new Promise<string | null>((resolve) => {
            refreshSubscribers.push((token) => resolve(token));
          });
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryRes = await fetch(url, { ...fetchOptions, headers, credentials: 'include' });
            if (retryRes.ok) {
              const data = await retryRes.json();
              recordSuccess(endpoint);
              return { success: true, data, error: null, status: retryRes.status };
            }
          }
        }

        // Refresh failed — redirect to login
        if (typeof window !== 'undefined') {
          clearAuth();
          window.location.href = '/login';
        }
        return { success: false, data: null, error: null, status: 401 };
      }

      // Retry on 5xx
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffDelay(attempt)));
        continue;
      }

      // Parse problem+json on error
      if (!res.ok) {
        const problem = await parseProblemDetailAsync(res);
        if (res.status >= 500) recordFailure(endpoint);
        return { success: false, data: null, error: problem, status: res.status };
      }

      // Success
      recordSuccess(endpoint);
      const data = res.status === 204 ? null : await res.json();
      return { success: true, data, error: null, status: res.status };
    } catch (networkErr) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffDelay(attempt)));
        continue;
      }
      recordFailure(endpoint);
      return {
        success: false,
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          title: 'Network Error',
          message: networkErr instanceof Error ? networkErr.message : 'Network error',
          userMessage: 'Tatizo la mtandao. Tafadhali angalia muunganiko wako.',
          correlationId: null,
          status: 0,
          isRetryable: true,
          retryAfterMs: 5000,
        },
        status: 0,
      };
    }
  }

  // Should never reach here
  return { success: false, data: null, error: null, status: 0 };
}

/**
 * Generate a unique idempotency key for mutations.
 */
export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${crypto?.randomUUID?.() ?? ''}`;
}

/**
 * Polling helper for async jobs (reports, M-Pesa deposits).
 */
export async function pollJobStatus<T>(
  statusUrl: string,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatusChange?: (status: string) => void;
    terminalStatuses?: string[];
  } = {},
): Promise<ApiResult<T>> {
  const {
    intervalMs = 2000,
    timeoutMs = 120000,
    onStatusChange,
    terminalStatuses = ['SUCCEEDED', 'FAILED', 'EXPIRED'],
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const res = await apiFetchWithRetry<T>(statusUrl, { retries: 0 });

    if (!res.success) {
      // Non-terminal error — keep polling
      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      return res;
    }

    const status = (res.data as any)?.status ?? '';
    onStatusChange?.(status);

    if (terminalStatuses.includes(status)) {
      return res;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return {
    success: false,
    data: null,
    error: {
      code: 'POLL_TIMEOUT',
      title: 'Polling Timeout',
      message: 'Job status polling timed out',
      userMessage: 'Muda wa kusubiri umeisha. Tafadhali angalia hali baadaye.',
      correlationId: null,
      status: 408,
      isRetryable: true,
      retryAfterMs: 10000,
    },
    status: 408,
  };
}
