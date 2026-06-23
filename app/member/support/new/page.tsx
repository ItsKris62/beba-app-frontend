'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTicketForm } from '@/components/support/CreateTicketForm';

export default function NewSupportTicketPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to tickets">
          <Link href="/member/support">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create New Ticket</h1>
          <p className="text-sm text-muted-foreground">
            Tell us what happened and we will route it to the support desk.
          </p>
        </div>
      </header>

      <CreateTicketForm />
    </main>
  );
}
