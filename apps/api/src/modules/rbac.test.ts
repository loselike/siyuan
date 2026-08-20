import { describe, expect, it } from 'vitest';
import { hasEffectivePricingCapability } from '@siyuan/shared';
import { assertPermissionDefinitionsIntegrity, createPrincipalScopeFingerprint, defaultPermissionsForRole, normalizeRolePermissions, permissionDefinitions, type Principal } from './rbac.js';

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
  it('keeps the warehouse scope fingerprint stable for ordering but changes it for scope changes', () => {
    const principal: Principal = {
      id: 'user-1',
      username: 'operator',
      role: 'UG_BUSINESS',
      departmentTeamScope: ['teammate', 'operator'],
      site: 'CN'
    };
    const first = createPrincipalScopeFingerprint(principal, ['warehouse:today-receipt:view', 'business:shipment:detail'], 'test-secret');
    const reordered = createPrincipalScopeFingerprint({ ...principal, departmentTeamScope: ['operator', 'teammate'] }, ['business:shipment:detail', 'warehouse:today-receipt:view'], 'test-secret');
    const changed = createPrincipalScopeFingerprint({ ...principal, departmentTeamScope: ['operator'] }, ['business:shipment:detail', 'warehouse:today-receipt:view'], 'test-secret');

    expect(reordered).toBe(first);
    expect(changed).not.toBe(first);
    expect(createPrincipalScopeFingerprint({ ...principal, customerId: 'customer-a' }, ['warehouse:today-receipt:view'], 'test-secret'))
      .not.toBe(createPrincipalScopeFingerprint({ ...principal, customerId: 'customer-b' }, ['warehouse:today-receipt:view'], 'test-secret'));
  });

  it('keeps one stored pricing action while deriving only its minimum read context', () => {
    const grants = ['pricing:markup:amazon:edit'];
    expect(hasEffectivePricingCapability(grants, 'pricing:markup:amazon:view')).toBe(true);
    expect(hasEffectivePricingCapability(grants, 'pricing:markup:amazon:update')).toBe(true);
    expect(hasEffectivePricingCapability(grants, 'pricing:markup:inquiry:view')).toBe(false);
  });
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
      'finance:paid-payment:voucher-delete',
      'finance:paid-payment:export'
    ]));
    expect(normalizeRolePermissions('UG_FINANCE_CUSTOM', ['finance:paid-payment:voucher-delete'])).toEqual(expect.arrayContaining([
      'finance:paid-payment:read',
      'finance:paid-payment:voucher-view',
      'finance:paid-payment:voucher-delete'
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
      'business:review:view',
      'business:review:edit',
      'master-data:customers:view-own',
      'master-data:finance:read',
      'finance:water-receipt:read',
      'finance:water-receipt:voucher-upload',
      'finance:water-receipt:voucher-delete',
      'pricing:lookup:south-africa'
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
      'market:pending-routing:approve'
    ]));
    expect(defaultPermissionsForRole('WAREHOUSE').some((permission) => permission.startsWith('finance:'))).toBe(false);
    expect(defaultPermissionsForRole('FINANCE')).not.toContain('market:pending-routing:approve');
    expect(defaultPermissionsForRole('CUSTOMER')).toEqual(expect.arrayContaining([
      'business:shipment:self-view',
      'finance:customer-account:read'
    ]));
  });

  it('registers customer service pending-routing masks without enabling them by default', () => {
    expect(permissionDefinitions.map((permission) => permission.code)).toEqual(expect.arrayContaining([
      'customer-service:pending-routing:fee-detail-block',
      'customer-service:pending-routing:readonly-block'
    ]));
    expect(defaultPermissionsForRole('CUSTOMER_SERVICE')).not.toContain('customer-service:pending-routing:fee-detail-block');
    expect(defaultPermissionsForRole('CUSTOMER_SERVICE')).not.toContain('customer-service:pending-routing:readonly-block');
  });

  it('keeps every pricing business feature as one independent persisted capability', () => {
    const codes = permissionDefinitions.map((permission) => permission.code);
    expect(codes).toEqual(expect.arrayContaining([
      'pricing:markup:amazon:view',
      'pricing:markup:amazon:edit',
      'pricing:markup:dubaiAirSea:view',
      'pricing:markup:dubaiAirSea:edit',
      'pricing:price-books:view',
      'pricing:price-books:delete'
    ]));
    expect(codes).not.toContain('pricing:markup:amazon:export');
    expect(permissionDefinitions.find((permission) => permission.code === 'pricing:markup:update')?.assignable).toBe(false);
    const normalized = normalizeRolePermissions('custom', [
      'pricing:markup:amazon:edit'
    ]);
    expect(normalized).toEqual(['pricing:markup:amazon:edit', 'pricing:markup:amazon:view']);
    expect(normalized).not.toContain('pricing:markup:amazon:export');
    expect(normalized).not.toContain('pricing:markup:amazon:update');
  });

});
