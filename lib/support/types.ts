export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_MEMBER' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TicketCategory =
  | 'LOAN_QUERY'
  | 'MPESA_ISSUE'
  | 'ACCOUNT_ACCESS'
  | 'KYC_UPDATE'
  | 'GUARANTOR_DISPUTE'
  | 'GENERAL';

export type SupportSenderType = 'MEMBER' | 'ADMIN' | 'SYSTEM';
export type SupportMessageType = 'TEXT' | 'IMAGE' | 'FILE';

export interface ChatMessage {
  id: string;
  tenantId: string;
  ticketId: string;
  senderId: string;
  senderType: SupportSenderType;
  content: string;
  messageType: SupportMessageType;
  metadata?: {
    objectKey?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    downloadUrl?: string;
  } | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  memberId: string;
  assignedAdminId?: string | null;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  relatedLoanId?: string | null;
  relatedTxId?: string | null;
  firstResponseDueAt: string;
  resolutionDueAt: string;
  firstRespondedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  slaBreachedAt?: string | null;
  slaWarningSentAt?: string | null;
  lastMemberMessageAt?: string | null;
  lastAdminMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface PaginatedSupportTickets {
  items: SupportTicket[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CreateTicketPayload {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  description: string;
}

export interface AdminSupportTicket extends SupportTicket {
  member: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    memberNumber: string;
  };
}

export interface PaginatedAdminSupportTickets {
  items: AdminSupportTicket[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SupportMetrics {
  openTickets: number;
  slaBreaches: number;
  avgResolutionTimeHours: number;
}
