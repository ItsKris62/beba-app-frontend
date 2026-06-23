import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketStatus } from '@/lib/support/types';

const statusClasses: Record<TicketStatus, string> = {
  OPEN: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  IN_PROGRESS: 'border-blue-300 bg-blue-50 text-blue-800',
  PENDING_MEMBER: 'border-orange-300 bg-orange-50 text-orange-800',
  RESOLVED: 'border-green-300 bg-green-50 text-green-800',
  CLOSED: 'border-muted bg-muted text-muted-foreground',
};

export function formatSupportLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', statusClasses[status])}>
      {formatSupportLabel(status)}
    </Badge>
  );
}
