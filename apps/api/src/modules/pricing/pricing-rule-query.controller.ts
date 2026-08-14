import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import { PrismaRepository } from '../prisma.repository.js';
import { RequireAllPermissions } from '../require-permission.decorator.js';
import type { Principal } from '../rbac.js';

type PricingRuleQuoteRequest = NonNullable<Parameters<PrismaRepository['quotePricingRule']>[1]>;

@Controller()
export class PricingRuleQueryController {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  @Get('pricing/rules')
  @RequireAllPermissions('pricing:markup:amazon:tier', 'pricing:markup:inquiry:tier', 'pricing:markup:europeExpress:tier', 'pricing:markup:southAfrica:tier', 'pricing:markup:usaAirSea:tier', 'pricing:markup:canadaAirSea:tier', 'pricing:markup:dubaiAirSea:tier')
  async pricingRules(@Req() request: { user: Principal }) {
    return this.repository.getPricingRules(request.user);
  }

  @Post('pricing/rules/quote')
  @RequireAllPermissions('pricing:lookup:amazon', 'pricing:lookup:europe-oversize', 'pricing:lookup:europe-express', 'pricing:lookup:south-africa', 'pricing:lookup:usa-air-sea', 'pricing:lookup:canada-air-sea', 'pricing:lookup:dubai-air-sea')
  async quotePricingRule(@Req() request: { user: Principal }, @Body() body: PricingRuleQuoteRequest) {
    return this.repository.quotePricingRule(request.user, body);
  }
}
