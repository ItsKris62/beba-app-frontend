const TOKEN_KEY = 'beba_access_token';
const REFRESH_KEY = 'beba_refresh_token';
const USER_KEY = 'beba_user';
const TENANT_ID = Cypress.env('TENANT_ID') || 'dc2cf358-1847-43ab-a044-2ce8c095ed4f';

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
      win.localStorage.setItem(TOKEN_KEY, 'fake-access-token');
      win.localStorage.setItem(REFRESH_KEY, 'fake-refresh-token');
      win.localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
    });
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
      win.localStorage.setItem(TOKEN_KEY, 'fake-access-token');
      win.localStorage.setItem(REFRESH_KEY, 'fake-refresh-token');
      win.localStorage.setItem(USER_KEY, JSON.stringify(memberUser));
    });
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
