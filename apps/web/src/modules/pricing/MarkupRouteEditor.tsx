import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, InputNumber, Row, Space, Tag, Typography } from 'antd';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import type { AgentMarkupUnit, MarkupRoutePreviewInput, MarkupRoutePreviewResponse, MarkupRouteTierInput, PriceBookRowSummary } from '@siyuan/shared';
import { ApiClient, type PermissionKey } from '../../apiClient';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable } from '../shared/ui';
import { formatCurrency } from '../shared/format';

const { Text } = Typography;

interface RouteScope extends MarkupRoutePreviewInput {
  realChannelName: string;
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

function unitForRow(row: PriceBookRowSummary): AgentMarkupUnit {
  return Number(row.cbmPrice ?? 0) > 0 ? 'CBM' : 'KG';
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

export function MarkupRouteEditor({ apiClient, permissions, onNotice }: { apiClient: ApiClient; permissions: PermissionKey[]; onNotice: (message: string | null) => void }) {
  const initial = useMemo(routeFromLocation, []);
  const [scope, setScope] = useState<RouteScope | undefined>(initial.scope);
  const [rows, setRows] = useState<PriceBookRowSummary[]>([]);
  const [preview, setPreview] = useState<MarkupRoutePreviewResponse | null>(null);
  const [tiers, setTiers] = useState<MarkupRouteTierInput[]>([]);
  const [savedTierKey, setSavedTierKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(tiers) !== savedTierKey;
  const canEdit = permissions.includes('pricing:markup-tier:update');
  const scopeRef = useRef(scope);
  const migrationRef = useRef<Promise<void> | null>(null);
  scopeRef.current = scope;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const load = async () => {
      if (!migrationRef.current) {
        migrationRef.current = apiClient.migrateLegacyMarkupRouteScopes().then(() => undefined).catch(() => undefined);
      }
      await migrationRef.current;
      if (scopeRef.current) {
        const next = await apiClient.previewMarkupRoute(scopeRef.current);
        if (!alive) return;
        setPreview(next);
        setRows(next.rows);
        const nextTiers = next.rules
          .sort((left, right) => Number(left.minChargeableValue ?? 0) - Number(right.minChargeableValue ?? 0))
          .map((rule) => ({ minChargeableValue: Number(rule.minChargeableValue ?? 0), maxChargeableValue: rule.maxChargeableValue, markupValue: Number(rule.markupValue ?? rule.markupPerKg ?? 0) }));
        setTiers(nextTiers);
        setSavedTierKey(JSON.stringify(nextTiers));
      } else if (initial.priceBookId) {
        const page = await apiClient.priceBookQuery.priceBookRows(initial.priceBookId, { page: 1, pageSize: 200 });
        if (!alive) return;
        const pageCount = Math.ceil(page.pagination.totalItems / page.pagination.pageSize);
        const remaining = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => apiClient.priceBookQuery.priceBookRows(initial.priceBookId!, { page: index + 2, pageSize: page.pagination.pageSize })));
        if (!alive) return;
        setRows([ ...page.rows, ...remaining.flatMap((item) => item.rows) ]);
      } else {
        throw new Error('缺少价格表参数，请从代理加价规则打开线路工作台');
      }
    };
    void load().catch((reason: unknown) => {
      if (alive) setError(reason instanceof Error ? reason.message : '线路工作台加载失败');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [apiClient, initial.agentName, initial.priceBookId, scope]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const routeOptions = useMemo(() => {
    const result = new Map<string, RouteScope>();
    rows.forEach((row) => {
      const agentName = initial.agentName || row.agentName;
      const realChannelName = row.realChannelName?.trim() || row.channelName;
      const markupUnit = unitForRow(row);
      const next: RouteScope = { priceBookId: row.priceBookId, agentName, channelName: row.channelName, realChannelName, destinationCountry: row.destinationCountry, markupUnit, chargeableValue: 80 };
      result.set(`${next.channelName}\u0001${next.realChannelName}\u0001${next.destinationCountry}\u0001${next.markupUnit}`, next);
    });
    return [...result.values()].sort((left, right) => left.realChannelName.localeCompare(right.realChannelName, 'zh-CN'));
  }, [initial.agentName, rows]);

  const save = async () => {
    if (!scope) return;
    setSaving(true);
    try {
      const next = await apiClient.replaceMarkupRouteTiers({ ...scope, tiers });
      setPreview(next);
      const nextTiers = next.rules
        .sort((left, right) => Number(left.minChargeableValue ?? 0) - Number(right.minChargeableValue ?? 0))
        .map((rule) => ({ minChargeableValue: Number(rule.minChargeableValue ?? 0), maxChargeableValue: rule.maxChargeableValue, markupValue: Number(rule.markupValue ?? rule.markupPerKg ?? 0) }));
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

  const backToRoutes = () => {
    if (dirty && !window.confirm('当前阶梯规则尚未保存，确认返回线路列表？')) return;
    const params = new URLSearchParams({ view: 'route-editor' });
    if (initial.priceBookId) params.set('priceBookId', initial.priceBookId);
    if (initial.agentName) params.set('agentName', initial.agentName);
    window.location.assign(`/app/pricing/markup?${params.toString()}`);
  };

  const calculation = preview?.calculation;
  return <AppPage>
    <AppPageHeader
      title={scope ? '线路阶梯加价' : '线路阶梯加价工作台'}
      description={scope ? '用实际计费量验证成本重量段、命中加价与最终销售价。' : '选择当前价格表内的真实线路后维护独立阶梯加价。'}
      actions={<AppActionGroup><Button icon={<ArrowLeft size={16} />} onClick={scope ? backToRoutes : () => window.close()}>返回</Button>{scope && canEdit ? <Button type="primary" icon={<Save size={16} />} loading={saving} disabled={!dirty} onClick={() => void save()}>保存阶梯</Button> : null}</AppActionGroup>}
    />
    {error ? <Alert type="error" showIcon message="线路工作台加载失败" description={error} /> : null}
    {!scope ? <Card className="module-grid" title="当前价格表线路">
      <Alert className="notice-bar" type="info" showIcon message="规则会绑定当前价格表；相同名称在其他价格表、目的地或计费单位不会复用。" />
      <ManagedTable
        rowKey={(row) => `${row.channelName}-${row.realChannelName}-${row.destinationCountry}-${row.markupUnit}`}
        loading={loading}
        dataSource={routeOptions}
        scroll={{ x: 880 }}
        pagination={{ pageSize: 50, showSizeChanger: true }}
        columns={[
          { title: '真实线路', dataIndex: 'realChannelName', width: 240 },
          { title: '查价渠道', dataIndex: 'channelName', width: 220 },
          { title: '目的地', dataIndex: 'destinationCountry', width: 130 },
          { title: '计费方式', dataIndex: 'markupUnit', width: 110, render: (value) => `按${value}` },
          { title: '操作', width: 140, fixed: 'right', render: (_, row) => <Button type="link" onClick={() => openRoute(row)}>设置阶梯加价</Button> }
        ]}
      />
    </Card> : <Space direction="vertical" size={16} className="full-width">
      <Card className="module-grid" title="当前线路信息">
        <Row gutter={[16, 12]}>
          <Col xs={24} md={6}><Text type="secondary">代理</Text><br /><Text strong>{scope.agentName}</Text></Col>
          <Col xs={24} md={6}><Text type="secondary">真实线路</Text><br /><Text strong>{scope.realChannelName}</Text></Col>
          <Col xs={12} md={4}><Text type="secondary">目的地</Text><br /><Text strong>{scope.destinationCountry}</Text></Col>
          <Col xs={12} md={4}><Text type="secondary">计费方式</Text><br /><Tag color="blue">按{scope.markupUnit}</Tag></Col>
          <Col xs={24} md={4}><Text type="secondary">来源 Sheet</Text><br /><Text>{preview?.route.sourceSheets.join('、') || '-'}</Text></Col>
        </Row>
      </Card>
      <Card className="module-grid" title="重量模拟（实时报价预览)">
        <Space wrap size={16}>
          <Text strong>实际计费量</Text>
          <InputNumber min={0} precision={3} value={scope.chargeableValue} addonAfter={scope.markupUnit} onChange={(value) => setScope({ ...scope, chargeableValue: Number(value ?? 0) })} />
          <Text type="secondary">成本段和阶梯规则均按此数值命中。</Text>
        </Space>
        {calculation ? <Row gutter={[12, 12]} className="pricing-result-grid" style={{ marginTop: 16 }}>
          <Col xs={24} md={5}><Text type="secondary">原始成本价</Text><br /><Text strong>{formatCurrency(calculation.cost.unitPrice)} / {scope.markupUnit}<br /><Text type="secondary">{calculation.cost.weightSegmentLabel}</Text></Text></Col>
          <Col xs={24} md={5}><Text type="secondary">命中加价规则</Text><br /><Text strong>{calculation.markup.source === 'LINE_TIER' ? calculation.markup.rangeLabel : '未命中阶梯，使用统一加价'}</Text><br /><Text type="secondary">{calculation.markup.type === 'WEIGHT' ? `+${formatCurrency(calculation.markup.configuredValue)} / ${scope.markupUnit}` : `+${formatCurrency(calculation.markup.configuredValue)}`}</Text></Col>
          <Col xs={12} md={4}><Text type="secondary">实际加价值</Text><br /><Text strong>{formatCurrency(calculation.markup.totalMarkup)}</Text></Col>
          <Col xs={12} md={5}><Text type="secondary">加价后单价</Text><br /><Text strong>{formatCurrency(calculation.sale.unitPrice)} / {scope.markupUnit}</Text></Col>
          <Col xs={24} md={5}><Text type="secondary">最终销售价</Text><br /><Text strong>{formatCurrency(calculation.sale.totalPrice)}</Text></Col>
        </Row> : <Alert style={{ marginTop: 16 }} type="warning" showIcon message="当前计费量未命中成本重量段" description="请调整计费重量，或检查价格表中的成本重量段。" />}
      </Card>
      <Card className="module-grid" title={`阶梯加价规则（按 ${scope.markupUnit}）`} extra={canEdit ? <Button icon={<Plus size={15} />} onClick={() => setTiers([...tiers, { minChargeableValue: 0, maxChargeableValue: undefined, markupValue: 0 }])}>新增区间</Button> : null}>
        <Alert className="notice-bar" type="info" showIcon message="区间按左闭右开处理；没有命中任何阶梯时自动回退到代理统一加价。" />
        <ManagedTable
          rowKey={(_, index) => String(index)}
          style={{ marginTop: 12 }}
          pagination={false}
          dataSource={tiers}
          columns={[
            { title: `起始${scope.markupUnit}（含）`, width: 220, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={3} value={row.minChargeableValue} onChange={(value) => setTiers(tiers.map((tier, itemIndex) => itemIndex === index ? { ...tier, minChargeableValue: Number(value ?? 0) } : tier))} /> : row.minChargeableValue },
            { title: `结束${scope.markupUnit}（不含，留空为以上）`, width: 280, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={3} value={row.maxChargeableValue} placeholder="不限制" onChange={(value) => setTiers(tiers.map((tier, itemIndex) => itemIndex === index ? { ...tier, maxChargeableValue: value === null ? undefined : Number(value) } : tier))} /> : (row.maxChargeableValue ?? '不限') },
            { title: `加价（元/${scope.markupUnit}）`, width: 220, render: (_, row, index) => canEdit ? <InputNumber min={0} precision={2} value={row.markupValue} onChange={(value) => setTiers(tiers.map((tier, itemIndex) => itemIndex === index ? { ...tier, markupValue: Number(value ?? 0) } : tier))} /> : formatCurrency(row.markupValue) },
            { title: '状态', render: (_, row) => <Text type="secondary">{formatRange(row.minChargeableValue, row.maxChargeableValue, scope.markupUnit)}</Text> },
            ...(canEdit ? [{ title: '操作', width: 90, render: (_: unknown, __: MarkupRouteTierInput, index: number) => <Button danger type="text" icon={<Trash2 size={15} />} disabled={tiers.length === 1} onClick={() => setTiers(tiers.filter((_, itemIndex) => itemIndex !== index))}>删除</Button> }] : [])
          ]}
        />
      </Card>
      <Card className="module-grid" title="成本来源重量段">
        <ManagedTable
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={rows}
          scroll={{ x: 900 }}
          rowClassName={(row) => row.id === preview?.selectedCostRowId ? 'ant-table-row-selected' : ''}
          columns={[
            { title: 'Sheet', dataIndex: 'sourceSheetName', width: 160, render: (value) => value || '-' },
            { title: '成本重量段', width: 180, render: (_, row) => `${row.minWeightKg} - ${row.maxWeightKg}${scope.markupUnit}` },
            { title: '成本单价', width: 150, render: (_, row) => `${formatCurrency(scope.markupUnit === 'CBM' ? Number(row.cbmPrice ?? 0) : Number(row.costPerKg))} / ${scope.markupUnit}` },
            { title: '时效', dataIndex: 'transitLabel', render: (value) => value || '待确认' }
          ]}
        />
      </Card>
    </Space>}
  </AppPage>;
}
