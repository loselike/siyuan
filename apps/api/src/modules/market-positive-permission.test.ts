import { describe, expect, it } from 'vitest';
import {
  normalizeRolePermissions,
  permissionDefinitions,
  type PermissionKey
} from './rbac.js';

const marketPermissions: PermissionKey[] = [
  'market:dashboard:view',
  'market:pending-routing:view',
  'market:pending-routing:route',
  'market:pending-routing:edit',
  'market:pending-routing:approve',
  'market:pending-routing:operation-log:view',
  'market:pending-routing:business-cost:view',
  'market:pending-routing:business-cost:create',
  'market:pending-routing:business-cost:edit',
  'market:pending-routing:business-cost:delete',
  'market:pending-routing:return-review',
  'market:routed:view',
  'market:routed:edit',
  'market:routed:reroute',
  'market:routed:routing-log:view',
  'market:routing-report:view',
  'market:routing-report:export'
];

describe('market positive permission contract', () => {
  it('exposes exactly the canonical market capabilities in the assignable catalog', () => {
    const assignableMarketCodes = permissionDefinitions
      .filter((permission) => permission.assignable !== false)
      .filter((permission) => permission.group.startsWith('市场管理 / '))
      .map((permission) => permission.code);

    expect(assignableMarketCodes).toEqual(expect.arrayContaining(marketPermissions));
    expect(assignableMarketCodes.filter((code) => code.startsWith('market:'))).toHaveLength(marketPermissions.length);
    expect(assignableMarketCodes.some((code) => code.endsWith('-block'))).toBe(false);
    expect(assignableMarketCodes).not.toContain('market:pending-routing:delete');
  });

  it('normalizes each action to its visible parent without requiring a second checkbox', () => {
    const normalized = normalizeRolePermissions('custom', [
      'market:pending-routing:business-cost:create',
      'market:routing-report:export',
      'market:routed:reroute'
    ]);

    expect(normalized).toEqual(expect.arrayContaining([
      'market:pending-routing:business-cost:create',
      'market:pending-routing:view',
      'market:pending-routing:business-cost:view',
      'market:routing-report:export',
      'market:routing-report:view',
      'market:routed:reroute',
      'market:routed:view'
    ]));
  });

  it('does not resurrect retired market block or technical permission codes', () => {
    const normalized = normalizeRolePermissions('custom', [
      'market:pending-routing:assign' as PermissionKey,
      'market:pending-routing:update-block' as PermissionKey,
      'market:weekly-routing:export' as PermissionKey,
      'market:pending-routing:delete' as PermissionKey
    ]);

    expect(normalized).not.toEqual(expect.arrayContaining([
      'market:pending-routing:assign',
      'market:pending-routing:update-block',
      'market:weekly-routing:export',
      'market:pending-routing:delete'
    ]));
  });
});
