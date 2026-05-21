import * as Sentry from '@sentry/nextjs';
import { DEFAULT_USER_ERROR_MESSAGE, getUserErrorMessage } from './error-message-registry';

export interface SanitizedApiError {
  code: string;
  message: string;
  requestId?: string;
  status?: number;
  retryAfterMs?: number | null;
  details?: never;
  debug?: ApiErrorDebug;
}

export interface ApiErrorDebug {
  endpoint?: string;
  method?: string;
  status?: number;
  backendCode?: string;
  requestId?: string;
  responseHeaders?: Record<string, string>;
  rawBody?: unknown;
  originalError?: unknown;
}

interface SanitizeHttpErrorInput {
  response: Response;
  body: unknown;
  endpoint: string;
  method: string;
}

interface SanitizeThrownErrorInput {
  error: unknown;
  endpoint?: string;
  method?: string;
  code?: string;
  status?: number;
}

const REQUEST_ID_HEADERS = [
  'x-request-id',
  'x-correlation-id',
  'x-amzn-trace-id',
  'cf-ray',
];

function headerRecord(headers?: Headers): Record<string, string> {
  if (!headers) return {};
  const values: Record<string, string> = {};
  headers.forEach((value, key) => {
    values[key.toLowerCase()] = value;
  });
  return values;
}

function readHeader(headers: Headers, names: string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return undefined;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number.parseInt(header, 10);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const joined = value.filter((item): item is string => typeof item === 'string').join('; ');
      if (joined.trim()) return joined.trim();
    }
  }
  return undefined;
}

function inferCode(body: unknown, status: number): string {
  const record = asRecord(body);
  const nestedError = asRecord(record.error);
  return (
    firstString(record.errorCode, record.code, nestedError.code, record.type, record.title) ??
    `HTTP_${status}`
  );
}

function hideDebug(error: SanitizedApiError, debug: ApiErrorDebug): SanitizedApiError {
  Object.defineProperty(error, 'debug', {
    value: debug,
    enumerable: false,
    configurable: false,
  });
  return error;
}

export function sanitizeHttpError({
  response,
  body,
  endpoint,
  method,
}: SanitizeHttpErrorInput): SanitizedApiError {
  const status = response.status;
  const backendCode = inferCode(body, status);
  const requestId =
    readHeader(response.headers, REQUEST_ID_HEADERS) ??
    firstString(asRecord(body).correlationId, asRecord(body).requestId);
  const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
  const message = getUserErrorMessage(backendCode, status);

  const sanitized: SanitizedApiError = {
    code: backendCode,
    message,
    requestId,
    status,
    retryAfterMs,
  };

  const debug: ApiErrorDebug = {
    endpoint,
    method,
    status,
    backendCode,
    requestId,
    responseHeaders: headerRecord(response.headers),
    rawBody: body,
  };

  reportApiError(debug, message);
  return hideDebug(sanitized, debug);
}

export function sanitizeThrownError({
  error,
  endpoint,
  method,
  code = 'NETWORK_ERROR',
  status = 0,
}: SanitizeThrownErrorInput): SanitizedApiError {
  const message = getUserErrorMessage(code, status) || DEFAULT_USER_ERROR_MESSAGE;
  const sanitized: SanitizedApiError = { code, message, status };
  const debug: ApiErrorDebug = {
    endpoint,
    method,
    status,
    backendCode: code,
    originalError: error,
  };
  reportApiError(debug, message);
  return hideDebug(sanitized, debug);
}

export function getSafeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return DEFAULT_USER_ERROR_MESSAGE;
}

export function reportApiError(debug: ApiErrorDebug, userMessage: string): void {
  const payload = {
    endpoint: debug.endpoint,
    method: debug.method,
    status: debug.status,
    backendCode: debug.backendCode,
    requestId: debug.requestId,
  };

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn('[api-error]', { ...payload, userMessage, debug });
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel((debug.status ?? 0) >= 500 ? 'error' : 'warning');
    scope.setTags({
      endpoint: debug.endpoint ?? 'unknown',
      method: debug.method ?? 'GET',
      backend_code: debug.backendCode ?? 'unknown',
    });
    scope.setContext('api_error', payload);
    if (debug.requestId) scope.setTag('request_id', debug.requestId);
    Sentry.captureMessage(userMessage, (debug.status ?? 0) >= 500 ? 'error' : 'warning');
  });
}

export function reportClientError(error: unknown, context: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error('[client-error]', { error, context });
    return;
  }

  Sentry.withScope((scope) => {
    scope.setContext('client_error', context);
    Sentry.captureException(error);
  });
}
