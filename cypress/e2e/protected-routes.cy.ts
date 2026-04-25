const adminRoutes = [
  '/admin/dashboard',
  '/admin/members',
  '/admin/loans',
  '/admin/reports',
  '/admin/transactions',
];

const memberRoutes = [
  '/member/dashboard',
  '/member/accounts',
  '/member/loans',
  '/member/transfers',
];

describe('Protected Route Guards', () => {
  context('Unauthenticated access redirects to /login', () => {
    beforeEach(() => {
      cy.clearAuth();
    });

    adminRoutes.forEach((route) => {
      it(`blocks ${route}`, () => {
        cy.visit(route);
        cy.url().should('include', '/login');
      });
    });

    memberRoutes.forEach((route) => {
      it(`blocks ${route}`, () => {
        cy.visit(route);
        cy.url().should('include', '/login');
      });
    });
  });

  context('Role mismatch redirects', () => {
    it('member visiting an admin route is sent to /member/dashboard', () => {
      cy.loginAsMember();
      cy.intercept('GET', '**/api/**', { statusCode: 200, body: { success: true, data: {} } });
      cy.visit('/admin/dashboard');
      cy.url().should('include', '/member/dashboard');
    });

    it('admin visiting a member route is sent to /admin/dashboard', () => {
      cy.loginAsAdmin();
      cy.intercept('GET', '**/api/**', { statusCode: 200, body: { success: true, data: {} } });
      cy.visit('/member/dashboard');
      cy.url().should('include', '/admin/dashboard');
    });
  });
});
