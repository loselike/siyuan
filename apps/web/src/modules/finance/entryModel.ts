import type { BusinessType, FinanceBillingUnit, ShipmentFinanceItemType } from '@siyuan/shared';
import { normalizeFinanceCatalogCurrency } from './catalog';

export type FinanceEntryPackageType = 'DOC' | 'WPX' | 'PAK';

export interface FinanceEntryFormValues {
  customerCode?: string;
  customerName?: string;
  customerOrderNo?: string;
  systemOrderNo?: string;
  entryAt?: string;
  outboundAt?: string;
  subOrderNo?: string;
  inboundNo?: string;
  businessType?: BusinessType;
  packageType?: FinanceEntryPackageType;
  destinationCountry?: string;
  receivingChannel?: string;
  settlementMethod?: string;
  currency?: string;
  agentId?: string;
  channelName?: string;
  cargoType?: string;
  packageCount?: number;
  actualWeightKg?: number;
  volumeCbm?: number;
  chargeableWeightKg?: number;
  cargoDataSource?: 'AUTO_MATCHED' | 'MANUAL_ADJUSTED';
  chargeWeightOverridden?: boolean;
  productName?: string;
  productNames?: string[];
  declarationRequired?: boolean;
  sensitive?: boolean;
  tradeTerms?: string;
  fbaInboundNo?: string;
  receiverContactId?: string;
  saveReceiverToCustomer?: boolean;
  receiverName?: string;
  receiverCompany?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  receiverState?: string;
  receiverPostalCode?: string;
  fbaWarehouseCode?: string;
  remark?: string;
}

export interface FinanceEntryFeeDraft {
  id: string;
  type: ShipmentFinanceItemType;
  name: string;
  currency?: string;
  amount?: number;
  settlementMethod?: string;
  paymentNo?: string;
  receiptId?: string;
  receiptNo?: string;
  receiptBalance?: number;
  receiptMatchAmount?: number;
  receiptMatchSource?: 'AUTO' | 'MANUAL';
  receiptMatchHint?: string;
  agentId?: string;
  agentName?: string;
  billingUnit?: FinanceBillingUnit;
  billingQuantity?: number;
  chargeWeightKg?: number;
  unitPrice?: number;
  remark?: string;
}

export function createFinanceEntryDraftId() {
  return `finance-entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function roundFinanceNumber(value: number, precision = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function calculateFinanceEntryFeeAmount(row: FinanceEntryFeeDraft) {
  const quantity = row.type === 'BUSINESS_COST' ? row.billingQuantity ?? row.chargeWeightKg : row.chargeWeightKg;
  if (typeof quantity === 'number' && typeof row.unitPrice === 'number') {
    return roundFinanceNumber(quantity * row.unitPrice);
  }
  return roundFinanceNumber(row.amount ?? 0);
}

export function createFinanceEntryFeeDraft(
  type: ShipmentFinanceItemType,
  patch: Partial<FinanceEntryFeeDraft> = {}
): FinanceEntryFeeDraft {
  return {
    id: patch.id ?? createFinanceEntryDraftId(),
    type,
    name: patch.name ?? (type === 'RECEIVABLE' ? '运费' : type === 'BUSINESS_COST' ? '业务员成本' : '出货成本'),
    currency: normalizeFinanceCatalogCurrency(patch.currency) ?? 'RMB',
    amount: patch.amount,
    settlementMethod: patch.settlementMethod,
    paymentNo: patch.paymentNo,
    receiptId: patch.receiptId,
    receiptNo: patch.receiptNo,
    receiptBalance: patch.receiptBalance,
    receiptMatchAmount: patch.receiptMatchAmount,
    receiptMatchSource: patch.receiptMatchSource,
    receiptMatchHint: patch.receiptMatchHint,
    agentId: patch.agentId,
    agentName: patch.agentName,
    billingUnit: type === 'BUSINESS_COST' ? patch.billingUnit ?? 'KG' : undefined,
    billingQuantity: type === 'BUSINESS_COST' ? patch.billingQuantity ?? patch.chargeWeightKg : undefined,
    chargeWeightKg: patch.chargeWeightKg,
    unitPrice: patch.unitPrice,
    remark: patch.remark
  };
}
