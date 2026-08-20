import type { Shipment } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';
import type { ShipmentOverviewQueryRepository } from './shipment-overview-query.repository.js';
import { ShipmentOverviewQueryService } from './shipment-overview-query.service.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const market: Principal = { id: 'u-market', username: 'market', role: 'UG_MARKET', site: '深圳思远' };
const customer: Principal = { id: 'u-customer', username: 'customer', role: 'CUSTOMER', customerId: 'c-1' };

function shipment(overrides: Partial<Shipment> = {}): Shipment {
  return {
    id: 'shipment-1',
    createdAt: new Date().toISOString(),
    status: 'WAITING_DISPATCH',
    customerName: '敏感客户',
    customerOrderNo: 'ORDER-1',
    systemOrderNo: 'SYS-1',
    destinationCountry: 'US',
    packageCount: 2,
    receivableWeightKg: 10,
    routeCostTotal: 88,
    paymentAmountUsd: 99,
    grossProfit: 11,
    payables: [],
    site: '深圳思远',
    ...overrides
  } as Shipment;
}

function setup(permissions: PermissionKey[], rows: Shipment[] = [shipment()]) {
  const allowed = new Set<PermissionKey>(permissions);
  const repository = {
    hasPermission: vi.fn(async (_role: RoleKey, permission: PermissionKey) => allowed.has(permission)),
    getShipments: vi.fn(async () => rows),
    getShipmentStatusCounts: vi.fn(async () => ({})),
    getNavigationUnreadBadges: vi.fn(async () => ({ items: [] }))
  } as unknown as ShipmentOverviewQueryRepository;
  return { repository, service: new ShipmentOverviewQueryService(repository) };
}

describe('ShipmentOverviewQueryService', () => {
  it('keeps the business list branch and routed cost option unchanged', async () => {
    const { repository, service } = setup(['business:shipment:list']);

    await expect(service.listShipments(admin, 'routed')).resolves.toEqual([expect.objectContaining({ id: 'shipment-1' })]);
    expect(repository.getShipments).toHaveBeenCalledWith(admin, { routeCostScope: 'ROUTED' });
    expect(repository.hasPermission).toHaveBeenCalledTimes(1);
  });

  it('keeps UG_MARKET on the market branch even when the business permission is present', async () => {
    const { repository, service } = setup([
      'business:shipment:list',
      'market:routed:view'
    ]);

    const result = await service.listShipments(market, 'routed');

    expect(repository.getShipments).toHaveBeenCalledWith(market, {
      routeCostScope: 'ROUTED',
      marketSiteScope: true
    });
    expect(result).toEqual([
      expect.objectContaining({ id: 'shipment-1', routeCostTotal: 88, site: '深圳思远' })
    ]);
    expect(result[0]).not.toHaveProperty('paymentAmountUsd');
    expect(result[0]).not.toHaveProperty('grossProfit');
    expect(result[0]).not.toHaveProperty('payables');
  });

  it('keeps dashboard-only rows minimal and routing-report rows anonymized', async () => {
    const dashboardSetup = setup(
      ['market:dashboard:view'],
      [shipment({ status: 'WAITING_SORT', routedAt: new Date().toISOString() })]
    );
    const dashboardRows = await dashboardSetup.service.listMarketShipments(market);
    expect(dashboardRows).toEqual([
      expect.objectContaining({
        id: 'shipment-1',
        customerName: '',
        systemOrderNo: '',
        destinationCountry: '',
        packageCount: 0,
        receivableWeightKg: 0
      })
    ]);
    expect(dashboardRows[0]).not.toHaveProperty('customerOrderNo');
    expect(dashboardRows[0]).not.toHaveProperty('routeCostTotal');

    const reportSetup = setup(
      ['market:routing-report:view'],
      [shipment({ status: 'WAITING_DEPARTURE', routedAt: new Date().toISOString(), latestTracking: '敏感轨迹' })]
    );
    const reportRows = await reportSetup.service.listMarketShipments(market, 'routed');
    expect(reportRows).toEqual([
      expect.objectContaining({
        id: 'shipment-1',
        customerOrderNo: '',
        latestTracking: '',
        routeCostTotal: 88,
        hasProblemTicket: false
      })
    ]);
    expect(reportRows[0]).not.toHaveProperty('paymentAmountUsd');
    expect(reportRows[0]).not.toHaveProperty('grossProfit');
    expect(reportRows[0]).not.toHaveProperty('payables');
  });

  it('keeps current-week visibility inclusive at Monday midnight and excludes the prior instant', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T12:00:00.000Z'));
    try {
      const weekStart = new Date();
      const weekDay = weekStart.getDay() || 7;
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekDay + 1);
      const currentWeek = weekStart.toISOString();
      const previousInstant = new Date(weekStart.getTime() - 1).toISOString();
      const { service } = setup(
        ['market:dashboard:view'],
        [
          shipment({ id: 'at-boundary', status: 'DEPARTED', routedAt: currentWeek }),
          shipment({ id: 'before-boundary', status: 'DEPARTED', outboundAt: previousInstant }),
          shipment({ id: 'returned-this-week', status: 'DEPARTED', routeReturnedAt: currentWeek })
        ]
      );

      const rows = await service.listMarketShipments(market);

      expect(rows.map((row) => row.id)).toEqual(['at-boundary', 'returned-this-week']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps customer unread badges denied before repository access', async () => {
    const { repository, service } = setup([]);

    expect(() => service.getNavigationUnreadBadges(customer)).toThrow('客户不使用员工端导航角标');
    expect(repository.getNavigationUnreadBadges).not.toHaveBeenCalled();
  });
});
