'use client';

import { useQuery } from '@tanstack/react-query';
import { Cell, Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { adminApi } from '@/lib/api-client';
import { GUARANTOR_HEALTH_CHART_CONFIG, coverageColor, riskColor } from '@/lib/chart-colors';

export function GuarantorHealth() {
  const query = useQuery({
    queryKey: ['admin-guarantor-health'],
    queryFn: () => adminApi.getGuarantorHealth(),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const health = query.data?.success ? query.data.data : null;
  const loading = query.isLoading;

  const data = health
    ? [
        { key: 'full', value: health.loansWithFullCoverage },
        { key: 'partial', value: health.loansWithPartialCoverage },
        { key: 'none', value: health.loansWithNoGuarantors },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Guarantor Network Health</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-72" />
        ) : !health || health.totalActiveLoans === 0 ? (
          <p className="text-muted-foreground text-sm">No active loans to assess guarantor coverage on yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* min-w-0: without it, this grid track sizes to the chart's
                intrinsic (0) width before ResponsiveContainer can measure
                it, and the chart never recovers — a known CSS Grid +
                recharts ResponsiveContainer collapse. */}
            <div className="min-w-0">
            <ChartContainer config={GUARANTOR_HEALTH_CHART_CONFIG} className="w-full max-w-[220px] aspect-square mx-auto">
              <PieChart accessibilityLayer aria-label="Guarantor coverage: full, partial, none">
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                <Pie data={data} dataKey="value" nameKey="key" innerRadius={55} outerRadius={85} strokeWidth={2}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                              {health.totalActiveLoans.toLocaleString()}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 18} className="fill-muted-foreground text-xs">
                              Active Loans
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
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Full Coverage Rate</p>
                <p className="text-xl font-bold" style={{ color: coverageColor(health.coveragePercent) }}>
                  {health.coveragePercent}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Guarantor Default Rate</p>
                <p className="text-xl font-bold" style={{ color: riskColor(health.guarantorDefaultRate) }}>
                  {health.guarantorDefaultRate}%
                </p>
                <p className="text-xs text-muted-foreground">of members guaranteeing a loan have one of their own in arrears</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Guarantors / Loan</p>
                <p className="text-xl font-bold">{health.averageGuarantorsPerLoan}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
