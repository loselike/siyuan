import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MenuKey, StaffAppRoute } from './config';
import {
  useNavigateToStaffRoute,
  useRequestedStaffRoute,
  useStaffRouteAccessFallback,
  useStaffRoutePopState
} from './staffRouteNavigation';

describe('staffRouteNavigation', () => {
  beforeEach(() => {
    globalThis.history.replaceState(null, '', '/app/workspace/shipment-pool');
  });

  it('preserves canonical history, version-check target, refresh timing, and navigation side effects', () => {
    const navigateWithVersionCheck = vi.fn((_href: string, navigate: () => void) => navigate());
    const refreshCurrentSession = vi.fn().mockResolvedValue(undefined);
    const now = vi.spyOn(Date, 'now').mockReturnValue(20_000);
    const { result } = renderHook(() => {
      const [requestedAppRoute, setRequestedAppRoute] = useRequestedStaffRoute();
      const [dataRefreshVersion, setDataRefreshVersion] = useState(0);
      const [notice, setNotice] = useState<string | null>('existing');
      const [customerSection, setCustomerServiceInitialSection] = useState('other');
      const [expandedMenuKey, setExpandedMenuKey] = useState<MenuKey | null>('workspace');
      const lastDataRefreshRequestAtRef = useRef(0);
      const navigateToAppRoute = useNavigateToStaffRoute({
        navigateWithVersionCheck,
        lastDataRefreshRequestAtRef,
        setRequestedAppRoute,
        setDataRefreshVersion,
        setNotice,
        setCustomerServiceInitialSection,
        setExpandedMenuKey,
        refreshCurrentSession
      });
      return {
        customerSection,
        dataRefreshVersion,
        expandedMenuKey,
        navigateToAppRoute,
        notice,
        requestedAppRoute
      };
    });

    act(() => result.current.navigateToAppRoute('customerService', undefined, 'replace', '/reload-target?source=notice'));

    expect(navigateWithVersionCheck).toHaveBeenCalledWith('/reload-target?source=notice', expect.any(Function));
    expect(globalThis.location.pathname).toBe('/app/customer-service');
    expect(result.current.requestedAppRoute).toEqual({ menuKey: 'customerService', sectionKey: undefined });
    expect(result.current.dataRefreshVersion).toBe(1);
    expect(result.current.notice).toBeNull();
    expect(result.current.customerSection).toBe('service-dashboard');
    expect(result.current.expandedMenuKey).toBe('customerService');
    expect(refreshCurrentSession).toHaveBeenCalledOnce();
    now.mockRestore();
  });

  it('preserves replace fallback state and notice for an invisible requested module', async () => {
    globalThis.history.replaceState(null, '', '/app/finance/pending-payment');
    const { result } = renderHook(() => {
      const [requestedAppRoute, setRequestedAppRoute] = useState<StaffAppRoute | null>({
        menuKey: 'finance',
        sectionKey: 'pending-payment'
      });
      const [notice, setNotice] = useState<string | null>(null);
      useStaffRouteAccessFallback({
        enabled: true,
        requestedAppRoute,
        visibleMenuKeys: ['customerService'],
        setRequestedAppRoute,
        setNotice
      });
      return { notice, requestedAppRoute };
    });

    await waitFor(() => expect(result.current.requestedAppRoute).toEqual({ menuKey: 'customerService' }));
    expect(globalThis.location.pathname).toBe('/app/customer-service');
    expect(result.current.notice).toBe('当前账号无权限访问该模块，已跳转至可访问模块。');
  });

  it('preserves popstate parsing without rewriting the browser URL', async () => {
    const { result } = renderHook(() => {
      const [requestedAppRoute, setRequestedAppRoute] = useRequestedStaffRoute();
      useStaffRoutePopState(setRequestedAppRoute);
      return requestedAppRoute;
    });

    globalThis.history.replaceState(null, '', '/app/pricing/quote');
    act(() => globalThis.dispatchEvent(new globalThis.PopStateEvent('popstate')));

    await waitFor(() => expect(result.current).toEqual({ menuKey: 'pricing', sectionKey: 'quote' }));
    expect(globalThis.location.pathname).toBe('/app/pricing/quote');
  });
});
