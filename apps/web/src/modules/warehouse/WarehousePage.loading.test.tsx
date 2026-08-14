import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WarehousePackageSummary, WarehouseTodayTotals } from '@siyuan/shared';
import type { ApiClient } from '../../apiClient';
import { WarehousePage } from './WarehousePage';

const row = {
  id: 'package-1',
  customerCode: '9409',
  customerOrderNo: 'ORDER-1',
  domesticTrackingNo: 'SF001',
  combinedOrderNo: 'ORDER-1-SF001',
  receivingChannel: '仓库设备',
  packageCount: 1,
  weightKg: 10,
  lengthCm: 50,
  widthCm: 40,
  heightCm: 30,
  cbm: 0.06,
  volumetricWeightKg: 10,
  chargeableWeightKg: 10,
  divisor: 6000,
  roundingRule: 'NONE',
  status: 'RECEIVED',
  exceptions: [],
  createdAt: '2026-07-27T00:00:00.000Z'
} as WarehousePackageSummary;

const totals: WarehouseTodayTotals = {
  receiptTickets: 1,
  totalPackages: 1,
  totalWeightKg: 10,
  totalCbm: 0.06,
  waitingDispatchTickets: 0,
  pendingTallyTickets: 1,
  exceptionTickets: 0
};

describe('WarehousePage scoped loading', () => {
  afterEach(cleanup);

  it('does not request the full package snapshot while scoped queries succeed', async () => {
    const warehousePackages = vi.fn().mockResolvedValue([row]);
    const warehouseTodayReceipts = vi.fn().mockResolvedValue({ rows: [row], totals });
    const warehouseInStock = vi.fn().mockResolvedValue({ rows: [row], totals });
    const warehouseInStockSummary = vi.fn().mockResolvedValue({ totals });
    const apiClient = {
      warehouseQuery: { warehousePackages, warehouseTodayReceipts, warehouseInStock, warehouseInStockSummary }
    } as unknown as ApiClient;

    render(
      <WarehousePage
        apiClient={apiClient}
        role="WAREHOUSE"
        permissions={['warehouse:today-receipt:view', 'warehouse:in-stock:view']}
        initialSection="dashboard"
        shipments={[]}
        notice={null}
        onDispatch={vi.fn()}
        findShipmentBySystemOrderNo={() => undefined}
        renderShipmentOrderNoLink={(systemOrderNo) => systemOrderNo ?? '-'}
      />
    );

    await waitFor(() => {
      expect(warehouseTodayReceipts).toHaveBeenCalledTimes(1);
      expect(warehouseInStockSummary).toHaveBeenCalledTimes(1);
    });
    expect(warehouseInStock).not.toHaveBeenCalled();
    expect(warehousePackages).not.toHaveBeenCalled();
  });

  it('shares one lazy full-package fallback when scoped queries fail', async () => {
    const warehousePackages = vi.fn().mockResolvedValue([row]);
    const warehouseTodayReceipts = vi.fn().mockRejectedValue(new Error('today unavailable'));
    const warehouseInStock = vi.fn().mockRejectedValue(new Error('in-stock unavailable'));
    const warehouseInStockSummary = vi.fn().mockRejectedValue(new Error('summary unavailable'));
    const apiClient = {
      warehouseQuery: { warehousePackages, warehouseTodayReceipts, warehouseInStock, warehouseInStockSummary }
    } as unknown as ApiClient;

    render(
      <WarehousePage
        apiClient={apiClient}
        role="WAREHOUSE"
        permissions={['warehouse:today-receipt:view', 'warehouse:in-stock:view']}
        initialSection="dashboard"
        shipments={[]}
        notice={null}
        onDispatch={vi.fn()}
        findShipmentBySystemOrderNo={() => undefined}
        renderShipmentOrderNoLink={(systemOrderNo) => systemOrderNo ?? '-'}
      />
    );

    await waitFor(() => {
      expect(warehousePackages).toHaveBeenCalledTimes(1);
      expect(warehouseInStockSummary).toHaveBeenCalledTimes(1);
    });
    expect(warehousePackages).toHaveBeenCalledTimes(1);
  });

  it('keeps the full in-stock response for the in-stock workspace', async () => {
    const warehousePackages = vi.fn().mockResolvedValue([row]);
    const warehouseTodayReceipts = vi.fn().mockResolvedValue({ rows: [row], totals });
    const warehouseInStock = vi.fn().mockResolvedValue({ rows: [row], totals });
    const warehouseInStockPage = vi.fn().mockResolvedValue({
      rows: [row],
      totals,
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
    });
    const warehouseInStockSummary = vi.fn().mockResolvedValue({ totals });
    const apiClient = {
      warehouseQuery: { warehousePackages, warehouseTodayReceipts, warehouseInStock, warehouseInStockPage, warehouseInStockSummary }
    } as unknown as ApiClient;

    render(
      <WarehousePage
        apiClient={apiClient}
        role="WAREHOUSE"
        permissions={['warehouse:today-receipt:view', 'warehouse:in-stock:view']}
        initialSection="packages"
        shipments={[]}
        notice={null}
        onDispatch={vi.fn()}
        findShipmentBySystemOrderNo={() => undefined}
        renderShipmentOrderNoLink={(systemOrderNo) => systemOrderNo ?? '-'}
      />
    );

    await waitFor(() => expect(warehouseInStockPage).toHaveBeenCalledTimes(1));
    expect(warehouseInStock).not.toHaveBeenCalled();
    expect(warehouseInStockSummary).not.toHaveBeenCalled();
  });

  it('opens the existing permitted workspace from the dashboard action', async () => {
    const user = userEvent.setup();
    const warehousePackages = vi.fn().mockResolvedValue([row]);
    const warehouseTodayReceipts = vi.fn().mockResolvedValue({ rows: [row], totals });
    const warehouseInStock = vi.fn().mockResolvedValue({ rows: [row], totals });
    const warehouseInStockSummary = vi.fn().mockResolvedValue({ totals });
    const apiClient = {
      warehouseQuery: { warehousePackages, warehouseTodayReceipts, warehouseInStock, warehouseInStockSummary }
    } as unknown as ApiClient;

    render(
      <WarehousePage
        apiClient={apiClient}
        role="WAREHOUSE"
        permissions={['warehouse:dashboard:view', 'warehouse:today-receipt:view', 'warehouse:in-stock:view']}
        initialSection="dashboard"
        shipments={[]}
        notice={null}
        onDispatch={vi.fn()}
        findShipmentBySystemOrderNo={() => undefined}
        renderShipmentOrderNoLink={(systemOrderNo) => systemOrderNo ?? '-'}
      />
    );

    await user.click(await screen.findByRole('button', { name: '查看今日收货' }));

    await waitFor(() => {
      expect(screen.getAllByRole('region', { name: '今日收货' })).toHaveLength(1);
    });
    expect(warehouseTodayReceipts).toHaveBeenCalledTimes(1);
    expect(warehouseInStockSummary).toHaveBeenCalledTimes(1);
    expect(warehouseInStock).not.toHaveBeenCalled();
    expect(warehousePackages).not.toHaveBeenCalled();
  });
});
