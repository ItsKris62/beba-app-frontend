'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi, type RealTimeAnalyticsSnapshot } from '@/lib/api-client';

const POLL_INTERVAL_MS = 5_000;
const MAX_POINTS = 60; // 5 min of history at 5s intervals

interface Point {
  t: number; // ms epoch, used as the recharts x value
  totalDepositsToday: number;
}

/**
 * "Real-time" here means polling the JSON-snapshot fallback of
 * admin/analytics/real-time every 5s via React Query, not a browser
 * EventSource — see adminApi.getRealTimeAnalyticsSnapshot()'s doc comment
 * for why: EventSource can't carry the Authorization/X-Tenant-ID headers
 * this route requires, and the backend's broadcast trigger
 * (RealTimeAnalyticsService.computeAndBroadcast) is never called anywhere
 * in this codebase today, so a real SSE connection would only ever receive
 * one event. Polling the same computeMetrics() the SSE stream itself is
 * backed by delivers the same fresh-every-5s data with none of that.
 */
export function RealTimeSparkline() {
  const [points, setPoints] = useState<Point[]>([]);
  const [connectionLost, setConnectionLost] = useState(false);
  const lastTimestampRef = useRef<string | null>(null);
  // Mutated every poll tick (including on-success ticks, which are the
  // common case) — kept in a ref rather than state so those frequent
  // updates don't themselves trigger a re-render; only the derived
  // connectionLost *boolean* below is state, and only changes rarely.
  const errorStreakRef = useRef(0);

  const query = useQuery({
    queryKey: ['admin-realtime-snapshot'],
    queryFn: () => adminApi.getRealTimeAnalyticsSnapshot(),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false, // pause while tab is hidden
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const snapshot: RealTimeAnalyticsSnapshot | null = query.data?.success ? query.data.data : null;

  useEffect(() => {
    if (query.status === 'success') {
      errorStreakRef.current = 0;
    } else if (query.status === 'error') {
      errorStreakRef.current += 1;
    }
    const lost = errorStreakRef.current >= 3;
    setConnectionLost((prev) => {
      if (prev === lost) return prev;
      return lost;
    });
  }, [query.status, query.dataUpdatedAt, query.errorUpdatedAt]);

  useEffect(() => {
    if (!snapshot || snapshot.timestamp === lastTimestampRef.current) return;
    lastTimestampRef.current = snapshot.timestamp;
    setPoints((prev) => [
      ...prev.slice(-(MAX_POINTS - 1)),
      { t: new Date(snapshot.timestamp).getTime(), totalDepositsToday: snapshot.totalDepositsToday },
    ]);
  }, [snapshot]);

  const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">M-Pesa Deposits Today (Live)</CardTitle>
        <div className="flex items-center gap-1.5 text-xs">
          {connectionLost ? (
            <span className="text-red-600 font-medium">Connection lost — retrying…</span>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
              </span>
              <span className="text-muted-foreground">Live</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {points.length < 2 ? (
          <p className="text-muted-foreground text-sm">Waiting for the first live reading…</p>
        ) : (
          <>
            <div className="h-[120px] w-full" aria-label="Cumulative M-Pesa deposit volume today, updating every 5 seconds">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="depositsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2a78d6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2a78d6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide type="number" domain={['dataMin', 'dataMax']} />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    labelFormatter={(t) => new Date(t as number).toLocaleTimeString('en-KE')}
                    formatter={(value) => [fmt(value as number), 'Deposits today']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalDepositsToday"
                    stroke="#2a78d6"
                    strokeWidth={2}
                    fill="url(#depositsFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {snapshot && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Today&apos;s Deposits</p>
                  <p className="font-semibold">{fmt(snapshot.totalDepositsToday)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Loans</p>
                  <p className="font-semibold">{snapshot.activeLoans.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending Applications</p>
                  <p className="font-semibold">{snapshot.pendingApplications.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NPL Ratio</p>
                  <p className="font-semibold">{snapshot.nplRatio}%</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
