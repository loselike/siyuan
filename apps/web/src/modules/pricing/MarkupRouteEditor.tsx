import { useEffect, useMemo, useState, type Key } from 'react';
import { Alert, Button, Card, Col, Input, InputNumber, Row, Select, Space, Tabs, Tag, Typography } from 'antd';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import type { AgentMarkupUnit, MarkupRouteListQuery, MarkupRouteListResponse, MarkupRoutePreviewInput, MarkupRoutePreviewResponse, MarkupRouteSummary, MarkupRouteTierInput, PriceBookRowSummary } from '@siyuan/shared';
import { ApiClient, type PermissionKey } from '../../apiClient';
import { agentFieldLabels } from '../shared/agentFieldLabels';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable } from '../shared/ui';
import { formatCurrency } from '../shared/format';
import { getMarkupRuleLabel } from './markupRuleLabel';
import { useGlobalUnsavedWork } from '../../appUpdate';

const { Text } = Typography;

export interface MarkupRouteEditorContext {
  priceBookId?: string;
  agentName?: string;
}

interface RouteScope extends MarkupRoutePreviewInput {
  realChannelName: string;
}

type BatchTierDrafts = Record<AgentMarkupUnit, MarkupRouteTierInput[]>;

const emptyBatchTierDrafts = (): BatchTierDrafts => ({ KG: [], CBM: [] });

function routeScopeKey(route: Pick<RouteScope, 'channelName' | 'realChannelName' | 'destinationCountry' | 'markupUnit'>) {
  return [route.channelName, route.realChannelName, route.destinationCountry, route.markupUnit].join('\u0001');
}

function tiersFromPreview(preview: MarkupRoutePreviewResponse): MarkupRouteTierInput[] {
  const current = preview.rules
    .sort((left, right) => Number(left.minChargeableValue ?? 0) - Number(right.minChargeableValue ?? 0))
    .map((rule) => ({
      minChargeableValue: Number(rule.minChargeableValue ?? 0),
      maxChargeableValue: rule.maxChargeableValue,
      markupValue: Number(rule.markupValue ?? rule.markupPerKg ?? 0)
    }));
  return current.length ? current : [{ minChargeableValue: 0, maxChargeableValue: undefined, markupValue: 0 }];
}

function routeFromLocation(): { priceBookId?: string; agentName?: string; scope?: RouteScope } {
  const params = new URLSearchParams(window.location.search);
  const priceBookId = params.get('priceBookId')?.trim() || undefined;
  const agentName = params.get('agentName')?.trim() || undefined;
  const channelName = params.get('channelName')?.trim() || undefined;
  const realChannelName = params.get('realChannelName')?.trim() || channelName;
  const destinationCountry = params.get('destinationCountry')?.trim() || undefined;
  const markupUnit = params.get('markupUnit') as AgentMarkupUnit | null;
  if (!priceBookId || !agentName || !channelName || !realChannelName || !destinationCountry || (markupUnit !== 'KG' && markupUnit !== 'CBM')) {
    return { priceBookId, agentName };
  }
  return {
    priceBookId,
    agentName,
    scope: {
      priceBookId,
      agentName,
      channelName,
      realChannelName,
      destinationCountry,
      markupUnit,
      chargeableValue: Math.max(0, Number(params.get('chargeableValue') ?? 80) || 80)
    }
  };
}

function formatRange(minimum: number, maximum: number | undefined, unit: AgentMarkupUnit) {
  return maximum === undefined ? `${minimum}${unit}+` : `${minimum} - ${maximum}${unit}`;
}

function openRoute(scope: RouteScope) {
  const params = new URLSearchParams({
    view: 'route-editor',
    priceBookId: scope.priceBookId,
    agentName: scope.agentName,
    channelName: scope.channelName,
    realChannelName: scope.realChannelName,
    destinationCountry: scope.destinationCountry,
    markupUnit: scope.markupUnit,
    chargeableValue: String(scope.chargeableValue)
  });
  window.location.assign(`/app/pricing/markup?${params.toString()}`);
}

function publishMarkupChange() {
  try {
    const channel = new BroadcastChannel('siyuan-pricing-markup');
    channel.postMessage({ type: 'route-tier-saved' });
    channel.close();
  } catch {
    // Browser privacy modes may disable BroadcastChannel; the saved page remains authoritative.
  }
}

export function MarkupRouteEditor({ apiClient, permissions, onNotice, context, moduleEditBlocked = false, embedded = false, onClose }: {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  onNotice: (message: string | null) => void;
  context?: MarkupRouteEditorContext;
  moduleEditBlocked?: boolean;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const initial = useMemo(() => context ? { priceBookId: context.priceBookId, agentName: context.agentName } : routeFromLocation(), [context]);
  const [scope, setScope] = useState<RouteScope | undefined>(initial.scope);
  const [batchScopes, setBatchScopes] = useState<RouteScope[]>([]);
  const [batchTiers, setBatchTiers] = useState<BatchTierDrafts>(emptyBatchTierDrafts);
  const [batchSavedTierKey, setBatchSavedTierKey] = useState('');
  const [batchInitialized, setBatchInitialized] = useState(false);
  const [activeBatchUnit, setActiveBatchUnit] = useState<AgentMarkupUnit>('KG');
  const [rows, setRows] = useState<PriceBookRowSummary[]>([]);
  const [routePage, setRoutePage] = useState(1);
  const [routePageSize, setRoutePageSize] = useState(10);
  const [routeKeyword, setRouteKeyword] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [routeCountryDraft, setRouteCountryDraft] = useState<string[]>([]);
  const [routeCountryFilter, setRouteCountryFilter] = useState<string[]>([]);
  const [routeUnitDraft, setRouteUnitDraft] = useState<AgentMarkupUnit[]>([]);
  const [routeUnitFilter, setRouteUnitFilter] = useState<AgentMarkupUnit[]>([]);
  const [routeWorkspaceTab, setRouteWorkspaceTab] = useState<'quotes' | 'tiers'>('quotes');
  const [routeChargeableDraft, setRouteChargeableDraft] = useState(80);
  const [routeChargeableValue, setRouteChargeableValue] = useState(80);
  const [routeQuotePreviews, setRouteQuotePreviews] = useState<Record<string, Pick<MarkupRoutePreviewResponse, 'calculation'> | null>>({});
  const [routeQuoteErrors, setRouteQuoteErrors] = useState<Record<string, string>>({});
  const [routeQuoteLoading, setRouteQuoteLoading] = useState(false);
  const [routeSortBy, setRouteSortBy] = useState<NonNullable<MarkupRouteListQuery['sortBy']>>('realChannelName');
  const [routeSortOrder, setRouteSortOrder] = useState<NonNullable<MarkupRouteListQuery['sortOrder']>>('asc');
  const [selectedRouteKeys, setSelectedRouteKeys] = useState<Key[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<RouteScope[]>([]);
  const [routeResponse, setRouteResponse] = useState<MarkupRouteListResponse>({
    rows: [],
    filterOptions: { destinationCountries: [], markupUnits: [] },
    pagination: { page: 1, pageSize: 10, totalItems: 0 }
  });
  const [preview, setPreview] = useState<MarkupRoutePreviewResponse | null>(null);
  const [tiers, setTiers] = useState<MarkupRouteTierInput[]>([]);
  const [savedTierKey, setSavedTierKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = Boolean(scope) && JSON.stringify(tiers) !== savedTierKey;
  const batchDirty = batchInitialized && JSON.stringify(batchTiers) !== batchSavedTierKey;
  useGlobalUnsavedWork('pricing-markup-route-editor', dirty || batchDirty);
  const canEdit = !moduleEditBlocked
    && (permissions.includes('pricing:markup-tier:update') || permissions.includes('pricing:manage'));
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      if (scope) {
        const next = await apiClient.previewMarkupRoute(scope);
        if (!alive) return;
        setPreview(next);
        setRows(next.rows);
        const nextTiers = tiersFromPreview(next);
        setTiers(nextTiers);
        setSavedTierKey(JSON.stringify(nextTiers));
      } else if (!batchScopes.length && initial.priceBookId) {
        const page = await apiClient.markupRoutes(initial.priceBookId, {
          page: routePage,
          pageSize: routePageSize,
          keyword: routeSearch || undefined,
          destinationCountries: routeCountryFilter.length ? routeCountryFilter : undefined,
          markupUnits: routeUnitFilter.length ? routeUnitFilter : undefined,
          sortBy: routeSortBy,
          sortOrder: routeSortOrder
        });
        if (!alive) return;
        setRouteResponse(page);
      } else if (!batchScopes.length) {
        throw new Error('缺少价格表参数，请从代理加价规则打开线路工作台');
      }
    };
    void load().catch((reason: unknown) => {
      if (alive) setError(reason instanceof Error ? reason.message : '线路工作台加载失败');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [apiClient, batchScopes.length, initial.priceBookId, routeCountryFilter, routePage, routePageSize, routeSearch, routeSortBy, routeSortOrder, routeUnitFilter, scope]);

  useEffect(() => {
    if (!batchScopes.length) return;
    let alive = true;
    setBatchInitialized(false);
    setBatchTiers(emptyBatchTierDrafts());
    setBatchSavedTierKey('');
    setLoading(true);
    setError(null);
    const units = Array.from(new Set(batchScopes.map((route) => route.markupUnit)));
    void Promise.all(units.map(async (unit) => {
      const templateScope = batchScopes.find((route) => route.markupUnit === unit)!;
      return [unit, tiersFromPreview(await apiClient.previewMarkupRoute(templateScope))] as const;
    })).then((entries) => {
      if (!alive) return;
      const next = emptyBatchTierDrafts();
      entries.forEach(([unit, unitTiers]) => { next[unit] = unitTiers; });
      setBatchTiers(next);
      setBatchSavedTierKey(JSON.stringify(next));
      setBatchInitialized(true);
      setActiveBatchUnit(units.includes('KG') ? 'KG' : (units[0] ?? 'KG'));
    }).catch((reason: unknown) => {
      if (alive) setError(reason instanceof Error ? reason.message : '批量阶梯模板加载失败');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [apiClient, batchScopes]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !batchDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [batchDirty, dirty]);

  const routeOptions = useMemo<RouteScope[]>(() => routeResponse.rows.map((row) => ({
    ...row,
    agentName: initial.agentName || row.agentName,
    chargeableValue: routeChargeableValue
  })), [initial.agentName, routeChargeableValue, routeResponse.rows]);

  useEffect(() => {
    if (scope || batchScopes.length || routeWorkspaceTab !== 'quotes' || !routeOptions.length) {
      setRouteQuotePreviews({});
      setRouteQuoteErrors({});
      setRouteQuoteLoading(false);
      return;
    }
    let alive = true;
    setRouteQuoteLoading(true);
    setRouteQuotePreviews({});
    setRouteQuoteErrors({});
    void apiClient.previewMarkupRoutesBatch({
      items: routeOptions.map((route) => ({ key: routeScopeKey(route), route }))
    }).then((response) => {
      if (!alive) return;
      const previews: Record<string, Pick<MarkupRoutePreviewResponse, 'calculation'> | null> = {};
      const errors: Record<string, string> = {};
      response.items.forEach((item) => {
        previews[item.key] = item.preview ?? null;
        if (item.error) errors[item.key] = item.error;
      });
      setRouteQuotePreviews(previews);
      setRouteQuoteErrors(errors);
    }).catch((reason: unknown) => {
      if (!alive) return;
      const message = reason instanceof Error ? reason.message : '报价预览失败';
      setRouteQuoteErrors(Object.fromEntries(routeOptions.map((route) => [routeScopeKey(route), message])));
    }).finally(() => { if (alive) setRouteQuoteLoading(false); });
    return () => { alive = false; };
  }, [apiClient, batchScopes.length, routeOptions, routeWorkspaceTab, scope]);

  const save = async () => {
    if (!scope) return;
    setSaving(true);
    try {
      const next = await apiClient.replaceMarkupRouteTiers({ ...scope, tiers });
      setPreview(next);
      const nextTiers = tiersFromPreview(next);
      setTiers(nextTiers);
      setSavedTierKey(JSON.stringify(nextTiers));
      publishMarkupChange();
      onNotice('线路阶梯加价已保存');
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : '线路阶梯加价保存失败');
    } finally {
      setSaving(false);
    }
  };

  const batchUnits = useMemo(() => Array.from(new Set(batchScopes.map((route) => route.markupUnit))), [batchScopes]);

  const saveBatch = async () => {
    if (!batchScopes.length || !batchInitialized || error || !batchDirty) return;
    setSaving(true);
    try {
      const result = await apiClient.replaceMarkupRouteTiersBatch({
        items: batchScopes.map((route) => ({ ...route, tiers: batchTiers[route.markupUnit] }))
      });
      setBatchSavedTierKey(JSON.stringify(batchTiers));
      publishMarkupChange();
      onNotice(`已为 ${result.updatedCount} 条线路保存阶梯加价`);
    } catch (reason) {
      onNotice(reason instanceof Error ? reason.message : '批量阶梯加价保存失败');
    } finally {
      setSaving(false);
    }
  };

  const applyRouteFilters = () => {
    setRoutePage(1);
    setSelectedRouteKeys([]);
    setSelectedRoutes([]);
    setRouteSearch(routeKeyword.trim());
    setRouteCountryFilter(routeCountryDraft);
    setRouteUnitFilter(routeUnitDraft);
    setRouteChargeableValue(Math.max(0, Number(routeChargeableDraft) || 0));
  };

  const resetRouteFilters = () => {
    setRoutePage(1);
    setRouteKeyword('');
    setRouteSearch('');
    setRouteCountryDraft([]);
    setRouteCountryFilter([]);
    setRouteUnitDraft([]);
    setRouteUnitFilter([]);
    setRouteChargeableDraft(80);
    setRouteChargeableValue(80);
    setSelectedRouteKeys([]);
    setSelectedRoutes([]);
  };

  const backToRoutes = () => {
    if ((dirty || batchDirty) && !window.confirm('当前阶梯规则尚未保存，确认返回线路列表？')) return;
    if (batchScopes.length) {
      setBatchScopes([]);
      setBatchTiers(emptyBatchTierDrafts());
      setBatchSavedTierKey('');
      setBatchInitialized(false);
      return;
    }
    if (embedded) {
      setScope(undefined);
      return;
    }
    const params = new URLSearchParams({ view: 'route-editor' });
    if (initial.priceBookId) params.set('priceBookId', initial.priceBookId);
    if (initial.agentName) params.set('agentName', initial.agentName);
    window.location.assign(`/app/pricing/markup?${params.toString()}`);
  };

  const selectRoute = (next: RouteScope) => {
    setBatchScopes([]);
    if (embedded) {
      setScope(next);
      return;
    }
    openRoute(next);
  };

  const selectRoutesForEditing = () => {
    if (!selectedRoutes.length) return;
    if (selectedRoutes.length === 1) {
      selectRoute(selectedRoutes[0]);
      return;
    }
    setScope(undefined);
    setBatchScopes(selectedRoutes);
  };

  const updateBatchTier = (unit: AgentMarkupUnit, index: number, patch: Partial<MarkupRouteTierInput>) => {
    setBatchTiers((current) => ({
      ...current,
      [unit]: current[unit].map((tier, itemIndex) => itemIndex === index ? { ...tier, ...patch } : tier)
    }));
  };

  const renderBatchRuleTable = (unit: AgentMarkupUnit) => {
    const unitTiers = batchTiers[unit];
    const unitRoutes = batchScopes.filter((route) => route.markupUnit === unit);
    return <div className="markup-route-batch-rule-pane">
      <div className="markup-route-batch-impact">
        <span><strong>{unitRoutes.length}</strong> 条按 {unit} 计费线路</span>
        <span>保存后统一覆盖现有阶梯</span>
        <span>模板来自本组首条线路</span>
      </div>
      <ManagedTable
        rowKey={(_, index) => `${unit}-${index}`}
        size="small"
        pagination={false}
        dataSource={unitTiers}
        columnSettings={false}
        recordDetail={false}
        minimumScrollX={620}
        columns={[
          { key: 'minimum', title: `起始 ${unit}（含）`, width: 150, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={3} value={row.minChargeableValue} onChange={(value) => updateBatchTier(unit, index, { minChargeableValue: Number(value ?? 0) })} /> : row.minChargeableValue },
          { key: 'maximum', title: `结束 ${unit}（不含）`, width: 160, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={3} value={row.maxChargeableValue} placeholder="不限" onChange={(value) => updateBatchTier(unit, index, { maxChargeableValue: value === null ? undefined : Number(value) })} /> : (row.maxChargeableValue ?? '不限') },
          { key: 'markupValue', title: `加价（元/${unit}）`, width: 150, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={2} value={row.markupValue} onChange={(value) => updateBatchTier(unit, index, { markupValue: Number(value ?? 0) })} /> : formatCurrency(row.markupValue) },
          { key: 'status', title: '应用区间', width: 130, render: (_, row) => <Tag>{formatRange(row.minChargeableValue, row.maxChargeableValue, unit)}</Tag> },
          ...(canEdit ? [{ key: 'action', title: '操作', width: 74, fixed: 'right' as const, render: (_: unknown, __: MarkupRouteTierInput, index: number) => <Button danger type="text" size="small" icon={<Trash2 size={14} />} disabled={unitTiers.length === 1} onClick={() => setBatchTiers((current) => ({ ...current, [unit]: current[unit].filter((_, itemIndex) => itemIndex !== index) }))}>删除</Button> }] : [])
        ]}
      />
    </div>;
  };

  const calculation = preview?.calculation;
  const activeScope = scope as RouteScope;
  const isEditing = Boolean(scope || batchScopes.length);
  const actions = <AppActionGroup>
    <Button icon={<ArrowLeft size={16} />} onClick={isEditing ? backToRoutes : () => embedded ? onClose?.() : window.close()}>返回</Button>
    {scope && canEdit ? <Button type="primary" icon={<Save size={16} />} loading={saving} disabled={!dirty} onClick={() => void save()}>保存阶梯</Button> : null}
    {batchScopes.length && canEdit ? <Button type="primary" icon={<Save size={16} />} loading={saving || loading} disabled={loading || !batchInitialized || Boolean(error) || !batchDirty} onClick={() => void saveBatch()}>保存并应用（{batchScopes.length} 条）</Button> : null}
  </AppActionGroup>;
  const editorTitle = batchScopes.length ? '批量设置阶梯加价' : scope ? '线路阶梯加价' : '线路报价明细';
  const editorDescription = batchScopes.length
    ? '同一计费方式共用一组阶梯；KG 与 CBM 分组保存。'
    : scope
      ? '用实际计费量验证成本重量段、命中加价与最终销售价。'
      : '按模拟计费量对照原始单价、命中加价和最终报价；阶梯设置独立维护。';
  const content = <>
    {embedded ? <Row className="markup-route-editor-topbar" justify="space-between" align="middle" gutter={[16, 12]}><Col flex="auto"><Text strong>{editorTitle}</Text><Text type="secondary" className="markup-route-editor-description">{editorDescription}</Text></Col><Col>{actions}</Col></Row> : <AppPageHeader
      title={batchScopes.length ? '批量设置阶梯加价' : scope ? '线路阶梯加价' : '线路报价明细'}
      description={editorDescription}
      actions={actions}
    />}
    {error ? <Alert type="error" showIcon message="线路工作台加载失败" description={error} /> : null}
    {!scope && !batchScopes.length ? <Card className="module-grid markup-route-list-card" title={<div><Text strong>线路报价明细</Text><Text type="secondary" className="markup-route-list-subtitle">选择当前价格表线路</Text></div>}>
      <Tabs
        className="markup-route-view-tabs"
        activeKey={routeWorkspaceTab}
        onChange={(key) => { setRouteWorkspaceTab(key as 'quotes' | 'tiers'); setSelectedRouteKeys([]); setSelectedRoutes([]); }}
        items={[
          { key: 'quotes', label: '报价对照' },
          { key: 'tiers', label: '阶梯设置' }
        ]}
      />
      <div className="markup-route-command-bar markup-route-quote-command-bar">
        <div className="markup-route-command-filters">
          <Select
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            aria-label="国家/地区"
            placeholder="全部国家"
            value={routeCountryDraft}
            options={routeResponse.filterOptions.destinationCountries.map((country) => ({ label: country, value: country }))}
            onChange={setRouteCountryDraft}
          />
          <Select
            mode="multiple"
            allowClear
            maxTagCount={1}
            aria-label="计费方式"
            placeholder="全部计费方式"
            value={routeUnitDraft}
            options={[{ label: 'KG', value: 'KG' }, { label: 'CBM', value: 'CBM' }]}
            onChange={setRouteUnitDraft}
          />
          <Input
            allowClear
            aria-label="线路关键词"
            placeholder="搜索真实线路、查价渠道"
            value={routeKeyword}
            onChange={(event) => setRouteKeyword(event.target.value)}
            onPressEnter={applyRouteFilters}
          />
          {routeWorkspaceTab === 'quotes' ? <Space.Compact className="markup-route-chargeable-input">
            <span className="markup-route-chargeable-affix">模拟</span>
            <InputNumber
              min={0}
              precision={3}
              aria-label="模拟计费量"
              value={routeChargeableDraft}
              onChange={(value) => setRouteChargeableDraft(Number(value ?? 0))}
            />
            <span className="markup-route-chargeable-affix">{routeUnitDraft.length === 1 ? routeUnitDraft[0] : 'KG/CBM'}</span>
          </Space.Compact> : null}
          <Button type="primary" onClick={applyRouteFilters}>查询</Button>
          <Button type="link" onClick={resetRouteFilters}>重置</Button>
        </div>
        {routeWorkspaceTab === 'tiers' ? <div className="markup-route-command-actions">
          <Text type="secondary">已选 {selectedRouteKeys.length} 条</Text>
          {canEdit ? <Button type="primary" disabled={!selectedRouteKeys.length} onClick={selectRoutesForEditing}>设置阶梯加价（{selectedRouteKeys.length}）</Button> : null}
        </div> : null}
      </div>
      {routeWorkspaceTab === 'quotes' ? <>
        <div className="markup-route-quote-summary">
          <span>匹配线路 <strong>{routeResponse.pagination.totalItems}</strong></span>
          <span>本页阶梯加价 <strong>{Object.values(routeQuotePreviews).filter((item) => item?.calculation?.markup.source === 'LINE_TIER').length}</strong></span>
          <span>本页代理默认规则 <strong>{Object.values(routeQuotePreviews).filter((item) => item?.calculation && item.calculation.markup.source !== 'LINE_TIER').length}</strong></span>
          <span>当前模拟 <strong>{routeChargeableValue.toFixed(3)} KG/CBM</strong></span>
          {routeQuoteLoading ? <Text type="secondary">本页报价计算中…</Text> : null}
          <Text type="secondary">灰色原价 ＋ 橙色加价 ＝ 蓝色报价</Text>
        </div>
        <ManagedTable
          rowKey={routeScopeKey}
          size="small"
          loading={loading}
          dataSource={routeOptions}
          recordDetail={false}
          scroll={{ x: 1180 }}
          pagination={{
            current: routeResponse.pagination.page,
            pageSize: routePageSize,
            total: routeResponse.pagination.totalItems,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => { setRoutePage(page); setRoutePageSize(pageSize); }
          }}
          onChange={(_, __, sorter, extra) => {
            if (extra.action !== 'sort' || Array.isArray(sorter) || !sorter.field || !sorter.order) return;
            const field = String(sorter.field);
            if (field !== 'realChannelName' && field !== 'channelName' && field !== 'destinationCountry' && field !== 'markupUnit') return;
            setRoutePage(1);
            setRouteSortBy(field);
            setRouteSortOrder(sorter.order === 'descend' ? 'desc' : 'asc');
          }}
          columns={[
            { key: 'realChannelName', title: '真实线路', dataIndex: 'realChannelName', width: 250, fixed: 'left', sorter: true, sortOrder: routeSortBy === 'realChannelName' ? (routeSortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (_, row) => <div className="markup-route-quote-line"><Text strong ellipsis={{ tooltip: row.realChannelName }}>{row.realChannelName}</Text><Text type="secondary" ellipsis={{ tooltip: row.channelName }}>{row.channelName}</Text></div> },
            { key: 'destinationCountry', title: '国家', dataIndex: 'destinationCountry', width: 92, sorter: true, sortOrder: routeSortBy === 'destinationCountry' ? (routeSortOrder === 'asc' ? 'ascend' : 'descend') : null },
            { key: 'markupUnit', title: '计费', dataIndex: 'markupUnit', width: 78, sorter: true, sortOrder: routeSortBy === 'markupUnit' ? (routeSortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (value) => <Tag color="blue">{value}</Tag> },
            { key: 'costRange', title: '命中成本段', width: 145, render: (_, row) => { const key = routeScopeKey(row); if (routeQuoteLoading && routeQuotePreviews[key] === undefined && !routeQuoteErrors[key]) return <Text type="secondary">计算中…</Text>; return routeQuotePreviews[key]?.calculation?.cost.weightSegmentLabel ?? <Text type="secondary">未命中</Text>; } },
            { key: 'priceChain', title: '原始单价 ＋ 加价 ＝ 加价后单价', width: 310, render: (_, row) => { const key = routeScopeKey(row); if (routeQuoteLoading && routeQuotePreviews[key] === undefined && !routeQuoteErrors[key]) return <Text type="secondary">计算中…</Text>; const result = routeQuotePreviews[key]?.calculation; const rowError = routeQuoteErrors[key]; if (!result) return <Text type={rowError ? 'danger' : 'secondary'}>{rowError || '当前计费量无可用成本段'}</Text>; const unitMarkup = result.sale.unitPrice - result.cost.unitPrice; return <span className="markup-route-price-chain"><span>{formatCurrency(result.cost.unitPrice)}</span><b>＋</b><em>+{formatCurrency(unitMarkup)}</em><b>＝</b><strong>{formatCurrency(result.sale.unitPrice)}/{row.markupUnit}</strong></span>; } },
            { key: 'totalPrice', title: `模拟报价（${routeChargeableValue.toFixed(3)}）`, width: 160, render: (_, row) => { const key = routeScopeKey(row); if (routeQuoteLoading && routeQuotePreviews[key] === undefined && !routeQuoteErrors[key]) return <Text type="secondary">计算中…</Text>; const result = routeQuotePreviews[key]?.calculation; return result ? <div><Text strong className="markup-route-quote-total">{formatCurrency(result.sale.totalPrice)}</Text><br /><Text type="secondary">未含未配置附加费</Text></div> : '-'; } },
            { key: 'ruleSource', title: '规则来源', width: 190, render: (_, row) => { const key = routeScopeKey(row); if (routeQuoteLoading && routeQuotePreviews[key] === undefined && !routeQuoteErrors[key]) return <Text type="secondary">计算中…</Text>; const markup = routeQuotePreviews[key]?.calculation?.markup; return markup ? <Tag color={markup.source === 'LINE_TIER' ? 'blue' : undefined}>{getMarkupRuleLabel(markup)}</Tag> : '-'; } },
            { key: 'action', title: '操作', width: 105, fixed: 'right', render: (_, row) => <Button type="link" onClick={() => selectRoute(row)}>{canEdit ? '调整阶梯' : '查看阶梯'}</Button> }
          ]}
        />
      </> : <>
        <Alert className="notice-bar" type="info" showIcon message="规则会绑定当前价格表；相同名称在其他价格表、目的地或计费单位不会复用。" />
        <ManagedTable
          recordDetail={{ title: '线路详情' }}
          rowKey={routeScopeKey}
          loading={loading}
          dataSource={routeOptions}
          showSelectionSummary={false}
          rowSelection={canEdit ? {
            selectedRowKeys: selectedRouteKeys,
            onChange: (keys, selected) => {
              setSelectedRouteKeys(keys);
              setSelectedRoutes(selected);
            }
          } : undefined}
          scroll={{ x: 980 }}
          pagination={{
            current: routeResponse.pagination.page,
            pageSize: routePageSize,
            total: routeResponse.pagination.totalItems,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => { setRoutePage(page); setRoutePageSize(pageSize); }
          }}
          onChange={(_, __, sorter, extra) => {
            if (extra.action !== 'sort' || Array.isArray(sorter) || !sorter.field || !sorter.order) return;
            const field = String(sorter.field);
            if (field !== 'realChannelName' && field !== 'channelName' && field !== 'destinationCountry' && field !== 'markupUnit') return;
            setRoutePage(1);
            setRouteSortBy(field);
            setRouteSortOrder(sorter.order === 'descend' ? 'desc' : 'asc');
          }}
          columns={[
            { key: 'realChannelName', title: '真实线路', dataIndex: 'realChannelName', width: 260, sorter: true, sortOrder: routeSortBy === 'realChannelName' ? (routeSortOrder === 'asc' ? 'ascend' : 'descend') : null },
            { key: 'channelName', title: '查价渠道', dataIndex: 'channelName', width: 280, sorter: true, sortOrder: routeSortBy === 'channelName' ? (routeSortOrder === 'asc' ? 'ascend' : 'descend') : null },
            { key: 'destinationCountry', title: '目的地', dataIndex: 'destinationCountry', width: 130, sorter: true, sortOrder: routeSortBy === 'destinationCountry' ? (routeSortOrder === 'asc' ? 'ascend' : 'descend') : null },
            { key: 'markupUnit', title: '计费方式', dataIndex: 'markupUnit', width: 130, sorter: true, sortOrder: routeSortBy === 'markupUnit' ? (routeSortOrder === 'asc' ? 'ascend' : 'descend') : null, render: (value) => `按${value}` },
            { key: 'action', title: '操作', width: 120, fixed: 'right', render: (_, row) => <Button type="link" onClick={() => selectRoute(row)}>{canEdit ? '单独设置' : '查看阶梯'}</Button> }
          ]}
        />
      </>}
    </Card> : batchScopes.length ? <div className="markup-route-batch-workbench">
      <div className="markup-route-batch-summary">
        <div className="markup-route-batch-summary-copy">
          <Text strong>应用范围</Text>
          <Text type="secondary">修改后一次性覆盖所选线路</Text>
        </div>
        <div className="markup-route-batch-summary-tags">
          <Tag color="blue">共 {batchScopes.length} 条</Tag>
          {batchUnits.map((unit) => <Tag key={unit}>{unit} {batchScopes.filter((route) => route.markupUnit === unit).length} 条</Tag>)}
          <Tag color={batchDirty ? 'orange' : 'default'}>{batchDirty ? '有修改，待保存' : '尚未修改'}</Tag>
        </div>
      </div>
      <div className="markup-route-batch-grid">
        <section className="markup-route-batch-section markup-route-batch-routes">
          <div className="markup-route-batch-section-header">
            <div><Text strong>已选线路</Text><Text type="secondary">核对本次影响范围</Text></div>
            <Text strong>{batchScopes.length}</Text>
          </div>
        <ManagedTable
          rowKey={routeScopeKey}
          size="small"
          pagination={false}
          dataSource={batchScopes}
        columnSettings={false}
        recordDetail={false}
          minimumScrollX={380}
          scroll={{ y: 420 }}
          columns={[
            { key: 'realChannelName', title: '线路', dataIndex: 'realChannelName', sorter: (left, right) => left.realChannelName.localeCompare(right.realChannelName, 'zh-CN'), render: (_, row) => <div className="markup-route-batch-line"><Text strong>{row.realChannelName}</Text><Text type="secondary" ellipsis={{ tooltip: row.channelName }}>{row.channelName}</Text></div> },
            { key: 'destinationCountry', title: '目的地', dataIndex: 'destinationCountry', width: 82, sorter: (left, right) => left.destinationCountry.localeCompare(right.destinationCountry, 'zh-CN') },
            { key: 'markupUnit', title: '计费', dataIndex: 'markupUnit', width: 78, sorter: (left, right) => left.markupUnit.localeCompare(right.markupUnit), render: (value) => <Tag color="blue">{value}</Tag> }
          ]}
        />
        </section>
        <section className="markup-route-batch-section markup-route-batch-rules">
          <div className="markup-route-batch-section-header">
            <div><Text strong>批量阶梯规则</Text><Text type="secondary">KG 与 CBM 分开设置</Text></div>
            {canEdit ? <Button size="small" icon={<Plus size={14} />} onClick={() => setBatchTiers((current) => ({
              ...current,
              [activeBatchUnit]: [...current[activeBatchUnit], { minChargeableValue: 0, maxChargeableValue: undefined, markupValue: 0 }]
            }))}>新增区间</Button> : null}
          </div>
        <Tabs
          className="markup-route-batch-tabs"
          activeKey={activeBatchUnit}
          onChange={(key) => setActiveBatchUnit(key as AgentMarkupUnit)}
          items={batchUnits.map((unit) => ({
            key: unit,
            label: <span>按 {unit}<em>{batchScopes.filter((route) => route.markupUnit === unit).length}</em></span>,
            children: renderBatchRuleTable(unit)
          }))}
        />
        </section>
      </div>
    </div> : <Space direction="vertical" size={16} className="full-width">
      <Card className="module-grid" title="当前线路信息">
        <Row gutter={[16, 12]}>
          <Col xs={24} md={6}><Text type="secondary">{agentFieldLabels.shortName}</Text><br /><Text strong>{activeScope.agentName}</Text></Col>
          <Col xs={24} md={6}><Text type="secondary">真实线路</Text><br /><Text strong>{activeScope.realChannelName}</Text></Col>
          <Col xs={12} md={4}><Text type="secondary">目的地</Text><br /><Text strong>{activeScope.destinationCountry}</Text></Col>
          <Col xs={12} md={4}><Text type="secondary">计费方式</Text><br /><Tag color="blue">按{activeScope.markupUnit}</Tag></Col>
          <Col xs={24} md={4}><Text type="secondary">来源 Sheet</Text><br /><Text>{preview?.route.sourceSheets.join('、') || '-'}</Text></Col>
        </Row>
      </Card>
      <Card className="module-grid" title="重量模拟（实时报价预览)">
        <Space wrap size={16}>
          <Text strong>实际计费量</Text>
          <InputNumber min={0} precision={3} value={activeScope.chargeableValue} addonAfter={activeScope.markupUnit} onChange={(value) => setScope({ ...activeScope, chargeableValue: Number(value ?? 0) })} />
          <Text type="secondary">成本段和阶梯规则均按此数值命中。</Text>
        </Space>
        {calculation ? <Row gutter={[12, 12]} className="pricing-result-grid" style={{ marginTop: 16 }}>
          <Col xs={24} md={5}><Text type="secondary">原始成本价</Text><br /><Text strong>{formatCurrency(calculation.cost.unitPrice)} / {activeScope.markupUnit}<br /><Text type="secondary">{calculation.cost.weightSegmentLabel}</Text></Text></Col>
          <Col xs={24} md={5}><Text type="secondary">命中加价规则</Text><br /><Text strong>{getMarkupRuleLabel(calculation.markup)}</Text><br /><Text type="secondary">{calculation.markup.type === 'WEIGHT' ? `+${formatCurrency(calculation.markup.configuredValue)} / ${activeScope.markupUnit}` : `+${formatCurrency(calculation.markup.configuredValue)}`}</Text></Col>
          <Col xs={12} md={4}><Text type="secondary">实际加价值</Text><br /><Text strong>{formatCurrency(calculation.markup.totalMarkup)}</Text></Col>
          <Col xs={12} md={5}><Text type="secondary">加价后单价</Text><br /><Text strong>{formatCurrency(calculation.sale.unitPrice)} / {activeScope.markupUnit}</Text></Col>
          <Col xs={24} md={5}><Text type="secondary">最终销售价</Text><br /><Text strong>{formatCurrency(calculation.sale.totalPrice)}</Text></Col>
        </Row> : <Alert style={{ marginTop: 16 }} type="warning" showIcon message="当前计费量未命中成本重量段" description="请调整计费重量，或检查价格表中的成本重量段。" />}
      </Card>
      <Card className="module-grid" title={`阶梯加价规则（按 ${activeScope.markupUnit}）`} extra={canEdit ? <Button icon={<Plus size={15} />} onClick={() => setTiers([...tiers, { minChargeableValue: 0, maxChargeableValue: undefined, markupValue: 0 }])}>新增区间</Button> : null}>
        <Alert className="notice-bar" type="info" showIcon message="区间按左闭右开处理；没有命中任何阶梯时自动回退到代理统一加价。" />
        <ManagedTable
          rowKey={(_, index) => String(index)}
          style={{ marginTop: 12 }}
          pagination={false}
          recordDetail={false}
          dataSource={tiers}
          columns={[
            { key: 'minChargeableValue', title: `起始${activeScope.markupUnit}（含）`, width: 220, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={3} value={row.minChargeableValue} onChange={(value) => setTiers(tiers.map((tier, itemIndex) => itemIndex === index ? { ...tier, minChargeableValue: Number(value ?? 0) } : tier))} /> : row.minChargeableValue },
            { key: 'maxChargeableValue', title: `结束${activeScope.markupUnit}（不含，留空为以上）`, width: 280, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={3} value={row.maxChargeableValue} placeholder="不限制" onChange={(value) => setTiers(tiers.map((tier, itemIndex) => itemIndex === index ? { ...tier, maxChargeableValue: value === null ? undefined : Number(value) } : tier))} /> : (row.maxChargeableValue ?? '不限') },
            { key: 'markupValue', title: `加价（元/${activeScope.markupUnit}）`, width: 220, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={2} value={row.markupValue} onChange={(value) => setTiers(tiers.map((tier, itemIndex) => itemIndex === index ? { ...tier, markupValue: Number(value ?? 0) } : tier))} /> : formatCurrency(row.markupValue) },
            { key: 'status', title: '状态', render: (_, row) => <Text type="secondary">{formatRange(row.minChargeableValue, row.maxChargeableValue, activeScope.markupUnit)}</Text> },
            ...(canEdit ? [{ key: 'actions', title: '操作', width: 90, render: (_: unknown, __: MarkupRouteTierInput, index: number) => <Button danger type="text" icon={<Trash2 size={15} />} disabled={tiers.length === 1} onClick={() => setTiers(tiers.filter((_, itemIndex) => itemIndex !== index))}>删除</Button> }] : [])
          ]}
        />
      </Card>
      <Card className="module-grid" title="成本来源重量段">
        <ManagedTable
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          recordDetail={false}
          dataSource={rows}
          scroll={{ x: 900 }}
          rowClassName={(row) => row.id === preview?.selectedCostRowId ? 'ant-table-row-selected' : ''}
          columns={[
            { title: 'Sheet', dataIndex: 'sourceSheetName', width: 160, render: (value) => value || '-' },
            { key: 'costWeightSegment', title: '成本重量段', width: 180, render: (_, row) => `${row.minWeightKg} - ${row.maxWeightKg}${activeScope.markupUnit}` },
            { key: 'costUnitPrice', title: '成本单价', width: 150, render: (_, row) => `${formatCurrency(activeScope.markupUnit === 'CBM' ? Number(row.cbmPrice ?? 0) : Number(row.costPerKg))} / ${activeScope.markupUnit}` },
            { title: '时效', dataIndex: 'transitLabel', render: (value) => value || '待确认' }
          ]}
        />
      </Card>
    </Space>}
  </>;
  return embedded ? content : <AppPage>{content}</AppPage>;
}
