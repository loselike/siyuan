import type {
  SiteSummary,
  WaterReceiptCreateInput,
  WaterReceiptExportRequest,
  WaterReceiptExportResponse,
  WaterReceiptListQuery,
  WaterReceiptListResponse,
  WaterReceiptMarkArrivedInput,
  WaterReceiptSummary,
  WaterReceiptUpdateInput
} from '@siyuan/shared';
import type { Principal } from '../../rbac.js';

export const WATER_RECEIPT_LIFECYCLE_REPOSITORY = Symbol('WATER_RECEIPT_LIFECYCLE_REPOSITORY');

/**
 * Stable port for water-receipt lifecycle use cases.
 *
 * The legacy Prisma and in-memory repositories remain the adapters until their
 * transaction code is migrated behind this boundary in later slices.
 */
export interface WaterReceiptLifecycleRepository {
  getWaterReceipts(principal: Principal, query: WaterReceiptListQuery): Promise<WaterReceiptListResponse>;
  getEnabledSitesForReference(): Promise<SiteSummary[]>;
  createWaterReceipt(principal: Principal, input: WaterReceiptCreateInput): Promise<WaterReceiptSummary>;
  updateWaterReceipt(principal: Principal, id: string, input: WaterReceiptUpdateInput): Promise<WaterReceiptSummary>;
  markWaterReceiptArrived(
    principal: Principal,
    id: string,
    input: WaterReceiptMarkArrivedInput
  ): Promise<WaterReceiptSummary>;
  archiveWaterReceipt(principal: Principal, id: string): Promise<WaterReceiptSummary>;
  voidWaterReceipt(principal: Principal, id: string, input: { reason?: string }): Promise<WaterReceiptSummary>;
  deleteWaterReceiptVoucher(principal: Principal, id: string): Promise<{ deleted: true }>;
  exportWaterReceipts(principal: Principal, input: WaterReceiptExportRequest): Promise<WaterReceiptExportResponse>;
}
