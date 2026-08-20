import type { PermissionKey, RoleKey } from '../../apiClient';

export type GlobalFieldMaskKey =
  | 'agent-short-name'
  | 'agent-company-name'
  | 'agent-channel'
  | 'agent-data'
  | 'payable-cost'
  | 'payable-status';

export type GlobalFieldMaskVisibility = {
  showAgentShortName: boolean;
  showAgentCompanyName: boolean;
  showAgentChannel: boolean;
  showAgentWeight: boolean;
  showAgentData: boolean;
  showPayableCost: boolean;
  showPayableStatus: boolean;
};

function permissionCode(key: GlobalFieldMaskKey): PermissionKey {
  return `system:global-mask:${key}` as PermissionKey;
}

export function getGlobalFieldMaskVisibility(
  role?: RoleKey | string,
  permissions: readonly (PermissionKey | string)[] = []
): GlobalFieldMaskVisibility {
  // The API keeps configured total-rule masks even for administrator-equivalent
  // roles.  Do not let a stale or hand-crafted client session bypass that
  // contract; a mask is authoritative whenever it is present.
  const granted = new Set(permissions);
  const masked = (key: GlobalFieldMaskKey) => granted.has(permissionCode(key));
  const agentDataMasked = masked('agent-data');
  return {
    showAgentShortName: !agentDataMasked && !masked('agent-short-name'),
    showAgentCompanyName: !agentDataMasked && !masked('agent-company-name'),
    showAgentChannel: !agentDataMasked && !masked('agent-channel'),
    showAgentWeight: !agentDataMasked,
    showAgentData: !agentDataMasked,
    showPayableCost: !masked('payable-cost'),
    showPayableStatus: !masked('payable-status')
  };
}

export function hasGlobalFieldMask(
  key: GlobalFieldMaskKey,
  role?: RoleKey | string,
  permissions: readonly (PermissionKey | string)[] = []
) {
  return !getGlobalFieldMaskVisibility(role, permissions)[visibilityKeyForMask(key)];
}

function visibilityKeyForMask(key: GlobalFieldMaskKey): keyof GlobalFieldMaskVisibility {
  switch (key) {
    case 'agent-short-name': return 'showAgentShortName';
    case 'agent-company-name': return 'showAgentCompanyName';
    case 'agent-channel': return 'showAgentChannel';
    case 'agent-data': return 'showAgentData';
    case 'payable-cost': return 'showPayableCost';
    case 'payable-status': return 'showPayableStatus';
  }
}
