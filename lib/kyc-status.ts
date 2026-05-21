export const KycStatusAlias = {
  DRAFT: 'PENDING_UPLOAD',
  SUBMITTED: 'PENDING_REVIEW',
  UNDER_REVIEW: 'PENDING_REVIEW',
  VERIFIED: 'APPROVED',
  REJECTED: 'REJECTED',
  QUARANTINE: 'QUARANTINE',
} as const;

export type BusinessKycStatus = keyof typeof KycStatusAlias;
export type StatusBadgeVariant = 'default' | 'secondary' | 'destructive' | 'warning' | 'success';

const INTERNAL_TO_BUSINESS: Record<string, BusinessKycStatus> = {
  PENDING_UPLOAD: 'DRAFT',
  PENDING_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'VERIFIED',
  REJECTED: 'REJECTED',
  QUARANTINE: 'QUARANTINE',
};

export function getBusinessStatusDisplay(status: string): string {
  return INTERNAL_TO_BUSINESS[status] ?? status;
}

export function getFormattedStatusLabel(status: string): string {
  return getBusinessStatusDisplay(status)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusBadgeVariant(status: string): StatusBadgeVariant {
  switch (getBusinessStatusDisplay(status)) {
    case 'VERIFIED':
      return 'success';
    case 'REJECTED':
      return 'destructive';
    case 'UNDER_REVIEW':
    case 'SUBMITTED':
    case 'QUARANTINE':
      return 'warning';
    case 'DRAFT':
      return 'secondary';
    default:
      return 'default';
  }
}

export function isKycVerified(status: string | null | undefined): boolean {
  return !!status && getBusinessStatusDisplay(status) === 'VERIFIED';
}
