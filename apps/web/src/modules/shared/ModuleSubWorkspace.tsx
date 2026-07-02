import type { ReactNode } from 'react';
import { createContext, useContext, useEffect } from 'react';

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

  useEffect(() => {
    if (!sidebarNav || !activeItem) {
      return;
    }

    sidebarNav.register({ items, activeKey: activeItem.key, onChange });
  }, [activeItem, activeKey, items, onChange, sidebarNav]);

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
