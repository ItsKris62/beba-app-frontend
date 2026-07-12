'use client';

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { adminApi, type ExecutiveOverview as ExecutiveOverviewData, type ExecutiveOverviewRange } from '@/lib/api-client';
import { EXECUTIVE_OVERVIEW_CHART_CONFIG, NEW_MEMBERS_CHART_CONFIG } from '@/lib/chart-colors';
import { useLastGoodData } from '@/lib/use-last-good-data';
import type { DashboardDrilldownSelection } from './drilldown-dialog';

const RANGES: Array<{ value: ExecutiveOverviewRange; label: string }> = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

function formatBucketDate(iso: string, range: ExecutiveOverviewRange): string {
  const d = new Date(iso);
  return range === '1y'
    ? d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
    : d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

function bucketRange(iso: string, range: ExecutiveOverviewRange): { from: string; to: string } {
  const from = new Date(iso);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + (range === '1y' ? 6 : 0));
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function ExecutiveOverview({ onDrilldown }: { onDrilldown: (selection: DashboardDrilldownSelection) => void }) {
  const [range, setRange] = useState<ExecutiveOverviewRange>('30d');

  const query = useQuery({
    queryKey: ['admin-executive-overview', range],
    queryFn: () => adminApi.getExecutiveOverview(range),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Keep the previous range's chart visible while the new range loads,
    // instead of flashing a blank/skeleton state on every toggle.
    placeholderData: keepPreviousData,
  });

  // Sticky (no resetKey): a transient failure on a background 5-min poll,
  // or on the very first fetch after switching range, must not null this
  // out and blank the chart — `placeholderData: keepPreviousData` above
  // already keeps the previous range's data visible during a range
  // switch, so staying sticky here just extends that same "never go
  // blank" guarantee to cover a failed fetch too, not just an in-flight one.
  const overview = useLastGoodData<ExecutiveOverviewData>(query.data);

  const moneyData = useMemo(() => {
    if (!overview) return [];
    const byDate = new Map<string, { date: string; revenue: number; disbursements: number }>();
    for (const r of overview.revenue) {
      byDate.set(r.date, { date: r.date, revenue: r.amount, disbursements: 0 });
    }
    for (const d of overview.disbursements) {
      const existing = byDate.get(d.date);
      if (existing) existing.disbursements = d.amount;
      else byDate.set(d.date, { date: d.date, revenue: 0, disbursements: d.amount });
    }
    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({ ...row, label: formatBucketDate(row.date, range) }));
  }, [overview, range]);

  const memberData = useMemo(
    () =>
      (overview?.newMembers ?? [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((row) => ({ ...row, label: formatBucketDate(row.date, range) })),
    [overview, range],
  );

  const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;
  const openMoneyDrilldown = (kind: 'revenue' | 'disbursements', point: unknown) => {
    const row = point as { payload?: { date?: string; label?: string } };
    if (!row.payload?.date) return;
    const rangeFilter = bucketRange(row.payload.date, range);
    onDrilldown(
      kind === 'revenue'
        ? {
            title: `Revenue: ${row.payload.label ?? ''}`,
            description: 'Posted journal entries with revenue GL credit postings in the selected bucket.',
            query: { source: 'journal', journalStatus: 'POSTED', creditAccountType: 'REVENUE', ...rangeFilter },
          }
        : {
            title: `Disbursements: ${row.payload.label ?? ''}`,
            description: 'Loans disbursed in the selected bucket.',
            query: { source: 'loan', loanDateField: 'disbursedAt', ...rangeFilter },
          },
    );
  };
  const openMemberDrilldown = (point: unknown) => {
    const row = point as { payload?: { date?: string; label?: string } };
    if (!row.payload?.date) return;
    onDrilldown({
      title: `New Members: ${row.payload.label ?? ''}`,
      description: 'Members who joined in the selected bucket.',
      query: { source: 'member', ...bucketRange(row.payload.date, range) },
    });
  };
  const loading = query.isLoading;
  const hasData = moneyData.some((d) => d.revenue > 0 || d.disbursements > 0) || memberData.some((d) => d.count > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Executive Overview</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                range === r.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72" />
        ) : !hasData ? (
          <p className="text-muted-foreground text-sm">
            No revenue, disbursement, or membership activity in this window yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Revenue vs Disbursements</p>
              <ChartContainer config={EXECUTIVE_OVERVIEW_CHART_CONFIG} className="h-[220px] w-full">
                <LineChart accessibilityLayer aria-label="Revenue and disbursements over time" data={moneyData} margin={{ left: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toLocaleString()}k`} width={44} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={() => ''}
                        formatter={(value, name) => (
                          <div className="flex w-full justify-between gap-3">
                            <span className="text-muted-foreground">
                              {EXECUTIVE_OVERVIEW_CHART_CONFIG[name as string]?.label ?? String(name)}
                            </span>
                            <span className="font-mono font-medium">{fmt(value as number)}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    onClick={(point) => openMoneyDrilldown('revenue', point)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="disbursements"
                    stroke="var(--color-disbursements)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    onClick={(point) => openMoneyDrilldown('disbursements', point)}
                    style={{ cursor: 'pointer' }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">New Members</p>
              <ChartContainer config={NEW_MEMBERS_CHART_CONFIG} className="h-[220px] w-full">
                <LineChart accessibilityLayer aria-label="New members over time" data={memberData} margin={{ left: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={() => ''} />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="newMembers"
                    stroke="var(--color-newMembers)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    onClick={openMemberDrilldown}
                    style={{ cursor: 'pointer' }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
