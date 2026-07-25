import type { WarehouseInStockResponse, WarehousePackageSummary, WarehouseTodayResponse } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { WarehouseQueryClient, type WarehouseQueryRequest } from './warehouseQueryClient';

const emptyTotals = {
  receiptTickets: 0,
  totalPackages: 0,
  totalWeightKg: 0,
  totalCbm: 0,
  waitingDispatchTickets: 0,
  pendingTallyTickets: 0,
  exceptionTickets: 0
};

describe('WarehouseQueryClient', () => {
  it('keeps the warehouse package read path and response passthrough unchanged', async () => {
    const response: WarehousePackageSummary[] = [];
    const request = vi.fn().mockResolvedValue(response) as WarehouseQueryRequest;
    const client = new WarehouseQueryClient(request);

    await expect(client.warehousePackages()).resolves.toBe(response);

    expect(request).toHaveBeenCalledWith('/warehouse/packages');
  });

  it('keeps the manual-receipt customer lookup unchanged', async () => {
    const response = [{ code: 'C001', name: '测试客户' }];
    const request = vi.fn().mockResolvedValue(response) as WarehouseQueryRequest;
    const client = new WarehouseQueryClient(request);

    await expect(client.warehouseManualReceiptCustomers()).resolves.toBe(response);

    expect(request).toHaveBeenCalledWith('/warehouse/manual-receipt/customers');
  });

  it('keeps today-receipt query serialization unchanged', async () => {
    const response: WarehouseTodayResponse = { totals: emptyTotals, rows: [] };
    const request = vi.fn().mockResolvedValue(response) as WarehouseQueryRequest;
    const client = new WarehouseQueryClient(request);

    await expect(client.warehouseTodayReceipts({
      datePreset: 'CUSTOM',
      customFrom: '2026-07-01',
      customTo: '2026-07-25',
      site: '上海仓',
      customerOrderNo: '',
      domesticTrackingNo: 'SF 001',
      combinedOrderNo: undefined
    })).resolves.toBe(response);

    expect(request).toHaveBeenCalledWith(
      '/warehouse/today-receipts?datePreset=CUSTOM&customFrom=2026-07-01&customTo=2026-07-25&site=%E4%B8%8A%E6%B5%B7%E4%BB%93&domesticTrackingNo=SF+001'
    );
  });

  it('keeps in-stock query serialization and empty-query paths unchanged', async () => {
    const response: WarehouseInStockResponse = { totals: emptyTotals, rows: [] };
    const request = vi.fn().mockResolvedValue(response) as WarehouseQueryRequest;
    const client = new WarehouseQueryClient(request);

    await client.warehouseInStock({
      site: '深圳仓',
      customerOrderNo: 'SO-001',
      domesticTrackingNo: null as never,
      combinedOrderNo: '  ',
      operationKeyword: 'alice',
      status: 'TALLIED_ARCHIVED'
    });
    await client.warehouseInStock();
    await client.warehouseTodayReceipts();

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/warehouse/in-stock?site=%E6%B7%B1%E5%9C%B3%E4%BB%93&customerOrderNo=SO-001&operationKeyword=alice&status=TALLIED_ARCHIVED'
    );
    expect(request).toHaveBeenNthCalledWith(2, '/warehouse/in-stock');
    expect(request).toHaveBeenNthCalledWith(3, '/warehouse/today-receipts');
  });

  it('passes warehouse query errors through without changing their message', async () => {
    const request = vi.fn().mockRejectedValue(new Error('没有访问权限')) as WarehouseQueryRequest;
    const client = new WarehouseQueryClient(request);

    await expect(client.warehouseInStock()).rejects.toThrow('没有访问权限');
  });
});
