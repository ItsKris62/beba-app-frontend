'use client';

import { useEffect, useState } from 'react';

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 15000;

interface ApiLikeResult {
  success: boolean;
  error?: { code?: string } | null;
}

/**
 * apiFetch() never rejects on a network failure — it resolves with
 * {success:false, error:{code:'NETWORK_ERROR'}} (see api-client.ts's
 * apiFetch/rawApiFetch catch blocks). React Query's own `retry` option only
 * re-invokes queryFn when the returned promise *rejects*, so it never
 * engages for this failure shape no matter how it's configured.
 *
 * This hook detects that specific "resolved but unreachable" shape on an
 * otherwise-empty query and drives its own backoff refetch loop — up to
 * ~50s total, enough to survive a Render free/starter-tier cold start
 * (container boot + Nest bootstrap can take 30-60s) instead of permanently
 * stranding the user on the very first failed attempt.
 */
export function useNetworkErrorAutoRetry(
  data: ApiLikeResult | null | undefined,
  hasData: boolean,
  refetch: () => void,
) {
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const isNetworkError = data != null && data.success === false && data.error?.code === 'NETWORK_ERROR';
    if (!isNetworkError || hasData || attempt >= MAX_ATTEMPTS) return;

    const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    const timer = setTimeout(() => {
      setAttempt((n) => n + 1);
      refetch();
    }, delay);
    return () => clearTimeout(timer);
    // refetch is a react-query-provided callback; including it would retrigger
    // this effect on every render since it isn't referentially stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hasData, attempt]);

  return {
    attempt,
    exhausted: attempt >= MAX_ATTEMPTS,
    retrying: attempt > 0 && attempt < MAX_ATTEMPTS && !hasData,
  };
}
