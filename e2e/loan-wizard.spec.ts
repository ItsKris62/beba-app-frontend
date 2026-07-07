/**
 * Loan Application Wizard E2E Test
 *
 * Covers the second highest-risk member path: starting a loan application,
 * filling the first two steps, and confirming the Zustand draft actually
 * persists to sessionStorage (not localStorage) and survives a refresh —
 * the specific behavior Phase 2 built the wizard around.
 */

import { test, expect, type Page } from '@playwright/test';
import { createMockJwt } from './support/mock-jwt';

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const API_BASE = 'http://localhost:3001/api/v1';
const DRAFT_KEY = 'beba-loan-application-draft';

const MEMBER_CREDENTIALS = { email: 'member@test.beba.co.ke', password: 'Test1234!' };
const MEMBER_TOKEN = createMockJwt({
  sub: 'user-uuid-001',
  email: MEMBER_CREDENTIALS.email,
  role: 'MEMBER',
  tenantId: TENANT_ID,
  firstName: 'Test',
  lastName: 'Member',
});

async function injectTenantHeader(page: Page): Promise<void> {
  await page.route(`${API_BASE}/**`, (route) => {
    route.continue({ headers: { ...route.request().headers(), 'X-Tenant-ID': TENANT_ID } });
  });
}

async function mockRefresh(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/refresh`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { accessToken: MEMBER_TOKEN, refreshToken: 'mock-refresh-member' },
        error: null,
      }),
    });
  });
}

async function mockMemberLogin(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/login`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: MEMBER_TOKEN,
          refreshToken: 'mock-refresh-token-member',
          user: {
            id: 'user-uuid-001',
            email: MEMBER_CREDENTIALS.email,
            firstName: 'Test',
            lastName: 'Member',
            role: 'MEMBER',
            tenantId: TENANT_ID,
            mustChangePassword: false,
          },
        },
        error: null,
      }),
    });
  });
}

async function mockLoanApplyDependencies(page: Page): Promise<void> {
  await page.route(`${API_BASE}/members/dashboard`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          member: {
            id: 'member-uuid-001',
            memberNumber: 'MBR-001',
            name: 'Test Member',
            email: MEMBER_CREDENTIALS.email,
            kycStatus: 'APPROVED',
          },
          balances: { fosa: 200000, bosa: 100000, fosaAccountId: 'acc-fosa-1', bosaAccountId: 'acc-bosa-1' },
          activeLoans: [],
          recentTransactions: [],
          pendingGuarantorRequests: [],
        },
        error: null,
      }),
    });
  });

  await page.route(`${API_BASE}/loans/products*`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'product-1',
            name: 'Development Loan',
            description: 'General purpose development loan',
            minAmount: '1000',
            maxAmount: '500000',
            interestRate: '0.12',
            interestType: 'FLAT',
            maxTenureMonths: 24,
            processingFeeRate: '0.01',
            minGuarantors: 1,
            maxGuarantors: 3,
            guarantorCoverageRatio: '1',
            gracePeriodMonths: 0,
            gracePeriodDays: 14,
            isActive: true,
            savingsMultiplier: '3',
          },
        ],
        error: null,
      }),
    });
  });

  await page.route(`${API_BASE}/members/loans*`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { data: [], meta: { page: 1, limit: 50, total: 0 } }, error: null }),
    });
  });
}

/** The public footer fetches tenant branding on every page, including /login — stub it so it doesn't hit a real backend. */
async function mockTenantPublicInfo(page: Page): Promise<void> {
  await page.route(`${API_BASE}/tenants/public-info`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { name: 'Test SACCO', contactEmail: 'info@test.beba.co.ke', contactPhone: '0700000000', address: null, logoUrl: null },
        error: null,
      }),
    });
  });
}

async function loginAsMember(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email or Phone').fill(MEMBER_CREDENTIALS.email);
  await page.getByLabel('Password').fill(MEMBER_CREDENTIALS.password);
  await Promise.all([
    page.waitForURL('**/member/dashboard', { timeout: 10_000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
}

test.describe('Loan application wizard', () => {
  test.beforeEach(async ({ page }) => {
    await injectTenantHeader(page);
    await mockRefresh(page);
    await mockMemberLogin(page);
    await mockLoanApplyDependencies(page);
    await mockTenantPublicInfo(page);
  });

  test('wizard progress persists to sessionStorage (not localStorage) and survives a refresh', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/member/loans/apply');
    await page.waitForLoadState('networkidle');

    // Step 1: product
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Development Loan' }).click();
    await page.getByRole('button', { name: /^Continue$/ }).click();

    // Step 2: amount & tenure
    await expect(page.getByLabel('Amount (KES)')).toBeVisible();
    await page.getByLabel('Amount (KES)').fill('50000');
    await page.getByLabel('Tenure (months)').fill('12');
    await page.getByRole('button', { name: /^Continue$/ }).click();

    // Now on the guarantors step
    await expect(page.getByText(/Guarantor requirements/i)).toBeVisible();

    const draftBeforeReload = await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY);
    expect(draftBeforeReload).not.toBeNull();
    const parsedBefore = JSON.parse(draftBeforeReload as string);
    expect(parsedBefore.state.step).toBe('guarantors');
    expect(parsedBefore.state.principalAmount).toBe('50000');

    const localStorageDraft = await page.evaluate((key) => localStorage.getItem(key), DRAFT_KEY);
    expect(localStorageDraft).toBeNull();

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Still on the guarantors step after a refresh, not bounced back to step 1
    await expect(page.getByText(/Guarantor requirements/i)).toBeVisible({ timeout: 10_000 });

    const draftAfterReload = await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY);
    expect(draftAfterReload).toBe(draftBeforeReload);
  });
});
