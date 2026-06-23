import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import type {
  PaginatedSupportTickets,
  SupportTicket,
  PaginatedAdminSupportTickets,
  AdminSupportTicket,
  SupportMetrics,
} from '@/lib/support/types';

const TOKEN_COOKIE = 'beba_access_token';

type SessionPayload = {
  sub: string;
  tenantId: string;
  email?: string;
  role?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string } | null;
};

export type SupportServerSession = {
  token: string;
  tenantId: string;
  currentUserId: string;
};

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
}
type RawAdminSupportTicket = AdminSupportTicket & {
  member?: AdminSupportTicket['member'] & {
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
      phone?: string | null;
    };
  };
};

function normalizeAdminTicket(ticket: RawAdminSupportTicket): AdminSupportTicket {
  const memberUser = ticket.member?.user;
  const createdAt = ticket.createdAt ?? new Date().toISOString();
  const updatedAt = ticket.updatedAt ?? createdAt;

  return {
    ...ticket,
    firstResponseDueAt: ticket.firstResponseDueAt ?? createdAt,
    resolutionDueAt: ticket.resolutionDueAt ?? updatedAt,
    member: {
      firstName: ticket.member?.firstName ?? memberUser?.firstName ?? '',
      lastName: ticket.member?.lastName ?? memberUser?.lastName ?? '',
      email: ticket.member?.email ?? memberUser?.email ?? '',
      phoneNumber: ticket.member?.phoneNumber ?? memberUser?.phoneNumber ?? memberUser?.phone ?? '',
      memberNumber: ticket.member?.memberNumber ?? '',
    },
  };
}

function normalizeAdminTickets(data: PaginatedAdminSupportTickets | RawAdminSupportTicket[]): PaginatedAdminSupportTickets | AdminSupportTicket[] {
  if (Array.isArray(data)) {
    return data.map(normalizeAdminTicket);
  }

  return {
    ...data,
    items: data.items.map(normalizeAdminTicket),
  };
}

export async function getSupportServerSession(): Promise<SupportServerSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!token) redirect('/login');

  try {
    const payload = jwtDecode<SessionPayload>(token);
    if (!payload.sub || !payload.tenantId) redirect('/login');

    return {
      token,
      tenantId: payload.tenantId,
      currentUserId: payload.sub,
    };
  } catch {
    redirect('/login');
  }
}

async function supportFetch<T>(path: string, session: SupportServerSession): Promise<T> {
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
    throw new Error(message ?? 'Could not load support data');
  }

  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === false) {
      throw new Error(body.error?.message ?? 'Could not load support data');
    }
    return body.data as T;
  }

  return body as T;
}

export async function getMemberTickets(page: number): Promise<PaginatedSupportTickets> {
  const session = await getSupportServerSession();
  const data = await supportFetch<PaginatedSupportTickets | SupportTicket[]>(
    `/support/tickets?page=${page}&limit=10&sortBy=updatedAt&sortDir=desc`,
    session,
  );

  if (Array.isArray(data)) {
    return {
      items: data,
      page,
      limit: data.length,
      total: data.length,
      pages: 1,
    };
  }

  return data;
}

export async function getMemberTicket(ticketId: string) {
  const session = await getSupportServerSession();
  const ticket = await supportFetch<SupportTicket>(
    `/support/tickets/${encodeURIComponent(ticketId)}`,
    session,
  );

  return { ticket, session };
}

export async function getAdminTickets(
  page: number,
  search?: string,
  status?: string,
  priority?: string,
  category?: string
): Promise<PaginatedAdminSupportTickets> {
  const session = await getSupportServerSession();
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '10',
    sortBy: 'updatedAt',
    sortDir: 'desc',
  });

  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);
  if (category) params.append('category', category);

  const data = await supportFetch<PaginatedAdminSupportTickets | RawAdminSupportTicket[]>(
    `/support/tickets?${params.toString()}`,
    session,
  );

  const normalized = normalizeAdminTickets(data);

  if (Array.isArray(normalized)) {
    return {
      items: normalized,
      page,
      limit: normalized.length,
      total: normalized.length,
      pages: 1,
    };
  }

  return normalized;
}

export async function getSupportMetrics(): Promise<SupportMetrics> {
  const session = await getSupportServerSession();
  return supportFetch<SupportMetrics>('/support/metrics', session);
}

