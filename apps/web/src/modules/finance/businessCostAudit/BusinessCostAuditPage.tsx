import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Card, Col, Flex, Form, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { RefreshCw } from 'lucide-react';
import type {
  BusinessCostAuditCreateInput,
  BusinessCostAuditListQuery,
  BusinessCostAuditListResponse,
  BusinessCostAuditSummary,
  BusinessCostAuditUpdateInput,
  FinanceBillingUnit,
  FinanceCatalogItemSummary
} from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../../apiClient';
import { createFinanceFeeNameOptions, financeCatalogCurrencyOptions } from '../catalog';
import { downloadCsv } from '../exportCsv';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { agentFieldLabels } from '../../shared/agentFieldLabels';
import { AppDatePicker, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, type ManagedTableColumns } from '../../shared/ui';
import { ChargeWeightChangeTag } from '../ChargeWeightChangeTag';
import { resolveShipmentOutboundOrderNo } from '../../shared/shipmentOrderNo';
import { getGlobalFieldMaskVisibility } from '../../shared/globalFieldMask';

const { Text } = Typography;

const businessCostBillingUnitOptions: Array<{ label: string; value: FinanceBillingUnit }> = [
  { label: '计费重（KG）', value: 'KG' },
  { label: '体积（CBM）', value: 'CBM' }
];

function billingUnitLabel(unit?: FinanceBillingUnit) {
  return unit === 'CBM' ? 'CBM' : 'KG';
}

type BusinessCostAuditPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role?: RoleKey | string;
  rows: BusinessCostAuditSummary[];
  financeCatalogItems: FinanceCatalogItemSummary[];
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
  onRowsChange: (rows: BusinessCostAuditSummary[]) => void;
};

type ColumnKey =
  | 'agentName'
  | 'name'
  | 'customerCode'
  | 'systemOrderNo'
  | 'transferNo'
  | 'reconciliationStatus'
  | 'currency'
  | 'chargeWeightKg'
  | 'unitPrice'
  | 'amount'
  | 'orderRmbTotal'
  | 'businessProfit'
  | 'salesperson'
  | 'createdAt'
  | 'createdBy'
  | 'reviewedAt'
  | 'reviewedBy'
  | 'remark'
  | 'action';

const defaultQuery: BusinessCostAuditListQuery = {
  page: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  status: 'ALL'
};

const defaultColumnOrder: ColumnKey[] = [
  'agentName',
  'name',
  'customerCode',
  'systemOrderNo',
  'transferNo',
  'reconciliationStatus',
  'currency',
  'chargeWeightKg',
  'unitPrice',
  'amount',
  'orderRmbTotal',
  'businessProfit',
  'salesperson',
  'createdAt',
  'createdBy',
  'reviewedAt',
  'reviewedBy',
  'remark',
  'action'
];

// 切换到紧凑布局后，旧版保存的超宽列设置不应继续覆盖新的默认工作视图。
const columnStorageKey = 'siyuan.finance.businessCostAudit.columns.v2';

function formatMoney(amount?: number, currency = 'RMB') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  if (currency === 'RMB' || currency === 'CNY') return formatCurrency(amount);
  return `${currency} ${amount.toFixed(2)}`;
}

function statusTag(value?: string) {
  const status = value ?? 'PENDING';
  const color = status === 'CONFIRMED' ? 'success' : status === 'VOIDED' ? 'default' : 'warning';
  return <Tag color={color}>{status === 'CONFIRMED' ? '已审核' : status === 'VOIDED' ? '已作废' : '待审核'}</Tag>;
}

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

export function BusinessCostAuditPage({
  apiClient,
  permissions,
  role,
  rows,
  financeCatalogItems,
  renderShipmentOrderNoLink,
  onRowsChange
}: BusinessCostAuditPageProps) {
  const [queryForm] = Form.useForm<BusinessCostAuditListQuery>();
  const [form] = Form.useForm<BusinessCostAuditCreateInput & BusinessCostAuditUpdateInput>();
  const [query, setQuery] = useState<BusinessCostAuditListQuery>(defaultQuery);
  const [response, setResponse] = useState<BusinessCostAuditListResponse>({
    rows,
    totals: { amountByCurrency: [], rmbTotal: 0, pendingCount: 0, confirmedCount: 0, voidedCount: 0 },
    pagination: { page: 1, pageSize: 10, totalItems: rows.length }
  });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<BusinessCostAuditSummary | null>(null);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const canManage = hasPermission(permissions, 'finance:business-cost:manage');
  const canAudit = hasPermission(permissions, 'finance:business-cost:audit');
  const canReverse = hasPermission(permissions, 'finance:business-cost:reverse');
  const canVoid = hasPermission(permissions, 'finance:business-cost:void');
  const canBatchAudit = canAudit;
  const canBatchReverse = canReverse;
  const canBatchVoid = canVoid;
  const canExport = hasPermission(permissions, 'finance:business-cost:export');
  const canViewAgent = fieldVisibility.showAgentCompanyName && (hasPermission(permissions, 'finance:business-cost:view-agent') || response.rows.some((row) => row.canViewAgent));
  const canViewProfit = hasPermission(permissions, 'finance:business-cost:view-profit') || response.rows.some((row) => row.canViewProfit);
  const feeNameOptions = useMemo(
    () => createFinanceFeeNameOptions(financeCatalogItems),
    [financeCatalogItems]
  );

  const loadRows = async (nextQuery = query) => {
    setLoading(true);
    try {
      const next = await apiClient.businessCostAudits(nextQuery);
      setResponse(next);
      onRowsChange(next.rows);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(defaultQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setResponse((current) => ({
      ...current,
      rows,
      pagination: { ...current.pagination, totalItems: Math.max(current.pagination.totalItems, rows.length) }
    }));
  }, [rows]);

  const applyQuery = async () => {
    const values = queryForm.getFieldsValue();
    const next = { ...defaultQuery, ...values, page: 1 };
    setQuery(next);
    await loadRows(next);
  };

  const resetQuery = async () => {
    queryForm.resetFields();
    setQuery(defaultQuery);
    await loadRows(defaultQuery);
  };

  const openEditor = (row?: BusinessCostAuditSummary) => {
    setEditingRow(row ?? null);
    form.setFieldsValue(row ? {
      name: row.name,
      billingUnit: row.billingUnit ?? 'KG',
      billingQuantity: row.billingQuantity ?? row.chargeWeightKg,
      chargeWeightKg: row.chargeWeightKg,
      unitPrice: row.unitPrice,
      amount: row.amount,
      currency: row.currency ?? 'RMB',
      paymentNo: row.paymentNo,
      remark: row.remark
    } : { name: '业务员成本', currency: 'RMB', billingUnit: 'KG' });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingRow(null);
    form.resetFields();
  };

  const syncAmount = (values: BusinessCostAuditCreateInput & BusinessCostAuditUpdateInput) => {
    const quantity = Number(values.billingQuantity ?? values.chargeWeightKg);
    const price = Number(values.unitPrice);
    if (Number.isFinite(quantity) && Number.isFinite(price)) {
      form.setFieldValue('amount', Number((quantity * price).toFixed(2)));
    }
  };

  const submitEditor = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      billingUnit: values.billingUnit ?? 'KG',
      billingQuantity: typeof values.billingQuantity === 'number' ? values.billingQuantity : values.chargeWeightKg,
      chargeWeightKg: values.billingUnit === 'CBM' ? undefined : values.chargeWeightKg ?? values.billingQuantity,
      amount: typeof (values.billingQuantity ?? values.chargeWeightKg) === 'number' && typeof values.unitPrice === 'number'
        ? Number(((values.billingQuantity ?? values.chargeWeightKg)! * values.unitPrice).toFixed(2))
        : values.amount
    };
    if (editingRow) {
      await apiClient.updateBusinessCostAudit(editingRow.id, payload);
      message.success('业务成本已修改');
    } else {
      await apiClient.createBusinessCostAudit(payload);
      message.success('业务成本已新增');
    }
    closeEditor();
    await loadRows();
  };

  const runBatch = async (action: 'audit' | 'reverse' | 'void') => {
    if (!selectedIds.length) return;
    const result = action === 'audit'
      ? await apiClient.batchAuditBusinessCosts({ ids: selectedIds })
      : action === 'reverse'
        ? await apiClient.batchReverseAuditBusinessCosts({ ids: selectedIds })
        : await apiClient.batchVoidBusinessCosts({ ids: selectedIds });
    const failureReasons = Array.from(new Set(result.failures.map((item) => item.reason))).slice(0, 3);
    if (result.failureCount) {
      message.warning(`处理完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条。${failureReasons.join('；') || '请检查记录状态或权限。'}`);
    } else {
      message.success(`处理完成：成功 ${result.successCount} 条`);
    }
    await loadRows();
  };

  const baseColumns: Record<ColumnKey, ColumnsType<BusinessCostAuditSummary>[number]> = {
    agentName: { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 170, ellipsis: true, render: (value?: string) => value ?? '-' },
    name: { title: '费用名称', dataIndex: 'name', width: 80, ellipsis: true, sorter: true },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 80, ellipsis: true, sorter: true },
    systemOrderNo: { title: '出货单号', dataIndex: 'systemOrderNo', width: 130, sorter: true, render: (_: string | undefined, row) => renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)) },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 115, render: (value?: string) => <Text className="table-compact-text">{value ?? '-'}</Text> },
    reconciliationStatus: {
      title: '对账状态',
      dataIndex: 'reconciliationStatus',
      width: 82,
      fixed: 'right',
      className: 'finance-business-cost-audit-status-column',
      render: statusTag
    },
    currency: {
      title: '币种',
      dataIndex: 'currency',
      width: 64,
      className: 'finance-business-cost-audit-currency-column',
      render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag>
    },
    chargeWeightKg: {
      title: '计费数量', dataIndex: 'billingQuantity', width: 120, align: 'right',
      render: (_value: number | undefined, row) => row.billingUnit === 'CBM'
        ? `${(row.billingQuantity ?? 0).toFixed(6)} CBM`
        : <ChargeWeightChangeTag value={row.billingQuantity ?? row.chargeWeightKg} change={row.chargeWeightChange} showUnit />
    },
    unitPrice: { title: '单价', dataIndex: 'unitPrice', width: 85, align: 'right', render: (value: number | undefined, row) => typeof value === 'number' ? formatMoney(value, row.currency) : '-' },
    amount: { title: '总金额', dataIndex: 'amount', width: 95, align: 'right', sorter: true, render: (value: number, row) => formatMoney(value, row.currency) },
    orderRmbTotal: { title: '合计(RMB)', dataIndex: 'orderRmbTotal', width: 100, align: 'right', sorter: true, render: (value?: number) => formatCurrency(value ?? 0) },
    businessProfit: {
      title: '业务利润',
      dataIndex: 'businessProfit',
      width: 95,
      align: 'right',
      sorter: true,
      render: (value: number | undefined, row) => row.canViewProfit && typeof value === 'number'
        ? <Text type={value < 0 ? 'danger' : value > 0 ? 'success' : 'secondary'}>{formatCurrency(value)}</Text>
        : <Text type="secondary">按权限隐藏</Text>
    },
    salesperson: { title: '业务员', dataIndex: 'salesperson', width: 80, ellipsis: true, render: (value?: string) => value ?? '-' },
    createdAt: { title: '制单日期', dataIndex: 'createdAt', width: 132, ellipsis: true, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    createdBy: { title: '制单人', dataIndex: 'createdBy', width: 82, ellipsis: true, render: (value?: string) => value ?? '系统' },
    reviewedAt: { title: '审单日期', dataIndex: 'reviewedAt', width: 132, ellipsis: true, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    reviewedBy: { title: '审单人', dataIndex: 'reviewedBy', width: 82, ellipsis: true, render: (value?: string) => value ?? '-' },
    remark: { title: '备注', dataIndex: 'remark', width: 110, ellipsis: true, render: (value?: string) => value ?? '-' },
    action: {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          <Button size="small" disabled={!canManage || row.reconciliationStatus === 'CONFIRMED' || row.voided} onClick={() => openEditor(row)}>修改</Button>
          {row.reconciliationStatus === 'CONFIRMED' ? (
            <Popconfirm title="确认反审核该业务成本？" onConfirm={async () => { await apiClient.reverseAuditBusinessCost(row.id); await loadRows(); }} okText="反审核" cancelText="取消">
              <Button size="small" disabled={!canReverse}>反审核</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="确认审核该业务成本？" onConfirm={async () => { await apiClient.auditBusinessCost(row.id); await loadRows(); }} okText="审核" cancelText="取消">
              <Button size="small" type="primary" disabled={!canAudit || row.voided}>审核</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确认作废该业务成本？" onConfirm={async () => { await apiClient.deleteBusinessCostAudit(row.id); await loadRows(); }} okText="作废" cancelText="取消">
            <Button size="small" danger disabled={!canVoid || row.reconciliationStatus === 'CONFIRMED' || row.voided}>作废</Button>
          </Popconfirm>
        </Space>
      )
    }
  };

  const unavailableColumns = new Set<ColumnKey>([
    ...(!canViewAgent ? ['agentName' as const] : []),
    ...(!canViewProfit ? ['businessProfit' as const] : [])
  ]);
  const columns = defaultColumnOrder
    .filter((key) => !unavailableColumns.has(key))
    .map((key) => baseColumns[key]);

  const matrixColumns: ManagedTableColumns<BusinessCostAuditSummary> = [
    {
      key: 'matrixInformation',
      title: '信息',
      width: 960,
      className: 'managed-matrix-group-primary',
      render: (_value, row) => (
        <ManagedMatrixCell
          columns={4}
          labelWidth={66}
          fields={[
            { key: 'systemOrderNo', label: '出货单号', value: renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)), title: resolveShipmentOutboundOrderNo(row) },
            { key: 'customerCode', label: '客户编号', value: row.customerCode || '-' },
            { key: 'transferNo', label: '转单号', value: row.transferNo || '-', title: row.transferNo },
            { key: 'salesperson', label: '业务员', value: row.salesperson || '-' },
            { key: 'name', label: '费用名称', value: row.name || '-' },
            row.canViewAgent && fieldVisibility.showAgentCompanyName ? { key: 'agentName', label: agentFieldLabels.detailedCompanyName, value: row.agentName || '-', title: row.agentName, wrap: true } : null,
            { key: 'currency', label: '币种', value: <Tag>{row.currency ?? 'RMB'}</Tag> },
            { key: 'billingUnit', label: '计费方式', value: row.billingUnit === 'CBM' ? '体积（CBM）' : '计费重（KG）' },
            { key: 'chargeWeightKg', label: '计费数量', value: row.billingUnit === 'CBM' ? `${(row.billingQuantity ?? 0).toFixed(6)} CBM` : <ChargeWeightChangeTag value={row.billingQuantity ?? row.chargeWeightKg} change={row.chargeWeightChange} showUnit /> },
            { key: 'unitPrice', label: '单价', value: formatMoney(row.unitPrice, row.currency) },
            { key: 'amount', label: '总金额', value: formatMoney(row.amount, row.currency) },
            { key: 'orderRmbTotal', label: '合计(RMB)', value: formatCurrency(row.orderRmbTotal ?? 0) },
            row.canViewProfit ? {
              key: 'businessProfit',
              label: '业务利润',
              value: typeof row.businessProfit === 'number'
                ? <Text type={row.businessProfit < 0 ? 'danger' : row.businessProfit > 0 ? 'success' : 'secondary'}>{formatCurrency(row.businessProfit)}</Text>
                : '-'
            } : null,
            { key: 'status', label: '状态', value: statusTag(row.reconciliationStatus) },
            { key: 'createdAt', label: '制单日期', value: <ManagedMatrixDateTime value={row.createdAt ? formatBeijingDateTime(row.createdAt) : undefined} /> },
            { key: 'createdBy', label: '制单人', value: row.createdBy || '系统' },
            { key: 'reviewedAt', label: '审单日期', value: <ManagedMatrixDateTime value={row.reviewedAt ? formatBeijingDateTime(row.reviewedAt) : undefined} /> },
            { key: 'reviewedBy', label: '审单人', value: row.reviewedBy || '-' },
            row.remark ? { key: 'remark', label: '备注', value: row.remark, title: row.remark, wrap: true } : null
          ]}
        />
      )
    },
    { ...baseColumns.action, key: 'action', width: 150, fixed: 'right' }
  ];

  return (
    <Card
      title="业务员成本"
      className="finance-work-card"
      extra={
        <Space wrap>
          <Popconfirm title={`确认批量审核已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('audit')} okText="批量审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canBatchAudit}>批量审核</Button>
          </Popconfirm>
          <Popconfirm title={`确认批量反审核已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('reverse')} okText="批量反审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canBatchReverse}>批量反审核</Button>
          </Popconfirm>
          <Popconfirm title={`确认批量作废已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('void')} okText="批量作废" cancelText="取消">
            <Button disabled={!selectedIds.length || !canBatchVoid} danger>批量作废</Button>
          </Popconfirm>
          <Button disabled={!canExport} onClick={async () => {
            const exported = await apiClient.exportBusinessCostAudits({ ids: selectedIds.length ? selectedIds : undefined, query });
            downloadCsv('business-cost-audits.csv', [
              ...(fieldVisibility.showAgentCompanyName ? [{ key: 'agentName', label: agentFieldLabels.detailedCompanyName }] : []),
              { key: 'name', label: '费用名称' },
              { key: 'customerCode', label: '客户编号' },
              { key: 'outboundOrderNo', label: '出货单号' },
              { key: 'transferNo', label: '转单号' },
              { key: 'reconciliationStatus', label: '对账状态' },
              { key: 'currency', label: '币种' },
              { key: 'billingUnit', label: '计费方式' },
              { key: 'billingQuantity', label: '计费数量' },
              { key: 'chargeWeightKg', label: '计费重' },
              { key: 'unitPrice', label: '单价' },
              { key: 'amount', label: '总金额' },
              { key: 'orderRmbTotal', label: '合计' },
              { key: 'businessProfit', label: '业务利润' },
              { key: 'salesperson', label: '业务员' },
              { key: 'remark', label: '备注' }
            ], exported.rows as unknown as Array<Record<string, unknown>>);
            message.success(`业务成本导出已生成：${exported.rows.length} 条`);
          }}>导出</Button>
          <Button type="primary" onClick={() => openEditor()} disabled={!canManage}>添加成本</Button>
          <Button icon={<RefreshCw size={15} />} onClick={() => void loadRows()} />
        </Space>
      }
    >
      <Form form={queryForm} layout="vertical" initialValues={defaultQuery}>
        <Row gutter={[10, 10]} className="finance-filter-bar finance-audit-filter-grid">
          <Col xs={24} md={8} xl={4}><Form.Item name="systemOrderNo" label="出货单号"><Input placeholder="出货单号 / 订单号" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="customer" label="客户"><Input placeholder="客户编号 / 名称" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="feeName" label="费用名称"><Select allowClear showSearch options={feeNameOptions} /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="status" label="对账状态"><Select options={[{ value: 'ALL', label: '全部' }, { value: 'PENDING', label: '待审核' }, { value: 'CONFIRMED', label: '已审核' }, { value: 'VOIDED', label: '作废' }]} /></Form.Item></Col>
          <Col xs={24} md={16} xl={8} className="finance-audit-filter-actions">
            <Space wrap>
              <Button type="primary" onClick={() => void applyQuery()}>查询</Button>
              <Button onClick={() => void resetQuery()}>重置</Button>
              <Button aria-expanded={advancedFiltersOpen} onClick={() => setAdvancedFiltersOpen((current) => !current)}>{advancedFiltersOpen ? '收起筛选' : '更多筛选'}</Button>
            </Space>
          </Col>
        </Row>
        {advancedFiltersOpen ? (
          <Row gutter={[10, 10]} className="finance-audit-filter-grid finance-audit-filter-advanced">
            <Col xs={24} md={8} xl={4}><Form.Item name="salesperson" label="业务员"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdBy" label="制单人"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedBy" label="审核人员"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="paymentNo" label="付款编号"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdFrom" label="制单日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdTo" label="制单日期止"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedFrom" label="审核日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedTo" label="审核日期止"><AppDatePicker /></Form.Item></Col>
          </Row>
        ) : null}
      </Form>

      <Flex gap={12} wrap className="finance-work-status-strip finance-audit-summary">
        <Tag color="blue">RMB 合计 {formatCurrency(response.totals.rmbTotal)}</Tag>
        {canViewProfit ? <Tag color="green">业务利润 {formatCurrency(response.totals.profitTotal ?? 0)}</Tag> : null}
        <Tag>待审核 {response.totals.pendingCount}</Tag>
        <Tag color="success">已审核 {response.totals.confirmedCount}</Tag>
        <Tag color="default">作废 {response.totals.voidedCount}</Tag>
        {response.totals.amountByCurrency.map((item) => <Tag key={item.currency}>{item.currency} {item.amount.toFixed(2)}</Tag>)}
      </Flex>

      <ManagedDualViewTable<BusinessCostAuditSummary>
        viewStorageKey="sunny.finance.businessCostAudit.view-v1"
        viewAriaLabel="业务成本审核表格视图"
        defaultView="matrix"
        views={{
          matrix: {
            label: '矩阵视图',
            columns: matrixColumns,
            tableProps: {
              className: 'finance-audit-table finance-business-cost-audit-table finance-business-cost-audit-matrix-table',
              minimumScrollX: 0,
              tableLayout: 'fixed',
              showHeader: false,
              recordDetail: { title: '业务成本审核详情', columns },
              columnSettings: {
                storageKey: 'siyuan.finance.businessCostAudit.matrix-columns.v2',
                title: '业务成本审核矩阵列设置',
                lockedKeys: ['action']
              }
            }
          },
          ledger: {
            label: '精密台账模式',
            columns,
            tableProps: {
              className: 'finance-audit-table finance-business-cost-audit-table finance-business-cost-audit-ledger-table',
              minimumScrollX: 1950,
              recordDetail: { title: '业务成本审核详情' },
              columnSettings: {
                storageKey: columnStorageKey,
                title: '业务成本审核列设置',
                defaultColumnOrder
              }
            }
          }
        }}
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={response.rows}
        locale={{ emptyText: '暂无已自审通过的业务成本待审项' }}
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (row) => ({ disabled: row.voided }) }}
        columnSettingsPlacement="toolbar"
        pagination={{ current: response.pagination.page, pageSize: response.pagination.pageSize, total: response.pagination.totalItems, showSizeChanger: true }}
        onChange={(pagination: TablePaginationConfig, _filters, sorter) => {
          const sort = Array.isArray(sorter) ? sorter[0] : sorter;
          const next = {
            ...query,
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? 10,
            sortBy: typeof sort?.field === 'string' ? sort.field as BusinessCostAuditListQuery['sortBy'] : query.sortBy,
            sortOrder: sort?.order === 'ascend' ? 'asc' as const : sort?.order === 'descend' ? 'desc' as const : query.sortOrder
          };
          setQuery(next);
          void loadRows(next);
        }}
      />

      <Modal title={editingRow ? '修改业务成本' : '添加成本'} className="finance-modal" width={760} open={editorOpen} onCancel={closeEditor} onOk={submitEditor} okText="保存成本" cancelText="取消">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ name: '业务员成本', currency: 'RMB' }}
          onValuesChange={(_, values) => syncAmount(values)}
        >
          {!editingRow ? (
            <>
              <Form.Item name="systemOrderNo" label="关联订单"><Input placeholder="按出货单号或内部单号匹配" /></Form.Item>
              <Form.Item name="customerOrderNo" label="出货单号"><Input placeholder="可选，按出货单号匹配" /></Form.Item>
              <Form.Item name="transferNo" label="转单号"><Input placeholder="可选，按转单号匹配" /></Form.Item>
              <Form.Item name="customerCode" label="客户编号"><Input placeholder="可选，按客户编号匹配" /></Form.Item>
            </>
          ) : (
            <Card size="small" className="finance-audit-summary">
              <Text strong>{editingRow.systemOrderNo}</Text>
              <br />
              <Text type="secondary">{editingRow.customerCode} / {editingRow.salesperson ?? '-'} / {editingRow.transferNo ?? '-'}</Text>
            </Card>
          )}
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请选择或填写费用名称' }]}><AutoComplete options={feeNameOptions} /></Form.Item>
          <Form.Item name="billingUnit" label="计费方式" rules={[{ required: true, message: '请选择计费方式' }]}><Select options={businessCostBillingUnitOptions} onChange={(billingUnit: FinanceBillingUnit) => form.setFieldValue('billingQuantity', billingUnit === 'CBM' ? undefined : form.getFieldValue('billingQuantity'))} /></Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.billingUnit !== current.billingUnit}>
            {({ getFieldValue }) => {
              const billingUnit = getFieldValue('billingUnit') as FinanceBillingUnit | undefined;
              return <Form.Item name="billingQuantity" label="计费数量" rules={[{ required: true, message: '请填写计费数量' }]}><InputNumber className="full-width" min={0} precision={billingUnit === 'CBM' ? 6 : 3} addonAfter={billingUnitLabel(billingUnit)} /></Form.Item>;
            }}
          </Form.Item>
          <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请填写单价' }]}><InputNumber className="full-width" min={0} precision={2} /></Form.Item>
          <Form.Item name="amount" label="总金额"><InputNumber className="full-width" min={0} precision={2} disabled /></Form.Item>
          <Form.Item name="currency" label="币种"><Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="paymentNo" label="付款编号"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
