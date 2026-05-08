/**
 * React Error Boundary for Dashboard & Admin Tabs
 *
 * Catches rendering errors in child components and displays
 * a user-friendly fallback UI with retry/refresh options.
 *
 * Usage:
 *   <ErrorBoundary fallback={<DashboardErrorFallback />}>
 *     <DashboardTab />
 *   </ErrorBoundary>
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught error:', error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasChanged = this.props.resetKeys.some(
        (key, i) => key !== prevProps.resetKeys?.[i],
      );
      if (hasChanged) {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-xl font-semibold text-destructive">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        We encountered an unexpected error while loading this section.
        Please try refreshing or contact support if the problem persists.
      </p>

      {process.env.NODE_ENV === 'development' && error && (
        <pre className="mb-6 max-w-full overflow-auto rounded bg-background p-4 text-left text-xs text-destructive">
          {error.message}
          {'\n'}
          {error.stack}
        </pre>
      )}

      <div className="flex gap-3">
        <Button onClick={onRetry} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline">
          <Link href="/member/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Dashboard-specific error fallback with stale-data warning.
 */
export function DashboardErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/20">
      <AlertTriangle className="mb-4 h-12 w-12 text-amber-600" />
      <h2 className="mb-2 text-xl font-semibold text-amber-800 dark:text-amber-200">
        Dashboard data is temporarily unavailable
      </h2>
      <p className="mb-6 max-w-md text-sm text-amber-700 dark:text-amber-300">
        We are having trouble fetching your latest data. Some information may be
        outdated. Retrying automatically...
      </p>

      <div className="flex gap-3">
        <Button onClick={onRetry} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Now
        </Button>
      </div>
    </div>
  );
}
