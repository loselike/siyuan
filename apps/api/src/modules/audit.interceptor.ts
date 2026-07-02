import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { PrismaRepository } from './prisma.repository.js';
import type { Principal } from './rbac.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<{ method?: string; url?: string; user?: Principal }>();
    if (!shouldAuditRequest(request.method, request.url)) {
      return next.handle();
    }

    const startedAt = Date.now();
    return next.handle().pipe(
      tap(() => {
        void this.record(request, 'SUCCESS', startedAt);
      }),
      catchError((error) => {
        void this.record(request, 'FAILED', startedAt, '请求失败');
        return throwError(() => error);
      })
    );
  }

  private async record(
    request: { method?: string; url?: string; user?: Principal },
    result: 'SUCCESS' | 'FAILED',
    startedAt: number,
    errorMessage?: string
  ) {
    const principal = request.user;
    if (!principal) return;
    await (this.repository as any).recordHttpAudit?.(principal, {
      method: request.method ?? 'UNKNOWN',
      path: request.url ?? '',
      result,
      durationMs: Date.now() - startedAt,
      errorMessage
    }).catch(() => undefined);
  }
}

function shouldAuditRequest(method?: string, url?: string) {
  const normalizedMethod = method?.toUpperCase();
  const path = url ?? '';
  if (path.startsWith('/api/auth/login') || path.startsWith('/auth/login')) return false;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod ?? '')) return true;
  return /(?:^|\/)(export|import)(?:\/|$|\?)/i.test(path);
}
