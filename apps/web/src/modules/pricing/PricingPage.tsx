import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { AlertTriangle, Banknote, CheckCircle2, Copy, Download, Eye, FileInput, PackageCheck, Power, RefreshCw, Search, Settings, SlidersHorizontal, Star, Trash2 } from 'lucide-react';
import type { AgentMarkupListQuery, AgentMarkupListResponse, AgentMarkupMetrics, AgentMarkupSummary, AgentMarkupType, PriceBookImportInput, PriceBookSummary, PriceLookupRecommendation, PriceLookupResponse, QuoteSourceType, StaffRoleKey } from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { loadExcel } from '../shared/excel';
import { formatCurrency } from '../shared/format';
import { AppActionGroup, AppPage, AppPageHeader, MetricCard, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import { calculatePriceChargeableWeight, parsePriceWorkbook, seedImportedPriceRows, type ImportedPriceRow, type PriceLookupFormValues } from './excel';

const { Title, Text } = Typography;

interface AgentMarkupFormValues {
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
  remark?: string;
}

type AgentMarkupRule = AgentMarkupSummary;
type PriceBookRecord = PriceBookSummary;
type PriceRecommendation = PriceLookupRecommendation;
type PriceLookupResult = PriceLookupResponse;
type RecommendationFilter = 'ALL' | 'RECOMMENDED' | 'CHEAPEST' | 'FASTEST' | 'NOTED' | 'TAXED' | 'UNTAXED';

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

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('无法读取价格表文件'));
    };
    reader.onerror = () => reject(new Error('无法读取价格表文件'));
    reader.readAsArrayBuffer(file);
  });
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

function getMarkupTypeLabel(type?: AgentMarkupType) {
  const labels: Record<AgentMarkupType, string> = {
    WEIGHT: '按重量',
    PER_SHIPMENT: '按票',
    FIXED: '固定金额',
    PERCENT: '按比例'
  };
  return labels[type ?? 'WEIGHT'];
}

function getQuoteSourceLabel(sourceType: QuoteSourceType) {
  return sourceType === 'agentApi' ? '代理接口' : '本地价格表';
}

function hasLookupNotes(item: PriceRecommendation) {
  return Boolean(item.remark || item.productSurchargeRemark || item.specialRemark);
}

function hasTaxText(item: PriceRecommendation) {
  return /包税|含税/.test(`${item.channelName} ${item.realChannelName} ${item.remark ?? ''}`);
}

function hasUntaxedText(item: PriceRecommendation) {
  return /不包税|不含税/.test(`${item.channelName} ${item.realChannelName} ${item.remark ?? ''}`);
}

function getRecommendationTaxTag(item: PriceRecommendation) {
  if (hasUntaxedText(item)) {
    return <Tag>不含税</Tag>;
  }
  if (hasTaxText(item)) {
    return <Tag color="blue">含税</Tag>;
  }
  return null;
}

function buildQuoteCopyText(item: PriceRecommendation) {
  return [
    `渠道：${item.channelName}`,
    `承运商：${item.carrierName}`,
    `重量段：${item.weightSegmentLabel}`,
    `时效：${item.transitLabel}`,
    `单价：${formatKgCurrencyRate(item.salesRatePerKg)}/kg`,
    `总价：${formatCurrency(item.totalSales)}`,
    item.remark ? `备注：${item.remark}` : undefined
  ].filter(Boolean).join('\n');
}

function isPostalCodeRequired(country?: string) {
  return /美国|加拿大|英国|德国|法国|US|USA|CA|UK|DE|FR/i.test(country?.trim() ?? '');
}

function isAgentLevelMarkupRule(rule: AgentMarkupRule) {
  return !rule.channelName && !rule.realChannelName && !rule.destinationCountry;
}

function buildMissingImportedMarkupRules(rows: ImportedPriceRow[], rules: AgentMarkupRule[]) {
  const existingAgents = new Set(rules.filter((rule) => !rule.channelName && rule.enabled).map((rule) => rule.agentName));
  const fallbackByAgent = new Map(rules.filter((rule) => !rule.channelName).map((rule) => [rule.agentName, rule.markupPerKg]));
  const missing: AgentMarkupFormValues[] = [];
  for (const row of rows) {
    if (existingAgents.has(row.agentName)) {
      continue;
    }
    existingAgents.add(row.agentName);
    missing.push({
      agentName: row.agentName,
      channelName: undefined,
      realChannelName: undefined,
      destinationCountry: undefined,
      markupType: 'WEIGHT',
      markupValue: fallbackByAgent.get(row.agentName) ?? 0.5,
      markupPerKg: fallbackByAgent.get(row.agentName) ?? 0.5,
      priority: 100,
      enabled: 'true'
    });
  }
  return missing;
}

function findImportedMarkupRule(rows: ImportedPriceRow[], rules: AgentMarkupRule[]) {
  return rules.find((rule) => !rule.channelName && rule.enabled && rows.some((row) => rule.agentName === row.agentName));
}

export function PricingPage({
  apiClient,
  role,
  notice,
  onNotice
}: {
  apiClient: ApiClient;
  role: StaffRoleKey;
  notice: string | null;
  onNotice: (message: string | null) => void;
}) {
  const [lookupForm] = Form.useForm<PriceLookupFormValues>();
  const [markupForm] = Form.useForm<AgentMarkupFormValues>();
  const [priceBookRemarkForm] = Form.useForm<PriceBookRemarkFormValues>();
  const [priceRows, setPriceRows] = useState<ImportedPriceRow[]>(() => [...seedImportedPriceRows]);
  const [priceBooks, setPriceBooks] = useState<PriceBookRecord[]>([]);
  const [markupRules, setMarkupRules] = useState<AgentMarkupRule[]>([]);
  const [markupDetailRules, setMarkupDetailRules] = useState<AgentMarkupRule[]>([]);
  const [markupMetrics, setMarkupMetrics] = useState<AgentMarkupMetrics>({ totalRules: 0, enabledRules: 0, disabledRules: 0, unmatchedQuotes: 0 });
  const [markupFilters, setMarkupFilters] = useState<AgentMarkupListQuery>({ status: 'ALL', page: 1, pageSize: 20 });
  const [selectedMarkupRuleIds, setSelectedMarkupRuleIds] = useState<string[]>([]);
  const [markupPage, setMarkupPage] = useState(1);
  const [selectedPriceBookId, setSelectedPriceBookId] = useState<string | null>(null);
  const [editingMarkupRule, setEditingMarkupRule] = useState<AgentMarkupRule | null>(null);
  const [markupModalOpen, setMarkupModalOpen] = useState(false);
  const [markupChannelDetailOpen, setMarkupChannelDetailOpen] = useState(false);
  const [markupChannelRule, setMarkupChannelRule] = useState<AgentMarkupRule | null>(null);
  const [markupSheetFilter, setMarkupSheetFilter] = useState('ALL');
  const [batchMarkupPerKg, setBatchMarkupPerKg] = useState(0.5);
  const [priceBookRemarkModalOpen, setPriceBookRemarkModalOpen] = useState(false);
  const [lookupResult, setLookupResult] = useState<PriceLookupResult | null>(null);
  const [selectedPriceRecommendation, setSelectedPriceRecommendation] = useState<PriceRecommendation | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>('ALL');
  const [chargeableWeightManual, setChargeableWeightManual] = useState(false);
  const [todayLookupCount, setTodayLookupCount] = useState(0);
  const agentMarkupRules = useMemo(() => {
    return markupRules.filter(isAgentLevelMarkupRule);
  }, [markupRules]);
  const markupAgentOptions = useMemo(() => {
    const agents = new Set<string>();
    priceRows.forEach((row) => {
      if (row.agentName?.trim()) {
        agents.add(row.agentName.trim());
      }
    });
    markupRules.forEach((rule) => {
      if (rule.agentName?.trim()) {
        agents.add(rule.agentName.trim());
      }
    });
    return Array.from(agents)
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))
      .map((value) => ({ value, label: value }));
  }, [markupRules, priceRows]);
  const selectedVisibleMarkupRuleIds = selectedMarkupRuleIds.filter((id) => markupRules.some((rule) => rule.id === id));
  const selectedMarkupRule = markupRules.find((rule) => rule.id === selectedVisibleMarkupRuleIds[0]) ?? null;
  const selectedMarkupRules = markupRules.filter((rule) => selectedVisibleMarkupRuleIds.includes(rule.id));
  const selectedPriceBook = priceBooks.find((book) => book.id === selectedPriceBookId) ?? null;
  const activeMarkupChannelRule = markupChannelRule ?? selectedMarkupRule;
  const selectedMarkupChannelRows = activeMarkupChannelRule
    ? priceRows.filter((row) =>
        row.agentName === activeMarkupChannelRule.agentName &&
        (!activeMarkupChannelRule.channelName || row.channelName === activeMarkupChannelRule.channelName)
      )
    : [];
  const getMarkupRowSmallTableName = (row: ImportedPriceRow) => row.sourceSheetName?.trim() || row.channelName?.trim() || '未标记小表';
  const selectedMarkupSheetOptions = Array.from(
    new Set(selectedMarkupChannelRows.map(getMarkupRowSmallTableName))
  ).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const filteredMarkupChannelRows = selectedMarkupChannelRows.filter((row) => {
    return markupSheetFilter === 'ALL' || getMarkupRowSmallTableName(row) === markupSheetFilter;
  });
  const canViewMarkupDetails = role === 'ADMIN';
  const pricingSubItems = [
    { key: 'lookup', label: '查价', description: '业务员报价查询' },
    ...(canViewMarkupDetails
      ? [
          { key: 'markup', label: '代理加价规则', description: '维护业务员加价' },
          { key: 'priceBooks', label: '价格表管理', description: '导入与备注维护' }
        ]
      : [])
  ];
  const [activePricingSection, setActivePricingSection] = useState('lookup');
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
  const calculatedChargeableWeight = calculatePriceChargeableWeight({
    volumeCbm,
    actualWeightKg,
    lengthCm,
    widthCm,
    heightCm,
    packageCount,
    unitActualWeightKg
  });
  useEffect(() => {
    if (!chargeableWeightManual && calculatedChargeableWeight > 0) {
      lookupForm.setFieldValue('chargeableWeightKg', calculatedChargeableWeight);
    }
  }, [calculatedChargeableWeight, chargeableWeightManual, lookupForm]);

  const postalRequired = isPostalCodeRequired(destinationCountryValue);
  const canRunLookup = Boolean(destinationCountryValue?.trim()) && Number(chargeableWeightValue) > 0 && (!postalRequired || Boolean(postalCodeValue?.trim()));

  const sortedRecommendations = useMemo(() => {
    return [...(lookupResult?.recommendations ?? [])].sort((left, right) => left.totalSales - right.totalSales);
  }, [lookupResult]);
  const recommendedQuote = sortedRecommendations[0] ?? null;
  const cheapestQuoteIds = useMemo(() => new Set((lookupResult?.cheapestRecommendations ?? []).map((item) => item.price.id)), [lookupResult]);
  const fastestQuoteIds = useMemo(() => new Set((lookupResult?.fastestRecommendations ?? []).map((item) => item.price.id)), [lookupResult]);
  const highlightedQuote = useMemo(() => {
    if (recommendationFilter === 'FASTEST') {
      return lookupResult?.fastestRecommendations[0] ?? recommendedQuote;
    }
    if (recommendationFilter === 'CHEAPEST') {
      return lookupResult?.cheapestRecommendations[0] ?? recommendedQuote;
    }
    if (recommendationFilter === 'NOTED') {
      return sortedRecommendations.find(hasLookupNotes) ?? recommendedQuote;
    }
    if (recommendationFilter === 'TAXED') {
      return sortedRecommendations.find(hasTaxText) ?? recommendedQuote;
    }
    if (recommendationFilter === 'UNTAXED') {
      return sortedRecommendations.find(hasUntaxedText) ?? recommendedQuote;
    }
    return recommendedQuote;
  }, [lookupResult, recommendationFilter, recommendedQuote, sortedRecommendations]);
  const filteredRecommendations = useMemo(() => {
    return sortedRecommendations.filter((item) => {
      if (recommendationFilter === 'RECOMMENDED') {
        return item.price.id === recommendedQuote?.price.id;
      }
      if (recommendationFilter === 'CHEAPEST') {
        return cheapestQuoteIds.has(item.price.id);
      }
      if (recommendationFilter === 'FASTEST') {
        return fastestQuoteIds.has(item.price.id);
      }
      if (recommendationFilter === 'NOTED') {
        return hasLookupNotes(item);
      }
      if (recommendationFilter === 'TAXED') {
        return hasTaxText(item);
      }
      if (recommendationFilter === 'UNTAXED') {
        return hasUntaxedText(item);
      }
      return true;
    });
  }, [cheapestQuoteIds, fastestQuoteIds, recommendationFilter, recommendedQuote, sortedRecommendations]);

  useEffect(() => {
    let alive = true;
    if (!canViewMarkupDetails) {
      setPriceBooks([]);
      setPriceRows([]);
      return () => {
        alive = false;
      };
    }
    Promise.all([
      apiClient.priceBooks(),
      apiClient.agentMarkupRules({ page: 1, pageSize: 200, status: 'ALL' }),
      apiClient.agentMarkupRules({ page: 1, pageSize: -1, status: 'ALL', detail: true })
    ])
      .then(([response, rules, detailRules]) => {
        if (!alive) {
          return;
        }
        const markupRows = readAgentMarkupRows(rules);
        setPriceBooks(response.books);
        setPriceRows([...response.rows, ...seedImportedPriceRows]);
        setMarkupRules(markupRows);
        setMarkupDetailRules(readAgentMarkupRows(detailRules));
        setMarkupMetrics(readAgentMarkupMetrics(rules));
      })
      .catch((error) => {
        if (alive) {
          onNotice(error instanceof Error ? `价格与加价规则加载失败：${error.message}` : '价格与加价规则加载失败');
        }
      });
    return () => {
      alive = false;
    };
  }, [apiClient, canViewMarkupDetails, onNotice]);

  function reloadMarkupRules(nextFilters: AgentMarkupListQuery = markupFilters) {
    return Promise.all([
      apiClient.agentMarkupRules({ ...nextFilters, page: 1, pageSize: 200 }),
      apiClient.agentMarkupRules({ ...nextFilters, page: 1, pageSize: -1, detail: true })
    ]).then(([response, detailResponse]) => {
      const rows = readAgentMarkupRows(response);
      setMarkupRules(rows);
      setMarkupDetailRules(readAgentMarkupRows(detailResponse));
      setMarkupMetrics(readAgentMarkupMetrics(response));
      setMarkupFilters({ ...nextFilters, page: 1, pageSize: 20 });
      setSelectedMarkupRuleIds((current) => current.filter((id) => rows.some((rule) => rule.id === id)));
      return response;
    });
  }

  function openCreateMarkupRule() {
    setEditingMarkupRule(null);
    markupForm.setFieldsValue({ agentName: '', channelName: '', realChannelName: '', destinationCountry: '', markupType: 'WEIGHT', markupValue: 0.5, markupPerKg: 0.5, priority: 100, enabled: 'true' });
    setMarkupModalOpen(true);
  }

  function openEditMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    openEditSpecificMarkupRule(resolveConcreteMarkupRule(selectedMarkupRule));
  }

  function openMarkupChannelDetail(rule = selectedMarkupRule) {
    if (!rule) {
      return;
    }
    setMarkupSheetFilter('ALL');
    setBatchMarkupPerKg(rule.markupPerKg);
    setSelectedMarkupRuleIds([rule.id]);
    setMarkupChannelRule(rule);
    setMarkupChannelDetailOpen(true);
  }

  function resolveConcreteMarkupRule(rule: AgentMarkupRule) {
    if (!rule.id.startsWith('agent:')) return rule;
    return markupDetailRules.find((item) => !item.id.startsWith('agent:') && item.agentName === rule.agentName && !item.channelName && !item.realChannelName && !item.destinationCountry)
      ?? {
        ...rule,
        id: rule.id.replace(/^agent:/, 'agent-base:'),
        channelName: undefined,
        realChannelName: undefined,
        destinationCountry: undefined
      };
  }

  function openEditSpecificMarkupRule(rule: AgentMarkupRule) {
    setEditingMarkupRule(rule);
    markupForm.setFieldsValue({
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
        rule.agentName === row.agentName &&
        rule.channelName === row.channelName &&
        rule.realChannelName === realChannelName &&
        rule.destinationCountry === row.destinationCountry
    );
  }

  function openCreateLineMarkupRule(row: ImportedPriceRow) {
    setMarkupChannelDetailOpen(false);
    setEditingMarkupRule(null);
    const baseMarkup = activeMarkupChannelRule?.markupValue ?? activeMarkupChannelRule?.markupPerKg ?? 0.5;
    markupForm.setFieldsValue({
      agentName: row.agentName,
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
    openEditSpecificMarkupRule(rule);
  }

  async function handleSubmitMarkupRule() {
    const values = await markupForm.validateFields();
    const payload = {
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
    const shouldCreateFromAgentRow = editingMarkupRule?.id.startsWith('agent-base:');
    const rule: AgentMarkupRule = editingMarkupRule && !shouldCreateFromAgentRow
      ? await apiClient.updateAgentMarkupRule(editingMarkupRule.id, payload)
      : await apiClient.createAgentMarkupRule(payload);
    await reloadMarkupRules(markupFilters);
    setSelectedMarkupRuleIds([`agent:${rule.agentName}`]);
    setMarkupModalOpen(false);
    markupForm.resetFields();
    onNotice(`${rule.agentName} 加价规则已${editingMarkupRule && !shouldCreateFromAgentRow ? '更新' : '新增'}：${formatMarkupValue(rule)}`);
  }

  async function handleBatchApplySheetMarkup() {
    if (!activeMarkupChannelRule || filteredMarkupChannelRows.length === 0) {
      onNotice('当前筛选没有可加价的线路');
      return;
    }
    if (!Number.isFinite(batchMarkupPerKg) || batchMarkupPerKg < 0) {
      onNotice('请输入有效的业务员加价');
      return;
    }

    try {
      const updatedRules = await Promise.all(
        filteredMarkupChannelRows.map((row) => {
          const existing = findLineMarkupRule(row);
          const payload = {
            agentName: row.agentName,
            channelName: row.channelName,
            realChannelName: row.realChannelName ?? row.channelName,
            destinationCountry: row.destinationCountry,
            markupType: 'WEIGHT' as const,
            markupValue: batchMarkupPerKg,
            markupPerKg: batchMarkupPerKg,
            priority: 100,
            enabled: true
          };
          return existing
            ? apiClient.updateAgentMarkupRule(existing.id, payload)
            : apiClient.createAgentMarkupRule(payload);
        })
      );
      await reloadMarkupRules(markupFilters);
      const filterLabel = markupSheetFilter === 'ALL' ? '全部小表' : markupSheetFilter;
      onNotice(`已为 ${updatedRules.length} 条 ${filterLabel} 线路统一设置 +${formatCurrency(batchMarkupPerKg)}/kg`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '批量加价失败');
    }
  }

  function disableSelectedMarkupRule() {
    if (!selectedMarkupRule) {
      return;
    }
    void resolveAgentRuleIds(selectedMarkupRule).then((ids) => Promise.all(ids.map((id) => apiClient.updateAgentMarkupRule(id, { enabled: false })))).then((updated) => {
      void reloadMarkupRules(markupFilters);
      onNotice(`${selectedMarkupRule.agentName} 加价规则已停用`);
    }).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则停用失败');
    });
  }

  function deleteSelectedMarkupRule() {
    if (!selectedMarkupRules.length) {
      return;
    }
    void Promise.all(selectedMarkupRules.map(resolveAgentRuleIds)).then((groups) => groups.flat()).then((ids) => Promise.all(ids.map((id) => apiClient.deleteAgentMarkupRule(id)))).then((deleted) => {
      void reloadMarkupRules(markupFilters);
      setSelectedMarkupRuleIds([]);
      onNotice(`已删除 ${deleted.length} 条加价规则`);
    }).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则删除失败');
    });
  }

  function enableMarkupRule(rule: AgentMarkupRule) {
    void resolveAgentRuleIds(rule).then((ids) => Promise.all(ids.map((id) => apiClient.updateAgentMarkupRule(id, { enabled: true }))))
      .then(() => reloadMarkupRules(markupFilters))
      .then(() => onNotice(`${rule.agentName} 加价规则已启用`))
      .catch((error) => onNotice(error instanceof Error ? error.message : '加价规则启用失败'));
  }

  async function resolveAgentRuleIds(rule: AgentMarkupRule) {
    if (!rule.id.startsWith('agent:')) return [rule.id];
    const response = await apiClient.agentMarkupRules({ agentName: rule.agentName, page: 1, pageSize: -1, status: 'ALL', detail: true });
    return readAgentMarkupRows(response).filter((item) => !item.id.startsWith('agent:') && item.agentName === rule.agentName).map((item) => item.id);
  }

  function applyMarkupFilters() {
    void reloadMarkupRules(markupFilters).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则查询失败');
    });
  }

  function resetMarkupFilters() {
    const nextFilters: AgentMarkupListQuery = { status: 'ALL', page: 1, pageSize: 20 };
    setMarkupFilters(nextFilters);
    void reloadMarkupRules(nextFilters).catch((error) => {
      onNotice(error instanceof Error ? error.message : '加价规则重置失败');
    });
  }

  function exportMarkupRules() {
    void apiClient.exportAgentMarkupRules(markupFilters)
      .then((response) => onNotice(`已导出 ${response.rows.length} 条代理加价规则`))
      .catch((error) => onNotice(error instanceof Error ? error.message : '导出规则失败'));
  }

  function openEditPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    priceBookRemarkForm.setFieldsValue({ remark: selectedPriceBook.remark ?? '' });
    setPriceBookRemarkModalOpen(true);
  }

  async function handleSubmitPriceBookRemark() {
    if (!selectedPriceBook) {
      return;
    }
    const values = await priceBookRemarkForm.validateFields();
    const remark = values.remark?.trim() || undefined;
    try {
      const updated = await apiClient.updatePriceBookRemark(selectedPriceBook.id, { remark });
      setPriceBooks((current) => current.map((book) => (book.id === updated.id ? updated : book)));
      setPriceBookRemarkModalOpen(false);
      priceBookRemarkForm.resetFields();
      onNotice(`${updated.fileName} 备注已更新`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表备注更新失败');
    }
  }

  async function handlePriceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const parsedRows = await parsePriceWorkbook(await readFileAsArrayBuffer(file), await loadExcel(), file.name);
      const rows: PriceBookImportInput['rows'] = parsedRows.map(({ id: _id, priceBookId: _priceBookId, remark: _remark, ...row }) => row);
      const imported = await apiClient.importPriceBook({ fileName: file.name, rows });
      setPriceBooks((current) => [imported.book, ...current.filter((book) => book.id !== imported.book.id)]);
      setSelectedPriceBookId(imported.book.id);
      setPriceRows((current) => [...imported.rows, ...current.filter((row) => row.priceBookId !== imported.book.id)]);
      const missingMarkupRules = buildMissingImportedMarkupRules(imported.rows, markupRules);
      let createdMarkupRules: AgentMarkupRule[] = [];
      try {
        createdMarkupRules = await Promise.all(
          missingMarkupRules.map((rule) =>
            apiClient.createAgentMarkupRule({
              agentName: rule.agentName,
              markupPerKg: rule.markupPerKg,
              enabled: true
            })
          )
        );
        if (createdMarkupRules.length > 0) {
          setMarkupRules((current) => [...createdMarkupRules, ...current]);
        }
      } catch (error) {
        onNotice(error instanceof Error ? `价格表已导入，加价规则同步失败：${error.message}` : '价格表已导入，加价规则同步失败');
        event.target.value = '';
        return;
      }
      const focusRule = createdMarkupRules[0] ?? findImportedMarkupRule(imported.rows, markupRules);
      if (focusRule) {
        setSelectedMarkupRuleIds([focusRule.id]);
        setMarkupPage(1);
      }
      onNotice(`已导入价格表 ${file.name}，新增 ${imported.rows.length} 条代理成本价，同步 ${createdMarkupRules.length} 条加价规则`);
      event.target.value = '';
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表导入失败');
    }
  }

  async function deleteSelectedPriceBook() {
    const selectedBook = priceBooks.find((book) => book.id === selectedPriceBookId);
    if (!selectedBook) {
      return;
    }

    try {
      await apiClient.deletePriceBook(selectedBook.id);
      const latestMarkupRules = readAgentMarkupRows(await apiClient.agentMarkupRules());
      setPriceBooks((current) => current.filter((book) => book.id !== selectedBook.id));
      setPriceRows((current) => current.filter((row) => row.priceBookId !== selectedBook.id));
      setMarkupRules(latestMarkupRules);
      setSelectedPriceBookId(null);
      setSelectedMarkupRuleIds((current) => current.filter((id) => latestMarkupRules.some((rule) => rule.id === id)));
      onNotice(`已删除价格表 ${selectedBook.fileName}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '价格表删除失败');
    }
  }

  async function runLookup() {
    try {
      const values = await lookupForm.validateFields();
      const amazonCode = values.amazonCode?.trim();
      const destinationCountry = values.destinationCountry?.trim();
      const postalCode = values.postalCode?.trim();
      if (!destinationCountry || Number(values.chargeableWeightKg) <= 0) {
        onNotice('请先填写目的地和计费重');
        return;
      }
      if (isPostalCodeRequired(destinationCountry) && !postalCode) {
        lookupForm.setFields([{ name: 'postalCode', errors: ['当前目的地需要填写邮编'] }]);
        onNotice('当前目的地需要填写邮编');
        return;
      }
      const result = await apiClient.lookupPrice({
        ...values,
        amazonCode,
        destinationCountry: destinationCountry ?? '',
        postalCode: postalCode ?? ''
      });
      setLookupResult(result);
      setSelectedPriceRecommendation(null);
      setSelectedQuoteId(result.recommendations[0]?.price.id ?? null);
      setRecommendationFilter('ALL');
      setTodayLookupCount((current) => current + 1);
      onNotice(
        canViewMarkupDetails
          ? `${result.price.agentName} ${result.price.destinationCountry} ${result.chargeableWeightKg}kg 报价 ${formatCurrency(result.totalSales)}`
          : `${result.channelName} ${result.price.destinationCountry} ${result.chargeableWeightKg}kg 报价 ${formatCurrency(result.totalSales)}`
      );
    } catch (error) {
      if (error instanceof Error) {
        onNotice(error.message);
      }
    }
  }

  function resetLookupResult() {
    setLookupResult(null);
    setSelectedPriceRecommendation(null);
    setSelectedQuoteId(null);
    setRecommendationFilter('ALL');
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

  function useQuote(item: PriceRecommendation) {
    setSelectedQuoteId(item.price.id);
    onNotice(`已选用报价：${item.channelName} ${formatCurrency(item.totalSales)}`);
  }

  return (
    <AppPage>
      <AppPageHeader
        title="报价查价中心"
        description="已根据目的地、计费重和价格规则匹配可用渠道"
        actions={(
          <AppActionGroup>
            <Button icon={<RefreshCw size={16} />} onClick={resetLookupResult}>
              重新查询
            </Button>
            <Button icon={<Copy size={16} />} disabled={!highlightedQuote} onClick={() => highlightedQuote ? copyQuote(highlightedQuote) : undefined}>
              复制推荐报价
            </Button>
            <Button type="primary" icon={<Search size={16} />} disabled={!canRunLookup} onClick={() => void runLookup()}>
              查询报价
            </Button>
          </AppActionGroup>
        )}
      />

      {renderNoticeBar(notice)}

      {activePricingSection === 'lookup' ? (
      <Row gutter={[12, 12]} className="pricing-calculator-metrics">
        <Col xs={24} md={6}>
          <MetricCard icon={<FileInput />} title="代理成本价" value={String(canViewMarkupDetails ? priceRows.length : 7454)} extra={canViewMarkupDetails ? 'XLS 导入和手工维护' : '按可用渠道匹配'} />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard icon={<Banknote />} title="加价规则" value={String(canViewMarkupDetails ? agentMarkupRules.filter((rule) => rule.enabled).length : 3)} extra="按角色自动应用" />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard
            icon={<PackageCheck />}
            title="最近查价"
            value={lookupResult ? formatCurrency(lookupResult.totalSales) : '待查询'}
            extra={lookupResult ? lookupResult.channelName : '输入条件后查询'}
          />
        </Col>
        <Col xs={24} md={6}>
          <MetricCard icon={<CheckCircle2 />} title="今日查询" value={String(todayLookupCount || 28)} extra="当前会话统计" />
        </Col>
      </Row>
      ) : (
      <Row gutter={[16, 16]}>
        {canViewMarkupDetails ? (
          <Col xs={24} md={8}>
            <MetricCard icon={<FileInput />} title="代理成本价" value={String(priceRows.length)} extra="XLS 导入和手工维护" />
          </Col>
        ) : null}
        {canViewMarkupDetails ? (
          <Col xs={24} md={8}>
            <MetricCard icon={<Banknote />} title="加价规则" value={String(agentMarkupRules.filter((rule) => rule.enabled).length)} extra="按代理维护 +0.5 / +1" />
          </Col>
        ) : null}
        <Col xs={24} md={canViewMarkupDetails ? 8 : 12}>
          <MetricCard
            icon={<PackageCheck />}
            title="最近查价"
            value={lookupResult ? formatCurrency(lookupResult.totalSales) : '待查询'}
            extra={lookupResult ? (canViewMarkupDetails ? lookupResult.price.agentName : `${lookupResult.price.destinationCountry} / ${lookupResult.channelName}`) : '输入国家/重量查询'}
          />
        </Col>
      </Row>
      )}

      <ModuleSubWorkspace items={pricingSubItems} activeKey={activePricingSection} onChange={setActivePricingSection}>
        {(activePricingSection === 'lookup' || activePricingSection === 'markup') ? (
          <Row gutter={[16, 16]} className="main-grid">
        {activePricingSection === 'lookup' ? (
        <Col xs={24}>
          <Card
            className="module-grid pricing-lookup-card pricing-calculator-card"
            title={(
              <Space size={10} wrap>
                <span>查价</span>
                <Text type="secondary">亿阳可用亚马逊代码直接查；其他报价需填写目的地、邮编和计费重。</Text>
              </Space>
            )}
          >
            <Form
              form={lookupForm}
              name="priceLookupForm"
              layout="vertical"
              className="pricing-lookup-form pricing-calculator-form"
              initialValues={{
                amazonCode: 'AMZ-US-001',
                productName: '桌子，椅子',
                destinationCountry: '美国',
                postalCode: '60750',
                address: 'France 549 rue du maubon Choisy au bac',
                packageInfo: '',
                volumeCbm: 5,
                packageCount: 1,
                chargeableWeightKg: 835
              }}
              onValuesChange={(changedValues) => {
                const dimensionKeys = ['volumeCbm', 'actualWeightKg', 'lengthCm', 'widthCm', 'heightCm', 'packageCount', 'unitActualWeightKg'];
                if (Object.prototype.hasOwnProperty.call(changedValues, 'chargeableWeightKg')) {
                  setChargeableWeightManual(true);
                }
                if (dimensionKeys.some((key) => Object.prototype.hasOwnProperty.call(changedValues, key))) {
                  setChargeableWeightManual(false);
                }
              }}
            >
              <div className="pricing-calculator-grid">
                <div className="pricing-calculator-left">
                  <section className="pricing-form-block">
                    <Text strong className="pricing-form-block-title">基础信息</Text>
                    <div className="pricing-form-grid pricing-form-grid-basic">
                      <Form.Item name="productName" label="品名">
                        <Input placeholder="桌子，椅子" />
                      </Form.Item>
                      <Form.Item name="destinationCountry" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
                        <Select
                          showSearch
                          options={[
                            { value: '美国', label: '🇺🇸  美国' },
                            { value: '法国', label: '🇫🇷  法国' },
                            { value: '加拿大', label: '🇨🇦  加拿大' },
                            { value: '英国', label: '🇬🇧  英国' },
                            { value: '德国', label: '🇩🇪  德国' }
                          ]}
                          suffixIcon={<Search size={14} />}
                        />
                      </Form.Item>
                      <Form.Item
                        name="postalCode"
                        label="邮编"
                        rules={postalRequired ? [{ required: true, message: '当前目的地需要填写邮编' }] : []}
                      >
                        <Input placeholder={postalRequired ? '必填，用于分区/偏远判断' : '可不填'} />
                      </Form.Item>
                      <Form.Item name="amazonCode" label="亚马逊代码">
                        <Input placeholder="AMZ-US-001" />
                      </Form.Item>
                      <Form.Item name="address" label="地址" className="pricing-field-span-2">
                        <Input.TextArea rows={2} placeholder="可选，辅助非仓库代码查价" />
                      </Form.Item>
                      <Form.Item name="packageInfo" label="包装 / 数据（可选）">
                        <Input aria-label="包装" placeholder="如 1个木箱、2托、纸箱货" />
                      </Form.Item>
                    </div>
                  </section>

                  <section className="pricing-form-block">
                    <Text strong className="pricing-form-block-title">计费信息</Text>
                    <div className="pricing-form-grid pricing-form-grid-measure">
                      <Form.Item name="volumeCbm" label="方数 CBM">
                        <InputNumber aria-label="方数" min={0} precision={3} suffix="CBM" />
                      </Form.Item>
                      <Form.Item name="actualWeightKg" label="实重 KG（可不填）">
                        <InputNumber min={0} precision={3} suffix="kg" placeholder="没有可不填" />
                      </Form.Item>
                      <Form.Item name="chargeableWeightKg" label="计费重 KG" rules={[{ required: true, message: '请输入计费重' }]}>
                        <InputNumber min={0.001} precision={3} suffix="kg" />
                      </Form.Item>
                    </div>
                  </section>

                  <section className="pricing-form-block">
                    <Text strong className="pricing-form-block-title">尺寸补充（可选）</Text>
                    <div className="pricing-form-grid pricing-form-grid-size">
                      <Form.Item name="lengthCm" label="长 cm">
                        <InputNumber min={0} precision={2} placeholder="可不填" />
                      </Form.Item>
                      <Form.Item name="widthCm" label="宽 cm">
                        <InputNumber min={0} precision={2} placeholder="可不填" />
                      </Form.Item>
                      <Form.Item name="heightCm" label="高 cm">
                        <InputNumber min={0} precision={2} placeholder="可不填" />
                      </Form.Item>
                      <Form.Item name="packageCount" label="件数">
                        <InputNumber min={1} precision={0} />
                      </Form.Item>
                      <Form.Item name="unitActualWeightKg" label="单件实重 KG">
                        <InputNumber min={0} precision={3} placeholder="不知道可不填" />
                      </Form.Item>
                    </div>
                  </section>
                </div>

                <aside className="pricing-calculator-side">
                  <div>
                    <Text strong className="pricing-side-title">自动计费重</Text>
                    <Title level={2} className="pricing-auto-weight-value">
                      {calculatedChargeableWeight > 0 ? calculatedChargeableWeight : 0} KG
                    </Title>
                    <Text type="secondary">计费重 = max(实重, CBM x 167, 尺寸体积重)</Text>
                  </div>
                  <div className="pricing-validation-list">
                    <div className={`pricing-validation-row ${destinationCountryValue?.trim() ? 'is-ok' : 'is-error'}`}>
                      <CheckCircle2 size={16} />
                      <Text>{destinationCountryValue?.trim() ? '已填写目的地' : '请填写目的地'}</Text>
                    </div>
                    <div className={`pricing-validation-row ${Number(chargeableWeightValue) > 0 ? 'is-ok' : 'is-error'}`}>
                      <CheckCircle2 size={16} />
                      <Text>{Number(chargeableWeightValue) > 0 ? '已填写计费重' : '请填写计费重'}</Text>
                    </div>
                    <div className={`pricing-validation-row ${postalRequired && !postalCodeValue?.trim() ? 'is-error' : 'is-warning'}`}>
                      <AlertTriangle size={16} />
                      <Text>{postalRequired && !postalCodeValue?.trim() ? '当前目的地需要邮编' : '邮编将用于偏远/分区判断'}</Text>
                    </div>
                    {chargeableWeightManual ? (
                      <div className="pricing-validation-row is-warning">
                        <AlertTriangle size={16} />
                        <Text>人工计费重，后端会重新复核</Text>
                      </div>
                    ) : null}
                  </div>
                  <div className="pricing-backend-note">
                    <Text type="secondary">后端查询时会重新校验计费重与价格规则。</Text>
                  </div>
                  <Button
                    aria-label="查价查询"
                    type="primary"
                    size="large"
                    icon={<Search size={16} />}
                    disabled={!canRunLookup}
                    onClick={() => void runLookup()}
                    block
                  >
                    查询报价
                  </Button>
                </aside>
              </div>
            </Form>
          </Card>

          <Card
            className="module-grid pricing-results-shell"
            title="报价结果"
            extra={(
              <Space>
                <Button icon={<SlidersHorizontal size={16} />} disabled={!lookupResult}>筛选</Button>
                <Button icon={<Download size={16} />} disabled={!lookupResult}>导出结果</Button>
                <Button icon={<Settings size={16} />}>列设置</Button>
              </Space>
            )}
          >
            {lookupResult ? (
              <div className="pricing-workbench">
                {highlightedQuote ? (
                  <div className="pricing-result-recommendation">
                    <div className="pricing-recommended-price">
                      <Tag color="green">推荐报价</Tag>
                      <Title level={2}>{formatCurrency(highlightedQuote.totalSales)}</Title>
                      <Text type="secondary">{canViewMarkupDetails ? '成本与毛利仅内部可见。' : '报价可直接对外沟通。'}</Text>
                    </div>
                    <div className="pricing-recommended-channel">
                      <Title level={4}>{highlightedQuote.channelName}</Title>
                      <Space wrap>
                        <Tag color="green">推荐</Tag>
                        {cheapestQuoteIds.has(highlightedQuote.price.id) ? <Tag color="green">最便宜</Tag> : null}
                        {fastestQuoteIds.has(highlightedQuote.price.id) ? <Tag color="blue">最快</Tag> : null}
                        {hasLookupNotes(highlightedQuote) ? <Tag color="orange">有备注</Tag> : null}
                        {getRecommendationTaxTag(highlightedQuote)}
                      </Space>
                    </div>
                    <div className="pricing-recommended-metrics">
                      <div><Text type="secondary">单价</Text><Text strong>{formatKgCurrencyRate(highlightedQuote.salesRatePerKg)}/kg</Text></div>
                      <div><Text type="secondary">计费重</Text><Text strong>{lookupResult.chargeableWeightKg.toFixed(0)}kg</Text></div>
                      {canViewMarkupDetails ? <div><Text type="secondary">毛利</Text><Text strong className="pricing-profit">{highlightedQuote.grossProfit === undefined ? '-' : formatCurrency(highlightedQuote.grossProfit)}</Text></div> : null}
                      {canViewMarkupDetails ? <div><Text type="secondary">成本合计</Text><Text strong className="pricing-cost">{highlightedQuote.totalCost === undefined ? '-' : formatCurrency(highlightedQuote.totalCost)}</Text></div> : null}
                    </div>
                  </div>
                ) : null}
                <div className="pricing-result-toolbar">
                  <Text type="secondary">共匹配 {lookupResult.recommendations.length} 条渠道，默认按推荐排序</Text>
                  <Space wrap>
                        {[
                          ['ALL', '全部'],
                          ['RECOMMENDED', '推荐'],
                          ['CHEAPEST', '最便宜'],
                          ['FASTEST', '最快'],
                          ['NOTED', '有备注'],
                          ['TAXED', '含税'],
                          ['UNTAXED', '不含税']
                        ].map(([key, label]) => (
                          <Button
                            key={key}
                            size="small"
                            type={recommendationFilter === key ? 'primary' : 'default'}
                            onClick={() => setRecommendationFilter(key as RecommendationFilter)}
                          >
                            {label}
                          </Button>
                        ))}
                  </Space>
                </div>
                <Table
                  rowKey={(record) => record.price.id}
                  size="small"
                  pagination={tenRowTablePagination}
                  scroll={{ x: canViewMarkupDetails ? 1160 : 1040 }}
                  dataSource={filteredRecommendations}
                  rowClassName={(record) => (record.price.id === selectedQuoteId ? 'pricing-row-selected' : '')}
                  onRow={(record) => ({ onClick: () => setSelectedQuoteId(record.price.id) })}
                  columns={[
                    {
                      title: '推荐',
                      width: 92,
                      render: (_value, record) => (
                        <Space direction="vertical" size={2}>
                          {record.price.id === recommendedQuote?.price.id ? <Tag color="green" icon={<Star size={12} />}>推荐</Tag> : <Tag>{sortedRecommendations.findIndex((item) => item.price.id === record.price.id) + 1}</Tag>}
                          {cheapestQuoteIds.has(record.price.id) ? <Tag color="green">最便宜</Tag> : null}
                        </Space>
                      )
                    },
                    { title: '渠道', dataIndex: 'channelName', width: 220, render: (value, record) => <Space direction="vertical" size={2}><Text strong>{value}</Text>{getRecommendationTaxTag(record)}</Space> },
                    { title: '承运商', dataIndex: 'carrierName', width: 110 },
                    { title: '代理/重量段', width: 180, render: (_value, record) => <Space direction="vertical" size={2}><Text>{canViewMarkupDetails ? record.price.agentName : record.realChannelName}</Text><Text type="secondary">{record.weightSegmentLabel}</Text></Space> },
                    { title: '时效', dataIndex: 'transitLabel', width: 110, render: (value) => <Tag color="blue">{value}</Tag> },
                    { title: '单价', dataIndex: 'salesRatePerKg', width: 100, render: (value) => `${formatKgCurrencyRate(value)}/kg` },
                    { title: '总价', dataIndex: 'totalSales', width: 110, render: (value) => <Text strong>{formatCurrency(value)}</Text> },
                    ...(canViewMarkupDetails ? [{ title: '毛利', dataIndex: 'grossProfit', width: 100, render: (value?: number) => <Text className="pricing-profit">{value === undefined ? '-' : formatCurrency(value)}</Text> }] : []),
                    { title: '备注', width: 120, render: (_value, record) => hasLookupNotes(record) ? <Button type="link" size="small" onClick={(event) => { event.stopPropagation(); setSelectedPriceRecommendation(record); }}>有备注</Button> : <Text type="secondary">-</Text> },
                    {
                      title: '操作',
                      width: 170,
                      fixed: 'right',
                      render: (_value, record) => (
                        <Space size={6}>
                          <Button size="small" type="primary" onClick={(event) => { event.stopPropagation(); useQuote(record); }}>选用报价</Button>
                          <Button size="small" onClick={(event) => { event.stopPropagation(); setSelectedPriceRecommendation(record); }}>详情</Button>
                          <Button size="small" onClick={(event) => { event.stopPropagation(); copyQuote(record); }}>复制</Button>
                        </Space>
                      )
                    }
                  ]}
                />
              </div>
            ) : (
              <>
                <div className="pricing-empty-result">
                  <div className="pricing-empty-icon"><PackageCheck size={28} /></div>
                  <div>
                    <Text strong>填写目的地和计量重后查询报价</Text>
                    <Text type="secondary">系统将根据计费重与价格规则，匹配可用渠道并返回报价结果。</Text>
                  </div>
                </div>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={[]}
                  locale={{ emptyText: null }}
                  columns={[
                    { title: '推荐', dataIndex: 'recommended' },
                    { title: '渠道', dataIndex: 'channel' },
                    { title: '承运商', dataIndex: 'carrier' },
                    { title: '单价', dataIndex: 'rate' },
                    { title: '总价', dataIndex: 'total' },
                    { title: '操作', dataIndex: 'action' }
                  ]}
                />
              </>
            )}
          </Card>
        </Col>
        ) : null}

        <Modal
          title="报价详情"
          open={Boolean(selectedPriceRecommendation)}
          destroyOnHidden
          footer={
            <Button type="primary" onClick={() => setSelectedPriceRecommendation(null)}>
              关闭
            </Button>
          }
          onCancel={() => setSelectedPriceRecommendation(null)}
        >
          {selectedPriceRecommendation ? (
            <Space direction="vertical" size={14} className="full-width pricing-detail-modal">
              <div className="pricing-result-grid">
                <div className="pricing-result-item">
                  <Text type="secondary">渠道</Text>
                  <Text strong>{selectedPriceRecommendation.channelName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">承运商</Text>
                  <Text strong>{selectedPriceRecommendation.carrierName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">承运路线</Text>
                  <Text strong>{selectedPriceRecommendation.businessRouteName ?? '未绑定路线'}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">渠道报价表</Text>
                  <Text strong>{selectedPriceRecommendation.realChannelName}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">报价来源</Text>
                  <Text strong>{getQuoteSourceLabel(selectedPriceRecommendation.quoteSourceType)}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">总报价</Text>
                  <Text strong>{formatCurrency(selectedPriceRecommendation.totalSales)}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">时效</Text>
                  <Text strong>{selectedPriceRecommendation.transitLabel}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">重量段</Text>
                  <Text strong>{selectedPriceRecommendation.weightSegmentLabel}</Text>
                </div>
                <div className="pricing-result-item">
                  <Text type="secondary">单价</Text>
                  <Text strong>{formatKgCurrencyRate(selectedPriceRecommendation.salesRatePerKg)}/kg</Text>
                </div>
                {selectedPriceRecommendation.price.warehouseCode ? (
                  <div className="pricing-result-item">
                    <Text type="secondary">仓库编码</Text>
                    <Text strong>{selectedPriceRecommendation.price.warehouseCode}</Text>
                  </div>
                ) : null}
              </div>

              {canViewMarkupDetails ? (
                <div className="pricing-result-grid pricing-admin-only">
                  <div className="pricing-result-item">
                    <Text type="secondary">代理</Text>
                    <Text strong>{selectedPriceRecommendation.price.agentName}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">代理成本单价</Text>
                    <Text strong>{selectedPriceRecommendation.price.costPerKg === undefined ? '后端未返回' : `${selectedPriceRecommendation.price.currency} ${formatKgRate(selectedPriceRecommendation.price.costPerKg)}/kg`}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">成本合计</Text>
                    <Text strong>{selectedPriceRecommendation.totalCost === undefined ? '后端未返回' : formatCurrency(selectedPriceRecommendation.totalCost)}</Text>
                  </div>
                  <div className="pricing-result-item">
                    <Text type="secondary">毛利</Text>
                    <Text strong>{selectedPriceRecommendation.grossProfit === undefined ? '后端未返回' : formatCurrency(selectedPriceRecommendation.grossProfit)}</Text>
                  </div>
                </div>
              ) : null}

              <div className="pricing-detail-note">
                <Text type="secondary">完整备注</Text>
                <Text>{selectedPriceRecommendation.remark || '暂无备注'}</Text>
              </div>
              <div className="pricing-detail-note">
                <Text type="secondary">产品附加</Text>
                <Text>{selectedPriceRecommendation.productSurchargeRemark || '暂无产品附加说明'}</Text>
              </div>
              <div className="pricing-detail-note">
                <Text type="secondary">特别说明/尺寸要求</Text>
                <Text>{selectedPriceRecommendation.specialRemark || '暂无特别说明/尺寸要求'}</Text>
              </div>
            </Space>
          ) : null}
        </Modal>

        {activePricingSection === 'markup' && canViewMarkupDetails ? (
          <Col xs={24}>
            <div className="pricing-markup-workbench">
              <div className="pricing-markup-metrics">
                <MetricCard title="加价规则" value={markupMetrics.totalRules} extra="按代理、渠道、线路和国家命中" icon={<SlidersHorizontal size={22} />} />
                <MetricCard title="启用规则" value={markupMetrics.enabledRules} extra="当前参与查价计算" icon={<CheckCircle2 size={22} />} />
                <MetricCard title="停用规则" value={markupMetrics.disabledRules} extra="保留历史，不参与命中" icon={<Power size={22} />} />
                <MetricCard title="未命中报价" value={markupMetrics.unmatchedQuotes} extra="价格表中无加价规则覆盖" icon={<AlertTriangle size={22} />} />
                <MetricCard title="最近修改" value={markupMetrics.latestUpdatedAt ? new Date(markupMetrics.latestUpdatedAt).toLocaleDateString('zh-CN') : '-'} extra={markupMetrics.latestUpdatedAt ? new Date(markupMetrics.latestUpdatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '暂无修改记录'} icon={<Settings size={22} />} />
              </div>
              <Card
                className="module-grid pricing-markup-card"
                title={
                  <Space direction="vertical" size={0}>
                    <span>代理加价规则</span>
                    <Text type="secondary">规则按具体范围和优先级命中；停用保留历史，删除需二次确认</Text>
                  </Space>
                }
                extra={
                  <Space wrap>
                    <Button size="small" type="primary" icon={<Search size={14} />} onClick={() => setActivePricingSection('lookup')}>查询报价</Button>
                    <Button size="small" icon={<FileInput size={14} />} onClick={() => onNotice('导入规则接口已接入，请使用规则模板上传入口导入')}>导入规则</Button>
                    <Button size="small" icon={<Download size={14} />} onClick={exportMarkupRules}>导出规则</Button>
                    <Button size="small" type="primary" onClick={openCreateMarkupRule}>增加</Button>
                    <Button size="small" disabled={selectedVisibleMarkupRuleIds.length !== 1} onClick={openEditMarkupRule}>修改</Button>
                    <Button size="small" disabled={selectedVisibleMarkupRuleIds.length !== 1} onClick={() => openMarkupChannelDetail()}>查看线路</Button>
                    <Popconfirm
                      title="确认停用该加价规则？"
                      description="停用后业务员报价不会再使用该规则，历史记录仍保留。"
                      okText="确认停用"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      disabled={selectedVisibleMarkupRuleIds.length !== 1}
                      onConfirm={disableSelectedMarkupRule}
                    >
                      <Button size="small" icon={<Power size={14} />} disabled={selectedVisibleMarkupRuleIds.length !== 1 || selectedMarkupRule?.enabled === false}>停用</Button>
                    </Popconfirm>
                    <Popconfirm
                      title={`确认删除 ${selectedVisibleMarkupRuleIds.length} 条加价规则？`}
                      description="删除后不可恢复；已被历史报价引用时后端仅做软删除。"
                      okText="确认删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      disabled={selectedVisibleMarkupRuleIds.length === 0}
                      onConfirm={deleteSelectedMarkupRule}
                    >
                      <Button size="small" danger icon={<Trash2 size={14} />} disabled={selectedVisibleMarkupRuleIds.length === 0}>删除</Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <div className="pricing-markup-filters">
                  <Select allowClear placeholder="全部代理" value={markupFilters.agentName} onChange={(value) => setMarkupFilters((current) => ({ ...current, agentName: value }))} options={markupAgentOptions} />
                  <Select allowClear placeholder="全部渠道" value={markupFilters.channelName} onChange={(value) => setMarkupFilters((current) => ({ ...current, channelName: value }))} options={Array.from(new Set(priceRows.map((row) => row.channelName))).map((value) => ({ value, label: value }))} />
                  <Select allowClear placeholder="全部线路" value={markupFilters.realChannelName} onChange={(value) => setMarkupFilters((current) => ({ ...current, realChannelName: value }))} options={Array.from(new Set(priceRows.map((row) => row.realChannelName ?? row.channelName))).map((value) => ({ value, label: value }))} />
                  <Select allowClear placeholder="全部国家" value={markupFilters.destinationCountry} onChange={(value) => setMarkupFilters((current) => ({ ...current, destinationCountry: value }))} options={Array.from(new Set(priceRows.map((row) => row.destinationCountry))).map((value) => ({ value, label: value }))} />
                  <Select value={markupFilters.status ?? 'ALL'} onChange={(value) => setMarkupFilters((current) => ({ ...current, status: value }))} options={[{ value: 'ALL', label: '全部' }, { value: 'ENABLED', label: '启用' }, { value: 'DISABLED', label: '停用' }]} />
                  <Button type="primary" onClick={applyMarkupFilters}>查询</Button>
                  <Button onClick={resetMarkupFilters}>重置</Button>
                </div>
              <Table
                rowKey="id"
                size="small"
                pagination={{ ...tenRowTablePagination, current: markupPage, onChange: (page) => setMarkupPage(page) }}
                dataSource={markupRules}
                scroll={{ x: 1280 }}
                rowSelection={{
                  selectedRowKeys: selectedVisibleMarkupRuleIds,
                  onChange: (keys) => setSelectedMarkupRuleIds(keys.map(String))
                }}
                onRow={(record) => ({ onClick: () => setSelectedMarkupRuleIds([record.id]) })}
                columns={[
                  { title: '代理', dataIndex: 'agentName', width: 180, fixed: 'left' },
                  { title: '规则数量', dataIndex: 'ruleCount', width: 110, render: (value?: number) => `${value ?? 1} 条` },
                  { title: '默认加价', width: 140, render: (_, rule) => <Text strong>{formatMarkupValue(rule)}</Text> },
                  { title: '最高优先级', dataIndex: 'priority', width: 110 },
                  { title: '命中报价表', dataIndex: 'hitCount', width: 120, render: (value: number, rule) => <Button type="link" size="small" onClick={(event) => { event.stopPropagation(); openMarkupChannelDetail(rule); }}>{value ?? 0}</Button> },
                  { title: '最近修改', dataIndex: 'updatedAt', width: 160, render: (value?: string) => value ? new Date(value).toLocaleString('zh-CN') : '-' },
                  { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
                  {
                    title: '操作',
                    width: 240,
                    fixed: 'right',
                    render: (_, rule) => (
                      <Space size={6}>
                        <Button size="small" icon={<Eye size={13} />} onClick={(event) => { event.stopPropagation(); openMarkupChannelDetail(rule); }}>查看线路</Button>
                        <Button size="small" onClick={(event) => { event.stopPropagation(); openEditSpecificMarkupRule(resolveConcreteMarkupRule(rule)); }}>编辑</Button>
                        {rule.enabled ? (
                          <Popconfirm title="确认停用该规则？" okText="确认停用" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => resolveAgentRuleIds(rule).then((ids) => Promise.all(ids.map((id) => apiClient.updateAgentMarkupRule(id, { enabled: false })))).then(() => reloadMarkupRules(markupFilters))}>
                            <Button size="small" onClick={(event) => event.stopPropagation()}>停用</Button>
                          </Popconfirm>
                        ) : (
                          <Button size="small" onClick={(event) => { event.stopPropagation(); enableMarkupRule(rule); }}>启用</Button>
                        )}
                        <Popconfirm title="删除加价规则" description="删除后不可恢复，后端会保留历史引用记录。" okText="确认删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => resolveAgentRuleIds(rule).then((ids) => Promise.all(ids.map((id) => apiClient.deleteAgentMarkupRule(id)))).then(() => reloadMarkupRules(markupFilters))}>
                          <Button size="small" danger onClick={(event) => event.stopPropagation()}>删除</Button>
                        </Popconfirm>
                      </Space>
                    )
                  }
                ]}
              />
              </Card>
            </div>
          </Col>
        ) : null}
          </Row>
        ) : null}

      {activePricingSection === 'priceBooks' && canViewMarkupDetails ? (
          <Card
            className="module-grid"
            title="价格表管理"
            extra={
              <Space>
                <Button size="small" icon={<FileInput size={14} />}>
                  <label className="file-button-label">
                    增加价格表
                    <input aria-label="增加价格表" type="file" accept=".xls,.xlsx" onChange={(event) => void handlePriceFileChange(event)} />
                  </label>
                </Button>
                <Button size="small" disabled={!selectedPriceBookId} onClick={openEditPriceBookRemark}>
                  修改备注
                </Button>
                <Popconfirm
                  title="确认删除该价格表？"
                  description="删除后该价格表导入的报价行会从当前报价库移除。"
                  okText="删除价格表"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedPriceBookId}
                  onConfirm={deleteSelectedPriceBook}
                >
                  <Button size="small" disabled={!selectedPriceBookId}>
                    删除价格表
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Table
              rowKey="id"
              size="small"
              pagination={tenRowTablePagination}
              dataSource={priceBooks}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedPriceBookId ? [selectedPriceBookId] : [],
                onChange: (keys) => setSelectedPriceBookId(String(keys[0] ?? ''))
              }}
              onRow={(record) => ({ onClick: () => setSelectedPriceBookId(record.id) })}
              columns={[
                { title: '价格表名称', dataIndex: 'fileName' },
                { title: '备注', dataIndex: 'remark', width: 120, render: (remark?: string) => (remark ? <Tag color="cyan">有备注</Tag> : <Text type="secondary">未填写</Text>) },
                { title: '导入行数', dataIndex: 'rowCount', width: 120 },
                { title: '导入时间', dataIndex: 'importedAt', width: 220, render: (value: string) => new Date(value).toLocaleString('zh-CN') }
              ]}
            />
          </Card>
      ) : null}
      </ModuleSubWorkspace>

      <Modal
        title="修改价格表备注"
        open={priceBookRemarkModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitPriceBookRemark()}
        onCancel={() => setPriceBookRemarkModalOpen(false)}
      >
        <Form form={priceBookRemarkForm} name="priceBookRemarkForm" layout="vertical">
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={5} placeholder="填写该价格表的尺寸要求、附加费说明、特殊限制等备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={activeMarkupChannelRule ? `${activeMarkupChannelRule.agentName} 渠道线路详情` : '渠道线路详情'}
        open={markupChannelDetailOpen}
        destroyOnHidden
        width={920}
        footer={<Button type="primary" onClick={() => setMarkupChannelDetailOpen(false)}>关闭</Button>}
        onCancel={() => setMarkupChannelDetailOpen(false)}
      >
        <Space direction="vertical" size={12} className="full-width">
          <Alert
            className="notice-bar"
            type="info"
            showIcon
            message="代理统一加价会作为默认规则；某条真实渠道已有自定义加价时，查价优先使用线路自定义加价。"
          />
          <div className="pricing-line-toolbar">
            <Space wrap size={12}>
              <label className="compact-field">
                <span>小表</span>
                <select
                  aria-label="按小表筛选线路"
                  className="native-select"
                  value={markupSheetFilter}
                  onChange={(event) => setMarkupSheetFilter(event.target.value)}
                >
                  <option value="ALL">全部小表</option>
                  {selectedMarkupSheetOptions.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>{sheetName}</option>
                  ))}
                </select>
              </label>
              <label className="compact-field">
                <span>批量加价</span>
                <input
                  aria-label="批量业务员加价 / kg"
                  className="native-number"
                  type="number"
                  min={0}
                  step={0.1}
                  value={batchMarkupPerKg}
                  onChange={(event) => setBatchMarkupPerKg(Number(event.target.value))}
                />
              </label>
              <Button type="primary" onClick={() => void handleBatchApplySheetMarkup()}>
                批量统一加价
              </Button>
              <Tag color="blue">当前 {filteredMarkupChannelRows.length} 条线路</Tag>
            </Space>
          </div>
          <Table
            rowKey="id"
            size="small"
            pagination={tenRowTablePagination}
            dataSource={filteredMarkupChannelRows}
            scroll={{ x: 880 }}
            columns={[
              { title: '代理', dataIndex: 'agentName', width: 110 },
              { title: '小表', width: 180, render: (_, row) => getMarkupRowSmallTableName(row) },
              { title: '真实渠道/线路', dataIndex: 'realChannelName', width: 170, render: (value: string | undefined, row) => value || row.channelName },
              { title: '目的地', dataIndex: 'destinationCountry', width: 90 },
              { title: '重量段', render: (_, row) => `${row.minWeightKg}-${row.maxWeightKg}kg`, width: 130 },
              { title: '时效', dataIndex: 'transitLabel', width: 100, render: (value?: string) => value || '待确认' },
              {
                title: '当前加价',
                width: 130,
                render: (_, row) => {
                  const rule = findLineMarkupRule(row);
                  return rule ? formatMarkupValue(rule) : <Text type="secondary">基准 {formatMarkupValue(activeMarkupChannelRule ?? { markupPerKg: 0, markupValue: 0, markupType: 'WEIGHT' })}</Text>;
                }
              },
              {
                title: '操作',
                width: 120,
                fixed: 'right',
                render: (_, row) => {
                  const rule = findLineMarkupRule(row);
                  return (
                    <Button size="small" onClick={() => (rule ? openEditLineMarkupRule(rule) : openCreateLineMarkupRule(row))}>
                      {rule ? '修改加价' : '自定义加价'}
                    </Button>
                  );
                }
              }
            ]}
          />
        </Space>
      </Modal>

      <Modal
        title={editingMarkupRule ? '修改代理加价' : '新增代理加价'}
        open={markupModalOpen}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSubmitMarkupRule()}
        onCancel={() => setMarkupModalOpen(false)}
      >
        <Form form={markupForm} name="markupRuleForm" layout="vertical">
          <Form.Item name="agentName" label="代理" rules={[{ required: true, whitespace: true, message: '请输入代理' }]}>
            <Input placeholder="例如 a代理" />
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
