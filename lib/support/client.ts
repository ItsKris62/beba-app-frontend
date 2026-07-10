'use client';

import { apiFetch } from '@/lib/api-client';
import type { CreateTicketPayload, SupportTicket } from '@/lib/support/types';

// Delegates to the shared apiFetch() (lib/api-client.ts) so this client
// inherits the real RFC 7807 error parsing and 401→refresh→retry logic
// instead of re-implementing them — see error-sanitizer.ts for the shape.
// Callers here rely on a throw-on-error contract (unlike apiFetch's own
// {success,data,error} return), so this wrapper unwraps that for them.
async function supportFetch<T>(path: string, init: RequestInit): Promise<T> {
  const result = await apiFetch<T>(path, init);
  if (!result.success) {
    throw new Error(result.error?.message ?? 'Request failed. Please try again.');
  }
  return result.data;
}

export function createSupportTicket(payload: CreateTicketPayload) {
  return supportFetch<SupportTicket>('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function assignTicket(ticketId: string) {
  return supportFetch<SupportTicket>(`/support/tickets/${ticketId}/assign`, {
    method: 'POST',
  });
}

export function updateTicketStatus(ticketId: string, status: string) {
  return supportFetch<SupportTicket>(`/support/tickets/${ticketId}`, {
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
  return supportFetch<any>(`/support/tickets?${params.toString()}`, {
    method: 'GET',
  });
}
