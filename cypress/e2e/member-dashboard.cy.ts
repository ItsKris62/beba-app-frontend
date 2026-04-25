const mockMemberDashboard = {
  success: true,
  data: {
    member: {
      id: 'test-member-00000001',
      memberNumber: 'MBR-0001',
      name: 'Jane Member',
      email: 'member@test.com',
    },
    balances: {
      fosa: 25000,
      bosa: 48000,
      fosaAccountId: 'acc-fosa-1',
      bosaAccountId: 'acc-bosa-1',
    },
    activeLoans: [],
    recentTransactions: [],
    pendingGuarantorRequests: [],
  },
};

describe('Member Dashboard', () => {
  beforeEach(() => {
    cy.loginAsMember();
    cy.intercept('GET', '**/api/**', { statusCode: 200, body: mockMemberDashboard }).as('apiCalls');
  });

  it('loads the member dashboard URL', () => {
    cy.visit('/member/dashboard');
    cy.url().should('include', '/member/dashboard');
  });

  it('shows the Loan Balance summary card', () => {
    cy.visit('/member/dashboard');
    cy.contains('Loan Balance').should('be.visible');
  });

  it('shows the Total Savings summary card', () => {
    cy.visit('/member/dashboard');
    cy.contains('Total Savings').should('be.visible');
  });

  it('shows a Welfare summary card', () => {
    cy.visit('/member/dashboard');
    cy.contains(/welfare/i).should('be.visible');
  });

  it('shows quick action buttons for statements', () => {
    cy.visit('/member/dashboard');
    cy.contains(/statement/i).should('exist');
  });
});
