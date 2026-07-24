import type { NavigationReadStateInput, NavigationUnreadBadgesResponse } from '@siyuan/shared';

export interface PageRenderErrorReportInput {
  errorId: string;
  route: string;
  releaseId?: string;
  menuKey?: string;
  sectionKey?: string;
  message: string;
  stack?: string;
  componentStack?: string;
}

export type AppShellRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class AppShellClient {
  constructor(private readonly request: AppShellRequest) {}

  navigationUnreadBadges(): Promise<NavigationUnreadBadgesResponse> {
    return this.request('/navigation/unread-badges');
  }

  markNavigationRead(input: NavigationReadStateInput): Promise<{ ok: true; moduleKey: string; sectionKey?: string; readAt: string; watermark: string }> {
    return this.request('/navigation/read-state', { method: 'POST', body: JSON.stringify(input) });
  }

  reportPageRenderError(input: PageRenderErrorReportInput): Promise<{ ok: true }> {
    return this.request('/system/client-errors', { method: 'POST', body: JSON.stringify(input) });
  }
}
