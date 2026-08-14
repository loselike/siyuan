import { isSalesScopedRole, type Principal } from '../rbac.js';
import type { MasterDataSnapshotSelection } from './master-data-read.repository.js';

export interface MasterDataSnapshotPermissions {
  customers: boolean;
  financeCatalog: boolean;
  agents: boolean;
  agentChannels: boolean;
  channels: boolean;
  channelCategories: boolean;
  exchangeRates: boolean;
}

export function hasSalesOwnDataScope(principal: Principal): boolean {
  return principal.dataScope === 'SALES_OWN'
    || (isSalesScopedRole(principal.role) && principal.role !== 'UG_MARKET');
}

export function buildMasterDataSnapshotSelection(
  principal: Principal,
  permissions: MasterDataSnapshotPermissions
): MasterDataSnapshotSelection {
  return {
    ...permissions,
    customerSalespeople: hasSalesOwnDataScope(principal)
      ? [...new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value)))]
      : undefined
  };
}
