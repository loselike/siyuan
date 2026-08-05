import type { PermissionKey, RoleKey } from '../../apiClient';

const orderManagementAgentDetailPermissions: PermissionKey[] = [
  'master-data:agents:read',
  'master-data:agent-channels:read',
  'market:pending-routing:agent-channel-view',
  'market:routed:agent-channel-view',
  'finance:business-cost:view-agent',
  'finance:payable:view-sensitive'
];

export function canViewOrderManagementAgentDetails(
  role: RoleKey,
  permissions: readonly PermissionKey[] = []
) {
  return role === 'ADMIN' || orderManagementAgentDetailPermissions.some((permission) => permissions.includes(permission));
}
