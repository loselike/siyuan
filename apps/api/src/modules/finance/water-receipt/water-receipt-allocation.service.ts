import { Inject, Injectable } from '@nestjs/common';
import type {
  ReceivableReceiptMatchInput,
  WaterReceiptMatchOrdersInput,
  WaterReceiptUnmatchInput
} from '@siyuan/shared';
import type { Principal } from '../../rbac.js';
import {
  WATER_RECEIPT_ALLOCATION_REPOSITORY,
  type WaterReceiptAllocationRepository
} from './water-receipt-allocation.repository.js';

@Injectable()
export class WaterReceiptAllocationService {
  constructor(
    @Inject(WATER_RECEIPT_ALLOCATION_REPOSITORY)
    private readonly repository: WaterReceiptAllocationRepository
  ) {}

  matchReceivableReceipt(principal: Principal, receivableId: string, input: ReceivableReceiptMatchInput) {
    return this.repository.matchReceivableReceipt(principal, receivableId, input);
  }

  listReceivableWaterReceiptCandidates(principal: Principal, receivableId: string) {
    return this.repository.getReceivableWaterReceiptCandidates(principal, receivableId);
  }

  listWaterReceiptMatchableReceivables(principal: Principal, waterReceiptId: string) {
    return this.repository.getWaterReceiptMatchableReceivables(principal, waterReceiptId);
  }

  matchWaterReceiptOrders(principal: Principal, waterReceiptId: string, input: WaterReceiptMatchOrdersInput) {
    return this.repository.matchWaterReceiptOrders(principal, waterReceiptId, input);
  }

  unmatchWaterReceipt(principal: Principal, waterReceiptId: string, input: WaterReceiptUnmatchInput) {
    return this.repository.unmatchWaterReceipt(principal, waterReceiptId, input);
  }
}
