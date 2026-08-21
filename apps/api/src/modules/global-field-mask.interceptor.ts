import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
  StreamableFile
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import {
  globalFieldMaskKeys,
  type GlobalFieldMaskState,
  type Principal
} from './rbac.js';

const agentShortNameKeys = new Set([
  'agentshortname', 'routeagentshortname', 'agentabbreviation', 'agentalias', 'agents'
]);
const agentCompanyNameKeys = new Set([
  'agent', 'agentname', 'agentoptions', 'agentcompanyname', 'agentfullname', 'agentdetailedcompanyname', 'routeagentname'
]);
const agentChannelKeys = new Set([
  'agentchannel', 'agentchannelid', 'agentchannelname', 'routeagentchannelid', 'routeagentchannelname',
  'agentroute', 'agentrouteid', 'agentroutename'
]);
const bankDataKeys = new Set([
  'bankaccount', 'bankaccountid', 'accountno', 'payeeaccount', 'payeeaccountid', 'payeebankaccount', 'payeebankaccountid',
  'payerbankaccount', 'payerbankaccountid',
  'agentbankaccount', 'agentbankaccountid', 'accountname', 'bankname', 'bankaccountno',
  'payeebankaccountno', 'payerbankname', 'payerbankaccountname', 'payerbankaccountno'
]);
const agentDataKeys = new Set([
  ...agentShortNameKeys,
  ...agentCompanyNameKeys,
  ...agentChannelKeys,
  'agent', 'agents', 'agentid', 'agentcode', 'agentdata', 'agentdetail', 'agentdetails',
  'agentweight', 'agentweightkg', 'agentprice', 'agentunitprice', 'agentamount', 'agentcost', 'agentcosts',
  'agentcurrency', 'agentcontact', 'agentcontacts', 'agentbank', 'agentbanks', 'agentbankaccount',
  'invoiceagent'
]);
const payableCostKeys = new Set([
  'payablecost', 'payablecosts', 'payableamount', 'payableamounts', 'payabletotal',
  'payabletotalamount', 'payablecosttotals', 'payablecurrency', 'payablefee',
  'payablefees', 'routechargeweightkg', 'routeunitprice', 'routeotherfee', 'routecosttotal', 'routecurrency',
  'routecostsummary', 'costamount', 'costtotal',
  'cost', 'costperkg', 'costpercbm', 'costunitprice', 'costprice', 'costcurrency', 'costsource',
  'originalcost', 'unitcost', 'markup', 'markups', 'markupperkg', 'markuppercbm',
  'markupvalue', 'markuprange', 'markupbuckets', 'actualmarkup', 'linesmarkupperkg', 'linemarkupperkg',
  'calculation', 'pricebookrow', 'pricebookrows',
  'grossprofit', 'profit', 'profits', 'profitsection', 'profitsections', 'profitamount', 'profitrate',
  'grossmargin', 'marginamount', 'marginrate'
]);
const payableStatusKeys = new Set([
  'payablestatus', 'payablestatuses', 'payablelocked', 'payablesettled', 'paymentstatus', 'paymentapplicationstatus'
]);
const contextualPayableStatusKeys = new Set([
  'auditstatus', 'hangstatus', 'attributionstatus', 'cashstatus', 'confirmationstatus', 'matchstatus',
  'applicationstatus', 'progressstatus', 'settlementstatus', 'reconciliationstatus', 'writeoffstatus',
  'verificationstatus', 'lockstatus', 'paidstatus', 'paidat', 'settledat', 'verifiedat',
  'archivedat', 'voidedat', 'voided'
]);
// Query controls such as costScope select a view; they are not payable data.
// Keep them usable when the response's payable fields are globally masked.
const nonSensitiveControlKeys = new Set(['costscope']);
const businessCostSafeKeys = new Set([
  'type', 'name', 'amount', 'currency', 'billingunit', 'billingquantity',
  'chargeweightkg', 'unitprice', 'amountoverridden', 'remark', 'settlementmethod',
  'createdat', 'updatedat', 'createdby', 'reviewedat', 'reviewedby', 'reconciliationstatus'
]);

function normalizedKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isBusinessCostRecord(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const type = (value as Record<string, unknown>).type;
  return typeof type === 'string' && normalizedKey(type) === 'businesscost';
}

function hasAnyMask(state?: GlobalFieldMaskState): boolean {
  return Boolean(state && globalFieldMaskKeys.some((key) => state[key]));
}

function isAgentMasterPath(requestPath: string): boolean {
  return /\/master-data\/(?:agents|agent-channels)(?:\/|\?|$)/i.test(requestPath);
}

function isAgentChannelMasterPath(requestPath: string): boolean {
  return /\/master-data\/agent-channels(?:\/|\?|$)/i.test(requestPath);
}

function isPricingCostPath(requestPath: string): boolean {
  return /\/api\/pricing\/(?:book-rows|books(?:\/|\?|$)|markup-rules(?:\/|\?|$)|rules(?:\/|\?|$)|south-africa\/(?:rules|images)(?:\/|\?|$)|legacy\/sources(?:\/|\?|$))/i.test(requestPath);
}

function isPricingAgentPath(requestPath: string): boolean {
  return /\/api\/pricing\/(?:book-rows(?:\/|\?|$)|books(?:\/|\?|$)|markup-rules(?:\/|\?|$)|legacy\/(?:sources|rebuild|dubai-air-sea(?:\/|\?|$))(?:\/|\?|$)|cleanup-old-original-agents(?:\/|\?|$))/i.test(requestPath);
}

function isPricingInternalFieldPath(requestPath: string): boolean {
  return /\/api\/pricing\/(?:book-rows|books|markup-rules|legacy)(?:\/|\?|$)/i.test(requestPath);
}

function isPricingPath(requestPath: string): boolean {
  return /\/api\/pricing(?:\/|\?|$)/i.test(requestPath);
}

function isPricingQuotePath(requestPath: string): boolean {
  return /\/api\/pricing\/(?:quote|lookup|rules\/quote|legacy\/[^/?]+\/quote)(?:\/|\?|$)/i.test(requestPath);
}

function isDirectPayerBankDataPath(requestPath: string): boolean {
  return /\/api\/master-data\/payer-bank-accounts(?:\/|\?|$)/i.test(requestPath);
}

function isDirectBankDataPath(requestPath: string): boolean {
  return /\/api\/(?:master-data\/payer-bank-accounts|finance\/(?:payee|agent)-bank-accounts)(?:\/|\?|$)/i.test(requestPath);
}

function isRepositorySanitizedInternalFlowSummary(
  requestPath: string,
  key: string,
  ancestors: readonly string[]
): boolean {
  return key === 'summary'
    && ancestors.length === 2
    && normalizedKey(ancestors[0] ?? '') === 'items'
    && /^\d+$/.test(ancestors[1] ?? '')
    && /\/api\/operations\/line-shipments\/[^/?]+\/internal-flow-log(?:\?|$)/i.test(requestPath);
}

export function isGlobalSensitiveFilePathBlocked(requestPath: string, state: GlobalFieldMaskState): boolean {
  const path = requestPath.split('?')[0] ?? requestPath;
  if (!/(?:export|download|attachment|voucher|template|\/file(?:\/|$)|\/image(?:\/|$)|shipment-label)/i.test(path)) return false;
  if (/\/api\/finance\/voucher-images$/i.test(path)) return false;
  const agentMasked = state['agent-short-name'] || state['agent-company-name'] || state['agent-channel'] || state['agent-data'];
  if (/\/api\/shipments\/[^/]+\/invoice-template\/download$/i.test(path)) return false;
  if (/invoice-template/i.test(path)) return agentMasked;
  if (/\/shipments\/[^/]+\/invoice\/download$/i.test(path)) return agentMasked;
  if (/(?:\/labels?(?:\/|$)|tally-tasks\/[^/]+\/label(?:\/|$)|shipment-label)/i.test(path)) return false;
  // 迪拜查价页展示的是已发布、销售安全的业务价表图片，不包含原始价格表下载内容。
  // 全局敏感字段屏蔽不应阻断业务员查看该展示图片；价格表原始下载/版本图片仍继续受保护。
  if (/\/pricing\/legacy\/dubai-air-sea\/display-pages\/[^/]+\/image$/i.test(path)) return false;
  if (/\/api\/finance\/(?:receivable-audits|water-receipts)\/export$/i.test(path)) return false;
  if (/\/api\/warehouse\/rent-details\/export$/i.test(path)) return false;
  if (agentMasked
    && /(?:agent|shipment|operation|routing|pricing|warehouse|customer-service|audit|lineage)/i.test(path)) return true;
  if (state['payable-cost']
    && /(?:finance|shipment|operation|routing|pricing|misc-fee|audit|lineage)/i.test(path)) return true;
  return state['payable-status']
    && /(?:payable|pending-payment|paid-payment|payment-application|agent-bill|misc-fee|shipment|operation|routing|audit|lineage)/i.test(path);
}

function fieldIsMasked(
  rawKey: string,
  state: GlobalFieldMaskState,
  requestPath: string,
  ancestors: readonly string[],
  businessCostRecord = false
): boolean {
  const key = normalizedKey(rawKey);
  if (nonSensitiveControlKeys.has(key)) return false;
  const ancestorPath = ancestors.map(normalizedKey).join('.');
  const agentMaster = isAgentMasterPath(requestPath) || /(?:^|\.)(?:agent|agents|agentdetail|agentdetails)(?:\.|$)/.test(ancestorPath);
  const marketCostMutation = /\/api\/shipments\/[^/]+\/(?:route|finance-items)(?:\/|\?|$)/i.test(requestPath);
  const requestContext = `${requestPath}.${ancestorPath}`.replace(/[^a-z0-9.]/gi, '').toLowerCase();
  const pricingInternalContext = isPricingInternalFieldPath(requestPath);
  const pricingContext = isPricingPath(requestPath);
  const pricingQuoteContext = isPricingQuotePath(requestPath);
  const bankContext = /(?:bank|payment|payee|payer)/i.test(requestPath) || /(?:bank|payment|payee|payer)/i.test(ancestorPath);
  const payerBankContext = isDirectPayerBankDataPath(requestPath)
    || /(?:payerbank|payer)/i.test(`${ancestorPath}.${key}`);
  // Business cost is an independent finance section. A payable-cost mask must
  // not remove it just because its field names contain "cost" or "amount".
  const businessCostContext = businessCostRecord || /businesscost/.test(requestContext) || key.startsWith('businesscost');
  const payableContext = marketCostMutation || /payable|payment|settlement|reconciliation|writeoff|routecost|agentcost|profit|margin|miscfeehang/
    .test(requestContext);
  const agentMasked = state['agent-short-name'] || state['agent-company-name'] || state['agent-channel'] || state['agent-data'];
  const bankMasked = agentMasked || state['payable-cost'];
  const narrativeContext = /(?:audit|lineage|internal-flow|flow-log|notification)/i.test(requestPath);
  const invoiceTemplateOptionContext = /(?:^|\.)invoicetemplateoptions(?:\.|$)/.test(ancestorPath);

  // Shipment access grants template download independently from agent identity.
  // Keep opaque template ids for selection, but never expose template names to
  // a role whose agent fields are globally masked.
  if (agentMasked && invoiceTemplateOptionContext && key === 'name') return true;

  // Quote diagnostics may contain a fixed list of provider errors. Keep the
  // response shape but never expose provider identifiers to a masked caller.
  if (agentMasked && key === 'agenterrors') return true;

  if ((agentMasked || state['payable-cost'] || state['payable-status']) && key === 'raw') return true;
  if (narrativeContext && ['summary', 'message', 'description', 'detail', 'details'].includes(key)
    && !isRepositorySanitizedInternalFlowSummary(requestPath, key, ancestors)
    && (agentMasked || state['payable-cost'] || state['payable-status'])) return true;

  if ((state['agent-short-name'] || state['agent-data'])
    && (agentShortNameKeys.has(key) || agentMaster && key === 'shortname'
      || key.includes('agent') && /(?:shortname|abbreviation|alias)/.test(key))) {
    if (pricingQuoteContext && key === 'agents') return false;
    return true;
  }
  if ((state['agent-company-name'] || state['agent-data'])
    && (agentCompanyNameKeys.has(key) || agentMaster && ['name', 'companyname', 'detailedcompanyname'].includes(key)
      || key.includes('agent') && /(?:name|company)/.test(key))) {
    if (pricingQuoteContext && key === 'agentname') return false;
    return true;
  }
  if ((state['agent-channel'] || state['agent-data'])
    && (agentChannelKeys.has(key) || isAgentChannelMasterPath(requestPath) && ['name', 'channelname', 'channelid'].includes(key)
      || key.includes('agent') && /(?:channel|route)/.test(key))) {
    if (pricingQuoteContext && ['channelname', 'realchannelname', 'routechannelname'].includes(key)) return false;
    return true;
  }
  // Pricing responses use agentName as a short-name/alias in several quote
  // and price-book contracts, while channelName may be either the mapped
  // agent channel or the resolved route channel. Keep those identity fields
  // hidden across all pricing read paths, not only internal management APIs.
  // Ordinary quote contracts require these stable strings for sorting and
  // rendering. Repositories replace them with a non-sensitive route code
  // when the caller is masked; deleting them here would leave blank cells or
  // crash clients that call localeCompare on the required fields.
  if (!pricingQuoteContext && pricingContext && (state['agent-short-name'] || state['agent-data']) && key === 'agentname') return true;
  if (!pricingQuoteContext && pricingContext && (state['agent-channel'] || state['agent-data'])
    && ['channelname', 'realchannelname', 'routechannelname'].includes(key)) return true;
  if (bankContext && bankDataKeys.has(key)) {
    const bankFieldMasked = payerBankContext ? state['payable-cost'] : bankMasked;
    if (bankFieldMasked) return true;
  }
  if (state['agent-data'] && (agentDataKeys.has(key) || key.includes('agent') && key !== 'useragent')) {
    if (pricingQuoteContext && ['agentname', 'channelname', 'realchannelname', 'routechannelname'].includes(key)) return false;
    return true;
  }
  const businessCostFieldIsSafe = businessCostContext && businessCostSafeKeys.has(key);
  if (state['payable-cost'] && !businessCostFieldIsSafe && (payableCostKeys.has(key)
    || /(?:profit|margin)/.test(key)
    || /payable/.test(key) && /(?:amount|total|currency|fee|price|rate|quantity|weight)/.test(key)
    || payableContext && /(?:amount|total|currency|unitprice|price|rate|quantity|weight)/.test(key))) return true;
    if (state['payable-status'] && !businessCostFieldIsSafe && (payableStatusKeys.has(key)
    || payableContext && contextualPayableStatusKeys.has(key)
    || /(?:payable|payment)/.test(key) && /(?:status|settled|locked|paid|verified)/.test(key)
    || payableContext && /(?:status|settled|locked|paid|verified|voided|pendingcount|confirmedcount|voidedcount|waitingpaymentcount|paidcount)/.test(key))) return true;
  return false;
}

function isEmptyMaskedRequestValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'string' && value.trim() === '';
}

function isOrderEntryFinancePath(requestPath: string): boolean {
  const path = requestPath.split('?')[0] ?? requestPath;
  return /\/api\/shipments\/order-entry(?:\/|$)/i.test(path)
    || /\/api\/shipments\/[^/]+\/order-entry-draft(?:\/|$)/i.test(path);
}

/**
 * Masked finance fields are optional on order entry. If an old client still
 * sends one, remove only that field and let the ordinary order payload save;
 * all other endpoints continue to use the strict request deny policy below.
 */
export function stripGlobalSensitiveRequestFields<T>(
  value: T,
  state: GlobalFieldMaskState | undefined,
  requestPath: string,
  ancestors: readonly string[] = []
): T {
  if (!state || !hasAnyMask(state) || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item, index) => stripGlobalSensitiveRequestFields(item, state, requestPath, [...ancestors, String(index)])) as T;
  }
  if (typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
  const businessCostRecord = isBusinessCostRecord(value);
  const stripped = Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) => {
      const orderEntryFinanceContainer = isOrderEntryFinancePath(requestPath)
        && state['payable-cost']
        && normalizedKey(key) === 'payables';
      return !(fieldIsMasked(key, state, requestPath, ancestors, businessCostRecord) || orderEntryFinanceContainer)
        || isEmptyMaskedRequestValue(item);
    })
    .map(([key, item]) => [key, stripGlobalSensitiveRequestFields(item, state, requestPath, [...ancestors, key])]));
  return stripped as T;
}

export function assertGlobalFieldMaskRequestAllowed(
  value: unknown,
  state: GlobalFieldMaskState | undefined,
  requestPath: string,
  ancestors: readonly string[] = []
): void {
  if (!state || !hasAnyMask(state) || value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertGlobalFieldMaskRequestAllowed(item, state, requestPath, [...ancestors, String(index)]));
    return;
  }
  if (typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return;
  const businessCostRecord = isBusinessCostRecord(value);
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizedKey(key);
    const requestContext = `${requestPath}.${ancestors.join('.')}`.replace(/[^a-z0-9.]/gi, '').toLowerCase();
    const payableRequestContext = /payable|pendingpayment|paidpayment|paymentapplication|agentbill|miscfee/.test(requestContext);
    const agentMasked = state['agent-short-name'] || state['agent-company-name'] || state['agent-channel'] || state['agent-data'];
    if (isPricingQuotePath(requestPath) && agentMasked) {
      if (normalized === 'agentname' && !isEmptyMaskedRequestValue(item)) {
        throw new ForbiddenException('总规则已屏蔽报价代理字段，不能按代理筛选');
      }
      if ((state['agent-channel'] || state['agent-data'])
        && ['channel', 'channelname', 'realchannelname', 'routechannelname'].includes(normalized)
        && !isEmptyMaskedRequestValue(item)) {
        throw new ForbiddenException('总规则已屏蔽报价代理渠道，不能按渠道筛选');
      }
    }
    if (payableRequestContext && ['sortby', 'orderby', 'sortfield'].includes(normalized) && typeof item === 'string') {
      const sortValue = normalizedKey(item);
      if (state['payable-cost'] && /(?:amount|total|currency|cost|profit|margin|price|rate)/.test(sortValue)) {
        throw new ForbiddenException('总规则已屏蔽该排序字段');
      }
      if (state['payable-status'] && /(?:status|settled|locked|paid|verified|voided)/.test(sortValue)) {
        throw new ForbiddenException('总规则已屏蔽该排序字段');
      }
    }
    if (fieldIsMasked(key, state, requestPath, ancestors, businessCostRecord) && !isEmptyMaskedRequestValue(item)) {
      throw new ForbiddenException('总规则已屏蔽该字段，不能查看或修改');
    }
    assertGlobalFieldMaskRequestAllowed(item, state, requestPath, [...ancestors, key]);
  }
}

export function maskGlobalSensitiveValue<T>(
  value: T,
  state: GlobalFieldMaskState | undefined,
  requestPath = '',
  ancestors: readonly string[] = []
): T {
  if (!state || !hasAnyMask(state) || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item, index) => maskGlobalSensitiveValue(item, state, requestPath, [...ancestors, String(index)])) as T;
  }
  if (typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value) || value instanceof StreamableFile) return value;
  const businessCostRecord = isBusinessCostRecord(value);
  const masked = Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .flatMap(([key, item]) => {
      if (!fieldIsMasked(key, state, requestPath, ancestors, businessCostRecord)) {
        return [[key, maskGlobalSensitiveValue(item, state, requestPath, [...ancestors, key])]];
      }
      // Keep collection-shaped response contracts intact while removing the
      // protected rows. Consumers can safely iterate an empty collection;
      // omitting the key makes otherwise unrelated pages crash on \`.filter\`.
      return Array.isArray(item) ? [[key, []]] : [];
    }));
  return masked as T;
}

function maskAiFinanceRows(value: unknown, state: GlobalFieldMaskState): unknown {
  if (Array.isArray(value)) return value.map((item) => maskAiFinanceRows(item, state));
  if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (normalizedKey(key) !== 'financerows' || !Array.isArray(item)) {
      return [key, maskAiFinanceRows(item, state)];
    }
    return [key, item.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
      const record = row as Record<string, unknown>;
      const rowKey = typeof record.key === 'string' ? normalizedKey(record.key) : '';
      const hidesCost = state['payable-cost'] && rowKey === 'payable';
      const hidesStatus = state['payable-status'] && rowKey === 'payable';
      return Object.fromEntries(Object.entries(record).filter(([field]) => {
        const normalizedField = normalizedKey(field);
        if (hidesCost && normalizedField === 'rmbtotal') return false;
        if (hidesStatus && ['pendingcount', 'confirmedcount', 'voidedcount'].includes(normalizedField)) return false;
        return true;
      }));
    })];
  }));
}

export function maskGlobalSensitiveAiContext<T>(
  value: T,
  state: GlobalFieldMaskState | undefined
): T {
  if (!state || !hasAnyMask(state)) return value;
  return maskGlobalSensitiveValue(maskAiFinanceRows(value, state), state, '/api/ai/assist') as T;
}

@Injectable()
export class GlobalFieldMaskInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      body?: unknown;
      query?: unknown;
      params?: unknown;
      method?: string;
      originalUrl?: string;
      url?: string;
      user?: Principal;
    }>();
    const state = request.user?.globalFieldMasks;
    const requestPath = request.originalUrl ?? request.url ?? '';
    if (!state || !hasAnyMask(state)) return next.handle();

    if (state['agent-data'] && isAgentMasterPath(requestPath)) {
      throw new ForbiddenException('总规则已全局屏蔽代理数据');
    }
    if (state['agent-channel'] && isAgentChannelMasterPath(requestPath)) {
      throw new ForbiddenException('总规则已全局屏蔽代理渠道');
    }
    if (state['payable-cost'] && isPricingCostPath(requestPath)) {
      throw new ForbiddenException('总规则已屏蔽报价内部成本数据');
    }
    if (isPricingAgentPath(requestPath)
      && (state['agent-short-name'] || state['agent-company-name'] || state['agent-channel'] || state['agent-data'])) {
      throw new ForbiddenException('总规则已屏蔽报价代理字段');
    }
    const bankMasked = state['agent-short-name'] || state['agent-company-name'] || state['agent-channel'] || state['agent-data'] || state['payable-cost'];
    const directBankDataMasked = isDirectPayerBankDataPath(requestPath) ? state['payable-cost'] : bankMasked;
    if (directBankDataMasked && isDirectBankDataPath(requestPath)) {
      throw new ForbiddenException('总规则已屏蔽银行资料');
    }
    if (isGlobalSensitiveFilePathBlocked(requestPath, state)) {
      throw new ForbiddenException('总规则已屏蔽该导出或下载中的敏感数据');
    }
    if (!/\/ai\/assist(?:\?|$)/i.test(requestPath)) {
      const requestBody = isOrderEntryFinancePath(requestPath)
        ? stripGlobalSensitiveRequestFields(request.body, state, requestPath)
        : request.body;
      if (isOrderEntryFinancePath(requestPath)) request.body = requestBody;
      assertGlobalFieldMaskRequestAllowed(requestBody, state, requestPath);
    }
    assertGlobalFieldMaskRequestAllowed(request.query, state, requestPath);
    assertGlobalFieldMaskRequestAllowed(request.params, state, requestPath);

    return next.handle().pipe(map((value) => maskGlobalSensitiveValue(value, state, requestPath)));
  }
}
