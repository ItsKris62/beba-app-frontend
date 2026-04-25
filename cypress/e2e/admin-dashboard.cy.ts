const mockKpis = {
  success: true,
  data: {
    kpis: {
      totalMembers: 120,
      activeMembers: 98,
      totalDisbursed: 5000000,
      activeLoans: 45,
      collectionRate: 85.5,
      defaultRate: 4.2,
      outstandingBalance: 3200000,
      totalSavings: 8700000,
      welfareCollected: 240000,
      welfareDeficit: 15000,
    },
    recentDisbursements: [],
    repaymentHeatmap: [],
    stageWelfare: [],
  },
};

describe('Admin Dashboard', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.intercept('GET', '**/api/**', { statusCode: 200, body: mockKpis }).as('apiCalls');
  });

  it('renders the Financial Dashboard heading', () => {
    cy.visit('/admin/dashboard');
    cy.contains('Financial Dashboard').should('be.visible');
  });

  it('shows the Total Members KPI card', () => {
    cy.visit('/admin/dashboard');
    cy.contains('Total Members').should('be.visible');
  });

  it('shows the Collection Rate KPI card', () => {
    cy.visit('/admin/dashboard');
    cy.contains('Collection Rate').should('be.visible');
  });

  it('shows the Total Savings KPI card', () => {
    cy.visit('/admin/dashboard');
    cy.contains('Total Savings').should('be.visible');
  });

  it('has a visible refresh button', () => {
    cy.visit('/admin/dashboard');
    cy.get('button').filter(':visible').contains(/refresh/i).should('exist');
  });
});
