export type IncidentSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';
export type IncidentStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';

export interface Incident {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedService: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface InAppNotification {
  id: string;
  tenantId: string;
  memberId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface IncidentTicketLink {
  id: string;
  incidentId: string;
  ticketId: string;
  linkedAt: string;
  linkedBy: string;
}

export interface CreateIncidentPayload {
  title: string;
  description: string;
  severity: IncidentSeverity;
  affectedService: string;
}
