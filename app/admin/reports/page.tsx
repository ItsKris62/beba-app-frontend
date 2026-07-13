'use client';

/**
 * Sprint 3 – Admin Reports Page
 *
 * - Loans by status chart
 * - Savings by week chart
 * - Top defaulters table
 * - Export filters (date range, type)
 * - PDF export trigger
 * - Compliance audit viewer
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { adminApi, memberApi, type AdminDashboardReports } from '@/lib/api-client';
import { LOAN_STATUS_CHART_CONFIG, SAVINGS_CHART_CONFIG, UNKNOWN_STATUS_COLOR } from '@/lib/chart-colors';
import { useNetworkErrorAutoRetry } from '@/lib/use-network-error-retry';
import { useLastGoodData } from '@/lib/use-last-good-data';

function LoansByStatusChart({ data }: { data: AdminDashboardReports['loansByStatus'] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No loan data</p>;
  }
  return (
    <ChartContainer config={LOAN_STATUS_CHART_CONFIG} className="h-[240px] w-full">
      <RechartsBarChart accessibilityLayer aria-label="Loan count by status" data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" dataKey="count" hide />
        <YAxis
          type="category"
          dataKey="status"
          tickLine={false}
          axisLine={false}
          width={90}
          tickFormatter={(status: string) => LOAN_STATUS_CHART_CONFIG[status]?.label as string ?? status}
        />
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
        <Bar dataKey="count" radius={4}>
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
        </Bar>
      </RechartsBarChart>
    </ChartContainer>
  );
}

function SavingsByWeekChart({ data }: { data: AdminDashboardReports['savingsByWeek'] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No savings data</p>;
  }
  const chartData = data.map((w) => ({ week: `Wk ${w.weekNumber}`, amount: w.totalAmount, memberCount: w.memberCount }));
  return (
    <ChartContainer config={SAVINGS_CHART_CONFIG} className="h-[240px] w-full">
      <RechartsBarChart accessibilityLayer aria-label="Savings deposited by week" data={chartData} margin={{ left: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `KES ${(v / 1000).toLocaleString()}k`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              nameKey="amount"
              formatter={(value, _name, item) => {
                const memberCount = (item.payload as { memberCount: number }).memberCount;
                return (
                  <div className="flex w-full justify-between gap-3">
                    <span className="text-muted-foreground">Savings</span>
                    <span className="font-mono font-medium">
                      KES {value.toLocaleString()} · {memberCount} members
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
      </RechartsBarChart>
    </ChartContainer>
  );
}

export default function AdminReportsPage() {
  const [exportType, setExportType] = useState<'FOSA' | 'BOSA'>('FOSA');
  const [exportMemberId, setExportMemberId] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Silent background refresh, 60s cadence — same reasoning as the admin
  // dashboard page: isLoading (initial-fetch-only in v5) gates the skeleton,
  // so a background refetchInterval tick never flashes stale charts away.
  const reportsQuery = useQuery({
    queryKey: ['admin-dashboard-reports'],
    queryFn: () => adminApi.getDashboardReports(),
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  // Sticky: only updates on an actually-successful response, so a
  // transient failure on a background poll doesn't null this back out and
  // tear down the already-rendered charts (see use-last-good-data.ts).
  const reports = useLastGoodData<AdminDashboardReports>(reportsQuery.data);

  // Same reasoning as the admin dashboard page: apiFetch() resolves rather
  // than rejects on a network failure, so React Query's own `retry` never
  // engages here — this hook drives its own backoff loop so a Render
  // cold-started backend (~30-60s to wake) doesn't strand the page on the
  // very first failed attempt.
  const reportsNetworkError = reportsQuery.data != null && !reportsQuery.data.success && reportsQuery.data.error?.code === 'NETWORK_ERROR';
  const reportsRetry = useNetworkErrorAutoRetry(reportsQuery.data, !!reports, reportsQuery.refetch);
  const wakingUp = !reports && reportsNetworkError && !reportsRetry.exhausted;
  const loading = reportsQuery.isLoading || wakingUp;

  // Only the initial fetch failing (and only once the wake-up retry loop
  // has given up) blanks the page — a later background refetch failing
  // leaves the last-good report data on screen.
  const loadError =
    !reports && !wakingUp && (reportsQuery.isError || (reportsQuery.data && !reportsQuery.data.success))
      ? reportsQuery.data?.error?.message ??
        (reportsQuery.error instanceof Error ? reportsQuery.error.message : 'Failed to load reports')
      : null;

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!exportMemberId.trim()) {
      setExportError('Member ID is required to export a statement.');
      return;
    }
    setExporting(format);
    try {
      const params = {
        memberId: exportMemberId.trim(),
        ...(exportFrom ? { periodFrom: exportFrom } : {}),
        ...(exportTo ? { periodTo: exportTo } : {}),
      };
      if (format === 'pdf') await memberApi.downloadStatementPdf(exportType, params);
      else await memberApi.downloadStatementCsv(exportType, params);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Failed to export statement');
    } finally {
      setExporting(null);
    }
  };

  if (wakingUp) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <div>
            <p className="font-medium">Waking up the server…</p>
            <p className="text-sm text-blue-800">
              This can take up to a minute if the service has been idle. Retrying automatically
              (attempt {reportsRetry.attempt + 1} of 6)…
            </p>
          </div>
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded">
          {reportsNetworkError ? (
            reportsRetry.exhausted ? (
              <>
                <p className="font-medium">We&apos;re having trouble connecting to the server.</p>
                <p className="text-sm mt-1">
                  This may be a temporary network issue. If it continues, please contact support.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">We couldn&apos;t reach the service after several attempts.</p>
                <p className="text-sm mt-1">
                  This usually means it&apos;s still waking up from being idle — wait a moment and try again.
                </p>
              </>
            )
          ) : (
            loadError
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        {reports && (
          <p className="text-xs text-muted-foreground">
            Generated: {new Date(reports.generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Export Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Statement PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
              <div className="flex gap-2">
                {(['FOSA', 'BOSA'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setExportType(t)}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      exportType === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Member ID</label>
              <input
                value={exportMemberId}
                onChange={(e) => setExportMemberId(e.target.value)}
                placeholder="Member UUID"
                className="border rounded px-3 py-1.5 text-sm w-64"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">From</label>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">To</label>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <Button onClick={() => void handleExport('csv')} disabled={exporting != null}>
              {exporting === 'csv' ? 'Generating CSV...' : 'Export CSV'}
            </Button>
            <Button onClick={() => void handleExport('pdf')} disabled={exporting != null}>
              {exporting === 'pdf' ? 'Generating PDF...' : 'Export PDF'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            PDF includes SACCO header, transaction table, audit hash, ODPC disclaimer, and
            CONFIDENTIAL watermark. Generated server-side.
          </p>
          {exportError && <p className="text-xs text-red-600 mt-2">{exportError}</p>}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loans by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loans by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48" />
            ) : (
              <LoansByStatusChart data={reports?.loansByStatus ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Savings by Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings by Week</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48" />
            ) : (
              <SavingsByWeekChart
                data={reports?.savingsByWeek ?? []}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Defaulters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Defaulters</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Member No.</th>
                    <th className="text-right py-2">Outstanding</th>
                    <th className="text-right py-2">Days in Arrears</th>
                    <th className="text-right py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {(reports?.topDefaulters ?? []).map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="py-2 font-medium">{d.memberNumber}</td>
                      <td className="text-right py-2 text-red-600">
                        KES {d.outstandingBalance.toLocaleString()}
                      </td>
                      <td className="text-right py-2">{d.arrearsDays} days</td>
                      <td className="text-right py-2">
                        <Badge
                          className={
                            d.arrearsDays > 60
                              ? 'bg-red-100 text-red-800'
                              : d.arrearsDays > 30
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-orange-100 text-orange-800'
                          }
                        >
                          {d.arrearsDays > 60 ? 'HIGH' : d.arrearsDays > 30 ? 'MEDIUM' : 'LOW'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(reports?.topDefaulters ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted-foreground">
                        No defaulters 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800">
            <strong>🔒 ODPC Compliance:</strong> All reports are generated under the Kenya Data
            Protection Act 2019. Financial records are retained for 7 years. Non-financial audit
            logs are retained for 2 years. PII is masked in TELLER-role views. All exports are
            audit-logged with IP address and timestamp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
