'use client';

import { useEffect, useState } from 'react';
import { tenantsApi, type TenantPublicInfo } from '@/lib/api-client';

let cachedInfo: TenantPublicInfo | null = null;
let pendingRequest: Promise<TenantPublicInfo | null> | null = null;

function fetchPublicInfo(): Promise<TenantPublicInfo | null> {
  if (cachedInfo) return Promise.resolve(cachedInfo);
  if (!pendingRequest) {
    pendingRequest = tenantsApi.getPublicInfo().then((result) => {
      cachedInfo = result.success ? result.data : null;
      return cachedInfo;
    });
  }
  return pendingRequest;
}

/**
 * Shared org identity (name/contact/logo) for unauthenticated marketing pages
 * (footer, about, contact). Cached at module scope so the footer and the page
 * that renders it don't each issue their own request.
 */
export function useTenantPublicInfo() {
  const [info, setInfo] = useState<TenantPublicInfo | null>(cachedInfo);
  const [loading, setLoading] = useState(!cachedInfo);

  useEffect(() => {
    if (cachedInfo) return;
    let cancelled = false;
    fetchPublicInfo().then((result) => {
      if (cancelled) return;
      setInfo(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { info, loading };
}
