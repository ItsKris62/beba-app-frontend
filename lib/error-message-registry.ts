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

  // Real codes emitted by MpesaExceptionFilter as a bare `error` string (verified against backend source).
  MPESA_CONFIG_MISSING: 'Payment service is not properly configured. Please contact support.',
  MPESA_NETWORK_ERROR: 'M-Pesa is temporarily unavailable. Please try again in a few minutes.',
  MPESA_SERVICE_UNAVAILABLE: 'M-Pesa is temporarily unavailable. Please try again in a few minutes.',
  MPESA_OAUTH_FAILED: 'Payment processing failed. Please try again or contact support.',
  MPESA_API_ERROR: 'Payment processing failed. Please try again or contact support.',

  LOAN_LIMIT_EXCEEDED: 'The amount is above your current loan limit. Choose a lower amount or contact the SACCO.',
  LOAN_HAS_ACTIVE: 'You already have an active loan. Apply again after it is cleared.',
  GUARANTOR_NOT_ELIGIBLE: 'This member is not eligible to guarantee this loan. Choose another guarantor.',
  GUARANTOR_LIMIT_REACHED: 'This loan has reached the allowed number of guarantors.',

  // Domain codes embedded as a "CODE: message" prefix inside the backend's `detail`
  // field (verified against backend source — not a separate errorCode field).
  IDEMPOTENCY_KEY_REQUIRED: 'This request is still processing. Please wait a moment and try again.',
  ONE_OPEN_LOAN_ONLY: 'You already have an active loan. You can apply again once it is fully paid.',
  INSUFFICIENT_COVERAGE: 'The selected guarantors do not cover the required amount for this loan.',
  GUARANTOR_ACCOUNT_NOT_FOUND: 'One of your guarantors does not have an active account for this loan type.',
  GUARANTOR_INSUFFICIENT_FUNDS: 'One of your guarantors does not have enough available savings to guarantee this amount.',
  DUPLICATE_GUARANTOR: 'The same guarantor was selected more than once.',
  INVALID_GUARANTEE_AMOUNT: 'Each guarantee amount must be greater than zero.',
  INVALID_ID_NUMBER: 'Enter a valid 7-8 digit Kenyan National ID number.',
  INVALID_SEARCH_QUERY: 'Enter at least 3 characters of a name, or a 7-8 digit National ID.',
  GUARANTOR_NOT_FOUND: 'No active SACCO member was found for that National ID.',
  INVALID_GUARANTOR_ACTION: 'Please choose to accept or decline the request.',
  GUARANTOR_NOT_ACTIVE: 'You must be an active SACCO member to guarantee this loan.',
  GUARANTOR_KYC_NOT_VERIFIED: 'Your KYC must be verified before you can guarantee a loan.',
  SELF_GUARANTEE_NOT_ALLOWED: 'You cannot guarantee your own loan.',
  ADMIN_OVERRIDE_REASON_REQUIRED: 'Please provide a reason for this override.',

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

// Exact-text fallbacks for verified backend validation messages that carry no
// "CODE:" prefix (plain BadRequestException strings). Curated deliberately —
// only messages confirmed against backend source get surfaced verbatim-ish;
// anything unrecognized still falls through to the generic HTTP_{status} copy.
const KNOWN_MESSAGE_TEXT: Record<string, string> = {
  'Insufficient FOSA available balance': 'You do not have enough available balance in your FOSA account for this transaction.',
  'Minimum deposit amount is KES 10': 'The minimum deposit amount is KES 10.',
  'Minimum withdrawal amount is 10 KES': 'The minimum withdrawal amount is KES 10.',
  'Phone must be in 254XXXXXXXXX format': 'Enter a valid phone number in the format 254XXXXXXXXX.',
  'Must be a valid Kenyan phone number': 'Enter a valid Kenyan phone number.',
  'KYC verification required before applying for a loan': 'Your KYC must be verified before you can apply for a loan.',
  'Member is blacklisted and cannot apply for loans': 'This account is not eligible to apply for loans. Please contact support.',
  'Loan product not found or inactive': 'This loan product is no longer available.',
  'Member has an active defaulted loan': 'You have a defaulted loan on your account. Please contact the SACCO before applying again.',
  'No active FOSA or BOSA account found': 'You need an active savings account before applying for a loan.',
  'At least one guarantor is required': 'Select at least one guarantor to send a request.',
  'This member has already been requested or has already accepted.': 'This member has already been invited or has already responded.',
  'Approved KYC document IDs are required for approval': 'Select at least one approved document before approving KYC.',
  'Reviewer notes are required when rejecting KYC': "Add a reason before rejecting this member's KYC.",
  'KYC approval checklist is required': 'Complete the KYC checklist before approving.',
  'This user has already set their own password. No temporary password is available to reveal.':
    'This user has already logged in and set their own password, so there is no temporary password left to reveal.',
};

export function getUserErrorMessage(
  code: string | null | undefined,
  status?: number,
  detailText?: string,
): string {
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

  if (detailText) {
    const known = KNOWN_MESSAGE_TEXT[detailText.trim()];
    if (known) return known;
  }

  if (typeof status === 'number') {
    return ERROR_MESSAGE_REGISTRY[`HTTP_${status}`] ?? DEFAULT_USER_ERROR_MESSAGE;
  }

  return DEFAULT_USER_ERROR_MESSAGE;
}
