import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  defaultFinanceCatalogItems,
  type AgentSummary,
  type BusinessCostFeeSummary,
  type FinanceCatalogItemSummary,
  type PayableFeeSummary,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentFinanceDetailSummary,
  type ShipmentFinanceItemCreateInput,
  type ShipmentFinanceItemType,
  type ShipmentFinanceItemUpdateInput,
  type WaterReceiptSummary
} from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../../apiClient';
import { confirmDangerousAction } from '../../shared/dangerousAction';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { tenRowTablePagination } from '../../shared/ui';
import { applySettlementMethodCurrency, createFinanceFeeNameOptions, createSettlementMethodOptions, financeCatalogCurrencyOptions, getSettlementMethodRows } from '../catalog';
import { agentFieldLabels } from '../../shared/agentFieldLabels';
import { getDetailedCompanyAgentOptions, resolveAgentIdByIdentity } from '../../shared/agentIdentity';

const { Text } = Typography;

type OrderFeeRow = ReceivableFeeSummary | PayableFeeSummary | BusinessCostFeeSummary;
type OrderFeeTableType = ShipmentFinanceItemType;

interface OrderFeeEditorState {
  type: OrderFeeTableType;
  row?: OrderFeeRow;
}

interface ReceiptMatchState {
  row: ReceivableFeeSummary;
  amount: number;
}

interface OrderFeePanelProps {
  apiClient: ApiClient;
  role: RoleKey;
  permissions?: PermissionKey[];
  agents: AgentSummary[];
  catalogItems?: FinanceCatalogItemSummary[];
  shipment: Shipment;
  detail?: ShipmentFinanceDetailSummary;
  loading?: boolean;
  onReload: (shipmentId: string) => Promise<unknown>;
  renderShipmentOrderNoLink: (systemOrderNo?: string, options?: { shipment?: Shipment; subtitle?: string; copyText?: string }) => ReactNode;
}

const feeTypeTitles: Record<OrderFeeTableType, string> = {
  RECEIVABLE: '应收费用',
  BUSINESS_COST: '业务成本',
  PAYABLE: '应付费用'
};

type FeeAuditStatus = 'PENDING' | 'CONFIRMED';
type ReceiptMatchStatus = 'UNMATCHED' | 'PENDING' | 'PARTIAL' | 'MATCHED';

const feeAuditStatusLabel: Record<FeeAuditStatus, string> = {
  PENDING: '待审核',
  CONFIRMED: '已审核'
};

const feeAuditStatusColor: Record<FeeAuditStatus, string> = {
  PENDING: 'gold',
  CONFIRMED: 'green'
};

const receiptStatusLabel: Record<string, string> = {
  UNPAID: '未收款',
  PARTIAL: '部分收款',
  RECEIVED: '已收款'
};

const quickFeeNames = ['运费', '报关费', '纸箱', '胶带'];

function formatFinanceAmount(amount: number, currency?: string) {
  return `${currency ?? 'RMB'} ${amount.toFixed(2)}`;
}

function resolveRmbAmount(row: Pick<OrderFeeRow, 'amount' | 'currency' | 'rmbAmount'>) {
  if (row.rmbAmount !== undefined) return row.rmbAmount;
  return ['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase()) ? row.amount : undefined;
}

function formatRmbAmount(row: Pick<OrderFeeRow, 'amount' | 'currency' | 'rmbAmount'>) {
  const amount = resolveRmbAmount(row);
  return amount === undefined ? '缺少有效汇率' : formatCurrency(amount);
}

function formatOptionalDate(value?: string) {
  return value ? formatBeijingDateTime(value) : '-';
}

function hasPendingReceiptMatch(row: ReceivableFeeSummary) {
  return row.pendingMatchRequests?.some((request) => request.status === 'PENDING')
    || row.pendingMatchRequest?.status === 'PENDING';
}

function hasPostedReceiptMatch(row: ReceivableFeeSummary) {
  return row.receiptStatus === 'PARTIAL'
    || row.receiptStatus === 'RECEIVED'
    || Number(row.receivedAmount ?? 0) > 0;
}

function getReceiptMatchStatus(row: ReceivableFeeSummary): ReceiptMatchStatus {
  if (hasPendingReceiptMatch(row)) return 'PENDING';
  const receivedAmount = Number(row.receivedAmount ?? 0);
  if (row.receiptStatus === 'RECEIVED' || (row.amount > 0 && receivedAmount >= row.amount)) return 'MATCHED';
  if (row.receiptStatus === 'PARTIAL' || receivedAmount > 0) return 'PARTIAL';
  return 'UNMATCHED';
}

function renderReceiptMatchStatus(row: ReceivableFeeSummary) {
  const status = getReceiptMatchStatus(row);
  if (status === 'PENDING') return <Tag color="gold">待匹配审核</Tag>;
  if (status === 'PARTIAL') return <Tag color="blue">部分匹配</Tag>;
  if (status === 'MATCHED') return <Tag color="success">已匹配</Tag>;
  return <Tag>未匹配</Tag>;
}

const receiptMatchStatusOrder: Record<ReceiptMatchStatus, number> = {
  UNMATCHED: 0,
  PENDING: 1,
  PARTIAL: 2,
  MATCHED: 3
};

function getFeeAuditStatus(row: OrderFeeRow): FeeAuditStatus {
  const hasPostedMatch = ('receivedAmount' in row || 'receiptStatus' in row)
    && hasPostedReceiptMatch(row as ReceivableFeeSummary);
  if (
    row.settled
    || row.locked
    || row.voided
    || hasPostedMatch
    || row.reconciliationStatus === 'CONFIRMED'
    || row.reconciliationStatus === 'LOCKED'
    || row.reconciliationStatus === 'VOIDED'
  ) {
    return 'CONFIRMED';
  }
  return 'PENDING';
}

function parseCustomerCode(customerName?: string) {
  return customerName?.split('-')[0] || '-';
}

function isActiveFeeRow(row: OrderFeeRow) {
  return !row.voided && row.reconciliationStatus !== 'VOIDED';
}

function isManualEditable(row: OrderFeeRow) {
  const hasPendingMatch = ('pendingMatchRequests' in row || 'pendingMatchRequest' in row)
    && hasPendingReceiptMatch(row as ReceivableFeeSummary);
  return row.sourceType === 'MANUAL' && getFeeAuditStatus(row) === 'PENDING' && !hasPendingMatch;
}

function hasUiPermission(role: RoleKey, permissions: PermissionKey[] | undefined, permission: PermissionKey) {
  return role === 'ADMIN' || Boolean(permissions?.includes(permission));
}

function calculateAmountOverride(row: { amount?: number; chargeWeightKg?: number; unitPrice?: number }) {
  if (!row.chargeWeightKg || !row.unitPrice || row.chargeWeightKg <= 0 || row.unitPrice <= 0) return false;
  return Math.abs((row.amount ?? 0) - row.chargeWeightKg * row.unitPrice) > 0.01;
}

function hasChargePricing(row: OrderFeeRow): row is PayableFeeSummary | BusinessCostFeeSummary {
  return 'chargeWeightKg' in row || 'unitPrice' in row;
}

export function OrderFeePanel({
  apiClient,
  role,
  permissions,
  agents,
  catalogItems = [],
  shipment,
  detail,
  loading,
  onReload,
  renderShipmentOrderNoLink
}: OrderFeePanelProps) {
  const [modal, modalContextHolder] = Modal.useModal();
  const [activeType, setActiveType] = useState<OrderFeeTableType>('RECEIVABLE');
  const [inspectedRowId, setInspectedRowId] = useState<string>();
  const [editor, setEditor] = useState<OrderFeeEditorState | null>(null);
  const [editorForm] = Form.useForm<ShipmentFinanceItemCreateInput & ShipmentFinanceItemUpdateInput>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Record<OrderFeeTableType, string[]>>({
    RECEIVABLE: [],
    BUSINESS_COST: [],
    PAYABLE: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [receiptMatch, setReceiptMatch] = useState<ReceiptMatchState | null>(null);
  const [receiptRows, setReceiptRows] = useState<WaterReceiptSummary[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const roleCanViewPayables = role === 'ADMIN' || role === 'FINANCE' || role === 'UG_FINANCE' || role === 'BOSS' || role === 'OWNER';
  const visiblePayables = roleCanViewPayables && (detail?.canViewPayables
    ?? (
      hasUiPermission(role, permissions, 'finance:order-fee:payable:view')
      || hasUiPermission(role, permissions, 'finance:payable:view-sensitive')
    ));
  const canViewBusinessCostAgent = roleCanViewPayables && (hasUiPermission(role, permissions, 'finance:business-cost:view-agent')
    || hasUiPermission(role, permissions, 'finance:order-fee:payable:view')
    || hasUiPermission(role, permissions, 'finance:payable:view-sensitive'));
  const receivableRows = (detail?.receivables ?? []).filter(isActiveFeeRow);
  const businessCostRows = (detail?.businessCosts ?? []).filter(isActiveFeeRow);
  const payableRows = visiblePayables ? (detail?.payables ?? []).filter(isActiveFeeRow) : [];
  const rowsByType = useMemo<Record<OrderFeeTableType, OrderFeeRow[]>>(() => ({
    RECEIVABLE: receivableRows,
    BUSINESS_COST: businessCostRows,
    PAYABLE: payableRows
  }), [businessCostRows, payableRows, receivableRows]);
  const visibleTypes = useMemo<OrderFeeTableType[]>(
    () => visiblePayables ? ['RECEIVABLE', 'BUSINESS_COST', 'PAYABLE'] : ['RECEIVABLE', 'BUSINESS_COST'],
    [visiblePayables]
  );
  const currentRows = rowsByType[activeType];
  const inspectedRow = currentRows.find((row) => row.id === inspectedRowId) ?? currentRows[0];
  const selectedKeys = selectedRowKeys[activeType];
  const selectedRows = currentRows.filter((row) => selectedKeys.includes(row.id));
  const canCreateFee = hasUiPermission(role, permissions, 'business:order-fee:create');
  const canUpdateFee = hasUiPermission(role, permissions, 'business:order-fee:update');
  const canMatchReceipt = hasUiPermission(role, permissions, 'finance:water-match:create');
  const canDeleteReceivable = hasUiPermission(role, permissions, 'finance:receivable:void');
  const canDeleteFee = hasUiPermission(role, permissions, 'business:order-fee:delete')
    || (activeType === 'RECEIVABLE' && canDeleteReceivable);
  const settlementRows = useMemo(() => getSettlementMethodRows(catalogItems), [catalogItems]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(settlementRows), [settlementRows]);
  const agentOptions = useMemo(() => getDetailedCompanyAgentOptions(agents), [agents]);
  const feeNameOptions = useMemo(() => {
    const rows = catalogItems.length
      ? catalogItems
      : defaultFinanceCatalogItems;
    return createFinanceFeeNameOptions(rows);
  }, [catalogItems]);

  useEffect(() => {
    if (!visibleTypes.includes(activeType)) {
      setActiveType(visibleTypes[0]);
    }
  }, [activeType, visibleTypes]);

  useEffect(() => {
    if (!currentRows.length) {
      setInspectedRowId(undefined);
      return;
    }
    if (!currentRows.some((row) => row.id === inspectedRowId)) {
      setInspectedRowId(currentRows[0].id);
    }
  }, [currentRows, inspectedRowId]);

  const reload = useCallback(async () => {
    await onReload(shipment.id);
  }, [onReload, shipment.id]);

  const changeType = useCallback((type: OrderFeeTableType) => {
    setActiveType(type);
    setEditor(null);
    editorForm.resetFields();
  }, [editorForm]);

  const openReceiptMatch = useCallback(async (row: ReceivableFeeSummary) => {
    if (hasPendingReceiptMatch(row)) {
      message.warning('该应收已有待财务审核的水单匹配申请');
      return;
    }
    const customerCode = parseCustomerCode(shipment.customerName);
    if (!customerCode || customerCode === '-') {
      message.warning('当前运单缺少客户编号');
      return;
    }
    const unpaid = Math.max(0, row.amount - Number(row.receivedAmount ?? 0));
    setReceiptMatch({ row, amount: Number(unpaid.toFixed(2)) });
    setReceiptLoading(true);
    try {
      const response = await apiClient.waterReceipts({ customerCode, status: 'ALL', page: 1, pageSize: 1000 });
      setReceiptRows(response.rows.filter((item) => ['ARRIVED', 'PARTIAL_MATCHED'].includes(item.status) && Number(item.balance) > 0));
    } catch (error) {
      Modal.error({ title: '水单加载失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setReceiptLoading(false);
    }
  }, [apiClient, shipment.customerName]);

  const submitReceiptMatch = useCallback(async (receipt: WaterReceiptSummary) => {
    if (!receiptMatch) return;
    const unpaid = Math.max(0, receiptMatch.row.amount - Number(receiptMatch.row.receivedAmount ?? 0));
    const amount = Number(Math.min(receiptMatch.amount, receipt.balance, unpaid).toFixed(2));
    if (amount <= 0) {
      message.warning('匹配金额必须大于 0');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.matchWaterReceiptOrders(receipt.id, {
        matches: [{
          receivableId: receiptMatch.row.id,
          receivableSourceType: receiptMatch.row.sourceType ?? 'MANUAL',
          amount
        }]
      });
      setReceiptMatch(null);
      await reload();
      message.success('匹配申请已提交，等待财务审核');
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, receiptMatch, reload]);

  const openEditor = useCallback((type: OrderFeeTableType, row?: OrderFeeRow) => {
    setActiveType(type);
    setInspectedRowId(row?.id);
    setEditor({ type, row });
    editorForm.setFieldsValue({
      type,
      name: row?.name ?? (type === 'RECEIVABLE' ? '运费' : ''),
      amount: row?.amount ?? 0,
      currency: row?.currency ?? 'RMB',
      settlementMethod: row?.settlementMethod,
      paymentNo: row && 'paymentNo' in row ? row.paymentNo : undefined,
      agentId: type !== 'RECEIVABLE' && row && 'agentId' in row
        ? row.agentId ?? resolveAgentIdByIdentity(agents, 'agentName' in row ? row.agentName : undefined)
        : shipment.agentId ?? resolveAgentIdByIdentity(agents, shipment.agentName),
      chargeWeightKg: row && hasChargePricing(row) ? row.chargeWeightKg : undefined,
      unitPrice: row && hasChargePricing(row) ? row.unitPrice : undefined,
      remark: row?.remark
    });
  }, [agents, editorForm, shipment.agentId, shipment.agentName]);

  const closeEditor = useCallback(() => {
    setEditor(null);
    editorForm.resetFields();
  }, [editorForm]);

  const submitEditor = useCallback(async () => {
    if (!editor) return;
    const values = await editorForm.validateFields();
    const shouldCalculateAmount = (editor.type === 'BUSINESS_COST' || editor.type === 'PAYABLE')
      && values.chargeWeightKg !== undefined
      && values.unitPrice !== undefined;
    const amount = shouldCalculateAmount
      ? Number((Number(values.chargeWeightKg) * Number(values.unitPrice)).toFixed(2))
      : Number(values.amount ?? 0);
    const input: ShipmentFinanceItemCreateInput | ShipmentFinanceItemUpdateInput = {
      name: values.name?.trim(),
      amount,
      currency: values.currency ?? 'RMB',
      settlementMethod: values.settlementMethod,
      paymentNo: editor.type === 'RECEIVABLE' ? values.paymentNo : undefined,
      reconciliationStatus: editor.row?.reconciliationStatus ?? 'PENDING',
      agentId: editor.type === 'RECEIVABLE' ? undefined : values.agentId,
      chargeWeightKg: editor.type === 'BUSINESS_COST' || editor.type === 'PAYABLE' ? values.chargeWeightKg : undefined,
      unitPrice: editor.type === 'BUSINESS_COST' || editor.type === 'PAYABLE' ? values.unitPrice : undefined,
      amountOverridden: editor.type === 'BUSINESS_COST' || editor.type === 'PAYABLE'
        ? calculateAmountOverride({ amount, chargeWeightKg: values.chargeWeightKg, unitPrice: values.unitPrice })
        : false,
      remark: values.remark
    };
    setSubmitting(true);
    try {
      if (editor.row) {
        await apiClient.updateShipmentFinanceItem(shipment.id, editor.row.id, input);
      } else {
        await apiClient.createShipmentFinanceItem(shipment.id, { ...input, type: editor.type } as ShipmentFinanceItemCreateInput);
      }
      const editedId = editor.row?.id;
      closeEditor();
      await reload();
      if (editedId) setInspectedRowId(editedId);
      message.success(editor.row ? '费用已修改' : '费用已新增');
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, closeEditor, editor, editorForm, reload, shipment.id]);

  const runRows = useCallback(async (type: OrderFeeTableType, action: 'delete' | 'lock' | 'unlock' | 'recalc', rows: OrderFeeRow[]) => {
    const targets = rows.filter((row) => row.sourceType === 'MANUAL');
    if (!targets.length) {
      message.warning('请选择可操作的手工费用');
      return;
    }
    setSubmitting(true);
    try {
      for (const row of targets) {
        if (action === 'delete') {
          if (type === 'RECEIVABLE' && canDeleteReceivable) {
            await apiClient.deleteReceivableAudit(row.id);
          } else {
            await apiClient.deleteShipmentFinanceItem(shipment.id, row.id);
          }
        } else if (action === 'lock') {
          await apiClient.lockShipmentFinanceItem(shipment.id, row.id);
        } else if (action === 'unlock') {
          await apiClient.unlockShipmentFinanceItem(shipment.id, row.id);
        } else if ((type === 'BUSINESS_COST' || type === 'PAYABLE') && hasChargePricing(row) && row.chargeWeightKg && row.unitPrice) {
          await apiClient.updateShipmentFinanceItem(shipment.id, row.id, {
            amount: Number((row.chargeWeightKg * row.unitPrice).toFixed(2)),
            amountOverridden: false
          });
        }
      }
      setSelectedRowKeys((current) => ({ ...current, [type]: [] }));
      setEditor(null);
      await reload();
      message.success(action === 'recalc' ? '已重算选中费用' : '费用操作已完成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '费用操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, canDeleteReceivable, reload, shipment.id]);

  const confirmRunRows = useCallback((type: OrderFeeTableType, action: 'delete' | 'lock' | 'unlock' | 'recalc', rows: OrderFeeRow[]) => {
    const actionText = action === 'delete' ? '删除' : action === 'lock' ? '锁定' : action === 'unlock' ? '解锁' : '重算';
    const contentMap = {
      delete: type === 'RECEIVABLE' && canDeleteReceivable
        ? '删除后不可恢复；如已匹配水单，将同步撤销匹配并回算水单、应收及客户账户余额；存在待审核匹配申请时不能删除。'
        : '删除后不可恢复；已被付款申请、付款记录、凭证或水单匹配引用的费用不能删除。',
      lock: '锁定后该费用不可直接编辑，需要解锁后才能修改。',
      unlock: '解锁后该费用会恢复可编辑，请确认下游审核或付款状态允许回退。',
      recalc: '重算会按当前计费重和单价覆盖金额，请确认费用口径正确。'
    } as const;
    confirmDangerousAction({
      title: `确认${actionText}${rows.length > 1 ? `选中的 ${rows.length} 条费用` : '该费用'}？`,
      content: contentMap[action],
      okText: actionText,
      danger: action === 'delete',
      confirm: modal.confirm,
      onOk: () => runRows(type, action, rows)
    });
  }, [canDeleteReceivable, modal, runRows]);

  const quickAdd = useCallback(async (type: OrderFeeTableType, name: string) => {
    setSubmitting(true);
    try {
      await apiClient.createShipmentFinanceItem(shipment.id, {
        type,
        name,
        amount: 0,
        currency: 'RMB',
        reconciliationStatus: 'PENDING',
        agentId: type === 'RECEIVABLE' ? undefined : shipment.agentId ?? resolveAgentIdByIdentity(agents, shipment.agentName)
      });
      await reload();
      message.success(`已快速添加${name}`);
    } finally {
      setSubmitting(false);
    }
  }, [agents, apiClient, reload, shipment.agentId, shipment.agentName, shipment.id]);

  const inspectRow = useCallback((rowId: string) => {
    setEditor(null);
    editorForm.resetFields();
    setInspectedRowId(rowId);
  }, [editorForm]);

  const renderStatus = (row: OrderFeeRow) => {
    const status = getFeeAuditStatus(row);
    return <Tag color={feeAuditStatusColor[status]}>{feeAuditStatusLabel[status]}</Tag>;
  };

  const compactColumns = useMemo<ColumnsType<OrderFeeRow>>(() => {
    const isReceivable = activeType === 'RECEIVABLE';
    const columns: ColumnsType<OrderFeeRow> = [{
      title: '费用名称',
      dataIndex: 'name',
      key: 'name',
      width: isReceivable ? '16%' : '20%',
      ellipsis: true,
      sorter: (left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN')
    },
    {
      title: '费用审核状态',
      key: 'status',
      width: isReceivable ? '14%' : '15%',
      render: (_, row) => renderStatus(row),
      sorter: (left, right) => getFeeAuditStatus(left).localeCompare(getFeeAuditStatus(right))
    },
    {
      title: '币种',
      key: 'currency',
      width: isReceivable ? '9%' : '10%',
      render: (_, row) => <Tag>{row.currency ?? 'RMB'}</Tag>
    },
    {
      title: '人民币合计',
      key: 'rmbAmount',
      width: isReceivable ? '16%' : '18%',
      align: 'right',
      render: (_, row) => formatRmbAmount(row),
      sorter: (left, right) => (resolveRmbAmount(left) ?? 0) - (resolveRmbAmount(right) ?? 0)
    },
    {
      title: '结算方式',
      key: 'settlementMethod',
      width: isReceivable ? '16%' : '17%',
      ellipsis: true,
      render: (_, row) => row.settlementMethod || '-'
    },
    {
      title: '操作',
      key: 'inspect',
      width: isReceivable ? '15%' : '16%',
      align: 'center',
      render: (_, row) => (
        <Space size={0} className="order-fee-row-actions">
          <Button type="link" size="small" onClick={(event) => {
            event.stopPropagation();
            inspectRow(row.id);
          }}>查看</Button>
          {row.sourceType === 'MANUAL' && canUpdateFee ? (
            <Button type="link" size="small" disabled={!isManualEditable(row)} onClick={(event) => {
              event.stopPropagation();
              openEditor(activeType, row);
            }}>修改</Button>
          ) : null}
        </Space>
      )
    }];
    if (isReceivable) {
      columns.splice(3, 0, {
        title: '匹配状态',
        key: 'receiptMatchStatus',
        width: '10%',
        render: (_, row) => renderReceiptMatchStatus(row as ReceivableFeeSummary),
        sorter: (left, right) => receiptMatchStatusOrder[getReceiptMatchStatus(left as ReceivableFeeSummary)] - receiptMatchStatusOrder[getReceiptMatchStatus(right as ReceivableFeeSummary)]
      });
    }
    return columns;
  }, [activeType, canUpdateFee, inspectRow, openEditor]);

  const detailItem = (label: string, value: ReactNode, wide = false) => (
    <div className={`order-fee-inspector-item${wide ? ' order-fee-inspector-item-wide' : ''}`}>
      <span>{label}</span>
      <div>{value}</div>
    </div>
  );

  const renderInspector = () => {
    if (editor) {
      return (
        <div className="order-fee-inspector-editor" data-testid="order-fee-side-editor">
          <div className="order-fee-inspector-heading">
            <div>
              <strong>{editor.row ? '修改' : '新增'}{feeTypeTitles[editor.type]}</strong>
              <Text type="secondary">在右侧完成编辑，保存后左侧列表自动更新。</Text>
            </div>
          </div>
          <Form form={editorForm} layout="vertical" className="order-fee-side-form">
            <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请选择费用名称' }]}>
              <Select showSearch options={feeNameOptions} placeholder="选择费用名称" />
            </Form.Item>
            <Form.Item name="currency" label="币种" rules={[{ required: true, message: '请选择币种' }]}>
              <Select options={financeCatalogCurrencyOptions.map((item) => ({ label: item, value: item }))} />
            </Form.Item>
            <Form.Item name="settlementMethod" label="结算方式">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={settlementOptions}
                placeholder="选择结算方式，自动带出币种"
                onChange={(value) => applySettlementMethodCurrency(editorForm, settlementRows, value)}
              />
            </Form.Item>
            {editor.type !== 'RECEIVABLE' ? (
              <Form.Item name="agentId" label={agentFieldLabels.detailedCompanyName} className="order-fee-side-form-wide">
                <Select showSearch allowClear optionFilterProp="searchText" options={agentOptions} placeholder="选择代理详细公司名" />
              </Form.Item>
            ) : (
              <Form.Item name="paymentNo" label="付款编号" className="order-fee-side-form-wide">
                <Input placeholder="匹配水单后自动回写，也可手动记录" />
              </Form.Item>
            )}
            {editor.type !== 'RECEIVABLE' ? (
              <>
                <Form.Item name="chargeWeightKg" label="计费重">
                  <InputNumber min={0} precision={3} addonAfter="kg" />
                </Form.Item>
                <Form.Item name="unitPrice" label={editor.type === 'PAYABLE' ? '代理成本单价' : '单价'}>
                  <InputNumber min={0} precision={2} />
                </Form.Item>
              </>
            ) : null}
            <Form.Item name="amount" label="总金额" rules={[{ required: true, message: '请输入金额' }]}>
              <InputNumber min={0} precision={2} />
            </Form.Item>
            <Form.Item name="remark" label="备注" className="order-fee-side-form-wide">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
          <div className="order-fee-inspector-actions">
            <Button onClick={closeEditor} disabled={submitting}>取消</Button>
            <Button type="primary" onClick={submitEditor} loading={submitting}>保存费用</Button>
          </div>
        </div>
      );
    }

    if (!inspectedRow) {
      return (
        <div className="order-fee-inspector-empty">
          <strong>暂无{feeTypeTitles[activeType]}</strong>
          <Text type="secondary">可点击“新增费用”在右侧直接录入。</Text>
        </div>
      );
    }

    const isReceivable = activeType === 'RECEIVABLE';
    const canDeleteInspected = inspectedRow.sourceType === 'MANUAL' && canDeleteFee;
    const canMatchInspected = isReceivable && canMatchReceipt;
    const agentName = 'agentName' in inspectedRow ? inspectedRow.agentName || shipment.agentName || '-' : shipment.agentName || '-';
    const receiptStatus = isReceivable && 'receiptStatus' in inspectedRow ? inspectedRow.receiptStatus : undefined;
    const receivable = isReceivable ? inspectedRow as ReceivableFeeSummary : undefined;
    const pendingMatchRequest = receivable?.pendingMatchRequests?.find((request) => request.status === 'PENDING')
      ?? receivable?.pendingMatchRequest;
    const receiptMatchDisabledReason = receivable && hasPendingReceiptMatch(receivable)
      ? '该应收已有待财务审核的水单匹配申请'
      : receiptStatus === 'RECEIVED'
        ? '该应收费用已完成收款，无需再次匹配水单'
        : undefined;
    return (
      <div className="order-fee-inspector-detail">
        <div className="order-fee-inspector-heading">
          <div>
            <strong>费用详情</strong>
            <Text type="secondary">{feeTypeTitles[activeType]} · {inspectedRow.name}</Text>
          </div>
          {renderStatus(inspectedRow)}
        </div>
        <section className="order-fee-inspector-group">
          <h4>基础信息</h4>
          <div className="order-fee-inspector-grid">
            {detailItem('费用名称', inspectedRow.name)}
            {detailItem('客户编号', parseCustomerCode(shipment.customerName))}
            {detailItem('出货单号', renderShipmentOrderNoLink(shipment.systemOrderNo, { shipment }))}
            {detailItem('转单号', shipment.transferNo || '-')}
            {activeType !== 'RECEIVABLE' && (activeType !== 'BUSINESS_COST' || canViewBusinessCostAgent)
              ? detailItem(agentFieldLabels.detailedCompanyName, agentName, true)
              : null}
          </div>
        </section>
        <section className="order-fee-inspector-group">
          <h4>计算与收付</h4>
          <div className="order-fee-inspector-grid">
            {detailItem('币种', inspectedRow.currency || 'RMB')}
            {detailItem('金额', formatFinanceAmount(inspectedRow.amount, inspectedRow.currency))}
            {detailItem('人民币合计', formatRmbAmount(inspectedRow))}
            {detailItem('结算方式', inspectedRow.settlementMethod || '-')}
            {detailItem('付款编号', inspectedRow.paymentNo || '-')}
            {isReceivable && 'matchedReceiptNo' in inspectedRow ? detailItem('匹配水单编号', inspectedRow.matchedReceiptNo || '-') : null}
            {isReceivable && 'receivedAmount' in inspectedRow ? detailItem('已收金额', formatFinanceAmount(Number(inspectedRow.receivedAmount ?? 0), inspectedRow.currency)) : null}
            {isReceivable ? detailItem('收款状态', receiptStatus ? receiptStatusLabel[receiptStatus] ?? receiptStatus : '未收款') : null}
            {isReceivable && 'receivedAt' in inspectedRow ? detailItem('收款时间', formatOptionalDate(inspectedRow.receivedAt)) : null}
            {isReceivable && 'receiptMatchSource' in inspectedRow ? detailItem('匹配来源', inspectedRow.receiptMatchSource === 'AUTO' ? '自动匹配' : inspectedRow.receiptMatchSource === 'MANUAL' ? '手动匹配' : '-') : null}
            {isReceivable && 'receiptMatchHint' in inspectedRow && inspectedRow.receiptMatchHint ? detailItem('匹配提示', inspectedRow.receiptMatchHint, true) : null}
            {pendingMatchRequest ? detailItem('匹配申请', <Space size={6}><Tag color="gold">待财务审核</Tag><span>{pendingMatchRequest.receiptNo} · {formatFinanceAmount(pendingMatchRequest.amount, pendingMatchRequest.currency)}</span></Space>, true) : null}
            {hasChargePricing(inspectedRow) ? detailItem('计费重', inspectedRow.chargeWeightKg === undefined ? '-' : `${inspectedRow.chargeWeightKg} kg`) : null}
            {hasChargePricing(inspectedRow) ? detailItem('单价', inspectedRow.unitPrice === undefined ? '-' : `${formatFinanceAmount(inspectedRow.unitPrice, inspectedRow.currency)}/kg`) : null}
            {hasChargePricing(inspectedRow) ? detailItem('金额来源', inspectedRow.amountOverridden ? <Tag color="orange">人工覆盖</Tag> : '公式计算') : null}
            {'businessProfit' in inspectedRow ? detailItem('业务利润', inspectedRow.businessProfit === undefined ? '-' : formatCurrency(inspectedRow.businessProfit)) : null}
          </div>
        </section>
        <section className="order-fee-inspector-group">
          <h4>审计信息</h4>
          <div className="order-fee-inspector-grid">
            {detailItem('制单日期', formatOptionalDate(inspectedRow.createdAt))}
            {detailItem('制单人', inspectedRow.createdBy || '-')}
            {detailItem('审单日期', formatOptionalDate(inspectedRow.reviewedAt))}
            {detailItem('审单人', inspectedRow.reviewedBy || '-')}
            {detailItem('费用来源', inspectedRow.sourceType === 'MANUAL' ? '手工录入' : '系统生成')}
            {detailItem('备注', inspectedRow.remark || '-', true)}
          </div>
        </section>
        <div className="order-fee-inspector-actions">
          {canMatchInspected ? (
            <Tooltip title={receiptMatchDisabledReason}>
              <span aria-label={receiptMatchDisabledReason}>
                <Button disabled={Boolean(receiptMatchDisabledReason)} onClick={() => openReceiptMatch(inspectedRow as ReceivableFeeSummary)}>匹配水单</Button>
              </span>
            </Tooltip>
          ) : null}
          {canDeleteInspected ? (
            <Button danger disabled={!isManualEditable(inspectedRow)} onClick={() => confirmRunRows(activeType, 'delete', [inspectedRow])}>删除</Button>
          ) : null}
          {!canMatchInspected && !canDeleteInspected ? <Text type="secondary">当前账号仅支持查看</Text> : null}
        </div>
      </div>
    );
  };

  const metric = (label: string, value: ReactNode, tone: 'neutral' | 'success' | 'warning' = 'neutral') => (
    <div key={label} className={`shipment-finance-metric shipment-finance-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  const profitSections = roleCanViewPayables ? detail?.profitSections ?? [] : [];
  const receivableRmbTotal = receivableRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const businessCostRmbTotal = businessCostRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const payableRmbTotal = payableRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const hasUnsupportedRmbAmount = currentRows.some((row) => resolveRmbAmount(row) === undefined);
  const total = currentRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const chargeWeightTotal = currentRows.reduce((sum, row) => sum + (hasChargePricing(row) ? Number(row.chargeWeightKg ?? 0) : 0), 0);

  return (
    <section className="shipment-detail-section shipment-detail-finance-section">
      {modalContextHolder}
      <div className="shipment-detail-section-title">费用与利润</div>
      {loading && !detail ? <Text type="secondary">正在加载财务明细...</Text> : null}
      <div className="shipment-finance-metrics">
        {metric('应收费用', receivableRows.length ? formatCurrency(receivableRmbTotal) : '待生成', receivableRows.length ? 'success' : 'warning')}
        {metric('业务成本', businessCostRows.length ? formatCurrency(businessCostRmbTotal) : '待生成')}
        {visiblePayables ? metric('应付费用', payableRows.length ? formatCurrency(payableRmbTotal) : '待生成', payableRows.length ? 'warning' : 'neutral') : null}
        {visiblePayables ? metric('利润汇总', detail?.grossProfit === undefined ? '待生成' : formatCurrency(detail.grossProfit), detail?.grossProfit === undefined ? 'neutral' : detail.grossProfit >= 0 ? 'success' : 'warning') : null}
      </div>
      {profitSections.length ? (
        <div className="order-fee-profit-band">
          <div className="order-fee-profit-band-title">利润明细</div>
          {profitSections.map((item) => metric(item.title, formatCurrency(item.amount), item.amount >= 0 ? 'success' : 'warning'))}
        </div>
      ) : null}
      <div className="order-fee-workbench">
        <div className="order-fee-workbench-head">
          <div className="order-fee-type-tabs" role="tablist" aria-label="费用分类">
            {visibleTypes.map((type) => (
              <Button
                key={type}
                type={activeType === type ? 'primary' : 'text'}
                role="tab"
                aria-selected={activeType === type}
                onClick={() => changeType(type)}
              >
                {feeTypeTitles[type]} <span>{rowsByType[type].length}</span>
              </Button>
            ))}
          </div>
          {canCreateFee ? <Button type="primary" onClick={() => openEditor(activeType)}>新增费用</Button> : null}
        </div>
        <div className="order-fee-master-detail">
          <div className="order-fee-master-pane">
            <Table<OrderFeeRow>
              className="finance-work-table finance-embedded-table order-fee-compact-table"
              rowKey="id"
              columns={compactColumns}
              dataSource={currentRows}
              size="small"
              tableLayout="fixed"
              loading={loading}
              pagination={{ ...tenRowTablePagination, hideOnSinglePage: true }}
              rowSelection={canDeleteFee ? {
                selectedRowKeys: selectedKeys,
                onChange: (next) => setSelectedRowKeys((current) => ({ ...current, [activeType]: next.map(String) })),
                columnWidth: 42,
                getCheckboxProps: (row) => ({ disabled: !isManualEditable(row) })
              } : undefined}
              onRow={(row) => ({ onClick: () => inspectRow(row.id) })}
              rowClassName={(row) => row.id === inspectedRow?.id ? 'order-fee-row-active' : ''}
              locale={{ emptyText: `暂无${feeTypeTitles[activeType]}` }}
            />
            <div className="order-fee-master-summary">
              <span>共 {currentRows.length} 条</span>
              <span>人民币合计 {hasUnsupportedRmbAmount ? '缺少有效汇率' : formatCurrency(total)}</span>
              {activeType !== 'RECEIVABLE' ? <span>计费重 {chargeWeightTotal.toFixed(3)} kg</span> : null}
            </div>
            {canCreateFee || canDeleteFee ? (
              <div className="order-fee-toolbar">
                <Space wrap>
                  {canDeleteFee ? <Text type="secondary">已选 {selectedKeys.length} 条</Text> : null}
                  {canDeleteFee ? <Button size="small" disabled={!selectedKeys.length} onClick={() => confirmRunRows(activeType, 'delete', selectedRows)}>删除</Button> : null}
                  {canCreateFee ? (
                    <Dropdown
                      menu={{ items: quickFeeNames.map((name) => ({ key: name, label: name })), onClick: ({ key }) => quickAdd(activeType, String(key)) }}
                      trigger={['click']}
                    >
                      <Button size="small">快速添加</Button>
                    </Dropdown>
                  ) : null}
                </Space>
              </div>
            ) : null}
          </div>
          <aside className="order-fee-inspector-pane" aria-label="费用详情与编辑">
            {renderInspector()}
          </aside>
        </div>
      </div>
      <Modal
        title="提交水单匹配申请"
        className="finance-modal"
        open={Boolean(receiptMatch)}
        onCancel={() => setReceiptMatch(null)}
        footer={null}
        width={880}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">提交后进入财务“水单匹配”，财务审核通过后才更新水单、应收和客户账户余额。</Text>
          <InputNumber
            min={0}
            precision={2}
            value={receiptMatch?.amount}
            addonBefore="本次匹配金额"
            onChange={(value) => setReceiptMatch((current) => current ? { ...current, amount: Number(value ?? 0) } : current)}
          />
          <Table<WaterReceiptSummary>
            className="finance-embedded-table"
            rowKey="id"
            size="small"
            loading={receiptLoading || submitting}
            dataSource={receiptRows}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 820 }}
            columns={[
              { title: '水单编号', dataIndex: 'receiptNo', width: 160 },
              { title: '客户编号', dataIndex: 'customerCode', width: 110 },
              { title: '金额', dataIndex: 'amount', width: 110, align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '已匹配', dataIndex: 'matchedAmount', width: 110, align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '余额', dataIndex: 'balance', width: 110, align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '付款编号', dataIndex: 'paymentNo', width: 140, render: (value?: string) => value || '-' },
              { title: '操作', key: 'actions', width: 100, fixed: 'right', render: (_, row) => <Button size="small" type="primary" onClick={() => submitReceiptMatch(row)}>提交申请</Button> }
            ]}
            locale={{ emptyText: '暂无可匹配水单' }}
          />
        </Space>
      </Modal>
    </section>
  );
}
