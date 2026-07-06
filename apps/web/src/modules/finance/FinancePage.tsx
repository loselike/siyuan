import type { Key, ReactNode } from 'react';
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
  InputNumber,
  App as AntdApp,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tabs,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Banknote, CircleDollarSign, FileText, Landmark } from 'lucide-react';
import {
  shipmentStatusLabels,
  type AccountLedgerSummary,
  type BusinessCostAuditCreateInput,
  type BusinessCostAuditSummary,
  type BusinessCostAuditUpdateInput,
  type CustomerAccountSummary,
  type CustomerContactSummary,
  type CustomerSummary,
  type CustomerStatementSummary,
  type FinanceDashboardItem,
  type FinanceDashboardResponse,
  type OrderEntryDetailSummary,
  type PayableAuditCreateInput,
  type PendingPaymentListQuery,
  type PayableAuditSummary,
  type PayableAuditUpdateInput,
  type ReceivableAuditCreateInput,
  type ReceivableAuditSummary,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentFinanceDetailSummary,
  type ShipmentFinanceItemUpdateInput,
  type ShipmentReviewDetailSummary,
  type ShipmentReviewEventSummary,
  type ShipmentReviewPackageSummary,
  type ShipmentStatus,
  type WarehousePackageSummary
} from '@siyuan/shared';
import { ApiClient, type PermissionKey } from '../../apiClient';
import { confirmDangerousAction } from '../shared/dangerousAction';
import {
  applySettlementMethodCurrency,
  financeCatalogCurrencyOptions,
  getSettlementMethodCurrency,
  normalizeFinanceCatalogCurrency
} from './catalog';
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
import { formatBeijingDateTime, formatCurrency } from '../shared/format';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { PlaceholderPanel } from '../shared/PlaceholderPanel';
import { AppActionGroup, AppPage, AppPageHeader, CompactMetricCard as MetricCard, ManagedTable, renderNoticeBar, tenRowTablePagination } from '../shared/ui';

const { Text } = Typography;
const salesScopedRoleKeys = ['OPERATOR', 'UG_MARKET', 'UG_BUSINESS', 'UG_SZ_WUHAN', 'UG_ZZ_SIHUA', 'UG_WH_JIUYULIAN', 'UG_BUSINESS_MANAGER', 'UG_BUSINESS_SUPERVISOR'];

interface ShipmentOperationLog {
  id: string;
  operatedAt: string;
  operator: string;
  action: string;
}

type FinanceReviewFilters = {
  systemOrderNo: string;
  customer: string;
  transferNo: string;
  salesperson: string;
  agent: string;
  feeName: string;
  createdBy: string;
  reviewedBy: string;
  paymentNo: string;
  status: string;
  createdFrom: string;
  createdTo: string;
  reviewedFrom: string;
  reviewedTo: string;
  remark: string;
};



export function FinancePage({
  role,
  username,
  permissions,
  receivables,
  businessCostAudits,
  payableAudits,
  statements,
  accounts,
  ledger,
  notice,
  onCreateStatement,
  onCreatePayment,
  onAuditReceivable,
  onReverseAuditReceivable,
  onDeleteReceivable,
  onBatchAuditReceivables,
  onBatchReverseAuditReceivables,
  onCreateReceivable,
  onReceivableRowsChange,
  onExportReceivables,
  onAuditBusinessCost,
  onReverseAuditBusinessCost,
  onDeleteBusinessCost,
  onBatchAuditBusinessCosts,
  onBatchReverseAuditBusinessCosts,
  onCreateBusinessCost,
  onUpdateBusinessCost,
  onBusinessCostRowsChange,
  onExportBusinessCosts,
  onAuditPayable,
  onReverseAuditPayable,
  onDeletePayable,
  onBatchAuditPayables,
  onBatchReverseAuditPayables,
  onCreatePayable,
  onUpdatePayable,
  onPayableRowsChange,
  onExportPayables,
  shipments,
  shipmentFinanceDetails,
  shipmentOperationLogs,
  onApproveShipment,
  onRejectShipment,
  onEditShipment,
  onViewShipmentLog,
  onDeleteShipment,
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
  menuMode = 'finance'
}: {
  menuMode?: 'business' | 'finance' | 'catalog';
  role: import('../../apiClient').RoleKey;
  username: string;
  permissions: PermissionKey[];
  receivables: ReceivableAuditSummary[];
  businessCostAudits: BusinessCostAuditSummary[];
  payableAudits: PayableAuditSummary[];
  statements: CustomerStatementSummary[];
  accounts: CustomerAccountSummary[];
  ledger: AccountLedgerSummary[];
  notice: string | null;
  onCreateStatement: () => Promise<void>;
  onCreatePayment: () => Promise<void>;
  onAuditReceivable: (id: string) => Promise<void>;
  onReverseAuditReceivable: (id: string) => Promise<void>;
  onDeleteReceivable: (id: string) => Promise<void>;
  onBatchAuditReceivables: (ids: string[]) => Promise<void>;
  onBatchReverseAuditReceivables: (ids: string[]) => Promise<void>;
	  onCreateReceivable: (input: ReceivableAuditCreateInput) => Promise<void>;
	  onReceivableRowsChange: (rows: ReceivableAuditSummary[]) => void;
	  onExportReceivables: (ids: string[]) => Promise<void>;
  onAuditBusinessCost: (id: string) => Promise<void>;
  onReverseAuditBusinessCost: (id: string) => Promise<void>;
  onDeleteBusinessCost: (id: string) => Promise<void>;
  onBatchAuditBusinessCosts: (ids: string[]) => Promise<void>;
  onBatchReverseAuditBusinessCosts: (ids: string[]) => Promise<void>;
  onCreateBusinessCost: (input: BusinessCostAuditCreateInput) => Promise<void>;
  onUpdateBusinessCost: (id: string, input: BusinessCostAuditUpdateInput) => Promise<void>;
  onBusinessCostRowsChange: (rows: BusinessCostAuditSummary[]) => void;
  onExportBusinessCosts: (ids: string[]) => Promise<void>;
  onAuditPayable: (id: string) => Promise<void>;
  onReverseAuditPayable: (id: string) => Promise<void>;
  onDeletePayable: (id: string) => Promise<void>;
  onBatchAuditPayables: (ids: string[]) => Promise<void>;
  onBatchReverseAuditPayables: (ids: string[]) => Promise<void>;
  onCreatePayable: (input: PayableAuditCreateInput) => Promise<void>;
  onUpdatePayable: (id: string, input: PayableAuditUpdateInput) => Promise<void>;
  onPayableRowsChange: (rows: PayableAuditSummary[]) => void;
  onExportPayables: (ids: string[]) => Promise<void>;
  shipments: Shipment[];
  shipmentFinanceDetails: Record<string, ShipmentFinanceDetailSummary>;
  shipmentOperationLogs: Record<string, ShipmentOperationLog[]>;
  onApproveShipment: (record: Shipment) => Promise<void>;
  onRejectShipment: (record: Shipment) => Promise<void>;
  onEditShipment: (record: Shipment) => void;
  onViewShipmentLog: (record: Shipment) => void;
  onDeleteShipment: (record: Shipment) => Promise<void>;
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
  const defaultSection = menuMode === 'business' ? 'business-dashboard' : menuMode === 'catalog' ? 'fee-names' : 'finance-dashboard';
  const total = receivables.filter((fee) => !fee.voided && fee.reconciliationStatus !== 'CONFIRMED').reduce((sum, fee) => sum + fee.amount, 0);
  const primaryAccount = accounts.find((account) => account.customerId === 'c-9409') ?? accounts[0];
  const [activeFinanceSection, setActiveFinanceSection] = useState(defaultSection);
  const [pendingPaymentInitialQuery, setPendingPaymentInitialQuery] = useState<PendingPaymentListQuery | undefined>();
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<string[]>([]);
  const [selectedBusinessCostIds, setSelectedBusinessCostIds] = useState<string[]>([]);
  const [selectedPayableIds, setSelectedPayableIds] = useState<string[]>([]);
  const [receivableCreateOpen, setReceivableCreateOpen] = useState(false);
  const [businessCostEditor, setBusinessCostEditor] = useState<BusinessCostAuditSummary | null>(null);
  const [businessCostCreateOpen, setBusinessCostCreateOpen] = useState(false);
  const [payableEditor, setPayableEditor] = useState<PayableAuditSummary | null>(null);
  const [payableCreateOpen, setPayableCreateOpen] = useState(false);
  const financeCatalog = useFinanceCatalog(apiClient);
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
  const [financeReviewSelectedRowKeys, setFinanceReviewSelectedRowKeys] = useState<Key[]>([]);
  const [pendingReviewView, setPendingReviewView] = useState<'ACTIVE' | 'DELETED'>('ACTIVE');
  const [pendingReviewRows, setPendingReviewRows] = useState<Shipment[]>([]);
  const [deletedReviewRows, setDeletedReviewRows] = useState<Shipment[]>([]);
  const [pendingReviewLoading, setPendingReviewLoading] = useState(false);
  const [deletedReviewLoading, setDeletedReviewLoading] = useState(false);
  const [pendingReviewDetail, setPendingReviewDetail] = useState<ShipmentReviewDetailSummary | null>(null);
  const [pendingReviewDetailLoading, setPendingReviewDetailLoading] = useState(false);
  const [pendingReviewSubmitting, setPendingReviewSubmitting] = useState(false);
  const [reviewRestoreTarget, setReviewRestoreTarget] = useState<Shipment | null>(null);
  const [reviewRestoreSubmitting, setReviewRestoreSubmitting] = useState(false);
  const [reviewRestoreForm] = Form.useForm<{
    mode: 'KEEP_ORIGINAL_TIME' | 'RESET_CREATED_TIME' | 'MANUAL_TIME';
    manualCreatedAt?: string;
    reason?: string;
  }>();
  const hasUiPermission = (permission: PermissionKey) => role === 'ADMIN' || permissions.includes(permission);
  const canRestoreReviewShipment = hasUiPermission('orders:review:restore');
  const canPurgeReviewShipment = hasUiPermission('orders:review:purge');
  const emptyReceivableFilters: FinanceReviewFilters = {
    systemOrderNo: '',
    customer: '',
    transferNo: '',
    salesperson: '',
    agent: '',
    feeName: '',
    createdBy: '',
    reviewedBy: '',
    paymentNo: '',
    status: 'ALL',
    createdFrom: '',
    createdTo: '',
    reviewedFrom: '',
    reviewedTo: '',
    remark: ''
  };
  const [receivableFilterDraft, setReceivableFilterDraft] = useState(emptyReceivableFilters);
  const [receivableFilters, setReceivableFilters] = useState(emptyReceivableFilters);
  const [receivableForm] = Form.useForm<ReceivableAuditCreateInput>();
  const [businessCostFilterDraft, setBusinessCostFilterDraft] = useState(emptyReceivableFilters);
  const [businessCostFilters, setBusinessCostFilters] = useState(emptyReceivableFilters);
  const [businessCostForm] = Form.useForm<BusinessCostAuditCreateInput & BusinessCostAuditUpdateInput>();
  const [payableFilterDraft, setPayableFilterDraft] = useState(emptyReceivableFilters);
  const [payableFilters, setPayableFilters] = useState(emptyReceivableFilters);
  const [payableForm] = Form.useForm<PayableAuditCreateInput & PayableAuditUpdateInput>();
  const [financeDashboard, setFinanceDashboard] = useState<FinanceDashboardResponse | null>(null);
  const [financeDashboardLoading, setFinanceDashboardLoading] = useState(false);
  const [financeDashboardError, setFinanceDashboardError] = useState<string | null>(null);
  const updateReceivableFilterDraft = (key: keyof typeof emptyReceivableFilters, value: string) => {
    setReceivableFilterDraft((current) => ({ ...current, [key]: value }));
  };
  const applyReceivableFilters = () => {
    setReceivableFilters(receivableFilterDraft);
  };
  const resetReceivableFilters = () => {
    setReceivableFilterDraft(emptyReceivableFilters);
    setReceivableFilters(emptyReceivableFilters);
  };
  const updateBusinessCostFilterDraft = (key: keyof typeof emptyReceivableFilters, value: string) => {
    setBusinessCostFilterDraft((current) => ({ ...current, [key]: value }));
  };
  const applyBusinessCostFilters = () => {
    setBusinessCostFilters(businessCostFilterDraft);
  };
  const resetBusinessCostFilters = () => {
    setBusinessCostFilterDraft(emptyReceivableFilters);
    setBusinessCostFilters(emptyReceivableFilters);
  };
  const updatePayableFilterDraft = (key: keyof typeof emptyReceivableFilters, value: string) => {
    setPayableFilterDraft((current) => ({ ...current, [key]: value }));
  };
  const applyPayableFilters = () => {
    setPayableFilters(payableFilterDraft);
  };
  const resetPayableFilters = () => {
    setPayableFilterDraft(emptyReceivableFilters);
    setPayableFilters(emptyReceivableFilters);
  };
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
  const filterReviewRows = useCallback((baseRows: Shipment[]) => {
    const includes = (value: string | undefined, keyword: string) => !keyword || (value ?? '').toLowerCase().includes(keyword.toLowerCase());
    const inDateRange = (value: string, from: string, to: string) => {
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
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
    () => {
      const baseRows = pendingReviewRows.length
        ? pendingReviewRows
        : shipments.filter((shipment) => shipment.status === 'DRAFT' || shipment.status === 'REVIEW_PENDING');
      return filterReviewRows(baseRows);
    },
    [filterReviewRows, pendingReviewRows, shipments]
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
  const isSalesScopedRole = salesScopedRoleKeys.includes(role);
  const canFinalReviewShipment = false;
  const canBusinessReviewShipment = pendingReviewView === 'ACTIVE' && (isSalesScopedRole || (role === 'ADMIN' && menuMode === 'business'));
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
  const getPendingReviewCustomerCode = (shipment?: Shipment | null) => {
    return shipment?.customerCode || shipment?.customerName?.split('-')[0]?.trim() || '-';
  };
  const getPendingReviewCustomer = (shipment?: Shipment | null) => {
    if (!shipment) return '-';
    return `${getPendingReviewCustomerCode(shipment)} / ${formatPendingReviewValue(shipment.customerName)}`;
  };
  const getPendingReviewChannel = (shipment?: Shipment | null) => formatPendingReviewValue(shipment?.channelName || shipment?.carrier);
  const detailShipment = pendingReviewDetail?.shipment ?? selectedPendingReviewShipment;
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
    { label: '重量', value: formatPendingReviewWeight(detailShipment?.receivableWeightKg) },
    { label: '体积', value: detailShipment?.volumeCbm ? `${detailShipment.volumeCbm.toFixed(3)} m³` : '-' },
    { label: '计费重', value: formatPendingReviewWeight(detailShipment?.agentWeightKg || detailShipment?.receivableWeightKg) },
    { label: '是否报关', value: detailShipment?.declarationRequired ? '是' : '否' },
    { label: '是否敏感', value: detailShipment?.sensitive ? '是' : '否' },
    { label: '渠道', value: getPendingReviewChannel(detailShipment) },
    { label: '价格', value: pendingReviewDetail ? pendingReviewPriceText : '-' },
    { label: '运单号', value: formatPendingReviewValue(detailShipment?.systemOrderNo) }
  ];
  const pendingReviewSummaryText = [
    getPendingReviewCustomerCode(detailShipment),
    formatPendingReviewValue(detailShipment?.productName),
    formatPendingReviewValue(detailShipment?.destinationCountry),
    formatPendingReviewValue(detailShipment?.packageCount),
    formatPendingReviewWeight(detailShipment?.receivableWeightKg),
    detailShipment?.volumeCbm ? `${detailShipment.volumeCbm.toFixed(3)}CBM` : '-',
    formatPendingReviewWeight(detailShipment?.agentWeightKg || detailShipment?.receivableWeightKg),
    detailShipment?.declarationRequired ? '是' : '否',
    detailShipment?.sensitive ? '是' : '否',
    getPendingReviewChannel(detailShipment),
    pendingReviewDetail ? pendingReviewPriceText : '-',
    formatPendingReviewValue(detailShipment?.systemOrderNo)
  ].join('——');
  const copyPendingReviewSummary = async () => {
    if (!selectedPendingReviewShipment) return;
    try {
      await navigator.clipboard?.writeText(pendingReviewSummaryText);
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
  const returnToPendingReviewList = () => {
    setFinanceReviewSelectedShipmentId(null);
    setPendingReviewDetail(null);
  };
  const approvePendingReview = (target = selectedPendingReviewShipment) => {
    if (!target) return;
    const isBusinessReview = canBusinessReviewShipment && !target.businessReviewedAt;
    confirmDangerousAction({
      title: isBusinessReview ? '确认自审通过该订单？' : '确认审核通过该订单？',
      content: isBusinessReview ? '自审通过后，订单进入待排货，并同步进入财务管理的业务成本审核。' : '审核通过后，该订单会进入待排货队列，费用和货物信息将进入后续财务与仓库流转。',
      okText: isBusinessReview ? '自审通过' : '审核通过',
      confirm: modal.confirm,
      onOk: async () => {
        setPendingReviewSubmitting(true);
        try {
          const detail = await apiClient.approveShipmentReview(target.id, isBusinessReview ? { businessReview: true } : undefined);
          messageApi.success(isBusinessReview ? '自审通过，已进入待排货与业务成本审核' : '审核通过，已进入待排货');
          setFinanceReviewSelectedShipmentId(null);
          setPendingReviewDetail(null);
          await refreshPendingReviewWorkbench(detail);
        } catch (error) {
          modal.error({ title: '审核通过失败', content: error instanceof Error ? error.message : '请补齐资料后重试' });
        } finally {
          setPendingReviewSubmitting(false);
        }
      }
    });
  };
  const handleOrderEntryCreated = async (detail?: OrderEntryDetailSummary, submittedForReview?: boolean) => {
    await loadPendingReviewRows();
    if (!submittedForReview || !detail) return;
    setPendingReviewView('ACTIVE');
    setFinanceReviewFilterDraft(emptyFinanceReviewFilters);
    setFinanceReviewFilters(emptyFinanceReviewFilters);
    setPendingReviewDetail(null);
    setFinanceReviewSelectedShipmentId(detail.shipment.id);
    setActiveFinanceSection('pending-review');
  };
  const rejectPendingReview = (target = selectedPendingReviewShipment) => {
    if (!target) return;
    let reason = '';
    modal.confirm({
      title: '驳回并退回修改',
      content: <Input.TextArea rows={4} placeholder="请填写驳回原因" onChange={(event) => { reason = event.target.value; }} />,
      okText: '确认驳回',
      cancelText: '取消',
      onOk: async () => {
        const trimmed = reason.trim();
        if (!trimmed) {
          messageApi.warning('驳回必须填写原因');
          throw new Error('驳回必须填写原因');
        }
        const detail = await apiClient.rejectShipmentReview(target.id, { reason: trimmed });
        messageApi.success('已驳回并退回修改');
        setFinanceReviewSelectedShipmentId(null);
        setPendingReviewDetail(null);
        await refreshPendingReviewWorkbench(detail);
      }
    });
  };
  const deletePendingReview = (target = selectedPendingReviewShipment) => {
    if (!target) return;
    let reason = '';
    modal.confirm({
      title: '删除待审核订单',
      content: <Input.TextArea rows={3} placeholder="可填写删除原因" onChange={(event) => { reason = event.target.value; }} />,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        const detail = await apiClient.deleteShipmentReview(target.id, { reason: reason.trim() || '审核台人工删除' });
        messageApi.success('已删除，订单可从删除视图恢复');
        setFinanceReviewSelectedShipmentId(null);
        setPendingReviewDetail(null);
        await refreshPendingReviewWorkbench(detail);
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
        manualCreatedAt: values.mode === 'MANUAL_TIME' ? values.manualCreatedAt : undefined,
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
  const reviewPackageColumns: ColumnsType<ShipmentReviewPackageSummary> = [
    { title: '包裹ID', dataIndex: 'warehousePackageId', width: 160, render: (value?: string) => value || '-' },
    { title: '客户单号', dataIndex: 'customerOrderNo', width: 150 },
    { title: '国内单号', dataIndex: 'domesticTrackingNo', width: 150, render: (value?: string) => value || '-' },
    { title: '箱/包裹号', dataIndex: 'packageNo', width: 140, render: (value?: string) => value || '-' },
    { title: '件数', dataIndex: 'packageCount', width: 80 },
    { title: '实重', dataIndex: 'weightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '长宽高', key: 'dims', width: 130, render: (_, row) => `${row.lengthCm}×${row.widthCm}×${row.heightCm}` },
    { title: '体积', dataIndex: 'cbm', width: 100, render: (value: number) => `${value.toFixed(3)} m³` },
    { title: '材积重', dataIndex: 'volumetricWeightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '计费重', dataIndex: 'chargeableWeightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '入仓时间', dataIndex: 'inboundAt', width: 160, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    { title: '异常', dataIndex: 'exceptions', width: 160, render: (items: string[]) => items.length ? items.join('、') : '-' }
  ];
  const reviewEventColumns: ColumnsType<ShipmentReviewEventSummary> = [
    { title: '时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
    { title: '类型', dataIndex: 'type', width: 90, render: (value: string) => value === 'TRACKING' ? '轨迹' : '日志' },
    { title: '动作', dataIndex: 'title', width: 140 },
    { title: '内容', dataIndex: 'note', render: (value: string | undefined, row) => value || (row.toStatus ? `${row.fromStatus ? shipmentStatusLabels[row.fromStatus] : '-'} -> ${shipmentStatusLabels[row.toStatus]}` : '-') }
  ];
  const pendingReviewColumns: ColumnsType<Shipment> = [
    { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 165, render: (value: string) => formatBeijingDateTime(value) },
    { title: '客户编号', key: 'customerCode', width: 110, render: (_, record) => getPendingReviewCustomerCode(record) },
    {
      title: '客户名称',
      key: 'customerName',
      dataIndex: 'customerName',
      width: 185,
      render: (value: string) => <Text strong>{formatPendingReviewValue(value)}</Text>
    },
    { title: '业务员', key: 'salesperson', dataIndex: 'salesperson', width: 120, render: (value?: string) => formatPendingReviewValue(value) },
    {
      title: '运单号',
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
    { title: '转单号', key: 'transferNo', dataIndex: 'transferNo', width: 150, render: (value?: string) => formatPendingReviewValue(value) },
    { title: '目的地', key: 'destinationCountry', dataIndex: 'destinationCountry', width: 110, render: (value?: string) => formatPendingReviewValue(value) },
    { title: '业务渠道', key: 'channelName', dataIndex: 'channelName', width: 150, render: (_: string, record) => getPendingReviewChannel(record) },
    { title: '代理渠道', key: 'agentName', dataIndex: 'agentName', width: 150, render: (value?: string) => formatPendingReviewValue(value) },
    { title: '件数', key: 'packageCount', dataIndex: 'packageCount', width: 90, render: (value?: number) => formatPendingReviewValue(value) },
    {
      title: '应收/代理计费重',
      key: 'weights',
      width: 170,
      render: (_, record) => `${formatPendingReviewWeight(record.receivableWeightKg)} / ${formatPendingReviewWeight(record.agentWeightKg)}`
    },
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
      width: pendingReviewView === 'DELETED' ? 210 : 230,
      render: (_, record) => pendingReviewView === 'DELETED' ? (
        <Space size={6}>
          <Button size="small" onClick={(event) => { event.stopPropagation(); setFinanceReviewSelectedShipmentId(record.id); }}>详情</Button>
          {canRestoreReviewShipment ? <Button size="small" onClick={(event) => { event.stopPropagation(); openRestoreReviewShipment(record); }}>恢复</Button> : null}
          {canPurgeReviewShipment ? <Button size="small" danger onClick={(event) => { event.stopPropagation(); purgeReviewShipment(record); }}>彻底删除</Button> : null}
        </Space>
      ) : (
        <Space size={6}>
          <Button size="small" onClick={(event) => { event.stopPropagation(); setFinanceReviewSelectedShipmentId(record.id); }}>详情</Button>
          {canBusinessReviewShipment && !record.businessReviewedAt ? <Button size="small" type="primary" onClick={(event) => { event.stopPropagation(); approvePendingReview(record); }}>自审通过</Button> : null}
          {canFinalReviewShipment ? (
            <>
              <Button size="small" onClick={(event) => { event.stopPropagation(); rejectPendingReview(record); }}>驳回</Button>
              <Button size="small" type="primary" onClick={(event) => { event.stopPropagation(); approvePendingReview(record); }}>审核通过</Button>
              <Button size="small" danger onClick={(event) => { event.stopPropagation(); deletePendingReview(record); }}>删除</Button>
            </>
          ) : null}
        </Space>
      )
    }
  ];
  const renderPendingReviewPage = () => (
    <div className="finance-pending-review-page">
      {!selectedPendingReviewShipment ? (
        <Card
          className="finance-pending-list-card finance-pending-list-page-card"
          title="待审核列表"
          extra={(
            <Space size={8}>
              <Button size="small" type={pendingReviewView === 'ACTIVE' ? 'primary' : 'default'} onClick={() => setPendingReviewView('ACTIVE')}>待审核订单</Button>
              {canRestoreReviewShipment ? (
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
                <Input allowClear placeholder="运单号" value={financeReviewFilterDraft.systemOrderNo} onChange={(event) => setFinanceReviewFilterDraft((current) => ({ ...current, systemOrderNo: event.target.value }))} />
                <Select value={financeReviewFilterDraft.overdue} options={[{ value: 'ALL', label: '全部' }, { value: 'true', label: '超时' }, { value: 'false', label: '正常' }]} onChange={(value) => setFinanceReviewFilterDraft((current) => ({ ...current, overdue: value }))} />
              </div>
              <Space size={8} className="finance-pending-filter-actions">
                <Button type="primary" onClick={() => setFinanceReviewFilters(financeReviewFilterDraft)}>筛选</Button>
                <Button onClick={() => { setFinanceReviewFilterDraft(emptyFinanceReviewFilters); setFinanceReviewFilters(emptyFinanceReviewFilters); }}>重置</Button>
              </Space>
            </div>
            <ManagedTable<Shipment>
              className="finance-work-table"
              rowKey="id"
              size="small"
              columns={pendingReviewColumns}
              columnSettings={{
                storageKey: 'sunny.finance.pending-review.columns',
                title: '待审核运单列设置',
                defaultHiddenKeys: ['agentName', 'productName', 'declarationRequired', 'sensitive', 'overdue'],
                buttonLabel: '列设置'
              }}
              dataSource={currentReviewRows}
              loading={pendingReviewView === 'DELETED' ? deletedReviewLoading : pendingReviewLoading}
              pagination={tenRowTablePagination}
              minimumScrollX={1600}
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
            className="finance-pending-summary-card"
            title="待审核摘要"
            extra={<Button size="small" disabled={!selectedPendingReviewShipment} onClick={copyPendingReviewSummary}>复制摘要</Button>}
          >
            <div className="finance-pending-final-summary">
              <Text strong>最终审核摘要</Text>
              <Input.TextArea readOnly rows={3} value={pendingReviewSummaryText} />
            </div>
            <div className="finance-pending-summary-grid" data-testid="finance-pending-summary">
              {pendingReviewSummaryItems.map((item) => (
                <div className="finance-pending-summary-item" key={item.label}>
                  <div className="finance-pending-summary-label">{item.label}</div>
                  <div className="finance-pending-summary-value">{item.value}</div>
                </div>
              ))}
            </div>
          </Card>
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
                    <Button size="small" onClick={() => onEditShipment(selectedPendingReviewShipment)}>修改</Button>
                    <Button size="small" onClick={() => onViewShipmentLog(selectedPendingReviewShipment)}>操作日志</Button>
                    {canBusinessReviewShipment && !selectedPendingReviewShipment.businessReviewedAt ? <Button size="small" type="primary" loading={pendingReviewSubmitting} onClick={() => approvePendingReview()}>自审通过</Button> : null}
                    {canFinalReviewShipment ? (
                      <>
                        <Button size="small" danger onClick={() => deletePendingReview()}>删除</Button>
                        <Button size="small" onClick={() => rejectPendingReview()}>驳回</Button>
                        <Button size="small" type="primary" loading={pendingReviewSubmitting} onClick={() => approvePendingReview()}>审核通过</Button>
                      </>
                    ) : null}
                  </>
                )}
              </Space>
            ) : null}
          >
            {pendingReviewDetail ? (
              <>
                <div className="finance-pending-alert-stack">
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
                      children: renderReviewKeyValues([
                        ['客户', getPendingReviewCustomer(detailShipment)],
                        ['客户单号', detailShipment?.customerOrderNo],
                        ['运单号', detailShipment?.systemOrderNo],
                        ['转单号', detailShipment?.transferNo],
                        ['收货渠道', detailShipment?.carrier],
                        ['业务渠道', detailShipment?.channelName],
                        ['代理渠道', detailShipment?.agentName],
                        ['目的地', detailShipment?.destinationCountry],
                        ['是否报关', detailShipment?.declarationRequired ? '是' : '否'],
                        ['是否敏感', detailShipment?.sensitive ? '是' : '否'],
                        ['货物属性', detailShipment?.cargoType],
                        ['产品名称', detailShipment?.productName],
                        ['件数', detailShipment?.packageCount],
                        ['实重', formatPendingReviewWeight(detailShipment?.receivableWeightKg)],
                        ['体积', detailShipment?.volumeCbm ? `${detailShipment.volumeCbm.toFixed(3)} m³` : '-'],
                        ['计费重', formatPendingReviewWeight(detailShipment?.agentWeightKg || detailShipment?.receivableWeightKg)],
                        ['结算方式', detailShipment?.settlementMethod],
                        ['贸易条款', detailShipment?.tradeTerms],
                        ['入仓号', detailShipment?.inboundNo],
                        ['FBA 入仓号', detailShipment?.fbaInboundNo],
                        ['FBA 仓库代码', detailShipment?.fbaWarehouseCode],
                        ['收货人名称', detailShipment?.receiverName],
                        ['收货人公司名称', detailShipment?.receiverCompany],
                        ['收货人电话', detailShipment?.receiverPhone],
                        ['收货人地址', detailShipment?.receiverAddress],
                        ['国家', detailShipment?.receiverCountry],
                        ['州/省', detailShipment?.receiverState],
                        ['邮编', detailShipment?.receiverPostalCode],
                        ['录单日期', detailShipment?.createdAt ? formatBeijingDateTime(detailShipment.createdAt) : '-'],
                        ['出库日期', detailShipment?.outboundAt ? formatBeijingDateTime(detailShipment.outboundAt) : '-'],
                        ['录单人', detailShipment?.entryBy]
                      ])
                    },
                    {
                      key: 'packages',
                      label: '单件明细',
                      children: <Table className="finance-embedded-table" rowKey="id" size="small" columns={reviewPackageColumns} dataSource={pendingReviewDetail.packages} pagination={false} scroll={{ x: 1500 }} />
                    },
                    {
                      key: 'problems',
                      label: '问题处理',
                      children: pendingReviewDetail.problemTickets.length ? <Table className="finance-embedded-table" rowKey="id" size="small" dataSource={pendingReviewDetail.problemTickets} pagination={false} columns={[
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
                            <MetricCard title="应付" value={formatCurrency(pendingReviewDetail.finance.payableTotal ?? 0)} icon={<Landmark size={16} />} extra="代理侧" />
                          </Flex>
                          <Divider className="finance-pending-section-divider" />
                          {renderShipmentFinancePanel(pendingReviewDetail.shipment, pendingReviewDetail.finance)}
                        </>
                      )
                    },
                    { key: 'time', label: '时间', children: renderReviewKeyValues([['创建时间', formatBeijingDateTime(detailShipment?.createdAt ?? '')], ['业务自审时间', detailShipment?.businessReviewedAt ? formatBeijingDateTime(detailShipment.businessReviewedAt) : '-'], ['终审时间', detailShipment?.reviewedAt ? formatBeijingDateTime(detailShipment.reviewedAt) : '-'], ['删除时间', detailShipment?.deletedAt ? formatBeijingDateTime(detailShipment.deletedAt) : '-']]) },
                    { key: 'logs', label: '日志', children: <Table className="finance-embedded-table" rowKey="id" size="small" columns={reviewEventColumns} dataSource={pendingReviewDetail.events} pagination={false} /> },
                    { key: 'tracking', label: '轨迹', children: <Table className="finance-embedded-table" rowKey="id" size="small" columns={reviewEventColumns} dataSource={pendingReviewDetail.trackingEvents} pagination={false} /> },
                    { key: 'files', label: '文件', children: <Text type="secondary">暂无文件记录</Text> },
                    { key: 'settings', label: '设置', children: renderReviewKeyValues([['状态', shipmentStatusLabels[pendingReviewDetail.shipment.status]], ['驳回原因', pendingReviewDetail.shipment.reviewRejectedReason]]) },
                    { key: 'insurance', label: '投保', children: <Text type="secondary">暂无投保记录</Text> }
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
  const financeSubItems: ModuleSubNavItem[] =
    menuMode === 'business'
      ? [
          { key: 'business-dashboard', label: '业务看板' },
          { key: 'finance-entry', label: '录单' },
          { key: 'pending-review', label: '待审核运单' },
          { key: 'order-management', label: '运单管理' },
          { key: 'order-ai', label: 'AI 订单助手' }
        ]
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
        : [
            { key: 'finance-dashboard', label: '财务看板' },
            { key: 'receivables', label: '应收审核' },
            { key: 'business-costs', label: '业务成本审核' },
            { key: 'payables', label: '市场应付审核' },
            { key: 'payment-applications', label: '待付款' },
            { key: 'paid-verification', label: '待支付/已支付' },
            { key: 'water-receipts', label: '水单匹配' },
            { key: 'agent-bill-ai', label: '代理账单' }
          ];
  useEffect(() => {
    if (!financeSubItems.some((item) => item.key === activeFinanceSection)) {
      setActiveFinanceSection(financeSubItems[0]?.key ?? defaultSection);
    }
  }, [activeFinanceSection, defaultSection, financeSubItems]);

  useEffect(() => {
    if (prefillOrderEntryPackageIds?.length) {
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
    setActiveFinanceSection('agent-bill-ai');
  };
  const filteredReceivables = useMemo(() => {
    const inDateRange = (value: string | undefined, from: string, to: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const includes = (value: string | undefined, keyword: string) => !keyword || (value ?? '').toLowerCase().includes(keyword.toLowerCase());
    return receivables.filter((fee) => {
      const customerMatches = !receivableFilters.customer
        || [fee.customerName, fee.customerCode, fee.customerOrderNo].some((value) => includes(value, receivableFilters.customer));
      return includes(fee.systemOrderNo, receivableFilters.systemOrderNo)
        && customerMatches
        && includes(fee.transferNo, receivableFilters.transferNo)
        && includes(fee.salesperson, receivableFilters.salesperson)
        && includes(fee.name, receivableFilters.feeName)
        && includes(fee.createdBy, receivableFilters.createdBy)
        && includes(fee.reviewedBy, receivableFilters.reviewedBy)
        && includes(fee.paymentNo, receivableFilters.paymentNo)
        && includes(fee.remark, receivableFilters.remark)
        && (receivableFilters.status === 'ALL' || fee.reconciliationStatus === receivableFilters.status)
        && inDateRange(fee.createdAt, receivableFilters.createdFrom, receivableFilters.createdTo)
        && inDateRange(fee.reviewedAt, receivableFilters.reviewedFrom, receivableFilters.reviewedTo);
    });
  }, [receivables, receivableFilters]);
  const filteredBusinessCosts = useMemo(() => {
    const inDateRange = (value: string | undefined, from: string, to: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const includes = (value: string | undefined, keyword: string) => !keyword || (value ?? '').toLowerCase().includes(keyword.toLowerCase());
    return businessCostAudits.filter((fee) => {
      const customerMatches = !businessCostFilters.customer
        || [fee.customerName, fee.customerCode, fee.customerOrderNo].some((value) => includes(value, businessCostFilters.customer));
      return includes(fee.systemOrderNo, businessCostFilters.systemOrderNo)
        && customerMatches
        && includes(fee.transferNo, businessCostFilters.transferNo)
        && includes(fee.salesperson, businessCostFilters.salesperson)
        && includes(fee.name, businessCostFilters.feeName)
        && includes(fee.createdBy, businessCostFilters.createdBy)
        && includes(fee.reviewedBy, businessCostFilters.reviewedBy)
        && includes(fee.paymentNo, businessCostFilters.paymentNo)
        && includes(fee.remark, businessCostFilters.remark)
        && (businessCostFilters.status === 'ALL' || fee.reconciliationStatus === businessCostFilters.status)
        && inDateRange(fee.createdAt, businessCostFilters.createdFrom, businessCostFilters.createdTo)
        && inDateRange(fee.reviewedAt, businessCostFilters.reviewedFrom, businessCostFilters.reviewedTo);
    });
  }, [businessCostAudits, businessCostFilters]);
  const businessCostSummary = useMemo(() => {
    const activeRows = filteredBusinessCosts.filter((fee) => !fee.voided);
    return {
      pending: activeRows.filter((fee) => fee.reconciliationStatus !== 'CONFIRMED').length,
      confirmed: activeRows.filter((fee) => fee.reconciliationStatus === 'CONFIRMED').length,
      profit: activeRows.reduce((sum, fee) => sum + (fee.businessProfit ?? 0), 0),
      count: activeRows.length
    };
  }, [filteredBusinessCosts]);
  const filteredPayables = useMemo(() => {
    const inDateRange = (value: string | undefined, from: string, to: string) => {
      if (!value) return !from && !to;
      const timestamp = new Date(value).getTime();
      if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
      if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
      return true;
    };
    const includes = (value: string | undefined, keyword: string) => !keyword || (value ?? '').toLowerCase().includes(keyword.toLowerCase());
    return payableAudits.filter((fee) => {
      const customerMatches = !payableFilters.customer
        || [fee.customerName, fee.customerCode, fee.customerOrderNo].some((value) => includes(value, payableFilters.customer));
      return includes(fee.systemOrderNo, payableFilters.systemOrderNo)
        && customerMatches
        && includes(fee.transferNo, payableFilters.transferNo)
        && includes(fee.salesperson, payableFilters.salesperson)
        && includes(fee.agentName, payableFilters.agent)
        && includes(fee.name, payableFilters.feeName)
        && includes(fee.createdBy, payableFilters.createdBy)
        && includes(fee.reviewedBy, payableFilters.reviewedBy)
        && includes(fee.paymentNo, payableFilters.paymentNo)
        && includes(fee.remark, payableFilters.remark)
        && (payableFilters.status === 'ALL' || fee.reconciliationStatus === payableFilters.status)
        && inDateRange(fee.createdAt, payableFilters.createdFrom, payableFilters.createdTo)
        && inDateRange(fee.reviewedAt, payableFilters.reviewedFrom, payableFilters.reviewedTo);
    });
  }, [payableAudits, payableFilters]);
  const payableSummary = useMemo(() => {
    const activeRows = filteredPayables.filter((fee) => !fee.voided);
    return {
      pending: activeRows.filter((fee) => fee.reconciliationStatus !== 'CONFIRMED').length,
      confirmed: activeRows.filter((fee) => fee.reconciliationStatus === 'CONFIRMED').length,
      total: activeRows.reduce((sum, fee) => sum + fee.amount, 0),
      count: activeRows.length
    };
  }, [filteredPayables]);
  function openBusinessCostEditor(row?: BusinessCostAuditSummary) {
    setBusinessCostEditor(row ?? null);
    const settlementMethod = row?.settlementMethod;
    businessCostForm.setFieldsValue(row ? {
      systemOrderNo: row.systemOrderNo,
      customerOrderNo: row.customerOrderNo,
      transferNo: row.transferNo,
      customerCode: row.customerCode,
      name: row.name,
      amount: row.amount,
      currency: normalizeFinanceCatalogCurrency(row.currency) ?? getSettlementMethodCurrency(financeCatalog.settlementRows, settlementMethod) ?? 'RMB',
      settlementMethod,
      paymentNo: row.paymentNo,
      agentName: row.agentName,
      chargeWeightKg: row.chargeWeightKg,
      unitPrice: row.unitPrice,
      remark: row.remark
    } : { name: '业务员成本', currency: 'RMB' });
    setBusinessCostCreateOpen(true);
  }
  function openPayableEditor(row?: PayableAuditSummary) {
    setPayableEditor(row ?? null);
    const settlementMethod = row?.settlementMethod;
    payableForm.setFieldsValue(row ? {
      systemOrderNo: row.systemOrderNo,
      customerOrderNo: row.customerOrderNo,
      transferNo: row.transferNo,
      customerCode: row.customerCode,
      name: row.name,
      amount: row.amount,
      currency: normalizeFinanceCatalogCurrency(row.currency) ?? getSettlementMethodCurrency(financeCatalog.settlementRows, settlementMethod) ?? 'RMB',
      settlementMethod,
      paymentNo: row.paymentNo,
      remark: row.remark
    } : { name: '代理运费', currency: 'RMB' });
    setPayableCreateOpen(true);
  }
  async function submitReceivableCreate() {
    const values = await receivableForm.validateFields();
    await onCreateReceivable(values);
    receivableForm.resetFields();
    setReceivableCreateOpen(false);
  }
  async function submitBusinessCost() {
    const values = await businessCostForm.validateFields();
    if (businessCostEditor) {
      await onUpdateBusinessCost(businessCostEditor.id, values);
    } else {
      await onCreateBusinessCost(values);
    }
    businessCostForm.resetFields();
    setBusinessCostEditor(null);
    setBusinessCostCreateOpen(false);
  }
  async function submitPayable() {
    const values = await payableForm.validateFields();
    if (payableEditor) {
      await onUpdatePayable(payableEditor.id, values);
    } else {
      await onCreatePayable(values);
    }
    payableForm.resetFields();
    setPayableEditor(null);
    setPayableCreateOpen(false);
  }

  const dashboardValue = (item: FinanceDashboardItem) => {
    if (typeof item.amount === 'number') return formatCurrency(item.amount);
    if (item.value) return item.value;
    return String(item.count ?? 0);
  };

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
    <AppPage>
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
          <MetricCard icon={<Banknote />} title="待审应收" value={formatCurrency(total)} extra={`${filteredReceivables.length} 条应收`} />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<FileText />} title="对账草稿" value={statements.length} extra="客户账单待确认" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<CircleDollarSign />} title="账户余额" value={primaryAccount ? formatCurrency(primaryAccount.balance) : '¥0.00'} extra={primaryAccount?.customerName ?? '待初始化'} />
        </Col>
      </Row> : null}

      <ModuleSubWorkspace items={financeSubItems} activeKey={activeFinanceSection} onChange={setActiveFinanceSection}>
      <Row gutter={[16, 16]} className="main-grid finance-main-grid">
        <Col xs={24}>
          {activeFinanceSection === 'business-dashboard' ? <PlaceholderPanel title="业务看板" /> : null}
          {activeFinanceSection === 'finance-dashboard' ? renderFinanceDashboard() : null}
          {activeFinanceSection === 'order-management' ? renderOrderManagement?.() ?? <PlaceholderPanel title="运单管理" /> : null}
          {activeFinanceSection === 'order-ai' ? renderOrderAi?.() ?? <PlaceholderPanel title="AI 订单助手" /> : null}
        </Col>
        <Col xs={24}>
          {activeFinanceSection === 'finance-entry' ? (
            <FinanceEntryPage
              apiClient={apiClient}
              role={role}
              username={username}
              financeCatalogItems={financeCatalogItems}
              customers={customers}
              customerContacts={customerContacts}
              onCustomerContactsChange={onCustomerContactsChange}
              onCatalogChange={financeCatalog.refresh}
              onCreated={handleOrderEntryCreated}
              preselectedPackageIds={prefillOrderEntryPackageIds}
              onPreselectedPackageIdsConsumed={onOrderEntryPrefillConsumed}
            />
          ) : null}
        </Col>
        <Col xs={24}>
          {activeFinanceSection === 'pending-review' ? renderPendingReviewPage() : null}
        </Col>
	        <Col xs={24}>
	          {activeFinanceSection === 'receivables' ? (
	            <ReceivableAuditPage
	              apiClient={apiClient}
	              role={role}
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
            />
	          ) : null}
	          {activeFinanceSection === 'water-receipts' ? (
            <WaterReceiptPage
              apiClient={apiClient}
              permissions={permissions}
              accounts={accounts}
              renderShipmentOrderNoLink={renderShipmentOrderNoLink}
            />
	          ) : null}
	          {['fee-names', 'settlement-methods', 'cargo-types'].includes(activeFinanceSection) ? (
            <FinanceCatalogPage
              {...financeCatalog.pageProps}
              pagination={tenRowTablePagination}
            />
          ) : null}
	          {activeFinanceSection === 'agent-bill-ai' ? (
            <AgentBillPage apiClient={apiClient} permissions={permissions} />
	          ) : null}
	          {['agents', 'agent-channels', 'company-channels', 'channel-categories', 'remote-areas', 'exchange-rates'].includes(activeFinanceSection) ? (
            <PlaceholderPanel title={financeSubItems.find((item) => item.key === activeFinanceSection)?.label ?? '基础资料'} />
	          ) : null}
	        </Col>
      </Row>
      </ModuleSubWorkspace>
      <Modal
        title="新增应收"
        className="finance-modal"
        width={760}
        open={receivableCreateOpen}
        onCancel={() => setReceivableCreateOpen(false)}
        onOk={submitReceivableCreate}
        okText="保存应收"
        cancelText="取消"
      >
        <Form form={receivableForm} layout="vertical" initialValues={{ name: '运费', currency: 'RMB' }}>
          <Form.Item name="systemOrderNo" label="运单号">
            <Input placeholder="按运单号匹配订单" />
          </Form.Item>
          <Form.Item name="customerOrderNo" label="客户单号">
            <Input placeholder="可选，按客户单号匹配" />
          </Form.Item>
          <Form.Item name="transferNo" label="转单号">
            <Input placeholder="可选，按转单号匹配" />
          </Form.Item>
          <Form.Item name="customerCode" label="客户编号">
            <Input placeholder="可选，按客户编号匹配" />
          </Form.Item>
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请填写费用名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber className="full-width" min={0} precision={2} />
          </Form.Item>
          <Form.Item name="currency" label="币种">
            <Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item name="settlementMethod" label="结算方式">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择结算方式，自动带出币种"
              options={financeCatalog.settlementOptions}
              onChange={(value) => applySettlementMethodCurrency(receivableForm, financeCatalog.settlementRows, value)}
            />
          </Form.Item>
          <Form.Item name="paymentNo" label="付款编号">
            <Input />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={businessCostEditor ? '修改业务成本' : '新增业务成本'}
        className="finance-modal"
        width={780}
        open={businessCostCreateOpen}
        onCancel={() => {
          setBusinessCostCreateOpen(false);
          setBusinessCostEditor(null);
          businessCostForm.resetFields();
        }}
        onOk={submitBusinessCost}
        okText="保存成本"
        cancelText="取消"
      >
        <Form
          form={businessCostForm}
          layout="vertical"
          initialValues={{ name: '业务员成本', currency: 'RMB' }}
          onValuesChange={(changed, values) => {
            if ('settlementMethod' in changed) {
              applySettlementMethodCurrency(businessCostForm, financeCatalog.settlementRows, values.settlementMethod);
            }
            if ('chargeWeightKg' in changed || 'unitPrice' in changed) {
              const weight = Number(values.chargeWeightKg);
              const price = Number(values.unitPrice);
              if (Number.isFinite(weight) && Number.isFinite(price)) {
                businessCostForm.setFieldValue('amount', Number((weight * price).toFixed(2)));
              }
            }
          }}
        >
          <Form.Item name="systemOrderNo" label="运单号">
            <Input placeholder="按运单号匹配订单" disabled={Boolean(businessCostEditor)} />
          </Form.Item>
          <Form.Item name="customerOrderNo" label="客户单号">
            <Input placeholder="可选，按客户单号匹配" disabled={Boolean(businessCostEditor)} />
          </Form.Item>
          <Form.Item name="transferNo" label="转单号">
            <Input placeholder="可选，按转单号匹配" disabled={Boolean(businessCostEditor)} />
          </Form.Item>
          <Form.Item name="customerCode" label="客户编号">
            <Input placeholder="可选，按客户编号匹配" disabled={Boolean(businessCostEditor)} />
          </Form.Item>
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请填写费用名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="chargeWeightKg" label="计费重">
            <InputNumber className="full-width" min={0} precision={3} />
          </Form.Item>
          <Form.Item name="unitPrice" label="单价">
            <InputNumber className="full-width" min={0} precision={2} />
          </Form.Item>
          <Form.Item name="amount" label="总金额" rules={[{ required: true, message: '请填写总金额' }]}>
            <InputNumber className="full-width" min={0} precision={2} />
          </Form.Item>
          <Form.Item name="currency" label="币种">
            <Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item name="settlementMethod" label="结算方式">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择结算方式，自动带出币种"
              options={financeCatalog.settlementOptions}
            />
          </Form.Item>
          <Form.Item name="paymentNo" label="付款编号">
            <Input />
          </Form.Item>
          <Form.Item name="agentName" label="代理">
            <Input placeholder="财务可按实际成本来源调整" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={payableEditor ? '修改应付' : '新增应付'}
        className="finance-modal"
        width={780}
        open={payableCreateOpen}
        onCancel={() => {
          setPayableCreateOpen(false);
          setPayableEditor(null);
          payableForm.resetFields();
        }}
        onOk={submitPayable}
        okText="保存应付"
        cancelText="取消"
      >
        <Form form={payableForm} layout="vertical" initialValues={{ name: '代理运费', currency: 'RMB' }}>
          <Form.Item name="systemOrderNo" label="运单号">
            <Input placeholder="按运单号匹配订单" disabled={Boolean(payableEditor)} />
          </Form.Item>
          <Form.Item name="customerOrderNo" label="客户单号">
            <Input placeholder="可选，按客户单号匹配" disabled={Boolean(payableEditor)} />
          </Form.Item>
          <Form.Item name="transferNo" label="转单号">
            <Input placeholder="可选，按转单号匹配" disabled={Boolean(payableEditor)} />
          </Form.Item>
          <Form.Item name="customerCode" label="客户编号">
            <Input placeholder="可选，按客户编号匹配" disabled={Boolean(payableEditor)} />
          </Form.Item>
          <Form.Item name="agentName" label="代理" rules={[{ required: true, message: '请填写代理' }]}>
            <Input placeholder="默认取订单代理，可按实际账单修改" />
          </Form.Item>
          <Form.Item name="name" label="费用名称" rules={[{ required: true, message: '请填写费用名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请填写金额' }]}>
            <InputNumber className="full-width" min={0} precision={2} />
          </Form.Item>
          <Form.Item name="currency" label="币种">
            <Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item name="settlementMethod" label="结算方式">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择结算方式，自动带出币种"
              options={financeCatalog.settlementOptions}
              onChange={(value) => applySettlementMethodCurrency(payableForm, financeCatalog.settlementRows, value)}
            />
          </Form.Item>
          <Form.Item name="paymentNo" label="付款编号">
            <Input placeholder="后续绑定付款记录时可自动回写，也可手工填写" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppPage>
  );
}
