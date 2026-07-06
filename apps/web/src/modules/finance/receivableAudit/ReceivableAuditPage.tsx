import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Card, Col, Dropdown, Flex, Form, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { RefreshCw, Settings, WalletCards } from 'lucide-react';
import type {
  FinanceCatalogItemSummary,
  ReceivableAuditCreateInput,
  ReceivableAuditListQuery,
  ReceivableAuditListResponse,
  ReceivableAuditSummary,
  WaterReceiptSummary
} from '@siyuan/shared';
import type { ApiClient, RoleKey } from '../../../apiClient';
import { applySettlementMethodCurrency, createSettlementMethodOptions, financeCatalogCurrencyOptions, getSettlementMethodRows } from '../catalog';
import { downloadCsv } from '../exportCsv';
import { FinanceColumnSettingsPanel, useFinanceColumnSettings } from '../useFinanceColumnSettings';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { ManagedTable } from '../../shared/ui';

const { Text } = Typography;

type ReceivableAuditPageProps = {
  apiClient: ApiClient;
  role: RoleKey;
  rows: ReceivableAuditSummary[];
  financeCatalogItems: FinanceCatalogItemSummary[];
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
  onRowsChange: (rows: ReceivableAuditSummary[]) => void;
};

type ColumnKey =
  | 'salesperson'
  | 'name'
  | 'customerCode'
  | 'systemOrderNo'
  | 'transferNo'
  | 'currency'
  | 'amount'
  | 'settlementMethod'
  | 'paymentNo'
  | 'orderRmbTotal'
  | 'createdAt'
  | 'createdBy'
  | 'reviewedAt'
  | 'reviewedBy'
  | 'remark'
  | 'reconciliationStatus'
  | 'action';

const defaultQuery: ReceivableAuditListQuery = {
  page: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  status: 'ALL'
};

const defaultColumnOrder: ColumnKey[] = [
  'salesperson',
  'name',
  'customerCode',
  'systemOrderNo',
  'transferNo',
  'currency',
  'amount',
  'settlementMethod',
  'paymentNo',
  'orderRmbTotal',
  'createdAt',
  'createdBy',
  'reviewedAt',
  'reviewedBy',
  'remark',
  'reconciliationStatus',
  'action'
];

const columnStorageKey = 'siyuan.finance.receivableAudit.columns';

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

export function ReceivableAuditPage({
  apiClient,
  role,
  rows,
  financeCatalogItems,
  renderShipmentOrderNoLink,
  onRowsChange
}: ReceivableAuditPageProps) {
  const [form] = Form.useForm<ReceivableAuditCreateInput>();
  const [receiptForm] = Form.useForm<{ ledgerId: string; amount?: number }>();
  const [queryForm] = Form.useForm<ReceivableAuditListQuery>();
  const [query, setQuery] = useState<ReceivableAuditListQuery>(defaultQuery);
  const [response, setResponse] = useState<ReceivableAuditListResponse>({
    rows,
    totals: { amountByCurrency: [], rmbTotal: 0, pendingCount: 0, confirmedCount: 0, voidedCount: 0 },
    pagination: { page: 1, pageSize: 10, totalItems: rows.length }
  });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [receiptRow, setReceiptRow] = useState<ReceivableAuditSummary | null>(null);
  const [receiptRows, setReceiptRows] = useState<WaterReceiptSummary[]>([]);
  const { columnOrder, hiddenColumns, toggleColumn, moveColumn, moveColumnTo, resetColumns } = useFinanceColumnSettings(columnStorageKey, defaultColumnOrder);

  const feeNameOptions = useMemo(
    () => financeCatalogItems
      .filter((item) => item.category === 'FEE_NAME' && item.enabled)
      .map((item) => ({ label: item.name, value: item.name })),
    [financeCatalogItems]
  );
  const settlementRows = useMemo(() => getSettlementMethodRows(financeCatalogItems), [financeCatalogItems]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(financeCatalogItems), [financeCatalogItems]);
  const canSettle = role === 'ADMIN' || role === 'FINANCE';
  const canMatchReceipt = (row: ReceivableAuditSummary) => canSettle
    && row.sourceType === 'MANUAL'
    && row.reconciliationStatus === 'CONFIRMED'
    && !row.voided
    && (row.receiptStatus ?? 'UNPAID') !== 'RECEIVED'
    && (row.receivedAmount ?? 0) < row.amount;
  const selectablePageIds = response.rows.filter((row) => !row.voided).map((row) => row.id);
  const isPageSelected = selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.includes(id));
  const togglePageSelection = () => setSelectedIds(isPageSelected ? [] : selectablePageIds);

  const loadRows = async (nextQuery = query) => {
    setLoading(true);
    try {
      const next = await apiClient.receivableAudits(nextQuery);
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

  const runBatch = async (action: 'audit' | 'reverse' | 'void') => {
    if (!selectedIds.length) return;
    const result = action === 'audit'
      ? await apiClient.batchAuditReceivables({ ids: selectedIds })
      : action === 'reverse'
        ? await apiClient.batchReverseAuditReceivables({ ids: selectedIds })
        : await apiClient.batchVoidReceivables({ ids: selectedIds });
    message.success(`处理完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
    await loadRows();
  };

  const submitCreate = async () => {
    const values = await form.validateFields();
    const feeExists = feeNameOptions.some((option) => option.value === values.name);
    if (!feeExists && canSettle) {
      Modal.confirm({
        title: '保存费用名称到资料库？',
        content: `费用名称「${values.name}」不在资料库中，是否同时保存？`,
        okText: '保存',
        cancelText: '不保存',
        onOk: () => apiClient.createFinanceCatalogItem({ category: 'FEE_NAME', name: values.name, enabled: true })
      });
    }
    await apiClient.createReceivableAudit(values);
    form.resetFields();
    setCreateOpen(false);
    message.success('应收已新增');
    await loadRows();
  };

  const submitReceiptMatch = async () => {
    if (!receiptRow) return;
    const values = await receiptForm.validateFields();
    await apiClient.matchWaterReceiptOrders(values.ledgerId, {
      matches: [{ receivableFinanceItemId: receiptRow.id, amount: Number(values.amount) }]
    });
    receiptForm.resetFields();
    setReceiptRow(null);
    setReceiptRows([]);
    message.success('水单已匹配');
    await loadRows();
  };

  const openReceiptMatch = async (row: ReceivableAuditSummary) => {
    setReceiptRow(row);
    receiptForm.setFieldsValue({ amount: Math.max(0.01, row.amount - (row.receivedAmount ?? 0)) });
    try {
      const result = await apiClient.waterReceipts({
        customerCode: row.customerCode,
        status: 'ALL',
        includeArchived: false,
        page: 1,
        pageSize: 100
      });
      setReceiptRows(result.rows.filter((receipt) => receipt.customerId === row.customerId && receipt.balance > 0 && receipt.status !== 'PENDING'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载水单失败');
      setReceiptRows([]);
    }
  };

  const baseColumns: Record<ColumnKey, ColumnsType<ReceivableAuditSummary>[number]> = {
    salesperson: { title: '业务员', dataIndex: 'salesperson', width: 100, sorter: true, render: (value?: string) => value ?? '-' },
    name: { title: '费用名称', dataIndex: 'name', width: 120, sorter: true },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, sorter: true },
    systemOrderNo: { title: '运单号', dataIndex: 'systemOrderNo', width: 210, sorter: true, render: (value?: string) => renderShipmentOrderNoLink(value) },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 180, render: (value?: string) => <Text className="table-compact-text">{value ?? '-'}</Text> },
    currency: { title: '币种', dataIndex: 'currency', width: 80, render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag> },
    amount: { title: '金额', dataIndex: 'amount', width: 120, align: 'right', sorter: true, render: (value: number, row) => formatMoney(value, row.currency) },
    settlementMethod: { title: '结算方式', dataIndex: 'settlementMethod', width: 140, render: (value?: string) => value ?? '-' },
    paymentNo: {
      title: '匹配水单编号',
      dataIndex: 'paymentNo',
      width: 170,
      render: (value: string | undefined, row) => (
        <Space direction="vertical" size={0}>
          {canMatchReceipt(row)
            ? <Button size="small" type="link" icon={<WalletCards size={14} />} onClick={() => { void openReceiptMatch(row); }}>{value ?? '匹配水单'}</Button>
            : <Text>{value ?? '-'}</Text>}
          <Text type="secondary" className="table-compact-text">已收 {formatMoney(row.receivedAmount ?? 0, row.currency)}</Text>
        </Space>
      )
    },
    orderRmbTotal: { title: '合计(RMB)', dataIndex: 'orderRmbTotal', width: 130, align: 'right', sorter: true, render: (value?: number) => formatCurrency(value ?? 0) },
    createdAt: { title: '制单日期', dataIndex: 'createdAt', width: 155, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    createdBy: { title: '制单人', dataIndex: 'createdBy', width: 100, render: (value?: string) => value ?? '系统' },
    reviewedAt: { title: '审单日期', dataIndex: 'reviewedAt', width: 155, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    reviewedBy: { title: '审单人', dataIndex: 'reviewedBy', width: 100, render: (value?: string) => value ?? '-' },
    remark: { title: '备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (value?: string) => value ?? '-' },
    reconciliationStatus: { title: '对账状态', dataIndex: 'reconciliationStatus', width: 105, fixed: 'right', render: statusTag },
    action: {
      title: '操作',
      key: 'action',
      width: 210,
      fixed: 'right',
      render: (_, row) => (
        <Space size={4}>
          {row.reconciliationStatus === 'CONFIRMED' ? (
            <Popconfirm title="确认反审核该应收？" onConfirm={async () => { await apiClient.reverseAuditReceivable(row.id); await loadRows(); }} okText="反审核" cancelText="取消">
              <Button size="small" disabled={!canSettle}>反审核</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title="确认审核该应收？" onConfirm={async () => { await apiClient.auditReceivable(row.id); await loadRows(); }} okText="审核" cancelText="取消">
              <Button size="small" type="primary" disabled={!canSettle || row.voided}>审核</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确认作废该应收？" onConfirm={async () => { await apiClient.deleteReceivableAudit(row.id); await loadRows(); }} okText="作废" cancelText="取消">
            <Button size="small" danger disabled={!canSettle || row.reconciliationStatus === 'CONFIRMED' || row.voided}>作废</Button>
          </Popconfirm>
        </Space>
      )
    }
  };

  const columns = columnOrder
    .filter((key) => !hiddenColumns.includes(key))
    .map((key) => baseColumns[key]);

  const columnMenu = (
    <FinanceColumnSettingsPanel
      visibleColumnOrder={columnOrder}
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
      title="应收审核"
      className="finance-work-card"
      extra={
        <Space wrap>
          <Button onClick={togglePageSelection}>{isPageSelected ? '取消全选' : '全选本页'}</Button>
          <Popconfirm title="确认批量审核？" onConfirm={() => void runBatch('audit')} okText="批量审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canSettle}>批量审核</Button>
          </Popconfirm>
          <Popconfirm title="确认批量反审核？" onConfirm={() => void runBatch('reverse')} okText="批量反审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canSettle}>批量反审核</Button>
          </Popconfirm>
          <Popconfirm title="确认批量作废？" onConfirm={() => void runBatch('void')} okText="批量作废" cancelText="取消">
            <Button disabled={!selectedIds.length || !canSettle} danger>批量作废</Button>
          </Popconfirm>
          <Button onClick={async () => {
            const exported = await apiClient.exportReceivableAudits({ ids: selectedIds.length ? selectedIds : undefined, query });
            downloadCsv('receivable-audits.csv', [
              { key: 'salesperson', label: '业务员' },
              { key: 'name', label: '费用名称' },
              { key: 'customerCode', label: '客户编号' },
              { key: 'systemOrderNo', label: '运单号' },
              { key: 'transferNo', label: '转单号' },
              { key: 'currency', label: '币种' },
              { key: 'amount', label: '金额' },
              { key: 'receivedAmount', label: '已收金额' },
              { key: 'receiptStatus', label: '收款状态' },
              { key: 'paymentNo', label: '匹配水单编号' },
              { key: 'reconciliationStatus', label: '对账状态' },
              { key: 'remark', label: '备注' }
            ], exported.rows as unknown as Array<Record<string, unknown>>);
            message.success(`应收导出已生成：${exported.rows.length} 条`);
          }}>导出</Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!canSettle}>新增应收</Button>
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
          <Col xs={24} md={8} xl={3}><Form.Item name="transferNo" label="转单号"><Input /></Form.Item></Col>
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
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (row) => ({ disabled: row.voided }) }}
        scroll={{ x: 2450 }}
        pagination={{
          current: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.totalItems,
          showSizeChanger: true
        }}
        onChange={(pagination: TablePaginationConfig, _filters, sorter) => {
          const sort = Array.isArray(sorter) ? sorter[0] : sorter;
          const next = {
            ...query,
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? 10,
            sortBy: typeof sort?.field === 'string' ? sort.field as ReceivableAuditListQuery['sortBy'] : query.sortBy,
            sortOrder: sort?.order === 'ascend' ? 'asc' as const : sort?.order === 'descend' ? 'desc' as const : query.sortOrder
          };
          setQuery(next);
          void loadRows(next);
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8}>本筛选合计</Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">{formatCurrency(response.totals.rmbTotal)}</Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />

      <Modal title="新增应收" className="finance-modal" width={760} open={createOpen} onCancel={() => setCreateOpen(false)} onOk={submitCreate} okText="保存应收" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={{ name: '运费', currency: 'RMB' }}>
          <Form.Item name="systemOrderNo" label="运单号"><Input placeholder="按运单号匹配订单" /></Form.Item>
          <Form.Item name="customerOrderNo" label="客户单号"><Input /></Form.Item>
          <Form.Item name="transferNo" label="转单号"><Input /></Form.Item>
          <Form.Item name="customerCode" label="客户编号"><Input /></Form.Item>
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请选择或填写费用名称' }]}><AutoComplete options={feeNameOptions} /></Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请填写金额' }]}><InputNumber className="full-width" min={0} precision={2} /></Form.Item>
          <Form.Item name="currency" label="币种"><Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="settlementMethod" label="结算方式">
            <Select allowClear showSearch optionFilterProp="label" options={settlementOptions} onChange={(value) => applySettlementMethodCurrency(form, settlementRows, value)} />
          </Form.Item>
          <Form.Item name="paymentNo" label="付款编号"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="匹配水单" className="finance-modal" width={820} open={Boolean(receiptRow)} onCancel={() => { setReceiptRow(null); setReceiptRows([]); }} onOk={submitReceiptMatch} okText="匹配" cancelText="取消">
        <Form form={receiptForm} layout="vertical">
          <Form.Item name="ledgerId" label="水单编号" rules={[{ required: true, message: '请选择水单' }]}>
            <Select
              options={receiptRows.map((row) => ({
                label: `${row.receiptNo} / ${row.customerName ?? row.customerCode ?? '-'} / 可用 ${formatCurrency(row.balance)}`,
                value: row.id,
                disabled: row.balance <= 0
              }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="匹配金额" rules={[{ required: true, message: '请填写匹配金额' }]}><InputNumber className="full-width" min={0.01} precision={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
