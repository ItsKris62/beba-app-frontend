/**
 * Auth & Dashboard E2E Test
 *
 * Covers the highest-traffic member path: login -> dashboard loads -> the
 * M-Pesa deposit UI walks through its pending/success states correctly.
 * All backend calls are mocked via page.route(); no real M-Pesa/STK
 * integration is exercised here (see PHASE3 notes — that needs a real
 * backend/sandbox, not something to fake in an E2E test).
 */

import { test, expect, type Page } from '@playwright/test';
import { createMockJwt } from './support/mock-jwt';

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const API_BASE = 'http://localhost:3001/api/v1';

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

function dashboardBody(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      member: {
        id: 'member-uuid-001',
        memberNumber: 'MBR-001',
        name: 'Test Member',
        email: MEMBER_CREDENTIALS.email,
        phone: '254712345678',
        phoneVerified: true,
        withdrawalDestination: {
          maskedPhone: '+254 7** *** 678',
          verified: true,
          status: 'VERIFIED',
        },
        kycStatus: 'APPROVED',
      },
      balances: { fosa: 15000, bosa: 5000, fosaAccountId: 'acc-fosa-1', bosaAccountId: 'acc-bosa-1' },
      activeLoans: [],
      recentTransactions: [],
      pendingGuarantorRequests: [],
      ...overrides,
    },
    error: null,
  };
}

async function mockMemberDashboard(page: Page): Promise<void> {
  await page.route(`${API_BASE}/members/dashboard`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dashboardBody()) });
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

test.describe('Auth & Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await injectTenantHeader(page);
    await mockRefresh(page);
    await mockMemberLogin(page);
    await mockMemberDashboard(page);
    await mockTenantPublicInfo(page);
  });

  test('member can log in and see their dashboard balances', async ({ page }) => {
    await loginAsMember(page);

    await expect(page.getByLabel(/FOSA Balance:/i)).toBeVisible();
    await expect(page.getByLabel(/Total Savings:/i)).toBeVisible();
  });

  test('M-Pesa deposit walks through pending -> success without a fixed-interval poll hammering the API', async ({ page }) => {
    let pollCount = 0;

    await page.route(`${API_BASE}/members/deposit/mpesa`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            checkoutRequestId: 'ws_CO_test_001',
            merchantRequestId: 'merchant-001',
            customerMessage: 'Check your phone to complete payment.',
            mpesaTransactionId: 'txn-001',
          },
          error: null,
        }),
      });
    });

    // memberApi.getDepositStatus() calls the real backend route
    // (GET /mpesa/transactions/:checkoutRequestId/status) — it previously
    // pointed at a route that doesn't exist anywhere in the backend
    // (/members/deposit/status/:id), which this mock was silently masking.
    await page.route(`${API_BASE}/mpesa/transactions/ws_CO_test_001/status`, (route) => {
      pollCount += 1;
      const status = pollCount < 2 ? 'PENDING' : 'COMPLETED';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { status }, error: null }),
      });
    });

    await loginAsMember(page);
    await page.goto('/member/accounts');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('M-Pesa Phone Number').fill('0712345678');
    await page.getByLabel('Amount (KES)').fill('500');
    await page.getByRole('button', { name: /Deposit via M-Pesa/i }).click();

    await expect(page.getByText(/Waiting for Payment/i)).toBeVisible({ timeout: 10_000 });
    // Polling is jittered (3-10s per attempt), so give it real time rather than
    // asserting on a specific interval — the point is it eventually resolves.
    await expect(page.getByText(/Deposit Successful/i)).toBeVisible({ timeout: 20_000 });
    expect(pollCount).toBeGreaterThanOrEqual(2);
  });

  test('verified M-Pesa withdrawal shows confirmation, durable reference, and completed status', async ({ page }) => {
    let postCount = 0;
    let pollCount = 0;
    let withdrawalPayload: Record<string, unknown> | null = null;

    await page.route(`${API_BASE}/members/withdraw/mpesa`, async (route) => {
      postCount += 1;
      withdrawalPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            message: 'Withdrawal initiated successfully',
            transactionId: '11111111-1111-4111-8111-111111111111',
            reference: 'WD-20260812-11111111',
          },
          error: null,
        }),
      });
    });

    await page.route(`${API_BASE}/members/withdraw/mpesa/11111111-1111-4111-8111-111111111111/status`, async (route) => {
      pollCount += 1;
      const completed = pollCount >= 2;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            transactionId: '11111111-1111-4111-8111-111111111111',
            reference: 'WD-20260812-11111111',
            status: completed ? 'SUCCESS' : 'PENDING',
            memberStatus: completed ? 'COMPLETED' : 'PROCESSING',
            memberStatusLabel: completed ? 'Completed' : 'Processing',
            terminal: completed,
            amount: '5000',
            fee: '0',
            totalDebit: '5000',
            destination: '+254 7** *** 678',
            requestedAt: '2026-08-12T09:00:00.000Z',
            lastUpdated: '2026-08-12T09:00:05.000Z',
            providerReference: completed ? 'MWALONI-REF-001' : null,
          },
          error: null,
        }),
      });
    });

    await loginAsMember(page);
    await page.getByRole('button', { name: /Withdraw to M-Pesa/i }).click();
    await expect(page.getByText('+254 7** *** 678')).toBeVisible();
    await page.getByLabel('Amount to Withdraw').fill('5000');
    await page.getByRole('button', { name: /^Continue$/i }).click();
    await expect(page.getByText('Total debit')).toBeVisible();
    await expect(page.getByText('Expected remaining')).toBeVisible();
    await page.getByRole('button', { name: /Confirm withdrawal/i }).dblclick();

    await expect(page.getByText('WD-20260812-11111111')).toBeVisible();
    await expect(page.getByText(/Processing|Completed/)).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible({ timeout: 12_000 });
    expect(postCount).toBe(1);
    expect(withdrawalPayload).toEqual({ amount: 5000 });
  });

  test('unverified member phone blocks withdrawal before submission', async ({ page }) => {
    let postCount = 0;

    await page.route(`${API_BASE}/members/dashboard`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(dashboardBody({
          member: {
            id: 'member-uuid-001',
            memberNumber: 'MBR-001',
            name: 'Test Member',
            email: MEMBER_CREDENTIALS.email,
            phone: '254712345678',
            phoneVerified: false,
            withdrawalDestination: {
              maskedPhone: '+254 7** *** 678',
              verified: false,
              status: 'UNVERIFIED',
            },
            kycStatus: 'APPROVED',
          },
        })),
      });
    });
    await page.route(`${API_BASE}/members/withdraw/mpesa`, (route) => {
      postCount += 1;
      route.abort();
    });

    await loginAsMember(page);
    await page.getByRole('button', { name: /Withdraw to M-Pesa/i }).click();
    await expect(page.getByText('Verify your member phone before withdrawing.')).toBeVisible();
    await expect(page.getByLabel('Amount to Withdraw')).toBeDisabled();
    await expect(page.getByRole('button', { name: /^Continue$/i })).toBeDisabled();
    expect(postCount).toBe(0);
  });

  test('delayed withdrawal status uses confirmation-delayed wording without retry CTA', async ({ page }) => {
    await page.route(`${API_BASE}/members/withdraw/mpesa`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            message: 'Withdrawal initiated successfully',
            transactionId: '22222222-2222-4222-8222-222222222222',
            reference: 'WD-20260812-22222222',
          },
          error: null,
        }),
      });
    });
    await page.route(`${API_BASE}/members/withdraw/mpesa/22222222-2222-4222-8222-222222222222/status`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            transactionId: '22222222-2222-4222-8222-222222222222',
            reference: 'WD-20260812-22222222',
            status: 'PENDING',
            memberStatus: 'CONFIRMATION_DELAYED',
            memberStatusLabel: 'Processing - confirmation delayed',
            terminal: false,
            amount: '5000',
            fee: '0',
            totalDebit: '5000',
            destination: '+254 7** *** 678',
            requestedAt: '2026-08-12T09:00:00.000Z',
          },
          error: null,
        }),
      });
    });

    await loginAsMember(page);
    await page.getByRole('button', { name: /Withdraw to M-Pesa/i }).click();
    await page.getByLabel('Amount to Withdraw').fill('5000');
    await page.getByRole('button', { name: /^Continue$/i }).click();
    await page.getByRole('button', { name: /Confirm withdrawal/i }).click();

    await expect(page.getByText('Processing - confirmation delayed')).toBeVisible();
    await expect(page.getByText(/Do not submit another withdrawal/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Confirm withdrawal/i })).toHaveCount(0);
  });
});
