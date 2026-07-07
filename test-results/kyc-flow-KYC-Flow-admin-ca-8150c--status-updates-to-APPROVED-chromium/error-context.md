# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kyc-flow.spec.ts >> KYC Flow >> admin can enqueue a document review and status updates to APPROVED
- Location: e2e\kyc-flow.spec.ts:366:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/pending review/i)
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/pending review/i)

```

```yaml
- complementary:
  - link "KC KC Boda Sacco Portal":
    - /url: /
  - button
  - navigation:
    - link "Dashboard":
      - /url: /admin/dashboard
    - link "Members":
      - /url: /admin/members
    - link "KYC Queue":
      - /url: /admin/members/pending
    - link "Stages":
      - /url: /admin/stages
    - link "Staff Users":
      - /url: /admin/users
    - link "Loan Management":
      - /url: /admin/loans
    - link "Loan Products":
      - /url: /admin/products
    - link "Accounting":
      - /url: /admin/accounting
    - link "Transactions":
      - /url: /admin/transactions
    - link "Support":
      - /url: /admin/support
    - link "Audit Trail":
      - /url: /admin/audit-log
    - link "Reports":
      - /url: /admin/reports
  - text: Theme
  - button "Toggle theme"
  - button "TA Test Admin MANAGER"
- banner:
  - textbox "Search..."
  - button "4"
  - paragraph: Test Admin
  - paragraph: MANAGER
  - text: TA
- main:
  - button
  - heading "KYC Documents" [level=1]
  - paragraph: "Member ID: member-uuid-001"
  - button "Refresh"
  - text: Upload Document Upload a KYC document on behalf of this member (max 5 MB) Document Type
  - combobox: Select type…
  - button "Choose & Upload" [disabled]
  - text: Document Queue Click “Review” to approve or reject pending documents. Actions are processed asynchronously.
  - list:
    - listitem:
      - paragraph: National ID (Front)
      - paragraph: national_id_front.jpg · v1 · 7 Jul 2026
      - text: Under Review
      - button "Download"
      - button "Review"
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  329 |             createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  330 |           }]
  331 |         : [];
  332 |       route.fulfill({
  333 |         status: 200,
  334 |         contentType: 'application/json',
  335 |         body: JSON.stringify({ success: true, data: docs, error: null }),
  336 |       });
  337 |     });
  338 | 
  339 |     await loginAs(page, MEMBER_CREDENTIALS);
  340 |     await page.goto('/member/profile');
  341 |     await page.getByRole('tab', { name: /documents/i }).click();
  342 |     await page.waitForLoadState('networkidle');
  343 | 
  344 |     // Select document type
  345 |     await page.getByRole('combobox').click();
  346 |     await page.getByRole('option', { name: /national id \(front\)/i }).click();
  347 | 
  348 |     // Upload a fake file
  349 |     const [fileChooser] = await Promise.all([
  350 |       page.waitForEvent('filechooser'),
  351 |       page.getByRole('button', { name: /choose file/i }).click(),
  352 |     ]);
  353 |     await fileChooser.setFiles({
  354 |       name: 'national_id_front.jpg',
  355 |       mimeType: 'image/jpeg',
  356 |       buffer: Buffer.from('fake-image-data'),
  357 |     });
  358 | 
  359 |     // Wait for success toast and document appearing in list
  360 |     await expect(page.getByText(/document uploaded successfully/i)).toBeVisible({ timeout: 10_000 });
  361 |     await expect(page.getByText(/under review/i)).toBeVisible({ timeout: 5_000 });
  362 |   });
  363 | 
  364 |   // ── 4. Admin document review ──────────────────────────────────────────────────
  365 | 
  366 |   test('admin can enqueue a document review and status updates to APPROVED', async ({ page }) => {
  367 |     await mockAdminLogin(page);
  368 |     await mockRefresh(page, 'MANAGER');
  369 | 
  370 |     const DOC_ID = 'doc-uuid-001';
  371 |     const MEMBER_ID = 'member-uuid-001';
  372 | 
  373 |     // Mock GET /admin/kyc/documents?memberId=...
  374 |     let reviewCallCount = 0;
  375 |     await page.route(`${API_BASE}/admin/kyc/documents*`, (route) => {
  376 |       const status = reviewCallCount === 0 ? 'PENDING_REVIEW' : 'APPROVED';
  377 |       route.fulfill({
  378 |         status: 200,
  379 |         contentType: 'application/json',
  380 |         body: JSON.stringify({
  381 |           success: true,
  382 |           data: [{
  383 |             id: DOC_ID,
  384 |             memberId: MEMBER_ID,
  385 |             type: 'NATIONAL_ID_FRONT',
  386 |             status,
  387 |             originalFileName: 'national_id_front.jpg',
  388 |             mimeType: 'image/jpeg',
  389 |             sizeBytes: 12345,
  390 |             checksum: null,
  391 |             version: 1,
  392 |             reviewedById: reviewCallCount === 0 ? null : 'user-uuid-admin',
  393 |             reviewedAt: reviewCallCount === 0 ? null : new Date().toISOString(),
  394 |             rejectionReason: null,
  395 |             expiresAt: null,
  396 |             createdAt: new Date().toISOString(),
  397 |             updatedAt: new Date().toISOString(),
  398 |             member: {
  399 |               id: MEMBER_ID, memberNumber: 'MBR-001', kycStatus: 'PENDING_REVIEW',
  400 |               user: { firstName: 'Test', lastName: 'Member', email: 'member@test.beba.co.ke', phone: null },
  401 |             },
  402 |           }],
  403 |           error: null,
  404 |         }),
  405 |       });
  406 |     });
  407 | 
  408 |     // Mock POST /admin/kyc/documents/:id/review
  409 |     let reviewPayload: unknown;
  410 |     await page.route(`${API_BASE}/admin/kyc/documents/${DOC_ID}/review`, (route) => {
  411 |       reviewPayload = route.request().postDataJSON();
  412 |       reviewCallCount++;
  413 |       route.fulfill({
  414 |         status: 202,
  415 |         contentType: 'application/json',
  416 |         body: JSON.stringify({
  417 |           success: true,
  418 |           data: { status: 'QUEUED', jobId: 'job-001' },
  419 |           error: null,
  420 |         }),
  421 |       });
  422 |     });
  423 | 
  424 |     await loginAs(page, ADMIN_CREDENTIALS);
  425 |     await page.goto(`/admin/members/${MEMBER_ID}/documents`);
  426 |     await page.waitForLoadState('networkidle');
  427 | 
  428 |     // Verify document shows PENDING_REVIEW
> 429 |     await expect(page.getByText(/pending review/i)).toBeVisible();
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  430 | 
  431 |     // Click Review button
  432 |     await page.getByRole('button', { name: /review/i }).click();
  433 | 
  434 |     // Dialog appears — default is APPROVED
  435 |     await expect(page.getByRole('dialog')).toBeVisible();
  436 | 
  437 |     // Submit the review
  438 |     await page.getByRole('button', { name: /^approve$/i }).click();
  439 | 
  440 |     // Verify toast
  441 |     await expect(page.getByText(/review queued/i)).toBeVisible({ timeout: 5_000 });
  442 | 
  443 |     // Verify payload sent to backend
  444 |     expect(reviewPayload).toMatchObject({ status: 'APPROVED' });
  445 | 
  446 |     // After refresh the document shows APPROVED
  447 |     await expect(page.getByText(/approved/i)).toBeVisible({ timeout: 5_000 });
  448 |   });
  449 | });
  450 | 
```