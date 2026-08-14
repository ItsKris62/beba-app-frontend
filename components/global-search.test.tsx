import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  matchesSearchQuery,
  MAX_SEARCH_QUERY_LENGTH,
  sanitizeSearchQuery,
} from '@/lib/search/search-security';
import { getFilteredSearchItems } from '@/lib/search/search-registry';
import { GlobalSearchDialog } from './global-search-dialog';

// Mock next/navigation router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

describe('Search Security & Input Sanitization', () => {
  it('strips dangerous HTML and script tags from search query', () => {
    const maliciousInput = '<script>alert("xss")</script> password <iframe src="evil.com"></iframe>';
    const sanitized = sanitizeSearchQuery(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('<iframe>');
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).toBe('alert(xss) password');
  });

  it('removes null bytes, control characters, and injection quotes/brackets', () => {
    const inputWithControl = 'admin\x00"\'`$ query';
    const sanitized = sanitizeSearchQuery(inputWithControl);
    expect(sanitized).toBe('admin query');
  });

  it('truncates query length to MAX_SEARCH_QUERY_LENGTH to prevent DOS', () => {
    const longQuery = 'a'.repeat(200);
    const sanitized = sanitizeSearchQuery(longQuery);
    expect(sanitized.length).toBe(MAX_SEARCH_QUERY_LENGTH);
  });

  it('safely matches search query against target fields', () => {
    const target = {
      title: 'Member Applications',
      description: 'Review registration applications',
      category: 'Functions',
      keywords: ['onboarding', 'new member'],
    };

    expect(matchesSearchQuery('registration', target)).toBe(true);
    expect(matchesSearchQuery('onboarding', target)).toBe(true);
    expect(matchesSearchQuery('accounting', target)).toBe(false);
  });
});

describe('Role-Based Access Control (RBAC) Search Registry', () => {
  it('restricts MEMBER user to only Member portal items', () => {
    const items = getFilteredSearchItems('MEMBER', 'member');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.roles === 'ALL_MEMBERS')).toBe(true);

    const adminItem = items.find((item) => item.id === 'admin-tenants');
    expect(adminItem).toBeUndefined();
  });

  it('prevents TELLER from seeing Super Admin and Tenant settings', () => {
    const items = getFilteredSearchItems('TELLER', 'admin');
    const ids = items.map((i) => i.id);

    expect(ids).toContain('admin-members');
    expect(ids).not.toContain('admin-tenants');
    expect(ids).not.toContain('admin-settings');
    expect(ids).not.toContain('admin-system-health');
  });

  it('allows SUPER_ADMIN to see all admin items including Tenants', () => {
    const items = getFilteredSearchItems('SUPER_ADMIN', 'admin');
    const ids = items.map((i) => i.id);

    expect(ids).toContain('admin-tenants');
    expect(ids).toContain('admin-settings');
    expect(ids).toContain('admin-members');
  });

  it('grants LOAN_OFFICER access to Loan products and KYC queue', () => {
    const items = getFilteredSearchItems('LOAN_OFFICER', 'admin');
    const ids = items.map((i) => i.id);

    expect(ids).toContain('admin-loans');
    expect(ids).toContain('admin-loan-products');
    expect(ids).toContain('admin-kyc-queue');
    expect(ids).not.toContain('admin-tenants');
  });

  it('returns empty array if non-admin role attempts to access admin portal items', () => {
    const items = getFilteredSearchItems('MEMBER', 'admin');
    expect(items).toEqual([]);
  });
});

describe('GlobalSearchDialog UI Component', () => {
  it('renders correctly when open', () => {
    render(
      <GlobalSearchDialog
        open={true}
        onOpenChange={() => {}}
        userRole="SUPER_ADMIN"
        userType="admin"
      />
    );

    expect(screen.getByPlaceholderText(/Type a setting or function/i)).toBeDefined();
    expect(screen.getByText('Portal Search & Quick Actions')).toBeDefined();
  });
});
