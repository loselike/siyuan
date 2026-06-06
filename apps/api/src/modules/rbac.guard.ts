import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { PrismaRepository } from './prisma.repository.js';
import { REQUIRED_PERMISSION } from './require-permission.decorator.js';
import { type PermissionKey, type Principal } from './rbac.js';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PrismaRepository) private readonly repository: PrismaRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<PermissionKey | undefined>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: Principal }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('缺少登录凭证');
    }

    try {
      const principal = jwt.verify(authorization.slice(7), jwtSecret()) as Principal;
      request.user = principal;

      if (!(await this.repository.hasPermission(principal.role, permission))) {
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

export function jwtSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-secret';
}
