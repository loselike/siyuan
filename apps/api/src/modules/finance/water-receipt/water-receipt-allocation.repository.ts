import type {
  ReceivableAuditSummary,
  ReceivableReceiptMatchInput,
  ReceivableWaterReceiptCandidatesResponse,
  WaterReceiptMatchOrdersInput,
  WaterReceiptSummary,
  WaterReceiptUnmatchInput
} from '@siyuan/shared';
import type { Principal } from '../../rbac.js';

export const WATER_RECEIPT_ALLOCATION_REPOSITORY = Symbol('WATER_RECEIPT_ALLOCATION_REPOSITORY');

/**
 * Stable port for the water-receipt allocation use cases.
 *
 * The current Prisma and in-memory repositories remain the adapters while the
 * transaction implementation is migrated incrementally out of the legacy
 * repository.
 */
export interface WaterReceiptAllocationRepository {
  matchReceivableReceipt(
    principal: Principal,
    receivableId: string,
    input: ReceivableReceiptMatchInput
  ): Promise<ReceivableAuditSummary>;
  getReceivableWaterReceiptCandidates(
    principal: Principal,
    receivableId: string
  ): Promise<ReceivableWaterReceiptCandidatesResponse>;
  getWaterReceiptMatchableReceivables(
    principal: Principal,
    waterReceiptId: string
  ): Promise<ReceivableAuditSummary[]>;
  matchWaterReceiptOrders(
    principal: Principal,
    waterReceiptId: string,
    input: WaterReceiptMatchOrdersInput
  ): Promise<WaterReceiptSummary>;
  unmatchWaterReceipt(
    principal: Principal,
    waterReceiptId: string,
    input: WaterReceiptUnmatchInput
  ): Promise<WaterReceiptSummary>;
}
