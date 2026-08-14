import type { Principal } from '../../rbac.js';
import { describe, expect, it, vi } from 'vitest';
import type { FinanceCatalogService } from '../catalog/finance-catalog.service.js';
import type { WaterReceiptLifecycleRepository } from './water-receipt-lifecycle.repository.js';
import { WaterReceiptLifecycleService } from './water-receipt-lifecycle.service.js';

const principal = { id: 'u-finance', username: 'finance', role: 'FINANCE' } as Principal;

function repositoryStub(
  overrides: Partial<WaterReceiptLifecycleRepository> = {}
): WaterReceiptLifecycleRepository {
  return {
    getWaterReceipts: vi.fn(),
    getEnabledSitesForReference: vi.fn(),
    createWaterReceipt: vi.fn(),
    updateWaterReceipt: vi.fn(),
    markWaterReceiptArrived: vi.fn(),
    archiveWaterReceipt: vi.fn(),
    voidWaterReceipt: vi.fn(),
    deleteWaterReceiptVoucher: vi.fn(),
    exportWaterReceipts: vi.fn(),
    ...overrides
  };
}

function catalogStub(names = ['招商银行']): FinanceCatalogService {
  return {
    list: vi.fn().mockResolvedValue({
      items: names.map((name, index) => ({ id: `settlement-${index + 1}`, name }))
    })
  } as unknown as FinanceCatalogService;
}

describe('WaterReceiptLifecycleService', () => {
  it('preserves list, site, lifecycle and export delegation through the port', async () => {
    const receipt = { id: 'water-receipt-1' };
    const listResponse = { rows: [receipt] };
    const sites = [{ id: 'site-1', name: '深圳' }];
    const exportResponse = { rows: [receipt], exportedAt: '2026-08-11T00:00:00.000Z' };
    const repository = repositoryStub({
      getWaterReceipts: vi.fn().mockResolvedValue(listResponse),
      getEnabledSitesForReference: vi.fn().mockResolvedValue(sites),
      markWaterReceiptArrived: vi.fn().mockResolvedValue(receipt),
      archiveWaterReceipt: vi.fn().mockResolvedValue(receipt),
      voidWaterReceipt: vi.fn().mockResolvedValue(receipt),
      deleteWaterReceiptVoucher: vi.fn().mockResolvedValue({ deleted: true }),
      exportWaterReceipts: vi.fn().mockResolvedValue(exportResponse)
    });
    const service = new WaterReceiptLifecycleService(repository, catalogStub());
    const query = { status: 'ARRIVED' as const };
    const arrivedInput = { note: '财务确认' };
    const voidInput = { reason: '重复录入' };
    const exportInput = { ids: ['water-receipt-1'] };

    await expect(service.list(principal, query)).resolves.toBe(listResponse);
    await expect(service.listSiteOptions()).resolves.toBe(sites);
    await expect(service.markArrived(principal, 'water-receipt-1', arrivedInput)).resolves.toBe(receipt);
    await expect(service.archive(principal, 'water-receipt-1')).resolves.toBe(receipt);
    await expect(service.void(principal, 'water-receipt-1', voidInput)).resolves.toBe(receipt);
    await expect(service.deleteVoucher(principal, 'water-receipt-1')).resolves.toEqual({ deleted: true });
    await expect(service.export(principal, exportInput)).resolves.toBe(exportResponse);
    expect(repository.getWaterReceipts).toHaveBeenCalledWith(principal, query);
    expect(repository.markWaterReceiptArrived).toHaveBeenCalledWith(principal, 'water-receipt-1', arrivedInput);
    expect(repository.voidWaterReceipt).toHaveBeenCalledWith(principal, 'water-receipt-1', voidInput);
    expect(repository.exportWaterReceipts).toHaveBeenCalledWith(principal, exportInput);
  });

  it('keeps settlement-method validation before create and changed-method update', async () => {
    const receipt = { id: 'water-receipt-1' };
    const repository = repositoryStub({
      createWaterReceipt: vi.fn().mockResolvedValue(receipt),
      updateWaterReceipt: vi.fn().mockResolvedValue(receipt)
    });
    const catalog = catalogStub();
    const service = new WaterReceiptLifecycleService(repository, catalog);
    const createInput = {
      customerCode: '9409',
      receiptMethod: ' 招商银行 ',
      receiptDate: '2026-08-11T00:00:00.000Z',
      amount: 100,
      paymentNo: 'PAY-001'
    };

    await expect(service.create(principal, createInput)).resolves.toBe(receipt);
    await expect(service.update(principal, 'water-receipt-1', { paymentNo: 'PAY-002' })).resolves.toBe(receipt);
    await expect(service.update(principal, 'water-receipt-1', {
      paymentNo: 'PAY-003',
      receiptMethod: '招商银行'
    })).resolves.toBe(receipt);
    expect(catalog.list).toHaveBeenCalledTimes(2);
    expect(repository.createWaterReceipt).toHaveBeenCalledWith(principal, createInput);
    expect(repository.updateWaterReceipt).toHaveBeenNthCalledWith(1, principal, 'water-receipt-1', { paymentNo: 'PAY-002' });
  });

  it.each([
    [{ receiptMethod: '   ' }, '结算方式不能为空'],
    [{ receiptMethod: '不存在的方式' }, '结算方式不存在或已停用']
  ])('keeps existing create rejection before repository writes: %j', async (partialInput, message) => {
    const repository = repositoryStub();
    const service = new WaterReceiptLifecycleService(repository, catalogStub());
    const input = {
      receiptDate: '2026-08-11T00:00:00.000Z',
      amount: 100,
      paymentNo: 'PAY-001',
      ...partialInput
    };

    await expect(service.create(principal, input)).rejects.toThrow(message);
    expect(repository.createWaterReceipt).not.toHaveBeenCalled();
  });
});
