import { describe, expect, it } from 'vitest';
import {
  assertGlobalFieldMaskRequestAllowed,
  isGlobalSensitiveFilePathBlocked,
  maskGlobalSensitiveValue
} from './global-field-mask.interceptor.js';
import {
  effectivePermissionsForRole,
  isPaymentVoucherGloballyMasked,
  resolveGlobalFieldMaskState,
  type PermissionKey
} from './rbac.js';

describe('global sensitive field deny baseline', () => {
  it('keeps shipment view controls while removing payable output fields', () => {
    const state = resolveGlobalFieldMaskState([
      'system:global-mask:payable-cost'
    ] as PermissionKey[]);

    expect(() => assertGlobalFieldMaskRequestAllowed(
      { costScope: 'routed' },
      state,
      '/api/shipments'
    )).not.toThrow();
    expect(maskGlobalSensitiveValue({
      id: 'shipment-1',
      costScope: 'routed',
      payableCostTotals: { RMB: 60 }
    }, state, '/api/shipments')).toEqual({
      id: 'shipment-1',
      costScope: 'routed'
    });
  });

  it('rejects masked writes without blocking unrelated updates', () => {
    const state = resolveGlobalFieldMaskState([
      'system:global-mask:agent-channel'
    ] as PermissionKey[]);

    expect(() => assertGlobalFieldMaskRequestAllowed(
      { routeAgentChannelName: 'masked-channel' },
      state,
      '/api/shipments/shipment-1/operational'
    )).toThrow('总规则已屏蔽该字段');
    expect(() => assertGlobalFieldMaskRequestAllowed(
      { transferNo: 'TRANSFER-001' },
      state,
      '/api/shipments/shipment-1/operational'
    )).not.toThrow();
  });

  it('keeps water-receipt vouchers available while denying payment vouchers', () => {
    const state = resolveGlobalFieldMaskState([
      'system:global-mask:payable-cost'
    ] as PermissionKey[]);
    const effective = effectivePermissionsForRole('UG_MASK_TEST', [
      'finance:water-receipt:voucher-upload',
      'finance:pending-payment:payment-voucher-upload',
      'finance:paid-payment:voucher-upload',
      'system:global-mask:payable-cost'
    ] as PermissionKey[]);

    expect(effective).toContain('finance:water-receipt:voucher-upload');
    expect(effective).not.toContain('finance:pending-payment:payment-voucher-upload');
    expect(effective).not.toContain('finance:paid-payment:voucher-upload');
    expect(isPaymentVoucherGloballyMasked(state)).toBe(true);
    expect(isGlobalSensitiveFilePathBlocked('/api/finance/voucher-images', state)).toBe(false);
  });

  it('preserves empty master-data collection contracts without exposing masked agent rows', () => {
    const state = resolveGlobalFieldMaskState([
      'system:global-mask:agent-data'
    ] as PermissionKey[]);

    expect(maskGlobalSensitiveValue({
      customers: [],
      agents: [],
      agentChannels: [],
      carriers: []
    }, state, '/api/master-data')).toEqual({
      customers: [],
      agents: [],
      agentChannels: [],
      carriers: []
    });
    expect(maskGlobalSensitiveValue({
      agents: [{ id: 'agent-1', name: 'masked-agent' }],
      agentChannels: [{ id: 'channel-1', name: 'masked-channel' }]
    }, state, '/api/master-data')).toEqual({});
  });
});
