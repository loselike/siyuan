import type { PrismaRepository } from '../../prisma.repository.js';
import type { PermissionKey, Principal } from '../../rbac.js';

export const SHIPMENT_LABEL_LIFECYCLE_REPOSITORY = Symbol('SHIPMENT_LABEL_LIFECYCLE_REPOSITORY');
export const SHIPMENT_LABEL_LIFECYCLE_AUTHORIZER = Symbol('SHIPMENT_LABEL_LIFECYCLE_AUTHORIZER');

export type ShipmentLabelLifecycleRepository = Pick<
  PrismaRepository,
  | 'getShipmentLabels'
  | 'createShipmentLabel'
  | 'uploadShipmentLabel'
  | 'downloadShipmentLabel'
  | 'voidShipmentLabel'
>;

export interface ShipmentLabelLifecycleAuthorizer {
  hasPermission(role: Principal['role'], permission: PermissionKey): Promise<boolean>;
  recordPermissionDenied(
    principal: Principal,
    input: { permissions: string[]; method?: string; path?: string }
  ): Promise<unknown>;
}
