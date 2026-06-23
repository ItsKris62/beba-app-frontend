'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const incidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL'], {
    required_error: 'Please select a severity level.',
  }),
  affectedService: z.string().min(2, 'Affected service must be specified.'),
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

export default function NewIncidentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: '',
      description: '',
      affectedService: '',
    },
  });

  async function onSubmit(data: IncidentFormValues) {
    setIsSubmitting(true);
    try {
      // Mock API call: await fetch('/api/v1/admin/incidents', { method: 'POST', body: JSON.stringify(data) });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Incident Declared',
        description: `Successfully declared: ${data.title}`,
      });
      
      // Navigate to the newly created incident detail page (mocking an ID)
      router.push(`/admin/incidents/inc-${Math.floor(Math.random() * 1000)}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to declare incident. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild className="p-0 h-auto hover:bg-transparent text-muted-foreground">
            <Link href="/admin/incidents"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Incidents</Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Declare New Incident</h1>
        <p className="text-muted-foreground mt-1">
          Create a new system-wide incident to alert members and track related support tickets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
          <CardDescription>
            Provide clear and concise details about the issue. This information may be visible to members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., M-Pesa B2C Delay" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MINOR">Minor</SelectItem>
                          <SelectItem value="MAJOR">Major</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="affectedService"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Affected Service</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MPESA, LOANS" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide details about what is happening and the impact..." 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      This description will be used internally to track the issue context.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button variant="outline" asChild disabled={isSubmitting}>
                  <Link href="/admin/incidents">Cancel</Link>
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Declare Incident
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
