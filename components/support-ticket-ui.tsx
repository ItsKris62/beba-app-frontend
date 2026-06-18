import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TicketPriority, TicketStatus } from '@/lib/api-client';

const statusClasses: Record<TicketStatus, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  WAITING_ON_MEMBER: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  RESOLVED: 'bg-green-100 text-green-800 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
};

const priorityClasses: Record<TicketPriority, string> = {
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
  MEDIUM: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};

export function formatTicketLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={cn('border', statusClasses[status])}>{formatTicketLabel(status)}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge className={cn('border', priorityClasses[priority])}>{formatTicketLabel(priority)}</Badge>;
}

export function formatMemberName(ticket: { member?: { user?: { firstName: string; lastName: string }; memberNumber: string } }): string {
  const user = ticket.member?.user;
  if (user) return `${user.firstName} ${user.lastName}`;
  return ticket.member?.memberNumber ?? 'Member';
}
