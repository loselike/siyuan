import { useMemo, type MouseEvent, type ReactNode } from 'react';
import { Card, Flex, Layout, Space, Typography } from 'antd';
import { Bot, ChevronDown, ChevronRight } from 'lucide-react';
import type { SidebarSubNavState } from '../shared/ModuleSubWorkspace';
import { getStaffModuleHref, getStaffSectionHref, type MenuKey } from './config';

const { Sider } = Layout;
const { Text } = Typography;

interface StaffSidebarMenuItem {
  key: MenuKey;
  icon: ReactNode;
  label: string;
}

interface StaffNavigationUnreadBadge {
  moduleKey: string;
  sectionKey?: string;
  unreadCount: number;
}

export interface StaffSidebarProps {
  activeSectionKey?: string;
  currentMenuKey: MenuKey;
  expandedMenuKey: MenuKey | null;
  items: readonly StaffSidebarMenuItem[];
  navigationUnreadBadges: readonly StaffNavigationUnreadBadge[];
  sidebarSubNav: SidebarSubNavState | null;
  onBrandClick(): void;
  onPrimaryMenuClick(event: MouseEvent<globalThis.HTMLAnchorElement>, key: MenuKey): void;
  onSecondaryMenuClick(
    event: MouseEvent<globalThis.HTMLAnchorElement>,
    menuKey: MenuKey,
    sectionKey: string
  ): void;
}

function formatNavigationUnreadCount(count: number) {
  return count > 999 ? '999+' : String(count);
}

export function StaffSidebar({
  activeSectionKey,
  currentMenuKey,
  expandedMenuKey,
  items,
  navigationUnreadBadges,
  onBrandClick,
  onPrimaryMenuClick,
  onSecondaryMenuClick,
  sidebarSubNav
}: StaffSidebarProps) {
  const navigationUnreadByKey = useMemo(
    () => new Map(navigationUnreadBadges.map((item) => [`${item.moduleKey}:${item.sectionKey ?? ''}`, item.unreadCount])),
    [navigationUnreadBadges]
  );

  return (
    <Sider className="sidebar" width={196}>
      <button type="button" className="brand" aria-label="返回运营工作台" onClick={onBrandClick}>
        <div className="brand-mark brand-logo-mark">
          <img src="/green-cargo-logo.png" alt="Green Cargo 思远物流标识" width={66} height={36} />
        </div>
        <div>
          <Text className="brand-title">思远物流</Text>
          <Text className="brand-subtitle">AI TMS / OMS</Text>
        </div>
      </button>
      <nav className="side-nav" role="menu" aria-label="员工端主导航">
        {items.map((item) => {
          const isActive = currentMenuKey === item.key;
          const subNav = sidebarSubNav?.parentKey === item.key ? sidebarSubNav : null;
          const hasSubNav = Boolean(subNav?.items.length);
          const isExpanded = isActive && expandedMenuKey === item.key && hasSubNav;
          const moduleUnreadCount = navigationUnreadByKey.get(`${item.key}:`) ?? 0;

          return (
            <div className="side-nav-group" key={item.key}>
              <a
                href={getStaffModuleHref(item.key)}
                role="menuitem"
                className={`side-nav-item${isActive ? ' is-active' : ''}`}
                aria-label={item.label}
                aria-expanded={hasSubNav ? isExpanded : undefined}
                onClick={(event) => onPrimaryMenuClick(event, item.key)}
              >
                <span className="side-nav-icon">{item.icon}</span>
                <span className="side-nav-label">{item.label}</span>
                <span className="side-nav-meta" aria-hidden="true">
                  {moduleUnreadCount > 0 && !isExpanded ? (
                    <span className="side-nav-unread-dot" title={`${formatNavigationUnreadCount(moduleUnreadCount)} 条未读变化`} />
                  ) : null}
                  {hasSubNav ? (
                    <span className="side-nav-chevron">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  ) : null}
                </span>
              </a>
              {isExpanded && subNav ? (
                <div className="side-sub-nav" role="group" aria-label={`${item.label}二级功能`}>
                  {subNav.items.map((subItem) => {
                    const unreadCount = navigationUnreadByKey.get(`${item.key}:${subItem.key}`) ?? 0;
                    return (
                      <a
                        href={getStaffSectionHref(item.key, subItem.key)}
                        key={subItem.key}
                        role="button"
                        className={`side-sub-nav-item${subItem.key === activeSectionKey ? ' is-active' : ''}`}
                        aria-current={subItem.key === activeSectionKey ? 'page' : undefined}
                        onClick={(event) => onSecondaryMenuClick(event, item.key, subItem.key)}
                      >
                        <span className="side-sub-nav-label">{subItem.label}</span>
                        {unreadCount > 0 ? (
                          <span
                            className="side-sub-nav-unread-count"
                            aria-hidden="true"
                            title={`${formatNavigationUnreadCount(unreadCount)} 条未读变化`}
                          >
                            {formatNavigationUnreadCount(unreadCount)}
                          </span>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <Card className="sidebar-card" size="small">
        <Space direction="vertical" size={8}>
          <Flex align="center" gap={8}>
            <Bot size={16} />
            <Text strong>AI 助手在线</Text>
          </Flex>
        </Space>
      </Card>
    </Sider>
  );
}
