import type { ShipmentStatus } from '@siyuan/shared';
import type { PermissionKey } from './rbac.js';

export function customerServiceProblemPermissionsForStatus(status: ShipmentStatus): PermissionKey[] {
  if (status === 'WAITING_SORT') return ['customer-service:pending-routing:problem-create'];
  if (status === 'WAITING_DEPARTURE') return ['customer-service:waiting-departure:problem-create'];
  if (status === 'DEPARTED') return ['customer-service:departed:problem-create'];
  if (status === 'ARRIVED_PORT') return ['customer-service:arrived-port:problem-create'];
  if (status === 'DELIVERING') return ['customer-service:delivering:problem-create', 'customer-service:delivering:after-sale-create'];
  if (status === 'SIGNED') return ['customer-service:signed:after-sale-create'];
  return [];
}
