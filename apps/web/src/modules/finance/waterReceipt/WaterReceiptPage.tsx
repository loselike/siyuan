import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Col, Form, Input, InputNumber, message, Modal, Popconfirm, Row, Segmented, Select, Space, Tag, Typography } from 'antd';
import type {
  CustomerSummary,
  ReceivableAuditSummary,
  ReceivableMatchRequestSummary,
  SiteSummary,
  WaterReceiptCreateInput,
  WaterReceiptAllocationSummary,
  WaterReceiptListQuery,
  WaterReceiptListResponse,
  WaterReceiptUpdateInput,
  WaterReceiptVoucherSummary,
  WaterReceiptSummary
} from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { downloadCsv } from '../exportCsv';
import { ProtectedVoucherImage } from '../ProtectedVoucherImage';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { formatBeijingDate, formatBusinessDate, formatCurrency } from '../../shared/format';
import { AppDatePicker, ConfirmActionButton, ManagedDualViewTable, ManagedMatrixCell, ManagedTable, type ManagedTableColumns } from '../../shared/ui';

const { Text } = Typography;

type WaterReceiptPageProps = {
  mode?: 'arrival' | 'matching';
  apiClient: ApiClient;
  permissions: PermissionKey[];
  customers: CustomerSummary[];
  settlementOptions: Array<{ label: string; value: string }>;
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
  readOnlyMatching?: boolean;
  notificationTargetId?: string;
  onNotificationTargetHandled?: () => void;
};

type VoucherFormValues = { voucherImage?: VoucherImageValue };
type WaterReceiptFormValues = WaterReceiptCreateInput & { adjustReason?: string };
type MatchFilterKey = 'ALL' | 'MATCHABLE' | 'MATCHED' | 'PENDING';
type ReviewFilterKey = 'ALL' | 'PENDING' | 'APPROVED';
type WaterMatchReviewGroup = {
  id: string;
  request: ReceivableMatchRequestSummary;
  systemOrderNo: string;
  items: Array<{ row: ReceivableAuditSummary; request: ReceivableMatchRequestSummary }>;
  totalAmount: number;
};

const defaultQuery: WaterReceiptListQuery = { page: 1, pageSize: 10, status: 'ALL', sortBy: 'receiptDate', sortOrder: 'desc' };
const arrivalDefaultQuery: WaterReceiptListQuery = { ...defaultQuery, status: 'PENDING' };
const matchingDefaultQuery: WaterReceiptListQuery = { ...defaultQuery, matchStatus: 'UNMATCHED', includeArchived: true };

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

function arrivalStatusTag(status: WaterReceiptSummary['status']) {
  return <Tag color={status === 'PENDING' ? 'default' : 'processing'}>{status === 'PENDING' ? '未到账' : '已到账'}</Tag>;
}

function matchStatusTag(row: Pick<WaterReceiptSummary, 'status' | 'matchedAmount' | 'pendingAllocatedAmount' | 'balance'>) {
  if (row.status === 'PENDING') return <Tag>未到账</Tag>;
  if (Number(row.balance) <= 0) return <Tag color="success">已全部落账</Tag>;
  const hasPosted = Number(row.matchedAmount) > 0;
  const hasPending = Number(row.pendingAllocatedAmount ?? 0) > 0;
  if (hasPosted && hasPending) return <Space size={4}><Tag color="blue">部分已落账</Tag><Tag color="warning">有待审核</Tag></Space>;
  if (hasPosted) return <Tag color="blue">部分已落账</Tag>;
  if (hasPending) return <Tag color="warning">待审核</Tag>;
  return <Tag>未分配</Tag>;
}

function statusLabel(status: WaterReceiptSummary['status']) {
  const map: Record<WaterReceiptSummary['status'], string> = {
    PENDING: '未到账',
    ARRIVED: '已到账',
    PARTIAL_MATCHED: '部分匹配',
    MATCHED: '已匹配',
    ARCHIVED: '已归档',
    VOIDED: '已作废'
  };
  return map[status] ?? status;
}

function formatPlainAmount(value?: number) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

export async function copyWaterReceiptPaymentNo(
  paymentNo?: string,
  clipboard: Pick<Clipboard, 'writeText'> | null = typeof navigator === 'undefined' ? null : navigator.clipboard
) {
  const value = paymentNo?.trim();
  if (!value) return false;
  try {
    if (clipboard?.writeText) {
      await clipboard.writeText(value);
      return true;
    }
  } catch {
    // HTTP deployments may not expose the Clipboard API; continue with the legacy browser fallback.
  }
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  return copied;
}

export function formatWaterReceiptAmount(value?: number, currency?: string) {
  return `${(currency ?? 'RMB').toUpperCase()} ${formatPlainAmount(value)}`;
}

export function formatWaterReceiptRmbAmount(row?: Pick<WaterReceiptSummary, 'currency' | 'amount' | 'rmbAmount'>) {
  if (!row) return '-';
  if (row.rmbAmount !== undefined) return formatCurrency(row.rmbAmount);
  return ['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase())
    ? formatCurrency(row.amount)
    : '缺少有效汇率';
}

export function getWaterReceiptRmbBalance(row?: Pick<WaterReceiptSummary, 'currency' | 'balance' | 'rmbBalance'> | null) {
  if (!row) return undefined;
  if (row.rmbBalance !== undefined) return Number(row.rmbBalance);
  return ['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase())
    ? Number(row.balance)
    : undefined;
}

export function getWaterReceiptRmbAvailableAllocationAmount(
  row?: Pick<WaterReceiptSummary, 'currency' | 'balance' | 'availableAllocationAmount' | 'rmbBalance' | 'rmbAvailableAllocationAmount'> | null
) {
  if (!row) return undefined;
  if (row.rmbAvailableAllocationAmount !== undefined) return Number(row.rmbAvailableAllocationAmount);
  const sourceAmount = Number(row.availableAllocationAmount ?? row.balance);
  if (['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase())) return sourceAmount;
  if (row.rmbBalance !== undefined && row.availableAllocationAmount === undefined) return Number(row.rmbBalance);
  return undefined;
}

export function getWaterReceiptAllocations(row: WaterReceiptSummary): WaterReceiptAllocationSummary[] {
  if (row.allocations) return row.allocations;
  return (row.matches ?? []).filter((match) => !match.voided).map((match) => ({
    id: `match:${match.id}`,
    matchId: match.id,
    waterReceiptId: row.id,
    receivableId: match.receivableSourceType === 'SYSTEM' ? match.receivableFeeId : match.receivableFinanceItemId,
    receivableSourceType: match.receivableSourceType === 'SYSTEM' ? 'SYSTEM' : 'MANUAL',
    shipmentId: match.shipmentId,
    systemOrderNo: match.systemOrderNo,
    feeName: match.feeName,
    amount: match.amount,
    currency: row.currency,
    status: 'APPROVED',
    reviewedAt: match.createdAt
  }));
}

export function getReceivableOutstandingRmb(
  row: Pick<ReceivableAuditSummary, 'amount' | 'receivedAmount' | 'rmbAmount'>,
  exchangeRate: number
) {
  const totalRmb = row.rmbAmount !== undefined ? Number(row.rmbAmount) : Number(row.amount) * exchangeRate;
  return Math.round(Math.max(0, totalRmb - Number(row.receivedAmount ?? 0) * exchangeRate) * 100) / 100;
}

export function getReceivableAvailableToAllocateRmb(
  row: Pick<ReceivableAuditSummary, 'amount' | 'receivedAmount' | 'rmbAmount' | 'pendingMatchRequests' | 'pendingMatchRequest'>,
  exchangeRate: number
) {
  const pendingRequests = row.pendingMatchRequests?.length
    ? row.pendingMatchRequests
    : row.pendingMatchRequest
      ? [row.pendingMatchRequest]
      : [];
  const totalRmb = row.rmbAmount !== undefined ? Number(row.rmbAmount) : Number(row.amount) * exchangeRate;
  const receivedRmb = Number(row.receivedAmount ?? 0) * exchangeRate;
  const pendingRmb = pendingRequests.reduce((sum, request) => sum + Number(request.rmbAmount ?? (request.receivableAmount !== undefined ? request.receivableAmount * exchangeRate : request.amount * exchangeRate)), 0);
  return Math.round(Math.max(0, totalRmb - receivedRmb - pendingRmb) * 100) / 100;
}

export function getCurrentReceiptMatchedAmount(
  receipt: Pick<WaterReceiptSummary, 'matches'>,
  receivable: Pick<ReceivableAuditSummary, 'id' | 'sourceType'>
) {
  return Math.round((receipt.matches ?? [])
    .filter((match) => {
      if (match.voided) return false;
      const sourceType = match.receivableSourceType ?? (match.receivableFeeId ? 'SYSTEM' : 'MANUAL');
      const receivableId = sourceType === 'SYSTEM' ? match.receivableFeeId : match.receivableFinanceItemId;
      return sourceType === (receivable.sourceType ?? 'MANUAL') && receivableId === receivable.id;
    })
    .reduce((sum, match) => sum + Number(match.amount), 0) * 100) / 100;
}

export function getWaterReceiptReceivableState(
  row: ReceivableAuditSummary,
  receipt: Pick<WaterReceiptSummary, 'id' | 'matches'>
) {
  const currentReceiptMatchedAmount = getCurrentReceiptMatchedAmount(receipt, row);
  const outstandingAmount = Math.max(0, Number(row.amount) - Number(row.receivedAmount ?? 0));
  const pendingRequests = row.pendingMatchRequests?.length
    ? row.pendingMatchRequests
    : row.pendingMatchRequest?.status === 'PENDING'
      ? [row.pendingMatchRequest]
      : [];
  const currentReceiptPending = pendingRequests.find((request) => request.waterReceiptId === receipt.id);
  if (currentReceiptPending) {
    return {
      selectable: false,
      label: '本水单已有待审核分配',
      color: 'processing',
      currentReceiptMatchedAmount
    };
  }
  const pendingAmount = pendingRequests.reduce((sum, request) => sum + Number(request.receivableAmount ?? request.amount), 0);
  if (outstandingAmount > 0 && pendingAmount >= outstandingAmount) {
    return {
      selectable: false,
      label: '待审核分配已占满未收金额',
      color: 'processing',
      currentReceiptMatchedAmount
    };
  }
  if (outstandingAmount <= 0 || row.receiptStatus === 'RECEIVED') {
    return {
      selectable: false,
      label: currentReceiptMatchedAmount > 0 ? '本水单已匹配' : '已收款',
      color: 'success',
      currentReceiptMatchedAmount
    };
  }
  return {
    selectable: true,
    label: currentReceiptMatchedAmount > 0 ? '可继续匹配' : '可匹配',
    color: 'blue',
    currentReceiptMatchedAmount
  };
}

function WaterReceiptArriveAction({
  row,
  loading,
  size,
  onConfirm
}: {
  row: WaterReceiptSummary;
  loading: boolean;
  size?: 'small' | 'middle' | 'large';
  onConfirm: () => Promise<void>;
}) {
  return (
    <ConfirmActionButton
      size={size}
      type="primary"
      loading={loading}
      disabled={loading}
      actionName="到账"
      objectName={row.receiptNo}
      currentStatus={statusLabel(row.status)}
      nextStatus="已到账"
      count={1}
      amount={formatPlainAmount(row.amount)}
      currency={row.currency ?? 'RMB'}
      riskTip="到账后该水单会进入可匹配范围，并影响客户收款余额。"
      risk="warning"
      onConfirm={onConfirm}
    >
      到账
    </ConfirmActionButton>
  );
}

export function createWaterReceiptCustomerOptions(customers: CustomerSummary[]) {
  return customers
    .filter((customer) => customer.enabled)
    .sort((left, right) => left.code.localeCompare(right.code, 'zh-CN'))
    .map((customer) => ({ label: customer.code, value: customer.code }));
}

export function resolveWaterReceiptCustomerSite(customers: CustomerSummary[], customerCode?: string) {
  return customers.find((customer) => customer.code === customerCode)?.salespersonSite?.trim() || undefined;
}

export function createWaterReceiptSiteOptions(sites: SiteSummary[], currentSite?: string) {
  const options = sites
    .filter((site) => site.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-CN'))
    .map((site) => ({ label: site.name, value: site.name }));
  const historicalSite = currentSite?.trim();
  if (!historicalSite || options.some((option) => option.value === historicalSite)) return options;
  return [...options, { label: `${historicalSite} · 历史站点`, value: historicalSite }];
}

export function hasWaterReceiptAmountChanged(row: WaterReceiptSummary, amount?: number) {
  return amount !== undefined && Math.abs(Number(amount) - Number(row.amount)) > 0.005;
}

export function createWaterReceiptUpdatePayload(
  row: WaterReceiptSummary,
  values: WaterReceiptFormValues
): WaterReceiptUpdateInput {
  if (row.status === 'PENDING') {
    return {
      customerCode: values.customerCode,
      site: values.site,
      receiptMethod: values.receiptMethod,
      receiptDate: values.receiptDate,
      currency: values.currency,
      amount: values.amount,
      paymentNo: values.paymentNo,
      remark: values.remark
    };
  }

  return {
    customerCode: values.customerCode,
    site: values.site,
    receiptMethod: values.receiptMethod,
    receiptDate: values.receiptDate,
    currency: values.currency,
    amount: values.amount,
    paymentNo: values.paymentNo,
    remark: values.remark,
    adjustReason: values.adjustReason?.trim()
  };
}

export function WaterReceiptPage({ mode = 'matching', apiClient, permissions, customers, settlementOptions, renderShipmentOrderNoLink, notificationTargetId, onNotificationTargetHandled, readOnlyMatching = false }: WaterReceiptPageProps) {
  const [queryForm] = Form.useForm<WaterReceiptListQuery>();
  const [form] = Form.useForm<WaterReceiptFormValues>();
  const [voucherForm] = Form.useForm<VoucherFormValues>();
  const pageDefaultQuery = mode === 'arrival' ? arrivalDefaultQuery : matchingDefaultQuery;
  const isMatchingMode = mode === 'matching';
  const pageTitle = mode === 'arrival' ? '水单到账查询' : '水单分配';
  const [query, setQuery] = useState<WaterReceiptListQuery>(pageDefaultQuery);
  const [response, setResponse] = useState<WaterReceiptListResponse>({
    rows: [],
    totals: { count: 0, pendingCount: 0, arrivedCount: 0, matchedCount: 0, archivedCount: 0, amount: 0, matchedAmount: 0, balance: 0 },
    pagination: { page: 1, pageSize: 10, totalItems: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [notificationDetailTarget, setNotificationDetailTarget] = useState<WaterReceiptSummary | null>(null);
  const [editing, setEditing] = useState<WaterReceiptSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [voucherRow, setVoucherRow] = useState<WaterReceiptSummary | null>(null);
  const [matchRow, setMatchRow] = useState<WaterReceiptSummary | null>(null);
  const [matchPanelMode, setMatchPanelMode] = useState<'allocate' | 'manage'>('allocate');
  const [matchableRows, setMatchableRows] = useState<ReceivableAuditSummary[]>([]);
  const [selectedMatchReceivableIds, setSelectedMatchReceivableIds] = useState<string[]>([]);
  const [matchAmounts, setMatchAmounts] = useState<Record<string, number>>({});
  const [matchSubmitting, setMatchSubmitting] = useState(false);
  const [matchKeyword, setMatchKeyword] = useState('');
  const [matchFilter, setMatchFilter] = useState<MatchFilterKey>('ALL');
  const [showMatchableOnly, setShowMatchableOnly] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterKey>('ALL');
  const [selectedReviewBatchIds, setSelectedReviewBatchIds] = useState<string[]>([]);
  const [editingReviewBatchId, setEditingReviewBatchId] = useState<string>();
  const [reviewEditAmounts, setReviewEditAmounts] = useState<Record<string, number>>({});
  const [previewVoucher, setPreviewVoucher] = useState<WaterReceiptVoucherSummary>();
  const [createVoucherFile, setCreateVoucherFile] = useState<File>();
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(() => new Set());
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [siteOptionsLoading, setSiteOptionsLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();

  const canManage = hasPermission(permissions, 'finance:water-receipt:update');
  const canCreate = hasPermission(permissions, 'finance:water-receipt:create');
  const canArrive = hasPermission(permissions, 'finance:water-receipt:arrive');
  const canMatch = !readOnlyMatching && hasPermission(permissions, 'finance:water-match:create');
  const canDeleteMatch = !readOnlyMatching && hasPermission(permissions, 'finance:water-match:cancel');
  const canAdjustMatch = !readOnlyMatching && hasPermission(permissions, 'finance:water-match:adjust');
  const canViewMatchRecords = hasPermission(permissions, 'finance:water-match:read');
  const isMatchReviewMode = matchPanelMode === 'manage';
  const canVoid = hasPermission(permissions, 'finance:water-receipt:void');
  const canArchive = hasPermission(permissions, 'finance:water-receipt:archive');
  const canExport = hasPermission(permissions, isMatchingMode ? 'finance:water-match:export' : 'finance:water-receipt:export');
  const canVoucher = hasPermission(permissions, 'finance:water-receipt:voucher-upload');
  const canViewVoucher = hasPermission(permissions, 'finance:water-receipt:voucher-view');
  const canDeleteVoucher = hasPermission(permissions, 'finance:water-receipt:voucher-delete');
  const canViewAll = hasPermission(permissions, 'finance:water-receipt:view-all');
  const editingAfterArrival = Boolean(editing && editing.status !== 'PENDING');
  const editingHasActiveMatches = Boolean(editing?.matches?.some((match) => !match.voided));
  const editingHasPendingAllocation = Number(editing?.pendingAllocatedAmount ?? 0) > 0;
  const editingBlocked = editingAfterArrival && (editingHasActiveMatches || editingHasPendingAllocation);
  const summaryRmbAmount = response.totals.rmbAmount
    ?? (response.rows.every((row) => ['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase())) ? response.totals.amount : undefined);
  const summaryRmbBalance = response.totals.rmbBalance
    ?? (response.rows.every((row) => ['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase())) ? response.totals.balance : undefined);
  const summaryRmbPendingAllocatedAmount = response.totals.rmbPendingAllocatedAmount
    ?? (response.rows.every((row) => ['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase())) ? response.totals.pendingAllocatedAmount : undefined);
  const summaryRmbAvailableAllocationAmount = response.totals.rmbAvailableAllocationAmount
    ?? (response.rows.every((row) => ['RMB', 'CNY'].includes((row.currency ?? 'RMB').toUpperCase())) ? response.totals.availableAllocationAmount : undefined);
  const matchRowsWithState = useMemo(() => matchableRows.map((row) => ({
    row,
    state: matchRow
      ? getWaterReceiptReceivableState(row, matchRow)
      : { selectable: false, label: '不可匹配', color: 'default', currentReceiptMatchedAmount: 0 }
  })), [matchRow, matchableRows]);
  const matchFilterCounts = useMemo(() => ({
    all: matchRowsWithState.length,
    matchable: matchRowsWithState.filter((item) => item.state.selectable).length,
    matched: matchRowsWithState.filter((item) => (
      item.state.currentReceiptMatchedAmount > 0
      || item.row.receiptStatus === 'RECEIVED'
    )).length,
    pending: matchRowsWithState.filter((item) => Boolean(item.row.pendingMatchRequests?.length ?? item.row.pendingMatchRequest)).length
  }), [matchRowsWithState]);
  const filteredMatchableRows = useMemo(() => {
    const keyword = matchKeyword.trim().toLocaleLowerCase('zh-CN');
    return matchRowsWithState
      .filter((item) => {
        if (showMatchableOnly && !item.state.selectable) return false;
        if (matchFilter === 'MATCHABLE' && !item.state.selectable) return false;
        if (matchFilter === 'MATCHED' && item.state.currentReceiptMatchedAmount <= 0 && item.row.receiptStatus !== 'RECEIVED') return false;
        if (matchFilter === 'PENDING' && !(item.row.pendingMatchRequests?.length ?? item.row.pendingMatchRequest)) return false;
        if (!keyword) return true;
        return [item.row.systemOrderNo, item.row.name]
          .some((value) => String(value ?? '').toLocaleLowerCase('zh-CN').includes(keyword));
      })
      .map((item) => item.row);
  }, [matchFilter, matchKeyword, matchRowsWithState, showMatchableOnly]);
  const reviewGroups = useMemo<WaterMatchReviewGroup[]>(() => {
    const rows: WaterMatchReviewGroup[] = [];
    matchableRows.forEach((row) => {
      const requests = (row.matchRequests?.length
        ? row.matchRequests
        : row.currentMatchRequest
          ? [row.currentMatchRequest]
        : [])
        .filter((request) => request.waterReceiptId === matchRow?.id && !['CANCELLED', 'REJECTED'].includes(request.status));
      requests.forEach((request) => {
        rows.push({
          id: request.id,
          request,
          systemOrderNo: row.systemOrderNo,
          items: [{ row, request }],
          totalAmount: request.rmbAmount ?? request.amount
        });
      });
    });
    return rows.sort((left, right) => right.request.requestedAt.localeCompare(left.request.requestedAt));
  }, [matchRow?.id, matchableRows]);
  const filteredReviewGroups = useMemo(() => reviewGroups.filter((group) =>
    (reviewFilter === 'ALL' || group.request.status === reviewFilter)
    && (!matchKeyword.trim() || [group.systemOrderNo, ...group.items.map((item) => item.row.name)]
      .some((value) => String(value ?? '').toLocaleLowerCase('zh-CN').includes(matchKeyword.trim().toLocaleLowerCase('zh-CN'))))
  ), [matchKeyword, reviewFilter, reviewGroups]);
  const reviewFilterCounts = useMemo(() => ({
    all: reviewGroups.length,
    pending: reviewGroups.filter((group) => group.request.status === 'PENDING').length,
    approved: reviewGroups.filter((group) => group.request.status === 'APPROVED').length
  }), [reviewGroups]);
  const selectedMatchAmount = useMemo(() => Math.round(selectedMatchReceivableIds
    .reduce((sum, id) => sum + Number(matchAmounts[id] ?? 0), 0) * 100) / 100, [matchAmounts, selectedMatchReceivableIds]);
  const matchAvailableBalance = getWaterReceiptRmbAvailableAllocationAmount(matchRow);
  const matchBalanceAfter = matchAvailableBalance === undefined
    ? undefined
    : Math.round((matchAvailableBalance - selectedMatchAmount) * 100) / 100;
  const canSubmitMatch = Boolean(
    matchRow
    && selectedMatchReceivableIds.length > 0
    && matchBalanceAfter !== undefined
    && matchBalanceAfter >= 0
    && selectedMatchReceivableIds.every((id) => {
      const row = matchableRows.find((item) => item.id === id);
      const amount = Number(matchAmounts[id]);
      return Boolean(
        row
        && getWaterReceiptReceivableState(row, matchRow).selectable
        && Number.isFinite(amount)
        && amount > 0
        && amount <= getReceivableAvailableToAllocateRmb(row, Number(matchRow.exchangeRate ?? 1))
      );
    })
  );

  const customerOptions = useMemo(() => createWaterReceiptCustomerOptions(customers), [customers]);
  const siteOptions = useMemo(() => createWaterReceiptSiteOptions(sites, editing?.site), [editing?.site, sites]);
  const statusOptions = mode === 'arrival'
    ? [{ label: '未到账', value: 'PENDING' }, { label: '已到账', value: 'ARRIVED' }]
    : [{ label: '全部', value: 'ALL' }, { label: '未到账', value: 'PENDING' }, { label: '已到账', value: 'ARRIVED' }];
  const editorSettlementOptions = useMemo(() => {
    if (!editing?.receiptMethod || settlementOptions.some((item) => item.value === editing.receiptMethod)) return settlementOptions;
    return [...settlementOptions, { value: editing.receiptMethod, label: `${editing.receiptMethod} · 已停用（请改选启用结算方式）` }];
  }, [editing?.receiptMethod, settlementOptions]);

  const load = useCallback(async (nextQuery = query) => {
    setLoading(true);
    try {
      setResponse(await apiClient.waterReceipts(nextQuery));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载水单失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, query]);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  useEffect(() => {
    if (!notificationTargetId) return;
    let alive = true;
    void apiClient.waterReceipts({ page: 1, pageSize: -1, status: 'ALL', includeArchived: true })
      .then(({ rows }) => {
        if (!alive) return;
        const target = rows.find((row) => row.id === notificationTargetId);
        if (target) {
          setNotificationDetailTarget(target);
        } else {
          message.warning('通知关联的水单已不存在或当前账号无查看权限');
        }
      })
      .catch((error) => {
        if (alive) message.error(error instanceof Error ? error.message : '加载通知关联水单失败');
      })
      .finally(() => {
        if (alive) onNotificationTargetHandled?.();
      });
    return () => {
      alive = false;
    };
  }, [apiClient, notificationTargetId, onNotificationTargetHandled]);

  useEffect(() => {
    if (!formOpen && mode !== 'arrival') return undefined;
    let active = true;
    setSiteOptionsLoading(true);
    void apiClient.waterReceiptSiteOptions()
      .then((rows) => {
        if (active) setSites(rows);
      })
      .catch((error) => {
        if (active) message.error(error instanceof Error ? error.message : '加载站点失败');
      })
      .finally(() => {
        if (active) setSiteOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiClient, formOpen, mode]);

  const openCreate = () => {
    setEditing(null);
    setFormError(undefined);
    form.resetFields();
    setCreateVoucherFile(undefined);
    form.setFieldsValue({ site: undefined, receiptMethod: settlementOptions[0]?.value, receiptDate: formatBeijingDate(new Date()), currency: 'RMB', amount: 0, paymentNo: undefined });
    setFormOpen(true);
  };

  const openEdit = (row: WaterReceiptSummary) => {
    setEditing(row);
    setFormError(undefined);
    setCreateVoucherFile(undefined);
    form.resetFields();
    form.setFieldsValue({
      customerCode: row.customerCode,
      site: row.site,
      receiptMethod: row.receiptMethod,
      receiptDate: row.receiptDate?.slice(0, 10),
      currency: row.currency ?? 'RMB',
      amount: row.amount,
      paymentNo: row.paymentNo,
      remark: row.remark
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    setFormError(undefined);
    setFormSubmitting(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await apiClient.updateWaterReceipt(editing.id, createWaterReceiptUpdatePayload(editing, values));
        message.success('水单已更新');
      } else {
        const created = await apiClient.createWaterReceipt(values);
        if (createVoucherFile) {
          await apiClient.uploadVoucherImage({ file: createVoucherFile, context: 'WATER_RECEIPT', waterReceiptId: created.id });
        }
        message.success('水单已新增');
      }
      setFormOpen(false);
      form.resetFields();
      setCreateVoucherFile(undefined);
      await load();
    } catch (error) {
      const isValidationError = Boolean(error && typeof error === 'object' && 'errorFields' in error);
      const errorMessage = isValidationError
        ? '请检查表单中标红的必填项或金额修改原因'
        : error instanceof Error ? error.message : '保存水单失败，请稍后重试';
      setFormError(errorMessage);
      if (!isValidationError) message.error(errorMessage);
    } finally {
      setFormSubmitting(false);
    }
  };

  const markArrived = async (row: WaterReceiptSummary) => {
    setArrivingIds((current) => new Set(current).add(row.id));
    try {
      const arrived = await apiClient.markWaterReceiptArrived(row.id, {});
      setResponse((current) => ({
        ...current,
        rows: current.rows.map((item) => (item.id === arrived.id ? arrived : item))
      }));
      message.success('已标记到账');
      await load();
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标记到账失败');
      return false;
    } finally {
      setArrivingIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  };

  const openMatch = async (row: WaterReceiptSummary, panelMode: 'allocate' | 'manage') => {
    if (panelMode === 'allocate' && !['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status)) {
      message.warning(row.status === 'PENDING' ? '水单未到账，不能分配应收' : '当前水单不能分配应收');
      return;
    }
    const rmbBalance = getWaterReceiptRmbAvailableAllocationAmount(row);
    const exchangeRate = Number(row.exchangeRate ?? 1);
    if (panelMode === 'allocate' && (rmbBalance === undefined || !Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
      message.error('缺少有效汇率，暂不能匹配');
      return;
    }
    setMatchPanelMode(panelMode);
    setMatchRow(row);
    setMatchableRows([]);
    setSelectedMatchReceivableIds([]);
    setMatchAmounts({});
    setMatchKeyword('');
    setMatchFilter('ALL');
    setShowMatchableOnly(false);
    setReviewFilter('ALL');
    setSelectedReviewBatchIds([]);
    setEditingReviewBatchId(undefined);
    setReviewEditAmounts({});
    try {
      const rows = await apiClient.waterReceiptMatchableReceivables(row.id);
      setMatchableRows(rows);
      setMatchAmounts(Object.fromEntries(rows.map((item) => [
        item.id,
        Math.min(rmbBalance ?? 0, getReceivableAvailableToAllocateRmb(item, exchangeRate))
      ])));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载应收费用失败');
    }
  };

  const closeMatch = () => {
    setMatchPanelMode('allocate');
    setMatchRow(null);
    setMatchableRows([]);
    setSelectedMatchReceivableIds([]);
    setMatchAmounts({});
    setMatchKeyword('');
    setMatchFilter('ALL');
    setShowMatchableOnly(false);
    setReviewFilter('ALL');
    setSelectedReviewBatchIds([]);
    setEditingReviewBatchId(undefined);
    setReviewEditAmounts({});
  };

  const submitMatch = async () => {
    if (!matchRow) return;
    const selectedRows = matchableRows.filter((row) => selectedMatchReceivableIds.includes(row.id));
    if (!selectedRows.length) {
      message.warning('请选择要匹配的应收费用');
      return;
    }
    const matches = selectedRows.map((row) => ({
      receivableId: row.id,
      receivableSourceType: row.sourceType ?? 'MANUAL',
      amount: Number(matchAmounts[row.id])
    }));
    if (matches.some((row) => !Number.isFinite(row.amount) || row.amount <= 0)) {
      message.error('请填写有效的分配金额');
      return;
    }
    if (matches.reduce((sum, row) => sum + row.amount, 0) > (getWaterReceiptRmbAvailableAllocationAmount(matchRow) ?? 0)) {
      message.error('分配金额不能超过水单可分配余额');
      return;
    }
    setMatchSubmitting(true);
    try {
      await apiClient.matchWaterReceiptOrders(matchRow.id, {
        amountCurrency: 'RMB',
        exchangeRate: matchRow.exchangeRate ?? 1,
        matches
      });
      message.success('水单分配已提交，请在应收审核完成审核');
      closeMatch();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '匹配失败');
    } finally {
      setMatchSubmitting(false);
    }
  };

  const refreshMatchReview = async () => {
    if (!matchRow) return;
    const [rows, latest] = await Promise.all([
      apiClient.waterReceiptMatchableReceivables(matchRow.id),
      apiClient.waterReceipts({ ...pageDefaultQuery, matchStatus: 'ALL', receiptNo: matchRow.receiptNo, page: 1, pageSize: 10 })
    ]);
    setMatchableRows(rows);
    const latestReceipt = latest.rows.find((row) => row.id === matchRow.id);
    if (latestReceipt) setMatchRow(latestReceipt);
    setSelectedReviewBatchIds([]);
    setEditingReviewBatchId(undefined);
    setReviewEditAmounts({});
    await load();
  };

  const runReviewAction = async (action: () => Promise<unknown>, success: string) => {
    setMatchSubmitting(true);
    try {
      await action();
      message.success(success);
      await refreshMatchReview();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '水单分配记录操作失败');
    } finally {
      setMatchSubmitting(false);
    }
  };

  const startEditReviewGroup = (group: WaterMatchReviewGroup) => {
    setEditingReviewBatchId(group.id);
    setReviewEditAmounts(Object.fromEntries(group.items.map((item) => [
      item.request.id,
      Number(item.request.rmbAmount ?? Math.round(item.request.amount * Number(item.request.receiptExchangeRate ?? 1) * 100) / 100)
    ])));
  };

  const saveReviewGroup = async (group: WaterMatchReviewGroup) => {
    if (!matchRow) return;
    await runReviewAction(
      () => apiClient.updateReceivableMatchRequest(group.request.id, {
        amountCurrency: 'RMB',
        exchangeRate: group.request.receivableExchangeRate ?? matchRow.exchangeRate ?? 1,
        items: group.items.map((item) => ({ id: item.request.id, amount: Number(reviewEditAmounts[item.request.id]) }))
      }),
      '待审核分配金额已更新'
    );
  };

  const selectedReviewGroups = reviewGroups.filter((group) => selectedReviewBatchIds.includes(group.id));
  const selectedPendingReviewIds = selectedReviewGroups
    .filter((group) => group.request.status === 'PENDING')
    .map((group) => group.request.id);

  const submitVoucher = async () => {
    if (!voucherRow) return;
    const values = await voucherForm.validateFields();
    try {
      if (!values.voucherImage) {
        message.warning('请先粘贴或选择图片');
        return;
      }
      message.success('凭证已保存');
      setVoucherRow(null);
      voucherForm.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存凭证失败');
    }
  };

  const deleteVoucher = async () => {
    if (!voucherRow) return;
    try {
      await apiClient.deleteWaterReceiptVoucher(voucherRow.id);
      voucherForm.resetFields();
      setVoucherRow((current) => current ? { ...current, voucher: undefined } : current);
      message.success('水单凭证已删除');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除凭证失败');
    }
  };

  const exportRows = async () => {
    try {
      const result = await apiClient.exportWaterReceipts({ query });
      downloadCsv('water-receipts.csv', [
        { key: 'site', label: '站点' },
        { key: 'receiptNo', label: '水单编号' },
        { key: 'salesperson', label: '业务员归属' },
        { key: 'customerCode', label: '客户编号' },
        { key: 'receiptMethod', label: '结算方式' },
        { key: 'receiptDate', label: '日期' },
        { key: 'currency', label: '币种' },
        { key: 'amount', label: '到账金额' },
        { key: 'paymentNo', label: '付款编号' },
        { key: 'matchedAmount', label: '已落账金额' },
        { key: 'pendingAllocatedAmount', label: '待审核占用' },
        { key: 'availableAllocationAmount', label: '可分配余额' },
        { key: 'balance', label: '账面余额' },
        { key: 'rmbAmount', label: '人民币折算金额' },
        { key: 'rmbMatchedAmount', label: '人民币折算已落账金额' },
        { key: 'rmbPendingAllocatedAmount', label: '人民币折算待审核占用' },
        { key: 'rmbAvailableAllocationAmount', label: '人民币折算可分配余额' },
        { key: 'rmbBalance', label: '人民币折算账面余额' },
        { key: 'exchangeRate', label: '折算汇率' },
        { key: 'remark', label: '水单备注' }
      ], result.rows.map((row) => ({ ...row, receiptDate: formatBusinessDate(row.receiptDate) })) as unknown as Array<Record<string, unknown>>);
      message.success(`已导出 ${result.rows.length} 条水单`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const columns = useMemo<ManagedTableColumns<WaterReceiptSummary>>(() => [
    { title: '站点', dataIndex: 'site', width: 120 },
    { title: '水单编号', dataIndex: 'receiptNo', width: 150 },
    { title: '业务员归属', dataIndex: 'salesperson', width: 120, render: (value?: string) => value ?? '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 120, render: (value?: string) => value ?? '-' },
    { title: '结算方式', dataIndex: 'receiptMethod', width: 130, render: (value?: string) => value ?? '-' },
    { title: '日期', dataIndex: 'receiptDate', width: 155, render: (value?: string) => formatBusinessDate(value) },
    { title: '币种', dataIndex: 'currency', width: 90, render: (value?: string) => value ?? 'RMB' },
    { title: '到账金额', dataIndex: 'amount', width: 120, align: 'right', render: (value: number) => formatPlainAmount(value) },
    {
      title: '人民币折算',
      dataIndex: 'rmbAmount',
      width: 140,
      align: 'right',
      render: (_, row) => formatWaterReceiptRmbAmount(row)
    },
    {
      title: '凭证',
      dataIndex: 'voucher',
      width: 220,
      recordDetail: {
        label: '水单图片',
        span: 3,
        value: (row) => {
          if (!row.voucher) return '暂无水单图片';
          if (!row.voucher.url) return row.voucher.fileName;
          return (
            <Space size={14} align="center" wrap className="finance-paid-voucher-cell">
              <ProtectedVoucherImage
                apiClient={apiClient}
                url={row.voucher.url}
                alt={`水单图片：${row.voucher.fileName}`}
                width={168}
                height={112}
                className="finance-paid-voucher-thumb"
                style={{ objectFit: 'contain' }}
                preview={{ mask: '预览全图' }}
                onError={() => message.error('水单图片缩略图加载失败')}
              />
              <Space direction="vertical" size={2}>
                <Text>{row.voucher.fileName}</Text>
                <Text type="secondary">点击缩略图预览清晰全图</Text>
              </Space>
            </Space>
          );
        }
      },
      render: (_, row) => {
        const canMaintainVoucher = canVoucher && (canViewAll || row.status === 'PENDING');
        if (!canViewVoucher && !canMaintainVoucher) return '-';
        if (!row.voucher) {
          return canMaintainVoucher
            ? <Button size="small" onClick={() => { setVoucherRow(row); voucherForm.resetFields(); }}>凭证</Button>
            : '-';
        }
        return (
          <Space size={6} wrap>
            {canViewVoucher && row.voucher.url ? <Button size="small" onClick={() => setPreviewVoucher(row.voucher)}>查看</Button> : null}
            {canMaintainVoucher ? <Button size="small" onClick={() => { setVoucherRow(row); voucherForm.setFieldsValue({ voucherImage: row.voucher }); }}>凭证</Button> : null}
            <Text>{row.voucher.fileName}</Text>
          </Space>
        );
      }
    },
    { title: '付款编号', dataIndex: 'paymentNo', width: 160, render: (value?: string) => value ?? '-' },
    { title: '到账状态', dataIndex: 'status', width: 110, render: arrivalStatusTag },
    ...(isMatchingMode ? [{
      title: '到账确认人',
      dataIndex: 'arrivedBy',
      width: 130,
      render: (value?: string) => value ?? '-'
    }] : []),
    { title: '分配状态', key: 'matchStatus', width: 110, render: (_, row) => matchStatusTag(row) },
    {
      title: '分配明细',
      dataIndex: 'allocations',
      width: 280,
      render: (_, row) => {
        const allocations = getWaterReceiptAllocations(row);
        return allocations.length ? (
          <Space direction="vertical" size={2}>
            {allocations.map((allocation) => (
              <Space key={allocation.id} size={4} wrap>
                {renderShipmentOrderNoLink(allocation.systemOrderNo)}
                <Text>{allocation.feeName}</Text>
                <Tag color={allocation.status === 'APPROVED' ? 'success' : 'warning'}>
                  {allocation.status === 'APPROVED' ? '已落账' : '待审核'}
                </Tag>
              </Space>
            ))}
          </Space>
        ) : '-';
      }
    },
    { title: '水单备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (value?: string) => value?.trim() || '-' },
    { title: '已落账金额', dataIndex: 'matchedAmount', width: 130, align: 'right', render: (value: number, row) => formatWaterReceiptAmount(value, row.currency) },
    { title: '待审核占用', dataIndex: 'pendingAllocatedAmount', width: 130, align: 'right', render: (value: number | undefined, row) => formatWaterReceiptAmount(value, row.currency) },
    { title: '可分配余额', dataIndex: 'availableAllocationAmount', width: 130, align: 'right', render: (value: number | undefined, row) => formatWaterReceiptAmount(value ?? row.balance, row.currency) },
    { title: '账面余额', dataIndex: 'balance', width: 120, align: 'right', render: (value: number, row) => formatWaterReceiptAmount(value, row.currency) },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 300,
      render: (_, row) => (
        <Space size={6}>
          {(canManage && row.status !== 'VOIDED' && (row.status === 'PENDING' || canViewAll))
            ? <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
            : null}
          {canArrive && row.status === 'PENDING' ? (
            <WaterReceiptArriveAction
              row={row}
              size="small"
              loading={arrivingIds.has(row.id)}
              onConfirm={async () => {
                await markArrived(row);
              }}
            />
          ) : null}
          {isMatchingMode && canMatch && Number(row.availableAllocationAmount ?? row.balance) > 0 && ['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status)
            ? <Button size="small" onClick={() => void openMatch(row, 'allocate')}>分配</Button>
            : null}
          {isMatchingMode && canMatch && row.balance > 0 && row.status === 'PENDING' ? <Button size="small" disabled title="水单未到账，不能分配应收">分配</Button> : null}
          {isMatchingMode && canMatch && row.balance > 0 && Number(row.availableAllocationAmount ?? row.balance) <= 0 && ['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status)
            ? <Button size="small" disabled title="水单余额已被待审核分配占用">分配</Button>
            : null}
          {isMatchingMode && canViewMatchRecords
            ? <Button size="small" onClick={() => void openMatch(row, 'manage')}>分配记录</Button>
            : null}
          {canArchive && row.balance <= 0 && row.status !== 'ARCHIVED' ? (
            <ConfirmActionButton
              size="small"
              actionName="归档"
              objectName={row.receiptNo}
              currentStatus={statusLabel(row.status)}
              nextStatus="已归档"
              count={1}
              amount={formatPlainAmount(row.balance)}
              currency={row.currency ?? 'RMB'}
              riskTip="归档后该水单默认不再出现在待匹配列表，后续需按归档状态查询。"
              risk="warning"
              onConfirm={async () => {
                await apiClient.archiveWaterReceipt(row.id);
                await load();
              }}
            >
              归档
            </ConfirmActionButton>
          ) : null}
          {canVoid && row.matchedAmount <= 0 && Number(row.pendingAllocatedAmount ?? 0) <= 0 && row.status !== 'VOIDED' ? (
            <ConfirmActionButton
              size="small"
              danger
              actionName="作废"
              objectName={row.receiptNo}
              currentStatus={statusLabel(row.status)}
              nextStatus="已作废"
              count={1}
              amount={formatPlainAmount(row.amount)}
              currency={row.currency ?? 'RMB'}
              riskTip="作废后该水单不能再用于到账或匹配；如填写原因会写入审计。"
              risk="danger"
              onConfirm={async (reason) => {
                await apiClient.voidWaterReceipt(row.id, { reason });
                message.success('水单已作废');
                await load();
              }}
            >
              作废
            </ConfirmActionButton>
          ) : null}
        </Space>
      )
    }
  ], [apiClient, arrivingIds, canArchive, canArrive, canManage, canMatch, canViewAll, canViewMatchRecords, canViewVoucher, canVoid, canVoucher, isMatchingMode, load, renderShipmentOrderNoLink, voucherForm]);

  const matrixColumns = useMemo<ManagedTableColumns<WaterReceiptSummary>>(() => [
    {
      key: 'matrixInformation',
      title: '水单信息',
      width: 1080,
      className: 'managed-matrix-group-primary',
      render: (_value, row) => {
        const canMaintainVoucher = canVoucher && (canViewAll || row.status === 'PENDING');
        const voucherValue = !canViewVoucher && !canMaintainVoucher
          ? '-'
          : row.voucher
            ? (
              <Space size={6} wrap>
                {canViewVoucher && row.voucher.url ? <Button size="small" onClick={() => setPreviewVoucher(row.voucher)}>查看</Button> : null}
                {canMaintainVoucher ? <Button size="small" onClick={() => { setVoucherRow(row); voucherForm.setFieldsValue({ voucherImage: row.voucher }); }}>凭证</Button> : null}
                <Text title={row.voucher.fileName}>{row.voucher.fileName}</Text>
              </Space>
            )
            : canMaintainVoucher
              ? <Button size="small" onClick={() => { setVoucherRow(row); voucherForm.resetFields(); }}>凭证</Button>
              : '-';
        return (
          <ManagedMatrixCell
            columns={4}
            labelWidth={66}
            gap={8}
            fields={[
              { key: 'site', label: '站点', value: row.site || '-' },
              { key: 'receiptNo', label: '水单编号', value: row.receiptNo || '-', title: row.receiptNo },
              {
                key: 'paymentNo',
                label: '付款编号',
                value: row.paymentNo ? (
                  <Space size={4}>
                    <Text title={row.paymentNo}>{row.paymentNo}</Text>
                    <Button
                      size="small"
                      aria-label={`复制付款编号 ${row.paymentNo}`}
                      onClick={async () => {
                        const copied = await copyWaterReceiptPaymentNo(row.paymentNo);
                        if (copied) message.success('付款编号已复制');
                        else message.warning('复制失败，请手动复制付款编号');
                      }}
                    >
                      复制
                    </Button>
                  </Space>
                ) : '-',
                title: row.paymentNo
              },
              { key: 'salesperson', label: '业务员归属', value: row.salesperson || '-' },
              { key: 'customerCode', label: '客户编号', value: row.customerCode || '-' },
              { key: 'receiptMethod', label: '结算方式', value: row.receiptMethod || '-' },
              { key: 'receiptDate', label: '日期', value: formatBusinessDate(row.receiptDate) },
              { key: 'amount', label: '到账金额', value: <Text strong>{formatWaterReceiptAmount(row.amount, row.currency)}</Text> },
              { key: 'rmbAmount', label: '人民币折算', value: formatWaterReceiptRmbAmount(row) },
              { key: 'matchedAmount', label: '已落账', value: formatWaterReceiptAmount(row.matchedAmount, row.currency) },
              { key: 'pendingAllocatedAmount', label: '待审核占用', value: formatWaterReceiptAmount(row.pendingAllocatedAmount, row.currency) },
              { key: 'availableAllocationAmount', label: '可分配余额', value: formatWaterReceiptAmount(row.availableAllocationAmount ?? row.balance, row.currency) },
              { key: 'balance', label: '账面余额', value: formatWaterReceiptAmount(row.balance, row.currency) },
              { key: 'arrivalStatus', label: '到账状态', value: arrivalStatusTag(row.status) },
              { key: 'matchStatus', label: '分配状态', value: matchStatusTag(row) },
              isMatchingMode ? { key: 'arrivedBy', label: '到账确认人', value: row.arrivedBy || '-' } : null,
              { key: 'voucher', label: '水单凭证', value: voucherValue },
              { key: 'remark', label: '水单备注', value: row.remark?.trim() || '-', title: row.remark, wrap: true },
              {
                key: 'allocations',
                label: '分配明细',
                value: getWaterReceiptAllocations(row).length ? getWaterReceiptAllocations(row).map((allocation) => (
                  <Space key={allocation.id} size={4} wrap>
                    {renderShipmentOrderNoLink(allocation.systemOrderNo)}
                    <Text>{allocation.feeName}</Text>
                    <Tag color={allocation.status === 'APPROVED' ? 'success' : 'warning'}>
                      {allocation.status === 'APPROVED' ? '已落账' : '待审核'}
                    </Tag>
                  </Space>
                )) : '-',
                wrap: true
              }
            ]}
          />
        );
      }
    },
    { ...columns[columns.length - 1], key: 'action', width: 130, fixed: 'right' }
  ], [canViewAll, canViewVoucher, canVoucher, columns, isMatchingMode, renderShipmentOrderNoLink, voucherForm]);

  const matchColumns = useMemo<ManagedTableColumns<ReceivableAuditSummary>>(() => [
    {
      key: 'systemOrderNo',
      dataIndex: 'systemOrderNo',
      title: '出货单 / 费用',
      width: 180,
      render: (value: string, row) => (
        <div className="water-receipt-match-order">
          <div className="water-receipt-match-order-number">{renderShipmentOrderNoLink(value)}</div>
          <Text type="secondary">{row.name || '-'}</Text>
        </div>
      )
    },
    {
      key: 'businessStatus',
      title: '业务状态',
      width: 210,
      render: (_value, row) => {
        if (!matchRow) return '-';
        const state = getWaterReceiptReceivableState(row, matchRow);
        return (
          <div className="water-receipt-match-statuses">
            <Tag color={row.reconciliationStatus === 'CONFIRMED' ? 'success' : 'warning'}>
              {row.reconciliationStatus === 'CONFIRMED' ? '已审核' : '待审核'}
            </Tag>
            <Tag color={state.color}>{state.label}</Tag>
          </div>
        );
      }
    },
    {
      key: 'amount',
      title: '应收金额',
      width: 120,
      align: 'right',
      render: (_value, row) => <span className="water-receipt-match-amount">{formatCurrency(row.rmbAmount ?? Number(row.amount) * Number(matchRow?.exchangeRate ?? 1))}</span>
    },
    {
      key: 'receivedAmount',
      title: '已收金额',
      width: 120,
      align: 'right',
      render: (_value, row) => {
        const rate = Number(matchRow?.exchangeRate ?? 1);
        const totalRmb = Number(row.rmbAmount ?? Number(row.amount) * rate);
        return <span className="water-receipt-match-amount">{formatCurrency(Math.max(0, totalRmb - getReceivableOutstandingRmb(row, rate)))}</span>;
      }
    },
    {
      key: 'availableAmount',
      title: '可分配金额',
      width: 120,
      align: 'right',
      render: (_value, row) => <span className="water-receipt-match-amount">{formatCurrency(getReceivableAvailableToAllocateRmb(row, Number(matchRow?.exchangeRate ?? 1)))}</span>
    },
    {
      key: 'matchAmount',
      title: '本次分配金额（RMB）',
      width: 220,
      render: (_value, row) => {
        if (!matchRow) return '-';
        const state = getWaterReceiptReceivableState(row, matchRow);
        if (!state.selectable) return <Text type="secondary" className="water-receipt-match-unavailable">{state.label}</Text>;
        return (
          <InputNumber
            aria-label={`${row.systemOrderNo}-${row.name}-分配金额`}
            disabled={!selectedMatchReceivableIds.includes(row.id)}
            min={0.01}
            max={getReceivableAvailableToAllocateRmb(row, Number(matchRow.exchangeRate ?? 1))}
            precision={2}
            prefix="¥"
            value={matchAmounts[row.id]}
            onChange={(value) => setMatchAmounts((current) => ({ ...current, [row.id]: Number(value ?? 0) }))}
            style={{ width: '100%' }}
          />
        );
      }
    }
  ], [matchAmounts, matchRow, renderShipmentOrderNoLink, selectedMatchReceivableIds]);

  const reviewColumns = useMemo<ManagedTableColumns<WaterMatchReviewGroup>>(() => [
    {
      key: 'systemOrderNo',
      title: '出货单 / 费用明细',
      width: 300,
      render: (_value, group) => (
        <div className="water-match-review-order">
          <div>{renderShipmentOrderNoLink(group.systemOrderNo)}</div>
          <Space direction="vertical" size={4}>
            {group.items.map((item) => (
              <div key={item.request.id} className="water-match-review-fee-line">
                <Text>{item.row.name || '-'}</Text>
                {editingReviewBatchId === group.id ? (
                  <InputNumber
                    aria-label={`${group.systemOrderNo}-${item.row.name}-待审核分配金额`}
                    min={0.01}
                    precision={2}
                    prefix="¥"
                    value={reviewEditAmounts[item.request.id]}
                    onChange={(value) => setReviewEditAmounts((current) => ({
                      ...current,
                      [item.request.id]: Number(value ?? 0)
                    }))}
                  />
                ) : (
                  <Text strong>{formatCurrency(item.request.amount * Number(matchRow?.exchangeRate ?? 1))}</Text>
                )}
              </div>
            ))}
          </Space>
        </div>
      )
    },
    {
      key: 'status',
      title: '分配状态',
      width: 120,
      render: (_value, group) => {
        const status = group.request.status;
        return <Tag color={status === 'APPROVED' ? 'success' : 'warning'}>{status === 'APPROVED' ? '已落账' : '待审核'}</Tag>;
      }
    },
    {
      key: 'submitter',
      title: '提交信息',
      width: 180,
      render: (_value, group) => (
        <Space direction="vertical" size={0}>
          <Text>{group.request.requestedBy}</Text>
          <Text type="secondary">{formatBusinessDate(group.request.requestedAt)}</Text>
        </Space>
      )
    },
    {
      key: 'totalAmount',
      title: '分配金额',
      width: 150,
      align: 'right',
      render: (_value, group) => <Text strong>{formatCurrency(group.totalAmount * Number(matchRow?.exchangeRate ?? 1))}</Text>
    },
    {
      key: 'action',
      title: '操作',
      width: 260,
      fixed: 'right',
      render: (_value, group) => (
        <Space size={6} wrap>
          {group.request.status === 'PENDING' && canAdjustMatch ? (
            editingReviewBatchId === group.id
              ? (
                <>
                  <Button size="small" type="primary" onClick={() => void saveReviewGroup(group)}>保存</Button>
                  <Button size="small" onClick={() => setEditingReviewBatchId(undefined)}>取消编辑</Button>
                </>
              )
              : <Button size="small" onClick={() => startEditReviewGroup(group)}>编辑</Button>
          ) : null}
          {group.request.status === 'PENDING' && canDeleteMatch ? (
            <Popconfirm title="确认删除这条待审核分配？" onConfirm={() => void runReviewAction(
              () => apiClient.deleteReceivableMatchRequest(group.request.id),
              '待审核分配已删除'
            )}>
              <Button size="small" danger>删除</Button>
            </Popconfirm>
          ) : null}
          {group.request.status !== 'PENDING' ? <Text type="secondary">仅查询</Text> : null}
        </Space>
      )
    }
  ], [apiClient, canAdjustMatch, canDeleteMatch, editingReviewBatchId, matchRow?.exchangeRate, renderShipmentOrderNoLink, reviewEditAmounts]);

  return (
    <Space direction="vertical" size={12} className="finance-workspace">
      <Card
        title={pageTitle}
        className="finance-filter-card water-receipt-filter-card"
        extra={<Space><Button onClick={() => void load()}>刷新</Button>{canExport ? <Button onClick={() => void exportRows()}>导出</Button> : null}{canCreate ? <Button type="primary" onClick={openCreate}>新增水单</Button> : null}</Space>}
      >
        <Form
          form={queryForm}
          className="water-receipt-filter-form"
          layout="vertical"
          initialValues={pageDefaultQuery}
          onFinish={(values) => setQuery((current) => ({
            ...pageDefaultQuery,
            ...values,
            matchStatus: isMatchingMode ? current.matchStatus ?? 'UNMATCHED' : undefined,
            page: 1
          }))}
        >
          <Row gutter={12}>
            <Col xs={24} md={6}><Form.Item name="receiptNo" label="水单编号"><Input allowClear /></Form.Item></Col>
            {mode === 'arrival' ? <Col xs={24} md={6}><Form.Item name="site" label="站点"><Select allowClear showSearch optionFilterProp="label" loading={siteOptionsLoading} options={siteOptions} /></Form.Item></Col> : null}
            <Col xs={24} md={6}><Form.Item name="customerCode" label="客户编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="salesperson" label="业务员归属"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="receiptMethod" label="结算方式"><Select allowClear options={settlementOptions} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="paymentNo" label="付款编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="remark" label="水单备注"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="status" label="到账状态"><Select options={statusOptions} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="dateFrom" label="日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="dateTo" label="日期止"><AppDatePicker /></Form.Item></Col>
          </Row>
          <Space className="water-receipt-filter-actions"><Button type="primary" htmlType="submit">查询</Button><Button onClick={() => { queryForm.resetFields(); setQuery(pageDefaultQuery); }}>重置</Button></Space>
        </Form>
      </Card>

      <Card className="finance-table-card">
        <Space size={8} wrap className="finance-work-status-strip finance-work-summary">
          {isMatchingMode ? (
            <Segmented
              size="small"
              value={query.matchStatus ?? 'UNMATCHED'}
              options={[
                { label: '未全部落账', value: 'UNMATCHED' },
                { label: '已全部落账', value: 'MATCHED' },
                { label: '全部', value: 'ALL' }
              ]}
              onChange={(value) => setQuery((current) => ({
                ...current,
                matchStatus: value as WaterReceiptListQuery['matchStatus'],
                page: 1
              }))}
            />
          ) : null}
          <Text type="secondary">当前结果 {response.pagination.totalItems} 条</Text>
          {(response.totals.amountByCurrency ?? []).map((item) => (
            <Text key={item.currency}>到账金额 {item.currency} {formatPlainAmount(item.amount)}</Text>
          ))}
          <Text strong>人民币折算 {summaryRmbAmount === undefined ? '缺少有效汇率' : formatCurrency(summaryRmbAmount)}</Text>
          {isMatchingMode ? <Text strong>待审核占用 {summaryRmbPendingAllocatedAmount === undefined ? '缺少有效汇率' : formatCurrency(summaryRmbPendingAllocatedAmount)}</Text> : null}
          {isMatchingMode ? <Text strong>可分配余额 {summaryRmbAvailableAllocationAmount === undefined ? '缺少有效汇率' : formatCurrency(summaryRmbAvailableAllocationAmount)}</Text> : null}
          <Text strong>折算余额 {summaryRmbBalance === undefined ? '缺少有效汇率' : formatCurrency(summaryRmbBalance)}</Text>
        </Space>
        <ManagedDualViewTable<WaterReceiptSummary>
          viewStorageKey={`sunny.finance.waterReceipt.${isMatchingMode ? 'matching' : 'arrival'}.view-v1`}
          viewAriaLabel={`${pageTitle}表格视图`}
          defaultView="matrix"
          views={{
            matrix: {
              label: '矩阵视图',
              columns: matrixColumns,
              tableProps: {
                className: 'finance-work-table finance-water-receipt-matrix-table',
                minimumScrollX: 0,
                tableLayout: 'fixed',
                showHeader: false,
                recordDetail: {
                  title: '水单详情',
                  columns,
                  footer: (row, close) => (
                    <Space>
                      <Button onClick={close}>关闭</Button>
                      {canArrive && row.status === 'PENDING' ? (
                        <WaterReceiptArriveAction row={row} loading={arrivingIds.has(row.id)} onConfirm={async () => { if (await markArrived(row)) close(); }} />
                      ) : null}
                    </Space>
                  )
                },
                columnSettings: { storageKey: `sunny.finance.waterReceipt.${isMatchingMode ? 'matching' : 'arrival'}.matrix-columns-v1`, title: `${pageTitle}矩阵列设置`, lockedKeys: ['action'] }
              }
            },
            ledger: {
              label: '精密台账模式',
              columns,
              tableProps: {
                className: 'finance-work-table finance-water-receipt-ledger-table',
                minimumScrollX: 1900,
                recordDetail: {
                  title: '水单详情',
                  footer: (row, close) => (
                    <Space>
                      <Button onClick={close}>关闭</Button>
                      {canArrive && row.status === 'PENDING' ? (
                        <WaterReceiptArriveAction row={row} loading={arrivingIds.has(row.id)} onConfirm={async () => { if (await markArrived(row)) close(); }} />
                      ) : null}
                    </Space>
                  )
                },
                columnSettings: { storageKey: `sunny.finance.waterReceipt.${isMatchingMode ? 'matching' : 'arrival'}.columns-v1`, title: `${pageTitle}列设置`, lockedKeys: ['receiptNo', 'action'] }
              }
            }
          }}
          rowKey="id"
          loading={loading}
          size="small"
          dataSource={response.rows}
          recordDetailTarget={notificationDetailTarget ? { key: `notification-water-receipt:${notificationDetailTarget.id}`, record: notificationDetailTarget } : null}
          pagination={{
            current: response.pagination.page,
            pageSize: response.pagination.pageSize,
            total: response.pagination.totalItems,
            showSizeChanger: true,
            onChange: (page, pageSize) => setQuery((current) => ({ ...current, page, pageSize }))
          }}
          columnSettingsPlacement="toolbar"
        />
      </Card>

      <Modal
        title={editing ? '编辑水单' : '新增水单'}
        className="finance-modal"
        width={760}
        open={formOpen}
        confirmLoading={formSubmitting}
        okButtonProps={{ disabled: editingBlocked }}
        okText="确认保存"
        cancelText="取消"
        onCancel={() => {
          if (formSubmitting) return;
          setFormOpen(false);
          setFormError(undefined);
        }}
        onOk={() => void submitForm()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onValuesChange={() => setFormError(undefined)}>
          {editingAfterArrival ? (
            <Alert
              type="warning"
              showIcon
              message={editingBlocked ? '该水单已有匹配或待审核分配，暂不能修改' : '当前水单已到账，允许修改全部字段'}
              description={editingBlocked ? '请先撤销全部匹配，并处理或取消待审核分配后，再重新打开编辑。' : '保存时必须填写修改原因，系统会同步更新客户账户、账本和业务侧收款数据。'}
              style={{ marginBottom: 16 }}
            />
          ) : null}
          {formError ? <Alert type="error" showIcon message="保存失败" description={formError} style={{ marginBottom: 16 }} /> : null}
          {editing ? <Form.Item label="水单编号"><Input aria-label="水单编号" value={editing.receiptNo} readOnly /></Form.Item> : null}
          <Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请选择客户编号' }]}>
            <Select
              disabled={editingBlocked}
              showSearch
              optionFilterProp="label"
              placeholder="输入客户编号搜索"
              options={customerOptions}
              onChange={(customerCode: string) => form.setFieldValue('site', resolveWaterReceiptCustomerSite(customers, customerCode))}
            />
          </Form.Item>
          <Form.Item name="site" label="站点">
            <Select
              disabled={editingBlocked}
              aria-label="站点"
              showSearch
              allowClear
              loading={siteOptionsLoading}
              optionFilterProp="label"
              placeholder="输入站点名称搜索"
              options={siteOptions}
            />
          </Form.Item>
          {editing?.status === 'PENDING' && editing.receiptMethod && !settlementOptions.some((item) => item.value === editing.receiptMethod) ? <Text type="warning">当前历史结算方式已停用，保存前请改选启用结算方式。</Text> : null}
          <Form.Item name="receiptMethod" label="结算方式" rules={[{ required: true, message: '请选择结算方式' }]}><Select disabled={editingBlocked} aria-label="结算方式" options={editorSettlementOptions} /></Form.Item>
          <Form.Item name="receiptDate" label="日期" rules={[{ required: true, message: '请选择日期' }]}><AppDatePicker disabled={editingBlocked} /></Form.Item>
          <Form.Item name="currency" label="币种" rules={[{ required: true, message: '请选择币种' }]}><Select disabled={editingBlocked} options={['RMB', 'USD'].map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="amount" label="到账金额" rules={[{ required: true, message: '请填写到账金额' }]}><InputNumber disabled={editingBlocked} min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
          {editingAfterArrival ? <Form.Item name="adjustReason" label="到账水单修改原因" rules={[{ required: true, whitespace: true, message: '请填写到账水单修改原因' }]}><Input placeholder="请说明本次水单修改原因" disabled={editingBlocked} /></Form.Item> : null}
          <Form.Item name="paymentNo" label="付款编号" rules={[{ required: true, whitespace: true, message: '请填写付款编号' }]}><Input aria-label="付款编号" disabled={editingBlocked} /></Form.Item>
          {!editing ? <Form.Item label="水单图片（可选）"><VoucherImageInput apiClient={apiClient} onFileChange={setCreateVoucherFile} /></Form.Item> : null}
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} disabled={editingBlocked} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="记录水单凭证" className="finance-modal" width={720} open={Boolean(voucherRow)} onCancel={() => setVoucherRow(null)} onOk={() => void submitVoucher()} destroyOnHidden>
        <Form form={voucherForm} layout="vertical">
          <Form.Item name="voucherImage" label="水单凭证截图">
            <VoucherImageInput
              apiClient={apiClient}
              disabled={!canVoucher || !voucherRow}
              uploadFile={(file) => apiClient.uploadVoucherImage({ file, context: 'WATER_RECEIPT', waterReceiptId: voucherRow?.id }) as Promise<VoucherImageValue>}
              onUploaded={(voucher) => setVoucherRow((current) => current
                ? {
                    ...current,
                    voucher: {
                      ...voucher,
                      id: current.voucher?.id ?? `water-receipt-voucher-${current.id}`,
                      waterReceiptId: current.id
                    }
                  }
                : current)}
            />
          </Form.Item>
          {!voucherRow?.voucher ? <Text type="secondary">暂无水单图片</Text> : null}
          {voucherRow?.voucher && canDeleteVoucher ? <Popconfirm title="确认删除水单凭证？" onConfirm={() => void deleteVoucher()}><Button danger>删除图片</Button></Popconfirm> : null}
        </Form>
      </Modal>

      <Modal
        title={(
          <div className="water-receipt-match-modal-title">
            <span>{isMatchReviewMode ? '水单分配记录' : '分配订单应收'}</span>
            <small aria-hidden="true">
              {isMatchReviewMode ? '查看并维护待审核分配；正式审核统一在应收审核完成' : '选择可分配的应收费用，金额不得超过水单可分配余额'}
            </small>
          </div>
        )}
        className="finance-modal water-receipt-order-match-modal"
        open={Boolean(matchRow)}
        onCancel={closeMatch}
        confirmLoading={matchSubmitting}
        destroyOnHidden
        maskClosable={!matchSubmitting}
        keyboard={!matchSubmitting}
        width={1240}
        footer={isMatchReviewMode ? (
          <div className="water-receipt-match-footer">
            <Text className="water-receipt-match-footer-selection">已选择 <strong>{selectedReviewBatchIds.length}</strong> 条分配</Text>
            <Space>
              {canDeleteMatch ? (
                <Popconfirm
                  title="确认批量删除所选待审核分配？"
                  onConfirm={() => void runReviewAction(
                    () => apiClient.batchDeleteReceivableMatchRequests({ ids: selectedPendingReviewIds }),
                    `已删除 ${selectedPendingReviewIds.length} 条待审核分配`
                  )}
                >
                  <Button danger disabled={!selectedPendingReviewIds.length || selectedPendingReviewIds.length !== selectedReviewGroups.length}>批量删除待审核分配</Button>
                </Popconfirm>
              ) : null}
              <Button disabled={matchSubmitting} onClick={closeMatch}>关闭</Button>
            </Space>
          </div>
        ) : (
          <div className="water-receipt-match-footer">
            <Text className="water-receipt-match-footer-selection">已选择 <strong>{selectedMatchReceivableIds.length}</strong> 项</Text>
            <div className="water-receipt-match-footer-balance">
              <span>本次分配 <strong>{formatCurrency(selectedMatchAmount)}</strong></span>
              <i>·</i>
              <span>分配后余额 <strong>{matchBalanceAfter === undefined ? '缺少有效汇率' : formatCurrency(matchBalanceAfter)}</strong></span>
            </div>
            <Space>
              <Button disabled={matchSubmitting} onClick={closeMatch}>取消</Button>
              <Button type="primary" loading={matchSubmitting} disabled={!canSubmitMatch} onClick={() => void submitMatch()}>
                提交分配
              </Button>
            </Space>
          </div>
        )}
      >
        {isMatchReviewMode ? (
          <>
            <div className="water-receipt-match-summary">
              <div>
                <span>待审核分配</span>
                <strong>{reviewFilterCounts.pending} 条</strong>
              </div>
              <div>
                <span>已落账分配</span>
                <strong>{reviewFilterCounts.approved} 条</strong>
              </div>
              <div>
                <span>可分配余额</span>
                <strong>{matchAvailableBalance === undefined ? '缺少有效汇率' : formatCurrency(matchAvailableBalance)}</strong>
              </div>
            </div>
            <div className="water-receipt-match-toolbar">
              <Input
                aria-label="搜索水单分配记录"
                allowClear
                value={matchKeyword}
                placeholder="搜索出货单号 / 费用名称"
                onChange={(event) => setMatchKeyword(event.target.value)}
              />
              <Segmented<ReviewFilterKey>
                aria-label="水单分配状态筛选"
                value={reviewFilter}
                options={[
                  { label: `全部 ${reviewFilterCounts.all}`, value: 'ALL' },
                  { label: `待审核 ${reviewFilterCounts.pending}`, value: 'PENDING' },
                  { label: `已落账 ${reviewFilterCounts.approved}`, value: 'APPROVED' }
                ]}
                onChange={setReviewFilter}
              />
            </div>
            <ManagedTable
              className="water-receipt-match-table water-match-review-table"
              rowKey="id"
              dataSource={filteredReviewGroups}
              columns={reviewColumns}
              rowSelection={{
                selectedRowKeys: selectedReviewBatchIds,
                onChange: (keys) => setSelectedReviewBatchIds(keys.map(String)),
                getCheckboxProps: (group) => ({
                  disabled: group.request.status !== 'PENDING',
                  title: group.request.status !== 'PENDING' ? '只有待审核分配可以删除' : undefined
                })
              }}
              pagination={false}
              columnSettings={false}
              resizableColumns={false}
              recordDetail={false}
              density="compact"
              showSelectionSummary={false}
              minimumScrollX={980}
              scroll={{ y: 390 }}
              locale={{ emptyText: matchKeyword || reviewFilter !== 'ALL' ? '没有符合条件的分配记录' : '当前水单暂无分配记录' }}
            />
          </>
        ) : (
          <>
        <div className="water-receipt-match-summary">
          <div>
            <span>水单可分配余额</span>
            <strong>{matchAvailableBalance === undefined ? '缺少有效汇率' : formatCurrency(matchAvailableBalance)}</strong>
          </div>
          <div>
            <span>已选择</span>
            <strong>{selectedMatchReceivableIds.length} 项</strong>
          </div>
          <div>
            <span>本次分配</span>
            <strong>{formatCurrency(selectedMatchAmount)}</strong>
          </div>
        </div>
        <div className="water-receipt-match-toolbar">
          <Input
            aria-label="搜索可匹配应收"
            allowClear
            value={matchKeyword}
            placeholder="搜索出货单号 / 费用名称"
            onChange={(event) => setMatchKeyword(event.target.value)}
          />
          <Segmented<MatchFilterKey>
            aria-label="应收分配状态筛选"
            value={matchFilter}
            options={[
              { label: `全部 ${matchFilterCounts.all}`, value: 'ALL' },
              { label: `可匹配 ${matchFilterCounts.matchable}`, value: 'MATCHABLE' },
              { label: `已有落账 ${matchFilterCounts.matched}`, value: 'MATCHED' },
              { label: `待审核 ${matchFilterCounts.pending}`, value: 'PENDING' }
            ]}
            onChange={setMatchFilter}
          />
          <Checkbox checked={showMatchableOnly} onChange={(event) => setShowMatchableOnly(event.target.checked)}>
            仅显示可操作
          </Checkbox>
        </div>
        <ManagedTable
          className="water-receipt-match-table"
          rowKey="id"
          dataSource={filteredMatchableRows}
          columns={matchColumns}
          rowClassName={(row) => {
            if (selectedMatchReceivableIds.includes(row.id)) return 'water-receipt-match-row-selected';
            return matchRow && !getWaterReceiptReceivableState(row, matchRow).selectable
              ? 'water-receipt-match-row-disabled'
              : '';
          }}
          rowSelection={{
            selectedRowKeys: selectedMatchReceivableIds,
            onChange: (keys) => setSelectedMatchReceivableIds(keys.map(String)),
            getCheckboxProps: (row) => {
              const state = matchRow
                ? getWaterReceiptReceivableState(row, matchRow)
                : { selectable: false, label: '不可匹配' };
              return { disabled: !state.selectable, title: state.label };
            }
          }}
          pagination={false}
          columnSettings={false}
          resizableColumns={false}
          recordDetail={false}
          density="compact"
          showSelectionSummary={false}
          minimumScrollX={1000}
          scroll={{ y: 360 }}
          locale={{ emptyText: matchKeyword || matchFilter !== 'ALL' || showMatchableOnly ? '没有符合条件的应收费用' : '当前客户没有应收费用' }}
        />
          </>
        )}
      </Modal>

      <Modal title="水单凭证预览" className="finance-modal finance-preview-modal" width={760} open={Boolean(previewVoucher)} footer={null} onCancel={() => setPreviewVoucher(undefined)} destroyOnHidden>
        {previewVoucher ? (
          <Space direction="vertical" className="full-width">
            <Text>{previewVoucher.fileName}</Text>
            {previewVoucher.url ? (
              <ProtectedVoucherImage
                apiClient={apiClient}
                url={previewVoucher.url}
                alt={previewVoucher.fileName}
                style={{ maxWidth: '100%' }}
                onError={() => message.error('图片预览加载失败')}
              />
            ) : null}
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
}
