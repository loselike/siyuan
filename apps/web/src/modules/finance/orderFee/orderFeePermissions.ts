import type { ShipmentFinanceItemType } from '@siyuan/shared';
import type { PermissionKey, RoleKey } from '../../../apiClient';

export type OrderFeeTableType = ShipmentFinanceItemType;

export function hasOrderFeeUiPermission(
  role: RoleKey,
  permissions: readonly PermissionKey[] | undefined,
  permission: PermissionKey
) {
  return role === 'ADMIN' || Boolean(permissions?.includes(permission));
}

export function canCreateOrderFeeType(
  role: RoleKey,
  type: OrderFeeTableType,
  permissions?: readonly PermissionKey[]
) {
  if (type === 'RECEIVABLE') {
    return hasOrderFeeUiPermission(role, permissions, 'business:order-fee:create')
      || hasOrderFeeUiPermission(role, permissions, 'finance:order-fee:receivable:manage');
  }
  if (type === 'BUSINESS_COST') {
    return hasOrderFeeUiPermission(role, permissions, 'business:order-fee:create')
      || hasOrderFeeUiPermission(role, permissions, 'finance:business-cost:manage');
  }
  return hasOrderFeeUiPermission(role, permissions, 'finance:order-fee:payable:manage')
    || hasOrderFeeUiPermission(role, permissions, 'finance:payable:manage');
}

export function canUpdateOrderFeeType(
  role: RoleKey,
  type: OrderFeeTableType,
  permissions?: readonly PermissionKey[]
) {
  if (type === 'RECEIVABLE') {
    return hasOrderFeeUiPermission(role, permissions, 'business:order-fee:update')
      || hasOrderFeeUiPermission(role, permissions, 'finance:order-fee:receivable:manage');
  }
  if (type === 'BUSINESS_COST') {
    return hasOrderFeeUiPermission(role, permissions, 'business:order-fee:update')
      || hasOrderFeeUiPermission(role, permissions, 'finance:business-cost:manage');
  }
  return hasOrderFeeUiPermission(role, permissions, 'finance:order-fee:payable:manage')
    || hasOrderFeeUiPermission(role, permissions, 'finance:payable:manage');
}

export function canDeleteOrderFeeType(
  role: RoleKey,
  type: OrderFeeTableType,
  permissions?: readonly PermissionKey[]
) {
  if (type === 'RECEIVABLE') {
    return hasOrderFeeUiPermission(role, permissions, 'business:order-fee:delete');
  }
  if (type === 'BUSINESS_COST') {
    return hasOrderFeeUiPermission(role, permissions, 'business:order-fee:delete')
      || hasOrderFeeUiPermission(role, permissions, 'finance:business-cost:manage')
      || hasOrderFeeUiPermission(role, permissions, 'market:pending-routing:business-cost:delete');
  }
  return hasOrderFeeUiPermission(role, permissions, 'finance:order-fee:payable:manage')
    || hasOrderFeeUiPermission(role, permissions, 'finance:payable:manage');
}

export function canLockOrderFeeType(
  role: RoleKey,
  type: OrderFeeTableType,
  permissions?: readonly PermissionKey[]
) {
  if (!hasOrderFeeUiPermission(role, permissions, 'business:order-fee:lock')) return false;
  if (type !== 'PAYABLE') return true;
  return hasOrderFeeUiPermission(role, permissions, 'finance:order-fee:payable:manage')
    || hasOrderFeeUiPermission(role, permissions, 'finance:payable:manage');
}

export function canUnlockOrderFeeType(
  role: RoleKey,
  type: OrderFeeTableType,
  permissions?: readonly PermissionKey[]
) {
  if (!hasOrderFeeUiPermission(role, permissions, 'business:order-fee:unlock')) return false;
  if (type !== 'PAYABLE') return true;
  return hasOrderFeeUiPermission(role, permissions, 'finance:order-fee:payable:manage')
    || hasOrderFeeUiPermission(role, permissions, 'finance:payable:manage');
}

export function canViewOrderFeePayables(
  role: RoleKey,
  permissions?: readonly PermissionKey[]
) {
  return [
    'finance:order-fee:payable:view',
    'finance:payable:view-sensitive',
    'business:shipment:payable-view',
    'market:pending-routing:payable-cost:view'
  ].some((permission) => hasOrderFeeUiPermission(role, permissions, permission as PermissionKey));
}

export function canViewOrderFeeBusinessCostAgent(
  role: RoleKey,
  permissions?: readonly PermissionKey[]
) {
  return [
    'finance:business-cost:view-agent',
    'finance:order-fee:payable:view',
    'finance:payable:view-sensitive'
  ].some((permission) => hasOrderFeeUiPermission(role, permissions, permission as PermissionKey));
}
