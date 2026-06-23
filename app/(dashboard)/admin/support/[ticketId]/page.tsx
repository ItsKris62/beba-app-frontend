'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { SupportChat } from '@/components/support/SupportChat';
import { SupportTicket, TicketStatus } from '@/lib/support/types';

export default function AdminTicketDetail({ params }: { params: { ticketId: string } }) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real application, fetch from /api/v1/admin/support/tickets/:id
    setTimeout(() => {
      if (params.ticketId === 'not-found') {
        notFound();
      }

      setTicket({
        id: params.ticketId,
        tenantId: 'tenant-1',
        memberId: 'm-1234',
        subject: 'Cannot access M-Pesa statements',
        description: 'I am getting an error when trying to view my statements from last week.',
        priority: 'HIGH',
        status: 'OPEN',
        category: 'MPESA',
        firstResponseDueAt: new Date(Date.now() + 3600000).toISOString(),
        resolutionDueAt: new Date(Date.now() + 86400000).toISOString(),
        slaBreachedAt: null,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: 'msg-1',
            tenantId: 'tenant-1',
            ticketId: params.ticketId,
            senderId: 'm-1234',
            senderType: 'MEMBER',
            content: 'Hello, my M-Pesa statement is failing to load.',
            messageType: 'TEXT',
            isRead: true,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          }
        ],
      });
      setIsLoading(false);
    }, 1000);
  }, [params.ticketId]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-[560px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    OPEN: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    PENDING_MEMBER: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    // Call API to update status
    setTicket({ ...ticket, status: newStatus });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/support">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ticket #{ticket.id.slice(0,8)}</h1>
          <p className="text-sm text-muted-foreground">{ticket.subject}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Change Status</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Update Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.keys(statusColors).map((status) => (
                <DropdownMenuItem 
                  key={status} 
                  onClick={() => handleStatusChange(status as TicketStatus)}
                  disabled={ticket.status === status}
                >
                  {status.replace('_', ' ')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
            <Button onClick={() => handleStatusChange('RESOLVED')} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Resolve Ticket
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary" className={statusColors[ticket.status]}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Priority</span>
                <Badge variant="secondary" className={priorityColors[ticket.priority]}>
                  {ticket.priority}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Category</span>
                <Badge variant="outline">{ticket.category.replace('_', ' ')}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{format(new Date(ticket.createdAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Clock className="w-4 h-4 mr-2" /> SLA Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.slaBreachedAt && (
                <div className="flex items-center text-red-600 text-sm font-medium bg-red-50 p-2 rounded-md">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  SLA Breached at {format(new Date(ticket.slaBreachedAt), 'HH:mm')}
                </div>
              )}
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground block">First Response Due</span>
                <span className={`text-sm font-medium ${new Date(ticket.firstResponseDueAt) < new Date() && !ticket.firstRespondedAt ? 'text-red-600' : ''}`}>
                  {formatDistanceToNow(new Date(ticket.firstResponseDueAt), { addSuffix: true })}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground block">Resolution Due</span>
                <span className={`text-sm font-medium ${new Date(ticket.resolutionDueAt) < new Date() && ticket.status !== 'RESOLVED' ? 'text-red-600' : ''}`}>
                  {formatDistanceToNow(new Date(ticket.resolutionDueAt), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <User className="w-4 h-4 mr-2" /> Member Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground block">Name</span>
                <span className="text-sm font-medium">John Doe (Mock)</span>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground block">Member No.</span>
                <span className="text-sm">M-1234</span>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground block">Phone</span>
                <span className="text-sm">+254 712 345 678</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Initial Ticket Description Card */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">{ticket.subject}</h3>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Chat Component */}
          <div className="flex-1 bg-white rounded-lg border overflow-hidden">
            <SupportChat
              ticketId={ticket.id}
              currentUserId="admin-user-id" // Replace with actual session admin ID
              token="mock-token" // Replace with actual session token
              tenantId={ticket.tenantId}
              initialMessages={ticket.messages || []}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
