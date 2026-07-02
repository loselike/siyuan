import type { BusinessType, ShipmentFinanceItemType } from '@siyuan/shared';
import { normalizeFinanceCatalogCurrency } from './catalog';

export type FinanceEntryPackageType = 'DOC' | 'WPX' | 'PAK';

export interface FinanceEntryFormValues {
  customerCode?: string;
  customerName?: string;
  customerOrderNo?: string;
  systemOrderNo?: string;
  entryAt?: string;
  outboundAt?: string;
  transferNo?: string;
  subOrderNo?: string;
  inboundNo?: string;
  businessType?: BusinessType;
  packageType?: FinanceEntryPackageType;
  destinationCountry?: string;
  receivingChannel?: string;
  settlementMethod?: string;
  currency?: string;
  agentName?: string;
  channelName?: string;
  cargoType?: string;
  productName?: string;
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
  agentName?: string;
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
  if (typeof row.chargeWeightKg === 'number' && typeof row.unitPrice === 'number') {
    return roundFinanceNumber(row.chargeWeightKg * row.unitPrice);
  }
  return roundFinanceNumber(row.amount ?? 0);
}

export function createFinanceEntryFeeDraft(
  type: ShipmentFinanceItemType,
  patch: Partial<FinanceEntryFeeDraft> = {}
): FinanceEntryFeeDraft {
  return {
    id: createFinanceEntryDraftId(),
    type,
    name: patch.name ?? (type === 'RECEIVABLE' ? '运费' : type === 'BUSINESS_COST' ? '业务员成本' : '代理成本'),
    currency: normalizeFinanceCatalogCurrency(patch.currency) ?? 'RMB',
    amount: patch.amount,
    settlementMethod: patch.settlementMethod,
    paymentNo: patch.paymentNo,
    receiptId: patch.receiptId,
    receiptNo: patch.receiptNo,
    receiptBalance: patch.receiptBalance,
    receiptMatchAmount: patch.receiptMatchAmount,
    agentName: patch.agentName,
    chargeWeightKg: patch.chargeWeightKg,
    unitPrice: patch.unitPrice,
    remark: patch.remark
  };
}
