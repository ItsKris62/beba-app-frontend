'use client';

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { adminApi, type ExecutiveOverviewRange } from '@/lib/api-client';
import { EXECUTIVE_OVERVIEW_CHART_CONFIG, NEW_MEMBERS_CHART_CONFIG } from '@/lib/chart-colors';

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

export function ExecutiveOverview() {
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

  const overview = query.data?.success ? query.data.data : null;

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
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} isAnimationActive />
                  <Line
                    type="monotone"
                    dataKey="disbursements"
                    stroke="var(--color-disbursements)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
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
