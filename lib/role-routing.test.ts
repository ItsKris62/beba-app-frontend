import { describe, expect, it } from 'vitest';
import {
  canAccessPortalRoute,
  getDefaultPortalRoute,
  resolvePostLoginRedirect,
} from './role-routing';

describe('role portal routing', () => {
  it.each([
    ['SUPER_ADMIN', '/admin/dashboard'],
    ['TENANT_ADMIN', '/admin/dashboard'],
    ['MANAGER', '/admin/dashboard'],
    ['AUDITOR', '/admin/dashboard'],
    ['TELLER', '/admin/members'],
    ['LOAN_OFFICER', '/admin/loans'],
    ['ACCOUNTANT', '/admin/accounting'],
    ['MEMBER', '/member/dashboard'],
    ['CHAIRMAN', '/member/dashboard'],
  ])('routes %s to %s by default', (role, route) => {
    expect(getDefaultPortalRoute(role)).toBe(route);
  });

  it('preserves a safe returnTo when the role can access it', () => {
    expect(resolvePostLoginRedirect({ role: 'member' }, '/member/loans')).toBe('/member/loans');
    expect(resolvePostLoginRedirect({ role: 'loan_officer' }, '/admin/loans')).toBe('/admin/loans');
  });

  it('rejects cross-portal and external returnTo values', () => {
    expect(resolvePostLoginRedirect({ role: 'MEMBER' }, '/admin/dashboard')).toBe('/member/dashboard');
    expect(resolvePostLoginRedirect({ role: 'ACCOUNTANT' }, '/member/dashboard')).toBe('/admin/accounting');
    expect(resolvePostLoginRedirect({ role: 'MANAGER' }, 'https://evil.example')).toBe('/admin/dashboard');
    expect(resolvePostLoginRedirect({ role: 'MANAGER' }, '//evil.example')).toBe('/admin/dashboard');
  });

  it('sends password-change users to the password reset portal first', () => {
    expect(resolvePostLoginRedirect({ role: 'MANAGER', mustChangePassword: true }, '/admin/dashboard')).toBe(
      '/change-password',
    );
  });

  it('enforces admin and member portal boundaries', () => {
    expect(canAccessPortalRoute('MEMBER', '/member/dashboard')).toBe(true);
    expect(canAccessPortalRoute('MEMBER', '/admin/dashboard')).toBe(false);
    expect(canAccessPortalRoute('LOAN_OFFICER', '/admin/loans')).toBe(true);
    expect(canAccessPortalRoute('LOAN_OFFICER', '/member/dashboard')).toBe(false);
    expect(canAccessPortalRoute('CHAIRMAN', '/member/dashboard')).toBe(true);
    expect(canAccessPortalRoute('CHAIRMAN', '/admin/dashboard')).toBe(false);
  });
});
