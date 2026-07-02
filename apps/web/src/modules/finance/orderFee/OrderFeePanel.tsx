import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Collapse, Dropdown, Form, Input, InputNumber, Modal, Popover, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  defaultFinanceCatalogItems,
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
import { createSettlementMethodOptions, financeCatalogCurrencyOptions, getSettlementMethodRows } from '../catalog';

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
  shipment: Shipment;
  detail?: ShipmentFinanceDetailSummary;
  loading?: boolean;
  onReload: (shipmentId: string) => Promise<unknown>;
  renderShipmentOrderNoLink: (systemOrderNo?: string, options?: { shipment?: Shipment; subtitle?: string; copyText?: string }) => ReactNode;
}

interface ColumnPreference {
  visible: string[];
  order: string[];
}

const feeTypeTitles: Record<OrderFeeTableType, string> = {
  RECEIVABLE: '应收费用',
  BUSINESS_COST: '业务成本',
  PAYABLE: '应付费用'
};

const feeTypeDescriptions: Record<OrderFeeTableType, string> = {
  RECEIVABLE: '维护客户应收、付款编号、结算方式和对账状态。',
  BUSINESS_COST: '维护销售/业务成本口径，业务员可见且可维护。',
  PAYABLE: '维护代理应付费用，仅管理员和财务可见。'
};

const financeStatusLabel: Record<string, string> = {
  PENDING: '待对账',
  CONFIRMED: '已审核',
  LOCKED: '已锁定',
  VOIDED: '已作废'
};

const financeStatusColor: Record<string, string> = {
  PENDING: 'gold',
  CONFIRMED: 'green',
  LOCKED: 'blue',
  VOIDED: 'default'
};

const quickFeeNames = ['运费', '报关费', '纸箱', '胶带'];

const defaultColumnOrder: Record<OrderFeeTableType, string[]> = {
  RECEIVABLE: ['index', 'name', 'customerCode', 'systemOrderNo', 'transferNo', 'status', 'currency', 'paymentNo', 'amount', 'rmbAmount', 'settlementMethod', 'createdAt', 'createdBy', 'reviewedAt', 'reviewedBy', 'remark', 'actions', 'receivedAmount', 'receiptStatus'],
  BUSINESS_COST: ['index', 'agentName', 'name', 'customerCode', 'systemOrderNo', 'transferNo', 'status', 'currency', 'chargeWeightKg', 'unitPrice', 'amount', 'rmbAmount', 'createdAt', 'createdBy', 'reviewedAt', 'reviewedBy', 'remark', 'actions', 'amountOverridden', 'businessProfit'],
  PAYABLE: ['index', 'agentName', 'name', 'customerCode', 'systemOrderNo', 'transferNo', 'status', 'currency', 'chargeWeightKg', 'unitPrice', 'amount', 'rmbAmount', 'createdAt', 'createdBy', 'reviewedAt', 'reviewedBy', 'remark', 'actions', 'amountOverridden']
};

const defaultHiddenColumns: Record<OrderFeeTableType, string[]> = {
  RECEIVABLE: ['receivedAmount', 'receiptStatus'],
  BUSINESS_COST: ['amountOverridden', 'businessProfit'],
  PAYABLE: ['amountOverridden']
};

function formatFinanceAmount(amount: number, currency?: string) {
  return `${currency ?? 'RMB'} ${amount.toFixed(2)}`;
}

function formatOptionalDate(value?: string) {
  return value ? formatBeijingDateTime(value) : '-';
}

function getStatus(row: OrderFeeRow) {
  return row.reconciliationStatus ?? (row.settled ? 'CONFIRMED' : 'PENDING');
}

function parseCustomerCode(customerName?: string) {
  return customerName?.split('-')[0] || '-';
}

function isManualEditable(row: OrderFeeRow) {
  return row.sourceType === 'MANUAL' && !row.locked && getStatus(row) !== 'CONFIRMED' && getStatus(row) !== 'LOCKED';
}

function hasUiPermission(role: RoleKey, permissions: PermissionKey[] | undefined, permission: PermissionKey) {
  return role === 'ADMIN' || Boolean(permissions?.includes(permission));
}

function canManageType(role: RoleKey, type: OrderFeeTableType, permissions?: PermissionKey[]) {
  if (type === 'PAYABLE') {
    return hasUiPermission(role, permissions, 'finance:order-fee:payable:manage') || hasUiPermission(role, permissions, 'finance:payable:manage');
  }
  if (type === 'BUSINESS_COST') {
    return hasUiPermission(role, permissions, 'finance:business-cost:manage');
  }
  return hasUiPermission(role, permissions, 'finance:settle');
}

function calculateAmountOverride(row: { amount?: number; chargeWeightKg?: number; unitPrice?: number }) {
  if (!row.chargeWeightKg || !row.unitPrice || row.chargeWeightKg <= 0 || row.unitPrice <= 0) return false;
  return Math.abs((row.amount ?? 0) - row.chargeWeightKg * row.unitPrice) > 0.01;
}

function hasChargePricing(row: OrderFeeRow): row is PayableFeeSummary | BusinessCostFeeSummary {
  return 'chargeWeightKg' in row || 'unitPrice' in row;
}

function resolveDefaultColumnOrder(type: OrderFeeTableType, keys: string[]) {
  const ordered = defaultColumnOrder[type].filter((key) => keys.includes(key));
  return [...ordered, ...keys.filter((key) => !ordered.includes(key))];
}

function resolveDefaultVisibleColumns(type: OrderFeeTableType, keys: string[]) {
  const hidden = new Set(defaultHiddenColumns[type]);
  return resolveDefaultColumnOrder(type, keys).filter((key) => !hidden.has(key));
}

export function OrderFeePanel({
  apiClient,
  role,
  permissions,
  shipment,
  detail,
  loading,
  onReload,
  renderShipmentOrderNoLink
}: OrderFeePanelProps) {
  const [editor, setEditor] = useState<OrderFeeEditorState | null>(null);
  const [editorForm] = Form.useForm<ShipmentFinanceItemCreateInput & ShipmentFinanceItemUpdateInput>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Record<OrderFeeTableType, string[]>>({
    RECEIVABLE: [],
    BUSINESS_COST: [],
    PAYABLE: []
  });
  const [columnPreferences, setColumnPreferences] = useState<Record<OrderFeeTableType, ColumnPreference>>({
    RECEIVABLE: { visible: [], order: [] },
    BUSINESS_COST: { visible: [], order: [] },
    PAYABLE: { visible: [], order: [] }
  });
  const [catalogItems, setCatalogItems] = useState<FinanceCatalogItemSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [receiptMatch, setReceiptMatch] = useState<ReceiptMatchState | null>(null);
  const [receiptRows, setReceiptRows] = useState<WaterReceiptSummary[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const visiblePayables = detail?.canViewPayables
    ?? (
      hasUiPermission(role, permissions, 'finance:order-fee:payable:view')
      || hasUiPermission(role, permissions, 'finance:payable:view-sensitive')
    );
  const canViewBusinessCostAgent = hasUiPermission(role, permissions, 'finance:business-cost:view-agent')
    || hasUiPermission(role, permissions, 'finance:order-fee:payable:view')
    || hasUiPermission(role, permissions, 'finance:payable:view-sensitive');
  const receivableRows = detail?.receivables ?? [];
  const businessCostRows = detail?.businessCosts ?? [];
  const payableRows = visiblePayables ? detail?.payables ?? [] : [];
  const settlementRows = useMemo(() => getSettlementMethodRows(catalogItems), [catalogItems]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(settlementRows), [settlementRows]);
  const feeNameOptions = useMemo(() => {
    const rows = catalogItems.length
      ? catalogItems.filter((item) => item.category === 'FEE_NAME' && item.enabled)
      : defaultFinanceCatalogItems.filter((item) => item.category === 'FEE_NAME');
    return rows
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
      .map((item) => ({ label: item.name, value: item.name }));
  }, [catalogItems]);

  useEffect(() => {
    apiClient.financeCatalog({ enabledOnly: true })
      .then((response) => setCatalogItems(Array.isArray(response.items) ? response.items : []))
      .catch(() => setCatalogItems([]));
  }, [apiClient]);

  useEffect(() => {
    const next: Record<OrderFeeTableType, ColumnPreference> = { RECEIVABLE: { visible: [], order: [] }, BUSINESS_COST: { visible: [], order: [] }, PAYABLE: { visible: [], order: [] } };
    (['RECEIVABLE', 'BUSINESS_COST', 'PAYABLE'] as OrderFeeTableType[]).forEach((type) => {
      const raw = window.localStorage.getItem(`siyuan.orderFee.columns.${type}`);
      if (!raw) return;
      try {
        next[type] = JSON.parse(raw) as ColumnPreference;
      } catch {
        next[type] = { visible: [], order: [] };
      }
    });
    setColumnPreferences(next);
  }, []);

  const persistColumnPreference = useCallback((type: OrderFeeTableType, preference: ColumnPreference) => {
    setColumnPreferences((current) => ({ ...current, [type]: preference }));
    window.localStorage.setItem(`siyuan.orderFee.columns.${type}`, JSON.stringify(preference));
  }, []);

  const reload = useCallback(async () => {
    await onReload(shipment.id);
  }, [onReload, shipment.id]);

  const openReceiptMatch = useCallback(async (row: ReceivableFeeSummary) => {
    if (getStatus(row) !== 'CONFIRMED') {
      message.warning('应收审核通过后才能匹配水单');
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
        matches: [{ receivableFinanceItemId: receiptMatch.row.id, amount }]
      });
      setReceiptMatch(null);
      await reload();
      message.success('水单匹配完成');
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, receiptMatch, reload]);

  const openEditor = useCallback((type: OrderFeeTableType, row?: OrderFeeRow) => {
    setEditor({ type, row });
    editorForm.setFieldsValue({
      type,
      name: row?.name ?? (type === 'RECEIVABLE' ? '运费' : ''),
      amount: row?.amount ?? 0,
      currency: row?.currency ?? 'RMB',
      settlementMethod: row?.settlementMethod,
      paymentNo: 'paymentNo' in (row ?? {}) ? row?.paymentNo : undefined,
      reconciliationStatus: row?.reconciliationStatus ?? 'PENDING',
      agentName: type === 'PAYABLE' && row && 'agentName' in row ? row.agentName : shipment.agentName,
      chargeWeightKg: row && hasChargePricing(row) ? row.chargeWeightKg : undefined,
      unitPrice: row && hasChargePricing(row) ? row.unitPrice : undefined,
      remark: row?.remark
    });
  }, [editorForm, shipment.agentName]);

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
      reconciliationStatus: values.reconciliationStatus ?? 'PENDING',
      agentName: editor.type === 'PAYABLE' ? values.agentName : undefined,
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
      setEditor(null);
      editorForm.resetFields();
      await reload();
      message.success(editor.row ? '费用已修改' : '费用已新增');
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, editor, editorForm, reload, shipment.id]);

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
          await apiClient.deleteShipmentFinanceItem(shipment.id, row.id);
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
      await reload();
      message.success(action === 'recalc' ? '已重算选中费用' : '费用操作已完成');
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, reload, shipment.id]);

  const confirmRunRows = (type: OrderFeeTableType, action: 'delete' | 'lock' | 'unlock' | 'recalc', rows: OrderFeeRow[]) => {
    const count = rows.length;
    const actionText = action === 'delete' ? '删除' : action === 'lock' ? '锁定' : action === 'unlock' ? '解锁' : '重算';
    const contentMap = {
      delete: '删除后该费用会作废或从订单费用中移除，并影响对应审核总表。',
      lock: '锁定后该费用不可直接编辑，需要解锁后才能修改。',
      unlock: '解锁后该费用会恢复可编辑，请确认下游审核或付款状态允许回退。',
      recalc: '重算会按当前计费重和单价覆盖金额，请确认费用口径正确。'
    } as const;
    confirmDangerousAction({
      title: `确认${actionText}${count > 1 ? `选中的 ${count} 条费用` : '该费用'}？`,
      content: contentMap[action],
      okText: actionText,
      danger: action === 'delete',
      onOk: () => runRows(type, action, rows)
    });
  };

  const quickAdd = useCallback(async (type: OrderFeeTableType, name: string) => {
    setSubmitting(true);
    try {
      await apiClient.createShipmentFinanceItem(shipment.id, {
        type,
        name,
        amount: 0,
        currency: 'RMB',
        reconciliationStatus: 'PENDING',
        agentName: type === 'PAYABLE' ? shipment.agentName : undefined
      });
      await reload();
      message.success(`已快速添加${name}`);
    } finally {
      setSubmitting(false);
    }
  }, [apiClient, reload, shipment.agentName, shipment.id]);

  const renderStatus = (row: OrderFeeRow) => {
    const status = getStatus(row);
    return <Tag color={financeStatusColor[status] ?? 'gold'}>{financeStatusLabel[status] ?? status}</Tag>;
  };

  const renderColumnSettings = (type: OrderFeeTableType, allColumns: ColumnsType<OrderFeeRow>) => {
    const keys = allColumns.map((column) => String(column.key)).filter((key) => key !== 'select');
    const preference = columnPreferences[type];
    const visible = preference.visible.length ? preference.visible : resolveDefaultVisibleColumns(type, keys);
    const order = preference.order.length ? preference.order.filter((key) => keys.includes(key)) : resolveDefaultColumnOrder(type, keys);
    const move = (key: string, delta: number) => {
      const nextOrder = [...order];
      const index = nextOrder.indexOf(key);
      const targetIndex = index + delta;
      if (index < 0 || targetIndex < 0 || targetIndex >= nextOrder.length) return;
      [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];
      persistColumnPreference(type, { visible, order: nextOrder });
    };
    return (
      <Popover
        trigger="click"
        placement="bottomRight"
        content={(
          <div className="order-fee-column-settings">
            {order.map((key) => {
              const column = allColumns.find((item) => String(item.key) === key);
              return (
                <div className="order-fee-column-setting-row" key={key}>
                  <Checkbox
                    checked={visible.includes(key)}
                    onChange={(event) => {
                      const nextVisible = event.target.checked ? [...visible, key] : visible.filter((item) => item !== key);
                      persistColumnPreference(type, { visible: nextVisible, order });
                    }}
                  >
                    {String(column?.title ?? key)}
                  </Checkbox>
                  <Space size={4}>
                    <Button size="small" onClick={() => move(key, -1)}>上移</Button>
                    <Button size="small" onClick={() => move(key, 1)}>下移</Button>
                  </Space>
                </div>
              );
            })}
            <Button size="small" onClick={() => persistColumnPreference(type, { visible: resolveDefaultVisibleColumns(type, keys), order: resolveDefaultColumnOrder(type, keys) })}>重置列</Button>
          </div>
        )}
      >
        <Button size="small">列设置</Button>
      </Popover>
    );
  };

  const createColumns = (type: OrderFeeTableType): ColumnsType<OrderFeeRow> => {
    const renderReceiptNo = (row: OrderFeeRow) => {
      if (type !== 'RECEIVABLE') return 'paymentNo' in row ? row.paymentNo || '-' : '-';
      const receivable = row as ReceivableFeeSummary;
      const canMatch = getStatus(receivable) === 'CONFIRMED' && receivable.receiptStatus !== 'RECEIVED';
      const label = receivable.matchedReceiptNo || receivable.paymentNo || '匹配水单';
      return (
        <Button type="link" size="small" disabled={!canMatch} onClick={() => openReceiptMatch(receivable)}>
          {label}
        </Button>
      );
    };
    const base: ColumnsType<OrderFeeRow> = [
      { title: '序号', key: 'index', width: 70, fixed: 'left', render: (_value, _row, index) => index + 1 },
      { title: '费用名称', dataIndex: 'name', key: 'name', width: 150, fixed: 'left', sorter: (a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN') },
      { title: '客户编号', key: 'customerCode', width: 120, render: () => parseCustomerCode(shipment.customerName) },
      { title: '运单号', key: 'systemOrderNo', width: 200, render: () => renderShipmentOrderNoLink(shipment.systemOrderNo, { shipment }) },
      { title: '转单号', key: 'transferNo', width: 170, render: () => shipment.transferNo || '-' },
      { title: '对账状态', key: 'status', width: 110, render: (_, row) => renderStatus(row), sorter: (a, b) => getStatus(a).localeCompare(getStatus(b)) },
      { title: '币种', key: 'currency', width: 90, render: (_, row) => <Tag>{row.currency ?? 'RMB'}</Tag> },
      { title: '金额', key: 'amount', width: 130, align: 'right', render: (_, row) => formatFinanceAmount(row.amount, row.currency), sorter: (a, b) => a.amount - b.amount },
      { title: '合计', key: 'rmbAmount', width: 130, align: 'right', render: (_, row) => formatCurrency(row.rmbAmount ?? row.amount) },
      { title: '结算方式', key: 'settlementMethod', width: 140, render: (_, row) => row.settlementMethod || '-' },
      { title: type === 'RECEIVABLE' ? '匹配水单编号' : '付款编号', key: 'paymentNo', width: 170, render: (_, row) => renderReceiptNo(row) },
      { title: '已收金额', key: 'receivedAmount', width: 120, align: 'right', render: (_, row) => 'receivedAmount' in row ? formatFinanceAmount(Number(row.receivedAmount ?? 0), row.currency) : '-' },
      { title: '收款状态', key: 'receiptStatus', width: 110, render: (_, row) => 'receiptStatus' in row ? <Tag color={row.receiptStatus === 'RECEIVED' ? 'green' : row.receiptStatus === 'PARTIAL' ? 'gold' : 'default'}>{row.receiptStatus === 'RECEIVED' ? '已收款' : row.receiptStatus === 'PARTIAL' ? '部分收款' : '未收款'}</Tag> : '-' },
      { title: '计费重', key: 'chargeWeightKg', width: 110, render: (_, row) => 'chargeWeightKg' in row && row.chargeWeightKg !== undefined ? `${row.chargeWeightKg} kg` : '-' },
      { title: '单价', key: 'unitPrice', width: 110, render: (_, row) => 'unitPrice' in row && row.unitPrice !== undefined ? `${formatFinanceAmount(row.unitPrice, row.currency)}/kg` : '-' },
      { title: '人工覆盖', key: 'amountOverridden', width: 110, render: (_, row) => row.amountOverridden ? <Tag color="orange">人工覆盖</Tag> : '-' },
      { title: '代理', key: 'agentName', width: 140, render: (_, row) => 'agentName' in row ? row.agentName || shipment.agentName || '-' : '-' },
      { title: '业务利润', key: 'businessProfit', width: 130, align: 'right', render: (_, row) => 'businessProfit' in row && row.businessProfit !== undefined ? formatCurrency(row.businessProfit) : '-' },
      { title: '制单日期', key: 'createdAt', width: 160, render: (_, row) => formatOptionalDate(row.createdAt) },
      { title: '制单人', key: 'createdBy', width: 110, render: (_, row) => row.createdBy || '-' },
      { title: '审单日期', key: 'reviewedAt', width: 160, render: (_, row) => formatOptionalDate(row.reviewedAt) },
      { title: '审单人', key: 'reviewedBy', width: 110, render: (_, row) => row.reviewedBy || '-' },
      { title: '备注', key: 'remark', width: 180, ellipsis: true, render: (_, row) => <Text title={row.remark}>{row.remark || '-'}</Text> },
      {
        title: '操作',
        key: 'actions',
        width: 240,
        fixed: 'right',
        render: (_, row) => row.sourceType === 'MANUAL' && canManageType(role, type, permissions) ? (
          <Space size={6}>
            <Button size="small" onClick={() => openEditor(type, row)} disabled={!isManualEditable(row)}>修改</Button>
            <Button size="small" onClick={() => confirmRunRows(type, row.locked ? 'unlock' : 'lock', [row])}>{row.locked ? '解锁' : '锁定'}</Button>
            {type === 'RECEIVABLE' ? <Button size="small" disabled={getStatus(row) !== 'CONFIRMED' || (row as ReceivableFeeSummary).receiptStatus === 'RECEIVED'} onClick={() => openReceiptMatch(row as ReceivableFeeSummary)}>匹配水单</Button> : null}
            <Button size="small" danger disabled={!isManualEditable(row)} onClick={() => confirmRunRows(type, 'delete', [row])}>删除</Button>
          </Space>
        ) : <Text type="secondary">系统生成</Text>
      }
    ];
    if (type === 'RECEIVABLE') return base.filter((column) => !['chargeWeightKg', 'unitPrice', 'amountOverridden', 'agentName', 'businessProfit'].includes(String(column.key)));
    if (type === 'BUSINESS_COST') return base.filter((column) => !['paymentNo', 'receivedAmount', 'receiptStatus'].includes(String(column.key)) && !(String(column.key) === 'agentName' && !canViewBusinessCostAgent));
    return base.filter((column) => !['paymentNo', 'receivedAmount', 'receiptStatus', 'businessProfit'].includes(String(column.key)));
  };

  const renderTable = (type: OrderFeeTableType, rows: OrderFeeRow[]) => {
    const canManage = canManageType(role, type, permissions);
    const allColumns = createColumns(type);
    const keys = allColumns.map((column) => String(column.key));
    const preference = columnPreferences[type];
    const visible = preference.visible.length ? preference.visible : resolveDefaultVisibleColumns(type, keys);
    const order = preference.order.length ? preference.order.filter((key) => keys.includes(key)) : resolveDefaultColumnOrder(type, keys);
    const orderedColumns = order
      .map((key) => allColumns.find((column) => String(column.key) === key))
      .filter((column): column is ColumnsType<OrderFeeRow>[number] => Boolean(column));
    const visibleColumns = orderedColumns.filter((column) => visible.includes(String(column.key)));
    const selected = selectedRowKeys[type];
    const selectedRows = rows.filter((row) => selected.includes(row.id));
    const total = rows.reduce((sum, row) => sum + (row.rmbAmount ?? row.amount), 0);
    const chargeWeightTotal = rows.reduce((sum, row) => sum + ('chargeWeightKg' in row && row.chargeWeightKg ? row.chargeWeightKg : 0), 0);

    return (
      <div className="shipment-finance-table-card order-fee-table-card" key={type}>
        <div className="shipment-finance-table-heading">
          <div>
            <div className="shipment-finance-table-title">{feeTypeTitles[type]}</div>
            <Text type="secondary">{feeTypeDescriptions[type]}</Text>
          </div>
          <Space wrap>
            {renderColumnSettings(type, allColumns)}
            {canManage ? <Button size="small" type="primary" onClick={() => openEditor(type)}>添加</Button> : null}
          </Space>
        </div>
        <Table
          className="finance-work-table finance-embedded-table"
          rowKey="id"
          columns={visibleColumns}
          dataSource={rows}
          size="small"
          scroll={{ x: Math.max(1500, visibleColumns.reduce((sum, column) => sum + Number(column.width ?? 120), 0)) }}
          loading={loading}
          pagination={{ ...tenRowTablePagination, hideOnSinglePage: true }}
          rowSelection={{
            selectedRowKeys: selected,
            onChange: (next) => setSelectedRowKeys((current) => ({ ...current, [type]: next.map(String) })),
            getCheckboxProps: (row) => ({ disabled: !canManage || row.sourceType !== 'MANUAL' })
          }}
          expandable={{
            expandedRowRender: (row) => (
              <div className="order-fee-expanded-row">
                <span>制单：{row.createdBy || '-'} / {formatOptionalDate(row.createdAt)}</span>
                <span>审单：{row.reviewedBy || '-'} / {formatOptionalDate(row.reviewedAt)}</span>
                <span>备注：{row.remark || '-'}</span>
              </div>
            )
          }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>合计</Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={Math.max(1, visibleColumns.length - 3)}>
                  {formatCurrency(total)}，计费重 {chargeWeightTotal.toFixed(3)} kg，共 {rows.length} 行
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
          locale={{ emptyText: `暂无${feeTypeTitles[type]}` }}
        />
        {canManage ? (
          <div className="order-fee-toolbar">
            <Space wrap>
              <Text type="secondary">已选 {selected.length} 条</Text>
              <Button size="small" disabled={!selected.length} onClick={() => confirmRunRows(type, 'delete', selectedRows)}>删除</Button>
              <Button size="small" disabled={!selected.length} onClick={() => confirmRunRows(type, 'recalc', selectedRows)}>重算</Button>
              <Button size="small" disabled={!selected.length} onClick={() => confirmRunRows(type, 'lock', selectedRows)}>锁定</Button>
              <Button size="small" disabled={!selected.length} onClick={() => confirmRunRows(type, 'unlock', selectedRows)}>解锁</Button>
              <Dropdown
                menu={{ items: quickFeeNames.map((name) => ({ key: name, label: name })), onClick: ({ key }) => quickAdd(type, String(key)) }}
                trigger={['click']}
              >
                <Button size="small">快速添加</Button>
              </Dropdown>
            </Space>
          </div>
        ) : null}
      </div>
    );
  };

  const metric = (label: string, value: ReactNode, tone: 'neutral' | 'success' | 'warning' = 'neutral') => (
    <div className={`shipment-finance-metric shipment-finance-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );

  const profitSections = detail?.profitSections ?? [];

  return (
    <section className="shipment-detail-section shipment-detail-finance-section">
      <div className="shipment-detail-section-title">费用与利润</div>
      {loading && !detail ? <Text type="secondary">正在加载财务明细...</Text> : null}
      <div className="shipment-finance-metrics">
        {metric('应收费用', receivableRows.length ? formatCurrency(detail?.receivableTotal ?? 0) : '待生成', receivableRows.length ? 'success' : 'warning')}
        {metric('业务成本', detail?.businessCostTotal === undefined ? '待生成' : formatCurrency(detail.businessCostTotal))}
        {visiblePayables ? metric('应付费用', payableRows.length ? formatCurrency(detail?.payableTotal ?? 0) : '待生成', payableRows.length ? 'warning' : 'neutral') : null}
        {visiblePayables ? metric('利润汇总', detail?.grossProfit === undefined ? '待生成' : formatCurrency(detail.grossProfit), detail?.grossProfit === undefined ? 'neutral' : detail.grossProfit >= 0 ? 'success' : 'warning') : null}
      </div>
      {profitSections.length ? (
        <Collapse
          className="order-fee-profit-collapse"
          size="small"
          defaultActiveKey={['profit']}
          items={[{
            key: 'profit',
            label: '利润明细',
            children: (
              <div className="order-fee-profit-grid">
                {profitSections.map((item) => (
                  <div key={item.key}>{metric(item.title, formatCurrency(item.amount), item.amount >= 0 ? 'success' : 'warning')}</div>
                ))}
              </div>
            )
          }]}
        />
      ) : null}
      <div className="shipment-finance-table-stack">
        {renderTable('RECEIVABLE', receivableRows)}
        {renderTable('BUSINESS_COST', businessCostRows)}
        {visiblePayables ? renderTable('PAYABLE', payableRows) : null}
      </div>
      <Modal
        title={`${editor?.row ? '修改' : '新增'}${editor ? feeTypeTitles[editor.type] : '费用'}`}
        open={Boolean(editor)}
        onCancel={() => setEditor(null)}
        onOk={submitEditor}
        confirmLoading={submitting}
        width={760}
        forceRender
        destroyOnHidden
      >
        <Form form={editorForm} layout="vertical">
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请选择或输入费用名称' }]}>
            <Select showSearch options={feeNameOptions} placeholder="选择费用名称" />
          </Form.Item>
          <Space size={12} className="order-fee-editor-row">
            <Form.Item name="currency" label="币种" rules={[{ required: true, message: '请选择币种' }]}>
              <Select options={financeCatalogCurrencyOptions.map((item) => ({ label: item, value: item }))} />
            </Form.Item>
            <Form.Item name="settlementMethod" label="结算方式">
              <Select allowClear options={settlementOptions} placeholder="选择结算方式" />
            </Form.Item>
            <Form.Item name="reconciliationStatus" label="对账状态">
              <Select options={Object.entries(financeStatusLabel).filter(([value]) => value !== 'VOIDED').map(([value, label]) => ({ label, value }))} />
            </Form.Item>
          </Space>
          {editor?.type === 'PAYABLE' ? (
            <Form.Item name="agentName" label="代理">
              <Input placeholder="代理名称" />
            </Form.Item>
          ) : null}
          {editor?.type === 'RECEIVABLE' ? (
            <Form.Item name="paymentNo" label="付款编号">
              <Input placeholder="匹配水单后自动回写，也可手动记录付款编号" />
            </Form.Item>
          ) : null}
          {editor?.type === 'BUSINESS_COST' || editor?.type === 'PAYABLE' ? (
            <Space size={12} className="order-fee-editor-row">
              <Form.Item name="chargeWeightKg" label="计费重">
                <InputNumber min={0} precision={3} addonAfter="kg" />
              </Form.Item>
              <Form.Item name="unitPrice" label={editor.type === 'PAYABLE' ? '代理成本单价' : '单价'}>
                <InputNumber min={0} precision={2} />
              </Form.Item>
            </Space>
          ) : null}
          <Form.Item name="amount" label="总金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber min={0} precision={2} className="order-fee-editor-amount" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="匹配已到账水单"
        open={Boolean(receiptMatch)}
        onCancel={() => setReceiptMatch(null)}
        footer={null}
        width={880}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">仅显示同客户、已到账、未归档/未作废且仍有余额的水单。</Text>
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
              { title: '操作', key: 'actions', width: 90, fixed: 'right', render: (_, row) => <Button size="small" type="primary" onClick={() => submitReceiptMatch(row)}>匹配</Button> }
            ]}
            locale={{ emptyText: '暂无可匹配水单' }}
          />
        </Space>
      </Modal>
    </section>
  );
}
