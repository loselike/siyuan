import { describe, expect, it } from 'vitest';
import {
  projectMarketRoutingReportShipment,
  projectMarketShipment
} from './shipment-overview-query.policy.js';
import type { ShipmentOverviewRow } from './shipment-overview-query.repository.js';

const defaultProjectionKeys = [
  'id',
  'createdAt',
  'entryAt',
  'customerName',
  'customerId',
  'customerCode',
  'salesperson',
  'customerOrderNo',
  'outboundOrderNo',
  'systemOrderNo',
  'transferNo',
  'subOrderNo',
  'outboundAt',
  'productName',
  'declarationRequired',
  'sensitive',
  'cargoType',
  'volumeCbm',
  'actualWeightKg',
  'weightKg',
  'cargoDataSource',
  'chargeWeightOverridden',
  'businessReviewedAt',
  'reviewedAt',
  'etaAt',
  'etdAt',
  'businessType',
  'packageType',
  'destinationCountry',
  'carrier',
  'packageCount',
  'receivableWeightKg',
  'latestTracking',
  'latestTrackingUpdatedAt',
  'trackingStaleDays',
  'isRemoteArea',
  'status',
  'channelId',
  'channelName',
  'agentId',
  'agentName',
  'routedAt',
  'routeReturnedAt',
  'routeAgentChannelName',
  'agentReplacementCount',
  'agentChangeRequest',
  'warehouseOutboundRemark',
  'shippingMarkRequired',
  'hasProblemTicket',
  'site'
].sort();

const routeCostKeys = [
  'routeChargeWeightKg',
  'routeUnitPrice',
  'routeOtherFee',
  'routeCostTotal',
  'routeCurrency',
  'routeCostSummary'
];

const routingReportKeys = [
  'id',
  'createdAt',
  'customerName',
  'customerCode',
  'salesperson',
  'customerOrderNo',
  'systemOrderNo',
  'transferNo',
  'outboundAt',
  'declarationRequired',
  'sensitive',
  'businessType',
  'packageType',
  'destinationCountry',
  'carrier',
  'packageCount',
  'receivableWeightKg',
  'latestTracking',
  'trackingStaleDays',
  'isRemoteArea',
  'status',
  'channelName',
  'agentName',
  'routedAt',
  'routeReturnedAt',
  'routeAgentChannelName',
  ...routeCostKeys,
  'hasProblemTicket',
  'site'
].sort();

const source = {
  id: 'shipment-1',
  createdAt: '2026-08-20T00:00:00.000Z',
  status: 'WAITING_DEPARTURE',
  customerOrderNo: 'ORDER-1',
  latestTracking: '敏感轨迹',
  trackingStaleDays: 9,
  isRemoteArea: true,
  routeChargeWeightKg: 12,
  routeUnitPrice: 8,
  routeOtherFee: 3,
  routeCostTotal: 99,
  routeCurrency: 'USD',
  routeCostSummary: { currencyTotals: [] },
  hasProblemTicket: true,
  paymentAmountUsd: 100,
  grossProfit: 20,
  payables: []
} as unknown as ShipmentOverviewRow;

describe('shipment overview market projections', () => {
  it('keeps the default write-response projection key set exact', () => {
    const projected = projectMarketShipment(source);

    expect(Object.keys(projected).sort()).toEqual(defaultProjectionKeys);
    routeCostKeys.forEach((key) => expect(projected).not.toHaveProperty(key));
    expect(projected).not.toHaveProperty('paymentAmountUsd');
    expect(projected).not.toHaveProperty('grossProfit');
    expect(projected).not.toHaveProperty('payables');
  });

  it('adds only the established route-cost fields when requested', () => {
    const projected = projectMarketShipment(source, true);

    expect(Object.keys(projected).sort()).toEqual([...defaultProjectionKeys, ...routeCostKeys].sort());
    expect(projected).toMatchObject({ routeCostTotal: 99, routeCurrency: 'USD' });
  });

  it('keeps the routing-report projection anonymized with its exact key set', () => {
    const projected = projectMarketRoutingReportShipment(source);

    expect(Object.keys(projected).sort()).toEqual(routingReportKeys);
    expect(projected).toMatchObject({
      customerOrderNo: '',
      latestTracking: '',
      trackingStaleDays: 0,
      isRemoteArea: false,
      hasProblemTicket: false,
      routeCostTotal: 99
    });
    expect(projected).not.toHaveProperty('paymentAmountUsd');
    expect(projected).not.toHaveProperty('grossProfit');
    expect(projected).not.toHaveProperty('payables');
  });
});
