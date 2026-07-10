'use client';

/**
 * Admin Dashboard Page
 * Role: SUPER_ADMIN, TENANT_ADMIN, MANAGER, AUDITOR
 *
 * KPI tiles map directly to AdminService.getDashboardStats()
 * (backend/src/modules/admin/admin.service.ts) — see AdminDashboardStats in
 * lib/api-client.ts for the exact response shape. There is no repayment
 * heatmap, welfare, or savings data behind this endpoint (that data model
 * doesn't exist server-side) — don't reintroduce those tiles without a real
 * backend field to back them.
 */

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi, type AdminDashboardStats } from '@/lib/api-client';
import { useAuth, isAdmin } from '@/lib/auth-context';

// Kept short and uniform across the two queries below: this dashboard
// surfaces pending-approval counts staff act on, so 20s is "near real-time"
// without hammering the API on every re-render.
const ADMIN_DASHBOARD_STALE_TIME_MS = 20_000;

function KpiCard({
  title,
  value,
  subtitle,
  colorClass = 'text-blue-600',
}: {
  title: string;
  value: string;
  subtitle?: string;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  // Gate the fetch itself, not just the rendered UI — the /admin route layout
  // already redirects non-admin roles away, but that redirect runs in its own
  // effect on the same mount as this page's, so without this the dashboard
  // queries could still fire once before the redirect completes.
  const canViewAdminDashboard = isAdmin(user?.role);

  const statsQuery = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminApi.getDashboardStats(),
    enabled: canViewAdminDashboard,
    staleTime: ADMIN_DASHBOARD_STALE_TIME_MS,
  });
  const ticketsQuery = useQuery({
    queryKey: ['admin-dashboard-open-tickets'],
    queryFn: () => adminApi.getAllTickets({ status: 'OPEN' }),
    enabled: canViewAdminDashboard,
    staleTime: ADMIN_DASHBOARD_STALE_TIME_MS,
  });

  const stats: AdminDashboardStats | null = statsQuery.data?.success ? statsQuery.data.data : null;
  const openTickets = ticketsQuery.data?.success ? ticketsQuery.data.data.length : null;
  const loading = canViewAdminDashboard && statsQuery.isLoading;
  const error =
    statsQuery.isError || (statsQuery.data && !statsQuery.data.success)
      ? statsQuery.data?.error?.message ??
        (statsQuery.error instanceof Error ? statsQuery.error.message : 'Failed to load dashboard')
      : null;

  const refresh = () => {
    void statsQuery.refetch();
    void ticketsQuery.refetch();
  };

  const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 bg-red-50 p-4 rounded">{error}</div>
        <Button className="mt-4" onClick={refresh}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Grid */}
      {loading || !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Total Members"
            value={stats.members.total.toLocaleString()}
            subtitle={`${stats.members.totalActiveAccounts} active accounts`}
            colorClass="text-blue-600"
          />
          <KpiCard
            title="KYC Queue"
            value={stats.members.pendingKyc.toLocaleString()}
            subtitle="Awaiting staff review"
            colorClass={stats.members.pendingKyc > 0 ? 'text-amber-600' : 'text-green-600'}
          />
          <KpiCard
            title="Pending Loan Approvals"
            value={stats.loans.pendingApprovals.toLocaleString()}
            subtitle="Awaiting admin decision"
            colorClass={stats.loans.pendingApprovals > 0 ? 'text-amber-600' : 'text-green-600'}
          />
          <KpiCard
            title="Active Loans"
            value={stats.loans.active.toLocaleString()}
            subtitle={fmt(stats.loans.totalOutstandingAmount) + ' outstanding'}
            colorClass="text-blue-600"
          />
          <KpiCard
            title="Portfolio at Risk (30d+)"
            value={`${stats.loans.portfolioAtRisk30d.percentOfActivePortfolio}%`}
            subtitle={fmt(stats.loans.portfolioAtRisk30d.outstandingAmount)}
            colorClass={stats.loans.portfolioAtRisk30d.percentOfActivePortfolio > 10 ? 'text-red-600' : 'text-green-600'}
          />
          <KpiCard
            title="Default Rate"
            value={`${stats.loans.defaultRatePercent}%`}
            subtitle={`${stats.loans.defaulted} defaulted`}
            colorClass={stats.loans.defaultRatePercent > 10 ? 'text-red-600' : 'text-green-600'}
          />
          <KpiCard
            title="Disbursed This Month"
            value={fmt(stats.loans.disbursements.thisMonth.totalAmount)}
            subtitle={`${stats.loans.disbursements.thisMonth.count} loans`}
            colorClass="text-green-600"
          />
          <KpiCard
            title="Disbursed (All Time)"
            value={fmt(stats.loans.disbursements.overall.totalAmount)}
            subtitle={`${stats.loans.disbursements.overall.count} loans`}
            colorClass="text-green-600"
          />
          <KpiCard
            title="M-Pesa Deposits (7d)"
            value={fmt(stats.mpesa.deposits7d.totalAmount)}
            subtitle={`${stats.mpesa.deposits7d.count} transactions`}
            colorClass="text-blue-600"
          />
          <KpiCard
            title="Open Support Tickets"
            value={(openTickets ?? 0).toLocaleString()}
            subtitle="Awaiting support action"
            colorClass={(openTickets ?? 0) > 0 ? 'text-amber-600' : 'text-green-600'}
          />
        </div>
      )}

      {!loading && stats && stats.members.pendingKyc > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base text-amber-900">KYC review needed</CardTitle>
              <p className="text-sm text-amber-800">
                {stats.members.pendingKyc} member{stats.members.pendingKyc === 1 ? '' : 's'} cannot apply for loans until KYC is approved.
              </p>
            </div>
            <Link href="/admin/members/pending">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                Open KYC Queue
              </Button>
            </Link>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
