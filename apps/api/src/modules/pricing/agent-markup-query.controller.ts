import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { PrismaRepository } from '../prisma.repository.js';
import { RequirePermission } from '../require-permission.decorator.js';
import type { Principal } from '../rbac.js';

type AgentMarkupListQuery = NonNullable<Parameters<PrismaRepository['getAgentMarkupRules']>[1]>;

@Controller()
export class AgentMarkupQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('pricing/markup-rules')
  @RequirePermission(['pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:ukExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async agentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.getAgentMarkupRules(request.user, query);
  }

  @Get('pricing/markup-rules/export')
  @RequirePermission(['pricing:markup:amazon:export', 'pricing:markup:inquiry:export', 'pricing:markup:europeExpress:export', 'pricing:markup:ukExpress:export', 'pricing:markup:southAfrica:export', 'pricing:markup:usaAirSea:export', 'pricing:markup:canadaAirSea:export', 'pricing:markup:dubaiAirSea:export'])
  async exportAgentMarkupRules(@Req() request: { user: Principal }, @Query() query: AgentMarkupListQuery) {
    return this.repository.exportAgentMarkupRules(request.user, query);
  }

  @Get('pricing/markup-rules/:id/preview')
  @RequirePermission(['pricing:markup:amazon:view', 'pricing:markup:inquiry:view', 'pricing:markup:europeExpress:view', 'pricing:markup:ukExpress:view', 'pricing:markup:southAfrica:view', 'pricing:markup:usaAirSea:view', 'pricing:markup:canadaAirSea:view', 'pricing:markup:dubaiAirSea:view'])
  async previewAgentMarkupRule(@Req() request: { user: Principal }, @Param('id') id: string) {
    return this.repository.previewAgentMarkupRule(request.user, id);
  }
}
