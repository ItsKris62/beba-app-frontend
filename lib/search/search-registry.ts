import { normalizeRole, type UserRole } from '@/types/roles';
import {
  canApproveLoans,
  canApproveTransactions,
  canRevealTempPassword,
  canViewTransactions,
  canWriteAdminRecords,
  isAdminRole,
  isMemberRole,
  isSuperAdminRole,
  TRANSACTION_ROLES,
} from '@/lib/permissions';

export type SearchCategory = 'Navigation' | 'Settings' | 'Functions' | 'Quick Actions';

export interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: SearchCategory;
  keywords: string[];
  href: string;
  icon: string;
  /** Explicit allowed roles, or shortcut tags 'ALL_ADMINS' | 'ALL_MEMBERS' */
  roles: UserRole[] | 'ALL_ADMINS' | 'ALL_MEMBERS';
  actionType?: 'navigate' | 'toggle-theme';
  badge?: string;
}

/** Complete registry of searchable portal pages, settings, and functions. */
export const PORTAL_SEARCH_REGISTRY: SearchItem[] = [
  // ==========================================
  // ADMIN PORTAL ITEMS
  // ==========================================
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    description: 'Executive overview, key SACCO metrics, liquidity, and analytics',
    category: 'Navigation',
    keywords: ['home', 'metrics', 'overview', 'dashboard', 'analytics', 'stats'],
    href: '/admin/dashboard',
    icon: 'LayoutDashboard',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'AUDITOR'],
  },
  {
    id: 'admin-members',
    title: 'Members Directory',
    description: 'Search, view, and manage registered SACCO members',
    category: 'Navigation',
    keywords: ['members', 'user list', 'directory', 'drivers', 'boda', 'search member'],
    href: '/admin/members',
    icon: 'Users',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'TELLER', 'AUDITOR'],
  },
  {
    id: 'admin-applications',
    title: 'Member Applications',
    description: 'Review and approve pending member registration applications',
    category: 'Functions',
    keywords: ['applications', 'approve member', 'registration queue', 'onboarding', 'new member'],
    href: '/admin/applications',
    icon: 'UserPlus',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'],
    badge: 'Review',
  },
  {
    id: 'admin-kyc-queue',
    title: 'KYC Verification Queue',
    description: 'Verify identity documents, national IDs, and driver licences',
    category: 'Functions',
    keywords: ['kyc', 'verification', 'id check', 'documents', 'pending approval', 'license'],
    href: '/admin/members/pending',
    icon: 'ClipboardList',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'LOAN_OFFICER'],
    badge: 'KYC',
  },
  {
    id: 'admin-stages',
    title: 'Stage Management',
    description: 'Manage Boda Boda stages, locations, and stage chairmen',
    category: 'Navigation',
    keywords: ['stages', 'boda stage', 'locations', 'zones', 'map pin', 'chairmen'],
    href: '/admin/stages',
    icon: 'MapPin',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'TELLER', 'AUDITOR'],
  },
  {
    id: 'admin-staff-users',
    title: 'Staff Users & Roles',
    description: 'Manage staff user accounts, role permissions, and access controls',
    category: 'Settings',
    keywords: ['staff', 'users', 'admin users', 'tellers', 'roles', 'rbac', 'permissions', 'access control'],
    href: '/admin/users',
    icon: 'UserCheck',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'],
  },
  {
    id: 'admin-loans',
    title: 'Loan Management',
    description: 'Approve, reject, disburse, and monitor active loans',
    category: 'Navigation',
    keywords: ['loans', 'disburse', 'approval chain', 'repayment', 'credit', 'interest', 'overdue'],
    href: '/admin/loans',
    icon: 'CreditCard',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'LOAN_OFFICER'],
  },
  {
    id: 'admin-loan-products',
    title: 'Loan Products & Policy',
    description: 'Configure loan product terms, interest rates, eligibility, and penalty fees',
    category: 'Settings',
    keywords: ['loan product', 'interest rate', 'policy', 'max loan', 'penalties', 'guarantor rules'],
    href: '/admin/products',
    icon: 'Package',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'LOAN_OFFICER'],
  },
  {
    id: 'admin-accounting',
    title: 'Accounting & Auto-Sweep',
    description: 'Chart of accounts, general ledger, auto-sweep configuration, and balances',
    category: 'Functions',
    keywords: ['accounting', 'chart of accounts', 'ledger', 'auto sweep', 'vault', 'balance sheet', 'journal'],
    href: '/admin/accounting',
    icon: 'Calculator',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'ACCOUNTANT'],
  },
  {
    id: 'admin-transactions',
    title: 'Transaction Log & Reconcile',
    description: 'View financial transactions, M-Pesa payments, and admin overrides',
    category: 'Navigation',
    keywords: ['transactions', 'mpesa', 'overrides', 'payments', 'deposits', 'withdrawals', 'reconcile'],
    href: '/admin/transactions',
    icon: 'ArrowLeftRight',
    roles: TRANSACTION_ROLES,
  },
  {
    id: 'admin-support',
    title: 'Support Desk Tickets',
    description: 'Manage member support requests, assign agents, and resolve issues',
    category: 'Functions',
    keywords: ['support', 'helpdesk', 'tickets', 'customer service', 'member complaints'],
    href: '/admin/support',
    icon: 'MessageSquare',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'LOAN_OFFICER'],
  },
  {
    id: 'admin-import',
    title: 'Bulk Member Import',
    description: 'Batch upload members from CSV or Excel spreadsheets',
    category: 'Functions',
    keywords: ['import', 'csv upload', 'excel', 'bulk import', 'batch member upload'],
    href: '/admin/import/upload',
    icon: 'Upload',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
  },
  {
    id: 'admin-audit-log',
    title: 'Audit Trail & Activity',
    description: 'Inspect security audit logs, admin actions, and system modifications',
    category: 'Settings',
    keywords: ['audit log', 'activity', 'security trail', 'logs', 'history', 'who did what'],
    href: '/admin/audit-log',
    icon: 'ClipboardList',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'AUDITOR'],
  },
  {
    id: 'admin-reports',
    title: 'Reports & Analytics',
    description: 'Generate financial reports, portfolio health, and member statements',
    category: 'Navigation',
    keywords: ['reports', 'financial statements', 'export pdf', 'analytics', 'portfolio health'],
    href: '/admin/reports',
    icon: 'BarChart3',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER', 'AUDITOR'],
  },
  {
    id: 'admin-system-health',
    title: 'System Health & Metrics',
    description: 'Monitor server uptime, background queues, API status, and infrastructure',
    category: 'Settings',
    keywords: ['system health', 'uptime', 'queues', 'redis', 'database', 'performance', 'server'],
    href: '/admin/system-health',
    icon: 'Activity',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
  },
  {
    id: 'admin-settings',
    title: 'System Settings',
    description: 'Configure SACCO parameters, security rules, and organization profile',
    category: 'Settings',
    keywords: ['system settings', 'sacco config', 'parameters', 'security policy', 'gateways'],
    href: '/admin/settings',
    icon: 'Settings',
    roles: ['SUPER_ADMIN', 'TENANT_ADMIN'],
  },
  {
    id: 'admin-security-settings',
    title: 'Security & Password Settings',
    description: 'Update staff password, multi-factor authentication (2FA), and active sessions',
    category: 'Settings',
    keywords: ['password', 'security', 'change password', '2fa', 'authenticator', 'sessions', 'pin'],
    href: '/admin/settings#security',
    icon: 'Settings',
    roles: 'ALL_ADMINS',
  },
  {
    id: 'admin-tenants',
    title: 'Multi-Tenant Management',
    description: 'Create and configure SACCO tenants on the platform',
    category: 'Settings',
    keywords: ['tenants', 'multi tenant', 'sacco tenants', 'saaS management', 'create tenant'],
    href: '/admin/tenants',
    icon: 'Building2',
    roles: ['SUPER_ADMIN'],
  },

  // ==========================================
  // MEMBER PORTAL ITEMS
  // ==========================================
  {
    id: 'member-dashboard',
    title: 'Member Overview',
    description: 'Dashboard overview of total savings, active loan, and recent activity',
    category: 'Navigation',
    keywords: ['home', 'overview', 'dashboard', 'balances', 'my account'],
    href: '/member/dashboard',
    icon: 'LayoutDashboard',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-accounts',
    title: 'Savings & Shares Accounts',
    description: 'View savings account balances, share capital, and account history',
    category: 'Navigation',
    keywords: ['savings', 'shares', 'capital', 'accounts', 'balance', 'wallet'],
    href: '/member/accounts',
    icon: 'Wallet',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-loans',
    title: 'Loans & Repayments',
    description: 'Apply for a loan, check active loans, and make repayments via M-Pesa',
    category: 'Navigation',
    keywords: ['loans', 'apply loan', 'borrow', 'repay', 'interest', 'active loan', 'mpesa pay'],
    href: '/member/loans',
    icon: 'CreditCard',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-loan-calculator',
    title: 'Loan Calculator',
    description: 'Calculate monthly loan repayments, interest rates, and loan terms',
    category: 'Functions',
    keywords: ['calculator', 'loan calculator', 'interest estimate', 'repayment schedule', 'borrow limit'],
    href: '/member/loans#calculator',
    icon: 'Calculator',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-guarantors',
    title: 'Guarantors & Requests',
    description: 'Manage loan guarantors and respond to guarantee requests',
    category: 'Navigation',
    keywords: ['guarantor', 'guarantee request', 'vouch', 'co-signer', 'pending request'],
    href: '/member/guarantors',
    icon: 'UserCheck',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-transfers',
    title: 'Money Transfer & Deposit',
    description: 'Deposit funds via M-Pesa, transfer to savings, or withdraw funds',
    category: 'Functions',
    keywords: ['transfer', 'deposit', 'withdraw', 'mpesa', 'send money', 'topup'],
    href: '/member/transfers',
    icon: 'ArrowLeftRight',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-statements',
    title: 'Account Statements',
    description: 'Generate and download official PDF/CSV account statements',
    category: 'Navigation',
    keywords: ['statement', 'download statement', 'pdf', 'csv', 'tax statement', 'history'],
    href: '/member/statements',
    icon: 'FileText',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-support',
    title: 'Customer Support',
    description: 'Contact support, submit tickets, and read member FAQs',
    category: 'Navigation',
    keywords: ['support', 'help', 'ticket', 'faq', 'contact us', 'complaint'],
    href: '/member/support',
    icon: 'MessageSquare',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-profile',
    title: 'Member Profile',
    description: 'View and update personal info, phone number, and avatar',
    category: 'Settings',
    keywords: ['profile', 'personal details', 'avatar', 'phone number', 'next of kin'],
    href: '/member/profile',
    icon: 'User',
    roles: 'ALL_MEMBERS',
  },
  {
    id: 'member-security',
    title: 'Security & Password',
    description: 'Change login password, configure 2FA, and manage security settings',
    category: 'Settings',
    keywords: ['security', 'password', 'change password', '2fa', 'authentication', 'security settings'],
    href: '/member/profile#security',
    icon: 'Settings',
    roles: 'ALL_MEMBERS',
  },

  // ==========================================
  // SHARED QUICK ACTIONS
  // ==========================================
  {
    id: 'action-toggle-theme',
    title: 'Toggle Light / Dark Mode',
    description: 'Switch application color theme preference between dark and light',
    category: 'Quick Actions',
    keywords: ['theme', 'dark mode', 'light mode', 'color theme', 'toggle mode'],
    href: '#theme',
    icon: 'Activity',
    roles: 'ALL_ADMINS',
    actionType: 'toggle-theme',
  },
  {
    id: 'action-toggle-theme-member',
    title: 'Toggle Light / Dark Mode',
    description: 'Switch application color theme preference between dark and light',
    category: 'Quick Actions',
    keywords: ['theme', 'dark mode', 'light mode', 'color theme', 'toggle mode'],
    href: '#theme',
    icon: 'Activity',
    roles: 'ALL_MEMBERS',
    actionType: 'toggle-theme',
  },
];

/**
 * Returns searchable portal items strictly authorized for the given user role and portal userType.
 * Guaranteed RBAC check prevents users from discovering or viewing settings/functions above their role level.
 */
export function getFilteredSearchItems(
  userRole: string | undefined | null,
  userType: 'member' | 'admin'
): SearchItem[] {
  const normalized = normalizeRole(userRole);

  if (userType === 'member') {
    // Return items marked for ALL_MEMBERS or explicit member role matches
    return PORTAL_SEARCH_REGISTRY.filter(
      (item) => item.roles === 'ALL_MEMBERS' || (Array.isArray(item.roles) && normalized && item.roles.includes(normalized))
    );
  }

  // Admin portal
  if (!normalized || !isAdminRole(normalized)) {
    return [];
  }

  return PORTAL_SEARCH_REGISTRY.filter((item) => {
    if (item.roles === 'ALL_ADMINS') return true;
    if (item.roles === 'ALL_MEMBERS') return false;
    if (Array.isArray(item.roles)) {
      return item.roles.includes(normalized);
    }
    return false;
  });
}
