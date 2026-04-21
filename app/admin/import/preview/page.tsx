'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Download, Play, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { executeImport } from '@/lib/import-api';
import type { ImportPreviewReport, ImportPreviewRow } from '@/lib/import-api';

const STATUS_CONFIG = {
  VALID: { label: 'Valid', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  WARNING: { label: 'Warning', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-800', icon: XCircle },
  DUPLICATE: { label: 'Duplicate', color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
};

export default function ImportPreviewPage() {
  const router = useRouter();
  const [report, setReport] = useState<ImportPreviewReport | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE'>('ALL');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('importPreviewReport');
    if (stored) {
      setReport(JSON.parse(stored));
    } else {
      router.push('/admin/import/upload');
    }
  }, [router]);

  const toggleRow = (rowNumber: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  };

  const handleExecute = async () => {
    if (!report) return;
    setIsExecuting(true);
    setExecuteError(null);
    try {
      const result = await executeImport(report.importLogId, dryRun);
      sessionStorage.setItem('importJobId', result.jobId);
      router.push(`/admin/import/job/${result.jobId}`);
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const downloadErrors = () => {
    if (!report) return;
    const errorRows = report.rows.filter(r => r.status === 'ERROR');
    const csv = [
      'Row,Name,ID,Phone,Stage,Errors',
      ...errorRows.map(r =>
        `${r.rowNumber},"${r.firstName} ${r.lastName}","${r.rawIdNumber ?? ''}","${r.rawPhone ?? ''}","${r.stageName ?? ''}","${r.errors.map(e => e.reason).join('; ')}"`,
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const filteredRows = filter === 'ALL' ? report.rows : report.rows.filter(r => r.status === filter);

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Preview</h1>
          <p className="text-gray-500 mt-1">{report.fileName} · {report.totalRows} rows</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/import/upload')}>
          ← Back to Upload
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Valid', count: report.validCount, color: 'text-green-600', status: 'VALID' },
          { label: 'Warnings', count: report.warningCount, color: 'text-yellow-600', status: 'WARNING' },
          { label: 'Errors', count: report.errorCount, color: 'text-red-600', status: 'ERROR' },
          { label: 'Duplicates', count: report.duplicateCount, color: 'text-blue-600', status: 'DUPLICATE' },
        ].map(({ label, count, color, status }) => (
          <Card
            key={label}
            className={`cursor-pointer transition-shadow hover:shadow-md ${filter === status ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setFilter(filter === status ? 'ALL' : status as typeof filter)}
          >
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stages summary */}
      {report.stagesSummary.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Stages Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {report.stagesSummary.map(s => (
                <div key={s.name} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-gray-500">({s.count})</span>
                  {s.isNew && (
                    <Badge variant="outline" className="text-xs py-0 px-1.5 text-blue-600 border-blue-300">
                      NEW
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row table */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            {filter === 'ALL' ? 'All Rows' : `${filter} Rows`} ({filteredRows.length})
          </CardTitle>
          <div className="flex gap-2">
            {(['ALL', 'VALID', 'WARNING', 'ERROR', 'DUPLICATE'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-2 py-1 rounded ${filter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Row</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">ID</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Stage</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Action</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const cfg = STATUS_CONFIG[row.status];
                  const isExpanded = expandedRows.has(row.rowNumber);
                  const hasDetails = row.errors.length > 0 || row.warnings.length > 0 || row.fuzzyStageMatch;

                  return (
                    <>
                      <tr key={row.rowNumber} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400">{row.legacyNo ?? row.rowNumber}</td>
                        <td className="px-4 py-2 font-medium">{row.firstName} {row.lastName}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.idNumber ?? <span className="text-gray-400">—</span>}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.phoneNumber ?? <span className="text-red-400">{row.rawPhone}</span>}</td>
                        <td className="px-4 py-2 text-xs">
                          {row.fuzzyStageMatch ? (
                            <span className="text-yellow-700">
                              {row.fuzzyStageMatch.matched}
                              <span className="text-gray-400 ml-1">({row.fuzzyStageMatch.confidence}%)</span>
                            </span>
                          ) : (row.stageName ?? <span className="text-gray-400">—</span>)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs ${row.action === 'CREATE' ? 'text-green-600' : row.action === 'UPDATE' ? 'text-blue-600' : 'text-gray-400'}`}>
                            {row.action}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {hasDetails && (
                            <button onClick={() => toggleRow(row.rowNumber)} className="text-gray-400 hover:text-gray-600">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr key={`${row.rowNumber}-detail`} className="bg-gray-50 border-b">
                          <td colSpan={8} className="px-4 py-3">
                            {row.errors.map((e, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-red-700 mb-1">
                                <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>{e.field}:</strong> {e.reason} <code className="text-gray-400">({e.errorCode})</code></span>
                              </div>
                            ))}
                            {row.warnings.map((w, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-yellow-700 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <span><strong>{w.field}:</strong> {w.reason} <code className="text-gray-400">({w.errorCode})</code></span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Execute section */}
      {executeError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{executeError}</AlertDescription>
        </Alert>
      )}

      {!report.canProceed && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            Too many errors ({report.errorCount}/{report.totalRows} rows). Fix the CSV and re-upload before proceeding.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleExecute}
          disabled={!report.canProceed || isExecuting}
          className="flex-1"
        >
          {isExecuting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Queuing Import...</>
          ) : (
            <><Play className="mr-2 h-4 w-4" /> {dryRun ? 'Run Dry-Run' : 'Execute Import'}</>
          )}
        </Button>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={e => setDryRun(e.target.checked)}
            className="rounded"
          />
          Dry run (no DB writes)
        </label>

        {report.errorCount > 0 && (
          <Button variant="outline" onClick={downloadErrors}>
            <Download className="mr-2 h-4 w-4" />
            Download Errors
          </Button>
        )}
      </div>
    </div>
  );
}
