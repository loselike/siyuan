import { act, renderHook } from '@testing-library/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MenuKey } from './config';
import {
  resolveStaffSidebarActiveSection,
  useStaffSidebarNavigation,
  useStaffSidebarNavigationState
} from './staffSidebarNavigation';

function menuClickEvent(modifiers: Partial<Pick<ReactMouseEvent<globalThis.HTMLAnchorElement>, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
    ...modifiers
  } as unknown as ReactMouseEvent<globalThis.HTMLAnchorElement>;
}

function renderSidebarNavigation(currentMenuKey: MenuKey = 'pricing', requestedSectionKey = 'price-books') {
  const navigateToAppRoute = vi.fn();
  const onChange = vi.fn();
  const hook = renderHook(() => {
    const state = useStaffSidebarNavigationState();
    const navigation = useStaffSidebarNavigation({
      ...state,
      currentMenuKey,
      requestedSectionKey,
      navigateToAppRoute
    });
    return { navigation, state };
  });
  return { ...hook, navigateToAppRoute, onChange };
}

describe('staffSidebarNavigation', () => {
  it('preserves sub-nav registration, alias resolution, context navigation, and owner clear semantics', () => {
    const { navigateToAppRoute, onChange, result } = renderSidebarNavigation();
    const items = [
      { key: 'quote', label: '查价' },
      { key: 'priceBooks', label: '价格表管理' }
    ];

    act(() => result.current.navigation.sidebarSubNavContextValue.register({ items, activeKey: 'quote', onChange }));
    expect(result.current.state.sidebarSubNav).toMatchObject({
      parentKey: 'pricing',
      activeKey: 'quote',
      signature: 'quote:查价:|priceBooks:价格表管理:'
    });
    expect(resolveStaffSidebarActiveSection({
      currentMenuKey: 'pricing',
      requestedSectionKey: 'price-books',
      sidebarSubNav: result.current.state.sidebarSubNav
    })).toBe('priceBooks');
    expect(result.current.navigation.sidebarSubNavContextValue.resolveSectionKey(items.map((item) => item.key))).toBe('priceBooks');

    act(() => result.current.navigation.sidebarSubNavContextValue.navigateToSection('priceBooks', 'replace'));
    expect(navigateToAppRoute).toHaveBeenCalledWith('pricing', 'priceBooks', 'replace');

    act(() => result.current.navigation.sidebarSubNavContextValue.clear('finance'));
    expect(result.current.state.sidebarSubNav?.parentKey).toBe('pricing');
    act(() => result.current.navigation.sidebarSubNavContextValue.clear('pricing'));
    expect(result.current.state.sidebarSubNav).toBeNull();
  });

  it('preserves active-directory expand toggling without navigating', () => {
    const { navigateToAppRoute, onChange, result } = renderSidebarNavigation();
    act(() => result.current.navigation.sidebarSubNavContextValue.register({
      items: [{ key: 'quote', label: '查价' }],
      activeKey: 'quote',
      onChange
    }));

    const firstClick = menuClickEvent();
    act(() => result.current.navigation.handlePrimaryMenuClick(firstClick, 'pricing'));
    expect(firstClick.preventDefault).toHaveBeenCalledOnce();
    expect(result.current.state.expandedMenuKey).toBe('pricing');
    expect(navigateToAppRoute).not.toHaveBeenCalled();

    act(() => result.current.navigation.handlePrimaryMenuClick(menuClickEvent(), 'pricing'));
    expect(result.current.state.expandedMenuKey).toBeNull();
    expect(navigateToAppRoute).not.toHaveBeenCalled();
  });

  it('preserves normal, modifier, secondary, and brand click behavior', () => {
    const { navigateToAppRoute, result } = renderSidebarNavigation('workspace', 'shipmentPool');
    const normalPrimary = menuClickEvent();
    act(() => result.current.navigation.handlePrimaryMenuClick(normalPrimary, 'pricing'));
    expect(normalPrimary.preventDefault).toHaveBeenCalledOnce();
    expect(navigateToAppRoute).toHaveBeenLastCalledWith('pricing');

    navigateToAppRoute.mockClear();
    const modifierPrimary = menuClickEvent({ metaKey: true });
    act(() => result.current.navigation.handlePrimaryMenuClick(modifierPrimary, 'finance'));
    expect(modifierPrimary.preventDefault).not.toHaveBeenCalled();
    expect(navigateToAppRoute).not.toHaveBeenCalled();

    const normalSecondary = menuClickEvent();
    act(() => result.current.navigation.handleSecondaryMenuClick(normalSecondary, 'pricing', 'priceBooks'));
    expect(normalSecondary.preventDefault).toHaveBeenCalledOnce();
    expect(navigateToAppRoute).toHaveBeenLastCalledWith('pricing', 'priceBooks');
    expect(result.current.state.expandedMenuKey).toBe('pricing');

    navigateToAppRoute.mockClear();
    act(() => result.current.state.setExpandedMenuKey('workspace'));
    const modifierSecondary = menuClickEvent({ ctrlKey: true });
    act(() => result.current.navigation.handleSecondaryMenuClick(modifierSecondary, 'pricing', 'priceBooks'));
    expect(modifierSecondary.preventDefault).not.toHaveBeenCalled();
    expect(navigateToAppRoute).not.toHaveBeenCalled();
    expect(result.current.state.expandedMenuKey).toBe('pricing');

    act(() => result.current.navigation.handleBrandClick());
    expect(navigateToAppRoute).toHaveBeenCalledWith('workspace', 'shipmentPool');
  });
});
