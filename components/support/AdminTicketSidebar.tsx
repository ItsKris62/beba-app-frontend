'use client';

import { AdminSupportTicket } from '@/lib/support/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, formatSupportLabel } from '@/components/support/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, User, Clock, AlertTriangle } from 'lucide-react';
import { updateTicketStatus } from '@/lib/support/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';

interface SidebarProps {
  ticket: AdminSupportTicket;
}

export function AdminTicketSidebar({ ticket }: SidebarProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateTicketStatus(ticket.id, newStatus);
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const isBreached = !!ticket.slaBreachedAt || new Date(ticket.resolutionDueAt) < new Date();

  return (
    <div className="flex flex-col space-y-6 w-full md:w-[350px] shrink-0">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Ticket Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Subject</p>
            <p className="font-medium">{ticket.subject}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <StatusBadge status={ticket.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Priority</p>
              <Badge variant="outline">{formatSupportLabel(ticket.priority)}</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Category</p>
            <Badge variant="secondary">{formatSupportLabel(ticket.category)}</Badge>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-semibold mb-3">Update Status</p>
            <Select 
              value={ticket.status} 
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="PENDING_MEMBER">Pending Member</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            {ticket.status !== 'RESOLVED' && (
              <Button 
                className="w-full mt-3" 
                variant="default"
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={isUpdating}
              >
                Resolve Ticket
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Member Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{ticket.member.firstName} {ticket.member.lastName}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{ticket.member.email}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{ticket.member.phoneNumber}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline"># {ticket.member.memberNumber}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className={isBreached ? 'border-red-200 bg-red-50' : ''}>
        <CardHeader className="pb-4">
          <CardTitle className={`text-lg flex items-center gap-2 ${isBreached ? 'text-red-700' : ''}`}>
            <Clock className="h-5 w-5" />
            SLA Deadlines
            {isBreached && <AlertTriangle className="h-5 w-5 text-red-600 ml-auto" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">First Response Due</p>
            <p className="text-sm font-medium">{new Date(ticket.firstResponseDueAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Resolution Due</p>
            <p className={`text-sm font-medium ${isBreached ? 'text-red-600' : ''}`}>
              {new Date(ticket.resolutionDueAt).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
