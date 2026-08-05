import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Card, Col, Flex, Form, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { RefreshCw } from 'lucide-react';
import type {
  FinanceCatalogItemSummary,
  ReceivableAuditCreateInput,
  ReceivableAuditListQuery,
  ReceivableAuditListResponse,
  ReceivableAuditSummary,
  ReceivableMatchRequestSummary,
  ReceivableWaterReceiptCandidate
} from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { applySettlementMethodCurrency, createFinanceFeeNameOptions, createSettlementMethodOptions, financeCatalogCurrencyOptions, getSettlementMethodRows } from '../catalog';
import { downloadCsv } from '../exportCsv';
import { formatBeijingDateTime, formatBusinessDate } from '../../shared/format';
import { AppDatePicker, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, ManagedTable, type ManagedTableColumns } from '../../shared/ui';
import { resolveShipmentOutboundOrderNo } from '../../shared/shipmentOrderNo';

const { Text } = Typography;

type ReceivableAuditPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
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
  | 'receiptMatchStatus'
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
  groupByOrder: true,
  reconciliationStatus: 'ALL'
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
  'receiptMatchStatus',
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

// v6 exposes the audit trail beside the reconciliation status by default.
const columnStorageKey = 'siyuan.finance.receivableAudit.columns.v6';

const defaultHiddenColumnKeys: ColumnKey[] = [];

const emptyFilterOptions = { salesperson: [], createdBy: [], reviewedBy: [] };

function formatAmount(amount?: number) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return amount.toFixed(2);
}

function formatAmountWithCurrency(amount?: number, currency = 'RMB') {
  return `${currency} ${formatAmount(amount)}`;
}

function receivableOrderGroupKey(row?: ReceivableAuditSummary) {
  if (!row) return undefined;
  const salesperson = row.salesperson?.trim();
  const customerCode = row.customerCode?.trim();
  const systemOrderNo = row.systemOrderNo?.trim();
  if (row.voided || !salesperson || !customerCode || !systemOrderNo) return undefined;
  return `${salesperson}\u0000${customerCode}\u0000${systemOrderNo}`;
}

function buildOrderTotalGroupStarts(rows: ReceivableAuditSummary[]) {
  return rows.map((row, index) => {
    const groupKey = receivableOrderGroupKey(row);
    return Boolean(groupKey) && groupKey !== receivableOrderGroupKey(rows[index - 1]);
  });
}

function statusTag(value?: string) {
  const status = value ?? 'PENDING';
  const color = status === 'CONFIRMED' ? 'success' : status === 'VOIDED' ? 'default' : 'warning';
  return <Tag color={color}>{status === 'CONFIRMED' ? '已审核' : status === 'VOIDED' ? '已作废' : '待审核'}</Tag>;
}

function receiptStatusTag(value?: ReceivableAuditSummary['receiptStatus']) {
  const status = value ?? 'UNPAID';
  const map: Record<'UNPAID' | 'PARTIAL' | 'RECEIVED', { label: string; color: string }> = {
    UNPAID: { label: '未匹配', color: 'default' },
    PARTIAL: { label: '部分匹配', color: 'warning' },
    RECEIVED: { label: '已匹配', color: 'success' }
  };
  const item = map[status];
  return <Tag color={item.color}>{item.label}</Tag>;
}

function receiptCandidateUnavailableReason(row: ReceivableWaterReceiptCandidate, receivable: ReceivableAuditSummary) {
  if (!['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status)) {
    const reasonByStatus: Partial<Record<ReceivableWaterReceiptCandidate['status'], string>> = {
      PENDING: '水单未到账',
      MATCHED: '水单已全部匹配',
      ARCHIVED: '水单已归档',
      VOIDED: '水单已作废'
    };
    return reasonByStatus[row.status] ?? '水单当前不可匹配';
  }
  if ((row.currency ?? 'RMB') !== (receivable.currency ?? 'RMB')) return '币种不一致';
  if (Number(row.availableAllocationAmount ?? row.balance) <= 0) return '水单可分配余额不足';
  return undefined;
}

function waterReceiptStatusLabel(value: ReceivableWaterReceiptCandidate['status']) {
  return ({
    PENDING: '待到账',
    ARRIVED: '已到账',
    PARTIAL_MATCHED: '部分匹配',
    MATCHED: '已匹配',
    ARCHIVED: '已归档',
    VOIDED: '已作废'
  } as const)[value];
}

export function ReceivableAuditPage({
  apiClient,
  permissions,
  rows,
  financeCatalogItems,
  renderShipmentOrderNoLink,
  onRowsChange
}: ReceivableAuditPageProps) {
  const [form] = Form.useForm<ReceivableAuditCreateInput>();
  const [receiptForm] = Form.useForm<{ amount?: number }>();
  const receiptAmount = Form.useWatch('amount', receiptForm);
  const [queryForm] = Form.useForm<ReceivableAuditListQuery>();
  const [query, setQuery] = useState<ReceivableAuditListQuery>(defaultQuery);
  const [response, setResponse] = useState<ReceivableAuditListResponse>({
    rows,
    totals: { amountByCurrency: [], rmbTotal: 0, pendingCount: 0, confirmedCount: 0, voidedCount: 0 },
    filterOptions: emptyFilterOptions,
    pagination: { page: 1, pageSize: 10, totalItems: rows.length }
  });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [receiptRow, setReceiptRow] = useState<ReceivableAuditSummary | null>(null);
  const [receiptRows, setReceiptRows] = useState<ReceivableWaterReceiptCandidate[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>();
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [processingMatchRequestIds, setProcessingMatchRequestIds] = useState<string[]>([]);

  const feeNameOptions = useMemo(
    () => createFinanceFeeNameOptions(financeCatalogItems),
    [financeCatalogItems]
  );
  const filterOptions = response.filterOptions ?? emptyFilterOptions;
  const personnelOptions = useMemo(() => ({
    salesperson: filterOptions.salesperson.map((value) => ({ label: value, value })),
    createdBy: filterOptions.createdBy.map((value) => ({ label: value, value })),
    reviewedBy: filterOptions.reviewedBy.map((value) => ({ label: value, value }))
  }), [filterOptions]);
  const settlementRows = useMemo(() => getSettlementMethodRows(financeCatalogItems), [financeCatalogItems]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(financeCatalogItems), [financeCatalogItems]);
  const canCreate = permissions.includes('finance:receivable:create');
  const canAudit = permissions.includes('finance:receivable:audit');
  const canReverse = permissions.includes('finance:receivable:reverse');
  const canVoid = permissions.includes('finance:receivable:void');
  const canBatchAudit = permissions.includes('finance:receivable:batch-audit');
  const canBatchReverse = permissions.includes('finance:receivable:batch-reverse');
  const canBatchVoid = permissions.includes('finance:receivable:batch-void');
  const canExport = permissions.includes('finance:receivable:export');
  const canAuditMatch = permissions.includes('finance:water-match:audit');
  const canReverseMatch = permissions.includes('finance:water-match:reverse');
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

  const runBatch = async (action: 'audit' | 'reverse' | 'delete') => {
    if (!selectedIds.length) return;
    const selectedRows = response.rows.filter((row) => selectedIds.includes(row.id));
    const results = action === 'audit'
      ? await Promise.all([
          apiClient.batchAuditReceivables({
            ids: selectedRows
              .filter((row) => !(row.pendingMatchRequests?.length ?? (row.pendingMatchRequest ? 1 : 0)))
              .map((row) => row.id)
          }),
          apiClient.batchApproveReceivableMatchRequests({
            ids: selectedRows.flatMap((row) => row.pendingMatchRequests ?? (row.pendingMatchRequest ? [row.pendingMatchRequest] : [])).map((request) => request.id)
          })
        ])
      : action === 'reverse'
        ? await Promise.all([
            apiClient.batchReverseAuditReceivables({
              ids: selectedRows
                .filter((row) => !(row.approvedMatchRequests?.length ?? 0))
                .map((row) => row.id)
            }),
            apiClient.batchReverseReceivableMatchRequests({
              ids: selectedRows.flatMap((row) => row.approvedMatchRequests ?? []).map((request) => request.id),
              reason: '财务在应收审核批量反审核水单分配'
            })
          ])
        : [await apiClient.batchVoidReceivables({ ids: selectedIds })];
    const successCount = results.reduce((sum, result) => sum + result.successCount, 0);
    const failureCount = results.reduce((sum, result) => sum + result.failureCount, 0);
    const failureReasons = Array.from(new Set(results.flatMap((result) => result.failures.map((item) => item.reason)))).slice(0, 3);
    if (failureCount) {
      message.warning(`处理完成：成功 ${successCount} 项，失败 ${failureCount} 项。${failureReasons.join('；') || '请检查记录状态或权限。'}`);
    } else {
      message.success(`处理完成：成功 ${successCount} 项`);
    }
    await loadRows();
  };

  const runMatchRequestAction = async (
    request: ReceivableMatchRequestSummary,
    action: 'audit' | 'reverse'
  ) => {
    setProcessingMatchRequestIds((current) => [...current, request.id]);
    try {
      if (action === 'audit') {
        await apiClient.approveReceivableMatchRequest(request.id);
        message.success('本次水单分配已审核并落账');
      } else {
        await apiClient.reverseReceivableMatchRequest(request.id, { reason: '财务在应收审核反审核本次水单分配' });
        message.success('本次水单分配已反审核并冲回');
      }
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '水单分配审核操作失败');
    } finally {
      setProcessingMatchRequestIds((current) => current.filter((id) => id !== request.id));
    }
  };

  const submitCreate = async () => {
    const values = await form.validateFields();
    const feeExists = feeNameOptions.some((option) => option.value === values.name);
    if (!feeExists && canCreate) {
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
    const selectedReceipt = receiptRows.find((row) => row.id === selectedReceiptId);
    if (!selectedReceipt) {
      message.warning('请先选择一条可匹配水单');
      return;
    }
    const values = await receiptForm.validateFields();
    const outstanding = Math.max(0, receiptRow.amount - (receiptRow.receivedAmount ?? 0));
    const maxAmount = Math.min(outstanding, Number(selectedReceipt.availableAllocationAmount ?? selectedReceipt.balance));
    const amount = Number(values.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > maxAmount) {
      message.error('分配金额不能超过应收未收金额和水单可分配余额');
      return;
    }
    await apiClient.matchWaterReceiptOrders(selectedReceipt.id, {
      matches: [{ receivableId: receiptRow.id, receivableSourceType: receiptRow.sourceType ?? 'MANUAL', amount }]
    });
    receiptForm.resetFields();
    setReceiptRow(null);
    setReceiptRows([]);
    setSelectedReceiptId(undefined);
    message.success('水单分配已提交，等待财务审核');
    await loadRows();
  };

  const openReceiptMatch = async (row: ReceivableAuditSummary) => {
    setReceiptRow(row);
    receiptForm.resetFields();
    setReceiptRows([]);
    setSelectedReceiptId(undefined);
    setReceiptLoading(true);
    try {
      const result = await apiClient.receivableWaterReceiptCandidates(row.id);
      setReceiptRows(result.rows);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载水单失败');
      setReceiptRows([]);
    } finally {
      setReceiptLoading(false);
    }
  };

  const selectedReceipt = receiptRows.find((row) => row.id === selectedReceiptId);
  const receivableOutstanding = receiptRow ? Math.max(0, receiptRow.amount - (receiptRow.receivedAmount ?? 0)) : 0;
  const selectedReceiptLimit = selectedReceipt
    ? Math.min(receivableOutstanding, Number(selectedReceipt.availableAllocationAmount ?? selectedReceipt.balance))
    : 0;
  const groupedOrderView = query.groupByOrder !== false;
  const orderTotalGroupStarts = useMemo(() => buildOrderTotalGroupStarts(response.rows), [response.rows]);
  const receiptCandidateColumns: ColumnsType<ReceivableWaterReceiptCandidate> = [
    { title: '水单编号', dataIndex: 'receiptNo', width: 146, ellipsis: true },
    { title: '付款编号', dataIndex: 'paymentNo', width: 142, ellipsis: true, render: (value?: string) => value || '-' },
    { title: '到账日期', dataIndex: 'receiptDate', width: 126, render: (value: string) => formatBusinessDate(value) },
    { title: '币种', dataIndex: 'currency', width: 72, render: (value: string) => <Tag>{value}</Tag> },
    { title: '原金额', dataIndex: 'amount', align: 'right', width: 96, render: (value: number, row) => formatAmountWithCurrency(value, row.currency) },
    { title: '已落账', dataIndex: 'matchedAmount', align: 'right', width: 96, render: (value: number, row) => formatAmountWithCurrency(value, row.currency) },
    { title: '待审核占用', dataIndex: 'pendingAllocatedAmount', align: 'right', width: 108, render: (value: number | undefined, row) => formatAmountWithCurrency(value ?? 0, row.currency) },
    { title: '可分配余额', dataIndex: 'availableAllocationAmount', align: 'right', width: 108, render: (value: number | undefined, row) => formatAmountWithCurrency(value ?? row.balance, row.currency) },
    { title: '账面余额', dataIndex: 'balance', align: 'right', width: 96, render: (value: number, row) => formatAmountWithCurrency(value, row.currency) },
    { title: '状态', dataIndex: 'status', width: 92, render: (value: ReceivableWaterReceiptCandidate['status']) => <Tag color={value === 'ARRIVED' ? 'success' : value === 'PARTIAL_MATCHED' ? 'warning' : 'default'}>{waterReceiptStatusLabel(value)}</Tag> },
    {
      title: '选择',
      key: 'select',
      width: 88,
      fixed: 'right',
      render: (_, row) => {
        const reason = receiptRow ? receiptCandidateUnavailableReason(row, receiptRow) : '应收不存在';
        return <Button size="small" type={selectedReceiptId === row.id ? 'primary' : 'default'} disabled={Boolean(reason)} title={reason} onClick={() => {
          setSelectedReceiptId(row.id);
          receiptForm.setFieldsValue({ amount: Math.min(receivableOutstanding, Number(row.availableAllocationAmount ?? row.balance)) });
        }}>{selectedReceiptId === row.id ? '已选择' : reason || '选择'}</Button>;
      }
    }
  ];

  const renderMatchRequests = (row: ReceivableAuditSummary) => {
    const requests = row.matchRequests?.length
      ? row.matchRequests
      : row.pendingMatchRequest
        ? [row.pendingMatchRequest]
        : [];
    if (!requests.length) return <Text type="secondary">-</Text>;
    const statusMeta: Record<ReceivableMatchRequestSummary['status'], { label: string; color: string }> = {
      PENDING: { label: '待审核', color: 'warning' },
      APPROVED: { label: '已落账', color: 'success' },
      REVERSED: { label: '已反审核', color: 'default' },
      REJECTED: { label: '历史驳回', color: 'error' },
      CANCELLED: { label: '已删除', color: 'default' }
    };
    return (
      <div className="finance-receivable-allocation-list">
        {requests.map((request) => {
          const status = statusMeta[request.status];
          const processing = processingMatchRequestIds.includes(request.id);
          return (
            <div key={request.id} className="finance-receivable-allocation-row">
              <div className="finance-receivable-allocation-main">
                <Text className="finance-receivable-match-number" title={request.receiptNo}>{request.receiptNo}</Text>
                <Text className="finance-receivable-match-amount">{formatAmountWithCurrency(request.amount, request.currency)}</Text>
                <Tag color={status.color}>{status.label}</Tag>
              </div>
              <div className="finance-receivable-allocation-meta">
                <span>{request.requestedBy}</span>
                <span>{formatBeijingDateTime(request.requestedAt)}</span>
                {request.status === 'PENDING' && canAuditMatch ? (
                  <Popconfirm
                    title="确认审核并正式落账本次水单分配？"
                    onConfirm={() => void runMatchRequestAction(request, 'audit')}
                    okText="审核并落账"
                    cancelText="取消"
                  >
                    <Button size="small" type="primary" loading={processing}>审核</Button>
                  </Popconfirm>
                ) : null}
                {request.status === 'APPROVED' && canReverseMatch ? (
                  <Popconfirm
                    title="仅冲回本次水单分配，其他已审核分配不受影响。确认继续？"
                    onConfirm={() => void runMatchRequestAction(request, 'reverse')}
                    okText="反审核"
                    cancelText="取消"
                  >
                    <Button size="small" danger loading={processing}>反审核</Button>
                  </Popconfirm>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const baseColumns: Record<ColumnKey, ColumnsType<ReceivableAuditSummary>[number]> = {
    salesperson: { title: '业务员', dataIndex: 'salesperson', width: 96, sorter: true, render: (value?: string) => value?.trim() || '-' },
    name: { title: '费用名称', dataIndex: 'name', width: 96, sorter: true },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 88, sorter: true },
    systemOrderNo: { title: '出货单号', dataIndex: 'systemOrderNo', width: 158, sorter: true, render: (_: string | undefined, row) => renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)) },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 138, render: (value?: string) => <Text className="table-compact-text">{value ?? '-'}</Text> },
    currency: { title: '币种', dataIndex: 'currency', width: 64, render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag> },
    amount: { title: '金额', dataIndex: 'amount', width: 92, align: 'right', sorter: true, render: (value: number) => formatAmount(value) },
    settlementMethod: { title: '结算方式', dataIndex: 'settlementMethod', width: 110, render: (value?: string) => value ?? '-' },
    receiptMatchStatus: { title: '水单状态', key: 'receiptMatchStatus', width: 88, render: (_, row) => receiptStatusTag(row.receiptStatus) },
    paymentNo: {
      title: '水单分配',
      dataIndex: 'paymentNo',
      width: 330,
      render: (_value: string | undefined, row) => renderMatchRequests(row)
    },
    orderRmbTotal: {
      title: '费用合计',
      dataIndex: 'orderRmbTotal',
      width: 136,
      align: 'right',
      sorter: true,
      render: (value: number | undefined, row, index) => {
        const content = row.voided
          ? <Text type="secondary">-</Text>
          : row.orderRmbTotalUnsupportedCurrency
            ? <Text type="secondary">暂不支持</Text>
            : !groupedOrderView || orderTotalGroupStarts[index]
              ? <div className={`finance-receivable-order-total${groupedOrderView ? '' : ' is-detail-sort'}`}><span>费用合计</span><strong>RMB {formatAmount(value)}</strong></div>
              : <span className="finance-receivable-order-total-continuation">已计入合计</span>;
        return content;
      }
    },
    createdAt: { title: '制单日期', dataIndex: 'createdAt', width: 132, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    createdBy: { title: '制单人', dataIndex: 'createdBy', width: 80, render: (value?: string) => value ?? '-' },
    reviewedAt: { title: '审单日期', dataIndex: 'reviewedAt', width: 132, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    reviewedBy: { title: '审单人', dataIndex: 'reviewedBy', width: 80, render: (value?: string) => value ?? '-' },
    remark: { title: '备注', dataIndex: 'remark', width: 140, ellipsis: true, render: (value?: string) => value ?? '-' },
    reconciliationStatus: { title: '对账状态', dataIndex: 'reconciliationStatus', width: 92, render: statusTag },
    action: {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, row) => {
        const hasPendingAllocation = Boolean(row.pendingMatchRequests?.length ?? row.pendingMatchRequest);
        const hasApprovedAllocation = Boolean(row.approvedMatchRequests?.length);
        return (
          <Space size={4}>
            {!hasPendingAllocation && !hasApprovedAllocation && row.reconciliationStatus === 'CONFIRMED' ? (
              <Popconfirm title="确认反审核该应收费用？" onConfirm={async () => { await apiClient.reverseAuditReceivable(row.id); await loadRows(); }} okText="反审核" cancelText="取消">
                <Button size="small" disabled={!canReverse}>反审核费用</Button>
              </Popconfirm>
            ) : !hasPendingAllocation && row.reconciliationStatus !== 'CONFIRMED' ? (
              <Popconfirm title="确认审核该应收费用？" onConfirm={async () => { await apiClient.auditReceivable(row.id); await loadRows(); }} okText="审核" cancelText="取消">
                <Button size="small" type="primary" disabled={!canAudit || row.voided}>审核费用</Button>
              </Popconfirm>
            ) : (
              <Text type="secondary">在水单分配中处理</Text>
            )}
            <Popconfirm title="确认删除该应收？" onConfirm={async () => { await apiClient.deleteReceivableAudit(row.id); await loadRows(); }} okText="删除" cancelText="取消">
              <Button size="small" danger disabled={!canVoid || hasPendingAllocation || hasApprovedAllocation}>删除</Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  };

  const columns: ManagedTableColumns<ReceivableAuditSummary> = defaultColumnOrder.map((key) => baseColumns[key]);
  const matrixColumns: ManagedTableColumns<ReceivableAuditSummary> = [
    {
      key: 'matrixInformation',
      title: '',
      width: 960,
      className: 'managed-matrix-group-primary',
      render: (_value, row) => (
        <ManagedMatrixCell
          columns={4}
          labelWidth={66}
          fields={[
            { key: 'systemOrderNo', label: '出货单号', value: renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)), title: resolveShipmentOutboundOrderNo(row) },
            { key: 'transferNo', label: '转单号', value: row.transferNo || '-', title: row.transferNo },
            { key: 'customerCode', label: '客户编号', value: row.customerCode || '-' },
            { key: 'salesperson', label: '业务员', value: row.salesperson || '-' },
            { key: 'name', label: '费用名称', value: row.name || '-', title: row.name, wrap: true },
            { key: 'settlementMethod', label: '结算方式', value: row.settlementMethod || '-' },
            { key: 'currency', label: '币种', value: <Tag>{row.currency || 'RMB'}</Tag> },
            { key: 'amount', label: '金额', value: <Text strong>{formatAmount(row.amount)}</Text> },
            { key: 'receivedAmount', label: '已收金额', value: formatAmount(row.receivedAmount) },
            { key: 'orderRmbTotal', label: '费用合计', value: row.orderRmbTotalUnsupportedCurrency ? '暂不支持' : `RMB ${formatAmount(row.orderRmbTotal)}` },
            { key: 'receiptStatus', label: '水单状态', value: receiptStatusTag(row.receiptStatus) },
            {
              key: 'paymentNo',
              label: '水单分配',
              value: renderMatchRequests(row)
            },
            { key: 'reconciliationStatus', label: '对账状态', value: statusTag(row.reconciliationStatus) },
            { key: 'createdAt', label: '制单日期', value: <ManagedMatrixDateTime value={row.createdAt ? formatBeijingDateTime(row.createdAt) : undefined} /> },
            { key: 'createdBy', label: '制单人', value: row.createdBy || '-' },
            { key: 'reviewedAt', label: '审单日期', value: <ManagedMatrixDateTime value={row.reviewedAt ? formatBeijingDateTime(row.reviewedAt) : undefined} /> },
            { key: 'reviewedBy', label: '审单人', value: row.reviewedBy || '-' },
            row.remark ? { key: 'remark', label: '备注', value: row.remark, title: row.remark, wrap: true } : null
          ]}
        />
      )
    },
    { ...columns[columns.length - 1], key: 'action', title: '', width: 150, fixed: 'right' }
  ];

  return (
    <Card
      title="应收审核"
      className="finance-work-card"
      extra={
        <Space wrap>
          <Popconfirm title={`确认批量审核已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('audit')} okText="批量审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canBatchAudit}>批量审核</Button>
          </Popconfirm>
          <Popconfirm title={`确认批量反审核已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('reverse')} okText="批量反审核" cancelText="取消">
            <Button disabled={!selectedIds.length || !canBatchReverse}>批量反审核</Button>
          </Popconfirm>
          <Popconfirm title={`确认批量删除已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('delete')} okText="批量删除" cancelText="取消">
            <Button disabled={!selectedIds.length || !canBatchVoid} danger>批量删除</Button>
          </Popconfirm>
          <Button onClick={async () => {
            const exported = await apiClient.exportReceivableAudits({ ids: selectedIds.length ? selectedIds : undefined, query });
            downloadCsv('receivable-audits.csv', [
              { key: 'salesperson', label: '业务员' },
              { key: 'name', label: '费用名称' },
              { key: 'customerCode', label: '客户编号' },
              { key: 'outboundOrderNo', label: '出货单号' },
              { key: 'transferNo', label: '转单号' },
              { key: 'currency', label: '币种' },
              { key: 'amount', label: '金额' },
              { key: 'receivedAmount', label: '已收金额' },
              { key: 'receiptStatus', label: '收款状态' },
              { key: 'paymentNo', label: '最近水单编号' },
              { key: 'reconciliationStatus', label: '对账状态' },
              { key: 'remark', label: '备注' }
            ], exported.rows as unknown as Array<Record<string, unknown>>);
            message.success(`应收导出已生成：${exported.rows.length} 条`);
          }} disabled={!canExport}>导出</Button>
          <Button onClick={() => setCreateOpen(true)} disabled={!canCreate}>新增应收</Button>
          <Button icon={<RefreshCw size={15} />} onClick={() => void loadRows()} />
        </Space>
      }
    >
      <Form form={queryForm} layout="vertical" initialValues={defaultQuery}>
        <Row gutter={[10, 10]} className="finance-filter-bar finance-audit-filter-grid">
          <Col xs={24} md={8} xl={4}><Form.Item name="systemOrderNo" label="出货单号"><Input placeholder="出货单号 / 订单号" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="customer" label="客户"><Input placeholder="客户编号 / 名称" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="transferNo" label="转单号"><Input /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="reconciliationStatus" label="对账状态"><Select options={[{ value: 'ALL', label: '全部' }, { value: 'PENDING', label: '待审核' }, { value: 'CONFIRMED', label: '已审核' }]} /></Form.Item></Col>
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
            <Col xs={24} md={8} xl={4}><Form.Item name="salesperson" label="业务员"><Select allowClear showSearch optionFilterProp="label" options={personnelOptions.salesperson} placeholder="选择或搜索业务员" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="feeName" label="费用名称"><Select allowClear showSearch optionFilterProp="label" options={feeNameOptions} /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdBy" label="制单人"><Select allowClear showSearch optionFilterProp="label" options={personnelOptions.createdBy} placeholder="选择或搜索制单人" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedBy" label="审核人员"><Select allowClear showSearch optionFilterProp="label" options={personnelOptions.reviewedBy} placeholder="选择或搜索审核人员" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="paymentNo" label="收款编号"><Input placeholder="收款编号 / 水单编号" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdFrom" label="制单日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdTo" label="制单日期止"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedFrom" label="核单日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedTo" label="核单日期止"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="remark" label="备注"><Input allowClear /></Form.Item></Col>
          </Row>
        ) : null}
      </Form>

      <Flex gap={12} wrap className="finance-work-status-strip finance-audit-summary">
        <Tag color="blue">RMB 合计 {formatAmount(response.totals.rmbTotal)}</Tag>
        <Tag>待审核 {response.totals.pendingCount}</Tag>
        <Tag color="success">已审核 {response.totals.confirmedCount}</Tag>
        {response.totals.amountByCurrency.map((item) => <Tag key={item.currency}>{formatAmountWithCurrency(item.amount, item.currency)}</Tag>)}
      </Flex>

      <ManagedDualViewTable<ReceivableAuditSummary>
        viewStorageKey="sunny.finance.receivableAudit.view-v1"
        viewAriaLabel="应收审核表格视图"
        defaultView="matrix"
        views={{
          matrix: {
            label: '矩阵视图',
            columns: matrixColumns,
            tableProps: {
              className: 'finance-audit-table finance-receivable-audit-table finance-receivable-audit-matrix-table',
              minimumScrollX: 0,
              tableLayout: 'fixed',
              recordDetail: { title: '应收审核详情', columns },
              columnSettings: {
                storageKey: 'sunny.finance.receivableAudit.matrix-columns-v2',
                title: '应收审核矩阵列设置',
                lockedKeys: ['action'],
                labels: { matrixInformation: '信息', action: '操作' }
              }
            }
          },
          ledger: {
            label: '精密台账模式',
            columns,
            tableProps: {
              className: 'finance-audit-table finance-receivable-audit-table finance-receivable-audit-ledger-table',
              minimumScrollX: 2200,
              recordDetail: { title: '应收审核详情' },
              columnSettings: { storageKey: columnStorageKey, title: '应收审核列设置', defaultHiddenKeys: defaultHiddenColumnKeys, defaultColumnOrder, lockedKeys: ['systemOrderNo', 'action'] },
              summary: () => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={8}>本筛选合计</Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="right">{formatAmount(response.totals.rmbTotal)}</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )
            }
          }
        }}
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={response.rows}
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (row) => ({ disabled: row.voided }) }}
        columnSettingsPlacement="toolbar"
        pagination={{
          current: response.pagination.page,
          pageSize: response.pagination.pageSize,
          total: response.pagination.totalItems,
          showSizeChanger: true
        }}
        onChange={(pagination: TablePaginationConfig, _filters, sorter) => {
          const sort = Array.isArray(sorter) ? sorter[0] : sorter;
          const sortBy = typeof sort?.field === 'string' ? sort.field as ReceivableAuditListQuery['sortBy'] : defaultQuery.sortBy;
          const hasExplicitDetailSort = Boolean(sort?.order) && sortBy !== 'orderRmbTotal';
          const next = {
            ...query,
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? 10,
            sortBy,
            sortOrder: sort?.order === 'ascend' ? 'asc' as const : sort?.order === 'descend' ? 'desc' as const : defaultQuery.sortOrder,
            groupByOrder: !hasExplicitDetailSort
          };
          setQuery(next);
          void loadRows(next);
        }}
      />

      <Modal title="新增应收" className="finance-modal" width={760} open={createOpen} onCancel={() => setCreateOpen(false)} onOk={submitCreate} okText="保存应收" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={{ name: '运费', currency: 'RMB' }}>
          <Form.Item name="systemOrderNo" label="关联订单"><Input placeholder="按出货单号或内部单号匹配" /></Form.Item>
          <Form.Item name="customerOrderNo" label="出货单号"><Input /></Form.Item>
          <Form.Item name="transferNo" label="转单号"><Input /></Form.Item>
          <Form.Item name="customerCode" label="客户编号"><Input /></Form.Item>
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请选择或填写费用名称' }]}><AutoComplete options={feeNameOptions} /></Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请填写金额' }]}><InputNumber className="full-width" min={0} precision={2} /></Form.Item>
          <Form.Item name="currency" label="币种"><Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="settlementMethod" label="结算方式">
            <Select allowClear showSearch optionFilterProp="label" options={settlementOptions} onChange={(value) => applySettlementMethodCurrency(form, settlementRows, value)} />
          </Form.Item>
          <Form.Item name="paymentNo" label="收款编号"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`分配水单${receiptRow ? ` · ${receiptRow.customerCode}` : ''}`}
        className="finance-modal finance-receipt-match-modal"
        width={1040}
        open={Boolean(receiptRow)}
        onCancel={() => { setReceiptRow(null); setReceiptRows([]); setSelectedReceiptId(undefined); receiptForm.resetFields(); }}
        onOk={submitReceiptMatch}
        okText="提交分配"
        okButtonProps={{ disabled: !selectedReceipt }}
        cancelText="取消"
      >
        <div className="finance-receipt-match-summary">
          <div><span>应收未收</span><strong>{formatAmountWithCurrency(receivableOutstanding, receiptRow?.currency ?? 'RMB')}</strong></div>
          <div><span>已选水单余额</span><strong>{selectedReceipt ? formatAmountWithCurrency(selectedReceipt.balance, selectedReceipt.currency) : '-'}</strong></div>
          <div><span>匹配后水单余额</span><strong>{selectedReceipt ? formatAmountWithCurrency(Math.max(0, selectedReceipt.balance - Number(receiptAmount ?? 0)), selectedReceipt.currency) : '-'}</strong></div>
        </div>
        <Table
          className="finance-receipt-match-table"
          rowKey="id"
          size="small"
          loading={receiptLoading}
          columns={receiptCandidateColumns}
          dataSource={receiptRows}
          pagination={false}
          scroll={{ x: 920, y: 300 }}
          rowClassName={(row) => row.id === selectedReceiptId ? 'finance-receipt-match-selected' : ''}
          locale={{ emptyText: '该客户暂无可见水单' }}
        />
        <Form form={receiptForm} layout="vertical" className="finance-receipt-match-form">
          <Form.Item name="amount" label="本次匹配金额" rules={[{ required: true, message: '请选择水单并填写匹配金额' }]}>
            <InputNumber className="full-width" disabled={!selectedReceipt} min={0.01} max={selectedReceiptLimit || undefined} precision={2} />
          </Form.Item>
          <div className="finance-receipt-match-limit">可匹配上限：{selectedReceipt ? formatAmountWithCurrency(selectedReceiptLimit, selectedReceipt.currency) : '请先选择水单'}</div>
        </Form>
      </Modal>
    </Card>
  );
}
