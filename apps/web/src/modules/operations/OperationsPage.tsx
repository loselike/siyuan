import type { Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Boxes, ClipboardList, FileInput, PackagePlus, RotateCcw, Search, Send, Settings, ShieldAlert, Sparkles, Truck, Wallet, Warehouse } from 'lucide-react';
import { Alert, Badge, Button, Card, Col, Flex, Input, Modal, Progress, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { businessTypeLabels, shipmentStatusLabels, type BusinessType, type LineShipmentPoolQuery, type LineShipmentPoolResponse, type LineShipmentPoolRow, type LineShipmentStatusGroup, type Shipment, type ShipmentStatus } from '@siyuan/shared';
import type { ApiClient } from '../../apiClient';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, riskLabel, tenRowTablePagination } from '../shared/ui';
import { formatBeijingDateTime } from '../shared/format';

const { Title, Text } = Typography;

type ShipmentColumnOrderMode = 'default' | 'customerFirst' | 'agentFirst' | 'custom';

interface BusinessWorkspaceConfig {
  description: string;
  metrics: Array<{ title: string; extra: ReactNode }>;
  batchActions: string[];
  assistantCopy: string;
  focusItems: Array<{ title: string; description: string }>;
}

interface RiskInsight {
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  tags: string[];
  suggestedActions: string[];
}

interface AutomationPlanItem {
  shipmentId: string;
  title: string;
  priority: 'urgent' | 'high' | 'normal';
  actions: string[];
}

interface ModuleSummary {
  surfaces: string[];
}

interface ProductModuleSummary {
  name: string;
  phase: string;
  capabilities: string[];
  aiEnhancements: string[];
}

interface ImportValidationSummary {
  validRows: unknown[];
  errors: Array<{ rowNumber: number; field: string; message: string }>;
}

function LinePoolStatusButton({ active, danger, children, onClick }: { active: boolean; danger?: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <Button type={active ? 'primary' : 'default'} danger={danger && !active} onClick={onClick}>
      {children}
    </Button>
  );
}

function statusColor(status: ShipmentStatus) {
  if (['SIGNED', 'OUTBOUNDED', 'DEPARTED'].includes(status)) return 'green';
  if (['PROBLEM', 'STUCK', 'REVIEW_REJECTED'].includes(status)) return 'red';
  if (['WAITING_DISPATCH', 'WAITING_SORT', 'WAITING_DEPARTURE'].includes(status)) return 'cyan';
  return 'blue';
}

export function OperationsPage({
  businessWorkspaceConfig,
  aiQueue,
  importValidation,
  businessType,
  onAiAssist,
  aiLoading,
  onOpenColumnSettings,
  activeWorkspaceSection,
  onActiveWorkspaceSectionChange,
  automationPlan,
  moduleSummary,
  spotlightModules,
  apiClient,
  onViewShipment,
  onProcessShipment
}: {
  businessWorkspaceConfig: BusinessWorkspaceConfig;
  businessShipments: Shipment[];
  aiQueue: Array<{ shipment: Shipment; insight: RiskInsight }>;
  importValidation: ImportValidationSummary;
  businessType: BusinessType;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  selectedStatus: ShipmentStatus | 'ALL';
  onSelectStatus: (status: ShipmentStatus | 'ALL') => void;
  statusOrder: ShipmentStatus[];
  statusCounts: Partial<Record<ShipmentStatus, number>>;
  shipmentColumnOrderMode: ShipmentColumnOrderMode;
  onShipmentColumnOrderModeChange: (mode: ShipmentColumnOrderMode) => void;
  shipmentColumnOrderOptions: Array<{ value: ShipmentColumnOrderMode; label: string }>;
  onOpenColumnSettings: () => void;
  workspaceColumns: ColumnsType<Shipment>;
  visibleShipments: Shipment[];
  activeWorkspaceSection: string;
  onActiveWorkspaceSectionChange: (section: string) => void;
  automationPlan: AutomationPlanItem[];
  moduleSummary: ModuleSummary;
  spotlightModules: ProductModuleSummary[];
  apiClient: ApiClient;
  onViewShipment: (shipment: Shipment) => void;
  onProcessShipment: (shipment: Shipment) => void;
}) {
  const [linePoolQuery, setLinePoolQuery] = useState<LineShipmentPoolQuery>({
    statusGroup: 'ALL',
    datePreset: 'TODAY',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  });
  const [linePoolDraft, setLinePoolDraft] = useState({ keyword: '', datePreset: 'TODAY' as LineShipmentPoolQuery['datePreset'], sortBy: 'createdAt' as LineShipmentPoolQuery['sortBy'] });
  const [linePoolResponse, setLinePoolResponse] = useState<LineShipmentPoolResponse | null>(null);
  const [linePoolLoading, setLinePoolLoading] = useState(false);
  const [selectedLineShipmentIds, setSelectedLineShipmentIds] = useState<Key[]>([]);

  const fetchLinePool = useCallback(async (nextQuery: LineShipmentPoolQuery) => {
    setLinePoolLoading(true);
    try {
      const response = await apiClient.lineShipmentPool(nextQuery);
      setLinePoolResponse(response);
      setSelectedLineShipmentIds([]);
    } finally {
      setLinePoolLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    if (activeWorkspaceSection !== 'shipmentPool') return;
    void fetchLinePool(linePoolQuery);
  }, [activeWorkspaceSection, fetchLinePool, linePoolQuery]);

  const linePoolMetrics = linePoolResponse?.metrics;
  const linePoolRows = linePoolResponse?.rows ?? [];
  const selectedLineRows = useMemo(
    () => linePoolRows.filter((row) => selectedLineShipmentIds.includes(row.shipment.id)),
    [linePoolRows, selectedLineShipmentIds]
  );

  const openUnavailableAction = useCallback((action: string) => {
    Modal.info({
      title: action,
      content: '该动作后端闭环待接入，当前仅保留入口，不会假装处理成功。'
    });
  }, []);

  const handleLinePoolStatus = useCallback((statusGroup: LineShipmentStatusGroup) => {
    setLinePoolQuery((current) => ({ ...current, statusGroup, page: 1 }));
  }, []);

  const handleLinePoolSearch = useCallback(() => {
    setLinePoolQuery((current) => ({
      ...current,
      keyword: linePoolDraft.keyword,
      datePreset: linePoolDraft.datePreset,
      sortBy: linePoolDraft.sortBy,
      page: 1
    }));
  }, [linePoolDraft]);

  const handleLinePoolReset = useCallback(() => {
    const nextQuery: LineShipmentPoolQuery = { statusGroup: 'ALL', datePreset: 'TODAY', sortBy: 'createdAt', sortOrder: 'desc', page: 1, pageSize: 20 };
    setLinePoolDraft({ keyword: '', datePreset: 'TODAY', sortBy: 'createdAt' });
    setLinePoolQuery(nextQuery);
  }, []);

  const createSelectedProblem = useCallback(async () => {
    const shipment = selectedLineRows[0]?.shipment;
    if (!shipment) return;
    await apiClient.createProblemTicket(shipment.id, { reason: '运营工作台批量创建问题件', customerVisible: false });
    message.success('已创建问题件');
    void fetchLinePool(linePoolQuery);
  }, [apiClient, fetchLinePool, linePoolQuery, selectedLineRows]);

  const addSelectedTracking = useCallback(async () => {
    const shipment = selectedLineRows[0]?.shipment;
    if (!shipment) return;
    await apiClient.addTrackingEvent(shipment.id, { status: '运营工作台追加轨迹', happenedAt: new Date().toISOString(), visibleToCustomer: false });
    message.success('已追加轨迹');
    void fetchLinePool(linePoolQuery);
  }, [apiClient, fetchLinePool, linePoolQuery, selectedLineRows]);

  const linePoolColumns = useMemo<ColumnsType<LineShipmentPoolRow>>(() => [
    {
      title: '创建时间',
      width: 120,
      render: (_, row) => {
        const [date, time] = formatBeijingDateTime(row.shipment.createdAt).split(' ');
        return <div className="line-pool-cell-stack"><span>{date}</span><Text type="secondary">{time}</Text></div>;
      }
    },
    {
      title: '客户 / 业务员',
      width: 170,
      render: (_, row) => <div className="line-pool-cell-stack"><Text strong>{row.shipment.customerName}</Text><Text type="secondary">{row.shipment.salesperson ?? '-'}</Text></div>
    },
    {
      title: '单号',
      width: 190,
      render: (_, row) => <div className="line-pool-cell-stack"><Button type="link" className="line-pool-link" onClick={() => onViewShipment(row.shipment)}>{row.shipment.systemOrderNo}</Button><Text type="secondary">{row.shipment.transferNo || '待获取快递号'}</Text></div>
    },
    {
      title: '路由',
      width: 220,
      render: (_, row) => <div className="line-pool-cell-stack"><span>{row.shipment.destinationCountry}</span><span>{row.shipment.channelName || '-'}</span><Text type="secondary">{row.shipment.agentName || '-'}</Text></div>
    },
    { title: '状态', width: 100, render: (_, row) => <Tag color={statusColor(row.shipment.status)}>{shipmentStatusLabels[row.shipment.status]}</Tag> },
    {
      title: '最新轨迹',
      width: 210,
      render: (_, row) => <div className="line-pool-cell-stack"><span>{row.latestTracking || '-'}</span><Text type="secondary">{row.shipment.trackingStaleDays > 0 ? `${row.shipment.trackingStaleDays} 天未更新` : '今日更新'}</Text></div>
    },
    {
      title: '货量 / 费用',
      width: 145,
      render: (_, row) => <div className="line-pool-cell-stack"><span>{row.shipment.packageCount}件 / {row.shipment.agentWeightKg.toFixed(3)}kg</span><Text>{row.receivableAmount !== undefined ? `¥${row.receivableAmount.toFixed(2)}` : '费用隐藏'}</Text></div>
    },
    { title: '收款', width: 105, render: (_, row) => <Tag color={row.receivableAmount ? 'red' : 'default'}>{row.receivableAmount ? '未收款' : '未知'}</Tag> },
    { title: '备注', width: 140, render: (_, row) => row.shipment.remark || '无备注' },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_, row) => (
        <Space size={8}>
          <Button size="small" onClick={() => onViewShipment(row.shipment)}>详情</Button>
          <Button size="small" type="primary" onClick={() => onProcessShipment(row.shipment)}>处理</Button>
        </Space>
      )
    }
  ], [onProcessShipment, onViewShipment]);

  return (
    <AppPage>
      <AppPageHeader
        title="AI 物流运营工作台"
        description={businessWorkspaceConfig.description}
        actions={(
          <AppActionGroup>
            <div className="operations-completion">
              <span>今日完成率</span>
              <strong>{linePoolMetrics?.todayCompletionRate ?? 0}%</strong>
              <Progress percent={linePoolMetrics?.todayCompletionRate ?? 0} showInfo={false} />
            </div>
            <Button icon={<FileInput size={16} />} onClick={() => openUnavailableAction('导入运单')}>导入运单</Button>
            <Button icon={<PackagePlus size={16} />} onClick={() => openUnavailableAction('新建预报')}>新建预报</Button>
            <Button
              type="primary"
              icon={<Bot size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: '运营工作台',
                  task: '智能录单建议',
                  prompt: '请把当前导入质检错误转成录单修正建议，并给客服一段可直接发送给客户的说明。',
                  context: { importErrors: importValidation.errors, businessType }
                })
              }
            >
              智能录单
            </Button>
          </AppActionGroup>
        )}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Truck />} title="待处理运单" value={linePoolMetrics?.pendingCount ?? 0} extra="待审核/待排货/待出库" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<ShieldAlert />}
            title="履约风险"
            value={linePoolMetrics?.riskCount ?? 0}
            extra="问题件、轨迹超时、尾程异常"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Warehouse />} title="今日待出库" value={linePoolMetrics?.todayDispatchCount ?? 0} extra="仓库今日处理" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Wallet />} title="预计应收" value={`¥ ${Math.round(linePoolMetrics?.estimatedReceivable ?? 0).toLocaleString()}`} extra="运费、燃油、偏远和派送费" />
        </Col>
      </Row>

      <ModuleSubWorkspace
        items={[
          { key: 'shipmentPool', label: `${businessTypeLabels[businessType]}运单池`, description: '筛选与批量处理' },
          { key: 'aiQueue', label: 'AI 优先队列', description: '风险项与建议' },
          { key: 'productMap', label: '产品地图', description: '模块覆盖关系' },
          { key: 'importQuality', label: '导入质检', description: '导入错误与计划' }
        ]}
        activeKey={activeWorkspaceSection}
        onChange={onActiveWorkspaceSectionChange}
      >
        {activeWorkspaceSection === 'shipmentPool' ? (
          <Card
            className="workspace-focus-card line-pool-card"
            title={
              <Flex align="center" gap={8}>
                <ClipboardList size={18} />
                <span>专线运单池</span>
                <Text type="secondary">共 {linePoolResponse?.pagination?.totalItems ?? 0} 单 · 后端分页 · 状态数量来自聚合接口</Text>
              </Flex>
            }
            extra={(
              <Space>
                <Text type="secondary">今日更新 {linePoolMetrics?.todayUpdatedCount ?? 0} 条</Text>
                <Button icon={<Settings size={16} />} onClick={() => onOpenColumnSettings()}>
                  列设置
                </Button>
              </Space>
            )}
          >
            <div className="line-pool-status-strip">
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'ALL'} onClick={() => handleLinePoolStatus('ALL')}>全部 {linePoolResponse?.statusCounts?.ALL ?? 0}</LinePoolStatusButton>
              <Text type="secondary">审核:</Text>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'REVIEW_PENDING'} onClick={() => handleLinePoolStatus('REVIEW_PENDING')}>待审核 {linePoolResponse?.statusCounts?.REVIEW_PENDING ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'REVIEW_REJECTED'} onClick={() => handleLinePoolStatus('REVIEW_REJECTED')}>审核不通过 {linePoolResponse?.statusCounts?.REVIEW_REJECTED ?? 0}</LinePoolStatusButton>
              <Text type="secondary">仓库:</Text>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_SORT'} onClick={() => handleLinePoolStatus('WAITING_SORT')}>待排货 {linePoolResponse?.statusCounts?.WAITING_SORT ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_DISPATCH'} onClick={() => handleLinePoolStatus('WAITING_DISPATCH')}>待出库 {linePoolResponse?.statusCounts?.WAITING_DISPATCH ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'OUTBOUNDED'} onClick={() => handleLinePoolStatus('OUTBOUNDED')}>已出库 {linePoolResponse?.statusCounts?.OUTBOUNDED ?? 0}</LinePoolStatusButton>
              <Text type="secondary">运输:</Text>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'WAITING_DEPARTURE'} onClick={() => handleLinePoolStatus('WAITING_DEPARTURE')}>待离港 {linePoolResponse?.statusCounts?.WAITING_DEPARTURE ?? 0}</LinePoolStatusButton>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'DEPARTED'} onClick={() => handleLinePoolStatus('DEPARTED')}>已离港 {linePoolResponse?.statusCounts?.DEPARTED ?? 0}</LinePoolStatusButton>
              <Text type="secondary">签收:</Text>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'SIGNED'} onClick={() => handleLinePoolStatus('SIGNED')}>已签收 {linePoolResponse?.statusCounts?.SIGNED ?? 0}</LinePoolStatusButton>
              <Text type="secondary">异常:</Text>
              <LinePoolStatusButton active={linePoolQuery.statusGroup === 'PROBLEM'} danger onClick={() => handleLinePoolStatus('PROBLEM')}>问题件 {linePoolResponse?.statusCounts?.PROBLEM ?? 0}</LinePoolStatusButton>
            </div>

            <div className="line-pool-filter-strip">
              <Input
                allowClear
                prefix={<Search size={16} />}
                value={linePoolDraft.keyword}
                placeholder="搜索客户 / 运单号 / 转单号 / 渠道 / 代理"
                onChange={(event) => setLinePoolDraft((current) => ({ ...current, keyword: event.target.value }))}
              />
              <Space.Compact>
                {[
                  ['TODAY', '今天'],
                  ['LAST_7_DAYS', '近7天'],
                  ['ALL', '全部']
                ].map(([value, label]) => (
                  <Button key={value} type={linePoolDraft.datePreset === value ? 'primary' : 'default'} onClick={() => setLinePoolDraft((current) => ({ ...current, datePreset: value as LineShipmentPoolQuery['datePreset'] }))}>
                    {label}
                  </Button>
                ))}
              </Space.Compact>
              <Select
                value={linePoolDraft.sortBy}
                options={[
                  { value: 'createdAt', label: '默认顺序' },
                  { value: 'customerName', label: '按客户' },
                  { value: 'systemOrderNo', label: '按单号' },
                  { value: 'status', label: '按状态' }
                ]}
                onChange={(value) => setLinePoolDraft((current) => ({ ...current, sortBy: value }))}
              />
              <Button type="primary" icon={<Search size={16} />} onClick={handleLinePoolSearch}>查询</Button>
              <Button icon={<RotateCcw size={16} />} onClick={handleLinePoolReset}>重置</Button>
              <Button type="link">收起</Button>
            </div>

            <div className="line-pool-batch-bar">
              <Text>已选 {selectedLineShipmentIds.length} 单</Text>
              <Button type="primary" disabled={!selectedLineShipmentIds.length} onClick={() => openUnavailableAction('批量装板')}>批量装板</Button>
              <Button type="primary" disabled={!selectedLineShipmentIds.length} onClick={() => openUnavailableAction('排舱确认')}>排舱确认</Button>
              <Button type="primary" disabled={!selectedLineShipmentIds.length} onClick={() => void createSelectedProblem()}>新建问题</Button>
              <Button disabled={!selectedLineShipmentIds.length} onClick={() => openUnavailableAction('生成装箱单')}>生成装箱单</Button>
              <Button disabled={!selectedLineShipmentIds.length} onClick={() => openUnavailableAction('头程发货')}>头程发货</Button>
              <Button disabled={!selectedLineShipmentIds.length} onClick={() => openUnavailableAction('尾程转单')}>尾程转单</Button>
              <Button disabled={!selectedLineShipmentIds.length} onClick={() => openUnavailableAction('清关资料审核')}>清关资料审核</Button>
              <Button disabled={!selectedLineShipmentIds.length} onClick={() => void addSelectedTracking()}>添加轨迹</Button>
              <Button disabled={!selectedLineShipmentIds.length}>更多操作</Button>
            </div>

            <Table<LineShipmentPoolRow>
              className="line-pool-table"
              rowKey={(row) => row.shipment.id}
              loading={linePoolLoading}
              columns={linePoolColumns}
              dataSource={linePoolRows}
              size="small"
              rowSelection={{ selectedRowKeys: selectedLineShipmentIds, onChange: setSelectedLineShipmentIds }}
              scroll={{ x: 1420 }}
              locale={{ emptyText: '暂无符合条件的运单' }}
              pagination={{
                current: linePoolResponse?.pagination?.page ?? 1,
                pageSize: linePoolResponse?.pagination?.pageSize ?? 20,
                total: linePoolResponse?.pagination?.totalItems ?? 0,
                showSizeChanger: false,
                onChange: (page, pageSize) => setLinePoolQuery((current) => ({ ...current, page, pageSize }))
              }}
            />
          </Card>
        ) : null}

        {activeWorkspaceSection === 'aiQueue' ? (
          <div className="workspace-panel-stack">
            <Card
              title={
                <Flex align="center" gap={8}>
                  <Bot size={18} />
                  <span>AI 优先处理队列</span>
                </Flex>
              }
            >
              <div className="fulfillment-ai-grid">
                {aiQueue.map(({ shipment, insight }) => (
                  <Card key={shipment.id} size="small" className={`risk-card risk-${insight.riskLevel}`}>
                    <Flex justify="space-between" align="start">
                      <Space direction="vertical" size={4}>
                        <Text strong>{shipment.systemOrderNo}</Text>
                        <Text type="secondary">
                          {shipment.customerName} · {shipment.destinationCountry}
                        </Text>
                      </Space>
                      <Badge status={insight.riskLevel === 'high' ? 'error' : 'warning'} text={riskLabel(insight.riskLevel)} />
                    </Flex>
                    <Text className="risk-summary">{insight.summary}</Text>
                    <Space wrap className="risk-tags">
                      {insight.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                    <Alert type={insight.riskLevel === 'high' ? 'error' : 'warning'} showIcon message={insight.suggestedActions[0]} />
                  </Card>
                ))}
              </div>
            </Card>

            <Card className="assistant-card">
              <Space direction="vertical" size={10}>
                <Flex align="center" gap={8}>
                  <Sparkles size={18} />
                  <Text strong>下一步 AI 赋能</Text>
                </Flex>
                <Text type="secondary">{businessWorkspaceConfig.assistantCopy}</Text>
                <Button
                  type="primary"
                  icon={<Send size={16} />}
                  loading={aiLoading}
                  onClick={() =>
                    onAiAssist({
                      module: '运营工作台',
                      task: '生成今日处理建议',
                      prompt: businessWorkspaceConfig.assistantCopy,
                      context: { automationPlan, focusItems: businessWorkspaceConfig.focusItems }
                    })
                  }
                >
                  生成今日处理建议
                </Button>
              </Space>
            </Card>
          </div>
        ) : null}

        {activeWorkspaceSection === 'productMap' ? (
          <Card
            className="workspace-focus-card"
            title={
              <Flex align="center" gap={8}>
                <Boxes size={18} />
                <Title level={3} className="card-heading">
                  全模块产品地图
                </Title>
              </Flex>
            }
            extra={<Text type="secondary">一期先闭环核心业务，二期接入硬件、微信和开放 API</Text>}
          >
            <div className="surface-strip">
              {moduleSummary.surfaces.map((surface) => (
                <Tag key={surface} color={surface === 'AI 助手' ? 'blue' : 'default'}>
                  {surface}
                </Tag>
              ))}
            </div>
            <Row gutter={[12, 12]}>
              {spotlightModules.map((module) => (
                <Col xs={24} md={12} key={module.name}>
                  <div className="module-card">
                    <Flex justify="space-between" align="center">
                      <Text strong>
                        {module.name === '开放 API'
                          ? '开放接口与设备'
                          : module.name === 'AI 助手'
                            ? '智能助手中心'
                            : module.name}
                      </Text>
                      <Tag color={module.phase === 'phase-one' ? 'green' : 'gold'}>
                        {module.phase === 'phase-one' ? '一期' : '二期'}
                      </Tag>
                    </Flex>
                    <Text type="secondary">{module.capabilities.slice(0, 4).join(' / ')}</Text>
                    <div className="ai-enhancement">AI 增强：{module.aiEnhancements[0]}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        ) : null}

        {activeWorkspaceSection === 'importQuality' ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Flex align="center" gap={8}>
                    <FileInput size={18} />
                    <span>智能导入质检</span>
                  </Flex>
                }
              >
                <Space direction="vertical" size={12} className="quality-panel">
                  <Flex justify="space-between">
                    <Text>可导入行</Text>
                    <Text strong>{importValidation.validRows.length}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text>待修正问题</Text>
                    <Text strong type="danger">
                      {importValidation.errors.length}
                    </Text>
                  </Flex>
                  {importValidation.errors.slice(0, 3).map((error) => (
                    <Alert
                      key={`${error.rowNumber}-${error.field}`}
                      type="warning"
                      showIcon
                      message={`第 ${error.rowNumber} 行：${error.message}`}
                    />
                  ))}
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card className="automation-card" title="AI 自动化计划">
                <Space direction="vertical" size={10} className="quality-panel">
                  {automationPlan.map((item) => (
                    <div key={item.shipmentId} className="automation-item">
                      <Flex justify="space-between" align="center">
                        <Text strong>{item.title}</Text>
                        <Tag color={item.priority === 'urgent' ? 'red' : item.priority === 'high' ? 'orange' : 'default'}>
                          {item.priority === 'urgent' ? '紧急' : item.priority === 'high' ? '高优先' : '普通'}
                        </Tag>
                      </Flex>
                      <Text type="secondary">{item.actions.slice(0, 2).join('；')}</Text>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        ) : null}
      </ModuleSubWorkspace>
    </AppPage>
  );
}
