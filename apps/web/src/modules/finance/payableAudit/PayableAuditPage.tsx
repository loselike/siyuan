import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, AutoComplete, Button, Card, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { RefreshCw } from 'lucide-react';
import type {
  FinanceCatalogItemSummary,
  PayableAuditCreateInput,
  PayableAuditListQuery,
  PayableAuditListResponse,
  PayableAuditShipmentMatchSummary,
  PayableAuditSummary,
  PayableAuditUpdateInput,
  PendingPaymentListQuery
} from '@siyuan/shared';
import { EARLY_PAYMENT_SETTLEMENT_METHOD, FINANCIAL_DECIMAL_SCALE, calculateMonetaryTotal, formatFinancialDecimal, formatMonetaryTotal } from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../../apiClient';
import { createFinanceFeeNameOptions, financeCatalogCurrencyOptions } from '../catalog';
import { downloadCsv } from '../exportCsv';
import { formatBeijingDateTime } from '../../shared/format';
import { agentFieldLabels } from '../../shared/agentFieldLabels';
import { ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, type ManagedTableColumns } from '../../shared/ui';
import { ChargeWeightChangeTag } from '../ChargeWeightChangeTag';
import { resolveShipmentOutboundOrderNo } from '../../shared/shipmentOrderNo';
import { getGlobalFieldMaskVisibility } from '../../shared/globalFieldMask';

const { Text } = Typography;

type PayableAuditPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role?: RoleKey | string;
  rows: PayableAuditSummary[];
  financeCatalogItems: FinanceCatalogItemSummary[];
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
  onRowsChange: (rows: PayableAuditSummary[]) => void;
  onGoPendingPayment?: (query?: PendingPaymentListQuery) => void;
  onGoAgentBill?: () => void;
};

type ColumnKey =
  | 'agentName'
  | 'name'
  | 'customerCode'
  | 'systemOrderNo'
  | 'transferNo'
  | 'agentChannel'
  | 'reconciliationStatus'
  | 'currency'
  | 'chargeWeightKg'
  | 'unitPrice'
  | 'amount'
  | 'orderRmbTotal'
  | 'receivableProfit'
  | 'operationProfit'
  | 'salesperson'
  | 'createdAt'
  | 'createdBy'
  | 'reviewedAt'
  | 'reviewedBy'
  | 'remark'
  | 'action';

const defaultQuery: PayableAuditListQuery = { page: 1, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc', status: 'ALL' };
const defaultColumnOrder: ColumnKey[] = [
  'agentName',
  'name',
  'customerCode',
  'systemOrderNo',
  'transferNo',
  'agentChannel',
  'reconciliationStatus',
  'currency',
  'chargeWeightKg',
  'unitPrice',
  'amount',
  'orderRmbTotal',
  'receivableProfit',
  'operationProfit',
  'salesperson',
  'createdAt',
  'createdBy',
  'reviewedAt',
  'reviewedBy',
  'remark',
  'action'
];
const columnStorageKey = 'siyuan.finance.payableAudit.columns';

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

function formatMoney(amount?: number) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return formatMonetaryTotal(amount);
}

function formatUnitPrice(amount?: number) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return formatFinancialDecimal(amount);
}

function statusTag(value?: string) {
  const status = value ?? 'PENDING';
  return <Tag color={status === 'CONFIRMED' ? 'success' : status === 'VOIDED' ? 'default' : 'warning'}>{status === 'CONFIRMED' ? '已审核' : status === 'VOIDED' ? '已删除' : '待审核'}</Tag>;
}

export function PayableAuditPage({ apiClient, permissions, role, rows, financeCatalogItems, renderShipmentOrderNoLink, onRowsChange }: PayableAuditPageProps) {
  const { message } = AntdApp.useApp();
  const [queryForm] = Form.useForm<PayableAuditListQuery>();
  const [form] = Form.useForm<PayableAuditCreateInput & PayableAuditUpdateInput>();
  const [query, setQuery] = useState<PayableAuditListQuery>(defaultQuery);
  const [response, setResponse] = useState<PayableAuditListResponse>({
    rows,
    totals: { amountByCurrency: [], rmbTotal: 0, pendingCount: 0, confirmedCount: 0, voidedCount: 0 },
    pagination: { page: 1, pageSize: 10, totalItems: rows.length }
  });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PayableAuditSummary | null>(null);
  const [matchedShipment, setMatchedShipment] = useState<PayableAuditShipmentMatchSummary | null>(null);
  const [matchingShipment, setMatchingShipment] = useState(false);
  const [savingEditor, setSavingEditor] = useState(false);
  const [selectedShipmentLocked, setSelectedShipmentLocked] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const canManage = hasPermission(permissions, 'finance:payable:manage');
  const canAudit = hasPermission(permissions, 'finance:payable:audit');
  const canReverse = hasPermission(permissions, 'finance:payable:reverse');
  const canVoid = hasPermission(permissions, 'finance:payable:void');
  const canBatchAudit = canAudit;
  const canBatchReverse = canReverse;
  const canBatchVoid = canVoid;
  const canMatchShipment = hasPermission(permissions, 'finance:payable:match-shipment');
  const canExport = hasPermission(permissions, 'finance:payable:export');
  const canViewSensitive = fieldVisibility.showPayableCost && (hasPermission(permissions, 'finance:payable:view-sensitive') || response.rows.some((row) => row.canViewSensitivePayable));
  const canViewPayableCost = fieldVisibility.showPayableCost;
  const canViewPayableStatus = fieldVisibility.showPayableStatus;
  const canViewProfit = hasPermission(permissions, 'finance:payable:view-profit') || response.rows.some((row) => row.canViewProfit);
  const feeNameOptions = useMemo(() => createFinanceFeeNameOptions(financeCatalogItems), [financeCatalogItems]);
  const selectedRows = useMemo(
    () => response.rows.filter((row) => selectedIds.includes(row.id)),
    [response.rows, selectedIds]
  );
  const selectedCreateRow = selectedRows.length === 1 ? selectedRows[0] : undefined;
  const hasSelectedMiscFeeHang = selectedRows.some((row) => row.auditSource === 'MISC_FEE_HANG');

  const loadRows = async (nextQuery = query) => {
    setLoading(true);
    try {
      const next = await apiClient.payableAudits(nextQuery);
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
    setResponse((current) => ({ ...current, rows, pagination: { ...current.pagination, totalItems: Math.max(current.pagination.totalItems, rows.length) } }));
  }, [rows]);

  const toShipmentMatchSummary = (row: PayableAuditSummary): PayableAuditShipmentMatchSummary => ({
    shipmentId: row.shipmentId,
    customerCode: row.customerCode,
    customerName: row.customerName,
    customerOrderNo: row.customerOrderNo,
    outboundOrderNo: row.outboundOrderNo,
    systemOrderNo: row.systemOrderNo,
    transferNo: row.transferNo,
    salesperson: row.salesperson,
    agentName: row.agentName,
    agentChannel: row.agentChannel
  });

  const openEditor = (row?: PayableAuditSummary, prefillRow?: PayableAuditSummary) => {
    if (!canViewPayableCost) {
      message.warning('当前账号无权查看应付成本字段');
      return;
    }
    setEditingRow(row ?? null);
    const prefilledShipment = !row && prefillRow?.shipmentId ? toShipmentMatchSummary(prefillRow) : null;
    setMatchedShipment(prefilledShipment);
    setSelectedShipmentLocked(Boolean(prefilledShipment));
    form.resetFields();
    form.setFieldsValue(row ? {
      name: row.name,
      chargeWeightKg: row.chargeWeightKg,
      unitPrice: row.unitPrice,
      amount: row.amount,
      currency: row.currency ?? 'RMB',
      paymentNo: row.paymentNo,
      remark: row.remark
    } : {
      ...(prefilledShipment ? {
        shipmentId: prefilledShipment.shipmentId,
        systemOrderNo: prefilledShipment.systemOrderNo,
        customerOrderNo: prefilledShipment.customerOrderNo,
        transferNo: prefilledShipment.transferNo,
        customerCode: prefilledShipment.customerCode
      } : {}),
      name: '代理成本',
      currency: 'RMB'
    });
    setEditorOpen(true);
  };

  const handleEditorValuesChange = (changedValues: Partial<PayableAuditCreateInput & PayableAuditUpdateInput>, values: PayableAuditCreateInput & PayableAuditUpdateInput) => {
    syncAmount(values);
    if (editingRow || selectedShipmentLocked) return;
    const associationFields = ['shipmentId', 'outboundOrderNo', 'systemOrderNo', 'customerOrderNo', 'transferNo', 'customerCode'];
    if (Object.keys(changedValues).some((key) => associationFields.includes(key))) {
      setMatchedShipment(null);
      if (form.getFieldValue('shipmentId')) form.setFieldValue('shipmentId', undefined);
    }
  };

  const auditOne = async (row: PayableAuditSummary) => {
    await apiClient.auditPayable(row.id);
    await loadRows();
    message.success('应付已审核并生成待付款记录，可继续审核下一张');
  };

  const reverseAuditOne = async (row: PayableAuditSummary) => {
    try {
      await apiClient.reverseAuditPayable(row.id);
      message.success('应付费用已反审核');
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '反审核失败');
    }
  };

  const matchShipment = async () => {
    const values = form.getFieldsValue();
    if (!values.shipmentId && !values.systemOrderNo && !values.customerOrderNo && !values.transferNo && !values.customerCode) {
      message.warning('请先填写出货单号、客户编号或转单号');
      return;
    }
    setMatchingShipment(true);
    try {
      const matched = await apiClient.matchPayableAuditShipment({
        shipmentId: values.shipmentId,
        systemOrderNo: values.systemOrderNo,
        customerOrderNo: values.customerOrderNo,
        transferNo: values.transferNo,
        customerCode: values.customerCode
      });
      setMatchedShipment(matched);
      form.setFieldsValue({
        shipmentId: matched.shipmentId,
        systemOrderNo: matched.systemOrderNo,
        customerOrderNo: matched.customerOrderNo,
        transferNo: matched.transferNo,
        customerCode: matched.customerCode
      });
      message.success('订单已匹配');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '订单匹配失败，请检查关联单号后重试');
    } finally {
      setMatchingShipment(false);
    }
  };

  const submitEditor = async () => {
    if (savingEditor) return;
    setSavingEditor(true);
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        amount: typeof values.chargeWeightKg === 'number' && typeof values.unitPrice === 'number'
          ? calculateMonetaryTotal(values.chargeWeightKg, values.unitPrice)
          : values.amount
      };
      if (editingRow) {
        await apiClient.updatePayableAudit(editingRow.id, payload);
        message.success('应付费用已修改');
      } else {
        const createPayload = matchedShipment
          ? {
              ...payload,
              shipmentId: matchedShipment.shipmentId
            }
          : payload;
        if (matchedShipment) {
          delete createPayload.outboundOrderNo;
          delete createPayload.systemOrderNo;
          delete createPayload.customerOrderNo;
          delete createPayload.transferNo;
          delete createPayload.customerCode;
        }
        await apiClient.createPayableAudit(createPayload);
        message.success('应付费用已新增');
      }
      setEditorOpen(false);
      setEditingRow(null);
      setMatchedShipment(null);
      setSelectedShipmentLocked(false);
      form.resetFields();
      await loadRows();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error(error instanceof Error ? error.message : '保存应付失败，请稍后重试');
    } finally {
      setSavingEditor(false);
    }
  };

  const syncAmount = (values: PayableAuditCreateInput & PayableAuditUpdateInput) => {
    const weight = Number(values.chargeWeightKg);
    const price = Number(values.unitPrice);
    if (Number.isFinite(weight) && Number.isFinite(price)) form.setFieldValue('amount', calculateMonetaryTotal(weight, price));
  };

  const runBatch = async (action: 'audit' | 'reverse' | 'void') => {
    if (!selectedIds.length) return;
    if (action !== 'audit' && hasSelectedMiscFeeHang) {
      message.warning('跨越挂账在市场应付审核中只支持审核，不支持反审核或删除');
      return;
    }
    const result = action === 'audit'
      ? await apiClient.batchAuditPayables({ ids: selectedIds })
      : action === 'reverse'
        ? await apiClient.batchReverseAuditPayables({ ids: selectedIds })
        : await apiClient.batchVoidPayables({ ids: selectedIds });
    const failureReasons = Array.from(new Set(result.failures.map((item) => item.reason))).slice(0, 3);
    if (result.failureCount) {
      message.warning(`处理完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条。${failureReasons.join('；') || '请检查记录状态或权限。'}`);
    } else {
      message.success(`处理完成：成功 ${result.successCount} 条`);
    }
    await loadRows();
    if (action === 'audit' && result.successCount > 0) message.success('应付已审核并生成待付款记录，可继续审核下一张');
  };

  const baseColumns: Record<ColumnKey, ColumnsType<PayableAuditSummary>[number]> = {
    agentName: { title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 180, render: (value?: string) => value ?? '-' },
    name: { title: '费用名称', dataIndex: 'name', width: 130, sorter: true },
    customerCode: { title: '客户编号', dataIndex: 'customerCode', width: 110, sorter: true },
    systemOrderNo: { title: '出货单号', dataIndex: 'systemOrderNo', width: 210, sorter: true, render: (_: string | undefined, row) => renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)) },
    transferNo: { title: '转单号', dataIndex: 'transferNo', width: 170, render: (value?: string) => value ?? '-' },
    agentChannel: { title: '代理渠道', dataIndex: 'agentChannel', width: 130, render: (value?: string) => value ?? '-' },
    reconciliationStatus: { title: '对账状态', dataIndex: 'reconciliationStatus', width: 105, fixed: 'right', render: statusTag },
    currency: { title: '币种', dataIndex: 'currency', width: 80, render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag> },
    chargeWeightKg: { title: '计费重', dataIndex: 'chargeWeightKg', width: 110, align: 'right', render: (value: number | undefined, row) => <ChargeWeightChangeTag value={value} change={row.chargeWeightChange} /> },
    unitPrice: { title: '单价', dataIndex: 'unitPrice', width: 100, align: 'right', render: (value: number | undefined) => typeof value === 'number' ? formatUnitPrice(value) : '-' },
    amount: { title: '总金额', dataIndex: 'amount', width: 120, align: 'right', sorter: true, render: (value: number, row) => row.canViewSensitivePayable ? formatMoney(value) : <Text type="secondary">按权限隐藏</Text> },
    orderRmbTotal: { title: '合计', dataIndex: 'orderRmbTotal', width: 130, align: 'right', sorter: true, render: (value?: number, row?: PayableAuditSummary) => row?.canViewSensitivePayable ? formatMoney(value ?? 0) : <Text type="secondary">按权限隐藏</Text> },
    receivableProfit: { title: '应收利润', dataIndex: 'receivableProfit', width: 120, align: 'right', sorter: true, render: (value?: number, row?: PayableAuditSummary) => row?.canViewProfit && typeof value === 'number' ? formatMoney(value) : <Text type="secondary">按权限隐藏</Text> },
    operationProfit: { title: '运营利润', dataIndex: 'operationProfit', width: 120, align: 'right', sorter: true, render: (value?: number, row?: PayableAuditSummary) => row?.canViewProfit && typeof value === 'number' ? formatMoney(value) : <Text type="secondary">按权限隐藏</Text> },
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
      render: (_, row) => row.auditSource === 'MISC_FEE_HANG' ? (
        <Space size={4}>
          {row.reconciliationStatus === 'CONFIRMED' ? (
            <Tag color="success">已生成待付款</Tag>
          ) : (
            <Popconfirm title="确认审核该跨越挂账并生成待付款？" onConfirm={() => void auditOne(row)} okText="审核" cancelText="取消">
              <Button size="small" type="primary" disabled={!canAudit}>审核</Button>
            </Popconfirm>
          )}
        </Space>
      ) : (
        <Space size={4}>
          <Button size="small" disabled={!canManage || row.reconciliationStatus === 'CONFIRMED' || row.voided} onClick={() => openEditor(row)}>修改</Button>
          {row.reconciliationStatus === 'CONFIRMED' ? (
            <Popconfirm title="确认反审核该应付费用？" onConfirm={() => reverseAuditOne(row)} okText="反审核" cancelText="取消">
              <Button size="small" disabled={!canReverse}>反审核</Button>
            </Popconfirm>
          ) : (
            <Popconfirm title={row.settlementMethod?.trim() === EARLY_PAYMENT_SETTLEMENT_METHOD
              ? '确认审核该市场应付并进入待付款？挂账仅允许提前付款，应付审核仍需数据确认和转单号。'
              : '确认审核该市场应付并进入待付款？请确认业务数据、代理数据均已审核且已填写转单号。'} onConfirm={() => void auditOne(row)} okText="审核" cancelText="取消">
              <Button size="small" type="primary" disabled={!canAudit || row.voided}>审核</Button>
            </Popconfirm>
          )}
          <Popconfirm title="确认删除该应付费用？删除后不可恢复；已被付款申请、付款记录或凭证引用时不能删除。" onConfirm={async () => { await apiClient.deletePayableAudit(row.id); await loadRows(); }} okText="删除" cancelText="取消">
            <Button size="small" danger disabled={!canVoid || row.reconciliationStatus === 'CONFIRMED' || row.voided}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  };

  const unavailableColumns = new Set<ColumnKey>([
    ...(!canViewSensitive || !canViewPayableCost ? ['chargeWeightKg' as const, 'unitPrice' as const, 'amount' as const, 'orderRmbTotal' as const] : []),
    ...(!fieldVisibility.showAgentCompanyName ? ['agentName' as const] : []),
    ...(!fieldVisibility.showAgentChannel ? ['agentChannel' as const] : []),
    ...(!canViewPayableStatus ? ['reconciliationStatus' as const] : []),
    ...(!canViewProfit ? ['receivableProfit' as const, 'operationProfit' as const] : [])
  ]);
  const columns = defaultColumnOrder
    .filter((key) => !unavailableColumns.has(key))
    .map((key) => baseColumns[key]);

  const matrixColumns: ManagedTableColumns<PayableAuditSummary> = [
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
            row.canViewSensitivePayable && fieldVisibility.showAgentCompanyName ? { key: 'agentName', label: agentFieldLabels.detailedCompanyName, value: row.agentName || '-', title: row.agentName, wrap: true } : null,
            fieldVisibility.showAgentChannel ? { key: 'agentChannel', label: agentFieldLabels.channel, value: row.agentChannel || '-', title: row.agentChannel } : null,
            { key: 'currency', label: '币种', value: <Tag>{row.currency ?? 'RMB'}</Tag> },
            canViewPayableCost ? { key: 'chargeWeightKg', label: '计费重', value: <ChargeWeightChangeTag value={row.chargeWeightKg} change={row.chargeWeightChange} /> } : null,
            canViewPayableCost ? { key: 'unitPrice', label: '单价', value: typeof row.unitPrice === 'number' ? formatUnitPrice(row.unitPrice) : '-' } : null,
            canViewPayableCost ? { key: 'amount', label: '总金额', value: row.canViewSensitivePayable ? formatMoney(row.amount) : <Text type="secondary">按权限隐藏</Text> } : null,
            canViewPayableCost ? { key: 'orderRmbTotal', label: '合计', value: row.canViewSensitivePayable ? formatMoney(row.orderRmbTotal ?? 0) : <Text type="secondary">按权限隐藏</Text> } : null,
            row.canViewProfit ? { key: 'receivableProfit', label: '应收利润', value: typeof row.receivableProfit === 'number' ? formatMoney(row.receivableProfit) : '-' } : null,
            row.canViewProfit ? { key: 'operationProfit', label: '运营利润', value: typeof row.operationProfit === 'number' ? formatMoney(row.operationProfit) : '-' } : null,
            canViewPayableStatus ? { key: 'status', label: '状态', value: statusTag(row.reconciliationStatus) } : null,
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

  if (!fieldVisibility.showPayableCost) {
    return <Alert type="warning" showIcon message="当前账号无权查看该页面" />;
  }

  return (
    <Card
      title="市场应付审核"
      className="finance-work-card"
      extra={
        <Space wrap>
          <Popconfirm title={`确认批量审核已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('audit')} okText="批量审核" cancelText="取消"><Button disabled={!selectedIds.length || !canBatchAudit}>批量审核</Button></Popconfirm>
          <Popconfirm title={`确认批量反审核已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('reverse')} okText="批量反审核" cancelText="取消"><Button disabled={!selectedIds.length || !canBatchReverse || hasSelectedMiscFeeHang}>批量反审核</Button></Popconfirm>
          <Popconfirm title={`确认批量删除已选 ${selectedIds.length} 条？`} onConfirm={() => void runBatch('void')} okText="批量删除" cancelText="取消"><Button disabled={!selectedIds.length || !canBatchVoid || hasSelectedMiscFeeHang} danger>批量删除</Button></Popconfirm>
          <Button disabled={!canExport} onClick={async () => {
            const exported = await apiClient.exportPayableAudits({ ids: selectedIds.length ? selectedIds : undefined, query });
            downloadCsv('payable-audits.csv', [
              ...(fieldVisibility.showAgentCompanyName ? [{ key: 'agentName', label: agentFieldLabels.detailedCompanyName }] : []),
              { key: 'name', label: '费用名称' },
              { key: 'customerCode', label: '客户编号' },
              { key: 'outboundOrderNo', label: '出货单号' },
              { key: 'transferNo', label: '转单号' },
              ...(fieldVisibility.showAgentChannel ? [{ key: 'agentChannel', label: '代理渠道' }] : []),
              ...(canViewPayableStatus ? [{ key: 'reconciliationStatus', label: '对账状态' }] : []),
              { key: 'currency', label: '币种' },
              ...(canViewPayableCost ? [{ key: 'chargeWeightKg', label: '计费重' }, { key: 'unitPrice', label: '单价' }, { key: 'amount', label: '总金额' }, { key: 'orderRmbTotal', label: '合计' }] : []),
              { key: 'receivableProfit', label: '应收利润' },
              { key: 'operationProfit', label: '运营利润' },
              { key: 'salesperson', label: '业务员' },
              { key: 'remark', label: '备注' }
            ], exported.rows as unknown as Array<Record<string, unknown>>);
            message.success(`应付导出已生成：${exported.rows.length} 条`);
          }}>导出</Button>
          <Button
            type="primary"
            onClick={() => openEditor(undefined, selectedCreateRow)}
            disabled={!canManage || selectedIds.length > 1}
            title={selectedIds.length > 1 ? '添加应付只能引用一笔已选单据' : undefined}
          >
            添加应付
          </Button>
          <Button icon={<RefreshCw size={15} />} onClick={() => void loadRows()} />
        </Space>
      }
    >
      <Form form={queryForm} layout="vertical" initialValues={defaultQuery}>
        <Row gutter={[10, 10]} className="finance-filter-bar finance-audit-filter-grid">
          <Col xs={24} md={8} xl={4}><Form.Item name="systemOrderNo" label="出货单号"><Input placeholder="出货单号 / 订单号" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="customer" label="客户"><Input placeholder="客户编号 / 名称" /></Form.Item></Col>
          {fieldVisibility.showAgentCompanyName ? <Col xs={24} md={8} xl={4}><Form.Item name="agent" label={`${agentFieldLabels.detailedCompanyName}筛选`}><Input /></Form.Item></Col> : null}
          {canViewPayableStatus ? <Col xs={24} md={8} xl={4}><Form.Item name="status" label="对账状态"><Select options={[{ value: 'ALL', label: '全部' }, { value: 'PENDING', label: '待审核' }, { value: 'CONFIRMED', label: '已审核' }, { value: 'VOIDED', label: '已删除' }]} /></Form.Item></Col> : null}
          <Col xs={24} md={16} xl={8} className="finance-audit-filter-actions">
            <Space wrap>
              <Button type="primary" onClick={() => { const next = { ...defaultQuery, ...queryForm.getFieldsValue(), page: 1 }; setQuery(next); void loadRows(next); }}>查询</Button>
              <Button onClick={() => { queryForm.resetFields(); setQuery(defaultQuery); void loadRows(defaultQuery); }}>重置</Button>
              <Button aria-expanded={advancedFiltersOpen} onClick={() => setAdvancedFiltersOpen((current) => !current)}>{advancedFiltersOpen ? '收起筛选' : '更多筛选'}</Button>
            </Space>
          </Col>
        </Row>
        {advancedFiltersOpen ? (
          <Row gutter={[10, 10]} className="finance-audit-filter-grid finance-audit-filter-advanced">
            <Col xs={24} md={8} xl={4}><Form.Item name="salesperson" label="业务员"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="feeName" label="费用名称"><Select allowClear showSearch options={feeNameOptions} /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdBy" label="制单人"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedBy" label="审核人员"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="paymentNo" label="付款编号"><Input /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdFrom" label="制单日起"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="createdTo" label="制单日止"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedFrom" label="核单日起"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="reviewedTo" label="核单日止"><Input placeholder="YYYY-MM-DD" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="remark" label="备注"><Input /></Form.Item></Col>
          </Row>
        ) : null}
      </Form>
      <Flex gap={12} wrap className="finance-work-status-strip finance-audit-summary">
        {canViewPayableCost ? (canViewSensitive ? <Tag color="blue">RMB 合计 {formatMoney(response.totals.rmbTotal)}</Tag> : <Tag>金额按权限隐藏</Tag>) : null}
        {canViewProfit ? <Tag color="green">应收利润 {formatMoney(response.totals.receivableProfitTotal ?? 0)}</Tag> : null}
        {canViewProfit ? <Tag color="cyan">运营利润 {formatMoney(response.totals.operationProfitTotal ?? 0)}</Tag> : null}
        <Tag>待审核 {response.totals.pendingCount}</Tag>
        <Tag color="success">已审核 {response.totals.confirmedCount}</Tag>
        <Tag color="default">已删除 {response.totals.voidedCount}</Tag>
      </Flex>
      <ManagedDualViewTable<PayableAuditSummary>
        viewStorageKey="sunny.finance.payableAudit.view-v1"
        viewAriaLabel="市场应付审核表格视图"
        defaultView="matrix"
        views={{
          matrix: {
            label: '矩阵视图',
            columns: matrixColumns,
            tableProps: {
              className: 'finance-audit-table finance-payable-audit-matrix-table',
              minimumScrollX: 0,
              tableLayout: 'fixed',
              showHeader: false,
              recordDetail: { title: '应付审核详情', columns },
              columnSettings: {
                storageKey: 'siyuan.finance.payableAudit.matrix-columns.v2',
                title: '市场应付审核矩阵列设置',
                lockedKeys: ['action']
              }
            }
          },
          ledger: {
            label: '精密台账模式',
            columns,
            tableProps: {
              className: 'finance-audit-table finance-payable-audit-ledger-table',
              minimumScrollX: 2800,
              recordDetail: { title: '应付审核详情' },
              columnSettings: {
                storageKey: columnStorageKey,
                title: '市场应付审核列设置',
                defaultColumnOrder
              }
            }
          }
        }}
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={response.rows}
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (row) => ({ disabled: Boolean(row.voided || (row.auditSource === 'MISC_FEE_HANG' && row.reconciliationStatus === 'CONFIRMED')) }) }}
        columnSettingsPlacement="toolbar"
        pagination={{ current: response.pagination.page, pageSize: response.pagination.pageSize, total: response.pagination.totalItems, showSizeChanger: true }}
        onChange={(pagination: TablePaginationConfig, _filters, sorter) => {
          const sort = Array.isArray(sorter) ? sorter[0] : sorter;
          const next = {
            ...query,
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? 10,
            sortBy: typeof sort?.field === 'string' ? sort.field as PayableAuditListQuery['sortBy'] : query.sortBy,
            sortOrder: sort?.order === 'ascend' ? 'asc' as const : sort?.order === 'descend' ? 'desc' as const : query.sortOrder
          };
          setQuery(next);
          void loadRows(next);
        }}
      />
      <Modal title={editingRow ? '修改应付费用' : '添加应付'} className="finance-modal" width={800} open={editorOpen} confirmLoading={savingEditor} okButtonProps={{ disabled: matchingShipment }} onCancel={() => { if (savingEditor) return; setEditorOpen(false); setEditingRow(null); setMatchedShipment(null); setSelectedShipmentLocked(false); form.resetFields(); }} onOk={submitEditor} okText="保存应付" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={{ name: '代理成本', currency: 'RMB' }} onValuesChange={handleEditorValuesChange}>
          {!editingRow ? (
            <>
              <Form.Item name="shipmentId" hidden><Input /></Form.Item>
              <Form.Item name="systemOrderNo" label="关联订单"><Input readOnly={selectedShipmentLocked} placeholder="按出货单号或内部单号匹配" /></Form.Item>
              <Form.Item name="customerOrderNo" label="出货单号"><Input readOnly={selectedShipmentLocked} placeholder="可选，按出货单号匹配" /></Form.Item>
              <Form.Item name="transferNo" label="转单号"><Input readOnly={selectedShipmentLocked} placeholder="可选，按转单号匹配" /></Form.Item>
              <Form.Item name="customerCode" label="客户编号"><Input readOnly={selectedShipmentLocked} placeholder="可选，按客户编号匹配" /></Form.Item>
              {canMatchShipment ? <Button loading={matchingShipment} onClick={() => void matchShipment()}>匹配订单</Button> : null}
              {matchedShipment ? (
                <Card size="small" className="finance-audit-summary">
                  <Space direction="vertical" size={2}>
                    <Text strong>{matchedShipment.customerName}</Text>
                    <Text type="secondary">出货单号：{resolveShipmentOutboundOrderNo(matchedShipment)} / 转单号：{matchedShipment.transferNo ?? '-'}</Text>
                    <Text type="secondary">业务员：{matchedShipment.salesperson ?? '-'}{fieldVisibility.showAgentCompanyName ? ` / ${agentFieldLabels.detailedCompanyName}：${matchedShipment.agentName ?? '-'}` : ''}{fieldVisibility.showAgentChannel ? ` / ${agentFieldLabels.channel}：${matchedShipment.agentChannel ?? '-'}` : ''}</Text>
                  </Space>
                </Card>
              ) : null}
            </>
          ) : (
            <Card size="small" className="finance-audit-summary"><Text strong>{editingRow.systemOrderNo}</Text><br /><Text type="secondary">{editingRow.customerCode} {fieldVisibility.showAgentCompanyName ? ` / ${editingRow.agentName ?? '-'}` : ''} / {editingRow.transferNo ?? '-'}</Text></Card>
          )}
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请选择或填写费用名称' }]}><AutoComplete options={feeNameOptions} /></Form.Item>
          {canViewPayableCost ? <>
            <Form.Item name="chargeWeightKg" label="计费重" rules={[{ required: true, message: '请填写计费重' }]}><InputNumber className="full-width" min={0} precision={3} /></Form.Item>
            <Form.Item name="unitPrice" label="单价" rules={[{ required: true, message: '请填写单价' }]}><InputNumber className="full-width" min={0} precision={FINANCIAL_DECIMAL_SCALE} /></Form.Item>
            <Form.Item name="amount" label="总金额"><InputNumber className="full-width" min={0} precision={2} disabled /></Form.Item>
          </> : null}
          <Form.Item name="currency" label="币种"><Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="paymentNo" label="付款编号"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
