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
  register: (state: Omit<SidebarSubNavState, 'parentKey' | 'signature'>) => void;
  clear: (parentKey: string) => void;
}

export const ModuleSubNavContext = createContext<ModuleSubNavContextValue | null>(null);

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
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];
  const itemsSignature = useMemo(() => getModuleSubNavSignature(items), [items]);
  const onChangeRef = useRef(onChange);
  const registrationRef = useRef<{
    parentKey: string;
    register: ModuleSubNavContextValue['register'];
    activeKey: string;
    itemsSignature: string;
  } | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleSidebarChange = useCallback((key: string) => {
    onChangeRef.current(key);
  }, []);

  useEffect(() => {
    if (!sidebarNav || !activeItem) {
      return;
    }

    const previous = registrationRef.current;
    if (
      previous?.parentKey === sidebarNav.parentKey &&
      previous.register === sidebarNav.register &&
      previous.activeKey === activeItem.key &&
      previous.itemsSignature === itemsSignature
    ) {
      return;
    }

    registrationRef.current = {
      parentKey: sidebarNav.parentKey,
      register: sidebarNav.register,
      activeKey: activeItem.key,
      itemsSignature
    };
    sidebarNav.register({ items, activeKey: activeItem.key, onChange: handleSidebarChange });
  }, [activeItem?.key, handleSidebarChange, items, itemsSignature, sidebarNav]);

  if (!activeItem) {
    return <>{children}</>;
  }

  return (
    <div className="module-sub-workspace">
      <section className="module-sub-content" aria-label={activeItem.label}>
        {children}
      </section>
    </div>
  );
}

export function getModuleSubNavSignature(items: ModuleSubNavItem[]) {
  return items.map((item) => `${item.key}:${item.label}:${item.description ?? ''}`).join('|');
}
