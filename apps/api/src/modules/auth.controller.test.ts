import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import type { PermissionKey, Principal } from './rbac.js';

describe('AuthController profile scope boundary', () => {
  it('returns a fingerprint derived from the updated and rehydrated principal', async () => {
    const current: Principal = {
      id: 'user-1',
      username: 'sales',
      role: 'UG_BUSINESS',
      name: '旧姓名',
      nickname: '旧昵称',
      departmentTeamScope: ['sales']
    };
    const updated: Principal = { ...current, name: '新姓名', nickname: '新昵称' };
    const repository = {
      updateProfile: vi.fn().mockResolvedValue(updated),
      hydratePrincipalDepartmentScope: vi.fn(async (principal: Principal) => {
        principal.departmentTeamScope = ['sales', 'teammate'];
        return ['business:shipment:team-view'] as PermissionKey[];
      })
    };

    const result = await new AuthController(repository as never).updateProfile(
      { user: current },
      { name: '新姓名', nickname: '新昵称' }
    );

    expect(repository.hydratePrincipalDepartmentScope).toHaveBeenCalledWith(expect.objectContaining({
      name: '新姓名',
      nickname: '新昵称'
    }));
    expect(result.name).toBe('新姓名');
    expect(result.warehouseScopeFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fails closed with an opaque invalidation boundary if scope hydration is unavailable', async () => {
    const current: Principal = {
      id: 'user-1',
      username: 'sales',
      role: 'UG_BUSINESS',
      name: '旧姓名'
    };
    const profile = { ...current, name: '新姓名' };
    const repository = {
      updateProfile: vi.fn().mockResolvedValue(profile),
      hydratePrincipalDepartmentScope: vi.fn().mockRejectedValue(new Error('temporary scope read failure'))
    };

    const result = await new AuthController(repository as never).updateProfile(
      { user: current },
      { name: '新姓名' }
    );

    expect(result.name).toBe('新姓名');
    expect(result.warehouseScopeFingerprint).toMatch(/^scope-refresh-required:[0-9a-f-]{36}$/);
  });
});
