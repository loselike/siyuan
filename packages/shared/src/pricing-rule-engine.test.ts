import { describe, expect, it } from 'vitest';
import {
  CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE,
  canadaAddressTypeMatchesWarehouseCode,
  matchWarehouseCodeRule,
  sanitizePricingChannelRequirement,
  sanitizePricingTransitLabel
} from './pricing-rule-engine.js';

describe('pricing rule engine', () => {
  it('extracts a customer-facing transit promise without pricing ladders', () => {
    expect(sanitizePricingTransitLabel('有ERS加急服务 开船后32-38天 1:200优惠0.2RMB/KG 1:250优惠0.5RMB/KG'))
      .toBe('开船后32-38天');
    expect(sanitizePricingTransitLabel('1:300报价-2: 1:500报价-3 7-8个工作日提取 亚马逊标签需留空'))
      .toBe('7-8个工作日提取');
  });

  it('removes supplier identities and contact rows from channel requirements', () => {
    const requirement = [
      '深圳市派格福通货运代理有限公司 Shen zhen PAGO LOGISTICS Co.,Ltd；仅接受普货。',
      '联系人：肖国庆 15889427490',
      '备注：提前预约客户。'
    ].join('\n');
    expect(sanitizePricingChannelRequirement(requirement, ['派格']))
      .toBe('仅接受普货。\n备注：提前预约客户。');
  });

  it('keeps Canada private and Amazon warehouse scopes mutually exclusive', () => {
    expect(canadaAddressTypeMatchesWarehouseCode(CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE, 'PRIVATE')).toBe(true);
    expect(canadaAddressTypeMatchesWarehouseCode('YVR+YXX2', 'PRIVATE')).toBe(false);
    expect(canadaAddressTypeMatchesWarehouseCode('YVR+YXX2', 'AMAZON', 'YVR')).toBe(true);
    expect(canadaAddressTypeMatchesWarehouseCode('YVR+YXX2', 'AMAZON', 'YYZ')).toBe(false);
    expect(canadaAddressTypeMatchesWarehouseCode('YVR+YXX2', 'AMAZON')).toBe(false);
    expect(matchWarehouseCodeRule('YYZ1-YYZ3', 'YYZ2')).toBe(0);
  });
});
