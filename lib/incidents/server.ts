import { getSupportServerSession } from '@/lib/support/server';
import type { Incident } from './types';
import { notFound, redirect } from 'next/navigation';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string } | null;
};

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
}

async function incidentsFetch<T>(path: string, session: any): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'X-Tenant-ID': session.tenantId,
    },
  });

  if (response.status === 401) redirect('/login');
  if (response.status === 404) notFound();

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | T | null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body ? body.error?.message : undefined;
    throw new Error(message ?? 'Could not load data');
  }

  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === false) {
      throw new Error(body.error?.message ?? 'Could not load data');
    }
    return body.data as T;
  }

  return body as T;
}

export async function getIncidents(): Promise<Incident[]> {
  const session = await getSupportServerSession();
  return incidentsFetch<Incident[]>('/admin/incidents', session);
}

export async function getIncident(incidentId: string) {
  const session = await getSupportServerSession();
  const incident = await incidentsFetch<Incident>(
    `/admin/incidents/${encodeURIComponent(incidentId)}`,
    session,
  );
  
  // also fetch linked tickets
  const linkedTickets = await incidentsFetch<any[]>(
    `/admin/incidents/${encodeURIComponent(incidentId)}/tickets`,
    session,
  ).catch(() => []);

  return { incident, linkedTickets, session };
}
