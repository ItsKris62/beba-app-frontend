'use client';

/**
 * Sprint 3 – Member Statements Page
 *
 * - FOSA / BOSA statement selector
 * - Date range filter
 * - Transaction table
 * - PDF download (server-side, with watermark)
 * - ODPC consent gate (ConsentModal)
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  statementApi,
  securityApi,
  type FosaStatement,
  type BosaStatement,
  type StatementTransaction,
} from '@/lib/sprint3-api';

// ─── Consent Modal ────────────────────────────────────────────────────────────

function ConsentModal({ onAccept }: { onAccept: () => void }) {
  const [accepting, setAccepting] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setAccepting(true);
    try {
      await securityApi.acceptConsent('DATA_PROCESSING');
      await securityApi.acceptConsent('STATEMENT_EXPORT');
      onAccept();
    } catch {
      // ignore – user can retry
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4">
        <h2 className="text-xl font-bold">Data Processing Consent</h2>
        <p className="text-sm text-muted-foreground">
          <strong>Kenya Data Protection Act 2019 (ODPC)</strong>
        </p>
        <div className="bg-gray-50 rounded p-4 text-sm space-y-2">
          <p>By accessing your financial statements, you consent to:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Processing of your personal and financial data by this SACCO</li>
            <li>Generation and storage of your account statements</li>
            <li>Retention of financial records for 7 years per SACCO regulations</li>
            <li>Audit logging of all statement access events</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            You have the right to access, correct, or request deletion of your data after the
            mandatory retention period. Contact your SACCO administrator for data requests.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            I have read and agree to the data processing terms above (Version 1.0)
          </span>
        </label>
        <div className="flex gap-3">
          <Button onClick={() => void handleAccept()} disabled={!checked || accepting} className="flex-1">
            {accepting ? 'Accepting…' : 'Accept & Continue'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Your IP address and timestamp will be recorded with this consent.
        </p>
      </div>
    </div>
  );
}

// ─── Transaction Table ────────────────────────────────────────────────────────

function TransactionTable({ transactions }: { transactions: StatementTransaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-sm py-4 text-center">No transactions in this period</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs">
            <th className="text-left py-2">Date</th>
            <th className="text-left py-2">Description</th>
            <th className="text-right py-2">Debit</th>
            <th className="text-right py-2">Credit</th>
            <th className="text-right py-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => (
            <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
              <td className="py-2 text-xs">{tx.date}</td>
              <td className="py-2">{tx.description}</td>
              <td className="text-right py-2 text-red-600">
                {tx.debit > 0 ? `KES ${tx.debit.toLocaleString()}` : '-'}
              </td>
              <td className="text-right py-2 text-green-600">
                {tx.credit > 0 ? `KES ${tx.credit.toLocaleString()}` : '-'}
              </td>
              <td className="text-right py-2 font-medium">KES {tx.balance.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberStatementsPage() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [statementType, setStatementType] = useState<'FOSA' | 'BOSA'>('FOSA');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [statement, setStatement] = useState<FosaStatement | BosaStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'pdf' | 'csv' | null>(null);

  // Check consent on mount
  useEffect(() => {
    securityApi
      .checkConsents()
      .then((r) => setHasConsent(r.hasRequiredConsents))
      .catch(() => setHasConsent(false));
  }, []);

  const loadStatement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        ...(periodFrom ? { periodFrom } : {}),
        ...(periodTo ? { periodTo } : {}),
      };
      if (statementType === 'FOSA') {
        setStatement(await statementApi.getFosa(params));
      } else {
        setStatement(await statementApi.getBosa(params));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [statementType, periodFrom, periodTo]);

  const handleDownload = async (format: 'pdf' | 'csv') => {
    setDownloading(format);
    try {
      const params = {
        ...(periodFrom ? { periodFrom } : {}),
        ...(periodTo ? { periodTo } : {}),
      };
      if (format === 'pdf') await statementApi.downloadPdf(statementType, params);
      else await statementApi.downloadCsv(statementType, params);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download statement');
    } finally {
      setDownloading(null);
    }
  };

  // Show consent modal if not consented
  if (hasConsent === null) {
    return <div className="p-6"><Skeleton className="h-64" /></div>;
  }

  if (!hasConsent) {
    return <ConsentModal onAccept={() => setHasConsent(true)} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Account Statements</h1>
        {statement && (
          <div className="flex gap-2">
            <Button onClick={() => void handleDownload('csv')} disabled={downloading != null} variant="outline">
              {downloading === 'csv' ? 'Preparing CSV...' : 'Download CSV'}
            </Button>
            <Button onClick={() => void handleDownload('pdf')} disabled={downloading != null} variant="outline">
              {downloading === 'pdf' ? 'Preparing PDF...' : 'Download PDF'}
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Statement Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Statement Type</label>
              <div className="flex gap-2">
                {(['FOSA', 'BOSA'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setStatementType(t); setStatement(null); }}
                    className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
                      statementType === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-gray-200 hover:border-primary'
                    }`}
                  >
                    {t === 'FOSA' ? 'FOSA (Loans)' : 'BOSA (Savings)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">From</label>
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">To</label>
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>

            <Button onClick={() => void loadStatement()} disabled={loading}>
              {loading ? 'Loading…' : 'View Statement'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded text-sm">{error}</div>
      )}

      {/* Statement */}
      {loading && <Skeleton className="h-64" />}

      {statement && !loading && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{statementType} Statement</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {statement.memberName} · {statement.memberNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  Period: {statement.periodFrom} to {statement.periodTo}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                Hash: {statement.auditHash.slice(0, 12)}…
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 rounded p-4">
              {statementType === 'FOSA' ? (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Disbursed</p>
                    <p className="font-bold text-red-600">KES {(statement as FosaStatement).totalDisbursed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Repaid</p>
                    <p className="font-bold text-green-600">KES {(statement as FosaStatement).totalRepaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Closing Balance</p>
                    <p className="font-bold">KES {(statement as FosaStatement).closingBalance.toLocaleString()}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Opening Balance</p>
                    <p className="font-bold">KES {(statement as BosaStatement).openingBalance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Savings</p>
                    <p className="font-bold text-green-600">KES {(statement as BosaStatement).totalSavings.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Welfare Contributions</p>
                    <p className="font-bold text-blue-600">KES {(statement as BosaStatement).welfareContributions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Closing Balance</p>
                    <p className="font-bold">KES {(statement as BosaStatement).closingBalance.toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>

            {/* Transactions */}
            <TransactionTable transactions={statement.transactions} />

            {/* ODPC Footer */}
            <p className="text-xs text-muted-foreground border-t pt-3">
              🔒 This statement is generated under the Kenya Data Protection Act 2019.
              Audit hash: <code className="font-mono">{statement.auditHash}</code>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
