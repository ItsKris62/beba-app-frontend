'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  CheckCircle2, XCircle, Clock, Loader2,
  RefreshCw, FileText, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getImportJobStatus, getImportJobReport, retryFailedImport } from '@/lib/import-api';
import type { ImportJobStatus } from '@/lib/import-api';

const STATUS_CONFIG = {
  QUEUED: { label: 'Queued', color: 'bg-gray-100 text-gray-700', icon: Clock, animate: false },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Loader2, animate: true },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2, animate: false },
  PARTIAL: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, animate: false },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle, animate: false },
};

const POLL_INTERVAL_MS = 2000;

export default function ImportJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [status, setStatus] = useState<ImportJobStatus | null>(null);
  const [report, setReport] = useState<unknown>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getImportJobStatus(jobId);
      setStatus(data);
      return data.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
      return 'FAILED';
    }
  }, [jobId]);

  const fetchReport = useCallback(async () => {
    try {
      const data = await getImportJobReport(jobId);
      setReport(data as unknown);
    } catch {
      // Report may not be available yet
    }
  }, [jobId]);

  // Poll while job is active
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const poll = async () => {
      const currentStatus = await fetchStatus();
      if (currentStatus === 'COMPLETED' || currentStatus === 'FAILED' || currentStatus === 'PARTIAL') {
        clearInterval(interval);
        await fetchReport();
      }
    };

    poll();
    interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchReport]);

  const handleRetry = async () => {
    if (!status) return;
    setIsRetrying(true);
    try {
      const result = await retryFailedImport(status.importLogId);
      router.push(`/admin/import/job/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setIsRetrying(false);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const cfg = STATUS_CONFIG[status.status];
  const isActive = status.status === 'QUEUED' || status.status === 'PROCESSING';
  const progressPct = status.totalRows > 0
    ? Math.round(((status.successCount + status.failedCount + status.skippedCount) / status.totalRows) * 100)
    : 0;

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Job</h1>
          <p className="text-gray-500 mt-1 font-mono text-sm">{jobId}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin/import/history')}>
          View History
        </Button>
      </div>

      {/* Status card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.color}`}>
                <cfg.icon className={`h-4 w-4 ${cfg.animate ? 'animate-spin' : ''}`} />
                {cfg.label}
              </span>
              {status.dryRun && (
                <Badge variant="outline" className="text-xs">DRY RUN</Badge>
              )}
            </div>
            {isActive && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Polling every 2s...
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-3">{status.fileName}</p>

          {/* Progress bar */}
          {status.totalRows > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{progressPct}% complete</span>
                <span>{status.successCount + status.failedCount + status.skippedCount} / {status.totalRows}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    status.status === 'FAILED' ? 'bg-red-500' :
                    status.status === 'PARTIAL' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: status.totalRows, color: 'text-gray-700' },
              { label: 'Success', value: status.successCount, color: 'text-green-600' },
              { label: 'Failed', value: status.failedCount, color: 'text-red-600' },
              { label: 'Warnings', value: status.warningCount, color: 'text-yellow-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Created</p>
              <p className="font-medium">{new Date(status.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Started</p>
              <p className="font-medium">{status.startedAt ? new Date(status.startedAt).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Completed</p>
              <p className="font-medium">{status.completedAt ? new Date(status.completedAt).toLocaleString() : '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {(status.status === 'FAILED' || status.status === 'PARTIAL') && status.failedCount > 0 && (
          <Button onClick={handleRetry} disabled={isRetrying} variant="outline">
            {isRetrying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" /> Retry Failed ({status.failedCount})</>
            )}
          </Button>
        )}
        <Button variant="outline" onClick={() => router.push('/admin/import/history')}>
          <FileText className="mr-2 h-4 w-4" />
          View All Jobs
        </Button>
        <Button variant="outline" onClick={() => router.push('/admin/import/upload')}>
          New Import
        </Button>
      </div>
    </div>
  );
}
