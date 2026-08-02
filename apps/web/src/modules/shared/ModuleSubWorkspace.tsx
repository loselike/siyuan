import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

export interface ModuleSubNavItem {
  key: string;
  label: string;
  description?: string;
}

export interface SidebarSubNavState {
  parentKey: string;
  items: ModuleSubNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  signature: string;
}

export interface ModuleSubNavContextValue {
  parentKey: string;
  routeKey: string;
  requestedSectionKey?: string;
  resolveSectionKey: (sectionKeys: string[]) => string | undefined;
  navigateToSection: (sectionKey: string, mode?: 'push' | 'replace') => void;
  register: (state: Omit<SidebarSubNavState, 'parentKey' | 'signature'>) => void;
  clear: (parentKey: string) => void;
}

export const ModuleSubNavContext = createContext<ModuleSubNavContextValue | null>(null);
const ModuleSubWorkspaceDepthContext = createContext(0);

export function ModuleSubWorkspace({
  items,
  activeKey,
  onChange,
  children
}: {
  items: ModuleSubNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  children: ReactNode;
}) {
  const sidebarNav = useContext(ModuleSubNavContext);
  const workspaceDepth = useContext(ModuleSubWorkspaceDepthContext);
  const sidebarOwner = workspaceDepth === 0 ? sidebarNav : null;
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];
  const itemsSignature = useMemo(() => getModuleSubNavSignature(items), [items]);
  const itemKeys = useMemo(() => items.map((item) => item.key), [items]);
  const requestedActiveKey = sidebarOwner?.resolveSectionKey(itemKeys);
  const onChangeRef = useRef(onChange);
  const previousActiveKeyRef = useRef(activeItem?.key);
  const previousRouteKeyRef = useRef<string | undefined>(undefined);
  const pendingRouteTargetRef = useRef<string | undefined>(undefined);
  const registrationRef = useRef<{
    parentKey: string;
    register: ModuleSubNavContextValue['register'];
    activeKey: string;
    itemsSignature: string;
  } | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!sidebarOwner || !activeItem) return;

    const routeChanged = previousRouteKeyRef.current !== sidebarOwner.routeKey;
    const activeChanged = previousActiveKeyRef.current !== activeItem.key;
    previousRouteKeyRef.current = sidebarOwner.routeKey;
    previousActiveKeyRef.current = activeItem.key;

    if (routeChanged) {
      if (requestedActiveKey && requestedActiveKey !== activeItem.key) {
        pendingRouteTargetRef.current = requestedActiveKey;
        onChangeRef.current(requestedActiveKey);
        return;
      }

      pendingRouteTargetRef.current = undefined;
      if (sidebarOwner.requestedSectionKey && !requestedActiveKey) {
        sidebarOwner.navigateToSection(activeItem.key, 'replace');
      }
      return;
    }

    const pendingRouteTarget = pendingRouteTargetRef.current;
    if (pendingRouteTarget) {
      if (activeItem.key === pendingRouteTarget) {
        pendingRouteTargetRef.current = undefined;
      } else {
        onChangeRef.current(pendingRouteTarget);
      }
      return;
    }

    if (activeChanged && requestedActiveKey !== activeItem.key) {
      sidebarOwner.navigateToSection(activeItem.key);
    }
  }, [activeItem?.key, requestedActiveKey, sidebarOwner]);

  const handleSidebarChange = useCallback((key: string) => {
    onChangeRef.current(key);
  }, []);

  useEffect(() => {
    if (!sidebarOwner || !activeItem) {
      return;
    }

    const previous = registrationRef.current;
    if (
      previous?.parentKey === sidebarOwner.parentKey &&
      previous.register === sidebarOwner.register &&
      previous.activeKey === activeItem.key &&
      previous.itemsSignature === itemsSignature
    ) {
      return;
    }

    registrationRef.current = {
      parentKey: sidebarOwner.parentKey,
      register: sidebarOwner.register,
      activeKey: activeItem.key,
      itemsSignature
    };
    sidebarOwner.register({ items, activeKey: activeItem.key, onChange: handleSidebarChange });
  }, [activeItem?.key, handleSidebarChange, items, itemsSignature, sidebarOwner]);

  if (!activeItem) {
    return (
      <ModuleSubWorkspaceDepthContext.Provider value={workspaceDepth + 1}>
        {children}
      </ModuleSubWorkspaceDepthContext.Provider>
    );
  }

  return (
    <ModuleSubWorkspaceDepthContext.Provider value={workspaceDepth + 1}>
      <div className="module-sub-workspace">
        <section className="module-sub-content" aria-label={activeItem.label}>
          {children}
        </section>
      </div>
    </ModuleSubWorkspaceDepthContext.Provider>
  );
}

export function getModuleSubNavSignature(items: ModuleSubNavItem[]) {
  return items.map((item) => `${item.key}:${item.label}:${item.description ?? ''}`).join('|');
}
