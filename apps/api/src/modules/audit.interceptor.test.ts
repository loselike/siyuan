import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HttpAuditDispatcher } from './audit/http-audit.dispatcher.js';
import { AuditInterceptor } from './audit.interceptor.js';
import type { Principal } from './rbac.js';

const principal = { id: 'u-1', role: 'ADMIN', username: 'admin' } as Principal;

describe('AuditInterceptor contract', () => {
  it('returns the original success response and delegates the unchanged request metadata', async () => {
    const dispatcher = { enqueue: vi.fn() } as unknown as HttpAuditDispatcher;
    const interceptor = new AuditInterceptor(dispatcher);
    const response = { id: 'package-1', status: 'RECEIVED' };

    const result = await firstValueFrom(interceptor.intercept(
      contextFor({
        method: 'POST',
        url: '/api/warehouse/packages?site=SZ',
        user: principal,
        headers: {
          'x-forwarded-for': '203.0.113.10, 10.0.0.1',
          'user-agent': 'Sunny contract test'
        }
      }),
      { handle: () => of(response) } as CallHandler
    ));

    expect(result).toBe(response);
    expect(dispatcher.enqueue).toHaveBeenCalledWith(principal, expect.objectContaining({
      id: expect.any(String),
      method: 'POST',
      path: '/api/warehouse/packages?site=SZ',
      result: 'SUCCESS',
      ipAddress: '203.0.113.10',
      userAgent: 'Sunny contract test'
    }));
  });

  it('preserves the original error while dispatching the existing generic failure audit', async () => {
    const dispatcher = { enqueue: vi.fn() } as unknown as HttpAuditDispatcher;
    const interceptor = new AuditInterceptor(dispatcher);
    const error = new Error('business failure');

    await expect(firstValueFrom(interceptor.intercept(
      contextFor({ method: 'DELETE', url: '/api/warehouse/packages/p-1', user: principal }),
      { handle: () => throwError(() => error) } as CallHandler
    ))).rejects.toBe(error);

    expect(dispatcher.enqueue).toHaveBeenCalledWith(principal, expect.objectContaining({
      id: expect.any(String),
      method: 'DELETE',
      path: '/api/warehouse/packages/p-1',
      result: 'FAILED',
      errorMessage: '请求失败'
    }));
  });

  it('keeps login and ordinary reads outside HTTP audit dispatch', async () => {
    const dispatcher = { enqueue: vi.fn() } as unknown as HttpAuditDispatcher;
    const interceptor = new AuditInterceptor(dispatcher);

    await firstValueFrom(interceptor.intercept(
      contextFor({ method: 'POST', url: '/api/auth/login', user: principal }),
      { handle: () => of({ token: 'unchanged' }) } as CallHandler
    ));
    await firstValueFrom(interceptor.intercept(
      contextFor({ method: 'GET', url: '/api/warehouse/packages', user: principal }),
      { handle: () => of([]) } as CallHandler
    ));

    expect(dispatcher.enqueue).not.toHaveBeenCalled();
  });
});

function contextFor(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
}
