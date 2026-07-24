import type {
  DepartmentSummary,
  EnabledUpdateInput,
  SiteCreateInput,
  SiteSummary,
  SiteUpdateInput
} from '@siyuan/shared';

export type SystemDirectoryRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class SystemDirectoryClient {
  constructor(private readonly request: SystemDirectoryRequest) {}

  departments(): Promise<DepartmentSummary[]> {
    return this.request('/system/departments');
  }

  sites(): Promise<SiteSummary[]> {
    return this.request('/system/sites');
  }

  createSite(input: SiteCreateInput): Promise<SiteSummary> {
    return this.request('/system/sites', { method: 'POST', body: JSON.stringify(input) });
  }

  updateSite(id: string, input: SiteUpdateInput): Promise<SiteSummary> {
    return this.request(`/system/sites/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  }

  updateSiteEnabled(id: string, input: EnabledUpdateInput): Promise<SiteSummary> {
    return this.request(`/system/sites/${id}/enabled`, { method: 'PUT', body: JSON.stringify(input) });
  }
}
