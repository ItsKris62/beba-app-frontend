'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { memberApi, type TicketCategory, type TicketPriority } from '@/lib/api-client';
import { formatTicketLabel } from '@/components/support-ticket-ui';

const categories: TicketCategory[] = ['LOAN_QUERY', 'MPESA_ISSUE', 'ACCOUNT_ACCESS', 'KYC_UPDATE', 'GUARANTOR_DISPUTE', 'GENERAL'];
const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function NewSupportTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createTicket = useMutation({
    mutationFn: async () => {
      const res = await memberApi.createTicket({ subject, category, priority, description });
      if (!res.success) throw new Error(res.error?.message ?? 'Failed to create ticket');
      if (attachmentUrl.trim()) {
        const messageRes = await memberApi.addMessageToTicket(res.data.id, {
          content: 'Attachment added',
          attachments: [attachmentUrl.trim()],
        });
        if (!messageRes.success) throw new Error(messageRes.error?.message ?? 'Ticket created, but attachment failed');
      }
      return res.data;
    },
    onSuccess: (ticket) => router.push(`/member/support/${ticket.id}`),
    onError: (err) => setError(err instanceof Error ? err.message : 'Failed to create ticket'),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    createTicket.mutate();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/member/support">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Support Ticket</h1>
          <p className="text-sm text-muted-foreground">Send a question to the support team.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Details</CardTitle>
          <CardDescription>Include enough context for staff to investigate quickly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={160} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as TicketCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((item) => <SelectItem key={item} value={item}>{formatTicketLabel(item)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map((item) => <SelectItem key={item} value={item}>{formatTicketLabel(item)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} required className="min-h-40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment URL</Label>
              <Input id="attachment" type="url" value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} placeholder="https://..." />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createTicket.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {createTicket.isPending ? 'Sending...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
