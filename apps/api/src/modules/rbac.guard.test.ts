import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSessionService } from './auth/auth-session.service.js';
import { RbacGuard, jwtSecret } from './rbac.guard.js';
import { REQUIRED_AUTH, REQUIRED_PERMISSION, REQUIRED_PERMISSION_MODE } from './require-permission.decorator.js';
import type { PermissionKey, Principal } from './rbac.js';

type RequestStub = {
  headers: Record<string, string>;
  user?: Principal;
  method: string;
  url: string;
};

function setup(input: {
  permission?: PermissionKey | PermissionKey[];
  permissionMode?: 'any' | 'all';
  authRequired?: boolean;
  currentPermissions?: PermissionKey[];
  hydrate?: (principal: Principal) => Promise<PermissionKey[]>;
  request?: Partial<RequestStub>;
} = {}) {
  const tokenPrincipal: Principal = { id: 'user-1', username: 'old-name', role: 'UG_BUSINESS' };
  const accessToken = jwt.sign(tokenPrincipal, jwtSecret(), { expiresIn: '5m' });
  const request: RequestStub = {
    headers: { authorization: `Bearer ${accessToken}` },
    method: 'GET',
    url: '/api/orders',
    ...input.request
  };
  const reflector = {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === REQUIRED_PERMISSION) return input.permission;
      if (key === REQUIRED_AUTH) return input.authRequired ?? true;
      if (key === REQUIRED_PERMISSION_MODE) return input.permissionMode;
      return undefined;
    })
  } as unknown as Reflector;
  const recordPermissionDenied = vi.fn(async () => undefined);
  const sessions = {
    hydrateCurrentSession: vi.fn(input.hydrate ?? (async (principal: Principal) => {
      principal.username = 'current-name';
      return input.currentPermissions ?? [];
    })),
    recordPermissionDenied
  } as unknown as AuthSessionService;
  return { guard: new RbacGuard(reflector, sessions), request, sessions, recordPermissionDenied };
}

describe('RbacGuard current session characterization', () => {
  it('keeps a valid token authorized by current permissions rather than token snapshots', async () => {
    const state = setup({
      permission: 'business:shipment:detail',
      currentPermissions: ['business:shipment:detail']
    });
    const context = contextFor(state.request);

    await expect(state.guard.canActivate(context)).resolves.toBe(true);
    expect(state.request.user?.username).toBe('current-name');
    expect(state.request.user?.warehouseScopeFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(state.sessions.hydrateCurrentSession).toHaveBeenCalledOnce();
  });

  it('rejects missing, forged, and expired bearer tokens with 401', async () => {
    const missing = setup({ request: { headers: {} } });
    await expect(missing.guard.canActivate(contextFor(missing.request))).rejects.toBeInstanceOf(UnauthorizedException);

    const forged = setup({ request: { headers: { authorization: 'Bearer forged' } } });
    await expect(forged.guard.canActivate(contextFor(forged.request))).rejects.toBeInstanceOf(UnauthorizedException);

    const expiredToken = jwt.sign({ id: 'user-1', username: 'old-name', role: 'UG_BUSINESS' }, jwtSecret(), { expiresIn: -1 });
    const expired = setup({ request: { headers: { authorization: `Bearer ${expiredToken}` } } });
    await expect(expired.guard.canActivate(contextFor(expired.request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('converts a disabled or missing current account into the existing 401 response', async () => {
    const state = setup({ hydrate: async () => { throw new UnauthorizedException('账号已停用或不存在'); } });

    await expect(state.guard.canActivate(contextFor(state.request))).rejects.toMatchObject({
      status: 401,
      response: { message: '登录凭证无效' }
    });
  });

  it('keeps forced-password users blocked outside the existing bootstrap paths', async () => {
    const blocked = setup({ hydrate: async (principal) => {
      principal.mustChangePassword = true;
      return [];
    } });
    await expect(blocked.guard.canActivate(contextFor(blocked.request))).rejects.toBeInstanceOf(ForbiddenException);

    const allowed = setup({
      hydrate: async (principal) => {
        principal.mustChangePassword = true;
        return [];
      },
      request: { method: 'POST', url: '/api/auth/change-password' }
    });
    await expect(allowed.guard.canActivate(contextFor(allowed.request))).resolves.toBe(true);
  });

  it('keeps current permission denial and best-effort audit behavior', async () => {
    const state = setup({ permission: 'business:shipment:detail', currentPermissions: [] });

    await expect(state.guard.canActivate(contextFor(state.request))).rejects.toBeInstanceOf(ForbiddenException);
    expect(state.recordPermissionDenied).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', username: 'current-name' }),
      { permissions: ['business:shipment:detail'], method: 'GET', path: '/api/orders' }
    );
  });
});

function contextFor(request: RequestStub): ExecutionContext {
  return {
    getHandler: () => setup,
    getClass: () => RbacGuard,
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
}
