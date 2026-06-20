'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MessageSquarePlus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { memberApi, formatDateTime } from '@/lib/api-client';
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/support-ticket-ui';

export default function MemberSupportPage() {
  const tickets = useQuery({
    queryKey: ['member-support-tickets'],
    queryFn: async () => {
      const res = await memberApi.getMyTickets();
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load tickets');
      return res.data;
    },
  });
  const ticketList = tickets.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-sm text-muted-foreground">Track questions and replies from the SACCO team.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void tickets.refetch()} disabled={tickets.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${tickets.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/member/support/new">
            <Button size="sm">
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Tickets</CardTitle>
          <CardDescription>Recent support conversations</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14" />)}
            </div>
          ) : tickets.isError ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {tickets.error.message}
            </div>
          ) : ticketList.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <p>No support tickets yet.</p>
              <Link href="/member/support/new" className="mt-2 inline-block underline">Create your first ticket</Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticketList.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <Link href={`/member/support/${ticket.id}`} className="font-medium hover:underline">
                            {ticket.subject}
                          </Link>
                        </TableCell>
                        <TableCell><TicketStatusBadge status={ticket.status} /></TableCell>
                        <TableCell><TicketPriorityBadge priority={ticket.priority} /></TableCell>
                        <TableCell>{formatDateTime(ticket.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 md:hidden">
                {ticketList.map((ticket) => (
                  <Link key={ticket.id} href={`/member/support/${ticket.id}`} className="block rounded border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{ticket.subject}</p>
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <span>{formatDateTime(ticket.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
