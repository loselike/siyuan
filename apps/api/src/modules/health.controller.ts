import { Body, Controller, Get, Logger, Post, Req } from '@nestjs/common';
import { RequireAuth } from './require-permission.decorator.js';
import type { Principal } from './rbac.js';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get('health')
  health() {
    return {
      ok: true,
      service: 'siyuan-api',
      releaseId: process.env.RELEASE_ID?.trim() || 'local-dev'
    };
  }

  @Post('system/client-errors')
  @RequireAuth()
  reportClientError(
    @Req() request: { user: Principal },
    @Body() body: {
      errorId?: unknown;
      route?: unknown;
      releaseId?: unknown;
      menuKey?: unknown;
      sectionKey?: unknown;
      message?: unknown;
      stack?: unknown;
      componentStack?: unknown;
    }
  ) {
    const compact = (value: unknown, limit: number) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit);
    const event = {
      errorId: compact(body.errorId, 80) || 'missing-id',
      route: compact(body.route, 240) || 'unknown-route',
      releaseId: compact(body.releaseId, 120) || 'unknown-release',
      menuKey: compact(body.menuKey, 80) || 'unknown-menu',
      sectionKey: compact(body.sectionKey, 120) || 'unknown-section',
      message: compact(body.message, 1000) || 'unknown-render-error',
      stack: compact(body.stack, 6000),
      componentStack: compact(body.componentStack, 3000),
      username: request.user.username,
      role: request.user.role
    };
    this.logger.error(`client-render-error ${JSON.stringify(event)}`);
    return { ok: true as const };
  }
}
