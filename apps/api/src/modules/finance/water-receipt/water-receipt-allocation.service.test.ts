import type { Principal } from '../../rbac.js';
import { describe, expect, it, vi } from 'vitest';
import type { WaterReceiptAllocationRepository } from './water-receipt-allocation.repository.js';
import { WaterReceiptAllocationService } from './water-receipt-allocation.service.js';

const principal = { id: 'u-finance', username: 'finance', role: 'FINANCE' } as Principal;

function repositoryStub(
  overrides: Partial<WaterReceiptAllocationRepository> = {}
): WaterReceiptAllocationRepository {
  return {
    matchReceivableReceipt: vi.fn(),
    getReceivableWaterReceiptCandidates: vi.fn(),
    getWaterReceiptMatchableReceivables: vi.fn(),
    matchWaterReceiptOrders: vi.fn(),
    unmatchWaterReceipt: vi.fn(),
    ...overrides
  };
}

describe('WaterReceiptAllocationService', () => {
  it('preserves receivable-side allocation queries and commands through the port', async () => {
    const matchedReceivable = { id: 'receivable-1' };
    const candidates = { receivableId: 'receivable-1', customerCode: '9409', rows: [] };
    const repository = repositoryStub({
      matchReceivableReceipt: vi.fn().mockResolvedValue(matchedReceivable),
      getReceivableWaterReceiptCandidates: vi.fn().mockResolvedValue(candidates)
    });
    const service = new WaterReceiptAllocationService(repository);
    const input = { ledgerId: 'water-receipt-1', amount: 100 };

    await expect(service.matchReceivableReceipt(principal, 'receivable-1', input)).resolves.toBe(matchedReceivable);
    await expect(service.listReceivableWaterReceiptCandidates(principal, 'receivable-1')).resolves.toBe(candidates);
    expect(repository.matchReceivableReceipt).toHaveBeenCalledWith(principal, 'receivable-1', input);
    expect(repository.getReceivableWaterReceiptCandidates).toHaveBeenCalledWith(principal, 'receivable-1');
  });

  it('keeps receipt-side allocation reads, submission and cancellation on one adapter', async () => {
    const receivables = [{ id: 'receivable-1' }];
    const receipt = { id: 'water-receipt-1' };
    const repository = repositoryStub({
      getWaterReceiptMatchableReceivables: vi.fn().mockResolvedValue(receivables),
      matchWaterReceiptOrders: vi.fn().mockResolvedValue(receipt),
      unmatchWaterReceipt: vi.fn().mockResolvedValue(receipt)
    });
    const service = new WaterReceiptAllocationService(repository);
    const matchInput = { matches: [{ receivableFinanceItemId: 'receivable-1', amount: 100 }] };
    const unmatchInput = { matchIds: ['match-1'], reason: '重复匹配' };

    await expect(service.listWaterReceiptMatchableReceivables(principal, 'water-receipt-1')).resolves.toBe(receivables);
    await expect(service.matchWaterReceiptOrders(principal, 'water-receipt-1', matchInput)).resolves.toBe(receipt);
    await expect(service.unmatchWaterReceipt(principal, 'water-receipt-1', unmatchInput)).resolves.toBe(receipt);
    expect(repository.matchWaterReceiptOrders).toHaveBeenCalledWith(principal, 'water-receipt-1', matchInput);
    expect(repository.unmatchWaterReceipt).toHaveBeenCalledWith(principal, 'water-receipt-1', unmatchInput);
  });
});
