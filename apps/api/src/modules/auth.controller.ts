import { BadRequestException, Body, Controller, Get, Inject, Post, Put, UnauthorizedException, Req } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaRepository } from './prisma.repository.js';
import { RequireAuth, RequirePermission } from './require-permission.decorator.js';
import { jwtSecret } from './rbac.guard.js';
import type { Principal } from './rbac.js';

const captchaStore = new Map<string, { code: string; expiresAt: number }>();
const captchaTtlMs = 3 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('captcha')
  captcha() {
    cleanupExpiredCaptchas();
    const code = randomCaptchaCode();
    const captchaId = randomUUID();
    captchaStore.set(captchaId, { code, expiresAt: Date.now() + captchaTtlMs });

    return {
      captchaId,
      image: createCaptchaSvgDataUri(code)
    };
  }

  @Post('login')
  async login(
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string },
    @Body() body: { username?: string; password?: string; captchaId?: string; captchaCode?: string }
  ) {
    const loginMeta = {
      ip: getRequestIp(request),
      userAgent: getHeaderValue(request.headers['user-agent'])
    };
    if (shouldValidateLoginCaptcha()) {
      try {
        validateCaptcha(body.captchaId, body.captchaCode);
      } catch (error) {
        await (this.repository as any).recordLoginFailure?.({ username: body.username, ...loginMeta }).catch(() => undefined);
        throw error;
      }
    }

    const account = await this.repository.findAccount(body.username ?? '', body.password ?? '');

    if (!account) {
      await (this.repository as any).recordLoginFailure?.({ username: body.username, ...loginMeta }).catch(() => undefined);
      throw new UnauthorizedException('用户名或密码错误');
    }

    const principal: Principal = {
      id: account.id,
      username: account.username,
      role: account.role,
      customerId: account.customerId,
      name: account.name,
      phone: account.phone,
      gender: account.gender,
      nickname: account.nickname,
      mustChangePassword: account.mustChangePassword
    };
    await this.repository.recordLoginLog(principal, loginMeta);

    const permissions = await this.repository.getPermissionsForRole(account.role);

    return {
      accessToken: jwt.sign(principal, jwtSecret(), { expiresIn: '8h' }),
      user: principal,
      permissions
    };
  }

  @Get('me')
  @RequirePermission('workspace:access')
  me(@Req() request: { user: Principal }) {
    return this.repository.getProfile(request.user);
  }

  @Put('profile')
  @RequirePermission('workspace:access')
  updateProfile(@Req() request: { user: Principal }, @Body() body: { name?: string; phone?: string; gender?: string; nickname?: string }) {
    return this.repository.updateProfile(request.user, body);
  }

  @Get('login-logs')
  @RequirePermission('workspace:access')
  loginLogs(@Req() request: { user: Principal }) {
    return this.repository.getLoginLogs(request.user);
  }

  @Post('change-password')
  @RequireAuth()
  changePassword(@Req() request: { user: Principal }, @Body() body: { currentPassword?: string; newPassword?: string }) {
    return this.repository.changePassword(request.user, body);
  }
}

function shouldValidateLoginCaptcha() {
  return process.env.NODE_ENV !== 'test' && process.env.DISABLE_LOGIN_CAPTCHA !== 'true';
}

function getRequestIp(request: { headers: Record<string, string | string[] | undefined>; ip?: string }) {
  const forwardedFor = getHeaderValue(request.headers['x-forwarded-for']);
  return forwardedFor?.split(',')[0]?.trim() || getHeaderValue(request.headers['x-real-ip']) || request.ip || '未知';
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function randomCaptchaCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(4);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

function validateCaptcha(captchaId?: string, captchaCode?: string) {
  cleanupExpiredCaptchas();
  if (!captchaId || !captchaCode?.trim()) {
    throw new BadRequestException('请输入图片验证码');
  }

  const record = captchaStore.get(captchaId);
  captchaStore.delete(captchaId);

  if (!record || record.expiresAt < Date.now()) {
    throw new BadRequestException('验证码已过期，请刷新后重试');
  }
  if (record.code.toLowerCase() !== captchaCode.trim().toLowerCase()) {
    throw new BadRequestException('验证码不正确，请重新输入');
  }
}

function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (record.expiresAt < now) {
      captchaStore.delete(id);
    }
  }
}

function createCaptchaSvgDataUri(code: string) {
  const chars = code.split('');
  const text = chars
    .map((char, index) => {
      const x = 18 + index * 25;
      const y = 36 + (index % 2 === 0 ? -2 : 3);
      const rotate = [-9, 7, -4, 8][index] ?? 0;
      return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
    })
    .join('');
  const noise = Array.from({ length: 8 }, (_, index) => {
    const x1 = 8 + index * 14;
    const y1 = 14 + ((index * 9) % 31);
    const x2 = x1 + 18;
    const y2 = 10 + ((index * 13) % 36);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="52" viewBox="0 0 132 52" role="img" aria-label="图片验证码">
    <rect width="132" height="52" rx="8" fill="#f4f7fb"/>
    <path d="M8 36 C32 12, 54 48, 82 20 S115 42, 126 18" fill="none" stroke="#8fb3ff" stroke-width="2" opacity=".65"/>
    <g stroke="#b8c8dc" stroke-width="1" opacity=".55">${noise}</g>
    <g font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="25" font-weight="800" fill="#102033" letter-spacing="3">${text}</g>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
