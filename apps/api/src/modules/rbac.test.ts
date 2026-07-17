import { describe, expect, it } from 'vitest';
import { assertPermissionDefinitionsIntegrity, defaultPermissionsForRole, permissionDefinitions } from './rbac.js';

const businessRoles = [
  'OPERATOR',
  'UG_BUSINESS',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR'
] as const;

describe('RBAC default permission inheritance', () => {
  it('keeps permission codes and labels unique inside their business directories', () => {
    expect(() => assertPermissionDefinitionsIntegrity()).not.toThrow();
    expect(() => assertPermissionDefinitionsIntegrity([
      ...permissionDefinitions,
      { ...permissionDefinitions[0] }
    ])).toThrow('权限定义重复 code');
    expect(() => assertPermissionDefinitionsIntegrity([
      ...permissionDefinitions,
      { ...permissionDefinitions[0], code: 'system:test:duplicate-label', group: permissionDefinitions[0].group }
    ])).toThrow('权限定义重复文案');
  });

  it('keeps fine-grained master data and paid payment permissions in their own directories', () => {
    const financeMasterData = permissionDefinitions.filter((permission) => permission.group === '基础资料库 / 财务资料');
    const paidPayments = permissionDefinitions.filter((permission) => permission.group === '财务管理 / 已付款');

    expect(financeMasterData.some((permission) => permission.code.startsWith('master-data:agents:'))).toBe(false);
    expect(financeMasterData.map((permission) => permission.code)).not.toContain('master-data:finance:write');
    expect(paidPayments.map((permission) => permission.code)).toEqual(expect.arrayContaining([
      'finance:paid-payment:read',
      'finance:paid-payment:confirm',
      'finance:paid-payment:reverse',
      'finance:paid-payment:export'
    ]));
    expect(paidPayments.some((permission) => permission.code.startsWith('finance:payable:paid-'))).toBe(false);
  });

  it.each(businessRoles)('keeps real agent and internal pricing data hidden from %s', (role) => {
    const permissions = defaultPermissionsForRole(role);

    expect(permissions).not.toContain('master-data:agents:read');
    expect(permissions).not.toContain('master-data:agent-channels:read');
    expect(permissions).not.toContain('pricing:lookup:internal-source-view');
    expect(permissions).not.toContain('pricing:lookup:cost-view');
    expect(permissions).not.toContain('pricing:lookup:gross-profit-view');
    expect(permissions).not.toContain('pricing:lookup:markup-breakdown-view');
    expect(permissions.some((permission) => permission.startsWith('finance:pending-payment:'))).toBe(false);
    expect(permissions.some((permission) => permission.startsWith('finance:paid-payment:'))).toBe(false);
    expect(permissions.some((permission) => permission.startsWith('finance:agent-bill:'))).toBe(false);
  });

  it('preserves business self-service and settlement method reference without granting finance catalog maintenance', () => {
    const permissions = defaultPermissionsForRole('OPERATOR');

    expect(permissions).toEqual(expect.arrayContaining([
      'business:review:approve',
      'master-data:customers:view-own',
      'master-data:finance:read',
      'finance:water-receipt:read',
      'finance:water-receipt:voucher-upload',
      'finance:water-receipt:voucher-delete',
      'pricing:south-africa:rules-read'
    ]));
    expect(permissions).not.toContain('pricing:south-africa:rules-update');
    expect(permissions).not.toContain('finance:water-receipt:arrive');
    expect(permissions).not.toContain('finance:water-match:create');
    expect(permissions).not.toContain('master-data:finance:settlement:create');
  });

  it('keeps market, warehouse, finance, and customer responsibilities separated', () => {
    expect(defaultPermissionsForRole('UG_MARKET')).toEqual(expect.arrayContaining([
      'master-data:agents:read',
      'master-data:agent-channels:read',
      'market:pending-routing:confirm'
    ]));
    expect(defaultPermissionsForRole('WAREHOUSE').some((permission) => permission.startsWith('finance:'))).toBe(false);
    expect(defaultPermissionsForRole('FINANCE')).not.toContain('market:pending-routing:confirm');
    expect(defaultPermissionsForRole('CUSTOMER')).toEqual(expect.arrayContaining([
      'business:shipment:self-view',
      'finance:customer-account:read'
    ]));
  });
});
