import type { DepartmentSummary, SiteSummary } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { SystemDirectoryClient, type SystemDirectoryRequest } from './systemDirectoryClient';

describe('SystemDirectoryClient', () => {
  it('keeps the existing department and site request contracts', async () => {
    const departmentRows: DepartmentSummary[] = [{ id: 'department-market', name: '市场部', enabled: true }];
    const siteRow: SiteSummary = { id: 'site-shenzhen', sortOrder: 1, name: '深圳思远', enabled: true };
    const request = vi.fn(async (path: string) => (path.endsWith('/departments') ? departmentRows : [siteRow])) as SystemDirectoryRequest;
    const client = new SystemDirectoryClient(request);

    await expect(client.departments()).resolves.toEqual(departmentRows);
    await expect(client.sites()).resolves.toEqual([siteRow]);

    expect(request).toHaveBeenNthCalledWith(1, '/system/departments');
    expect(request).toHaveBeenNthCalledWith(2, '/system/sites');
  });

  it('keeps the existing site write paths, methods, and payloads', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'site-shenzhen' }) as SystemDirectoryRequest;
    const client = new SystemDirectoryClient(request);

    await client.createSite({ name: '深圳思远', sortOrder: 1 });
    await client.updateSite('site-shenzhen', { name: '深圳思远', sortOrder: 2 });
    await client.updateSiteEnabled('site-shenzhen', { enabled: false });

    expect(request).toHaveBeenNthCalledWith(1, '/system/sites', {
      method: 'POST',
      body: JSON.stringify({ name: '深圳思远', sortOrder: 1 })
    });
    expect(request).toHaveBeenNthCalledWith(2, '/system/sites/site-shenzhen', {
      method: 'PUT',
      body: JSON.stringify({ name: '深圳思远', sortOrder: 2 })
    });
    expect(request).toHaveBeenNthCalledWith(3, '/system/sites/site-shenzhen/enabled', {
      method: 'PUT',
      body: JSON.stringify({ enabled: false })
    });
  });
});
