import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminTickets, getSupportMetrics } from '@/lib/support/server';
import { TicketsDataTable } from '@/components/support/TicketsDataTable';
import { columns } from '@/components/support/TicketsTableColumns';
import { AlertCircle, Clock, TicketIcon } from 'lucide-react';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Support Dashboard | Beba Super Admin',
};

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      {[1, 2, 3].map(i => (
        <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full"/></CardContent></Card>
      ))}
    </div>
  );
}

async function MetricsSection() {
  try {
    const metrics = await getSupportMetrics();
    
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.openTickets}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <AlertCircle className={`h-4 w-4 ${metrics.slaBreaches > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.slaBreaches > 0 ? 'text-red-600' : ''}`}>
              {metrics.slaBreaches}
            </div>
            <p className="text-xs text-muted-foreground">Requiring immediate attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResolutionTimeHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Past 7 days</p>
          </CardContent>
        </Card>
      </div>
    );
  } catch (e) {
    return null;
  }
}

async function TableSection({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search;
  const status = searchParams.status;
  const priority = searchParams.priority;
  const category = searchParams.category;

  const data = await getAdminTickets(page, search, status, priority, category).catch(() => ({
    items: [],
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  }));

  return (
    <TicketsDataTable 
      columns={columns} 
      data={data.items} 
      pageCount={data.pages} 
      currentPage={data.page} 
      isLoading={false} 
    />
  );
}

export default function SupportDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Support Operations</h2>
      </div>

      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsSection />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <TableSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
