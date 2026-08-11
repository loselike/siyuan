import { useCallback, useState } from 'react';
import { parseStaffAppRoute, type MenuKey } from './config';

export interface NotificationNavigationTarget {
  type: string;
  id: string;
}

export interface NotificationNavigationOptions {
  visibleMenuKeys: readonly MenuKey[];
  navigateToAppRoute(
    menuKey: MenuKey,
    sectionKey?: string,
    mode?: 'push' | 'replace',
    reloadHref?: string
  ): void;
  warn(message: string): void;
}

function readTarget(search: string): NotificationNavigationTarget | null {
  const params = new globalThis.URLSearchParams(search);
  const type = params.get('notificationEntityType');
  const id = params.get('notificationEntityId');
  return type && id ? { type, id } : null;
}

export function useNotificationNavigation(options: NotificationNavigationOptions) {
  const { navigateToAppRoute, visibleMenuKeys, warn } = options;
  const [pendingNotificationTarget, setPendingNotificationTarget] = useState<NotificationNavigationTarget | null>(
    () => readTarget(globalThis.location.search)
  );

  const handleNotificationNavigate = useCallback((targetPath: string) => {
    const targetUrl = new globalThis.URL(targetPath, globalThis.location.origin);
    if (targetUrl.origin !== globalThis.location.origin) {
      warn('通知跳转地址无效');
      return;
    }
    const targetRoute = parseStaffAppRoute(targetUrl.pathname);
    if (!targetRoute || !visibleMenuKeys.includes(targetRoute.menuKey)) {
      warn('当前账号没有该业务页面的访问权限');
      return;
    }
    navigateToAppRoute(targetRoute.menuKey, targetRoute.sectionKey, 'push', `${targetUrl.pathname}${targetUrl.search}`);
    if (targetUrl.search) {
      globalThis.history.replaceState(null, '', `${targetUrl.pathname}${targetUrl.search}`);
    }
    setPendingNotificationTarget(readTarget(targetUrl.search));
  }, [navigateToAppRoute, visibleMenuKeys, warn]);

  const consumePendingNotificationTarget = useCallback((target: NotificationNavigationTarget) => {
    setPendingNotificationTarget((current) => current?.type === target.type && current.id === target.id ? null : current);
    const currentUrl = new globalThis.URL(globalThis.location.href);
    if (
      currentUrl.searchParams.get('notificationEntityType') === target.type
      && currentUrl.searchParams.get('notificationEntityId') === target.id
    ) {
      currentUrl.searchParams.delete('notificationEntityType');
      currentUrl.searchParams.delete('notificationEntityId');
      globalThis.history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}`);
    }
  }, []);

  return {
    consumePendingNotificationTarget,
    handleNotificationNavigate,
    pendingNotificationTarget
  };
}
