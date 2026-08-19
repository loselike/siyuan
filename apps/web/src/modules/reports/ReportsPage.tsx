import { useMemo, useState } from 'react';
import type { BusinessCostAuditSummary, PayableAuditSummary, ReceivableAuditSummary, Shipment } from '@siyuan/shared';
import { BarChart3, Bot, ClipboardCheck, Package, PiggyBank, Sparkles, Truck } from 'lucide-react';
import { Alert, Button, Card, Col, Flex, Row, Space, Tag, Typography } from 'antd';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { downloadCsv } from '../finance/exportCsv';
import { formatCurrency } from '../shared/format';
import { AppActionGroup, AppPageHeader, ManagedTable, MetricCard, renderNoticeBar } from '../shared/ui';
import type { PermissionKey, RoleKey } from '../../apiClient';
import { getGlobalFieldMaskVisibility } from '../shared/globalFieldMask';

const { Text } = Typography;

export interface LowFrequencyModuleConfig {
  title: string;
  description: string;
  capabilities: string[];
  aiEnhancements: string[];
  siliconFlowScenarios: string[];
}

type ReportSectionKey = 'operations' | 'warehouse' | 'finance' | 'ai';

type OperationsReportRow = {
  key: string;
  businessType: string;
  shipmentCount: number;
  pendingReviewCount: number;
  waitingSortCount: number;
  waitingDispatchCount: number;
  outboundedCount: number;
  signedCount: number;
  problemCount: number;
};

type WarehouseReportRow = {
  key: string;
  stage: string;
  shipmentCount: number;
  sensitiveCount: number;
  declarationCount: number;
  shippingMarkCount: number;
  invoiceUploadedCount: number;
};

type FinanceReportRow = {
  key: string;
  reportName: string;
  recordCount: number;
  pendingCount: number;
  confirmedCount: number;
  voidedCount: number;
  rmbTotal: number;
  profitText: string;
};

const reportSectionItems: ModuleSubNavItem[] = [
  { key: 'operations', label: '运营报表', description: '按业务类型看运单状态' },
  { key: 'warehouse', label: '仓库报表', description: '按仓库节点看待处理运单' },
  { key: 'finance', label: '财务报表', description: '按费用类别看金额与状态' },
  { key: 'ai', label: 'AI 赋能', description: '日报与异常解释' }
];

const businessTypeLabels: Record<string, string> = {
  DEDICATED_LINE: '专线',
  EXPRESS: '快递',
  SMALL_PACKET: '小包'
};

function sumRmbAmount(rows: Array<{ rmbAmount?: number; amount: number; currency?: string }>) {
  return rows.reduce((sum, row) => {
    if (typeof row.rmbAmount === 'number') return sum + row.rmbAmount;
    if ((row.currency ?? 'RMB') === 'RMB') return sum + row.amount;
    return sum;
  }, 0);
}

function countFinanceStatuses(rows: Array<{ reconciliationStatus?: string; voided?: boolean }>) {
  return rows.reduce(
    (summary, row) => {
      if (row.voided || row.reconciliationStatus === 'VOIDED') {
        summary.voided += 1;
      } else if (row.reconciliationStatus === 'CONFIRMED' || row.reconciliationStatus === 'LOCKED') {
        summary.confirmed += 1;
      } else {
        summary.pending += 1;
      }
      return summary;
    },
    { pending: 0, confirmed: 0, voided: 0 }
  );
}

function getTodayShipmentCount(shipments: Shipment[]) {
  const today = new Date().toDateString();
  return shipments.filter((shipment) => shipment.outboundAt && new Date(shipment.outboundAt).toDateString() === today).length;
}

function formatBusinessType(value: string) {
  return businessTypeLabels[value] ?? value;
}

function buildOperationsRows(shipments: Shipment[]): OperationsReportRow[] {
  const rows = new Map<string, OperationsReportRow>();
  for (const shipment of shipments) {
    const key = shipment.businessType;
    const current = rows.get(key) ?? {
      key,
      businessType: formatBusinessType(key),
      shipmentCount: 0,
      pendingReviewCount: 0,
      waitingSortCount: 0,
      waitingDispatchCount: 0,
      outboundedCount: 0,
      signedCount: 0,
      problemCount: 0
    };
    current.shipmentCount += 1;
    if (shipment.status === 'REVIEW_PENDING') current.pendingReviewCount += 1;
    if (shipment.status === 'WAITING_SORT') current.waitingSortCount += 1;
    if (shipment.status === 'WAITING_DISPATCH') current.waitingDispatchCount += 1;
    if (shipment.status === 'OUTBOUNDED') current.outboundedCount += 1;
    if (shipment.status === 'SIGNED') current.signedCount += 1;
    if (shipment.status === 'PROBLEM' || shipment.hasProblemTicket) current.problemCount += 1;
    rows.set(key, current);
  }
  return Array.from(rows.values()).sort((left, right) => right.shipmentCount - left.shipmentCount);
}

function buildWarehouseRows(shipments: Shipment[]): WarehouseReportRow[] {
  const stageDefinitions = [
    { key: 'WAITING_RECEIVE', stage: '待收货' },
    { key: 'WAITING_SORT', stage: '待排货' },
    { key: 'WAITING_DISPATCH', stage: '待出库' },
    { key: 'OUTBOUNDED', stage: '已出库' }
  ] as const;
  return stageDefinitions.map(({ key, stage }) => {
    const rows = shipments.filter((shipment) => shipment.status === key);
    return {
      key,
      stage,
      shipmentCount: rows.length,
      sensitiveCount: rows.filter((shipment) => shipment.sensitive).length,
      declarationCount: rows.filter((shipment) => shipment.declarationRequired).length,
      shippingMarkCount: rows.filter((shipment) => shipment.shippingMarkRequired).length,
      invoiceUploadedCount: rows.filter((shipment) => shipment.businessInvoiceUploadedAt).length
    };
  });
}

function buildFinanceRows(
  receivables: ReceivableAuditSummary[],
  businessCostAudits: BusinessCostAuditSummary[],
  payableAudits: PayableAuditSummary[]
): FinanceReportRow[] {
  const receivableStatuses = countFinanceStatuses(receivables);
  const businessStatuses = countFinanceStatuses(businessCostAudits);
  const payableStatuses = countFinanceStatuses(payableAudits);
  const businessProfitTotal = businessCostAudits.reduce((sum, row) => sum + (typeof row.businessProfit === 'number' ? row.businessProfit : 0), 0);
  const payableProfitVisible = payableAudits.some((row) => row.canViewProfit && typeof row.operationProfit === 'number');
  const payableProfitTotal = payableAudits.reduce((sum, row) => sum + (typeof row.operationProfit === 'number' ? row.operationProfit : 0), 0);
  return [
    {
      key: 'receivable',
      reportName: '应收',
      recordCount: receivables.length,
      pendingCount: receivableStatuses.pending,
      confirmedCount: receivableStatuses.confirmed,
      voidedCount: receivableStatuses.voided,
      rmbTotal: sumRmbAmount(receivables),
      profitText: '--'
    },
    {
      key: 'business-cost',
      reportName: '业务成本',
      recordCount: businessCostAudits.length,
      pendingCount: businessStatuses.pending,
      confirmedCount: businessStatuses.confirmed,
      voidedCount: businessStatuses.voided,
      rmbTotal: sumRmbAmount(businessCostAudits),
      profitText: businessCostAudits.some((row) => typeof row.businessProfit === 'number') ? formatCurrency(businessProfitTotal) : '--'
    },
    {
      key: 'payable',
      reportName: '应付',
      recordCount: payableAudits.length,
      pendingCount: payableStatuses.pending,
      confirmedCount: payableStatuses.confirmed,
      voidedCount: payableStatuses.voided,
      rmbTotal: sumRmbAmount(payableAudits),
      profitText: payableProfitVisible ? formatCurrency(payableProfitTotal) : '--'
    }
  ].filter((row) => row.recordCount > 0);
}

export function ReportsPage(props: {
  config?: LowFrequencyModuleConfig;
  notice?: string | null;
  shipments: Shipment[];
  receivables: ReceivableAuditSummary[];
  businessCostAudits: BusinessCostAuditSummary[];
  payableAudits: PayableAuditSummary[];
  role?: RoleKey | string;
  permissions?: PermissionKey[];
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const { config, notice, shipments, receivables, businessCostAudits, payableAudits, role, permissions = [], onAiAssist, aiLoading } = props;
  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const [activeSection, setActiveSection] = useState<ReportSectionKey>('operations');

  const operationsRows = useMemo(() => buildOperationsRows(shipments), [shipments]);
  const warehouseRows = useMemo(() => buildWarehouseRows(shipments), [shipments]);
  const financeRows = useMemo(
    () => buildFinanceRows(receivables, businessCostAudits, payableAudits)
      .filter((row) => row.key !== 'payable' || (fieldVisibility.showPayableCost && fieldVisibility.showPayableStatus)),
    [businessCostAudits, fieldVisibility.showPayableCost, fieldVisibility.showPayableStatus, payableAudits, receivables]
  );
  const todayOutboundCount = useMemo(() => getTodayShipmentCount(shipments), [shipments]);
  const waitingDispatchCount = useMemo(
    () => shipments.filter((shipment) => shipment.status === 'WAITING_DISPATCH').length,
    [shipments]
  );
  const receivableRmbTotal = useMemo(() => sumRmbAmount(receivables), [receivables]);
  const businessProfitTotal = useMemo(
    () => businessCostAudits.reduce((sum, row) => sum + (typeof row.businessProfit === 'number' ? row.businessProfit : 0), 0),
    [businessCostAudits]
  );

  function exportCurrentSection() {
    if (activeSection === 'operations') {
      downloadCsv(
        'operations-report.csv',
        [
          { key: 'businessType', label: '业务类型' },
          { key: 'shipmentCount', label: '运单数' },
          { key: 'pendingReviewCount', label: '待审核' },
          { key: 'waitingSortCount', label: '待排货' },
          { key: 'waitingDispatchCount', label: '待出库' },
          { key: 'outboundedCount', label: '已出库' },
          { key: 'signedCount', label: '已签收' },
          { key: 'problemCount', label: '问题件' }
        ],
        operationsRows
      );
      return;
    }

    if (activeSection === 'warehouse') {
      downloadCsv(
        'warehouse-report.csv',
        [
          { key: 'stage', label: '仓库节点' },
          { key: 'shipmentCount', label: '运单数' },
          { key: 'sensitiveCount', label: '敏感货' },
          { key: 'declarationCount', label: '报关件' },
          { key: 'shippingMarkCount', label: '需贴麦头' },
          { key: 'invoiceUploadedCount', label: '已传业务发票' }
        ],
        warehouseRows
      );
      return;
    }

    if (activeSection === 'finance') {
      downloadCsv(
        'finance-report.csv',
        [
          { key: 'reportName', label: '报表类型' },
          { key: 'recordCount', label: '记录数' },
          { key: 'pendingCount', label: '待确认' },
          { key: 'confirmedCount', label: '已确认' },
          { key: 'voidedCount', label: '已作废' },
          { key: 'rmbTotal', label: 'RMB 合计' },
          { key: 'profitText', label: '利润/毛利' }
        ],
        financeRows.map((row) => ({ ...row, rmbTotal: row.rmbTotal.toFixed(2) }))
      );
    }
  }

  return (
    <>
      <AppPageHeader
        title={config?.title ?? '统计报表中心'}
        description={(
          <Space direction="vertical" size={4}>
            <span>{config?.description ?? '基于现有运单与财务数据生成运营、仓库和财务报表。'}</span>
            <Space size={[8, 8]} wrap>
              {(config?.capabilities ?? ['运营报表', '仓库报表', '财务报表']).map((item) => (
                <Tag key={item} color="blue">
                  {item}
                </Tag>
              ))}
            </Space>
          </Space>
        )}
        actions={(
          <AppActionGroup>
            <Button
              icon={<ClipboardCheck size={16} />}
              onClick={exportCurrentSection}
              disabled={activeSection === 'ai'}
            >
              导出当前报表
            </Button>
            <Button
              type="primary"
              icon={<Sparkles size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: config?.title ?? '统计报表中心',
                  task: '生成日报与异常提示',
                  prompt: '请基于当前统计报表数据，输出今日运营摘要、仓库风险和财务关注点。',
                  context: {
                    operationsRows,
                    warehouseRows,
                    financeRows,
                    shipmentCount: shipments.length
                  }
                })
              }
            >
              AI 生成日报
            </Button>
          </AppActionGroup>
        )}
      />

      {renderNoticeBar(notice)}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Truck />} title="今日出货" value={String(todayOutboundCount)} extra="按运单出库时间统计" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<Package />} title="待仓库出货" value={String(waitingDispatchCount)} extra="当前待出库运单" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<PiggyBank />} title="应收 RMB" value={formatCurrency(receivableRmbTotal)} extra="当前已加载应收合计" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <MetricCard icon={<BarChart3 />} title="业务毛利" value={formatCurrency(businessProfitTotal)} extra="按业务成本报表汇总" />
        </Col>
      </Row>

      <ModuleSubWorkspace items={reportSectionItems} activeKey={activeSection} onChange={(key) => setActiveSection(key as ReportSectionKey)}>
        <Row gutter={[16, 16]} className="main-grid">
          <Col xs={24}>
            {activeSection === 'operations' ? (
              <Card title="运营报表">
                <ManagedTable<OperationsReportRow>
                  rowKey="key"
                  dataSource={operationsRows}
                  pagination={false}
                  recordDetail={false}
                  columns={[
                    { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 140, fixed: 'left' },
                    { title: '运单数', dataIndex: 'shipmentCount', key: 'shipmentCount', width: 120 },
                    { title: '待审核', dataIndex: 'pendingReviewCount', key: 'pendingReviewCount', width: 120 },
                    { title: '待排货', dataIndex: 'waitingSortCount', key: 'waitingSortCount', width: 120 },
                    { title: '待出库', dataIndex: 'waitingDispatchCount', key: 'waitingDispatchCount', width: 120 },
                    { title: '已出库', dataIndex: 'outboundedCount', key: 'outboundedCount', width: 120 },
                    { title: '已签收', dataIndex: 'signedCount', key: 'signedCount', width: 120 },
                    {
                      title: '问题件',
                      dataIndex: 'problemCount',
                      key: 'problemCount',
                      width: 120,
                      render: (value: number) => (value > 0 ? <Tag color="red">{value}</Tag> : <Text type="secondary">0</Text>)
                    }
                  ]}
                />
              </Card>
            ) : null}

            {activeSection === 'warehouse' ? (
              <Card title="仓库报表">
                <ManagedTable<WarehouseReportRow>
                  rowKey="key"
                  dataSource={warehouseRows}
                  pagination={false}
                  recordDetail={false}
                  columns={[
                    { title: '仓库节点', dataIndex: 'stage', key: 'stage', width: 140, fixed: 'left' },
                    { title: '运单数', dataIndex: 'shipmentCount', key: 'shipmentCount', width: 120 },
                    { title: '敏感货', dataIndex: 'sensitiveCount', key: 'sensitiveCount', width: 120 },
                    { title: '报关件', dataIndex: 'declarationCount', key: 'declarationCount', width: 120 },
                    { title: '需贴麦头', dataIndex: 'shippingMarkCount', key: 'shippingMarkCount', width: 140 },
                    { title: '已传业务发票', dataIndex: 'invoiceUploadedCount', key: 'invoiceUploadedCount', width: 160 }
                  ]}
                />
              </Card>
            ) : null}

            {activeSection === 'finance' ? (
              <Card title="财务报表">
                <ManagedTable<FinanceReportRow>
                  rowKey="key"
                  dataSource={financeRows}
                  pagination={false}
                  recordDetail={false}
                  columns={[
                    { title: '报表类型', dataIndex: 'reportName', key: 'reportName', width: 140, fixed: 'left' },
                    { title: '记录数', dataIndex: 'recordCount', key: 'recordCount', width: 120 },
                    { title: '待确认', dataIndex: 'pendingCount', key: 'pendingCount', width: 120 },
                    { title: '已确认', dataIndex: 'confirmedCount', key: 'confirmedCount', width: 120 },
                    { title: '已作废', dataIndex: 'voidedCount', key: 'voidedCount', width: 120 },
                    { title: 'RMB 合计', dataIndex: 'rmbTotal', key: 'rmbTotal', width: 150, render: (value: number) => formatCurrency(value) },
                    { title: '利润/毛利', dataIndex: 'profitText', key: 'profitText', width: 140 }
                  ]}
                />
              </Card>
            ) : null}

            {activeSection === 'ai' ? (
              <Card title={<Flex align="center" gap={8}><Bot size={18} /><span>AI 赋能</span></Flex>}>
                <Space direction="vertical" size={12} className="quality-panel">
                  {(config?.aiEnhancements ?? []).map((item) => <Alert key={item} type="info" showIcon message={item} />)}
                  {(config?.siliconFlowScenarios ?? []).map((item) => <Alert key={item} type="success" showIcon message={`硅基流动场景：${item}`} />)}
                  <Alert type="warning" showIcon message="报表导出只基于当前权限可见数据，不补全无权限字段。" />
                </Space>
              </Card>
            ) : null}
          </Col>
        </Row>
      </ModuleSubWorkspace>
    </>
  );
}
