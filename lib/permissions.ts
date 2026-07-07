import { normalizeRole, type UserRole } from '@/types/roles';

export const ADMIN_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
  'TELLER',
  'AUDITOR',
  'LOAN_OFFICER',
  'ACCOUNTANT',
];

export const MEMBER_ROLES: UserRole[] = ['MEMBER', 'CHAIRMAN'];

export const TRANSACTION_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
  'AUDITOR',
];

const TRANSACTION_APPROVAL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
];

/** Returns true when the role can access admin portal routes. */
export function isAdminRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? ADMIN_ROLES.includes(normalized) : false;
}

/** Returns true when the role is a SACCO member role. */
export function isMemberRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? MEMBER_ROLES.includes(normalized) : false;
}

/** Returns true when the role can view the admin transactions page and API data. */
export function canViewTransactions(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? TRANSACTION_ROLES.includes(normalized) : false;
}

/** Returns true when the role can approve transaction-level financial actions. */
export function canApproveTransactions(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? TRANSACTION_APPROVAL_ROLES.includes(normalized) : false;
}

/** Returns true when the role can write ordinary admin records. */
export function canWriteAdminRecords(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'TELLER'].includes(normalized) : false;
}

/** Returns true when the role can approve, reject, or disburse loans. */
export function canApproveLoans(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'].includes(normalized) : false;
}

/** Mirrors the backend's @Roles(MANAGER, TELLER) guard on POST :id/approval-chain/sign. */
export function canSignApprovalChain(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  return normalized ? ['MANAGER', 'TELLER'].includes(normalized) : false;
}

/** Returns true when the role can administer platform tenants. */
export function isSuperAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === 'SUPER_ADMIN';
}
