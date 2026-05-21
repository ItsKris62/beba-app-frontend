'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { getSafeErrorMessage, reportClientError } from '@/lib/error-sanitizer';

export function GlobalErrorListener() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason, { source: 'unhandledrejection' });
      toast.error(getSafeErrorMessage(event.reason));
    };

    const onError = (event: ErrorEvent) => {
      reportClientError(event.error ?? event.message, {
        source: 'window.error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return null;
}
