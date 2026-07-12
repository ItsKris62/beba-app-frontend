'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi, type GuarantorCorrelation as GuarantorCorrelationData } from '@/lib/api-client';
import { useLastGoodData } from '@/lib/use-last-good-data';

function money(value: number): string {
  return `KES ${value.toLocaleString('en-KE')}`;
}

export function GuarantorCorrelation() {
  const query = useQuery({
    queryKey: ['admin-guarantor-correlation'],
    queryFn: () => adminApi.getGuarantorCorrelation(),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const correlation = useLastGoodData<GuarantorCorrelationData>(query.data);
  const rows = correlation?.ranked ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Guarantor Default Correlation</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <Skeleton className="h-64" />
        ) : !correlation || rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No guarantors meet the {correlation?.minGuaranteesForCorrelation ?? 5}-guarantee sample threshold yet.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guarantor</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Defaults</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Guaranteed</TableHead>
                    <TableHead className="text-right">Recovered</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Closed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.memberId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{row.memberNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{row.defaultCorrelationRate}%</TableCell>
                      <TableCell className="text-right">{row.defaultedGuarantees.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.totalGuarantees.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{money(row.totalGuaranteedAmount)}</TableCell>
                      <TableCell className="text-right">{money(row.recoveredAmount)}</TableCell>
                      <TableCell className="text-right">{row.activeGuarantees.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{row.closedGuarantees.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum sample: {correlation.minGuaranteesForCorrelation.toLocaleString()} accepted guarantees.
              {correlation.excludedBelowThreshold > 0
                ? ` ${correlation.excludedBelowThreshold.toLocaleString()} guarantors are below threshold.`
                : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
