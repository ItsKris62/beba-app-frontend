import { describe, expect, it } from 'vitest';
import { canApproveTransactions, canViewTransactions, isAdminRole, isMemberRole } from './permissions';

describe('transaction permissions', () => {
  it.each(['MANAGER', 'SUPER_ADMIN', 'TENANT_ADMIN', 'AUDITOR'])(
    'allows %s to view transactions',
    (role) => {
      expect(canViewTransactions(role)).toBe(true);
    },
  );

  it.each(['TELLER', 'MEMBER', 'LOAN_OFFICER'])(
    'blocks %s from viewing transactions',
    (role) => {
      expect(canViewTransactions(role)).toBe(false);
    },
  );

  it('normalizes role casing before checking access', () => {
    expect(canViewTransactions('manager')).toBe(true);
    expect(canViewTransactions('Tenant_Admin')).toBe(true);
    expect(canViewTransactions('loan_officer')).toBe(false);
  });

  it('keeps approval narrower than read-only transaction access', () => {
    expect(canApproveTransactions('MANAGER')).toBe(true);
    expect(canApproveTransactions('AUDITOR')).toBe(false);
    expect(canApproveTransactions()).toBe(false);
  });
});

describe('portal role families', () => {
  it('treats staff roles as admin portal roles', () => {
    expect(isAdminRole('MANAGER')).toBe(true);
    expect(isAdminRole('LOAN_OFFICER')).toBe(true);
    expect(isAdminRole('ACCOUNTANT')).toBe(true);
  });

  it('treats member and chairman as member portal roles', () => {
    expect(isMemberRole('MEMBER')).toBe(true);
    expect(isMemberRole('CHAIRMAN')).toBe(true);
  });

  it('does not classify chairman as an admin portal role', () => {
    expect(isAdminRole('CHAIRMAN')).toBe(false);
  });
});
