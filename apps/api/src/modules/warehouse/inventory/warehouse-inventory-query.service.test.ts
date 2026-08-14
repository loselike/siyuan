import { describe, expect, it, vi } from 'vitest';
import type { WarehouseInventoryQueryRepository } from './warehouse-inventory-query.repository.js';
import { WarehouseInventoryQueryService } from './warehouse-inventory-query.service.js';
import {
  warehousePackageSummary,
  warehousePrincipal
} from './test-support/warehouse-inventory-query.factory.js';

function repositoryStub(
  overrides: Partial<WarehouseInventoryQueryRepository> = {}
): WarehouseInventoryQueryRepository {
  return {
    getWarehousePackages: vi.fn().mockResolvedValue([]),
    getWarehouseTodayReceipts: vi.fn().mockResolvedValue({
      totals: {
        receiptTickets: 0,
        totalPackages: 0,
        totalWeightKg: 0,
        totalCbm: 0,
        waitingDispatchTickets: 0,
        pendingTallyTickets: 0,
        exceptionTickets: 0
      },
      rows: []
    }),
    getWarehouseInStock: vi.fn().mockResolvedValue({
      totals: {
        receiptTickets: 0,
        totalPackages: 0,
        totalWeightKg: 0,
        totalCbm: 0,
        waitingDispatchTickets: 0,
        pendingTallyTickets: 0,
        exceptionTickets: 0
      },
      rows: []
    }),
    getWarehouseInStockPage: vi.fn().mockResolvedValue({
      totals: {
        receiptTickets: 0,
        totalPackages: 0,
        totalWeightKg: 0,
        totalCbm: 0,
        waitingDispatchTickets: 0,
        pendingTallyTickets: 0,
        exceptionTickets: 0
      },
      rows: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0 }
    }),
    getWarehouseInStockSummary: vi.fn().mockResolvedValue({
      totals: {
        receiptTickets: 0,
        totalPackages: 0,
        totalWeightKg: 0,
        totalCbm: 0,
        waitingDispatchTickets: 0,
        pendingTallyTickets: 0,
        exceptionTickets: 0
      }
    }),
    getWarehousePackageGroups: vi.fn().mockResolvedValue([]),
    getWarehouseManualReceiptCustomers: vi.fn().mockResolvedValue([]),
    findDuplicateMojiaPackage: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('WarehouseInventoryQueryService', () => {
  it('preserves the principal and package response through the service boundary', async () => {
    const principal = warehousePrincipal();
    const packages = [warehousePackageSummary()];
    const repository = repositoryStub({
      getWarehousePackages: vi.fn().mockResolvedValue(packages)
    });
    const service = new WarehouseInventoryQueryService(repository);

    await expect(service.listPackages(principal)).resolves.toBe(packages);
    expect(repository.getWarehousePackages).toHaveBeenCalledWith(principal);
  });

  it('keeps package groups, customer options and Mojia duplicate queries on the same adapter', async () => {
    const principal = warehousePrincipal();
    const duplicateQuery = { combinedOrderNo: '9476-SF9476', remark: '设备号：MJ20210327' };
    const repository = repositoryStub({
      getWarehousePackageGroups: vi.fn().mockResolvedValue([{ combinedOrderNo: '9476-SF9476' }]),
      getWarehouseManualReceiptCustomers: vi.fn().mockResolvedValue([{ code: '9476', name: '测试客户' }]),
      findDuplicateMojiaPackage: vi.fn().mockResolvedValue({ combinedOrderNo: '9476-SF9476' })
    });
    const service = new WarehouseInventoryQueryService(repository);

    await expect(service.listPackageGroups(principal)).resolves.toEqual([{ combinedOrderNo: '9476-SF9476' }]);
    await expect(service.listManualReceiptCustomers(principal)).resolves.toEqual([{ code: '9476', name: '测试客户' }]);
    await expect(service.findDuplicateMojiaPackage(principal, duplicateQuery))
      .resolves.toEqual({ combinedOrderNo: '9476-SF9476' });
    expect(repository.findDuplicateMojiaPackage).toHaveBeenCalledWith(principal, duplicateQuery);
  });

  it('keeps legacy warehouse read responses behind the module service boundary', async () => {
    const principal = warehousePrincipal();
    const todayQuery = { customerOrderNo: '9476' };
    const inStockQuery = { status: 'RECEIVED' as const, keyword: 'SF9476' };
    const todayResponse = { rows: [], totals: { receiptTickets: 0 } };
    const inStockResponse = { rows: [], totals: { receiptTickets: 0 } };
    const summaryResponse = { totals: { receiptTickets: 0 } };
    const repository = repositoryStub({
      getWarehouseTodayReceipts: vi.fn().mockResolvedValue(todayResponse),
      getWarehouseInStock: vi.fn().mockResolvedValue(inStockResponse),
      getWarehouseInStockSummary: vi.fn().mockResolvedValue(summaryResponse)
    });
    const service = new WarehouseInventoryQueryService(repository);

    await expect(service.listTodayReceipts(principal, todayQuery)).resolves.toBe(todayResponse);
    await expect(service.listInStock(principal, inStockQuery)).resolves.toBe(inStockResponse);
    await expect(service.getInStockSummary(principal)).resolves.toBe(summaryResponse);
    expect(repository.getWarehouseTodayReceipts).toHaveBeenCalledWith(principal, todayQuery);
    expect(repository.getWarehouseInStock).toHaveBeenCalledWith(principal, inStockQuery);
    expect(repository.getWarehouseInStockSummary).toHaveBeenCalledWith(principal);
  });
});
