import type { ChangeEvent, Key } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, Collapse, Dropdown, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { AlertTriangle, CheckCircle2, Copy, Download, Eye, FileInput, MoreHorizontal, PackageCheck, Power, RefreshCw, Search, Settings, SlidersHorizontal, Trash2 } from 'lucide-react';
import { hasEffectivePricingCapability, normalizeCanadaAmazonWarehouseCode, normalizeUsPostalCode, pricingMarkupCapability, type AgentMarkupListQuery, type AgentMarkupListResponse, type AgentMarkupMetrics, type AgentMarkupSummary, type AgentMarkupType, type AgentMarkupUnit, type AgentSummary, type DubaiPriceDisplayPageSummary, type DubaiPriceDisplayResponse, type DubaiPriceDisplayVersionSummary, type LegacyPricingMetaResponse, type LegacyPricingModule, type LegacyPricingQuoteResponse, type LegacyPricingRecommendation, type MasterDataSnapshot, type PriceBookImportJobSummary, type PriceBookImportTargetModule, type PriceBookSummary, type PriceLookupRecommendation, type PriceLookupResponse, type PricingRuleRefreshProgressResponse, type PricingSyncHealthResponse, type PricingSyncHealthRow, type SouthAfricaLookupResponse, type SouthAfricaRateRuleInput, type SouthAfricaRateRuleSummary, type StaffRoleKey } from '@siyuan/shared';
import { ApiClient, isAdministratorRole, type PermissionKey } from '../../apiClient';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { formatBeijingDate, formatBeijingDateTime, formatCurrency } from '../shared/format';
import { getGlobalFieldMaskVisibility } from '../shared/globalFieldMask';
import { countryOptions, filterLocationOption } from '../finance/entry/countryStateOptions';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, paginationWhenNeeded, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import { calculatePriceChargeableWeight, seedImportedPriceRows, type ImportedPriceRow } from './excel';
import { MarkupRouteEditor, type MarkupRouteEditorContext } from './MarkupRouteEditor';
import { PriceBookManagementStatus } from './PriceBookManagementStatus';
import { PriceBookManagementToolbar } from './PriceBookManagementToolbar';
import { getLegacyRecommendationScopeColumnTitle, getLegacyRecommendationScopeLabel } from './canadaPricingScope';
import { getMarkupRuleLabel } from './markupRuleLabel';
import {
  buildLegacyQuoteCopyText,
  buildQuoteCopyText,
  formatKgCurrencyRate,
  formatMarkupValue,
  getCustomRemarkText,
  renderCustomRemarkCell,
  renderMarkupDisplay,
  renderMarkupSource,
  renderRequirementCell,
  renderRequirementDetailNote,
  resolvePricingLookupResultFieldVisibility
} from './pricingPageDisplay';
import {
  amazonOriginFallbackOptions,
  amazonTierWeight,
  buildAmazonTierLabels,
  buildPriceBookImportAgentOptions,
  calculateDimensionVolumeCbm,
  describeLargeCargo,
  getAgentMarkupGroupId,
  getLegacyModuleLabel,
  getMarkupRowLookupChannel,
  getMarkupRowLookupDestination,
  getPricingSyncStatusMeta,
  inferAmazonTierFromChargeableWeight,
  inferSouthAfricaMaterialCategory,
  isAirSeaPricingModule,
  isAmazonOriginOption,
  isPostalCodeRequired,
  isTerminalImportJob,
  legacyModuleDefaults,
  legacyPricingModules,
  lookupPermissionByModule,
  normalizeAmazonTier,
  parseSouthAfricaRuleKeywords,
  priceBookImportModules,
  priceBookMatchesLegacyModule,
  pricingLookupErrorMessage,
  readAgentMarkupMetrics,
  readAgentMarkupRows,
  withPricingLookupTimeout,
  type LegacyLookupFormValues
} from './pricingPageModel';
import './pricingMarkupWorkbench.css';

export {
  buildPriceBookImportAgentOptions,
  filterPriceBookImportAgentOption,
  getMarkupRowLookupChannel,
  getMarkupRowLookupDestination,
  inferSouthAfricaMaterialCategory,
  priceBookImportModules
} from './pricingPageModel';

const { Title, Text } = Typography;

export function pricingMarkupPermissionCode(module: LegacyPricingModule, action: import('@siyuan/shared').PricingMarkupAction): PermissionKey {
  return pricingMarkupCapability(module, action) as PermissionKey;
}

export function isPricingPriceBookOperationBlocked(permissions: PermissionKey[], module: LegacyPricingModule, mode: 'create' | 'delete' | 'remark', role: StaffRoleKey): boolean {
  void permissions; void module; void mode; void role;
  return false;
}

export function isPricingMarkupModuleBlocked(permissions: PermissionKey[], module: LegacyPricingModule, action: import('@siyuan/shared').PricingMarkupAction, role: StaffRoleKey): boolean {
  if (isAdministratorRole(role)) return false;
  return !hasEffectivePricingCapability(permissions, pricingMarkupPermissionCode(module, action));
}

export function filterPricingModulesByPermissions(
  modules: Array<{ key: LegacyPricingModule; label: string }>,
  permissions: PermissionKey[],
  scope: 'lookup' | 'markup',
  role: StaffRoleKey
) {
  if (isAdministratorRole(role)) return modules;
  const granted = new Set(permissions);
  return modules.filter((module) => scope === 'markup'
    ? !isPricingMarkupModuleBlocked(permissions, module.key, 'view', role)
    : granted.has(lookupPermissionByModule[module.key]));
}

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

interface PriceBookRemarkFormValues {
  customRemark?: string;
}

interface SouthAfricaRateRuleFormValues {
  category: string;
  name: string;
  keywords: string;
  pricingMode: 'fixed' | 'consult';
  costPerCbm?: number;
  markupPerCbm?: number;
  remark?: string;
}

interface DubaiSeaMarkupFormValues {
  seaMarkupPerCbm: number;
}

type AgentMarkupRule = AgentMarkupSummary;
type MarkupDisplayRule = AgentMarkupRule & {
  priceBookId?: string;
  priceBookFileName?: string;
  isPriceBookGroup?: boolean;
};
type PriceBookRecord = PriceBookSummary;
type PriceBookManagementModule = PriceBookImportTargetModule | 'unclassified';
type PriceRecommendation = PriceLookupRecommendation;
type PriceLookupResult = PriceLookupResponse;
type DubaiLookupPageGroup = {
  key: string;
  label: string;
  pages: DubaiPriceDisplayPageSummary[];
};

type DubaiHighResolutionPreview = {
  title: string;
  pages: Array<{ id: string; pageNo: number; imageUrl: string }>;
};

const emptyMarkupFilterOptions: AgentMarkupListResponse['filterOptions'] = { agentNames: [], channelNames: [], realChannelNames: [], destinationCountries: [] };

export function buildDubaiLookupPageGroups(mode: 'AIR' | 'SEA', pages: DubaiPriceDisplayPageSummary[]) {
  const modePages = pages
    .filter((page) => page.mode === mode)
    .sort((left, right) => left.pageNo - right.pageNo);
  const groups: DubaiLookupPageGroup[] = modePages.map((page, index) => ({
    key: page.id,
    label: modePages.length === 1 ? '完整价格表' : `第 ${index + 1} 部分`,
    pages: [page]
  }));
  return { groups };
}

export function buildSouthAfricaQuoteTableRows(rules: SouthAfricaRateRuleSummary[]) {
  return rules
    .filter((rule) => rule.enabled)
    .map((rule) => ({
      id: rule.id,
      category: rule.category,
      name: rule.name,
      keywords: rule.keywords,
      consult: rule.consult,
      ratePerCbm: rule.ratePerCbm,
      remark: rule.remark
    }));
}

export function getSouthAfricaQuotePriceTone(rule: Pick<SouthAfricaRateRuleSummary, 'consult' | 'ratePerCbm'>) {
  if (rule.consult) return 'consult';
  return rule.ratePerCbm === undefined ? 'pending' : 'ready';
}

export type LegacyRecommendationSort = 'price' | 'transit';

function getLegacyTransitSortKey(transitLabel?: string) {
  const values = transitLabel?.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  return [values[0] ?? Number.POSITIVE_INFINITY, values[1] ?? values[0] ?? Number.POSITIVE_INFINITY] as const;
}

export function sortLegacyRecommendations(recommendations: LegacyPricingRecommendation[], mode: LegacyRecommendationSort) {
  return [...recommendations].sort((left, right) => {
    if (mode === 'transit') {
      const [leftMin, leftMax] = getLegacyTransitSortKey(left.transitLabel);
      const [rightMin, rightMax] = getLegacyTransitSortKey(right.transitLabel);
      const transitDifference = leftMin - rightMin || leftMax - rightMax;
      if (transitDifference) return transitDifference;
    }
    return left.salesTotal - right.salesTotal
      || left.salesUnitPrice - right.salesUnitPrice
      || (left.channelName ?? '').localeCompare(right.channelName ?? '', 'zh-CN');
  });
}

function isGeneratedDefaultMarkupRule(rule: AgentMarkupRule) {
  return rule.id.startsWith('price-agent:');
}

function isSystemDefaultMarkupRule(rule: AgentMarkupRule) {
  return isGeneratedDefaultMarkupRule(rule) && rule.defaultRuleSource !== 'AGENT_DEFAULT';
}

function getMarkupRuleLevel(rule: AgentMarkupRule) {
  if (rule.rulePurpose === 'DUBAI_SEA_IMAGE') return { key: 'imageMarkup', label: '图片加价', color: 'blue' as const };
  if (isGeneratedDefaultMarkupRule(rule)) return rule.defaultRuleSource === 'AGENT_DEFAULT'
    ? { key: 'default', label: '代理默认', color: 'default' as const }
    : { key: 'systemDefault', label: '系统默认', color: 'green' as const };
  const hasRoute = Boolean(rule.channelName || rule.realChannelName);
  const hasTier = Boolean(rule.markupUnit && rule.minChargeableValue !== undefined);
  if (hasRoute && hasTier) return { key: 'routeTier', label: '线路阶梯', color: 'blue' as const };
  if (hasRoute) return { key: 'route', label: '线路规则', color: 'purple' as const };
  if (rule.destinationCountry) return { key: 'country', label: '目的国规则', color: 'orange' as const };
  if (!hasTier) return { key: 'default', label: '代理默认', color: 'default' as const };
  return { key: 'other', label: '通用阶梯', color: 'cyan' as const };
}

function getMarkupRuleScopeDisplay(rule: AgentMarkupRule) {
  if (rule.rulePurpose === 'DUBAI_SEA_IMAGE') {
    return { primary: '海运主运费', details: '空运及海运附加费用保持不变' };
  }
  if (isSystemDefaultMarkupRule(rule)) {
    return { primary: '未命中更具体规则时兜底', details: '适用于全部国家、全部线路' };
  }
  if (isGeneratedDefaultMarkupRule(rule)) {
    return { primary: '继承代理统一默认', details: '适用于当前价格表的全部国家、全部线路' };
  }
  const primary = rule.realChannelName || rule.channelName || rule.destinationCountry || '全部国家 · 全部线路';
  const details = [
    rule.destinationCountry && primary !== rule.destinationCountry ? rule.destinationCountry : undefined,
    rule.channelName && primary !== rule.channelName ? rule.channelName : undefined
  ].filter(Boolean).join(' · ');
  return { primary, details };
}

function getMarkupRuleRangeDisplay(rule: AgentMarkupRule) {
  if (!rule.markupUnit || rule.minChargeableValue === undefined) return '全部计费量';
  return rule.maxChargeableValue === undefined
    ? `${rule.minChargeableValue}${rule.markupUnit}+`
    : `${rule.minChargeableValue}–${rule.maxChargeableValue}${rule.markupUnit}`;
}

export function getMarkupValueFieldMeta(type?: AgentMarkupType) {
  const metadata: Record<AgentMarkupType, { label: string; unit: string }> = {
    WEIGHT: { label: '业务员加价 / KG', unit: '元/KG' },
    PER_SHIPMENT: { label: '单票加价', unit: '元/票' },
    FIXED: { label: '固定加价', unit: '元' },
    PERCENT: { label: '加价比例', unit: '%' }
  };
  return metadata[type ?? 'WEIGHT'];
}

function getPriceBookImportJobStatus(job: Pick<PriceBookImportJobSummary, 'status'>) {
  const status = String(job.status ?? '').toUpperCase();
  if (status === 'SUCCESS') return { label: '成功', color: 'green' };
  if (status === 'FAILED') return { label: '失败', color: 'red' };
  if (status === 'PARTIAL_FAILED') return { label: '部分失败', color: 'orange' };
  if (status === 'PARSING') return { label: '解析中', color: 'blue' };
  if (status === 'IMPORTING') return { label: '导入中', color: 'blue' };
  return { label: '等待处理', color: 'default' };
}

export function PricingPage({
  apiClient,
  initialSection,
  role,
  roleLabel,
  permissions,
  notice,
  onNotice
}: {
  apiClient: ApiClient;
  initialSection?: string;
  role: StaffRoleKey;
  roleLabel?: string;
  permissions: PermissionKey[];
  notice: string | null;
  onNotice: (message: string | null) => void;
}) {
  const isMarkupRouteEditor = new URLSearchParams(window.location.search).get('view') === 'route-editor';
  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const [lookupForm] = Form.useForm<LegacyLookupFormValues>();
  const [markupForm] = Form.useForm<AgentMarkupFormValues>();
  const [priceBookRemarkForm] = Form.useForm<PriceBookRemarkFormValues>();
  const [southAfricaRateRuleForm] = Form.useForm<SouthAfricaRateRuleFormValues>();
  const [dubaiSeaMarkupForm] = Form.useForm<DubaiSeaMarkupFormValues>();
  const markupTypeValue = Form.useWatch('markupType', markupForm);
  const markupAgentNameValue = Form.useWatch('agentName', markupForm);
  const markupChannelNameValue = Form.useWatch('channelName', markupForm);
  const markupRealChannelNameValue = Form.useWatch('realChannelName', markupForm);
  const markupDestinationCountryValue = Form.useWatch('destinationCountry', markupForm);
  const southAfricaPricingMode = Form.useWatch('pricingMode', southAfricaRateRuleForm);
  const southAfricaCostPerCbm = Form.useWatch('costPerCbm', southAfricaRateRuleForm);
  const southAfricaMarkupPerCbm = Form.useWatch('markupPerCbm', southAfricaRateRuleForm);
  const [priceRows, setPriceRows] = useState<ImportedPriceRow[]>(() => [...seedImportedPriceRows]);
  const [priceBooks, setPriceBooks] = useState<PriceBookRecord[]>([]);
  const [markupRules, setMarkupRules] = useState<AgentMarkupRule[]>([]);
  const [markupDetailRules, setMarkupDetailRules] = useState<AgentMarkupRule[]>([]);
  const [expandedMarkupGroup, setExpandedMarkupGroup] = useState<MarkupDisplayRule | null>(null);
  const [expandedMarkupRules, setExpandedMarkupRules] = useState<AgentMarkupRule[]>([]);
  const [expandedMarkupRulesLoading, setExpandedMarkupRulesLoading] = useState(false);
  const [expandedMarkupRulesError, setExpandedMarkupRulesError] = useState('');
  const [expandedMarkupRulesPagination, setExpandedMarkupRulesPagination] = useState({ page: 1, pageSize: 10, totalItems: 0 });
  const [expandedMarkupRulesSort, setExpandedMarkupRulesSort] = useState<{ sortBy: AgentMarkupListQuery['sortBy']; sortOrder: NonNullable<AgentMarkupListQuery['sortOrder']> }>({ sortBy: undefined, sortOrder: 'asc' });
  const [markupMetrics, setMarkupMetrics] = useState<AgentMarkupMetrics>({ totalRules: 0, enabledRules: 0, disabledRules: 0, unmatchedQuotes: 0, systemDefaultScopes: 0 });
  const [markupFilterOptions, setMarkupFilterOptions] = useState<AgentMarkupListResponse['filterOptions']>(emptyMarkupFilterOptions);
  const [markupFilters, setMarkupFilters] = useState<AgentMarkupListQuery>({ status: 'ALL', page: 1, pageSize: 20 });
  const [markupModule, setMarkupModule] = useState<LegacyPricingModule>('amazon');
  const [selectedMarkupRuleIds, setSelectedMarkupRuleIds] = useState<string[]>([]);
  const [markupPage, setMarkupPage] = useState(1);
  const [selectedPriceBookIds, setSelectedPriceBookIds] = useState<string[]>([]);
  const [priceBookManagementModule, setPriceBookManagementModule] = useState<PriceBookManagementModule>('amazon');
  const [managedPriceBooks, setManagedPriceBooks] = useState<PriceBookRecord[]>([]);
  const [priceBookManagementLoading, setPriceBookManagementLoading] = useState(false);
  const [priceBookManagementSlowLoading, setPriceBookManagementSlowLoading] = useState(false);
  const [priceBookManagementLoadError, setPriceBookManagementLoadError] = useState<string | null>(null);
  const [priceBookManagementReloadVersion, setPriceBookManagementReloadVersion] = useState(0);
  const [priceBookManagementFilters, setPriceBookManagementFilters] = useState({ agentName: 'ALL', keyword: '' });
  const [editingMarkupRule, setEditingMarkupRule] = useState<AgentMarkupRule | null>(null);
  const [markupModalOpen, setMarkupModalOpen] = useState(false);
  const [markupSaving, setMarkupSaving] = useState(false);
  const [markupBatchLoading, setMarkupBatchLoading] = useState(false);
  const [markupRouteEditorOpen, setMarkupRouteEditorOpen] = useState(false);
  const [markupRouteEditorContext, setMarkupRouteEditorContext] = useState<MarkupRouteEditorContext | null>(null);
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
  const [priceBookImportHistoryOpen, setPriceBookImportHistoryOpen] = useState(false);
  const [priceBookImportHistoryLoading, setPriceBookImportHistoryLoading] = useState(false);
  const [priceBookImportHistory, setPriceBookImportHistory] = useState<PriceBookImportJobSummary[]>([]);
  const [priceBookImportHistoryPagination, setPriceBookImportHistoryPagination] = useState({ page: 1, pageSize: 10, totalItems: 0 });
  const [priceBookImportAgentId, setPriceBookImportAgentId] = useState<string | undefined>();
  const [masterDataAgents, setMasterDataAgents] = useState<AgentSummary[]>([]);
  const priceBookFileInputRef = useRef<HTMLInputElement | null>(null);
  const onNoticeRef = useRef(onNotice);
  const lookupRequestSeqRef = useRef(0);
  const [lookupResult, setLookupResult] = useState<PriceLookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [legacyModule, setLegacyModule] = useState<LegacyPricingModule>('amazon');
  const [legacyMeta, setLegacyMeta] = useState<LegacyPricingMetaResponse | null>(null);
  const [legacyResult, setLegacyResult] = useState<LegacyPricingQuoteResponse | null>(null);
  const [legacyRecommendationSort, setLegacyRecommendationSort] = useState<LegacyRecommendationSort>('price');
  const [dubaiPriceDisplay, setDubaiPriceDisplay] = useState<DubaiPriceDisplayResponse | null>(null);
  const [dubaiPriceDisplayLoading, setDubaiPriceDisplayLoading] = useState(false);
  const [dubaiPriceDisplayError, setDubaiPriceDisplayError] = useState<string | null>(null);
  const [dubaiImageObjectUrls, setDubaiImageObjectUrls] = useState<Record<string, string>>({});
  const [dubaiDisplayVersions, setDubaiDisplayVersions] = useState<DubaiPriceDisplayVersionSummary[]>([]);
  const [editingDubaiMarkupVersion, setEditingDubaiMarkupVersion] = useState<Pick<DubaiPriceDisplayVersionSummary, 'id' | 'seaMarkupPerCbm'> | null>(null);
  const [dubaiMarkupSaving, setDubaiMarkupSaving] = useState(false);
  const [dubaiHighResolutionPreview, setDubaiHighResolutionPreview] = useState<DubaiHighResolutionPreview | null>(null);
  const [selectedDubaiDisplayVersion, setSelectedDubaiDisplayVersion] = useState<DubaiPriceDisplayVersionSummary | null>(null);
  const [dubaiVersionImageObjectUrls, setDubaiVersionImageObjectUrls] = useState<Record<string, string>>({});
  const [dubaiVersionPreviewLoading, setDubaiVersionPreviewLoading] = useState(false);
  const [dubaiVersionPreviewError, setDubaiVersionPreviewError] = useState<string | null>(null);
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
  useEffect(() => {
    onNoticeRef.current = onNotice;
  }, [onNotice]);
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
  const selectedPriceBookRemarkScope = selectedPriceBook
    ? `${selectedPriceBook.agentShortName?.trim() || '未绑定代理'} · ${selectedPriceBook.targetModule ? getLegacyModuleLabel(selectedPriceBook.targetModule) : '未归类模块'}`
    : '';
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
    { title: '查价模块', width: 180, render: () => <Text>{priceBookManagementModule === 'unclassified' ? '未归类数据' : priceBookImportModules.find((item) => item.key === priceBookManagementModule)?.label}</Text> },
    { title: '导入行数', dataIndex: 'importRowCount', width: 105, render: (value: number | undefined, record: PriceBookRecord) => value ?? record.rowCount },
    { title: '有效线路', dataIndex: 'activeRouteCount', width: 100, render: (value?: number) => value ?? 0 },
    { title: '有效报价', dataIndex: 'activeQuoteRowCount', width: 100, render: (value?: number) => value ?? 0 },
    { title: 'KG', dataIndex: 'activeKgQuoteRowCount', width: 85, render: (value?: number) => value ?? 0 },
    { title: 'CBM', dataIndex: 'activeCbmQuoteRowCount', width: 85, render: (value?: number) => value ?? 0 },
    { title: '异常行', dataIndex: 'failedRowCount', width: 90, render: (value?: number) => value ? <Tag color="red">{value}</Tag> : 0 },
    {
      title: '规则同步',
      width: 150,
      render: (_value: unknown, record: PriceBookRecord) => {
        const status = record.refreshStatus ?? 'CURRENT';
        const display = status === 'CURRENT' ? '已同步' : status === 'PENDING' ? '等待同步' : status === 'RUNNING' ? '同步中' : status === 'UNAVAILABLE' ? '原文件不可用' : '同步失败';
        const color = status === 'CURRENT' ? 'green' : status === 'UNAVAILABLE' || status === 'FAILED' ? 'red' : 'blue';
        return <Tag color={color} title={record.lastRuleRefreshAt ? `最近规则同步：${formatBeijingDateTime(record.lastRuleRefreshAt)}` : undefined}>{display}</Tag>;
      }
    },
    { title: '导入时间', dataIndex: 'importedAt', width: 220, render: (value: string) => formatBeijingDateTime(value) }
  ], [priceBookManagementModule]);
  const activePriceBookRuleRefresh = useMemo(
    () => priceBookRuleRefreshProgress?.modules.find((item) => item.module === priceBookManagementModule),
    [priceBookManagementModule, priceBookRuleRefreshProgress]
  );
  const getMarkupRowSheetName = (row: ImportedPriceRow) => row.sourceSheetName?.trim() || row.channelName?.trim() || '未标记工作表';
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const can = useCallback((permission: PermissionKey) => isAdministratorRole(role) || hasEffectivePricingCapability(permissions, permission) || permissionSet.has(permission), [permissionSet, permissions, role]);
  const availableLookupModules = useMemo(
    () => filterPricingModulesByPermissions(legacyPricingModules, permissions, 'lookup', role),
    [permissions, role]
  );
  const availableMarkupModules = useMemo(
    () => filterPricingModulesByPermissions(legacyPricingModules, permissions, 'markup', role),
    [permissions, role]
  );
  const canViewMarkupDetails = fieldVisibility.showPayableCost
    && legacyPricingModules.some((item) => can(pricingMarkupPermissionCode(item.key, 'view')));
  const canViewTierMarkup = fieldVisibility.showPayableCost
    && can(pricingMarkupPermissionCode(markupModule, 'view'));
  const canViewAgentIdentity = fieldVisibility.showAgentData
    && fieldVisibility.showAgentShortName
    && fieldVisibility.showAgentCompanyName
    && fieldVisibility.showAgentChannel;
  const canViewMarkupWorkspace = canViewAgentIdentity && canViewMarkupDetails && availableMarkupModules.length > 0;
  const canEditMarkup = fieldVisibility.showPayableCost
    && canViewAgentIdentity
    && can(pricingMarkupPermissionCode(markupModule, 'edit'));
  const canCreateMarkup = canEditMarkup;
  const canUpdateMarkup = canEditMarkup;
  const canImportMarkup = canEditMarkup;
  const canExportMarkup = canEditMarkup;
  const canChangeMarkupStatus = canEditMarkup;
  const canDeleteMarkup = canEditMarkup;
  const canMaintainMarkupTier = canEditMarkup;
  const canViewPriceBooks = fieldVisibility.showPayableCost && canViewAgentIdentity && can('pricing:price-books:view');
  const canViewPriceBookRows = canViewPriceBooks;
  const priceBookManagementRowSelection = useMemo(() => {
    if (!canViewPriceBookRows && !can('pricing:price-books:update') && !can('pricing:price-books:delete')) {
      return undefined;
    }
    return {
      selectedRowKeys: selectedPriceBookIds,
      onChange: (keys: Key[]) => setSelectedPriceBookIds(keys.map(String))
    };
  }, [can, canViewPriceBookRows, selectedPriceBookIds]);
  const canViewCurrentLookupModule = can(lookupPermissionByModule[legacyModule]);
  const canViewInternalPricing = fieldVisibility.showPayableCost;
  const lookupResultFieldVisibility = resolvePricingLookupResultFieldVisibility(canViewCurrentLookupModule, canViewInternalPricing);
  const canViewLookupChannel = lookupResultFieldVisibility.channel;
  const canViewCost = lookupResultFieldVisibility.cost;
  const canViewGrossProfit = lookupResultFieldVisibility.grossProfit;
  const canViewMarkupBreakdown = lookupResultFieldVisibility.markupBreakdown;
  const canViewPostalRule = canViewCurrentLookupModule;
  const canViewRequirements = lookupResultFieldVisibility.requirement;
  const canViewCustomRemark = lookupResultFieldVisibility.customRemark;
  const canCopyQuote = canViewCurrentLookupModule;
  const canViewDubaiImages = can('pricing:lookup:dubai-air-sea');
  const canReadSouthAfricaRules = can('pricing:lookup:south-africa');
  const canViewSouthAfricaQuoteTable = canReadSouthAfricaRules;
  const canViewSouthAfricaCostMarkup = fieldVisibility.showPayableCost && can('pricing:markup:southAfrica:view');
  const southAfricaQuoteTableRows = useMemo(() => buildSouthAfricaQuoteTableRows(southAfricaRules), [southAfricaRules]);
  const amazonTierLabels = useMemo(() => buildAmazonTierLabels(), []);
  const pricingSubItems = useMemo(
    () => [
      ...(availableLookupModules.length ? [{ key: 'lookup', label: '查价', description: '业务员报价查询' }] : []),
      ...(canViewMarkupWorkspace && availableMarkupModules.length
        ? [
            { key: 'markup', label: '代理加价规则', description: '维护业务员加价' },
            ...(canViewPriceBooks ? [{ key: 'priceBooks', label: '价格表管理', description: '导入与备注维护' }] : [])
          ]
        : canViewPriceBooks ? [{ key: 'priceBooks', label: '价格表管理', description: '导入与备注维护' }] : [])
    ],
    [availableLookupModules.length, availableMarkupModules.length, canViewMarkupWorkspace, canViewPriceBooks]
  );
  const [activePricingSection, setActivePricingSection] = useState(initialSection ?? 'lookup');
  useEffect(() => {
    if (initialSection) setActivePricingSection(initialSection);
  }, [initialSection]);
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
  useEffect(() => {
    if (!fieldVisibility.showAgentChannel && lookupForm.getFieldValue('channel')) {
      lookupForm.setFieldValue('channel', undefined);
    }
  }, [fieldVisibility.showAgentChannel, lookupForm]);
  useEffect(() => {
    if (!availableMarkupModules.some((item) => item.key === markupModule)) {
      const fallbackModule = availableMarkupModules[0]?.key;
      if (fallbackModule) setMarkupModule(fallbackModule);
    }
  }, [availableMarkupModules, markupModule]);
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
        && (canadaAddressTypeValue !== 'AMAZON' || Boolean(normalizeCanadaAmazonWarehouseCode(amazonCodeValue)));
    }
    if (isAirSeaPricingModule(legacyModule)) return hasMeasureInput;
    return false;
  })();
  const sortedRecommendations = useMemo(() => {
    return [...(lookupResult?.recommendations ?? [])].sort((left, right) => left.totalSales - right.totalSales);
  }, [lookupResult]);
  const recommendedQuote = sortedRecommendations[0] ?? null;
  const highlightedQuote = recommendedQuote;
  const legacyHasRecommendations = Boolean(legacyResult?.recommendations.length);
  const highlightedLegacyQuote = legacyResult?.selected ?? legacyResult?.cheapestRecommendations[0] ?? legacyResult?.recommendations[0] ?? null;
  const legacyUnitPreview = legacyResult?.module === 'europeExpress' && Number(legacyResult.query.chargeableWeightKg ?? 0) <= 0;
  const sortedLegacyRecommendations = useMemo(
    () => sortLegacyRecommendations(legacyResult?.recommendations ?? [], legacyRecommendationSort),
    [legacyRecommendationSort, legacyResult?.recommendations]
  );
  const visibleLegacyRecommendations = sortedLegacyRecommendations.slice(0, 3);

  useEffect(() => {
    let alive = true;
    if (activePricingSection === 'lookup' && availableLookupModules.length > 0) {
      apiClient.priceBookQuery.legacyPricingMeta()
        .then((meta) => {
          if (!alive) return;
          setLegacyMeta(meta);
        })
        .catch(() => undefined);
    }
    if (canReadSouthAfricaRules && (
      activePricingSection === 'lookup'
      || (activePricingSection === 'priceBooks' && priceBookManagementModule === 'southAfrica')
    )) {
      apiClient.priceBookQuery.southAfricaRateRules()
        .then((southAfrica) => {
          if (!alive) return;
          setSouthAfricaRules(Array.isArray(southAfrica?.rules) ? southAfrica.rules : []);
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, [activePricingSection, apiClient, availableLookupModules.length, canReadSouthAfricaRules, priceBookManagementModule]);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('siyuan-pricing-markup');
      channel.onmessage = () => {
        setMarkupNeedsRefresh(true);
        void reloadMarkupRules(markupFilters);
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
    apiClient.priceBookQuery.dubaiPriceDisplay()
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
    if (!canViewDubaiImages) {
      setDubaiPriceDisplay(null);
      setDubaiImageObjectUrls({});
      return () => undefined;
    }
    const scopedPages = [
      ...buildDubaiLookupPageGroups('AIR', dubaiPriceDisplay?.airPages ?? []).groups.flatMap((group) => group.pages),
      ...buildDubaiLookupPageGroups('SEA', dubaiPriceDisplay?.seaPages ?? []).groups.flatMap((group) => group.pages)
    ];
    const pages = [...new Map(scopedPages.map((page) => [page.id, page])).values()];
    let cancelled = false;
    const createdUrls: string[] = [];
    setDubaiImageObjectUrls({});
    if (!pages.length) return () => undefined;
    void Promise.all(pages.map(async (page) => {
      const blob = await apiClient.dubaiPriceDisplayPageImage(page.url);
      const objectUrl = URL.createObjectURL(blob);
      createdUrls.push(objectUrl);
      return [page.id, objectUrl] as const;
    })).then((entries) => {
      if (!cancelled) setDubaiImageObjectUrls(Object.fromEntries(entries));
    }).catch((error: unknown) => {
      if (!cancelled) setDubaiPriceDisplayError(error instanceof Error ? error.message : '迪拜价格图片加载失败');
    });
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [apiClient, canViewDubaiImages, dubaiPriceDisplay]);

  useEffect(() => {
    if (!canViewDubaiImages || !selectedDubaiDisplayVersion) {
      setDubaiVersionImageObjectUrls({});
      setDubaiVersionPreviewLoading(false);
      setDubaiVersionPreviewError(null);
      return () => undefined;
    }
    let cancelled = false;
    const createdUrls: string[] = [];
    const pages = selectedDubaiDisplayVersion.pages
      .filter((page): page is typeof page & { mode: 'AIR' | 'SEA' } => page.mode === 'AIR' || page.mode === 'SEA')
      .sort((left, right) => left.mode.localeCompare(right.mode) || left.sheetName.localeCompare(right.sheetName) || left.pageNo - right.pageNo);
    setDubaiVersionImageObjectUrls({});
    setDubaiVersionPreviewLoading(true);
    setDubaiVersionPreviewError(null);
    void Promise.all(pages.map(async (page) => {
      const blob = await apiClient.dubaiPriceDisplayVersionPageImage(selectedDubaiDisplayVersion.id, page.id);
      const objectUrl = URL.createObjectURL(blob);
      createdUrls.push(objectUrl);
      return [page.id, objectUrl] as const;
    })).then((entries) => {
      if (!cancelled) setDubaiVersionImageObjectUrls(Object.fromEntries(entries));
    }).catch((error: unknown) => {
      if (!cancelled) setDubaiVersionPreviewError(error instanceof Error ? error.message : '迪拜完整价格图片加载失败');
    }).finally(() => {
      if (!cancelled) setDubaiVersionPreviewLoading(false);
    });
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [apiClient, canViewDubaiImages, selectedDubaiDisplayVersion]);

  useEffect(() => {
    if (!canViewDubaiImages || !can('pricing:price-books:view') || activePricingSection !== 'priceBooks' || priceBookManagementModule !== 'dubaiAirSea') return;
    let alive = true;
    apiClient.priceBookQuery.dubaiPriceDisplayVersions()
      .then((response) => { if (alive) setDubaiDisplayVersions(response.versions); })
      .catch(() => { if (alive) setDubaiDisplayVersions([]); });
    return () => { alive = false; };
  }, [activePricingSection, apiClient, can, canViewDubaiImages, priceBookManagementModule, priceBookImportJob?.status]);

  useEffect(() => {
    let alive = true;
    if (!canViewMarkupWorkspace || (activePricingSection !== 'markup' && activePricingSection !== 'priceBooks')) {
      setPriceBooks([]);
      setPriceRows([]);
      return () => {
        alive = false;
      };
    }
    const isMarkupSection = activePricingSection === 'markup';
    Promise.all([
      isMarkupSection && canViewPriceBooks ? apiClient.priceBookQuery.priceBooks({ includeRows: false }) : Promise.resolve({ books: [] as PriceBookSummary[] }),
      isMarkupSection && canViewMarkupDetails ? apiClient.markupQuery.agentMarkupRules({ page: 1, pageSize: 200, status: 'ALL', includeHits: false, legacyModule: markupModule }) : Promise.resolve([] as AgentMarkupSummary[]),
      apiClient.masterData().catch(() => ({ agents: [] } as Partial<MasterDataSnapshot>))
    ])
      .then(([response, rules, masterData]) => {
        if (!alive) {
          return;
        }
        const markupRows = readAgentMarkupRows(rules);
        setPriceBooks(response.books);
        setPriceRows([...seedImportedPriceRows]);
        setMarkupRules(markupRows);
        setMarkupDetailRules([]);
        setMarkupMetrics(readAgentMarkupMetrics(rules));
        setMarkupFilterOptions(Array.isArray(rules) ? emptyMarkupFilterOptions : rules.filterOptions);
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
  }, [activePricingSection, apiClient, canViewMarkupDetails, canViewMarkupWorkspace, canViewPriceBooks, canViewTierMarkup, markupModule]);

  useEffect(() => {
    if (!canViewPriceBooks || activePricingSection !== 'priceBooks') return;
    let alive = true;
    let timedOut = false;
    const controller = new AbortController();
    const slowTimeout = globalThis.setTimeout(() => {
      if (alive && !timedOut) setPriceBookManagementSlowLoading(true);
    }, 8000);
    const failureTimeout = globalThis.setTimeout(() => {
      if (!alive) return;
      timedOut = true;
      controller.abort();
      setPriceBookManagementSlowLoading(false);
      setPriceBookManagementLoadError('当前模块价格表加载失败，请重试');
      setPriceBookManagementLoading(false);
    }, 20000);
    setPriceBookManagementLoading(true);
    setPriceBookManagementSlowLoading(false);
    setPriceBookManagementLoadError(null);
    setSelectedPriceBookIds([]);
    apiClient.priceBooks({ includeRows: false, targetModule: priceBookManagementModule, signal: controller.signal })
      .then((response) => {
        if (alive && !timedOut) setManagedPriceBooks(response.books);
      })
      .catch((error) => {
        if (!alive || timedOut) return;
        setPriceBookManagementLoadError(error instanceof Error ? error.message : '当前模块价格表加载失败');
      })
      .finally(() => {
        globalThis.clearTimeout(slowTimeout);
        globalThis.clearTimeout(failureTimeout);
        if (alive && !timedOut) {
          setPriceBookManagementSlowLoading(false);
          setPriceBookManagementLoading(false);
        }
      });
    return () => {
      alive = false;
      controller.abort();
      globalThis.clearTimeout(slowTimeout);
      globalThis.clearTimeout(failureTimeout);
    };
  }, [activePricingSection, apiClient, canViewPriceBooks, priceBookManagementModule, priceBookManagementReloadVersion]);

  useEffect(() => {
    if (!can('pricing:price-books:health') || activePricingSection !== 'priceBooks') return;
    let alive = true;
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const load = () => apiClient.priceBookQuery.priceBookRuleRefreshProgress()
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
      const response = await apiClient.priceBookQuery.pricingSyncHealth({ page, pageSize, legacyModule: priceBookManagementModule });
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

  async function loadExpandedMarkupRules(
    group: MarkupDisplayRule,
    page = 1,
    sortBy = expandedMarkupRulesSort.sortBy,
    sortOrder = expandedMarkupRulesSort.sortOrder,
    pageSize = expandedMarkupRulesPagination.pageSize
  ) {
    setExpandedMarkupRulesLoading(true);
    setExpandedMarkupRulesError('');
    try {
      const response = await apiClient.markupQuery.agentMarkupRules({
        ...(group.priceBookId ? { priceBookId: group.priceBookId } : {}),
        agentName: group.agentName,
        legacyModule: markupModule,
        status: 'ENABLED',
        detail: true,
        includeHits: true,
        page,
        pageSize,
        sortBy,
        sortOrder
      });
      setExpandedMarkupRules(readAgentMarkupRows(response));
      setExpandedMarkupRulesPagination(response.pagination);
      setExpandedMarkupRulesSort({ sortBy, sortOrder });
    } catch (error) {
      setExpandedMarkupRules([]);
      setExpandedMarkupRulesError(error instanceof Error ? error.message : '规则清单加载失败');
    } finally {
      setExpandedMarkupRulesLoading(false);
    }
  }

  function openMarkupRuleDetails(group: MarkupDisplayRule) {
    setExpandedMarkupGroup(group);
    setExpandedMarkupRulesSort({ sortBy: undefined, sortOrder: 'asc' });
    void loadExpandedMarkupRules(group, 1, undefined, 'asc');
  }

  function closeMarkupRuleDetails() {
    setExpandedMarkupGroup(null);
    setExpandedMarkupRules([]);
    setExpandedMarkupRulesError('');
    setExpandedMarkupRulesPagination({ page: 1, pageSize: 10, totalItems: 0 });
  }

  function refreshExpandedMarkupRuleList() {
    return expandedMarkupGroup
      ? loadExpandedMarkupRules(
          expandedMarkupGroup,
          expandedMarkupRulesPagination.page,
          expandedMarkupRulesSort.sortBy,
          expandedMarkupRulesSort.sortOrder
        )
      : Promise.resolve();
  }

  function reloadMarkupRules(nextFilters: AgentMarkupListQuery = markupFilters) {
    return apiClient.markupQuery.agentMarkupRules({ ...nextFilters, legacyModule: markupModule, page: 1, pageSize: 200, includeHits: false }).then((response) => {
      const rows = readAgentMarkupRows(response);
      setMarkupRules(rows);
      setMarkupMetrics(readAgentMarkupMetrics(response));
      setMarkupFilterOptions(Array.isArray(response) ? emptyMarkupFilterOptions : response.filterOptions);
      setMarkupFilters({ ...nextFilters, legacyModule: markupModule, page: 1, pageSize: 20 });
      setSelectedMarkupRuleIds((current) => current.filter((id) => rows.some((rule) => rule.id === id)));
      return response;
    });
  }

  async function reloadSouthAfricaRateRules() {
    const response = await apiClient.priceBookQuery.southAfricaRateRules();
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
      costPerCbm: undefined,
      markupPerCbm: undefined,
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
      costPerCbm: rule.costPerCbm,
      markupPerCbm: rule.markupPerCbm,
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
        ...(consult ? {} : { ratePerCbm: editingSouthAfricaRule?.ratePerCbm }),
        ...(!consult && values.costPerCbm !== undefined && values.markupPerCbm !== undefined
          ? { costPerCbm: Number(values.costPerCbm), markupPerCbm: Number(values.markupPerCbm) }
          : {}),
        ...(values.remark?.trim() ? { remark: values.remark.trim() } : {})
      };
      if (editingSouthAfricaRule) {
        await apiClient.updateSouthAfricaRateRule(editingSouthAfricaRule.id, payload);
      } else {
        await apiClient.createSouthAfricaRateRule(payload);
      }
      await reloadSouthAfricaRateRules();
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
      setSouthAfricaResult(null);
      onNotice('南非物料规则已删除');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '南非物料规则删除失败');
    }
  }

  function renderSouthAfricaRuleManagement() {
    return (
      <div className="pricing-south-africa-management">
        <ManagedTable<SouthAfricaRateRuleSummary>
          className="pricing-south-africa-management-table"
          recordDetail={{ title: '南非物料价格规则详情' }}
          rowKey="id"
          size="small"
          pagination={tenRowTablePagination}
          dataSource={southAfricaRules}
          scroll={{ x: 1520 }}
          columns={[
            { title: '一级分类', dataIndex: 'category', width: 120, fixed: 'left' as const, render: (value) => <Tag className="pricing-south-africa-category-tag">{value}</Tag> },
            { title: '物料类别', dataIndex: 'name', width: 170, fixed: 'left' as const },
            { title: '匹配关键词', dataIndex: 'keywords', width: 280, render: (keywords: string[]) => <Space className="pricing-south-africa-keywords" wrap size={[2, 2]}>{keywords.slice(0, 8).map((keyword) => <Tag className="pricing-south-africa-keyword-tag" key={keyword}>{keyword}</Tag>)}</Space> },
            ...(canViewSouthAfricaCostMarkup ? [
              {
                title: '成本价/CBM',
                dataIndex: 'costPerCbm',
                width: 130,
                render: (value: number | undefined, rule: SouthAfricaRateRuleSummary) => rule.consult
                  ? <Text type="secondary">不适用</Text>
                  : value === undefined ? <Tag color="orange">待补录</Tag> : <Text strong>{formatCurrency(value)}/CBM</Text>
              },
              {
                title: '加价/CBM',
                dataIndex: 'markupPerCbm',
                width: 120,
                render: (value: number | undefined, rule: SouthAfricaRateRuleSummary) => rule.consult
                  ? <Text type="secondary">不适用</Text>
                  : value === undefined ? <Tag color="orange">待补录</Tag> : <Text strong className="pricing-south-africa-markup-value">+{formatCurrency(value)}/CBM</Text>
              }
            ] : []),
            {
              title: '最终查价/CBM',
              dataIndex: 'ratePerCbm',
              width: 155,
              onCell: (rule) => ({
                className: `pricing-south-africa-price-cell pricing-south-africa-price-${getSouthAfricaQuotePriceTone(rule)}`
              }),
              render: (value: number | undefined, rule) => rule.consult
                ? <Tag color="orange">需单询</Tag>
                : <Space direction="vertical" size={0}><Text strong className="pricing-south-africa-price-value">{formatCurrency(value ?? 0)}/CBM</Text>{rule.costPerCbm === undefined || rule.markupPerCbm === undefined ? <Text type="secondary">保留原报价</Text> : <Text type="success">自动计算</Text>}</Space>
            },
            { title: '备注', dataIndex: 'remark', width: 280, render: (value?: string) => <Text className="pricing-south-africa-quote-remark">{value || '-'}</Text> },
            { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
            ...(can('pricing:markup:southAfrica:edit') ? [{
              title: '操作',
              key: 'action',
              width: 210,
              fixed: 'right' as const,
              render: (_: unknown, rule: SouthAfricaRateRuleSummary) => (
                <Space size={4}>
                  {can('pricing:markup:southAfrica:edit') ? <Button htmlType="button" size="small" onClick={() => openEditSouthAfricaRateRule(rule)}>修改</Button> : null}
                  {can('pricing:markup:southAfrica:edit') ? (
                    rule.enabled ? <Popconfirm title="确认停用该南非物料规则？" description="停用后该规则不会参与自动查价。" okText="确认停用" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void setSouthAfricaRateRuleEnabled(rule, false)}>
                      <Button htmlType="button" size="small">停用</Button>
                    </Popconfirm> : <Button htmlType="button" size="small" onClick={() => void setSouthAfricaRateRuleEnabled(rule, true)}>启用</Button>
                  ) : null}
                  {can('pricing:markup:southAfrica:edit') ? <Popconfirm title="确认删除该南非物料规则？" description="删除后无法恢复，且后续查价将不再匹配该规则。" okText="确认删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void deleteSouthAfricaRateRule(rule)}>
                    <Button htmlType="button" size="small" danger>删除</Button>
                  </Popconfirm> : null}
                </Space>
              )
            }] : [])
          ]}
        />
      </div>
    );
  }

  function renderSouthAfricaQuoteTable() {
    return (
      <Card
        className="module-grid pricing-legacy-result-card pricing-south-africa-quote-table-card"
        title="南非专线报价表"
        extra={<Text type="secondary">共 {southAfricaQuoteTableRows.length} 条启用报价</Text>}
      >
        <ManagedTable
          className="pricing-south-africa-quote-table"
          recordDetail={false}
          rowKey="id"
          size="small"
          pagination={tenRowTablePagination}
          dataSource={southAfricaQuoteTableRows}
          scroll={{ x: 1020 }}
          columns={[
            {
              title: '一级分类',
              dataIndex: 'category',
              width: 150,
              sorter: (left, right) => left.category.localeCompare(right.category, 'zh-CN'),
              render: (value) => <Tag className="pricing-south-africa-category-tag">{value}</Tag>
            },
            {
              title: '物料类别',
              dataIndex: 'name',
              width: 180,
              sorter: (left, right) => left.name.localeCompare(right.name, 'zh-CN')
            },
            {
              title: '匹配关键词',
              dataIndex: 'keywords',
              width: 300,
              sorter: (left, right) => left.keywords.join('\u0001').localeCompare(right.keywords.join('\u0001'), 'zh-CN'),
              render: (keywords: string[]) => <Space className="pricing-south-africa-keywords" wrap size={[2, 2]}>{keywords.map((keyword) => <Tag className="pricing-south-africa-keyword-tag" key={keyword}>{keyword}</Tag>)}</Space>
            },
            {
              title: '报价/CBM',
              dataIndex: 'ratePerCbm',
              width: 160,
              sorter: (left, right) => (left.ratePerCbm ?? Number.POSITIVE_INFINITY) - (right.ratePerCbm ?? Number.POSITIVE_INFINITY),
              onCell: (rule) => ({
                className: `pricing-south-africa-price-cell pricing-south-africa-price-${getSouthAfricaQuotePriceTone(rule)}`
              }),
              render: (value: number | undefined, rule) => rule.consult
                ? <Tag color="orange">需单询</Tag>
                : value === undefined
                  ? <Tag color="orange">待确认</Tag>
                  : <Text strong className="pricing-south-africa-price-value">{formatCurrency(value)}/CBM</Text>
            },
            {
              title: '备注',
              dataIndex: 'remark',
              width: 360,
              render: (value?: string) => <Text className="pricing-south-africa-quote-remark">{value || '-'}</Text>
            }
          ]}
        />
      </Card>
    );
  }

  const handlePricingSectionChange = useCallback((key: string) => {
    setActivePricingSection(key);
    if (key === 'markup' && markupNeedsRefresh) {
      setMarkupNeedsRefresh(false);
      void reloadMarkupRules(markupFilters);
    }
  }, [markupFilters, markupNeedsRefresh, markupModule]);

  function openCreateMarkupRule() {
    setEditingMarkupRule(null);
    markupForm.setFieldsValue({ priceBookId: undefined, agentName: '', channelName: '', realChannelName: '', destinationCountry: '', markupType: 'WEIGHT', markupValue: 0.5, markupPerKg: 0.5, priority: 100, enabled: 'true' });
    setMarkupModalOpen(true);
  }

  function openEditMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    if (selectedMarkupRule.rulePurpose === 'DUBAI_SEA_IMAGE') {
      openDubaiSeaMarkupRuleEditor(selectedMarkupRule);
      return;
    }
    void resolveConcreteMarkupRule(selectedMarkupRule)
      .then(openEditSpecificMarkupRule)
      .catch((error) => onNotice(error instanceof Error ? error.message : '加价规则加载失败'));
  }

  function openMarkupChannelDetail(rule: MarkupDisplayRule | null = selectedMarkupRule) {
    if (!rule) {
      return;
    }
    if (!rule.priceBookId) {
      onNotice('当前规则未关联有效价格表，无法打开线路阶梯工作台');
      return;
    }
    setMarkupRouteEditorContext({ priceBookId: rule.priceBookId, agentName: rule.agentName, legacyModule: markupModule });
    setMarkupRouteEditorOpen(true);
  }

  function renderExpandedMarkupRuleTable(group: MarkupDisplayRule) {
    const breakdown = group.ruleBreakdown;
    const breakdownItems = [
      ['默认', breakdown?.defaultRules ?? 0, 'default'],
      ['目的国', breakdown?.countryRules ?? 0, 'orange'],
      ['线路规则', breakdown?.routeRules ?? 0, 'purple'],
      ['线路阶梯', breakdown?.routeTierRules ?? 0, 'blue'],
      ['其他', breakdown?.otherRules ?? 0, 'cyan']
    ].filter(([, count]) => Number(count) > 0) as Array<[string, number, string]>;
    return <div className="pricing-markup-rule-breakdown">
      <div className="pricing-markup-rule-breakdown-head">
        <div>
          <Text strong>{group.agentName} · 生效规则清单</Text>
          <Text type="secondary">系统默认与已配置规则共同展示；规则数量和覆盖线路、成本行分开统计</Text>
        </div>
        <Space size={6} wrap>
          <Tag>共 {group.ruleCount ?? 1} 项</Tag>
          {breakdownItems.map(([label, count, color]) => <Tag key={label} color={color === 'default' ? undefined : color}>{label} {count}</Tag>)}
        </Space>
        <Text type="secondary" className="pricing-markup-rule-priority-note">线路阶梯和具体范围规则优先；未命中时使用代理默认或系统默认</Text>
      </div>
      {expandedMarkupRulesError ? <Alert type="error" showIcon message="规则清单加载失败" description={expandedMarkupRulesError} action={<Button size="small" onClick={() => void loadExpandedMarkupRules(group, expandedMarkupRulesPagination.page)}>重试</Button>} /> : null}
      <ManagedTable
        rowKey="id"
        size="small"
        loading={expandedMarkupRulesLoading}
        dataSource={expandedMarkupRules}
        recordDetail={false}
        columnSettings={false}
        pagination={{
          current: expandedMarkupRulesPagination.page,
          pageSize: 10,
          total: expandedMarkupRulesPagination.totalItems,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 项 · 每页 10 项`,
          onChange: (page) => void loadExpandedMarkupRules(group, page, expandedMarkupRulesSort.sortBy, expandedMarkupRulesSort.sortOrder, 10)
        }}
        onChange={(_, __, sorter, extra) => {
          if (extra.action !== 'sort' || Array.isArray(sorter) || !sorter.field || !sorter.order) return;
          const field = String(sorter.field) as NonNullable<AgentMarkupListQuery['sortBy']>;
          void loadExpandedMarkupRules(group, 1, field, sorter.order === 'descend' ? 'desc' : 'asc');
        }}
        scroll={{ x: 1040 }}
        rowClassName={(rule) => isSystemDefaultMarkupRule(rule) ? 'pricing-markup-rule-system-default' : ''}
        columns={[
          { key: 'priority', title: '优先级', dataIndex: 'priority', width: 82, sorter: true, sortOrder: expandedMarkupRulesSort.sortBy === 'priority' ? (expandedMarkupRulesSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (value: number | undefined, rule) => isGeneratedDefaultMarkupRule(rule) ? <Text type="secondary">兜底</Text> : value ?? 100 },
          { key: 'ruleLevel', title: '规则层级', width: 112, render: (_, rule) => { const level = getMarkupRuleLevel(rule); return <Tag color={level.color}>{level.label}</Tag>; } },
          { key: 'scope', title: '作用范围', width: 280, render: (_, rule) => { const value = getMarkupRuleScopeDisplay(rule); return <div className="pricing-markup-rule-scope"><Text strong>{value.primary}</Text>{value.details ? <Text type="secondary" ellipsis={{ tooltip: value.details }}>{value.details}</Text> : null}</div>; } },
          { key: 'markupUnit', title: '计费', dataIndex: 'markupUnit', width: 76, render: (value?: AgentMarkupUnit) => value ?? '通用' },
          { key: 'range', title: '计费量区间', width: 145, render: (_, rule) => getMarkupRuleRangeDisplay(rule) },
          { key: 'markupValue', title: '加价', dataIndex: 'markupValue', width: 125, sorter: true, sortOrder: expandedMarkupRulesSort.sortBy === 'markupValue' ? (expandedMarkupRulesSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (_, rule) => <Text className="pricing-markup-rule-value">+{formatCurrency(Number(rule.markupValue ?? rule.markupPerKg ?? 0))}{rule.markupType === 'WEIGHT' || !rule.markupType ? `/${rule.markupUnit ?? 'KG'}` : ''}</Text> },
          { key: 'hits', title: '覆盖线路 / 成本行', width: 155, render: (_, rule) => isSystemDefaultMarkupRule(rule) ? <Text type="secondary">动态兜底</Text> : <span><Text strong className="pricing-markup-hit-count">{rule.routeHitCount ?? 0} 条</Text> / {rule.hitCount ?? 0} 行</span> },
          { key: 'enabled', title: '状态', dataIndex: 'enabled', width: 82, sorter: true, sortOrder: expandedMarkupRulesSort.sortBy === 'enabled' ? (expandedMarkupRulesSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (enabled: boolean, rule) => <Tag color={enabled ? 'green' : 'default'}>{isGeneratedDefaultMarkupRule(rule) ? '生效' : enabled ? '启用' : '停用'}</Tag> },
          { key: 'action', title: '操作', width: 96, fixed: 'right', render: (_, rule) => canUpdateMarkup ? <Button type="link" size="small" onClick={() => { if (isGeneratedDefaultMarkupRule(rule)) void resolveConcreteMarkupRule(group).then(openEditSpecificMarkupRule).catch((error) => onNotice(error instanceof Error ? error.message : '加价规则加载失败')); else openEditSpecificMarkupRule(rule); }}>{isSystemDefaultMarkupRule(rule) ? '设置默认' : isGeneratedDefaultMarkupRule(rule) ? '调整默认' : '编辑'}</Button> : <Text type="secondary">只读</Text> }
        ]}
      />
    </div>;
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

  async function handleSubmitMarkupRule() {
    setMarkupSaving(true);
    try {
      const values = await markupForm.validateFields();
      const payload = {
        legacyModule: markupModule,
        ...(values.priceBookId?.trim() || editingMarkupRule?.priceBookId
          ? { priceBookId: values.priceBookId?.trim() || editingMarkupRule?.priceBookId }
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
      markupForm.resetFields();
      onNotice(`${rule.agentName} 加价规则已${shouldCreateFromAgentRow ? '保存' : editingMarkupRule ? '更新' : '新增'}：${formatMarkupValue(rule)}`);
      const refreshTasks: Array<Promise<unknown>> = [reloadMarkupRules(markupFilters)];
      if (expandedMarkupGroup?.agentName === rule.agentName && expandedMarkupGroup.priceBookId === rule.priceBookId) {
        refreshTasks.push(refreshExpandedMarkupRuleList());
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

  function disableSelectedMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    setMarkupBatchLoading(true);
    void batchUpdateMarkupRules([selectedMarkupRule], false).then((response) => {
      void reloadMarkupRules(markupFilters);
      void refreshExpandedMarkupRuleList();
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
      void refreshExpandedMarkupRuleList();
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
    if (rule.rulePurpose === 'DUBAI_SEA_IMAGE') {
      if (action === 'edit') openDubaiSeaMarkupRuleEditor(rule);
      return;
    }
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
            void refreshExpandedMarkupRuleList();
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
    void apiClient.markupQuery.exportAgentMarkupRules({ ...markupFilters, legacyModule: markupModule })
      .then((response) => onNotice(`已导出 ${response.rows.length} 条代理加价规则`))
      .catch((error) => onNotice(error instanceof Error ? error.message : '导出规则失败'));
  }

  function openEditPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    if (selectedPriceBook.targetModule && isPricingPriceBookOperationBlocked(permissions, selectedPriceBook.targetModule, 'remark', role)) {
      onNotice('当前模块已屏蔽修改价格表备注');
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
      onNotice(`${updated.fileName} 默认备注已保存，后续同代理同模块上传将自动带入`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表自定义备注更新失败');
    }
  }

  function openDubaiSeaMarkupEditor(version: DubaiPriceDisplayVersionSummary) {
    dubaiSeaMarkupForm.setFieldsValue({ seaMarkupPerCbm: version.seaMarkupPerCbm });
    setEditingDubaiMarkupVersion(version);
  }

  function openDubaiSeaMarkupRuleEditor(rule: AgentMarkupRule) {
    if (!rule.applicationVersionId) {
      onNotice('当前迪拜海运图片版本不可用，请刷新后重试');
      return;
    }
    const seaMarkupPerCbm = Number(rule.markupValue ?? rule.markupPerKg);
    dubaiSeaMarkupForm.setFieldsValue({ seaMarkupPerCbm });
    setEditingDubaiMarkupVersion({ id: rule.applicationVersionId, seaMarkupPerCbm });
  }

  function openDubaiImagePreview(
    title: string,
    pages: Array<{ id: string; pageNo: number }>,
    imageUrls: Record<string, string>
  ) {
    const previewPages = pages.flatMap((page) => {
      const imageUrl = imageUrls[page.id];
      return imageUrl ? [{ ...page, imageUrl }] : [];
    });
    if (previewPages.length !== pages.length) {
      onNotice('高清原图仍在加载，请稍后再试');
      return;
    }
    setDubaiHighResolutionPreview({ title, pages: previewPages });
  }

  function openDubaiDisplayVersionPreview(version: DubaiPriceDisplayVersionSummary) {
    if (version.status !== 'READY' || !version.pages.some((page) => page.mode === 'AIR' || page.mode === 'SEA')) {
      onNotice('当前版本尚未生成可查看的价格图片');
      return;
    }
    setSelectedDubaiDisplayVersion(version);
  }

  async function saveDubaiSeaMarkup() {
    if (!editingDubaiMarkupVersion) return;
    const values = await dubaiSeaMarkupForm.validateFields();
    setDubaiMarkupSaving(true);
    try {
      const response = await apiClient.updateDubaiSeaMarkup(editingDubaiMarkupVersion.id, values);
      setDubaiDisplayVersions(response.versions);
      if (markupModule === 'dubaiAirSea') await reloadMarkupRules(markupFilters);
      setEditingDubaiMarkupVersion(null);
      dubaiSeaMarkupForm.resetFields();
      onNotice('迪拜海运业务图片已按新的内部价格规则生成');
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '迪拜海运业务图片生成失败');
    } finally {
      setDubaiMarkupSaving(false);
    }
  }

  async function handlePriceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const selectedModule = priceBookManagementModule;
    if (selectedModule === 'unclassified') {
      onNotice('未归类数据仅支持查看，请先选择具体价格表模块再导入');
      event.target.value = '';
      return;
    }
    if (isPricingPriceBookOperationBlocked(permissions, selectedModule, 'create', role)) {
      onNotice('当前模块已屏蔽新增价格表');
      event.target.value = '';
      return;
    }
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
      const response = await apiClient.priceBookQuery.priceBookImportJob(jobId);
      setPriceBookImportJob(response.job);
      if (isTerminalImportJob(response.job)) {
        return response.job;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt < 30 ? 100 : 1000));
    }
    throw new Error('价格表导入仍在处理中，请稍后刷新查看任务结果');
  }

  async function loadPriceBookImportHistory(page = 1) {
    setPriceBookImportHistoryLoading(true);
    try {
      const response = await apiClient.priceBookImportJobs({ targetModule: priceBookManagementModule, page, pageSize: 10 });
      setPriceBookImportHistory(response.jobs);
      setPriceBookImportHistoryPagination(response.pagination);
      setPriceBookImportHistoryOpen(true);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '导入记录加载失败');
    } finally {
      setPriceBookImportHistoryLoading(false);
    }
  }

  async function retryPriceBookImport(job: PriceBookImportJobSummary) {
    if (job.targetModule && isPricingPriceBookOperationBlocked(permissions, job.targetModule, 'create', role)) {
      onNotice('当前模块已屏蔽新增价格表');
      return;
    }
    setPriceBookImportHistoryLoading(true);
    try {
      const started = await apiClient.retryPriceBookImportJob(job.id);
      setPriceBookImportJob(started.job);
      onNotice(`已重新提交 ${job.fileName}`);
      const completed = isTerminalImportJob(started.job) ? started.job : await waitForPriceBookImportJob(started.job.id);
      setPriceBookImportJob(completed);
      await loadPriceBookImportHistory(priceBookImportHistoryPagination.page);
      const response = await apiClient.priceBooks({ includeRows: false, targetModule: priceBookManagementModule });
      setManagedPriceBooks(response.books);
      if (completed.status === 'SUCCESS') onNotice(`重试成功：${job.fileName}`);
      else onNotice(completed.message ?? `重试失败：${job.fileName}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '导入任务重试失败');
    } finally {
      setPriceBookImportHistoryLoading(false);
    }
  }


  async function deleteSelectedPriceBooks() {
    const selectedBooks = managedPriceBooks.filter((book) => selectedPriceBookIds.includes(book.id));
    if (!selectedBooks.length) {
      return;
    }
    if (selectedBooks.some((book) => book.targetModule && isPricingPriceBookOperationBlocked(permissions, book.targetModule, 'delete', role))) {
      onNotice('当前选择包含已屏蔽删减的价格表');
      return;
    }

    try {
      const response = await apiClient.batchDeletePriceBooks({ ids: selectedBooks.map((book) => book.id) });
      const deletedIds = new Set(response.results.filter((item) => item.success).map((item) => item.id));
      setPriceBooks((current) => current.filter((book) => !deletedIds.has(book.id)));
      setManagedPriceBooks((current) => current.filter((book) => !deletedIds.has(book.id)));
      setPriceRows((current) => current.filter((row) => !row.priceBookId || !deletedIds.has(row.priceBookId)));
      setSelectedPriceBookIds([]);
      invalidatePricingResult();
      try {
        const latestMarkupRules = readAgentMarkupRows(await apiClient.markupQuery.agentMarkupRules({ includeHits: false }));
        setMarkupRules(latestMarkupRules);
        setSelectedMarkupRuleIds((current) => current.filter((id) => latestMarkupRules.some((rule) => rule.id === id)));
      } catch {
        // 价格表已经删除；加价规则刷新失败不能让旧报价结果留在页面上。
        setMarkupNeedsRefresh(true);
      }
      setSelectedPriceBookIds(response.results.filter((item) => !item.success).map((item) => item.id));
      onNotice(response.failedCount
        ? `已删除 ${response.successCount} 张，${response.failedCount} 张失败：${response.results.filter((item) => !item.success).map((item) => item.error).join('；')}`
        : `已删除 ${response.successCount} 张价格表，相关报价已失效，请重新查询`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表删除失败');
    }
  }

  async function runLookup() {
    try {
      if (!fieldVisibility.showAgentChannel) lookupForm.setFieldValue('channel', undefined);
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
      const safeValues = fieldVisibility.showAgentChannel ? values : { ...values, channel: undefined };
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
      if (legacyModule === 'canadaAirSea' && canadaAddressType === 'AMAZON' && !normalizeCanadaAmazonWarehouseCode(amazonCode)) {
        lookupForm.setFields([{ name: 'amazonCode', errors: ['至少输入三位，前三位须为字母，例如 YYC 或 YYC1'] }]);
        onNotice('亚马逊仓请填写至少三位仓库代码，例如 YYC 或 YYC1');
        return;
      }
      if ((legacyModule === 'inquiry' || legacyModule === 'europeExpress') && !destinationCountry) {
        onNotice('请先填写目的国家');
        return;
      }
      if (legacyModule === 'inquiry' && requestChargeableWeightKg <= 0) {
        onNotice('请先填写体积 CBM、实重或计费重');
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
        onNotice('请先填写计费重量 KG 或体积 CBM');
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
      // 体积 CBM 只用于换算快递派计费重；卡派/按方线路不由填写 CBM 自动开启。
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
          onNotice(southAfrica.result
            ? southAfrica.result.consult
              ? `${southAfrica.result.category} 需单独咨询，已生成待复核记录`
              : '查价成功'
            : '未匹配到南非物料规则');
          return;
        }
        const legacy = await withPricingLookupTimeout(apiClient.quoteLegacyPricing({
          module: legacyModule,
          ...safeValues,
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
    setDubaiHighResolutionPreview(null);
  }

  function resetLookupResult() {
    invalidatePricingResult();
    setLegacyRecommendationSort('price');
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
    setLegacyRecommendationSort('price');
    setChargeableWeightManual(false);
    setVolumeCbmManual(false);
    setAmazonTierManual(false);
    setSouthAfricaCategoryManual(false);
    const nextDefaults = legacyModuleDefaults[nextModule];
    lookupForm.setFieldsValue(fieldVisibility.showAgentChannel ? nextDefaults : { ...nextDefaults, channel: undefined });
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
          <section className="pricing-form-block pricing-form-block-amazon">
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
              {fieldVisibility.showAgentChannel ? (
                <Form.Item name="channel" label="渠道关键词">
                  <Input tabIndex={lookupTabIndex('channel')} placeholder="渠道关键词" />
                </Form.Item>
              ) : null}
              <Form.Item name="actualWeightKg" label="实重 KG">
                <InputNumber tabIndex={lookupTabIndex('actualWeightKg')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 500" />
              </Form.Item>
              <Form.Item name="volumeCbm" label="体积 CBM">
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="体积 CBM" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 1" />
              </Form.Item>
              <div className="pricing-amazon-inline-action">
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
                  查询比价
                </Button>
              </div>
              <Form.Item name="chargeableWeightKg" hidden>
                <InputNumber />
              </Form.Item>
            </div>
          </section>
      );
    }

    if (legacyModule === 'inquiry') {
      return (
        <>
          <section className="pricing-form-block pricing-form-block-inquiry">
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
                <Input.TextArea tabIndex={lookupTabIndex('address')} rows={2} placeholder="France 549 rue du maubon Choisy au bac" />
              </Form.Item>
              <Form.Item name="packageInfo" label="包装（可选）">
                <Input tabIndex={lookupTabIndex('packageInfo')} aria-label="包装" placeholder="如 1个木箱、2托、纸箱货" />
              </Form.Item>
              {fieldVisibility.showAgentChannel ? (
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
              ) : null}
              <Form.Item name="actualWeightKg" label="实际重量 KG">
                <InputNumber tabIndex={lookupTabIndex('actualWeightKg')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="没有可不填" />
              </Form.Item>
              <Form.Item name="volumeCbm" label="体积 CBM" rules={[{ required: true, message: '请输入体积 CBM' }]}>
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="体积 CBM" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="5" />
              </Form.Item>
              <div className="pricing-inquiry-weight-summary" title="没有尺寸时直接填写体积 CBM，系统按 CBM x 167 自动计算计费重">
                <Text type="secondary">自动计费重</Text>
                <Text strong>{calculatedChargeableWeight > 0 ? calculatedChargeableWeight : 0} KG</Text>
              </div>
              <div className="pricing-inquiry-query-action">
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
                  查询综合报价
                </Button>
              </div>
            </div>
          </section>
          <section className="pricing-form-block pricing-form-block-inquiry-size">
            <div className="pricing-form-block-heading">
              <Text strong className="pricing-form-block-title">尺寸（有就填）</Text>
              <Text type="secondary">没有尺寸时直接填体积 CBM，系统按 CBM x 167 自动计算。</Text>
            </div>
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
              {fieldVisibility.showAgentChannel ? (
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
              ) : null}
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
              <Form.Item name="volumeCbm" label="体积 CBM">
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="用于换算快递派计费重（1CBM=167KG）" />
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
          <section className="pricing-form-block pricing-form-block-air-sea-primary">
            <Text strong className="pricing-form-block-title">{moduleLabel}条件</Text>
            <div className="pricing-form-grid pricing-form-grid-express pricing-form-grid-air-sea-primary">
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
                      label="亚马逊仓库代码"
                      rules={[
                        { required: true, message: '请输入亚马逊仓库代码' },
                        { pattern: /^[A-Za-z]{3}[A-Za-z0-9]*$/, message: '至少输入三位，前三位须为字母，例如 YYC 或 YYC1' }
                      ]}
                    >
                      <Input
                        tabIndex={lookupTabIndex('amazonCode')}
                        maxLength={16}
                        placeholder="例如 YYC 或 YYC1"
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
              {fieldVisibility.showAgentChannel ? (
                <Form.Item name="channel" label="渠道关键词">
                  <Input tabIndex={lookupTabIndex('channel')} placeholder="空运、海运、专线；留空查全部" />
                </Form.Item>
              ) : null}
              <Form.Item name="chargeableWeightKg" label="计费重量 KG">
                <InputNumber tabIndex={lookupTabIndex('chargeableWeightKg')} className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 100" />
              </Form.Item>
              <Form.Item name="volumeCbm" label="体积 CBM">
                <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="体积 CBM" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="如 1.000" />
              </Form.Item>
              <div className="pricing-air-sea-query-action">
                <Button
                  aria-label="查询价格"
                  type="primary"
                  size="large"
                  icon={<Search size={16} />}
                  htmlType="button"
                  loading={lookupLoading}
                  disabled={!canRunLookup || lookupLoading}
                  onClick={() => void runLookup()}
                >
                  查询价格
                </Button>
              </div>
            </div>
          </section>
          <section className="pricing-form-block pricing-form-block-air-sea-size">
            <div className="pricing-form-block-heading">
              <Text strong className="pricing-form-block-title">尺寸信息</Text>
              <Text type="secondary">有尺寸时填写，用于核对计费重量。</Text>
            </div>
            <div className="pricing-form-grid pricing-form-grid-size">
              <Form.Item name="lengthCm" label="长 cm"><InputNumber tabIndex={lookupTabIndex('lengthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="widthCm" label="宽 cm"><InputNumber tabIndex={lookupTabIndex('widthCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="heightCm" label="高 cm"><InputNumber tabIndex={lookupTabIndex('heightCm')} min={0} precision={2} placeholder="可不填" /></Form.Item>
              <Form.Item name="packageCount" label="件数"><InputNumber tabIndex={lookupTabIndex('packageCount')} min={1} precision={0} /></Form.Item>
              <Form.Item name="unitActualWeightKg" label="单件实重 KG"><InputNumber tabIndex={lookupTabIndex('unitActualWeightKg')} min={0} precision={3} placeholder="可不填" /></Form.Item>
            </div>
          </section>
          <section className="pricing-form-block pricing-form-block-muted pricing-form-block-air-sea-extra">
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
          <Form.Item name="volumeCbm" label="体积 CBM" rules={[{ required: true, message: '请输入体积 CBM' }]}>
            <InputNumber tabIndex={lookupTabIndex('volumeCbm')} aria-label="体积 CBM" className="pricing-measure-input" controls={false} min={0} precision={3} placeholder="1.000" />
          </Form.Item>
        </div>
      </section>
    );
  }

  if (isMarkupRouteEditor && fieldVisibility.showPayableCost && canViewAgentIdentity) {
    return <MarkupRouteEditor apiClient={apiClient} permissions={permissions} onNotice={onNotice} />;
  }

  return (
    <AppPage>
      <AppPageHeader
        title="报价查询中心"
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
                const { groups } = buildDubaiLookupPageGroups(mode, pages);
                const modeLabel = mode === 'AIR' ? '空运' : '海运';
                return (
                  <Card
                    key={mode}
                    className="module-grid pricing-legacy-result-card"
                    title={`迪拜${modeLabel}价格表`}
                    loading={dubaiPriceDisplayLoading}
                    extra={<Text type="secondary">双击图片高清查看</Text>}
                  >
                    {pages.length ? (
                      <div className={`pricing-dubai-overview-grid${groups.length > 1 ? ' is-split' : ''}`}>
                        {groups.map((group) => {
                          const loaded = group.pages.every((page) => Boolean(dubaiImageObjectUrls[page.id]));
                          return (
                            <button
                              key={group.key}
                              type="button"
                              className="pricing-dubai-overview-group"
                              aria-label={`迪拜${modeLabel}价格表${group.label}，双击高清查看`}
                              title="双击高清查看"
                              onDoubleClick={() => openDubaiImagePreview(`迪拜${modeLabel}价格表 · ${group.label}`, group.pages, dubaiImageObjectUrls)}
                            >
                              {loaded ? (
                                <span className={`pricing-dubai-overview-stack${group.pages.length > 1 ? ' is-merged' : ''}`}>
                                  {group.pages.map((page) => (
                                    <img
                                      key={page.id}
                                      src={dubaiImageObjectUrls[page.id]}
                                      alt={`迪拜${modeLabel}价格表第 ${page.pageNo} 页`}
                                    />
                                  ))}
                                </span>
                              ) : <span className="pricing-dubai-overview-loading"><Spin size="small" /></span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : <div className="pricing-empty-result pricing-empty-result-compact"><Text type="secondary">暂无已发布的迪拜{modeLabel}价格表</Text></div>}
                  </Card>
                );
              })}
            </div>
          ) : (
          <Card
            className="module-grid pricing-lookup-card pricing-calculator-card"
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
                const tierChanged = Object.prototype.hasOwnProperty.call(changedValues, 'tier');
                const southAfricaLookupInputChanged = legacyModule === 'southAfrica'
                  && ['productName', 'tier', 'volumeCbm'].some((key) => Object.prototype.hasOwnProperty.call(changedValues, key));
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
                if (tierChanged) {
                  if (legacyModule === 'southAfrica') {
                    setSouthAfricaCategoryManual(Boolean(String(changedValues.tier ?? '').trim()));
                  } else {
                    setAmazonTierManual(true);
                  }
                  if (legacyModule !== 'southAfrica') {
                    setChargeableWeightManual(false);
                  }
                }
                if (tierChanged || southAfricaLookupInputChanged) {
                  lookupRequestSeqRef.current += 1;
                  setLegacyResult(null);
                  setSouthAfricaResult(null);
                  setLookupResult(null);
                  setLookupError(null);
                  setLookupLoading(false);
                  setSelectedLegacyRecommendation(null);
                  onNotice(null);
                }
              }}
            >
              <div className={`pricing-calculator-grid pricing-calculator-grid-${legacyModule}${isAirSeaPricingModule(legacyModule) ? ' pricing-calculator-grid-air-sea' : ''}`}>
                <div className="pricing-calculator-left">
                  {renderLegacyLookupFields()}
                  {legacyModule !== 'amazon' && legacyModule !== 'inquiry' && !isAirSeaPricingModule(legacyModule) ? <div className="pricing-legacy-action-row">
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
                      查询价格
                    </Button>
                    <Button htmlType="button" size="large" onClick={resetLookupResult}>清空</Button>
                  </div> : null}
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
                      <div><Text type="secondary">计费体积</Text><Text strong>{southAfricaResult.result.chargeableCbm.toFixed(3)} CBM</Text></div>
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
          {legacyModule === 'southAfrica' && canViewSouthAfricaQuoteTable ? renderSouthAfricaQuoteTable() : null}
          {legacyModule !== 'southAfrica' && legacyModule !== 'dubaiAirSea' && (lookupLoading || lookupError || legacyResult) ? (
            <Card
              className="module-grid pricing-legacy-result-card"
              title={legacyResult && legacyHasRecommendations ? `推荐方案（${legacyResult.recommendations.length} 条线路）` : '推荐方案'}
              extra={legacyResult && legacyHasRecommendations ? (
                <div className="pricing-legacy-sort">
                  <Text type="secondary">排序方式</Text>
                  <Select
                    aria-label="报价排序方式"
                    value={legacyRecommendationSort}
                    onChange={setLegacyRecommendationSort}
                    options={[
                      { value: 'price', label: '价格最低' },
                      { value: 'transit', label: '时效最快' }
                    ]}
                  />
                </div>
              ) : undefined}
            >
              {legacyResult && legacyHasRecommendations ? (
                <>
                  {legacyUnitPreview ? (
                    <Alert
                      className="notice-bar"
                      type="info"
                      showIcon
                      message="未填写计费重，当前报价仅用于快速比价；填写计费重量后可计算真实总价。"
                    />
                  ) : null}
                  <Row gutter={[12, 12]} className="pricing-legacy-recommendation-grid">
                    {visibleLegacyRecommendations.map((item, index) => (
                      <Col xs={24} md={8} key={item.id}>
                        <button type="button" className={`pricing-legacy-quote-card${index === 0 ? ' is-leading' : ''}`} onClick={() => setSelectedLegacyRecommendation(item)}>
                          {index === 0 ? <span className="pricing-legacy-leading-ribbon">{legacyRecommendationSort === 'price' ? '最低价' : '时效最快'}</span> : null}
                          <span className="pricing-legacy-card-head">
                            {canViewLookupChannel ? <Text strong className="pricing-legacy-channel-name">{item.channelName ?? '-'}</Text> : null}
                            <Text className="pricing-legacy-transit">{item.transitLabel ?? '时效待确认'}</Text>
                          </span>
                          <Title level={3} className="pricing-legacy-card-price">{formatCurrency(item.salesTotal)}</Title>
                          <span className="pricing-legacy-card-facts">
                            {canViewCost ? <span>成本 {item.costTotal === undefined ? '-' : formatCurrency(item.costTotal)}</span> : null}
                            <span>{item.weightSegmentLabel} / {formatKgCurrencyRate(item.salesUnitPrice)}{item.quoteMode === 'cbm' ? '/CBM' : '/KG'}</span>
                            {canViewPostalRule && item.postalRule ? <span>匹配邮编/价格区 {item.postalRule}</span> : null}
                          </span>
                          <span className="pricing-legacy-card-footer">
                            <span className="pricing-legacy-card-tags">
                              {item.transportMode ? <Tag color="blue">{item.transportMode === 'SEA_RAIL' ? '铁海联运' : item.transportMode === 'AIR' ? '空运' : item.transportMode === 'SEA' ? '海运' : '铁路'}</Tag> : null}
                              {item.cargoType === 'BATTERY' ? <Tag color="purple">电池/带电</Tag> : null}
                              {item.productSurchargeRemark || item.specialRemark || item.remark ? <Tag color="orange">渠道要求</Tag> : null}
                              {item.customRemark ? <Tag color="cyan">自定义备注</Tag> : null}
                            </span>
                            <span className="pricing-legacy-card-detail">查看详情</span>
                          </span>
                        </button>
                      </Col>
                    ))}
                  </Row>
                  <div className="pricing-legacy-all-title">
                    <Text strong>全部报价线路</Text>
                  </div>
                  <ManagedTable
                    recordDetail={{ title: '报价结果详情' }}
                    rowKey="id"
                    size="small"
                    pagination={tenRowTablePagination}
                    dataSource={sortedLegacyRecommendations}
                    scroll={{ x: canViewInternalPricing ? 1710 : 1300 }}
                    onRow={(record) => ({ onClick: () => setSelectedLegacyRecommendation(record) })}
                    columns={[
                      ...(canViewLookupChannel ? [{ title: '渠道', dataIndex: 'channelName', width: 240, render: (value?: string) => <Text strong>{value ?? '-'}</Text> }] : []),
                      ...(legacyModule === 'inquiry' ? [{ title: '运输方式', dataIndex: 'transportMode', width: 110, render: (value?: LegacyPricingRecommendation['transportMode']) => value ? <Tag color="blue">{value === 'SEA_RAIL' ? '铁海联运' : value === 'AIR' ? '空运' : value === 'SEA' ? '海运' : '铁路'}</Tag> : '-' }] : []),
                      {
                        title: getLegacyRecommendationScopeColumnTitle(legacyResult?.module ?? legacyModule),
                        width: 160,
                        render: (_value, record) => getLegacyRecommendationScopeLabel(record.module, record)
                      },
                      ...(canViewPostalRule ? [{ title: '匹配邮编/价格区', dataIndex: 'postalRule', width: 150, render: (value?: string) => value || '-' }] : []),
                      { title: '重量段', dataIndex: 'weightSegmentLabel', width: 140 },
                      { title: '时效', dataIndex: 'transitLabel', width: 120, render: (value?: string) => value || '时效待确认' },
                      ...(canViewCost ? [{ title: '成本单价', width: 120, render: (_value: unknown, record: LegacyPricingRecommendation) => record.calculation ? `${formatKgCurrencyRate(record.calculation.cost.unitPrice)}/${record.calculation.chargeable.unit}` : '-' }] : []),
                      ...(canViewCost ? [{ title: '成本来源重量段', width: 150, render: (_value: unknown, record: LegacyPricingRecommendation) => record.calculation?.cost.weightSegmentLabel ?? '-' }] : []),
                      ...(canViewMarkupBreakdown ? [{ title: '命中加价规则', width: 190, render: (_value: unknown, record: LegacyPricingRecommendation) => getMarkupRuleLabel(record.calculation?.markup) }] : []),
                      ...(canViewMarkupBreakdown ? [{ title: '实际加价值', width: 120, render: (_value: unknown, record: LegacyPricingRecommendation) => record.calculation ? formatCurrency(record.calculation.markup.totalMarkup) : '-' }] : []),
                      { title: '单价', dataIndex: 'salesUnitPrice', width: 110, render: (value, record) => `${formatKgCurrencyRate(value)}${record.quoteMode === 'cbm' ? '/CBM' : '/KG'}` },
                      { title: '总价', dataIndex: 'salesTotal', width: 120, render: (value) => <Text strong>{formatCurrency(value)}</Text> },
                      ...(canViewGrossProfit ? [{ title: '毛利', dataIndex: 'grossProfit', width: 100, render: (value?: number) => <Text className="pricing-profit">{value === undefined ? '-' : formatCurrency(value)}</Text> }] : []),
                      ...(canViewRequirements ? [{ title: '渠道要求', width: 120, render: (_value: unknown, record: LegacyPricingRecommendation) => renderRequirementCell(record, () => setSelectedLegacyRecommendation(record)) }] : []),
                      ...(canViewCustomRemark ? [{
                        title: '自定义备注',
                        width: 130,
                        render: (_value: unknown, record: LegacyPricingRecommendation) => renderCustomRemarkCell(record, () => setCustomRemarkDetail({
                          title: `${record.channelName ?? ''} · 自定义备注`,
                          content: getCustomRemarkText(record) ?? ''
                        }))
                      }] : []),
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
          title={dubaiHighResolutionPreview?.title ?? '迪拜价格表高清原图'}
          open={Boolean(dubaiHighResolutionPreview)}
          destroyOnHidden
          width="96vw"
          className="pricing-dubai-high-resolution-modal"
          footer={<Button htmlType="button" type="primary" onClick={() => setDubaiHighResolutionPreview(null)}>关闭</Button>}
          onCancel={() => setDubaiHighResolutionPreview(null)}
        >
          <div className="pricing-dubai-high-resolution-hint">原始分辨率展示，可横向或纵向滚动查看价格明细。</div>
          <div className={`pricing-dubai-image-preview-stack${(dubaiHighResolutionPreview?.pages.length ?? 0) > 1 ? ' is-merged' : ''}`}>
            {dubaiHighResolutionPreview?.pages.map((page) => (
              <img
                key={page.id}
                className="pricing-dubai-image-preview"
                src={page.imageUrl}
                alt={`迪拜价格表高清原图第 ${page.pageNo} 页`}
              />
            ))}
          </div>
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
                {canViewLookupChannel ? <div className="pricing-result-item"><Text type="secondary">渠道</Text><Text strong>{selectedLegacyRecommendation.channelName ?? '-'}</Text></div> : null}
                <div className="pricing-result-item"><Text type="secondary">重量段</Text><Text strong>{selectedLegacyRecommendation.weightSegmentLabel}</Text></div>
                {canViewPostalRule && selectedLegacyRecommendation.postalRule ? <div className="pricing-result-item"><Text type="secondary">匹配邮编/价格区</Text><Text strong>{selectedLegacyRecommendation.postalRule}</Text></div> : null}
                <div className="pricing-result-item"><Text type="secondary">业务报价</Text><Text strong>{formatCurrency(selectedLegacyRecommendation.salesTotal)}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">业务单价</Text><Text strong>{formatKgCurrencyRate(selectedLegacyRecommendation.salesUnitPrice)}{selectedLegacyRecommendation.quoteMode === 'cbm' ? '/CBM' : '/KG'}</Text></div>
                <div className="pricing-result-item"><Text type="secondary">时效</Text><Text strong>{selectedLegacyRecommendation.transitLabel ?? '时效待确认'}</Text></div>
              </div>
              {canViewCost || canViewGrossProfit || canViewMarkupBreakdown ? (
                <div className="pricing-result-grid pricing-admin-only">
                  {canViewCost ? <><div className="pricing-result-item"><Text type="secondary">成本单价</Text><Text strong>{selectedLegacyRecommendation.costUnitPrice === undefined ? '-' : `${formatKgCurrencyRate(selectedLegacyRecommendation.costUnitPrice)}${selectedLegacyRecommendation.quoteMode === 'cbm' ? '/CBM' : '/KG'}`}</Text></div><div className="pricing-result-item"><Text type="secondary">成本来源重量段</Text><Text strong>{selectedLegacyRecommendation.calculation?.cost.weightSegmentLabel ?? '-'}</Text></div><div className="pricing-result-item"><Text type="secondary">成本合计</Text><Text strong>{selectedLegacyRecommendation.costTotal === undefined ? '-' : formatCurrency(selectedLegacyRecommendation.costTotal)}</Text></div></> : null}
                  {canViewMarkupBreakdown ? <><div className="pricing-result-item"><Text type="secondary">命中加价规则</Text><Text strong>{getMarkupRuleLabel(selectedLegacyRecommendation.calculation?.markup)}</Text></div><div className="pricing-result-item"><Text type="secondary">实际加价值</Text><Text strong>{selectedLegacyRecommendation.calculation ? formatCurrency(selectedLegacyRecommendation.calculation.markup.totalMarkup) : '-'}</Text></div></> : null}
                  {canViewGrossProfit ? <div className="pricing-result-item"><Text type="secondary">毛利</Text><Text strong>{selectedLegacyRecommendation.grossProfit === undefined ? '-' : formatCurrency(selectedLegacyRecommendation.grossProfit)}</Text></div> : null}
                </div>
              ) : null}
              {canViewRequirements ? renderRequirementDetailNote(selectedLegacyRecommendation) : null}
              {canViewCustomRemark && selectedLegacyRecommendation.customRemark ? (
                <div className="pricing-detail-note">
                  <Text type="secondary">自定义备注</Text>
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{getCustomRemarkText(selectedLegacyRecommendation)}</Text>
                </div>
              ) : null}
            </Space>
          ) : null}
        </Modal>

        <Modal
          title="价格表导入记录"
          open={priceBookImportHistoryOpen}
          width={1180}
          destroyOnHidden
          footer={<Button htmlType="button" type="primary" onClick={() => setPriceBookImportHistoryOpen(false)}>关闭</Button>}
          onCancel={() => setPriceBookImportHistoryOpen(false)}
        >
          <ManagedTable<PriceBookImportJobSummary>
            recordDetail={{ title: '导入任务详情' }}
            rowKey="id"
            size="small"
            loading={priceBookImportHistoryLoading}
            dataSource={priceBookImportHistory}
            pagination={{
              current: priceBookImportHistoryPagination.page,
              pageSize: priceBookImportHistoryPagination.pageSize,
              total: priceBookImportHistoryPagination.totalItems,
              showSizeChanger: false,
              onChange: (page) => void loadPriceBookImportHistory(page)
            }}
            scroll={{ x: 1080 }}
            columns={[
              { title: '文件名', dataIndex: 'fileName', width: 220, fixed: 'left' },
              { title: '代理简称', dataIndex: 'agentShortName', width: 120, render: (value?: string) => value || '未绑定' },
              { title: '状态', dataIndex: 'status', width: 100, render: (_value: string, record) => { const meta = getPriceBookImportJobStatus(record); return <Tag color={meta.color}>{meta.label}</Tag>; } },
              { title: '进度', width: 130, render: (_value: unknown, record) => `${record.processedRows}/${record.totalRows || '?'}` },
              { title: '异常行', dataIndex: 'failedRows', width: 90, render: (value: number) => value ? <Tag color="red">{value}</Tag> : '0' },
              { title: '结果 / 失败原因', width: 300, render: (_value: unknown, record) => <Text type={record.status === 'FAILED' ? 'danger' : undefined}>{record.errorSummary?.length ? record.errorSummary.map((item) => `第${item.index}行：${item.reason}`).join('；') : record.message || '-'}</Text> },
              { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
              { title: '完成时间', dataIndex: 'completedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
              {
                title: '操作',
                width: 90,
                fixed: 'right',
                render: (_value: unknown, record) => ['FAILED', 'PARTIAL_FAILED'].includes(record.status) && can('pricing:price-books:import')
                  ? <Button htmlType="button" type="link" size="small" onClick={() => void retryPriceBookImport(record)}>重试</Button>
                  : <Text type="secondary">—</Text>
              }
            ]}
          />
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
                <div className="pricing-result-item"><Text type="secondary">重量段</Text><Text strong>{selectedLineRequirement.minWeightKg}-{selectedLineRequirement.maxWeightKg}KG</Text></div>
              </div>
              {renderRequirementDetailNote(selectedLineRequirement)}
            </Space>
          ) : null}
        </Modal>

        {activePricingSection === 'markup' && canViewMarkupWorkspace && availableMarkupModules.length ? (
          <Col xs={24}>
            <div className="pricing-markup-workbench">
              <div className="pricing-markup-metrics">
                <MetricCard title="加价规则" value={markupMetrics.totalRules} icon={<SlidersHorizontal size={22} />} />
                <MetricCard title="启用规则" value={markupMetrics.enabledRules} icon={<CheckCircle2 size={22} />} />
                <MetricCard title="停用规则" value={markupMetrics.disabledRules} icon={<Power size={22} />} />
                <MetricCard title="使用系统默认" value={markupMetrics.systemDefaultScopes} icon={<AlertTriangle size={22} />} />
                <MetricCard title="最近修改" value={markupMetrics.latestUpdatedAt ? formatBeijingDate(markupMetrics.latestUpdatedAt) : '-'} extra={markupMetrics.latestUpdatedAt ? formatBeijingDateTime(markupMetrics.latestUpdatedAt).slice(11, 16) : '暂无修改记录'} icon={<Settings size={22} />} />
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
                    {markupModule !== 'dubaiAirSea' && canImportMarkup ? <Button htmlType="button" size="small" icon={<FileInput size={14} />} onClick={() => onNotice('请使用规则模板上传入口导入')}>导入规则</Button> : null}
                    {markupModule !== 'dubaiAirSea' && canExportMarkup ? <Button htmlType="button" size="small" icon={<Download size={14} />} onClick={exportMarkupRules}>导出规则</Button> : null}
                    {markupModule !== 'dubaiAirSea' && canCreateMarkup ? <Button htmlType="button" size="small" onClick={openCreateMarkupRule}>新增默认加价</Button> : null}
                    {canUpdateMarkup ? <Button htmlType="button" size="small" disabled={selectedVisibleMarkupRuleIds.length !== 1 || selectedMarkupRuleIsPriceBookGroup || markupBatchLoading} onClick={openEditMarkupRule}>修改</Button> : null}
                    {markupModule !== 'dubaiAirSea' && canViewPriceBookRows ? <Button
                      htmlType="button"
                      size="small"
                      disabled={selectedVisibleMarkupRuleIds.length !== 1}
                      title={selectedVisibleMarkupRuleIds.length !== 1 ? '请先选择一条代理加价规则' : '查看该代理当前有效价格表线路'}
                      onClick={() => openMarkupChannelDetail()}
                    >
                      查看线路
                    </Button> : null}
                    {markupModule !== 'dubaiAirSea' && canChangeMarkupStatus ? <Popconfirm
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
                    {markupModule !== 'dubaiAirSea' && canDeleteMarkup ? <Popconfirm
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
                  {availableMarkupModules.map((item) => (
                    <Button
                      key={item.key}
                      htmlType="button"
                      type={markupModule === item.key ? 'primary' : 'default'}
                      onClick={() => {
                        setMarkupModule(item.key);
                        setMarkupFilters({ status: 'ALL', page: 1, pageSize: 20, legacyModule: item.key });
                        setSelectedMarkupRuleIds([]);
                        setMarkupDetailRules([]);
                        setExpandedMarkupGroup(null);
                        setExpandedMarkupRules([]);
                        setExpandedMarkupRulesError('');
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                {markupModule !== 'dubaiAirSea' ? <div className="pricing-markup-filters">
                  <Select allowClear placeholder="全部代理简称" value={markupFilters.agentName} onChange={(value) => setMarkupFilters((current) => ({ ...current, agentName: value }))} options={markupAgentOptions} />
                  <Select allowClear showSearch placeholder="全部渠道" value={markupFilters.channelName} onChange={(value) => setMarkupFilters((current) => ({ ...current, channelName: value }))} options={markupFilterOptions.channelNames.map((value) => ({ value, label: value }))} />
                  <Select allowClear showSearch placeholder="全部线路" value={markupFilters.realChannelName} onChange={(value) => setMarkupFilters((current) => ({ ...current, realChannelName: value }))} options={markupFilterOptions.realChannelNames.map((value) => ({ value, label: value }))} />
                  <Select allowClear showSearch placeholder="全部国家" value={markupFilters.destinationCountry} onChange={(value) => setMarkupFilters((current) => ({ ...current, destinationCountry: value }))} options={markupFilterOptions.destinationCountries.map((value) => ({ value, label: value }))} />
                  <Select value={markupFilters.status ?? 'ALL'} onChange={(value) => setMarkupFilters((current) => ({ ...current, status: value }))} options={[{ value: 'ALL', label: '全部' }, { value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} />
                  <Button htmlType="button" type="primary" onClick={applyMarkupFilters}>查询</Button>
                  <Button htmlType="button" onClick={resetMarkupFilters}>重置</Button>
                </div> : null}
              <ManagedTable
                recordDetail={{ title: '代理加价规则详情' }}
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
                columns={markupModule === 'dubaiAirSea' ? [
                  { title: '代理简称', dataIndex: 'agentName', width: 160, fixed: 'left' },
                  { title: '来源价格表', width: 300, render: (_, rule) => renderMarkupSource(rule) },
                  { title: '适用范围', width: 180, render: () => <Text strong>海运主运费</Text> },
                  { title: '加价逻辑', width: 220, render: (_, rule) => renderMarkupDisplay(rule) },
                  { title: '后续导入', width: 200, render: () => <Tag color="blue">自动沿用当前规则</Tag> },
                  { title: '最近修改', dataIndex: 'updatedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
                  { title: '状态', dataIndex: 'enabled', width: 90, render: () => <Tag color="green">启用</Tag> },
                  {
                    title: '操作',
                    width: 120,
                    fixed: 'right',
                    render: (_, rule) => canUpdateMarkup ? (
                      <Button htmlType="button" size="small" onClick={(event) => { event.stopPropagation(); openDubaiSeaMarkupRuleEditor(rule); }}>调整加价</Button>
                    ) : <Text type="secondary">只读</Text>
                  }
                ] : [
                  { title: '代理简称', dataIndex: 'agentName', width: 180, fixed: 'left' },
                  { title: '来源价格表', width: 260, render: (_, rule) => renderMarkupSource(rule) },
                  { title: '线路 / 报价', width: 210, render: (_, rule) => <Space direction="vertical" size={0}><Text strong>{rule.activeRouteCount ?? '—'} 条线路 / {rule.activeQuoteRowCount ?? rule.activeLineCount ?? 0} 条报价</Text><Text type="secondary">KG {rule.activeKgQuoteRowCount ?? rule.activeLineCount ?? 0} 条 · CBM {rule.activeCbmQuoteRowCount ?? 0} 条</Text></Space> },
                  { title: '规则构成', dataIndex: 'ruleCount', width: 130, render: (value: number | undefined, rule) => <Button className="pricing-markup-rule-entry" type="link" size="small" icon={<Eye size={13} />} onClick={(event) => { event.stopPropagation(); openMarkupRuleDetails(rule); }}>查看 {value ?? 1} 项</Button> },
                  { title: '加价状态', width: 160, render: (_, rule) => renderMarkupDisplay(rule) },
                  { title: '最高优先级', dataIndex: 'priority', width: 110 },
                  { title: '最近修改', dataIndex: 'updatedAt', width: 160, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
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
                          onClick={(event) => {
                            event.stopPropagation();
                            openMarkupChannelDetail(rule);
                          }}
                        >
                          查看线路
                        </Button>
                        {canUpdateMarkup || canChangeMarkupStatus || canDeleteMarkup ? <Dropdown
                          trigger={['click']}
                          menu={{
                            items: [
                              ...(canUpdateMarkup ? [{ key: 'edit', label: '编辑', disabled: rule.isPriceBookGroup || markupBatchLoading }] : []),
                              ...(canChangeMarkupStatus ? [{ key: 'toggle', label: rule.enabled ? '停用' : '启用', disabled: rule.isPriceBookGroup || markupBatchLoading }] : []),
                              ...(canDeleteMarkup ? [{ type: 'divider' as const }, { key: 'delete', label: '删除', danger: true, disabled: rule.isPriceBookGroup || markupBatchLoading }] : [])
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
                        </Dropdown> : null}
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
              priceBookManagementModule === 'southAfrica' ? (
                <Space>
                  <Tag color="blue">南非专线查询</Tag>
                  {canViewSouthAfricaCostMarkup && can('pricing:markup:southAfrica:edit') ? <Button htmlType="button" type="primary" size="small" onClick={openCreateSouthAfricaRateRule}>新增物料规则</Button> : null}
                </Space>
              ) : <PriceBookManagementToolbar
                module={priceBookManagementModule}
                can={can}
                importAgentId={priceBookImportAgentId}
                importAgentOptions={enabledAgentOptions}
                importing={priceBookImporting}
                importHistoryLoading={priceBookImportHistoryLoading}
                syncHealthLoading={pricingSyncHealthLoading}
                selectedCount={selectedPriceBookIds.length}
                fileInputRef={priceBookFileInputRef}
                onImportAgentChange={setPriceBookImportAgentId}
                onLoadImportHistory={() => void loadPriceBookImportHistory(1)}
                onOpenSyncHealth={() => void openPricingSyncHealth()}
                onFileChange={(event) => void handlePriceFileChange(event)}
                onDownload={() => void downloadSelectedPriceBook()}
                onEditRemark={openEditPriceBookRemark}
                onDelete={deleteSelectedPriceBooks}
              />
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
              <Button
                htmlType="button"
                type={priceBookManagementModule === 'unclassified' ? 'primary' : 'default'}
                onClick={() => {
                  setPriceBookManagementModule('unclassified');
                  setPriceBookManagementFilters({ agentName: 'ALL', keyword: '' });
                }}
              >
                未归类数据
              </Button>
            </div>
            {priceBookManagementModule === 'southAfrica' ? renderSouthAfricaRuleManagement() : <>
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
            <PriceBookManagementStatus
              unclassified={priceBookManagementModule === 'unclassified'}
              loading={priceBookManagementLoading}
              slowLoading={priceBookManagementSlowLoading}
              loadError={priceBookManagementLoadError}
              onReload={() => setPriceBookManagementReloadVersion((version) => version + 1)}
              ruleRefresh={activePriceBookRuleRefresh}
              importJob={priceBookImportJob}
            />
            <ManagedTable
              recordDetail={{ title: '价格表详情' }}
              rowKey="id"
              size="small"
              pagination={tenRowTablePagination}
              loading={priceBookManagementLoading}
              dataSource={filteredManagedPriceBooks}
              rowSelection={priceBookManagementRowSelection}
              scroll={{ x: 1640 }}
              columns={priceBookManagementColumns}
            />
            {priceBookManagementModule === 'dubaiAirSea' && can('pricing:price-books:view') ? (
              <div className="pricing-dubai-display-admin">
                <div className="pricing-section-title-row">
                  <div>
                    <Text strong>迪拜业务价格图片版本</Text>
                    <div><Text type="secondary">空运按原表生成；海运只调整主运费单价后生成业务图片。双击任意已完成版本可查看全部原始图片，包括查价页未展示的页面。</Text></div>
                  </div>
                </div>
                <ManagedTable<DubaiPriceDisplayVersionSummary>
                  recordDetail={{ title: '迪拜价格展示版本详情' }}
                  rowKey="id"
                  size="small"
                  pagination={tenRowTablePagination}
                  dataSource={dubaiDisplayVersions}
                  onRow={(record) => ({
                    title: record.status === 'READY' ? '双击查看全部原始图片' : '当前版本尚未完成转换',
                    onDoubleClick: (event) => {
                      const target = event.target;
                      if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea, [role="button"]')) return;
                      event.preventDefault();
                      openDubaiDisplayVersionPreview(record);
                    }
                  })}
                  columns={[
                    { title: '原文件', dataIndex: 'originalName', width: 260 },
                    { title: '转换状态', dataIndex: 'status', width: 120, render: (value: string) => <Tag color={value === 'READY' ? 'green' : value === 'FAILED' ? 'red' : 'blue'}>{value === 'READY' ? '已完成' : value === 'FAILED' ? '失败' : '转换中'}</Tag> },
                    { title: '页面', width: 160, render: (_value, record) => `空运 ${record.pages.filter((page) => page.mode === 'AIR').length} 页 / 海运 ${record.pages.filter((page) => page.mode === 'SEA').length} 页` },
                    ...(can('pricing:markup:dubaiAirSea:view') ? [{
                      title: '海运价格规则',
                      width: 190,
                      render: (_value: unknown, record: DubaiPriceDisplayVersionSummary) => record.pages.some((page) => page.mode === 'SEA') ? (
                        <Space size={4} wrap>
                          <Text strong>{record.seaMarkupPerCbm === undefined ? '-' : `+${formatCurrency(record.seaMarkupPerCbm)}/CBM`}</Text>
                          <Tag color={record.seaMarkupApplied ? 'green' : 'red'}>{record.seaMarkupApplied ? '已应用' : '未应用'}</Tag>
                        </Space>
                      ) : <Text type="secondary">不适用</Text>
                    }] : []),
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
                      title: '操作', width: 220, fixed: 'right',
                      render: (_value, record) => (
                        <Space size={4} wrap>
                          {record.status === 'READY' && record.isActiveSea && can('pricing:markup:dubaiAirSea:edit') ? (
                            <Button htmlType="button" size="small" onClick={() => openDubaiSeaMarkupEditor(record)}>调整海运价格</Button>
                          ) : null}
                          {record.status === 'FAILED' && can('pricing:price-books:update') ? (
                            <Button htmlType="button" size="small" onClick={() => {
                          void apiClient.retryDubaiPriceDisplayVersion(record.id)
                            .then((response) => { setDubaiDisplayVersions(response.versions); onNotice('迪拜价格表图片已重新生成'); })
                            .catch((error) => onNotice(error instanceof Error ? error.message : '重新生成图片失败'));
                            }}>重新生成图片</Button>
                          ) : null}
                          {record.status === 'READY' && !record.isActiveAir && !record.isActiveSea && can('pricing:price-books:update') ? (
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
                          ) : null}
                          {record.status === 'READY' && (record.isActiveAir || record.isActiveSea) && !(record.isActiveSea && can('pricing:markup:dubaiAirSea:edit')) ? <Text type="secondary">当前版本</Text> : null}
                        </Space>
                      )
                    }
                  ]}
                />
              </div>
            ) : null}
            </>}
          </Card>
      ) : null}
      </ModuleSubWorkspace>

      <Modal
        title={selectedDubaiDisplayVersion ? `完整原始图片 · ${selectedDubaiDisplayVersion.originalName}` : '完整原始图片'}
        open={Boolean(selectedDubaiDisplayVersion)}
        destroyOnHidden
        width="96vw"
        className="pricing-dubai-management-preview-modal"
        footer={<Button htmlType="button" type="primary" onClick={() => setSelectedDubaiDisplayVersion(null)}>关闭</Button>}
        onCancel={() => setSelectedDubaiDisplayVersion(null)}
      >
        <Alert
          type="info"
          showIcon
          message="这里保留并展示当前版本的全部转换图片"
          description="包含查价页未展示的空运第1、2页和海运第1、2页等页面；图片按原始分辨率展示，可在窗口内滚动查看。"
        />
        {dubaiVersionPreviewError ? <Alert className="pricing-dubai-management-preview-error" type="error" showIcon message={dubaiVersionPreviewError} /> : null}
        {dubaiVersionPreviewLoading ? (
          <div className="pricing-empty-result pricing-empty-result-compact"><Spin size="small" /></div>
        ) : selectedDubaiDisplayVersion ? (
          <div className="pricing-dubai-management-preview-scroll">
            {(['AIR', 'SEA'] as const).map((mode) => {
              const pages = selectedDubaiDisplayVersion.pages
                .filter((page) => page.mode === mode)
                .sort((left, right) => left.sheetName.localeCompare(right.sheetName) || left.pageNo - right.pageNo);
              if (!pages.length) return null;
              return (
                <section key={mode} className="pricing-dubai-management-preview-section">
                  <div className="pricing-dubai-management-preview-heading">{mode === 'AIR' ? '空运全部页面' : '海运全部页面'} · 共 {pages.length} 页</div>
                  {pages.map((page) => dubaiVersionImageObjectUrls[page.id] ? (
                    <figure key={page.id} className="pricing-dubai-management-preview-page">
                      <figcaption>{page.sheetName} · 原第 {page.pageNo} 页</figcaption>
                      <img src={dubaiVersionImageObjectUrls[page.id]} alt={`${mode === 'AIR' ? '空运' : '海运'}原始图片第 ${page.pageNo} 页`} />
                    </figure>
                  ) : null)}
                </section>
              );
            })}
          </div>
        ) : null}
      </Modal>

      <Modal
        title="编辑代理默认备注"
        open={priceBookRemarkModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitPriceBookRemark()}
        onCancel={() => setPriceBookRemarkModalOpen(false)}
      >
        <Form form={priceBookRemarkForm} name="priceBookRemarkForm" layout="vertical">
          <Alert
            type="info"
            showIcon
            message={`固定范围：${selectedPriceBookRemarkScope}`}
            description="保存后，该备注会固定用于同一代理和查价模块；即使删除当前价格表，下次上传仍会自动带入。清空并保存可取消固定备注。"
          />
          <Form.Item name="customRemark" label="默认备注" style={{ marginTop: 16 }}>
            <Input.TextArea rows={5} placeholder="填写业务查价时需单独展示的默认备注，不会并入渠道要求" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="调整迪拜海运业务价格"
        open={Boolean(editingDubaiMarkupVersion)}
        destroyOnHidden
        width={480}
        okText="生成新图片"
        cancelText="取消"
        confirmLoading={dubaiMarkupSaving}
        onOk={() => void saveDubaiSeaMarkup()}
        onCancel={() => {
          if (!dubaiMarkupSaving) {
            setEditingDubaiMarkupVersion(null);
            dubaiSeaMarkupForm.resetFields();
          }
        }}
      >
        <Alert
          type="info"
          showIcon
          message="系统从原始价格表重新生成海运图片"
          description="只调整海运主运费单价；空运价格和报关、派送、大件操作等附加费用保持不变。生成成功后自动替换当前海运图片。"
        />
        <Form form={dubaiSeaMarkupForm} name="dubaiSeaMarkupForm" layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="seaMarkupPerCbm"
            label="海运主运费调整"
            rules={[{ required: true, message: '请输入海运主运费调整金额' }]}
          >
            <InputNumber min={0.01} max={1000} precision={2} addonAfter="RMB/CBM" style={{ width: '100%' }} />
          </Form.Item>
          <Text type="secondary">该配置及原始价格仅限价格管理人员查看。</Text>
        </Form>
      </Modal>

      <Modal
        title={`${editingSouthAfricaRule ? '修改' : '新增'}南非物料价格规则`}
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
        <Form form={southAfricaRateRuleForm} name="southAfricaRateRuleForm" layout="vertical">
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
            <Col xs={24} md={canViewSouthAfricaCostMarkup ? 8 : 24}>
              <Form.Item name="pricingMode" label="报价方式" rules={[{ required: true, message: '请选择报价方式' }]}>
                <Select options={[{ value: 'fixed', label: '固定运费/CBM' }, { value: 'consult', label: '需单独咨询' }]} />
              </Form.Item>
            </Col>
            {canViewSouthAfricaCostMarkup ? <Col xs={24} md={8}>
              <Form.Item
                name="costPerCbm"
                label="成本价/CBM"
                dependencies={['markupPerCbm', 'pricingMode']}
                rules={[{
                  validator: async (_rule, value) => {
                    if (southAfricaPricingMode === 'consult') return;
                    const markup = southAfricaRateRuleForm.getFieldValue('markupPerCbm');
                    if (value === undefined && markup === undefined && editingSouthAfricaRule?.ratePerCbm !== undefined) return;
                    if (value === undefined || markup === undefined) throw new Error('成本价和加价必须同时填写');
                    if (Number(value) > 0) return;
                    throw new Error('成本价必须大于 0');
                  }
                }]}
              >
                <InputNumber min={0} precision={2} disabled={southAfricaPricingMode === 'consult'} className="full-width" placeholder={southAfricaPricingMode === 'consult' ? '无需填写' : '例如 3000'} />
              </Form.Item>
            </Col> : null}
            {canViewSouthAfricaCostMarkup ? <Col xs={24} md={8}>
              <Form.Item
                name="markupPerCbm"
                label="加价/CBM"
                dependencies={['costPerCbm', 'pricingMode']}
                rules={[{
                  validator: async (_rule, value) => {
                    if (southAfricaPricingMode === 'consult') return;
                    const cost = southAfricaRateRuleForm.getFieldValue('costPerCbm');
                    if (value === undefined && cost === undefined && editingSouthAfricaRule?.ratePerCbm !== undefined) return;
                    if (value === undefined || cost === undefined) throw new Error('成本价和加价必须同时填写');
                    if (Number(value) >= 0) return;
                    throw new Error('加价不能小于 0');
                  }
                }]}
              >
                <InputNumber min={0} precision={2} disabled={southAfricaPricingMode === 'consult'} className="full-width" placeholder={southAfricaPricingMode === 'consult' ? '无需填写' : '例如 500'} />
              </Form.Item>
            </Col> : null}
          </Row>
          {canViewSouthAfricaCostMarkup && southAfricaPricingMode === 'fixed' ? (
            <div className="pricing-south-africa-price-equation" role="status">
              <Text type="secondary">最终查价</Text>
              <Text strong>
                {southAfricaCostPerCbm !== undefined && southAfricaMarkupPerCbm !== undefined
                  ? `${formatCurrency(Number(southAfricaCostPerCbm) + Number(southAfricaMarkupPerCbm))}/CBM`
                  : editingSouthAfricaRule?.ratePerCbm !== undefined
                    ? `${formatCurrency(editingSouthAfricaRule.ratePerCbm)}/CBM（保留原报价）`
                    : '补齐成本价和加价后自动计算'}
              </Text>
            </div>
          ) : null}
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
            recordDetail={{ title: '价格同步健康详情' }}
            rowKey="id"
            size="small"
            loading={pricingSyncHealthLoading}
            pagination={paginationWhenNeeded(pricingSyncHealthPagination.totalItems, {
              current: pricingSyncHealthPagination.page,
              pageSize: pricingSyncHealthPagination.pageSize,
              total: pricingSyncHealthPagination.totalItems,
              showSizeChanger: true,
              pageSizeOptions: ['10', '30', '50', '100'],
              onChange: (page, pageSize) => {
                void loadPricingSyncHealth(page, pageSize);
              }
            })}
            dataSource={pricingSyncHealthRows}
            sticky={false}
            resizableColumns={false}
            columnSettings={false}
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
            recordDetail={{ title: '失效加价规则详情' }}
            rowKey="id"
            size="small"
            pagination={paginationWhenNeeded(pricingSyncOrphanRules.length)}
            dataSource={pricingSyncOrphanRules}
            sticky={false}
            minimumScrollX={0}
            resizableColumns={false}
            columnSettings={false}
            tableLayout="fixed"
            columns={[
              { title: '代理简称', dataIndex: 'agentName', width: 180 },
              { title: '加价规则', width: 140, render: (_, rule) => <Text strong>{formatMarkupValue(rule)}</Text> },
              { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
              { title: '说明', render: () => <Text type="secondary">价格表已删除，或当前有效 xls 中没有该代理报价行</Text> }
            ]}
          />
        </Space>
      </Modal>

      <Modal
        title={expandedMarkupGroup ? `规则明细 · ${expandedMarkupGroup.agentName}` : '规则明细'}
        open={Boolean(expandedMarkupGroup)}
        destroyOnHidden
        width="calc(100vw - 64px)"
        className="pricing-markup-rule-modal"
        styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', padding: 12 } }}
        footer={<Button htmlType="button" type="primary" onClick={closeMarkupRuleDetails}>关闭</Button>}
        onCancel={closeMarkupRuleDetails}
      >
        {expandedMarkupGroup ? renderExpandedMarkupRuleTable(expandedMarkupGroup) : null}
      </Modal>

      <Modal
        title="线路阶梯加价"
        open={markupRouteEditorOpen}
        destroyOnHidden
        closable={false}
        maskClosable={false}
        footer={null}
        width="calc(100vw - 48px)"
        styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', padding: 20 } }}
        onCancel={() => {
          setMarkupRouteEditorOpen(false);
          setMarkupRouteEditorContext(null);
        }}
      >
        {markupRouteEditorContext ? <MarkupRouteEditor
          apiClient={apiClient}
          permissions={permissions}
          onNotice={onNotice}
          context={markupRouteEditorContext}
          moduleEditBlocked={!canMaintainMarkupTier}
          embedded
          onClose={() => {
            setMarkupRouteEditorOpen(false);
            setMarkupRouteEditorContext(null);
          }}
        /> : null}
      </Modal>

      <Modal
        title={editingMarkupRule ? '修改代理加价' : '新增代理加价'}
        open={markupModalOpen}
        destroyOnHidden
        width={960}
        className="pricing-markup-edit-modal"
        okText={editingMarkupRule ? '保存修改' : '新增规则'}
        cancelText="取消"
        confirmLoading={markupSaving}
        onOk={() => void handleSubmitMarkupRule()}
        onCancel={() => {
          if (!markupSaving) {
            setMarkupModalOpen(false);
          }
        }}
      >
        <Form form={markupForm} name="markupRuleForm" layout="vertical" className="pricing-markup-edit-form">
          <div className="pricing-markup-edit-summary">
            <Tag color="blue">{getLegacyModuleLabel(markupModule)}</Tag>
            <div>
              <Text strong>{markupAgentNameValue?.trim() || '待选择代理'}</Text>
              <Text type="secondary">
                作用范围：{markupDestinationCountryValue?.trim() || '全部国家'} · {markupRealChannelNameValue?.trim() || markupChannelNameValue?.trim() || '全部线路'}
              </Text>
            </div>
          </div>

          <section className="pricing-markup-edit-section" aria-labelledby="pricing-markup-basic-title">
            <div className="pricing-markup-edit-section-head">
              <Text strong id="pricing-markup-basic-title">基础信息</Text>
              <Text type="secondary">确认报价来源与代理归属</Text>
            </div>
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item label="查价大类">
                  <Input value={getLegacyModuleLabel(markupModule)} readOnly />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="priceBookId" label="来源价格表（可选）">
                  <Select
                    allowClear
                    showSearch
                    placeholder="当前大类全部价格表"
                    optionFilterProp="label"
                    options={markupModulePriceBooks.map((book) => ({ value: book.id, label: book.fileName }))}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="agentName" label="代理简称" rules={[{ required: true, whitespace: true, message: '请选择代理简称' }]}>
                  <Select
                    showSearch
                    placeholder="选择基础资料代理简称"
                    optionFilterProp="label"
                    options={markupAgentOptions}
                  />
                </Form.Item>
              </Col>
            </Row>
          </section>

          <section className="pricing-markup-edit-section" aria-labelledby="pricing-markup-scope-title">
            <div className="pricing-markup-edit-section-head">
              <Text strong id="pricing-markup-scope-title">适用范围</Text>
              <Text type="secondary">留空表示该代理的全部范围</Text>
            </div>
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="channelName" label="渠道（可选）">
                  <Input placeholder="例如 海运洛杉矶专线" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="realChannelName" label="线路自定义（可选）">
                  <Input placeholder="例如 DHK03；优先于渠道统一加价" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="destinationCountry" label="国家（可选）">
                  <Input placeholder="例如 美国；为空表示全部国家" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <div className="pricing-markup-edit-scope-note">
                  <Text type="secondary">当前生效范围</Text>
                  <Text strong>{markupDestinationCountryValue?.trim() || '全部国家'} · {markupRealChannelNameValue?.trim() || markupChannelNameValue?.trim() || '全部线路'}</Text>
                </div>
              </Col>
            </Row>
          </section>

          <section className="pricing-markup-edit-section" aria-labelledby="pricing-markup-value-title">
            <div className="pricing-markup-edit-section-head">
              <Text strong id="pricing-markup-value-title">加价设置</Text>
              <Text type="secondary">设置计算方式、加价值与规则优先级</Text>
            </div>
            <Row gutter={12}>
              <Col xs={24} sm={12} lg={6}>
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
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="markupValue" label={getMarkupValueFieldMeta(markupTypeValue).label} rules={[{ required: true, message: '请输入加价值' }]}>
                  <InputNumber min={0} precision={2} addonAfter={getMarkupValueFieldMeta(markupTypeValue).unit} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请输入优先级' }]}>
                  <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="enabled" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <select className="native-select" aria-label="加价规则状态">
                    <option value="true">启用</option>
                    <option value="false">停用</option>
                  </select>
                </Form.Item>
              </Col>
            </Row>
          </section>
          <Form.Item name="markupPerKg" hidden>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </AppPage>
  );
}
