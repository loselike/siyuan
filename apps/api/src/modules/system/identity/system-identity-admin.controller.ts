import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import {
  systemRoleEnabledInputSchema,
  systemRoleGroupInputSchema,
  systemRolePermissionsCopyInputSchema,
  systemRolePermissionsInputSchema,
  type RolePermissionsCopyInput,
  type RolePermissionsUpdateInput
} from '@siyuan/shared/system-identity-input';
import type { Principal, RoleKey } from '../../rbac.js';
import type {
  EnabledUpdateInput,
  RoleGroupInput,
  SiteCreateInput,
  SiteUpdateInput,
  StaffAccountCreateInput,
  StaffAccountPasswordResetInput,
  StaffAccountQuery,
  StaffAccountUpdateInput
} from './system-identity-admin.service.js';
import { RequirePermission } from '../../require-permission.decorator.js';
import { RuntimeInputPipe } from '../../runtime-input.pipe.js';
import { SystemIdentityAdminService } from './system-identity-admin.service.js';

@Controller()
export class SystemIdentityAdminController {
  constructor(
    @Inject(SystemIdentityAdminService)
    private readonly service: SystemIdentityAdminService
  ) {}

  @Get('system/roles')
  @RequirePermission(['system:user-groups:read', 'system:role-permissions:read'])
  getRoles() {
    return this.service.getRoles();
  }

  @Post('system/roles')
  @RequirePermission('system:user-groups:create')
  createRole(@Req() request: { user: Principal }, @Body(new RuntimeInputPipe(systemRoleGroupInputSchema)) body: RoleGroupInput) {
    return this.service.createRole(request.user, body);
  }

  @Put('system/roles/:role')
  @RequirePermission('system:user-groups:update')
  updateRole(@Req() request: { user: Principal }, @Param('role') role: RoleKey, @Body(new RuntimeInputPipe(systemRoleGroupInputSchema)) body: RoleGroupInput) {
    return this.service.updateRole(request.user, role, body);
  }

  @Put('system/roles/:role/enabled')
  @RequirePermission('system:user-groups:enable')
  updateRoleEnabled(@Req() request: { user: Principal }, @Param('role') role: RoleKey, @Body(new RuntimeInputPipe(systemRoleEnabledInputSchema)) body: EnabledUpdateInput) {
    return this.service.updateRoleEnabled(request.user, role, body);
  }

  @Delete('system/roles/:role')
  @RequirePermission('system:user-groups:delete')
  deleteRole(@Req() request: { user: Principal }, @Param('role') role: RoleKey) {
    return this.service.deleteRole(request.user, role);
  }

  @Get('system/staff-accounts')
  @RequirePermission('system:accounts:read')
  getStaffAccounts(@Req() request: { user: Principal }, @Query() query: StaffAccountQuery) {
    return this.service.getStaffAccounts(request.user, query);
  }

  @Post('system/sites')
  @RequirePermission('system:sites:create')
  createSite(@Req() request: { user: Principal }, @Body() body: SiteCreateInput) {
    return this.service.createSite(request.user, body);
  }

  @Put('system/sites/:id')
  @RequirePermission('system:sites:update')
  updateSite(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: SiteUpdateInput) {
    return this.service.updateSite(request.user, id, body);
  }

  @Put('system/sites/:id/enabled')
  @RequirePermission('system:sites:enable')
  updateSiteEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.service.updateSiteEnabled(request.user, id, body);
  }

  @Post('system/staff-accounts')
  @RequirePermission('system:accounts:create')
  createStaffAccount(@Req() request: { user: Principal }, @Body() body: StaffAccountCreateInput) {
    return this.service.createStaffAccount(request.user, body);
  }

  @Put('system/staff-accounts/:id/enabled')
  @RequirePermission('system:accounts:enable')
  updateStaffAccountEnabled(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: EnabledUpdateInput) {
    return this.service.updateStaffAccountEnabled(request.user, id, body);
  }

  @Put('system/staff-accounts/:id')
  @RequirePermission('system:accounts:update-profile')
  updateStaffAccount(@Req() request: { user: Principal }, @Param('id') id: string, @Body() body: StaffAccountUpdateInput) {
    return this.service.updateStaffAccount(request.user, id, body);
  }

  @Delete('system/staff-accounts/:id')
  @RequirePermission('system:accounts:delete')
  deleteStaffAccount(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.service.deleteStaffAccount(request.user, id);
  }

  @Post('system/staff-accounts/reset-passwords')
  @RequirePermission('system:accounts:reset-password')
  resetStaffAccountPasswords(@Req() request: { user: Principal }, @Body() body: StaffAccountPasswordResetInput) {
    return this.service.resetStaffAccountPasswords(request.user, body);
  }

  @Put('system/staff-accounts/:id/site')
  @RequirePermission('system:accounts:update-site')
  updateStaffAccountSite(
    @Req() request: { user: Principal },
    @Param('id') id: string,
    @Body() body: { site?: string }
  ) {
    return this.service.updateStaffAccountSite(request.user, id, body);
  }

  @Put('system/roles/:role/permissions')
  @RequirePermission('system:role-permissions:save')
  updateRolePermissions(
    @Req() request: { user: Principal },
    @Param('role') role: RoleKey,
    @Body(new RuntimeInputPipe(systemRolePermissionsInputSchema)) body: RolePermissionsUpdateInput
  ) {
    return this.service.updateRolePermissions(request.user, role, body.permissions);
  }

  @Put('system/roles/:role/permissions/copy')
  @RequirePermission('system:role-permissions:copy-role')
  copyRolePermissions(
    @Req() request: { user: Principal },
    @Param('role') role: RoleKey,
    @Body(new RuntimeInputPipe(systemRolePermissionsCopyInputSchema)) body: RolePermissionsCopyInput
  ) {
    return this.service.copyRolePermissions(request.user, role, body.sourceRoleKey);
  }
}
