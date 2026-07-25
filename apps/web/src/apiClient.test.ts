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

describe('ApiClient app shell compatibility', () => {
  it('forwards legacy methods to the app shell client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const badges = vi.spyOn(client.appShell, 'navigationUnreadBadges').mockResolvedValue({ items: [] });
    const markRead = vi.spyOn(client.appShell, 'markNavigationRead').mockResolvedValue({
      ok: true,
      moduleKey: 'warehouse',
      sectionKey: 'today-receipts',
      readAt: '2026-07-24T10:00:00.000Z',
      watermark: '2026-07-24T10:00:00.000Z'
    });
    const reportError = vi.spyOn(client.appShell, 'reportPageRenderError').mockResolvedValue({ ok: true });
    const readInput = { moduleKey: 'warehouse', sectionKey: 'today-receipts' };
    const errorInput = {
      errorId: 'render-error-1',
      route: '/app/warehouse/today-receipts',
      releaseId: 'release-1',
      message: 'render failed'
    };

    await client.navigationUnreadBadges();
    await client.markNavigationRead(readInput);
    await client.reportPageRenderError(errorInput);

    expect(badges).toHaveBeenCalledOnce();
    expect(markRead).toHaveBeenCalledWith(readInput);
    expect(reportError).toHaveBeenCalledWith(errorInput);
  });
});

describe('ApiClient audit query compatibility', () => {
  it('forwards legacy read methods to the audit query client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const loginLogs = vi.spyOn(client.auditQuery, 'loginLogs').mockResolvedValue([]);
    const accountEvents = vi.spyOn(client.auditQuery, 'accountEvents').mockResolvedValue([]);
    const response = {
      rows: [],
      suspiciousDeleteWarnings: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0 }
    };
    const auditLogs = vi.spyOn(client.auditQuery, 'auditLogs').mockResolvedValue(response);
    const query = { module: 'system', page: 1, pageSize: 20 };

    await client.loginLogs();
    await client.accountEvents();
    await client.auditLogs(query);

    expect(loginLogs).toHaveBeenCalledOnce();
    expect(accountEvents).toHaveBeenCalledOnce();
    expect(auditLogs).toHaveBeenCalledWith(query);
  });
});

describe('ApiClient warehouse query compatibility', () => {
  it('forwards legacy read methods to the warehouse query client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const packages = vi.spyOn(client.warehouseQuery, 'warehousePackages').mockResolvedValue([]);
    const response = {
      totals: {
        receiptTickets: 0,
        totalPackages: 0,
        totalWeightKg: 0,
        totalCbm: 0,
        waitingDispatchTickets: 0,
        pendingTallyTickets: 0,
        exceptionTickets: 0
      },
      rows: []
    };
    const todayReceipts = vi.spyOn(client.warehouseQuery, 'warehouseTodayReceipts').mockResolvedValue(response);
    const inStock = vi.spyOn(client.warehouseQuery, 'warehouseInStock').mockResolvedValue(response);
    const todayQuery = { datePreset: 'TODAY' as const, site: '上海仓' };
    const inStockQuery = { status: 'TALLIED_ARCHIVED' as const, operationKeyword: 'alice' };

    await client.warehousePackages();
    await client.warehouseTodayReceipts(todayQuery);
    await client.warehouseInStock(inStockQuery);

    expect(packages).toHaveBeenCalledOnce();
    expect(todayReceipts).toHaveBeenCalledWith(todayQuery);
    expect(inStock).toHaveBeenCalledWith(inStockQuery);
  });
});
