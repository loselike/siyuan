import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Form, Input, InputNumber, Modal, Select, Space, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  defaultFinanceCatalogItems,
  type AgentSummary,
  type BusinessCostFeeSummary,
  type FinanceBillingUnit,
  type FinanceCatalogItemSummary,
  type PayableFeeSummary,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentFinanceDetailSummary,
  type ShipmentFinanceItemCreateInput,
  type ShipmentFinanceItemType,
  type ShipmentFinanceItemUpdateInput,
  type ReceivableWaterReceiptCandidate
} from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../../apiClient';
import { confirmDangerousAction } from '../../shared/dangerousAction';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { ManagedTable, tenRowTablePagination } from '../../shared/ui';
import { applySettlementMethodCurrency, createFinanceFeeNameOptions, createSettlementMethodOptions, financeCatalogCurrencyOptions, getSettlementMethodRows } from '../catalog';
import { agentFieldLabels } from '../../shared/agentFieldLabels';
import { getDetailedCompanyAgentOptions, resolveAgentIdByIdentity } from '../../shared/agentIdentity';
import { resolveShipmentOutboundOrderNo } from '../../shared/shipmentOrderNo';
import { canViewOrderLifecycleBusinessCosts } from '../../shared/businessCostAccess';

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
  exchangeRate?: number;
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

const businessCostBillingUnitOptions = [
  { label: '计费重（KG）', value: 'KG' as const },
  { label: '体积（CBM）', value: 'CBM' as const }
];

function businessCostBillingUnitLabel(unit?: FinanceBillingUnit) {
  return unit === 'CBM' ? 'CBM' : 'KG';
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

function calculateAmountOverride(row: {
  amount?: number;
  type?: ShipmentFinanceItemType;
  billingUnit?: FinanceBillingUnit;
  billingQuantity?: number;
  chargeWeightKg?: number;
  unitPrice?: number;
}) {
  const quantity = row.type === 'BUSINESS_COST'
    ? row.billingQuantity ?? row.chargeWeightKg
    : row.chargeWeightKg;
  if (!quantity || !row.unitPrice || quantity <= 0 || row.unitPrice <= 0) return false;
  return Math.abs((row.amount ?? 0) - quantity * row.unitPrice) > 0.01;
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
  const [receiptRows, setReceiptRows] = useState<ReceivableWaterReceiptCandidate[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const roleCanViewPayables = hasUiPermission(role, permissions, 'finance:order-fee:payable:view')
    || hasUiPermission(role, permissions, 'finance:payable:view-sensitive');
  const visiblePayables = roleCanViewPayables && (detail?.canViewPayables
    ?? (
      hasUiPermission(role, permissions, 'finance:order-fee:payable:view')
      || hasUiPermission(role, permissions, 'finance:payable:view-sensitive')
    ));
  const visibleReceivables = [
    'business:shipment:finance-detail-view',
    'business:review:finance-detail-view',
    'finance:receivable:read',
    'finance:receivable:detail',
    'finance:receivable:update'
  ].some((permission) => hasUiPermission(role, permissions, permission as PermissionKey));
  const canViewBusinessCostAgent = roleCanViewPayables && (hasUiPermission(role, permissions, 'finance:business-cost:view-agent')
    || hasUiPermission(role, permissions, 'finance:order-fee:payable:view')
    || hasUiPermission(role, permissions, 'finance:payable:view-sensitive'));
  const canViewBusinessCosts = canViewOrderLifecycleBusinessCosts(role, permissions);
  const receivableRows = (detail?.receivables ?? []).filter(isActiveFeeRow);
  const businessCostRows = canViewBusinessCosts ? (detail?.businessCosts ?? []).filter(isActiveFeeRow) : [];
  const payableRows = visiblePayables ? (detail?.payables ?? []).filter(isActiveFeeRow) : [];
  const rowsByType = useMemo<Record<OrderFeeTableType, OrderFeeRow[]>>(() => ({
    RECEIVABLE: receivableRows,
    BUSINESS_COST: businessCostRows,
    PAYABLE: payableRows
  }), [businessCostRows, payableRows, receivableRows]);
  const visibleTypes = useMemo<OrderFeeTableType[]>(
    () => [
      ...(visibleReceivables ? ['RECEIVABLE' as const] : []),
      ...(canViewBusinessCosts ? ['BUSINESS_COST' as const] : []),
      ...(visiblePayables ? ['PAYABLE' as const] : [])
    ],
    [canViewBusinessCosts, visiblePayables, visibleReceivables]
  );
  const currentRows = rowsByType[activeType];
  const inspectedRow = currentRows.find((row) => row.id === inspectedRowId) ?? currentRows[0];
  const selectedKeys = selectedRowKeys[activeType];
  const selectedRows = currentRows.filter((row) => selectedKeys.includes(row.id));
  const canCreateFee = hasUiPermission(role, permissions, 'business:order-fee:create');
  const canUpdateFee = hasUiPermission(role, permissions, 'business:order-fee:update');
  const canAdjustCost = hasUiPermission(role, permissions, 'finance:order-fee:cost-adjust');
  const canManageBusinessCostSensitiveFields = canAdjustCost || (
    hasUiPermission(role, permissions, 'finance:business-cost:manage')
    && hasUiPermission(role, permissions, 'finance:business-cost:view-agent')
  );
  const hasOrderEntryBusinessCostWrite = hasUiPermission(role, permissions, 'business:order-entry:business-cost-write');
  const canWritePendingReviewBusinessCost = shipment.status === 'REVIEW_PENDING' && hasOrderEntryBusinessCostWrite;
  const usesPendingReviewBusinessCostOnly = !canManageBusinessCostSensitiveFields && (
    hasOrderEntryBusinessCostWrite
    || hasUiPermission(role, permissions, 'business:shipment:team-view')
    || hasUiPermission(role, permissions, 'data-scope:sales-own')
  );
  const canCreateCurrentFee = usesPendingReviewBusinessCostOnly
    ? activeType === 'BUSINESS_COST' && canWritePendingReviewBusinessCost
    : canCreateFee;
  const canUpdateCurrentFee = usesPendingReviewBusinessCostOnly
    ? activeType === 'BUSINESS_COST' && canWritePendingReviewBusinessCost
    : activeType === 'RECEIVABLE'
      ? canUpdateFee
      : activeType === 'BUSINESS_COST'
        ? canManageBusinessCostSensitiveFields
        : canAdjustCost;
  const canMatchReceipt = [
    'finance:receivable:match-water',
    'finance:water-match:create'
  ].some((permission) => hasUiPermission(role, permissions, permission as PermissionKey));
  const canDeleteReceivable = hasUiPermission(role, permissions, 'finance:receivable:void');
  const canDeleteFee = hasUiPermission(role, permissions, 'business:order-fee:delete')
    || (activeType === 'RECEIVABLE' && canDeleteReceivable);
  const canDeleteCurrentFee = usesPendingReviewBusinessCostOnly
    ? activeType === 'BUSINESS_COST' && canWritePendingReviewBusinessCost
    : canDeleteFee;
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
    const unpaid = Math.max(0, row.amount - Number(row.receivedAmount ?? 0));
    setReceiptMatch({ row, amount: Number(unpaid.toFixed(2)) });
    setReceiptLoading(true);
    try {
      const response = await apiClient.receivableWaterReceiptCandidates(row.id);
      const rows = response.rows.filter((item) => Number(item.rmbAvailableAllocationAmount ?? item.rmbBalance ?? item.balance) > 0);
      const exchangeRate = rows[0]?.exchangeRate;
      setReceiptRows(rows);
      setReceiptMatch((current) => current ? {
        ...current,
        exchangeRate,
        amount: exchangeRate ? Number((unpaid * exchangeRate).toFixed(2)) : current.amount
      } : current);
    } catch (error) {
      Modal.error({ title: '水单加载失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setReceiptLoading(false);
    }
  }, [apiClient]);

  const submitReceiptMatch = useCallback(async (receipt: ReceivableWaterReceiptCandidate) => {
    if (!receiptMatch) return;
    const unpaid = Math.max(0, receiptMatch.row.amount - Number(receiptMatch.row.receivedAmount ?? 0));
    const receivableExchangeRate = Number(receiptMatch.exchangeRate ?? receipt.exchangeRate ?? 1);
    const availableRmb = Number(receipt.rmbAvailableAllocationAmount ?? receipt.rmbBalance ?? receipt.balance);
    const amount = Number(Math.min(receiptMatch.amount, availableRmb, unpaid * receivableExchangeRate).toFixed(2));
    if (amount <= 0) {
      message.warning('匹配金额必须大于 0');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.matchWaterReceiptOrders(receipt.id, {
        amountCurrency: 'RMB',
        exchangeRate: receivableExchangeRate,
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
      billingUnit: type === 'BUSINESS_COST' && row && 'billingUnit' in row
        ? row.billingUnit ?? 'KG'
        : type === 'BUSINESS_COST' ? 'KG' : undefined,
      billingQuantity: type === 'BUSINESS_COST' && row && 'billingQuantity' in row
        ? row.billingQuantity ?? row.chargeWeightKg
        : type === 'BUSINESS_COST' && row && hasChargePricing(row) ? row.chargeWeightKg : undefined,
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
    const billingUnit = editor.type === 'BUSINESS_COST'
      ? (values.billingUnit ?? 'KG') as FinanceBillingUnit
      : undefined;
    const billingQuantity = editor.type === 'BUSINESS_COST'
      ? Number(values.billingQuantity ?? values.chargeWeightKg ?? 0)
      : undefined;
    const quantity = editor.type === 'BUSINESS_COST' ? billingQuantity : values.chargeWeightKg;
    const shouldCalculateAmount = (editor.type === 'BUSINESS_COST' || editor.type === 'PAYABLE')
      && quantity !== undefined
      && values.unitPrice !== undefined;
    const amount = shouldCalculateAmount
      ? Number((Number(quantity) * Number(values.unitPrice)).toFixed(2))
      : Number(values.amount ?? 0);
    const input: ShipmentFinanceItemCreateInput | ShipmentFinanceItemUpdateInput = {
      name: values.name?.trim(),
      amount,
      currency: values.currency ?? 'RMB',
      settlementMethod: values.settlementMethod,
      paymentNo: editor.type === 'RECEIVABLE' ? values.paymentNo : undefined,
      reconciliationStatus: editor.row?.reconciliationStatus ?? 'PENDING',
      agentId: editor.type === 'RECEIVABLE' ? undefined : values.agentId,
      billingUnit,
      billingQuantity: editor.type === 'BUSINESS_COST' ? billingQuantity : undefined,
      chargeWeightKg: editor.type === 'BUSINESS_COST'
        ? billingUnit === 'KG' ? billingQuantity : undefined
        : editor.type === 'PAYABLE' ? values.chargeWeightKg : undefined,
      unitPrice: editor.type === 'BUSINESS_COST' || editor.type === 'PAYABLE' ? values.unitPrice : undefined,
      amountOverridden: editor.type === 'BUSINESS_COST' || editor.type === 'PAYABLE'
        ? calculateAmountOverride({ amount, type: editor.type, billingUnit, billingQuantity, chargeWeightKg: values.chargeWeightKg, unitPrice: values.unitPrice })
        : false,
      remark: values.remark
    };
    setSubmitting(true);
    try {
      if (editor.row) {
        if (usesPendingReviewBusinessCostOnly && editor.type === 'BUSINESS_COST') {
          await apiClient.updatePendingReviewBusinessCost(shipment.id, editor.row.id, input);
        } else {
          await apiClient.updateShipmentFinanceItem(shipment.id, editor.row.id, input);
        }
      } else {
        const createInput = { ...input, type: editor.type } as ShipmentFinanceItemCreateInput;
        if (usesPendingReviewBusinessCostOnly && editor.type === 'BUSINESS_COST') {
          await apiClient.createPendingReviewBusinessCost(shipment.id, createInput);
        } else {
          await apiClient.createShipmentFinanceItem(shipment.id, createInput);
        }
      }
      const editedId = editor.row?.id;
      closeEditor();
      await reload();
      if (editedId) setInspectedRowId(editedId);
      message.success(editor.row ? '费用已修改' : '费用已新增');
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, closeEditor, editor, editorForm, reload, shipment.id, usesPendingReviewBusinessCostOnly]);

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
          } else if (usesPendingReviewBusinessCostOnly && type === 'BUSINESS_COST') {
            await apiClient.deletePendingReviewBusinessCost(shipment.id, row.id);
          } else {
            await apiClient.deleteShipmentFinanceItem(shipment.id, row.id);
          }
        } else if (action === 'lock') {
          await apiClient.lockShipmentFinanceItem(shipment.id, row.id);
        } else if (action === 'unlock') {
          await apiClient.unlockShipmentFinanceItem(shipment.id, row.id);
        } else if ((type === 'BUSINESS_COST' || type === 'PAYABLE') && hasChargePricing(row)) {
          const quantity = type === 'BUSINESS_COST' ? row.billingQuantity ?? row.chargeWeightKg : row.chargeWeightKg;
          if (!quantity || !row.unitPrice) continue;
          await apiClient.updateShipmentFinanceItem(shipment.id, row.id, {
            amount: Number((quantity * row.unitPrice).toFixed(2)),
            billingUnit: type === 'BUSINESS_COST' ? row.billingUnit ?? 'KG' : undefined,
            billingQuantity: type === 'BUSINESS_COST' ? quantity : undefined,
            chargeWeightKg: type === 'BUSINESS_COST' ? (row.billingUnit ?? 'KG') === 'KG' ? quantity : undefined : row.chargeWeightKg,
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
  }, [apiClient, canDeleteReceivable, reload, shipment.id, usesPendingReviewBusinessCostOnly]);

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
          {row.sourceType === 'MANUAL' && canUpdateCurrentFee ? (
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
  }, [activeType, canUpdateCurrentFee, inspectRow, openEditor]);

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
            {editor.type === 'RECEIVABLE' ? (
              <Form.Item name="paymentNo" label="付款编号" className="order-fee-side-form-wide">
                <Input placeholder="匹配水单后自动回写，也可手动记录" />
              </Form.Item>
            ) : editor.type === 'PAYABLE' || canViewBusinessCostAgent ? (
              <Form.Item name="agentId" label={agentFieldLabels.detailedCompanyName} className="order-fee-side-form-wide">
                <Select showSearch allowClear optionFilterProp="searchText" options={agentOptions} placeholder="选择代理详细公司名" />
              </Form.Item>
            ) : null}
            {editor.type === 'BUSINESS_COST' ? (
              <>
                <Form.Item name="billingUnit" label="计费方式" rules={[{ required: true, message: '请选择计费方式' }]}>
                  <Select options={businessCostBillingUnitOptions} />
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(previous, current) => previous.billingUnit !== current.billingUnit}>
                  {({ getFieldValue }) => {
                    const unit = getFieldValue('billingUnit') as FinanceBillingUnit | undefined;
                    return (
                      <Form.Item name="billingQuantity" label="计费数量" rules={[{ required: true, message: '请输入计费数量' }]}>
                        <InputNumber min={0} precision={unit === 'CBM' ? 6 : 3} addonAfter={businessCostBillingUnitLabel(unit)} />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
                <Form.Item name="unitPrice" label="单价">
                  <InputNumber min={0} precision={2} />
                </Form.Item>
              </>
            ) : editor.type === 'PAYABLE' ? (
              <>
                <Form.Item name="chargeWeightKg" label="计费重">
                  <InputNumber min={0} precision={3} addonAfter="KG" />
                </Form.Item>
                <Form.Item name="unitPrice" label="代理成本单价">
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
    const canDeleteInspected = inspectedRow.sourceType === 'MANUAL' && canDeleteCurrentFee;
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
            {detailItem('出货单号', renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(shipment), { shipment }))}
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
            {hasChargePricing(inspectedRow) && activeType === 'BUSINESS_COST'
              ? detailItem('计费方式', 'billingUnit' in inspectedRow && inspectedRow.billingUnit === 'CBM' ? '体积（CBM）' : '计费重（KG）')
              : null}
            {hasChargePricing(inspectedRow)
              ? detailItem(activeType === 'BUSINESS_COST' ? '计费数量' : '计费重', (() => {
                const quantity = activeType === 'BUSINESS_COST'
                  ? ('billingQuantity' in inspectedRow ? inspectedRow.billingQuantity : undefined) ?? inspectedRow.chargeWeightKg
                  : inspectedRow.chargeWeightKg;
                const unit = activeType === 'BUSINESS_COST' && 'billingUnit' in inspectedRow && inspectedRow.billingUnit === 'CBM' ? 'CBM' : 'KG';
                return quantity === undefined ? '-' : `${quantity} ${unit}`;
              })())
              : null}
            {hasChargePricing(inspectedRow)
              ? detailItem('单价', inspectedRow.unitPrice === undefined ? '-' : `${formatFinanceAmount(inspectedRow.unitPrice, inspectedRow.currency)}/${activeType === 'BUSINESS_COST' && 'billingUnit' in inspectedRow && inspectedRow.billingUnit === 'CBM' ? 'CBM' : 'KG'}`)
              : null}
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

  const profitSections = roleCanViewPayables
    ? (detail?.profitSections ?? []).filter((item) => canViewBusinessCosts || !['RECEIVABLE_BUSINESS', 'BUSINESS_PAYABLE'].includes(item.key))
    : [];
  const receivableRmbTotal = receivableRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const businessCostRmbTotal = businessCostRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const payableRmbTotal = payableRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const hasUnsupportedRmbAmount = currentRows.some((row) => resolveRmbAmount(row) === undefined);
  const total = currentRows.reduce((sum, row) => sum + (resolveRmbAmount(row) ?? 0), 0);
  const chargeWeightTotal = currentRows.reduce((sum, row) => {
    if (!hasChargePricing(row)) return sum;
    if (row.type === 'BUSINESS_COST' && row.billingUnit === 'CBM') return sum;
    return sum + Number(row.type === 'BUSINESS_COST' ? row.billingQuantity ?? row.chargeWeightKg ?? 0 : row.chargeWeightKg ?? 0);
  }, 0);
  const billingVolumeTotal = currentRows.reduce((sum, row) => row.type === 'BUSINESS_COST' && row.billingUnit === 'CBM' ? sum + Number(row.billingQuantity ?? 0) : sum, 0);

  return (
    <section className="shipment-detail-section shipment-detail-finance-section">
      {modalContextHolder}
      <div className="shipment-detail-section-title">费用与利润</div>
      {loading && !detail ? <Text type="secondary">正在加载财务明细...</Text> : null}
      <div className="shipment-finance-metrics">
        {metric('应收费用', receivableRows.length ? formatCurrency(receivableRmbTotal) : '待生成', receivableRows.length ? 'success' : 'warning')}
        {canViewBusinessCosts ? metric('业务成本', businessCostRows.length ? formatCurrency(businessCostRmbTotal) : '待生成') : null}
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
          {canCreateCurrentFee ? <Button type="primary" onClick={() => openEditor(activeType)}>新增费用</Button> : null}
        </div>
        <div className="order-fee-master-detail">
          <div className="order-fee-master-pane">
            <ManagedTable<OrderFeeRow>
              className="finance-work-table finance-embedded-table order-fee-compact-table"
              rowKey="id"
              columns={compactColumns}
              dataSource={currentRows}
              size="small"
              tableLayout="fixed"
              loading={loading}
              pagination={{ ...tenRowTablePagination, hideOnSinglePage: true }}
              rowSelection={canDeleteCurrentFee ? {
                selectedRowKeys: selectedKeys,
                onChange: (next) => setSelectedRowKeys((current) => ({ ...current, [activeType]: next.map(String) })),
                columnWidth: 42,
                getCheckboxProps: (row) => ({ disabled: !isManualEditable(row) })
              } : undefined}
              showSelectionSummary={false}
              onRow={(row) => ({ onClick: () => inspectRow(row.id) })}
              rowClassName={(row) => row.id === inspectedRow?.id ? 'order-fee-row-active' : ''}
              locale={{ emptyText: `暂无${feeTypeTitles[activeType]}` }}
            />
            <div className="order-fee-master-summary">
              <span>共 {currentRows.length} 条</span>
              <span>人民币合计 {hasUnsupportedRmbAmount ? '缺少有效汇率' : formatCurrency(total)}</span>
              {activeType !== 'RECEIVABLE' && chargeWeightTotal > 0 ? <span>计费重 {chargeWeightTotal.toFixed(3)} KG</span> : null}
              {activeType === 'BUSINESS_COST' && billingVolumeTotal > 0 ? <span>体积 {billingVolumeTotal.toFixed(6)} CBM</span> : null}
            </div>
            {canCreateCurrentFee || canDeleteCurrentFee ? (
              <div className="order-fee-toolbar">
                <Space wrap>
                  {canDeleteCurrentFee ? <Text type="secondary">已选 {selectedKeys.length} 条</Text> : null}
                  {canDeleteCurrentFee ? <Button size="small" disabled={!selectedKeys.length} onClick={() => confirmRunRows(activeType, 'delete', selectedRows)}>删除</Button> : null}
                  {canCreateCurrentFee ? (
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
            addonBefore="本次匹配人民币金额"
            onChange={(value) => setReceiptMatch((current) => current ? { ...current, amount: Number(value ?? 0) } : current)}
          />
          <ManagedTable<ReceivableWaterReceiptCandidate>
            className="finance-embedded-table"
            rowKey="id"
            size="small"
            loading={receiptLoading || submitting}
            dataSource={receiptRows}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 820 }}
            columns={[
              { title: '水单编号', dataIndex: 'receiptNo', width: 160 },
              { title: '原币金额', dataIndex: 'amount', width: 120, align: 'right', render: (value: number, row) => `${row.currency} ${value.toFixed(2)}` },
              { title: '人民币可用余额', dataIndex: 'rmbAvailableAllocationAmount', width: 150, align: 'right', render: (value: number | undefined, row) => `¥${Number(value ?? row.rmbBalance ?? row.balance).toFixed(2)}` },
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
