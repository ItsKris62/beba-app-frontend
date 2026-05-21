export const DEFAULT_USER_ERROR_MESSAGE =
  'We encountered an unexpected issue. Please try again shortly. If it continues, contact support.';

export type ErrorMessageKey =
  | string
  | `HTTP_${number}`
  | `${string}_${number}_${string}`;

export const ERROR_MESSAGE_REGISTRY: Record<ErrorMessageKey, string> = {
  AUTH_401_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_401_INVALID: 'Please log in again to continue.',
  AUTH_403_FORBIDDEN: 'You do not have permission to perform this action.',
  AUTH_429_RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',

  VALIDATION_400: 'Please check the highlighted details and try again.',
  VALIDATION_422: 'Some details need correction before we can continue.',
  KYC_REQUIRED: 'Update your ID and KYC documents in the KYC section to proceed.',
  KYC_REJECTED: 'Your KYC documents need an update. Please review the KYC section.',
  DUPLICATE_REQUEST: 'This request has already been submitted. Please wait for it to finish.',

  MPESA_TIMEOUT: 'The M-Pesa request timed out. Check your phone, then try again if no prompt appears.',
  MPESA_FAILED: 'The M-Pesa payment was not completed. Please try again.',
  MPESA_RATE_LIMITED: 'You have made several M-Pesa requests today. Please try again later.',

  LOAN_LIMIT_EXCEEDED: 'The amount is above your current loan limit. Choose a lower amount or contact the SACCO.',
  LOAN_HAS_ACTIVE: 'You already have an active loan. Apply again after it is cleared.',
  GUARANTOR_NOT_ELIGIBLE: 'This member is not eligible to guarantee this loan. Choose another guarantor.',
  GUARANTOR_LIMIT_REACHED: 'This loan has reached the allowed number of guarantors.',

  HTTP_400: 'Please check the details entered and try again.',
  HTTP_401: 'Your session has expired. Please log in again.',
  HTTP_403: 'You do not have permission to perform this action.',
  HTTP_404: 'We could not find that record. Please refresh and try again.',
  HTTP_408: 'The request took too long. Please try again.',
  HTTP_409: 'This action conflicts with an existing record. Please refresh and try again.',
  HTTP_422: 'Some details need correction before we can continue.',
  HTTP_429: 'Too many requests. Please wait a moment and try again.',
  HTTP_500: 'The service is having a problem. Please try again shortly.',
  HTTP_502: 'The service is temporarily unavailable. Please try again shortly.',
  HTTP_503: 'The service is temporarily unavailable. Please try again shortly.',
  HTTP_504: 'The service took too long to respond. Please try again.',

  NETWORK_ERROR: 'We could not reach the service. Check your internet connection and try again.',
  PARSE_ERROR: 'We received an unexpected response. Please refresh and try again.',
  CIRCUIT_OPEN: 'This service is temporarily unavailable. Please try again shortly.',
};

const CODE_ALIASES: Record<string, ErrorMessageKey> = {
  UnauthorizedException: 'HTTP_401',
  ForbiddenException: 'HTTP_403',
  BadRequestException: 'HTTP_400',
  ValidationError: 'VALIDATION_400',
  UnprocessableEntityException: 'HTTP_422',
  ConflictException: 'HTTP_409',
  NotFoundException: 'HTTP_404',
  TooManyRequestsException: 'HTTP_429',
  InternalServerError: 'HTTP_500',
  InternalServerErrorException: 'HTTP_500',
  ServiceUnavailableException: 'HTTP_503',
};

export function getUserErrorMessage(code: string | null | undefined, status?: number): string {
  const normalizedCode = code?.trim();
  if (normalizedCode) {
    const direct = ERROR_MESSAGE_REGISTRY[normalizedCode];
    if (direct) return direct;

    const alias = CODE_ALIASES[normalizedCode];
    if (alias && ERROR_MESSAGE_REGISTRY[alias]) return ERROR_MESSAGE_REGISTRY[alias];

    const upper = normalizedCode.toUpperCase();
    if (upper.includes('MPESA') && upper.includes('TIMEOUT')) return ERROR_MESSAGE_REGISTRY.MPESA_TIMEOUT;
    if (upper.includes('MPESA') && upper.includes('RATE')) return ERROR_MESSAGE_REGISTRY.MPESA_RATE_LIMITED;
    if (upper.includes('MPESA')) return ERROR_MESSAGE_REGISTRY.MPESA_FAILED;
    if (upper.includes('KYC') && upper.includes('REJECT')) return ERROR_MESSAGE_REGISTRY.KYC_REJECTED;
    if (upper.includes('KYC')) return ERROR_MESSAGE_REGISTRY.KYC_REQUIRED;
    if (upper.includes('GUARANTOR') && upper.includes('LIMIT')) return ERROR_MESSAGE_REGISTRY.GUARANTOR_LIMIT_REACHED;
    if (upper.includes('GUARANTOR')) return ERROR_MESSAGE_REGISTRY.GUARANTOR_NOT_ELIGIBLE;
    if (upper.includes('DUPLICATE') || upper.includes('UNIQUE')) return ERROR_MESSAGE_REGISTRY.DUPLICATE_REQUEST;
  }

  if (typeof status === 'number') {
    return ERROR_MESSAGE_REGISTRY[`HTTP_${status}`] ?? DEFAULT_USER_ERROR_MESSAGE;
  }

  return DEFAULT_USER_ERROR_MESSAGE;
}
