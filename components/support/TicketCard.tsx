import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, formatSupportLabel } from '@/components/support/StatusBadge';
import type { SupportTicket, TicketPriority } from '@/lib/support/types';

const priorityClasses: Record<TicketPriority, string> = {
  LOW: 'border-muted bg-muted text-muted-foreground',
  MEDIUM: 'border-indigo-300 bg-indigo-50 text-indigo-800',
  HIGH: 'border-orange-300 bg-orange-50 text-orange-800',
  CRITICAL: 'border-red-300 bg-red-50 text-red-800',
};

function snippet(value: string) {
  return value.length > 150 ? `${value.slice(0, 150).trim()}...` : value;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function TicketCard({ ticket }: { ticket: SupportTicket }) {
  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle className="text-base leading-snug">
            <Link
              href={`/member/support/${ticket.id}`}
              className="outline-none hover:underline focus-visible:underline"
            >
              {ticket.subject}
            </Link>
          </CardTitle>
          <StatusBadge status={ticket.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {snippet(ticket.description)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{formatSupportLabel(ticket.category)}</Badge>
          <Badge variant="outline" className={priorityClasses[ticket.priority]}>
            {formatSupportLabel(ticket.priority)}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <Clock3 data-icon="inline-start" />
        Updated {formatUpdatedAt(ticket.updatedAt)}
      </CardFooter>
    </Card>
  );
}
