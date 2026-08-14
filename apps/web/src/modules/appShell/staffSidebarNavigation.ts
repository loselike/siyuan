import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type MouseEvent,
  type SetStateAction
} from 'react';
import {
  getModuleSubNavSignature,
  type ModuleSubNavContextValue,
  type SidebarSubNavState
} from '../shared/ModuleSubWorkspace';
import { resolveStaffSectionKey, type MenuKey } from './config';
import { resolveExpandedMenuAfterPrimaryClick } from './sidebarMenuState';
import type { NavigateToStaffRoute } from './staffRouteNavigation';

export interface StaffSidebarNavigationState {
  expandedMenuKey: MenuKey | null;
  setExpandedMenuKey: Dispatch<SetStateAction<MenuKey | null>>;
  sidebarSubNav: SidebarSubNavState | null;
  setSidebarSubNav: Dispatch<SetStateAction<SidebarSubNavState | null>>;
}

export function useStaffSidebarNavigationState(): StaffSidebarNavigationState {
  const [expandedMenuKey, setExpandedMenuKey] = useState<MenuKey | null>('workspace');
  const [sidebarSubNav, setSidebarSubNav] = useState<SidebarSubNavState | null>(null);
  return { expandedMenuKey, setExpandedMenuKey, sidebarSubNav, setSidebarSubNav };
}

export function resolveStaffSidebarActiveSection(input: {
  currentMenuKey: MenuKey;
  requestedSectionKey?: string;
  sidebarSubNav: SidebarSubNavState | null;
}): string | undefined {
  const { currentMenuKey, requestedSectionKey, sidebarSubNav } = input;
  if (sidebarSubNav?.parentKey !== currentMenuKey) return undefined;
  return resolveStaffSectionKey(
    currentMenuKey,
    requestedSectionKey,
    sidebarSubNav.items.map((item) => item.key)
  ) ?? sidebarSubNav.activeKey;
}

export interface StaffSidebarNavigationOptions extends StaffSidebarNavigationState {
  currentMenuKey: MenuKey;
  requestedSectionKey?: string;
  navigateToAppRoute: NavigateToStaffRoute;
}

export function useStaffSidebarNavigation(options: StaffSidebarNavigationOptions) {
  const {
    currentMenuKey,
    expandedMenuKey,
    navigateToAppRoute,
    requestedSectionKey,
    setExpandedMenuKey,
    setSidebarSubNav,
    sidebarSubNav
  } = options;

  const registerSidebarSubNav = useCallback(
    (state: Omit<SidebarSubNavState, 'parentKey' | 'signature'>) => {
      const signature = getModuleSubNavSignature(state.items);
      setSidebarSubNav((current) => {
        if (
          current?.parentKey === currentMenuKey
          && current.activeKey === state.activeKey
          && current.signature === signature
          && current.onChange === state.onChange
        ) {
          return current;
        }

        return {
          parentKey: currentMenuKey,
          items: state.items,
          activeKey: state.activeKey,
          onChange: state.onChange,
          signature
        };
      });
    },
    [currentMenuKey, setSidebarSubNav]
  );

  const clearSidebarSubNav = useCallback((parentKey: string) => {
    setSidebarSubNav((current) => (current?.parentKey === parentKey ? null : current));
  }, [setSidebarSubNav]);

  const sidebarSubNavContextValue = useMemo<ModuleSubNavContextValue>(
    () => ({
      parentKey: currentMenuKey,
      routeKey: `${currentMenuKey}:${requestedSectionKey ?? ''}`,
      requestedSectionKey,
      resolveSectionKey: (sectionKeys) => resolveStaffSectionKey(currentMenuKey, requestedSectionKey, sectionKeys),
      navigateToSection: (sectionKey, mode) => navigateToAppRoute(currentMenuKey, sectionKey, mode),
      register: registerSidebarSubNav,
      clear: clearSidebarSubNav
    }),
    [clearSidebarSubNav, currentMenuKey, navigateToAppRoute, registerSidebarSubNav, requestedSectionKey]
  );

  const handlePrimaryMenuClick = useCallback((event: MouseEvent<globalThis.HTMLAnchorElement>, key: MenuKey) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const clickResult = resolveExpandedMenuAfterPrimaryClick({
      clickedKey: key,
      currentKey: currentMenuKey,
      expandedKey: expandedMenuKey,
      hasSubNav: sidebarSubNav?.parentKey === key && sidebarSubNav.items.length > 0
    });
    setExpandedMenuKey(clickResult.expandedKey);
    if (!clickResult.shouldNavigate) return;
    navigateToAppRoute(key);
  }, [currentMenuKey, expandedMenuKey, navigateToAppRoute, setExpandedMenuKey, sidebarSubNav]);

  const handleSecondaryMenuClick = useCallback((
    event: MouseEvent<globalThis.HTMLAnchorElement>,
    menuKey: MenuKey,
    sectionKey: string
  ) => {
    if (!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
      event.preventDefault();
      navigateToAppRoute(menuKey, sectionKey);
    }
    setExpandedMenuKey(menuKey);
  }, [navigateToAppRoute, setExpandedMenuKey]);

  const handleBrandClick = useCallback(() => {
    navigateToAppRoute('workspace', 'shipmentPool');
  }, [navigateToAppRoute]);

  return {
    handleBrandClick,
    handlePrimaryMenuClick,
    handleSecondaryMenuClick,
    sidebarSubNavContextValue
  };
}
