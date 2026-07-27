import type {
  AgentMarkupListResponse,
  AgentMarkupMetrics,
  AgentMarkupSummary,
  AgentSummary,
  LegacyPricingModule,
  LegacyPricingQuoteRequest,
  PriceBookImportJobSummary,
  PriceBookImportTargetModule,
  PriceBookSummary,
  PricingSyncHealthRow,
  SouthAfricaRateRuleSummary
} from '@siyuan/shared';
import type { PermissionKey } from '../../apiClient';
import type { ImportedPriceRow, PriceLookupFormValues } from './excel';

export type LegacyLookupFormValues = PriceLookupFormValues
  & Partial<Omit<LegacyPricingQuoteRequest, 'module' | 'cargoType'>>
  & { cargoType?: LegacyPricingQuoteRequest['cargoType'] | 'ALL' };

export const legacyPricingModules: Array<{ key: LegacyPricingModule; label: string }> = [
  { key: 'amazon', label: '亚马逊查询' },
  { key: 'inquiry', label: '欧洲超大件综合查询' },
  { key: 'europeExpress', label: '欧洲空海运铁路快递查询' },
  { key: 'southAfrica', label: '南非专线查询' },
  { key: 'usaAirSea', label: '美国空海运查询' },
  { key: 'canadaAirSea', label: '加拿大空海查询' },
  { key: 'dubaiAirSea', label: '迪拜空海运查询' }
];

export const lookupPermissionByModule: Record<LegacyPricingModule, PermissionKey> = {
  amazon: 'pricing:lookup:amazon',
  inquiry: 'pricing:lookup:europe-oversize',
  europeExpress: 'pricing:lookup:europe-express',
  southAfrica: 'pricing:lookup:south-africa',
  usaAirSea: 'pricing:lookup:usa-air-sea',
  canadaAirSea: 'pricing:lookup:canada-air-sea',
  dubaiAirSea: 'pricing:lookup:dubai-air-sea'
};

export const priceBookImportModules: Array<{ key: PriceBookImportTargetModule; label: string }> = legacyPricingModules;

export function isAirSeaPricingModule(module: LegacyPricingModule) {
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

export function parseSouthAfricaRuleKeywords(value?: string) {
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

export function describeLargeCargo(values: Partial<LegacyLookupFormValues>): string | undefined {
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
export const amazonOriginFallbackOptions = [
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

export const legacyModuleDefaults: Record<LegacyPricingModule, Partial<LegacyLookupFormValues>> = {
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

export function withPricingLookupTimeout<T>(promise: Promise<T>, timeoutMs = pricingLookupTimeoutMs): Promise<T> {
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

export function pricingLookupErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    if (/Failed to fetch/i.test(error.message)) {
      return '查价请求失败，请检查网络后重试';
    }
    return error.message;
  }
  return '查价失败，请稍后重试';
}

export function priceBookMatchesLegacyModule(book: PriceBookSummary, module: LegacyPricingModule) {
  return Number(book.legacyModuleCounts?.[module] ?? 0) > 0;
}

export function getLegacyModuleLabel(module: LegacyPricingModule) {
  return legacyPricingModules.find((item) => item.key === module)?.label ?? module;
}

export function isAmazonOriginOption(value: string) {
  const compact = value.replace(/[／｜|、，,；;]/g, '/').replace(/\s+/g, '');
  return Boolean(compact && !amazonRouteNamePattern.test(compact) && amazonOriginNamePattern.test(compact));
}

export function readAgentMarkupRows(response: AgentMarkupListResponse | AgentMarkupSummary[]): AgentMarkupSummary[] {
  return Array.isArray(response) ? response : response.rows;
}

export function readAgentMarkupMetrics(response: AgentMarkupListResponse | AgentMarkupSummary[]): AgentMarkupMetrics {
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

export function buildAmazonTierLabels() {
  return defaultAmazonTierLabels;
}

export function parseAmazonTierMinimum(value?: string | number | null): number | undefined {
  const text = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const weight = Number(match[1]);
  return Number.isFinite(weight) ? weight : undefined;
}

export function normalizeAmazonTier(value?: string | number | null): string {
  const weight = parseAmazonTierMinimum(value) ?? 12;
  if (weight >= 100) return '100KG+';
  if (weight >= 51) return '51KG+';
  return '12KG+';
}

export function inferAmazonTierFromChargeableWeight(value?: string | number | null): string | undefined {
  const weight = Number(value ?? 0);
  if (!Number.isFinite(weight) || weight <= 0) return undefined;
  const tier = buildAmazonTierLabels()
    .map((label) => ({ label, minimum: parseAmazonTierMinimum(label) ?? 0 }))
    .filter((item) => item.minimum <= weight)
    .sort((left, right) => right.minimum - left.minimum)[0];
  return tier?.label;
}

export function amazonTierWeight(value?: string | number | null) {
  return parseAmazonTierMinimum(normalizeAmazonTier(value)) ?? 12;
}

export function calculateDimensionVolumeCbm(values: Pick<Partial<PriceLookupFormValues>, 'lengthCm' | 'widthCm' | 'heightCm' | 'packageCount'>): number {
  const length = Number(values.lengthCm ?? 0);
  const width = Number(values.widthCm ?? 0);
  const height = Number(values.heightCm ?? 0);
  const count = Number(values.packageCount ?? 1) || 1;
  if (![length, width, height, count].every((item) => Number.isFinite(item) && item > 0)) {
    return 0;
  }
  return Math.round((length * width * height * count / 1000000) * 1000) / 1000;
}

export function isPostalCodeRequired(country?: string) {
  return /美国|加拿大|英国|德国|法国|US|USA|CA|UK|DE|FR/i.test(country?.trim() ?? '');
}

export function getAgentMarkupGroupId(rule: Pick<AgentMarkupSummary, 'agentName' | 'priceBookId'>) {
  return rule.priceBookId ? `agent:${rule.priceBookId}:${rule.agentName}` : `agent:${rule.agentName}`;
}

export function getPricingSyncStatusMeta(status: PricingSyncHealthRow['status']) {
  const labels: Record<PricingSyncHealthRow['status'], { color: string; label: string }> = {
    synced: { color: 'green', label: '已同步' },
    default: { color: 'blue', label: '默认同步' },
    disabled: { color: 'red', label: '规则停用' },
    missing: { color: 'orange', label: '缺少规则' }
  };
  return labels[status];
}

export function isTerminalImportJob(job: Pick<PriceBookImportJobSummary, 'status'>) {
  const status = String(job.status ?? '').toUpperCase();
  return status === 'SUCCESS' || status === 'FAILED' || status === 'PARTIAL_FAILED';
}
