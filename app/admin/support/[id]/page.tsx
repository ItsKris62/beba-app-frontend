'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { adminApi, formatDateTime, type TicketStatus } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TicketPriorityBadge, TicketStatusBadge, formatMemberName, formatTicketLabel } from '@/components/support-ticket-ui';

const statuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_MEMBER', 'RESOLVED', 'CLOSED'];

export default function AdminSupportDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ticket = useQuery({
    queryKey: ['admin-support-ticket', ticketId],
    queryFn: async () => {
      const res = await adminApi.getTicketById(ticketId);
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load ticket');
      return res.data;
    },
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', ticketId] });
    await queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
  };

  const reply = useMutation({
    mutationFn: async () => {
      const res = await adminApi.addMessageToTicket(ticketId, { content });
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to send reply');
      return res.data;
    },
    onSuccess: async () => {
      setContent('');
      await refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to send reply'),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: TicketStatus) => {
      const res = await adminApi.updateTicketStatus(ticketId, { status, note: note.trim() || undefined });
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to update ticket');
      return res.data;
    },
    onSuccess: async () => {
      setNote('');
      await refresh();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to update ticket'),
  });

  function onReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    reply.mutate();
  }

  const supportTicket = ticket.data ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/support">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Support Resolution</h1>
          <p className="text-sm text-muted-foreground">Reply to members and update ticket state.</p>
        </div>
      </div>

      {ticket.isLoading ? (
        <Skeleton className="h-96" />
      ) : ticket.isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{ticket.error.message}</div>
      ) : !supportTicket ? (
        <div className="rounded border p-4 text-sm text-muted-foreground">Ticket not found.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{supportTicket.subject}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{formatMemberName(supportTicket)} · {formatTicketLabel(supportTicket.category)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <TicketStatusBadge status={supportTicket.status} />
                    <TicketPriorityBadge priority={supportTicket.priority} />
                  </div>
                </div>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{supportTicket.description}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(supportTicket.messages ?? []).map((message) => {
                  const isAdmin = message.senderRole !== 'MEMBER';
                  return (
                    <div key={message.id} className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[82%] rounded-lg border p-3 text-sm', isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className={cn('mt-2 text-[11px]', isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          {isAdmin ? 'Staff' : 'Member'} · {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                <form className="flex flex-col gap-3" onSubmit={onReply}>
                  <Textarea value={content} onChange={(event) => setContent(event.target.value)} required placeholder="Reply to member" />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={reply.isPending || !content.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      {reply.isPending ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader><CardTitle className="text-base">Resolution</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Status</p>
                <Select value={supportTicket.status} onValueChange={(value) => updateStatus.mutate(value as TicketStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => <SelectItem key={status} value={status}>{formatTicketLabel(status)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional status note" />
              <div className="space-y-2 text-sm">
                {supportTicket.member?.id && <Link className="block underline" href={`/admin/members/${supportTicket.member.id}`}>Member profile</Link>}
                {supportTicket.relatedLoanId && <Link className="block underline" href={`/admin/loans/${supportTicket.relatedLoanId}`}>Related loan</Link>}
                {supportTicket.relatedTxId && <Link className="block underline" href={`/admin/transactions?search=${supportTicket.relatedTxId}`}>Related transaction</Link>}
              </div>
              <p className="text-xs text-muted-foreground">Updated {formatDateTime(supportTicket.updatedAt)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
