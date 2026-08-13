import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { PrismaRepository } from './prisma.repository.js';
import { REQUIRED_AUTH, REQUIRED_PERMISSION, REQUIRED_PERMISSION_MODE } from './require-permission.decorator.js';
import { hasEffectivePricingCapability } from '@siyuan/shared';
import { type PermissionKey, type Principal } from './rbac.js';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaRepository) private readonly repository: PrismaRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<PermissionKey | PermissionKey[] | undefined>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass()
    ]);
    const authRequired = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRED_AUTH, [
      context.getHandler(),
      context.getClass()
    ]);
    const permissionMode = this.reflector.getAllAndOverride<'any' | 'all' | undefined>(REQUIRED_PERMISSION_MODE, [
      context.getHandler(), context.getClass()
    ]) ?? 'any';

    if (!permission && !authRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: Principal; method?: string; url?: string }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少登录凭证');
    }

    try {
      const principal = jwt.verify(authorization.slice(7), jwtSecret()) as Principal;
      const effectivePermissions = await this.repository.hydratePrincipalDepartmentScope(principal);
      request.user = principal;

      if (principal.mustChangePassword && !isPasswordBootstrapRequest(request.method, request.url)) {
        throw new ForbiddenException('请先修改初始密码');
      }

      if (!permission) {
        return true;
      }

      const permissions = Array.isArray(permission) ? permission : [permission];
      const granted = permissionMode === 'all'
        ? permissions.every((item) => hasEffectivePricingCapability(effectivePermissions, item) || effectivePermissions.includes(item))
        : permissions.some((item) => hasEffectivePricingCapability(effectivePermissions, item) || effectivePermissions.includes(item));
      if (!granted) {
        await (this.repository as any).recordPermissionDenied?.(principal, {
          permissions,
          method: request.method,
          path: request.url
        }).catch(() => undefined);
        throw new ForbiddenException('没有访问权限');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('登录凭证无效');
    }
  }
}

export function isPasswordBootstrapRequest(method?: string, rawPath?: string): boolean {
  const path = rawPath?.split('?')[0];
  return (method === 'POST' && path === '/api/auth/change-password')
    || (method === 'GET' && ['/api/auth/me', '/api/auth/session'].includes(path ?? ''));
}

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return 'dev-secret';
}
