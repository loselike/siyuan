import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  App as AntdApp,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tabs,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Banknote, CalendarDays, CircleDollarSign, ClipboardList, FilePenLine, FileText, Landmark, ListChecks, RefreshCw } from 'lucide-react';
import {
  shipmentStatusLabels,
  isTimestampInBeijingDateRange,
  type AgentSummary,
  type BusinessCostAuditSummary,
  type CustomerAccountSummary,
  type CustomerContactSummary,
  type CustomerSummary,
  type CustomerStatementSummary,
  type FinanceDashboardItem,
  type FinanceDashboardResponse,
  type OrderEntryDetailSummary,
  type PendingPaymentListQuery,
  type PayableAuditSummary,
  type ReceivableAuditSummary,
  type Shipment,
  type ShipmentFinanceDetailSummary,
  type ShipmentReviewBasicUpdateInput,
  type ShipmentReviewDetailSummary,
  type ShipmentReviewEventSummary,
  type ShipmentLogisticsTrackingEventSummary,
  type ShipmentReviewPackageSummary,
  type ShipmentStatus
} from '@siyuan/shared';
import { ApiClient, type PermissionKey } from '../../apiClient';
import { confirmDangerousAction } from '../shared/dangerousAction';
import { FinanceEntryPage } from './entry/FinanceEntryPage';
import { FinanceCatalogPage } from './FinanceCatalogPage';
import { useFinanceCatalog } from './useFinanceCatalog';
import { ReceivableAuditPage } from './receivableAudit/ReceivableAuditPage';
import { BusinessCostAuditPage } from './businessCostAudit/BusinessCostAuditPage';
import { PayableAuditPage } from './payableAudit/PayableAuditPage';
import { PendingPaymentPage } from './pendingPayment/PendingPaymentPage';
import { PaidPaymentPage } from './paidPayment/PaidPaymentPage';
import { WaterReceiptPage } from './waterReceipt/WaterReceiptPage';
import { AgentBillPage } from './agentBill/AgentBillPage';
import { formatBeijingDate, formatBeijingDateTime, formatCurrency, getBeijingWeekStartTimestamp, parseBeijingDateTimeInputToIso } from '../shared/format';
import { getCustomerDisplayName } from '../shared/customerDisplay';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { PlaceholderPanel } from '../shared/PlaceholderPanel';
import { AppActionGroup, AppPage, AppPageHeader, CompactMetricCard as MetricCard, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, ManagedTable, renderNoticeBar, tenRowTablePagination, type ManagedTableColumns } from '../shared/ui';
import { getStaffSectionHref } from '../appShell/config';
import { agentFieldLabels } from '../shared/agentFieldLabels';

const { Text } = Typography;
const salesScopedRoleKeys = ['OPERATOR', 'UG_MARKET', 'UG_BUSINESS', 'UG_SZ_WUHAN', 'UG_ZZ_SIHUA', 'UG_WH_JIUYULIAN', 'UG_BUSINESS_MANAGER', 'UG_BUSINESS_SUPERVISOR'];

export function FinancePage({
  role,
  username,
  permissions,
  receivables,
  businessCostAudits,
  payableAudits,
  agents,
  statements,
  accounts,
  notice,
  onCreateStatement,
  onCreatePayment,
  onReceivableRowsChange,
  onBusinessCostRowsChange,
  onPayableRowsChange,
  shipments,
  onViewShipmentLog,
  renderShipmentFinancePanel,
  renderShipmentOrderNoLink,
  apiClient,
  renderOrderManagement,
  renderOrderAi,
  prefillOrderEntryPackageIds,
  onOrderEntryPrefillConsumed,
  customers,
  customerContacts,
  onCustomerContactsChange,
  initialSection,
  menuMode = 'finance',
  notificationTarget,
  onNotificationTargetHandled
}: {
  menuMode?: 'business' | 'finance' | 'catalog';
  initialSection?: string;
  notificationTarget?: { type: string; id: string };
  onNotificationTargetHandled?: (target: { type: string; id: string }) => void;
  role: import('../../apiClient').RoleKey;
  username: string;
  permissions: PermissionKey[];
  receivables: ReceivableAuditSummary[];
  businessCostAudits: BusinessCostAuditSummary[];
  payableAudits: PayableAuditSummary[];
  agents: AgentSummary[];
  statements: CustomerStatementSummary[];
  accounts: CustomerAccountSummary[];
  notice: string | null;
  onCreateStatement: () => Promise<void>;
  onCreatePayment: () => Promise<void>;
	  onReceivableRowsChange: (rows: ReceivableAuditSummary[]) => void;
  onBusinessCostRowsChange: (rows: BusinessCostAuditSummary[]) => void;
  onPayableRowsChange: (rows: PayableAuditSummary[]) => void;
  shipments: Shipment[];
  onViewShipmentLog: (record: Shipment) => void;
  renderShipmentFinancePanel: (shipment: Shipment, detail?: ShipmentFinanceDetailSummary) => ReactNode;
  renderShipmentOrderNoLink: (systemOrderNo?: string, options?: { shipment?: Shipment; subtitle?: string; copyText?: string }) => ReactNode;
  apiClient: ApiClient;
  renderOrderManagement?: () => ReactNode;
  renderOrderAi?: () => ReactNode;
  prefillOrderEntryPackageIds?: string[];
  onOrderEntryPrefillConsumed?: () => void;
  customers: CustomerSummary[];
  customerContacts: CustomerContactSummary[];
  onCustomerContactsChange?: (contacts: CustomerContactSummary[]) => void;
}) {
  const { message: messageApi, modal } = AntdApp.useApp();
  const handleWaterReceiptNotificationTarget = useCallback(() => {
    if (notificationTarget) onNotificationTargetHandled?.(notificationTarget);
  }, [notificationTarget, onNotificationTargetHandled]);
  const defaultSection = menuMode === 'business' ? 'business-dashboard' : menuMode === 'catalog' ? 'fee-names' : 'finance-dashboard';
  const pendingReceivables = receivables.filter((fee) => !fee.voided && fee.reconciliationStatus !== 'CONFIRMED');
  const pendingReceivableRmbMissing = pendingReceivables.some((fee) => fee.rmbAmount === undefined
    && !['RMB', 'CNY'].includes((fee.currency ?? 'RMB').toUpperCase()));
  const total = pendingReceivables.reduce((sum, fee) => sum + Number(
    fee.rmbAmount ?? (['RMB', 'CNY'].includes((fee.currency ?? 'RMB').toUpperCase()) ? fee.amount : 0)
  ), 0);
  const primaryAccount = accounts.find((account) => account.customerId === 'c-9409') ?? accounts[0];
  const [activeFinanceSection, setActiveFinanceSection] = useState(initialSection ?? defaultSection);
  const [pendingPaymentInitialQuery, setPendingPaymentInitialQuery] = useState<PendingPaymentListQuery | undefined>();
  const financeCatalog = useFinanceCatalog(apiClient);
  useEffect(() => {
    if (initialSection) setActiveFinanceSection(initialSection);
  }, [initialSection]);
  const financeCatalogItems = financeCatalog.items;
  const emptyFinanceReviewFilters = {
    createdFrom: '',
    createdTo: '',
    customerCode: '',
    customerName: '',
    salesperson: '',
    systemOrderNo: '',
    destinationCountry: '',
    channelName: '',
    customs: 'ALL',
    sensitive: 'ALL',
    overdue: 'ALL',
    keyword: ''
  };
  const [financeReviewFilterDraft, setFinanceReviewFilterDraft] = useState(emptyFinanceReviewFilters);
  const [financeReviewFilters, setFinanceReviewFilters] = useState(emptyFinanceReviewFilters);
  const [financeReviewSelectedShipmentId, setFinanceReviewSelectedShipmentId] = useState<string | null>(null);
  const [pendingReviewView, setPendingReviewView] = useState<'ACTIVE' | 'DELETED'>('ACTIVE');
  const [pendingReviewRows, setPendingReviewRows] = useState<Shipment[]>([]);
  const [deletedReviewRows, setDeletedReviewRows] = useState<Shipment[]>([]);
  const [orderEntryDraftRows, setOrderEntryDraftRows] = useState<Shipment[]>([]);
  const [orderEntryDraftLoading, setOrderEntryDraftLoading] = useState(false);
  const [editingOrderEntryDraftId, setEditingOrderEntryDraftId] = useState<string | undefined>();
  const [editingOrderEntryDraftDetail, setEditingOrderEntryDraftDetail] = useState<OrderEntryDetailSummary | undefined>();
  const [openingOrderEntryDraftId, setOpeningOrderEntryDraftId] = useState<string | undefined>();
  const [pendingReviewLoading, setPendingReviewLoading] = useState(false);
  const [businessDashboardRefreshing, setBusinessDashboardRefreshing] = useState(false);
  const [businessDashboardUpdatedAt, setBusinessDashboardUpdatedAt] = useState<string>();
  const [businessTrendHoverIndex, setBusinessTrendHoverIndex] = useState<number | null>(null);
  const [deletedReviewLoading, setDeletedReviewLoading] = useState(false);
  const [pendingReviewDetail, setPendingReviewDetail] = useState<ShipmentReviewDetailSummary | null>(null);
  const [pendingReviewDetailLoading, setPendingReviewDetailLoading] = useState(false);
  const [pendingReviewSubmitting, setPendingReviewSubmitting] = useState(false);
  const [pendingReviewBasicSubmitting, setPendingReviewBasicSubmitting] = useState(false);
  const [pendingReviewBasicForm] = Form.useForm<ShipmentReviewBasicUpdateInput>();
  const [reviewRestoreTarget, setReviewRestoreTarget] = useState<Shipment | null>(null);
  const [reviewRestoreSubmitting, setReviewRestoreSubmitting] = useState(false);
  const [reviewRestoreForm] = Form.useForm<{
    mode: 'KEEP_ORIGINAL_TIME' | 'RESET_CREATED_TIME' | 'MANUAL_TIME';
    manualCreatedAt?: string;
    reason?: string;
  }>();
  const hasUiPermission = (permission: PermissionKey) => role === 'ADMIN' || permissions.includes(permission);
  const canViewOrderEntry = hasUiPermission('business:order-entry:view');
  const canCreateOrderEntry = hasUiPermission('business:order-entry:create');
  const canViewOrderEntryDrafts = hasUiPermission('business:order-entry:draft-view');
  const canSaveOrderEntryDraft = hasUiPermission('business:order-entry:draft-save');
  const canSubmitOrderEntryForReview = hasUiPermission('business:order-entry:submit-review');
  const canUseOrderEntryAgentFields = hasUiPermission('master-data:agents:read');
  const canContinueOrderEntryDraft = canViewOrderEntry && canViewOrderEntryDrafts && canSaveOrderEntryDraft;
  const canUseFinanceWorkspace = hasUiPermission('finance:dashboard:view') || hasUiPermission('finance:receivable:read') || hasUiPermission('finance:business-cost:read') || hasUiPermission('finance:payable:read') || hasUiPermission('finance:pending-payment:read') || hasUiPermission('finance:paid-payment:read') || hasUiPermission('finance:water-receipt:read') || hasUiPermission('finance:water-match:read') || hasUiPermission('finance:agent-bill:read');
  const canRestoreReviewShipment = hasUiPermission('business:review:restore');
  const canPurgeReviewShipment = hasUiPermission('business:review:purge');
  const [financeDashboard, setFinanceDashboard] = useState<FinanceDashboardResponse | null>(null);
  const [financeDashboardLoading, setFinanceDashboardLoading] = useState(false);
  const [financeDashboardError, setFinanceDashboardError] = useState<string | null>(null);
  const loadPendingReviewRows = useCallback(async () => {
    setPendingReviewLoading(true);
    try {
      const rows = await apiClient.reviewPendingShipments();
      setPendingReviewRows(rows);
      setFinanceReviewSelectedShipmentId((current) => current && rows.some((row) => row.id === current) ? current : null);
    } catch (error) {
      modal.error({
        title: '待审核列表加载失败',
        content: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setPendingReviewLoading(false);
    }
  }, [apiClient, modal]);
  const loadDeletedReviewRows = useCallback(async () => {
    if (!canRestoreReviewShipment) return;
    setDeletedReviewLoading(true);
    try {
      const rows = await apiClient.reviewDeletedShipments();
      setDeletedReviewRows(rows);
      setFinanceReviewSelectedShipmentId((current) => current && rows.some((row) => row.id === current) ? current : null);
    } catch (error) {
      modal.error({
        title: '已删除订单加载失败',
        content: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setDeletedReviewLoading(false);
    }
  }, [apiClient, canRestoreReviewShipment, modal]);
  const loadOrderEntryDraftRows = useCallback(async () => {
    setOrderEntryDraftLoading(true);
    try {
      const rows = await apiClient.orderEntryDrafts();
      setOrderEntryDraftRows(rows);
    } catch (error) {
      modal.error({
        title: '录单草稿加载失败',
        content: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setOrderEntryDraftLoading(false);
    }
  }, [apiClient, modal]);
  const refreshBusinessDashboard = useCallback(async () => {
    setBusinessDashboardRefreshing(true);
    try {
      await Promise.all([loadOrderEntryDraftRows(), loadPendingReviewRows()]);
      setBusinessDashboardUpdatedAt(new Date().toISOString());
    } finally {
      setBusinessDashboardRefreshing(false);
    }
  }, [loadOrderEntryDraftRows, loadPendingReviewRows]);
  useEffect(() => {
    if (activeFinanceSection === 'business-dashboard') {
      void refreshBusinessDashboard();
    }
  }, [activeFinanceSection, refreshBusinessDashboard]);
  const filterReviewRows = useCallback((baseRows: Shipment[]) => {
    const includes = (value: string | undefined, keyword: string) => !keyword || (value ?? '').toLowerCase().includes(keyword.toLowerCase());
    const inDateRange = (value: string, from: string, to: string) => {
      const timestamp = new Date(value).getTime();
      return isTimestampInBeijingDateRange(new Date(timestamp), from, to);
    };
    return baseRows.filter((shipment) => {
      const customerCode = shipment.customerCode || shipment.customerName.split('-')[0];
      const keyword = financeReviewFilters.keyword;
      return inDateRange(shipment.createdAt, financeReviewFilters.createdFrom, financeReviewFilters.createdTo)
        && includes(customerCode, financeReviewFilters.customerCode)
        && includes(shipment.customerName, financeReviewFilters.customerName)
        && includes(shipment.salesperson, financeReviewFilters.salesperson)
        && includes(shipment.systemOrderNo, financeReviewFilters.systemOrderNo)
        && includes(shipment.destinationCountry, financeReviewFilters.destinationCountry)
        && includes(shipment.channelName || shipment.carrier, financeReviewFilters.channelName)
        && (financeReviewFilters.customs === 'ALL' || String(Boolean(shipment.declarationRequired)) === financeReviewFilters.customs)
        && (financeReviewFilters.sensitive === 'ALL' || String(Boolean(shipment.sensitive)) === financeReviewFilters.sensitive)
        && (financeReviewFilters.overdue === 'ALL' || String(Date.now() - new Date(shipment.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000) === financeReviewFilters.overdue)
        && (!keyword || [customerCode, shipment.customerName, shipment.systemOrderNo, shipment.customerOrderNo, shipment.transferNo, shipment.destinationCountry, shipment.channelName].some((value) => includes(value, keyword)));
    });
  }, [financeReviewFilters]);
  const pendingReviewShipments = useMemo(
    () => filterReviewRows(pendingReviewRows),
    [filterReviewRows, pendingReviewRows]
  );
  const deletedReviewShipments = useMemo(
    () => filterReviewRows(deletedReviewRows),
    [deletedReviewRows, filterReviewRows]
  );
  const currentReviewRows = pendingReviewView === 'DELETED' ? deletedReviewShipments : pendingReviewShipments;
  const selectedPendingReviewShipment = financeReviewSelectedShipmentId
    ? [...pendingReviewShipments, ...deletedReviewShipments].find((shipment) => shipment.id === financeReviewSelectedShipmentId)
      ?? (pendingReviewDetail?.shipment.id === financeReviewSelectedShipmentId ? pendingReviewDetail.shipment : null)
    : null;
  const canBusinessReviewShipment = pendingReviewView === 'ACTIVE' && hasUiPermission('business:review:approve');
  const loadPendingReviewDetail = useCallback(async (shipmentId: string) => {
    setPendingReviewDetailLoading(true);
    try {
      const detail = await apiClient.shipmentReviewDetail(shipmentId);
      setPendingReviewDetail(detail);
    } catch (error) {
      setPendingReviewDetail(null);
      modal.error({
        title: '待审核详情加载失败',
        content: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setPendingReviewDetailLoading(false);
    }
  }, [apiClient, modal]);
  useEffect(() => {
    if (activeFinanceSection === 'pending-review' && pendingReviewView === 'ACTIVE') {
      void loadPendingReviewRows();
    }
    if (activeFinanceSection === 'pending-review' && pendingReviewView === 'DELETED') {
      void loadDeletedReviewRows();
    }
  }, [activeFinanceSection, loadDeletedReviewRows, loadPendingReviewRows, pendingReviewView]);
  useEffect(() => {
    if (activeFinanceSection === 'order-entry-drafts') {
      void loadOrderEntryDraftRows();
    }
  }, [activeFinanceSection, loadOrderEntryDraftRows]);
  useEffect(() => {
    setFinanceReviewSelectedShipmentId(null);
    setPendingReviewDetail(null);
  }, [pendingReviewView]);
  useEffect(() => {
    if (!financeReviewSelectedShipmentId || !currentReviewRows.some((shipment) => shipment.id === financeReviewSelectedShipmentId)) {
      setPendingReviewDetail(null);
    }
  }, [currentReviewRows, financeReviewSelectedShipmentId]);
  useEffect(() => {
    if (activeFinanceSection === 'pending-review' && financeReviewSelectedShipmentId) {
      void loadPendingReviewDetail(financeReviewSelectedShipmentId);
    }
  }, [activeFinanceSection, financeReviewSelectedShipmentId, loadPendingReviewDetail]);
  const formatPendingReviewValue = (value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return '-';
    return String(value);
  };
  const formatPendingReviewWeight = (value?: number | null) => (typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(3)} kg`
    : '-');
  const formatPendingReviewMoney = (amount?: number | null, currency = 'RMB') => {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return '-';
    return currency === 'USD' ? `USD ${amount.toFixed(2)}` : formatCurrency(amount);
  };
  const getPendingReviewWeight = (shipment?: Shipment | null) => shipment?.weightKg ?? shipment?.receivableWeightKg;
  const getPendingReviewChargeableWeight = (shipment?: Shipment | null) => shipment?.chargeableWeightKg ?? shipment?.receivableWeightKg ?? shipment?.agentWeightKg;
  const renderPendingReviewReceivable = (shipment: Shipment) => shipment.receivableRmbTotalError
    ? <Text type="danger">{shipment.receivableRmbTotalError}</Text>
    : formatPendingReviewMoney(shipment.receivableRmbTotal);
  const getPendingReviewCustomerCode = (shipment?: Shipment | null) => {
    return shipment?.customerCode || shipment?.customerName?.split('-')[0]?.trim() || '-';
  };
  const getPendingReviewCustomer = (shipment?: Shipment | null) => {
    if (!shipment) return '-';
    return `${getPendingReviewCustomerCode(shipment)} / ${getCustomerDisplayName(shipment)}`;
  };
  const getPendingReviewChannel = (shipment?: Shipment | null) => formatPendingReviewValue(shipment?.channelName || shipment?.carrier);
  const detailShipment = pendingReviewDetail?.shipment ?? selectedPendingReviewShipment;
  const canDirectEditPendingReview = Boolean(
    pendingReviewView === 'ACTIVE'
    && detailShipment
    && ['DRAFT', 'REVIEW_PENDING', 'REVIEW_REJECTED'].includes(detailShipment.status)
    && hasUiPermission('business:shipment:update-basic')
  );
  const pendingReviewBusinessCosts = pendingReviewDetail?.finance.businessCosts ?? [];
  const pendingReviewFormulaCost = pendingReviewBusinessCosts.find((item) => item.chargeWeightKg && item.unitPrice);
  const pendingReviewBusinessCostTotal = pendingReviewDetail?.finance.businessCostTotal
    ?? pendingReviewBusinessCosts.reduce((sum, item) => sum + item.amount, 0);
  const pendingReviewOtherBusinessCostTotal = pendingReviewFormulaCost
    ? pendingReviewBusinessCosts
      .filter((item) => item.id !== pendingReviewFormulaCost.id)
      .reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const pendingReviewPriceText = pendingReviewFormulaCost?.chargeWeightKg && pendingReviewFormulaCost.unitPrice
    ? `${pendingReviewFormulaCost.chargeWeightKg.toFixed(3)}×${pendingReviewFormulaCost.unitPrice.toFixed(2)}${pendingReviewOtherBusinessCostTotal ? `+其他${formatPendingReviewMoney(pendingReviewOtherBusinessCostTotal, pendingReviewFormulaCost.currency)}` : ''}=${formatPendingReviewMoney(pendingReviewBusinessCostTotal, pendingReviewFormulaCost.currency)}`
    : formatPendingReviewMoney(pendingReviewBusinessCostTotal, pendingReviewBusinessCosts[0]?.currency);
  const pendingReviewSummaryItems = [
    { label: '客户编号', value: getPendingReviewCustomerCode(detailShipment) },
    { label: '产品名称', value: formatPendingReviewValue(detailShipment?.productName) },
    { label: '目的地', value: formatPendingReviewValue(detailShipment?.destinationCountry) },
    { label: '件数', value: formatPendingReviewValue(detailShipment?.packageCount) },
    { label: '重量', value: formatPendingReviewWeight(getPendingReviewWeight(detailShipment)) },
    { label: '体积', value: detailShipment?.volumeCbm ? `${detailShipment.volumeCbm.toFixed(3)} m³` : '-' },
    { label: '计费重', value: formatPendingReviewWeight(getPendingReviewChargeableWeight(detailShipment)) },
    { label: '货物数据来源', value: detailShipment?.cargoDataSource === 'MANUAL_ADJUSTED' ? '手动调整' : '自动匹配' },
    { label: '是否报关', value: detailShipment?.declarationRequired ? '是' : '否' },
    { label: '是否敏感', value: detailShipment?.sensitive ? '是' : '否' },
    { label: '渠道', value: getPendingReviewChannel(detailShipment) },
    { label: '价格', value: pendingReviewDetail ? pendingReviewPriceText : '-' },
    { label: '出货单号', value: formatPendingReviewValue(detailShipment?.systemOrderNo) }
  ];
  const pendingReviewSummaryText = [
    getPendingReviewCustomerCode(detailShipment),
    formatPendingReviewValue(detailShipment?.productName),
    formatPendingReviewValue(detailShipment?.destinationCountry),
    formatPendingReviewValue(detailShipment?.packageCount),
    formatPendingReviewWeight(getPendingReviewWeight(detailShipment)),
    detailShipment?.volumeCbm ? `${detailShipment.volumeCbm.toFixed(3)}CBM` : '-',
    formatPendingReviewWeight(getPendingReviewChargeableWeight(detailShipment)),
    detailShipment?.declarationRequired ? '是' : '否',
    detailShipment?.sensitive ? '是' : '否',
    getPendingReviewChannel(detailShipment),
    pendingReviewDetail ? pendingReviewPriceText : '-',
    formatPendingReviewValue(detailShipment?.systemOrderNo)
  ].join('——');
  const canViewReviewSensitiveFields = role === 'ADMIN' || role === 'FINANCE' || role === 'UG_FINANCE' || role === 'BOSS' || role === 'OWNER';
  const renderShipmentCargoData = (shipment?: Shipment | null) => [
    `件数 ${formatPendingReviewValue(shipment?.packageCount)}`,
    `实重 ${formatPendingReviewWeight(getPendingReviewWeight(shipment))}`,
    `体积 ${shipment?.volumeCbm ? `${shipment.volumeCbm.toFixed(3)} m³` : '-'}`,
    `计费重 ${formatPendingReviewWeight(getPendingReviewChargeableWeight(shipment))}`,
    `来源 ${shipment?.cargoDataSource === 'MANUAL_ADJUSTED' ? '手动调整' : '自动匹配'}`
  ].join(' / ');
  const copyPendingReviewSummary = async () => {
    if (!selectedPendingReviewShipment) return;
    try {
      await window.navigator.clipboard?.writeText(pendingReviewSummaryText);
      messageApi.success('摘要已复制');
    } catch {
      messageApi.warning('当前浏览器不支持自动复制');
    }
  };
  const isPendingReviewOverdue = (shipment: Shipment) => {
    const createdAt = new Date(shipment.createdAt).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt > 3 * 24 * 60 * 60 * 1000;
  };
  const refreshPendingReviewWorkbench = async (detail?: ShipmentReviewDetailSummary) => {
    if (detail) {
      setPendingReviewDetail(detail);
    }
    if (pendingReviewView === 'DELETED') {
      await loadDeletedReviewRows();
    } else {
      await loadPendingReviewRows();
    }
  };
  const getPendingReviewBasicFormValues = (shipment?: Shipment | null): ShipmentReviewBasicUpdateInput | undefined => {
    if (!shipment) return undefined;
    return {
      customerCode: getPendingReviewCustomerCode(shipment),
      customerOrderNo: shipment.customerOrderNo,
      companyChannelName: getPendingReviewChannel(shipment),
      inboundNo: shipment.inboundNo,
      productName: shipment.productName ?? '',
      destinationCountry: shipment.destinationCountry ?? '',
      declarationRequired: Boolean(shipment.declarationRequired),
      cargoType: shipment.cargoType ?? '',
      subOrderNo: shipment.subOrderNo,
      fbaInboundNo: shipment.fbaInboundNo,
      settlementMethod: shipment.settlementMethod ?? '',
      remark: shipment.remark,
      receiverName: shipment.receiverName,
      receiverCompany: shipment.receiverCompany,
      receiverPhone: shipment.receiverPhone,
      receiverAddress: shipment.receiverAddress,
      receiverCountry: shipment.receiverCountry,
      receiverState: shipment.receiverState,
      receiverPostalCode: shipment.receiverPostalCode,
      fbaWarehouseCode: shipment.fbaWarehouseCode
    };
  };
  const pendingReviewBasicInitialValues = useMemo(
    () => getPendingReviewBasicFormValues(detailShipment),
    [detailShipment]
  );
  const savePendingReviewBasic = async (values: ShipmentReviewBasicUpdateInput) => {
    if (!detailShipment) return;
    setPendingReviewBasicSubmitting(true);
    try {
      const detail = await apiClient.updateShipmentReviewBasic(detailShipment.id, values);
      await refreshPendingReviewWorkbench(detail);
      messageApi.success('待审核资料已保存');
    } catch (error) {
      modal.error({ title: '保存修改失败', content: error instanceof Error ? error.message : '请检查填写内容后重试' });
    } finally {
      setPendingReviewBasicSubmitting(false);
    }
  };
  const returnToPendingReviewList = () => {
    setFinanceReviewSelectedShipmentId(null);
    setPendingReviewDetail(null);
  };
  const approvePendingReview = (target = selectedPendingReviewShipment) => {
    if (!target) return;
    confirmDangerousAction({
      title: '确认自审通过该订单？',
      content: '自审通过后，订单进入待排货，并同步进入财务管理的业务成本审核。',
      okText: '自审通过',
      confirm: modal.confirm,
      onOk: async () => {
        setPendingReviewSubmitting(true);
        try {
          const detail = await apiClient.approveShipmentReview(target.id, { businessReview: true });
          messageApi.success('自审通过，已进入待排货与业务成本审核');
          setFinanceReviewSelectedShipmentId(null);
          setPendingReviewDetail(null);
          try {
            await refreshPendingReviewWorkbench(detail);
          } catch {
            messageApi.warning('数据已提交成功，但页面刷新失败，请手动刷新');
          }
        } catch (error) {
          modal.error({ title: '自审通过失败', content: error instanceof Error ? error.message : '请补齐资料后重试' });
        } finally {
          setPendingReviewSubmitting(false);
        }
      }
    });
  };
  const handleOrderEntryCreated = async (detail?: OrderEntryDetailSummary, submittedForReview?: boolean) => {
    setEditingOrderEntryDraftId(undefined);
    setEditingOrderEntryDraftDetail(undefined);
    try {
      await Promise.all([loadPendingReviewRows(), loadOrderEntryDraftRows()]);
    } catch {
      messageApi.warning('数据已提交成功，但页面刷新失败，请手动刷新');
    }
    // 提交审核只刷新当前工作台数据；是否前往待审核运单由用户主动决定。
    if (submittedForReview && detail) {
      setPendingReviewDetail(null);
      setFinanceReviewSelectedShipmentId(null);
    }
  };
  const deletePendingReview = (target = selectedPendingReviewShipment) => {
    if (!target) return;
    let reason = '';
    modal.confirm({
      title: '永久删除待审核订单？',
      content: (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Typography.Text>订单 {target.systemOrderNo || target.customerOrderNo} 删除后不可恢复，相关待审核费用和包裹关联将同步清理，审计日志仍会保留。</Typography.Text>
          <Input.TextArea rows={3} placeholder="请填写永久删除原因" onChange={(event) => { reason = event.target.value; }} />
        </Space>
      ),
      okText: '永久删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
          messageApi.warning('永久删除必须填写原因');
          throw new Error('永久删除必须填写原因');
        }
        await apiClient.deleteShipmentReview(target.id, { reason: trimmedReason });
        setPendingReviewRows((current) => current.filter((row) => row.id !== target.id));
        messageApi.success('订单已永久删除');
        setFinanceReviewSelectedShipmentId(null);
        setPendingReviewDetail(null);
        await refreshPendingReviewWorkbench();
      }
    });
  };
  const openRestoreReviewShipment = (shipment: Shipment) => {
    reviewRestoreForm.resetFields();
    reviewRestoreForm.setFieldsValue({ mode: 'KEEP_ORIGINAL_TIME' });
    setReviewRestoreTarget(shipment);
  };
  const submitRestoreReviewShipment = async () => {
    if (!reviewRestoreTarget) return;
    const values = await reviewRestoreForm.validateFields();
    setReviewRestoreSubmitting(true);
    try {
      const detail = await apiClient.restoreShipment(reviewRestoreTarget.id, {
        mode: values.mode,
        manualCreatedAt: values.mode === 'MANUAL_TIME' && values.manualCreatedAt ? parseBeijingDateTimeInputToIso(values.manualCreatedAt) : undefined,
        reason: values.reason
      });
      messageApi.success('订单已恢复');
      setReviewRestoreTarget(null);
      setFinanceReviewSelectedShipmentId(null);
      setPendingReviewDetail(null);
      await refreshPendingReviewWorkbench(detail);
    } catch (error) {
      modal.error({ title: '恢复失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setReviewRestoreSubmitting(false);
    }
  };
  const purgeReviewShipment = (shipment: Shipment) => {
    confirmDangerousAction({
      title: '确认彻底删除该订单？',
      content: '彻底删除后不可恢复，仅管理员可执行。请确认该订单没有后续财务、仓库或付款流转。',
      okText: '彻底删除',
      confirm: modal.confirm,
      onOk: async () => {
        await apiClient.permanentlyDeleteShipmentReview(shipment.id);
        messageApi.success('订单已彻底删除');
        setFinanceReviewSelectedShipmentId(null);
        setPendingReviewDetail(null);
        await loadDeletedReviewRows();
      }
    });
  };
  const renderReviewKeyValues = (items: Array<[string, ReactNode]>) => (
    <Descriptions size="small" column={2} bordered items={items.map(([label, children]) => ({ key: label, label, children: children || '-' }))} />
  );
  const renderReviewFieldPanel = (title: string, items: Array<[string, ReactNode]>) => (
    <section className="finance-detail-field-panel">
      <div className="finance-detail-field-title">{title}</div>
      <Descriptions
        size="small"
        column={1}
        bordered
        items={items.map(([label, children]) => ({ key: label, label, children: children || '-' }))}
      />
    </section>
  );
  const renderPendingReviewTwoColumnDetail = (shipment?: Shipment | null) => {
    if (canDirectEditPendingReview) {
      return (
        <Form
          key={`${shipment?.id ?? ''}:${shipment?.customerOrderNo ?? ''}:${shipment?.productName ?? ''}:${shipment?.channelName ?? ''}`}
          id="pending-review-basic-edit"
          form={pendingReviewBasicForm}
          initialValues={pendingReviewBasicInitialValues}
          layout="vertical"
          onFinish={savePendingReviewBasic}
        >
          <div className="finance-detail-two-column-layout">
            <div className="finance-detail-column">
              <section className="finance-detail-field-panel">
                <div className="finance-detail-field-title">录入与货物</div>
                <Descriptions
                  size="small"
                  column={1}
                  bordered
                  items={[
                    { key: 'entryAt', label: '运单录入日期', children: shipment?.createdAt ? formatBeijingDateTime(shipment.createdAt) : '-' },
                    { key: 'cargoData', label: '货物数据', children: renderShipmentCargoData(shipment) },
                    { key: 'transferNo', label: '转单号', children: shipment?.transferNo || '-' }
                  ]}
                />
                <Row gutter={12}>
                  <Col xs={24} md={12}><Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请选择客户' }]}><Select showSearch optionFilterProp="label" options={customers.filter((customer) => customer.enabled).map((customer) => ({ value: customer.code, label: `${customer.code} - ${customer.name}` }))} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="customerOrderNo" label="客户单号" rules={[{ required: true, message: '请填写客户单号' }]}><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="companyChannelName" label="公司渠道" rules={[{ required: true, message: '请填写公司渠道' }]}><Input placeholder="填写已启用的公司渠道名称" /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="inboundNo" label="入仓号"><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="productName" label="品名" rules={[{ required: true, message: '请填写品名' }]}><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="fbaWarehouseCode" label="FBA 仓库代码"><Input /></Form.Item></Col>
                </Row>
              </section>
              <section className="finance-detail-field-panel">
                <div className="finance-detail-field-title">收货信息</div>
                <Row gutter={12}>
                  <Col xs={24} md={12}><Form.Item name="receiverName" label="收货人名称"><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="receiverCompany" label="收货人公司名称"><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="receiverPhone" label="收货人电话"><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="receiverCountry" label="国家"><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="receiverState" label="州/省"><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name="receiverPostalCode" label="邮编"><Input /></Form.Item></Col>
                  <Col xs={24}><Form.Item name="receiverAddress" label="收货人地址"><Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} /></Form.Item></Col>
                </Row>
              </section>
            </div>
            <section className="finance-detail-field-panel">
              <div className="finance-detail-field-title">出库与审核</div>
              <Descriptions
                size="small"
                column={1}
                bordered
                items={[
                  { key: 'outboundAt', label: '出库日期', children: shipment?.outboundAt ? formatBeijingDateTime(shipment.outboundAt) : '-' },
                  ...(canViewReviewSensitiveFields ? [{ key: 'agentName', label: agentFieldLabels.detailedCompanyName, children: shipment?.agentName || '-' }] : []),
                  { key: 'reviewedAt', label: '应收审核日期', children: shipment?.reviewedAt ? formatBeijingDateTime(shipment.reviewedAt) : '-' },
                  ...(canViewReviewSensitiveFields ? [{ key: 'businessReviewedAt', label: '业务成本审核日期', children: shipment?.businessReviewedAt ? formatBeijingDateTime(shipment.businessReviewedAt) : '-' }] : [])
                ]}
              />
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item name="destinationCountry" label="目的地" rules={[{ required: true, message: '请填写目的地' }]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="declarationRequired" label="报关" rules={[{ required: true, message: '请选择报关' }]}><Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="cargoType" label="货物类型" rules={[{ required: true, message: '请填写货物类型' }]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="subOrderNo" label="分单号"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="fbaInboundNo" label="FBA 入仓单号"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="settlementMethod" label="结算方式" rules={[{ required: true, message: '请填写结算方式' }]}><Input /></Form.Item></Col>
                <Col xs={24}><Form.Item name="remark" label="备注"><Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} /></Form.Item></Col>
              </Row>
            </section>
          </div>
        </Form>
      );
    }
    return (
    <div className="finance-detail-two-column-layout">
      {renderReviewFieldPanel('录入与货物', [
        ['运单录入日期', shipment?.createdAt ? formatBeijingDateTime(shipment.createdAt) : '-'],
        ['客户编号', getPendingReviewCustomerCode(shipment)],
        ['客户名称', shipment ? getCustomerDisplayName(shipment) : '-'],
        ['客户单号', shipment?.customerOrderNo],
        ['公司渠道', getPendingReviewChannel(shipment)],
        ['转单号', shipment?.transferNo],
        ['入仓号', shipment?.inboundNo],
        ['品名', shipment?.productName],
        ['货物数据', renderShipmentCargoData(shipment)],
        ['收货人名称', shipment?.receiverName],
        ['FBA仓库代码', shipment?.fbaWarehouseCode],
        ['国家', shipment?.receiverCountry],
        ['收货人公司名称', shipment?.receiverCompany],
        ['收货人地址', shipment?.receiverAddress],
        ['州/省', shipment?.receiverState]
      ])}
      {renderReviewFieldPanel('出库与审核', [
        ['出库日期', shipment?.outboundAt ? formatBeijingDateTime(shipment.outboundAt) : '-'],
        ['目的地', shipment?.destinationCountry],
        ['报关', shipment?.declarationRequired ? '是' : '否'],
        ['货物类型', shipment?.cargoType],
        ...(canViewReviewSensitiveFields ? [[agentFieldLabels.detailedCompanyName, shipment?.agentName] as [string, ReactNode]] : []),
        ['分单号', shipment?.subOrderNo],
        ['FBA 入仓单号', shipment?.fbaInboundNo],
        ['结算方式', shipment?.settlementMethod],
        ['备注', shipment?.remark],
        ['应收审核日期', shipment?.reviewedAt ? formatBeijingDateTime(shipment.reviewedAt) : '-'],
        ...(canViewReviewSensitiveFields ? [
          ['业务成本审核日期', shipment?.businessReviewedAt ? formatBeijingDateTime(shipment.businessReviewedAt) : '-'] as [string, ReactNode],
          ['应付审核日期', '-'] as [string, ReactNode]
        ] : []),
        ['收货人电话', shipment?.receiverPhone],
        ['邮编', shipment?.receiverPostalCode]
      ])}
    </div>
    );
  };
  const reviewPackageColumns: ManagedTableColumns<ShipmentReviewPackageSummary> = [
    { title: '包裹ID', dataIndex: 'warehousePackageId', width: 160, render: (value?: string) => value || '-' },
    { title: '客户单号', dataIndex: 'customerOrderNo', width: 150 },
    { title: '国内单号', dataIndex: 'domesticTrackingNo', width: 150, render: (value?: string) => value || '-' },
    { title: '箱/包裹号', dataIndex: 'packageNo', width: 140, render: (value?: string) => value || '-' },
    { title: '件数', dataIndex: 'packageCount', width: 80 },
    { title: '实重', dataIndex: 'weightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '长宽高', key: 'dims', width: 130, sortValue: (row) => row.lengthCm * row.widthCm * row.heightCm, render: (_, row) => `${row.lengthCm}×${row.widthCm}×${row.heightCm}` },
    { title: '体积', dataIndex: 'cbm', width: 100, render: (value: number) => `${value.toFixed(3)} m³` },
    { title: '材积重', dataIndex: 'volumetricWeightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '入仓时间', dataIndex: 'inboundAt', width: 160, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    { title: '异常', dataIndex: 'exceptions', width: 160, render: (items: string[]) => items.length ? items.join('、') : '-' }
  ];
  const reviewEventColumns: ColumnsType<ShipmentReviewEventSummary> = [
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
    { title: '阶段', dataIndex: 'stage', width: 110, render: (value: string | undefined, row) => value || (row.toStatus ? shipmentStatusLabels[row.toStatus] : '-') },
    { title: '操作人', dataIndex: 'operator', width: 110, render: (value?: string) => value || '系统' },
    { title: '来源模块', dataIndex: 'sourceModule', width: 120, render: (value?: string) => value || '-' },
    { title: '动作', dataIndex: 'action', width: 120, render: (value: string | undefined, row) => value || row.title },
    { title: '内容', dataIndex: 'note', render: (value: string | undefined, row) => value || (row.toStatus ? `${row.fromStatus ? shipmentStatusLabels[row.fromStatus] : '-'} -> ${shipmentStatusLabels[row.toStatus]}` : '-') }
  ];
  const logisticsTrackingColumns: ColumnsType<ShipmentLogisticsTrackingEventSummary> = [
    { title: '轨迹时间', dataIndex: 'trackingAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
    { title: '物流节点', dataIndex: 'node', width: 140 },
    { title: '地点', dataIndex: 'location', width: 120, render: (value?: string) => value || '-' },
    { title: '承运商', dataIndex: 'carrier', width: 120, render: (value?: string) => value || '-' },
    { title: '转单号 / 物流单号', dataIndex: 'transferNo', width: 180, render: (value?: string) => value || '-' },
    { title: '原始内容', dataIndex: 'rawContent', width: 220, render: (value?: string) => value || '-' },
    { title: '来源', dataIndex: 'source', width: 120 }
  ];
  const pendingReviewColumns: ManagedTableColumns<Shipment> = [
    { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 165, render: (value: string) => formatBeijingDateTime(value) },
    { title: '客户编号', key: 'customerCode', width: 110, render: (_, record) => getPendingReviewCustomerCode(record) },
    {
      title: '客户名称',
      key: 'customerName',
      dataIndex: 'customerName',
      width: 185,
      render: (_: string, record) => <Text strong>{getCustomerDisplayName(record)}</Text>
    },
    { title: '业务员', key: 'salesperson', dataIndex: 'salesperson', width: 120, render: (value?: string) => formatPendingReviewValue(value) },
    {
      title: '出货单号',
      key: 'systemOrderNo',
      dataIndex: 'systemOrderNo',
      width: 180,
      render: (value: string, record) => (
        <Button
          type="link"
          className="finance-pending-order-button"
          onClick={(event) => {
            event.stopPropagation();
            setFinanceReviewSelectedShipmentId(record.id);
          }}
        >
          {formatPendingReviewValue(value)}
        </Button>
      )
    },
    { title: '目的地', key: 'destinationCountry', dataIndex: 'destinationCountry', width: 110, render: (value?: string) => formatPendingReviewValue(value) },
    { title: '公司渠道', key: 'channelName', dataIndex: 'channelName', width: 150, render: (_: string, record) => getPendingReviewChannel(record) },
    {
      title: '货物数据',
      key: 'cargoData',
      children: [
        { title: '重量', key: 'weightKg', width: 105, render: (_, record) => formatPendingReviewWeight(getPendingReviewWeight(record)) },
        { title: '体积', key: 'volumeCbm', dataIndex: 'volumeCbm', width: 105, render: (value?: number) => typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(3)} CBM` : '-' },
        { title: '件数', key: 'packageCount', dataIndex: 'packageCount', width: 80, render: (value?: number) => formatPendingReviewValue(value) },
        { title: '计费重', key: 'chargeableWeightKg', width: 105, render: (_, record) => formatPendingReviewWeight(getPendingReviewChargeableWeight(record)) }
      ]
    },
    { title: '应收', key: 'receivableRmbTotal', width: 120, align: 'right', render: (_, record) => renderPendingReviewReceivable(record) },
    { title: '产品名称', key: 'productName', dataIndex: 'productName', width: 150, render: (value?: string) => formatPendingReviewValue(value) },
    { title: '报关', key: 'declarationRequired', dataIndex: 'declarationRequired', width: 90, render: (value?: boolean) => value ? '是' : '否' },
    { title: '敏感', key: 'sensitive', dataIndex: 'sensitive', width: 90, render: (value?: boolean) => value ? '是' : '否' },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      width: 105,
      render: (value: ShipmentStatus) => <Tag color="gold">{shipmentStatusLabels[value] ?? formatPendingReviewValue(value)}</Tag>
    },
    {
      title: '超时标记',
      key: 'overdue',
      width: 110,
      render: (_, record) => (isPendingReviewOverdue(record) ? <Tag color="red">超时</Tag> : <Tag color="green">正常</Tag>)
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 170,
      render: (_, record) => pendingReviewView === 'DELETED' ? (
        <Space size={4} wrap>
          <Button size="small" onClick={(event) => { event.stopPropagation(); setFinanceReviewSelectedShipmentId(record.id); }}>详情</Button>
          {canRestoreReviewShipment ? <Button size="small" onClick={(event) => { event.stopPropagation(); openRestoreReviewShipment(record); }}>恢复</Button> : null}
          {canPurgeReviewShipment ? <Button size="small" danger onClick={(event) => { event.stopPropagation(); purgeReviewShipment(record); }}>彻底删除</Button> : null}
        </Space>
      ) : (
        <Space size={4} wrap>
          <Button size="small" onClick={(event) => { event.stopPropagation(); setFinanceReviewSelectedShipmentId(record.id); }}>详情</Button>
          {canBusinessReviewShipment && !record.businessReviewedAt ? <Button size="small" type="primary" onClick={(event) => { event.stopPropagation(); approvePendingReview(record); }}>自审通过</Button> : null}
          {hasUiPermission('business:review:delete') ? <Button size="small" danger onClick={(event) => { event.stopPropagation(); deletePendingReview(record); }}>删除</Button> : null}
        </Space>
      )
    }
  ];
  const pendingReviewMatrixColumns: ManagedTableColumns<Shipment> = [
    {
      title: '信息',
      key: 'matrixInformation',
      width: 960,
      className: 'managed-matrix-group-primary',
      render: (_, record) => (
        <ManagedMatrixCell
          columns={4}
          labelWidth={66}
          fields={[
            { key: 'createdAt', label: '创建时间', value: <ManagedMatrixDateTime value={formatBeijingDateTime(record.createdAt)} /> },
            { key: 'systemOrderNo', label: '出货单号', value: <Button type="link" className="finance-pending-order-button" onClick={(event) => { event.stopPropagation(); setFinanceReviewSelectedShipmentId(record.id); }}>{formatPendingReviewValue(record.systemOrderNo)}</Button> },
            { key: 'customerCode', label: '客户编号', value: getPendingReviewCustomerCode(record) },
            { key: 'customerName', label: '客户名称', value: <Text strong>{getCustomerDisplayName(record)}</Text>, title: getCustomerDisplayName(record) },
            { key: 'salesperson', label: '业务员', value: formatPendingReviewValue(record.salesperson) },
            { key: 'destinationCountry', label: '目的地', value: formatPendingReviewValue(record.destinationCountry) },
            { key: 'channelName', label: '公司渠道', value: getPendingReviewChannel(record), title: getPendingReviewChannel(record) },
            { key: 'packageCount', label: '件数', value: formatPendingReviewValue(record.packageCount) },
            { key: 'weightKg', label: '重量', value: formatPendingReviewWeight(getPendingReviewWeight(record)) },
            { key: 'volumeCbm', label: '体积', value: typeof record.volumeCbm === 'number' && Number.isFinite(record.volumeCbm) ? `${record.volumeCbm.toFixed(3)} CBM` : '-' },
            { key: 'chargeableWeightKg', label: '计费重', value: formatPendingReviewWeight(getPendingReviewChargeableWeight(record)) },
            { key: 'receivableRmbTotal', label: '应收', value: <Text strong>{renderPendingReviewReceivable(record)}</Text> },
            { key: 'productName', label: '产品名称', value: formatPendingReviewValue(record.productName), title: record.productName },
            { key: 'declarationRequired', label: '报关', value: record.declarationRequired ? '是' : '否' },
            { key: 'sensitive', label: '敏感', value: record.sensitive ? '是' : '否' },
            { key: 'status', label: '状态', value: <Tag color="gold">{shipmentStatusLabels[record.status] ?? formatPendingReviewValue(record.status)}</Tag> },
            { key: 'overdue', label: '超时标记', value: isPendingReviewOverdue(record) ? <Tag color="red">超时</Tag> : <Tag color="green">正常</Tag> }
          ]}
        />
      )
    },
    { ...pendingReviewColumns[pendingReviewColumns.length - 1], key: 'actions', width: 170, fixed: 'right' }
  ];
  const getDraftBusinessCostTotal = (shipment: Shipment) => businessCostAudits
    .filter((fee) => fee.shipmentId === shipment.id && !fee.voided)
    .reduce((sum, fee) => sum + fee.amount, 0);
  const continueOrderEntryDraft = async (shipment: Shipment) => {
    if (!canContinueOrderEntryDraft) {
      modal.warning({
        title: '当前账号不能编辑草稿',
        content: '继续编辑需要“进入录单页面、查看录单草稿、保存录单草稿”三项权限。'
      });
      return;
    }
    setOpeningOrderEntryDraftId(shipment.id);
    try {
      const detail = await apiClient.orderEntryDetail(shipment.id);
      if (!['DRAFT', 'REVIEW_REJECTED'].includes(detail.shipment.status)) {
        messageApi.warning('该草稿状态已变化，不能继续编辑。');
        await loadOrderEntryDraftRows();
        return;
      }
      setEditingOrderEntryDraftDetail(detail);
      setEditingOrderEntryDraftId(shipment.id);
      syncBusinessSectionRoute('finance-entry');
      setActiveFinanceSection('finance-entry');
    } catch (error) {
      modal.error({ title: '草稿无法继续编辑', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setOpeningOrderEntryDraftId(undefined);
    }
  };
  const deleteOrderEntryDraft = (shipment: Shipment) => {
    modal.confirm({
      title: '删除录单草稿',
      content: `确认删除草稿 ${shipment.systemOrderNo}？删除后已占用的仓库货物会释放。`,
      okText: '删除草稿',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await apiClient.deleteOrderEntryDraft(shipment.id, { reason: '录单草稿箱删除' });
        messageApi.success('草稿已删除');
        if (editingOrderEntryDraftId === shipment.id) {
          setEditingOrderEntryDraftId(undefined);
          setEditingOrderEntryDraftDetail(undefined);
        }
        await loadOrderEntryDraftRows();
        await loadPendingReviewRows();
      }
    });
  };
  const orderEntryDraftColumns: ManagedTableColumns<Shipment> = [
    { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 165, render: (value: string) => formatBeijingDateTime(value) },
    { title: '客户编号/名称', key: 'customer', width: 210, sortValue: (record) => `${record.customerCode ?? ''}|${record.customerName ?? ''}`, render: (_, record) => getPendingReviewCustomer(record) },
    { title: '客户单号', key: 'customerOrderNo', dataIndex: 'customerOrderNo', width: 150, render: (value?: string) => formatPendingReviewValue(value) },
    { title: '出货单号/草稿号', key: 'systemOrderNo', dataIndex: 'systemOrderNo', width: 170, render: (value?: string) => <Text strong>{formatPendingReviewValue(value)}</Text> },
    { title: '公司渠道', key: 'channelName', width: 150, sortValue: (record) => record.channelName ?? record.carrier, render: (_, record) => getPendingReviewChannel(record) },
    {
      title: '货物数据',
      key: 'cargoData',
      width: 260,
      sortValue: (record) => getPendingReviewChargeableWeight(record),
      render: (_, record) => (
        <Space size={4} wrap>
          <Tag>{formatPendingReviewValue(record.packageCount)} 件</Tag>
          <Tag>{formatPendingReviewWeight(getPendingReviewWeight(record))}</Tag>
          <Tag>{formatPendingReviewWeight(getPendingReviewChargeableWeight(record))}</Tag>
        </Space>
      )
    },
    {
      title: '应收/业务成本',
      key: 'feeSummary',
      width: 210,
      sortValue: (record) => record.receivableRmbTotal ?? 0,
      render: (_, record) => {
        const businessCostTotal = getDraftBusinessCostTotal(record);
        return (
          <Space direction="vertical" size={0}>
            <Text>应收 {renderPendingReviewReceivable(record)}</Text>
            <Text type="secondary">业务成本 {businessCostTotal > 0 ? formatPendingReviewMoney(businessCostTotal) : '-'}</Text>
          </Space>
        );
      }
    },
    { title: '创建人', key: 'entryBy', width: 110, sortValue: (record) => record.entryBy || record.salesperson, render: (_, record) => formatPendingReviewValue(record.entryBy || record.salesperson) },
    { title: '更新时间', key: 'updatedAt', width: 140, sortValue: (record) => record.createdAt, render: (_, record) => formatBeijingDateTime(record.createdAt) },
    {
      title: '状态',
      key: 'status',
      width: 120,
      sortValue: (record) => record.status,
      render: (_, record) => {
        const needsCompletion = record.status === 'DRAFT' && Boolean(record.reviewRejectedReason);
        return <Tag color={needsCompletion ? 'red' : record.status === 'REVIEW_REJECTED' ? 'orange' : 'gold'}>{needsCompletion ? '待完善' : record.status === 'REVIEW_REJECTED' ? '退回修改' : '普通草稿'}</Tag>;
      }
    },
    { title: '待完善原因', key: 'reviewRejectedReason', width: 240, sortValue: (record) => record.reviewRejectedReason, render: (_, record) => record.reviewRejectedReason ? <Text type="danger">{record.reviewRejectedReason}</Text> : '-' },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      sortable: false,
      render: (_, record) => (
        <Space size={6}>
          <Button
            size="small"
            type="primary"
            loading={openingOrderEntryDraftId === record.id}
            disabled={!canContinueOrderEntryDraft}
            title={canContinueOrderEntryDraft ? '继续编辑草稿' : '需要“进入录单页面、查看录单草稿、保存录单草稿”权限'}
            onClick={() => void continueOrderEntryDraft(record)}
          >
            继续编辑
          </Button>
          {hasUiPermission('business:order-entry:draft-delete') ? <Button size="small" danger onClick={() => deleteOrderEntryDraft(record)}>删除</Button> : null}
        </Space>
      )
    }
  ];
  const orderEntryDraftMatrixColumns: ManagedTableColumns<Shipment> = [
    {
      title: '草稿与客户',
      key: 'matrixDraft',
      width: 300,
      className: 'managed-matrix-group-primary',
      render: (_, record) => (
        <ManagedMatrixCell
          labelWidth={66}
          fields={[
            { key: 'createdAt', label: '创建时间', value: <ManagedMatrixDateTime value={formatBeijingDateTime(record.createdAt)} /> },
            { key: 'systemOrderNo', label: '出货单号', value: <Text strong>{formatPendingReviewValue(record.systemOrderNo)}</Text>, title: record.systemOrderNo },
            { key: 'customerOrderNo', label: '客户单号', value: formatPendingReviewValue(record.customerOrderNo), title: record.customerOrderNo },
            { key: 'customer', label: '客户', value: getPendingReviewCustomer(record), title: `${record.customerCode ?? ''} ${record.customerName ?? ''}`.trim() },
            { key: 'entryBy', label: '创建人', value: formatPendingReviewValue(record.entryBy || record.salesperson) }
          ]}
        />
      )
    },
    {
      title: '货物与渠道',
      key: 'matrixCargo',
      width: 300,
      render: (_, record) => (
        <ManagedMatrixCell
          labelWidth={66}
          fields={[
            { key: 'channelName', label: '公司渠道', value: getPendingReviewChannel(record), title: getPendingReviewChannel(record) },
            { key: 'packageCount', label: '件数', value: formatPendingReviewValue(record.packageCount) },
            { key: 'weightKg', label: '重量', value: formatPendingReviewWeight(getPendingReviewWeight(record)) },
            { key: 'chargeableWeightKg', label: '计费重', value: formatPendingReviewWeight(getPendingReviewChargeableWeight(record)) }
          ]}
        />
      )
    },
    {
      title: '费用与状态',
      key: 'matrixFeeStatus',
      width: 300,
      render: (_, record) => {
        const businessCostTotal = getDraftBusinessCostTotal(record);
        const needsCompletion = record.status === 'DRAFT' && Boolean(record.reviewRejectedReason);
        return (
          <ManagedMatrixCell
            labelWidth={66}
            fields={[
              { key: 'receivable', label: '应收', value: <Text strong>{renderPendingReviewReceivable(record)}</Text> },
              { key: 'businessCost', label: '业务成本', value: businessCostTotal > 0 ? formatPendingReviewMoney(businessCostTotal) : '-' },
              { key: 'status', label: '状态', value: <Tag color={needsCompletion ? 'red' : record.status === 'REVIEW_REJECTED' ? 'orange' : 'gold'}>{needsCompletion ? '待完善' : record.status === 'REVIEW_REJECTED' ? '退回修改' : '普通草稿'}</Tag> },
              record.reviewRejectedReason ? { key: 'reviewRejectedReason', label: '待完善原因', value: <Text type="danger">{record.reviewRejectedReason}</Text>, title: record.reviewRejectedReason, wrap: true } : null,
              { key: 'updatedAt', label: '更新时间', value: <ManagedMatrixDateTime value={formatBeijingDateTime(record.createdAt)} /> }
            ]}
          />
        );
      }
    },
    { ...orderEntryDraftColumns[orderEntryDraftColumns.length - 1], key: 'actions', width: 150, fixed: 'right' }
  ];
  const renderOrderEntryDraftPage = () => (
    <Card
      className="finance-pending-list-card finance-pending-list-page-card"
      title="录单草稿箱"
    >
      <ManagedDualViewTable<Shipment>
        viewStorageKey="sunny.finance.order-entry-drafts.view-v1"
        viewAriaLabel="录单草稿箱表格视图"
        defaultView="matrix"
        views={{
          matrix: {
            label: '矩阵视图',
            columns: orderEntryDraftMatrixColumns,
            tableProps: {
              className: 'finance-work-table finance-order-entry-drafts-matrix-table',
              minimumScrollX: 0,
              tableLayout: 'fixed',
              recordDetail: { title: '录单草稿详情', columns: orderEntryDraftColumns },
              columnSettings: { storageKey: 'sunny.finance.order-entry-drafts.matrix-columns-v1', title: '录单草稿矩阵列设置', lockedKeys: ['actions'] }
            }
          },
          ledger: {
            label: '精密台账模式',
            columns: orderEntryDraftColumns,
            tableProps: {
              className: 'finance-work-table finance-order-entry-drafts-ledger-table',
              minimumScrollX: 1500,
              recordDetail: { title: '录单草稿详情' },
              columnSettings: { storageKey: 'sunny.finance.order-entry-drafts.columns', title: '录单草稿列设置', lockedKeys: ['actions'] }
            }
          }
        }}
        rowKey="id"
        size="small"
        toolbarLeading={<Text type="secondary">共 {orderEntryDraftRows.length} 份草稿</Text>}
        dataSource={orderEntryDraftRows}
        loading={orderEntryDraftLoading}
        pagination={tenRowTablePagination}
        columnSettingsPlacement="toolbar"
        locale={{ emptyText: '暂无录单草稿' }}
      />
    </Card>
  );
  const renderPendingReviewPage = () => (
    <div className="finance-pending-review-page">
      {!selectedPendingReviewShipment ? (
        <Card
          className="finance-pending-list-card finance-pending-list-page-card"
          title="待审核列表"
          extra={(
            <Space size={8}>
              <Button size="small" type={pendingReviewView === 'ACTIVE' ? 'primary' : 'default'} onClick={() => setPendingReviewView('ACTIVE')}>待审核订单</Button>
              {hasUiPermission('business:review:deleted-list') ? (
                <Button size="small" type={pendingReviewView === 'DELETED' ? 'primary' : 'default'} onClick={() => setPendingReviewView('DELETED')}>已删除订单</Button>
              ) : null}
              <Text type="secondary">共 {currentReviewRows.length} 单</Text>
            </Space>
          )}
        >
            <div className="finance-pending-list-toolbar">
              <div className="finance-pending-filter-bar">
                <Input allowClear placeholder="关键字" value={financeReviewFilterDraft.keyword} onChange={(event) => setFinanceReviewFilterDraft((current) => ({ ...current, keyword: event.target.value }))} />
                <Input allowClear placeholder="客户编号" value={financeReviewFilterDraft.customerCode} onChange={(event) => setFinanceReviewFilterDraft((current) => ({ ...current, customerCode: event.target.value }))} />
                <Input allowClear placeholder="出货单号" value={financeReviewFilterDraft.systemOrderNo} onChange={(event) => setFinanceReviewFilterDraft((current) => ({ ...current, systemOrderNo: event.target.value }))} />
                <Select value={financeReviewFilterDraft.overdue} options={[{ value: 'ALL', label: '全部' }, { value: 'true', label: '超时' }, { value: 'false', label: '正常' }]} onChange={(value) => setFinanceReviewFilterDraft((current) => ({ ...current, overdue: value }))} />
              </div>
              <Space size={8} className="finance-pending-filter-actions">
                <Button type="primary" onClick={() => setFinanceReviewFilters(financeReviewFilterDraft)}>筛选</Button>
                <Button onClick={() => { setFinanceReviewFilterDraft(emptyFinanceReviewFilters); setFinanceReviewFilters(emptyFinanceReviewFilters); }}>重置</Button>
              </Space>
            </div>
            <ManagedDualViewTable<Shipment>
              viewStorageKey={`sunny.finance.pending-review.${pendingReviewView.toLowerCase()}.view-v1`}
              viewAriaLabel="待审核运单表格视图"
              defaultView="matrix"
              views={{
                matrix: {
                  label: '矩阵视图',
                  columns: pendingReviewMatrixColumns,
                  tableProps: {
                    className: 'finance-work-table finance-pending-review-matrix-table',
                    minimumScrollX: 0,
                    tableLayout: 'fixed',
                    showHeader: false,
                    recordDetail: { title: '待审核运单详情', columns: pendingReviewColumns },
                    columnSettings: { storageKey: `sunny.finance.pending-review.${pendingReviewView.toLowerCase()}.matrix-columns-v2`, title: '待审核运单矩阵列设置', lockedKeys: ['actions'] }
                  }
                },
                ledger: {
                  label: '精密台账模式',
                  columns: pendingReviewColumns,
                  tableProps: {
                    className: 'finance-work-table finance-pending-review-ledger-table',
                    minimumScrollX: 1600,
                    recordDetail: { title: '待审核运单详情' },
                    columnSettings: { storageKey: 'sunny.finance.pending-review.columns', title: '待审核运单列设置', defaultHiddenKeys: ['productName', 'declarationRequired', 'sensitive', 'overdue'], lockedKeys: ['systemOrderNo', 'actions'] }
                  }
                }
              }}
              rowKey="id"
              size="small"
              dataSource={currentReviewRows}
              loading={pendingReviewView === 'DELETED' ? deletedReviewLoading : pendingReviewLoading}
              pagination={tenRowTablePagination}
              columnSettingsPlacement="toolbar"
              locale={{ emptyText: pendingReviewView === 'DELETED' ? '暂无已删除订单' : '暂无待审核订单' }}
              rowClassName={(record) => record.id === financeReviewSelectedShipmentId ? 'finance-pending-row-selected' : ''}
              onRow={(record) => ({
                onClick: () => setFinanceReviewSelectedShipmentId(record.id),
                onDoubleClick: () => setFinanceReviewSelectedShipmentId(record.id)
              })}
            />
        </Card>
      ) : (
        <>
          <Card
            className="finance-pending-detail-card"
            title={pendingReviewView === 'DELETED' ? '已删除订单详情' : '待审核详情'}
            loading={pendingReviewDetailLoading}
            extra={selectedPendingReviewShipment ? (
              <Space size={8} wrap className="finance-pending-action-bar">
                <Button size="small" onClick={returnToPendingReviewList}>返回列表</Button>
                {pendingReviewView === 'DELETED' ? (
                  <>
                    {canRestoreReviewShipment ? <Button size="small" onClick={() => openRestoreReviewShipment(selectedPendingReviewShipment)}>恢复</Button> : null}
                    {canPurgeReviewShipment ? <Button size="small" danger onClick={() => purgeReviewShipment(selectedPendingReviewShipment)}>彻底删除</Button> : null}
                  </>
                ) : (
                  <>
                    {canDirectEditPendingReview ? <Button size="small" type="primary" form="pending-review-basic-edit" htmlType="submit" loading={pendingReviewBasicSubmitting}>保存修改</Button> : null}
                    {hasUiPermission('business:review:operation-log-view') ? <Button size="small" onClick={() => onViewShipmentLog(selectedPendingReviewShipment)}>操作日志</Button> : null}
                    {canBusinessReviewShipment && !selectedPendingReviewShipment.businessReviewedAt ? <Button size="small" type="primary" loading={pendingReviewSubmitting} onClick={() => approvePendingReview()}>自审通过</Button> : null}
                    {hasUiPermission('business:review:delete') ? <Button size="small" danger onClick={() => deletePendingReview()}>删除</Button> : null}
                  </>
                )}
              </Space>
            ) : null}
          >
            {pendingReviewDetail ? (
              <>
                <section className="finance-pending-compact-summary" aria-label="待审核摘要">
                  <div className="finance-pending-summary-heading">
                    <Text strong>审核摘要</Text>
                    <Button size="small" disabled={!selectedPendingReviewShipment} onClick={copyPendingReviewSummary}>复制摘要</Button>
                  </div>
                  <div className="finance-pending-summary-grid" data-testid="finance-pending-summary" title={pendingReviewSummaryText}>
                    {pendingReviewSummaryItems.map((item) => (
                      <div className="finance-pending-summary-item" key={item.label}>
                        <span className="finance-pending-summary-label">{item.label}</span>
                        <span className="finance-pending-summary-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="finance-pending-alert-stack">
                  {canDirectEditPendingReview ? <Alert type="info" showIcon message="当前订单可直接修改基础资料；保存后仍保留待审核状态，审核、费用和货物计量字段不会被本次保存改动。" /> : null}
                  {pendingReviewDetail.overdue ? <Alert type="warning" showIcon message="该订单待审核已超过 3 天，请优先处理。" /> : null}
                  {pendingReviewDetail.approvalWarnings.length ? (
                    <Alert type="error" showIcon message={`审核前需补齐：${pendingReviewDetail.approvalWarnings.join('、')}`} />
                  ) : null}
                </div>
                <Tabs
                  className="finance-pending-detail-tabs"
                  items={[
                    {
                      key: 'basic',
                      label: '基本',
                      children: renderPendingReviewTwoColumnDetail(detailShipment)
                    },
                    {
                      key: 'packages',
                      label: '单件明细',
                      children: <ManagedTable className="finance-embedded-table" rowKey="id" size="small" columns={reviewPackageColumns} dataSource={pendingReviewDetail.packages} pagination={false} scroll={{ x: 1500 }} sticky={false} resizableColumns={false} columnSettings={false} recordDetail={false} />
                    },
                    {
                      key: 'problems',
                      label: '问题处理',
                      children: pendingReviewDetail.problemTickets.length ? <ManagedTable className="finance-embedded-table" rowKey="id" size="small" dataSource={pendingReviewDetail.problemTickets} pagination={false} sticky={false} minimumScrollX={0} resizableColumns={false} columnSettings={false} recordDetail={false} columns={[
                        { title: '问题', dataIndex: 'reason' },
                        { title: '状态', dataIndex: 'status', width: 120 },
                        { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) }
                      ]} /> : <Text type="secondary">-</Text>
                    },
                    {
                      key: 'finance',
                      label: '费用',
                      children: (
                        <>
                          <Flex gap={10} wrap="wrap" className="finance-pending-finance-metrics">
                            <MetricCard title="应收" value={formatCurrency(pendingReviewDetail.finance.receivableTotal)} icon={<CircleDollarSign size={16} />} extra="待审核" />
                            <MetricCard title="业务成本" value={formatCurrency(pendingReviewDetail.finance.businessCostTotal ?? 0)} icon={<Banknote size={16} />} extra="成本校验" />
                            {pendingReviewDetail.finance.canViewPayables ? <MetricCard title="应付" value={formatCurrency(pendingReviewDetail.finance.payableTotal ?? 0)} icon={<Landmark size={16} />} extra="代理侧" /> : null}
                          </Flex>
                          <Divider className="finance-pending-section-divider" />
                          {renderShipmentFinancePanel(pendingReviewDetail.shipment, pendingReviewDetail.finance)}
                        </>
                      )
                    },
                    { key: 'time', label: '时间', children: renderReviewKeyValues([['创建时间', formatBeijingDateTime(detailShipment?.createdAt ?? '')], ['业务自审时间', detailShipment?.businessReviewedAt ? formatBeijingDateTime(detailShipment.businessReviewedAt) : '-'], ['终审时间', detailShipment?.reviewedAt ? formatBeijingDateTime(detailShipment.reviewedAt) : '-'], ['删除时间', detailShipment?.deletedAt ? formatBeijingDateTime(detailShipment.deletedAt) : '-']]) },
                    {
                      key: 'internal-tracking',
                      label: '内部轨迹',
                      children: pendingReviewDetail.internalTrackingEvents.length
                        ? <ManagedTable className="finance-embedded-table" rowKey="id" size="small" columns={reviewEventColumns} dataSource={pendingReviewDetail.internalTrackingEvents} pagination={false} scroll={{ x: 960 }} sticky={false} resizableColumns={false} columnSettings={false} recordDetail={false} />
                        : <Text type="secondary">暂无公司内部生命周期记录</Text>
                    },
                    {
                      key: 'logistics-tracking',
                      label: '物流轨迹',
                      children: pendingReviewDetail.logisticsTrackingEvents.length
                        ? <ManagedTable className="finance-embedded-table" rowKey="id" size="small" columns={logisticsTrackingColumns} dataSource={pendingReviewDetail.logisticsTrackingEvents} pagination={false} scroll={{ x: 1120 }} sticky={false} resizableColumns={false} columnSettings={false} recordDetail={false} />
                        : <Text type="secondary">暂无外部物流轨迹</Text>
                    },
                    { key: 'files', label: '文件', children: <Text type="secondary">暂无文件记录</Text> },
                    { key: 'settings', label: '设置', children: renderReviewKeyValues([['状态', shipmentStatusLabels[pendingReviewDetail.shipment.status]], ['驳回原因', pendingReviewDetail.shipment.reviewRejectedReason]]) }
                  ]}
                />
              </>
            ) : (
              <Text type="secondary">请选择待审核订单</Text>
            )}
          </Card>
        </>
      )}
      <Modal
        title="恢复已删除订单"
        className="finance-modal"
        width={680}
        open={Boolean(reviewRestoreTarget)}
        confirmLoading={reviewRestoreSubmitting}
        okText="确认恢复"
        cancelText="取消"
        onCancel={() => setReviewRestoreTarget(null)}
        onOk={submitRestoreReviewShipment}
      >
        <Form form={reviewRestoreForm} layout="vertical" initialValues={{ mode: 'KEEP_ORIGINAL_TIME' }}>
          <Form.Item name="mode" label="恢复时间策略" rules={[{ required: true, message: '请选择恢复时间策略' }]}>
            <Select options={[
              { value: 'KEEP_ORIGINAL_TIME', label: '按原录单时间' },
              { value: 'RESET_CREATED_TIME', label: '按恢复时间' },
              { value: 'MANUAL_TIME', label: '手动编辑时间' }
            ]} />
          </Form.Item>
          <Form.Item shouldUpdate={(prev, next) => prev.mode !== next.mode} noStyle>
            {({ getFieldValue }) => getFieldValue('mode') === 'MANUAL_TIME' ? (
              <Form.Item name="manualCreatedAt" label="手动录单时间" rules={[{ required: true, message: '请填写手动录单时间' }]}>
                <Input type="datetime-local" />
              </Form.Item>
            ) : null}
          </Form.Item>
          <Form.Item name="reason" label="恢复说明">
            <Input.TextArea rows={3} placeholder="可填写恢复原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
  const navigateToKuayueMiscFees = useCallback(() => {
    const href = getStaffSectionHref('miscFees', 'kuayue');
    if (window.location.pathname !== href) window.history.pushState(null, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
  const financeSubItems: ModuleSubNavItem[] =
    menuMode === 'business'
      ? [
          { key: 'business-dashboard', label: '业务看板' },
          { key: 'finance-entry', label: '录单' },
          { key: 'order-entry-drafts', label: '草稿箱' },
          { key: 'pending-review', label: '待审核运单' },
          { key: 'order-management', label: '运单管理' },
          { key: 'order-ai', label: 'AI 订单助手' }
        ].filter((item) => ({
          'business-dashboard': hasUiPermission('business:dashboard:view'),
          'finance-entry': canViewOrderEntry,
          'order-entry-drafts': canViewOrderEntryDrafts,
          'pending-review': hasUiPermission('business:review:list'),
          'order-management': hasUiPermission('business:shipment:list'),
          'order-ai': hasUiPermission('business:order-ai:view')
        })[item.key])
      : menuMode === 'catalog'
        ? [
            { key: 'fee-names', label: '费用名称' },
            { key: 'settlement-methods', label: '结算方式' },
            { key: 'cargo-types', label: '货物类型' },
            { key: 'agents', label: '代理资料' },
            { key: 'agent-channels', label: '代理渠道' },
            { key: 'company-channels', label: '公司渠道' },
            { key: 'channel-categories', label: '渠道类别' },
            { key: 'remote-areas', label: '偏远' },
            { key: 'exchange-rates', label: '汇率' }
          ]
      : !canUseFinanceWorkspace
        ? [
            { key: 'water-receipt-arrivals', label: '水单到账查询' },
            { key: 'water-receipts', label: '水单匹配' }
          ].filter((item) => item.key === 'water-receipt-arrivals'
            ? hasUiPermission('finance:water-receipt:read')
            : hasUiPermission('finance:water-match:read'))
        : [
            { key: 'finance-dashboard', label: '财务看板' },
            { key: 'receivables', label: '应收审核' },
            { key: 'business-costs', label: '业务成本审核' },
            { key: 'payables', label: '市场应付审核' },
            { key: 'payment-applications', label: '付款申请' },
            { key: 'paid-verification', label: '待付款' },
            { key: 'paid-payments', label: '已付款' },
            { key: 'water-receipt-arrivals', label: '水单到账查询' },
            { key: 'water-receipts', label: '水单匹配' },
            { key: 'agent-bill-ai', label: '历史代理账单' }
          ].filter((item) => ({
            'finance-dashboard': hasUiPermission('finance:dashboard:view'),
            receivables: hasUiPermission('finance:receivable:read'),
            'business-costs': hasUiPermission('finance:business-cost:read'),
            payables: hasUiPermission('finance:payable:read'),
            'payment-applications': hasUiPermission('finance:pending-payment:read'),
            'paid-verification': hasUiPermission('finance:paid-payment:read'),
            'paid-payments': hasUiPermission('finance:paid-payment:read'),
            'water-receipt-arrivals': hasUiPermission('finance:water-receipt:read'),
            'water-receipts': hasUiPermission('finance:water-match:read'),
            'agent-bill-ai': hasUiPermission('finance:agent-bill:read')
          })[item.key]);
  useEffect(() => {
    if (!financeSubItems.some((item) => item.key === activeFinanceSection)) {
      setActiveFinanceSection(financeSubItems[0]?.key ?? defaultSection);
    }
  }, [activeFinanceSection, defaultSection, financeSubItems]);
  const handleFinanceSectionChange = useCallback((key: string) => {
    if (key === 'finance-entry') {
      setEditingOrderEntryDraftId(undefined);
      setEditingOrderEntryDraftDetail(undefined);
    }
    setActiveFinanceSection(key);
  }, []);
  const closeEditingOrderEntryDraft = useCallback(() => {
    setEditingOrderEntryDraftId(undefined);
    setEditingOrderEntryDraftDetail(undefined);
  }, []);
  const syncBusinessSectionRoute = useCallback((sectionKey: string) => {
    const href = getStaffSectionHref('business', sectionKey);
    if (window.location.pathname === href) return;
    window.history.pushState(null, '', href);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
  }, []);

  useEffect(() => {
    if (prefillOrderEntryPackageIds?.length) {
      setEditingOrderEntryDraftId(undefined);
      setEditingOrderEntryDraftDetail(undefined);
      setActiveFinanceSection('finance-entry');
    }
  }, [prefillOrderEntryPackageIds]);

  useEffect(() => {
    if (menuMode !== 'finance' || activeFinanceSection !== 'finance-dashboard') return;
    setFinanceDashboardLoading(true);
    setFinanceDashboardError(null);
    apiClient.financeDashboard()
      .then(setFinanceDashboard)
      .catch((error) => setFinanceDashboardError(error instanceof Error ? error.message : '财务看板加载失败'))
      .finally(() => setFinanceDashboardLoading(false));
  }, [activeFinanceSection, apiClient, menuMode]);

  const openPendingPayments = (nextQuery?: PendingPaymentListQuery) => {
    setPendingPaymentInitialQuery(nextQuery);
    setActiveFinanceSection('payment-applications');
  };
  const openAgentBills = () => {
    navigateToKuayueMiscFees();
  };
  const dashboardValue = (item: FinanceDashboardItem) => {
    if (typeof item.amount === 'number') return formatCurrency(item.amount);
    if (item.value) return item.value;
    return String(item.count ?? 0);
  };

  const isBusinessScopeShipment = useCallback((shipment: Shipment) => {
    if (role === 'ADMIN') return true;
    if (!salesScopedRoleKeys.includes(role)) return false;
    return shipment.entryBy === username || shipment.salesperson === username;
  }, [role, username]);
  const businessScopedShipments = useMemo(
    () => shipments.filter((shipment) => !shipment.deletedAt && isBusinessScopeShipment(shipment)),
    [isBusinessScopeShipment, shipments]
  );
  const businessDraftRows = useMemo(() => {
    const rows = orderEntryDraftRows.length
      ? orderEntryDraftRows
      : businessScopedShipments.filter((shipment) => ['DRAFT', 'REVIEW_REJECTED'].includes(shipment.status));
    return rows.filter((shipment) => !shipment.deletedAt && isBusinessScopeShipment(shipment));
  }, [businessScopedShipments, isBusinessScopeShipment, orderEntryDraftRows]);
  const businessPendingReviewRows = useMemo(() => {
    const rows = pendingReviewRows.length
      ? pendingReviewRows
      : businessScopedShipments.filter((shipment) => shipment.status === 'REVIEW_PENDING');
    return rows.filter((shipment) => !shipment.deletedAt && shipment.status === 'REVIEW_PENDING' && isBusinessScopeShipment(shipment));
  }, [businessScopedShipments, isBusinessScopeShipment, pendingReviewRows]);
  const getBeijingDateKey = (value?: string) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return formatBeijingDate(date);
  };
  const getBeijingWeekKey = (value?: string) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    const weekStart = getBeijingWeekStartTimestamp(date);
    return Number.isFinite(weekStart) ? formatBeijingDate(weekStart) : '';
  };
  const businessTodayKey = getBeijingDateKey();
  const businessWeekKey = getBeijingWeekKey();
  const businessActiveOrderRows = businessScopedShipments.filter((shipment) => shipment.status !== 'CANCELLED');
  const businessTodayOrderCount = businessActiveOrderRows.filter((shipment) => getBeijingDateKey(shipment.entryAt ?? shipment.createdAt) === businessTodayKey).length;
  const businessWeekOrderCount = businessActiveOrderRows.filter((shipment) => getBeijingWeekKey(shipment.entryAt ?? shipment.createdAt) === businessWeekKey).length;
  const businessDashboardMetrics = [
    {
      key: 'today',
      title: '今日录单',
      value: businessTodayOrderCount,
      extra: businessTodayOrderCount > 0 ? '今日已录入' : '今日暂无录单',
      tone: businessTodayOrderCount > 0 ? 'blue' : 'gray',
      icon: <CalendarDays size={18} />,
      sectionKey: 'finance-entry'
    },
    {
      key: 'drafts',
      title: '草稿箱',
      value: businessDraftRows.filter((shipment) => shipment.status === 'DRAFT').length,
      extra: businessDraftRows.length > 0 ? `${businessDraftRows.length} 份可继续编辑` : '暂无草稿',
      tone: businessDraftRows.length > 0 ? 'orange' : 'gray',
      icon: <FilePenLine size={18} />,
      sectionKey: 'order-entry-drafts'
    },
    {
      key: 'pending-review',
      title: '待审核运单',
      value: businessPendingReviewRows.length,
      extra: businessPendingReviewRows.length > 0 ? '需要优先处理' : '暂无待审核',
      tone: businessPendingReviewRows.length > 0 ? 'red' : 'gray',
      icon: <ListChecks size={18} />,
      sectionKey: 'pending-review'
    },
    {
      key: 'week',
      title: '本周录单',
      value: businessWeekOrderCount,
      extra: businessWeekOrderCount > 0 ? '本周累计录入' : '本周暂无录单',
      tone: businessWeekOrderCount > 0 ? 'blue' : 'gray',
      icon: <ClipboardList size={18} />,
      sectionKey: 'finance-entry'
    }
  ];
  const businessDashboardReminder = businessPendingReviewRows.length > 0
    ? `有 ${businessPendingReviewRows.length} 票待审核运单，请及时处理。`
    : businessDraftRows.length > 0
      ? `有 ${businessDraftRows.length} 份草稿待完善，请前往草稿箱处理。`
      : businessTodayOrderCount === 0
        ? '今日暂无录单，可以从录单入口开始。'
        : '今日录单进展正常，可继续跟进待审订单。';
  const businessTrendDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${businessTodayKey}T12:00:00+08:00`);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const dateKey = date.toISOString().slice(0, 10);
    return {
      dateKey,
      label: dateKey.slice(5).replace('-', '/'),
      count: businessActiveOrderRows.filter((shipment) => getBeijingDateKey(shipment.entryAt ?? shipment.createdAt) === dateKey).length
    };
  });
  const businessTrendMax = Math.max(4, ...businessTrendDays.map((item) => item.count));
  const businessTrendTop = 22;
  const businessTrendBottom = 148;
  const businessTrendStart = 56;
  const businessTrendEnd = 614;
  const businessTrendHeight = businessTrendBottom - businessTrendTop;
  const businessTrendPoint = (count: number, index: number) => ({
    x: businessTrendStart + index * ((businessTrendEnd - businessTrendStart) / (businessTrendDays.length - 1)),
    y: businessTrendBottom - (count / businessTrendMax) * businessTrendHeight
  });
  const businessTrendPolyline = businessTrendDays.map((item, index) => {
    const point = businessTrendPoint(item.count, index);
    return `${point.x},${point.y}`;
  }).join(' ');
  const businessTrendGridValues = [businessTrendMax, Math.ceil(businessTrendMax * 0.75), Math.ceil(businessTrendMax * 0.5), Math.ceil(businessTrendMax * 0.25), 0];
  const businessTrendHoveredDay = businessTrendHoverIndex == null ? null : businessTrendDays[businessTrendHoverIndex];
  const businessTrendHoveredPoint = businessTrendHoveredDay == null
    ? null
    : businessTrendPoint(businessTrendHoveredDay.count, businessTrendHoverIndex!);
  const renderBusinessDashboard = () => (
    <Space direction="vertical" size={18} className="business-dashboard-workbench">
      <div className="business-dashboard-heading">
        <div>
          <h2>业务看板</h2>
          <Text type="secondary">统一管理业务数据，掌握订单状态，提高处理效率</Text>
        </div>
        <Space size={10} className="business-dashboard-refresh">
          <Text type="secondary">数据更新时间：{businessDashboardUpdatedAt ? formatBeijingDateTime(businessDashboardUpdatedAt) : '正在加载'}</Text>
          <Button
            aria-label="刷新业务看板"
            icon={<RefreshCw size={16} />}
            loading={businessDashboardRefreshing}
            onClick={() => void refreshBusinessDashboard()}
          >
            刷新
          </Button>
        </Space>
      </div>
      <Row gutter={[12, 12]}>
        {businessDashboardMetrics.filter((item) => (
          item.key !== 'pending-review' || hasUiPermission('business:dashboard:pending-review-summary')
        )).map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.key}>
            <button
              type="button"
              className={`business-dashboard-card business-dashboard-card-${item.tone}`}
              onClick={() => setActiveFinanceSection(item.sectionKey)}
            >
              <span className="business-dashboard-card-icon">{item.icon}</span>
              <span className="business-dashboard-card-body">
                <Text className="business-dashboard-card-title">{item.title}</Text>
                <strong>{item.value}</strong>
                <Text type="secondary">{item.extra}</Text>
              </span>
            </button>
          </Col>
        ))}
      </Row>
      <Card className="business-dashboard-actions-card" title="快捷入口">
        <Space wrap>
          {hasUiPermission('business:order-entry:view') ? <Button type="primary" icon={<FileText size={16} />} onClick={() => setActiveFinanceSection('finance-entry')}>去录单</Button> : null}
          {hasUiPermission('business:order-entry:draft-view') ? <Button icon={<FilePenLine size={16} />} onClick={() => setActiveFinanceSection('order-entry-drafts')}>查看草稿箱</Button> : null}
          {hasUiPermission('business:review:list') ? <Button icon={<ListChecks size={16} />} onClick={() => setActiveFinanceSection('pending-review')}>处理待审核运单</Button> : null}
        </Space>
      </Card>
      <Row gutter={[12, 12]} className="business-dashboard-bottom-row">
        <Col xs={24} lg={10}>
          <Card className="business-dashboard-reminder-card" title="今日提醒">
            <Alert type="info" showIcon message={businessDashboardReminder} />
          </Card>
        </Col>
        {hasUiPermission('business:dashboard:trend-view') ? <Col xs={24} lg={14}>
          <Card
            className="business-dashboard-trend-card"
            title="业务趋势（近7天）"
            extra={<Text type="secondary">近7天</Text>}
          >
            <div
              className="business-dashboard-trend"
              role="img"
              aria-label={`近7天录单趋势：${businessTrendDays.map((item) => `${item.label} ${item.count} 单`).join('，')}`}
              onMouseLeave={() => setBusinessTrendHoverIndex(null)}
            >
              <svg viewBox="0 0 650 190" preserveAspectRatio="none" aria-hidden="true">
                {businessTrendGridValues.map((value, index) => {
                  const y = businessTrendTop + index * (businessTrendHeight / (businessTrendGridValues.length - 1));
                  return (
                    <g key={`${value}-${index}`}>
                      <line x1={businessTrendStart} y1={y} x2={businessTrendEnd} y2={y} className="business-dashboard-trend-grid" />
                      <text x="42" y={y + 4} textAnchor="end" className="business-dashboard-trend-axis">{value}</text>
                    </g>
                  );
                })}
                <polyline points={businessTrendPolyline} className="business-dashboard-trend-line" />
                {businessTrendDays.map((item, index) => {
                  const point = businessTrendPoint(item.count, index);
                  return <circle key={item.dateKey} cx={point.x} cy={point.y} r="4" className="business-dashboard-trend-dot" />;
                })}
                {businessTrendDays.map((item, index) => {
                  const point = businessTrendPoint(item.count, index);
                  const interval = (businessTrendEnd - businessTrendStart) / (businessTrendDays.length - 1);
                  const left = index === 0 ? businessTrendStart - interval / 2 : point.x - interval / 2;
                  const right = index === businessTrendDays.length - 1 ? businessTrendEnd + interval / 2 : point.x + interval / 2;
                  return (
                    <rect
                      key={`hit-${item.dateKey}`}
                      className="business-dashboard-trend-hit-area"
                      x={left}
                      y={businessTrendTop}
                      width={right - left}
                      height={businessTrendBottom - businessTrendTop}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`查看 ${item.label} 录单数：${item.count} 单`}
                      onMouseEnter={() => setBusinessTrendHoverIndex(index)}
                      onFocus={() => setBusinessTrendHoverIndex(index)}
                      onBlur={() => setBusinessTrendHoverIndex(null)}
                    />
                  );
                })}
                {businessTrendDays.map((item, index) => {
                  const point = businessTrendPoint(item.count, index);
                  return <text key={item.dateKey} x={point.x} y="177" textAnchor="middle" className="business-dashboard-trend-axis">{item.label}</text>;
                })}
              </svg>
              {businessTrendHoveredDay && businessTrendHoveredPoint ? (
                <div
                  className="business-dashboard-trend-tooltip"
                  role="tooltip"
                  style={{
                    left: `${(businessTrendHoveredPoint.x / 650) * 100}%`,
                    top: `${Math.max(12, businessTrendHoveredPoint.y - 8)}px`
                  }}
                >
                  <span>{businessTrendHoveredDay.dateKey}</span>
                  <strong>{businessTrendHoveredDay.count} 单</strong>
                </div>
              ) : null}
            </div>
          </Card>
        </Col> : null}
      </Row>
    </Space>
  );

  const renderDashboardItems = (items: FinanceDashboardItem[], emptyText: string) => (
    <Space direction="vertical" size={8} className="finance-dashboard-list">
      {items.length ? items.map((item) => (
        <button key={item.key} type="button" className="finance-dashboard-row" onClick={() => setActiveFinanceSection(item.sectionKey)}>
          <span>
            <Text strong>{item.title}</Text>
            {item.description ? <Text type="secondary">{item.description}</Text> : null}
          </span>
          <Tag color="blue">{typeof item.count === 'number' ? `${item.count} 项` : dashboardValue(item)}</Tag>
        </button>
      )) : <Text type="secondary">{emptyText}</Text>}
    </Space>
  );

  const renderFinanceDashboard = () => (
    <Space direction="vertical" size={12} className="finance-dashboard">
      {financeDashboardError ? <Alert type="error" message={financeDashboardError} showIcon /> : null}
      <Row gutter={[12, 12]}>
        {(financeDashboard?.kpis ?? []).map((item) => (
          <Col xs={24} md={12} xl={6} key={item.key}>
            <MetricCard
              title={item.title}
              value={dashboardValue(item)}
              icon={<Banknote size={16} />}
              extra={typeof item.count === 'number' ? `${item.count} 项` : item.description}
            />
          </Col>
        ))}
      </Row>
      <Row gutter={[12, 12]}>
        <Col xs={24} xl={12}>
          <Card title="待办" loading={financeDashboardLoading}>
            {renderDashboardItems(financeDashboard?.todos ?? [], '暂无待处理事项')}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="异常" loading={financeDashboardLoading}>
            {renderDashboardItems(financeDashboard?.exceptions ?? [], '暂无异常')}
          </Card>
        </Col>
      </Row>
      <Card title="快捷入口" loading={financeDashboardLoading}>
        <Space wrap>
          {(financeDashboard?.quickActions ?? []).map((item) => (
            <Button key={item.key} onClick={() => setActiveFinanceSection(item.sectionKey)}>
              {item.title}
            </Button>
          ))}
        </Space>
      </Card>
    </Space>
  );

  return (
    <AppPage className={menuMode === 'business' && activeFinanceSection === 'pending-review' ? 'finance-pending-review-shell' : undefined}>
      <AppPageHeader
        title={menuMode === 'business' ? '业务管理' : menuMode === 'catalog' ? '基础资料库' : '财务管理'}
        actions={menuMode === 'finance' ? (
          <AppActionGroup>
            <Button icon={<Landmark size={16} />} onClick={onCreateStatement}>
              生成 9409 对账单
            </Button>
            <Button type="primary" icon={<Banknote size={16} />} onClick={onCreatePayment}>
              登记 9409 收款并核销
            </Button>
          </AppActionGroup>
        ) : null}
      />

      {renderNoticeBar(notice)}

      {menuMode === 'finance' ? <Row gutter={[12, 12]} className="finance-metric-row">
        <Col xs={24} md={8}>
          <MetricCard icon={<Banknote />} title="待审应收" value={pendingReceivableRmbMissing ? '缺少有效汇率' : formatCurrency(total)} extra={`${receivables.length} 条应收`} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<FileText />} title="对账草稿" value={statements.length} extra="客户账单待确认" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<CircleDollarSign />} title="账户余额" value={primaryAccount ? formatPendingReviewMoney(primaryAccount.balance, primaryAccount.currency) : 'RMB 0.00'} extra={primaryAccount?.customerName ?? '待初始化'} />
        </Col>
      </Row> : null}

      <ModuleSubWorkspace items={financeSubItems} activeKey={activeFinanceSection} onChange={handleFinanceSectionChange}>
      <Row gutter={[16, 16]} className="main-grid finance-main-grid">
        <Col xs={24}>
          {activeFinanceSection === 'business-dashboard' ? renderBusinessDashboard() : null}
          {activeFinanceSection === 'finance-dashboard' ? renderFinanceDashboard() : null}
          {activeFinanceSection === 'order-management' ? renderOrderManagement?.() ?? <PlaceholderPanel title="运单管理" /> : null}
          {activeFinanceSection === 'order-ai' ? renderOrderAi?.() ?? <PlaceholderPanel title="AI 订单助手" /> : null}
        </Col>
        <Col xs={24}>
          {activeFinanceSection === 'finance-entry' ? (
            (canCreateOrderEntry || (Boolean(editingOrderEntryDraftId) && canContinueOrderEntryDraft)) ? <FinanceEntryPage
              key={editingOrderEntryDraftId ?? 'new-order-entry'}
              apiClient={apiClient}
              role={role}
              username={username}
              financeCatalogItems={financeCatalogItems}
              customers={customers}
              customerContacts={customerContacts}
              onCustomerContactsChange={onCustomerContactsChange}
              onCatalogChange={financeCatalog.refresh}
              onCreated={handleOrderEntryCreated}
              draftId={editingOrderEntryDraftId}
              initialDraftDetail={editingOrderEntryDraftDetail}
              canCreateOrderEntry={canCreateOrderEntry}
              canSaveDraft={canSaveOrderEntryDraft}
              canSubmitForReview={canSubmitOrderEntryForReview}
              canUseAgentFields={canUseOrderEntryAgentFields}
              onDraftClosed={closeEditingOrderEntryDraft}
              preselectedPackageIds={prefillOrderEntryPackageIds}
              onPreselectedPackageIdsConsumed={onOrderEntryPrefillConsumed}
            /> : <Alert type="warning" showIcon message="当前角色没有新建录单权限；如需编辑已有草稿，请同时授予进入录单、查看草稿和保存草稿权限。" />
          ) : null}
        </Col>
        <Col xs={24}>
          {activeFinanceSection === 'order-entry-drafts' ? renderOrderEntryDraftPage() : null}
        </Col>
        <Col xs={24}>
          {activeFinanceSection === 'pending-review' ? renderPendingReviewPage() : null}
        </Col>
	        <Col xs={24}>
	          {activeFinanceSection === 'receivables' ? (
	            <ReceivableAuditPage
	              apiClient={apiClient}
	              permissions={permissions}
	              rows={receivables}
	              financeCatalogItems={financeCatalogItems}
	              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
	              onRowsChange={onReceivableRowsChange}
	            />
	          ) : activeFinanceSection === 'business-costs' ? (
	            <BusinessCostAuditPage
	              apiClient={apiClient}
	              permissions={permissions}
	              rows={businessCostAudits}
	              financeCatalogItems={financeCatalogItems}
	              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
	              onRowsChange={onBusinessCostRowsChange}
	            />
	          ) : activeFinanceSection === 'payables' ? (
	            <PayableAuditPage
	              apiClient={apiClient}
	              permissions={permissions}
	              rows={payableAudits}
	              financeCatalogItems={financeCatalogItems}
	              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
	              onRowsChange={onPayableRowsChange}
                onGoPendingPayment={openPendingPayments}
                onGoAgentBill={openAgentBills}
	            />
	          ) : null}
	        </Col>
	        <Col xs={24}>
	          {activeFinanceSection === 'payment-applications' ? (
            <PendingPaymentPage
              apiClient={apiClient}
              permissions={permissions}
              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
              initialQuery={pendingPaymentInitialQuery}
            />
	          ) : null}
          {activeFinanceSection === 'paid-verification' ? (
            <PaidPaymentPage
              apiClient={apiClient}
              permissions={permissions}
              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
              viewMode="waiting"
            />
	          ) : null}
	          {activeFinanceSection === 'paid-payments' ? (
            <PaidPaymentPage
              apiClient={apiClient}
              permissions={permissions}
              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
              viewMode="paid"
            />
	          ) : null}
	          {activeFinanceSection === 'water-receipt-arrivals' ? (
            <WaterReceiptPage
              key="water-receipt-arrivals"
              mode="arrival"
              apiClient={apiClient}
              permissions={permissions}
              customers={customers}
              settlementOptions={financeCatalog.settlementOptions}
              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
              notificationTargetId={notificationTarget?.type === 'WATER_RECEIPT' ? notificationTarget.id : undefined}
              onNotificationTargetHandled={notificationTarget ? handleWaterReceiptNotificationTarget : undefined}
            />
	          ) : null}
	          {activeFinanceSection === 'water-receipts' ? (
            <WaterReceiptPage
              key="water-receipts"
              mode="matching"
              apiClient={apiClient}
              permissions={permissions}
              customers={customers}
              settlementOptions={financeCatalog.settlementOptions}
              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
            />
	          ) : null}
	          {activeFinanceSection === 'agent-bill-ai' ? (
            <AgentBillPage apiClient={apiClient} permissions={permissions} agents={agents} historicalMode />
	          ) : null}
	          {['fee-names', 'settlement-methods', 'cargo-types'].includes(activeFinanceSection) ? (
            <FinanceCatalogPage
              {...financeCatalog.pageProps}
              pagination={tenRowTablePagination}
            />
          ) : null}
	          {['agents', 'agent-channels', 'company-channels', 'channel-categories', 'remote-areas', 'exchange-rates'].includes(activeFinanceSection) ? (
            <PlaceholderPanel title={financeSubItems.find((item) => item.key === activeFinanceSection)?.label ?? '基础资料'} />
	          ) : null}
	        </Col>
      </Row>
      </ModuleSubWorkspace>
    </AppPage>
  );
}
