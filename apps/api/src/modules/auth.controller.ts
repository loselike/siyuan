import { Body, Controller, Get, Inject, Post, UnauthorizedException, Req } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { InMemoryRepository } from './in-memory.repository.js';
import { RequirePermission } from './require-permission.decorator.js';
import { jwtSecret } from './rbac.guard.js';
import type { Principal } from './rbac.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(InMemoryRepository) private readonly repository: InMemoryRepository) {}

  @Post('login')
  login(@Body() body: { username?: string; password?: string }) {
    const account = this.repository.findAccount(body.username ?? '', body.password ?? '');

    if (!account) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const principal: Principal = {
      id: account.id,
      username: account.username,
      role: account.role,
      customerId: account.customerId
    };

    return {
      accessToken: jwt.sign(principal, jwtSecret(), { expiresIn: '8h' }),
      user: principal
    };
  }

  @Get('me')
  @RequirePermission('shipments:read')
  me(@Req() request: { user?: Principal }) {
    return request.user;
  }
}
