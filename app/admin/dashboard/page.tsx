'use client';

/**
 * Sprint 3 – Admin Dashboard Page
 * Role: SUPER_ADMIN, TENANT_ADMIN, MANAGER, AUDITOR
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardApi, type DashboardStats } from '@/lib/sprint3-api';

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

function RepaymentHeatmap({
  data,
}: {
  data: Array<{ dayNumber: number; totalPaid: number; count: number }>;
}) {
  const maxPaid = Math.max(...data.map((d) => d.totalPaid), 1);
  const colors = ['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-600', 'bg-green-800'];

  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
        const entry = data.find((d) => d.dayNumber === day);
        const intensity = entry ? Math.min(4, Math.round((entry.totalPaid / maxPaid) * 4)) : 0;
        return (
          <div
            key={day}
            className={`${colors[intensity]} rounded text-center text-xs py-2 cursor-default`}
            title={`Day ${day}: KES ${entry?.totalPaid.toLocaleString() ?? 0} (${entry?.count ?? 0} payments)`}
          >
            {day}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 bg-red-50 p-4 rounded">{error}</div>
        <Button className="mt-4" onClick={() => void load()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          {stats && (
            <p className="text-xs text-muted-foreground">
              Updated: {new Date(stats.generatedAt).toLocaleTimeString()} · Cache until:{' '}
              {new Date(stats.cachedUntil).toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Grid */}
      {loading || !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Total Members" value={(stats.totalMembers ?? 0).toLocaleString()} subtitle={`${stats.activeMembers ?? 0} active`} colorClass="text-blue-600" />
          <KpiCard title="KYC Queue" value={(stats.pendingKyc ?? 0).toLocaleString()} subtitle="Awaiting staff review" colorClass={(stats.pendingKyc ?? 0) > 0 ? 'text-amber-600' : 'text-green-600'} />
          <KpiCard title="Total Disbursed" value={fmt(stats.totalDisbursed ?? 0)} subtitle={`${stats.activeLoansCount ?? 0} active loans`} colorClass="text-green-600" />
          <KpiCard title="Collection Rate" value={`${stats.collectionRate ?? 0}%`} subtitle={`${fmt(stats.totalRepaid ?? 0)} repaid`} colorClass={(stats.collectionRate ?? 0) >= 80 ? 'text-green-600' : 'text-yellow-600'} />
          <KpiCard title="Default Rate" value={`${stats.defaultRate ?? 0}%`} subtitle={`${stats.defaultedLoans ?? 0} defaulted`} colorClass={(stats.defaultRate ?? 0) > 10 ? 'text-red-600' : 'text-green-600'} />
          <KpiCard title="Outstanding" value={fmt(stats.outstandingBalance ?? 0)} colorClass="text-yellow-600" />
          <KpiCard title="Total Savings" value={fmt(stats.totalSavings ?? 0)} colorClass="text-blue-600" />
          <KpiCard title="Welfare Collected" value={fmt(stats.welfareCollected ?? 0)} colorClass="text-green-600" />
          <KpiCard title="Welfare Deficit" value={fmt(stats.welfareDeficit ?? 0)} colorClass={(stats.welfareDeficit ?? 0) > 0 ? 'text-red-600' : 'text-green-600'} />
        </div>
      )}

      {!loading && stats && stats.pendingKyc > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base text-amber-900">KYC review needed</CardTitle>
              <p className="text-sm text-amber-800">
                {stats.pendingKyc} member{stats.pendingKyc === 1 ? '' : 's'} cannot apply for loans until KYC is approved.
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Repayment Heatmap (30-Day)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-32" /> : <RepaymentHeatmap data={stats?.repaymentHeatmap ?? []} />}
            <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-100 rounded inline-block" /> None</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded inline-block" /> Moderate</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-800 rounded inline-block" /> High</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Disbursements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48" /> : (
              <div className="space-y-2">
                {(stats?.recentDisbursements ?? []).slice(0, 6).map((loan) => (
                  <div key={loan.loanId} className="flex items-center justify-between text-sm border-b pb-1">
                    <div>
                      <span className="font-medium">{loan.memberNumber}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{new Date(loan.disbursedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>KES {loan.principal.toLocaleString()}</span>
                      <Badge variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">{loan.status}</Badge>
                    </div>
                  </div>
                ))}
                {(stats?.recentDisbursements ?? []).length === 0 && (
                  <p className="text-muted-foreground text-sm">No recent disbursements</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage Welfare Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage Welfare Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Stage</th>
                    <th className="text-right py-2">Week</th>
                    <th className="text-right py-2">Collected</th>
                    <th className="text-right py-2">Target</th>
                    <th className="text-right py-2">Deficit</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.stageWelfareTable ?? []).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="py-2">{row.stageName}</td>
                      <td className="text-right py-2">{row.weekNumber}</td>
                      <td className="text-right py-2">KES {row.amountCollected.toLocaleString()}</td>
                      <td className="text-right py-2">KES {row.weeklyTarget.toLocaleString()}</td>
                      <td className={`text-right py-2 font-medium ${row.deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {row.deficit > 0 ? `-KES ${row.deficit.toLocaleString()}` : '✓'}
                      </td>
                    </tr>
                  ))}
                  {(stats?.stageWelfareTable ?? []).length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No welfare data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
