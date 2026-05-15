/**
 * KYC Flow E2E Tests
 *
 * Tests the complete KYC lifecycle:
 *   1. Member login
 *   2. Profile PATCH (phone / email)
 *   3. Document upload (R2 PUT mocked, /confirm real)
 *   4. Admin document review via async queue endpoint
 *
 * Backend API calls are intercepted via page.route() where noted.
 * The R2 presigned PUT is always mocked to avoid real object-storage dependency.
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const API_BASE   = 'http://localhost:3001/api';

const MEMBER_CREDENTIALS = {
  email: 'member@test.beba.co.ke',
  password: 'Test1234!',
};

const ADMIN_CREDENTIALS = {
  email: 'admin@test.beba.co.ke',
  password: 'Admin1234!',
};

/** Intercept all requests to the backend and inject the tenant header. */
async function injectTenantHeader(page: Page): Promise<void> {
  await page.route(`${API_BASE}/**`, (route) => {
    route.continue({
      headers: {
        ...route.request().headers(),
        'X-Tenant-ID': TENANT_ID,
      },
    });
  });
}

/** Mock GET /members/dashboard to return minimal valid data. */
async function mockMemberDashboard(page: Page): Promise<void> {
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
            email: 'member@test.beba.co.ke',
            kycStatus: 'PENDING_UPLOAD',
          },
          balances: { fosa: 0, bosa: 0, fosaAccountId: null, bosaAccountId: null },
          activeLoans: [],
          recentTransactions: [],
          pendingGuarantorRequests: [],
        },
        error: null,
      }),
    });
  });
}

/** Mock GET /members/documents to return an empty list initially. */
async function mockMemberDocuments(page: Page, docs: unknown[] = []): Promise<void> {
  await page.route(`${API_BASE}/members/documents`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: docs, error: null }),
    });
  });
}

/** Mock POST /auth/login for member credentials. */
async function mockMemberLogin(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/login`, (route) => {
    const body = route.request().postDataJSON() as { email?: string; phone?: string };
    if (body.email === MEMBER_CREDENTIALS.email || body.phone) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'mock-access-token-member',
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
    } else {
      route.fulfill({ status: 401, body: JSON.stringify({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }, data: null }) });
    }
  });
}

/** Mock POST /auth/login for admin credentials. */
async function mockAdminLogin(page: Page): Promise<void> {
  await page.route(`${API_BASE}/auth/login`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: 'mock-access-token-admin',
          refreshToken: 'mock-refresh-token-admin',
          user: {
            id: 'user-uuid-admin',
            email: ADMIN_CREDENTIALS.email,
            firstName: 'Test',
            lastName: 'Admin',
            role: 'MANAGER',
            tenantId: TENANT_ID,
            mustChangePassword: false,
          },
        },
        error: null,
      }),
    });
  });
}

/** Mock POST /auth/refresh so page-reload hydration works in tests. */
async function mockRefresh(page: Page, role: 'MEMBER' | 'MANAGER' = 'MEMBER'): Promise<void> {
  await page.route(`${API_BASE}/auth/refresh`, (route) => {
    const token = role === 'MEMBER' ? 'mock-access-token-member' : 'mock-access-token-admin';
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { accessToken: token, refreshToken: `mock-refresh-${role.toLowerCase()}` },
        error: null,
      }),
    });
  });
}

// ─── Login helper ──────────────────────────────────────────────────────────────

async function loginAs(page: Page, credentials: { email: string; password: string }): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email or Phone').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for navigation away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('KYC Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject tenant header on all outgoing API calls
    await injectTenantHeader(page);
    // Prevent throttle errors from auth endpoint
    await mockRefresh(page);
  });

  // ── 1. Member login ──────────────────────────────────────────────────────────

  test('member can log in and is redirected to member dashboard', async ({ page }) => {
    await mockMemberLogin(page);
    await mockMemberDashboard(page);

    // Mock the member dashboard page load
    await page.route('**/member/dashboard', (route) => route.continue());

    await page.goto('/login');
    await page.getByLabel('Email or Phone').fill(MEMBER_CREDENTIALS.email);
    await page.getByLabel('Password').fill(MEMBER_CREDENTIALS.password);

    await Promise.all([
      page.waitForURL('**/member/dashboard', { timeout: 10_000 }),
      page.getByRole('button', { name: /sign in/i }).click(),
    ]);

    expect(page.url()).toContain('/member/dashboard');
  });

  // ── 2. Profile PATCH ─────────────────────────────────────────────────────────

  test('member can update phone and email via profile form', async ({ page }) => {
    await mockMemberLogin(page);
    await mockMemberDashboard(page);
    await mockMemberDocuments(page);

    let patchedBody: unknown;
    await page.route(`${API_BASE}/members/profile`, async (route) => {
      if (route.request().method() === 'PATCH') {
        patchedBody = route.request().postDataJSON();
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { id: 'member-uuid-001' }, error: null }),
        });
      } else {
        route.continue();
      }
    });

    await loginAs(page, MEMBER_CREDENTIALS);
    await page.goto('/member/profile');
    await page.waitForLoadState('networkidle');

    // Fill in the profile form
    const phoneField = page.getByLabel('Phone Number');
    const emailField = page.getByLabel('Email Address');
    await phoneField.fill('+254712345678');
    await emailField.fill('updated@test.beba.co.ke');

    await page.getByRole('button', { name: /save changes/i }).click();

    // Verify the PATCH was sent with the right data
    await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 5_000 });
    expect(patchedBody).toMatchObject({
      phone: '+254712345678',
      email: 'updated@test.beba.co.ke',
    });
  });

  // ── 3. Document upload ────────────────────────────────────────────────────────

  test('member can upload a document and it shows as PENDING_REVIEW', async ({ page }) => {
    await mockMemberLogin(page);
    await mockMemberDashboard(page);

    const DOC_ID = 'doc-uuid-001';

    // Mock the upload URL request
    await page.route(`${API_BASE}/members/documents/upload-url`, (route) => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            documentId: DOC_ID,
            uploadUrl: 'https://r2.mock/upload-url',
            objectKey: `tenants/${TENANT_ID}/members/member-uuid-001/national_id_front_mock.jpg`,
            expiresIn: 3600,
            maxBytes: 5242880,
          },
          error: null,
        }),
      });
    });

    // Mock the R2 presigned PUT — skip real object storage
    await page.route('https://r2.mock/upload-url', (route) => {
      route.fulfill({ status: 200, body: '' });
    });

    // Mock /confirm to return a PENDING_REVIEW document
    await page.route(`${API_BASE}/members/documents/confirm`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: DOC_ID,
            memberId: 'member-uuid-001',
            type: 'NATIONAL_ID_FRONT',
            status: 'PENDING_REVIEW',
            originalFileName: 'national_id_front.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 12345,
            checksum: null,
            version: 1,
            reviewedById: null,
            reviewedAt: null,
            rejectionReason: null,
            expiresAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          error: null,
        }),
      });
    });

    // After confirm, /documents returns the new doc
    let docsCallCount = 0;
    await page.route(`${API_BASE}/members/documents`, (route) => {
      docsCallCount++;
      const docs = docsCallCount > 1
        ? [{
            id: DOC_ID, memberId: 'member-uuid-001', type: 'NATIONAL_ID_FRONT',
            status: 'PENDING_REVIEW', originalFileName: 'national_id_front.jpg',
            mimeType: 'image/jpeg', sizeBytes: 12345, checksum: null, version: 1,
            reviewedById: null, reviewedAt: null, rejectionReason: null, expiresAt: null,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }]
        : [];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: docs, error: null }),
      });
    });

    await loginAs(page, MEMBER_CREDENTIALS);
    await page.goto('/member/profile');
    await page.getByRole('tab', { name: /documents/i }).click();
    await page.waitForLoadState('networkidle');

    // Select document type
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /national id \(front\)/i }).click();

    // Upload a fake file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: /choose file/i }).click(),
    ]);
    await fileChooser.setFiles({
      name: 'national_id_front.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });

    // Wait for success toast and document appearing in list
    await expect(page.getByText(/document uploaded successfully/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/under review/i)).toBeVisible({ timeout: 5_000 });
  });

  // ── 4. Admin document review ──────────────────────────────────────────────────

  test('admin can enqueue a document review and status updates to APPROVED', async ({ page }) => {
    await mockAdminLogin(page);
    await mockRefresh(page, 'MANAGER');

    const DOC_ID = 'doc-uuid-001';
    const MEMBER_ID = 'member-uuid-001';

    // Mock GET /admin/kyc/documents?memberId=...
    let reviewCallCount = 0;
    await page.route(`${API_BASE}/admin/kyc/documents*`, (route) => {
      const status = reviewCallCount === 0 ? 'PENDING_REVIEW' : 'APPROVED';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: DOC_ID,
            memberId: MEMBER_ID,
            type: 'NATIONAL_ID_FRONT',
            status,
            originalFileName: 'national_id_front.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 12345,
            checksum: null,
            version: 1,
            reviewedById: reviewCallCount === 0 ? null : 'user-uuid-admin',
            reviewedAt: reviewCallCount === 0 ? null : new Date().toISOString(),
            rejectionReason: null,
            expiresAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            member: {
              id: MEMBER_ID, memberNumber: 'MBR-001', kycStatus: 'PENDING_REVIEW',
              user: { firstName: 'Test', lastName: 'Member', email: 'member@test.beba.co.ke', phone: null },
            },
          }],
          error: null,
        }),
      });
    });

    // Mock POST /admin/kyc/documents/:id/review
    let reviewPayload: unknown;
    await page.route(`${API_BASE}/admin/kyc/documents/${DOC_ID}/review`, (route) => {
      reviewPayload = route.request().postDataJSON();
      reviewCallCount++;
      route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'QUEUED', jobId: 'job-001' },
          error: null,
        }),
      });
    });

    await loginAs(page, ADMIN_CREDENTIALS);
    await page.goto(`/admin/members/${MEMBER_ID}/documents`);
    await page.waitForLoadState('networkidle');

    // Verify document shows PENDING_REVIEW
    await expect(page.getByText(/pending review/i)).toBeVisible();

    // Click Review button
    await page.getByRole('button', { name: /review/i }).click();

    // Dialog appears — default is APPROVED
    await expect(page.getByRole('dialog')).toBeVisible();

    // Submit the review
    await page.getByRole('button', { name: /^approve$/i }).click();

    // Verify toast
    await expect(page.getByText(/review queued/i)).toBeVisible({ timeout: 5_000 });

    // Verify payload sent to backend
    expect(reviewPayload).toMatchObject({ status: 'APPROVED' });

    // After refresh the document shows APPROVED
    await expect(page.getByText(/approved/i)).toBeVisible({ timeout: 5_000 });
  });
});
