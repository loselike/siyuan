import { describe, expect, it, vi } from 'vitest';
import { PricingRuleQueryController } from './pricing-rule-query.controller.js';
import type { Principal } from '../rbac.js';

const principal: Principal = { id: 'admin-1', username: 'admin', role: 'ADMIN' };

describe('PricingRuleQueryController', () => {
  it('preserves pricing rule list and quote repository contracts', async () => {
    const repository = {
      getPricingRules: vi.fn().mockResolvedValue([{ id: 'rule-1' }]),
      quotePricingRule: vi.fn().mockResolvedValue({ rule: { id: 'rule-1' }, freight: 100 })
    };
    const controller = new PricingRuleQueryController(repository as never);
    const body = { channelId: 'ch-1', destinationCountry: '美国', chargeableWeightKg: 10 };

    await controller.pricingRules({ user: principal });
    await controller.quotePricingRule({ user: principal }, body);

    expect(repository.getPricingRules).toHaveBeenCalledWith(principal);
    expect(repository.quotePricingRule).toHaveBeenCalledWith(principal, body);
  });
});
