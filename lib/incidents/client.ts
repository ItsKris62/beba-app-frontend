'use client';

import { apiFetch } from '@/lib/api-client';
import type { CreateIncidentPayload, Incident } from './types';

// Delegates to the shared apiFetch() (lib/api-client.ts) so this client
// inherits the real RFC 7807 error parsing and 401→refresh→retry logic
// instead of re-implementing them — see error-sanitizer.ts for the shape.
// Callers here rely on a throw-on-error contract (unlike apiFetch's own
// {success,data,error} return), so this wrapper unwraps that for them.
async function incidentsFetch<T>(path: string, init: RequestInit): Promise<T> {
  const result = await apiFetch<T>(path, init);
  if (!result.success) {
    throw new Error(result.error?.message ?? 'Request failed. Please try again.');
  }
  return result.data;
}

export function createIncident(payload: CreateIncidentPayload) {
  return incidentsFetch<Incident>('/admin/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateIncidentStatus(incidentId: string, status: string) {
  return incidentsFetch<Incident>(`/admin/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function linkTicketsToIncident(incidentId: string, ticketIds: string[]) {
  return incidentsFetch<any>(`/admin/incidents/${incidentId}/link-tickets`, {
    method: 'POST',
    body: JSON.stringify({ ticketIds }),
  });
}

export function notifyAffectedMembers(incidentId: string) {
  return incidentsFetch<any>(`/admin/incidents/${incidentId}/notify`, {
    method: 'POST',
  });
}
