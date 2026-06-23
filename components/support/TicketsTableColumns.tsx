'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AdminSupportTicket, TicketCategory, TicketPriority } from '@/lib/support/types';
import { StatusBadge, formatSupportLabel } from '@/components/support/StatusBadge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { assignTicket, updateTicketStatus } from '@/lib/support/client';

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const colors = {
    LOW: 'bg-slate-100 text-slate-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };
  return (
    <Badge variant="outline" className={`${colors[priority]} border-transparent`}>
      {formatSupportLabel(priority)}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <Badge variant="secondary">
      {formatSupportLabel(category)}
    </Badge>
  );
}

export const columns: ColumnDef<AdminSupportTicket>[] = [
  {
    accessorKey: 'subject',
    header: 'Subject',
    cell: ({ row }) => {
      const subject = row.getValue('subject') as string;
      return <div className="max-w-[250px] truncate font-medium">{subject}</div>;
    },
  },
  {
    accessorKey: 'member',
    header: 'Member',
    cell: ({ row }) => {
      const member = row.original.member;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{member.firstName} {member.lastName}</span>
          <span className="text-xs text-slate-500">{member.email || member.phoneNumber}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => <CategoryBadge category={row.getValue('category')} />,
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => <PriorityBadge priority={row.getValue('priority')} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.getValue('status')} />,
  },
  {
    accessorKey: 'slaBreachedAt',
    header: 'SLA Status',
    cell: ({ row }) => {
      const breachedAt = row.original.slaBreachedAt;
      const resolutionDue = new Date(row.original.resolutionDueAt);
      const isBreached = !!breachedAt || resolutionDue < new Date();
      
      if (isBreached) {
        return <span className="text-red-600 font-semibold text-xs">Breached</span>;
      }
      return <span className="text-green-600 font-medium text-xs">On Track</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const ticket = row.original;
      
      const handleAssign = async () => {
        try {
          await assignTicket(ticket.id);
          window.location.reload();
        } catch (e) {
          console.error(e);
        }
      };

      const handleResolve = async () => {
        try {
          await updateTicketStatus(ticket.id, 'RESOLVED');
          window.location.reload();
        } catch (e) {
          console.error(e);
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/admin/support/${ticket.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAssign}>
              Assign to Me
            </DropdownMenuItem>
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <DropdownMenuItem onClick={handleResolve} className="text-green-600">
                Mark Resolved
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
