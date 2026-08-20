import { describe, expect, it, vi } from 'vitest';
import type { PermissionKey } from './rbac.js';
import {
  PrismaRolePermissionReader,
  rolePermissionConfigurationMarker
} from './prisma-role-permissions.js';

function enabledRole(permissions: PermissionKey[]) {
  return {
    enabled: true,
    permissions: [rolePermissionConfigurationMarker, ...permissions].map((code) => ({ code }))
  };
}

describe('PrismaRolePermissionReader', () => {
  it('keeps administrator defaults when no stored role row exists', async () => {
    const findUnique = vi.fn(async () => null);
    const reader = new PrismaRolePermissionReader({ role: { findUnique } } as never);

    await expect(reader.hasPermission('ADMIN', 'system:role-permissions:save')).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('keeps disabled non-administrator roles fail-closed', async () => {
    const findUnique = vi.fn(async () => ({
      ...enabledRole(['business:shipment:list']),
      enabled: false
    }));
    const reader = new PrismaRolePermissionReader({ role: { findUnique } } as never);

    await expect(reader.getPermissionsForRole('OPERATOR')).resolves.toEqual([]);
    await expect(reader.hasPermission('OPERATOR', 'business:shipment:list')).resolves.toBe(false);
    expect(reader.isSalesScoped('OPERATOR')).toBe(false);
  });

  it('keeps derived pricing capabilities without broadening another pricing module', async () => {
    const findUnique = vi.fn(async () => enabledRole(['pricing:markup:amazon:edit']));
    const reader = new PrismaRolePermissionReader({ role: { findUnique } } as never);

    await expect(reader.hasPermission('UG_MARKET', 'pricing:markup:amazon:view')).resolves.toBe(true);
    await expect(reader.hasPermission('UG_MARKET', 'pricing:markup:amazon:update')).resolves.toBe(true);
    await expect(reader.hasPermission('UG_MARKET', 'pricing:markup:inquiry:view')).resolves.toBe(false);
  });

  it('coalesces only concurrent reads and remembers sales scope through the full-list path', async () => {
    let resolveRow: ((row: ReturnType<typeof enabledRole>) => void) | undefined;
    const row = new Promise<ReturnType<typeof enabledRole>>((resolve) => {
      resolveRow = resolve;
    });
    const findUnique = vi.fn(() => row);
    const reader = new PrismaRolePermissionReader({ role: { findUnique } } as never);

    const permissionCheck = reader.hasPermission('UG_BUSINESS', 'business:shipment:list');
    const permissionList = reader.getPermissionsForRole('UG_BUSINESS');
    expect(findUnique).toHaveBeenCalledTimes(1);

    resolveRow?.(enabledRole(['business:shipment:list', 'data-scope:sales-own']));
    await expect(permissionCheck).resolves.toBe(true);
    await expect(permissionList).resolves.toEqual(expect.arrayContaining([
      'business:shipment:list',
      'data-scope:sales-own'
    ]));
    expect(reader.isSalesScoped('UG_BUSINESS')).toBe(true);

    await reader.hasPermission('UG_BUSINESS', 'business:shipment:list');
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it('clears failed in-flight reads so the next permission check retries', async () => {
    const findUnique = vi.fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(enabledRole(['business:shipment:list']));
    const reader = new PrismaRolePermissionReader({ role: { findUnique } } as never);

    await expect(reader.hasPermission('OPERATOR', 'business:shipment:list')).rejects.toThrow('database unavailable');
    await expect(reader.hasPermission('OPERATOR', 'business:shipment:list')).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it('updates and forgets the synchronous sales-scope compatibility state', () => {
    const reader = new PrismaRolePermissionReader({} as never);

    reader.rememberPermissions('UG_BUSINESS', ['data-scope:sales-own']);
    expect(reader.isSalesScoped('UG_BUSINESS')).toBe(true);
    reader.rememberPermissions('UG_BUSINESS', []);
    expect(reader.isSalesScoped('UG_BUSINESS')).toBe(false);
    reader.rememberPermissions('UG_BUSINESS', ['data-scope:sales-own']);
    reader.forgetRole('UG_BUSINESS');
    expect(reader.isSalesScoped('UG_BUSINESS')).toBe(false);
  });

  it('does not share a mutable permission array between concurrent callers', async () => {
    const reader = new PrismaRolePermissionReader({
      role: { findUnique: vi.fn(async () => enabledRole(['business:shipment:list'])) }
    } as never);

    const [left, right] = await Promise.all([
      reader.getPermissionsForRole('OPERATOR'),
      reader.getPermissionsForRole('OPERATOR')
    ]);
    left.push('system:role-permissions:save');

    expect(right).not.toContain('system:role-permissions:save');
  });
});
