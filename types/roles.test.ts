import { describe, expect, it } from 'vitest';
import { isUserRole, normalizeRole } from './roles';

describe('role normalization', () => {
  it('normalizes lowercase, mixed case, and hyphenated role values', () => {
    expect(normalizeRole('manager')).toBe('MANAGER');
    expect(normalizeRole('Loan_Officer')).toBe('LOAN_OFFICER');
    expect(normalizeRole('tenant-admin')).toBe('TENANT_ADMIN');
  });

  it('returns null for undefined, blank, and unknown role inputs', () => {
    expect(normalizeRole()).toBeNull();
    expect(normalizeRole('')).toBeNull();
    expect(normalizeRole('   ')).toBeNull();
    expect(normalizeRole('BRANCH_MANAGER')).toBeNull();
  });

  it('identifies only supported SACCO roles', () => {
    expect(isUserRole('auditor')).toBe(true);
    expect(isUserRole('guest')).toBe(false);
  });
});
