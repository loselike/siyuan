import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Card, Col, Dropdown, Flex, Form, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { RefreshCw, Settings } from 'lucide-react';
import type {
  BusinessCostAuditCreateInput,
  BusinessCostAuditListQuery,
  BusinessCostAuditListResponse,
  BusinessCostAuditSummary,
  BusinessCostAuditUpdateInput,
  FinanceCatalogItemSummary
} from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { financeCatalogCurrencyOptions } from '../catalog';
import { downloadCsv } from '../exportCsv';
import { FinanceColumnSettingsPanel, useFinanceColumnSettings } from '../useFinanceColumnSettings';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { ManagedTable } from '../../shared/ui';

const { Text } = Typography;

type BusinessCostAuditPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
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

const columnStorageKey = 'siyuan.finance.businessCostAudit.columns';

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
  const { columnOrder, hiddenColumns, toggleColumn, moveColumn, moveColumnTo, resetColumns } = useFinanceColumnSettings(columnStorageKey, defaultColumnOrder);

  const canManage = hasPermission(permissions, 'finance:business-cost:manage');
  const canAudit = hasPermission(permissions, 'finance:business-cost:audit');
  const canReverse = hasPermission(permissions, 'finance:business-cost:reverse');
  const canVoid = hasPermission(permissions, 'finance:business-cost:void');
  const canExport = hasPermission(permissions, 'finance:business-cost:export');
  const canViewAgent = hasPermission(permissions, 'finance:business-cost:view-agent') || response.rows.some((row) => row.canViewAgent);
  const canViewProfit = hasPermission(permissions, 'finance:business-cost:view-profit') || response.rows.some((row) => row.canViewProfit);
  const selectablePageIds = response.rows.filter((row) => !row.voided).map((row) => row.id);
  const isPageSelected = selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.includes(id));
  const togglePageSelection = () => setSelectedIds(isPageSelected ? [] : selectablePageIds);

  const feeNameOptions = useMemo(
    () => financeCatalogItems
      .filter((item) => item.category === 'FEE_NAME' && item.enabled)
      .map((item) => ({ label: item.name, value: item.name })),
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
      chargeWeightKg: row.chargeWeightKg,
      unitPrice: row.unitPrice,
      amount: row.amount,
      currency: row.currency ?? 'RMB',
      paymentNo: row.paymentNo,
      remark: row.remark
    } : { name: '业务员成本', currency: 'RMB' });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingRow(null);
    form.resetFields();
  };

  const syncAmount = (values: BusinessCostAuditCreateInput & BusinessCostAuditUpdateInput) => {
    const weight = Number(values.chargeWeightKg);
    const price = Number(values.unitPrice);
    if (Number.isFinite(weight) && Number.isFinite(price)) {
      form.setFieldValue('amount', Number((weight * price).toFixed(2)));
    }
  };

  const submitEditor = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      amount: typeof values.chargeWeightKg === 'number' && typeof values.unitPrice === 'number'
        ? Number((values.chargeWeightKg * values.unitPrice).toFixed(2))
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
    message.success(`处理完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
    await loadRows();
  };

  const baseColumns: Record<ColumnKey, ColumnsType<BusinessCostAuditSummary>[number]> = {
    agentName: { title: '代理', dataIndex: 'agentName', width: 130, render: (value?: string) => value ?? '-' },
    name: { title: '费用名称', dataIndex: 'name', width: 130, sorter: true },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, sorter: true },
    systemOrderNo: { title: '运单号', dataIndex: 'systemOrderNo', width: 210, sorter: true, render: (value?: string) => renderShipmentOrderNoLink(value) },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 180, render: (value?: string) => <Text className="table-compact-text">{value ?? '-'}</Text> },
    reconciliationStatus: { title: '对账状态', dataIndex: 'reconciliationStatus', width: 105, fixed: 'right', render: statusTag },
    currency: { title: '币种', dataIndex: 'currency', width: 80, render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag> },
    chargeWeightKg: { title: '计费重', dataIndex: 'chargeWeightKg', width: 110, align: 'right', render: (value?: number) => typeof value === 'number' ? `${value.toFixed(3)} kg` : '-' },
    unitPrice: { title: '单价', dataIndex: 'unitPrice', width: 100, align: 'right', render: (value: number | undefined, row) => typeof value === 'number' ? formatMoney(value, row.currency) : '-' },
    amount: { title: '总金额', dataIndex: 'amount', width: 120, align: 'right', sorter: true, render: (value: number, row) => formatMoney(value, row.currency) },
    orderRmbTotal: { title: '合计(RMB)', dataIndex: 'orderRmbTotal', width: 130, align: 'right', sorter: true, render: (value?: number) => formatCurrency(value ?? 0) },
    businessProfit: {
      title: '业务利润',
      dataIndex: 'businessProfit',
      width: 120,
      align: 'right',
      sorter: true,
      render: (value: number | undefined, row) => row.canViewProfit && typeof value === 'number'
        ? <Text type={value < 0 ? 'danger' : value > 0 ? 'success' : 'secondary'}>{formatCurrency(value)}</Text>
        : <Text type="secondary">按权限隐藏</Text>
    },
    salesperson: { title: '业务员', dataIndex: 'salesperson', width: 100, render: (value?: string) => value ?? '-' },
    createdAt: { title: '制单日期', dataIndex: 'createdAt', width: 155, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    createdBy: { title: '制单人', dataIndex: 'createdBy', width: 100, render: (value?: string) => value ?? '系统' },
    reviewedAt: { title: '审单日期', dataIndex: 'reviewedAt', width: 155, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    reviewedBy: { title: '审单人', dataIndex: 'reviewedBy', width: 100, render: (value?: string) => value ?? '-' },
    remark: { title: '备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (value?: string) => value ?? '-' },
    action: {
      title: '操作',
      key: 'action',
      width: 250,
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
  const visibleColumnOrder = columnOrder.filter((key) => !unavailableColumns.has(key));
  const columns = visibleColumnOrder
    .filter((key) => !hiddenColumns.includes(key))
    .map((key) => baseColumns[key]);

  const columnMenu = (
    <FinanceColumnSettingsPanel
      visibleColumnOrder={visibleColumnOrder}
      hiddenColumns={hiddenColumns}
      getColumnTitle={(key) => String(baseColumns[key].title)}
      toggleColumn={toggleColumn}
      moveColumn={moveColumn}
      moveColumnTo={moveColumnTo}
      resetColumns={resetColumns}
    />
  );

  return (
    <Card
      title="业务员成本"
      className="finance-work-card"
      extra={
        <Space wrap>
          <Button onClick={togglePageSelection}>{isPageSelected ? '取消全选' : '全选本页'}</Button>
          <Popconfirm title="确认批量审核？" onConfirm={() => void runBatch('audit')} okText="批量审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canAudit}>批量审核</Button>
          </Popconfirm>
          <Popconfirm title="确认批量反审核？" onConfirm={() => void runBatch('reverse')} okText="批量反审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canReverse}>批量反审核</Button>
          </Popconfirm>
          <Popconfirm title="确认批量作废？" onConfirm={() => void runBatch('void')} okText="批量作废" cancelText="取消">
            <Button disabled={!selectedIds.length || !canVoid} danger>批量作废</Button>
          </Popconfirm>
          <Button disabled={!canExport} onClick={async () => {
            const exported = await apiClient.exportBusinessCostAudits({ ids: selectedIds.length ? selectedIds : undefined, query });
            downloadCsv('business-cost-audits.csv', [
              { key: 'agentName', label: '代理' },
              { key: 'name', label: '费用名称' },
              { key: 'customerCode', label: '客户编号' },
              { key: 'systemOrderNo', label: '运单号' },
              { key: 'transferNo', label: '转单号' },
              { key: 'reconciliationStatus', label: '对账状态' },
              { key: 'currency', label: '币种' },
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
          <Dropdown popupRender={() => columnMenu} trigger={['click']}>
            <Button icon={<Settings size={15} />} />
          </Dropdown>
        </Space>
      }
    >
      <Form form={queryForm} layout="vertical" initialValues={defaultQuery}>
        <Row gutter={[10, 10]} className="finance-filter-bar receivable-filter-grid">
          <Col xs={24} md={8} xl={3}><Form.Item name="systemOrderNo" label="运单号"><Input placeholder="系统单号 / 订单号" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="customer" label="客户"><Input placeholder="客户编号 / 名称" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="salesperson" label="业务员"><Input /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="feeName" label="费用名称"><Select allowClear showSearch options={feeNameOptions} /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="createdBy" label="制单人"><Input /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="reviewedBy" label="审核人员"><Input /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="paymentNo" label="付款编号"><Input /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="status" label="对账状态"><Select options={[{ value: 'ALL', label: '全部' }, { value: 'PENDING', label: '待审核' }, { value: 'CONFIRMED', label: '已审核' }, { value: 'VOIDED', label: '作废' }]} /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="createdFrom" label="制单日起"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="createdTo" label="制单日止"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="reviewedFrom" label="核单日起"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="reviewedTo" label="核单日止"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="remark" label="备注"><Input /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item label=" "><Space><Button type="primary" onClick={() => void applyQuery()}>查询</Button><Button onClick={() => void resetQuery()}>重置</Button></Space></Form.Item></Col>
        </Row>
      </Form>

      <Flex gap={12} wrap className="finance-work-status-strip finance-audit-summary">
        <Tag color="blue">RMB 合计 {formatCurrency(response.totals.rmbTotal)}</Tag>
        {canViewProfit ? <Tag color="green">业务利润 {formatCurrency(response.totals.profitTotal ?? 0)}</Tag> : null}
        <Tag>待审核 {response.totals.pendingCount}</Tag>
        <Tag color="success">已审核 {response.totals.confirmedCount}</Tag>
        <Tag color="default">作废 {response.totals.voidedCount}</Tag>
        {response.totals.amountByCurrency.map((item) => <Tag key={item.currency}>{item.currency} {item.amount.toFixed(2)}</Tag>)}
      </Flex>

      <ManagedTable
        rowKey="id"
        className="finance-audit-table"
        size="small"
        loading={loading}
        dataSource={response.rows}
        columns={columns}
        locale={{ emptyText: '暂无已自审通过的业务成本待审项' }}
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (row) => ({ disabled: row.voided }) }}
        scroll={{ x: 2500 }}
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
              <Form.Item name="systemOrderNo" label="运单号"><Input placeholder="按运单号匹配订单" /></Form.Item>
              <Form.Item name="customerOrderNo" label="客户单号"><Input placeholder="可选，按客户单号匹配" /></Form.Item>
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
          <Form.Item name="chargeWeightKg" label="计费重" rules={[{ required: true, message: '请填写计费重' }]}><InputNumber className="full-width" min={0} precision={3} /></Form.Item>
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
