import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationNavigation } from './useNotificationNavigation';

describe('useNotificationNavigation', () => {
  beforeEach(() => {
    globalThis.history.replaceState(null, '', '/app/workspace');
  });

  it('preserves initial target parsing and removes only a matching consumed target', () => {
    globalThis.history.replaceState(
      null,
      '',
      '/app/business/order-management?notificationEntityType=SHIPMENT&notificationEntityId=s-1&source=notice'
    );
    const { result } = renderHook(() => useNotificationNavigation({
      visibleMenuKeys: ['business'],
      navigateToAppRoute: vi.fn(),
      warn: vi.fn()
    }));

    expect(result.current.pendingNotificationTarget).toEqual({ type: 'SHIPMENT', id: 's-1' });

    act(() => result.current.consumePendingNotificationTarget({ type: 'SHIPMENT', id: 'other' }));
    expect(result.current.pendingNotificationTarget).toEqual({ type: 'SHIPMENT', id: 's-1' });
    expect(globalThis.location.search).toContain('notificationEntityId=s-1');

    act(() => result.current.consumePendingNotificationTarget({ type: 'SHIPMENT', id: 's-1' }));
    const currentUrl = new globalThis.URL(globalThis.location.href);
    expect(result.current.pendingNotificationTarget).toBeNull();
    expect(currentUrl.searchParams.get('notificationEntityType')).toBeNull();
    expect(currentUrl.searchParams.get('notificationEntityId')).toBeNull();
    expect(currentUrl.searchParams.get('source')).toBe('notice');
  });

  it('preserves valid notification navigation arguments, URL, and pending target', () => {
    const navigateToAppRoute = vi.fn();
    const { result } = renderHook(() => useNotificationNavigation({
      visibleMenuKeys: ['business'],
      navigateToAppRoute,
      warn: vi.fn()
    }));
    const target = '/app/business/order-management?notificationEntityType=SHIPMENT&notificationEntityId=s-2';

    act(() => result.current.handleNotificationNavigate(target));

    expect(navigateToAppRoute).toHaveBeenCalledWith(
      'business',
      'order-management',
      'push',
      target
    );
    expect(`${globalThis.location.pathname}${globalThis.location.search}`).toBe(target);
    expect(result.current.pendingNotificationTarget).toEqual({ type: 'SHIPMENT', id: 's-2' });
  });

  it('preserves cross-origin and invisible-module rejection messages without navigating', () => {
    const navigateToAppRoute = vi.fn();
    const warn = vi.fn();
    const { result } = renderHook(() => useNotificationNavigation({
      visibleMenuKeys: ['business'],
      navigateToAppRoute,
      warn
    }));

    act(() => result.current.handleNotificationNavigate('https://invalid.example/app/business/order-management'));
    act(() => result.current.handleNotificationNavigate('/app/finance/receivables'));

    expect(warn.mock.calls).toEqual([
      ['通知跳转地址无效'],
      ['当前账号没有该业务页面的访问权限']
    ]);
    expect(navigateToAppRoute).not.toHaveBeenCalled();
    expect(result.current.pendingNotificationTarget).toBeNull();
  });
});
