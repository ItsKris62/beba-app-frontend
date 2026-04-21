'use client';

/**
 * Sprint 3 – Member Dashboard Page
 *
 * Shows:
 * - Active loan balance & repayment calendar (Day 1-30)
 * - Weekly savings tracker
 * - Quick actions (view statement, download PDF)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { statementApi, type FosaStatement, type BosaStatement } from '@/lib/sprint3-api';
import Link from 'next/link';

interface LoanSummary {
  loanId: string;
  loanNumber: string;
  principal: number;
  totalRepayable: number;
  totalRepaid: number;
  outstandingBalance: number;
  status: string;
  disbursedAt: string;
  dueDate: string;
  repaymentSchedule: Array<{
    dayNumber: number;
    amountDue: number;
    amountPaid: number;
    paymentDate: string | null;
    status: 'PAID' | 'PENDING' | 'MISSED';
  }>;
}

// ─── Repayment Calendar ───────────────────────────────────────────────────────

function RepaymentCalendar({ schedule }: { schedule: LoanSummary['repaymentSchedule'] }) {
  const statusColors: Record<string, string> = {
    PAID: 'bg-green-500 text-white',
    PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    MISSED: 'bg-red-500 text-white',
  };

  return (
    <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
        const entry = schedule.find((s) => s.dayNumber === day);
        const status = entry?.status ?? 'PENDING';
        return (
          <div
            key={day}
            className={`rounded text-center text-xs py-2 font-medium ${statusColors[status]}`}
            title={
              entry
                ? `Day ${day}: KES ${entry.amountDue.toLocaleString()} – ${status}${entry.paymentDate ? ` (${entry.paymentDate})` : ''}`
                : `Day ${day}: Not scheduled`
            }
          >
            {day}
          </div>
        );
      })}
    </div>
  );
}

// ─── Savings Tracker ──────────────────────────────────────────────────────────

function SavingsTracker({ bosa }: { bosa: BosaStatement | null }) {
  if (!bosa) return null;

  const weeklyData = bosa.transactions
    .filter((t) => t.description.includes('Savings'))
    .slice(-8); // Last 8 weeks

  return (
    <div className="space-y-2">
      {weeklyData.length === 0 ? (
        <p className="text-muted-foreground text-sm">No savings records found</p>
      ) : (
        weeklyData.map((tx, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{tx.description}</span>
            <span className="font-medium text-green-600">+KES {tx.credit.toLocaleString()}</span>
          </div>
        ))
      )}
      <div className="border-t pt-2 flex justify-between font-medium">
        <span>Total Savings</span>
        <span className="text-green-600">KES {bosa.totalSavings.toLocaleString()}</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberDashboardPage() {
  const [fosa, setFosa] = useState<FosaStatement | null>(null);
  const [bosa, setBosa] = useState<BosaStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fosaData, bosaData] = await Promise.allSettled([
          statementApi.getFosa(),
          statementApi.getBosa(),
        ]);
        if (fosaData.status === 'fulfilled') setFosa(fosaData.value);
        if (bosaData.status === 'fulfilled') setBosa(bosaData.value);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Build a mock repayment schedule from FOSA transactions
  const buildSchedule = (): LoanSummary['repaymentSchedule'] => {
    if (!fosa) return [];
    return fosa.transactions
      .filter((t) => t.description.includes('Repayment Day'))
      .map((t) => {
        const dayMatch = t.description.match(/Day (\d+)/);
        const day = dayMatch ? parseInt(dayMatch[1]) : 0;
        return {
          dayNumber: day,
          amountDue: t.credit,
          amountPaid: t.credit,
          paymentDate: t.date,
          status: 'PAID' as const,
        };
      });
  };

  const schedule = buildSchedule();
  const outstandingBalance = fosa?.closingBalance ?? 0;
  const totalSavings = bosa?.totalSavings ?? 0;
  const welfareContributions = bosa?.welfareContributions ?? 0;

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 text-amber-800 p-4 rounded text-sm">
          {error.includes('consent') ? (
            <>
              Please{' '}
              <Link href="/member/statements" className="underline font-medium">
                accept the data consent
              </Link>{' '}
              to view your financial data.
            </>
          ) : (
            error
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/member/statements">
            <Button variant="outline" size="sm">View Statements</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Loan Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                KES {outstandingBalance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {outstandingBalance > 0 ? 'Outstanding' : 'Fully paid'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                KES {totalSavings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Individual savings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Welfare Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                KES {welfareContributions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Group welfare</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Repayment Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Repayment Calendar (30-Day)</CardTitle>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded inline-block" /> Paid
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded inline-block" /> Pending
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded inline-block" /> Missed
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32" />
          ) : schedule.length > 0 ? (
            <RepaymentCalendar schedule={schedule} />
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              No active loan repayment schedule.{' '}
              <Link href="/member/loans" className="underline">View loans</Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Savings Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Savings Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32" />
          ) : (
            <SavingsTracker bosa={bosa} />
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/member/statements">
              <Button variant="outline">📄 FOSA Statement</Button>
            </Link>
            <Link href="/member/statements">
              <Button variant="outline">💰 BOSA Statement</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => statementApi.downloadPdf('FOSA')}
            >
              ⬇ Download FOSA PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => statementApi.downloadPdf('BOSA')}
            >
              ⬇ Download BOSA PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
