'use client';

/**
 * Sprint 3 – Admin Reports Page
 *
 * - Loans by status chart
 * - Savings by week chart
 * - Top defaulters table
 * - Export filters (date range, type)
 * - PDF export trigger
 * - Compliance audit viewer
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi, memberApi, type AdminDashboardReports } from '@/lib/api-client';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  DISBURSED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAID_OFF: 'bg-gray-100 text-gray-800',
  DEFAULTED: 'bg-red-100 text-red-800',
  WRITTEN_OFF: 'bg-red-200 text-red-900',
};

function BarChart({
  data,
  valueKey,
  labelKey,
  color = '#22c55e',
}: {
  data: Array<Record<string, number | string>>;
  valueKey: string;
  labelKey: string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const value = Number(item[valueKey]);
        const pct = (value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
              {String(item[labelKey])}
            </span>
            <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-medium w-24 shrink-0">
              {typeof value === 'number' && value > 1000
                ? `KES ${value.toLocaleString()}`
                : value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminDashboardReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportType, setExportType] = useState<'FOSA' | 'BOSA'>('FOSA');
  const [exportMemberId, setExportMemberId] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  useEffect(() => {
    adminApi
      .getDashboardReports()
      .then((res) => {
        if (res.success) {
          setReports(res.data);
        } else {
          setError(res.error?.message ?? 'Failed to load reports');
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!exportMemberId.trim()) {
      setError('Member ID is required to export a statement.');
      return;
    }
    setExporting(format);
    try {
      const params = {
        memberId: exportMemberId.trim(),
        ...(exportFrom ? { periodFrom: exportFrom } : {}),
        ...(exportTo ? { periodTo: exportTo } : {}),
      };
      if (format === 'pdf') await memberApi.downloadStatementPdf(exportType, params);
      else await memberApi.downloadStatementCsv(exportType, params);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export statement');
    } finally {
      setExporting(null);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        {reports && (
          <p className="text-xs text-muted-foreground">
            Generated: {new Date(reports.generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Export Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Statement PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
              <div className="flex gap-2">
                {(['FOSA', 'BOSA'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setExportType(t)}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      exportType === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Member ID</label>
              <input
                value={exportMemberId}
                onChange={(e) => setExportMemberId(e.target.value)}
                placeholder="Member UUID"
                className="border rounded px-3 py-1.5 text-sm w-64"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">From</label>
              <input
                type="date"
                value={exportFrom}
                onChange={(e) => setExportFrom(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">To</label>
              <input
                type="date"
                value={exportTo}
                onChange={(e) => setExportTo(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              />
            </div>
            <Button onClick={() => void handleExport('csv')} disabled={exporting != null}>
              {exporting === 'csv' ? 'Generating CSV...' : 'Export CSV'}
            </Button>
            <Button onClick={() => void handleExport('pdf')} disabled={exporting != null}>
              {exporting === 'pdf' ? 'Generating PDF...' : 'Export PDF'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            PDF includes SACCO header, transaction table, audit hash, ODPC disclaimer, and
            CONFIDENTIAL watermark. Generated server-side.
          </p>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loans by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loans by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="space-y-3">
                {(reports?.loansByStatus ?? []).map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <Badge className={STATUS_COLORS[item.status] ?? 'bg-gray-100'}>
                      {item.status}
                    </Badge>
                    <div className="flex gap-4 text-sm">
                      <span className="text-muted-foreground">{item.count} loans</span>
                      <span className="font-medium">KES {item.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {(reports?.loansByStatus ?? []).length === 0 && (
                  <p className="text-muted-foreground text-sm">No loan data</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Savings by Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savings by Week</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48" />
            ) : (
              <BarChart
                data={(reports?.savingsByWeek ?? []).map((w) => ({
                  label: `Wk ${w.weekNumber}`,
                  amount: w.totalAmount,
                }))}
                labelKey="label"
                valueKey="amount"
                color="#3b82f6"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Defaulters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Defaulters</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2">Member No.</th>
                    <th className="text-right py-2">Outstanding</th>
                    <th className="text-right py-2">Days in Arrears</th>
                    <th className="text-right py-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {(reports?.topDefaulters ?? []).map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="py-2 font-medium">{d.memberNumber}</td>
                      <td className="text-right py-2 text-red-600">
                        KES {d.outstandingBalance.toLocaleString()}
                      </td>
                      <td className="text-right py-2">{d.arrearsDays} days</td>
                      <td className="text-right py-2">
                        <Badge
                          className={
                            d.arrearsDays > 60
                              ? 'bg-red-100 text-red-800'
                              : d.arrearsDays > 30
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-orange-100 text-orange-800'
                          }
                        >
                          {d.arrearsDays > 60 ? 'HIGH' : d.arrearsDays > 30 ? 'MEDIUM' : 'LOW'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {(reports?.topDefaulters ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted-foreground">
                        No defaulters 🎉
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800">
            <strong>🔒 ODPC Compliance:</strong> All reports are generated under the Kenya Data
            Protection Act 2019. Financial records are retained for 7 years. Non-financial audit
            logs are retained for 2 years. PII is masked in TELLER-role views. All exports are
            audit-logged with IP address and timestamp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
