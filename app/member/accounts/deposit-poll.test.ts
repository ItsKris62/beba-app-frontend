import { describe, expect, it, vi } from 'vitest';
import { getDepositPollDelayMs } from './page';

describe('getDepositPollDelayMs', () => {
  it('increases with attempt number, up to the cap', () => {
    const first = getDepositPollDelayMs(0);
    const later = getDepositPollDelayMs(5);
    const capped = getDepositPollDelayMs(50);

    expect(first).toBeGreaterThan(0);
    expect(later).toBeGreaterThan(first);
    // capped at POLL_MAX_DELAY_MS (10000) plus up to 20% jitter
    expect(capped).toBeLessThanOrEqual(12000);
  });

  it('applies roughly +/-20% jitter around the base delay', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // jitter = 0 at the midpoint
    const delay = getDepositPollDelayMs(0);
    expect(delay).toBe(3000);
    vi.restoreAllMocks();
  });

  it('never returns a non-positive delay', () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      expect(getDepositPollDelayMs(attempt)).toBeGreaterThan(0);
    }
  });
});
