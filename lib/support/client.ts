'use client';

import { tokenStore } from '@/lib/api-client';
import type { CreateTicketPayload, SupportTicket } from '@/lib/support/types';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string } | null;
};

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
}

function tenantIdFromBrowser() {
  return localStorage.getItem('beba_tenant_id') ?? '';
}

async function supportFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = tokenStore.getAccess();

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantIdFromBrowser(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? body.error?.message : undefined;
    throw new Error(message ?? 'Request failed. Please try again.');
  }

  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === false) {
      throw new Error(body.error?.message ?? 'Request failed. Please try again.');
    }
    return body.data as T;
  }

  return body as T;
}

export function createSupportTicket(payload: CreateTicketPayload) {
  return supportFetch<SupportTicket>('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function assignTicket(ticketId: string) {
  return supportFetch<SupportTicket>(`/admin/support/tickets/${ticketId}/assign`, {
    method: 'POST',
  });
}

export function updateTicketStatus(ticketId: string, status: string) {
  return supportFetch<SupportTicket>(`/admin/support/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function searchActiveTickets(query: string) {
  const params = new URLSearchParams({
    page: '1',
    limit: '20',
    status: 'OPEN,IN_PROGRESS',
    search: query,
  });
  // Note: Depending on backend, multiple statuses might need to be sent differently
  return supportFetch<any>(`/admin/support/tickets?${params.toString()}`, {
    method: 'GET',
  });
}

