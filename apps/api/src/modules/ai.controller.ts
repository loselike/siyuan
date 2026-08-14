import { Body, Controller, ForbiddenException, Inject, Post, Req } from '@nestjs/common';
import { RequireAuth } from './require-permission.decorator.js';
import type { Principal } from './rbac.js';
import { AiService, type AiAssistRequest } from './ai.service.js';
import { PrismaRepository } from './prisma.repository.js';
import { maskGlobalSensitiveAiContext } from './global-field-mask.interceptor.js';

@Controller('ai')
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(PrismaRepository) private readonly repository: PrismaRepository
  ) {}

  @Post('assist')
  @RequireAuth()
  async assist(@Req() request: { user: Principal; method?: string; url?: string }, @Body() body: AiAssistRequest) {
    const requiredPermission = body.module === '运营工作台'
      ? 'operations:ai-queue:assist'
      : body.module === '业务管理'
        ? 'business:order-ai:assist'
        : 'operations:ai-queue:assist';
    if (!await this.repository.hasPermission(request.user.role, requiredPermission)) {
      await this.repository.recordPermissionDenied(request.user, {
        permissions: [requiredPermission],
        method: request.method,
        path: request.url
      });
      throw new ForbiddenException('没有调用当前业务场景 AI 的权限');
    }
    const canUseFinanceContext = body.module !== '业务管理'
      || await this.repository.hasPermission(request.user.role, 'business:order-ai:finance-context');
    const canUseAllOrderContext = body.module !== '业务管理'
      || await this.repository.hasPermission(request.user.role, 'business:order-ai:all-order-context');
    const permissionScopedContext = this.sanitizeBusinessContext(body.context, { canUseFinanceContext, canUseAllOrderContext });
    const context = maskGlobalSensitiveAiContext(permissionScopedContext, request.user.globalFieldMasks);
    return this.aiService.assist({ ...body, context });
  }

  private sanitizeBusinessContext(
    context: AiAssistRequest['context'],
    options: { canUseFinanceContext: boolean; canUseAllOrderContext: boolean }
  ) {
    if (!context || options.canUseFinanceContext && options.canUseAllOrderContext) return context;
    const blocked = /payable|receivable|profit|margin|cost|bank|voucher|payment|应付|应收|利润|成本|银行|水单|付款/i;
    const sanitize = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(sanitize);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value as Record<string, unknown>)
        .filter(([key]) => options.canUseFinanceContext || !blocked.test(key))
        .filter(([key]) => options.canUseAllOrderContext || !/allOrders|allShipments|customers|customerContacts/i.test(key))
        .map(([key, item]) => [key, sanitize(item)]));
    };
    return sanitize(context) as AiAssistRequest['context'];
  }
}
