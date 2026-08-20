import { basename } from 'node:path';
import { URL } from 'node:url';
import type { Shipment as PrismaShipment } from '@prisma/client';
import {
  formatShipmentProductNames,
  normalizeShipmentProductNames,
  resolveShipmentOutboundOrderNo,
  summarizeLineShipmentFinance,
  summarizeShipmentRouteCosts,
  type AgentInvoiceTemplate,
  type AgentSummary,
  type BusinessType,
  type FinanceBillingUnit,
  type LineShipmentFinanceSourceItem,
  type LineShipmentFinanceSummary,
  type Shipment,
  type ShipmentPaymentMethod,
  type ShipmentStatus
} from '@siyuan/shared/shipment';

export type ShipmentWithRelations = PrismaShipment & {
  customer: { id: string; code: string; name: string; salesperson: string | null };
  channel: ({ name: string; carrier: { name: string } | null } | null);
  agent: ({
    name: string;
    invoiceTemplateName?: string | null;
    invoiceTemplateUrl?: string | null;
    invoiceTemplateName2?: string | null;
    invoiceTemplateUrl2?: string | null;
    invoiceTemplateName3?: string | null;
    invoiceTemplateUrl3?: string | null;
    invoiceTemplates?: unknown;
  } | null);
  problemTickets: Array<{ id: string; status: string }>;
  financeItems?: Array<{ type: string; name: string; amount: unknown; currency?: string | null; settlementMethod?: string | null; billingUnit?: string | null; billingQuantity?: unknown; chargeWeightKg?: unknown; unitPrice?: unknown; remark?: string | null; voided?: boolean; createdAt?: Date | string; reconciliationStatus?: string | null; receiptStatus?: string | null; settled?: boolean }>;
  payableFees?: Array<{ name: string; amount: unknown; settled?: boolean; voided?: boolean }>;
  receivableFees?: Array<{ amount: unknown; currency?: string | null; settlementMethod?: string | null; voided?: boolean; reconciliationStatus?: string | null; receiptStatus?: string | null; settled?: boolean }>;
};

export type ShipmentRouteArchiveFields = {
  agentChannelId?: string;
  agentChannelName?: string;
  routedAt?: string;
};

export type ShipmentDispatchArchiveFields = {
  handoverNo?: string;
  outboundBy?: string;
  batchDispatchSource?: string;
  outboundAt?: string;
};

export const shipmentOverviewIncludes = {
  customer: true,
  channel: { include: { carrier: true } },
  agent: true,
  receivableFees: { where: { voided: false }, orderBy: { createdAt: 'desc' } },
  financeItems: { where: { voided: false }, orderBy: { createdAt: 'desc' } },
  payableFees: true,
  trackingEvents: { where: { kind: 'LOGISTICS' }, orderBy: { happenedAt: 'desc' }, take: 1 },
  problemTickets: true
} as const;

export function summarizeShipmentReceivables(row: ShipmentWithRelations): Shipment['receivableSummary'] {
  const fees = [
    ...(row.receivableFees ?? []).filter((fee) => !fee.voided),
    ...(row.financeItems ?? []).filter((fee) => fee.type === 'RECEIVABLE' && !fee.voided)
  ];
  if (!fees.length) return undefined;
  const amountsByCurrency = new Map<string, number>();
  const settlementMethods = new Set<string>();
  fees.forEach((fee) => {
    const currency = fee.currency?.trim().toUpperCase() || 'RMB';
    amountsByCurrency.set(currency, roundMoney((amountsByCurrency.get(currency) ?? 0) + Number(fee.amount)));
    const settlementMethod = fee.settlementMethod?.trim();
    if (settlementMethod) settlementMethods.add(settlementMethod);
  });
  const amounts = [...amountsByCurrency.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => ({ currency, amount }));
  return {
    amounts,
    currencies: amounts.map((item) => item.currency),
    settlementMethods: [...settlementMethods].sort((left, right) => left.localeCompare(right))
  };
}

export function summarizeLinePoolFinanceRow(row: ShipmentWithRelations): LineShipmentFinanceSummary {
  const items: LineShipmentFinanceSourceItem[] = [
    ...(row.receivableFees ?? []).map((item) => ({
      type: 'RECEIVABLE' as const,
      amount: Number(item.amount),
      currency: item.currency ?? 'RMB',
      reconciliationStatus: (item.reconciliationStatus ?? 'PENDING') as LineShipmentFinanceSourceItem['reconciliationStatus'],
      receiptStatus: (item.receiptStatus ?? 'UNPAID') as LineShipmentFinanceSourceItem['receiptStatus']
    })),
    ...(row.payableFees ?? []).filter((item) => !item.voided).map((item) => ({
      type: 'PAYABLE' as const,
      amount: Number(item.amount),
      currency: 'RMB',
      settled: item.settled === true,
      reconciliationStatus: item.settled ? 'CONFIRMED' as const : 'PENDING' as const
    })),
    ...(row.financeItems ?? []).filter((item) => !item.voided).flatMap((item) => {
      if (!['RECEIVABLE', 'PAYABLE', 'BUSINESS_COST'].includes(item.type)) return [];
      return [{
        type: item.type as LineShipmentFinanceSourceItem['type'],
        amount: Number(item.amount),
        currency: item.currency ?? 'RMB',
        reconciliationStatus: (item.reconciliationStatus ?? 'PENDING') as LineShipmentFinanceSourceItem['reconciliationStatus'],
        receiptStatus: (item.receiptStatus ?? 'UNPAID') as LineShipmentFinanceSourceItem['receiptStatus'],
        settled: item.settled === true,
        billingUnit: (item.billingUnit === 'KG' ? 'KG' : item.billingUnit === 'CBM' ? 'CBM' : undefined) as LineShipmentFinanceSourceItem['billingUnit']
      }];
    })
  ];
  return summarizeLineShipmentFinance(items);
}

export function summarizeShipmentRouteCostsFromRow(row: ShipmentWithRelations) {
  return summarizeShipmentRouteCosts([
    ...(row.financeItems ?? []).filter((item) => item.type === 'PAYABLE').map((item) => ({
      name: item.name,
      amount: Number(item.amount),
      currency: item.currency,
      billingUnit: (item.billingUnit === 'KG' || item.billingUnit === 'CBM' ? item.billingUnit : undefined) as FinanceBillingUnit | undefined,
      billingQuantity: item.billingQuantity === null || item.billingQuantity === undefined ? undefined : Number(item.billingQuantity),
      chargeWeightKg: item.chargeWeightKg === null || item.chargeWeightKg === undefined ? undefined : Number(item.chargeWeightKg),
      unitPrice: item.unitPrice === null || item.unitPrice === undefined ? undefined : Number(item.unitPrice),
      voided: item.voided
    })),
    ...(row.payableFees ?? []).map((item) => ({ name: item.name, amount: Number(item.amount), currency: 'RMB' }))
  ]);
}

export function scopeShipmentRouteCostSummary(
  summary: Shipment['routeCostSummary'],
  visibility: { canViewDetails: boolean; canViewTotals: boolean }
): Shipment['routeCostSummary'] {
  if (!summary || (!visibility.canViewDetails && !visibility.canViewTotals)) return undefined;
  return {
    mainFreight: visibility.canViewDetails ? summary.mainFreight : undefined,
    otherFees: visibility.canViewDetails ? summary.otherFees : [],
    totals: visibility.canViewTotals ? summary.totals : []
  };
}

export function normalizeShipmentRouteArchive(value: unknown, createdAt?: Date): ShipmentRouteArchiveFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    agentChannelId: typeof row.agentChannelId === 'string' ? row.agentChannelId : undefined,
    agentChannelName: typeof row.agentChannelName === 'string' ? row.agentChannelName : undefined,
    routedAt: typeof row.routedAt === 'string' ? row.routedAt : createdAt?.toISOString()
  };
}

export function applyShipmentRouteArchiveFields(shipment: Shipment, archive?: ShipmentRouteArchiveFields): Shipment {
  if (!archive) return shipment;
  return {
    ...shipment,
    routeAgentChannelName: archive.agentChannelName ?? shipment.routeAgentChannelName,
    routedAt: archive.routedAt ?? shipment.routedAt
  };
}

export function normalizeShipmentDispatchArchive(value: unknown): ShipmentDispatchArchiveFields {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    handoverNo: typeof row.handoverNo === 'string' ? row.handoverNo : undefined,
    outboundBy: typeof row.outboundBy === 'string' ? row.outboundBy : undefined,
    batchDispatchSource: typeof row.batchDispatchSource === 'string' ? row.batchDispatchSource : undefined,
    outboundAt: typeof row.outboundAt === 'string' ? row.outboundAt : undefined
  };
}

export function applyShipmentDispatchArchiveFields(shipment: Shipment, archive?: ShipmentDispatchArchiveFields): Shipment {
  if (!archive) return shipment;
  return {
    ...shipment,
    handoverNo: archive.handoverNo ?? shipment.handoverNo,
    outboundBy: archive.outboundBy ?? shipment.outboundBy,
    batchDispatchSource: archive.batchDispatchSource ?? shipment.batchDispatchSource,
    outboundAt: shipment.outboundAt ?? archive.outboundAt
  };
}

export function mapShipmentOverview(row: ShipmentWithRelations): Shipment {
  const routePayable = row.financeItems?.find((item) => item.type === 'PAYABLE' && item.name === '代理成本' && !item.voided);
  const routeRemark = parseRoutePayableRemark(routePayable?.remark);
  const latestExternalTracking = (row as any).trackingEvents?.[0];
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    entryAt: (row as any).entryAt?.toISOString?.() ?? (row as any).entryAt ?? undefined,
    customerName: `${row.customer.code}-${row.customer.name}`,
    customerId: row.customer.id,
    customerCode: row.customer.code,
    salesperson: row.customer.salesperson ?? (row as any).entryBy ?? undefined,
    customerOrderNo: row.customerOrderNo,
    outboundOrderNo: resolveShipmentOutboundOrderNo(row),
    systemOrderNo: row.systemOrderNo,
    transferNo: row.transferNo ?? undefined,
    subOrderNo: (row as any).subOrderNo ?? undefined,
    draftWarehousePackageIds: row.draftWarehousePackageIds ?? [],
    inboundNo: (row as any).inboundNo ?? undefined,
    outboundAt: (row as any).outboundAt?.toISOString?.() ?? (row as any).outboundAt ?? undefined,
    productName: formatShipmentProductNames((row as any).productNames, (row as any).productName) || undefined,
    productNames: normalizeShipmentProductNames((row as any).productNames, (row as any).productName),
    declarationRequired: (row as any).declarationRequired ?? false,
    sensitive: (row as any).sensitive ?? false,
    cargoType: (row as any).cargoType ?? undefined,
    volumeCbm: (row as any).volumeCbm === null || (row as any).volumeCbm === undefined ? undefined : Number((row as any).volumeCbm),
    actualWeightKg: (row as any).actualWeightKg === null || (row as any).actualWeightKg === undefined ? undefined : Number((row as any).actualWeightKg),
    weightKg: (row as any).actualWeightKg === null || (row as any).actualWeightKg === undefined ? undefined : Number((row as any).actualWeightKg),
    cargoDataSource: (row as any).cargoDataSource === 'MANUAL_ADJUSTED' ? 'MANUAL_ADJUSTED' : 'AUTO_MATCHED',
    chargeWeightOverridden: Boolean((row as any).chargeWeightOverridden),
    settlementMethod: (row as any).settlementMethod ?? undefined,
    tradeTerms: (row as any).tradeTerms ?? undefined,
    fbaInboundNo: (row as any).fbaInboundNo ?? undefined,
    receiverName: (row as any).receiverName ?? undefined,
    receiverCompany: (row as any).receiverCompany ?? undefined,
    receiverPhone: (row as any).receiverPhone ?? undefined,
    receiverAddress: (row as any).receiverAddress ?? undefined,
    receiverCountry: (row as any).receiverCountry ?? undefined,
    receiverState: (row as any).receiverState ?? undefined,
    receiverPostalCode: (row as any).receiverPostalCode ?? undefined,
    fbaWarehouseCode: (row as any).fbaWarehouseCode ?? undefined,
    entryBy: (row as any).entryBy ?? undefined,
    businessReviewedBy: (row as any).businessReviewedBy ?? undefined,
    businessReviewedAt: (row as any).businessReviewedAt?.toISOString?.() ?? (row as any).businessReviewedAt ?? undefined,
    reviewedBy: (row as any).reviewedBy ?? undefined,
    reviewedAt: (row as any).reviewedAt?.toISOString?.() ?? (row as any).reviewedAt ?? undefined,
    reviewRejectedReason: (row as any).reviewRejectedReason ?? undefined,
    deletedAt: (row as any).deletedAt?.toISOString?.() ?? (row as any).deletedAt ?? undefined,
    deletedBy: (row as any).deletedBy ?? undefined,
    deletedReason: (row as any).deletedReason ?? undefined,
    deleteType: (row as any).deleteType ?? undefined,
    restoredAt: (row as any).restoredAt?.toISOString?.() ?? (row as any).restoredAt ?? undefined,
    restoredBy: (row as any).restoredBy ?? undefined,
    restoreMode: (row as any).restoreMode ?? undefined,
    etaAt: row.etaAt?.toISOString(),
    etdAt: row.etdAt?.toISOString(),
    remark: (row as any).remark ?? undefined,
    businessType: row.businessType as BusinessType,
    packageType: row.packageType as 'DOC' | 'WPX' | 'PAK',
    destinationCountry: row.destinationCountry,
    carrier: row.channel?.carrier?.name ?? '',
    packageCount: row.packageCount,
    receivableWeightKg: Number(row.receivableWeightKg),
    agentWeightKg: Number(row.agentWeightKg),
    chargeableWeightKg: Number(row.receivableWeightKg),
    latestTracking: (row as any).trackingEvents ? (latestExternalTracking?.status ?? '') : (row.latestTracking ?? ''),
    latestTrackingUpdatedAt: latestExternalTracking?.happenedAt?.toISOString?.() ?? latestExternalTracking?.happenedAt ?? undefined,
    trackingStaleDays: row.trackingStaleDays,
    isRemoteArea: row.isRemoteArea,
    status: row.status as ShipmentStatus,
    channelId: row.channelId ?? undefined,
    channelName: row.channel?.name ?? '',
    agentId: row.agentId ?? undefined,
    agentName: row.agent?.name ?? '',
    agentShortName: (row.agent as { shortName?: string } | null | undefined)?.shortName ?? row.agent?.name ?? '',
    routedAt: routePayable?.createdAt instanceof Date ? routePayable.createdAt.toISOString() : routePayable?.createdAt,
    routeAgentChannelName: routeRemark.agentChannelName,
    routeChargeWeightKg: routePayable?.chargeWeightKg === null || routePayable?.chargeWeightKg === undefined ? undefined : Number(routePayable.chargeWeightKg),
    routeUnitPrice: routePayable?.unitPrice === null || routePayable?.unitPrice === undefined ? undefined : Number(routePayable.unitPrice),
    routeOtherFee: routeRemark.otherFee,
    routeCostTotal: routePayable?.amount === null || routePayable?.amount === undefined ? undefined : Number(routePayable.amount),
    routeCurrency: routePayable?.currency ?? undefined,
    shippingMarkRequired: (row as any).shippingMarkRequired === true,
    warehouseOutboundRemark: (row as any).warehouseOutboundRemark ?? undefined,
    businessInvoiceName: (row as any).businessInvoiceName ?? undefined,
    businessInvoiceUrl: (row as any).businessInvoiceUrl ?? undefined,
    businessInvoiceUploadedBy: (row as any).businessInvoiceUploadedBy ?? undefined,
    businessInvoiceUploadedAt: (row as any).businessInvoiceUploadedAt?.toISOString?.() ?? (row as any).businessInvoiceUploadedAt ?? undefined,
    invoiceTemplateAvailable: agentInvoiceTemplateOptions(row.agent).length > 0,
    invoiceTemplateOptions: agentInvoiceTemplateOptions(row.agent),
    paymentAmountUsd: row.paymentAmountUsd === null ? undefined : Number(row.paymentAmountUsd),
    paymentAmountCny: row.paymentAmountCny === null ? undefined : Number(row.paymentAmountCny),
    paymentMethod: row.paymentMethod === null ? undefined : row.paymentMethod as ShipmentPaymentMethod,
    hasProblemTicket: row.problemTickets.some((ticket) => ticket.status !== 'CLOSED')
  };
}

export function withShipmentSite(shipment: Shipment, site?: string | null): Shipment {
  return { ...shipment, site: site?.trim() || '深圳思远' };
}

export function resolveInvoiceTemplateStoredFileName(templateUrl: string | null | undefined): string | undefined {
  if (!templateUrl?.startsWith('/api/uploads/invoice-templates/')) return undefined;
  let path: string;
  try {
    path = decodeURIComponent(new URL(templateUrl, 'http://siyuan.local').pathname);
  } catch {
    return undefined;
  }
  const prefix = '/api/uploads/invoice-templates/';
  if (!path.startsWith(prefix)) return undefined;
  const storedFileName = path.slice(prefix.length);
  if (!storedFileName || storedFileName !== basename(storedFileName) || !/\.xlsx?$/i.test(storedFileName)) return undefined;
  return storedFileName;
}

export function agentInvoiceTemplateOptions(agent: ShipmentWithRelations['agent'] | null | undefined) {
  return agentInvoiceTemplates(agent).flatMap(({ id, name, url }) => resolveInvoiceTemplateStoredFileName(url)
    ? [{ id, name }]
    : []);
}

export function agentInvoiceTemplates(agent: ShipmentWithRelations['agent'] | AgentSummary | null | undefined): AgentInvoiceTemplate[] {
  const stored = (agent as any)?.invoiceTemplates;
  if (Array.isArray(stored)) {
    return stored.flatMap((item): AgentInvoiceTemplate[] => {
      if (!item || typeof item !== 'object') return [];
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const name = typeof item.name === 'string' ? item.name.trim() : '';
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      return id && name && url ? [{ id, name, url }] : [];
    });
  }
  return [
    { id: 'legacy-1', name: (agent as any)?.invoiceTemplateName, url: (agent as any)?.invoiceTemplateUrl },
    { id: 'legacy-2', name: (agent as any)?.invoiceTemplateName2, url: (agent as any)?.invoiceTemplateUrl2 },
    { id: 'legacy-3', name: (agent as any)?.invoiceTemplateName3, url: (agent as any)?.invoiceTemplateUrl3 }
  ].flatMap(({ id, name, url }, index) => typeof url === 'string' && url.trim()
    ? [{ id, name: typeof name === 'string' && name.trim() ? name.trim() : `模板 ${index + 1}`, url: url.trim() }]
    : []);
}

function parseRoutePayableRemark(remark?: string | null): { agentChannelName?: string; otherFee?: number } {
  if (!remark?.startsWith('市场排货渠道：')) return {};
  const parts = remark.replace('市场排货渠道：', '').split('；');
  const otherFeePart = parts.find((part) => part.startsWith('其他费用：'));
  const otherFee = otherFeePart ? Number(otherFeePart.replace('其他费用：', '')) : undefined;
  return {
    agentChannelName: parts[0] || undefined,
    otherFee: Number.isFinite(otherFee) ? otherFee : undefined
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
