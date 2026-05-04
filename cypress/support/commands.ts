// Beba SACCO – Cypress custom commands
//
// These tokens are structurally valid JWTs (header.payload.fake-sig) so that
// Next.js Edge middleware can decode the role/tenantId fields for routing.
// jwtDecode() only parses — it does NOT verify signatures — so "fake-sig" is fine.

const TOKEN_KEY = 'beba_access_token';
const REFRESH_KEY = 'beba_refresh_token';
const USER_KEY = 'beba_user';
const TENANT_KEY = 'beba_tenant_id';
const TENANT_ID = Cypress.env('TENANT_ID') || 'dc2cf358-1847-43ab-a044-2ce8c095ed4f';

// Pre-computed structurally-valid JWT tokens (exp: 9999999999 = year 2286)
const ADMIN_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ0ZXN0LWFkbWluLTAwMDAwMDAxIiwiZW1haWwiOiJhZG1pbkB0ZXN0LmNvbSIsInJvbGUiOiJTVVBFUl9BRE1JTiIsInRlbmFudElkIjoiZGMyY2YzNTgtMTg0Ny00M2FiLWEwNDQtMmNlOGMwOTVlZDRmIiwiZXhwIjo5OTk5OTk5OTk5fQ' +
  '.fake-sig';

const MEMBER_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ0ZXN0LW1lbWJlci0wMDAwMDAwMSIsImVtYWlsIjoibWVtYmVyQHRlc3QuY29tIiwicm9sZSI6Ik1FTUJFUiIsInRlbmFudElkIjoiZGMyY2YzNTgtMTg0Ny00M2FiLWEwNDQtMmNlOGMwOTVlZDRmIiwiZXhwIjo5OTk5OTk5OTk5fQ' +
  '.fake-sig';

const adminUser = {
  id: 'test-admin-00000001',
  email: 'admin@test.com',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'SUPER_ADMIN',
  tenantId: TENANT_ID,
  mustChangePassword: false,
};

const memberUser = {
  id: 'test-member-00000001',
  email: 'member@test.com',
  firstName: 'Jane',
  lastName: 'Member',
  role: 'MEMBER',
  tenantId: TENANT_ID,
  mustChangePassword: false,
};

Cypress.Commands.add('loginAsAdmin', () => {
  cy.session(['admin', adminUser.email], () => {
    cy.visit('/login');
    cy.window().then((win) => {
      win.localStorage.setItem(TOKEN_KEY, ADMIN_JWT);
      win.localStorage.setItem(REFRESH_KEY, 'fake-refresh-token');
      win.localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
      win.localStorage.setItem(TENANT_KEY, TENANT_ID);
    });
    // Mirror into cookie for Edge middleware role routing
    cy.setCookie(TOKEN_KEY, ADMIN_JWT, { path: '/', sameSite: 'strict' });
  }, {
    validate() {
      cy.window().then((win) => {
        expect(win.localStorage.getItem(TOKEN_KEY)).to.exist;
      });
    },
  });
});

Cypress.Commands.add('loginAsMember', () => {
  cy.session(['member', memberUser.email], () => {
    cy.visit('/login');
    cy.window().then((win) => {
      win.localStorage.setItem(TOKEN_KEY, MEMBER_JWT);
      win.localStorage.setItem(REFRESH_KEY, 'fake-refresh-token');
      win.localStorage.setItem(USER_KEY, JSON.stringify(memberUser));
      win.localStorage.setItem(TENANT_KEY, TENANT_ID);
    });
    // Mirror into cookie for Edge middleware role routing
    cy.setCookie(TOKEN_KEY, MEMBER_JWT, { path: '/', sameSite: 'strict' });
  }, {
    validate() {
      cy.window().then((win) => {
        expect(win.localStorage.getItem(TOKEN_KEY)).to.exist;
      });
    },
  });
});

Cypress.Commands.add('clearAuth', () => {
  cy.clearLocalStorage();
  cy.clearCookie(TOKEN_KEY);
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
      loginAsMember(): Chainable<void>;
      clearAuth(): Chainable<void>;
    }
  }
}
