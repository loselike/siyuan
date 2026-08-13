import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal } from '../rbac.js';
import { AuthSessionService, type AuthSessionRepository } from './auth-session.service.js';

describe('AuthSessionService', () => {
  it('delegates current-account hydration without changing its result or principal mutation', async () => {
    const repository: AuthSessionRepository = {
      hydratePrincipalDepartmentScope: vi.fn(async (principal) => {
        principal.username = 'current-name';
        return ['business:shipment:detail'] satisfies PermissionKey[];
      })
    };
    const principal: Principal = { id: 'user-1', username: 'token-name', role: 'UG_BUSINESS' };

    await expect(new AuthSessionService(repository).hydrateCurrentSession(principal))
      .resolves.toEqual(['business:shipment:detail']);
    expect(principal.username).toBe('current-name');
  });

  it('preserves repository authorization errors and optional denial audit behavior', async () => {
    const repository: AuthSessionRepository = {
      hydratePrincipalDepartmentScope: vi.fn(async () => {
        throw new UnauthorizedException('账号已停用或不存在');
      })
    };
    const principal: Principal = { id: 'user-1', username: 'token-name', role: 'UG_BUSINESS' };
    const service = new AuthSessionService(repository);

    await expect(service.hydrateCurrentSession(principal)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.recordPermissionDenied(principal, {
      permissions: ['business:shipment:detail'], method: 'GET', path: '/api/orders'
    })).resolves.toBeUndefined();
  });
});
