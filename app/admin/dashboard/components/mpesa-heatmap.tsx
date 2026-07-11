'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi } from '@/lib/api-client';
import { heatmapColor } from '@/lib/chart-colors';

const DAYS = 7;
const HOUR_LABELS = [0, 3, 6, 9, 12, 15, 18, 21];

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function MpesaHeatmap() {
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const query = useQuery({
    queryKey: ['admin-mpesa-heatmap', DAYS],
    queryFn: () => adminApi.getMpesaHeatmap(DAYS),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Detect dark mode from the root element so heatmap cell colors match the
  // active theme (this chart doesn't go through ChartContainer's CSS-var
  // theming since it's a plain table, not a recharts component). Watches
  // for theme-toggle class changes rather than only checking once on mount.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const heatmap = query.data?.success ? query.data.data : null;
  const loading = query.isLoading;

  const { days, byCell, max } = useMemo(() => {
    const days = lastNDays(DAYS);
    const byCell = new Map<string, { totalAmount: number; transactionCount: number }>();
    let max = 0;
    for (const b of heatmap?.buckets ?? []) {
      byCell.set(`${b.day}_${b.hour}`, { totalAmount: b.totalAmount, transactionCount: b.transactionCount });
      if (b.totalAmount > max) max = b.totalAmount;
    }
    return { days, byCell, max };
  }, [heatmap]);

  const hasData = (heatmap?.buckets.length ?? 0) > 0;
  const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">M-Pesa Deposit Heatmap (Last {DAYS} Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56" />
        ) : !hasData ? (
          <p className="text-muted-foreground text-sm">No completed M-Pesa deposits in the last {DAYS} days</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs" style={{ minWidth: '640px' }} aria-label="M-Pesa deposit volume by day and hour">
              <caption className="sr-only">
                M-Pesa completed deposit volume for the last {DAYS} days, broken down by hour of day. Darker cells mean higher deposit volume.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="text-left text-muted-foreground font-normal pr-2 pb-1 sticky left-0 bg-card">
                    Day
                  </th>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <th key={hour} scope="col" className="font-normal text-muted-foreground pb-1" style={{ width: 22 }}>
                      {HOUR_LABELS.includes(hour) ? hour : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day}>
                    <th scope="row" className="text-left text-muted-foreground font-normal pr-2 whitespace-nowrap sticky left-0 bg-card">
                      {dayLabel(day)}
                    </th>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const cell = byCell.get(`${day}_${hour}`);
                      const amount = cell?.totalAmount ?? 0;
                      return (
                        <td
                          key={hour}
                          title={`${dayLabel(day)} ${hour}:00 — KES ${amount.toLocaleString('en-KE')} (${cell?.transactionCount ?? 0} txns)`}
                          style={{
                            backgroundColor: heatmapColor(amount, max, isDark),
                            width: 22,
                            height: 22,
                            border: '1px solid var(--border)',
                          }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">Hover a cell for exact amount and transaction count.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
