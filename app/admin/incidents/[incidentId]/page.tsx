import { getIncident } from '@/lib/incidents/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LinkTicketsDialog } from '@/components/incidents/LinkTicketsDialog';
import { IncidentStatusDropdown } from '@/components/incidents/IncidentStatusDropdown';
import { NotifyMembersButton } from '@/components/incidents/NotifyMembersButton';
import { ArrowLeft, Server, AlertTriangle, MessageSquare, TicketIcon, Users } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Incident Details | Beba Super Admin',
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    MINOR: 'bg-slate-100 text-slate-800 border-slate-200',
    MAJOR: 'bg-orange-100 text-orange-800 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <Badge variant="outline" className={`${colors[severity] || ''}`}>
      {severity}
    </Badge>
  );
}

export default async function IncidentDetailPage({ params }: { params: { incidentId: string } }) {
  const { incident, linkedTickets } = await getIncident(params.incidentId);

  // Derive unique members from linked tickets (mock count if backend doesn't provide it)
  // Assuming linkedTickets has members or we can calculate
  const uniqueMemberCount = new Set(linkedTickets?.map(t => t.memberId)).size;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4 mb-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/incidents">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to incidents</span>
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Incident Details</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={incident.severity} />
                    <Badge variant="outline" className="font-mono bg-slate-50 text-slate-600">
                      <Server className="h-3 w-3 mr-1" />
                      {incident.affectedService}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{incident.title}</CardTitle>
                </div>
                <IncidentStatusDropdown incidentId={incident.id} currentStatus={incident.status} />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
              <p className="text-slate-800 whitespace-pre-wrap">{incident.description}</p>
              
              <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Declared: {new Date(incident.createdAt).toLocaleString()}
                </div>
                {incident.resolvedAt && (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <AlertTriangle className="h-4 w-4" />
                    Resolved: {new Date(incident.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TicketIcon className="h-5 w-5" />
                  Linked Support Tickets
                </CardTitle>
                <CardDescription>Tickets associated with this system incident.</CardDescription>
              </div>
              <LinkTicketsDialog incidentId={incident.id} />
            </CardHeader>
            <CardContent>
              {linkedTickets?.length === 0 ? (
                <div className="text-center py-6 text-slate-500 border border-dashed rounded-lg">
                  <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No tickets linked yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedTickets?.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                      <div>
                        <Link href={`/admin/support/${ticket.id}`} className="font-medium hover:underline">
                          {ticket.subject}
                        </Link>
                        <div className="text-xs text-slate-500 mt-1">
                          Ticket #{ticket.id.slice(0, 8).toUpperCase()} • {ticket.status}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/support/${ticket.id}`}>View</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                <Users className="h-5 w-5" />
                Affected Members
              </CardTitle>
              <CardDescription className="text-blue-700/80">
                Members with linked support tickets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-4xl font-bold text-blue-900">
                {uniqueMemberCount}
              </div>
              
              <NotifyMembersButton 
                incidentId={incident.id} 
                disabled={uniqueMemberCount === 0 || incident.status === 'RESOLVED'} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
