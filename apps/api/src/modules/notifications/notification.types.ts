export type NotificationKind = 'ANNOUNCEMENT' | 'BUSINESS';
export type NotificationCategory = 'ANNOUNCEMENT' | 'ORDER' | 'FINANCE' | 'WAREHOUSE' | 'CUSTOMER_SERVICE' | 'SYSTEM';
export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
export type AnnouncementAudienceType = 'ALL' | 'STAFF' | 'CUSTOMER' | 'ROLE' | 'DEPARTMENT' | 'SITE' | 'USERS';
export type NotificationDeliveryStatus = 'ALL' | 'UNREAD' | 'ARCHIVED';
export type NotificationProcessingStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'SKIPPED' | 'NO_RECIPIENT' | 'FAILED' | 'DEAD_LETTER';

export interface NotificationSummary {
  id: string;
  kind: NotificationKind;
  type: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actorName?: string;
  sourceType?: string;
  sourceId?: string;
  targetModule?: string;
  targetSection?: string;
  targetEntityType?: string;
  targetEntityId?: string;
  targetPath?: string;
  requiresAcknowledgement: boolean;
  deliveredAt: string;
  readAt?: string;
  acknowledgedAt?: string;
  archivedAt?: string;
}

export interface NotificationListResponse {
  items: NotificationSummary[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface NotificationUnreadSummary {
  unreadCount: number;
  displayCount: string;
  latestDeliveredAt?: string;
}

export interface AnnouncementCreateInput {
  requestId: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  audienceType: AnnouncementAudienceType;
  audienceValues?: string[];
  requiresAcknowledgement?: boolean;
  expiresAt?: string;
}

export interface AnnouncementSummary {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  audienceType: AnnouncementAudienceType;
  audienceValues: string[];
  status: 'PUBLISHED' | 'WITHDRAWN';
  requiresAcknowledgement: boolean;
  expiresAt?: string;
  publishedAt: string;
  withdrawnAt?: string;
  recipientCount: number;
  readCount: number;
  acknowledgedCount: number;
}

export interface AnnouncementAudienceOptions {
  roles: Array<{ value: string; label: string }>;
  departments: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string; role: string; site?: string; customer: boolean }>;
}

export interface NotificationPreferenceSummary {
  category: NotificationCategory;
  enabled: boolean;
  locked: boolean;
  label: string;
}

export interface NotificationEventProcessingSummary {
  id: string;
  auditLogId: string;
  action: string;
  status: NotificationProcessingStatus;
  attempts: number;
  recipientCount: number;
  error?: string;
  nextRetryAt?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationOperationsResponse {
  items: NotificationEventProcessingSummary[];
  total: number;
  counts: Record<NotificationProcessingStatus, number>;
}

export interface NotificationActionTaskSummary {
  id: string;
  type: 'FINANCE_WATER_RECEIPT_MATCH_RESUBMIT';
  title: string;
  body: string;
  targetModule: string;
  targetSection: string;
  targetEntityType: string;
  targetEntityId: string;
  targetPath?: string;
  openedAt: string;
}

export interface NotificationActionTaskListResponse {
  items: NotificationActionTaskSummary[];
  total: number;
}
