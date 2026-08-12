'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, TrendingUp, Users, ArrowRight, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  memberApi,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateIdempotencyKey,
  type MemberDashboard,
  type WithdrawalStatusResponse,
} from '@/lib/api-client';
import { getFormattedStatusLabel, isKycVerified } from '@/lib/kyc-status';

// ─── Loan status colours ──────────────────────────────────────────────────────

const LOAN_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING_APPROVAL: 'bg-purple-100 text-purple-700',
  PENDING_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-teal-100 text-teal-700',
  REJECTED: 'bg-red-100 text-red-700',
  DISBURSED_TO_FOSA: 'bg-indigo-100 text-indigo-700',
  FULLY_PAID: 'bg-gray-100 text-gray-600',
  DEFAULTED: 'bg-red-100 text-red-700',
};

const WITHDRAWAL_ATTEMPT_STORAGE_KEY = 'beba.member.withdrawalAttempt.v1';
const WITHDRAWAL_STATUS_STORAGE_KEY = 'beba.member.activeWithdrawal.v1';
const WITHDRAWAL_FEE = 0;

type WithdrawalStep = 'form' | 'confirm' | 'status';

function isTerminalWithdrawal(status?: WithdrawalStatusResponse | null) {
  return Boolean(status?.terminal);
}

function withdrawalStatusTone(memberStatus?: string | null) {
  if (memberStatus === 'COMPLETED') return 'text-green-700 bg-green-50 border-green-200';
  if (memberStatus === 'FAILED_FUNDS_RESTORED') return 'text-red-700 bg-red-50 border-red-200';
  if (memberStatus === 'CONFIRMATION_DELAYED') return 'text-amber-800 bg-amber-50 border-amber-200';
  return 'text-blue-700 bg-blue-50 border-blue-200';
}

function WithdrawalStatusIcon({ memberStatus }: { memberStatus?: string | null }) {
  if (memberStatus === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-green-700" />;
  if (memberStatus === 'FAILED_FUNDS_RESTORED') return <AlertCircle className="h-4 w-4 text-red-700" />;
  return <Clock3 className="h-4 w-4 text-blue-700" />;
}

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
        <div className={`text-2xl font-bold ${valueColor}`} aria-label={`${title}: ${value}`}>{value}</div>
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

  // Withdraw state
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawStep, setWithdrawStep] = useState<WithdrawalStep>('form');
  const [withdrawAttemptKey, setWithdrawAttemptKey] = useState<string | null>(null);
  const [withdrawAttemptFingerprint, setWithdrawAttemptFingerprint] = useState<string | null>(null);
  const [activeWithdrawalId, setActiveWithdrawalId] = useState<string | null>(null);
  const [activeWithdrawalReference, setActiveWithdrawalReference] = useState<string | null>(null);
  const [transportUncertain, setTransportUncertain] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

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

  const withdrawalStatusQuery = useQuery({
    queryKey: ['member-withdrawal-status', activeWithdrawalId],
    queryFn: async () => {
      if (!activeWithdrawalId) throw new Error('Missing withdrawal id');
      const res = await memberApi.getWithdrawalStatus(activeWithdrawalId);
      if (!res.success || !res.data) {
        throw new Error(res.error?.message ?? 'Unable to load withdrawal status');
      }
      return res.data;
    },
    enabled: Boolean(activeWithdrawalId),
    refetchInterval: (query) => (isTerminalWithdrawal(query.state.data) ? false : 5_000),
    refetchIntervalInBackground: false,
    retry: 1,
  });

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WITHDRAWAL_ATTEMPT_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { key?: string; fingerprint?: string };
      if (saved.key && saved.fingerprint) {
        setWithdrawAttemptKey(saved.key);
        setWithdrawAttemptFingerprint(saved.fingerprint);
      }
    } catch {
      window.localStorage.removeItem(WITHDRAWAL_ATTEMPT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WITHDRAWAL_STATUS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { transactionId?: string; reference?: string };
      if (saved.transactionId) {
        setActiveWithdrawalId(saved.transactionId);
        setActiveWithdrawalReference(saved.reference ?? null);
      }
    } catch {
      window.localStorage.removeItem(WITHDRAWAL_STATUS_STORAGE_KEY);
    }
  }, []);

  const clearWithdrawalAttempt = useCallback(() => {
    setWithdrawAttemptKey(null);
    setWithdrawAttemptFingerprint(null);
    window.localStorage.removeItem(WITHDRAWAL_ATTEMPT_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const status = withdrawalStatusQuery.data;
    if (!status) return;
    setActiveWithdrawalReference(status.reference);
    if (status.terminal) {
      clearWithdrawalAttempt();
      loadDashboard();
    }
  }, [withdrawalStatusQuery.data, clearWithdrawalAttempt, loadDashboard]);

  const getWithdrawalAttemptKey = useCallback(
    (fingerprint: string) => {
      if (withdrawAttemptKey && withdrawAttemptFingerprint === fingerprint) {
        return withdrawAttemptKey;
      }
      const key = generateIdempotencyKey();
      setWithdrawAttemptKey(key);
      setWithdrawAttemptFingerprint(fingerprint);
      window.localStorage.setItem(
        WITHDRAWAL_ATTEMPT_STORAGE_KEY,
        JSON.stringify({ key, fingerprint }),
      );
      return key;
    },
    [withdrawAttemptFingerprint, withdrawAttemptKey],
  );

  const handleWithdraw = async () => {
    const amountNum = Number(withdrawAmount);
    if (!withdrawAmount || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const maxAmount = dashboard?.balances.fosa ?? 0;
    if (amountNum > maxAmount) {
      toast.error('Insufficient FOSA balance for this withdrawal');
      return;
    }
    setWithdrawing(true);
    setTransportUncertain(false);
    const fingerprint = JSON.stringify({ amount: amountNum });
    const attemptKey = getWithdrawalAttemptKey(fingerprint);
    try {
      const res = await memberApi.withdrawMpesa({ amount: amountNum }, attemptKey);
      if (res.success) {
        setActiveWithdrawalId(res.data.transactionId);
        setActiveWithdrawalReference(res.data.reference);
        setWithdrawStep('status');
        window.localStorage.setItem(
          WITHDRAWAL_STATUS_STORAGE_KEY,
          JSON.stringify({ transactionId: res.data.transactionId, reference: res.data.reference }),
        );
        loadDashboard();
      } else {
        toast.error(res.error?.message || 'Withdrawal failed');
      }
    } catch {
      setTransportUncertain(true);
      toast.error('We are checking whether your withdrawal was received. Please do not start a new withdrawal yet.');
    } finally {
      setWithdrawing(false);
    }
  };

  // Derived values
  const loanBalance = dashboard?.activeLoans.reduce(
    (sum, l) => sum + l.outstandingBalance,
    0,
  ) ?? 0;
  const totalSavings = dashboard?.balances.bosa ?? 0;
  const fosaBalance = dashboard?.balances.fosa ?? 0;
  const kycStatus = dashboard?.member.kycStatus ?? 'UNKNOWN';
  const isKycApproved = isKycVerified(kycStatus);
  const currentLoans = dashboard?.activeLoans.filter((loan) => loan.status !== 'FULLY_PAID') ?? [];
  const completedLoans = dashboard?.activeLoans.filter((loan) => loan.status === 'FULLY_PAID') ?? [];
  const withdrawalDestination = dashboard?.member.withdrawalDestination;
  const withdrawalAmountValue = Number(withdrawAmount);
  const totalDebit = Number.isFinite(withdrawalAmountValue) ? withdrawalAmountValue + WITHDRAWAL_FEE : 0;
  const expectedRemaining = fosaBalance - totalDebit;
  const canUseWithdrawal =
    Boolean(withdrawalDestination?.verified) &&
    withdrawalDestination?.status === 'VERIFIED' &&
    fosaBalance > 0;
  const activeWithdrawalStatus = withdrawalStatusQuery.data ?? null;
  const activeStatusLabel =
    activeWithdrawalStatus?.memberStatusLabel ??
    (activeWithdrawalReference ? 'Processing' : null);

  const resetWithdrawalDialog = useCallback(() => {
    if (!activeWithdrawalStatus || activeWithdrawalStatus.terminal) {
      if (activeWithdrawalStatus?.terminal) {
        setActiveWithdrawalId(null);
        setActiveWithdrawalReference(null);
        window.localStorage.removeItem(WITHDRAWAL_STATUS_STORAGE_KEY);
      }
      setWithdrawStep('form');
      setWithdrawAmount('');
      setTransportUncertain(false);
    }
  }, [activeWithdrawalStatus]);

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
            sub={loanBalance > 0 ? `${currentLoans.length} active loan(s)` : 'No outstanding loans'}
            variant={loanBalance > 0 ? 'red' : 'green'}
          />
          <SummaryCard
            title="Total Savings"
            value={formatCurrency(totalSavings)}
            sub="BOSA share capital"
            variant="green"
          />
          <SummaryCard
            title="FOSA Balance"
            value={formatCurrency(fosaBalance)}
            sub="Available for withdrawal or transfer"
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
              Your KYC status is {getFormattedStatusLabel(kycStatus)}. Loan applications open after staff approval.
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
                <Link href="/member/guarantors">
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
          ) : currentLoans.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <CreditCard className="mx-auto h-8 w-8 mb-2 opacity-40" />
              No active loans.{' '}
              <Link href="/member/loans" className="underline">Apply for a loan</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {currentLoans.map((loan) => (
                <div key={loan.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{loan.loanNumber}</p>
                    <Badge className={`${LOAN_STATUS_COLORS[loan.status ?? 'ACTIVE'] ?? 'bg-green-100 text-green-700'} text-xs`}>
                      {loan.status ?? 'ACTIVE'}
                    </Badge>
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

      {!loading && completedLoans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completed Loans</CardTitle>
            <CardDescription>Loans fully cleared through repayment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedLoans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="text-sm font-medium">{loan.loanNumber}</p>
                  <p className="text-xs text-muted-foreground">Principal {formatCurrency(loan.principalAmount)}</p>
                </div>
                <Badge className="bg-gray-100 text-gray-700">FULLY PAID</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                const isMpesaWithdrawal = tx.type === 'WITHDRAWAL' && Boolean(tx.memberReference);
                return (
                  <div key={tx.id} className="flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{tx.description ?? tx.type}</p>
                        {tx.memberStatusLabel && (
                          <Badge variant="outline" className={withdrawalStatusTone(tx.memberStatus)}>
                            {tx.memberStatusLabel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tx.account.accountType} · {formatDateTime(tx.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
                      {isMpesaWithdrawal && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveWithdrawalId(tx.id);
                            setActiveWithdrawalReference(tx.memberReference ?? null);
                            window.localStorage.setItem(
                              WITHDRAWAL_STATUS_STORAGE_KEY,
                              JSON.stringify({ transactionId: tx.id, reference: tx.memberReference }),
                            );
                            setWithdrawStep('status');
                            setWithdrawOpen(true);
                          }}
                        >
                          Track
                        </Button>
                      )}
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

            <Dialog
              open={withdrawOpen}
              onOpenChange={(open) => {
                setWithdrawOpen(open);
                if (!open) resetWithdrawalDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Smartphone className="mr-2 h-4 w-4" />
                  Withdraw to M-Pesa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Withdraw to M-Pesa</DialogTitle>
                  <DialogDescription>
                    Funds are sent only to the phone number saved on your member profile.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {activeWithdrawalId || withdrawStep === 'status' ? (
                    <div className="space-y-4" aria-live="polite">
                      <div className={`rounded-md border p-3 ${withdrawalStatusTone(activeWithdrawalStatus?.memberStatus)}`}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <WithdrawalStatusIcon memberStatus={activeWithdrawalStatus?.memberStatus} />
                          {activeStatusLabel ?? 'Processing'}
                        </div>
                        {activeWithdrawalStatus?.memberStatus === 'CONFIRMATION_DELAYED' && (
                          <p className="mt-2 text-xs">
                            M-Pesa confirmation is taking longer than usual. Your withdrawal is still being verified.
                            Do not submit another withdrawal for the same amount while this one is being confirmed.
                          </p>
                        )}
                        {withdrawalStatusQuery.isError && (
                          <p className="mt-2 text-xs">Status could not be refreshed. Try again in a moment.</p>
                        )}
                      </div>
                      <div className="grid gap-2 rounded-md border p-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Reference</span>
                          <span className="font-medium text-right">{activeWithdrawalStatus?.reference ?? activeWithdrawalReference}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium">{formatCurrency(Number(activeWithdrawalStatus?.amount ?? withdrawAmount ?? 0))}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Destination</span>
                          <span className="font-medium">{activeWithdrawalStatus?.destination ?? withdrawalDestination?.maskedPhone ?? 'Member profile phone'}</span>
                        </div>
                        {activeWithdrawalStatus?.providerReference && (
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Provider reference</span>
                            <span className="font-medium text-right">{activeWithdrawalStatus.providerReference}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : withdrawStep === 'confirm' ? (
                    <div className="space-y-4">
                      <div className="grid gap-2 rounded-md border p-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium">{formatCurrency(withdrawalAmountValue)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Destination</span>
                          <span className="font-medium">{withdrawalDestination?.maskedPhone}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Fee</span>
                          <span className="font-medium">{formatCurrency(WITHDRAWAL_FEE)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Total debit</span>
                          <span className="font-medium">{formatCurrency(totalDebit)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Available balance</span>
                          <span className="font-medium">{formatCurrency(fosaBalance)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Expected remaining</span>
                          <span className="font-medium">{formatCurrency(expectedRemaining)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                        <span className="text-sm text-muted-foreground">Available FOSA Balance:</span>
                        <span className="font-semibold text-lg">{formatCurrency(fosaBalance)}</span>
                      </div>
                      <div className="rounded-md border p-3">
                        <p className="text-sm text-muted-foreground">M-Pesa destination</p>
                        <p className="mt-1 text-lg font-semibold">{withdrawalDestination?.maskedPhone ?? 'No profile phone'}</p>
                        <p className="text-xs text-muted-foreground">
                          {withdrawalDestination?.status === 'VERIFIED'
                            ? 'Member profile phone'
                            : withdrawalDestination?.status === 'MISSING'
                              ? 'Add your phone number in Profile before withdrawing.'
                              : 'Update your phone number in Profile before withdrawing.'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount to Withdraw</Label>
                        <Input
                          id="amount"
                          type="number"
                          inputMode="decimal"
                          min="1"
                          placeholder="e.g. 5000"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          disabled={!canUseWithdrawal || withdrawing}
                        />
                      </div>
                      {transportUncertain && (
                        <Alert className="border-amber-200 bg-amber-50">
                          <AlertCircle className="h-4 w-4 text-amber-700" />
                          <AlertTitle className="text-amber-900">Checking previous request</AlertTitle>
                          <AlertDescription className="text-amber-800">
                            Reuse this attempt to recover the same withdrawal. Do not start another one yet.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
                <DialogFooter>
                  {activeWithdrawalId || withdrawStep === 'status' ? (
                    <>
                      <Button variant="outline" onClick={() => withdrawalStatusQuery.refetch()} disabled={withdrawalStatusQuery.isFetching}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${withdrawalStatusQuery.isFetching ? 'animate-spin' : ''}`} />
                        Refresh status
                      </Button>
                      <Button onClick={() => setWithdrawOpen(false)}>Close</Button>
                    </>
                  ) : withdrawStep === 'confirm' ? (
                    <>
                      <Button variant="outline" onClick={() => setWithdrawStep('form')} disabled={withdrawing}>
                        Back
                      </Button>
                      <Button onClick={handleWithdraw} disabled={withdrawing || expectedRemaining < 0}>
                        {withdrawing ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Submitting</> : 'Confirm withdrawal'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setWithdrawOpen(false)} disabled={withdrawing}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => setWithdrawStep('confirm')}
                        disabled={!canUseWithdrawal || withdrawing || !withdrawAmount || withdrawalAmountValue <= 0 || expectedRemaining < 0}
                      >
                        Continue
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
