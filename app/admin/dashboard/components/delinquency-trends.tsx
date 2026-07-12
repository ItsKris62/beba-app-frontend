'use client';

import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { adminApi, type DelinquencyTrends as DelinquencyTrendsData } from '@/lib/api-client';
import { DELINQUENCY_TRENDS_CHART_CONFIG } from '@/lib/chart-colors';
import { useLastGoodData } from '@/lib/use-last-good-data';
import type { DashboardDrilldownSelection } from './drilldown-dialog';

type TrendRange = '30d' | '90d' | '1y';
type TrendSeries = 'delinquentLoans' | 'watchlistLoans' | 'nplLoans';

const RANGES: Array<{ value: TrendRange; label: string; days: number }> = [
  { value: '30d', label: '30D', days: 30 },
  { value: '90d', label: '90D', days: 90 },
  { value: '1y', label: '1Y', days: 365 },
];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeWindow(range: TrendRange): { from: string; to: string } {
  const selected = RANGES.find((item) => item.value === range) ?? RANGES[0];
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (selected.days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

function formatBucketDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
  });
}

function drilldownForSeries(series: TrendSeries, date: string): DashboardDrilldownSelection {
  if (series === 'watchlistLoans') {
    return {
      title: `Watchlist loans: ${formatBucketDate(date)}`,
      description: 'Loans captured as WATCHLIST in the selected daily arrears snapshot.',
      query: { source: 'loan', snapshotDate: date, loanStaging: 'WATCHLIST' },
    };
  }

  if (series === 'nplLoans') {
    return {
      title: `NPL loans: ${formatBucketDate(date)}`,
      description: 'Loans captured as NPL in the selected daily arrears snapshot.',
      query: { source: 'loan', snapshotDate: date, loanStaging: 'NPL' },
    };
  }

  return {
    title: `Loans in arrears: ${formatBucketDate(date)}`,
    description: 'Loans with arrears days above zero in the selected daily snapshot.',
    query: { source: 'loan', snapshotDate: date, agingBucket: 'arrears' },
  };
}

export function DelinquencyTrends({
  onDrilldown,
}: {
  onDrilldown: (selection: DashboardDrilldownSelection) => void;
}) {
  const [range, setRange] = useState<TrendRange>('30d');
  const params = useMemo(() => rangeWindow(range), [range]);

  const query = useQuery({
    queryKey: ['admin-delinquency-trends', params.from, params.to],
    queryFn: () => adminApi.getDelinquencyTrends(params),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: keepPreviousData,
  });

  const trends = useLastGoodData<DelinquencyTrendsData>(query.data);
  const chartData = useMemo(
    () =>
      (trends?.points ?? []).map((point) => ({
        ...point,
        label: formatBucketDate(point.date),
      })),
    [trends],
  );
  const loading = query.isLoading;
  const hasData = chartData.some(
    (point) => point.delinquentLoans > 0 || point.watchlistLoans > 0 || point.nplLoans > 0,
  );
  const openDrilldown = (series: TrendSeries, point: unknown) => {
    const row = point as { payload?: { date?: string } };
    if (!row.payload?.date) return;
    onDrilldown(drilldownForSeries(series, row.payload.date));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">Delinquency Trends</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((item) => (
            <button
              key={item.value}
              onClick={() => setRange(item.value)}
              className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                range === item.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72" />
        ) : !hasData ? (
          <p className="text-muted-foreground text-sm">No arrears snapshots in this window yet.</p>
        ) : (
          <ChartContainer config={DELINQUENCY_TRENDS_CHART_CONFIG} className="h-[260px] w-full">
            <LineChart
              accessibilityLayer
              aria-label="Loan delinquency counts over time"
              data={chartData}
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={() => ''}
                    formatter={(value, name) => (
                      <div className="flex w-full justify-between gap-3">
                        <span className="text-muted-foreground">
                          {DELINQUENCY_TRENDS_CHART_CONFIG[name as string]?.label ?? String(name)}
                        </span>
                        <span className="font-mono font-medium">
                          {Number(value ?? 0).toLocaleString('en-KE')} loans
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="delinquentLoans"
                stroke="var(--color-delinquentLoans)"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                onClick={(point) => openDrilldown('delinquentLoans', point)}
                style={{ cursor: 'pointer' }}
              />
              <Line
                type="monotone"
                dataKey="watchlistLoans"
                stroke="var(--color-watchlistLoans)"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                onClick={(point) => openDrilldown('watchlistLoans', point)}
                style={{ cursor: 'pointer' }}
              />
              <Line
                type="monotone"
                dataKey="nplLoans"
                stroke="var(--color-nplLoans)"
                strokeWidth={2}
                dot={false}
                isAnimationActive
                onClick={(point) => openDrilldown('nplLoans', point)}
                style={{ cursor: 'pointer' }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
