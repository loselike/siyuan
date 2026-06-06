import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { RequirePermission } from './require-permission.decorator.js';
import type { Principal } from './rbac.js';
import { AiService, type AiAssistRequest } from './ai.service.js';

@Controller('ai')
export class AiController {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  @Post('assist')
  @RequirePermission('shipments:read')
  async assist(@Req() _request: { user: Principal }, @Body() body: AiAssistRequest) {
    return this.aiService.assist(body);
  }
}
