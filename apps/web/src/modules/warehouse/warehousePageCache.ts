import type { WarehouseInStockQuery, WarehouseInStockTotals, WarehouseTodayQuery, WarehouseTodayTotals, WarehouseTallyTaskSummary } from '@siyuan/shared/warehouse';
import type { ApiClient, PermissionKey } from '../../apiClient';
import type { WarehouseInboundPackage } from './warehousePageModel';

const warehousePageCacheTtlMs = 15_000;
const maxWarehousePageCacheScopesPerClient = 4;

type WarehouseRowsSnapshot<TTotals> = {
  updatedAt: number;
  rows: WarehouseInboundPackage[];
  totals: TTotals;
};

export type WarehousePageCache = {
  packages?: { updatedAt: number; rows: WarehouseInboundPackage[] };
  todayByQuery: Map<string, WarehouseRowsSnapshot<WarehouseTodayTotals>>;
  inStockByQuery: Map<string, WarehouseRowsSnapshot<WarehouseInStockTotals>>;
  completedArchive?: { updatedAt: number; rows: WarehouseInboundPackage[] };
  tallyTasks?: { updatedAt: number; rows: WarehouseTallyTaskSummary[] };
};

const warehousePageCache = new WeakMap<ApiClient, Map<string, WarehousePageCache>>();

export function getWarehousePageCache(apiClient: ApiClient, scopeKey: string) {
  const scopedCaches = warehousePageCache.get(apiClient);
  const cached = scopedCaches?.get(scopeKey);
  if (cached) return cached;
  const created: WarehousePageCache = {
    todayByQuery: new Map(),
    inStockByQuery: new Map()
  };
  if (scopedCaches) {
    scopedCaches.set(scopeKey, created);
    while (scopedCaches.size > maxWarehousePageCacheScopesPerClient) {
      const oldestScopeKey = scopedCaches.keys().next().value;
      if (oldestScopeKey === undefined) break;
      scopedCaches.delete(oldestScopeKey);
    }
  } else {
    warehousePageCache.set(apiClient, new Map([[scopeKey, created]]));
  }
  return created;
}

export function isFreshWarehouseSnapshot(updatedAt: number) {
  return Date.now() - updatedAt <= warehousePageCacheTtlMs;
}

export function warehouseAuthorizationScopeKey(
  role: string,
  permissions: PermissionKey[],
  warehouseScopeFingerprint?: string
) {
  return JSON.stringify({
    warehouseScopeFingerprint: warehouseScopeFingerprint ?? null,
    role,
    permissions: Array.from(new Set(permissions)).sort()
  });
}

export function warehouseQueryKey(
  query: WarehouseTodayQuery | WarehouseInStockQuery,
  authorizationScopeKey: string
) {
  return JSON.stringify({ authorizationScopeKey, query });
}

export function resolveScopedWarehouseFallbackShipments<T>(
  shipments: T[],
  sourceScopeKey: string | undefined,
  targetScopeKey: string
) {
  return sourceScopeKey === targetScopeKey ? shipments : [];
}
