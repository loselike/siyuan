import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal } from '../../rbac.js';
import { SystemIdentityAdminService } from './system-identity-admin.service.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };

function buildRepository() {
  return {
    getRolePermissionMatrix: vi.fn().mockResolvedValue({ availablePermissions: [], roles: [] }),
    createRoleGroup: vi.fn().mockResolvedValue({ key: 'UG_NEW' }),
    updateRoleGroup: vi.fn().mockResolvedValue({ key: 'UG_NEW' }),
    updateRoleGroupEnabled: vi.fn().mockResolvedValue({ key: 'UG_NEW' }),
    deleteRoleGroup: vi.fn().mockResolvedValue({ key: 'UG_NEW' }),
    getStaffAccounts: vi.fn().mockResolvedValue([]),
    createSite: vi.fn().mockResolvedValue({ id: 'site-1' }),
    updateSite: vi.fn().mockResolvedValue({ id: 'site-1' }),
    updateSiteEnabled: vi.fn().mockResolvedValue({ id: 'site-1' }),
    createStaffAccount: vi.fn().mockResolvedValue({ id: 'u-1' }),
    updateStaffAccountEnabled: vi.fn().mockResolvedValue({ id: 'u-1' }),
    updateStaffAccount: vi.fn().mockResolvedValue({ id: 'u-1' }),
    deleteStaffAccount: vi.fn().mockResolvedValue({ id: 'u-1' }),
    resetStaffAccountPasswords: vi.fn().mockResolvedValue([]),
    updateStaffAccountSite: vi.fn().mockResolvedValue({ id: 'u-1' }),
    updateRolePermissions: vi.fn().mockResolvedValue({ key: 'UG_NEW' }),
    copyRolePermissions: vi.fn().mockResolvedValue({ key: 'UG_NEW' }),
    hasPermission: vi.fn<(role: string, permission: PermissionKey) => Promise<boolean>>().mockResolvedValue(true),
    recordPermissionDenied: vi.fn().mockResolvedValue(undefined)
  };
}

describe('SystemIdentityAdminService', () => {
  let repository: ReturnType<typeof buildRepository>;
  let service: SystemIdentityAdminService;

  beforeEach(() => {
    repository = buildRepository();
    service = new SystemIdentityAdminService(repository as never);
  });

  it('keeps all seventeen repository delegation contracts unchanged', async () => {
    const roleInput = { label: '运营组' };
    const enabledInput = { enabled: true };
    const staffInput = { username: 'staff01', role: 'UG_BUSINESS' } as never;
    const staffQuery = { keyword: 'staff' };
    const siteInput = { name: '深圳站' };

    await service.getRoles();
    await service.createRole(admin, roleInput);
    await service.updateRole(admin, 'UG_NEW', roleInput);
    await service.updateRoleEnabled(admin, 'UG_NEW', enabledInput);
    await service.deleteRole(admin, 'UG_NEW');
    await service.getStaffAccounts(admin, staffQuery);
    await service.createSite(admin, siteInput);
    await service.updateSite(admin, 'site-1', siteInput);
    await service.updateSiteEnabled(admin, 'site-1', enabledInput);
    await service.createStaffAccount(admin, staffInput);
    await service.updateStaffAccountEnabled(admin, 'u-1', enabledInput);
    await service.updateStaffAccount(admin, 'u-1', { name: '员工甲' });
    await service.deleteStaffAccount(admin, 'u-1');
    await service.resetStaffAccountPasswords(admin, { userIds: ['u-1'] });
    await service.updateStaffAccountSite(admin, 'u-1', { site: '深圳站' });
    await service.updateRolePermissions(admin, 'UG_NEW', ['system:role-permissions:save']);
    await service.copyRolePermissions(admin, 'UG_NEW', 'UG_SOURCE');

    expect(repository.getRolePermissionMatrix).toHaveBeenCalledWith();
    expect(repository.createRoleGroup).toHaveBeenCalledWith(admin, roleInput);
    expect(repository.updateRoleGroup).toHaveBeenCalledWith(admin, 'UG_NEW', roleInput);
    expect(repository.updateRoleGroupEnabled).toHaveBeenCalledWith(admin, 'UG_NEW', enabledInput);
    expect(repository.deleteRoleGroup).toHaveBeenCalledWith(admin, 'UG_NEW');
    expect(repository.getStaffAccounts).toHaveBeenCalledWith(admin, staffQuery);
    expect(repository.createSite).toHaveBeenCalledWith(admin, siteInput);
    expect(repository.updateSite).toHaveBeenCalledWith(admin, 'site-1', siteInput);
    expect(repository.updateSiteEnabled).toHaveBeenCalledWith(admin, 'site-1', enabledInput);
    expect(repository.createStaffAccount).toHaveBeenCalledWith(admin, staffInput);
    expect(repository.updateStaffAccountEnabled).toHaveBeenCalledWith(admin, 'u-1', enabledInput);
    expect(repository.updateStaffAccount).toHaveBeenCalledWith(admin, 'u-1', { name: '员工甲' });
    expect(repository.deleteStaffAccount).toHaveBeenCalledWith(admin, 'u-1');
    expect(repository.resetStaffAccountPasswords).toHaveBeenCalledWith(admin, { userIds: ['u-1'] });
    expect(repository.updateStaffAccountSite).toHaveBeenCalledWith(admin, 'u-1', { site: '深圳站' });
    expect(repository.updateRolePermissions).toHaveBeenCalledWith(admin, 'UG_NEW', ['system:role-permissions:save']);
    expect(repository.copyRolePermissions).toHaveBeenCalledWith(admin, 'UG_NEW', 'UG_SOURCE');
  });

  it('does not add granular checks for ordinary profile-only updates', async () => {
    const input = { name: '员工甲', departmentId: 'department-business' };

    await service.updateStaffAccount(admin, 'u-1', input);

    expect(repository.hasPermission).not.toHaveBeenCalled();
    expect(repository.updateStaffAccount).toHaveBeenCalledWith(admin, 'u-1', input);
  });

  it('keeps field-specific checks in role, site, enabled and password order before writing', async () => {
    const input = { role: 'UG_BUSINESS', site: '深圳站', enabled: true, password: 'Strong@123' } as never;

    await service.updateStaffAccount(admin, 'u-1', input);

    expect(repository.hasPermission.mock.calls.map(([, permission]) => permission)).toEqual([
      'system:accounts:update-role',
      'system:accounts:update-site',
      'system:accounts:enable',
      'system:accounts:reset-password'
    ]);
    expect(repository.updateStaffAccount).toHaveBeenCalledWith(admin, 'u-1', input);
  });

  it('keeps the existing denial audit payload and rejects before the account write', async () => {
    repository.hasPermission.mockResolvedValue(false);

    await expect(service.updateStaffAccount(admin, 'u-1', { role: 'UG_BUSINESS' } as never))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.recordPermissionDenied).toHaveBeenCalledWith(admin, {
      permissions: ['system:accounts:update-role'],
      method: 'SERVER',
      path: 'warehouse granular action'
    });
    expect(repository.updateStaffAccount).not.toHaveBeenCalled();
  });

  it('keeps permission-denied audit best-effort semantics', async () => {
    repository.hasPermission.mockResolvedValue(false);
    repository.recordPermissionDenied.mockRejectedValue(new Error('audit unavailable'));

    await expect(service.updateStaffAccount(admin, 'u-1', { site: '深圳站' }))
      .rejects.toThrow('没有访问权限');
    expect(repository.updateStaffAccount).not.toHaveBeenCalled();
  });
});
