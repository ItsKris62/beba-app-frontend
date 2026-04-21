'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, XCircle, Clock, AlertTriangle,
  Loader2, Upload, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getImportHistory } from '@/lib/import-api';
import type { ImportHistoryItem } from '@/lib/import-api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  QUEUED: { label: 'Queued', color: 'bg-gray-100 text-gray-700', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  PARTIAL: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function ImportHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getImportHistory()
      .then(data => setHistory(data.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import History</h1>
          <p className="text-gray-500 mt-1">All past CSV import jobs for this tenant</p>
        </div>
        <Button onClick={() => router.push('/admin/import/upload')}>
          <Upload className="mr-2 h-4 w-4" />
          New Import
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {!isLoading && !error && history.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No import jobs yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/admin/import/upload')}
            >
              Start your first import
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && history.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Success</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Failed</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => {
                  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.QUEUED;
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 truncate max-w-[200px]">{item.fileName}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.batchId.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <cfg.icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                        {item.dryRun && (
                          <Badge variant="outline" className="ml-1.5 text-xs py-0">DRY</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.totalRows}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{item.successCount}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">{item.failedCount}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(item.createdAt).toLocaleDateString()}<br />
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3">
                        {item.queueJobId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/import/job/${item.queueJobId}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
