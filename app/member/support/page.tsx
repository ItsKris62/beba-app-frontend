import Link from 'next/link';
import { MessageSquarePlus, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { TicketCard } from '@/components/support/TicketCard';
import { getMemberTickets } from '@/lib/support/server';

export default async function MemberSupportPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(Number(params?.page ?? '1') || 1, 1);
  const tickets = await getMemberTickets(page);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Support Center</h1>
          <p className="text-sm text-muted-foreground">
            Raise concerns, track replies, and keep a record of your support conversations.
          </p>
        </div>
        <Button asChild>
          <Link href="/member/support/new" aria-label="Create new support ticket">
            <MessageSquarePlus data-icon="inline-start" />
            Create New Ticket
          </Link>
        </Button>
      </header>

      {tickets.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareText />
            </EmptyMedia>
            <EmptyTitle>You have no active support tickets</EmptyTitle>
            <EmptyDescription>
              When you need help with deposits, loans, account access, or statements, create a
              ticket and the support team will respond here.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/member/support/new">Create your first ticket</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tickets.items.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </section>

          {tickets.pages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={`/member/support?page=${Math.max(page - 1, 1)}`}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-muted-foreground">
                    Page {tickets.page} of {tickets.pages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={`/member/support?page=${Math.min(page + 1, tickets.pages)}`}
                    aria-disabled={page >= tickets.pages}
                    className={page >= tickets.pages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </main>
  );
}
