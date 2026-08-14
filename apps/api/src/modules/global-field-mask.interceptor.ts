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
  'agentshortname', 'routeagentshortname', 'agentabbreviation', 'agentalias'
]);
const agentCompanyNameKeys = new Set([
  'agentname', 'agentcompanyname', 'agentfullname', 'agentdetailedcompanyname', 'routeagentname'
]);
const agentChannelKeys = new Set([
  'agentchannel', 'agentchannelid', 'agentchannelname', 'routeagentchannelid', 'routeagentchannelname',
  'agentroute', 'agentrouteid', 'agentroutename'
]);
const agentDataKeys = new Set([
  ...agentShortNameKeys,
  ...agentCompanyNameKeys,
  ...agentChannelKeys,
  'agent', 'agents', 'agentid', 'agentcode', 'agentdata', 'agentdetail', 'agentdetails',
  'agentweight', 'agentweightkg', 'agentprice', 'agentunitprice', 'agentamount', 'agentcost', 'agentcosts',
  'agentcurrency', 'agentcontact', 'agentcontacts', 'agentbank', 'agentbanks', 'agentbankaccount',
  'invoiceagent', 'invoicetemplateavailable', 'invoicetemplateoptions'
]);
const payableCostKeys = new Set([
  'payablecost', 'payablecosts', 'payableamount', 'payableamounts', 'payabletotal',
  'payabletotalamount', 'payablecosttotals', 'payablecurrency', 'payablefee',
  'payablefees', 'routechargeweightkg', 'routeunitprice', 'routeotherfee', 'routecosttotal', 'routecurrency',
  'routecostsummary', 'businesscost', 'businesscosts', 'businesscosttotal', 'costamount', 'costtotal',
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
const masterDataRequiredMaskedCollectionKeys = new Set(['agents', 'agentchannels']);

function normalizedKey(key: string): string {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function shouldPreserveMaskedEmptyCollection(
  rawKey: string,
  value: unknown,
  requestPath: string,
  ancestors: readonly string[]
): boolean {
  const path = requestPath.split('?')[0] ?? requestPath;
  return ancestors.length === 0
    && /^\/api\/master-data\/?$/i.test(path)
    && Array.isArray(value)
    && value.length === 0
    && masterDataRequiredMaskedCollectionKeys.has(normalizedKey(rawKey));
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

export function isGlobalSensitiveFilePathBlocked(requestPath: string, state: GlobalFieldMaskState): boolean {
  const path = requestPath.split('?')[0] ?? requestPath;
  if (!/(?:export|download|attachment|voucher|template|\/file(?:\/|$)|\/image(?:\/|$)|shipment-label)/i.test(path)) return false;
  if (/\/api\/finance\/voucher-images$/i.test(path)) return false;
  const agentMasked = state['agent-short-name'] || state['agent-company-name'] || state['agent-channel'] || state['agent-data'];
  if (/invoice-template/i.test(path)) return agentMasked;
  if (/\/shipments\/[^/]+\/invoice\/download$/i.test(path)) return agentMasked;
  if (/(?:\/labels?(?:\/|$)|tally-tasks\/[^/]+\/label(?:\/|$)|shipment-label)/i.test(path)) return false;
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
  ancestors: readonly string[]
): boolean {
  const key = normalizedKey(rawKey);
  if (nonSensitiveControlKeys.has(key)) return false;
  const ancestorPath = ancestors.map(normalizedKey).join('.');
  const agentMaster = isAgentMasterPath(requestPath) || /(?:^|\.)(?:agent|agents|agentdetail|agentdetails)(?:\.|$)/.test(ancestorPath);
  const payableContext = /payable|payment|settlement|reconciliation|writeoff|routecost|businesscost|agentcost|profit|margin|miscfeehang/
    .test(`${requestPath}.${ancestorPath}`.replace(/[^a-z0-9.]/gi, '').toLowerCase());
  const agentMasked = state['agent-short-name'] || state['agent-company-name'] || state['agent-channel'] || state['agent-data'];
  const narrativeContext = /(?:audit|lineage|internal-flow|flow-log|notification)/i.test(requestPath);

  if ((agentMasked || state['payable-cost'] || state['payable-status']) && key === 'raw') return true;
  if (narrativeContext && ['summary', 'message', 'description', 'detail', 'details'].includes(key)
    && (agentMasked || state['payable-cost'] || state['payable-status'])) return true;

  if ((state['agent-short-name'] || state['agent-data'])
    && (agentShortNameKeys.has(key) || agentMaster && key === 'shortname'
      || key.includes('agent') && /(?:shortname|abbreviation|alias)/.test(key))) return true;
  if ((state['agent-company-name'] || state['agent-data'])
    && (agentCompanyNameKeys.has(key) || agentMaster && ['name', 'companyname', 'detailedcompanyname'].includes(key)
      || key.includes('agent') && /(?:name|company)/.test(key))) return true;
  if ((state['agent-channel'] || state['agent-data'])
    && (agentChannelKeys.has(key) || isAgentChannelMasterPath(requestPath) && ['name', 'channelname', 'channelid'].includes(key)
      || key.includes('agent') && /(?:channel|route)/.test(key))) return true;
  if (state['agent-data'] && (agentDataKeys.has(key) || key.includes('agent') && key !== 'useragent')) return true;
  if (state['payable-cost'] && (payableCostKeys.has(key)
    || /(?:cost|profit|margin)/.test(key)
    || /payable/.test(key) && /(?:amount|total|currency|fee|price|rate|quantity|weight)/.test(key)
    || payableContext && /(?:amount|total|currency|unitprice|price|rate|quantity|weight)/.test(key))) return true;
  if (state['payable-status'] && (payableStatusKeys.has(key)
    || payableContext && contextualPayableStatusKeys.has(key)
    || /(?:payable|payment)/.test(key) && /(?:status|settled|locked|paid|verified)/.test(key)
    || payableContext && /(?:status|settled|locked|paid|verified|voided|pendingcount|confirmedcount|voidedcount|waitingpaymentcount|paidcount)/.test(key))) return true;
  return false;
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
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizedKey(key);
    const requestContext = `${requestPath}.${ancestors.join('.')}`.replace(/[^a-z0-9.]/gi, '').toLowerCase();
    const payableRequestContext = /payable|pendingpayment|paidpayment|paymentapplication|agentbill|miscfee/.test(requestContext);
    if (payableRequestContext && ['sortby', 'orderby', 'sortfield'].includes(normalized) && typeof item === 'string') {
      const sortValue = normalizedKey(item);
      if (state['payable-cost'] && /(?:amount|total|currency|cost|profit|margin|price|rate)/.test(sortValue)) {
        throw new ForbiddenException('总规则已屏蔽该排序字段');
      }
      if (state['payable-status'] && /(?:status|settled|locked|paid|verified|voided)/.test(sortValue)) {
        throw new ForbiddenException('总规则已屏蔽该排序字段');
      }
    }
    if (fieldIsMasked(key, state, requestPath, ancestors)) {
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
  const masked: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (fieldIsMasked(key, state, requestPath, ancestors)) {
      if (shouldPreserveMaskedEmptyCollection(key, item, requestPath, ancestors)) masked[key] = [];
      continue;
    }
    masked[key] = maskGlobalSensitiveValue(item, state, requestPath, [...ancestors, key]);
  }
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
      const hidesCost = state['payable-cost'] && (rowKey === 'payable' || rowKey === 'businesscost');
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
    if (isGlobalSensitiveFilePathBlocked(requestPath, state)) {
      throw new ForbiddenException('总规则已屏蔽该导出或下载中的敏感数据');
    }
    if (!/\/ai\/assist(?:\?|$)/i.test(requestPath)) {
      assertGlobalFieldMaskRequestAllowed(request.body, state, requestPath);
    }
    assertGlobalFieldMaskRequestAllowed(request.query, state, requestPath);
    assertGlobalFieldMaskRequestAllowed(request.params, state, requestPath);

    return next.handle().pipe(map((value) => maskGlobalSensitiveValue(value, state, requestPath)));
  }
}
