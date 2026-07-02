import type { ReactNode } from 'react';
import { useState } from 'react';
import { Activity, Banknote, Bot, Boxes, FileInput, FileText, PackageCheck, PackagePlus, Send, Settings, Sparkles, Truck } from 'lucide-react';
import { Alert, Badge, Button, Card, Col, Flex, Progress, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { businessTypeLabels, shipmentStatusLabels, type BusinessType, type Shipment, type ShipmentStatus } from '@siyuan/shared';
import { ModuleSubWorkspace } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, riskLabel, tenRowTablePagination } from '../shared/ui';

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



export function OperationsPage({
  businessWorkspaceConfig,
  businessShipments,
  aiQueue,
  importValidation,
  businessType,
  onAiAssist,
  aiLoading,
  selectedStatus,
  onSelectStatus,
  statusOrder,
  statusCounts,
  shipmentColumnOrderMode,
  onShipmentColumnOrderModeChange,
  shipmentColumnOrderOptions,
  onOpenColumnSettings,
  workspaceColumns,
  visibleShipments,
  activeWorkspaceSection,
  onActiveWorkspaceSectionChange,
  automationPlan,
  moduleSummary,
  spotlightModules
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
}) {
  return (
    <AppPage>
      <AppPageHeader
        title="AI 物流运营工作台"
        description={businessWorkspaceConfig.description}
        actions={(
          <AppActionGroup>
            <Button icon={<FileInput size={16} />}>导入运单</Button>
            <Button icon={<PackagePlus size={16} />}>新建预报</Button>
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
          <MetricCard icon={<Truck />} title={businessWorkspaceConfig.metrics[0].title} value={businessShipments.length} extra={businessWorkspaceConfig.metrics[0].extra} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard
            icon={<Activity />}
            title={businessWorkspaceConfig.metrics[1].title}
            value={aiQueue.filter((item) => item.insight.tags.includes('轨迹超时')).length}
            extra={businessWorkspaceConfig.metrics[1].extra}
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Banknote />} title={businessWorkspaceConfig.metrics[2].title} value="¥ 18,642" extra={businessWorkspaceConfig.metrics[2].extra} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<PackageCheck />} title={businessWorkspaceConfig.metrics[3].title} value="92%" extra={<Progress percent={92} showInfo={false} />} />
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
            className="workspace-focus-card"
            title={
              <Flex align="center" gap={8}>
                <FileText size={18} />
                <span>{businessTypeLabels[businessType]}运单池</span>
              </Flex>
            }
            extra={<Text type="secondary">筛选、状态池、批量动作统一在一个工作面</Text>}
          >
            <div className="status-strip">
              <Button
                type={selectedStatus === 'ALL' ? 'primary' : 'default'}
                onClick={() => onSelectStatus('ALL')}
              >
                全部 {businessShipments.length}
              </Button>
              {statusOrder.map((status) => (
                <Button
                  key={status}
                  type={selectedStatus === status ? 'primary' : 'default'}
                  onClick={() => onSelectStatus(status)}
                >
                  {shipmentStatusLabels[status]} {statusCounts[status] ?? 0}
                </Button>
              ))}
              <Space className="table-column-tools" size={8}>
                <Select
                  aria-label="运单列顺序"
                  className="column-order-select"
                  value={shipmentColumnOrderMode}
                  options={shipmentColumnOrderOptions}
                  onChange={onShipmentColumnOrderModeChange}
                />
                <Button icon={<Settings size={16} />} onClick={() => onOpenColumnSettings()}>
                  列设置
                </Button>
              </Space>
            </div>

            <div className="batch-bar">
              <Space wrap>
                {businessWorkspaceConfig.batchActions.map((action) => (
                  <Button key={action} size="small">
                    {action}
                  </Button>
                ))}
              </Space>
            </div>

            <ManagedTable
              className="workspace-table"
              rowKey="id"
              columns={workspaceColumns}
              dataSource={visibleShipments}
              size="small"
              pagination={tenRowTablePagination}
              minimumScrollX={1100}
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
