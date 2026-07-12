'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi, type DashboardDrilldownParams, type DashboardDrilldownResponse } from '@/lib/api-client';
import { useLastGoodData } from '@/lib/use-last-good-data';

const DRILLDOWN_PAGE_SIZE = 20;

export interface DashboardDrilldownSelection {
  title: string;
  description?: string;
  query: Omit<DashboardDrilldownParams, 'page' | 'limit'>;
}

type Column = {
  key: string;
  label: string;
  className?: string;
  render: (row: Record<string, unknown>) => string;
};

function asText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function asMoney(value: unknown): string {
  const amount = Number(value ?? 0);
  return `KES ${amount.toLocaleString('en-KE')}`;
}

function asDate(value: unknown): string {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

function columnsFor(source: DashboardDrilldownResponse['source']): Column[] {
  switch (source) {
    case 'transaction':
      return [
        { key: 'reference', label: 'Reference', className: 'font-mono text-xs', render: (row) => asText(row.reference) },
        {
          key: 'member',
          label: 'Member / Account',
          render: (row) => `${asText(row.memberName)} / ${asText(row.memberNumber)} / ${asText(row.accountNumber)}`,
        },
        { key: 'type', label: 'Type / Status', render: (row) => `${asText(row.type)} / ${asText(row.status)}` },
        { key: 'amount', label: 'Amount', className: 'text-right', render: (row) => asMoney(row.amount) },
        { key: 'createdAt', label: 'Date', render: (row) => asDate(row.createdAt) },
      ];
    case 'mpesa':
      return [
        { key: 'receipt', label: 'Receipt', className: 'font-mono text-xs', render: (row) => asText(row.mpesaReceiptNumber ?? row.reference) },
        { key: 'member', label: 'Member / Phone', render: (row) => `${asText(row.memberName)} / ${asText(row.phoneNumber)}` },
        { key: 'type', label: 'Type / Status', render: (row) => `${asText(row.type)} / ${asText(row.status)}` },
        { key: 'amount', label: 'Amount', className: 'text-right', render: (row) => asMoney(row.amount) },
        { key: 'createdAt', label: 'Date', render: (row) => asDate(row.createdAt) },
      ];
    case 'loan':
      return [
        { key: 'loanNumber', label: 'Loan', className: 'font-mono text-xs', render: (row) => asText(row.loanNumber) },
        { key: 'member', label: 'Member', render: (row) => `${asText(row.memberName)} / ${asText(row.memberNumber)}` },
        { key: 'product', label: 'Product', render: (row) => asText(row.loanProductName) },
        { key: 'status', label: 'Status / Staging', render: (row) => `${asText(row.status)} / ${asText(row.staging)}` },
        { key: 'outstanding', label: 'Outstanding', className: 'text-right', render: (row) => asMoney(row.outstandingBalance) },
        { key: 'arrears', label: 'Arrears', className: 'text-right', render: (row) => `${Number(row.arrearsDays ?? 0).toLocaleString()} days` },
      ];
    case 'guarantor':
      return [
        { key: 'guarantor', label: 'Guarantor', render: (row) => `${asText(row.guarantorName)} / ${asText(row.guarantorMemberNumber)}` },
        { key: 'loan', label: 'Borrower / Loan', render: (row) => `${asText(row.borrowerName)} / ${asText(row.loanNumber)}` },
        { key: 'status', label: 'Status', render: (row) => `${asText(row.status)} / ${asText(row.loanStatus)}` },
        { key: 'guaranteed', label: 'Guaranteed', className: 'text-right', render: (row) => asMoney(row.guaranteedAmount) },
        { key: 'recovered', label: 'Recovered', className: 'text-right', render: (row) => asMoney(row.recoveredAmount) },
      ];
    case 'member':
      return [
        { key: 'memberNumber', label: 'Member No.', className: 'font-mono text-xs', render: (row) => asText(row.memberNumber) },
        { key: 'name', label: 'Name', render: (row) => asText(row.name) },
        { key: 'status', label: 'Status / KYC', render: (row) => `${asText(row.accountStatus)} / ${asText(row.kycStatus)}` },
        {
          key: 'accounts',
          label: 'Accounts',
          render: (row) =>
            Array.isArray(row.accounts)
              ? row.accounts.map((account) => asText((account as Record<string, unknown>).accountType)).join(', ')
              : '-',
        },
        { key: 'joinedAt', label: 'Joined', render: (row) => asDate(row.joinedAt) },
      ];
    case 'journal':
      return [
        { key: 'entryNumber', label: 'Entry', className: 'font-mono text-xs', render: (row) => asText(row.entryNumber) },
        { key: 'type', label: 'Type / Status', render: (row) => `${asText(row.type)} / ${asText(row.status)}` },
        { key: 'description', label: 'Description', render: (row) => asText(row.description) },
        { key: 'amount', label: 'Amount', className: 'text-right', render: (row) => asMoney(row.totalAmount) },
        { key: 'createdAt', label: 'Date', render: (row) => asDate(row.createdAt) },
      ];
  }
}

export function DrilldownDialog({
  selection,
  onClose,
}: {
  selection: DashboardDrilldownSelection | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const open = selection !== null;
  const queryKey = useMemo(() => JSON.stringify(selection?.query ?? null), [selection]);

  useEffect(() => {
    setPage(1);
  }, [queryKey]);

  const query = useQuery({
    queryKey: ['admin-dashboard-drilldown', queryKey, page],
    queryFn: () => adminApi.getDashboardDrilldown({ ...selection!.query, page, limit: DRILLDOWN_PAGE_SIZE }),
    enabled: open,
    placeholderData: keepPreviousData,
  });

  const response = useLastGoodData<DashboardDrilldownResponse>(query.data);
  const error = query.data != null && !query.data.success ? query.data.error?.message ?? 'Failed to load drill-down rows' : null;
  const rows = response?.data ?? [];
  const meta = response?.meta;
  const columns = response ? columnsFor(response.source) : [];
  const loading = query.isLoading || (query.isFetching && rows.length === 0);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-4xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{selection?.title ?? 'Drill-down'}</SheetTitle>
          {selection?.description && <SheetDescription>{selection.description}</SheetDescription>}
        </SheetHeader>

        <div className="space-y-4 p-4">
          {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.length === 0
                    ? Array.from({ length: 5 }).map((_, index) => <TableHead key={index}> </TableHead>)
                    : columns.map((column) => (
                        <TableHead key={column.key} className={column.className}>
                          {column.label}
                        </TableHead>
                      ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(columns.length, 1)} className="py-10 text-center text-muted-foreground">
                      No matching records found
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, rowIndex) => (
                    <TableRow key={asText(row.id) === '-' ? rowIndex : asText(row.id)}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className={column.className}>
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages ?? 1} - {meta.total.toLocaleString()} records
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage((current) => current - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (meta.totalPages ?? 1) || query.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
