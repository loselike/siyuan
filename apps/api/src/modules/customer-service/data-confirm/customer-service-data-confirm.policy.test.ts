import type { CustomerServiceDataConfirmRow, Shipment } from '@siyuan/shared';
import { describe, expect, it } from 'vitest';
import {
  attachPrimaryAgentBilling,
  buildCustomerServiceDataConfirmRow,
  customerServiceDataAuditIsInCurrentCycle,
  isCustomerServiceDataApprovedFromRows,
  readCustomerServiceDataSnapshot,
  scopeCustomerServiceDataConfirmRow,
  validCustomerServiceDataCycleStart,
  type CustomerServiceDataAuditRow
} from './customer-service-data-confirm.policy.js';

const cycle = '2026-06-10T08:00:00.000Z';

function audit(action: string, createdAt: string, after?: unknown): CustomerServiceDataAuditRow {
  return { action, createdAt, after };
}

function fullShipment(): Shipment {
  return {
    id: 'shipment-1',
    createdAt: '2026-06-01T00:00:00.000Z',
    customerName: '客户',
    salesperson: '业务员',
    customerOrderNo: 'CO-1',
    systemOrderNo: 'SO-1',
    businessType: 'EXPRESS',
    packageType: 'WPX',
    destinationCountry: '美国',
    packageCount: 3,
    actualWeightKg: 20,
    weightKg: 20,
    volumeCbm: 0.2,
    receivableWeightKg: 22,
    chargeableWeightKg: 22,
    declarationRequired: true,
    sensitive: true,
    cargoDataSource: 'AUTO_MATCHED',
    chargeWeightOverridden: true,
    agentId: 'agent-1',
    agentName: '代理',
    agentWeightKg: 21,
    channelId: 'channel-1',
    channelName: '渠道',
    carrier: 'DHL',
    routeAgentChannelName: '代理线路',
    routeChargeWeightKg: 21,
    routeUnitPrice: 8,
    routeOtherFee: 2,
    routeCostTotal: 170,
    routeCurrency: 'RMB',
    routeCostSummary: {} as NonNullable<Shipment['routeCostSummary']>,
    latestTracking: '已出库',
    trackingStaleDays: 0,
    isRemoteArea: false,
    hasProblemTicket: false,
    status: 'OUTBOUNDED',
    outboundAt: cycle
  };
}

describe('customer service data confirm policy', () => {
  it('keeps the newest current-cycle approval or reversal decision', () => {
    const rows = [
      audit('customer_service.business_data.reversed', '2026-06-10T11:00:00.000Z', { dataConfirmationCycleStartedAt: cycle }),
      audit('customer_service.business_data.approved', '2026-06-10T10:00:00.000Z', { dataConfirmationCycleStartedAt: cycle }),
      audit('customer_service.business_data.approved', '2026-06-09T10:00:00.000Z', { dataConfirmationCycleStartedAt: '2026-06-09T08:00:00.000Z' })
    ];

    expect(isCustomerServiceDataApprovedFromRows(rows, 'business', cycle)).toBe(false);
    expect(isCustomerServiceDataApprovedFromRows(rows.slice(1), 'business', cycle)).toBe(true);
    expect(isCustomerServiceDataApprovedFromRows(rows, 'agent', cycle)).toBe(false);
  });

  it('keeps explicit-cycle and created-at fallback membership rules', () => {
    expect(customerServiceDataAuditIsInCurrentCycle(
      audit('x', '2026-06-11T00:00:00.000Z', { dataConfirmationCycleStartedAt: '2026-06-09T08:00:00.000Z' }),
      cycle
    )).toBe(false);
    expect(customerServiceDataAuditIsInCurrentCycle(audit('x', '2026-06-10T08:00:00.000Z'), cycle)).toBe(true);
    expect(customerServiceDataAuditIsInCurrentCycle(audit('x', '2026-06-10T07:59:59.999Z'), cycle)).toBe(false);
    expect(customerServiceDataAuditIsInCurrentCycle(audit('x', 'invalid'), undefined)).toBe(true);
  });

  it('reads only valid positive snapshots and preserves numeric-string compatibility', () => {
    const valid = audit('customer_service.business_data.updated', '2026-06-10T09:00:00.000Z', {
      dataConfirmationCycleStartedAt: cycle,
      snapshot: { packageCount: '4', weightKg: '23', volumeCbm: '0.3', chargeWeightKg: '24' }
    });
    expect(readCustomerServiceDataSnapshot([valid], 'business', cycle)).toEqual({
      packageCount: 4,
      weightKg: 23,
      volumeCbm: 0.3,
      chargeWeightKg: 24
    });
    expect(readCustomerServiceDataSnapshot([
      audit('customer_service.business_data.updated', '2026-06-10T09:00:00.000Z', {
        dataConfirmationCycleStartedAt: cycle,
        snapshot: { packageCount: 1.5, weightKg: 23, volumeCbm: 0.3, chargeWeightKg: 24 }
      })
    ], 'business', cycle)).toBeUndefined();
    expect(readCustomerServiceDataSnapshot([
      audit('customer_service.business_data.updated', '2026-06-10T09:00:00.000Z', {
        dataConfirmationCycleStartedAt: cycle,
        snapshot: { packageCount: 1, weightKg: 0, volumeCbm: 0.3, chargeWeightKg: 24 }
      })
    ], 'business', cycle)).toBeUndefined();
  });

  it('builds both review states and attaches primary agent billing without mutating the input', () => {
    const shipment = fullShipment();
    const rows = [
      audit('customer_service.business_data.approved', '2026-06-10T10:00:00.000Z', { dataConfirmationCycleStartedAt: cycle }),
      audit('customer_service.agent_data.reversed', '2026-06-10T10:00:00.000Z', { dataConfirmationCycleStartedAt: cycle })
    ];
    const row = buildCustomerServiceDataConfirmRow(shipment, rows);
    expect(row).toEqual(expect.objectContaining({ shipment, businessDataApproved: true, agentDataApproved: false }));
    expect(attachPrimaryAgentBilling(row)).toBe(row);
    const billed = attachPrimaryAgentBilling(row, { agentBillingQuantity: 21, agentBillingUnit: 'KG' });
    expect(billed).toEqual(expect.objectContaining({ agentBillingQuantity: 21, agentBillingUnit: 'KG' }));
    expect(row).not.toHaveProperty('agentBillingQuantity');
  });

  it('removes every agent field when only business data is visible', () => {
    const shipment = fullShipment();
    const row: CustomerServiceDataConfirmRow = {
      shipment,
      businessDataApproved: true,
      agentDataApproved: true,
      businessDataSnapshot: { packageCount: 3, weightKg: 20, volumeCbm: 0.2, chargeWeightKg: 22 },
      agentDataSnapshot: { packageCount: 3, weightKg: 21, volumeCbm: 0.2, chargeWeightKg: 21 },
      agentBillingQuantity: 21,
      agentBillingUnit: 'KG'
    };
    const scoped = scopeCustomerServiceDataConfirmRow(row, { canViewBusiness: true, canViewAgent: false });

    expect(scoped.businessDataApproved).toBe(true);
    expect(scoped).not.toHaveProperty('agentDataApproved');
    expect(scoped).not.toHaveProperty('agentBillingQuantity');
    for (const key of [
      'agentId', 'agentName', 'agentWeightKg', 'channelId', 'channelName', 'carrier', 'routeAgentChannelName',
      'routeChargeWeightKg', 'routeUnitPrice', 'routeOtherFee', 'routeCostTotal', 'routeCurrency', 'routeCostSummary'
    ]) {
      expect(scoped.shipment).not.toHaveProperty(key);
      expect(shipment).toHaveProperty(key);
    }
  });

  it('removes every business field when only agent data is visible', () => {
    const shipment = fullShipment();
    const row: CustomerServiceDataConfirmRow = {
      shipment,
      businessDataApproved: true,
      agentDataApproved: false,
      agentBillingQuantity: 21,
      agentBillingUnit: 'KG'
    };
    const scoped = scopeCustomerServiceDataConfirmRow(row, { canViewBusiness: false, canViewAgent: true });

    expect(scoped.agentDataApproved).toBe(false);
    expect(scoped).not.toHaveProperty('businessDataApproved');
    expect(scoped.agentBillingQuantity).toBe(21);
    for (const key of [
      'packageCount', 'actualWeightKg', 'weightKg', 'volumeCbm', 'receivableWeightKg', 'chargeableWeightKg',
      'declarationRequired', 'sensitive', 'cargoDataSource', 'chargeWeightOverridden'
    ]) {
      expect(scoped.shipment).not.toHaveProperty(key);
      expect(shipment).toHaveProperty(key);
    }
  });

  it('parses only valid cycle starts', () => {
    const date = new Date(cycle);
    expect(validCustomerServiceDataCycleStart(date)).toBe(date);
    expect(validCustomerServiceDataCycleStart(cycle)?.toISOString()).toBe(cycle);
    expect(validCustomerServiceDataCycleStart('invalid')).toBeUndefined();
    expect(validCustomerServiceDataCycleStart(null)).toBeUndefined();
  });
});
