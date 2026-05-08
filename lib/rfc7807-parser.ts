/**
 * RFC 7807 Problem Detail Parser
 *
 * Parses `application/problem+json` responses from the Beba SACCO backend
 * into a typed, user-friendly error structure.
 *
 * Usage:
 *   const problem = parseProblemDetail(response);
 *   if (problem) toast.error(problem.userMessage);
 */

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string | string[];
  instance: string;
  correlationId?: string;
  timestamp: string;
  errorCode: string;
  stack?: string;
}

export interface ParsedError {
  code: string;
  title: string;
  message: string;
  userMessage: string;
  correlationId: string | null;
  status: number;
  isRetryable: boolean;
  retryAfterMs: number | null;
}

/**
 * Determine if an HTTP status code represents a retryable error.
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Parse Retry-After header value (seconds or HTTP date).
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

/**
 * Map backend error codes to user-friendly Swahili/English messages.
 */
function userMessageFor(problem: ProblemDetail): string {
  const map: Record<string, string> = {
    ConflictException: 'Ombi limeshatumwa. Tafadhali subiri. / Request already submitted. Please wait.',
    BadRequestException: 'Taarifa zilizotolewa sio sahihi. / The information provided is incorrect.',
    UnauthorizedException: 'Muda wako umeisha. Tafadhali ingia tena. / Your session has expired. Please log in again.',
    ForbiddenException: 'Huna ruhusa kufanya hivi. / You do not have permission to perform this action.',
    NotFoundException: 'Taarifa hizi hazipatikani. / These records were not found.',
    UnprocessableEntityException: 'Ombi lako halikubaliki. / Your request could not be processed.',
    InternalServerError: 'Tatizo la mfumo. Tafadhali jaribu tena baadaye. / System error. Please try again later.',
    ServiceUnavailableException: 'Mfumo haupatikani kwa sasa. / The system is temporarily unavailable.',
  };

  return (
    map[problem.errorCode] ??
    (typeof problem.detail === 'string'
      ? problem.detail
      : Array.isArray(problem.detail)
        ? problem.detail.join('; ')
        : problem.title)
  );
}

/**
 * Parse an HTTP Response or JSON object into a structured ParsedError.
 *
 * @param response — fetch Response, supertest response, or raw object
 * @returns ParsedError or null if not a problem+json response
 */
export function parseProblemDetail(
  response: Response | { status: number; headers: Record<string, string>; json: () => Promise<unknown> } | unknown,
): ParsedError | null {
  // If it's a fetch Response
  if (response && typeof (response as Response).json === 'function') {
    const res = response as Response;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('problem+json')) {
      return null;
    }
    // Can't parse async here — caller should await json() first
    return null;
  }

  // If it's already a parsed object
  if (response && typeof response === 'object' && response !== null) {
    const obj = response as Record<string, unknown>;
    if (!('type' in obj) || !('status' in obj)) {
      return null;
    }

    const problem: ProblemDetail = {
      type: String(obj.type || ''),
      title: String(obj.title || ''),
      status: Number(obj.status || 500),
      detail: Array.isArray(obj.detail) ? obj.detail : String(obj.detail || ''),
      instance: String(obj.instance || ''),
      correlationId: obj.correlationId ? String(obj.correlationId) : undefined,
      timestamp: String(obj.timestamp || new Date().toISOString()),
      errorCode: String(obj.errorCode || 'UnknownError'),
      stack: obj.stack ? String(obj.stack) : undefined,
    };

    const retryAfter = obj.retryAfter ? String(obj.retryAfter) : null;

    return {
      code: problem.errorCode,
      title: problem.title,
      message: typeof problem.detail === 'string' ? problem.detail : problem.detail.join('; '),
      userMessage: userMessageFor(problem),
      correlationId: problem.correlationId ?? null,
      status: problem.status,
      isRetryable: isRetryableStatus(problem.status),
      retryAfterMs: retryAfter ? parseRetryAfter(retryAfter) : null,
    };
  }

  return null;
}

/**
 * Async version for fetch responses.
 */
export async function parseProblemDetailAsync(response: Response): Promise<ParsedError | null> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('problem+json')) {
    return null;
  }

  try {
    const body = await response.json();
    return parseProblemDetail(body);
  } catch {
    return null;
  }
}

/**
 * React-friendly hook: converts any API error into a displayable string.
 */
export function useApiError() {
  return {
    parse: parseProblemDetail,
    parseAsync: parseProblemDetailAsync,
    formatForToast(error: ParsedError | null): string {
      if (!error) return 'Tatizo lisilojulikana. / An unknown error occurred.';
      return error.userMessage;
    },
    shouldRetry(error: ParsedError | null): boolean {
      return error?.isRetryable ?? false;
    },
  };
}
