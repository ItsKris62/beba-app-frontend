'use client';

import { tokenStore } from '@/lib/api-client';
import type { CreateIncidentPayload, Incident } from './types';

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

async function incidentsFetch<T>(path: string, init: RequestInit): Promise<T> {
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
