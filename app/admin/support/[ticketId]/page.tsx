import { getMemberTicket } from '@/lib/support/server';
import { SupportChat } from '@/components/support/SupportChat';
import { AdminTicketSidebar } from '@/components/support/AdminTicketSidebar';
import { AdminSupportTicket } from '@/lib/support/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Ticket Details | Beba Super Admin',
};

export default async function AdminTicketPage({ params }: { params: { ticketId: string } }) {
  const { ticket, session } = await getMemberTicket(params.ticketId);

  // Safely cast to AdminSupportTicket (backend should return member details for admins)
  const adminTicket = ticket as unknown as AdminSupportTicket;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/support">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to support</span>
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Ticket #{ticket.id.slice(0, 8).toUpperCase()}</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <AdminTicketSidebar ticket={adminTicket} />
        
        <div className="flex-1 border rounded-xl overflow-hidden bg-background h-[calc(100vh-220px)] min-h-[600px] flex">
          <SupportChat
            ticketId={ticket.id}
            tenantId={session.tenantId}
            currentUserId={session.currentUserId}
            token={session.token}
            initialMessages={ticket.messages || []}
            status={ticket.status}
          />
        </div>
      </div>
    </div>
  );
}
