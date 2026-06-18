'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi, formatDateTime, type TicketPriority, type TicketStatus } from '@/lib/api-client';
import { TicketPriorityBadge, TicketStatusBadge, formatMemberName, formatTicketLabel } from '@/components/support-ticket-ui';

const statuses: Array<TicketStatus | 'ALL'> = ['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_ON_MEMBER', 'RESOLVED', 'CLOSED'];
const priorities: Array<TicketPriority | 'ALL'> = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function AdminSupportPage() {
  const [status, setStatus] = useState<TicketStatus | 'ALL'>('ALL');
  const [priority, setPriority] = useState<TicketPriority | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const tickets = useQuery({
    queryKey: ['admin-support-tickets', status],
    queryFn: async () => {
      const res = await adminApi.getAllTickets({ status: status === 'ALL' ? undefined : status });
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load support queue');
      return res.data;
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (tickets.data ?? []).filter((ticket) => {
      const matchesPriority = priority === 'ALL' || ticket.priority === priority;
      const memberName = formatMemberName(ticket).toLowerCase();
      const matchesSearch = !term || ticket.subject.toLowerCase().includes(term) || memberName.includes(term);
      return matchesPriority && matchesSearch;
    });
  }, [priority, search, tickets.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Queue</h1>
          <p className="text-sm text-muted-foreground">Review and resolve member tickets.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void tickets.refetch()} disabled={tickets.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${tickets.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tickets</CardTitle>
          <CardDescription>{filtered.length} visible ticket{filtered.length === 1 ? '' : 's'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member or subject" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus | 'ALL')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((item) => <SelectItem key={item} value={item}>{item === 'ALL' ? 'All statuses' : formatTicketLabel(item)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority | 'ALL')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {priorities.map((item) => <SelectItem key={item} value={item}>{item === 'ALL' ? 'All priorities' : formatTicketLabel(item)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {tickets.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : tickets.isError ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{tickets.error.message}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>{formatMemberName(ticket)}</TableCell>
                      <TableCell>
                        <Link href={`/admin/support/${ticket.id}`} className="font-medium hover:underline">{ticket.subject}</Link>
                      </TableCell>
                      <TableCell><TicketStatusBadge status={ticket.status} /></TableCell>
                      <TableCell><TicketPriorityBadge priority={ticket.priority} /></TableCell>
                      <TableCell>{ticket.assignedTo ?? 'Unassigned'}</TableCell>
                      <TableCell>{formatDateTime(ticket.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No tickets match the filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
