import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';

export const FINANCE_CATALOG_AUTHORIZER = Symbol('FINANCE_CATALOG_AUTHORIZER');

export interface FinanceCatalogAuthorizer {
  hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean>;
  recordPermissionDenied(
    principal: Principal,
    input: { permissions: string[]; method?: string; path?: string }
  ): Promise<void>;
}
