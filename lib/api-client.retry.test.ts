import { afterEach, describe, expect, it, vi } from 'vitest';
import { memberApi, tokenStore } from './api-client';

const testUser = {
  id: 'user-1',
  email: 'member@kc-boda.test',
  firstName: 'Beba',
  lastName: 'Member',
  role: 'MEMBER',
  tenantId: 'tenant-kc-boda',
  mustChangePassword: false,
};

describe('api client retry policy', () => {
  afterEach(() => {
    tokenStore.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not auto-retry a mutation (POST) after a 500 response', async () => {
    vi.useFakeTimers();
    tokenStore.set('token', 'refresh', testUser, { persistRefresh: false });

    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ errorCode: 'HTTP_500' }), { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = memberApi.withdrawMpesa(
      { phoneNumber: '254700000000', amount: 500 },
      'test-idem-key-1',
    );
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
  });

  it('does not auto-retry a mutation (POST) after a network error', async () => {
    vi.useFakeTimers();
    tokenStore.set('token', 'refresh', testUser, { persistRefresh: false });

    const fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = memberApi.withdrawMpesa(
      { phoneNumber: '254700000000', amount: 500 },
      'test-idem-key-2',
    );
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
  });

  it('still retries a GET request after a 500 response', async () => {
    vi.useFakeTimers();
    tokenStore.set('token', 'refresh', testUser, { persistRefresh: false });

    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      if (call < 2) {
        return new Response(JSON.stringify({ errorCode: 'HTTP_500' }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true, data: {}, error: null }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = memberApi.getDashboard();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });
});
