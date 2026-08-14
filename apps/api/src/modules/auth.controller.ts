import { BadRequestException, Body, Controller, Get, HttpException, HttpStatus, Inject, Post, Put, UnauthorizedException, Req } from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaRepository } from './prisma.repository.js';
import { RequireAuth, RequirePermission } from './require-permission.decorator.js';
import { jwtSecret } from './rbac.guard.js';
import { createPrincipalScopeFingerprint, type Principal } from './rbac.js';

const captchaStore = new Map<string, { codeHash: Buffer; expiresAt: number }>();
const captchaRateBuckets = new Map<string, RateBucket>();
const loginRateBuckets = new Map<string, RateBucket>();
const captchaTtlMs = 3 * 60 * 1000;
const captchaStoreMaxEntries = 5_000;
const rateBucketMaxEntries = 20_000;
const captchaRateLimit = { limit: 300, windowMs: 60 * 1000 };
const loginIpRateLimit = { limit: 300, windowMs: 5 * 60 * 1000 };
const loginAccountRateLimit = { limit: 10, windowMs: 5 * 60 * 1000 };

type RateBucket = { count: number; expiresAt: number };

@Controller('auth')
export class AuthController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('captcha')
  captcha(@Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string }) {
    enforceCaptchaRateLimit(getRequestIp(request));
    cleanupExpiredCaptchas();
    const code = randomCaptchaCode();
    const captchaId = randomUUID();
    trimMapToCapacity(captchaStore, captchaStoreMaxEntries);
    captchaStore.set(captchaId, { codeHash: hashCaptchaCode(captchaId, code), expiresAt: Date.now() + captchaTtlMs });

    return {
      captchaId,
      image: createCaptchaSvgDataUri(code)
    };
  }

  @Post('login')
  async login(
    @Req() request: { headers: Record<string, string | string[] | undefined>; ip?: string },
    @Body() body: { username?: unknown; password?: unknown; captchaId?: unknown; captchaCode?: unknown }
  ) {
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const captchaId = typeof body.captchaId === 'string' ? body.captchaId : undefined;
    const captchaCode = typeof body.captchaCode === 'string' ? body.captchaCode : undefined;
    const loginMeta = {
      ip: getRequestIp(request),
      userAgent: getHeaderValue(request.headers['user-agent'])
    };
    const loginAccountRateKey = enforceLoginRateLimit(loginMeta.ip, username);
    if (shouldValidateLoginCaptcha()) {
      try {
        validateCaptcha(captchaId, captchaCode);
      } catch (error) {
        await (this.repository as any).recordLoginFailure?.({ username, ...loginMeta }).catch(() => undefined);
        throw error;
      }
    }

    const account = await this.repository.findAccount(username, password);

    if (!account) {
      await (this.repository as any).recordLoginFailure?.({ username, ...loginMeta }).catch(() => undefined);
      throw new UnauthorizedException('用户名或密码错误');
    }

    const principal: Principal = {
      id: account.id,
      username: account.username,
      role: account.role,
      assignedRole: account.assignedRole,
      site: account.site,
      customerId: account.customerId,
      name: account.name,
      phone: account.phone,
      gender: account.gender,
      nickname: account.nickname,
      mustChangePassword: account.mustChangePassword
    };
    const permissions = await this.repository.getPermissionsForRole(account.assignedRole ?? account.role);
    principal.dataScope = permissions.includes('data-scope:sales-own') ? 'SALES_OWN' : undefined;
    principal.warehouseScopeFingerprint = createPrincipalScopeFingerprint(principal, permissions, jwtSecret());
    await this.repository.recordLoginLog(principal, loginMeta);
    loginRateBuckets.delete(loginAccountRateKey);

    return {
      accessToken: jwt.sign(principal, jwtSecret(), { expiresIn: '8h' }),
      user: principal,
      permissions
    };
  }

  @Get('me')
  @RequireAuth()
  me(@Req() request: { user: Principal }) {
    return this.repository.getProfile(request.user);
  }

  @Get('session')
  @RequireAuth()
  async session(@Req() request: { user: Principal }) {
    const user = await this.repository.getProfile(request.user);
    const permissions = await this.repository.getPermissionsForRole(user.assignedRole ?? user.role);
    user.dataScope = permissions.includes('data-scope:sales-own') ? 'SALES_OWN' : undefined;
    user.warehouseScopeFingerprint = request.user.warehouseScopeFingerprint;
    return { user, permissions };
  }

  @Put('profile')
  @RequireAuth()
  async updateProfile(@Req() request: { user: Principal }, @Body() body: { name?: string; phone?: string; gender?: string; nickname?: string }) {
    const profile = await this.repository.updateProfile(request.user, {
      name: body?.name,
      phone: body?.phone,
      gender: body?.gender,
      nickname: body?.nickname
    });
    const hydratedScopePrincipal = { ...request.user, ...profile };
    try {
      const permissions = await this.repository.hydratePrincipalDepartmentScope(hydratedScopePrincipal);
      profile.warehouseScopeFingerprint = createPrincipalScopeFingerprint(hydratedScopePrincipal, permissions, jwtSecret());
    } catch {
      // The profile write already succeeded. Return a one-time opaque boundary
      // so the client cannot keep using a cache derived from the old scope;
      // the next authenticated session refresh will replace it with HMAC data.
      profile.warehouseScopeFingerprint = `scope-refresh-required:${randomUUID()}`;
    }
    return profile;
  }

  @Get('login-logs')
  @RequireAuth()
  loginLogs(@Req() request: { user: Principal }) {
    return this.repository.getLoginLogs(request.user);
  }

  @Get('account-events')
  @RequireAuth()
  accountEvents(@Req() request: { user: Principal }) {
    return this.repository.getAccountEvents(request.user);
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
  return getHeaderValue(request.headers['x-real-ip'])
    || getHeaderValue(request.headers['x-forwarded-for'])?.split(',').at(-1)?.trim()
    || request.ip
    || '未知';
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function randomCaptchaCode() {
  const chars = '23456789';
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
  const candidateHash = hashCaptchaCode(captchaId, captchaCode.trim());
  if (record.codeHash.length !== candidateHash.length || !timingSafeEqual(record.codeHash, candidateHash)) {
    throw new BadRequestException('验证码不正确，请重新输入');
  }
}

function cleanupExpiredCaptchas() {
  const now = Date.now();
  for (const [id, record] of captchaStore.entries()) {
    if (record.expiresAt >= now) break;
    captchaStore.delete(id);
  }
}

function createCaptchaSvgDataUri(code: string) {
  const rotations = randomBytes(code.length);
  const glyphs = code.split('')
    .map((digit, index) => {
      const segments = captchaDigitSegments[digit] ?? [];
      const path = segments.map((segment) => captchaSegmentPaths[segment]).join(' ');
      const x = 14 + index * 28;
      const rotate = (rotations[index] % 13) - 6;
      return `<g transform="translate(${x} 7) rotate(${rotate} 10 18)"><path d="${path}"/></g>`;
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
    <g fill="none" stroke="#102033" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">${glyphs}</g>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const captchaSegmentPaths = {
  a: 'M4 2 L18 2',
  b: 'M19 4 L17 17',
  c: 'M16 21 L14 34',
  d: 'M3 36 L14 36',
  e: 'M2 21 L4 34',
  f: 'M3 4 L5 17',
  g: 'M5 19 L17 19'
} as const;

type CaptchaSegment = keyof typeof captchaSegmentPaths;

const captchaDigitSegments: Record<string, CaptchaSegment[]> = {
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g']
};

function hashCaptchaCode(captchaId: string, code: string) {
  return createHash('sha256').update(`${captchaId}:${code.toLowerCase()}`).digest();
}

function enforceCaptchaRateLimit(ip: string) {
  if (!shouldApplyAuthRateLimit()) return;
  consumeRateLimit(captchaRateBuckets, `captcha:${ip}`, captchaRateLimit.limit, captchaRateLimit.windowMs);
}

function enforceLoginRateLimit(ip: string, username?: string) {
  const accountKey = `login-account:${ip}:${username?.trim().toLowerCase() || 'empty'}`;
  if (!shouldApplyAuthRateLimit()) return accountKey;
  consumeRateLimit(loginRateBuckets, `login-ip:${ip}`, loginIpRateLimit.limit, loginIpRateLimit.windowMs);
  consumeRateLimit(loginRateBuckets, accountKey, loginAccountRateLimit.limit, loginAccountRateLimit.windowMs);
  return accountKey;
}

function shouldApplyAuthRateLimit() {
  return process.env.NODE_ENV !== 'test';
}

export function consumeRateLimit(store: Map<string, RateBucket>, key: string, limit: number, windowMs: number, now = Date.now()) {
  pruneExpiredRateBuckets(store, now);
  const current = store.get(key);
  if (!current || current.expiresAt <= now) {
    trimMapToCapacity(store, rateBucketMaxEntries);
    store.set(key, { count: 1, expiresAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
  }
  current.count += 1;
}

function pruneExpiredRateBuckets(store: Map<string, RateBucket>, now: number) {
  let checked = 0;
  for (const [key, bucket] of store.entries()) {
    if (bucket.expiresAt <= now) store.delete(key);
    checked += 1;
    if (checked >= 64) break;
  }
}

function trimMapToCapacity<T>(store: Map<string, T>, maxEntries: number) {
  while (store.size >= maxEntries) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (oldestKey === undefined) return;
    store.delete(oldestKey);
  }
}
