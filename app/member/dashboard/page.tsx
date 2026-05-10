'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CreditCard, TrendingUp, Users, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  memberApi,
  formatCurrency,
  formatDate,
  formatDateTime,
  type MemberDashboard,
} from '@/lib/api-client';

// ─── Loan status colours ──────────────────────────────────────────────────────

const LOAN_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_APPROVAL: 'bg-purple-100 text-purple-700',
  PENDING_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-teal-100 text-teal-700',
  REJECTED: 'bg-red-100 text-red-700',
  FULLY_PAID: 'bg-gray-100 text-gray-600',
  DEFAULTED: 'bg-red-100 text-red-700',
};

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  title,
  value,
  sub,
  variant = 'default',
}: {
  title: string;
  value: string;
  sub?: string;
  variant?: 'default' | 'green' | 'red' | 'blue';
}) {
  const valueColor =
    variant === 'green'
      ? 'text-green-600'
      : variant === 'red'
      ? 'text-red-600'
      : variant === 'blue'
      ? 'text-blue-600'
      : 'text-foreground';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MemberDashboardPage() {
  const [dashboard, setDashboard] = useState<MemberDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await memberApi.getDashboard();
      if (res.success && res.data) {
        setDashboard(res.data);
      } else {
        setError(res.error?.message ?? 'Failed to load dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Derived values
  const loanBalance = dashboard?.activeLoans.reduce(
    (sum, l) => sum + l.outstandingBalance,
    0,
  ) ?? 0;
  const totalSavings = dashboard?.balances.bosa ?? 0;
  const fosaBalance = dashboard?.balances.fosa ?? 0;
  const kycStatus = dashboard?.member.kycStatus ?? 'UNKNOWN';
  const isKycApproved = kycStatus === 'APPROVED';

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 text-amber-800 p-4 rounded text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadDashboard}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          {dashboard && (
            <p className="text-sm text-muted-foreground">
              Welcome back, {dashboard.member.name} · {dashboard.member.memberNumber}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryCard
            title="Loan Balance"
            value={formatCurrency(loanBalance)}
            sub={loanBalance > 0 ? `${dashboard?.activeLoans.length} active loan(s)` : 'No outstanding loans'}
            variant={loanBalance > 0 ? 'red' : 'green'}
          />
          <SummaryCard
            title="Total Savings"
            value={formatCurrency(totalSavings)}
            sub="BOSA share capital"
            variant="green"
          />
          <SummaryCard
            title="Welfare Contributions"
            value={formatCurrency(fosaBalance)}
            sub="FOSA balance"
            variant="blue"
          />
        </div>
      )}

      {!loading && dashboard && !isKycApproved && (
        <Alert className="border-amber-200 bg-amber-50">
          <ShieldCheck className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">KYC verification required</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Your KYC status is {kycStatus.replace(/_/g, ' ')}. Loan applications open after staff approval.
              {dashboard.member.kycRejectionReason ? ` Reason: ${dashboard.member.kycRejectionReason}` : ''}
            </span>
            <Link href="/member/profile">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                View Profile
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Guarantor Requests */}
      {!loading && dashboard && dashboard.pendingGuarantorRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-800 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pending Guarantor Requests ({dashboard.pendingGuarantorRequests.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              Members requesting your guarantee on their loans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.pendingGuarantorRequests.map((req) => (
              <div
                key={req.guarantorId}
                className="flex items-center justify-between rounded bg-white border border-amber-200 p-3"
              >
                <div>
                  <p className="font-medium text-sm">{req.applicantName}</p>
                  <p className="text-xs text-muted-foreground">
                    Loan {req.loanNumber} · {formatCurrency(req.loanAmount)}
                  </p>
                  <p className="text-xs font-medium text-amber-700">
                    Your guarantee: {formatCurrency(req.guaranteedAmount)}
                  </p>
                </div>
                <Link href={`/member/loans#guarantor`}>
                  <Button size="sm" variant="outline" className="gap-1 text-amber-800 border-amber-300">
                    Respond <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Loans */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Active Loans</CardTitle>
            <CardDescription>Your current loan obligations</CardDescription>
          </div>
          <Link href="/member/loans">
            <Button variant="outline" size="sm" className="gap-1">
              <CreditCard className="h-4 w-4" /> All Loans
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24" />
          ) : dashboard?.activeLoans.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CreditCard className="mx-auto h-8 w-8 mb-2 opacity-40" />
              No active loans.{' '}
              <Link href="/member/loans" className="underline">Apply for a loan</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard?.activeLoans.map((loan) => (
                <div key={loan.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{loan.loanNumber}</p>
                    <Badge className="bg-green-100 text-green-700 text-xs">ACTIVE</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Principal</p>
                      <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outstanding</p>
                      <p className="font-medium text-red-600">{formatCurrency(loan.outstandingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly</p>
                      <p className="font-medium">{formatCurrency(loan.monthlyInstalment)}</p>
                    </div>
                  </div>
                  {loan.dueDate && (
                    <p className="text-xs text-muted-foreground">Due: {formatDate(loan.dueDate)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Last transactions across your accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32" />
          ) : !dashboard?.recentTransactions.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recent transactions.{' '}
              <Link href="/member/statements" className="underline">View statements</Link>
            </p>
          ) : (
            <div className="space-y-2">
              {dashboard.recentTransactions.map((tx) => {
                const isCredit = ['DEPOSIT', 'LOAN_DISBURSEMENT', 'INTEREST_EARNED', 'DIVIDEND_PAYOUT'].includes(tx.type);
                return (
                  <div key={tx.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <p className="text-sm font-medium">{tx.description ?? tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.account.accountType} · {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${isCredit ? 'text-green-600' : 'text-destructive'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bal: {formatCurrency(tx.balanceAfter)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
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
              <Button variant="outline">FOSA Statement</Button>
            </Link>
            <Link href="/member/statements">
              <Button variant="outline">BOSA Statement</Button>
            </Link>
            <Link href="/member/accounts#deposit">
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                M-Pesa Deposit
              </Button>
            </Link>
            {isKycApproved ? (
              <Link href="/member/loans">
                <Button variant="outline">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Apply for Loan
                </Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>
                <CreditCard className="mr-2 h-4 w-4" />
                KYC Pending
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
