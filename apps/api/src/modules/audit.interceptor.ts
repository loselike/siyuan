import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { HttpAuditDispatcher } from './audit/http-audit.dispatcher.js';
import type { Principal } from './rbac.js';

type AuditRequest = {
  method?: string;
  url?: string;
  user?: Principal;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  connection?: { remoteAddress?: string };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(HttpAuditDispatcher) private readonly dispatcher: HttpAuditDispatcher) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    if (!shouldAuditRequest(request.method, request.url)) {
      return next.handle();
    }

    const startedAt = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.dispatch(request, 'SUCCESS', startedAt);
      }),
      catchError((error) => {
        this.dispatch(request, 'FAILED', startedAt, '请求失败');
        return throwError(() => error);
      })
    );
  }

  private dispatch(
    request: AuditRequest,
    result: 'SUCCESS' | 'FAILED',
    startedAt: number,
    errorMessage?: string
  ) {
    const principal = request.user;
    if (!principal) return;
    this.dispatcher.enqueue(principal, {
      id: randomUUID(),
      method: request.method ?? 'UNKNOWN',
      path: request.url ?? '',
      result,
      durationMs: Date.now() - startedAt,
      errorMessage,
      ipAddress: extractClientIp(request),
      userAgent: readFirstHeader(request.headers?.['user-agent'])
    });
  }
}

function shouldAuditRequest(method?: string, url?: string) {
  const normalizedMethod = method?.toUpperCase();
  const path = url ?? '';
  if (path.startsWith('/api/auth/login') || path.startsWith('/auth/login')) return false;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod ?? '')) return true;
  return /(?:^|\/)(export|import)(?:\/|$|\?)/i.test(path);
}

function readFirstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeClientIp(value?: string) {
  const candidate = value?.split(',')[0]?.trim().replace(/^::ffff:/, '');
  if (!candidate) return undefined;
  return /^[a-fA-F0-9:.]{3,45}$/.test(candidate) ? candidate : undefined;
}

function extractClientIp(request: AuditRequest) {
  return (
    sanitizeClientIp(readFirstHeader(request.headers?.['x-forwarded-for']))
    ?? sanitizeClientIp(readFirstHeader(request.headers?.['x-real-ip']))
    ?? sanitizeClientIp(request.ip)
    ?? sanitizeClientIp(request.socket?.remoteAddress)
    ?? sanitizeClientIp(request.connection?.remoteAddress)
  );
}
