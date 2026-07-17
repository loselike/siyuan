import type { ChangeEvent, Key } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, Collapse, Dropdown, Form, Input, InputNumber, Modal, Popconfirm, Progress, Row, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, CheckCircle2, Copy, Download, Eye, FileInput, MoreHorizontal, PackageCheck, Power, RefreshCw, Search, Settings, SlidersHorizontal, Trash2 } from 'lucide-react';
import { normalizeUsPostalCode, type AgentMarkupCreateInput, type AgentMarkupListQuery, type AgentMarkupListResponse, type AgentMarkupMetrics, type AgentMarkupSummary, type AgentMarkupType, type AgentMarkupUnit, type AgentSummary, type DubaiPriceDisplayPageSummary, type DubaiPriceDisplayResponse, type DubaiPriceDisplayVersionSummary, type LegacyPricingMetaResponse, type LegacyPricingModule, type LegacyPricingQuoteRequest, type LegacyPricingQuoteResponse, type LegacyPricingRecommendation, type MasterDataSnapshot, type PriceBookImportJobSummary, type PriceBookImportTargetModule, type PriceBookRowMarkupSource, type PriceBookRowSummary, type PriceBookSummary, type PriceLookupRecommendation, type PriceLookupResponse, type PricingRuleRefreshProgressResponse, type PricingSyncHealthResponse, type PricingSyncHealthRow, type SouthAfricaLookupResponse, type SouthAfricaRateRuleInput, type SouthAfricaRateRuleSummary, type StaffRoleKey } from '@siyuan/shared';
import { ApiClient, type PermissionKey } from '../../apiClient';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { formatCurrency } from '../shared/format';
import { countryOptions, filterLocationOption } from '../finance/entry/countryStateOptions';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import { calculatePriceChargeableWeight, seedImportedPriceRows, type ImportedPriceRow, type PriceLookupFormValues } from './excel';
import { MarkupRouteEditor } from './MarkupRouteEditor';

const { Title, Text } = Typography;

interface AgentMarkupFormValues {
  priceBookId?: string;
  agentName: string;
  channelName?: string;
  realChannelName?: string;
  destinationCountry?: string;
  markupType: AgentMarkupType;
  markupValue: number;
  markupPerKg: number;
  priority: number;
  enabled: 'true' | 'false';
}

interface ChannelTierMarkupFormValues {
  agentName: string;
  channelKey: string;
  tiers: Array<{ minChargeableValue: number; maxChargeableValue?: number; markupValue: number }>;
}

interface ChannelTierOption {
  key: string;
  channelName: string;
  realChannelName?: string;
  markupUnit: AgentMarkupUnit;
}

interface PriceBookRemarkFormValues {
  customRemark?: string;
}

interface SouthAfricaRateRuleFormValues {
  category: string;
  name: string;
  keywords: string;
  pricingMode: 'fixed' | 'consult';
  ratePerCbm?: number;
  remark?: string;
}

type AgentMarkupRule = AgentMarkupSummary;
type MarkupDisplayRule = AgentMarkupRule & {
  priceBookId?: string;
  priceBookFileName?: string;
  isPriceBookGroup?: boolean;
};
type PriceBookRecord = PriceBookSummary;
type PriceRecommendation = PriceLookupRecommendation;
type PriceLookupResult = PriceLookupResponse;
type LegacyLookupFormValues = PriceLookupFormValues
  & Partial<Omit<LegacyPricingQuoteRequest, 'module' | 'cargoType'>>
  & { cargoType?: LegacyPricingQuoteRequest['cargoType'] | 'ALL' };
const legacyPricingModules: Array<{ key: LegacyPricingModule; label: string }> = [
  { key: 'amazon', label: '亚马逊查询' },
  { key: 'inquiry', label: '欧洲超大件综合查询' },
  { key: 'europeExpress', label: '欧洲空海运铁路快递查询' },
  { key: 'southAfrica', label: '南非专线查询' },
  { key: 'usaAirSea', label: '美国空海运查询' },
  { key: 'canadaAirSea', label: '加拿大空海查询' },
  { key: 'dubaiAirSea', label: '迪拜空海运查询' }
];

const lookupPermissionByModule: Record<LegacyPricingModule, PermissionKey> = {
  amazon: 'pricing:lookup:amazon',
  inquiry: 'pricing:lookup:europe-oversize',
  europeExpress: 'pricing:lookup:europe-express',
  southAfrica: 'pricing:lookup:south-africa',
  usaAirSea: 'pricing:lookup:usa-air-sea',
  canadaAirSea: 'pricing:lookup:canada-air-sea',
  dubaiAirSea: 'pricing:lookup:dubai-air-sea'
};

export const priceBookImportModules: Array<{ key: PriceBookImportTargetModule; label: string }> = legacyPricingModules;

function isAirSeaPricingModule(module: LegacyPricingModule) {
  return module === 'usaAirSea' || module === 'canadaAirSea' || module === 'dubaiAirSea';
}

const markupDestinationNames = [
  '美国', '加拿大', '英国', '德国', '法国', '意大利', '西班牙', '葡萄牙', '荷兰', '比利时', '卢森堡',
  '奥地利', '丹麦', '芬兰', '瑞典', '波兰', '捷克', '匈牙利', '爱尔兰', '希腊', '保加利亚', '克罗地亚',
  '爱沙尼亚', '拉脱维亚', '立陶宛', '斯洛伐克', '斯洛文尼亚', '塞尔维亚', '南非', '迪拜', '阿联酋'
];
const markupRouteArtifactPattern = /系统下单渠道|国家\/重量区间|备注|时效|头程进我司|后端进行|单独卡车/i;
const markupDestinationArtifactPattern = /(?:^|\s)[A-Z][:：]|头程|后端|备注|时效|系统下单渠道|\n/;

/** 与查价卡相同：优先使用已解析的显示渠道，绝不把源表表头拼接串当作线路名。 */
export function getMarkupRowLookupChannel(row: Pick<ImportedPriceRow, 'channelName' | 'businessRouteName' | 'realChannelName'>) {
  const candidates = [row.channelName, row.businessRouteName, row.realChannelName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return candidates.find((value) => !markupRouteArtifactPattern.test(value)) ?? candidates[0] ?? '待确认';
}

/** 修复旧表把 A/B 备注行误写入目的地时的详情显示；正常国家/区域值原样保留。 */
export function getMarkupRowLookupDestination(row: Pick<ImportedPriceRow, 'destinationCountry' | 'sourceSheetName' | 'channelName' | 'businessRouteName' | 'realChannelName'>) {
  const destination = row.destinationCountry?.trim() ?? '';
  if (destination && !markupDestinationArtifactPattern.test(destination)) return destination;
  const source = [row.sourceSheetName, row.channelName, row.businessRouteName, row.realChannelName].filter(Boolean).join(' ');
  return markupDestinationNames.find((country) => source.includes(country)) ?? '待确认';
}

export function buildPriceBookImportAgentOptions(agents: AgentSummary[]) {
  return agents
    .filter((agent) => agent.enabled)
    .map((agent) => {
      const shortName = agent.shortName?.trim() || agent.name;
      const companyName = agent.name?.trim();
      const code = agent.code?.trim();
      return {
        value: agent.id,
        label: shortName,
        shortName,
        searchText: [shortName, companyName, code].filter(Boolean).join(' ')
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'));
}

export function filterPriceBookImportAgentOption(input: string, option?: { searchText?: string; label?: unknown }) {
  const keyword = input.trim().toLowerCase();
  if (!keyword) return true;
  return String(option?.searchText ?? option?.label ?? '').toLowerCase().includes(keyword);
}

function normalizeSouthAfricaMaterialText(value?: string | null) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function parseSouthAfricaRuleKeywords(value?: string) {
  return Array.from(new Set(String(value ?? '').split(/[,，、\n\s]+/).map((item) => item.trim()).filter(Boolean)));
}

export function inferSouthAfricaMaterialCategory(productName: string | undefined, rules: SouthAfricaRateRuleSummary[]) {
  const query = normalizeSouthAfricaMaterialText(productName);
  if (!query) return undefined;
  const scored = rules
    .filter((rule) => rule.enabled !== false)
    .map((rule) => {
      const keywords = Array.from(new Set([rule.category, rule.name, ...(rule.keywords ?? [])]))
        .map(normalizeSouthAfricaMaterialText)
        .filter(Boolean);
      const score = keywords.reduce((best, keyword) => {
        if (query === keyword) return Math.max(best, 10000 + keyword.length);
        if (query.includes(keyword)) return Math.max(best, 5000 + keyword.length);
        return best;
      }, 0);
      return { category: rule.category, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.category.length - left.category.length || left.category.localeCompare(right.category, 'zh-CN'));
  if (!scored.length) return undefined;
  const topScore = scored[0].score;
  const topCategories = new Set(scored.filter((item) => item.score === topScore).map((item) => item.category));
  return topCategories.size === 1 ? scored[0].category : undefined;
}

function numberFormValue(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function describeLargeCargo(values: Partial<LegacyLookupFormValues>): string | undefined {
  const reasons: string[] = [];
  const lengthCm = numberFormValue(values.lengthCm);
  const widthCm = numberFormValue(values.widthCm);
  const heightCm = numberFormValue(values.heightCm);
  if (lengthCm > 180) reasons.push(`长度 ${Math.round(lengthCm * 100) / 100}cm 超过 180cm`);
  if (widthCm > 80) reasons.push(`宽度 ${Math.round(widthCm * 100) / 100}cm 超过 80cm`);
  if (heightCm > 80) reasons.push(`高度 ${Math.round(heightCm * 100) / 100}cm 超过 80cm`);
  if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
    const singleVolumeCbm = (lengthCm * widthCm * heightCm) / 1_000_000;
    if (singleVolumeCbm > 0.15) reasons.push(`单件体积 ${singleVolumeCbm.toFixed(3)}CBM 超过 0.15CBM`);
  }
  const cargoText = `${values.productName ?? ''} ${values.packageInfo ?? ''}`;
  if (/大件|超大件|家具|桌|椅|沙发|床|木箱|木架|托盘|卡板|打托/i.test(cargoText)) {
    reasons.push('品名/包装包含大件关键词');
  }
  return reasons.length ? reasons.join('、') : undefined;
}

const defaultAmazonTierLabels = ['12KG+', '51KG+', '100KG+'];
const amazonOriginFallbackOptions = [
  '义乌仓',
  '华东',
  '华南',
  '厦门/泉州/福州',
  '天津/南昌/石家庄',
  '武汉/长沙/成都',
  '汕头',
  '济南/潍坊',
  '深圳/广州仓',
  '西安/沧州/保定',
  '重庆',
  '青岛/郑州/温州/台州/连云港/南京/合肥'
];
const pricingLookupTimeoutMs = 12000;
const amazonRouteNamePattern = /欧洲|西班牙|英国|铁路|空派|快递|海运|专线|渠道|DHL|UPS|FEDEX|美西|美东|包税|双清|卡派|海卡/i;
const amazonOriginNamePattern = /(仓|华东|华南|义乌|深圳|广州|汕头|厦门|泉州|福州|天津|南昌|石家庄|武汉|长沙|成都|济南|潍坊|西安|沧州|保定|重庆|青岛|郑州|温州|台州|连云港|南京|合肥)/;

const legacyModuleDefaults: Record<LegacyPricingModule, Partial<LegacyLookupFormValues>> = {
  amazon: {
    amazonCode: 'FTW5',
    tier: '12KG+',
    agentName: undefined,
    origin: undefined,
    destinationCountry: undefined,
    channel: undefined,
    actualWeightKg: undefined,
    volumeCbm: undefined,
    chargeableWeightKg: 12,
    onlyQuotable: false
  },
  inquiry: {
    productName: '桌子，椅子',
    destinationCountry: '法国',
    postalCode: '60750',
    address: 'France 549 rue du maubon Choisy au bac',
    packageInfo: '',
    channel: undefined,
    cargoType: 'ALL',
    actualWeightKg: undefined,
    volumeCbm: 5,
    packageCount: 1,
    chargeableWeightKg: 835
  },
  europeExpress: {
    destinationCountry: '法国',
    postalCode: undefined,
    channel: '',
    taxInclusion: undefined,
    agentName: undefined,
    productName: undefined,
    packageInfo: '',
    packageCount: 1,
    chargeableWeightKg: undefined
  },
  southAfrica: {
    productName: undefined,
    tier: undefined,
    volumeCbm: undefined,
    actualWeightKg: undefined,
    packageInfo: '',
    chargeableWeightKg: 167
  },
  usaAirSea: {
    destinationCountry: '美国',
    channel: undefined,
    actualWeightKg: undefined,
    volumeCbm: undefined,
    chargeableWeightKg: 100,
    packageCount: 1
  },
  canadaAirSea: {
    destinationCountry: '加拿大',
    canadaAddressType: 'PRIVATE',
    amazonCode: undefined,
    channel: undefined,
    actualWeightKg: undefined,
    volumeCbm: undefined,
    chargeableWeightKg: 100,
    packageCount: 1
  },
  dubaiAirSea: {
    destinationCountry: '迪拜',
    channel: undefined,
    actualWeightKg: undefined,
    volumeCbm: undefined,
    chargeableWeightKg: 100,
    packageCount: 1
  }
};

function withPricingLookupTimeout<T>(promise: Promise<T>, timeoutMs = pricingLookupTimeoutMs): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('查价超时，请缩小条件或稍后重试')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  });
}

function pricingLookupErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    if (/Failed to fetch/i.test(error.message)) {
      return '查价请求失败，请检查网络后重试';
    }
    return error.message;
  }
  return '查价失败，请稍后重试';
}

function formatLegacyModuleCounts(counts?: PriceBookSummary['legacyModuleCounts']) {
  if (!counts) return '未解析';
  const modules = legacyPricingModules.filter((item) => (counts[item.key] ?? 0) > 0);
  const text = (modules.length ? modules : legacyPricingModules)
    .map((item) => `${item.label} / ${counts[item.key] ?? 0} 条`)
    .join(' / ');
  return text || '未解析';
}

function priceBookMatchesLegacyModule(book: PriceBookSummary, module: LegacyPricingModule) {
  return Number(book.legacyModuleCounts?.[module] ?? 0) > 0;
}

function getLegacyModuleLabel(module: LegacyPricingModule) {
  return legacyPricingModules.find((item) => item.key === module)?.label ?? module;
}

function isAmazonOriginOption(value: string) {
  const compact = value.replace(/[／｜|、，,；;]/g, '/').replace(/\s+/g, '');
  return Boolean(compact && !amazonRouteNamePattern.test(compact) && amazonOriginNamePattern.test(compact));
}

function readAgentMarkupRows(response: AgentMarkupListResponse | AgentMarkupRule[]): AgentMarkupRule[] {
  return Array.isArray(response) ? response : response.rows;
}

function readAgentMarkupMetrics(response: AgentMarkupListResponse | AgentMarkupRule[]): AgentMarkupMetrics {
  if (!Array.isArray(response)) {
    return response.metrics;
  }
  return {
    totalRules: response.length,
    enabledRules: response.filter((rule) => rule.enabled).length,
    disabledRules: response.filter((rule) => !rule.enabled).length,
    unmatchedQuotes: 0
  };
}

function formatKgRate(amount: number) {
  return (Math.round(amount * 100) / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatKgCurrencyRate(amount: number) {
  return `¥${formatKgRate(amount)}`;
}

function formatMarkupValue(rule: Pick<AgentMarkupSummary, 'markupType' | 'markupValue' | 'markupPerKg'>) {
  const type = rule.markupType ?? 'WEIGHT';
  const value = rule.markupValue ?? rule.markupPerKg;
  if (type === 'PERCENT') return `+${formatKgRate(value)}%`;
  if (type === 'PER_SHIPMENT') return `+${formatCurrency(value)}/票`;
  if (type === 'FIXED') return `+${formatCurrency(value)} 固定`;
  return `+${formatCurrency(value)}/kg`;
}

function renderMarkupSource(rule: AgentMarkupSummary) {
  const sources = rule.sourcePriceBooks ?? [];
  if (!sources.length || rule.retainedOnly) {
    return <Tag color="default">无有效价格表</Tag>;
  }
  return (
    <Space direction="vertical" size={2}>
      {sources.slice(0, 2).map((source) => (
        <Text key={`${source.priceBookId}:${source.fileName}`} className="pricing-source-line">
          {source.fileName} · {source.lineCount} 条
        </Text>
      ))}
      {sources.length > 2 ? <Text type="secondary">另 {sources.length - 2} 张价格表</Text> : null}
    </Space>
  );
}

function renderMarkupDisplay(rule: AgentMarkupSummary) {
  if (rule.markupDisplayMode === 'RETAINED_ONLY' || rule.retainedOnly) {
    return <Tag color="default">仅保留规则</Tag>;
  }
  if (rule.markupDisplayMode === 'MIXED') {
    const distribution = rule.markupBuckets?.length
      ? rule.markupBuckets.map((bucket) => `${formatMarkupValue({ markupPerKg: bucket.markupPerKg })}：${bucket.lineCount} 条`).join('；')
      : '暂无分布';
    return (
      <Space direction="vertical" size={2}>
        <Tooltip title={distribution}>
          <Tag color="orange">混合加价</Tag>
        </Tooltip>
        <Text type="secondary">{rule.markupRange ?? '多档加价'}</Text>
      </Space>
    );
  }
  return <Text strong>{rule.defaultMarkupDisplay ?? formatMarkupValue(rule)}</Text>;
}

function getMarkupSourceLabel(source?: ImportedPriceRow['markupSource']) {
  if (source === 'LINE_CUSTOM') return '线路自定义';
  if (source === 'AGENT_DEFAULT') return '代理默认';
  if (source === 'VIRTUAL_DEFAULT') return '虚拟默认';
  return '本地匹配';
}

function getMarkupTypeLabel(type?: AgentMarkupType) {
  const labels: Record<AgentMarkupType, string> = {
    WEIGHT: '按重量',
    PER_SHIPMENT: '按票',
    FIXED: '固定金额',
    PERCENT: '按比例'
  };
  return labels[type ?? 'WEIGHT'];
}

function normalizeRequirementBlock(value: string | undefined) {
  return value
    ?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function getRequirementText(item: Pick<PriceRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>) {
  return [item.remark, item.productSurchargeRemark, item.specialRemark]
    .map(normalizeRequirementBlock)
    .filter(Boolean)
    .join('\n');
}

function getRequirementPreview(item: Pick<PriceRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>) {
  const text = getRequirementText(item).replace(/\s+/g, ' ').trim();
  return text.length > 24 ? `${text.slice(0, 24)}...` : text;
}

function renderRequirementCell(
  item: Pick<PriceRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>,
  onOpen: () => void
) {
  const fullText = getRequirementText(item);
  if (!fullText) {
    return <Text type="secondary">暂无渠道要求</Text>;
  }
  return (
    <Button
      aria-label="渠道要求"
      htmlType="button"
      type="link"
      size="small"
      title={fullText}
      style={{ maxWidth: 112, paddingInline: 0 }}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <span style={{ display: 'inline-block', maxWidth: 112, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
        {getRequirementPreview(item)}
      </span>
    </Button>
  );
}

function renderRequirementDetailNote(item: Pick<PriceRecommendation, 'remark' | 'productSurchargeRemark' | 'specialRemark'>) {
  const fullText = getRequirementText(item);
  return (
    <div className="pricing-detail-note">
      <Text type="secondary">渠道要求</Text>
      <Text style={{ whiteSpace: 'pre-wrap' }}>{fullText || '暂无渠道要求'}</Text>
    </div>
  );
}

function getCustomRemarkText(item: Pick<PriceRecommendation, 'customRemark'>) {
  return normalizeRequirementBlock(item.customRemark);
}

function renderCustomRemarkCell(
  item: Pick<PriceRecommendation, 'customRemark'>,
  onOpen: () => void
) {
  const fullText = getCustomRemarkText(item);
  if (!fullText) return <Text type="secondary">-</Text>;
  return (
    <Button
      aria-label="自定义备注"
      htmlType="button"
      type="link"
      size="small"
      title={fullText}
      style={{ maxWidth: 112, paddingInline: 0 }}
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
    >
      <span style={{ display: 'inline-block', maxWidth: 112, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'bottom' }}>
        {fullText.replace(/\s+/g, ' ').trim()}
      </span>
    </Button>
  );
}

function buildQuoteCopyText(item: PriceRecommendation) {
  return [
    `渠道：${item.channelName}`,
    `承运商：${item.carrierName}`,
    `重量段：${item.weightSegmentLabel}`,
    `时效：${item.transitLabel}`,
    `单价：${formatKgCurrencyRate(item.salesRatePerKg)}/kg`,
    `总价：${formatCurrency(item.totalSales)}`,
    item.remark ? `渠道要求：${item.remark}` : undefined,
    item.customRemark ? `自定义备注：${item.customRemark}` : undefined
  ].filter(Boolean).join('\n');
}

function parseAmazonTierMinimum(value?: string | number | null): number | undefined {
  const text = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const weight = Number(match[1]);
  return Number.isFinite(weight) ? weight : undefined;
}

function normalizeAmazonTier(value?: string | number | null): string {
  const weight = parseAmazonTierMinimum(value) ?? 12;
  if (weight >= 100) return '100KG+';
  if (weight >= 51) return '51KG+';
  return '12KG+';
}

function buildAmazonTierLabels() {
  return defaultAmazonTierLabels;
}

function inferAmazonTierFromChargeableWeight(value?: string | number | null): string | undefined {
  const weight = Number(value ?? 0);
  if (!Number.isFinite(weight) || weight <= 0) return undefined;
  const tier = buildAmazonTierLabels()
    .map((label) => ({ label, minimum: parseAmazonTierMinimum(label) ?? 0 }))
    .filter((item) => item.minimum <= weight)
    .sort((left, right) => right.minimum - left.minimum)[0];
  return tier?.label;
}

function amazonTierWeight(value?: string | number | null) {
  return parseAmazonTierMinimum(normalizeAmazonTier(value)) ?? 12;
}

function calculateDimensionVolumeCbm(values: Pick<Partial<PriceLookupFormValues>, 'lengthCm' | 'widthCm' | 'heightCm' | 'packageCount'>): number {
  const length = Number(values.lengthCm ?? 0);
  const width = Number(values.widthCm ?? 0);
  const height = Number(values.heightCm ?? 0);
  const count = Number(values.packageCount ?? 1) || 1;
  if (![length, width, height, count].every((value) => Number.isFinite(value) && value > 0)) {
    return 0;
  }
  return Math.round((length * width * height * count / 1000000) * 1000) / 1000;
}

function buildLegacyQuoteCopyText(item: LegacyPricingRecommendation) {
  const unit = item.quoteMode === 'cbm' ? '/CBM' : '/kg';
  return [
    `渠道：${item.channelName}`,
    `重量段：${item.weightSegmentLabel}`,
    `时效：${item.transitLabel ?? '时效待确认'}`,
    `单价：${formatKgCurrencyRate(item.salesUnitPrice)}${unit}`,
    `总价：${formatCurrency(item.salesTotal)}`,
    item.remark ? `渠道要求：${item.remark}` : undefined,
    item.customRemark ? `自定义备注：${item.customRemark}` : undefined
  ].filter(Boolean).join('\n');
}

function isPostalCodeRequired(country?: string) {
  return /美国|加拿大|英国|德国|法国|US|USA|CA|UK|DE|FR/i.test(country?.trim() ?? '');
}

function isAgentLevelMarkupRule(rule: AgentMarkupRule) {
  return !rule.channelName && !rule.realChannelName && !rule.destinationCountry;
}

function getAgentMarkupGroupId(rule: Pick<AgentMarkupSummary, 'agentName' | 'priceBookId'>) {
  return rule.priceBookId ? `agent:${rule.priceBookId}:${rule.agentName}` : `agent:${rule.agentName}`;
}

function getPricingSyncStatusMeta(status: PricingSyncHealthRow['status']) {
  const labels: Record<PricingSyncHealthRow['status'], { color: string; label: string }> = {
    synced: { color: 'green', label: '已同步' },
    default: { color: 'blue', label: '默认同步' },
    disabled: { color: 'red', label: '规则停用' },
    missing: { color: 'orange', label: '缺少规则' }
  };
  return labels[status];
}

function isTerminalImportJob(job: Pick<PriceBookImportJobSummary, 'status'>) {
  const status = String(job.status ?? '').toUpperCase();
  return status === 'SUCCESS' || status === 'FAILED' || status === 'PARTIAL_FAILED';
}

export function PricingPage({
  apiClient,
  role,
  permissions,
  notice,
  onNotice
}: {
  apiClient: ApiClient;
  role: StaffRoleKey;
  permissions: PermissionKey[];
  notice: string | null;
  onNotice: (message: string | null) => void;
}) {
  const isMarkupRouteEditor = new URLSearchParams(window.location.search).get('view') === 'route-editor';
  const [lookupForm] = Form.useForm<LegacyLookupFormValues>();
  const [markupForm] = Form.useForm<AgentMarkupFormValues>();
  const [channelTierMarkupForm] = Form.useForm<ChannelTierMarkupFormValues>();
  const [priceBookRemarkForm] = Form.useForm<PriceBookRemarkFormValues>();
  const [southAfricaRateRuleForm] = Form.useForm<SouthAfricaRateRuleFormValues>();
  const southAfricaPricingMode = Form.useWatch('pricingMode', southAfricaRateRuleForm);
  const [priceRows, setPriceRows] = useState<ImportedPriceRow[]>(() => [...seedImportedPriceRows]);
  const [priceBooks, setPriceBooks] = useState<PriceBookRecord[]>([]);
  const [markupRules, setMarkupRules] = useState<AgentMarkupRule[]>([]);
  const [markupDetailRules, setMarkupDetailRules] = useState<AgentMarkupRule[]>([]);
  const [channelTierRules, setChannelTierRules] = useState<AgentMarkupRule[]>([]);
  const [channelTierOptions, setChannelTierOptions] = useState<ChannelTierOption[]>([]);
  const [channelTierModalOpen, setChannelTierModalOpen] = useState(false);
  const [channelTierSaving, setChannelTierSaving] = useState(false);
  const [channelTierLoading, setChannelTierLoading] = useState(false);
  const [editingChannelTierRule, setEditingChannelTierRule] = useState<AgentMarkupRule | null>(null);
  const [markupMetrics, setMarkupMetrics] = useState<AgentMarkupMetrics>({ totalRules: 0, enabledRules: 0, disabledRules: 0, unmatchedQuotes: 0 });
  const [markupFilters, setMarkupFilters] = useState<AgentMarkupListQuery>({ status: 'ALL', page: 1, pageSize: 20 });
  const [markupModule, setMarkupModule] = useState<LegacyPricingModule>('amazon');
  const [selectedMarkupRuleIds, setSelectedMarkupRuleIds] = useState<string[]>([]);
  const [markupPage, setMarkupPage] = useState(1);
  const [selectedPriceBookIds, setSelectedPriceBookIds] = useState<string[]>([]);
  const [priceBookManagementModule, setPriceBookManagementModule] = useState<PriceBookImportTargetModule>('amazon');
  const [managedPriceBooks, setManagedPriceBooks] = useState<PriceBookRecord[]>([]);
  const [priceBookManagementLoading, setPriceBookManagementLoading] = useState(false);
  const [priceBookManagementFilters, setPriceBookManagementFilters] = useState({ agentName: 'ALL', keyword: '' });
  const [editingMarkupRule, setEditingMarkupRule] = useState<AgentMarkupRule | null>(null);
  const [markupModalOpen, setMarkupModalOpen] = useState(false);
  const [markupSaving, setMarkupSaving] = useState(false);
  const [markupBatchLoading, setMarkupBatchLoading] = useState(false);
  const [restoreMarkupChannelAfterSave, setRestoreMarkupChannelAfterSave] = useState(false);
  const [markupChannelDetailOpen, setMarkupChannelDetailOpen] = useState(false);
  const [markupChannelRule, setMarkupChannelRule] = useState<MarkupDisplayRule | null>(null);
  const [markupSheetFilter, setMarkupSheetFilter] = useState('ALL');
  const [markupAmountFilter, setMarkupAmountFilter] = useState('ALL');
  const [markupSourceFilter, setMarkupSourceFilter] = useState<PriceBookRowMarkupSource | 'ALL'>('ALL');
  const [markupSort, setMarkupSort] = useState<'NONE' | 'ASC' | 'DESC'>('NONE');
  const [batchMarkupPerKg, setBatchMarkupPerKg] = useState(0.5);
  const [batchMarkupSaving, setBatchMarkupSaving] = useState(false);
  const [batchMarkupScope, setBatchMarkupScope] = useState<'PAGE' | 'ALL_FILTERED' | 'SELECTED'>('PAGE');
  const [selectedMarkupChannelRowIds, setSelectedMarkupChannelRowIds] = useState<string[]>([]);
  const [priceBookRemarkModalOpen, setPriceBookRemarkModalOpen] = useState(false);
  const [pricingSyncHealthOpen, setPricingSyncHealthOpen] = useState(false);
  const [pricingSyncHealthLoading, setPricingSyncHealthLoading] = useState(false);
  const [pricingSyncHealthRows, setPricingSyncHealthRows] = useState<PricingSyncHealthRow[]>([]);
  const [pricingSyncOrphanRules, setPricingSyncOrphanRules] = useState<AgentMarkupRule[]>([]);
  const [pricingSyncHealthStats, setPricingSyncHealthStats] = useState<PricingSyncHealthResponse['stats']>({ sources: 0, agents: 0, lines: 0, activeAgents: 0, issueCount: 0 });
  const [pricingSyncHealthPagination, setPricingSyncHealthPagination] = useState({ page: 1, pageSize: 50, totalItems: 0 });
  const [priceBookRuleRefreshProgress, setPriceBookRuleRefreshProgress] = useState<PricingRuleRefreshProgressResponse | null>(null);
  const [markupNeedsRefresh, setMarkupNeedsRefresh] = useState(false);
  const [priceBookImporting, setPriceBookImporting] = useState(false);
  const [priceBookImportJob, setPriceBookImportJob] = useState<PriceBookImportJobSummary | null>(null);
  const [priceBookImportAgentId, setPriceBookImportAgentId] = useState<string | undefined>();
  const [masterDataAgents, setMasterDataAgents] = useState<AgentSummary[]>([]);
  const priceBookFileInputRef = useRef<HTMLInputElement | null>(null);
  const onNoticeRef = useRef(onNotice);
  const lookupRequestSeqRef = useRef(0);
  const southAfricaAutoLookupKeyRef = useRef('');
  const [lookupResult, setLookupResult] = useState<PriceLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [legacyModule, setLegacyModule] = useState<LegacyPricingModule>('amazon');
  const [legacyMeta, setLegacyMeta] = useState<LegacyPricingMetaResponse | null>(null);
  const [legacyResult, setLegacyResult] = useState<LegacyPricingQuoteResponse | null>(null);
  const [dubaiPriceDisplay, setDubaiPriceDisplay] = useState<DubaiPriceDisplayResponse | null>(null);
  const [dubaiPriceDisplayLoading, setDubaiPriceDisplayLoading] = useState(false);
  const [dubaiPriceDisplayError, setDubaiPriceDisplayError] = useState<string | null>(null);
  const [dubaiDisplayVersions, setDubaiDisplayVersions] = useState<DubaiPriceDisplayVersionSummary[]>([]);
  const [selectedDubaiPricePage, setSelectedDubaiPricePage] = useState<DubaiPriceDisplayPageSummary | null>(null);
  const [dubaiDisplayPageIndexes, setDubaiDisplayPageIndexes] = useState<Record<'AIR' | 'SEA', number>>({ AIR: 0, SEA: 0 });
  const [southAfricaResult, setSouthAfricaResult] = useState<SouthAfricaLookupResponse | null>(null);
  const [southAfricaRules, setSouthAfricaRules] = useState<SouthAfricaRateRuleSummary[]>([]);
  const [southAfricaRuleModalOpen, setSouthAfricaRuleModalOpen] = useState(false);
  const [southAfricaRuleSaving, setSouthAfricaRuleSaving] = useState(false);
  const [editingSouthAfricaRule, setEditingSouthAfricaRule] = useState<SouthAfricaRateRuleSummary | null>(null);
  const [selectedLegacyRecommendation, setSelectedLegacyRecommendation] = useState<LegacyPricingRecommendation | null>(null);
  const [selectedLineRequirement, setSelectedLineRequirement] = useState<ImportedPriceRow | null>(null);
  const [customRemarkDetail, setCustomRemarkDetail] = useState<{ title: string; content: string } | null>(null);
  const [chargeableWeightManual, setChargeableWeightManual] = useState(false);
  const [volumeCbmManual, setVolumeCbmManual] = useState(false);
  const [amazonTierManual, setAmazonTierManual] = useState(false);
  const [southAfricaCategoryManual, setSouthAfricaCategoryManual] = useState(false);
  const [todayLookupCount, setTodayLookupCount] = useState(0);
  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);
  const agentMarkupRules = useMemo(() => {
    return markupRules.filter(isAgentLevelMarkupRule);
  }, [markupRules]);
  const enabledAgentOptions = useMemo(() => buildPriceBookImportAgentOptions(masterDataAgents), [masterDataAgents]);
  const markupAgentOptions = useMemo(() => {
    const agents = new Set<string>();
    masterDataAgents.filter((agent) => agent.enabled).forEach((agent) => agents.add(agent.shortName?.trim() || agent.name));
    priceBooks.filter((book) => priceBookMatchesLegacyModule(book, markupModule)).forEach((book) => {
      if (book.agentShortName?.trim()) agents.add(book.agentShortName.trim());
    });
    markupRules.forEach((rule) => {
      if (rule.agentName?.trim()) {
        agents.add(rule.agentName.trim());
      }
    });
    return Array.from(agents)
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))
      .map((value) => ({ value, label: value }));
  }, [markupModule, markupRules, masterDataAgents, priceBooks]);
  const markupDisplayRows: MarkupDisplayRule[] = markupRules;
  const markupModulePriceBooks = useMemo(() => priceBooks.filter((book) => priceBookMatchesLegacyModule(book, markupModule)), [priceBooks, markupModule]);
  const markupModulePriceBookIds = useMemo(() => new Set(markupModulePriceBooks.map((book) => book.id)), [markupModulePriceBooks]);
  const markupModulePriceRows = useMemo(() => priceRows.filter((row) => row.priceBookId && markupModulePriceBookIds.has(row.priceBookId)), [priceRows, markupModulePriceBookIds]);
  const selectedVisibleMarkupRuleIds = selectedMarkupRuleIds.filter((id) => markupDisplayRows.some((rule) => rule.id === id));
  const selectedMarkupRule = markupDisplayRows.find((rule) => rule.id === selectedVisibleMarkupRuleIds[0]) ?? null;
  const selectedMarkupRules = markupDisplayRows.filter((rule) => selectedVisibleMarkupRuleIds.includes(rule.id));
  const selectedMarkupRuleIsPriceBookGroup = Boolean(selectedMarkupRule?.isPriceBookGroup);
  const selectedPriceBook = selectedPriceBookIds.length === 1 ? managedPriceBooks.find((book) => book.id === selectedPriceBookIds[0]) ?? null : null;
  const managedPriceBookAgentOptions = useMemo(() => Array.from(new Set(managedPriceBooks.map((book) => book.agentShortName).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right, 'zh-CN')), [managedPriceBooks]);
  const filteredManagedPriceBooks = useMemo(() => {
    const keyword = priceBookManagementFilters.keyword.trim().toLowerCase();
    return managedPriceBooks.filter((book) => {
      const matchesAgent = priceBookManagementFilters.agentName === 'ALL' || book.agentShortName === priceBookManagementFilters.agentName;
      const matchesKeyword = !keyword || [book.fileName, book.customRemark ?? book.remark, book.agentShortName].filter(Boolean).some((value) => String(value).toLowerCase().includes(keyword));
      return matchesAgent && matchesKeyword;
    });
  }, [managedPriceBooks, priceBookManagementFilters]);
  const priceBookManagementColumns = useMemo(() => [
    { title: '价格表名称', dataIndex: 'fileName' },
    { title: '代理简称', dataIndex: 'agentShortName', width: 150, render: (value?: string) => value ? <Tag color="blue">{value}</Tag> : <Text type="secondary">未绑定代理</Text> },
    {
      title: '自定义备注',
      dataIndex: 'customRemark',
      width: 130,
      render: (_value: string | undefined, record: PriceBookRecord) => {
        const customRemark = record.customRemark ?? record.remark;
        return customRemark ? (
          <Button
            htmlType="button"
            type="link"
            size="small"
            aria-label={`${record.fileName} 自定义备注`}
            onClick={() => setCustomRemarkDetail({ title: `${record.fileName} · 自定义备注`, content: customRemark })}
          >
            <Tag color="cyan">已填写</Tag>
          </Button>
        ) : <Text type="secondary">未填写</Text>;
      }
    },
    { title: '查价模块', width: 280, render: () => <Text>{priceBookImportModules.find((item) => item.key === priceBookManagementModule)?.label}</Text> },
    { title: '导入行数', dataIndex: 'rowCount', width: 120 },
    {
      title: '规则同步',
      width: 150,
      render: (_value: unknown, record: PriceBookRecord) => {
        const status = record.refreshStatus ?? 'CURRENT';
        const display = status === 'CURRENT' ? '已同步' : status === 'PENDING' ? '等待同步' : status === 'RUNNING' ? '同步中' : status === 'UNAVAILABLE' ? '原文件不可用' : '同步失败';
        const color = status === 'CURRENT' ? 'green' : status === 'UNAVAILABLE' || status === 'FAILED' ? 'red' : 'blue';
        return <Tag color={color} title={record.lastRuleRefreshAt ? `最近规则同步：${new Date(record.lastRuleRefreshAt).toLocaleString('zh-CN')}` : undefined}>{display}</Tag>;
      }
    },
    { title: '导入时间', dataIndex: 'importedAt', width: 220, render: (value: string) => new Date(value).toLocaleString('zh-CN') }
  ], [priceBookManagementModule]);
  const activePriceBookRuleRefresh = useMemo(
    () => priceBookRuleRefreshProgress?.modules.find((item) => item.module === priceBookManagementModule),
    [priceBookManagementModule, priceBookRuleRefreshProgress]
  );
  const activeMarkupChannelRule = markupChannelRule ?? selectedMarkupRule;
  const [selectedMarkupChannelRows, setSelectedMarkupChannelRows] = useState<ImportedPriceRow[]>([]);
  const [markupChannelRowsLoading, setMarkupChannelRowsLoading] = useState(false);
  const [markupChannelRowsError, setMarkupChannelRowsError] = useState('');
  const [markupChannelLoadingRuleId, setMarkupChannelLoadingRuleId] = useState<string | null>(null);
  const markupChannelRequestRef = useRef(0);
  const [markupChannelRowsPagination, setMarkupChannelRowsPagination] = useState({ page: 1, pageSize: 100, totalItems: 0 });
  const getMarkupRowSheetName = (row: ImportedPriceRow) => row.sourceSheetName?.trim() || row.channelName?.trim() || '未标记工作表';
  const selectedMarkupSheetOptions = Array.from(
    new Set(selectedMarkupChannelRows.map(getMarkupRowSheetName))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const markupAmountOptions = [
    { value: 'ALL', label: '全部加价' },
    ...[
      ...((activeMarkupChannelRule?.markupBuckets ?? []).map((bucket) => bucket.markupPerKg)),
      ...selectedMarkupChannelRows.map((row) => getLineMarkupAmount(row)).filter((value): value is number => typeof value === 'number')
    ]
      .sort((left, right) => left - right)
      .map((value) => ({
        value: String(value),
        label: formatMarkupValue({ markupPerKg: value })
      })),
    { value: 'DEFAULT', label: '默认加价' },
    { value: 'OTHER_CUSTOM', label: '其他自定义加价' }
  ].filter((option, index, options) => options.findIndex((item) => item.value === option.value) === index);
  const filteredMarkupChannelRows = selectedMarkupChannelRows.filter((row) => {
    return markupSheetFilter === 'ALL' || getMarkupRowSheetName(row) === markupSheetFilter;
  });
  const selectedFilteredMarkupChannelRows = filteredMarkupChannelRows.filter((row) => selectedMarkupChannelRowIds.includes(row.id));
  const markupChannelRowsBusy = markupChannelRowsLoading || batchMarkupSaving;
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = useCallback((permission: PermissionKey) => role === 'ADMIN' || permissionSet.has(permission), [permissionSet, role]);
  const availableLookupModules = useMemo(
    () => legacyPricingModules.filter((item) => can(lookupPermissionByModule[item.key])),
    [can]
  );
  const canViewMarkupDetails = can('pricing:markup:read');
  const canViewTierMarkup = can('pricing:markup-tier:read');
  const canViewMarkupWorkspace = canViewMarkupDetails || canViewTierMarkup;
  const canViewPriceBooks = can('pricing:price-books:read') && can('pricing:price-books:list-view');
  const canViewPriceBookRows = can('pricing:price-books:rows-view');
  const priceBookManagementRowSelection = useMemo(() => {
    if (!canViewPriceBookRows && !can('pricing:price-books:remark-update') && !can('pricing:price-books:delete')) {
      return undefined;
    }
    return {
      selectedRowKeys: selectedPriceBookIds,
      onChange: (keys: Key[]) => setSelectedPriceBookIds(keys.map(String))
    };
  }, [can, canViewPriceBookRows, selectedPriceBookIds]);
  const canViewCost = can('pricing:lookup:cost-view');
  const canViewGrossProfit = can('pricing:lookup:gross-profit-view');
  const canViewMarkupBreakdown = can('pricing:lookup:markup-breakdown-view');
  const canViewPostalRule = can('pricing:lookup:postal-rule-view');
  const canViewRequirements = can('pricing:lookup:requirement-detail-view');
  const canCopyQuote = can('pricing:lookup:copy-quote');
  const canViewDubaiImages = can('pricing:lookup:dubai-image-view') || can('pricing:dubai-display:active-view');
  const canReadSouthAfricaRules = can('pricing:south-africa:rules-read');
  const amazonTierLabels = useMemo(() => buildAmazonTierLabels(), []);
  const pricingSubItems = useMemo(
    () => [
      ...(availableLookupModules.length ? [{ key: 'lookup', label: '查价', description: '业务员报价查询' }] : []),
      ...(canViewMarkupWorkspace
        ? [
            { key: 'markup', label: '代理加价规则', description: '维护业务员加价' },
            ...(canViewPriceBooks ? [{ key: 'priceBooks', label: '价格表管理', description: '导入与备注维护' }] : [])
          ]
        : canViewPriceBooks ? [{ key: 'priceBooks', label: '价格表管理', description: '导入与备注维护' }] : [])
    ],
    [availableLookupModules.length, canViewMarkupWorkspace, canViewPriceBooks]
  );
  const [activePricingSection, setActivePricingSection] = useState('lookup');
  useEffect(() => {
    if (!pricingSubItems.some((item) => item.key === activePricingSection)) {
      setActivePricingSection(pricingSubItems[0]?.key ?? 'lookup');
    }
  }, [activePricingSection, pricingSubItems]);
  useEffect(() => {
    if (!availableLookupModules.some((item) => item.key === legacyModule)) {
      const fallbackModule = availableLookupModules[0]?.key;
      if (fallbackModule) setLegacyModule(fallbackModule);
    }
  }, [availableLookupModules, legacyModule]);
  const volumeCbm = Form.useWatch('volumeCbm', lookupForm);
  const actualWeightKg = Form.useWatch('actualWeightKg', lookupForm);
  const destinationCountryValue = Form.useWatch('destinationCountry', lookupForm);
  const postalCodeValue = Form.useWatch('postalCode', lookupForm);
  const chargeableWeightValue = Form.useWatch('chargeableWeightKg', lookupForm);
  const lengthCm = Form.useWatch('lengthCm', lookupForm);
  const widthCm = Form.useWatch('widthCm', lookupForm);
  const heightCm = Form.useWatch('heightCm', lookupForm);
  const packageCount = Form.useWatch('packageCount', lookupForm);
  const unitActualWeightKg = Form.useWatch('unitActualWeightKg', lookupForm);
  const amazonCodeValue = Form.useWatch('amazonCode', lookupForm);
  const canadaAddressTypeValue = Form.useWatch('canadaAddressType', lookupForm);
  const productNameValue = Form.useWatch('productName', lookupForm);
  const channelValue = Form.useWatch('channel', lookupForm);
  const tierValue = Form.useWatch('tier', lookupForm);
  const measuredChargeableWeight = calculatePriceChargeableWeight({
    volumeCbm,
    actualWeightKg,
    lengthCm,
    widthCm,
    heightCm,
    packageCount,
    unitActualWeightKg
  });
  const calculatedChargeableWeight = legacyModule === 'amazon'
    ? Math.max(measuredChargeableWeight, amazonTierWeight(tierValue))
    : measuredChargeableWeight;
  const calculatedVolumeCbm = calculateDimensionVolumeCbm({ lengthCm, widthCm, heightCm, packageCount });
  const inferredAmazonTier = legacyModule === 'amazon'
    ? inferAmazonTierFromChargeableWeight(measuredChargeableWeight)
    : undefined;
  const inferredSouthAfricaCategory = useMemo(
    () => legacyModule === 'southAfrica' ? inferSouthAfricaMaterialCategory(productNameValue, southAfricaRules) : undefined,
    [legacyModule, productNameValue, southAfricaRules]
  );
  useEffect(() => {
    if (
      !volumeCbmManual &&
      calculatedVolumeCbm > 0 &&
      Number(volumeCbm ?? 0) !== calculatedVolumeCbm
    ) {
      lookupForm.setFieldValue('volumeCbm', calculatedVolumeCbm);
    }
  }, [calculatedVolumeCbm, lookupForm, volumeCbm, volumeCbmManual]);
  useEffect(() => {
    if (
      !chargeableWeightManual &&
      calculatedChargeableWeight > 0 &&
      Number(chargeableWeightValue ?? 0) !== calculatedChargeableWeight
    ) {
      lookupForm.setFieldValue('chargeableWeightKg', calculatedChargeableWeight);
    }
  }, [calculatedChargeableWeight, chargeableWeightManual, chargeableWeightValue, lookupForm]);
  useEffect(() => {
    if (
      legacyModule === 'amazon' &&
      !amazonTierManual &&
      inferredAmazonTier &&
      tierValue !== inferredAmazonTier
    ) {
      lookupForm.setFieldValue('tier', inferredAmazonTier);
    }
  }, [amazonTierManual, inferredAmazonTier, legacyModule, lookupForm, tierValue]);
  useEffect(() => {
    if (legacyModule !== 'southAfrica') {
      return;
    }
    const productName = productNameValue?.trim() ?? '';
    if (!productName) {
      if (tierValue) {
        lookupForm.setFieldValue('tier', undefined);
      }
      setSouthAfricaCategoryManual(false);
      return;
    }
    if (southAfricaCategoryManual) {
      return;
    }
    if (inferredSouthAfricaCategory && tierValue !== inferredSouthAfricaCategory) {
      lookupForm.setFieldValue('tier', inferredSouthAfricaCategory);
      return;
    }
    if (!inferredSouthAfricaCategory && tierValue) {
      lookupForm.setFieldValue('tier', undefined);
    }
  }, [inferredSouthAfricaCategory, legacyModule, lookupForm, productNameValue, southAfricaCategoryManual, tierValue]);

  const postalRequired = (legacyModule === 'inquiry' && isPostalCodeRequired(destinationCountryValue))
    || (legacyModule === 'europeExpress' && /意大利|italy/i.test(destinationCountryValue?.trim() ?? ''))
    || legacyModule === 'usaAirSea';
  const effectiveChargeableWeight = Number(chargeableWeightValue) || calculatedChargeableWeight;
  const hasMeasureInput = effectiveChargeableWeight > 0 || Number(volumeCbm) > 0 || Number(actualWeightKg) > 0;
  const canRunLookup = (() => {
    if (legacyModule === 'amazon') return Boolean(amazonCodeValue?.trim()) && (hasMeasureInput || Boolean(tierValue?.trim()));
    if (legacyModule === 'inquiry') return Boolean(destinationCountryValue?.trim()) && hasMeasureInput && (!postalRequired || Boolean(postalCodeValue?.trim()));
    if (legacyModule === 'europeExpress') return Boolean(destinationCountryValue?.trim()) && (!postalRequired || Boolean(postalCodeValue?.trim()));
    if (legacyModule === 'southAfrica') return Boolean(productNameValue?.trim()) && Number(volumeCbm ?? 0) > 0;
    if (legacyModule === 'usaAirSea') return Boolean(normalizeUsPostalCode(postalCodeValue)) && hasMeasureInput;
    if (legacyModule === 'canadaAirSea') {
      return hasMeasureInput
        && (canadaAddressTypeValue !== 'AMAZON' || /^[A-Za-z]{3}$/.test(amazonCodeValue?.trim() ?? ''));
    }
    if (isAirSeaPricingModule(legacyModule)) return hasMeasureInput;
    return false;
  })();
  useEffect(() => {
    if (legacyModule !== 'southAfrica' || activePricingSection !== 'lookup' || !canRunLookup) {
      return;
    }
    const lookupKey = [
      productNameValue?.trim() ?? '',
      Number(volumeCbm ?? 0).toFixed(3),
      tierValue?.trim() ?? ''
    ].join('|');
    if (southAfricaAutoLookupKeyRef.current === lookupKey) {
      return;
    }
    const timer = window.setTimeout(() => {
      southAfricaAutoLookupKeyRef.current = lookupKey;
      void runLookup();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activePricingSection, canRunLookup, legacyModule, productNameValue, tierValue, volumeCbm]);

  const sortedRecommendations = useMemo(() => {
    return [...(lookupResult?.recommendations ?? [])].sort((left, right) => left.totalSales - right.totalSales);
  }, [lookupResult]);
  const recommendedQuote = sortedRecommendations[0] ?? null;
  const highlightedQuote = recommendedQuote;
  const legacyHasRecommendations = Boolean(legacyResult?.recommendations.length);
  const highlightedLegacyQuote = legacyResult?.selected ?? legacyResult?.cheapestRecommendations[0] ?? legacyResult?.recommendations[0] ?? null;
  const legacyUnitPreview = legacyResult?.module === 'europeExpress' && Number(legacyResult.query.chargeableWeightKg ?? 0) <= 0;

  useEffect(() => {
    let alive = true;
    if (can('pricing:lookup:meta-view')) {
      apiClient.legacyPricingMeta()
        .then((meta) => {
          if (!alive) return;
          setLegacyMeta(meta);
        })
        .catch(() => undefined);
    }
    if (canReadSouthAfricaRules) {
      apiClient.southAfricaRateRules()
        .then((southAfrica) => {
          if (!alive) return;
          setSouthAfricaRules(Array.isArray(southAfrica?.rules) ? southAfrica.rules : []);
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [apiClient, can, canReadSouthAfricaRules]);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('siyuan-pricing-markup');
      channel.onmessage = () => {
        setMarkupNeedsRefresh(true);
        void Promise.all([reloadMarkupRules(markupFilters), reloadChannelTierRules()]);
      };
      return () => channel.close();
    } catch {
      return undefined;
    }
  }, [markupFilters, markupModule]);

  useEffect(() => {
    if (activePricingSection !== 'lookup' || legacyModule !== 'dubaiAirSea' || !canViewDubaiImages) return;
    let alive = true;
    setDubaiPriceDisplayLoading(true);
    setDubaiPriceDisplayError(null);
    setDubaiDisplayPageIndexes({ AIR: 0, SEA: 0 });
    apiClient.dubaiPriceDisplay()
      .then((response) => {
        if (alive) setDubaiPriceDisplay(response);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setDubaiPriceDisplay(null);
        setDubaiPriceDisplayError(error instanceof Error ? error.message : '迪拜价格表加载失败');
      })
      .finally(() => {
        if (alive) setDubaiPriceDisplayLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [activePricingSection, apiClient, canViewDubaiImages, legacyModule]);

  useEffect(() => {
    if (!can('pricing:dubai-display:versions-view') || activePricingSection !== 'priceBooks' || priceBookManagementModule !== 'dubaiAirSea') return;
    let alive = true;
    apiClient.dubaiPriceDisplayVersions()
      .then((response) => { if (alive) setDubaiDisplayVersions(response.versions); })
      .catch(() => { if (alive) setDubaiDisplayVersions([]); });
    return () => { alive = false; };
  }, [activePricingSection, apiClient, can, priceBookManagementModule, priceBookImportJob?.status]);

  useEffect(() => {
    let alive = true;
    if (!canViewMarkupWorkspace) {
      setPriceBooks([]);
      setPriceRows([]);
      return () => {
        alive = false;
      };
    }
    Promise.all([
      canViewPriceBooks ? apiClient.priceBooks({ includeRows: false }) : Promise.resolve({ books: [] as PriceBookSummary[] }),
      canViewMarkupDetails ? apiClient.agentMarkupRules({ page: 1, pageSize: 200, status: 'ALL', includeHits: false, legacyModule: markupModule }) : Promise.resolve([] as AgentMarkupSummary[]),
      canViewTierMarkup ? apiClient.agentMarkupRules({ page: 1, pageSize: 500, status: 'ALL', detail: true, includeHits: false, legacyModule: markupModule }) : Promise.resolve([] as AgentMarkupSummary[]),
      apiClient.masterData().catch(() => ({ agents: [] } as Partial<MasterDataSnapshot>))
    ])
      .then(([response, rules, detailRules, masterData]) => {
        if (!alive) {
          return;
        }
        const markupRows = readAgentMarkupRows(rules);
        setPriceBooks(response.books);
        setPriceRows([...seedImportedPriceRows]);
        setMarkupRules(markupRows);
        setMarkupDetailRules([]);
        setChannelTierRules(readAgentMarkupRows(detailRules).filter((rule) => rule.markupUnit && rule.minChargeableValue !== undefined));
        setMarkupMetrics(readAgentMarkupMetrics(rules));
        setMasterDataAgents(Array.isArray(masterData?.agents) ? masterData.agents : []);
      })
      .catch((error) => {
        if (alive) {
          onNoticeRef.current(error instanceof Error ? `价格与加价规则加载失败：${error.message}` : '价格与加价规则加载失败');
        }
      });
    return () => {
      alive = false;
    };
  }, [apiClient, canViewMarkupDetails, canViewMarkupWorkspace, canViewPriceBooks, canViewTierMarkup, markupModule]);

  useEffect(() => {
    if (!canViewPriceBooks || activePricingSection !== 'priceBooks') return;
    let alive = true;
    const timeout = globalThis.setTimeout(() => {
      if (alive) onNoticeRef.current('当前模块价格表加载超时，请稍后重试');
    }, 8000);
    setPriceBookManagementLoading(true);
    setSelectedPriceBookIds([]);
    apiClient.priceBooks({ includeRows: false, targetModule: priceBookManagementModule })
      .then((response) => {
        if (alive) setManagedPriceBooks(response.books);
      })
      .catch((error) => {
        if (alive) onNoticeRef.current(error instanceof Error ? error.message : '当前模块价格表加载失败');
      })
      .finally(() => {
        if (alive) setPriceBookManagementLoading(false);
      });
    return () => {
      alive = false;
      globalThis.clearTimeout(timeout);
    };
  }, [activePricingSection, apiClient, canViewPriceBooks, priceBookManagementModule]);

  useEffect(() => {
    if (!can('pricing:price-books:sync-health-view') || activePricingSection !== 'priceBooks') return;
    let alive = true;
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const load = () => apiClient.priceBookRuleRefreshProgress()
      .then((response) => {
        if (!alive) return;
        setPriceBookRuleRefreshProgress(response);
        const active = response.modules.some((item) => item.pendingBooks > 0 || item.runningBooks > 0);
        if (active) timer = globalThis.setTimeout(load, 2000);
      })
      .catch(() => {
        if (alive) setPriceBookRuleRefreshProgress(null);
      });
    void load();
    return () => {
      alive = false;
      if (timer) globalThis.clearTimeout(timer);
    };
  }, [activePricingSection, apiClient, can]);

  async function loadPricingSyncHealth(page = 1, pageSize = pricingSyncHealthPagination.pageSize) {
    setPricingSyncHealthLoading(true);
    try {
      const response = await apiClient.pricingSyncHealth({ page, pageSize, legacyModule: priceBookManagementModule });
      setPricingSyncHealthRows(response.rows);
      setPricingSyncOrphanRules(response.orphanRules);
      setPricingSyncHealthStats(response.stats);
      setPricingSyncHealthPagination(response.pagination);
      setPricingSyncHealthOpen(true);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '同步体检加载失败');
    } finally {
      setPricingSyncHealthLoading(false);
    }
  }

  async function openPricingSyncHealth() {
    setPricingSyncHealthOpen(true);
    await loadPricingSyncHealth(1);
  }

  async function loadMarkupDetailRules(agentName?: string, priceBookId?: string) {
    const response = await apiClient.agentMarkupRules({
      ...(priceBookId ? { priceBookId } : {}),
      ...(agentName ? { agentName } : {}),
      page: 1,
      pageSize: 500,
      status: 'ALL',
      legacyModule: markupModule,
      detail: true,
      includeHits: false
    });
    const rows = readAgentMarkupRows(response);
    setMarkupDetailRules((current) => {
      const next = agentName ? current.filter((rule) => rule.agentName !== agentName || (priceBookId && rule.priceBookId !== priceBookId)) : [];
      return [...rows, ...next];
    });
    return rows;
  }

  function reloadMarkupRules(nextFilters: AgentMarkupListQuery = markupFilters) {
    return apiClient.agentMarkupRules({ ...nextFilters, legacyModule: markupModule, page: 1, pageSize: 200, includeHits: false }).then((response) => {
      const rows = readAgentMarkupRows(response);
      setMarkupRules(rows);
      setMarkupMetrics(readAgentMarkupMetrics(response));
      setMarkupFilters({ ...nextFilters, legacyModule: markupModule, page: 1, pageSize: 20 });
      setSelectedMarkupRuleIds((current) => current.filter((id) => rows.some((rule) => rule.id === id)));
      setMarkupChannelRule((current) => {
        if (!current) return current;
        return rows.find((rule) => rule.id === current.id || getAgentMarkupGroupId(rule) === getAgentMarkupGroupId(current)) ?? current;
      });
      return response;
    });
  }

  async function reloadChannelTierRules() {
    const response = await apiClient.agentMarkupRules({
      legacyModule: markupModule,
      page: 1,
      pageSize: 500,
      status: 'ALL',
      detail: true,
      includeHits: false
    });
    const rows = readAgentMarkupRows(response).filter((rule) => rule.markupUnit && rule.minChargeableValue !== undefined);
    setChannelTierRules(rows);
    return rows;
  }

  async function reloadSouthAfricaRateRules() {
    const response = await apiClient.southAfricaRateRules();
    const rules = Array.isArray(response?.rules) ? response.rules : [];
    setSouthAfricaRules(rules);
    return rules;
  }

  function openCreateSouthAfricaRateRule() {
    setEditingSouthAfricaRule(null);
    southAfricaRateRuleForm.setFieldsValue({
      category: '',
      name: '',
      keywords: '',
      pricingMode: 'fixed',
      ratePerCbm: undefined,
      remark: ''
    });
    setSouthAfricaRuleModalOpen(true);
  }

  function openEditSouthAfricaRateRule(rule: SouthAfricaRateRuleSummary) {
    setEditingSouthAfricaRule(rule);
    southAfricaRateRuleForm.setFieldsValue({
      category: rule.category,
      name: rule.name,
      keywords: rule.keywords.join('、'),
      pricingMode: rule.consult ? 'consult' : 'fixed',
      ratePerCbm: rule.ratePerCbm,
      remark: rule.remark ?? ''
    });
    setSouthAfricaRuleModalOpen(true);
  }

  async function saveSouthAfricaRateRule() {
    setSouthAfricaRuleSaving(true);
    try {
      const values = await southAfricaRateRuleForm.validateFields();
      const consult = values.pricingMode === 'consult';
      const payload: SouthAfricaRateRuleInput = {
        category: values.category.trim(),
        name: values.name.trim(),
        keywords: parseSouthAfricaRuleKeywords(values.keywords),
        consult,
        ...(consult ? {} : { ratePerCbm: Number(values.ratePerCbm) }),
        ...(values.remark?.trim() ? { remark: values.remark.trim() } : {})
      };
      if (editingSouthAfricaRule) {
        await apiClient.updateSouthAfricaRateRule(editingSouthAfricaRule.id, payload);
      } else {
        await apiClient.createSouthAfricaRateRule(payload);
      }
      await reloadSouthAfricaRateRules();
      southAfricaAutoLookupKeyRef.current = '';
      setSouthAfricaResult(null);
      setSouthAfricaRuleModalOpen(false);
      southAfricaRateRuleForm.resetFields();
      onNotice(editingSouthAfricaRule ? '南非物料规则已保存' : '南非物料规则已新增');
    } catch (error) {
      const isValidationError = typeof error === 'object' && error !== null && 'errorFields' in error;
      if (!isValidationError) onNotice(error instanceof Error ? error.message : '南非物料规则保存失败');
    } finally {
      setSouthAfricaRuleSaving(false);
    }
  }

  async function setSouthAfricaRateRuleEnabled(rule: SouthAfricaRateRuleSummary, enabled: boolean) {
    try {
      await apiClient.updateSouthAfricaRateRuleEnabled(rule.id, enabled);
      await reloadSouthAfricaRateRules();
      southAfricaAutoLookupKeyRef.current = '';
      setSouthAfricaResult(null);
      onNotice(`南非物料规则已${enabled ? '启用' : '停用'}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '南非物料规则状态更新失败');
    }
  }

  async function deleteSouthAfricaRateRule(rule: SouthAfricaRateRuleSummary) {
    try {
      await apiClient.deleteSouthAfricaRateRule(rule.id);
      await reloadSouthAfricaRateRules();
      southAfricaAutoLookupKeyRef.current = '';
      setSouthAfricaResult(null);
      onNotice('南非物料规则已删除');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '南非物料规则删除失败');
    }
  }

  async function loadChannelTierOptions(agentName: string) {
    const normalizedAgentName = agentName.trim();
    if (!normalizedAgentName) {
      setChannelTierOptions([]);
      return;
    }
    setChannelTierLoading(true);
    try {
      const books = markupModulePriceBooks.filter((book) => book.agentShortName === normalizedAgentName);
      const firstPages = await Promise.all(books.map((book) => apiClient.priceBookRows(book.id, { page: 1, pageSize: 500 })));
      const remainingPages = await Promise.all(firstPages.flatMap((firstPage, bookIndex) => {
        const totalPages = Math.ceil(firstPage.pagination.totalItems / firstPage.pagination.pageSize);
        return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => apiClient.priceBookRows(books[bookIndex].id, { page: index + 2, pageSize: firstPage.pagination.pageSize }));
      }));
      const rows = [...firstPages, ...remainingPages].flatMap((page) => page.rows).filter((row) => row.agentName === normalizedAgentName || books.some((book) => book.id === row.priceBookId && book.agentShortName === normalizedAgentName));
      const options = new Map<string, ChannelTierOption>();
      rows.forEach((row: PriceBookRowSummary) => {
        const channelName = row.channelName.trim();
        if (!channelName) return;
        const unit: AgentMarkupUnit = Number(row.cbmPrice ?? 0) > 0 ? 'CBM' : 'KG';
        const realChannelName = row.realChannelName?.trim() || undefined;
        const key = `${channelName}\u0001${realChannelName ?? ''}\u0001${unit}`;
        options.set(key, { key, channelName, realChannelName, markupUnit: unit });
      });
      setChannelTierOptions([...options.values()].sort((left, right) => left.channelName.localeCompare(right.channelName, 'zh-CN') || left.markupUnit.localeCompare(right.markupUnit)));
    } catch (error) {
      setChannelTierOptions([]);
      onNotice(error instanceof Error ? error.message : '真实渠道加载失败');
    } finally {
      setChannelTierLoading(false);
    }
  }

  function findChannelTierMarkupRule(row: ImportedPriceRow) {
    const agentName = activeMarkupChannelRule?.agentName ?? row.agentName;
    const realChannelName = row.realChannelName ?? row.channelName;
    const markupUnit: AgentMarkupUnit = Number(row.cbmPrice ?? 0) > 0 ? 'CBM' : 'KG';
    return channelTierRules.find((rule) => (
      rule.agentName === agentName
      && rule.channelName === row.channelName
      && (rule.realChannelName ?? rule.channelName) === realChannelName
      && rule.markupUnit === markupUnit
    ));
  }

  function openCreateChannelTierMarkupForLine(row: ImportedPriceRow) {
    const agentName = activeMarkupChannelRule?.agentName ?? row.agentName;
    const realChannelName = row.realChannelName ?? row.channelName;
    const markupUnit: AgentMarkupUnit = Number(row.cbmPrice ?? 0) > 0 ? 'CBM' : 'KG';
    setEditingChannelTierRule(null);
    channelTierMarkupForm.setFieldsValue({
      agentName,
      channelKey: `${row.channelName}\u0001${realChannelName}\u0001${markupUnit}`,
      tiers: [{ minChargeableValue: 0, maxChargeableValue: undefined, markupValue: 0 }]
    });
    void loadChannelTierOptions(agentName);
    setChannelTierModalOpen(true);
  }

  function openEditChannelTierMarkup(rule: AgentMarkupRule) {
    const sameChannelRules = channelTierRules
      .filter((item) => (
        item.agentName === rule.agentName
        && item.channelName === rule.channelName
        && (item.realChannelName ?? item.channelName) === (rule.realChannelName ?? rule.channelName)
        && item.markupUnit === rule.markupUnit
      ))
      .sort((left, right) => Number(left.minChargeableValue ?? 0) - Number(right.minChargeableValue ?? 0));
    const tiers = sameChannelRules.map((item) => ({
      minChargeableValue: Number(item.minChargeableValue ?? 0),
      maxChargeableValue: item.maxChargeableValue,
      markupValue: Number(item.markupValue ?? item.markupPerKg ?? 0)
    }));
    setEditingChannelTierRule(rule);
    channelTierMarkupForm.setFieldsValue({
      agentName: rule.agentName,
      channelKey: `${rule.channelName}\u0001${rule.realChannelName ?? ''}\u0001${rule.markupUnit}`,
      tiers: tiers.length ? tiers : [{ minChargeableValue: 0, maxChargeableValue: undefined, markupValue: 0 }]
    });
    void loadChannelTierOptions(rule.agentName);
    setChannelTierModalOpen(true);
  }

  async function saveChannelTierMarkup() {
    setChannelTierSaving(true);
    try {
      const values = await channelTierMarkupForm.validateFields();
      const [channelName, realChannelName, markupUnit] = values.channelKey.split('\u0001') as [string, string, AgentMarkupUnit];
      if (!channelName || (markupUnit !== 'KG' && markupUnit !== 'CBM')) {
        throw new Error('请选择真实渠道和计费单位');
      }
      const tiers = values.tiers ?? [];
      if (!tiers.length) throw new Error('请至少填写一个重量段');
      const payload = tiers.map((tier): AgentMarkupCreateInput => ({
        legacyModule: markupModule,
        agentName: values.agentName.trim(),
        channelName,
        ...(realChannelName ? { realChannelName } : {}),
        markupType: 'WEIGHT',
        markupValue: Number(tier.markupValue),
        markupPerKg: Number(tier.markupValue),
        markupUnit,
        minChargeableValue: Number(tier.minChargeableValue),
        ...(tier.maxChargeableValue === undefined || tier.maxChargeableValue === null ? {} : { maxChargeableValue: Number(tier.maxChargeableValue) }),
        priority: 10,
        enabled: true
      }));
      const response = await apiClient.batchUpsertAgentMarkupRules(payload);
      if (response.errorRows.length) {
        throw new Error(response.errorRows[0]?.reason ?? '渠道阶梯加价保存失败');
      }
      setChannelTierModalOpen(false);
      channelTierMarkupForm.resetFields();
      onNotice(`已保存 ${response.successCount} 条${markupUnit === 'KG' ? '重量' : '方数'}阶梯加价`);
      await Promise.all([reloadChannelTierRules(), reloadMarkupRules(markupFilters)]);
    } catch (error) {
      const isValidationError = typeof error === 'object' && error !== null && 'errorFields' in error;
      if (!isValidationError) onNotice(error instanceof Error ? error.message : '渠道阶梯加价保存失败');
    } finally {
      setChannelTierSaving(false);
    }
  }

  const handlePricingSectionChange = useCallback((key: string) => {
    setActivePricingSection(key);
    if (key === 'markup' && markupNeedsRefresh) {
      setMarkupNeedsRefresh(false);
      void Promise.all([reloadMarkupRules(markupFilters), reloadChannelTierRules()]);
    }
  }, [markupFilters, markupNeedsRefresh, markupModule]);

  function openCreateMarkupRule() {
    setEditingMarkupRule(null);
    setRestoreMarkupChannelAfterSave(false);
    markupForm.setFieldsValue({ priceBookId: undefined, agentName: '', channelName: '', realChannelName: '', destinationCountry: '', markupType: 'WEIGHT', markupValue: 0.5, markupPerKg: 0.5, priority: 100, enabled: 'true' });
    setMarkupModalOpen(true);
  }

  function openEditMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    void resolveConcreteMarkupRule(selectedMarkupRule)
      .then(openEditSpecificMarkupRule)
      .catch((error) => onNotice(error instanceof Error ? error.message : '加价规则加载失败'));
  }

  function nextMarkupChannelRequestId() {
    markupChannelRequestRef.current += 1;
    return markupChannelRequestRef.current;
  }

  function retryMarkupChannelRows() {
    if (!activeMarkupChannelRule) {
      return;
    }
    void loadMarkupChannelRows(
      activeMarkupChannelRule,
      markupChannelRowsPagination.page,
      markupChannelRowsPagination.pageSize,
      markupSheetFilter,
      markupAmountFilter,
      markupSourceFilter,
      markupSort
    ).catch((error) => onNotice(error instanceof Error ? error.message : '线路明细加载失败'));
  }

  async function loadMarkupChannelRows(
    rule: MarkupDisplayRule,
    page = 1,
    pageSize = markupChannelRowsPagination.pageSize,
    sourceSheetName = markupSheetFilter,
    markupAmount = markupAmountFilter,
    markupSource = markupSourceFilter,
    markupSortOrder = markupSort,
    requestId = nextMarkupChannelRequestId()
  ) {
    setMarkupChannelRowsLoading(true);
    setMarkupChannelLoadingRuleId(rule.id);
    setMarkupChannelRowsError('');
    const boundedPageSize = Math.min(200, Math.max(1, pageSize));
    try {
      const response = await apiClient.priceBookRows(
        rule.priceBookId,
        {
          page,
          pageSize: boundedPageSize,
          ...(rule.priceBookId ? {} : { agentName: rule.agentName, channelName: rule.channelName }),
          ...(sourceSheetName && sourceSheetName !== 'ALL' ? { sourceSheetName } : {}),
          ...(markupAmount && markupAmount !== 'ALL' ? { markupAmount } : {}),
          ...(markupSource && markupSource !== 'ALL' ? { markupSource } : {}),
          ...(markupSortOrder && markupSortOrder !== 'NONE' ? { markupSort: markupSortOrder } : {})
        }
      );
      if (requestId !== markupChannelRequestRef.current) {
        return;
      }
      setSelectedMarkupChannelRows(response.rows);
      setSelectedMarkupChannelRowIds((current) => current.filter((id) => response.rows.some((row) => row.id === id)));
      setMarkupChannelRowsPagination(response.pagination);
    } catch (error) {
      if (requestId === markupChannelRequestRef.current) {
        setMarkupChannelRowsError(error instanceof Error ? error.message : '线路明细加载失败');
      }
      throw error;
    } finally {
      if (requestId === markupChannelRequestRef.current) {
        setMarkupChannelRowsLoading(false);
        setMarkupChannelLoadingRuleId(null);
      }
    }
  }

  function openMarkupChannelDetail(rule: MarkupDisplayRule | null = selectedMarkupRule) {
    if (!rule) {
      return;
    }
    if (!rule.priceBookId) {
      onNotice('当前规则未关联有效价格表，无法打开线路阶梯工作台');
      return;
    }
    const params = new URLSearchParams({ view: 'route-editor', priceBookId: rule.priceBookId, agentName: rule.agentName });
    window.open(`/app/pricing/markup?${params.toString()}`, '_blank', 'noopener');
  }

  function closeMarkupChannelDetail() {
    nextMarkupChannelRequestId();
    setMarkupChannelDetailOpen(false);
    setMarkupChannelRowsLoading(false);
    setMarkupChannelLoadingRuleId(null);
    setMarkupChannelRowsError('');
    setMarkupChannelRule(null);
    setSelectedMarkupChannelRows([]);
    setSelectedMarkupChannelRowIds([]);
    setBatchMarkupScope('PAGE');
    setMarkupSheetFilter('ALL');
    setMarkupAmountFilter('ALL');
    setMarkupSourceFilter('ALL');
    setMarkupSort('NONE');
  }

  async function resolveConcreteMarkupRule(rule: MarkupDisplayRule) {
    if (!rule.id.startsWith('agent:')) return rule;
    const localRule = markupDetailRules.find((item) => !item.id.startsWith('agent:') && item.agentName === rule.agentName && (item.priceBookId ?? '') === (rule.priceBookId ?? '') && !item.channelName && !item.realChannelName && !item.destinationCountry);
    if (localRule) {
      return localRule;
    }
    return {
      ...rule,
      id: rule.id.replace(/^agent:/, 'agent-base:'),
      priceBookId: rule.priceBookId,
      channelName: undefined,
      realChannelName: undefined,
      destinationCountry: undefined
    };
  }

  function openEditSpecificMarkupRule(rule: AgentMarkupRule) {
    setEditingMarkupRule(rule);
    markupForm.setFieldsValue({
      priceBookId: rule.priceBookId,
      agentName: rule.agentName,
      channelName: rule.channelName,
      realChannelName: rule.realChannelName,
      destinationCountry: rule.destinationCountry,
      markupType: rule.markupType ?? 'WEIGHT',
      markupValue: rule.markupValue ?? rule.markupPerKg,
      markupPerKg: rule.markupPerKg,
      priority: rule.priority ?? 100,
      enabled: rule.enabled ? 'true' : 'false'
    });
    setMarkupModalOpen(true);
  }

  function findLineMarkupRule(row: ImportedPriceRow) {
    const realChannelName = row.realChannelName ?? row.channelName;
    return markupDetailRules.find(
      (rule) =>
        rule.enabled &&
        rule.agentName === (activeMarkupChannelRule?.agentName ?? row.agentName) &&
        (rule.priceBookId ?? '') === (activeMarkupChannelRule?.priceBookId ?? '') &&
        rule.channelName === row.channelName &&
        rule.realChannelName === realChannelName &&
        rule.destinationCountry === row.destinationCountry
    );
  }

  function getLineMarkupAmount(row: ImportedPriceRow) {
    if (typeof row.lineMarkupPerKg === 'number') {
      return row.lineMarkupPerKg;
    }
    const rule = findLineMarkupRule(row);
    if (rule) {
      return rule.markupValue ?? rule.markupPerKg;
    }
    return activeMarkupChannelRule?.markupValue ?? activeMarkupChannelRule?.markupPerKg ?? 0.5;
  }

  function getLineMarkupDisplay(row: ImportedPriceRow) {
    return formatMarkupValue({ markupPerKg: getLineMarkupAmount(row) });
  }

  function getLineMarkupSource(row: ImportedPriceRow) {
    if (row.markupSource) {
      return getMarkupSourceLabel(row.markupSource);
    }
    return findLineMarkupRule(row) ? '线路自定义' : '代理默认';
  }

  async function loadAllMarkupChannelRowsForBatch(rule: MarkupDisplayRule) {
    const pageSize = 200;
    const first = await apiClient.priceBookRows(
      rule.priceBookId,
      {
        page: 1,
        pageSize,
        ...(rule.priceBookId ? {} : { agentName: rule.agentName, channelName: rule.channelName }),
        ...(markupSheetFilter && markupSheetFilter !== 'ALL' ? { sourceSheetName: markupSheetFilter } : {}),
        ...(markupAmountFilter && markupAmountFilter !== 'ALL' ? { markupAmount: markupAmountFilter } : {}),
        ...(markupSourceFilter && markupSourceFilter !== 'ALL' ? { markupSource: markupSourceFilter } : {}),
        ...(markupSort && markupSort !== 'NONE' ? { markupSort } : {})
      }
    );
    const totalPages = Math.max(1, Math.ceil(first.pagination.totalItems / pageSize));
    if (totalPages === 1) {
      return first.rows;
    }
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => index + 2).map((page) =>
        apiClient.priceBookRows(
          rule.priceBookId,
          {
            page,
            pageSize,
            ...(rule.priceBookId ? {} : { agentName: rule.agentName, channelName: rule.channelName }),
            ...(markupSheetFilter && markupSheetFilter !== 'ALL' ? { sourceSheetName: markupSheetFilter } : {}),
            ...(markupAmountFilter && markupAmountFilter !== 'ALL' ? { markupAmount: markupAmountFilter } : {}),
            ...(markupSourceFilter && markupSourceFilter !== 'ALL' ? { markupSource: markupSourceFilter } : {}),
            ...(markupSort && markupSort !== 'NONE' ? { markupSort } : {})
          }
        )
      )
    );
    return [...first.rows, ...rest.flatMap((response) => response.rows)];
  }

  async function getBatchMarkupTargetRows(rule: MarkupDisplayRule) {
    if (batchMarkupScope === 'SELECTED') {
      return selectedFilteredMarkupChannelRows;
    }
    if (batchMarkupScope === 'ALL_FILTERED') {
      return loadAllMarkupChannelRowsForBatch(rule);
    }
    return filteredMarkupChannelRows;
  }

  function openCreateLineMarkupRule(row: ImportedPriceRow) {
    setMarkupChannelDetailOpen(false);
    setEditingMarkupRule(null);
    setRestoreMarkupChannelAfterSave(true);
    const baseMarkup = activeMarkupChannelRule?.markupValue ?? activeMarkupChannelRule?.markupPerKg ?? 0.5;
    markupForm.setFieldsValue({
      priceBookId: activeMarkupChannelRule?.priceBookId,
      agentName: activeMarkupChannelRule?.agentName ?? row.agentName,
      channelName: row.channelName,
      realChannelName: row.realChannelName ?? row.channelName,
      destinationCountry: row.destinationCountry,
      markupType: 'WEIGHT',
      markupValue: baseMarkup,
      markupPerKg: baseMarkup,
      priority: 100,
      enabled: 'true'
    });
    setMarkupModalOpen(true);
  }

  function openEditLineMarkupRule(rule: AgentMarkupRule) {
    setMarkupChannelDetailOpen(false);
    setRestoreMarkupChannelAfterSave(true);
    openEditSpecificMarkupRule(rule);
  }

  async function handleSubmitMarkupRule() {
    setMarkupSaving(true);
    try {
      const values = await markupForm.validateFields();
      const payload = {
        legacyModule: markupModule,
        ...(values.priceBookId?.trim() || editingMarkupRule?.priceBookId || (restoreMarkupChannelAfterSave && activeMarkupChannelRule?.priceBookId)
          ? { priceBookId: values.priceBookId?.trim() || editingMarkupRule?.priceBookId || activeMarkupChannelRule?.priceBookId }
          : {}),
        agentName: values.agentName.trim(),
        channelName: values.channelName?.trim() || undefined,
        realChannelName: values.realChannelName?.trim() || undefined,
        destinationCountry: values.destinationCountry?.trim() || undefined,
        markupType: values.markupType,
        markupValue: values.markupValue,
        markupPerKg: values.markupType === 'WEIGHT' ? values.markupValue : values.markupPerKg ?? values.markupValue,
        priority: values.priority,
        enabled: values.enabled === 'true'
      };
      const shouldCreateFromAgentRow = editingMarkupRule?.id.startsWith('agent-base:') || editingMarkupRule?.id.startsWith('price-agent:');
      const rule: AgentMarkupRule = shouldCreateFromAgentRow
        ? (await apiClient.batchUpsertAgentMarkupRules([payload])).rows[0]
        : editingMarkupRule
          ? await apiClient.updateAgentMarkupRule(editingMarkupRule.id, payload)
          : await apiClient.createAgentMarkupRule(payload);
      if (!rule) {
        throw new Error('加价规则保存失败');
      }
      setMarkupDetailRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
      setMarkupRules((current) => [rule, ...current.filter((item) => item.id !== rule.id && item.id !== getAgentMarkupGroupId(rule))]);
      setSelectedMarkupRuleIds([getAgentMarkupGroupId(rule)]);
      setMarkupModalOpen(false);
      const shouldRestoreMarkupChannel = restoreMarkupChannelAfterSave && activeMarkupChannelRule;
      if (shouldRestoreMarkupChannel) {
        setMarkupChannelDetailOpen(true);
      }
      setRestoreMarkupChannelAfterSave(false);
      markupForm.resetFields();
      onNotice(`${rule.agentName} 加价规则已${shouldCreateFromAgentRow ? '保存' : editingMarkupRule ? '更新' : '新增'}：${formatMarkupValue(rule)}`);
      const refreshTasks: Array<Promise<unknown>> = [reloadMarkupRules(markupFilters)];
      if (shouldRestoreMarkupChannel && activeMarkupChannelRule) {
        const requestId = nextMarkupChannelRequestId();
        refreshTasks.push(loadMarkupDetailRules(activeMarkupChannelRule.agentName, activeMarkupChannelRule.priceBookId));
        refreshTasks.push(loadMarkupChannelRows(activeMarkupChannelRule, markupChannelRowsPagination.page, markupChannelRowsPagination.pageSize, markupSheetFilter, markupAmountFilter, markupSourceFilter, markupSort, requestId));
      }
      void Promise.all(refreshTasks).catch((error) => {
        onNotice(error instanceof Error ? `加价规则已保存，列表刷新失败：${error.message}` : '加价规则已保存，列表刷新失败');
      });
    } catch (error) {
      const isValidationError = typeof error === 'object' && error !== null && 'errorFields' in error;
      if (!isValidationError) {
        onNotice(error instanceof Error ? error.message : '加价规则保存失败');
      }
    } finally {
      setMarkupSaving(false);
    }
  }

  async function handleBatchApplySheetMarkup() {
    if (!activeMarkupChannelRule) {
      onNotice('请先打开代理线路详情');
      return;
    }
    if (!Number.isFinite(batchMarkupPerKg) || batchMarkupPerKg < 0) {
      onNotice('请输入有效的设置加价');
      return;
    }

    setBatchMarkupSaving(true);
    try {
      const targetRows = await getBatchMarkupTargetRows(activeMarkupChannelRule);
      if (targetRows.length === 0) {
        onNotice(batchMarkupScope === 'SELECTED' ? '请先勾选需要设置加价的线路' : '当前筛选没有可设置加价的线路');
        return;
      }
      const payloadByScope = new Map<string, AgentMarkupCreateInput>();
      targetRows.forEach((row) => {
        const payload: AgentMarkupCreateInput = {
          legacyModule: markupModule,
          ...(activeMarkupChannelRule?.priceBookId ? { priceBookId: activeMarkupChannelRule.priceBookId } : {}),
          agentName: activeMarkupChannelRule?.agentName ?? row.agentName,
          channelName: row.channelName,
          realChannelName: row.realChannelName ?? row.channelName,
          destinationCountry: row.destinationCountry,
          markupType: 'WEIGHT',
          markupValue: batchMarkupPerKg,
          markupPerKg: batchMarkupPerKg,
          priority: 100,
          enabled: true
        };
        payloadByScope.set([payload.priceBookId ?? '', payload.agentName, payload.channelName ?? '', payload.realChannelName ?? '', payload.destinationCountry ?? '', payload.priority ?? 100].join('\u0001'), payload);
      });
      const response = await apiClient.batchUpsertAgentMarkupRules([...payloadByScope.values()]);
      const updatedRules: AgentMarkupRule[] = response.rows;
      setMarkupDetailRules((current) => [
        ...updatedRules,
        ...current.filter((item) => !updatedRules.some((rule) => rule.id === item.id))
      ]);
      const filterLabel = markupSheetFilter === 'ALL' ? '全部工作表' : markupSheetFilter;
      if (response.successCount > 0) {
        const failedText = response.errorRows.length ? `，${response.errorRows.length} 条失败：${response.errorRows[0]?.reason}，可重试` : '';
        const scopeText = batchMarkupScope === 'ALL_FILTERED'
          ? `全部筛选结果 ${targetRows.length} 条`
          : batchMarkupScope === 'SELECTED'
            ? `已选 ${targetRows.length} 条`
            : `当前页 ${targetRows.length} 条`;
        onNotice(`已设置${scopeText}${filterLabel === '全部工作表' ? '' : `（${filterLabel}）`}线路为 +${formatCurrency(batchMarkupPerKg)}/kg（同步 ${response.successCount} 条规则${failedText}）`);
      } else {
        onNotice(response.errorRows[0]?.reason ? `批量设置加价失败：${response.errorRows[0].reason}，请调整后重试` : '批量设置加价失败，请重试');
      }
      const requestId = nextMarkupChannelRequestId();
      await Promise.all([
        loadMarkupDetailRules(activeMarkupChannelRule.agentName, activeMarkupChannelRule.priceBookId),
        loadMarkupChannelRows(activeMarkupChannelRule, markupChannelRowsPagination.page, markupChannelRowsPagination.pageSize, markupSheetFilter, markupAmountFilter, markupSourceFilter, markupSort, requestId),
        reloadMarkupRules(markupFilters)
      ]);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '批量设置加价失败');
    } finally {
      setBatchMarkupSaving(false);
    }
  }

  function disableSelectedMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    setMarkupBatchLoading(true);
    void batchUpdateMarkupRules([selectedMarkupRule], false).then((response) => {
      void reloadMarkupRules(markupFilters);
      onNotice(`${selectedMarkupRule.agentName} 加价规则已停用（${response.successCount} 条）`);
    }).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则停用失败');
    }).finally(() => {
      setMarkupBatchLoading(false);
    });
  }

  function deleteSelectedMarkupRule() {
    if (!selectedMarkupRules.length) {
      return;
    }
    setMarkupBatchLoading(true);
    void batchDeleteMarkupRules(selectedMarkupRules).then((response) => {
      void reloadMarkupRules(markupFilters);
      setSelectedMarkupRuleIds([]);
      onNotice(`已删除 ${response.successCount} 条加价规则`);
    }).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则删除失败');
    }).finally(() => {
      setMarkupBatchLoading(false);
    });
  }

  /**
   * 表格行只保留“查看线路”这个主操作；低频且具破坏性的维护动作集中在更多菜单，
   * 避免权限叠加时把固定操作列挤压到文字被截断。
   */
  function openMarkupRowAction(action: 'edit' | 'toggle' | 'delete', rule: MarkupDisplayRule) {
    if (action === 'edit') {
      void resolveConcreteMarkupRule(rule)
        .then(openEditSpecificMarkupRule)
        .catch((error) => onNotice(error instanceof Error ? error.message : '加价规则加载失败'));
      return;
    }

    const isToggle = action === 'toggle';
    const nextEnabled = !rule.enabled;
    Modal.confirm({
      title: isToggle ? `确认${nextEnabled ? '启用' : '停用'}该加价规则？` : '删除加价规则',
      content: isToggle
        ? (nextEnabled ? '启用后业务报价将重新使用该规则。' : '停用后业务员报价不会再使用该规则，历史记录仍保留。')
        : '删除后不可恢复，历史引用记录会保留。',
      okText: isToggle ? `确认${nextEnabled ? '启用' : '停用'}` : '确认删除',
      cancelText: '取消',
      okButtonProps: nextEnabled ? undefined : { danger: true },
      onOk: () => {
        setMarkupBatchLoading(true);
        const request = isToggle
          ? batchUpdateMarkupRules([rule], nextEnabled)
          : batchDeleteMarkupRules([rule]);
        return request
          .then((response) => {
            void reloadMarkupRules(markupFilters);
            if (isToggle) {
              onNotice(`${rule.agentName} 加价规则已${nextEnabled ? '启用' : '停用'}`);
            } else {
              onNotice(`已删除 ${response.successCount} 条加价规则`);
            }
          })
          .catch((error) => {
            onNotice(error instanceof Error ? error.message : (isToggle ? '加价规则状态更新失败' : '加价规则删除失败'));
            throw error;
          })
          .finally(() => setMarkupBatchLoading(false));
      }
    });
  }

  function buildMarkupBatchScope(rules: MarkupDisplayRule[]) {
    const ids = new Set<string>();
    const scopes = new Map<string, { agentName: string; priceBookId?: string; legacyModule?: LegacyPricingModule }>();
    rules.forEach((rule) => {
      if (rule.isPriceBookGroup) {
        return;
      }
      if (rule.priceBookId) {
        scopes.set(`${markupModule}\u0001${rule.priceBookId}\u0001${rule.agentName}`, { agentName: rule.agentName, priceBookId: rule.priceBookId, legacyModule: markupModule });
        return;
      }
      if (rule.id.startsWith('agent:')) {
        scopes.set(`${markupModule}\u0001${rule.agentName}`, { agentName: rule.agentName, legacyModule: markupModule });
      } else {
        ids.add(rule.id);
      }
    });
    return { ids: [...ids], scopes: [...scopes.values()] };
  }

  function batchUpdateMarkupRules(rules: MarkupDisplayRule[], enabled: boolean) {
    const scope = buildMarkupBatchScope(rules);
    return apiClient.batchUpdateAgentMarkupRules({ ...scope, enabled });
  }

  function batchDeleteMarkupRules(rules: MarkupDisplayRule[]) {
    return apiClient.batchDeleteAgentMarkupRules(buildMarkupBatchScope(rules));
  }

  function applyMarkupFilters() {
    void reloadMarkupRules(markupFilters).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则查询失败');
    });
  }

  function resetMarkupFilters() {
    const nextFilters: AgentMarkupListQuery = { status: 'ALL', page: 1, pageSize: 20, legacyModule: markupModule };
    setMarkupFilters(nextFilters);
    void reloadMarkupRules(nextFilters).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则重置失败');
    });
  }

  function exportMarkupRules() {
    void apiClient.exportAgentMarkupRules({ ...markupFilters, legacyModule: markupModule })
      .then((response) => onNotice(`已导出 ${response.rows.length} 条代理加价规则`))
      .catch((error) => onNotice(error instanceof Error ? error.message : '导出规则失败'));
  }

  function openEditPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    priceBookRemarkForm.setFieldsValue({ customRemark: selectedPriceBook.customRemark ?? selectedPriceBook.remark ?? '' });
    setPriceBookRemarkModalOpen(true);
  }

  async function downloadSelectedPriceBook() {
    if (!selectedPriceBook) return;
    try {
      const file = await apiClient.downloadPriceBook(selectedPriceBook.id);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onNotice(`已下载价格表 ${file.fileName}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表下载失败');
    }
  }

  async function handleSubmitPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    const values = await priceBookRemarkForm.validateFields();
    const customRemark = values.customRemark?.trim() || undefined;
    try {
      const updated = await apiClient.updatePriceBookRemark(selectedPriceBook.id, { customRemark });
      setPriceBooks((current) => current.map((book) => (book.id === updated.id ? updated : book)));
      setManagedPriceBooks((current) => current.map((book) => (book.id === updated.id ? updated : book)));
      setPriceBookRemarkModalOpen(false);
      priceBookRemarkForm.resetFields();
      onNotice(`${updated.fileName} 自定义备注已更新`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表自定义备注更新失败');
    }
  }

  async function handlePriceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const selectedModule = priceBookManagementModule;
    const selectedAgent = enabledAgentOptions.find((option) => option.value === priceBookImportAgentId);
    if (selectedModule !== 'dubaiAirSea' && !selectedAgent) {
      onNotice('请先选择代理简称');
      event.target.value = '';
      return;
    }
    setPriceBookImporting(true);
    setPriceBookImportJob(null);
    onNotice(`正在上传价格表 ${file.name}`);
    try {
      const selectedModuleLabel = priceBookImportModules.find((item) => item.key === selectedModule)?.label ?? selectedModule;
      const started = await apiClient.createPriceBookImportJob(file, {
        targetModule: selectedModule,
        agentId: selectedAgent?.value,
        agentShortName: selectedAgent?.shortName
      });
      setPriceBookImportJob(started.job);
      onNotice(`已创建导入任务，正在按 ${selectedModuleLabel} 解析 ${file.name}`);
      const completed = isTerminalImportJob(started.job) ? started.job : await waitForPriceBookImportJob(started.job.id);
      setPriceBookImportJob(completed);
      if (completed.status !== 'SUCCESS' || !completed.book) {
        throw new Error(completed.message ?? '价格表导入失败');
      }
      invalidatePricingResult();
      setPriceBooks((current) => [completed.book!, ...current.filter((book) => book.id !== completed.book!.id)]);
      setManagedPriceBooks((current) => [completed.book!, ...current.filter((book) => book.id !== completed.book!.id)]);
      setSelectedPriceBookIds([completed.book.id]);
      setPriceRows([...seedImportedPriceRows]);
      setMarkupPage(1);
      setMarkupNeedsRefresh(true);
      onNotice(selectedModule === 'dubaiAirSea'
        ? `已转换迪拜价格表 ${file.name}，共 ${completed.processedRows} 页；旧报价结果已失效，请重新查询并确认发布`
        : `已导入价格表 ${file.name}，代理简称：${selectedAgent?.shortName}，新增 ${completed.processedRows} 条代理成本价，查价模块：${selectedModuleLabel}，默认加价已按有效 xls 同步；旧报价结果已失效，请重新查询`);
      event.target.value = '';
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表导入失败');
      event.target.value = '';
    } finally {
      setPriceBookImporting(false);
    }
  }

  async function waitForPriceBookImportJob(jobId: string): Promise<PriceBookImportJobSummary> {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      const response = await apiClient.priceBookImportJob(jobId);
      setPriceBookImportJob(response.job);
      if (isTerminalImportJob(response.job)) {
        return response.job;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt < 30 ? 100 : 1000));
    }
    throw new Error('价格表导入仍在处理中，请稍后刷新查看任务结果');
  }

  async function deleteSelectedPriceBooks() {
    const selectedBooks = managedPriceBooks.filter((book) => selectedPriceBookIds.includes(book.id));
    if (!selectedBooks.length) {
      return;
    }

    try {
      await Promise.all(selectedBooks.map((book) => apiClient.deletePriceBook(book.id)));
      const deletedIds = new Set(selectedBooks.map((book) => book.id));
      setPriceBooks((current) => current.filter((book) => !deletedIds.has(book.id)));
      setManagedPriceBooks((current) => current.filter((book) => !deletedIds.has(book.id)));
      setPriceRows((current) => current.filter((row) => !row.priceBookId || !deletedIds.has(row.priceBookId)));
      setSelectedPriceBookIds([]);
      invalidatePricingResult();
      try {
        const latestMarkupRules = readAgentMarkupRows(await apiClient.agentMarkupRules({ includeHits: false }));
        setMarkupRules(latestMarkupRules);
        setSelectedMarkupRuleIds((current) => current.filter((id) => latestMarkupRules.some((rule) => rule.id === id)));
      } catch {
        // 价格表已经删除；加价规则刷新失败不能让旧报价结果留在页面上。
        setMarkupNeedsRefresh(true);
      }
      onNotice(selectedBooks.length === 1
        ? `已删除价格表 ${selectedBooks[0].fileName}，其报价已失效，请重新查询`
        : `已删除 ${selectedBooks.length} 张价格表，相关报价已失效，请重新查询`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表删除失败');
    }
  }

  async function runLookup() {
    try {
      const values = await lookupForm.validateFields();
      const canadaAddressType = legacyModule === 'canadaAirSea'
        ? values.canadaAddressType === 'AMAZON' ? 'AMAZON' : 'PRIVATE'
        : undefined;
      const amazonCode = legacyModule === 'canadaAirSea'
        ? canadaAddressType === 'AMAZON' ? values.amazonCode?.trim().toUpperCase() : undefined
        : values.amazonCode?.trim();
      const destinationCountry = legacyModule === 'usaAirSea'
        ? '美国'
        : legacyModule === 'canadaAirSea'
          ? '加拿大'
          : values.destinationCountry?.trim();
      const postalCode = legacyModule === 'usaAirSea'
        ? normalizeUsPostalCode(values.postalCode)
        : values.postalCode?.trim();
      const formMeasuredChargeableWeight = calculatePriceChargeableWeight({
        volumeCbm: values.volumeCbm,
        actualWeightKg: values.actualWeightKg,
        lengthCm: values.lengthCm,
        widthCm: values.widthCm,
        heightCm: values.heightCm,
        packageCount: values.packageCount,
        unitActualWeightKg: values.unitActualWeightKg
      });
      const autoAmazonTier = legacyModule === 'amazon'
        ? inferAmazonTierFromChargeableWeight(formMeasuredChargeableWeight || values.chargeableWeightKg)
        : undefined;
      const selectedAmazonTier = legacyModule === 'amazon'
        ? (amazonTierManual ? normalizeAmazonTier(values.tier) : autoAmazonTier ?? normalizeAmazonTier(values.tier))
        : undefined;
      const tierWeight = selectedAmazonTier ? amazonTierWeight(selectedAmazonTier) : Number(String(values.tier ?? '').match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
      const requestChargeableWeightKg = legacyModule === 'amazon'
        ? Math.max(Number(values.chargeableWeightKg) || 0, formMeasuredChargeableWeight, tierWeight)
        : Number(values.chargeableWeightKg) || formMeasuredChargeableWeight || calculatedChargeableWeight || tierWeight || 0;
      if (legacyModule === 'amazon' && !amazonCode) {
        onNotice('请先填写亚马逊仓库代码');
        return;
      }
      if (legacyModule === 'canadaAirSea' && canadaAddressType === 'AMAZON' && !/^[A-Z]{3}$/.test(amazonCode ?? '')) {
        lookupForm.setFields([{ name: 'amazonCode', errors: ['请输入三位大写字母，例如 YVR'] }]);
        onNotice('亚马逊仓请填写三位仓库代码，例如 YVR');
        return;
      }
      if ((legacyModule === 'inquiry' || legacyModule === 'europeExpress') && !destinationCountry) {
        onNotice('请先填写目的国家');
        return;
      }
      if (legacyModule === 'inquiry' && requestChargeableWeightKg <= 0) {
        onNotice('请先填写方数、实重或计费重');
        return;
      }
      if (legacyModule === 'southAfrica' && !values.productName?.trim()) {
        onNotice('请先填写品名/明细关键词');
        return;
      }
      if (legacyModule === 'southAfrica' && Number(values.volumeCbm ?? 0) <= 0) {
        onNotice('请先填写体积 CBM');
        return;
      }
      if (isAirSeaPricingModule(legacyModule) && requestChargeableWeightKg <= 0 && Number(values.volumeCbm ?? 0) <= 0) {
        onNotice('请先填写计费重量 KG 或方数 CBM');
        return;
      }
      if ((legacyModule === 'inquiry' || legacyModule === 'europeExpress') && postalRequired && !postalCode) {
        lookupForm.setFields([{ name: 'postalCode', errors: ['当前目的地需要填写邮编'] }]);
        onNotice('当前目的地需要填写邮编');
        return;
      }
      if (legacyModule === 'usaAirSea' && !postalCode) {
        lookupForm.setFields([{ name: 'postalCode', errors: ['请输入五位美国 ZIP Code 或 ZIP+4'] }]);
        onNotice('请输入五位美国 ZIP Code 或 ZIP+4');
        return;
      }
      const largeCargoReason = describeLargeCargo(values);
      // 驰汉卡车海运双清明确归属本模块；是否可接大件由后端按实际
      // 价格表线路判断，其他仅有快递线路的代理仍会收到原有转模块提示。
      if ((legacyModule === 'inquiry' || legacyModule === 'amazon') && largeCargoReason) {
        onNotice('已按大件/超大件规则匹配渠道');
      }
      const requestId = lookupRequestSeqRef.current + 1;
      lookupRequestSeqRef.current = requestId;
      setLookupLoading(true);
      setLookupError(null);
      setLookupResult(null);
      setLegacyResult(null);
      setSouthAfricaResult(null);
      setSelectedLegacyRecommendation(null);
      try {
        if (legacyModule === 'southAfrica') {
          const southAfrica = await withPricingLookupTimeout(apiClient.lookupSouthAfricaPricing({
            productName: values.productName?.trim() ?? '',
            volumeCbm: Number(values.volumeCbm),
            category: values.tier?.trim() || undefined
          }));
          if (requestId !== lookupRequestSeqRef.current) {
            return;
          }
          setSouthAfricaResult(southAfrica);
          setTodayLookupCount((current) => current + 1);
          onNotice(southAfrica.result
            ? southAfrica.result.consult
              ? `${southAfrica.result.category} 需单独咨询，已生成待复核记录`
              : '查价成功'
            : '未匹配到南非物料规则');
          return;
        }
        const legacy = await withPricingLookupTimeout(apiClient.quoteLegacyPricing({
          module: legacyModule,
          ...values,
          ...(selectedAmazonTier ? { tier: selectedAmazonTier, weightBand: selectedAmazonTier } : {}),
          cargoType: values.cargoType === 'ALL' ? undefined : values.cargoType,
          amazonCode,
          canadaAddressType,
          destinationCountry: destinationCountry ?? '',
          postalCode: postalCode ?? '',
          chargeableWeightKg: requestChargeableWeightKg
        }));
        if (requestId !== lookupRequestSeqRef.current) {
          return;
        }
        setLegacyResult(legacy);
        setTodayLookupCount((current) => current + 1);
        const resultWeightBand = legacy.module === 'amazon'
          ? legacy.selected?.weightSegmentLabel ?? legacy.query.weightBand ?? selectedAmazonTier
          : undefined;
        onNotice(legacy.selected
          ? '查价成功'
          : legacy.module === 'amazon' && resultWeightBand
            ? `未匹配到 ${resultWeightBand} 报价，请检查仓库、渠道或重量段`
            : isAirSeaPricingModule(legacy.module)
              ? '未匹配到当前模块报价'
            : `${legacyPricingModules.find((item) => item.key === legacy.module)?.label ?? '查价'} 暂无匹配报价`);
      } catch (error) {
        if (requestId !== lookupRequestSeqRef.current) {
          return;
        }
        const message = pricingLookupErrorMessage(error);
        const scopedMessage = isAirSeaPricingModule(legacyModule) && /查价超时/.test(message)
          ? '当前模块查价超时，请缩小条件或稍后重试'
          : isAirSeaPricingModule(legacyModule) && /没有匹配|没有可用/.test(message)
            ? '未匹配到当前模块报价'
            : message;
        setLookupError(scopedMessage);
        onNotice(scopedMessage);
      } finally {
        if (requestId === lookupRequestSeqRef.current) {
          setLookupLoading(false);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        const message = pricingLookupErrorMessage(error);
        const scopedMessage = isAirSeaPricingModule(legacyModule) && /查价超时/.test(message)
          ? '当前模块查价超时，请缩小条件或稍后重试'
          : isAirSeaPricingModule(legacyModule) && /没有匹配|没有可用/.test(message)
            ? '未匹配到当前模块报价'
            : message;
        setLookupError(scopedMessage);
        onNotice(scopedMessage);
      }
      setLookupLoading(false);
    }
  }

  function invalidatePricingResult() {
    // 价格表变更后不能继续展示或接收变更前的查价响应。
    lookupRequestSeqRef.current += 1;
    setLookupResult(null);
    setLegacyResult(null);
    setSouthAfricaResult(null);
    setLookupError(null);
    setLookupLoading(false);
    setSelectedLegacyRecommendation(null);
    setSelectedDubaiPricePage(null);
  }

  function resetLookupResult() {
    invalidatePricingResult();
    if (legacyModule === 'europeExpress') {
      lookupForm.setFieldValue('channel', '');
    }
    onNotice('已清空报价结果，可重新查询');
  }

  function copyQuote(item: PriceRecommendation | null) {
    if (!item) {
      onNotice('暂无可复制的推荐报价');
      return;
    }
    void navigator.clipboard?.writeText(buildQuoteCopyText(item)).catch(() => undefined);
    onNotice('推荐报价已复制');
  }

  function copyCurrentRecommendedQuote() {
    if (highlightedQuote) {
      copyQuote(highlightedQuote);
      return;
    }
    if (highlightedLegacyQuote) {
      void navigator.clipboard?.writeText(buildLegacyQuoteCopyText(highlightedLegacyQuote)).catch(() => undefined);
      onNotice('推荐报价已复制');
      return;
    }
    if (southAfricaResult?.result) {
      void navigator.clipboard?.writeText(southAfricaResult.result.quoteText).catch(() => undefined);
      onNotice('南非报价模板已复制');
      return;
    }
    onNotice('暂无可复制的推荐报价');
  }

  function changeLegacyModule(nextModule: LegacyPricingModule) {
    invalidatePricingResult();
    setLegacyModule(nextModule);
    setChargeableWeightManual(false);
    setVolumeCbmManual(false);
    setAmazonTierManual(false);
    setSouthAfricaCategoryManual(false);
    lookupForm.setFieldsValue(legacyModuleDefaults[nextModule]);
  }

  function renderLegacyLookupFields() {
    const southAfricaRuleRows = Array.isArray(southAfricaRules) ? southAfricaRules : [];
    const amazonOriginValues = legacyModule === 'amazon'
      ? Array.from(new Set([...(legacyMeta?.origins ?? []), ...amazonOriginFallbackOptions])).filter(isAmazonOriginOption)
      : (legacyMeta?.origins ?? []);
    const originOptions = [
      { value: '', label: '全部出货仓' },
      ...amazonOriginValues.map((value) => ({ value, label: value }))
    ];
    const tierOptions = [
      { value: '', label: legacyModule === 'southAfrica' ? '自动匹配' : '全部重量段' },
      ...(legacyModule === 'southAfrica'
        ? Array.from(new Set(southAfricaRuleRows.map((rule) => rule.category))).map((value) => ({ value, label: value }))
        : (legacyMeta?.tiers ?? []).map((value) => ({ value, label: value })))
    ];
    const lookupTabOrder: Record<LegacyPricingModule, Record<string, number>> = {
      amazon: { amazonCode: 1, actualWeightKg: 2, volumeCbm: 3, tier: 4, origin: 5, destinationCountry: 6, channel: 7 },
      inquiry: { productName: 1, cargoType: 2, destinationCountry: 3, postalCode: 4, address: 5, packageInfo: 6, channel: 7, actualWeightKg: 8, lengthCm: 9, widthCm: 10, heightCm: 11, packageCount: 12, unitActualWeightKg: 13, volumeCbm: 14 },
      europeExpress: { destinationCountry: 1, postalCode: 2, channel: 3, taxInclusion: 4, chargeableWeightKg: 5, volumeCbm: 6, lengthCm: 7, widthCm: 8, heightCm: 9, packageCount: 10, unitActualWeightKg: 11, productName: 12, packageInfo: 13 },
      southAfrica: { productName: 1, tier: 2, volumeCbm: 3 },
      usaAirSea: { postalCode: 1, channel: 2, chargeableWeightKg: 3, volumeCbm: 4, lengthCm: 5, widthCm: 6, heightCm: 7, packageCount: 8, unitActualWeightKg: 9, productName: 10, packageInfo: 11 },
      canadaAirSea: { canadaAddressType: 1, amazonCode: 2, channel: 3, chargeableWeightKg: 4, volumeCbm: 5, lengthCm: 6, widthCm: 7, heightCm: 8, packageCount: 9, unitActualWeightKg: 10, productName: 11, packageInfo: 12 },
      dubaiAirSea: { destinationCountry: 1, channel: 2, chargeableWeightKg: 3, volumeCbm: 4, lengthCm: 5, widthCm: 6, heightCm: 7, packageCount: 8, unitActualWeightKg: 9, productName: 10, packageInfo: 11 }
    };
    const lookupTabIndex = (field: string) => lookupTabOrder[legacyModule][field] ?? 0;

    if (legacyModule === 'amazon') {
      return (
        <>
          <section className="pricing-form-block">
            <Text strong className="pricing-form-block-title">亚马逊查询条件</Text>
            <div className="pricing-form-grid pricing-form-grid-amazon">
              <Form.Item name="amazonCode" label="亚马逊仓库代码" rules={[{ required: true, message: '请输入仓库代码' }]}>
                <Input tabIndex={lookupTabIndex('amazonCode')} placeholder="FTW5" />
              </Form.Item>
              <Form.Item name="tier" label="重量段">
                <Select tabIndex={lookupTabIndex('tier')} options={amazonTierLabels.map((value) => ({ value, label: value }))} virtual={false} />
              </Form.Item>
              <Form.Item name="origin" label="出货仓">
                <Select tabIndex={lookupTabIndex('origin')} showSearch options={originOptions} virtual={false} />
              </Form.Item>
              <Form.Item name="destinationCountry" label="国家/地区关键词">
                <Input tabIndex={lookupTabIndex('destinationCountry')} placeholder="国家/地区关键词" />
              </Form.Item>
              <Form.Item name="channel" label="渠道关键词">
                <Input tabIndex={lookupTabIndex('channel')} placeholder="渠道关键词" />
              </Form.Item>
              <Form.Item name="actualWeightKg" label="实重 KG">
                <InputNumber tabIndex={lookupTabIndex('actualWeightKg')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 500" />
              </Form.Item>
              <Form.Item name="volumeCbm" label="方数 CBM">
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="方数" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 1" />
              </Form.Item>
              <Form.Item name="chargeableWeightKg" hidden>
                <InputNumber />
              </Form.Item>
            </div>
          </section>
        </>
      );
    }

    if (legacyModule === 'inquiry') {
      return (
        <>
          <section className="pricing-form-block">
            <Text strong className="pricing-form-block-title">询盘信息</Text>
            <div className="pricing-form-grid pricing-form-grid-inquiry">
              <Form.Item name="productName" label="品名">
                <Input tabIndex={lookupTabIndex('productName')} placeholder="桌子，椅子" />
              </Form.Item>
              <Form.Item name="cargoType" label="货物属性">
                <Select
                  tabIndex={lookupTabIndex('cargoType')}
                  options={[
                    { value: 'ALL', label: '全部' },
                    { value: 'GENERAL', label: '普货' },
                    { value: 'BATTERY', label: '电池/带电货' }
                  ]}
                />
              </Form.Item>
              <Form.Item name="destinationCountry" label="目的国家" rules={[{ required: true, message: '请输入目的国家' }]}>
                <AutoComplete
                  tabIndex={lookupTabIndex('destinationCountry')}
                  options={countryOptions}
                  filterOption={filterLocationOption}
                  placeholder="选择或输入国家，例如 法国 / France"
                />
              </Form.Item>
              <Form.Item name="postalCode" label="邮编" rules={postalRequired ? [{ required: true, message: '请输入邮编' }] : []}>
                <Input tabIndex={lookupTabIndex('postalCode')} placeholder="60750" />
              </Form.Item>
              <Form.Item name="address" label="地址" className="pricing-field-span-2">
                <Input.TextArea tabIndex={lookupTabIndex('address')} rows={3} placeholder="France 549 rue du maubon Choisy au bac" />
              </Form.Item>
              <Form.Item name="packageInfo" label="包装（可选）">
                <Input tabIndex={lookupTabIndex('packageInfo')} aria-label="包装" placeholder="如 1个木箱、2托、纸箱货" />
              </Form.Item>
              <Form.Item name="channel" label="渠道">
                <Select
                  tabIndex={lookupTabIndex('channel')}
                  options={[
                    { value: '', label: '全部运输方式' },
                    { value: '空运', label: '空运' },
                    { value: '海运', label: '海运' },
                    { value: '铁路', label: '铁路' },
                    { value: '铁海', label: '铁海联运' }
                  ]}
                />
              </Form.Item>
              <Form.Item name="actualWeightKg" label="实际重量 KG">
                <InputNumber tabIndex={lookupTabIndex('actualWeightKg')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="没有可不填" />
              </Form.Item>
              <Form.Item name="volumeCbm" label="方数 CBM" rules={[{ required: true, message: '请输入方数' }]}>
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="方数" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="5" />
              </Form.Item>
            </div>
          </section>
          <section className="pricing-form-block">
            <Text strong className="pricing-form-block-title">尺寸（有就填）</Text>
            <div className="pricing-form-grid pricing-form-grid-size">
              <Form.Item name="lengthCm" label="长 cm"><InputNumber tabIndex={lookupTabIndex('lengthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="widthCm" label="宽 cm"><InputNumber tabIndex={lookupTabIndex('widthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="heightCm" label="高 cm"><InputNumber tabIndex={lookupTabIndex('heightCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="packageCount" label="件数"><InputNumber tabIndex={lookupTabIndex('packageCount')} min={1} precision={0} /></Form.Item>
              <Form.Item name="unitActualWeightKg" label="单件实重 KG"><InputNumber tabIndex={lookupTabIndex('unitActualWeightKg')} min={0} precision={3} placeholder="可不填" /></Form.Item>
            </div>
          </section>
        </>
      );
    }

    if (legacyModule === 'europeExpress') {
      return (
        <>
          <section className="pricing-form-block">
            <Text strong className="pricing-form-block-title">基础查询条件</Text>
            <div className="pricing-form-grid pricing-form-grid-express">
              <Form.Item name="destinationCountry" label="目的国家" rules={[{ required: true, message: '请输入目的国家' }]}>
                <Input tabIndex={lookupTabIndex('destinationCountry')} placeholder="法国" />
              </Form.Item>
              <Form.Item name="postalCode" label="邮编（意大利必填）" rules={postalRequired ? [{ required: true, message: '意大利分区报价需要邮编' }] : []}>
                <Input tabIndex={lookupTabIndex('postalCode')} placeholder="如 20100" />
              </Form.Item>
              <Form.Item name="channel" label="渠道">
                <Select
                  tabIndex={lookupTabIndex('channel')}
                  options={[
                    { value: '', label: '全部渠道' },
                    { value: '空运', label: '空运' },
                    { value: '海运', label: '海运' },
                    { value: '铁路', label: '铁路' }
                  ]}
                />
              </Form.Item>
              <Form.Item name="taxInclusion" label="税务口径">
                <Select
                  tabIndex={lookupTabIndex('taxInclusion')}
                  options={[
                    { value: '', label: '全部' },
                    { value: 'INCLUDED', label: '包税' },
                    { value: 'EXCLUDED', label: '不包税' }
                  ]}
                />
              </Form.Item>
              <Form.Item name="chargeableWeightKg" label="计费重量 KG">
                <InputNumber tabIndex={lookupTabIndex('chargeableWeightKg')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 80、120、1000；不填则按最低单价排序" />
              </Form.Item>
              <Form.Item name="volumeCbm" label="方数 CBM">
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="卡车头程按方报价时填写" />
              </Form.Item>
            </div>
          </section>
          <section className="pricing-form-block">
            <Text strong className="pricing-form-block-title">尺寸信息</Text>
            <div className="pricing-form-grid pricing-form-grid-size">
              <Form.Item name="lengthCm" label="长 cm"><InputNumber tabIndex={lookupTabIndex('lengthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="widthCm" label="宽 cm"><InputNumber tabIndex={lookupTabIndex('widthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="heightCm" label="高 cm"><InputNumber tabIndex={lookupTabIndex('heightCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="packageCount" label="件数"><InputNumber tabIndex={lookupTabIndex('packageCount')} min={1} precision={0} /></Form.Item>
              <Form.Item name="unitActualWeightKg" label="单件实重 KG"><InputNumber tabIndex={lookupTabIndex('unitActualWeightKg')} min={0} precision={3} placeholder="可不填" /></Form.Item>
            </div>
          </section>
          <section className="pricing-form-block pricing-form-block-muted">
            <Text strong className="pricing-form-block-title">辅助信息</Text>
            <div className="pricing-form-grid pricing-form-grid-express-extra">
              <Form.Item name="productName" label="品名（可选）">
                <Input tabIndex={lookupTabIndex('productName')} placeholder="普货、小件可不填" />
              </Form.Item>
              <Form.Item name="packageInfo" label="包装（可选）">
                <Input tabIndex={lookupTabIndex('packageInfo')} aria-label="包装" placeholder="纸箱、木箱、托盘等" />
              </Form.Item>
            </div>
          </section>
        </>
      );
    }

    if (isAirSeaPricingModule(legacyModule)) {
      const moduleLabel = getLegacyModuleLabel(legacyModule);
      return (
        <>
          <section className="pricing-form-block">
            <Text strong className="pricing-form-block-title">{moduleLabel}条件</Text>
            <div className="pricing-form-grid pricing-form-grid-express">
              {legacyModule === 'usaAirSea' ? (
                <>
                  <Form.Item name="destinationCountry" hidden><Input /></Form.Item>
                  <Form.Item label="目的国家"><Input value="美国" disabled /></Form.Item>
                  <Form.Item
                    name="postalCode"
                    label="美国邮编"
                    rules={[{ required: true, message: '请输入美国邮编' }, { pattern: /^\d{5}(?:-\d{4})?$/, message: '请输入五位 ZIP Code 或 ZIP+4' }]}
                  >
                    <Input tabIndex={lookupTabIndex('postalCode')} placeholder="90001 或 90001-1234" maxLength={10} />
                  </Form.Item>
                </>
              ) : legacyModule === 'canadaAirSea' ? (
                <>
                  <Form.Item name="destinationCountry" hidden><Input /></Form.Item>
                  <Form.Item
                    name="canadaAddressType"
                    label="收货地址类型"
                    rules={[{ required: true, message: '请选择私人地址或亚马逊仓' }]}
                  >
                    <Select
                      tabIndex={lookupTabIndex('canadaAddressType')}
                      options={[
                        { value: 'PRIVATE', label: '私人地址' },
                        { value: 'AMAZON', label: '亚马逊仓' }
                      ]}
                      onChange={(value) => {
                        if (value !== 'AMAZON') lookupForm.setFieldValue('amazonCode', undefined);
                      }}
                    />
                  </Form.Item>
                  {canadaAddressTypeValue === 'AMAZON' ? (
                    <Form.Item
                      name="amazonCode"
                      label="亚马逊仓库前三位"
                      rules={[
                        { required: true, message: '请输入亚马逊仓库前三位' },
                        { pattern: /^[A-Za-z]{3}$/, message: '请输入三位大写字母，例如 YVR' }
                      ]}
                    >
                      <Input
                        tabIndex={lookupTabIndex('amazonCode')}
                        maxLength={3}
                        placeholder="例如 YVR"
                        onChange={(event) => lookupForm.setFieldValue('amazonCode', event.target.value.toUpperCase())}
                      />
                    </Form.Item>
                  ) : null}
                </>
              ) : (
                <Form.Item name="destinationCountry" label="目的国家/地区">
                  <Input tabIndex={lookupTabIndex('destinationCountry')} placeholder="迪拜" />
                </Form.Item>
              )}
              <Form.Item name="channel" label="渠道关键词">
                <Input tabIndex={lookupTabIndex('channel')} placeholder="空运、海运、专线；留空查全部" />
              </Form.Item>
              <Form.Item name="chargeableWeightKg" label="计费重量 KG">
                <InputNumber tabIndex={lookupTabIndex('chargeableWeightKg')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 100" />
              </Form.Item>
              <Form.Item name="volumeCbm" label="方数 CBM">
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="方数 CBM" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 1.000" />
              </Form.Item>
            </div>
          </section>
          <section className="pricing-form-block">
            <Text strong className="pricing-form-block-title">尺寸信息</Text>
            <div className="pricing-form-grid pricing-form-grid-size">
              <Form.Item name="lengthCm" label="长 cm"><InputNumber tabIndex={lookupTabIndex('lengthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="widthCm" label="宽 cm"><InputNumber tabIndex={lookupTabIndex('widthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="heightCm" label="高 cm"><InputNumber tabIndex={lookupTabIndex('heightCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="packageCount" label="件数"><InputNumber tabIndex={lookupTabIndex('packageCount')} min={1} precision={0} /></Form.Item>
              <Form.Item name="unitActualWeightKg" label="单件实重 KG"><InputNumber tabIndex={lookupTabIndex('unitActualWeightKg')} min={0} precision={3} placeholder="可不填" /></Form.Item>
            </div>
          </section>
          <section className="pricing-form-block pricing-form-block-muted">
            <Text strong className="pricing-form-block-title">辅助信息</Text>
            <div className="pricing-form-grid pricing-form-grid-express-extra">
              <Form.Item name="productName" label="品名（可选）">
                <Input tabIndex={lookupTabIndex('productName')} placeholder="普货、配件等" />
              </Form.Item>
              <Form.Item name="packageInfo" label="包装（可选）">
                <Input tabIndex={lookupTabIndex('packageInfo')} aria-label="包装" placeholder="纸箱、木箱、托盘等" />
              </Form.Item>
            </div>
          </section>
        </>
      );
    }

    return (
      <section className="pricing-form-block">
        <Text strong className="pricing-form-block-title">查询条件</Text>
        <div className="pricing-form-grid pricing-form-grid-south-africa">
          <Form.Item name="productName" label="品名/明细关键词" rules={[{ required: true, message: '请输入品名或关键词' }]}>
            <Input tabIndex={lookupTabIndex('productName')} placeholder="衣服" />
          </Form.Item>
          <Form.Item name="tier" label="指定物料类别">
            <Select tabIndex={lookupTabIndex('tier')} showSearch placeholder="自动匹配，可手动修改" options={tierOptions} />
          </Form.Item>
          <Form.Item name="volumeCbm" label="体积 CBM" rules={[{ required: true, message: '请输入体积' }]}>
            <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="体积 CBM" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="1.000" />
          </Form.Item>
        </div>
      </section>
    );
  }

  if (isMarkupRouteEditor) {
    return <MarkupRouteEditor apiClient={apiClient} permissions={permissions} onNotice={onNotice} />;
  }

  return (
    <AppPage>
      <AppPageHeader
        title="报价查价中心"
        description={legacyModule === 'dubaiAirSea' ? '直接浏览迪拜空运、海运有效业务价格' : '已根据目的地、计费重和价格规则匹配可用渠道'}
        actions={activePricingSection === 'lookup' && legacyModule !== 'dubaiAirSea' ? (
          <AppActionGroup>
            <Button htmlType="button" icon={<RefreshCw size={16} />} onClick={resetLookupResult}>
              重置查价
            </Button>
            {canCopyQuote ? <Button htmlType="button" icon={<Copy size={16} />} disabled={!highlightedQuote && !highlightedLegacyQuote && !southAfricaResult?.result} onClick={copyCurrentRecommendedQuote}>
              复制推荐报价
            </Button> : null}
            <Button htmlType="button" type="primary" icon={<Search size={16} />} loading={lookupLoading} disabled={!canRunLookup || lookupLoading} onClick={() => void runLookup()}>
              查询报价
            </Button>
          </AppActionGroup>
        ) : undefined}
      />

      {renderNoticeBar(notice)}

      <ModuleSubWorkspace items={pricingSubItems} activeKey={activePricingSection} onChange={handlePricingSectionChange}>
        {(activePricingSection === 'lookup' || activePricingSection === 'markup') ? (
          <Row gutter={[16, 16]} className="main-grid">
        {activePricingSection === 'lookup' ? (
        <Col xs={24}>
          <Card className="module-grid pricing-legacy-module-card">
            <Space wrap>
              {availableLookupModules.map((item) => (
                <Button
                  key={item.key}
                  htmlType="button"
                  type={legacyModule === item.key ? 'primary' : 'default'}
                  onClick={(event) => {
                    event.preventDefault();
                    changeLegacyModule(item.key);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Space>
          </Card>
          {legacyModule === 'dubaiAirSea' ? (
            <div className="pricing-dubai-price-tables">
              {dubaiPriceDisplayError ? <Alert type="error" showIcon message={dubaiPriceDisplayError} /> : null}
              {(['AIR', 'SEA'] as const).map((mode) => {
                const pages = mode === 'AIR' ? dubaiPriceDisplay?.airPages ?? [] : dubaiPriceDisplay?.seaPages ?? [];
                const currentIndex = Math.min(dubaiDisplayPageIndexes[mode], Math.max(0, pages.length - 1));
                const currentPage = pages[currentIndex];
                return (
                  <Card
                    key={mode}
                    className="module-grid pricing-legacy-result-card"
                    title={`迪拜${mode === 'AIR' ? '空运' : '海运'}价格表`}
                    loading={dubaiPriceDisplayLoading}
                    extra={pages.length > 1 ? (
                      <Space size={6} className="pricing-dubai-page-switcher">
                        <Tooltip title="上一页">
                          <Button
                            htmlType="button"
                            size="small"
                            aria-label="上一页"
                            icon={<ArrowLeft size={15} />}
                            disabled={currentIndex === 0}
                            onClick={() => setDubaiDisplayPageIndexes((current) => ({ ...current, [mode]: Math.max(0, current[mode] - 1) }))}
                          />
                        </Tooltip>
                        <Text type="secondary">第 {currentIndex + 1} / {pages.length} 页</Text>
                        <Tooltip title="下一页">
                          <Button
                            htmlType="button"
                            size="small"
                            aria-label="下一页"
                            icon={<ArrowRight size={15} />}
                            disabled={currentIndex >= pages.length - 1}
                            onClick={() => setDubaiDisplayPageIndexes((current) => ({ ...current, [mode]: Math.min(pages.length - 1, current[mode] + 1) }))}
                          />
                        </Tooltip>
                      </Space>
                    ) : undefined}
                  >
                    {currentPage ? (
                      <div className="pricing-dubai-image-pages">
                        <button type="button" className="pricing-dubai-image-page" onClick={() => setSelectedDubaiPricePage(currentPage)}>
                          <img src={currentPage.url} alt={`迪拜${mode === 'AIR' ? '空运' : '海运'}价格表第 ${currentPage.pageNo} 页`} />
                        </button>
                      </div>
                    ) : <div className="pricing-empty-result pricing-empty-result-compact"><Text type="secondary">暂无已发布的迪拜{mode === 'AIR' ? '空运' : '海运'}价格表</Text></div>}
                  </Card>
                );
              })}
            </div>
          ) : (
          <Card
            className="module-grid pricing-lookup-card pricing-calculator-card"
            title={can('pricing:lookup:view') ? (
              <Space size={10} wrap>
                <span>查价</span>
              </Space>
            ) : undefined}
          >
            <Form
              form={lookupForm}
              name="priceLookupForm"
              layout="vertical"
              className="pricing-lookup-form pricing-calculator-form"
              initialValues={{
                ...legacyModuleDefaults.amazon,
                packageCount: 1
              }}
              onValuesChange={(changedValues) => {
                const dimensionKeys = ['volumeCbm', 'actualWeightKg', 'lengthCm', 'widthCm', 'heightCm', 'packageCount', 'unitActualWeightKg'];
                const cbmDimensionKeys = ['lengthCm', 'widthCm', 'heightCm', 'packageCount'];
                if (Object.prototype.hasOwnProperty.call(changedValues, 'volumeCbm')) {
                  setVolumeCbmManual(true);
                }
                if (cbmDimensionKeys.some((key) => Object.prototype.hasOwnProperty.call(changedValues, key))) {
                  setVolumeCbmManual(false);
                }
                if (Object.prototype.hasOwnProperty.call(changedValues, 'chargeableWeightKg')) {
                  setChargeableWeightManual(true);
                }
                if (dimensionKeys.some((key) => Object.prototype.hasOwnProperty.call(changedValues, key))) {
                  setChargeableWeightManual(false);
                  setAmazonTierManual(false);
                }
                if (Object.prototype.hasOwnProperty.call(changedValues, 'tier')) {
                  if (legacyModule === 'southAfrica') {
                    setSouthAfricaCategoryManual(Boolean(String(changedValues.tier ?? '').trim()));
                  } else {
                    setAmazonTierManual(true);
                  }
                  lookupRequestSeqRef.current += 1;
                  setLegacyResult(null);
                  setSouthAfricaResult(null);
                  setLookupResult(null);
                  setLookupError(null);
                  setSelectedLegacyRecommendation(null);
                  if (legacyModule !== 'southAfrica') {
                    setChargeableWeightManual(false);
                  }
                  onNotice(null);
                }
              }}
            >
              <div className={`pricing-calculator-grid pricing-calculator-grid-${legacyModule}${isAirSeaPricingModule(legacyModule) ? ' pricing-calculator-grid-air-sea' : ''}`}>
                <div className="pricing-calculator-left">
                  {renderLegacyLookupFields()}
                  {legacyModule === 'inquiry' ? (
                    <div className="pricing-auto-weight-inline">
                      <Text strong>自动计费重</Text>
                      <Title level={3}>{calculatedChargeableWeight > 0 ? calculatedChargeableWeight : 0} KG</Title>
                      <Text type="secondary">没有尺寸时直接填方数，系统按 CBM x 167 自动算计费重。</Text>
                    </div>
                  ) : null}
                  <div className="pricing-legacy-action-row">
                    <Button
                      aria-label="查价查询"
                      type="primary"
                      size="large"
                      icon={<Search size={16} />}
                      htmlType="button"
                      loading={lookupLoading}
                      disabled={!canRunLookup || lookupLoading}
                      onClick={() => void runLookup()}
                    >
                      {legacyModule === 'amazon' ? '查询比价' : legacyModule === 'inquiry' ? '查询综合报价' : '查询价格'}
                    </Button>
                    <Button htmlType="button" size="large" onClick={resetLookupResult}>清空</Button>
                  </div>
                </div>
              </div>
            </Form>
          </Card>
          )}

          {legacyModule === 'southAfrica' && (lookupLoading || lookupError || southAfricaResult) ? (
            <Card
              className="module-grid pricing-legacy-result-card pricing-south-africa-result-card"
              title="南非专线查询 · 业务报价"
              extra={canCopyQuote && southAfricaResult?.result ? (
                <Button
                  htmlType="button"
                  icon={<Copy size={14} />}
                  onClick={() => {
                    if (!navigator.clipboard) {
                      onNotice('当前浏览器不支持自动复制，请展开报价文案后手动复制');
                      return;
                    }
                    void navigator.clipboard
                      .writeText(southAfricaResult?.result?.quoteText ?? '')
                      .then(() => onNotice('南非报价模板已复制'))
                      .catch(() => onNotice('复制失败，请展开报价文案后手动复制'));
                  }}
                >
                  复制报价
                </Button>
              ) : undefined}
            >
              {southAfricaResult?.result ? (
                <div className="pricing-south-africa-result">
                  <div className="pricing-south-africa-quote-summary">
                    <div className="pricing-south-africa-quote-total">
                      <Tag color={southAfricaResult.result.consult ? 'orange' : 'green'}>{southAfricaResult.result.consult ? '需单独咨询' : '可报价'}</Tag>
                      <Title level={2}>{southAfricaResult.result.consult ? '单询' : formatCurrency(southAfricaResult.result.freightFee ?? 0)}</Title>
                    </div>
                    <div className="pricing-south-africa-quote-rule">
                      <Text strong className="pricing-south-africa-quote-category">{southAfricaResult.result.category} / {southAfricaResult.result.materialName}</Text>
                      <Space className="pricing-south-africa-quote-tags" wrap size={[4, 4]}>
                        {southAfricaResult.result.matchedKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>)}
                      </Space>
                    </div>
                    <div className="pricing-south-africa-quote-metrics" aria-label="南非报价计费口径">
                      <div><Text type="secondary">单价</Text><Text strong>{southAfricaResult.result.ratePerCbm === undefined ? '-' : `${formatCurrency(southAfricaResult.result.ratePerCbm)}/CBM`}</Text></div>
                      <div><Text type="secondary">计费方</Text><Text strong>{southAfricaResult.result.chargeableCbm.toFixed(3)}CBM</Text></div>
                    </div>
                  </div>
                  <div className="pricing-south-africa-quote-remark">
                    <Text type="secondary">备注</Text>
                    <Text>{southAfricaResult.result.remark || '低消 0.5CBM。'}</Text>
                  </div>
                  <Collapse
                    className="pricing-south-africa-copy-collapse"
                    size="small"
                    items={[{
                      key: 'quote-text',
                      label: '查看可复制报价文案',
                      children: <pre className="pricing-copy-template">{southAfricaResult.result.quoteText}</pre>
                    }]}
                  />
                </div>
              ) : (
                <div className="pricing-empty-result pricing-empty-result-compact">
                  <div className="pricing-empty-icon">{lookupError ? <AlertTriangle size={28} /> : lookupLoading ? <RefreshCw size={28} /> : <PackageCheck size={28} />}</div>
                  <div>
                    <Text strong>{lookupError ? '查询失败' : lookupLoading ? '查询中' : '未匹配到南非物料规则'}</Text>
                    <div>
                      <Text type="secondary">
                        {lookupError ?? (lookupLoading ? '正在匹配报价，请稍候。' : '未匹配到南非物料规则，请参考下方报价表人工判断。')}
                      </Text>
                    </div>
                    {lookupError ? <Button htmlType="button" size="small" type="primary" onClick={() => void runLookup()}>重试查询</Button> : null}
                  </div>
                </div>
              )}
            </Card>
          ) : null}
          {legacyModule === 'southAfrica' && canReadSouthAfricaRules ? (
            <Card
              className="module-grid pricing-legacy-result-card pricing-south-africa-rate-table-card"
              title="南非专线报价表"
              extra={can('pricing:south-africa:rules-create') ? <Button htmlType="button" type="primary" onClick={openCreateSouthAfricaRateRule}>新增物料规则</Button> : undefined}
            >
              <ManagedTable<SouthAfricaRateRuleSummary>
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={southAfricaRules}
                rowClassName={(record) => record.id === southAfricaResult?.result?.id ? 'pricing-south-africa-hit-row' : ''}
                columns={[
                  { title: '一级分类', dataIndex: 'category', width: 120, render: (value) => <Text strong>{value}</Text> },
                  { title: '物料类别', dataIndex: 'name', width: 150 },
                  { title: '匹配关键词', dataIndex: 'keywords', width: 260, render: (keywords: string[]) => <Space className="pricing-south-africa-keywords" wrap size={[2, 2]}>{keywords.slice(0, 8).map((keyword) => <Tag className="pricing-south-africa-keyword-tag" key={keyword}>{keyword}</Tag>)}</Space> },
                  { title: '运费/CBM', dataIndex: 'ratePerCbm', width: 120, render: (value: number | undefined, record) => record.consult ? <Tag color="orange">需单询</Tag> : `${formatCurrency(value ?? 0)}/CBM` },
                  { title: '备注', dataIndex: 'remark', width: 260, render: (value?: string) => value || '-' },
                  { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
                  ...(can('pricing:south-africa:rules-update') || can('pricing:south-africa:rules-enable') || can('pricing:south-africa:rules-delete') ? [{
                    title: '操作',
                    key: 'action',
                    width: 210,
                    fixed: 'right' as const,
                    render: (_: unknown, rule: SouthAfricaRateRuleSummary) => (
                      <Space size={4}>
                        {can('pricing:south-africa:rules-update') ? <Button htmlType="button" size="small" onClick={() => openEditSouthAfricaRateRule(rule)}>修改</Button> : null}
                        {can('pricing:south-africa:rules-enable') ? (
                          rule.enabled ? <Popconfirm title="确认停用该南非物料规则？" description="停用后该规则不会参与自动查价。" okText="确认停用" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void setSouthAfricaRateRuleEnabled(rule, false)}>
                            <Button htmlType="button" size="small">停用</Button>
                          </Popconfirm> : <Button htmlType="button" size="small" onClick={() => void setSouthAfricaRateRuleEnabled(rule, true)}>启用</Button>
                        ) : null}
                        {can('pricing:south-africa:rules-delete') ? <Popconfirm title="确认删除该南非物料规则？" description="删除后无法恢复，且后续查价将不再匹配该规则。" okText="确认删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void deleteSouthAfricaRateRule(rule)}>
                          <Button htmlType="button" size="small" danger>删除</Button>
                        </Popconfirm> : null}
                      </Space>
                    )
                  }] : [])
                ]}
              />
            </Card>
          ) : null}
          {legacyModule !== 'southAfrica' && legacyModule !== 'dubaiAirSea' && (lookupLoading || lookupError || legacyResult) ? (
            <Card className="module-grid pricing-legacy-result-card" title={`${legacyPricingModules.find((item) => item.key === (legacyResult?.module ?? legacyModule))?.label ?? '渠道报价'} · 业务报价`}>
              {legacyResult && legacyHasRecommendations ? (
                <>
                  {legacyUnitPreview ? (
                    <Alert
                      className="notice-bar"
                      type="info"
                      showIcon
                      message="未填写计费重，当前结果按最低单价排序，仅用于快速比价；填写计费重量后可计算真实总价。"
                    />
                  ) : null}
                  <Row gutter={[12, 12]}>
                    {(legacyResult.cheapestRecommendations.length ? legacyResult.cheapestRecommendations : legacyResult.recommendations.slice(0, 3)).map((item, index) => (
                      <Col xs={24} md={8} key={item.id}>
                        <button type="button" className="pricing-legacy-quote-card" onClick={() => setSelectedLegacyRecommendation(item)}>
                          <span className="pricing-legacy-rank">{index + 1}</span>
                          <Text strong>{item.channelName}</Text>
                          <Title level={4}>{formatCurrency(item.salesTotal)}</Title>
                          {item.transportMode ? <Tag color="blue">{item.transportMode === 'SEA_RAIL' ? '铁海联运' : item.transportMode === 'AIR' ? '空运' : item.transportMode === 'SEA' ? '海运' : '铁路'}</Tag> : null}
                          {item.cargoType === 'BATTERY' ? <Tag color="purple">电池/带电</Tag> : null}
                          {canViewCost ? <span>成本 {item.costTotal === undefined ? '-' : formatCurrency(item.costTotal)}</span> : null}
                          <span>{item.weightSegmentLabel} / {formatKgCurrencyRate(item.salesUnitPrice)}{item.quoteMode === 'cbm' ? '/CBM' : '/kg'}</span>
                          {canViewPostalRule && item.postalRule ? <span>匹配邮编/价格区 {item.postalRule}</span> : null}
                          <span>时效 {item.transitLabel ?? '时效待确认'}</span>
                          {item.productSurchargeRemark || item.specialRemark || item.remark ? <Tag color="orange">渠道要求</Tag> : null}
                          {item.customRemark ? <Tag color="cyan">自定义备注</Tag> : null}
                        </button>
                      </Col>
                    ))}
                  </Row>
                  <ManagedTable
                    rowKey="id"
                    size="small"
                    pagination={tenRowTablePagination}
                    dataSource={legacyResult.recommendations}
                    scroll={{ x: canViewGrossProfit || canViewPostalRule ? 1710 : 1510 }}
                    onRow={(record) => ({ onClick: () => setSelectedLegacyRecommendation(record) })}
                    columns={[
                      { title: '渠道', dataIndex: 'channelName', width: 240, render: (value) => <Text strong>{value}</Text> },
                      ...(legacyModule === 'inquiry' ? [{ title: '运输方式', dataIndex: 'transportMode', width: 110, render: (value?: LegacyPricingRecommendation['transportMode']) => value ? <Tag color="blue">{value === 'SEA_RAIL' ? '铁海联运' : value === 'AIR' ? '空运' : value === 'SEA' ? '海运' : '铁路'}</Tag> : '-' }] : []),
                      { title: '仓库/国家', width: 140, render: (_value, record) => record.warehouseCode || record.destinationCountry || '-' },
                      ...(canViewPostalRule ? [{ title: '匹配邮编/价格区', dataIndex: 'postalRule', width: 150, render: (value?: string) => value || '-' }] : []),
                      { title: '重量段', dataIndex: 'weightSegmentLabel', width: 140 },
                      { title: '时效', dataIndex: 'transitLabel', width: 120, render: (value?: string) => value || '时效待确认' },
                      ...(canViewCost ? [{ title: '成本单价', width: 120, render: (_value: unknown, record: LegacyPricingRecommendation) => record.calculation ? `${formatKgCurrencyRate(record.calculation.cost.unitPrice)}/${record.calculation.chargeable.unit}` : '-' }] : []),
                      ...(canViewCost ? [{ title: '成本来源重量段', width: 150, render: (_value: unknown, record: LegacyPricingRecommendation) => record.calculation?.cost.weightSegmentLabel ?? '-' }] : []),
                      ...(canViewMarkupBreakdown ? [{ title: '命中加价规则', width: 170, render: (_value: unknown, record: LegacyPricingRecommendation) => record.calculation?.markup.source === 'LINE_TIER' ? record.calculation.markup.rangeLabel : '统一加价回退' }] : []),
                      ...(canViewMarkupBreakdown ? [{ title: '实际加价值', width: 120, render: (_value: unknown, record: LegacyPricingRecommendation) => record.calculation ? formatCurrency(record.calculation.markup.totalMarkup) : '-' }] : []),
                      { title: '单价', dataIndex: 'salesUnitPrice', width: 110, render: (value, record) => `${formatKgCurrencyRate(value)}${record.quoteMode === 'cbm' ? '/CBM' : '/kg'}` },
                      { title: '总价', dataIndex: 'salesTotal', width: 120, render: (value) => <Text strong>{formatCurrency(value)}</Text> },
                      ...(canViewGrossProfit ? [{ title: '毛利', dataIndex: 'grossProfit', width: 100, render: (value?: number) => <Text className="pricing-profit">{value === undefined ? '-' : formatCurrency(value)}</Text> }] : []),
                      ...(canViewRequirements ? [{ title: '渠道要求', width: 120, render: (_value: unknown, record: LegacyPricingRecommendation) => renderRequirementCell(record, () => setSelectedLegacyRecommendation(record)) }] : []),
                      {
                        title: '自定义备注',
                        width: 130,
                        render: (_value: unknown, record: LegacyPricingRecommendation) => renderCustomRemarkCell(record, () => setCustomRemarkDetail({
                          title: `${record.channelName} · 自定义备注`,
                          content: getCustomRemarkText(record) ?? ''
                        }))
                      },
                    ]}
                  />
                </>
              ) : (
                <div className="pricing-empty-result pricing-empty-result-compact">
                  <div className="pricing-empty-icon">{lookupError ? <AlertTriangle size={28} /> : lookupLoading ? <RefreshCw size={28} /> : <PackageCheck size={28} />}</div>
                  <div>
                    <Text strong>{lookupError ? '查询失败' : lookupLoading ? '查询中' : '未匹配到报价'}</Text>
                    <div>
                      <Text type="secondary">
                        {lookupError ?? (lookupLoading
                          ? '正在匹配报价，请稍候。'
                          : legacyResult?.module === 'amazon' && (legacyResult.query.weightBand || legacyResult.query.tier)
                            ? `未匹配到 ${normalizeAmazonTier(legacyResult.query.weightBand ?? legacyResult.query.tier)} 报价，请检查仓库、渠道或重量段`
                            : '请检查国家、渠道，或填写计费重量后重试。')}
                      </Text>
                    </div>
                    {lookupError ? <Button htmlType="button" size="small" type="primary" onClick={() => void runLookup()}>重试查询</Button> : null}
                  </div>
                </div>
              )}
            </Card>
          ) : null}
        </Col>
        ) : null}

        <Modal
          title={selectedDubaiPricePage ? `迪拜价格表 - ${selectedDubaiPricePage.sheetName} 第 ${selectedDubaiPricePage.pageNo} 页` : '迪拜价格表'}
          open={Boolean(selectedDubaiPricePage)}
          destroyOnHidden
          width="90vw"
          footer={<Button htmlType="button" type="primary" onClick={() => setSelectedDubaiPricePage(null)}>关闭</Button>}
          onCancel={() => setSelectedDubaiPricePage(null)}
        >
          {selectedDubaiPricePage ? <img className="pricing-dubai-image-preview" src={selectedDubaiPricePage.url} alt="迪拜价格表大图预览" /> : null}
        </Modal>

        <Modal
          title="渠道要求详情"
          open={Boolean(selectedLegacyRecommendation)}
          destroyOnHidden
          footer={<Button htmlType="button" type="primary" onClick={() => setSelectedLegacyRecommendation(null)}>关闭</Button>}
          onCancel={() => setSelectedLegacyRecommendation(null)}
        >
          {selectedLegacyRecommendation ? (
            <Space direction="vertical" size={14} className="full-width pricing-detail-modal">
              <div className="pricing-result-grid">
                <div className="pricing-result-item"><Text type="secondary">渠道</Text><Text strong>{selectedLegacyRecommendation.channelName}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">重量段</Text><Text strong>{selectedLegacyRecommendation.weightSegmentLabel}</Text></div>
                {canViewPostalRule && selectedLegacyRecommendation.postalRule ? <div className="pricing-result-item"><Text type="secondary">匹配邮编/价格区</Text><Text strong>{selectedLegacyRecommendation.postalRule}</Text></div> : null}
                <div className="pricing-result-item"><Text type="secondary">业务报价</Text><Text strong>{formatCurrency(selectedLegacyRecommendation.salesTotal)}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">业务单价</Text><Text strong>{formatKgCurrencyRate(selectedLegacyRecommendation.salesUnitPrice)}{selectedLegacyRecommendation.quoteMode === 'cbm' ? '/CBM' : '/kg'}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">时效</Text><Text strong>{selectedLegacyRecommendation.transitLabel ?? '时效待确认'}</Text></div>
              </div>
              {canViewCost || canViewGrossProfit || canViewMarkupBreakdown ? (
                <div className="pricing-result-grid pricing-admin-only">
                  {canViewCost ? <><div className="pricing-result-item"><Text type="secondary">成本单价</Text><Text strong>{selectedLegacyRecommendation.costUnitPrice === undefined ? '-' : `${formatKgCurrencyRate(selectedLegacyRecommendation.costUnitPrice)}${selectedLegacyRecommendation.quoteMode === 'cbm' ? '/CBM' : '/kg'}`}</Text></div><div className="pricing-result-item"><Text type="secondary">成本来源重量段</Text><Text strong>{selectedLegacyRecommendation.calculation?.cost.weightSegmentLabel ?? '-'}</Text></div><div className="pricing-result-item"><Text type="secondary">成本合计</Text><Text strong>{selectedLegacyRecommendation.costTotal === undefined ? '-' : formatCurrency(selectedLegacyRecommendation.costTotal)}</Text></div></> : null}
                  {canViewMarkupBreakdown ? <><div className="pricing-result-item"><Text type="secondary">命中加价规则</Text><Text strong>{selectedLegacyRecommendation.calculation?.markup.source === 'LINE_TIER' ? selectedLegacyRecommendation.calculation.markup.rangeLabel : '统一加价回退'}</Text></div><div className="pricing-result-item"><Text type="secondary">实际加价值</Text><Text strong>{selectedLegacyRecommendation.calculation ? formatCurrency(selectedLegacyRecommendation.calculation.markup.totalMarkup) : '-'}</Text></div></> : null}
                  {canViewGrossProfit ? <div className="pricing-result-item"><Text type="secondary">毛利</Text><Text strong>{selectedLegacyRecommendation.grossProfit === undefined ? '-' : formatCurrency(selectedLegacyRecommendation.grossProfit)}</Text></div> : null}
                </div>
              ) : null}
              {canViewRequirements ? renderRequirementDetailNote(selectedLegacyRecommendation) : null}
              {selectedLegacyRecommendation.customRemark ? (
                <div className="pricing-detail-note">
                  <Text type="secondary">自定义备注</Text>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{getCustomRemarkText(selectedLegacyRecommendation)}</Text>
                </div>
              ) : null}
            </Space>
          ) : null}
        </Modal>

        <Modal
          title={customRemarkDetail?.title ?? '自定义备注'}
          open={Boolean(customRemarkDetail)}
          destroyOnHidden
          footer={<Button htmlType="button" type="primary" onClick={() => setCustomRemarkDetail(null)}>关闭</Button>}
          onCancel={() => setCustomRemarkDetail(null)}
        >
          <Text style={{ whiteSpace: 'pre-wrap' }}>{customRemarkDetail?.content}</Text>
        </Modal>

        <Modal
          title="渠道要求详情"
          open={Boolean(selectedLineRequirement)}
          destroyOnHidden
          footer={<Button htmlType="button" type="primary" onClick={() => setSelectedLineRequirement(null)}>关闭</Button>}
          onCancel={() => setSelectedLineRequirement(null)}
        >
          {selectedLineRequirement ? (
            <Space direction="vertical" size={14} className="full-width pricing-detail-modal">
              <div className="pricing-result-grid">
                <div className="pricing-result-item"><Text type="secondary">查价渠道</Text><Text strong>{getMarkupRowLookupChannel(selectedLineRequirement)}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">工作表（Sheet）</Text><Text strong>{getMarkupRowSheetName(selectedLineRequirement)}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">目的地</Text><Text strong>{getMarkupRowLookupDestination(selectedLineRequirement)}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">重量段</Text><Text strong>{selectedLineRequirement.minWeightKg}-{selectedLineRequirement.maxWeightKg}kg</Text></div>
              </div>
              {renderRequirementDetailNote(selectedLineRequirement)}
            </Space>
          ) : null}
        </Modal>

        {activePricingSection === 'markup' && canViewMarkupWorkspace ? (
          <Col xs={24}>
            <div className="pricing-markup-workbench">
              <div className="pricing-markup-metrics">
                <MetricCard title="加价规则" value={markupMetrics.totalRules} icon={<SlidersHorizontal size={22} />} />
                <MetricCard title="启用规则" value={markupMetrics.enabledRules} icon={<CheckCircle2 size={22} />} />
                <MetricCard title="停用规则" value={markupMetrics.disabledRules} icon={<Power size={22} />} />
                <MetricCard title="未命中报价" value={markupMetrics.unmatchedQuotes} icon={<AlertTriangle size={22} />} />
                <MetricCard title="最近修改" value={markupMetrics.latestUpdatedAt ? new Date(markupMetrics.latestUpdatedAt).toLocaleDateString('zh-CN') : '-'} extra={markupMetrics.latestUpdatedAt ? new Date(markupMetrics.latestUpdatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '暂无修改记录'} icon={<Settings size={22} />} />
              </div>
              {canViewMarkupDetails ? <Card
                className="module-grid pricing-markup-card"
                title={
                  <Space direction="vertical" size={0}>
                    <span>代理加价规则</span>
                    <Text type="secondary">{getLegacyModuleLabel(markupModule)} · 当前大类独立管理和命中</Text>
                  </Space>
                }
                extra={
                  <Space wrap>
                    <Button htmlType="button" size="small" type="primary" icon={<Search size={14} />} onClick={() => setActivePricingSection('lookup')}>查询报价</Button>
                    {can('pricing:markup:import') ? <Button htmlType="button" size="small" icon={<FileInput size={14} />} onClick={() => onNotice('请使用规则模板上传入口导入')}>导入规则</Button> : null}
                    {can('pricing:markup:export') ? <Button htmlType="button" size="small" icon={<Download size={14} />} onClick={exportMarkupRules}>导出规则</Button> : null}
                    {can('pricing:markup:default-create') ? <Button htmlType="button" size="small" onClick={openCreateMarkupRule}>新增默认加价</Button> : null}
                    {can('pricing:markup:update') ? <Button htmlType="button" size="small" disabled={selectedVisibleMarkupRuleIds.length !== 1 || selectedMarkupRuleIsPriceBookGroup || markupBatchLoading} onClick={openEditMarkupRule}>修改</Button> : null}
                    {can('pricing:markup:line-detail-view') && canViewPriceBookRows ? <Button
                      htmlType="button"
                      size="small"
                      loading={Boolean(selectedMarkupRule && markupChannelLoadingRuleId === selectedMarkupRule.id)}
                      disabled={selectedVisibleMarkupRuleIds.length !== 1 || Boolean(selectedMarkupRule && markupChannelLoadingRuleId === selectedMarkupRule.id)}
                      title={selectedVisibleMarkupRuleIds.length !== 1 ? '请先选择一条代理加价规则' : '查看该代理当前有效价格表线路'}
                      onClick={() => openMarkupChannelDetail()}
                    >
                      查看线路
                    </Button> : null}
                    {can('pricing:markup:enable') ? <Popconfirm
                      title="确认停用该加价规则？"
                      description="停用后业务员报价不会再使用该规则，历史记录仍保留。"
                      okText="确认停用"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      disabled={selectedVisibleMarkupRuleIds.length !== 1 || selectedMarkupRuleIsPriceBookGroup}
                      onConfirm={disableSelectedMarkupRule}
                    >
                      <Button htmlType="button" size="small" icon={<Power size={14} />} loading={markupBatchLoading} disabled={selectedVisibleMarkupRuleIds.length !== 1 || selectedMarkupRuleIsPriceBookGroup || selectedMarkupRule?.enabled === false}>停用</Button>
                    </Popconfirm> : null}
                    {can('pricing:markup:delete') ? <Popconfirm
                      title={`确认删除 ${selectedVisibleMarkupRuleIds.length} 条加价规则？`}
                      description="删除后不可恢复；历史报价保留当时的金额快照。"
                      okText="确认删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      disabled={selectedVisibleMarkupRuleIds.length === 0 || selectedMarkupRules.some((rule) => rule.isPriceBookGroup)}
                      onConfirm={deleteSelectedMarkupRule}
                    >
                      <Button htmlType="button" size="small" danger icon={<Trash2 size={14} />} loading={markupBatchLoading} disabled={selectedVisibleMarkupRuleIds.length === 0 || selectedMarkupRules.some((rule) => rule.isPriceBookGroup)}>删除</Button>
                    </Popconfirm> : null}
                  </Space>
                }
              >
                <div className="pricing-module-tabs" role="tablist" aria-label="价格规则查价大类">
                  {legacyPricingModules.map((item) => (
                    <Button
                      key={item.key}
                      htmlType="button"
                      type={markupModule === item.key ? 'primary' : 'default'}
                      onClick={() => {
                        setMarkupModule(item.key);
                        setMarkupFilters({ status: 'ALL', page: 1, pageSize: 20, legacyModule: item.key });
                        setSelectedMarkupRuleIds([]);
                        setMarkupDetailRules([]);
                        setMarkupChannelRule(null);
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                <div className="pricing-markup-filters">
                  <Select allowClear placeholder="全部代理简称" value={markupFilters.agentName} onChange={(value) => setMarkupFilters((current) => ({ ...current, agentName: value }))} options={markupAgentOptions} />
                  <Select allowClear placeholder="全部渠道" value={markupFilters.channelName} onChange={(value) => setMarkupFilters((current) => ({ ...current, channelName: value }))} options={Array.from(new Set(markupModulePriceRows.map((row) => row.channelName))).map((value) => ({ value, label: value }))} />
                  <Select allowClear placeholder="全部线路" value={markupFilters.realChannelName} onChange={(value) => setMarkupFilters((current) => ({ ...current, realChannelName: value }))} options={Array.from(new Set(markupModulePriceRows.map((row) => row.realChannelName ?? row.channelName))).map((value) => ({ value, label: value }))} />
                  <Select allowClear placeholder="全部国家" value={markupFilters.destinationCountry} onChange={(value) => setMarkupFilters((current) => ({ ...current, destinationCountry: value }))} options={Array.from(new Set(markupModulePriceRows.map((row) => row.destinationCountry))).map((value) => ({ value, label: value }))} />
                  <Select value={markupFilters.status ?? 'ALL'} onChange={(value) => setMarkupFilters((current) => ({ ...current, status: value }))} options={[{ value: 'ALL', label: '全部' }, { value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} />
                  <Button htmlType="button" type="primary" onClick={applyMarkupFilters}>查询</Button>
                  <Button htmlType="button" onClick={resetMarkupFilters}>重置</Button>
                </div>
              <ManagedTable
                rowKey="id"
                size="small"
                pagination={{ ...tenRowTablePagination, current: markupPage, onChange: (page) => setMarkupPage(page) }}
                dataSource={markupDisplayRows}
                scroll={{ x: 1280 }}
                rowSelection={{
                  selectedRowKeys: selectedVisibleMarkupRuleIds,
                  onChange: (keys) => setSelectedMarkupRuleIds(keys.map(String))
                }}
                onRow={(record) => ({ onClick: () => setSelectedMarkupRuleIds([record.id]) })}
                columns={[
                  { title: '代理简称', dataIndex: 'agentName', width: 180, fixed: 'left' },
                  { title: '来源价格表', width: 260, render: (_, rule) => renderMarkupSource(rule) },
                  { title: '有效线路', width: 100, render: (_, rule) => rule.activeLineCount ? `${rule.activeLineCount} 条` : <Text type="secondary">0 条</Text> },
                  { title: '规则数量', dataIndex: 'ruleCount', width: 110, render: (value?: number) => `${value ?? 1} 条` },
                  { title: '加价状态', width: 160, render: (_, rule) => renderMarkupDisplay(rule) },
                  { title: '最高优先级', dataIndex: 'priority', width: 110 },
                  { title: '最近修改', dataIndex: 'updatedAt', width: 160, render: (value?: string) => value ? new Date(value).toLocaleString('zh-CN') : '-' },
                  { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
                  {
                    title: '操作',
                    width: 216,
                    fixed: 'right',
                    render: (_, rule) => (
                      <Space size={6} className="pricing-markup-row-actions">
                        <Button
                          htmlType="button"
                          size="small"
                          icon={<Eye size={13} />}
                          loading={markupChannelLoadingRuleId === rule.id}
                          disabled={markupChannelLoadingRuleId === rule.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            openMarkupChannelDetail(rule);
                          }}
                        >
                          查看线路
                        </Button>
                        <Dropdown
                          trigger={['click']}
                          menu={{
                            items: [
                              { key: 'edit', label: '编辑', disabled: rule.isPriceBookGroup || markupBatchLoading },
                              { key: 'toggle', label: rule.enabled ? '停用' : '启用', disabled: rule.isPriceBookGroup || markupBatchLoading },
                              { type: 'divider' },
                              { key: 'delete', label: '删除', danger: true, disabled: rule.isPriceBookGroup || markupBatchLoading }
                            ],
                            onClick: ({ key, domEvent }) => {
                              domEvent.stopPropagation();
                              openMarkupRowAction(key as 'edit' | 'toggle' | 'delete', rule);
                            }
                          }}
                        >
                          <Button
                            htmlType="button"
                            size="small"
                            aria-label={`${rule.agentName} 更多操作`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            更多 <MoreHorizontal size={14} aria-hidden />
                          </Button>
                        </Dropdown>
                      </Space>
                    )
                  }
                ]}
              />
              </Card> : null}
            </div>
          </Col>
        ) : null}
          </Row>
        ) : null}

      {activePricingSection === 'priceBooks' && canViewPriceBooks ? (
          <Card
            className="module-grid"
            title="价格表管理"
            extra={
              <Space>
                {can('pricing:price-books:upload') ? <Select
                  aria-label="选择代理简称"
                  showSearch
                  placeholder="选择代理简称"
                  value={priceBookImportAgentId}
                  style={{ width: 180 }}
                  disabled={priceBookImporting}
                  optionFilterProp="searchText"
                  filterOption={(input, option) => filterPriceBookImportAgentOption(input, option as { searchText?: string; label?: unknown })}
                  options={enabledAgentOptions}
                  onChange={(value) => setPriceBookImportAgentId(value)}
                /> : null}
                <Tag color="blue">{priceBookImportModules.find((item) => item.key === priceBookManagementModule)?.label}</Tag>
                {can('pricing:price-books:sync-health-view') ? <Button
                  htmlType="button"
                  size="small"
                  icon={<Settings size={14} />}
                  loading={pricingSyncHealthLoading}
                  onClick={() => void openPricingSyncHealth()}
                >
                  同步体检
                </Button> : null}
                {can('pricing:price-books:upload') ? <Button
                  htmlType="button"
                  size="small"
                  icon={<FileInput size={14} />}
                  loading={priceBookImporting}
                  disabled={priceBookImporting || (priceBookManagementModule !== 'dubaiAirSea' && !priceBookImportAgentId)}
                  title={priceBookManagementModule !== 'dubaiAirSea' && !priceBookImportAgentId ? '请先选择代理简称' : '上传并导入当前查价模块价格表'}
                  onClick={() => priceBookFileInputRef.current?.click()}
                >
                  增加价格表
                </Button> : null}
                {can('pricing:price-books:upload') ? <input
                  ref={priceBookFileInputRef}
                  className="visually-hidden-file-input"
                  aria-label="增加价格表"
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={(event) => void handlePriceFileChange(event)}
                /> : null}
                {canViewPriceBookRows ? <Button
                  htmlType="button"
                  size="small"
                  icon={<Download size={14} />}
                  disabled={selectedPriceBookIds.length !== 1}
                  title="下载导入时保留的原始 xls/xlsx 价格表"
                  onClick={() => void downloadSelectedPriceBook()}
                >
                  下载价格表
                </Button> : null}
                {can('pricing:price-books:remark-update') ? <Button htmlType="button" size="small" disabled={selectedPriceBookIds.length !== 1} onClick={openEditPriceBookRemark}>
                  编辑自定义备注
                </Button> : null}
                {can('pricing:price-books:delete') ? <Popconfirm
                  title={selectedPriceBookIds.length > 1 ? `确认删除 ${selectedPriceBookIds.length} 张价格表？` : '确认删除该价格表？'}
                  description="删除后该价格表导入的报价行会从当前报价库移除。"
                  okText="删除价格表"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={selectedPriceBookIds.length === 0}
                  onConfirm={deleteSelectedPriceBooks}
                >
                  <Button htmlType="button" size="small" disabled={selectedPriceBookIds.length === 0}>
                    删除价格表
                  </Button>
                </Popconfirm> : null}
              </Space>
            }
          >
            <div className="pricing-module-section-tabs" role="tablist" aria-label="价格表查价模块分区">
              {priceBookImportModules.map((item) => (
                <Button
                  key={item.key}
                  htmlType="button"
                  type={priceBookManagementModule === item.key ? 'primary' : 'default'}
                  onClick={() => {
                    setPriceBookManagementModule(item.key);
                    setPriceBookManagementFilters({ agentName: 'ALL', keyword: '' });
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="pricing-price-book-filter-bar">
              <Select
                aria-label="当前模块代理简称筛选"
                value={priceBookManagementFilters.agentName}
                style={{ width: 180 }}
                options={[{ value: 'ALL', label: '全部代理' }, ...managedPriceBookAgentOptions.map((value) => ({ value, label: value }))]}
                onChange={(value) => setPriceBookManagementFilters((current) => ({ ...current, agentName: value }))}
              />
              <Input
                aria-label="当前模块价格表关键词筛选"
                value={priceBookManagementFilters.keyword}
                placeholder="价格表名称或自定义备注"
                onChange={(event) => setPriceBookManagementFilters((current) => ({ ...current, keyword: event.target.value }))}
              />
              <Text type="secondary">当前模块已选 {selectedPriceBookIds.length} 张</Text>
            </div>
            {activePriceBookRuleRefresh ? (
              <div className="pricing-rule-refresh-progress" role="status" aria-label="当前模块规则同步进度">
                <div className="pricing-rule-refresh-progress__summary">
                  <Space size={8} wrap>
                    <Text strong>规则同步</Text>
                    <Tag color={activePriceBookRuleRefresh.latestRuleApplied ? 'green' : activePriceBookRuleRefresh.failedBooks || activePriceBookRuleRefresh.unavailableBooks ? 'red' : 'blue'}>
                      {activePriceBookRuleRefresh.latestRuleApplied ? '已是最新规则' : activePriceBookRuleRefresh.runningBooks ? '正在同步' : activePriceBookRuleRefresh.pendingBooks ? '等待同步' : '需处理'}
                    </Tag>
                    <Text type="secondary">规则 v{activePriceBookRuleRefresh.ruleVersion} · 已同步 {activePriceBookRuleRefresh.currentBooks}/{activePriceBookRuleRefresh.totalBooks} 张</Text>
                    {activePriceBookRuleRefresh.failedBooks ? <Text type="danger">失败 {activePriceBookRuleRefresh.failedBooks} 张</Text> : null}
                    {activePriceBookRuleRefresh.unavailableBooks ? <Text type="danger">原文件不可用 {activePriceBookRuleRefresh.unavailableBooks} 张</Text> : null}
                  </Space>
                  {activePriceBookRuleRefresh.updatedAt ? <Text type="secondary">最近完成：{new Date(activePriceBookRuleRefresh.updatedAt).toLocaleString('zh-CN')}</Text> : null}
                </div>
                <Progress
                  percent={activePriceBookRuleRefresh.progressPercent}
                  status={activePriceBookRuleRefresh.failedBooks || activePriceBookRuleRefresh.unavailableBooks ? 'exception' : activePriceBookRuleRefresh.latestRuleApplied ? 'success' : 'active'}
                  format={(percent) => `${percent ?? 0}%`}
                />
              </div>
            ) : null}
            {priceBookImportJob ? (
              <Alert
                className="notice-bar"
                type={priceBookImportJob.status === 'FAILED' ? 'error' : priceBookImportJob.status === 'SUCCESS' ? 'success' : 'info'}
                showIcon
                message={`导入任务：${priceBookImportJob.status}`}
                description={`${priceBookImportJob.message ?? '处理中'}；进度 ${priceBookImportJob.processedRows}/${priceBookImportJob.totalRows || '?'} 行${priceBookImportJob.errorSummary?.length ? `；导入提示：${priceBookImportJob.errorSummary.map((item) => item.reason).join('；')}` : ''}`}
              />
            ) : null}
            <ManagedTable
              rowKey="id"
              size="small"
              pagination={tenRowTablePagination}
              loading={priceBookManagementLoading}
              dataSource={filteredManagedPriceBooks}
              rowSelection={priceBookManagementRowSelection}
              columns={priceBookManagementColumns}
            />
            {priceBookManagementModule === 'dubaiAirSea' && can('pricing:dubai-display:versions-view') ? (
              <div className="pricing-dubai-display-admin">
                <div className="pricing-section-title-row">
                  <div>
                    <Text strong>迪拜原表图片展示版本</Text>
                    <div><Text type="secondary">导入后自动按空运、海运工作表转图；对应图片全部成功后自动替换当前展示，失败时保留上一有效版本。</Text></div>
                  </div>
                </div>
                <ManagedTable<DubaiPriceDisplayVersionSummary>
                  rowKey="id"
                  size="small"
                  pagination={tenRowTablePagination}
                  dataSource={dubaiDisplayVersions}
                  columns={[
                    { title: '原文件', dataIndex: 'originalName', width: 260 },
                    { title: '转换状态', dataIndex: 'status', width: 120, render: (value: string) => <Tag color={value === 'READY' ? 'green' : value === 'FAILED' ? 'red' : 'blue'}>{value === 'READY' ? '已完成' : value === 'FAILED' ? '失败' : '转换中'}</Tag> },
                    { title: '页面', width: 160, render: (_value, record) => `空运 ${record.pages.filter((page) => page.mode === 'AIR').length} 页 / 海运 ${record.pages.filter((page) => page.mode === 'SEA').length} 页` },
                    { title: '提示', dataIndex: 'message', render: (value?: string) => value || '-' },
                    {
                      title: '当前展示',
                      width: 170,
                      render: (_value, record) => (
                        <Space size={4} wrap>
                          {record.isActiveAir ? <Tag color="green">空运当前</Tag> : null}
                          {record.isActiveSea ? <Tag color="green">海运当前</Tag> : null}
                          {!record.isActiveAir && !record.isActiveSea ? <Text type="secondary">历史版本</Text> : null}
                        </Space>
                      )
                    },
                    {
                      title: '操作', width: 140, fixed: 'right',
                      render: (_value, record) => record.status === 'FAILED' && can('pricing:dubai-display:retry') ? (
                        <Button htmlType="button" size="small" onClick={() => {
                          void apiClient.retryDubaiPriceDisplayVersion(record.id)
                            .then((response) => { setDubaiDisplayVersions(response.versions); onNotice('迪拜价格表图片已重新生成'); })
                            .catch((error) => onNotice(error instanceof Error ? error.message : '重新生成图片失败'));
                        }}>重新生成图片</Button>
                      ) : record.status === 'READY' && !record.isActiveAir && !record.isActiveSea && can('pricing:dubai-display:activate') ? (
                        <Popconfirm
                          title="设为当前展示版本"
                          description="将用此版本替换它包含的空运或海运图片展示。"
                          okText="确认切换"
                          cancelText="取消"
                          onConfirm={() => apiClient.activateDubaiPriceDisplayVersion(record.id, { salesSafe: true })
                            .then((response) => { setDubaiDisplayVersions(response.versions); onNotice('已切换为当前展示版本'); })
                            .catch((error) => { onNotice(error instanceof Error ? error.message : '切换当前展示版本失败'); })}
                        >
                          <Button htmlType="button" size="small">设为当前展示</Button>
                        </Popconfirm>
                      ) : <Text type="secondary">自动切换</Text>
                    }
                  ]}
                />
              </div>
            ) : null}
          </Card>
      ) : null}
      </ModuleSubWorkspace>

      <Modal
        title="编辑自定义备注"
        open={priceBookRemarkModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitPriceBookRemark()}
        onCancel={() => setPriceBookRemarkModalOpen(false)}
      >
        <Form form={priceBookRemarkForm} name="priceBookRemarkForm" layout="vertical">
          <Form.Item name="customRemark" label="自定义备注">
            <Input.TextArea rows={5} placeholder="填写业务查价时需单独展示的内部自定义备注，不会并入渠道要求" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${editingSouthAfricaRule ? '修改' : '新增'}南非物料规则`}
        open={southAfricaRuleModalOpen}
        destroyOnHidden
        okText="保存规则"
        cancelText="取消"
        confirmLoading={southAfricaRuleSaving}
        onOk={() => void saveSouthAfricaRateRule()}
        onCancel={() => {
          if (!southAfricaRuleSaving) setSouthAfricaRuleModalOpen(false);
        }}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message="品名匹配依赖关键词"
          description="填写客户实际会输入的品名，如“衣服、T恤、外套”；分类和物料类别也会自动参与匹配。"
        />
        <Form form={southAfricaRateRuleForm} name="southAfricaRateRuleForm" layout="vertical" className="spacing-top">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="category" label="一级分类" rules={[{ required: true, whitespace: true, message: '请输入一级分类' }, { max: 60, message: '一级分类不能超过 60 个字符' }]}>
                <Input maxLength={60} placeholder="例如普货类、内电类、化妆品类" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="物料类别" rules={[{ required: true, whitespace: true, message: '请输入物料类别' }, { max: 100, message: '物料类别不能超过 100 个字符' }]}>
                <Input maxLength={100} placeholder="例如服装、带内置电池产品" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="keywords" label="匹配关键词" rules={[{ required: true, whitespace: true, message: '至少填写一个可匹配品名' }, { max: 500, message: '匹配关键词不能超过 500 个字符' }]}>
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="多个关键词用逗号、顿号、空格或换行分隔，例如：衣服、T恤、外套" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="pricingMode" label="报价方式" rules={[{ required: true, message: '请选择报价方式' }]}>
                <Select options={[{ value: 'fixed', label: '固定运费/CBM' }, { value: 'consult', label: '需单独咨询' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="ratePerCbm"
                label="运费/CBM"
                rules={[{
                  validator: async (_rule, value) => {
                    if (southAfricaPricingMode === 'consult') return;
                    if (Number(value) > 0) return;
                    throw new Error('固定报价必须填写大于 0 的运费/CBM');
                  }
                }]}
              >
                <InputNumber min={0} precision={2} disabled={southAfricaPricingMode === 'consult'} className="full-width" placeholder={southAfricaPricingMode === 'consult' ? '单询规则无需填写' : '例如 2600'} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注" rules={[{ max: 500, message: '备注不能超过 500 个字符' }]}>
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="例如低消、禁运、提货或报关说明" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="价格表-加价规则同步体检"
        open={pricingSyncHealthOpen}
        destroyOnHidden
        width={1120}
        footer={<Button htmlType="button" type="primary" onClick={() => setPricingSyncHealthOpen(false)}>关闭</Button>}
        onCancel={() => setPricingSyncHealthOpen(false)}
      >
        <Space direction="vertical" size={14} className="full-width pricing-sync-health-modal">
          <Alert
            className="notice-bar"
            type="info"
            showIcon
            message="报价和加价以价格表管理里的有效 xls 为准；删除价格表后，对应报价行退出报价，加价规则会保留为历史配置但不参与报价。"
          />
          <div className="pricing-sync-health-summary">
            <div>
              <Text type="secondary">有效 xls</Text>
              <strong>{pricingSyncHealthStats.sources}</strong>
            </div>
            <div>
              <Text type="secondary">覆盖代理</Text>
              <strong>{pricingSyncHealthStats.agents}</strong>
            </div>
            <div>
              <Text type="secondary">报价行</Text>
              <strong>{pricingSyncHealthStats.lines}</strong>
            </div>
            <div>
              <Text type="secondary">参与加价代理</Text>
              <strong>{pricingSyncHealthStats.activeAgents}</strong>
            </div>
            <div>
              <Text type="secondary">模块异常</Text>
              <strong>{pricingSyncHealthStats.issueCount ?? 0}</strong>
            </div>
          </div>
          <ManagedTable
            rowKey="id"
            size="small"
            loading={pricingSyncHealthLoading}
            pagination={{
              current: pricingSyncHealthPagination.page,
              pageSize: pricingSyncHealthPagination.pageSize,
              total: pricingSyncHealthPagination.totalItems,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              onChange: (page, pageSize) => {
                void loadPricingSyncHealth(page, pageSize);
              }
            }}
            dataSource={pricingSyncHealthRows}
            scroll={{ x: 1160 }}
            columns={[
              { title: '价格表 xls', dataIndex: 'fileName', width: 240, fixed: 'left' },
              { title: '代理简称', dataIndex: 'agentName', width: 170 },
              {
                title: '覆盖范围',
                width: 190,
                render: (_, row) => `${row.lineCount} 条 / ${row.countryCount} 国 / ${row.sheetCount} 个工作表`
              },
              {
                title: '加价规则',
                width: 150,
                render: (_, row) => row.markupRule ? <Text strong>{formatMarkupValue(row.markupRule)}</Text> : <Text type="secondary">待同步</Text>
              },
              {
                title: '同步状态',
                width: 120,
                render: (_, row) => {
                  const meta = getPricingSyncStatusMeta(row.status);
                  return <Tag color={meta.color}>{meta.label}</Tag>;
                }
              },
              {
                title: '报价参与',
                width: 130,
                render: (_, row) => row.markupRule?.enabled
                  ? <Tag color="green">参与报价/加价</Tag>
                  : <Tag color="default">不参与加价</Tag>
              },
              {
                title: '模块体检',
                width: 220,
                render: (_, row) => row.issues?.length
                  ? <Space size={[4, 4]} wrap>{row.issues.map((issue) => <Tag key={issue} color="red">{issue}</Tag>)}</Space>
                  : <Tag color="green">模块隔离正常</Tag>
              }
            ]}
          />
          <div className="pricing-sync-health-section-title">
            <Text strong>有加价规则但无有效价格表</Text>
            <Text type="secondary">这些规则保留在加价规则里，但当前没有有效 xls 报价行，不参与报价和加价。</Text>
          </div>
          <ManagedTable
            rowKey="id"
            size="small"
            pagination={tenRowTablePagination}
            dataSource={pricingSyncOrphanRules}
            scroll={{ x: 780 }}
            columns={[
              { title: '代理简称', dataIndex: 'agentName', width: 180, fixed: 'left' },
              { title: '加价规则', width: 140, render: (_, rule) => <Text strong>{formatMarkupValue(rule)}</Text> },
              { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
              { title: '说明', render: () => <Text type="secondary">价格表已删除，或当前有效 xls 中没有该代理报价行</Text> }
            ]}
          />
        </Space>
      </Modal>

      <Modal
        title={activeMarkupChannelRule ? `${activeMarkupChannelRule.agentName} 渠道线路详情` : '渠道线路详情'}
        open={markupChannelDetailOpen}
        destroyOnHidden
        width={920}
        footer={<Button htmlType="button" type="primary" onClick={closeMarkupChannelDetail}>关闭</Button>}
        onCancel={closeMarkupChannelDetail}
      >
        <Space direction="vertical" size={12} className="full-width">
          <Alert
            className="notice-bar"
            type="info"
            showIcon
            message="代理统一加价作为默认规则；请在每条真实渠道上维护 KG 或 CBM 阶梯加价，查价会按实际计费量命中对应阶梯。"
          />
          {markupChannelRowsError ? (
            <Alert
              type="error"
              showIcon
              message="线路明细加载失败"
              description={markupChannelRowsError}
              action={<Button htmlType="button" size="small" danger onClick={retryMarkupChannelRows}>重试</Button>}
            />
          ) : null}
          <div className="pricing-line-toolbar">
            <Space wrap size={12}>
              <label className="compact-field">
                <span>工作表（Sheet）</span>
                <select
                  aria-label="按工作表筛选线路"
                  className="native-select"
                  value={markupSheetFilter}
                onChange={(event) => {
                  const nextSheet = event.target.value;
                  setMarkupSheetFilter(nextSheet);
                  if (activeMarkupChannelRule) {
                      void loadMarkupChannelRows(activeMarkupChannelRule, 1, markupChannelRowsPagination.pageSize, nextSheet, markupAmountFilter, markupSourceFilter, markupSort)
                        .catch((error) => onNotice(error instanceof Error ? error.message : '线路明细加载失败'));
                  }
                }}
                >
                  <option value="ALL">全部工作表</option>
                  {selectedMarkupSheetOptions.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>{sheetName}</option>
                  ))}
                </select>
              </label>
              <Text type="secondary">从下方每条真实渠道进入阶梯加价维护；同一渠道的多个重量段统一在一个规则中保存。</Text>
            </Space>
          </div>
          <ManagedTable
            rowKey="id"
            size="small"
            loading={markupChannelRowsLoading}
            pagination={{
              current: markupChannelRowsPagination.page,
              pageSize: markupChannelRowsPagination.pageSize,
              total: markupChannelRowsPagination.totalItems,
              showSizeChanger: true,
              pageSizeOptions: ['50', '100', '200'],
              onChange: (page, pageSize) => {
                if (activeMarkupChannelRule) {
                  void loadMarkupChannelRows(activeMarkupChannelRule, page, pageSize, markupSheetFilter, markupAmountFilter, markupSourceFilter, markupSort)
                    .catch((error) => onNotice(error instanceof Error ? error.message : '线路明细加载失败'));
                }
              }
            }}
            dataSource={filteredMarkupChannelRows}
            scroll={{ x: 1000 }}
            columns={[
              { title: '原始代理/承运商', dataIndex: 'agentName', width: 150 },
              { title: '工作表（Sheet）', width: 180, render: (_, row) => getMarkupRowSheetName(row) },
              { title: '查价渠道/线路', width: 220, render: (_, row) => getMarkupRowLookupChannel(row) },
              { title: '查价目的地', width: 110, render: (_, row) => getMarkupRowLookupDestination(row) },
              { title: '重量段', render: (_, row) => `${row.minWeightKg}-${row.maxWeightKg}kg`, width: 130 },
              { title: '时效', dataIndex: 'transitLabel', width: 100, render: (value?: string) => value || '待确认' },
              { title: '渠道要求', width: 120, render: (_, row) => renderRequirementCell(row, () => setSelectedLineRequirement(row)) },
              {
                title: '操作',
                width: 130,
                fixed: 'right',
                render: (_, row) => {
                  const tierRule = findChannelTierMarkupRule(row);
                  return (
                    canViewTierMarkup ? <Button
                      htmlType="button"
                      size="small"
                      onClick={() => (tierRule ? openEditChannelTierMarkup(tierRule) : openCreateChannelTierMarkupForLine(row))}
                    >
                      {tierRule ? '修改阶梯加价' : '设置阶梯加价'}
                    </Button> : '-'
                  );
                }
              }
            ]}
          />
        </Space>
      </Modal>

      <Modal
        title={`${editingChannelTierRule ? '修改' : '新增'}渠道阶梯加价 · ${getLegacyModuleLabel(markupModule)}`}
        open={channelTierModalOpen}
        destroyOnHidden
        width={760}
        okText="保存阶梯"
        cancelText="取消"
        confirmLoading={channelTierSaving}
        onOk={() => void saveChannelTierMarkup()}
        onCancel={() => {
          if (!channelTierSaving) setChannelTierModalOpen(false);
        }}
      >
        <Form form={channelTierMarkupForm} name="channelTierMarkupRuleForm" layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="代理简称" name="agentName" rules={[{ required: true, whitespace: true, message: '请选择代理简称' }]}>
                <Select
                  showSearch
                  placeholder="选择代理简称"
                  optionFilterProp="label"
                  options={markupAgentOptions}
                  onChange={(value) => {
                    channelTierMarkupForm.setFieldValue('channelKey', undefined);
                    void loadChannelTierOptions(value);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="真实渠道 / 计费单位" name="channelKey" rules={[{ required: true, message: '请选择当前模块已导入的真实渠道' }]}>
                <Select
                  showSearch
                  loading={channelTierLoading}
                  placeholder="先选择代理简称"
                  optionFilterProp="label"
                  options={channelTierOptions.map((item) => ({ value: item.key, label: `${item.realChannelName || item.channelName} · 按${item.markupUnit}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.List name="tiers">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={8} className="full-width">
                <Text strong>重量段 / 方数段</Text>
                {fields.map((field, index) => (
                  <Row gutter={8} key={field.key} align="middle">
                    <Col xs={24} md={7}>
                      <Form.Item label={index === 0 ? '下限（含）' : undefined} name={[field.name, 'minChargeableValue']} rules={[{ required: true, message: '请输入下限' }]}>
                        <InputNumber min={0} precision={3} style={{ width: '100%' }} placeholder="例如 12" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={7}>
                      <Form.Item label={index === 0 ? '上限（不含，留空为以上）' : undefined} name={[field.name, 'maxChargeableValue']}>
                        <InputNumber min={0} precision={3} style={{ width: '100%' }} placeholder="例如 51" />
                      </Form.Item>
                    </Col>
                    <Col xs={20} md={7}>
                      <Form.Item label={index === 0 ? '单位加价' : undefined} name={[field.name, 'markupValue']} rules={[{ required: true, message: '请输入加价金额' }]}>
                        <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="例如 0.80" />
                      </Form.Item>
                    </Col>
                    <Col xs={4} md={3} className="form-list-action-cell">
                      {fields.length > 1 ? <Button htmlType="button" danger size="small" onClick={() => remove(field.name)}>删除</Button> : null}
                    </Col>
                  </Row>
                ))}
                <Button htmlType="button" onClick={() => add({ minChargeableValue: 0, maxChargeableValue: undefined, markupValue: 0 })}>新增重量段</Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title={`${editingMarkupRule ? '修改代理加价' : '新增代理加价'} · ${getLegacyModuleLabel(markupModule)}`}
        open={markupModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        confirmLoading={markupSaving}
        onOk={() => void handleSubmitMarkupRule()}
        onCancel={() => {
          if (!markupSaving) {
            setRestoreMarkupChannelAfterSave(false);
            setMarkupModalOpen(false);
          }
        }}
      >
        <Form form={markupForm} name="markupRuleForm" layout="vertical">
          <Form.Item label="查价大类">
            <Input value={getLegacyModuleLabel(markupModule)} readOnly />
          </Form.Item>
          <Form.Item name="priceBookId" label="来源价格表（可选）">
            <Select
              allowClear
              showSearch
              placeholder="当前大类全部价格表"
              optionFilterProp="label"
              options={markupModulePriceBooks.map((book) => ({ value: book.id, label: book.fileName }))}
            />
          </Form.Item>
          <Form.Item name="agentName" label="代理简称" rules={[{ required: true, whitespace: true, message: '请选择代理简称' }]}>
            <Select
              showSearch
              placeholder="选择基础资料代理简称"
              optionFilterProp="label"
              options={markupAgentOptions}
            />
          </Form.Item>
          <Form.Item name="channelName" label="渠道（可选）">
            <Input placeholder="例如 海运洛杉矶专线；为空表示该代理全部渠道" />
          </Form.Item>
          <Form.Item name="realChannelName" label="线路自定义（可选）">
            <Input placeholder="例如 DHK03；填写后优先于渠道统一加价" />
          </Form.Item>
          <Form.Item name="destinationCountry" label="国家（可选）">
            <Input placeholder="例如 美国；为空表示全部国家" />
          </Form.Item>
          <Form.Item name="markupType" label="加价方式" rules={[{ required: true, message: '请选择加价方式' }]}>
            <Select
              options={[
                { value: 'WEIGHT', label: '按重量' },
                { value: 'PER_SHIPMENT', label: '按票' },
                { value: 'FIXED', label: '固定金额' },
                { value: 'PERCENT', label: '按比例' }
              ]}
            />
          </Form.Item>
          <Form.Item name="markupValue" label="业务员加价 / kg" rules={[{ required: true, message: '请输入加价值' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="markupPerKg" hidden>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请输入优先级' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="enabled" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <select className="native-select" aria-label="加价规则状态">
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
    </AppPage>
  );
}
