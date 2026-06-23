'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Bell, Link as LinkIcon, Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

import { Incident, IncidentStatus, IncidentSeverity } from '@/lib/incidents/types';
import { SupportTicket } from '@/lib/support/types';

export default function AdminIncidentDetail({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [linkedTickets, setLinkedTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog state
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [availableTickets, setAvailableTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      if (params.id === 'not-found') {
        notFound();
      }

      setIncident({
        id: params.id,
        tenantId: 'tenant-1',
        title: 'M-Pesa B2C Disbursement Delay',
        description: 'Loan disbursements are taking longer than 30 minutes due to Safaricom Daraja API latency. We are monitoring the situation closely with the provider.',
        severity: 'MAJOR',
        status: 'INVESTIGATING',
        affectedService: 'MPESA B2C',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setLinkedTickets([
        {
          id: '1',
          tenantId: 'tenant-1',
          memberId: 'm-101',
          subject: 'Loan disbursement delayed',
          description: '',
          priority: 'HIGH',
          status: 'OPEN',
          category: 'LOANS',
          firstResponseDueAt: new Date().toISOString(),
          resolutionDueAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]);

      setAvailableTickets([
        {
          id: '2',
          tenantId: 'tenant-1',
          memberId: 'm-102',
          subject: 'Did not receive M-Pesa',
          description: '',
          priority: 'MEDIUM',
          status: 'OPEN',
          category: 'MPESA',
          firstResponseDueAt: new Date().toISOString(),
          resolutionDueAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          tenantId: 'tenant-1',
          memberId: 'm-103',
          subject: 'Where is my loan?',
          description: '',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          category: 'LOANS',
          firstResponseDueAt: new Date().toISOString(),
          resolutionDueAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]);

      setIsLoading(false);
    }, 1000);
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!incident) return null;

  const severityColors: Record<IncidentSeverity, string> = {
    MINOR: 'bg-yellow-100 text-yellow-800',
    MAJOR: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
  };

  const statusColors: Record<IncidentStatus, string> = {
    INVESTIGATING: 'bg-red-100 text-red-800',
    IDENTIFIED: 'bg-orange-100 text-orange-800',
    MONITORING: 'bg-blue-100 text-blue-800',
    RESOLVED: 'bg-green-100 text-green-800',
  };

  const handleStatusUpdate = async (newStatus: IncidentStatus) => {
    // API call to update status
    setIncident({ ...incident, status: newStatus });
    toast({
      title: 'Status Updated',
      description: `Incident status changed to ${newStatus}.`,
    });
  };

  const handleLinkTickets = async () => {
    setIsLinking(true);
    try {
      // Mock API: await fetch(`/api/v1/admin/incidents/${incident.id}/link-tickets`, { method: 'POST', body: JSON.stringify({ ticketIds: Array.from(selectedTicketIds) }) });
      await new Promise(res => setTimeout(res, 1000));
      
      const newlyLinked = availableTickets.filter(t => selectedTicketIds.has(t.id));
      setLinkedTickets([...linkedTickets, ...newlyLinked]);
      setAvailableTickets(availableTickets.filter(t => !selectedTicketIds.has(t.id)));
      setSelectedTicketIds(new Set());
      setIsLinkDialogOpen(false);
      
      toast({
        title: 'Tickets Linked',
        description: `Successfully linked ${newlyLinked.length} tickets to this incident.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to link tickets.',
        variant: 'destructive',
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleNotifyMembers = async () => {
    setIsNotifying(true);
    try {
      // Mock API: await fetch(`/api/v1/admin/incidents/${incident.id}/notify`, { method: 'POST' });
      await new Promise(res => setTimeout(res, 1500));
      
      toast({
        title: 'Notifications Queued',
        description: `Successfully queued notifications for ${uniqueMembersCount} affected members.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsNotifying(false);
    }
  };

  const filteredAvailableTickets = availableTickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.memberId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const uniqueMembersCount = new Set(linkedTickets.map(t => t.memberId)).size;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/incidents">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incident Details</h1>
          <p className="text-sm text-muted-foreground">{incident.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <div className="flex gap-2 mb-2">
              <Badge variant="secondary" className={severityColors[incident.severity]}>
                {incident.severity}
              </Badge>
              <Badge variant="outline" className={statusColors[incident.status]}>
                {incident.status}
              </Badge>
            </div>
            <CardTitle className="text-xl">{incident.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <span>Affected Service: <span className="font-semibold">{incident.affectedService}</span></span>
              <span>•</span>
              <span>Declared: {format(new Date(incident.createdAt), 'MMM d, yyyy HH:mm')}</span>
            </CardDescription>
          </div>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Update Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Object.keys(statusColors).map((status) => (
                  <DropdownMenuItem 
                    key={status} 
                    onClick={() => handleStatusUpdate(status as IncidentStatus)}
                    disabled={incident.status === status}
                  >
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{incident.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linked Tickets Section */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center">
                <LinkIcon className="w-5 h-5 mr-2" /> Linked Tickets
              </CardTitle>
              <CardDescription>Tickets associated with this incident.</CardDescription>
            </div>
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Plus className="w-4 h-4 mr-1" /> Add/Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Link Tickets to Incident</DialogTitle>
                  <DialogDescription>
                    Select open or in-progress tickets to link to this incident.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input 
                    placeholder="Search by subject or member..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <ScrollArea className="h-[300px] border rounded-md p-2">
                    {filteredAvailableTickets.length > 0 ? (
                      <div className="space-y-2">
                        {filteredAvailableTickets.map(ticket => (
                          <div key={ticket.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-lg">
                            <Checkbox 
                              id={`ticket-${ticket.id}`} 
                              checked={selectedTicketIds.has(ticket.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedTicketIds);
                                if (checked) newSet.add(ticket.id);
                                else newSet.delete(ticket.id);
                                setSelectedTicketIds(newSet);
                              }}
                            />
                            <div className="grid gap-1.5 leading-none cursor-pointer flex-1">
                              <label
                                htmlFor={`ticket-${ticket.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {ticket.subject}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Member: {ticket.memberId} • Status: {ticket.status}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No available tickets found.
                      </div>
                    )}
                  </ScrollArea>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleLinkTickets} disabled={selectedTicketIds.size === 0 || isLinking}>
                    {isLinking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Link {selectedTicketIds.size > 0 ? selectedTicketIds.size : ''} Tickets
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="flex-1">
            {linkedTickets.length > 0 ? (
              <div className="space-y-4">
                {linkedTickets.map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">Ticket #{ticket.id} • Member: {ticket.memberId}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/support/${ticket.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No tickets linked yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Bell className="w-5 h-5 mr-2" /> Member Notifications
            </CardTitle>
            <CardDescription>Notify members affected by this incident.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="space-y-1">
                <p className="font-medium">Affected Members</p>
                <p className="text-sm text-muted-foreground">Based on linked tickets</p>
              </div>
              <div className="text-3xl font-bold">{uniqueMembersCount}</div>
            </div>

            <div className="space-y-3">
              <p className="text-sm">
                Sending a notification will dispatch an In-App Notification and Email to all unique members associated with the linked tickets.
              </p>
              <Button 
                className="w-full" 
                onClick={handleNotifyMembers} 
                disabled={uniqueMembersCount === 0 || isNotifying}
              >
                {isNotifying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Notify {uniqueMembersCount} Affected Members
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
