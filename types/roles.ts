export const USER_ROLES = [
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'MANAGER',
  'AUDITOR',
  'TELLER',
  'MEMBER',
  'LOAN_OFFICER',
  'CHAIRMAN',
  'ACCOUNTANT',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const ROLE_SET = new Set<string>(USER_ROLES);

/** Normalizes API, JWT, and UI role values to the backend's uppercase enum form. */
export function normalizeRole(role?: string | null): UserRole | null {
  if (!role) return null;
  const normalized = role.trim().toUpperCase().replace(/-/g, '_');
  return ROLE_SET.has(normalized) ? (normalized as UserRole) : null;
}

/** Returns true when a role string is recognized by the SACCO role model. */
export function isUserRole(role?: string | null): role is UserRole {
  return normalizeRole(role) !== null;
}
