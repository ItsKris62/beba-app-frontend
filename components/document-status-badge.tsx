import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/hooks/use-document-upload';

const STATUS_STYLES: Record<DocumentStatus, string> = {
  PENDING_UPLOAD: 'bg-gray-200 text-gray-700',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DELETED: 'bg-slate-200 text-slate-700',
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={cn('inline-flex rounded px-2 py-1 text-xs font-medium', STATUS_STYLES[status])}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
