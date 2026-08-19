import { Button, Popconfirm, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BusinessCostAuditSummary, PayableAuditSummary, Shipment } from '@siyuan/shared';
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

function getPayableCosts(shipment: Shipment, rows: PayableAuditSummary[] = []) {
  return rows.filter((fee) => fee.shipmentId === shipment.id || fee.systemOrderNo === shipment.systemOrderNo);
}

function renderFeeRows(rows: Array<BusinessCostAuditSummary | PayableAuditSummary>) {
  return rows.length ? (
    <Space direction="vertical" size={0}>
      {rows.map((row) => {
        const hasWeightFormula = Number(row.chargeWeightKg) > 0 && Number(row.unitPrice) > 0;
        const formula = hasWeightFormula ? `${Number(row.chargeWeightKg).toFixed(2)} × ${Number(row.unitPrice).toFixed(2)}` : undefined;
        return <Text key={row.id}>{row.name} {formula ? `${formula} = ` : ''}{formatAmount(row.amount, row.currency)}</Text>;
      })}
    </Space>
  ) : <Text type="secondary">-</Text>;
}

export function createPendingRoutingColumns(options: {
  businessCostAudits?: BusinessCostAuditSummary[];
  payableAudits?: PayableAuditSummary[];
  mode: 'customerService' | 'market' | 'warehouse';
  onRoute?: (shipment: Shipment) => void;
  onApprove?: (shipment: Shipment) => void;
  onModify?: (shipment: Shipment) => void;
  onViewFees?: (shipment: Shipment) => void;
  onViewPayableFees?: (shipment: Shipment) => void;
  onViewLog?: (shipment: Shipment) => void;
  onReturnReview?: (shipment: Shipment) => void;
  canViewBusinessCost?: boolean;
  canViewPayableCost?: boolean;
  canViewAgentChannel?: boolean;
  canViewRouteCost?: boolean;
  /** Retained for callers that switch between the standard and matrix table layouts. */
  presentation?: 'columns' | 'matrix';
}): ColumnsType<Shipment> {
  const { businessCostAudits = [], payableAudits = [], mode, onRoute, onApprove, onModify, onViewFees, onViewPayableFees, onViewLog, onReturnReview, canViewBusinessCost: businessCostPermission, canViewPayableCost: payableCostPermission, canViewAgentChannel: agentChannelPermission, canViewRouteCost: routeCostPermission } = options;
  // 客服保留只读列位置但不返回敏感金额；仓库不展示成本列。
  const canViewPayableCost = mode === 'market' ? false : payableCostPermission ?? true;
  const canViewBusinessCost = businessCostPermission ?? mode !== 'warehouse';
  const canViewAgentChannel = agentChannelPermission ?? mode === 'market';
  const canViewRouteCost = routeCostPermission ?? mode === 'market';
  const routeCostColumns: ColumnsType<Shipment> = mode === 'market' && canViewRouteCost ? [
    { title: '计费重', width: 92, render: (_, record) => record.routeChargeWeightKg === undefined ? '-' : `${record.routeChargeWeightKg.toFixed(3)} KG` },
    { title: '单价', width: 92, render: (_, record) => formatAmount(record.routeUnitPrice, record.routeCurrency) },
    { title: '其他费用', width: 104, render: (_, record) => formatAmount(record.routeOtherFee, record.routeCurrency) },
    { title: '总成本', width: 108, render: (_, record) => formatAmount(record.routeCostTotal, record.routeCurrency) }
  ] : [];
  const businessCostColumns: ColumnsType<Shipment> = canViewBusinessCost ? [
    { title: '业务成本', width: 180, render: (_, record) => renderFeeRows(getBusinessCosts(record, businessCostAudits)) },
    {
      title: '业务成本合计',
      width: 130,
      align: 'right',
      render: (_, record) => {
        const costs = getBusinessCosts(record, businessCostAudits);
        const total = costs.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0);
        return costs.length ? formatAmount(total) : <Text type="secondary">-</Text>;
      }
    }
  ] : [];
  const payableCostColumns: ColumnsType<Shipment> = mode === 'customerService' && canViewPayableCost ? [
    {
      title: '应付成本',
      width: 150,
      render: (_, record) => {
        const costs = getPayableCosts(record, payableAudits);
        return costs.length ? renderFeeRows(costs) : record.routeCostTotal ? <Text>代理成本 {formatAmount(record.routeCostTotal, record.routeCurrency)}</Text> : <Text type="secondary">-</Text>;
      }
    },
    {
      title: '应付合计',
      width: 120,
      align: 'right',
      render: (_, record) => {
        const costs = getPayableCosts(record, payableAudits);
        if (costs.length) return formatAmount(costs.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0));
        return formatAmount(record.routeCostTotal, record.routeCurrency);
      }
    }
  ] : [];
  const marketOrderInfoColumns: ColumnsType<Shipment> = mode === 'market' ? [
    { title: '备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (value?: string) => value?.trim() || '-' },
    { title: '亚马逊代码', dataIndex: 'fbaWarehouseCode', width: 120, ellipsis: true, render: (value?: string) => value?.trim() || '-' },
    { title: '邮编', dataIndex: 'receiverPostalCode', width: 110, ellipsis: true, render: (value?: string) => value?.trim() || '-' }
  ] : [];

  return [
    { title: '日期', width: 170, render: (_, record) => formatBeijingDateTime(getPendingRoutingDate(record)) },
    { title: '站点', dataIndex: 'site', width: 100, render: (value?: string) => value || '-' },
    { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value || '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 110, render: (value: string | undefined, record) => value || record.customerName.split('-')[0] || '-' },
    { title: '运单号', dataIndex: 'systemOrderNo', width: 170 },
    { title: '公司渠道', dataIndex: 'channelName', width: 150, render: (value?: string) => value || '-' },
    {
      title: '国家',
      dataIndex: 'destinationCountry',
      width: 100,
      render: (value?: string) => value?.trim() ? value : <Text type="danger">缺国家</Text>
    },
    { title: '货物数据', width: 180, render: (_, record) => `${record.packageCount} 件 / 实重 ${(record.weightKg ?? record.receivableWeightKg).toFixed(2)} kg / 计费 ${record.receivableWeightKg.toFixed(2)} kg` },
    ...businessCostColumns,
    ...routeCostColumns,
    ...(mode === 'market' ? [] : [{ title: '选项', width: 84, render: () => <Text type="secondary">待市场排货</Text> }]),
    ...(canViewAgentChannel ? [
      { title: '代理', dataIndex: 'agentName', width: 130, render: (value?: string) => value || '待分配' },
      { title: '代理渠道', dataIndex: 'routeAgentChannelName', width: 150, render: (value?: string) => value || '待分配' }
    ] : []),
    ...payableCostColumns,
    ...marketOrderInfoColumns,
    {
      title: '操作',
      width: mode === 'market' ? 270 : onViewFees ? 150 : 90,
      fixed: 'right',
      render: (_, record) => mode === 'market' ? (
        <Space size={4} wrap>
          {onRoute ? <Button size="small" onClick={() => onRoute(record)}>排货</Button> : null}
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
          {onViewLog ? (
            <Button size="small" onClick={() => onViewLog(record)}>
              操作日志
            </Button>
          ) : null}
          {onViewFees ? (
            <Button size="small" onClick={() => onViewFees(record)}>
              业务成本
            </Button>
          ) : null}
          {onViewPayableFees ? (
            <Button size="small" onClick={() => onViewPayableFees(record)}>
              应付成本
            </Button>
          ) : null}
          {onReturnReview ? (
            <Popconfirm
              title="确认退回重审？"
              description="订单将回到待审核状态，当前待排货资料会解除。"
              okText="退回重审"
              cancelText="取消"
              onConfirm={() => onReturnReview(record)}
            >
              <Button size="small" danger>退回重审</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ) : (
        <Space size={6} wrap>
          {onViewFees ? (
            <Button size="small" onClick={() => onViewFees(record)}>
              查看费用
            </Button>
          ) : null}
          <Tag>只读</Tag>
        </Space>
      )
    }
  ];
}
