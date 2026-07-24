import type { NavigationUnreadBadgesResponse } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { AppShellClient, type AppShellRequest } from './appShellClient';

describe('AppShellClient', () => {
  it('keeps the navigation badge read contract unchanged', async () => {
    const response: NavigationUnreadBadgesResponse = { items: [] };
    const request = vi.fn().mockResolvedValue(response) as AppShellRequest;
    const client = new AppShellClient(request);

    await expect(client.navigationUnreadBadges()).resolves.toBe(response);
    expect(request).toHaveBeenCalledWith('/navigation/unread-badges');
  });

  it('keeps navigation read-state and render-error request contracts unchanged', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true }) as AppShellRequest;
    const client = new AppShellClient(request);
    const readInput = { moduleKey: 'warehouse', sectionKey: 'today-receipts' };
    const errorInput = {
      errorId: 'render-error-1',
      route: '/app/warehouse/today-receipts',
      releaseId: 'release-1',
      menuKey: 'warehouse',
      sectionKey: 'today-receipts',
      message: 'render failed',
      stack: 'stack',
      componentStack: 'component stack'
    };

    await client.markNavigationRead(readInput);
    await client.reportPageRenderError(errorInput);

    expect(request).toHaveBeenNthCalledWith(1, '/navigation/read-state', {
      method: 'POST',
      body: JSON.stringify(readInput)
    });
    expect(request).toHaveBeenNthCalledWith(2, '/system/client-errors', {
      method: 'POST',
      body: JSON.stringify(errorInput)
    });
  });

  it('passes request errors through without changing their message', async () => {
    const request = vi.fn().mockRejectedValue(new Error('当前账号无权限访问')) as AppShellRequest;
    const client = new AppShellClient(request);

    await expect(client.navigationUnreadBadges()).rejects.toThrow('当前账号无权限访问');
  });
});
