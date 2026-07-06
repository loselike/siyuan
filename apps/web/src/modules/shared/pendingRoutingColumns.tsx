import { Button, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BusinessCostAuditSummary, Shipment } from '@siyuan/shared';
import { formatBeijingDateTime } from './format';

const { Text } = Typography;

function formatAmount(amount?: number, currency = 'RMB') {
  return typeof amount === 'number' ? `${amount.toFixed(2)} ${currency}` : '-';
}

function getPendingRoutingDate(shipment: Shipment) {
  return shipment.reviewedAt ?? shipment.businessReviewedAt ?? shipment.entryAt ?? shipment.createdAt;
}

function getBusinessCosts(shipment: Shipment, rows: BusinessCostAuditSummary[] = []) {
  return rows.filter((fee) => fee.shipmentId === shipment.id || fee.systemOrderNo === shipment.systemOrderNo);
}

function renderFeeRows(rows: BusinessCostAuditSummary[]) {
  return rows.length ? (
    <Space direction="vertical" size={0}>
      {rows.map((row) => <Text key={row.id}>{row.name} {formatAmount(row.amount, row.currency)}</Text>)}
    </Space>
  ) : <Text type="secondary">-</Text>;
}

export function createPendingRoutingColumns(options: {
  businessCostAudits?: BusinessCostAuditSummary[];
  mode: 'market' | 'warehouse';
  onApprove?: (shipment: Shipment) => void;
  onModify?: (shipment: Shipment) => void;
  onViewLog?: (shipment: Shipment) => void;
}): ColumnsType<Shipment> {
  const { businessCostAudits = [], mode, onApprove, onModify } = options;
  return [
    { title: '日期', width: 170, render: (_, record) => formatBeijingDateTime(getPendingRoutingDate(record)) },
    { title: '站点', dataIndex: 'site', width: 100, render: (value?: string) => value || '-' },
    { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value || '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 110, render: (value: string | undefined, record) => value || record.customerName.split('-')[0] || '-' },
    { title: '运单号', dataIndex: 'systemOrderNo', width: 170 },
    { title: '业务渠道', dataIndex: 'channelName', width: 150, render: (value?: string) => value || '-' },
    { title: '货物数据', width: 145, render: (_, record) => `${record.packageCount} 件 / ${record.receivableWeightKg.toFixed(2)} kg` },
    { title: '业务成本', width: 180, render: (_, record) => renderFeeRows(getBusinessCosts(record, businessCostAudits)) },
    {
      title: '业务成本合计',
      width: 130,
      align: 'right',
      render: (_, record) => formatAmount(getBusinessCosts(record, businessCostAudits).reduce((sum, fee) => sum + fee.amount, 0))
    },
    {
      title: '选项',
      width: 120,
      render: () => mode === 'market' ? <Tag color="blue">待审核</Tag> : <Text type="secondary">待市场排货</Text>
    },
    { title: '代理', dataIndex: 'agentName', width: 130, render: (value?: string) => value || '待分配' },
    { title: '代理渠道', dataIndex: 'routeAgentChannelName', width: 150, render: (value?: string) => value || '待分配' },
    { title: '应付成本', width: 150, render: (_, record) => record.routeCostTotal ? <Text>代理成本 {formatAmount(record.routeCostTotal, record.routeCurrency)}</Text> : <Text type="secondary">-</Text> },
    { title: '应付合计', width: 120, align: 'right', render: (_, record) => formatAmount(record.routeCostTotal, record.routeCurrency) },
    {
      title: '操作',
      width: mode === 'market' ? 150 : 90,
      fixed: 'right',
      render: (_, record) => mode === 'market' ? (
        <Space size={6} wrap>
          {onApprove ? (
            <Button size="small" type="primary" onClick={() => onApprove(record)}>
              审核
            </Button>
          ) : null}
          {onModify ? (
            <Button size="small" onClick={() => onModify(record)}>
              修改
            </Button>
          ) : null}
        </Space>
      ) : <Tag>只读</Tag>
    }
  ];
}
