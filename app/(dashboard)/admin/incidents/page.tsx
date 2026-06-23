'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PlusCircle, Search, AlertTriangle, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Incident, IncidentSeverity, IncidentStatus } from '@/lib/incidents/types';

export default function AdminIncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Mock API call to GET /api/v1/admin/incidents
    setTimeout(() => {
      const mockIncidents: Incident[] = [
        {
          id: 'inc-1',
          tenantId: 'tenant-1',
          title: 'M-Pesa B2C Disbursement Delay',
          description: 'Loan disbursements are taking longer than 30 minutes due to Safaricom Daraja API latency.',
          severity: 'MAJOR',
          status: 'INVESTIGATING',
          affectedService: 'MPESA B2C',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'inc-2',
          tenantId: 'tenant-1',
          title: 'SMS Gateway Timeout',
          description: 'OTP SMS delivery is failing for some users.',
          severity: 'CRITICAL',
          status: 'IDENTIFIED',
          affectedService: 'SMS Gateway',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'inc-3',
          tenantId: 'tenant-1',
          title: 'Statement Generation Error',
          description: 'PDF generation failing intermittently for FOSA accounts.',
          severity: 'MINOR',
          status: 'MONITORING',
          affectedService: 'Reporting',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      setIncidents(mockIncidents);
      setIsLoading(false);
    }, 1000);
  }, []);

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

  const filteredIncidents = incidents.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.affectedService.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="p-0 h-auto hover:bg-transparent text-muted-foreground">
              <Link href="/admin/support"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Support</Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <AlertTriangle className="mr-2 w-8 h-8 text-red-600" />
            Incident Management
          </h1>
          <p className="text-muted-foreground mt-1">Declare and track system-wide incidents.</p>
        </div>
        <Button asChild className="bg-red-600 hover:bg-red-700">
          <Link href="/admin/incidents/new">
            <PlusCircle className="ml-2 w-4 h-4 mr-2" />
            Declare New Incident
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-1">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredIncidents.length > 0 ? (
          filteredIncidents.map(incident => (
            <Card key={incident.id} className="flex flex-col hover:border-muted-foreground transition-colors">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <Badge variant="secondary" className={severityColors[incident.severity]}>
                    {incident.severity}
                  </Badge>
                  <Badge variant="outline" className={statusColors[incident.status]}>
                    {incident.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight line-clamp-2" title={incident.title}>
                  {incident.title}
                </CardTitle>
                <CardDescription>
                  {incident.affectedService}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {incident.description}
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t flex justify-between items-center bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(incident.createdAt), 'MMM d, HH:mm')}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/incidents/${incident.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            No incidents found.
          </div>
        )}
      </div>
    </div>
  );
}
