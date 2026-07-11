'use client';

/**
 * Admin Dashboard Page
 * Role: SUPER_ADMIN, TENANT_ADMIN, MANAGER, AUDITOR
 *
 * KPI tiles and charts map directly to AdminService.getDashboardStats() and
 * DashboardService.getDashboardReports() (see AdminDashboardStats /
 * AdminDashboardReports in lib/api-client.ts for the exact response shapes).
 * There is no repayment heatmap, welfare, or savings data behind the stats
 * endpoint (that data model doesn't exist server-side) — don't reintroduce
 * those tiles/charts without a real backend field to back them. Likewise,
 * the loan portfolio donut is built from reports.loansByStatus (mutually
 * exclusive statuses) rather than stats.loans.* — the stats fields
 * (active/pendingApprovals/defaulted/portfolioAtRisk30d) overlap each other
 * and don't sum to a meaningful whole, so they stay as KPI tiles/gauges
 * instead of donut segments.
 */

import { useMemo, type ReactNode } from 'react';
import { useQuery, useIsFetching } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { adminApi, type AdminDashboardReports, type AdminDashboardStats } from '@/lib/api-client';
import { useAuth, isAdmin } from '@/lib/auth-context';
import { ExecutiveOverview } from './components/executive-overview';
import { RealTimeSparkline } from './components/real-time-sparkline';
import { GuarantorHealth } from './components/guarantor-health';
import { MpesaHeatmap } from './components/mpesa-heatmap';
import {
  AGING_BUCKET_CHART_CONFIG,
  FOSA_BOSA_CHART_CONFIG,
  LOAN_STATUS_CHART_CONFIG,
  MEMBERSHIP_CHART_CONFIG,
  PRODUCT_MIX_PALETTE,
  UNKNOWN_STATUS_COLOR,
  riskColor,
  riskLabel,
} from '@/lib/chart-colors';

// Kept short and uniform across the queries below: this dashboard surfaces
// pending-approval counts staff act on, so 20s is "near real-time" without
// hammering the API on every re-render.
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

function LoanPortfolioDonut({ loansByStatus }: { loansByStatus: Array<{ status: string; count: number; totalAmount: number }> }) {
  const data = loansByStatus.filter((s) => s.count > 0);
  const total = data.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Loan Portfolio by Status</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No loan data</p>
        ) : (
          <ChartContainer config={LOAN_STATUS_CHART_CONFIG} className="mx-auto aspect-square max-h-[260px]">
            <PieChart accessibilityLayer aria-label="Loan portfolio composition by status">
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="status"
                    formatter={(value, name, item) => {
                      const amount = (item.payload as { totalAmount: number }).totalAmount;
                      return (
                        <div className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">
                            {LOAN_STATUS_CHART_CONFIG[name as string]?.label ?? String(name)}
                          </span>
                          <span className="font-mono font-medium">
                            {value.toLocaleString()} loans · KES {amount.toLocaleString()}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Pie data={data} dataKey="count" nameKey="status" innerRadius={65} outerRadius={95} strokeWidth={2}>
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={
                      entry.status in LOAN_STATUS_CHART_CONFIG
                        ? `var(--color-${entry.status})`
                        : UNKNOWN_STATUS_COLOR.light
                    }
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {total.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                            Total Loans
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" className="flex-wrap gap-x-3 gap-y-1.5" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function MembershipDonut({ members }: { members: AdminDashboardStats['members'] }) {
  const other = Math.max(members.total - members.totalActiveAccounts - members.pendingKyc, 0);
  const data = [
    { key: 'active', label: 'Active Accounts', value: members.totalActiveAccounts },
    { key: 'pending', label: 'Pending KYC', value: members.pendingKyc },
    { key: 'other', label: 'Other', value: other },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Membership Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={MEMBERSHIP_CHART_CONFIG} className="mx-auto aspect-square max-h-[260px]">
          <PieChart accessibilityLayer aria-label="Membership composition: active, pending KYC, other">
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={65} outerRadius={95} strokeWidth={2}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                          {members.total.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                          Total Members
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="key" className="flex-wrap gap-x-3 gap-y-1.5" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function PortfolioRiskGauge({ loans }: { loans: AdminDashboardStats['loans'] }) {
  const pct = loans.portfolioAtRisk30d.percentOfActivePortfolio;
  const color = riskColor(pct);
  const gaugeData = [{ metric: 'par30', value: Math.min(pct, 100) }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portfolio at Risk (30d+)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{ value: { label: 'PAR30' } }} className="mx-auto aspect-square max-h-[220px]">
          <RadialBarChart
            accessibilityLayer
            aria-label={`Portfolio at risk 30 days or more: ${pct}%, ${riskLabel(pct)}`}
            data={gaugeData}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" background cornerRadius={10} fill={color} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                          {pct}%
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="text-xs" style={{ fill: color }}>
                          {riskLabel(pct)}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
        <p className="text-xs text-muted-foreground text-center mt-1">
          KES {loans.portfolioAtRisk30d.outstandingAmount.toLocaleString('en-KE')} outstanding
        </p>
        <p className="text-xs text-center mt-2">
          <span className="text-muted-foreground">Default rate: </span>
          <span className="font-medium" style={{ color: riskColor(loans.defaultRatePercent) }}>
            {loans.defaultRatePercent}% ({loans.defaulted} defaulted)
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function FosaBosaComposition({ liquidity }: { liquidity: AdminDashboardStats['liquidity'] }) {
  const data = [
    { key: 'fosa', ...liquidity.fosa },
    { key: 'bosa', ...liquidity.bosa },
  ].filter((d) => d.totalBalance > 0);
  const total = liquidity.fosa.totalBalance + liquidity.bosa.totalBalance;
  const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">FOSA vs BOSA Composition</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No account balances yet</p>
        ) : (
          <>
            <ChartContainer config={FOSA_BOSA_CHART_CONFIG} className="mx-auto aspect-square max-h-[240px]">
              <PieChart accessibilityLayer aria-label="FOSA vs BOSA fund composition">
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="key"
                      formatter={(value, name, item) => {
                        const row = item.payload as { accountCount: number; avgBalance: number };
                        return (
                          <div className="flex w-full justify-between gap-3">
                            <span className="text-muted-foreground">
                              {FOSA_BOSA_CHART_CONFIG[name as string]?.label ?? String(name)}
                            </span>
                            <span className="font-mono font-medium">
                              KES {value.toLocaleString()} · {row.accountCount} accts
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Pie data={data} dataKey="totalBalance" nameKey="key" innerRadius={60} outerRadius={90} strokeWidth={2}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-bold">
                              {fmt(total)}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                              Total Funds
                            </tspan>
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" className="flex-wrap gap-x-3 gap-y-1.5" />} />
              </PieChart>
            </ChartContainer>
            <table className="w-full text-xs mt-3">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left font-medium pb-1">Type</th>
                  <th className="text-right font-medium pb-1">Accounts</th>
                  <th className="text-right font-medium pb-1">Avg Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1">FOSA</td>
                  <td className="text-right">{liquidity.fosa.accountCount.toLocaleString()}</td>
                  <td className="text-right">{fmt(liquidity.fosa.avgBalance)}</td>
                </tr>
                <tr>
                  <td className="py-1">BOSA</td>
                  <td className="text-right">{liquidity.bosa.accountCount.toLocaleString()}</td>
                  <td className="text-right">{fmt(liquidity.bosa.avgBalance)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LoanProductMix({ products }: { products: AdminDashboardReports['loanProductMix'] }) {
  const config: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        products.map((p, i) => [
          p.productId,
          { label: p.productName, theme: PRODUCT_MIX_PALETTE[i % PRODUCT_MIX_PALETTE.length] },
        ]),
      ),
    [products],
  );
  const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Loan Product Mix</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active loans yet</p>
        ) : (
          <ChartContainer config={config} className="h-[240px] w-full">
            <BarChart accessibilityLayer aria-label="Active loan disbursement by product" data={products} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" dataKey="totalDisbursed" hide />
              <YAxis type="category" dataKey="productName" tickLine={false} axisLine={false} width={110} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="productId"
                    formatter={(value, _name, item) => {
                      const row = item.payload as { count: number; avgLoanSize: number };
                      return (
                        <div className="flex w-full justify-between gap-3">
                          <span className="text-muted-foreground">Disbursed</span>
                          <span className="font-mono font-medium">
                            {fmt(value as number)} · {row.count} loans · avg {fmt(row.avgLoanSize)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar dataKey="totalDisbursed" radius={4}>
                {products.map((p) => (
                  <Cell key={p.productId} fill={`var(--color-${p.productId})`} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function DelinquencyAging({ agingBuckets }: { agingBuckets: AdminDashboardReports['agingBuckets'] }) {
  const total =
    agingBuckets.current + agingBuckets.days1to30 + agingBuckets.days31to60 + agingBuckets.days61to90 + agingBuckets.days90Plus;
  const data = [{ name: 'Active Loan Book', ...agingBuckets }];
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Delinquency Aging (SASRA Buckets)</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">No active loans yet</p>
        ) : (
          <>
            <ChartContainer config={AGING_BUCKET_CHART_CONFIG} className="h-[100px] w-full">
              <BarChart
                accessibilityLayer
                aria-label="Delinquency aging buckets on the active loan book"
                data={data}
                layout="vertical"
                margin={{ left: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                {(Object.keys(AGING_BUCKET_CHART_CONFIG) as Array<keyof typeof agingBuckets>).map((key) => (
                  <Bar key={key} dataKey={key} stackId="risk" fill={`var(--color-${key})`} radius={0} />
                ))}
              </BarChart>
            </ChartContainer>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-xs">
              {(Object.entries(AGING_BUCKET_CHART_CONFIG) as Array<[keyof typeof agingBuckets, { label?: ReactNode }]>).map(
                ([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-[2px] shrink-0"
                      style={{ backgroundColor: `var(--color-${key})` }}
                    />
                    <span className="text-muted-foreground">{cfg.label}:</span>
                    <span className="font-medium">
                      {pct(agingBuckets[key])}% ({agingBuckets[key]})
                    </span>
                  </div>
                ),
              )}
            </div>
          </>
        )}
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

  // Silent background refresh: staleTime keeps focus/mount refetches snappy,
  // refetchInterval polls every 60s regardless. isLoading (not isFetching) is
  // what gates the skeleton-vs-content branch below, and v5's isLoading is
  // only true on the very first fetch (no cached data yet) — a background
  // refetchInterval tick sets isFetching but leaves isLoading false and the
  // previous data in place, so the UI never flashes back to a skeleton.
  const statsQuery = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminApi.getDashboardStats(),
    enabled: canViewAdminDashboard,
    staleTime: ADMIN_DASHBOARD_STALE_TIME_MS,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const reportsQuery = useQuery({
    queryKey: ['admin-dashboard-reports'],
    queryFn: () => adminApi.getDashboardReports(),
    enabled: canViewAdminDashboard,
    staleTime: ADMIN_DASHBOARD_STALE_TIME_MS,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const ticketsQuery = useQuery({
    queryKey: ['admin-dashboard-open-tickets'],
    queryFn: () => adminApi.getAllTickets({ status: 'OPEN' }),
    enabled: canViewAdminDashboard,
    staleTime: ADMIN_DASHBOARD_STALE_TIME_MS,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Aggregate "something is quietly refreshing" signal for the header dot —
  // excludes the 5s real-time poll (that one has its own always-on "Live"
  // indicator; folding it in here would make this dot permanently lit).
  const isSyncing =
    useIsFetching({
      predicate: (q) => q.queryKey[0] !== 'admin-realtime-snapshot',
    }) > 0;

  const stats: AdminDashboardStats | null = statsQuery.data?.success ? statsQuery.data.data : null;
  const reports: AdminDashboardReports | null = reportsQuery.data?.success ? reportsQuery.data.data : null;
  const loansByStatus = useMemo(() => reports?.loansByStatus ?? [], [reports]);
  const loanProductMix = useMemo(() => reports?.loanProductMix ?? [], [reports]);
  const openTickets = ticketsQuery.data?.success ? ticketsQuery.data.data.length : null;
  const loading = canViewAdminDashboard && (statsQuery.isLoading || reportsQuery.isLoading);
  // Only the *initial* fetch failing blanks the page — once `stats` has
  // loaded once, a later background refetch failing just leaves the stale
  // data on screen (per the "no error state on background failure" rule).
  const error =
    !stats && (statsQuery.isError || (statsQuery.data && !statsQuery.data.success))
      ? statsQuery.data?.error?.message ??
        (statsQuery.error instanceof Error ? statsQuery.error.message : 'Failed to load dashboard')
      : null;

  const refresh = () => {
    void statsQuery.refetch();
    void reportsQuery.refetch();
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          {isSyncing && !loading && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Updating…
            </span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      <RealTimeSparkline />

      {loading || !stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
          </div>
        </>
      ) : (
        <>
          {/* KPI Grid — single headline numbers with no natural composition */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Pending Loan Approvals"
              value={stats.loans.pendingApprovals.toLocaleString()}
              subtitle="Awaiting admin decision"
              colorClass={stats.loans.pendingApprovals > 0 ? 'text-amber-600' : 'text-green-600'}
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

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LoanPortfolioDonut loansByStatus={loansByStatus} />
            <MembershipDonut members={stats.members} />
            <PortfolioRiskGauge loans={stats.loans} />
          </div>

          {/* SACCO-specific composition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FosaBosaComposition liquidity={stats.liquidity} />
            <LoanProductMix products={loanProductMix} />
          </div>

          {reports && <DelinquencyAging agingBuckets={reports.agingBuckets} />}

          <ExecutiveOverview />
          <GuarantorHealth />
          <MpesaHeatmap />
        </>
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
