import Link from 'next/link';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge, formatSupportLabel } from '@/components/support/StatusBadge';
import { SupportChat } from '@/components/support/SupportChat';
import { getMemberTicket } from '@/lib/support/server';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function MemberSupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const { ticket, session } = await getMemberTicket(ticketId);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to tickets">
          <Link href="/member/support">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Support Ticket</h1>
          <p className="text-sm text-muted-foreground">Review the ticket details and continue the chat.</p>
        </div>
      </header>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-xl leading-tight">{ticket.subject}</CardTitle>
              <p className="max-w-3xl text-sm text-muted-foreground">{ticket.description}</p>
            </div>
            <StatusBadge status={ticket.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{formatSupportLabel(ticket.category)}</Badge>
            <Badge variant="outline">{formatSupportLabel(ticket.priority)}</Badge>
          </div>
          <Separator />
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDateTime(ticket.createdAt)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Last updated</span>
              <span>{formatDateTime(ticket.updatedAt)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <CalendarClock data-icon="inline-start" />
                Expected resolution by
              </span>
              <span>{formatDateTime(ticket.resolutionDueAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <SupportChat
        ticketId={ticket.id}
        currentUserId={session.currentUserId}
        token={session.token}
        tenantId={session.tenantId}
        initialMessages={ticket.messages ?? []}
      />
    </main>
  );
}
