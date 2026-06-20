'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { memberApi, formatDateTime } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TicketPriorityBadge, TicketStatusBadge, formatTicketLabel } from '@/components/support-ticket-ui';

export default function MemberSupportDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ticket = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      const res = await memberApi.getTicketById(ticketId);
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to load ticket');
      return res.data;
    },
  });

  const reply = useMutation({
    mutationFn: async () => {
      const res = await memberApi.addMessageToTicket(ticketId, { content });
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to send reply');
      return res.data;
    },
    onSuccess: async () => {
      setContent('');
      await queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      await queryClient.invalidateQueries({ queryKey: ['member-support-tickets'] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to send reply'),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    reply.mutate();
  }

  const supportTicket = ticket.data ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/member/support">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Ticket</h1>
          <p className="text-sm text-muted-foreground">Support conversation</p>
        </div>
      </div>

      {ticket.isLoading ? (
        <Skeleton className="h-96" />
      ) : ticket.isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{ticket.error.message}</div>
      ) : !supportTicket ? (
        <div className="rounded border p-4 text-sm text-muted-foreground">Ticket not found.</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-lg">{supportTicket.subject}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{formatTicketLabel(supportTicket.category)} · Created {formatDateTime(supportTicket.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TicketStatusBadge status={supportTicket.status} />
                  <TicketPriorityBadge priority={supportTicket.priority} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{supportTicket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(supportTicket.messages ?? []).map((message) => {
                const isMember = message.senderRole === 'MEMBER';
                return (
                  <div key={message.id} className={cn('flex', isMember ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[82%] rounded-lg border p-3 text-sm', isMember ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer" className="block underline">Attachment</a>
                          ))}
                        </div>
                      )}
                      <p className={cn('mt-2 text-[11px]', isMember ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {isMember ? 'You' : 'Support'} · {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <Textarea value={content} onChange={(event) => setContent(event.target.value)} minLength={1} required placeholder="Reply to support" />
                <div className="flex justify-end">
                  <Button type="submit" disabled={reply.isPending || !content.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    {reply.isPending ? 'Sending...' : 'Reply'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
