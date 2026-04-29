'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, AlertCircle, CheckCircle, CreditCard, Loader2, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  adminApi, formatCurrency, formatDate, type AdminMemberDetail,
} from '@/lib/api-client';

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || '-'}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>
    : <Badge variant="secondary">Inactive</Badge>;
}

export default function MemberProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const [member, setMember] = useState<AdminMemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    adminApi.getMember(memberId)
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data) {
          setMember(res.data);
        } else {
          setError(res.error?.message ?? 'Member profile could not be loaded');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError((err as { message?: string })?.message ?? 'Member profile could not be loaded');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/admin/members')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Members
        </Button>
        <Card>
          <CardContent className="flex items-start gap-3 p-6 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Unable to load member profile</p>
              <p className="text-sm">{error ?? 'Member not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${member.user.firstName} ${member.user.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/admin/members')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
              <StatusBadge active={member.isActive} />
            </div>
            <p className="text-muted-foreground">{member.memberNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="National ID" value={member.nationalId} />
            <DetailRow label="Phone" value={member.user.phone} />
            <DetailRow label="Email" value={member.user.email} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">KYC</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Status" value={member.kycStatus} />
            <DetailRow label="KRA PIN" value={member.kraPin} />
            <DetailRow label="Joined" value={formatDate(member.joinedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Total Accounts" value={member.accounts.length} />
            <DetailRow label="Loans" value={member.loans.length} />
            <DetailRow label="Last Login" value={member.user.lastLoginAt ? formatDate(member.user.lastLoginAt) : '-'} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {member.accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No accounts found
                  </TableCell>
                </TableRow>
              ) : member.accounts.map(account => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-sm">{account.accountNumber}</TableCell>
                  <TableCell>{account.accountType}</TableCell>
                  <TableCell>{formatCurrency(Number(account.balance))}</TableCell>
                  <TableCell><StatusBadge active={account.isActive} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Loans</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {member.loans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No recent loans found
                  </TableCell>
                </TableRow>
              ) : member.loans.map(loan => (
                <TableRow key={loan.id}>
                  <TableCell className="font-mono text-sm">{loan.loanNumber}</TableCell>
                  <TableCell>{loan.status}</TableCell>
                  <TableCell>{formatCurrency(Number(loan.principalAmount))}</TableCell>
                  <TableCell>{formatCurrency(Number(loan.outstandingBalance))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
