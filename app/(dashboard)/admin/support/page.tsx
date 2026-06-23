'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  flexRender, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel, 
  useReactTable, 
  ColumnDef 
} from '@tanstack/react-table';
import { MoreHorizontal, Search, AlertCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, formatDistance } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SupportTicket, TicketStatus, TicketPriority, TicketCategory } from '@/lib/support/types';

// Utility for fetching data (replace with actual fetchApi helper)
const fetchApi = async (url: string) => {
  // In a real app, this would add Authorization and X-Tenant-ID headers
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

export default function AdminSupportDashboard() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState({ openTickets: 0, slaBreaches: 0, avgResolutionTime: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    // Mock fetching data. Replace with actual API calls:
    // fetchApi('/api/v1/admin/support/metrics')
    // fetchApi('/api/v1/admin/support/tickets')
    
    setTimeout(() => {
      setMetrics({
        openTickets: 24,
        slaBreaches: 3,
        avgResolutionTime: '2.5 hrs',
      });

      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          tenantId: 'tenant-1',
          memberId: 'm-1',
          subject: 'Cannot access M-Pesa statements',
          description: 'I am getting an error when trying to view my statements.',
          priority: 'HIGH',
          status: 'OPEN',
          category: 'MPESA',
          firstResponseDueAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          resolutionDueAt: new Date(Date.now() + 86400000).toISOString(),
          slaBreachedAt: null,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          tenantId: 'tenant-1',
          memberId: 'm-2',
          subject: 'Loan application pending for 3 days',
          description: 'Why is my loan still pending?',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          category: 'LOANS',
          firstResponseDueAt: new Date(Date.now() - 3600000).toISOString(), 
          resolutionDueAt: new Date(Date.now() + 86400000).toISOString(),
          slaBreachedAt: new Date(Date.now() - 1800000).toISOString(), // Breached 30 mins ago
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          tenantId: 'tenant-1',
          memberId: 'm-3',
          subject: 'How to update KYC?',
          description: 'I have a new ID card.',
          priority: 'LOW',
          status: 'PENDING_MEMBER',
          category: 'KYC',
          firstResponseDueAt: new Date(Date.now() + 7200000).toISOString(), 
          resolutionDueAt: new Date(Date.now() + 86400000).toISOString(),
          slaBreachedAt: null,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      setTickets(mockTickets);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesGlobal = ticket.subject.toLowerCase().includes(globalFilter.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'ALL' || ticket.category === categoryFilter;
    return matchesGlobal && matchesStatus && matchesPriority && matchesCategory;
  });

  const columns: ColumnDef<SupportTicket>[] = [
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <div className="font-medium max-w-[200px] sm:max-w-[300px] truncate">
          {row.getValue('subject')}
        </div>
      ),
    },
    {
      accessorKey: 'memberId', // Mocking member name
      header: 'Member',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.getValue('memberId')}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category & Priority',
      cell: ({ row }) => {
        const category = row.getValue('category') as string;
        const priority = row.original.priority;
        
        const priorityColors: Record<TicketPriority, string> = {
          LOW: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
          MEDIUM: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
          HIGH: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
          CRITICAL: 'bg-red-100 text-red-800 hover:bg-red-200',
        };

        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant="outline">{category.replace('_', ' ')}</Badge>
            <Badge variant="secondary" className={priorityColors[priority]}>
              {priority}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as TicketStatus;
        const statusColors: Record<TicketStatus, string> = {
          OPEN: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
          IN_PROGRESS: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
          PENDING_MEMBER: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
          RESOLVED: 'bg-green-100 text-green-800 hover:bg-green-200',
          CLOSED: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        };

        return (
          <Badge className={statusColors[status]} variant="secondary">
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'sla',
      header: 'SLA',
      cell: ({ row }) => {
        const ticket = row.original;
        const breached = !!ticket.slaBreachedAt;
        
        if (breached) {
          return (
            <div className="flex items-center text-red-600 font-medium text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              Breached
            </div>
          );
        }

        const due = new Date(ticket.firstResponseDueAt);
        if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
           return <span className="text-green-600 text-sm">Met</span>;
        }

        return (
          <span className="text-sm text-muted-foreground">
            Due in {formatDistanceToNow(due)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const ticket = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/admin/support/${ticket.id}`}>View Details</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Assign to Me</DropdownMenuItem>
              <DropdownMenuItem className="text-green-600">Mark Resolved</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredTickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage member support tickets and monitor SLA compliance.</p>
        </div>
        <Button asChild>
          <Link href="/admin/incidents">
            Manage Incidents <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{metrics.openTickets}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className={`text-2xl font-bold ${metrics.slaBreaches > 0 ? 'text-red-600' : ''}`}>
                {metrics.slaBreaches}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{metrics.avgResolutionTime}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subject or member..."
                className="pl-8"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="PENDING_MEMBER">Pending Member</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="LOANS">Loans</SelectItem>
                <SelectItem value="MPESA">M-Pesa</SelectItem>
                <SelectItem value="KYC">KYC</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-[250px]" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No tickets found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
