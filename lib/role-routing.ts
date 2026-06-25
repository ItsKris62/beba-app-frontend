import { isAdminRole, isMemberRole } from './permissions';
import { normalizeRole, type UserRole } from '@/types/roles';

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  TENANT_ADMIN: '/admin/dashboard',
  MANAGER: '/admin/dashboard',
  AUDITOR: '/admin/dashboard',
  TELLER: '/admin/members',
  LOAN_OFFICER: '/admin/loans',
  ACCOUNTANT: '/admin/accounting',
  MEMBER: '/member/dashboard',
  CHAIRMAN: '/member/dashboard',
};

export function getDefaultPortalRoute(role?: string | null): string {
  const normalized = normalizeRole(role);
  return normalized ? ROLE_HOME_ROUTES[normalized] : '/login';
}

export function isPortalRoute(pathname?: string | null): boolean {
  return Boolean(
    pathname &&
      (pathname === '/admin' ||
        pathname.startsWith('/admin/') ||
        pathname === '/member' ||
        pathname.startsWith('/member/')),
  );
}

export function canAccessPortalRoute(role?: string | null, pathname?: string | null): boolean {
  const normalized = normalizeRole(role);
  if (!normalized || !pathname) return false;

  if (pathname === '/change-password' || pathname.startsWith('/change-password/')) {
    return true;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return isAdminRole(normalized);
  }

  if (pathname === '/member' || pathname.startsWith('/member/')) {
    return isMemberRole(normalized);
  }

  return true;
}

function isSafeInternalPath(pathname?: string | null): pathname is string {
  return Boolean(
    pathname &&
      pathname.startsWith('/') &&
      !pathname.startsWith('//') &&
      !pathname.includes('://'),
  );
}

export function resolvePostLoginRedirect(
  userOrRole?: { role?: string | null; mustChangePassword?: boolean } | string | null,
  returnTo?: string | null,
): string {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;

  if (typeof userOrRole === 'object' && userOrRole?.mustChangePassword) {
    return '/change-password';
  }

  if (
    isSafeInternalPath(returnTo) &&
    isPortalRoute(returnTo) &&
    canAccessPortalRoute(role, returnTo)
  ) {
    return returnTo;
  }

  return getDefaultPortalRoute(role);
}
