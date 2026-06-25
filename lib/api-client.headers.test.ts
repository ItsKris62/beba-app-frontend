import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminApi, tokenStore } from './api-client';

describe('api client request headers', () => {
  afterEach(() => {
    tokenStore.clear();
    vi.unstubAllGlobals();
  });

  it('attaches Authorization and X-Tenant-ID to admin API calls', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            pageVolume: 0,
            inflows: 0,
            outflows: 0,
            netFlow: 0,
            periodStart: null,
            periodEnd: null,
          },
          error: null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    tokenStore.set(
      'test-access-token',
      'test-refresh-token',
      {
        id: 'user-1',
        email: 'manager@kc-boda.test',
        firstName: 'Beba',
        lastName: 'Admin',
        role: 'MANAGER',
        tenantId: 'tenant-kc-boda',
        mustChangePassword: false,
      },
      { persistRefresh: false },
    );

    const response = await adminApi.getTransactionStats();

    expect(response.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error('Expected fetch to be called');
    const [url, requestInit] = call;
    const headers = requestInit?.headers as Record<string, string>;

    expect(String(url)).toContain('/api/v1/admin/transactions/stats');
    expect(headers.Authorization).toBe('Bearer test-access-token');
    expect(headers['X-Tenant-ID']).toBe('tenant-kc-boda');
    expect(document.cookie).toContain('beba_access_token=test-access-token');
  });
});
