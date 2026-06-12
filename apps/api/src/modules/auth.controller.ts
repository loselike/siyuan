import { Body, Controller, Get, Inject, Post, UnauthorizedException, Req } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { PrismaRepository } from './prisma.repository.js';
import { RequirePermission } from './require-permission.decorator.js';
import { jwtSecret } from './rbac.guard.js';
import type { Principal } from './rbac.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Post('login')
  async login(@Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }, @Body() body: { username?: string; password?: string }) {
    const account = await this.repository.findAccount(body.username ?? '', body.password ?? '');

    if (!account) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const principal: Principal = {
      id: account.id,
      username: account.username,
      role: account.role,
      customerId: account.customerId
    };
    await this.repository.recordLoginLog(principal, {
      ip: getRequestIp(request),
      userAgent: getHeaderValue(request.headers['user-agent'])
    });

    const permissions = await this.repository.getPermissionsForRole(account.role);

    return {
      accessToken: jwt.sign(principal, jwtSecret(), { expiresIn: '8h' }),
      user: principal,
      permissions
    };
  }

  @Get('me')
  @RequirePermission('workspace:access')
  me(@Req() request: { user?: Principal }) {
    return request.user;
  }

  @Get('login-logs')
  @RequirePermission('workspace:access')
  loginLogs(@Req() request: { user: Principal }) {
    return this.repository.getLoginLogs(request.user);
  }

  @Post('change-password')
  @RequirePermission('workspace:access')
  changePassword(@Req() request: { user: Principal }, @Body() body: { currentPassword?: string; newPassword?: string }) {
    return this.repository.changePassword(request.user, body);
  }
}

function getRequestIp(request: { headers: Record<string, string | string[] | undefined>; ip?: string }) {
  const forwardedFor = getHeaderValue(request.headers['x-forwarded-for']);
  return forwardedFor?.split(',')[0]?.trim() || getHeaderValue(request.headers['x-real-ip']) || request.ip || '未知';
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
