'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup } from '@/components/ui/field';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createSupportTicket } from '@/lib/support/client';
import { formatSupportLabel } from '@/components/support/StatusBadge';
import type { TicketCategory, TicketPriority } from '@/lib/support/types';

const categories = [
  'LOAN_QUERY',
  'MPESA_ISSUE',
  'ACCOUNT_ACCESS',
  'KYC_UPDATE',
  'GUARANTOR_DISPUTE',
  'GENERAL',
] as const satisfies readonly TicketCategory[];

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const satisfies readonly TicketPriority[];

const createTicketSchema = z.object({
  subject: z.string().trim().min(5, 'Use at least 5 characters.').max(160),
  category: z.enum(categories),
  priority: z.enum(priorities),
  description: z.string().trim().min(10, 'Use at least 10 characters.').max(5000),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

export function CreateTicketForm() {
  const router = useRouter();
  const form = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      subject: '',
      category: 'GENERAL',
      priority: 'MEDIUM',
      description: '',
    },
  });

  async function onSubmit(values: CreateTicketValues) {
    try {
      const ticket = await createSupportTicket(values);
      toast.success('Support ticket created');
      router.push(`/member/support/${ticket.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create ticket');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket details</CardTitle>
        <CardDescription>
          Share enough context for the support team to investigate quickly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <FieldGroup>
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <Field>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          maxLength={160}
                          placeholder="Briefly describe the issue"
                          aria-label="Ticket subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </Field>
                  </FormItem>
                )}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full" aria-label="Ticket category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {formatSupportLabel(category)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </Field>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <Field>
                        <FormLabel>Priority</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full" aria-label="Ticket priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              {priorities.map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {formatSupportLabel(priority)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </Field>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <Field>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          maxLength={5000}
                          className="min-h-44 resize-y"
                          placeholder="What happened? Include dates, transaction references, or loan numbers where relevant."
                          aria-label="Ticket description"
                        />
                      </FormControl>
                      <FormMessage />
                    </Field>
                  </FormItem>
                )}
              />
            </FieldGroup>

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                Create ticket
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
