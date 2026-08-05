import { Button, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import type { BusinessCostAuditSummary, PayableAuditSummary, Shipment } from '@siyuan/shared';
import { agentFieldLabels } from './agentFieldLabels';
import { formatBeijingDateTime } from './format';
import { resolveShipmentOutboundOrderNo } from './shipmentOrderNo';

const { Text } = Typography;

export type PendingRoutingApprovalReadiness = {
  ready: boolean;
  missingFields: string[];
};

export function getPendingRoutingApprovalReadiness(shipment: Pick<Shipment, 'destinationCountry' | 'channelId' | 'agentId' | 'routeAgentChannelName'>): PendingRoutingApprovalReadiness {
  const missingFields = [
    shipment.destinationCountry?.trim() ? null : '国家',
    shipment.channelId?.trim() ? null : '公司渠道',
    shipment.agentId?.trim() ? null : '代理',
    shipment.routeAgentChannelName?.trim() ? null : '代理渠道'
  ].filter((field): field is string => Boolean(field));

  return { ready: missingFields.length === 0, missingFields };
}

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

function comparePendingRoutingText(left?: string, right?: string) {
  const normalizedLeft = (left ?? '').trim();
  const normalizedRight = (right ?? '').trim();
  if (normalizedLeft === normalizedRight) return 0;
  if (!normalizedLeft) return 1;
  if (!normalizedRight) return -1;
  return normalizedLeft.localeCompare(normalizedRight, 'zh-Hans-CN', { numeric: true, sensitivity: 'base' });
}

function getBusinessCostTotal(shipment: Shipment, rows: BusinessCostAuditSummary[]) {
  return getBusinessCosts(shipment, rows).reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0);
}

function getPayableCostTotal(shipment: Shipment, rows: PayableAuditSummary[]) {
  const costs = getPayableCosts(shipment, rows);
  return costs.length
    ? costs.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0)
    : Number(shipment.routeCostTotal ?? 0);
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

function renderFeeNames(rows: Array<BusinessCostAuditSummary | PayableAuditSummary>) {
  return rows.length ? (
    <Space direction="vertical" size={0}>
      {rows.map((row) => <Text key={row.id}>{row.name}</Text>)}
    </Space>
  ) : <Text type="secondary">-</Text>;
}

function formatFeeNames(rows: Array<BusinessCostAuditSummary | PayableAuditSummary>) {
  return rows.length ? rows.map((row) => row.name).join('、') : '-';
}

function renderMatrixField(label: string, value: ReactNode, title?: string) {
  return (
    <div className="pending-routing-matrix-field" key={label}>
      <span className="pending-routing-matrix-label">{label}</span>
      <span className="pending-routing-matrix-value" title={title}>{value}</span>
    </div>
  );
}

function renderMatrixCell(fields: Array<{ label: string; value: ReactNode; title?: string }>) {
  return (
    <div className="pending-routing-matrix-cell">
      {fields.map((field) => renderMatrixField(field.label, field.value, field.title))}
    </div>
  );
}

export function createPendingRoutingColumns(options: {
  businessCostAudits?: BusinessCostAuditSummary[];
  payableAudits?: PayableAuditSummary[];
  mode: 'customerService' | 'market' | 'warehouse';
  onRoute?: (shipment: Shipment) => void;
  onApprove?: (shipment: Shipment) => void;
  onModify?: (shipment: Shipment) => void;
  onViewFees?: (shipment: Shipment) => void;
  onViewLog?: (shipment: Shipment) => void;
  canViewBusinessCost?: boolean;
  canViewPayableCost?: boolean;
  canViewAgentChannel?: boolean;
  presentation?: 'columns' | 'matrix';
}): ColumnsType<Shipment> {
  const { businessCostAudits = [], payableAudits = [], mode, onRoute, onApprove, onModify, onViewFees, onViewLog, canViewBusinessCost: businessCostPermission, canViewPayableCost: payableCostPermission, canViewAgentChannel: agentChannelPermission, presentation = 'columns' } = options;
  // 客服保留只读列位置但不返回敏感金额；仓库不展示成本列。
  const canViewPayableCost = payableCostPermission ?? mode === 'market';
  const canViewBusinessCost = businessCostPermission ?? mode !== 'warehouse';
  const canViewAgentChannel = agentChannelPermission ?? mode === 'market';
  const businessCostColumns: ColumnsType<Shipment> = canViewBusinessCost ? [
    {
      key: 'businessCosts',
      title: '业务成本',
      width: mode === 'market' ? 150 : 180,
      render: (_, record) => mode === 'market'
        ? renderFeeNames(getBusinessCosts(record, businessCostAudits))
        : renderFeeRows(getBusinessCosts(record, businessCostAudits))
    },
    {
      key: 'businessCostTotal',
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
  const payableCostColumns: ColumnsType<Shipment> = mode !== 'warehouse' ? [
    {
      key: 'payableCosts',
      title: '应付成本',
      width: 150,
      render: (_, record) => {
        if (!canViewPayableCost) return <Text type="secondary">-</Text>;
        const costs = getPayableCosts(record, payableAudits);
        if (costs.length) return mode === 'market' ? renderFeeNames(costs) : renderFeeRows(costs);
        if (!record.routeCostTotal) return <Text type="secondary">-</Text>;
        return mode === 'market'
          ? <Text>代理成本</Text>
          : <Text>代理成本 {formatAmount(record.routeCostTotal, record.routeCurrency)}</Text>;
      }
    },
    {
      key: 'payableCostTotal',
      title: '应付合计',
      width: 120,
      align: 'right',
      render: (_, record) => {
        if (!canViewPayableCost) return <Text type="secondary">-</Text>;
        const costs = getPayableCosts(record, payableAudits);
        if (costs.length) return formatAmount(costs.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0));
        return formatAmount(record.routeCostTotal, record.routeCurrency);
      }
    }
  ] : [];

  const renderActions = (record: Shipment) => {
    if (mode === 'market') {
      const approvalReadiness = getPendingRoutingApprovalReadiness(record);
      const approvalTitle = approvalReadiness.ready
        ? '审核排货'
        : `请先保存排货资料并补齐：${approvalReadiness.missingFields.join('、')}`;

      return (
        <Space size={4} className="pending-routing-actions">
          {onRoute ? (
            <Button size="small" onClick={() => onRoute(record)}>
              排货
            </Button>
          ) : null}
          {onApprove ? (
            <Button
              size="small"
              type="primary"
              disabled={!approvalReadiness.ready}
              title={approvalTitle}
              onClick={() => onApprove(record)}
            >
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
        </Space>
      );
    }

    return (
      <Space size={6} wrap>
        {onViewFees ? (
          <Button size="small" onClick={() => onViewFees(record)}>
            查看费用
          </Button>
        ) : null}
        <Tag>只读</Tag>
      </Space>
    );
  };

  const columnLayout: ColumnsType<Shipment> = [
    { key: 'pendingRoutingDate', title: '日期', width: 150, render: (_, record) => <span className="pending-routing-date">{formatBeijingDateTime(getPendingRoutingDate(record))}</span> },
    { title: '站点', dataIndex: 'site', width: 76, render: (value?: string) => value || '-' },
    { title: '业务员', dataIndex: 'salesperson', width: 86, ellipsis: true, render: (value?: string) => value || '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 96, ellipsis: true, render: (value: string | undefined, record) => <Text className="pending-routing-identifier">{value || record.customerName.split('-')[0] || '-'}</Text> },
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 150, ellipsis: true, render: (_: string | undefined, record) => <Text strong className="pending-routing-order-no">{resolveShipmentOutboundOrderNo(record)}</Text> },
    { title: '公司渠道', dataIndex: 'channelName', width: 124, ellipsis: true, render: (value?: string) => value || '-' },
    {
      title: '国家',
      dataIndex: 'destinationCountry',
      width: 78,
      render: (value?: string) => value?.trim() ? value : <Text type="danger">缺国家</Text>
    },
    {
      key: 'cargoData',
      title: '货物数据',
      width: 230,
      render: (_, record) => {
        const productName = record.productName?.trim() || '-';
        return <span className="pending-routing-cargo" title={productName}>品名 {productName} · {record.packageCount} 件 · 实重 {(record.weightKg ?? record.receivableWeightKg).toFixed(2)} kg · 计费 {record.receivableWeightKg.toFixed(2)} kg</span>;
      }
    },
    ...businessCostColumns,
    ...(mode === 'market' ? [] : [{
      key: 'routingAction',
      title: '选项',
      width: 84,
      render: () => <Text type="secondary">待市场排货</Text>
    }]),
    ...(canViewAgentChannel ? [
      { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 150, render: (value?: string) => value || '待分配' },
      { title: agentFieldLabels.channel, dataIndex: 'routeAgentChannelName', width: 150, render: (value?: string) => value || '待分配' }
    ] : []),
    ...payableCostColumns,
    {
      key: 'actions',
      title: '操作',
      width: mode === 'market' ? 188 : onViewFees ? 150 : 90,
      fixed: 'right',
      render: (_, record) => renderActions(record)
    }
  ];

  if (mode !== 'market' || presentation !== 'matrix') return columnLayout;

  const matrixColumns: ColumnsType<Shipment> = [
    {
      key: 'matrixBasic',
      title: '基础信息',
      width: 188,
      className: 'pending-routing-matrix-group-basic',
      sorter: (left, right) => Date.parse(getPendingRoutingDate(left)) - Date.parse(getPendingRoutingDate(right)),
      showSorterTooltip: { title: '按日期排序' },
      render: (_, record) => {
        const dateTime = formatBeijingDateTime(getPendingRoutingDate(record));
        return renderMatrixCell([
          { label: '日期', value: dateTime, title: dateTime },
          { label: '站点', value: record.site || '-' },
          { label: '业务员', value: record.salesperson || '-', title: record.salesperson || '-' }
        ]);
      }
    },
    {
      key: 'matrixOrder',
      title: '订单信息',
      width: 174,
      className: 'pending-routing-matrix-group-order',
      sorter: (left, right) => comparePendingRoutingText(
        left.customerCode || left.customerName.split('-')[0],
        right.customerCode || right.customerName.split('-')[0]
      ),
      showSorterTooltip: { title: '按客户编号排序' },
      render: (_, record) => {
        const customerCode = record.customerCode || record.customerName.split('-')[0] || '-';
        return renderMatrixCell([
          { label: '客户编号', value: <Text className="pending-routing-identifier">{customerCode}</Text>, title: customerCode },
          { label: '出货单号', value: <Text className="pending-routing-order-no">{resolveShipmentOutboundOrderNo(record)}</Text>, title: resolveShipmentOutboundOrderNo(record) }
        ]);
      }
    },
    {
      key: 'matrixRoute',
      title: '路线与资料',
      width: 196,
      className: 'pending-routing-matrix-group-route',
      sorter: (left, right) => comparePendingRoutingText(left.destinationCountry, right.destinationCountry),
      showSorterTooltip: { title: '按国家排序' },
      render: (_, record) => {
        const readiness = getPendingRoutingApprovalReadiness(record);
        const country = record.destinationCountry?.trim() || '';
        const statusTitle = readiness.ready ? '排货资料已完整' : `待补：${readiness.missingFields.join('、')}`;
        return renderMatrixCell([
          { label: '国家', value: country || <Text type="danger">缺国家</Text>, title: country || '缺国家' },
          { label: '公司渠道', value: record.channelName || '-', title: record.channelName || '-' },
          {
            label: '资料状态',
            value: <Tag color={readiness.ready ? 'green' : 'gold'} className="pending-routing-matrix-status" title={statusTitle}>{readiness.ready ? '资料完整' : '待补资料'}</Tag>
          }
        ]);
      }
    },
    {
      key: 'matrixCargo',
      title: '货物数据',
      width: 190,
      className: 'pending-routing-matrix-group-cargo',
      sorter: (left, right) => left.receivableWeightKg - right.receivableWeightKg,
      showSorterTooltip: { title: '按计费重排序' },
      render: (_, record) => {
        const productName = record.productName?.trim() || '-';
        return renderMatrixCell([
          { label: '品名', value: productName, title: productName },
          { label: '件数', value: `${record.packageCount} 件` },
          { label: '实重', value: `${(record.weightKg ?? record.receivableWeightKg).toFixed(2)} kg` },
          { label: '计费重', value: `${record.receivableWeightKg.toFixed(2)} kg` }
        ]);
      }
    },
    ...(canViewBusinessCost ? [{
      key: 'matrixBusinessCost',
      title: '业务成本',
      width: 174,
      className: 'pending-routing-matrix-group-business-cost',
      sorter: (left: Shipment, right: Shipment) => getBusinessCostTotal(left, businessCostAudits) - getBusinessCostTotal(right, businessCostAudits),
      showSorterTooltip: { title: '按业务成本合计排序' },
      render: (_: unknown, record: Shipment) => {
        const costs = getBusinessCosts(record, businessCostAudits);
        const names = formatFeeNames(costs);
        const total = costs.length ? formatAmount(costs.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0)) : '-';
        return renderMatrixCell([
          { label: '费用名称', value: names, title: names },
          { label: '业务成本合计', value: total, title: total }
        ]);
      }
    }] : []),
    ...(canViewAgentChannel || canViewPayableCost ? [{
      key: 'matrixAgentPayable',
      title: '代理与应付',
      width: 304,
      className: 'pending-routing-matrix-group-agent',
      sorter: (left: Shipment, right: Shipment) => canViewAgentChannel
        ? comparePendingRoutingText(left.agentName, right.agentName)
        : getPayableCostTotal(left, payableAudits) - getPayableCostTotal(right, payableAudits),
      showSorterTooltip: { title: canViewAgentChannel ? '按代理详细公司名排序' : '按应付合计排序' },
      render: (_: unknown, record: Shipment) => {
        const fields: Array<{ label: string; value: ReactNode; title?: string }> = [];
        if (canViewAgentChannel) {
          fields.push(
            { label: agentFieldLabels.detailedCompanyName, value: record.agentName || '待分配', title: record.agentName || '待分配' },
            { label: agentFieldLabels.channel, value: record.routeAgentChannelName || '待分配', title: record.routeAgentChannelName || '待分配' }
          );
        }
        if (canViewPayableCost) {
          const costs = getPayableCosts(record, payableAudits);
          const names = costs.length ? formatFeeNames(costs) : record.routeCostTotal ? '代理成本' : '-';
          const total = costs.length
            ? formatAmount(costs.reduce((sum, fee) => sum + (fee.rmbAmount ?? fee.amount), 0))
            : formatAmount(record.routeCostTotal, record.routeCurrency);
          fields.push(
            { label: '应付成本', value: names, title: names },
            { label: '应付合计', value: total, title: total }
          );
        }
        return renderMatrixCell(fields);
      }
    }] : []),
    {
      key: 'actions',
      title: '操作',
      width: 132,
      fixed: 'right',
      className: 'pending-routing-matrix-actions',
      render: (_, record) => renderActions(record)
    }
  ];

  return matrixColumns;
}
