import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { getIncidents } from '@/lib/incidents/server';
import { Incident, IncidentSeverity, IncidentStatus } from '@/lib/incidents/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Incident Management | Beba Super Admin',
};

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const colors = {
    MINOR: 'bg-slate-100 text-slate-800 border-slate-200',
    MAJOR: 'bg-orange-100 text-orange-800 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  };
  return (
    <Badge variant="outline" className={`${colors[severity]}`}>
      {severity}
    </Badge>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const colors = {
    INVESTIGATING: 'bg-yellow-100 text-yellow-800',
    IDENTIFIED: 'bg-blue-100 text-blue-800',
    MONITORING: 'bg-indigo-100 text-indigo-800',
    RESOLVED: 'bg-green-100 text-green-800',
  };
  return (
    <Badge variant="secondary" className={`${colors[status]}`}>
      {status}
    </Badge>
  );
}

export default async function IncidentsPage() {
  const incidents = await getIncidents().catch(() => []);

  const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED');
  const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED');

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Incident Management</h2>
          <p className="text-muted-foreground mt-1">Track and manage system-wide incidents.</p>
        </div>
        <Button asChild size="lg" className="shrink-0 bg-red-600 hover:bg-red-700 text-white">
          <Link href="/admin/incidents/new">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Declare New Incident
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b">
          <Activity className="h-5 w-5 text-orange-500" />
          <h3 className="text-xl font-semibold tracking-tight">Active Incidents</h3>
          <Badge variant="secondary" className="ml-2">{activeIncidents.length}</Badge>
        </div>
        
        {activeIncidents.length === 0 ? (
          <Card className="border-dashed bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center h-48 text-center">
              <ShieldAlert className="h-10 w-10 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-600">All systems operational</p>
              <p className="text-sm text-slate-500">No active incidents at the moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeIncidents.map(incident => (
              <Card key={incident.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{incident.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {incident.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <Badge variant="outline" className="text-xs font-mono bg-slate-50">
                      Service: {incident.affectedService}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t bg-slate-50/50 rounded-b-xl px-4 py-3">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm" asChild className="h-8">
                      <Link href={`/admin/incidents/${incident.id}`}>
                        Manage <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {resolvedIncidents.length > 0 && (
        <div className="space-y-4 pt-8">
          <div className="flex items-center space-x-2 pb-2 border-b">
            <ShieldAlert className="h-5 w-5 text-green-600" />
            <h3 className="text-xl font-semibold tracking-tight text-slate-700">Recently Resolved</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {resolvedIncidents.slice(0, 3).map(incident => (
              <Card key={incident.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-1">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                  <CardTitle className="text-md line-clamp-1 text-slate-600">{incident.title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <Badge variant="outline" className="text-xs font-mono">
                    Service: {incident.affectedService}
                  </Badge>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="link" size="sm" asChild className="p-0 h-auto text-muted-foreground">
                    <Link href={`/admin/incidents/${incident.id}`}>
                      View details <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
