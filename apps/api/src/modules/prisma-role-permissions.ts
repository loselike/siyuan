import { Inject, Injectable } from '@nestjs/common';
import { hasEffectivePricingCapability } from '@siyuan/shared/permissions';
import {
  defaultPermissionsForRole,
  effectivePermissionsForRole,
  isAdministratorRole,
  isBuiltinRoleKey,
  type PermissionKey,
  type RoleKey
} from './rbac.js';
import { PrismaService } from './prisma.service.js';

export const rolePermissionConfigurationMarker = 'system-internal:role-permissions-configured';

export function resolveStoredRolePermissions(role: RoleKey, permissions?: readonly string[]): PermissionKey[] {
  const explicitlyConfigured = permissions?.includes(rolePermissionConfigurationMarker) === true;
  const stored = (permissions ?? []).filter((permission) => permission !== rolePermissionConfigurationMarker) as PermissionKey[];
  const effective = permissions === undefined
    ? effectivePermissionsForRole(role)
    : explicitlyConfigured
      ? effectivePermissionsForRole(role, stored)
      : effectivePermissionsForRole(role, [...defaultPermissionsForRole(role), ...stored]);
  const legacySalesScopedCustomRole = !isBuiltinRoleKey(role)
    && role !== 'UG_MARKET'
    && stored.includes('business:order-entry:view')
    && stored.includes('master-data:customers:view-own');
  if (legacySalesScopedCustomRole && !effective.includes('data-scope:sales-own')) {
    effective.push('data-scope:sales-own');
  }
  return effective;
}

@Injectable()
export class PrismaRolePermissionReader {
  private readonly inFlightByRole = new Map<RoleKey, Promise<PermissionKey[]>>();
  private readonly salesScopedRoles = new Set<RoleKey>();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean> {
    const permissions = await this.readPermissions(role);
    return permissions.includes(permission) || hasEffectivePricingCapability(permissions, permission);
  }

  async getPermissionsForRole(role: RoleKey): Promise<PermissionKey[]> {
    const permissions = await this.readPermissions(role);
    this.rememberPermissions(role, permissions);
    return [...permissions];
  }

  isSalesScoped(role: RoleKey): boolean {
    return this.salesScopedRoles.has(role);
  }

  rememberPermissions(role: RoleKey, permissions: readonly PermissionKey[]): void {
    if (permissions.includes('data-scope:sales-own')) this.salesScopedRoles.add(role);
    else this.salesScopedRoles.delete(role);
  }

  forgetRole(role: RoleKey): void {
    this.salesScopedRoles.delete(role);
  }

  private async readPermissions(role: RoleKey): Promise<PermissionKey[]> {
    const existing = this.inFlightByRole.get(role);
    if (existing) return existing;

    const inFlight = this.loadPermissions(role);
    this.inFlightByRole.set(role, inFlight);
    try {
      return await inFlight;
    } finally {
      if (this.inFlightByRole.get(role) === inFlight) this.inFlightByRole.delete(role);
    }
  }

  private async loadPermissions(role: RoleKey): Promise<PermissionKey[]> {
    const row = await this.prisma.role.findUnique({
      where: { name: role },
      include: { permissions: true }
    });
    if (!isAdministratorRole(role) && row && row.enabled !== true) return [];
    return resolveStoredRolePermissions(role, row?.permissions.map((item) => item.code as PermissionKey));
  }
}
