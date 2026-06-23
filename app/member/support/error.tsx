'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SupportError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Alert variant="destructive">
        <AlertTriangle data-icon="inline-start" />
        <AlertTitle>Support could not load</AlertTitle>
        <AlertDescription>
          {error.message || 'Please refresh and try again.'}
        </AlertDescription>
      </Alert>
      <div>
        <Button type="button" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
