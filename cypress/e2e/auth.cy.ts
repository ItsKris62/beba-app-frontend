describe('Login Page', () => {
  beforeEach(() => {
    cy.clearAuth();
    cy.visit('/login');
  });

  it('renders the login form with all fields', () => {
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('#remember').should('exist');
    cy.contains('button', 'Sign In').should('be.visible');
  });

  it('enforces required fields on empty submit', () => {
    cy.contains('button', 'Sign In').click();
    cy.get('#email:invalid').should('exist');
  });

  it('shows error on invalid credentials', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 401,
      body: { success: false, error: { message: 'Invalid email or password' } },
    }).as('loginFail');

    cy.get('#email').type('wrong@example.com');
    cy.get('#password').type('wrongpassword');
    cy.contains('button', 'Sign In').click();

    cy.wait('@loginFail');
    cy.contains('Invalid email or password').should('be.visible');
  });

  it('redirects admin to /admin/dashboard after successful login', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          accessToken: 'fake-token',
          refreshToken: 'fake-refresh',
          user: {
            id: 'admin-1',
            email: 'admin@test.com',
            firstName: 'Test',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            tenantId: 'dc2cf358-1847-43ab-a044-2ce8c095ed4f',
            mustChangePassword: false,
          },
        },
      },
    }).as('loginAdmin');

    cy.intercept('GET', '**/api/**', { statusCode: 200, body: { success: true, data: {} } });

    cy.get('#email').type('admin@test.com');
    cy.get('#password').type('password123');
    cy.contains('button', 'Sign In').click();

    cy.wait('@loginAdmin');
    cy.url().should('include', '/admin/dashboard');
  });

  it('redirects member to /member/dashboard after successful login', () => {
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          accessToken: 'fake-token',
          refreshToken: 'fake-refresh',
          user: {
            id: 'member-1',
            email: 'member@test.com',
            firstName: 'Jane',
            lastName: 'Doe',
            role: 'MEMBER',
            tenantId: 'dc2cf358-1847-43ab-a044-2ce8c095ed4f',
            mustChangePassword: false,
          },
        },
      },
    }).as('loginMember');

    cy.intercept('GET', '**/api/**', { statusCode: 200, body: { success: true, data: {} } });

    cy.get('#email').type('member@test.com');
    cy.get('#password').type('password123');
    cy.contains('button', 'Sign In').click();

    cy.wait('@loginMember');
    cy.url().should('include', '/member/dashboard');
  });

  it('already-authenticated admin is redirected away from /login', () => {
    cy.loginAsAdmin();
    cy.intercept('GET', '**/api/**', { statusCode: 200, body: { success: true, data: {} } });
    cy.visit('/login');
    cy.url().should('include', '/admin/dashboard');
  });

  it('already-authenticated member is redirected away from /login', () => {
    cy.loginAsMember();
    cy.intercept('GET', '**/api/**', { statusCode: 200, body: { success: true, data: {} } });
    cy.visit('/login');
    cy.url().should('include', '/member/dashboard');
  });
});
