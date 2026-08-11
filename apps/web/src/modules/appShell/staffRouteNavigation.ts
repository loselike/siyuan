import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from 'react';
import {
  getStaffModuleHref,
  getStaffSectionHref,
  parseStaffAppRoute,
  type MenuKey,
  type StaffAppRoute
} from './config';

export type NavigateToStaffRoute = (
  menuKey: MenuKey,
  sectionKey?: string,
  mode?: 'push' | 'replace',
  reloadHref?: string
) => void;

export function useRequestedStaffRoute() {
  return useState<StaffAppRoute | null>(() => parseStaffAppRoute(globalThis.location.pathname));
}

export interface StaffRouteNavigationOptions {
  navigateWithVersionCheck(href: string, navigate: () => void): void;
  lastDataRefreshRequestAtRef: MutableRefObject<number>;
  setRequestedAppRoute: Dispatch<SetStateAction<StaffAppRoute | null>>;
  setDataRefreshVersion: Dispatch<SetStateAction<number>>;
  setNotice(message: string | null): void;
  setCustomerServiceInitialSection(section: string): void;
  setExpandedMenuKey(menuKey: MenuKey | null): void;
  refreshCurrentSession(): Promise<void>;
}

export function useNavigateToStaffRoute(options: StaffRouteNavigationOptions): NavigateToStaffRoute {
  const {
    lastDataRefreshRequestAtRef,
    navigateWithVersionCheck,
    refreshCurrentSession,
    setCustomerServiceInitialSection,
    setDataRefreshVersion,
    setExpandedMenuKey,
    setNotice,
    setRequestedAppRoute
  } = options;

  return useCallback((menuKey, sectionKey, mode = 'push', reloadHref) => {
    const href = getStaffSectionHref(menuKey, sectionKey);
    navigateWithVersionCheck(reloadHref ?? href, () => {
      const route = parseStaffAppRoute(href) ?? { menuKey, sectionKey };
      if (globalThis.location.pathname !== href) {
        globalThis.history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', href);
      }
      setRequestedAppRoute(route);
      if (Date.now() - lastDataRefreshRequestAtRef.current >= 15_000) {
        lastDataRefreshRequestAtRef.current = Date.now();
        setDataRefreshVersion((current) => current + 1);
      }
      setNotice(null);
      if (menuKey === 'customerService' && !sectionKey) {
        setCustomerServiceInitialSection('service-dashboard');
      }
      setExpandedMenuKey(menuKey);
      void refreshCurrentSession().catch(() => undefined);
    });
  }, [
    lastDataRefreshRequestAtRef,
    navigateWithVersionCheck,
    refreshCurrentSession,
    setCustomerServiceInitialSection,
    setDataRefreshVersion,
    setExpandedMenuKey,
    setNotice,
    setRequestedAppRoute
  ]);
}

export interface StaffRouteAccessFallbackOptions {
  enabled: boolean;
  requestedAppRoute: StaffAppRoute | null;
  visibleMenuKeys: readonly MenuKey[];
  setRequestedAppRoute: Dispatch<SetStateAction<StaffAppRoute | null>>;
  setNotice(message: string | null): void;
}

export function useStaffRouteAccessFallback(options: StaffRouteAccessFallbackOptions): void {
  const { enabled, requestedAppRoute, setNotice, setRequestedAppRoute, visibleMenuKeys } = options;
  useEffect(() => {
    if (!enabled) return;
    const requestedMenuKey = requestedAppRoute?.menuKey;
    const nextMenuKey = requestedMenuKey && visibleMenuKeys.includes(requestedMenuKey)
      ? requestedMenuKey
      : visibleMenuKeys[0] ?? 'workspace';
    if (requestedMenuKey && !visibleMenuKeys.includes(requestedMenuKey)) {
      const fallbackHref = getStaffModuleHref(nextMenuKey);
      if (globalThis.location.pathname !== fallbackHref) {
        globalThis.history.replaceState(null, '', fallbackHref);
      }
      setRequestedAppRoute({ menuKey: nextMenuKey });
      setNotice('当前账号无权限访问该模块，已跳转至可访问模块。');
    }
  }, [enabled, requestedAppRoute, setNotice, setRequestedAppRoute, visibleMenuKeys]);
}

export function useStaffRoutePopState(
  setRequestedAppRoute: Dispatch<SetStateAction<StaffAppRoute | null>>
): void {
  useEffect(() => {
    const handlePopState = () => {
      setRequestedAppRoute(parseStaffAppRoute(globalThis.location.pathname));
    };
    globalThis.addEventListener('popstate', handlePopState);
    return () => globalThis.removeEventListener('popstate', handlePopState);
  }, [setRequestedAppRoute]);
}
