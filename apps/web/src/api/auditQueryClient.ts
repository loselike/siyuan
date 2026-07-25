import type { AuditLogListResponse, AuditLogQuery, AuditLogSummary } from '@siyuan/shared';

export interface LoginLogSummary {
  id: string;
  username: string;
  ip: string;
  region: string;
  userAgent?: string;
  createdAt: string;
}

export type AuditQueryRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class AuditQueryClient {
  constructor(private readonly request: AuditQueryRequest) {}

  loginLogs(): Promise<LoginLogSummary[]> {
    return this.request('/auth/login-logs');
  }

  accountEvents(): Promise<AuditLogSummary[]> {
    return this.request('/auth/account-events');
  }

  auditLogs(query: AuditLogQuery = {}): Promise<AuditLogListResponse> {
    const params = new globalThis.URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim()) {
        params.set(key, String(value));
      }
    });
    const search = params.toString();
    return this.request(`/system/audit-logs${search ? `?${search}` : ''}`);
  }
}
