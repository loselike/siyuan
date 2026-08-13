import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it } from 'vitest';
import { REQUIRED_PERMISSION } from '../../require-permission.decorator.js';
import { SystemIdentityAdminController } from './system-identity-admin.controller.js';

type RouteContract = {
  handler: keyof SystemIdentityAdminController;
  method: RequestMethod;
  path: string;
  permission: string | string[];
};

const contracts: RouteContract[] = [
  { handler: 'getRoles', method: RequestMethod.GET, path: 'system/roles', permission: ['system:user-groups:read', 'system:role-permissions:read'] },
  { handler: 'createRole', method: RequestMethod.POST, path: 'system/roles', permission: 'system:user-groups:create' },
  { handler: 'updateRole', method: RequestMethod.PUT, path: 'system/roles/:role', permission: 'system:user-groups:update' },
  { handler: 'updateRoleEnabled', method: RequestMethod.PUT, path: 'system/roles/:role/enabled', permission: 'system:user-groups:enable' },
  { handler: 'deleteRole', method: RequestMethod.DELETE, path: 'system/roles/:role', permission: 'system:user-groups:delete' },
  { handler: 'getStaffAccounts', method: RequestMethod.GET, path: 'system/staff-accounts', permission: 'system:accounts:read' },
  { handler: 'createSite', method: RequestMethod.POST, path: 'system/sites', permission: 'system:sites:create' },
  { handler: 'updateSite', method: RequestMethod.PUT, path: 'system/sites/:id', permission: 'system:sites:update' },
  { handler: 'updateSiteEnabled', method: RequestMethod.PUT, path: 'system/sites/:id/enabled', permission: 'system:sites:enable' },
  { handler: 'createStaffAccount', method: RequestMethod.POST, path: 'system/staff-accounts', permission: 'system:accounts:create' },
  { handler: 'updateStaffAccountEnabled', method: RequestMethod.PUT, path: 'system/staff-accounts/:id/enabled', permission: 'system:accounts:enable' },
  { handler: 'updateStaffAccount', method: RequestMethod.PUT, path: 'system/staff-accounts/:id', permission: 'system:accounts:update-profile' },
  { handler: 'deleteStaffAccount', method: RequestMethod.DELETE, path: 'system/staff-accounts/:id', permission: 'system:accounts:delete' },
  { handler: 'resetStaffAccountPasswords', method: RequestMethod.POST, path: 'system/staff-accounts/reset-passwords', permission: 'system:accounts:reset-password' },
  { handler: 'updateStaffAccountSite', method: RequestMethod.PUT, path: 'system/staff-accounts/:id/site', permission: 'system:accounts:update-site' },
  { handler: 'updateRolePermissions', method: RequestMethod.PUT, path: 'system/roles/:role/permissions', permission: 'system:role-permissions:save' },
  { handler: 'copyRolePermissions', method: RequestMethod.PUT, path: 'system/roles/:role/permissions/copy', permission: 'system:role-permissions:copy-role' }
];

describe('SystemIdentityAdminController route contract', () => {
  it('keeps all seventeen HTTP paths, methods and outer permissions unchanged', () => {
    expect(contracts).toHaveLength(17);

    for (const contract of contracts) {
      const handler = SystemIdentityAdminController.prototype[contract.handler];
      expect(Reflect.getMetadata(PATH_METADATA, handler), contract.handler).toBe(contract.path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler), contract.handler).toBe(contract.method);
      expect(Reflect.getMetadata(REQUIRED_PERMISSION, handler), contract.handler).toEqual(contract.permission);
    }
  });
});
