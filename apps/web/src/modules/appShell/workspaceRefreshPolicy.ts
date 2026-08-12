import type { StaffAppRoute } from './config';

export type WorkspaceRefreshOwnership = 'route-owned' | 'legacy-global';

export function getWorkspaceRefreshOwnership(route: StaffAppRoute): WorkspaceRefreshOwnership {
  return route.menuKey === 'pricing' ? 'route-owned' : 'legacy-global';
}

export function shouldRequestGlobalWorkspaceRefresh(route: StaffAppRoute): boolean {
  return getWorkspaceRefreshOwnership(route) === 'legacy-global';
}
