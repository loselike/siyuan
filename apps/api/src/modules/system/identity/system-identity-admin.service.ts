import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';
import {
  SYSTEM_IDENTITY_ADMIN_REPOSITORY,
  type SystemIdentityAdminRepository
} from './system-identity-admin.repository.js';

export type RoleGroupInput = Parameters<SystemIdentityAdminRepository['createRoleGroup']>[1];
export type EnabledUpdateInput = Parameters<SystemIdentityAdminRepository['updateRoleGroupEnabled']>[2];
export type StaffAccountQuery = Parameters<SystemIdentityAdminRepository['getStaffAccounts']>[1];
export type SiteCreateInput = Parameters<SystemIdentityAdminRepository['createSite']>[1];
export type SiteUpdateInput = Parameters<SystemIdentityAdminRepository['updateSite']>[2];
export type StaffAccountCreateInput = Parameters<SystemIdentityAdminRepository['createStaffAccount']>[1];
export type StaffAccountUpdateInput = Parameters<SystemIdentityAdminRepository['updateStaffAccount']>[2];
export type StaffAccountPasswordResetInput = Parameters<SystemIdentityAdminRepository['resetStaffAccountPasswords']>[1];

@Injectable()
export class SystemIdentityAdminService {
  constructor(
    @Inject(SYSTEM_IDENTITY_ADMIN_REPOSITORY)
    private readonly repository: SystemIdentityAdminRepository
  ) {}

  getRoles() {
    return this.repository.getRolePermissionMatrix();
  }

  createRole(principal: Principal, input: RoleGroupInput) {
    return this.repository.createRoleGroup(principal, input);
  }

  updateRole(principal: Principal, role: RoleKey, input: RoleGroupInput) {
    return this.repository.updateRoleGroup(principal, role, input);
  }

  updateRoleEnabled(principal: Principal, role: RoleKey, input: EnabledUpdateInput) {
    return this.repository.updateRoleGroupEnabled(principal, role, input);
  }

  deleteRole(principal: Principal, role: RoleKey) {
    return this.repository.deleteRoleGroup(principal, role);
  }

  getStaffAccounts(principal: Principal, query: StaffAccountQuery) {
    return this.repository.getStaffAccounts(principal, query);
  }

  createSite(principal: Principal, input: SiteCreateInput) {
    return this.repository.createSite(principal, input);
  }

  updateSite(principal: Principal, id: string, input: SiteUpdateInput) {
    return this.repository.updateSite(principal, id, input);
  }

  updateSiteEnabled(principal: Principal, id: string, input: EnabledUpdateInput) {
    return this.repository.updateSiteEnabled(principal, id, input);
  }

  createStaffAccount(principal: Principal, input: StaffAccountCreateInput) {
    return this.repository.createStaffAccount(principal, input);
  }

  updateStaffAccountEnabled(principal: Principal, id: string, input: EnabledUpdateInput) {
    return this.repository.updateStaffAccountEnabled(principal, id, input);
  }

  async updateStaffAccount(principal: Principal, id: string, input: StaffAccountUpdateInput) {
    if (input.role) await this.ensurePermission(principal, 'system:accounts:update-role');
    if (input.site !== undefined) await this.ensurePermission(principal, 'system:accounts:update-site');
    if (input.enabled !== undefined) await this.ensurePermission(principal, 'system:accounts:enable');
    if (input.password !== undefined) await this.ensurePermission(principal, 'system:accounts:reset-password');
    // 部门调整当前复用账号资料维护权限；部门不联动用户组或站点。
    return this.repository.updateStaffAccount(principal, id, input);
  }

  deleteStaffAccount(principal: Principal, id: string) {
    return this.repository.deleteStaffAccount(principal, id);
  }

  resetStaffAccountPasswords(principal: Principal, input: StaffAccountPasswordResetInput) {
    return this.repository.resetStaffAccountPasswords(principal, input);
  }

  updateStaffAccountSite(principal: Principal, id: string, input: { site?: string }) {
    return this.repository.updateStaffAccountSite(principal, id, input);
  }

  updateRolePermissions(principal: Principal, role: RoleKey, permissions: PermissionKey[]) {
    return this.repository.updateRolePermissions(principal, role, permissions);
  }

  copyRolePermissions(principal: Principal, role: RoleKey, sourceRoleKey?: RoleKey) {
    return this.repository.copyRolePermissions(principal, role, sourceRoleKey);
  }

  private async ensurePermission(principal: Principal, permission: PermissionKey) {
    if (await this.repository.hasPermission(principal.role, permission)) return;
    await this.repository.recordPermissionDenied(principal, {
      permissions: [permission],
      method: 'SERVER',
      path: 'warehouse granular action'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }
}
