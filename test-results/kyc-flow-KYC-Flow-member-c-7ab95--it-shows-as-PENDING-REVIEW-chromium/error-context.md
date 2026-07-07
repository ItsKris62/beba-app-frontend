# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kyc-flow.spec.ts >> KYC Flow >> member can upload a document and it shows as PENDING_REVIEW
- Location: e2e\kyc-flow.spec.ts:260:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/document uploaded successfully/i)
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText(/document uploaded successfully/i)

```

```yaml
- complementary:
  - link "KC KC Boda Sacco Portal":
    - /url: /
  - button
  - navigation:
    - link "Dashboard":
      - /url: /member/dashboard
    - link "Accounts":
      - /url: /member/accounts
    - link "Loans":
      - /url: /member/loans
    - link "Guarantors":
      - /url: /member/guarantors
    - link "Transfers":
      - /url: /member/transfers
    - link "Statements":
      - /url: /member/statements
    - link "Support":
      - /url: /member/support
    - link "Profile":
      - /url: /member/profile
  - text: Theme
  - button "Toggle theme"
  - button "TM Test Member MBR-001"
- banner:
  - textbox "Search..."
  - button "4"
  - paragraph: Test Member
  - paragraph: MBR-001
  - text: TM
- main:
  - heading "My Profile" [level=1]
  - paragraph: Manage your account settings and security
  - text: TM
  - heading "Test Member" [level=2]
  - paragraph: "Member No: MBR-001"
  - text: "Active KYC: Draft"
  - tablist:
    - tab "Personal"
    - tab "Security"
    - tab "Documents" [selected]
  - tabpanel "Documents":
    - text: "Upload KYC Document Accepted formats: JPG, PNG, WebP, PDF · Max 5 MB per file Document Type"
    - combobox: National ID (Front)
    - button "Uploading…" [disabled]
    - text: Upload failed 0%
    - progressbar
    - paragraph: Storage upload failed Attempt 3 of 3.
    - text: My Documents All KYC documents you have submitted
    - list:
      - listitem:
        - paragraph: National ID (Front)
        - paragraph: national_id_front.jpg · v1
        - text: Under Review
- region "Notifications alt+T":
  - list:
    - listitem:
      - img
      - text: Storage upload failed
- alert
```

# Test source

```ts
  260 |   test('member can upload a document and it shows as PENDING_REVIEW', async ({ page }) => {
  261 |     await mockMemberLogin(page);
  262 |     await mockMemberDashboard(page);
  263 | 
  264 |     const DOC_ID = 'doc-uuid-001';
  265 | 
  266 |     // Mock the upload URL request
  267 |     await page.route(`${API_BASE}/members/documents/upload-url`, (route) => {
  268 |       route.fulfill({
  269 |         status: 201,
  270 |         contentType: 'application/json',
  271 |         body: JSON.stringify({
  272 |           success: true,
  273 |           data: {
  274 |             documentId: DOC_ID,
  275 |             uploadUrl: 'https://r2.mock/upload-url',
  276 |             objectKey: `tenants/${TENANT_ID}/members/member-uuid-001/national_id_front_mock.jpg`,
  277 |             expiresIn: 3600,
  278 |             maxBytes: 5242880,
  279 |           },
  280 |           error: null,
  281 |         }),
  282 |       });
  283 |     });
  284 | 
  285 |     // Mock the R2 presigned PUT — skip real object storage
  286 |     await page.route('https://r2.mock/upload-url', (route) => {
  287 |       route.fulfill({ status: 200, body: '' });
  288 |     });
  289 | 
  290 |     // Mock /confirm to return a PENDING_REVIEW document
  291 |     await page.route(`${API_BASE}/members/documents/confirm`, (route) => {
  292 |       route.fulfill({
  293 |         status: 200,
  294 |         contentType: 'application/json',
  295 |         body: JSON.stringify({
  296 |           success: true,
  297 |           data: {
  298 |             id: DOC_ID,
  299 |             memberId: 'member-uuid-001',
  300 |             type: 'NATIONAL_ID_FRONT',
  301 |             status: 'PENDING_REVIEW',
  302 |             originalFileName: 'national_id_front.jpg',
  303 |             mimeType: 'image/jpeg',
  304 |             sizeBytes: 12345,
  305 |             checksum: null,
  306 |             version: 1,
  307 |             reviewedById: null,
  308 |             reviewedAt: null,
  309 |             rejectionReason: null,
  310 |             expiresAt: null,
  311 |             createdAt: new Date().toISOString(),
  312 |             updatedAt: new Date().toISOString(),
  313 |           },
  314 |           error: null,
  315 |         }),
  316 |       });
  317 |     });
  318 | 
  319 |     // After confirm, /documents returns the new doc
  320 |     let docsCallCount = 0;
  321 |     await page.route(`${API_BASE}/members/documents`, (route) => {
  322 |       docsCallCount++;
  323 |       const docs = docsCallCount > 1
  324 |         ? [{
  325 |             id: DOC_ID, memberId: 'member-uuid-001', type: 'NATIONAL_ID_FRONT',
  326 |             status: 'PENDING_REVIEW', originalFileName: 'national_id_front.jpg',
  327 |             mimeType: 'image/jpeg', sizeBytes: 12345, checksum: null, version: 1,
  328 |             reviewedById: null, reviewedAt: null, rejectionReason: null, expiresAt: null,
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
> 360 |     await expect(page.getByText(/document uploaded successfully/i)).toBeVisible({ timeout: 10_000 });
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
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
  429 |     await expect(page.getByText(/pending review/i)).toBeVisible();
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