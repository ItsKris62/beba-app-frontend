'use client';

import { useState } from 'react';

/**
 * Returns the last *successfully* resolved payload, ignoring any later
 * response that resolved but failed (apiFetch() resolves rather than
 * rejects on a network error — see use-network-error-retry.ts — so a
 * transient blip on a background refetchInterval poll would otherwise
 * re-derive straight back to `null` on every failed tick, tearing down
 * already-rendered charts even though nothing is actually wrong with the
 * data on screen). Once real data has loaded once, this only ever updates
 * on the next *successful* response — a background failure just leaves
 * the previous good value in place, silently, until the next poll or the
 * cold-start retry loop succeeds.
 *
 * Deliberately has no query-key-change reset: for executive-overview.tsx's
 * range selector, resetting on every range change would reintroduce a
 * blank flash that `placeholderData: keepPreviousData` already avoids —
 * staying sticky through a range switch's first failed fetch is the
 * better trade-off than a guaranteed flash on every switch.
 *
 * Implemented as "adjust state during render" (react.dev's recommended
 * pattern for caching a derived value across renders) rather than
 * useEffect+setState, so there's no extra render pass and nothing to
 * silence a set-state-in-effect lint warning about.
 */
export function useLastGoodData<T>(payload: { success: boolean; data: T } | null | undefined): T | null {
  const [lastGood, setLastGood] = useState<T | null>(payload?.success ? payload.data : null);
  const [prevPayload, setPrevPayload] = useState(payload);

  if (payload !== prevPayload) {
    setPrevPayload(payload);
    if (payload?.success) {
      setLastGood(payload.data);
    }
  }

  return lastGood;
}
