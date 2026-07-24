import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

describe('ApiClient gateway errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a module-neutral message for gateway failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><title>502 Bad Gateway</title></html>', { status: 502 })));
    const client = new ApiClient(() => null, vi.fn());

    await expect(client.shipments()).rejects.toThrow('服务暂不可用，请稍后重试');
  });
});

describe('ApiClient system directory compatibility', () => {
  it('forwards legacy methods to the domain client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const departments = vi.spyOn(client.systemDirectory, 'departments').mockResolvedValue([]);
    const sites = vi.spyOn(client.systemDirectory, 'sites').mockResolvedValue([]);
    const createSite = vi.spyOn(client.systemDirectory, 'createSite').mockResolvedValue({ id: 'site-new', sortOrder: 1, name: '新站点', enabled: true });
    const updateSite = vi.spyOn(client.systemDirectory, 'updateSite').mockResolvedValue({ id: 'site-new', sortOrder: 2, name: '新站点', enabled: true });
    const updateSiteEnabled = vi.spyOn(client.systemDirectory, 'updateSiteEnabled').mockResolvedValue({ id: 'site-new', sortOrder: 2, name: '新站点', enabled: false });

    await client.departments();
    await client.sites();
    await client.createSite({ name: '新站点', sortOrder: 1 });
    await client.updateSite('site-new', { name: '新站点', sortOrder: 2 });
    await client.updateSiteEnabled('site-new', { enabled: false });

    expect(departments).toHaveBeenCalledOnce();
    expect(sites).toHaveBeenCalledOnce();
    expect(createSite).toHaveBeenCalledWith({ name: '新站点', sortOrder: 1 });
    expect(updateSite).toHaveBeenCalledWith('site-new', { name: '新站点', sortOrder: 2 });
    expect(updateSiteEnabled).toHaveBeenCalledWith('site-new', { enabled: false });
  });
});
