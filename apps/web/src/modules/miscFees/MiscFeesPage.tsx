import type { Key } from 'react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Tabs,
  Typography,
  Upload
} from 'antd';
import {
  Banknote,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileInput,
  Link2,
  Plus,
  RefreshCw,
  WalletCards
} from 'lucide-react';
import {
  canAssignPickupBusinessCost,
  canAuditPickupFee,
  canDirectPayAndArchiveKuayue,
  canEditPickupFeeRegistration,
  canSubmitKuayueHangRequest
} from '@siyuan/shared';
import type {
  AgentSummary,
  FinanceCatalogItemSummary,
  KuayueImportLineClaimInput,
  KuayueImportLineSummary,
  KuayueImportPreview,
  KuayueImportPreviewLine,
  MarketProfitLedgerResponse,
  MarketProfitLedgerRow,
  WarehouseProfitLedgerResponse,
  WarehouseProfitLedgerRow,
  FinanceProfitAttributionStatus,
  FinanceProfitCashStatus,
  FinanceProfitLedgerResponse,
  FinanceProfitLedgerRow,
  FinanceProfitLedgerType,
  MiscFeeBusinessAssignmentInput,
  MiscFeeDeliveryShipmentOption,
  MiscFeeHangRequestSummary,
  MiscFeeDetail,
  MiscFeeInput,
  MiscFeeListResponse,
  MiscFeeSourceType,
  MiscFeeSummary,
  MiscFeeUpdateInput,
  ProfitSettlementDetail,
  ProfitSettlementInput,
  ProfitSettlementSummary,
  ProfitSettlementType,
  SiteSummary,
  Shipment
} from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../apiClient';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import {
  AppDatePicker,
  AppDateRangePicker,
  AppFilterBar,
  AppFormSection,
  AppPage,
  AppPageHeader,
  ManagedDualViewTable,
  ManagedMatrixCell,
  ManagedTable,
  MetricCard,
  renderFilterActions,
  renderFilterField,
  tenRowTablePagination,
  type ManagedMatrixField,
  type ManagedTableColumns
} from '../shared/ui';
import { formatBeijingDate, formatBeijingDateTime } from '../shared/format';
import { getGlobalFieldMaskVisibility } from '../shared/globalFieldMask';
import { createSettlementMethodOptions, getSettlementMethodCurrency, getSettlementMethodRows } from '../finance/catalog';
import { downloadCsv } from '../finance/exportCsv';
import { deliveryLedgerLabels, deliveryPrimaryStatus, formatDeliveryCargoData } from './deliveryLedger';
import './miscFees.css';

const { Text } = Typography;

type MiscFeeSectionKey =
  | 'kuayue'
  | 'pickup'
  | 'tally'
  | 'purchase'
  | 'delivery'
  | 'hang'
  | 'market-profit'
  | 'warehouse-profit'
  | 'finance-profit';

type FeeFormValues = Omit<MiscFeeInput, 'sourceType' | 'occurredAt'> & {
  sourceType?: MiscFeeSourceType;
  occurredAt?: string;
};

function distributeFlatMatrixFields(
  fields: Array<ManagedMatrixField | null | false | undefined>,
  columnCount: number
) {
  const visibleFields = fields.filter(Boolean) as ManagedMatrixField[];
  return Array.from({ length: columnCount }, (_, columnIndex) =>
    visibleFields.filter((_field, fieldIndex) => fieldIndex % columnCount === columnIndex)
  );
}

type FeeFilters = {
  keyword?: string;
  kuayueBillNo?: string;
  occurredRange?: [string | undefined, string | undefined];
  customerCode?: string;
  matchStatus?: 'UNMATCHED' | 'MATCHED';
  confirmationStatus?: 'PENDING' | 'CONFIRMED';
  auditStatus?: 'PENDING' | 'APPROVED';
};

type KuayueClaimFormValues = Omit<KuayueImportLineClaimInput, 'idempotencyKey'> & {
  attributionRoute: 'SHIPMENT' | 'CUSTOMER_HANG';
};
type BusinessAssignmentFormValues = Omit<MiscFeeBusinessAssignmentInput, 'version' | 'idempotencyKey'>;
type KuayueWorkspaceTab = 'unassigned' | 'assigned';
type MarketProfitFilters = {
  agent?: string;
  reviewedRange?: [string | undefined, string | undefined];
  orderKeyword?: string;
};
type WarehouseProfitFilters = {
  site?: string;
  feeName?: string;
  eligibilityStatus?: 'ALL' | 'PENDING_PRICING' | 'READY';
  ledgerRange?: [string | undefined, string | undefined];
  keyword?: string;
};
type FinanceProfitFilters = {
  ledgerRange?: [string | undefined, string | undefined];
  keyword?: string;
  agent?: string;
  feeName?: string;
  financeType?: FinanceProfitLedgerType | 'ALL';
  attributionStatus?: FinanceProfitAttributionStatus | 'ALL';
  cashStatus?: FinanceProfitCashStatus | 'ALL';
  settlementStatus?: ProfitSettlementSummary['status'] | 'UNSETTLED' | 'ALL';
};

const KUAYUE_WORKSPACE_TAB_STORAGE_KEY = 'sunny.misc-fees.kuayue.workspace-tab';

const sectionItems: Array<ModuleSubNavItem & { key: MiscFeeSectionKey }> = [
  { key: 'kuayue', label: '跨越账单', description: '账单导入、业务归属、财务审核与应付挂账' },
  { key: 'pickup', label: '提货费', description: '仓库或市场登记真实应付，业务员归属运单并填写业务成本' },
  { key: 'tally', label: '理货杂费', description: '仓库登记与订单匹配' },
  { key: 'purchase', label: '代购费', description: '业务申请与付款前置审批' },
  { key: 'delivery', label: '送货费', description: '送货代理与双成本登记' },
  { key: 'hang', label: '挂账', description: '财务同意后生成待付款' },
  { key: 'market-profit', label: '市场利润结算', description: '市场成本与真实应付差额' },
  { key: 'warehouse-profit', label: '仓库利润结算', description: '仓库归属费用利润' },
  { key: 'finance-profit', label: '财务利润结算', description: '公司真实利润口径' }
];

const sourceSectionMap: Partial<Record<MiscFeeSectionKey, MiscFeeSourceType[]>> = {
  kuayue: ['KUAYUE'],
  pickup: ['WAREHOUSE_PICKUP', 'MARKET_PICKUP', 'OTHER_PICKUP'],
  tally: ['TALLY_MISC'],
  purchase: ['PURCHASE'],
  delivery: ['DELIVERY']
};

const pickupSourceOptions: Array<{ label: string; value: MiscFeeSourceType }> = [
  { label: '仓库提货', value: 'WAREHOUSE_PICKUP' },
  { label: '市场提货', value: 'MARKET_PICKUP' }
];

const sourceLabels: Record<MiscFeeSourceType, string> = {
  KUAYUE: '跨越账单',
  WAREHOUSE_PICKUP: '仓库提货',
  MARKET_PICKUP: '市场提货',
  OTHER_PICKUP: '其他提货',
  TALLY_MISC: '理货杂费',
  PURCHASE: '代购费',
  DELIVERY: '送货费'
};

const profitTypeBySection: Partial<Record<MiscFeeSectionKey, ProfitSettlementType>> = {
  'market-profit': 'MARKET',
  'warehouse-profit': 'WAREHOUSE',
  'finance-profit': 'FINANCE'
};

const emptyFeeResponse: MiscFeeListResponse = {
  rows: [],
  totals: { count: 0, businessRmbAmount: 0, pendingConfirmation: 0 },
  pagination: { page: 1, pageSize: 100, totalItems: 0 }
};

const emptyMarketProfitResponse: MarketProfitLedgerResponse = {
  rows: [],
  totals: { businessCostRmbAmount: 0, agentCostRmbAmount: 0, businessProfitRmbAmount: 0 },
  agentOptions: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0 }
};

const emptyWarehouseProfitResponse: WarehouseProfitLedgerResponse = {
  rows: [],
  totals: {
    pendingPricingCount: 0,
    pendingPricingPayableRmbAmount: 0,
    businessCostRmbAmount: 0,
    payableCostRmbAmount: 0,
    warehouseProfitRmbAmount: 0,
    unmatchedCount: 0
  },
  siteOptions: [],
  feeNameOptions: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0 }
};

const emptyFinanceProfitResponse: FinanceProfitLedgerResponse = {
  rows: [],
  totals: {
    receivableRmbAmount: 0,
    businessCostRmbAmount: 0,
    payableRmbAmount: 0,
    unmatchedPayableRmbAmount: 0,
    marketProfitRmbAmount: 0,
    warehouseProfitRmbAmount: 0,
    companyProfitRmbAmount: 0
  },
  agentOptions: [],
  feeNameOptions: [],
  pagination: { page: 1, pageSize: 20, totalItems: 0 }
};

function permissionSection(section: MiscFeeSectionKey) {
  return section;
}

function money(amount?: number, currency = 'RMB') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return `${currency} ${amount.toFixed(2)}`;
}

function beijingDayBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+08:00`;
}

function statusTag(label: string, color: string) {
  return <Tag color={color}>{label}</Tag>;
}

function businessAssignmentTag(row: MiscFeeSummary) {
  if (row.sourceType === 'KUAYUE') return row.confirmationStatus === 'CONFIRMED'
    ? statusTag('业务成本已确认', 'success')
    : statusTag('业务成本待确认', 'warning');
  if (row.confirmationStatus === 'CONFIRMED') return statusTag('业务已确认', 'success');
  return row.businessAmount === undefined ? statusTag('待业务归属', 'warning') : statusTag('待业务确认', 'warning');
}

type MiscFeeUiDataScope = 'ALL' | 'WAREHOUSE_SITE' | 'MARKET' | 'SALES_OWN' | 'UNCONFIGURED';

export function resolveMiscFeeUiDataScope(role: RoleKey, permissions: readonly PermissionKey[]): MiscFeeUiDataScope {
  if (role === 'ADMIN') return 'ALL';
  const scopes = [
    permissions.includes('data-scope:misc-fee-all') ? 'ALL' : undefined,
    permissions.includes('data-scope:misc-fee-warehouse-site') ? 'WAREHOUSE_SITE' : undefined,
    permissions.includes('data-scope:misc-fee-market') ? 'MARKET' : undefined,
    permissions.includes('data-scope:sales-own') ? 'SALES_OWN' : undefined
  ].filter(Boolean) as Exclude<MiscFeeUiDataScope, 'UNCONFIGURED'>[];
  return scopes.length === 1 ? scopes[0] : 'UNCONFIGURED';
}

function pickupFeeSourceForScope(scope: MiscFeeUiDataScope): MiscFeeSourceType | undefined {
  if (scope === 'WAREHOUSE_SITE') return 'WAREHOUSE_PICKUP';
  if (scope === 'MARKET') return 'MARKET_PICKUP';
  return undefined;
}

export function canViewMiscFeeSection(
  role: RoleKey,
  permissions: readonly PermissionKey[],
  section: MiscFeeSectionKey
) {
  return role === 'ADMIN' || permissions.includes(`misc-fee:${permissionSection(section)}:read`);
}

function miscFeeCreateAllowedForScope(section: MiscFeeSectionKey, scope: MiscFeeUiDataScope) {
  if (scope === 'ALL') return true;
  if (scope === 'WAREHOUSE_SITE') return ['pickup', 'tally'].includes(section);
  if (scope === 'MARKET') return ['pickup', 'delivery'].includes(section);
  if (scope === 'SALES_OWN') return ['purchase', 'delivery'].includes(section);
  return false;
}

function profitSettlementAllowedForScope(type: ProfitSettlementType, scope: MiscFeeUiDataScope) {
  return scope === 'ALL'
    || (scope === 'MARKET' && type === 'MARKET')
    || (scope === 'WAREHOUSE_SITE' && type === 'WAREHOUSE');
}

function purchaseWorkflowTag(row: MiscFeeSummary) {
  if (row.voidedAt) return statusTag('已删除', 'error');
  if (row.paymentStatus === 'PAID') return statusTag('已付款', 'success');
  if (row.paymentStatus === 'APPLIED') return statusTag('付款中', 'processing');
  if (row.paymentStatus === 'READY') return statusTag('待付款', 'blue');
  if (row.hangStatus === 'PENDING') return statusTag('挂账待同意', 'warning');
  if (row.hangStatus === 'REJECTED') return statusTag('已拒绝', 'error');
  if (row.hangStatus === 'WITHDRAWN') return statusTag('已撤回', 'default');
  return statusTag('待申请付款', 'processing');
}

function hangProgressTag(status: MiscFeeHangRequestSummary['progressStatus']) {
  const value = ({
    PENDING_APPROVAL: ['待同意', 'warning'],
    PENDING_PAYMENT: ['待付款', 'blue'],
    PAYMENT_IN_PROGRESS: ['付款中', 'processing'],
    PAID: ['已支付', 'success'],
    REJECTED: ['已拒绝', 'error'],
    WITHDRAWN: ['已撤回', 'default'],
    INVALIDATED: ['已失效', 'default'],
    PAYMENT_MISSING: ['待付款未生成', 'error']
  } as const)[status];
  return statusTag(value[0], value[1]);
}

function isPayableFirstMiscFee(row: MiscFeeSummary) {
  return ['WAREHOUSE_PICKUP', 'MARKET_PICKUP', 'OTHER_PICKUP', 'TALLY_MISC', 'DELIVERY'].includes(row.sourceType);
}

function canSubmitMiscFeeHangRequest(row: MiscFeeSummary) {
  if (row.sourceType === 'KUAYUE') return canSubmitKuayueHangRequest(row);
  if (row.sourceType === 'TALLY_MISC') {
    return row.auditStatus === 'APPROVED' && row.confirmationStatus === 'CONFIRMED' && row.matchStatus === 'MATCHED';
  }
  return row.auditStatus === 'APPROVED' || isPayableFirstMiscFee(row);
}

function canAuditMiscFeeRow(row: MiscFeeSummary) {
  if (row.sourceType === 'TALLY_MISC') {
    return row.auditStatus === 'PENDING' && row.confirmationStatus === 'CONFIRMED' && row.matchStatus === 'MATCHED';
  }
  if (row.sourceType === 'WAREHOUSE_PICKUP' || row.sourceType === 'MARKET_PICKUP') {
    return canAuditPickupFee(row);
  }
  return row.auditStatus === 'PENDING' && !(row.sourceType === 'KUAYUE' && row.hangStatus === 'PENDING');
}

function auditTag(status?: MiscFeeSummary['auditStatus']) {
  if (!status) return null;
  return status === 'APPROVED' ? statusTag('应付已审核', 'success') : statusTag('待应付审核', 'processing');
}

function hangTag(status?: MiscFeeSummary['hangStatus']) {
  if (!status || status === 'NONE') return null;
  const view = {
    PENDING: ['待同意', 'warning'],
    APPROVED: ['已同意', 'success'],
    REJECTED: ['已拒绝', 'error'],
    WITHDRAWN: ['已撤回', 'default']
  } as const;
  return statusTag(view[status][0], view[status][1]);
}

function pickupSourceLabel(row: MiscFeeSummary) {
  if (row.sourceType === 'WAREHOUSE_PICKUP') return '思远仓库';
  if (row.sourceType === 'MARKET_PICKUP') return '市场提货';
  if (row.sourceType === 'OTHER_PICKUP') return '其他提货';
  if (row.sourceType === 'TALLY_MISC') return '思远仓库';
  return row.ownerName ?? '-';
}

function miscFeeWaybillNo(row: MiscFeeSummary) {
  return row.systemOrderNo ?? row.customerOrderNo ?? row.transferNo ?? '-';
}

function mergeFeeResponses(responses: MiscFeeListResponse[]): MiscFeeListResponse {
  return responses.reduce<MiscFeeListResponse>((result, response) => ({
    rows: [...result.rows, ...response.rows].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    totals: {
      count: result.totals.count + response.totals.count,
      businessRmbAmount: result.totals.businessRmbAmount + response.totals.businessRmbAmount,
      ...(result.totals.payableRmbAmount !== undefined || response.totals.payableRmbAmount !== undefined
        ? { payableRmbAmount: (result.totals.payableRmbAmount ?? 0) + (response.totals.payableRmbAmount ?? 0) }
        : {}),
      pendingConfirmation: result.totals.pendingConfirmation + response.totals.pendingConfirmation,
      ...(result.totals.pendingAudit !== undefined || response.totals.pendingAudit !== undefined
        ? { pendingAudit: (result.totals.pendingAudit ?? 0) + (response.totals.pendingAudit ?? 0) }
        : {}),
      ...(result.totals.pendingHang !== undefined || response.totals.pendingHang !== undefined
        ? { pendingHang: (result.totals.pendingHang ?? 0) + (response.totals.pendingHang ?? 0) }
        : {})
    },
    pagination: {
      page: 1,
      pageSize: 100,
      totalItems: result.pagination.totalItems + response.pagination.totalItems
    }
  }), emptyFeeResponse);
}

function defaultSourceForSection(section: MiscFeeSectionKey, scope: MiscFeeUiDataScope): MiscFeeSourceType | undefined {
  if (section === 'pickup') return pickupFeeSourceForScope(scope) ?? 'WAREHOUSE_PICKUP';
  return sourceSectionMap[section]?.[0];
}

export function MiscFeesPage({
  apiClient,
  permissions,
  role,
  agents,
  initialSection = 'pickup'
}: {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role: RoleKey;
  agents: AgentSummary[];
  initialSection?: string;
}) {
  const miscFeeDataScope = resolveMiscFeeUiDataScope(role, permissions);
  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const payableUiVisible = fieldVisibility.showPayableCost && fieldVisibility.showPayableStatus;
  const visibleItems = useMemo(
    () => sectionItems.map((item) => ({
      ...item,
      description: !fieldVisibility.showAgentData && item.key === 'delivery'
        ? '送货费用登记与订单关联'
        : !payableUiVisible && ['kuayue', 'pickup'].includes(item.key)
          ? item.key === 'kuayue' ? '账单导入与业务归属' : '提货费用登记与业务归属'
          : item.description
    })).filter((item) => canViewMiscFeeSection(role, permissions, item.key)),
    [fieldVisibility.showAgentData, payableUiVisible, permissions, role]
  );
  const initialVisibleSection = visibleItems.some((item) => item.key === initialSection)
    ? initialSection as MiscFeeSectionKey
    : visibleItems[0]?.key ?? 'pickup';
  const [activeSection, setActiveSection] = useState<MiscFeeSectionKey>(initialVisibleSection);

  useEffect(() => {
    if (visibleItems.some((item) => item.key === initialSection)) {
      setActiveSection(initialSection as MiscFeeSectionKey);
    }
  }, [initialSection, visibleItems]);

  if (!visibleItems.length) {
    return <Alert type="warning" showIcon message={miscFeeDataScope === 'UNCONFIGURED'
      ? '当前岗位的杂费数据范围未配置或存在冲突，请联系管理员'
      : '当前账号没有杂费模块权限'} />;
  }

  return (
    <ModuleSubWorkspace
      items={visibleItems}
      activeKey={activeSection}
      onChange={(key) => setActiveSection(key as MiscFeeSectionKey)}
    >
      {activeSection === 'hang' ? (
        <HangWorkbench apiClient={apiClient} permissions={permissions} role={role} />
      ) : activeSection === 'market-profit' ? (
        <MarketProfitWorkbench apiClient={apiClient} />
      ) : activeSection === 'warehouse-profit' ? (
        <WarehouseProfitWorkbench apiClient={apiClient} permissions={permissions} role={role} />
      ) : activeSection === 'finance-profit' ? (
        <FinanceProfitWorkbench apiClient={apiClient} permissions={permissions} role={role} />
      ) : profitTypeBySection[activeSection] ? (
        <ProfitWorkbench
          apiClient={apiClient}
          permissions={permissions}
          role={role}
          section={activeSection}
          type={profitTypeBySection[activeSection]!}
        />
      ) : (
        <FeeWorkbench
          apiClient={apiClient}
          permissions={permissions}
          role={role}
          agents={agents}
          section={activeSection}
        />
      )}
    </ModuleSubWorkspace>
  );
}

function FeeWorkbench({
  apiClient,
  permissions,
  role,
  agents,
  section
}: {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role: RoleKey;
  agents: AgentSummary[];
  section: MiscFeeSectionKey;
}) {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<FeeFormValues>();
  const [filters, setFilters] = useState<FeeFilters>({});
  const [filterForm] = Form.useForm<FeeFilters>();
  const [response, setResponse] = useState<MiscFeeListResponse>(emptyFeeResponse);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<MiscFeeSummary>();
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [kuayueLines, setKuayueLines] = useState<KuayueImportLineSummary[]>([]);
  const [kuayueLineTotal, setKuayueLineTotal] = useState(0);
  const [kuayueLinesLoading, setKuayueLinesLoading] = useState(false);
  const [kuayueWorkspaceTab, setKuayueWorkspaceTab] = useState<KuayueWorkspaceTab>(() => {
    try {
      return globalThis.localStorage?.getItem(KUAYUE_WORKSPACE_TAB_STORAGE_KEY) === 'assigned' ? 'assigned' : 'unassigned';
    } catch {
      return 'unassigned';
    }
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File>();
  const [importPreview, setImportPreview] = useState<KuayueImportPreview>();
  const [importLoading, setImportLoading] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimingLine, setClaimingLine] = useState<KuayueImportLineSummary>();
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimForm] = Form.useForm<KuayueClaimFormValues>();
  const [businessAssignmentForm] = Form.useForm<BusinessAssignmentFormValues>();
  const [businessAssignmentTarget, setBusinessAssignmentTarget] = useState<MiscFeeSummary>();
  const [businessAssignmentShipments, setBusinessAssignmentShipments] = useState<Shipment[]>([]);
  const [businessAssignmentLoading, setBusinessAssignmentLoading] = useState(false);
  const [businessAssignmentSaving, setBusinessAssignmentSaving] = useState(false);
  const [hangTargets, setHangTargets] = useState<MiscFeeSummary[]>([]);
  const [hangRemark, setHangRemark] = useState('');
  const [hangFile, setHangFile] = useState<File>();
  const [hangSaving, setHangSaving] = useState(false);
  const [reverseAuditTarget, setReverseAuditTarget] = useState<MiscFeeSummary>();
  const [reverseAuditReason, setReverseAuditReason] = useState('');
  const [reverseAuditSaving, setReverseAuditSaving] = useState(false);
  const [directPaidTarget, setDirectPaidTarget] = useState<MiscFeeSummary>();
  const [directPaidReason, setDirectPaidReason] = useState('');
  const [directPaidSaving, setDirectPaidSaving] = useState(false);
  const [financeCatalogItems, setFinanceCatalogItems] = useState<FinanceCatalogItemSummary[]>([]);
  const [deliveryShipments, setDeliveryShipments] = useState<MiscFeeDeliveryShipmentOption[]>([]);
  const [deliveryShipmentsLoading, setDeliveryShipmentsLoading] = useState(false);
  const [detail, setDetail] = useState<MiscFeeDetail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const permissionPrefix = `misc-fee:${permissionSection(section)}`;
  const miscFeeDataScope = resolveMiscFeeUiDataScope(role, permissions);
  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const hasPermission = useCallback(
    (action: string) => role === 'ADMIN' || permissions.includes(`${permissionPrefix}:${action}` as PermissionKey),
    [permissionPrefix, permissions, role]
  );
  const canViewPayable = hasPermission('view-payable') && fieldVisibility.showPayableCost;
  const canViewPayableStatus = canViewPayable && fieldVisibility.showPayableStatus;
  const canViewAgent = fieldVisibility.showAgentData && fieldVisibility.showAgentShortName && fieldVisibility.showAgentCompanyName;
  const canDirectPayAndArchive = fieldVisibility.showPayableStatus && (role === 'ADMIN'
    || permissions.includes('finance:payable:paid-confirm')
    || permissions.includes('finance:paid-payment:confirm'));
  const canAssignBusinessCost = ['ALL', 'SALES_OWN'].includes(miscFeeDataScope) && hasPermission('match');
  const canManageTallyRegistration = section === 'tally' && ['ALL', 'WAREHOUSE_SITE'].includes(miscFeeDataScope);
  const canManagePurchaseApplication = section === 'purchase' && ['ALL', 'SALES_OWN'].includes(miscFeeDataScope);
  const canCreateCurrentFee = hasPermission('create')
    && miscFeeCreateAllowedForScope(section, miscFeeDataScope)
    && (canViewPayable || section === 'purchase')
    && (section !== 'delivery' || canViewAgent)
    && (section !== 'tally' || canManageTallyRegistration)
    && (section !== 'purchase' || canManagePurchaseApplication);
  const sources = sourceSectionMap[section] ?? [];
  const rolePickupSource = pickupFeeSourceForScope(miscFeeDataScope);
  const availablePickupSourceOptions = rolePickupSource
    ? pickupSourceOptions.filter((option) => option.value === rolePickupSource)
    : pickupSourceOptions;
  const settlementRows = useMemo(() => getSettlementMethodRows(financeCatalogItems), [financeCatalogItems]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(settlementRows), [settlementRows]);
  const feeNameOptions = useMemo(() => financeCatalogItems
    .filter((item) => item.category === 'FEE_NAME' && item.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
    .map((item) => ({ label: item.name, value: item.name })), [financeCatalogItems]);
  const watchedFeeCustomerCode = Form.useWatch('customerCode', form);
  const watchedFeeSystemOrderNo = Form.useWatch('systemOrderNo', form);
  const watchedPickupSourceType = Form.useWatch('sourceType', form);
  const watchedKuayueAttributionRoute = Form.useWatch('attributionRoute', claimForm);
  const deliveryShipmentOptions = useMemo(() => deliveryShipments
    .map((shipment) => ({
      label: `${shipment.systemOrderNo} · ${shipment.transferNo ?? '无转单号'} · ${shipment.packageCount} 件`,
      value: shipment.systemOrderNo
    })), [deliveryShipments]);
  const selectedDeliveryShipment = useMemo(
    () => deliveryShipments.find((shipment) => shipment.systemOrderNo === watchedFeeSystemOrderNo),
    [deliveryShipments, watchedFeeSystemOrderNo]
  );

  useEffect(() => {
    let mounted = true;
    apiClient.financeCatalog({ enabledOnly: true })
      .then((response) => {
        if (mounted) setFinanceCatalogItems(response.items ?? []);
      })
      .catch(() => {
        if (mounted) setFinanceCatalogItems([]);
      });
    return () => {
      mounted = false;
    };
  }, [apiClient]);

  useEffect(() => {
    if (section !== 'delivery' || !drawerOpen) return;
    const customerCode = watchedFeeCustomerCode?.trim();
    if (!customerCode) {
      setDeliveryShipments([]);
      setDeliveryShipmentsLoading(false);
      return;
    }
    let mounted = true;
    setDeliveryShipmentsLoading(true);
    const timer = window.setTimeout(() => {
      apiClient.miscFeeDeliveryShipmentOptions(customerCode)
        .then((rows) => {
          if (mounted) setDeliveryShipments(rows);
        })
        .catch(() => {
          if (mounted) setDeliveryShipments([]);
        })
        .finally(() => {
          if (mounted) setDeliveryShipmentsLoading(false);
        });
    }, 300);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [apiClient, drawerOpen, section, watchedFeeCustomerCode]);

  const loadKuayueLines = useCallback(async () => {
    if (section !== 'kuayue') return;
    setKuayueLinesLoading(true);
    try {
      const result = await apiClient.kuayueImportLines({
        status: 'UNCLAIMED',
        page: 1,
        pageSize: 100,
        kuayueBillNo: filters.kuayueBillNo,
        occurredFrom: beijingDayBoundary(filters.occurredRange?.[0]),
        occurredTo: beijingDayBoundary(filters.occurredRange?.[1], true)
      });
      setKuayueLines(result.rows ?? []);
      setKuayueLineTotal(result.pagination.totalItems);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '跨越待归属账单加载失败');
    } finally {
      setKuayueLinesLoading(false);
    }
  }, [apiClient, filters.kuayueBillNo, filters.occurredRange, message, section]);

  const load = useCallback(async () => {
    if (!sources.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(sources.map((sourceType) => apiClient.miscFees({
        sourceType,
        page: 1,
        pageSize: 100,
        keyword: filters.keyword,
        kuayueBillNo: sourceType === 'KUAYUE' ? filters.kuayueBillNo : undefined,
        customerCode: filters.customerCode,
        matchStatus: filters.matchStatus,
        confirmationStatus: filters.confirmationStatus,
        auditStatus: canViewPayable ? filters.auditStatus : undefined,
        occurredFrom: sourceType === 'KUAYUE' ? beijingDayBoundary(filters.occurredRange?.[0]) : undefined,
        occurredTo: sourceType === 'KUAYUE' ? beijingDayBoundary(filters.occurredRange?.[1], true) : undefined
      })));
      setResponse(mergeFeeResponses(results));
      setSelectedKeys([]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '杂费数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, canViewPayable, filters, message, sources]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadKuayueLines();
  }, [loadKuayueLines]);

  const previewKuayueFile = async () => {
    if (!importFile) {
      message.warning('请先选择 .xls 或 .xlsx 文件');
      return;
    }
    setImportLoading(true);
    try {
      setImportPreview(await apiClient.previewKuayueImport(importFile));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '跨越账单解析失败');
    } finally {
      setImportLoading(false);
    }
  };

  const commitKuayueFile = async () => {
    if (!importPreview) return;
    setImportLoading(true);
    try {
      const result = await apiClient.commitKuayueImport({
        previewToken: importPreview.previewToken,
        idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `kuayue-${Date.now()}`
      });
      message.success(`导入完成：可归属 ${result.createdCount} 条，重复 ${result.skippedDuplicateCount} 条，错误 ${result.failedCount} 条`);
      setImportOpen(false);
      setImportFile(undefined);
      setImportPreview(undefined);
      await loadKuayueLines();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '跨越账单确认导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const openKuayueClaim = (line: KuayueImportLineSummary) => {
    setClaimingLine(line);
    claimForm.resetFields();
    claimForm.setFieldsValue({ attributionRoute: 'SHIPMENT' });
    setClaimOpen(true);
  };

  const submitKuayueClaim = async () => {
    if (!claimingLine) return;
    setClaimSaving(true);
    try {
      const values = await claimForm.validateFields();
      const { attributionRoute, ...claimInput } = values;
      await apiClient.claimKuayueImportLine(claimingLine.id, {
        ...claimInput,
        systemOrderNo: attributionRoute === 'SHIPMENT' ? claimInput.systemOrderNo?.trim() : undefined,
        idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `kuayue-claim-${claimingLine.id}`
      });
      message.success(attributionRoute === 'SHIPMENT'
        ? '跨越账单已归属客户和运单，等待财务审核'
        : '跨越账单已归属客户业务员，可以发起挂账');
      setClaimOpen(false);
      setClaimingLine(undefined);
      await Promise.all([loadKuayueLines(), load()]);
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    } finally {
      setClaimSaving(false);
    }
  };

  const openHangRequest = (row: MiscFeeSummary) => {
    setHangTargets([row]);
    setHangRemark('');
    setHangFile(undefined);
  };

  const openBatchHangRequest = () => {
    const targets = response.rows.filter((row) =>
      selectedKeys.includes(row.id)
      && canSubmitMiscFeeHangRequest(row)
      && !['PENDING', 'APPROVED'].includes(row.hangStatus ?? 'NONE'));
    if (!targets.length) return;
    setHangTargets(targets);
    setHangRemark('');
    setHangFile(undefined);
  };

  const closeHangRequest = () => {
    if (hangSaving) return;
    setHangTargets([]);
    setHangRemark('');
    setHangFile(undefined);
  };

  const submitHangRequest = async () => {
    if (!hangTargets.length) return;
    setHangSaving(true);
    const failed: MiscFeeSummary[] = [];
    const failureMessages: string[] = [];
    for (const target of hangTargets) {
      try {
        await apiClient.createMiscFeeHangRequestWithFile(target.id, {
          version: target.version,
          remark: hangRemark.trim() || undefined,
          idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `misc-hang-${target.id}`,
          purchase: target.sourceType === 'PURCHASE',
          file: hangFile
        });
      } catch (error) {
        failed.push(target);
        failureMessages.push(error instanceof Error ? error.message : '挂账申请提交失败');
      }
    }
    const succeeded = hangTargets.length - failed.length;
    try {
      await load();
      if (!failed.length) {
        message.success(hangTargets.length === 1
          ? '挂账申请已提交，等待财务同意'
          : `已提交 ${succeeded} 条挂账申请，等待财务同意`);
        setHangTargets([]);
        setHangRemark('');
        setHangFile(undefined);
      } else {
        setHangTargets(failed);
        message.error(`已提交 ${succeeded} 条，失败 ${failed.length} 条：${failureMessages[0]}；窗口中保留失败记录，可再次提交`);
      }
    } finally {
      setHangSaving(false);
    }
  };

  const openDirectPaidArchive = (row: MiscFeeSummary) => {
    setDirectPaidTarget(row);
    setDirectPaidReason('');
  };

  const submitDirectPaidArchive = async () => {
    if (!directPaidTarget) return;
    if (!directPaidReason.trim()) {
      message.warning('请填写付款说明');
      return;
    }
    setDirectPaidSaving(true);
    try {
      await apiClient.directPayAndArchiveKuayueMiscFee(directPaidTarget.id, {
        version: directPaidTarget.version,
        reason: directPaidReason.trim()
      });
      message.success('已标记付款并归档');
      setDirectPaidTarget(undefined);
      setDirectPaidReason('');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标记已付失败');
    } finally {
      setDirectPaidSaving(false);
    }
  };

  const openCreate = () => {
    const sourceType = defaultSourceForSection(section, miscFeeDataScope);
    setEditingTarget(undefined);
    form.resetFields();
    form.setFieldsValue({
      sourceType,
      feeName: section === 'pickup' ? '提货费' : section === 'tally' ? '理货杂费' : section === 'purchase' ? '代购费' : section === 'delivery' ? '送货费' : undefined,
      occurredAt: formatBeijingDate(new Date().toISOString()),
      businessAmount: undefined,
      businessCurrency: section === 'kuayue' ? 'RMB' : 'RMB',
      payableAmount: undefined,
      payableCurrency: 'RMB',
      agentName: sourceType === 'WAREHOUSE_PICKUP' ? '思远仓库（内部报销）' : sourceType === 'TALLY_MISC' ? '思远仓库' : undefined
    });
    setDrawerOpen(true);
  };

  const openEdit = (row: MiscFeeSummary) => {
    setEditingTarget(row);
    form.resetFields();
    form.setFieldsValue({
      sourceType: row.sourceType,
      customerCode: row.customerCode,
      systemOrderNo: row.systemOrderNo,
      feeName: row.feeName,
      occurredAt: formatBeijingDate(row.occurredAt),
      businessAmount: row.businessAmount,
      businessCurrency: row.businessCurrency || 'RMB',
      businessSettlementMethod: row.businessSettlementMethod,
      payableAmount: row.payableAmount,
      payableCurrency: row.payableCurrency || 'RMB',
      payableSettlementMethod: row.payableSettlementMethod,
      agentId: row.agentId,
      agentName: row.agentName ?? (row.sourceType === 'TALLY_MISC' ? '思远仓库' : undefined),
      remark: row.remark
    });
    setDrawerOpen(true);
  };

  const openBusinessAssignment = async (row: MiscFeeSummary) => {
    setBusinessAssignmentTarget(row);
    businessAssignmentForm.resetFields();
    businessAssignmentForm.setFieldsValue({
      shipmentId: row.shipmentId,
      businessAmount: row.businessAmount,
      businessCurrency: row.businessCurrency || 'RMB',
      businessSettlementMethod: row.businessSettlementMethod
    });
    setBusinessAssignmentLoading(true);
    try {
      const shipments = await apiClient.shipments();
      setBusinessAssignmentShipments(shipments.filter((shipment) => shipment.customerCode === row.customerCode && shipment.status !== 'CANCELLED'));
    } catch (error) {
      setBusinessAssignmentShipments([]);
      message.error(error instanceof Error ? error.message : '订单候选加载失败');
    } finally {
      setBusinessAssignmentLoading(false);
    }
  };

  const submitBusinessAssignment = async () => {
    if (!businessAssignmentTarget) return;
    setBusinessAssignmentSaving(true);
    try {
      const values = await businessAssignmentForm.validateFields();
      await apiClient.assignMiscFeeBusinessCost(businessAssignmentTarget.id, {
        ...values,
        version: businessAssignmentTarget.version,
        idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `misc-business-assignment-${businessAssignmentTarget.id}`
      });
      message.success('业务成本已匹配并确认');
      setBusinessAssignmentTarget(undefined);
      await load();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    } finally {
      setBusinessAssignmentSaving(false);
    }
  };

  const submitFee = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      const sourceType = values.sourceType ?? defaultSourceForSection(section, miscFeeDataScope);
      const occurredAt = values.occurredAt ?? (section === 'delivery' ? formatBeijingDate(new Date().toISOString()) : undefined);
      if (!sourceType || !occurredAt) return;
      const normalizedValues = {
        ...values,
        occurredAt: new Date(`${occurredAt}T12:00:00+08:00`).toISOString(),
        feeName: section === 'purchase' ? '代购费' : section === 'delivery' ? '送货费' : values.feeName,
        systemOrderNo: section === 'purchase' ? undefined : values.systemOrderNo,
        businessCurrency: section === 'pickup' ? 'RMB' : values.businessCurrency,
        payableCurrency: ['delivery', 'pickup'].includes(section) ? 'RMB' : values.payableCurrency,
        payableSettlementMethod: ['delivery', 'pickup'].includes(section) ? undefined : values.payableSettlementMethod,
        agentName: sourceType === 'WAREHOUSE_PICKUP'
          ? values.agentId ? undefined : '思远仓库（内部报销）'
          : sourceType === 'TALLY_MISC'
            ? '思远仓库'
          : sourceType === 'PURCHASE'
            ? '代购'
          : values.agentName
      };
      if (editingTarget) {
        const updateValues: MiscFeeUpdateInput = {
          customerCode: values.customerCode,
          feeName: normalizedValues.feeName,
          occurredAt: normalizedValues.occurredAt,
          businessAmount: section === 'pickup' && canViewPayable ? undefined : values.businessAmount,
          businessCurrency: section === 'pickup' && canViewPayable ? undefined : normalizedValues.businessCurrency,
          businessSettlementMethod: section === 'pickup' && canViewPayable ? undefined : values.businessSettlementMethod,
          payableAmount: values.payableAmount,
          payableCurrency: normalizedValues.payableCurrency,
          payableSettlementMethod: normalizedValues.payableSettlementMethod,
          agentId: values.agentId,
          agentName: normalizedValues.agentName,
          remark: values.remark,
          version: editingTarget.version
        };
        await apiClient.updateMiscFee(editingTarget.id, updateValues);
        message.success(section === 'purchase' ? '代购申请已修改' : section === 'tally' ? '理货杂费已修改' : '杂费已修改');
      } else {
        await apiClient.createMiscFee({
          ...normalizedValues,
          sourceType,
          idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `misc-${Date.now()}`
        });
        message.success('杂费已登记');
      }
      setDrawerOpen(false);
      setEditingTarget(undefined);
      await load();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const performAction = async (
    row: MiscFeeSummary,
    action: 'confirm' | 'audit' | 'void'
  ) => {
    try {
      if (action === 'confirm') await apiClient.confirmMiscFee(row.id, { version: row.version });
      if (action === 'audit') await apiClient.auditMiscFee(row.id, { version: row.version });
      if (action === 'void') await apiClient.voidMiscFee(row.id, {
        version: row.version,
        reason: section === 'tally' ? '理货杂费页面删除' : section === 'purchase' ? '代购申请页面删除' : '页面作废'
      });
      message.success({
        confirm: section === 'tally' ? '仓库确认完成' : '业务确认完成',
        audit: '应付审核完成',
        void: section === 'tally' ? '理货杂费已删除并保留审计记录' : section === 'purchase' ? '代购申请已删除并保留审计记录' : '费用已作废'
      }[action]);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const submitReverseAudit = async () => {
    const target = reverseAuditTarget;
    const reason = reverseAuditReason.trim();
    if (!target || !reason) return;
    setReverseAuditSaving(true);
    try {
      await apiClient.reverseAuditMiscFee(target.id, { version: target.version, reason });
      message.success('应付已反审核');
      setReverseAuditTarget(undefined);
      setReverseAuditReason('');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '反审核失败');
    } finally {
      setReverseAuditSaving(false);
    }
  };

  const performBatch = async (action: 'confirm' | 'audit') => {
    const selectedRows = response.rows.filter((row) => selectedKeys.includes(row.id));
    if (!selectedRows.length) return;
    setLoading(true);
    try {
      for (const row of selectedRows) {
        if (action === 'confirm' && row.confirmationStatus === 'PENDING' && row.businessAmount !== undefined) {
          await apiClient.confirmMiscFee(row.id, { version: row.version });
        }
        if (action === 'audit' && canAuditMiscFeeRow(row)) {
          await apiClient.auditMiscFee(row.id, { version: row.version });
        }
      }
      message.success('批量操作完成');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量操作失败');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (row: MiscFeeSummary) => {
    setDetailLoading(true);
    try {
      setDetail(await apiClient.miscFee(row.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '杂费详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadAttachment = async (attachmentId: string) => {
    try {
      const file = await apiClient.downloadMiscFeeAttachment(attachmentId);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '附件下载失败');
    }
  };

  const columns = useMemo<ManagedTableColumns<MiscFeeSummary>>(() => {
    const actionColumn: ManagedTableColumns<MiscFeeSummary>[number] = {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: section === 'kuayue' ? 330 : section === 'purchase' ? 270 : section === 'tally' ? 210 : 180,
      render: (_, row) => (
        <Space size={4} wrap>
          <Button size="small" icon={<Eye size={13} />} onClick={() => void openDetail(row)}>查看</Button>
          {section === 'tally' && canManageTallyRegistration && hasPermission('update') && row.matchStatus === 'UNMATCHED' && row.confirmationStatus === 'PENDING' && row.auditStatus === 'PENDING' && !row.voidedAt ? (
            <Button size="small" onClick={() => openEdit(row)}>修改</Button>
          ) : null}
          {section === 'tally' && canManageTallyRegistration && hasPermission('confirm') && row.matchStatus === 'UNMATCHED' && row.confirmationStatus === 'PENDING' && row.auditStatus === 'PENDING' && !row.voidedAt ? (
            <Button size="small" type="primary" onClick={() => void performAction(row, 'confirm')}>仓库确认</Button>
          ) : null}
          {section === 'pickup' && canViewPayable && canViewAgent && hasPermission('update') && canEditPickupFeeRegistration(row) ? (
            <Button size="small" onClick={() => openEdit(row)}>修改登记</Button>
          ) : null}
          {section === 'purchase' && canManagePurchaseApplication && hasPermission('update') && row.hangStatus === 'NONE' && row.confirmationStatus === 'PENDING' && !row.voidedAt ? (
            <Button size="small" onClick={() => openEdit(row)}>修改</Button>
          ) : null}
          {section === 'purchase' && canViewPayableStatus && canManagePurchaseApplication && hasPermission('hang') && !['PENDING', 'APPROVED'].includes(row.hangStatus ?? 'NONE') && !row.voidedAt ? (
            <Button size="small" type="primary" onClick={() => openHangRequest(row)}>挂账</Button>
          ) : canAssignBusinessCost && row.confirmationStatus === 'PENDING' && !row.voidedAt && ['pickup', 'delivery'].includes(section)
            && (section !== 'pickup' || canAssignPickupBusinessCost(row)) ? (
            <Button size="small" type="primary" onClick={() => void openBusinessAssignment(row)}>匹配业务成本</Button>
          ) : !['pickup', 'tally', 'purchase', 'kuayue'].includes(section) && hasPermission('confirm') && row.confirmationStatus === 'PENDING' && row.businessAmount !== undefined && !row.voidedAt ? (
            <Button size="small" onClick={() => void performAction(row, 'confirm')}>确认</Button>
          ) : null}
          {section !== 'purchase' && canViewPayableStatus && hasPermission('audit') && canAuditMiscFeeRow(row) && !row.voidedAt ? (
            <Button size="small" type="primary" onClick={() => void performAction(row, 'audit')}>审核</Button>
          ) : null}
          {section !== 'purchase' && canViewPayableStatus && hasPermission('hang') && (canViewPayable || section === 'kuayue') && canSubmitMiscFeeHangRequest(row) && !['PENDING', 'APPROVED'].includes(row.hangStatus ?? 'NONE') && !row.voidedAt ? (
            <Button size="small" onClick={() => openHangRequest(row)}>挂账</Button>
          ) : null}
          {section === 'kuayue' && canDirectPayAndArchive && canDirectPayAndArchiveKuayue(row) ? (
            <Button size="small" danger onClick={() => openDirectPaidArchive(row)}>已付归档</Button>
          ) : null}
          {canViewPayableStatus && hasPermission('reverse-audit') && row.auditStatus === 'APPROVED' ? (
            <Button size="small" onClick={() => {
              setReverseAuditTarget(row);
              setReverseAuditReason('');
            }}>反审</Button>
          ) : null}
          {hasPermission('void') && !row.voidedAt && !(row.sourceType === 'KUAYUE' && row.auditStatus === 'APPROVED')
            && (section !== 'tally' || (canManageTallyRegistration && row.matchStatus === 'UNMATCHED' && row.confirmationStatus === 'PENDING' && row.auditStatus === 'PENDING'))
            && (section !== 'purchase' || (canManagePurchaseApplication && row.hangStatus === 'NONE' && row.confirmationStatus === 'PENDING')) ? (
            <Popconfirm
              title={section === 'tally' ? '确认删除该理货杂费？' : section === 'purchase' ? '确认删除该代购申请？' : '确认作废该费用？'}
              description={['tally', 'purchase'].includes(section) ? '删除后不再进入后续流程，但仍保留审计记录。' : undefined}
              okText={['tally', 'purchase'].includes(section) ? '删除' : '作废'}
              cancelText="取消"
              onConfirm={() => void performAction(row, 'void')}
            >
              <Button size="small" danger>{['tally', 'purchase'].includes(section) ? '删除' : '作废'}</Button>
            </Popconfirm>
          ) : null}
        </Space>
      )
    };

    if (section === 'kuayue') {
      const kuayueColumns: ManagedTableColumns<MiscFeeSummary> = [];
      if (canViewPayable && canViewAgent) {
        kuayueColumns.push({ title: '代理', dataIndex: 'agentName', key: 'agentName', width: 110, ellipsis: true, render: (value?: string) => value ?? '-' });
      }
      kuayueColumns.push(
        { title: '费用名称', dataIndex: 'feeName', key: 'feeName', width: 120, ellipsis: true },
        { title: '运费导入时间', key: 'importedAt', width: 170, render: (_, row) => row.kuayueBill?.importedAt ? formatBeijingDateTime(row.kuayueBill.importedAt) : '-' },
        { title: '寄件日期', dataIndex: 'occurredAt', key: 'occurredAt', width: 110, render: (value: string) => formatBeijingDate(value) },
        { title: '单号', key: 'kuayueBillNo', width: 180, ellipsis: true, render: (_, row) => row.kuayueBill?.kuayueBillNo ?? '-' },
        { title: '件数', key: 'pieceCount', width: 76, align: 'right', render: (_, row) => row.kuayueBill?.pieceCount ?? '-' },
        { title: '计费重量', key: 'chargeWeightKg', width: 105, align: 'right', render: (_, row) => row.kuayueBill?.chargeWeightKg === undefined ? '-' : `${row.kuayueBill.chargeWeightKg} kg` }
      );
      if (canViewPayable) {
        kuayueColumns.push(
        { title: '运单运费', key: 'freightAmount', width: 110, align: 'right', render: (_, row) => money(row.kuayueBill?.freightAmount) },
        { title: '保费', key: 'insuranceAmount', width: 100, align: 'right', render: (_, row) => money(row.kuayueBill?.insuranceAmount) },
        { title: '超重费', key: 'overageAmount', width: 100, align: 'right', render: (_, row) => money(row.kuayueBill?.overageAmount) },
        { title: '超长费', key: 'oversizeAmount', width: 100, align: 'right', render: (_, row) => money(row.kuayueBill?.oversizeAmount) },
        { title: '优惠金额', key: 'discountAmount', width: 110, align: 'right', render: (_, row) => money(row.kuayueBill?.discountAmount) }
        );
      }
      kuayueColumns.push(
        { title: '业务成本', dataIndex: 'businessAmount', key: 'businessAmount', width: 110, align: 'right', render: (value: number | undefined, row) => money(value, row.businessCurrency) }
      );
      if (canViewPayable) {
        kuayueColumns.push({ title: '应付金额', dataIndex: 'payableAmount', key: 'payableAmount', width: 110, align: 'right', render: (value: number | undefined, row) => money(value, row.payableCurrency) });
      }
      kuayueColumns.push(
        { title: '币种', dataIndex: 'businessCurrency', key: 'businessCurrency', width: 76, render: (value?: string) => value ?? 'RMB' },
        { title: '寄件人', key: 'sender', width: 150, ellipsis: true, render: (_, row) => [row.kuayueBill?.senderCompany, row.kuayueBill?.sender].filter(Boolean).join(' / ') || '-' },
        { title: '寄件城市', key: 'senderCity', width: 110, ellipsis: true, render: (_, row) => row.kuayueBill?.senderCity ?? '-' },
        { title: '目的地城市', key: 'destinationCity', width: 120, ellipsis: true, render: (_, row) => row.kuayueBill?.destinationCity ?? '-' },
        { title: '收件区号', key: 'receiverAreaCode', width: 100, ellipsis: true, render: (_, row) => row.kuayueBill?.receiverAreaCode ?? '-' },
        { title: '收件人', key: 'receiver', width: 150, ellipsis: true, render: (_, row) => [row.kuayueBill?.receiverCompany, row.kuayueBill?.receiver].filter(Boolean).join(' / ') || '-' },
        { title: '服务方式', key: 'serviceType', width: 110, ellipsis: true, render: (_, row) => row.kuayueBill?.serviceType ?? '-' },
        { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 110, ellipsis: true },
        { title: '运单号', key: 'systemOrderNo', width: 160, ellipsis: true, render: (_, row) => row.systemOrderNo ?? '-' },
        ...(canViewPayableStatus ? [{ title: '是否挂账', key: 'hangStatus', width: 100, render: (_: unknown, row: MiscFeeSummary) => hangTag(row.hangStatus) ?? '未挂账' }] : []),
        { title: '备注', dataIndex: 'remark', key: 'remark', width: 150, ellipsis: true, render: (value?: string) => value?.trim() || '-' },
        {
          title: '状态',
          key: 'status',
          width: 240,
          render: (_, row) => (
            <Space size={[4, 4]} wrap>
              {row.matchStatus === 'MATCHED' ? statusTag('已匹配订单', 'success') : statusTag('仅归属客户', 'warning')}
              {businessAssignmentTag(row)}
              {canViewPayableStatus ? auditTag(row.auditStatus) : null}
              {canViewPayableStatus && row.paymentStatus && row.paymentStatus !== 'NONE' ? statusTag(`付款 ${row.paymentStatus}`, 'blue') : null}
            </Space>
          )
        },
        { title: '确认账号', dataIndex: 'confirmedBy', key: 'confirmedBy', width: 120, ellipsis: true, render: (value: string | undefined, row) => value ?? row.createdBy ?? '-' }
      );
      if (canViewPayable) {
        kuayueColumns.push({ title: '审核账号', dataIndex: 'reviewedBy', key: 'reviewedBy', width: 120, ellipsis: true, render: (value?: string) => value ?? '-' });
      }
      kuayueColumns.push(actionColumn);
      return kuayueColumns;
    }

    if (section === 'pickup' || section === 'tally') {
      const pickupColumns: ManagedTableColumns<MiscFeeSummary> = [];
      pickupColumns.push({
        title: section === 'pickup' || canViewAgent ? '提货来源' : '来源',
        key: 'source',
        width: 130,
        render: (_, row) => pickupSourceLabel(row)
      });
      if (section === 'pickup' && canViewPayable && canViewAgent) {
        pickupColumns.push({
          title: '实际付款对象',
          dataIndex: 'agentName',
          key: 'agentName',
          width: 160,
          ellipsis: true,
          render: (value: string | undefined, row) => value?.trim() || (row.sourceType === 'WAREHOUSE_PICKUP' ? '思远仓库（内部报销）' : '-')
        });
      }
      pickupColumns.push(
        {
          title: '费用名称',
          dataIndex: 'feeName',
          key: 'feeName',
          width: 120
        },
        {
          title: '客户编号',
          dataIndex: 'customerCode',
          key: 'customerCode',
          width: 110
        },
        {
          title: '运单号',
          key: 'waybillNo',
          width: 170,
          render: (_, row) => miscFeeWaybillNo(row)
        },
        {
          title: '业务成本',
          children: [
            {
              title: '金额',
              settingsLabel: '业务成本金额',
              dataIndex: 'businessAmount',
              key: 'businessAmount',
              align: 'right',
              width: 130,
              render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '待匹配'
            },
            {
              title: '币种',
              settingsLabel: '业务成本币种',
              dataIndex: 'businessCurrency',
              key: 'businessCurrency',
              width: 115,
              render: (value: string | undefined, row) => row.businessAmount === undefined ? '-' : value ?? '-'
            }
          ] as ManagedTableColumns<MiscFeeSummary>
        }
      );

      if (canViewPayable) {
        pickupColumns.push(
          {
            title: '应付成本',
            children: [
              {
                title: '金额',
                settingsLabel: '应付成本金额',
                dataIndex: 'payableAmount',
                key: 'payableAmount',
                align: 'right',
                width: 130,
                render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-'
              },
              {
                title: '币种',
                settingsLabel: '应付成本币种',
                dataIndex: 'payableCurrency',
                key: 'payableCurrency',
                width: 115,
                render: (value?: string) => value ?? '-'
              }
            ] as ManagedTableColumns<MiscFeeSummary>
          }
        );
      }

      pickupColumns.push(
        {
          title: '登记时间',
          dataIndex: 'createdAt',
          key: 'createdAt',
          width: 170,
          render: (value: string) => formatBeijingDateTime(value)
        },
        {
          title: '登记人（称呼）',
          dataIndex: 'createdByLabel',
          key: 'createdBy',
          width: 140,
          render: (value: string | undefined, row) => value ?? row.createdBy
        },
        {
          title: '备注',
          dataIndex: 'remark',
          key: 'remark',
          width: 180,
          ellipsis: true,
          render: (value?: string) => value?.trim() || '-'
        },
        {
          title: '状态',
          key: 'state',
          width: 220,
          render: (_, row) => (
            <Space size={[4, 4]} wrap>
              {row.matchStatus === 'MATCHED'
                ? statusTag(section === 'pickup' ? '已归属运单' : '已匹配', 'success')
                : statusTag(section === 'pickup' ? '待业务归属' : '未匹配', 'warning')}
              {section === 'tally'
                ? row.confirmationStatus === 'CONFIRMED'
                  ? row.matchStatus === 'MATCHED'
                    ? statusTag('已写入业务成本', 'success')
                    : statusTag('待订单匹配', 'processing')
                  : statusTag('待仓库确认', 'warning')
                : businessAssignmentTag(row)}
              {canViewPayableStatus ? auditTag(row.auditStatus) : null}
              {canViewPayableStatus ? hangTag(row.hangStatus) : null}
              {row.voidedAt ? statusTag('已作废', 'error') : null}
              {canViewPayableStatus && row.paymentStatus && row.paymentStatus !== 'NONE' ? statusTag(`付款 ${row.paymentStatus}`, 'blue') : null}
            </Space>
          )
        },
        actionColumn
      );
      return pickupColumns;
    }

    if (section === 'purchase') {
      const purchaseColumns: ManagedTableColumns<MiscFeeSummary> = [];
      if (canViewPayable && canViewAgent) {
        purchaseColumns.push({
          title: '代理',
          key: 'agent',
          width: 100,
          render: (_, row) => row.agentName?.trim() || '代购'
        });
      }
      purchaseColumns.push(
        { title: '费用名称', dataIndex: 'feeName', key: 'feeName', width: 110 },
        { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 110 },
        { title: '运单号', key: 'businessNo', width: 180, ellipsis: true, render: (_, row) => row.businessNo ?? '-' },
        { title: '金额', dataIndex: 'businessAmount', key: 'businessAmount', width: 110, align: 'right', render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
        { title: '币种', dataIndex: 'businessCurrency', key: 'businessCurrency', width: 80, render: (value?: string) => value ?? 'RMB' },
        {
          title: '对账单凭证',
          key: 'attachments',
          width: 120,
          render: (_, row) => <Button size="small" type="link" onClick={() => void openDetail(row)}>{row.attachments?.length ?? 0} 份</Button>
        },
        {
          title: '水单',
          key: 'paymentReceipts',
          width: 90,
          render: (_, row) => <Button size="small" type="link" onClick={() => void openDetail(row)}>{row.paymentReceipts?.length ?? 0} 份</Button>
        },
        { title: '登记时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
        { title: '登记人（称呼）', dataIndex: 'createdByLabel', key: 'createdBy', width: 140, render: (value: string | undefined, row) => value ?? row.createdBy },
        { title: '备注', dataIndex: 'remark', key: 'remark', width: 170, ellipsis: true, render: (value?: string) => value?.trim() || '-' },
        { title: '状态', key: 'state', width: 130, render: (_, row) => purchaseWorkflowTag(row) },
        actionColumn
      );
      return purchaseColumns;
    }

    if (section === 'delivery') {
      const deliveryColumns: ManagedTableColumns<MiscFeeSummary> = [];
      if (canViewPayable && canViewAgent) {
        deliveryColumns.push({
          title: deliveryLedgerLabels.agent,
          dataIndex: 'agentName',
          key: 'agentName',
          width: 130,
          ellipsis: true,
          render: (value?: string) => value?.trim() || '-'
        });
      }
      deliveryColumns.push(
        { title: deliveryLedgerLabels.feeName, dataIndex: 'feeName', key: 'feeName', width: 120, ellipsis: true },
        { title: deliveryLedgerLabels.customerCode, dataIndex: 'customerCode', key: 'customerCode', width: 110, ellipsis: true },
        { title: deliveryLedgerLabels.waybillNo, key: 'waybillNo', width: 170, ellipsis: true, render: (_, row) => miscFeeWaybillNo(row) },
        { title: deliveryLedgerLabels.cargoData, key: 'cargoData', width: 230, ellipsis: true, render: (_, row) => formatDeliveryCargoData(row.cargoData) },
        ...(canViewAgent ? [{ title: deliveryLedgerLabels.dispatchAgent, dataIndex: 'dispatchAgentName', key: 'dispatchAgentName', width: 140, ellipsis: true, render: (value?: string) => value?.trim() || '-' }] : []),
        {
          title: deliveryLedgerLabels.businessCost,
          children: [
            {
              title: deliveryLedgerLabels.amount,
              settingsLabel: '业务成本金额',
              dataIndex: 'businessAmount',
              key: 'businessAmount',
              align: 'right',
              width: 100,
              render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '待匹配'
            },
            {
              title: deliveryLedgerLabels.currency,
              settingsLabel: '业务成本币种',
              dataIndex: 'businessCurrency',
              key: 'businessCurrency',
              width: 72,
              render: (value: string | undefined, row) => row.businessAmount === undefined ? '-' : value ?? '-'
            }
          ] as ManagedTableColumns<MiscFeeSummary>
        }
      );
      if (canViewPayable) {
        deliveryColumns.push({
          title: deliveryLedgerLabels.payableCost,
          children: [
            {
              title: deliveryLedgerLabels.amount,
              settingsLabel: '应付成本金额',
              dataIndex: 'payableAmount',
              key: 'payableAmount',
              align: 'right',
              width: 100,
              render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-'
            },
            {
              title: deliveryLedgerLabels.currency,
              settingsLabel: '应付成本币种',
              dataIndex: 'payableCurrency',
              key: 'payableCurrency',
              width: 72,
              render: (value?: string) => value ?? '-'
            }
          ] as ManagedTableColumns<MiscFeeSummary>
        });
      }
      deliveryColumns.push(
        { title: deliveryLedgerLabels.createdAt, dataIndex: 'createdAt', key: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
        { title: deliveryLedgerLabels.createdBy, dataIndex: 'createdByLabel', key: 'createdBy', width: 140, ellipsis: true, render: (value: string | undefined, row) => value ?? row.createdBy },
        { title: deliveryLedgerLabels.remark, dataIndex: 'remark', key: 'remark', width: 170, ellipsis: true, render: (value?: string) => value?.trim() || '-' },
        {
          title: deliveryLedgerLabels.status,
          key: 'status',
          width: 220,
          render: (_, row) => (
            <Space size={[4, 4]} wrap>
              {deliveryPrimaryStatus(row) === '已挂账'
                ? statusTag('已挂账', 'success')
                : deliveryPrimaryStatus(row) === '已匹配'
                  ? statusTag('已匹配', 'success')
                  : statusTag('未匹配', 'warning')}
              {businessAssignmentTag(row)}
              {canViewPayableStatus ? auditTag(row.auditStatus) : null}
              {canViewPayableStatus && row.hangStatus === 'PENDING' ? hangTag(row.hangStatus) : null}
              {row.voidedAt ? statusTag('已作废', 'error') : null}
            </Space>
          )
        },
        { ...actionColumn, title: deliveryLedgerLabels.action }
      );
      return deliveryColumns;
    }

    const base: ManagedTableColumns<MiscFeeSummary> = [
      {
        title: '费用归属',
        key: 'identity',
        width: 230,
        render: (_, row) => (
          <ManagedMatrixCell
            labelWidth={58}
            fields={[
              { key: 'source', label: '来源', value: <Tag color="blue">{row.sourceLabel}</Tag> },
              { key: 'fee', label: '费用名称', value: row.feeName, emphasis: true },
              { key: 'date', label: '发生日期', value: formatBeijingDate(row.occurredAt) }
            ]}
          />
        )
      },
      {
        title: '客户与订单',
        key: 'relation',
        width: 250,
        render: (_, row) => (
          <ManagedMatrixCell
            labelWidth={64}
            fields={[
              { key: 'customer', label: '客户编号', value: `${row.customerCode} · ${row.customerName}`, emphasis: true },
              { key: 'order', label: '出货单号', value: row.systemOrderNo ?? '待匹配' },
              { key: 'sales', label: '业务员', value: row.salesperson ?? '-' }
            ]}
          />
        )
      },
      {
        title: '业务成本',
        key: 'businessCost',
        width: 190,
        render: (_, row) => (
          <div className="misc-fee-cost-track misc-fee-business-track">
            <Text type="secondary">业务成本</Text>
            <strong>{money(row.businessAmount, row.businessCurrency)}</strong>
            <span>{row.businessSettlementMethod ?? '未选结算方式'}</span>
            {businessAssignmentTag(row)}
          </div>
        )
      }
    ];
    if (canViewPayable) {
      base.push({
        title: '应付成本',
        key: 'payableCost',
        width: 190,
        render: (_, row) => (
          <div className="misc-fee-cost-track misc-fee-payable-track">
            <Text type="secondary">真实应付</Text>
            <strong>{money(row.payableAmount, row.payableCurrency)}</strong>
            <span>{row.agentName ?? row.payableSettlementMethod ?? '未指定应付方'}</span>
            <Space size={4} wrap>{auditTag(row.auditStatus)}{hangTag(row.hangStatus)}</Space>
          </div>
        )
      });
    }
    base.push(
      {
        title: '关联状态',
        key: 'state',
        width: 150,
        render: (_, row) => (
          <Space direction="vertical" size={4}>
            {row.matchStatus === 'MATCHED' ? statusTag('已匹配订单', 'success') : statusTag('待匹配订单', 'warning')}
            {row.voidedAt ? statusTag('已作废', 'error') : null}
            {canViewPayableStatus && row.paymentStatus && row.paymentStatus !== 'NONE' ? statusTag(`付款 ${row.paymentStatus}`, 'blue') : null}
          </Space>
        )
      },
      actionColumn
    );
    return base;
  }, [canAssignBusinessCost, canDirectPayAndArchive, canManagePurchaseApplication, canManageTallyRegistration, canViewAgent, canViewPayable, canViewPayableStatus, hasPermission, section]);

  const miscFeeMatrixColumns = useMemo<ManagedTableColumns<MiscFeeSummary>>(() => {
    const actionColumn = columns.find((column) => column.key === 'action');
    if (!actionColumn) return columns;

    if (section === 'kuayue') {
      const matrixColumnCount = 6;
      const matrixColumnWidths = [250, 220, 300, 270, 220, 220];
      const fieldsFor = (row: MiscFeeSummary): Array<ManagedMatrixField | null> => [
        { key: 'feeName', label: '费用名称', value: row.feeName, emphasis: true },
        { key: 'kuayueBillNo', label: '跨越单号', value: row.kuayueBill?.kuayueBillNo ?? '-', title: row.kuayueBill?.kuayueBillNo },
        { key: 'occurredAt', label: '寄件日期', value: formatBeijingDate(row.occurredAt) },
        { key: 'importedAt', label: '导入时间', value: row.kuayueBill?.importedAt ? formatBeijingDateTime(row.kuayueBill.importedAt) : '-' },
        { key: 'pieceCount', label: '件数', value: row.kuayueBill?.pieceCount ?? '-' },
        { key: 'chargeWeightKg', label: '计费重量', value: row.kuayueBill?.chargeWeightKg === undefined ? '-' : `${row.kuayueBill.chargeWeightKg} kg` },
        ...(canViewPayable ? [
          { key: 'freightAmount', label: '运单运费', value: money(row.kuayueBill?.freightAmount) },
          { key: 'insuranceAmount', label: '保费', value: money(row.kuayueBill?.insuranceAmount) },
          { key: 'overageAmount', label: '超重费', value: money(row.kuayueBill?.overageAmount) },
          { key: 'oversizeAmount', label: '超长费', value: money(row.kuayueBill?.oversizeAmount) },
          { key: 'discountAmount', label: '优惠金额', value: money(row.kuayueBill?.discountAmount) }
        ] : []),
        { key: 'businessAmount', label: '业务成本', value: money(row.businessAmount, row.businessCurrency), emphasis: true },
        canViewPayable ? { key: 'payableAmount', label: '应付金额', value: money(row.payableAmount, row.payableCurrency), emphasis: true } : null,
        { key: 'businessCurrency', label: '币种', value: row.businessCurrency ?? 'RMB' },
        {
          key: 'sender',
          label: '寄件人',
          value: [row.kuayueBill?.senderCompany, row.kuayueBill?.sender].filter(Boolean).join(' / ') || '-',
          title: [row.kuayueBill?.senderCompany, row.kuayueBill?.sender].filter(Boolean).join(' / ') || undefined
        },
        { key: 'senderCity', label: '寄件城市', value: row.kuayueBill?.senderCity ?? '-' },
        { key: 'destinationCity', label: '目的地城市', value: row.kuayueBill?.destinationCity ?? '-' },
        { key: 'receiverAreaCode', label: '收件区号', value: row.kuayueBill?.receiverAreaCode ?? '-' },
        {
          key: 'receiver',
          label: '收件人',
          value: [row.kuayueBill?.receiverCompany, row.kuayueBill?.receiver].filter(Boolean).join(' / ') || '-',
          title: [row.kuayueBill?.receiverCompany, row.kuayueBill?.receiver].filter(Boolean).join(' / ') || undefined
        },
        { key: 'serviceType', label: '服务方式', value: row.kuayueBill?.serviceType ?? '-' },
        canViewPayable && canViewAgent ? { key: 'agentName', label: '代理', value: row.agentName ?? '-', title: row.agentName } : null,
        { key: 'customerCode', label: '客户编号', value: row.customerCode },
        { key: 'systemOrderNo', label: '运单号', value: row.systemOrderNo ?? '-', title: row.systemOrderNo },
        canViewPayableStatus ? { key: 'hangStatus', label: '是否挂账', value: hangTag(row.hangStatus) ?? '未挂账' } : null,
        { key: 'confirmedBy', label: '确认账号', value: row.confirmedBy ?? row.createdBy ?? '-' },
        canViewPayable ? { key: 'reviewedBy', label: '审核账号', value: row.reviewedBy ?? '-' } : null,
        {
          key: 'status',
          label: '状态',
          value: (
            <Space size={4}>
              {row.matchStatus === 'MATCHED' ? statusTag('已匹配订单', 'success') : statusTag('仅归属客户', 'warning')}
              {businessAssignmentTag(row)}
              {canViewPayableStatus ? auditTag(row.auditStatus) : null}
              {canViewPayableStatus && row.paymentStatus && row.paymentStatus !== 'NONE' ? statusTag(`付款 ${row.paymentStatus}`, 'blue') : null}
            </Space>
          )
        },
        { key: 'remark', label: '备注', value: row.remark?.trim() || '-', title: row.remark?.trim() }
      ];

      const informationColumns: ManagedTableColumns<MiscFeeSummary> = matrixColumnWidths.map((width, columnIndex) => ({
        title: '',
        settingsLabel: `信息列 ${columnIndex + 1}`,
        key: `matrixInformation${columnIndex + 1}`,
        width,
        className: columnIndex === 0 ? 'managed-matrix-group-primary' : undefined,
        render: (_, row) => (
          <ManagedMatrixCell
            labelWidth={58}
            gap={6}
            fields={distributeFlatMatrixFields(fieldsFor(row), matrixColumnCount)[columnIndex]}
          />
        )
      }));

      return [
        ...informationColumns,
        { ...actionColumn, title: '', width: 140 }
      ];
    }

    const matrixColumnCount = 4;
    const matrixColumnWidths = [240, 240, 240, 240];
    const fieldsFor = (row: MiscFeeSummary): Array<ManagedMatrixField | null> => [
      { key: 'source', label: section === 'pickup' ? '提货来源' : '来源', value: section === 'pickup' || section === 'tally' ? pickupSourceLabel(row) : row.sourceLabel },
      { key: 'fee', label: '费用名称', value: row.feeName, emphasis: true, title: row.feeName },
      section === 'pickup'
        ? canViewPayable && canViewAgent ? { key: 'agent', label: '付款对象', value: row.agentName ?? '-' } : null
        : canViewAgent ? { key: 'agent', label: '代理', value: section === 'tally' ? pickupSourceLabel(row) : row.agentName ?? (section === 'purchase' ? '代购' : '-') } : null,
      { key: 'customer', label: '客户编号', value: `${row.customerCode} · ${row.customerName}`, title: `${row.customerCode} · ${row.customerName}` },
      { key: 'order', label: '运单号', value: miscFeeWaybillNo(row), title: miscFeeWaybillNo(row) },
      { key: 'businessAmount', label: '业务成本', value: money(row.businessAmount, row.businessCurrency), emphasis: true },
      canViewPayable ? { key: 'payableAmount', label: '应付成本', value: money(row.payableAmount, row.payableCurrency), emphasis: true } : null,
      {
        key: 'status',
        label: '状态',
        value: (
          <Space size={4}>
            {row.matchStatus === 'MATCHED'
              ? statusTag(section === 'pickup' ? '已归属运单' : '已匹配订单', 'success')
              : statusTag(section === 'pickup' ? '待业务归属' : '待匹配订单', 'warning')}
            {canViewPayableStatus ? auditTag(row.auditStatus) : null}
            {canViewPayableStatus ? hangTag(row.hangStatus) : null}
            {row.voidedAt ? statusTag('已作废', 'error') : null}
          </Space>
        )
      },
      { key: 'occurredAt', label: '发生日期', value: formatBeijingDate(row.occurredAt) },
      { key: 'createdAt', label: '登记时间', value: formatBeijingDateTime(row.createdAt) },
      { key: 'createdBy', label: '登记人', value: row.createdByLabel ?? row.createdBy ?? '-' },
      { key: 'remark', label: '备注', value: row.remark?.trim() || '-', title: row.remark?.trim() }
    ];
    const informationColumns: ManagedTableColumns<MiscFeeSummary> = matrixColumnWidths.map((width, columnIndex) => ({
      title: '',
      settingsLabel: `信息列 ${columnIndex + 1}`,
      key: `matrixInformation${columnIndex + 1}`,
      width,
      className: columnIndex === 0 ? 'managed-matrix-group-primary' : undefined,
      render: (_, row) => (
        <ManagedMatrixCell
          labelWidth={64}
          gap={8}
          fields={distributeFlatMatrixFields(fieldsFor(row), matrixColumnCount)[columnIndex]}
        />
      )
    }));

    return [
      ...informationColumns,
      { ...actionColumn, title: '', width: 180 }
    ];
  }, [canViewAgent, canViewPayable, canViewPayableStatus, columns, section]);

  const kuayueUnassignedMatrixColumns = useMemo<ManagedTableColumns<KuayueImportLineSummary>>(() => {
    const matrixColumnCount = 5;
    const fieldsFor = (row: KuayueImportLineSummary): ManagedMatrixField[] => [
      { key: 'billNo', label: '跨越单号', value: row.kuayueBillNo ?? '-', emphasis: true, title: row.kuayueBillNo },
      { key: 'date', label: '寄件日期', value: row.occurredAt ? formatBeijingDate(row.occurredAt) : '-' },
      { key: 'importedAt', label: '导入时间', value: row.batchCommittedAt ? formatBeijingDateTime(row.batchCommittedAt) : '-' },
      { key: 'pieces', label: '件数', value: row.pieceCount ?? '-' },
      { key: 'weight', label: '计费重量', value: row.chargeWeightKg === undefined ? '-' : `${row.chargeWeightKg} kg` },
      ...(canViewPayable ? [
        { key: 'freight', label: '运费', value: money(row.freightAmount) },
        { key: 'insurance', label: '保费', value: money(row.insuranceAmount) },
        { key: 'overage', label: '超重费', value: money(row.overageAmount) },
        { key: 'oversize', label: '超长费', value: money(row.oversizeAmount) },
        { key: 'discount', label: '优惠金额', value: money(row.discountAmount) },
        { key: 'delivery', label: '派送费', value: money(row.deliveryAmount) },
        { key: 'resource', label: '调配费', value: money(row.resourceAllocationAmount) }
      ] : []),
      { key: 'business', label: '业务成本', value: money(row.businessAmount), emphasis: true },
      ...(canViewPayable ? [{ key: 'payable', label: '应付金额', value: money(row.payableAmount), emphasis: true }] : []),
      {
        key: 'sender',
        label: '寄件信息',
        value: [row.senderCompany, row.sender, row.senderCity].filter(Boolean).join(' / ') || '-',
        title: [row.senderCompany, row.sender, row.senderCity].filter(Boolean).join(' / ') || undefined
      },
      {
        key: 'receiver',
        label: '收件信息',
        value: [row.receiverCompany, row.receiver, row.destinationCity].filter(Boolean).join(' / ') || '-',
        title: [row.receiverCompany, row.receiver, row.destinationCity].filter(Boolean).join(' / ') || undefined
      },
      { key: 'service', label: '服务方式', value: row.serviceType ?? '-' }
    ];
    const informationColumns: ManagedTableColumns<KuayueImportLineSummary> = Array.from(
      { length: matrixColumnCount },
      (_, columnIndex) => ({
        title: '',
        settingsLabel: `信息列 ${columnIndex + 1}`,
        key: `matrixInformation${columnIndex + 1}`,
        width: 260,
        className: columnIndex === 0 ? 'managed-matrix-group-primary' : undefined,
        render: (_, row) => (
          <ManagedMatrixCell
            labelWidth={64}
            gap={8}
            fields={distributeFlatMatrixFields(fieldsFor(row), matrixColumnCount)[columnIndex]}
          />
        )
      })
    );
    return [
      ...informationColumns,
      {
      title: '',
      key: 'action',
      fixed: 'right',
      width: 110,
      render: (_, row) => hasPermission('update')
        ? <Button size="small" type="primary" onClick={() => openKuayueClaim(row)}>归属客户</Button>
        : null
      }
    ];
  }, [canViewPayable, hasPermission]);

  const kuayueUnassignedLedgerColumns = useMemo<ManagedTableColumns<KuayueImportLineSummary>>(() => [
    { title: '跨越单号', dataIndex: 'kuayueBillNo', key: 'kuayueBillNo', width: 170, ellipsis: true },
    { title: '寄件日期', dataIndex: 'occurredAt', key: 'occurredAt', width: 112, render: (value?: string) => value ? formatBeijingDate(value) : '-' },
    { title: '导入时间', dataIndex: 'batchCommittedAt', key: 'batchCommittedAt', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    { title: '件数', dataIndex: 'pieceCount', key: 'pieceCount', width: 76, align: 'right', render: (value?: number) => value ?? '-' },
    { title: '计费重量', dataIndex: 'chargeWeightKg', key: 'chargeWeightKg', width: 105, align: 'right', render: (value?: number) => value === undefined ? '-' : `${value} kg` },
    ...(canViewPayable ? [
      { title: '运费', dataIndex: 'freightAmount', key: 'freightAmount', width: 100, align: 'right' as const, render: (value?: number) => money(value) },
      { title: '保费', dataIndex: 'insuranceAmount', key: 'insuranceAmount', width: 100, align: 'right' as const, render: (value?: number) => money(value) },
      { title: '超重费', dataIndex: 'overageAmount', key: 'overageAmount', width: 100, align: 'right' as const, render: (value?: number) => money(value) },
      { title: '超长费', dataIndex: 'oversizeAmount', key: 'oversizeAmount', width: 100, align: 'right' as const, render: (value?: number) => money(value) },
      { title: '优惠金额', dataIndex: 'discountAmount', key: 'discountAmount', width: 110, align: 'right' as const, render: (value?: number) => money(value) },
      { title: '派送费', dataIndex: 'deliveryAmount', key: 'deliveryAmount', width: 100, align: 'right' as const, render: (value?: number) => money(value) },
      { title: '调配费', dataIndex: 'resourceAllocationAmount', key: 'resourceAllocationAmount', width: 100, align: 'right' as const, render: (value?: number) => money(value) }
    ] : []),
    { title: '业务成本', dataIndex: 'businessAmount', key: 'businessAmount', width: 110, align: 'right', render: (value?: number) => money(value) },
    ...(canViewPayable ? [{ title: '应付金额', dataIndex: 'payableAmount', key: 'payableAmount', width: 110, align: 'right' as const, render: (value?: number) => money(value) }] : []),
    { title: '寄件信息', key: 'sender', width: 180, ellipsis: true, render: (_, row) => [row.senderCompany, row.sender, row.senderCity].filter(Boolean).join(' / ') || '-' },
    { title: '收件信息', key: 'receiver', width: 180, ellipsis: true, render: (_, row) => [row.receiverCompany, row.receiver, row.destinationCity].filter(Boolean).join(' / ') || '-' },
    { title: '服务方式', dataIndex: 'serviceType', key: 'serviceType', width: 110, ellipsis: true, render: (value?: string) => value ?? '-' },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, row) => hasPermission('update')
        ? <Button size="small" type="primary" onClick={() => openKuayueClaim(row)}>归属客户</Button>
        : null
    }
  ], [canViewPayable, hasPermission]);

  const currentItem = sectionItems.find((item) => item.key === section)!;
  const selectedRows = response.rows.filter((row) => selectedKeys.includes(row.id));
  const supportsMiscFeeDualView = ['kuayue', 'pickup', 'tally', 'purchase'].includes(section);
  const miscFeeLedgerMinimumScrollX = ['pickup', 'tally'].includes(section)
    ? (canViewPayable ? 1830 : 1580)
    : section === 'purchase'
      ? (canViewPayable ? 1900 : 1600)
      : section === 'kuayue'
        ? (canViewPayable ? 3420 : 3080)
        : section === 'delivery'
          ? 960
          : section === 'pickup'
            ? (canViewPayable ? 1370 : 980)
            : (canViewPayable ? 1190 : 980);
  const miscFeeLedgerColumnSettings = {
    storageKey: `misc-fee-${section}-${section === 'delivery' ? 'flat-ledger-v2' : section === 'pickup' ? 'flat-ledger-v5' : section === 'tally' ? 'flat-ledger-v4' : 'ledger'}`,
    defaultColumnOrder: section === 'delivery'
      ? ['agentName', 'feeName', 'customerCode', 'waybillNo', 'cargoData', 'dispatchAgentName', 'businessAmount', 'businessCurrency', 'payableAmount', 'payableCurrency', 'createdAt', 'createdBy', 'remark', 'status', 'action']
      : undefined,
    lockedKeys: ['selection', 'select', 'action']
  };
  const miscFeeTableSharedProps = {
    rowKey: 'id',
    loading,
    dataSource: response.rows,
    rowSelection: {
      selectedRowKeys: selectedKeys,
      onChange: setSelectedKeys,
      preserveSelectedRowKeys: true,
      columnWidth: 44
    },
    pagination: { ...tenRowTablePagination, total: response.rows.length },
    scroll: section === 'kuayue' ? { y: 'calc(100vh - 620px)' } : undefined,
    density: 'compact' as const,
    toolbarLeading: <Text type="secondary">已选 {selectedKeys.length} 条</Text>,
    toolbarActions: (
      <Space wrap>
        {!['kuayue', 'pickup', 'purchase'].includes(section) && hasPermission('confirm') && !canAssignBusinessCost ? (
          <Button size="small" disabled={!selectedRows.some((row) => row.confirmationStatus === 'PENDING' && row.businessAmount !== undefined)} onClick={() => void performBatch('confirm')}>
            {section === 'tally' ? '批量仓库确认' : '批量确认'}
          </Button>
        ) : null}
        {section !== 'purchase' && canViewPayableStatus && hasPermission('audit') ? (
          <Button size="small" disabled={!selectedRows.some((row) => canAuditMiscFeeRow(row))} onClick={() => void performBatch('audit')}>
            批量审核
          </Button>
        ) : null}
        {section !== 'purchase' && canViewPayableStatus && hasPermission('hang') && (canViewPayable || section === 'kuayue') ? (
          <Button size="small" disabled={!selectedRows.some((row) => canSubmitMiscFeeHangRequest(row) && !['PENDING', 'APPROVED'].includes(row.hangStatus ?? 'NONE'))} onClick={openBatchHangRequest}>
            批量挂账
          </Button>
        ) : null}
      </Space>
    )
  };

  return (
    <AppPage className="misc-fee-page">
      <AppPageHeader
        title={currentItem.label}
        description={currentItem.description}
        actions={(
          <Space wrap>
            <Button icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>
            {section === 'kuayue' ? (hasPermission('create') && canViewPayable ? (
              <Button
                type="primary"
                icon={<FileInput size={15} />}
                onClick={() => setImportOpen(true)}
              >
                导入账单
              </Button>
            ) : null) : canCreateCurrentFee ? (
              <Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>新增费用</Button>
            ) : null}
          </Space>
        )}
      />

      {section === 'kuayue' ? (
        <Tabs
          className="misc-fee-kuayue-workspace-tabs"
          activeKey={kuayueWorkspaceTab}
          onChange={(key) => {
            const nextTab = key as KuayueWorkspaceTab;
            setKuayueWorkspaceTab(nextTab);
            setSelectedKeys([]);
            try {
              globalThis.localStorage?.setItem(KUAYUE_WORKSPACE_TAB_STORAGE_KEY, nextTab);
            } catch {
              // Tab persistence is optional and must not block the finance workflow.
            }
          }}
          items={[
            { key: 'unassigned', label: `待归属账单 ${kuayueLineTotal}` },
            { key: 'assigned', label: `已归属费用 ${response.totals.count}` }
          ]}
        />
      ) : null}

      {section === 'kuayue' ? <AppFilterBar>
        <Form
          form={filterForm}
          layout="inline"
          onFinish={(values) => setFilters(values)}
          className="misc-fee-filter-form"
        >
          {renderFilterField('日期区间', (
            <Form.Item name="occurredRange" noStyle>
              <AppDateRangePicker />
            </Form.Item>
          ))}
          {renderFilterField('跨越单号', (
            <Form.Item name="kuayueBillNo" noStyle>
              <Input allowClear placeholder="输入跨越单号" />
            </Form.Item>
          ))}
          {kuayueWorkspaceTab === 'assigned' ? renderFilterField('客户编号', (
            <Form.Item name="customerCode" noStyle>
              <Input allowClear placeholder="例如 9155" />
            </Form.Item>
          )) : null}
          {kuayueWorkspaceTab === 'assigned' && canViewPayable ? renderFilterField('应付审核', (
            <Form.Item name="auditStatus" noStyle>
              <Select allowClear placeholder="全部" options={[{ label: '待审核', value: 'PENDING' }, { label: '已审核', value: 'APPROVED' }]} />
            </Form.Item>
          )) : null}
          {renderFilterActions(
            () => filterForm.submit(),
            () => {
              filterForm.resetFields();
              setFilters({});
            }
          )}
        </Form>
      </AppFilterBar> : null}

      {section === 'kuayue' && kuayueWorkspaceTab === 'unassigned' ? (
          <Card className="misc-fee-ledger-card misc-fee-kuayue-claim-card">
            <ManagedDualViewTable<KuayueImportLineSummary>
              viewStorageKey="sunny.misc-fee.kuayue.unassigned.view-v1"
              viewAriaLabel="跨越待归属账单表格视图"
              defaultView="matrix"
              views={{
                matrix: {
                  label: '矩阵视图',
                  columns: kuayueUnassignedMatrixColumns,
                  tableProps: {
                    className: 'misc-fee-kuayue-unassigned-table misc-fee-kuayue-unassigned-matrix-table misc-fee-flat-matrix-table',
                    minimumScrollX: 0,
                    tableLayout: 'fixed',
                    density: 'compact',
                    columnSettings: {
                      storageKey: 'misc-fee-kuayue-import-lines.matrix-v3',
                      lockedKeys: ['matrixInformation1', 'matrixInformation2', 'matrixInformation3', 'matrixInformation4', 'matrixInformation5', 'action'],
                      labels: {
                        matrixInformation1: '信息列 1',
                        matrixInformation2: '信息列 2',
                        matrixInformation3: '信息列 3',
                        matrixInformation4: '信息列 4',
                        matrixInformation5: '信息列 5',
                        action: '操作'
                      }
                    }
                  }
                },
                ledger: {
                  label: '精密台账模式',
                  columns: kuayueUnassignedLedgerColumns,
                  tableProps: {
                    className: 'misc-fee-kuayue-unassigned-table misc-fee-kuayue-unassigned-ledger-table',
                    minimumScrollX: canViewPayable ? 2110 : 2000,
                    density: 'compact',
                    columnSettings: { storageKey: 'misc-fee-kuayue-import-lines.ledger-v1', lockedKeys: ['action'] }
                  }
                }
              }}
              rowKey="id"
              loading={kuayueLinesLoading}
              dataSource={kuayueLines}
              pagination={{ ...tenRowTablePagination, total: kuayueLineTotal }}
            />
          </Card>
      ) : null}

      {section === 'kuayue' && kuayueWorkspaceTab === 'assigned' ? (
        <div className="misc-fee-kuayue-summary" aria-label="跨越已归属费用汇总">
          <div className="misc-fee-kuayue-summary-item">
            <span>费用记录</span>
            <strong>{response.totals.count}</strong>
          </div>
          <div className="misc-fee-kuayue-summary-item">
            <span>业务成本（RMB）</span>
            <strong>{response.totals.businessRmbAmount.toFixed(2)}</strong>
          </div>
          <div className="misc-fee-kuayue-summary-item">
            <span>待审核</span>
            <strong>{response.totals.pendingConfirmation}</strong>
          </div>
          {canViewPayable ? (
            <div className="misc-fee-kuayue-summary-item">
              <span>应付成本（RMB）</span>
              <strong>{(response.totals.payableRmbAmount ?? 0).toFixed(2)}</strong>
              <small>{response.totals.pendingAudit ?? 0} 条待审核</small>
            </div>
          ) : null}
        </div>
      ) : null}

      {section !== 'kuayue' ? <Row gutter={[12, 12]} className="misc-fee-metrics">
        <Col xs={24} sm={12} lg={6}>
          <MetricCard icon={<ClipboardList size={18} />} title="费用记录" value={response.totals.count} extra="当前筛选范围" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard icon={<Banknote size={18} />} title="业务成本（RMB）" value={response.totals.businessRmbAmount.toFixed(2)} extra="按确认日汇率快照" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            icon={<CheckCircle2 size={18} />}
            title={section === 'tally' ? '待仓库确认' : '待业务归属'}
            value={response.totals.pendingConfirmation}
            extra={section === 'tally' ? '确认后由录单或出库勾选匹配' : '业务员匹配订单后写入业务成本'}
          />
        </Col>
        {canViewPayable ? (
          <Col xs={24} sm={12} lg={6}>
            <MetricCard icon={<WalletCards size={18} />} title="应付成本（RMB）" value={(response.totals.payableRmbAmount ?? 0).toFixed(2)} extra={`${response.totals.pendingAudit ?? 0} 条待审核`} />
          </Col>
        ) : null}
      </Row> : null}

      {section !== 'kuayue' ? <AppFilterBar>
        <Form
          form={filterForm}
          layout="inline"
          onFinish={(values) => setFilters(values)}
          className="misc-fee-filter-form"
        >
          {renderFilterField('关键词', <Form.Item name="keyword" noStyle><Input allowClear placeholder="费用/客户/订单" /></Form.Item>)}
          {renderFilterField('客户编号', <Form.Item name="customerCode" noStyle><Input allowClear placeholder="例如 9155" /></Form.Item>)}
          {renderFilterField(section === 'tally' ? '订单匹配' : '业务确认', (
            <Form.Item name={section === 'tally' ? 'matchStatus' : 'confirmationStatus'} noStyle>
              <Select
                allowClear
                placeholder="全部"
                options={section === 'tally'
                  ? [{ label: '未匹配', value: 'UNMATCHED' }, { label: '已匹配', value: 'MATCHED' }]
                  : [{ label: '待确认', value: 'PENDING' }, { label: '已确认', value: 'CONFIRMED' }]}
              />
            </Form.Item>
          ))}
          {canViewPayable ? renderFilterField('应付审核', (
            <Form.Item name="auditStatus" noStyle>
              <Select allowClear placeholder="全部" options={[{ label: '待审核', value: 'PENDING' }, { label: '已审核', value: 'APPROVED' }]} />
            </Form.Item>
          )) : null}
          {renderFilterActions(
            () => filterForm.submit(),
            () => {
              filterForm.resetFields();
              setFilters({});
            }
          )}
        </Form>
      </AppFilterBar> : null}

      {section !== 'kuayue' || kuayueWorkspaceTab === 'assigned' ? <Card className="misc-fee-ledger-card misc-fee-assigned-ledger-card">
        {supportsMiscFeeDualView ? (
          <ManagedDualViewTable<MiscFeeSummary>
            {...miscFeeTableSharedProps}
            viewStorageKey={`sunny.misc-fee.${section}.view-v1`}
            viewAriaLabel={`${currentItem.label}表格视图`}
            defaultView="ledger"
            views={{
              matrix: {
                label: '矩阵视图',
                columns: miscFeeMatrixColumns,
                tableProps: {
                  className: `misc-fee-ledger-table misc-fee-matrix-table misc-fee-flat-matrix-table${section === 'kuayue' ? ' misc-fee-kuayue-assigned-matrix-table' : ''}`,
                  minimumScrollX: 0,
                  tableLayout: 'fixed',
                  columnSettings: {
                    storageKey: `misc-fee-${section}-matrix-columns-${section === 'kuayue' ? 'v4' : 'v3'}`,
                    lockedKeys: ['selection', 'select', 'matrixInformation1', 'matrixInformation2', 'matrixInformation3', 'matrixInformation4', 'matrixInformation5', 'matrixInformation6', 'action'],
                    labels: {
                      matrixInformation1: '信息列 1',
                      matrixInformation2: '信息列 2',
                      matrixInformation3: '信息列 3',
                      matrixInformation4: '信息列 4',
                      matrixInformation5: '信息列 5',
                      matrixInformation6: '信息列 6',
                      action: '操作'
                    }
                  }
                }
              },
              ledger: {
                label: '精密台账模式',
                columns,
                tableProps: {
                  className: 'misc-fee-ledger-table misc-fee-ledger-view-table',
                  minimumScrollX: miscFeeLedgerMinimumScrollX,
                  columnSettings: miscFeeLedgerColumnSettings
                }
              }
            }}
          />
        ) : (
          <ManagedTable<MiscFeeSummary>
            {...miscFeeTableSharedProps}
            className="misc-fee-ledger-table"
            columns={columns}
            minimumScrollX={miscFeeLedgerMinimumScrollX}
            columnSettings={miscFeeLedgerColumnSettings}
          />
        )}
      </Card> : null}

      <Drawer
        className="misc-fee-editor-drawer"
        title={`${editingTarget ? '修改' : '新增'}${currentItem.label}`}
        width={['purchase', 'delivery'].includes(section) ? 720 : 860}
        open={drawerOpen}
        destroyOnClose
        onClose={() => {
          setDrawerOpen(false);
          setEditingTarget(undefined);
        }}
        extra={<Button type="primary" loading={saving} onClick={() => void submitFee()}>{editingTarget ? '保存修改' : '保存登记'}</Button>}
      >
        <Form form={form} layout="vertical" requiredMark={section === 'delivery' ? true : 'optional'}>
          {section === 'pickup' ? (
            <Alert
              type="info"
              showIcon
              message="登记真实应付后，由负责业务员归属运单并填写业务成本；财务审核通过后，两项成本才正式写入运单。"
              className="misc-fee-form-alert"
            />
          ) : null}
          {section === 'delivery' ? (
            <AppFormSection title="送货费登记">
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请填写客户编号' }]}>
                    <Input
                      disabled={Boolean(editingTarget)}
                      placeholder="例如 9233"
                      onChange={() => {
                        form.setFieldsValue({ systemOrderNo: undefined, agentId: undefined, agentName: undefined });
                        setDeliveryShipments([]);
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="systemOrderNo" label="运单号">
                    <Select
                      allowClear
                      showSearch
                      disabled={Boolean(editingTarget)}
                      loading={deliveryShipmentsLoading}
                      optionFilterProp="label"
                      placeholder={watchedFeeCustomerCode?.trim() ? '选择未完成应收核销的运单' : '先填写客户编号'}
                      options={deliveryShipmentOptions}
                      notFoundContent={deliveryShipmentsLoading ? '正在查询' : '暂无可选运单'}
                      onChange={(value?: string) => {
                        const shipment = deliveryShipments.find((item) => item.systemOrderNo === value);
                        form.setFieldsValue({ agentId: shipment?.agentId, agentName: shipment?.agentName });
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="货物数据">
                    <Input
                      readOnly
                      value={selectedDeliveryShipment
                        ? `${selectedDeliveryShipment.packageCount} 件 / ${selectedDeliveryShipment.actualWeightKg ?? 0} kg / ${selectedDeliveryShipment.volumeCbm ?? 0} CBM`
                        : ''}
                      placeholder="选择运单后自动带出"
                    />
                  </Form.Item>
                </Col>
                {canViewAgent ? <Col xs={24} md={12}>
                  <Form.Item name="agentId" label="送货代理" rules={[{ required: true, message: '请选择送货代理' }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="默认带出订单代理，也可修改"
                      options={agents.filter((agent) => agent.enabled).map((agent) => ({ label: agent.shortName ? `${agent.shortName} · ${agent.name}` : agent.name, value: agent.id }))}
                    />
                  </Form.Item>
                </Col> : null}
                <Col xs={24} md={12}>
                  <Form.Item label="应付成本" required>
                    <Space.Compact block>
                      <Form.Item name="payableAmount" noStyle rules={[{ required: true, message: '请填写应付成本' }]}>
                        <InputNumber aria-label="应付成本" min={0} precision={2} className="misc-fee-full-width" />
                      </Form.Item>
                      <Input readOnly value="RMB" aria-label="币种" style={{ width: 76, textAlign: 'center' }} />
                    </Space.Compact>
                  </Form.Item>
                </Col>
              </Row>
            </AppFormSection>
          ) : null}

          {section !== 'delivery' ? <AppFormSection title="归属与关联">
            <Row gutter={12}>
              {section === 'pickup' ? (
                <Col xs={24} md={canViewPayable ? 12 : 8}>
                  <Form.Item name="sourceType" label="提货来源" rules={[{ required: true, message: '请选择提货来源' }]}>
                    <Select
                      disabled={Boolean(editingTarget) || availablePickupSourceOptions.length === 1}
                      options={availablePickupSourceOptions}
                      onChange={(value: MiscFeeSourceType) => {
                        if (value === 'WAREHOUSE_PICKUP') {
                          form.setFieldValue('agentName', '思远仓库（内部报销）');
                          form.setFieldValue('agentId', undefined);
                        } else {
                          form.setFieldValue('agentName', undefined);
                          form.setFieldValue('agentId', undefined);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              ) : null}
              <Col xs={24} md={section === 'pickup' ? (canViewPayable ? 12 : 8) : 12}>
                <Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请填写客户编号' }]}>
                  <Input placeholder="例如 9155" />
                </Form.Item>
              </Col>
              {section !== 'purchase' && !(canViewPayable && ['pickup', 'tally'].includes(section)) ? (
                <Col xs={24} md={section === 'pickup' ? 8 : 12}>
                  <Form.Item name="systemOrderNo" label="出货单号（选填）">
                    <Input placeholder="未确定订单时可以留空" />
                  </Form.Item>
                </Col>
              ) : null}
              {section !== 'purchase' ? (
                <Col xs={24} md={12}>
                  <Form.Item name="feeName" label="费用名称" rules={[{ required: true, message: '请填写费用名称' }]}>
                    {section === 'tally'
                      ? <Select showSearch optionFilterProp="label" options={feeNameOptions} placeholder="从费用名称资料库选择" />
                      : <Input />}
                  </Form.Item>
                </Col>
              ) : null}
              <Col xs={24} md={section === 'purchase' ? 12 : 12}>
                <Form.Item name="occurredAt" label="发生日期" rules={[{ required: true, message: '请选择发生日期' }]}>
                  <AppDatePicker className="misc-fee-full-width" />
                </Form.Item>
              </Col>
            </Row>
          </AppFormSection> : null}

          {section !== 'delivery' ? <div className={`misc-fee-form-tracks${(!canViewPayable || !['purchase', 'tally'].includes(section)) ? ' is-single-track' : ''}`}>
            {!canViewPayable || ['purchase', 'tally'].includes(section) ? (
              <AppFormSection title="业务成本">
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="businessAmount" label="业务成本金额" rules={[{ required: true, message: '请填写业务成本' }, ...(section === 'tally' ? [{ type: 'number' as const, min: 0.01, message: '业务成本必须大于 0' }] : [])]}>
                      <InputNumber min={section === 'tally' ? 0.01 : 0} precision={2} className="misc-fee-full-width" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="businessCurrency" label="业务币种" rules={[{ required: true }]}>
                      <Select
                        disabled={section === 'purchase'}
                        options={(section === 'purchase' ? ['RMB'] : ['RMB', 'USD', 'EUR', 'GBP', 'HKD']).map((value) => ({ label: value, value }))}
                      />
                    </Form.Item>
                  </Col>
                  {section !== 'purchase' ? (
                    <Col span={24}>
                      <Form.Item name="businessSettlementMethod" label="业务结算方式">
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder="选择后自动带出币种"
                          options={settlementOptions}
                          onChange={(value?: string) => {
                            const currency = value ? getSettlementMethodCurrency(settlementRows, value) : undefined;
                            if (currency) form.setFieldValue('businessCurrency', currency);
                          }}
                        />
                      </Form.Item>
                    </Col>
                  ) : null}
                </Row>
              </AppFormSection>
            ) : null}

            {canViewPayable && section !== 'purchase' ? (
              <AppFormSection title="应付成本">
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="payableAmount" label="应付成本金额" rules={[{ required: true, message: '请填写应付成本' }, ...(section === 'tally' ? [{ type: 'number' as const, min: 0.01, message: '应付成本必须大于 0' }] : [])]}>
                      <InputNumber min={section === 'tally' ? 0.01 : 0} precision={2} className="misc-fee-full-width" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="payableCurrency" label="应付币种">
                      {section === 'pickup'
                        ? <Input readOnly value="RMB" />
                        : <Select options={['RMB', 'USD', 'EUR', 'GBP', 'HKD'].map((value) => ({ label: value, value }))} />}
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item
                      name={section === 'tally' ? 'agentName' : 'agentId'}
                      label={section === 'pickup' ? '实际付款对象' : section === 'tally' ? '代理' : '应付代理'}
                      rules={section === 'pickup' && watchedPickupSourceType === 'MARKET_PICKUP'
                        ? [{ required: true, message: '市场提货必须选择实际付款对象' }]
                        : undefined}
                      extra={section === 'pickup' && watchedPickupSourceType === 'WAREHOUSE_PICKUP'
                        ? '不选择时按“思远仓库（内部报销）”进入应付'
                        : undefined}
                    >
                      {section === 'tally' ? (
                        <Input disabled />
                      ) : (
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          options={agents.filter((agent) => agent.enabled).map((agent) => ({ label: agent.shortName ? `${agent.shortName} · ${agent.name}` : agent.name, value: agent.id }))}
                        />
                      )}
                    </Form.Item>
                  </Col>
                  {section !== 'pickup' ? <Col span={24}>
                    <Form.Item name="payableSettlementMethod" label="应付结算方式">
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder="选择后自动带出币种"
                        options={settlementOptions}
                        onChange={(value?: string) => {
                          const currency = value ? getSettlementMethodCurrency(settlementRows, value) : undefined;
                          if (currency) form.setFieldValue('payableCurrency', currency);
                        }}
                      />
                    </Form.Item>
                  </Col> : null}
                </Row>
              </AppFormSection>
            ) : null}
          </div> : null}

          {section !== 'delivery' ? <AppFormSection title="补充说明">
            <Form.Item name="remark" label="备注" className="misc-fee-last-form-item">
              <Input.TextArea rows={3} maxLength={500} showCount placeholder="记录费用依据或待补充事项" />
            </Form.Item>
          </AppFormSection> : null}
        </Form>
      </Drawer>

      <Modal
        title="匹配业务成本"
        width={680}
        open={Boolean(businessAssignmentTarget)}
        destroyOnHidden
        okText="确认并写入运单"
        confirmLoading={businessAssignmentSaving}
        okButtonProps={{ disabled: businessAssignmentLoading || businessAssignmentShipments.length === 0 }}
        onOk={() => void submitBusinessAssignment()}
        onCancel={() => {
          setBusinessAssignmentTarget(undefined);
          setBusinessAssignmentShipments([]);
        }}
      >
        <Space direction="vertical" size={12} className="misc-fee-full-width">
          <Alert
            type="info"
            showIcon
            message={businessAssignmentTarget
              ? `客户 ${businessAssignmentTarget.customerCode} · ${businessAssignmentTarget.feeName}`
              : '业务归属确认'}
            description="选择本客户的真实运单并填写业务成本。确认后只补充业务归属，不改变已经形成的应付、挂账和付款状态。"
          />
          <Form form={businessAssignmentForm} layout="vertical" requiredMark="optional">
            <AppFormSection title="订单归属">
              <Form.Item name="shipmentId" label="运单" rules={[{ required: true, message: '请选择本客户的运单' }]}>
                <Select
                  loading={businessAssignmentLoading}
                  showSearch
                  optionFilterProp="label"
                  placeholder={businessAssignmentLoading ? '正在加载订单' : '选择同一客户的真实运单'}
                  notFoundContent={businessAssignmentLoading ? '正在加载' : '该客户暂无可匹配运单'}
                  options={businessAssignmentShipments.map((shipment) => ({
                    label: `${shipment.systemOrderNo} · ${shipment.transferNo ?? '无转单号'} · ${shipment.packageCount} 件`,
                    value: shipment.id
                  }))}
                />
              </Form.Item>
            </AppFormSection>
            <AppFormSection title="业务成本">
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="businessAmount" label="业务成本金额" rules={[{ required: true, message: '请填写业务成本' }]}>
                    <InputNumber min={0} precision={2} className="misc-fee-full-width" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="businessCurrency" label="币种" rules={[{ required: true, message: '请选择币种' }]}>
                    {section === 'pickup'
                      ? <Input readOnly value="RMB" />
                      : <Select options={['RMB', 'USD', 'EUR', 'GBP', 'HKD'].map((value) => ({ label: value, value }))} />}
                  </Form.Item>
                </Col>
                {section !== 'pickup' ? <Col span={24}>
                  <Form.Item name="businessSettlementMethod" label="结算方式" className="misc-fee-last-form-item">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="选择后自动带出币种"
                      options={settlementOptions}
                      onChange={(value?: string) => {
                        const currency = value ? getSettlementMethodCurrency(settlementRows, value) : undefined;
                        if (currency) businessAssignmentForm.setFieldValue('businessCurrency', currency);
                      }}
                    />
                  </Form.Item>
                </Col> : null}
              </Row>
            </AppFormSection>
          </Form>
        </Space>
      </Modal>

      <Modal
        title={hangTargets.length > 1 ? `批量发起挂账（${hangTargets.length} 条）` : '发起挂账'}
        open={hangTargets.length > 0}
        okText="提交挂账申请"
        confirmLoading={hangSaving}
        onOk={() => void submitHangRequest()}
        onCancel={closeHangRequest}
        destroyOnClose
      >
        <Space direction="vertical" size={12} className="misc-fee-full-width">
          <div>
            <Text strong>对账单凭证（选填）</Text>
            <div className="misc-fee-upload-row">
              <Upload
                accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx"
                maxCount={1}
                beforeUpload={(file) => {
                  setHangFile(file);
                  return false;
                }}
                onRemove={() => setHangFile(undefined)}
              >
                <Button icon={<FileInput size={15} />}>选择凭证</Button>
              </Upload>
              <Text type="secondary">PDF、图片或 Excel，不超过 10MB</Text>
            </div>
          </div>
          <div>
            <Text strong>备注（选填）</Text>
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              value={hangRemark}
              onChange={(event) => setHangRemark(event.target.value)}
              placeholder="填写本次挂账的补充说明"
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="反审核应付成本"
        open={Boolean(reverseAuditTarget)}
        okText="确认反审核"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: !reverseAuditReason.trim() }}
        confirmLoading={reverseAuditSaving}
        onOk={() => void submitReverseAudit()}
        onCancel={() => {
          if (reverseAuditSaving) return;
          setReverseAuditTarget(undefined);
          setReverseAuditReason('');
        }}
        destroyOnClose
      >
        <Space direction="vertical" size={12} className="misc-fee-full-width">
          <Alert
            type="warning"
            showIcon
            message="反审核会撤回对应成本状态"
            description={reverseAuditTarget?.sourceType === 'KUAYUE'
              ? '跨越费用会同时撤回业务成本确认、应付审核、挂账及未付款记录，请确认下游尚未付款。'
              : '应付审核及未付款记录将被撤回，请确认下游尚未付款。'}
          />
          <div>
            <Text strong>反审核原因（必填）</Text>
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              value={reverseAuditReason}
              onChange={(event) => setReverseAuditReason(event.target.value)}
              placeholder="填写需要撤回审核的真实原因"
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="直接标记已付并归档"
        open={Boolean(directPaidTarget)}
        okText="确认已付并归档"
        cancelText="取消"
        okButtonProps={{ danger: true, disabled: !directPaidReason.trim() }}
        confirmLoading={directPaidSaving}
        onOk={() => void submitDirectPaidArchive()}
        onCancel={() => {
          if (directPaidSaving) return;
          setDirectPaidTarget(undefined);
          setDirectPaidReason('');
        }}
        destroyOnClose
      >
        <Space direction="vertical" size={12} className="misc-fee-full-width">
          <Alert
            type="warning"
            showIcon
            message="此操作跳过挂账和付款申请"
            description={`系统会把这条已审核跨越费用直接记为已付并归档。应付金额：${money(directPaidTarget?.payableAmount, directPaidTarget?.payableCurrency)}`}
          />
          <div>
            <Text strong>付款说明（必填）</Text>
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              value={directPaidReason}
              onChange={(event) => setDirectPaidReason(event.target.value)}
              placeholder="例如：线下已支付，凭证由财务留存"
            />
          </div>
        </Space>
      </Modal>

      <Modal
        title="导入跨越账单"
        width={1120}
        open={importOpen && canViewPayable}
        destroyOnClose
        okText="确认导入"
        okButtonProps={{ disabled: !importPreview || importPreview.validRows <= importPreview.duplicateRows }}
        confirmLoading={importLoading}
        onOk={() => void commitKuayueFile()}
        onCancel={() => {
          setImportOpen(false);
          setImportFile(undefined);
          setImportPreview(undefined);
        }}
      >
        <Space direction="vertical" size={12} className="misc-fee-full-width">
          <Flex gap={8} align="center" wrap>
            <Upload
              accept=".xls,.xlsx"
              maxCount={1}
              beforeUpload={(file) => {
                setImportFile(file);
                setImportPreview(undefined);
                return false;
              }}
              onRemove={() => {
                setImportFile(undefined);
                setImportPreview(undefined);
              }}
            >
              <Button icon={<FileInput size={15} />}>选择账单文件</Button>
            </Upload>
            <Button type="primary" loading={importLoading} disabled={!importFile} onClick={() => void previewKuayueFile()}>
              解析预览
            </Button>
            <Text type="secondary">支持 .xls/.xlsx，单文件不超过 20MB</Text>
          </Flex>
          {importPreview ? (
            <>
              <Alert
                type={importPreview.invalidRows ? 'warning' : 'success'}
                showIcon
                message={`共 ${importPreview.totalRows} 行；有效 ${importPreview.validRows} 行，错误 ${importPreview.invalidRows} 行，重复 ${importPreview.duplicateRows} 行；明细合计 ${money(importPreview.parsedPayableAmount)}${importPreview.declaredPayableAmount === undefined ? '' : `，账单合计 ${money(importPreview.declaredPayableAmount)}`}`}
              />
              <ManagedTable<KuayueImportPreviewLine>
                rowKey="rowNo"
                dataSource={importPreview.lines}
                columns={[
                  { title: '原始行', dataIndex: 'rowNo', key: 'rowNo', width: 80 },
                  { title: '跨越单号', dataIndex: 'kuayueBillNo', key: 'kuayueBillNo', width: 180 },
                  { title: '寄件日期', dataIndex: 'occurredAt', key: 'occurredAt', width: 120, render: (value?: string) => value ? formatBeijingDate(value) : '-' },
                  { title: '件数', dataIndex: 'pieceCount', key: 'pieceCount', width: 80 },
                  { title: '计费重量', dataIndex: 'chargeWeightKg', key: 'chargeWeightKg', width: 110, render: (value?: number) => value === undefined ? '-' : `${value} kg` },
                  { title: '应付金额', dataIndex: 'payableAmount', key: 'payableAmount', width: 120, render: (value?: number) => money(value) },
                  {
                    title: '识别结果',
                    key: 'result',
                    width: 220,
                    render: (_, row) => row.duplicate
                      ? <Tag color="warning">重复，导入时跳过</Tag>
                      : row.valid
                        ? <Tag color="success">可导入</Tag>
                        : <Text type="danger">{row.errors.join('；')}</Text>
                  }
                ]}
                pagination={{ ...tenRowTablePagination, total: importPreview.lines.length }}
                minimumScrollX={910}
                density="compact"
                columnSettings={{ storageKey: 'misc-fee-kuayue-import-preview' }}
              />
            </>
          ) : null}
        </Space>
      </Modal>

      <Drawer
        title={`归属跨越账单${claimingLine?.kuayueBillNo ? ` · ${claimingLine.kuayueBillNo}` : ''}`}
        width={720}
        open={claimOpen}
        destroyOnClose
        onClose={() => setClaimOpen(false)}
        extra={<Button type="primary" loading={claimSaving} onClick={() => void submitKuayueClaim()}>确认归属</Button>}
      >
        <Alert
          type="info"
          showIcon
          message={canViewPayable
            ? `业务成本 ${money(claimingLine?.businessAmount)}；应付金额 ${money(claimingLine?.payableAmount)}。归属后等待财务审核。`
            : `业务成本 ${money(claimingLine?.businessAmount)}；后续财务信息由授权岗位处理。`}
        />
        <Form form={claimForm} layout="vertical" requiredMark="optional" className="misc-fee-kuayue-claim-form">
          <AppFormSection title="归属路径">
            <Form.Item name="attributionRoute" label="选择本条账单的处理方式" rules={[{ required: true }]}>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: '归属客户和运单', value: 'SHIPMENT' },
                  { label: '仅归属客户，后续挂账', value: 'CUSTOMER_HANG' }
                ]}
              />
            </Form.Item>
            <Alert
              type="info"
              showIcon
              message={watchedKuayueAttributionRoute === 'CUSTOMER_HANG'
                ? '无需填写运单号；客户必须已配置业务员，归属后由业务员发起挂账。'
                : '费用会归属到指定客户和运单，审核后写入该运单的业务成本和应付成本。'}
            />
          </AppFormSection>
          <AppFormSection title="客户与订单">
            <Row gutter={12}>
              <Col xs={24} md={watchedKuayueAttributionRoute === 'SHIPMENT' ? 12 : 24}>
                <Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请填写客户编号' }]}>
                  <Input placeholder="例如 9409" />
                </Form.Item>
              </Col>
              {watchedKuayueAttributionRoute === 'SHIPMENT' ? (
                <Col xs={24} md={12}>
                  <Form.Item name="systemOrderNo" label="出货单号" rules={[{ required: true, message: '请填写出货单号' }]}>
                    <Input placeholder="填写该客户对应的出货单号" />
                  </Form.Item>
                </Col>
              ) : null}
            </Row>
          </AppFormSection>
          <AppFormSection title="补充说明">
            <Form.Item name="remark" label="备注" className="misc-fee-last-form-item">
              <Input.TextArea rows={3} maxLength={500} showCount />
            </Form.Item>
          </AppFormSection>
        </Form>
      </Drawer>

      <Drawer
        title={detail ? `杂费详情 · ${detail.sourceLabel}` : '杂费详情'}
        width={760}
        open={Boolean(detail) || detailLoading}
        loading={detailLoading}
        onClose={() => setDetail(undefined)}
      >
        {detail ? (
          <Space direction="vertical" size={12} className="misc-fee-full-width">
            <AppFormSection title="客户与订单">
              <ManagedMatrixCell
                columns={2}
                labelWidth={72}
                fields={[
                  ...(detail.sourceType === 'WAREHOUSE_PICKUP' || detail.sourceType === 'MARKET_PICKUP' || detail.sourceType === 'OTHER_PICKUP' ? [
                    { key: 'pickupSource', label: '提货来源', value: pickupSourceLabel(detail) },
                    ...(canViewPayable && canViewAgent ? [{ key: 'payee', label: '付款对象', value: detail.agentName ?? '-' }] : [])
                  ] : []),
                  { key: 'customer', label: '客户编号', value: `${detail.customerCode} · ${detail.customerName}`, emphasis: true },
                  { key: 'sales', label: '业务员', value: detail.salesperson ?? '-' },
                  { key: 'order', label: '出货单号', value: detail.systemOrderNo ?? '未匹配订单' },
                  { key: 'date', label: '发生日期', value: formatBeijingDate(detail.occurredAt) }
                ]}
              />
            </AppFormSection>
            {detail.sourceType === 'KUAYUE' && detail.kuayueBill ? (
              <AppFormSection title="跨越账单明细">
                <ManagedMatrixCell
                  columns={3}
                  labelWidth={64}
                  fields={[
                    { key: 'billNo', label: '跨越单号', value: detail.kuayueBill.kuayueBillNo ?? '-', emphasis: true },
                    { key: 'pieces', label: '件数', value: detail.kuayueBill.pieceCount ?? '-' },
                    { key: 'weight', label: '计费重', value: detail.kuayueBill.chargeWeightKg === undefined ? '-' : `${detail.kuayueBill.chargeWeightKg} kg` },
                    ...(canViewPayable ? [
                      { key: 'freight', label: '运费', value: money(detail.kuayueBill.freightAmount) },
                      { key: 'insurance', label: '保费', value: money(detail.kuayueBill.insuranceAmount) },
                      { key: 'overage', label: '超重费', value: money(detail.kuayueBill.overageAmount) },
                      { key: 'oversize', label: '超长费', value: money(detail.kuayueBill.oversizeAmount) },
                      { key: 'delivery', label: '派送费', value: money(detail.kuayueBill.deliveryAmount) },
                      { key: 'resource', label: '调配费', value: money(detail.kuayueBill.resourceAllocationAmount) }
                    ] : []),
                    { key: 'sender', label: '寄件信息', value: [detail.kuayueBill.senderCompany, detail.kuayueBill.sender, detail.kuayueBill.senderCity].filter(Boolean).join(' / ') || '-', wrap: true },
                    { key: 'receiver', label: '收件信息', value: [detail.kuayueBill.receiverCompany, detail.kuayueBill.receiver, detail.kuayueBill.destinationCity].filter(Boolean).join(' / ') || '-', wrap: true },
                    { key: 'service', label: '服务方式', value: detail.kuayueBill.serviceType ?? '-' }
                  ]}
                />
              </AppFormSection>
            ) : null}
            <AppFormSection title="成本与状态">
              <Row gutter={12}>
                <Col xs={24} md={canViewPayable ? 12 : 24}>
                  <div className="misc-fee-cost-track misc-fee-business-track">
                    <Text type="secondary">业务成本</Text>
                    <strong>{money(detail.businessAmount, detail.businessCurrency)}</strong>
                    <span>{detail.businessSettlementMethod ?? '未选结算方式'}</span>
                    {businessAssignmentTag(detail)}
                  </div>
                </Col>
                {canViewPayable ? (
                  <Col xs={24} md={12}>
                    <div className="misc-fee-cost-track misc-fee-payable-track">
                      <Text type="secondary">真实应付</Text>
                      <strong>{money(detail.payableAmount, detail.payableCurrency)}</strong>
                      <span>{canViewAgent ? (detail.agentName ?? detail.payableSettlementMethod ?? '未指定应付方') : detail.payableSettlementMethod ?? '未指定应付方'}</span>
                      {canViewPayableStatus ? <Space size={4} wrap>{auditTag(detail.auditStatus)}{hangTag(detail.hangStatus)}</Space> : null}
                    </div>
                  </Col>
                ) : null}
              </Row>
            </AppFormSection>
            {detail.attachments?.length ? (
              <AppFormSection title={`附件（${detail.attachments.length}）`}>
                <Space direction="vertical" size={8} className="misc-fee-full-width">
                  {detail.attachments.map((attachment) => (
                    <Flex key={attachment.id} align="center" justify="space-between" gap={12}>
                      <Space direction="vertical" size={0}>
                        <Text>{attachment.fileName}</Text>
                        <Text type="secondary">{attachment.uploadedBy ?? '-'} · {formatBeijingDateTime(attachment.createdAt)}</Text>
                      </Space>
                      <Button size="small" icon={<Download size={13} />} onClick={() => void downloadAttachment(attachment.id)}>下载</Button>
                    </Flex>
                  ))}
                </Space>
              </AppFormSection>
            ) : null}
            {detail.paymentReceipts?.length ? (
              <AppFormSection title={`付款水单（${detail.paymentReceipts.length}）`}>
                <Space direction="vertical" size={8} className="misc-fee-full-width">
                  {detail.paymentReceipts.map((receipt) => (
                    <Flex key={receipt.id} align="center" justify="space-between" gap={12}>
                      <Space direction="vertical" size={0}>
                        <Text>{receipt.fileName}</Text>
                        <Text type="secondary">{receipt.uploadedBy ?? '-'} · {formatBeijingDateTime(receipt.createdAt)}</Text>
                      </Space>
                      {receipt.url ? <Button size="small" href={receipt.url} target="_blank">查看</Button> : null}
                    </Flex>
                  ))}
                </Space>
              </AppFormSection>
            ) : null}
            {detail.remark ? <Alert type="info" showIcon message="备注" description={detail.remark} /> : null}
          </Space>
        ) : null}
      </Drawer>
    </AppPage>
  );
}

function HangWorkbench({
  apiClient,
  permissions,
  role
}: {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role: RoleKey;
}) {
  const { message, modal } = AntdApp.useApp();
  const [rows, setRows] = useState<MiscFeeHangRequestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [status, setStatus] = useState<'ALL' | MiscFeeHangRequestSummary['status']>('PENDING');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const canApproveAll = role === 'ADMIN' || permissions.includes('misc-fee:hang:hang-approve');
  const canApproveKuayue = canApproveAll || permissions.includes('finance:payable:audit');
  const canApproveRow = useCallback((row: MiscFeeHangRequestSummary) =>
    canApproveAll || (canApproveKuayue && row.fee.sourceType === 'KUAYUE'), [canApproveAll, canApproveKuayue]);
  const canViewPayable = role === 'ADMIN' || permissions.some((permission) =>
    permission.startsWith('misc-fee:') && permission.endsWith(':view-payable'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.miscFeeHangRequests({ status, page, pageSize });
      setRows(response.rows);
      setTotalItems(response.pagination.totalItems);
      setSelectedKeys([]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '挂账队列加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, message, page, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const transition = async (row: MiscFeeHangRequestSummary, action: 'approve' | 'reject' | 'withdraw', reason?: string) => {
    try {
      if (action === 'approve') await apiClient.approveMiscFeeHangRequest(row.id, { version: row.version });
      if (action === 'reject') await apiClient.rejectMiscFeeHangRequest(row.id, { version: row.version, reason });
      if (action === 'withdraw') await apiClient.withdrawMiscFeeHangRequest(row.id, { version: row.version });
      message.success(action === 'approve' ? '挂账已同意并生成待付款' : action === 'reject' ? '挂账已拒绝' : '挂账已撤回');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '挂账处理失败');
    }
  };

  const reject = (row: MiscFeeHangRequestSummary) => {
    let reason = '';
    modal.confirm({
      title: '拒绝挂账申请',
      okText: '确认拒绝',
      okButtonProps: { danger: true },
      cancelText: '取消',
      content: (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">拒绝原因会永久保留，发起人可补充资料后重新提交。</Text>
          <Input.TextArea rows={3} maxLength={500} showCount placeholder="请填写拒绝原因" onChange={(event) => { reason = event.target.value; }} />
        </div>
      ),
      onOk: async () => {
        if (!reason.trim()) {
          message.warning('请填写拒绝原因');
          throw new Error('拒绝原因不能为空');
        }
        await transition(row, 'reject', reason.trim());
      }
    });
  };

  const batchApprove = async () => {
    const selectedRows = rows.filter((item) =>
      selectedKeys.includes(item.id) && item.status === 'PENDING' && canApproveRow(item));
    if (!selectedRows.length) {
      message.warning('请选择当前页可同意的挂账申请');
      return;
    }
    setLoading(true);
    try {
      const result = await apiClient.batchApproveMiscFeeHangRequests({
        items: selectedRows.map((row) => ({ id: row.id, version: row.version }))
      });
      message.success(`已同意 ${result.approvedCount} 条挂账并生成待付款`);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量同意失败');
    } finally {
      setLoading(false);
    }
  };

  const downloadHangAttachment = async (attachmentId: string) => {
    try {
      const file = await apiClient.downloadMiscFeeAttachment(attachmentId);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '对账单凭证下载失败');
    }
  };

  const columns: ManagedTableColumns<MiscFeeHangRequestSummary> = [
    ...(canViewPayable ? [{
      title: '应付对象',
      key: 'payee',
      width: 130,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => (
        <Text ellipsis={{ tooltip: row.fee.ownerName ?? row.fee.agentName ?? '未指定' }}>
          {row.fee.ownerName ?? row.fee.agentName ?? '未指定'}
        </Text>
      )
    }] : []),
    {
      title: '费用名称',
      key: 'feeName',
      width: 160,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => (
        <Space direction="vertical" size={0}>
          <Text strong ellipsis={{ tooltip: row.fee.feeName }}>{row.fee.feeName}</Text>
          <Text type="secondary">{row.fee.sourceLabel}</Text>
        </Space>
      )
    },
    {
      title: '业务员',
      key: 'salesperson',
      width: 100,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => row.fee.salesperson ?? '-'
    },
    {
      title: '客户编码',
      key: 'customerCode',
      width: 100,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => row.fee.customerCode
    },
    {
      title: '运单号',
      key: 'systemOrderNo',
      width: 150,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => row.fee.systemOrderNo ?? '未匹配'
    },
    ...(canViewPayable ? [{
      title: '应付费用',
      key: 'payableAmount',
      width: 110,
      align: 'right' as const,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => row.fee.payableAmount === undefined
        ? '-'
        : Number(row.fee.payableAmount).toFixed(2)
    }, {
      title: '币种',
      key: 'payableCurrency',
      width: 70,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => row.fee.payableCurrency ?? '-'
    }] : []),
    {
      title: '挂账时间',
      key: 'requestedAt',
      width: 150,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => formatBeijingDateTime(row.requestedAt)
    },
    {
      title: '挂账人',
      key: 'requestedBy',
      width: 100,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => row.requestedBy
    },
    {
      title: '对账单凭证',
      key: 'voucher',
      width: 150,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => {
        const hangVoucher = row.attachments[0];
        const sourceVoucher = row.sourceAttachments[0];
        if (!hangVoucher && !sourceVoucher) return <Text type="secondary">-</Text>;
        return (
          <Space direction="vertical" size={0}>
            {hangVoucher ? (
              <Button type="link" size="small" icon={<Download size={13} />} onClick={() => void downloadHangAttachment(hangVoucher.id)}>
                挂账凭证{row.attachments.length > 1 ? `（${row.attachments.length}）` : ''}
              </Button>
            ) : null}
            {sourceVoucher ? (
              <Button type="link" size="small" icon={<Download size={13} />} onClick={() => void downloadHangAttachment(sourceVoucher.id)}>
                来源凭证{row.sourceAttachments.length > 1 ? `（${row.sourceAttachments.length}）` : ''}
              </Button>
            ) : null}
          </Space>
        );
      }
    },
    {
      title: '备注',
      key: 'remark',
      width: 180,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => {
        const hangRemark = row.remark?.trim();
        const sourceRemark = row.fee.remark?.trim();
        if (!hangRemark && !sourceRemark) return <Text type="secondary">-</Text>;
        return (
          <Space direction="vertical" size={0}>
            {hangRemark ? <Text ellipsis={{ tooltip: `挂账备注：${hangRemark}` }}>{hangRemark}</Text> : null}
            {sourceRemark ? <Text type="secondary" ellipsis={{ tooltip: `来源备注：${sourceRemark}` }}>来源：{sourceRemark}</Text> : null}
          </Space>
        );
      }
    },
    {
      title: '状态',
      key: 'progressStatus',
      width: 120,
      render: (_: unknown, row: MiscFeeHangRequestSummary) => (
        <Space direction="vertical" size={0}>
          {hangProgressTag(row.progressStatus)}
          {row.rejectionReason ? <Text type="secondary" ellipsis={{ tooltip: row.rejectionReason }}>{row.rejectionReason}</Text> : null}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 160,
      render: (_, row) => (
        <Space size={4} wrap>
          {canApproveRow(row) && row.status === 'PENDING' ? (
            <>
              <Button size="small" type="primary" onClick={() => void transition(row, 'approve')}>同意</Button>
              <Button size="small" danger onClick={() => reject(row)}>拒绝</Button>
            </>
          ) : null}
          {!canApproveRow(row) && row.canWithdraw ? (
            <Button size="small" onClick={() => void transition(row, 'withdraw')}>撤回</Button>
          ) : null}
        </Space>
      )
    }
  ];

  return (
    <AppPage className="misc-fee-page">
      <AppPageHeader
        title="挂账"
        description="挂账是待付款的前置审批；财务同意与待付款生成在同一事务完成。"
        actions={<Button icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>}
      />
      <AppFilterBar>
        <Space wrap>
          {renderFilterField('处理状态', (
            <Select
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { label: '全部', value: 'ALL' },
                { label: '待同意', value: 'PENDING' },
                { label: '已同意', value: 'APPROVED' },
                { label: '已拒绝', value: 'REJECTED' },
                { label: '已撤回', value: 'WITHDRAWN' }
              ]}
            />
          ))}
        </Space>
      </AppFilterBar>
      <Card className="misc-fee-ledger-card">
        <ManagedTable<MiscFeeHangRequestSummary>
          className="misc-fee-hang-table"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          rowSelection={canApproveKuayue ? {
            selectedRowKeys: selectedKeys,
            onChange: setSelectedKeys,
            getCheckboxProps: (row) => ({ disabled: row.status !== 'PENDING' || !canApproveRow(row) })
          } : undefined}
          pagination={{
            ...tenRowTablePagination,
            current: page,
            pageSize,
            total: totalItems,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            }
          }}
          minimumScrollX={1480}
          density="compact"
          columnSettings={{ storageKey: 'misc-fee-hang-ledger', lockedKeys: ['selection', 'select', 'action'] }}
          toolbarLeading={<Text type="secondary">已选 {selectedKeys.length} 条</Text>}
          toolbarActions={canApproveKuayue ? (
            <Button size="small" type="primary" disabled={!selectedKeys.length} onClick={() => void batchApprove()}>
              批量同意
            </Button>
          ) : null}
        />
      </Card>
    </AppPage>
  );
}

function MarketProfitWorkbench({ apiClient }: { apiClient: ApiClient }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<MarketProfitFilters>();
  const [filters, setFilters] = useState<MarketProfitFilters>({});
  const [response, setResponse] = useState<MarketProfitLedgerResponse>(emptyMarketProfitResponse);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewedFrom, reviewedTo] = filters.reviewedRange ?? [];
      setResponse(await apiClient.miscFeeMarketProfitLedger({
        agent: filters.agent,
        reviewedFrom,
        reviewedTo,
        orderKeyword: filters.orderKeyword,
        page,
        pageSize
      }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '市场利润明细加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, filters, message, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = (values: MarketProfitFilters) => {
    setPage(1);
    setFilters(values);
  };

  const resetFilters = () => {
    form.resetFields();
    setPage(1);
    setFilters({});
  };

  const columns: ManagedTableColumns<MarketProfitLedgerRow> = [
    { title: '代理', dataIndex: 'agentName', key: 'agentName', width: 150, ellipsis: true, render: (value?: string) => value ?? '-' },
    { title: '费用名称', dataIndex: 'feeName', key: 'feeName', width: 120, ellipsis: true, sortable: true },
    { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 92, ellipsis: true, sortable: true },
    { title: '运单号', dataIndex: 'systemOrderNo', key: 'systemOrderNo', width: 148, ellipsis: true, sortable: true },
    { title: '转单号', dataIndex: 'transferNo', key: 'transferNo', width: 140, ellipsis: true, render: (value?: string) => value ?? '-' },
    {
      title: '对账状态',
      dataIndex: 'reconciliationStatus',
      key: 'reconciliationStatus',
      width: 96,
      render: (value: MarketProfitLedgerRow['reconciliationStatus']) => value === 'CONFIRMED'
        ? statusTag('已审核', 'success')
        : statusTag('待审核', 'warning')
    },
    { title: '币种', dataIndex: 'currency', key: 'currency', width: 68, render: (value: string) => <Tag>{value}</Tag> },
    {
      title: '业务成本金额',
      dataIndex: 'businessCostRmbAmount',
      key: 'businessCostRmbAmount',
      width: 122,
      align: 'right',
      sortable: true,
      render: (value: number) => money(value)
    },
    {
      title: '代理成本金额',
      dataIndex: 'agentCostRmbAmount',
      key: 'agentCostRmbAmount',
      width: 122,
      align: 'right',
      sortable: true,
      render: (value: number) => money(value)
    },
    {
      title: '业务利润',
      dataIndex: 'businessProfitRmbAmount',
      key: 'businessProfitRmbAmount',
      width: 112,
      align: 'right',
      sortable: true,
      render: (value: number) => <Text type={value < 0 ? 'danger' : value > 0 ? 'success' : 'secondary'} strong>{money(value)}</Text>
    },
    { title: '业务员', dataIndex: 'salesperson', key: 'salesperson', width: 92, ellipsis: true, render: (value?: string) => value ?? '-' },
    { title: '制单日期', dataIndex: 'createdAt', key: 'createdAt', width: 108, sortable: true, render: (value?: string) => value ? formatBeijingDate(value) : '-' },
    { title: '制单人', dataIndex: 'createdBy', key: 'createdBy', width: 92, ellipsis: true, render: (value?: string) => value ?? '系统' },
    { title: '审单日期', dataIndex: 'reviewedAt', key: 'reviewedAt', width: 108, sortable: true, render: (value?: string) => value ? formatBeijingDate(value) : '-' },
    { title: '审单人', dataIndex: 'reviewedBy', key: 'reviewedBy', width: 92, ellipsis: true, render: (value?: string) => value ?? '-' }
  ];

  return (
    <AppPage className="misc-fee-page misc-fee-market-profit-page">
      <AppPageHeader
        title="市场利润结算"
        description="按运单归组的费用利润明细"
        actions={<Button icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>}
      />
      <AppFilterBar>
        <Form form={form} layout="inline" className="misc-fee-filter-form" onFinish={applyFilters}>
          {renderFilterField('代理', (
            <Form.Item name="agent" noStyle>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="全部代理"
                options={response.agentOptions.map((agent) => ({ label: agent, value: agent }))}
              />
            </Form.Item>
          ))}
          {renderFilterField('时间', (
            <Form.Item name="reviewedRange" noStyle>
              <AppDateRangePicker />
            </Form.Item>
          ))}
          {renderFilterField('订单筛选', (
            <Form.Item name="orderKeyword" noStyle>
              <Input allowClear placeholder="客户编号 / 运单号 / 转单号" />
            </Form.Item>
          ))}
          {renderFilterActions(() => form.submit(), resetFilters)}
        </Form>
      </AppFilterBar>
      <Card className="misc-fee-ledger-card misc-fee-market-profit-ledger">
        <ManagedTable<MarketProfitLedgerRow>
          rowKey="id"
          loading={loading}
          dataSource={response.rows}
          columns={columns}
          pagination={{
            ...tenRowTablePagination,
            current: response.pagination.page,
            pageSize: response.pagination.pageSize,
            total: response.pagination.totalItems,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            }
          }}
          minimumScrollX={1740}
          density="dense"
          columnSettings={{
            storageKey: 'misc-fee-market-profit-ledger-v1',
            title: '市场利润明细列设置'
          }}
          footer={() => (
            <Flex className="misc-fee-market-profit-total" gap={20} wrap align="center">
              <Text strong>合计</Text>
              <Text>业务成本 <strong>{money(response.totals.businessCostRmbAmount)}</strong></Text>
              <Text>代理成本 <strong>{money(response.totals.agentCostRmbAmount)}</strong></Text>
              <Text>业务利润 <Text type={response.totals.businessProfitRmbAmount < 0 ? 'danger' : 'success'} strong>{money(response.totals.businessProfitRmbAmount)}</Text></Text>
            </Flex>
          )}
        />
      </Card>
    </AppPage>
  );
}

function WarehouseProfitWorkbench({
  apiClient,
  permissions,
  role
}: {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role: RoleKey;
}) {
  const { message } = AntdApp.useApp();
  const [activeView, setActiveView] = useState<'ledger' | 'settlements'>('ledger');
  const [form] = Form.useForm<WarehouseProfitFilters>();
  const [filters, setFilters] = useState<WarehouseProfitFilters>({ eligibilityStatus: 'ALL' });
  const [response, setResponse] = useState<WarehouseProfitLedgerResponse>(emptyWarehouseProfitResponse);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const viewSwitcher = (
    <Tabs
      className="misc-fee-profit-view-tabs"
      activeKey={activeView}
      onChange={(key) => setActiveView(key as 'ledger' | 'settlements')}
      items={[
        { key: 'ledger', label: '利润明细' },
        { key: 'settlements', label: '结算单' }
      ]}
    />
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ledgerFrom, ledgerTo] = filters.ledgerRange ?? [];
      setResponse(await apiClient.miscFeeWarehouseProfitLedger({
        site: filters.site,
        feeName: filters.feeName,
        eligibilityStatus: filters.eligibilityStatus,
        ledgerFrom: beijingDayBoundary(ledgerFrom),
        ledgerTo: beijingDayBoundary(ledgerTo, true),
        keyword: filters.keyword,
        page,
        pageSize
      }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '仓库利润明细加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, filters, message, page, pageSize]);

  useEffect(() => {
    if (activeView === 'ledger') void load();
  }, [activeView, load]);

  if (activeView === 'settlements') {
    return (
      <ProfitWorkbench
        apiClient={apiClient}
        permissions={permissions}
        role={role}
        section="warehouse-profit"
        type="WAREHOUSE"
        viewSwitcher={viewSwitcher}
      />
    );
  }

  const applyFilters = (values: WarehouseProfitFilters) => {
    setPage(1);
    setFilters({ ...values, eligibilityStatus: values.eligibilityStatus ?? 'ALL' });
  };
  const resetFilters = () => {
    form.resetFields();
    form.setFieldsValue({ eligibilityStatus: 'ALL' });
    setPage(1);
    setFilters({ eligibilityStatus: 'ALL' });
  };
  const settlementStatus = (value?: WarehouseProfitLedgerRow['settlementStatus']) => {
    if (!value) return statusTag('未生成', 'default');
    return ({
      DRAFT: statusTag('结算草稿', 'processing'),
      PENDING_AUDIT: statusTag('结算待审核', 'warning'),
      APPROVED: statusTag('结算已审核', 'success'),
      ARCHIVED: statusTag('已归档', 'blue')
    } as const)[value];
  };
  const columns: ManagedTableColumns<WarehouseProfitLedgerRow> = [
    { title: '仓库站点', dataIndex: 'ownerSite', key: 'ownerSite', width: 130, ellipsis: true },
    { title: '费用名称', dataIndex: 'feeName', key: 'feeName', width: 140, ellipsis: true },
    { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 110 },
    { title: '运单号', dataIndex: 'systemOrderNo', key: 'systemOrderNo', width: 160, render: (value?: string) => value ?? '未匹配订单' },
    { title: '代理 / 收款方', dataIndex: 'agentName', key: 'agentName', width: 150, ellipsis: true, render: (value?: string) => value ?? '思远仓库' },
    {
      title: '订单匹配',
      dataIndex: 'matchStatus',
      key: 'matchStatus',
      width: 105,
      render: (value: WarehouseProfitLedgerRow['matchStatus']) => value === 'MATCHED'
        ? statusTag('已匹配', 'success')
        : statusTag('未匹配', 'warning')
    },
    {
      title: '利润归属',
      dataIndex: 'eligibilityStatus',
      key: 'eligibilityStatus',
      width: 125,
      render: (value: WarehouseProfitLedgerRow['eligibilityStatus']) => value === 'READY'
        ? statusTag('可结算', 'success')
        : statusTag('待仓库定价', 'warning')
    },
    { title: '业务成本（RMB）', dataIndex: 'businessCostRmbAmount', key: 'businessCostRmbAmount', align: 'right', width: 145, render: (value?: number) => money(value) },
    { title: '真实应付（RMB）', dataIndex: 'payableCostRmbAmount', key: 'payableCostRmbAmount', align: 'right', width: 145, render: (value: number) => money(value) },
    {
      title: '仓库利润（RMB）',
      dataIndex: 'warehouseProfitRmbAmount',
      key: 'warehouseProfitRmbAmount',
      align: 'right',
      width: 145,
      render: (value?: number) => typeof value === 'number'
        ? <Text type={value < 0 ? 'danger' : 'success'} strong>{money(value)}</Text>
        : '-'
    },
    { title: '登记人', dataIndex: 'createdBy', key: 'createdBy', width: 110, ellipsis: true, render: (value?: string) => value ?? '-' },
    { title: '登记时间', dataIndex: 'createdAt', key: 'createdAt', width: 165, render: (value: string) => formatBeijingDateTime(value) },
    { title: '业务确认时间', dataIndex: 'confirmedAt', key: 'confirmedAt', width: 165, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    { title: '应付审核时间', dataIndex: 'reviewedAt', key: 'reviewedAt', width: 165, render: (value: string) => formatBeijingDateTime(value) },
    { title: '结算状态', dataIndex: 'settlementStatus', key: 'settlementStatus', width: 125, render: settlementStatus }
  ];

  return (
    <AppPage className="misc-fee-page misc-fee-warehouse-profit-page">
      <AppPageHeader
        title="仓库利润结算"
        description="按仓库站点归集已生效成本，待定价应付单独管理"
        actions={<Button icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>}
      />
      {viewSwitcher}
      <Row gutter={[10, 10]} className="misc-fee-metrics misc-fee-warehouse-profit-metrics">
        <Col xs={24} sm={12} xl={5}><MetricCard title="待仓库定价" value={`${response.totals.pendingPricingCount} 条`} extra={`真实应付 ${money(response.totals.pendingPricingPayableRmbAmount)}`} icon={<ClipboardList size={17} />} /></Col>
        <Col xs={24} sm={12} xl={5}><MetricCard title="可结算业务成本" value={money(response.totals.businessCostRmbAmount)} extra="业务成本已确认" icon={<WalletCards size={17} />} /></Col>
        <Col xs={24} sm={12} xl={5}><MetricCard title="可结算真实应付" value={money(response.totals.payableCostRmbAmount)} extra="应付成本已审核" icon={<Banknote size={17} />} /></Col>
        <Col xs={24} sm={12} xl={5}><MetricCard title="仓库利润" value={money(response.totals.warehouseProfitRmbAmount)} extra="业务成本减真实应付" icon={<CheckCircle2 size={17} />} /></Col>
        <Col xs={24} sm={12} xl={4}><MetricCard title="未匹配订单" value={`${response.totals.unmatchedCount} 条`} extra="可继续结算并保留归属" icon={<Link2 size={17} />} /></Col>
      </Row>
      <AppFilterBar>
        <Form form={form} layout="inline" className="misc-fee-filter-form" initialValues={{ eligibilityStatus: 'ALL' }} onFinish={applyFilters}>
          {renderFilterField('仓库站点', (
            <Form.Item name="site" noStyle>
              <Select allowClear showSearch optionFilterProp="label" placeholder="全部站点" options={response.siteOptions.map((site) => ({ label: site, value: site }))} />
            </Form.Item>
          ))}
          {renderFilterField('时间', <Form.Item name="ledgerRange" noStyle><AppDateRangePicker /></Form.Item>)}
          {renderFilterField('费用名称', (
            <Form.Item name="feeName" noStyle>
              <Select allowClear showSearch optionFilterProp="label" placeholder="全部费用" options={response.feeNameOptions.map((feeName) => ({ label: feeName, value: feeName }))} />
            </Form.Item>
          ))}
          {renderFilterField('利润归属', (
            <Form.Item name="eligibilityStatus" noStyle>
              <Select options={[{ label: '全部', value: 'ALL' }, { label: '待仓库定价', value: 'PENDING_PRICING' }, { label: '可结算', value: 'READY' }]} />
            </Form.Item>
          ))}
          {renderFilterField('客户 / 订单', <Form.Item name="keyword" noStyle><Input allowClear placeholder="客户编号 / 运单号 / 代理" /></Form.Item>)}
          {renderFilterActions(() => form.submit(), resetFilters)}
        </Form>
      </AppFilterBar>
      <Card className="misc-fee-ledger-card misc-fee-warehouse-profit-ledger">
        <ManagedTable<WarehouseProfitLedgerRow>
          rowKey="id"
          loading={loading}
          dataSource={response.rows}
          columns={columns}
          pagination={{
            ...tenRowTablePagination,
            current: response.pagination.page,
            pageSize: response.pagination.pageSize,
            total: response.pagination.totalItems,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            }
          }}
          minimumScrollX={2100}
          density="dense"
          columnSettings={{ storageKey: 'misc-fee-warehouse-profit-ledger-v1', title: '仓库利润明细列设置' }}
          footer={() => (
            <Flex className="misc-fee-market-profit-total" gap={20} wrap align="center">
              <Text strong>当前筛选合计</Text>
              <Text>业务成本 <strong>{money(response.totals.businessCostRmbAmount)}</strong></Text>
              <Text>真实应付 <strong>{money(response.totals.payableCostRmbAmount)}</strong></Text>
              <Text>仓库利润 <Text type={response.totals.warehouseProfitRmbAmount < 0 ? 'danger' : 'success'} strong>{money(response.totals.warehouseProfitRmbAmount)}</Text></Text>
              <Text type="secondary">待定价应付 {money(response.totals.pendingPricingPayableRmbAmount)}</Text>
            </Flex>
          )}
        />
      </Card>
    </AppPage>
  );
}

function FinanceProfitWorkbench({
  apiClient,
  permissions,
  role
}: {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role: RoleKey;
}) {
  const { message } = AntdApp.useApp();
  const [activeView, setActiveView] = useState<'ledger' | 'settlements'>('ledger');
  const [form] = Form.useForm<FinanceProfitFilters>();
  const [filters, setFilters] = useState<FinanceProfitFilters>({
    financeType: 'ALL', attributionStatus: 'ALL', cashStatus: 'ALL', settlementStatus: 'ALL'
  });
  const [response, setResponse] = useState<FinanceProfitLedgerResponse>(emptyFinanceProfitResponse);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const canExport = role === 'ADMIN' || permissions.includes('misc-fee:finance-profit:export');
  const viewSwitcher = (
    <Tabs
      className="misc-fee-profit-view-tabs"
      activeKey={activeView}
      onChange={(key) => setActiveView(key as 'ledger' | 'settlements')}
      items={[
        { key: 'ledger', label: '利润明细' },
        { key: 'settlements', label: '结算单' }
      ]}
    />
  );
  const queryFrom = useCallback((values: FinanceProfitFilters, requestedPage = page, requestedPageSize = pageSize) => {
    const [ledgerFrom, ledgerTo] = values.ledgerRange ?? [];
    return {
      ledgerFrom: beijingDayBoundary(ledgerFrom),
      ledgerTo: beijingDayBoundary(ledgerTo, true),
      keyword: values.keyword,
      agent: values.agent,
      feeName: values.feeName,
      financeType: values.financeType,
      attributionStatus: values.attributionStatus,
      cashStatus: values.cashStatus,
      settlementStatus: values.settlementStatus,
      page: requestedPage,
      pageSize: requestedPageSize
    };
  }, [page, pageSize]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResponse(await apiClient.miscFeeFinanceProfitLedger(queryFrom(filters)));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '财务利润明细加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, filters, message, queryFrom]);
  useEffect(() => {
    if (activeView === 'ledger') void load();
  }, [activeView, load]);
  if (activeView === 'settlements') {
    return (
      <ProfitWorkbench
        apiClient={apiClient}
        permissions={permissions}
        role={role}
        section="finance-profit"
        type="FINANCE"
        viewSwitcher={viewSwitcher}
      />
    );
  }
  const applyFilters = (values: FinanceProfitFilters) => {
    setPage(1);
    setFilters({
      ...values,
      financeType: values.financeType ?? 'ALL',
      attributionStatus: values.attributionStatus ?? 'ALL',
      cashStatus: values.cashStatus ?? 'ALL',
      settlementStatus: values.settlementStatus ?? 'ALL'
    });
  };
  const resetFilters = () => {
    const defaults: FinanceProfitFilters = {
      financeType: 'ALL', attributionStatus: 'ALL', cashStatus: 'ALL', settlementStatus: 'ALL'
    };
    form.resetFields();
    form.setFieldsValue(defaults);
    setPage(1);
    setFilters(defaults);
  };
  const exportLedger = async () => {
    setExporting(true);
    try {
      const result = await apiClient.exportMiscFeeFinanceProfitLedger(queryFrom(filters, 1, 20));
      downloadCsv('财务利润明细.csv', [
        { key: 'financeTypeLabel', label: '财务类型' },
        { key: 'sourceOriginLabel', label: '费用来源' },
        { key: 'customerCode', label: '客户编号' },
        { key: 'systemOrderNo', label: '运单号' },
        { key: 'transferNo', label: '转单号' },
        { key: 'feeName', label: '费用名称' },
        { key: 'agentName', label: '代理/收款方' },
        { key: 'receivableRmbAmount', label: '应收金额(RMB)' },
        { key: 'businessCostRmbAmount', label: '业务成本参考(RMB)' },
        { key: 'payableRmbAmount', label: '真实应付(RMB)' },
        { key: 'companyProfitImpactRmbAmount', label: '公司利润影响(RMB)' },
        { key: 'attributionStatusLabel', label: '成本归属' },
        { key: 'cashStatusLabel', label: '资金状态' },
        { key: 'effectiveAt', label: '利润生效时间' },
        { key: 'createdBy', label: '制单人' },
        { key: 'reviewedBy', label: '审单人' }
      ], result.rows.map((row) => ({
        ...row,
        financeTypeLabel: ({ RECEIVABLE: '应收', BUSINESS_COST: '业务成本参考', PAYABLE: '真实应付' } as const)[row.financeType],
        sourceOriginLabel: ({ SYSTEM_RECEIVABLE: '系统应收', ORDER_FINANCE_ITEM: '订单费用', MISC_FEE: '杂费' } as const)[row.sourceOrigin],
        attributionStatusLabel: ({ ASSIGNED: '已归属', PENDING_BUSINESS_COST: '待业务成本', PENDING_ORDER: '待订单' } as const)[row.attributionStatus],
        cashStatusLabel: ({ NOT_APPLICABLE: '不适用', UNPAID: '未收/未付', PARTIAL: '部分收款', READY: '待发起付款', PAYMENT_PENDING: '付款中', PAID: '已收/已付' } as const)[row.cashStatus],
        effectiveAt: formatBeijingDateTime(row.effectiveAt)
      })));
      message.success(`已导出 ${result.rows.length} 条财务利润明细`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '财务利润明细导出失败');
    } finally {
      setExporting(false);
    }
  };
  const settlementTag = (value?: FinanceProfitLedgerRow['settlementStatus']) => {
    if (!value) return statusTag('未结算', 'default');
    return ({
      DRAFT: statusTag('结算草稿', 'processing'),
      PENDING_AUDIT: statusTag('结算待审核', 'warning'),
      APPROVED: statusTag('结算已审核', 'success'),
      ARCHIVED: statusTag('已归档', 'blue')
    } as const)[value];
  };
  const columns: ManagedTableColumns<FinanceProfitLedgerRow> = [
    {
      title: '财务类型', dataIndex: 'financeType', key: 'financeType', width: 118,
      render: (value: FinanceProfitLedgerType) => ({
        RECEIVABLE: statusTag('应收', 'blue'),
        BUSINESS_COST: statusTag('业务成本参考', 'default'),
        PAYABLE: statusTag('真实应付', 'gold')
      } as const)[value]
    },
    {
      title: '费用来源', dataIndex: 'sourceOrigin', key: 'sourceOrigin', width: 105,
      render: (value: FinanceProfitLedgerRow['sourceOrigin']) => ({
        SYSTEM_RECEIVABLE: '系统应收', ORDER_FINANCE_ITEM: '订单费用', MISC_FEE: '杂费'
      } as const)[value]
    },
    { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 100, render: (value?: string) => value ?? '-' },
    { title: '运单号', dataIndex: 'systemOrderNo', key: 'systemOrderNo', width: 155, ellipsis: true, render: (value?: string) => value ?? '未匹配订单' },
    { title: '转单号', dataIndex: 'transferNo', key: 'transferNo', width: 135, ellipsis: true, render: (value?: string) => value ?? '-' },
    { title: '费用名称', dataIndex: 'feeName', key: 'feeName', width: 135, ellipsis: true },
    { title: '代理 / 收款方', dataIndex: 'agentName', key: 'agentName', width: 145, ellipsis: true, render: (value?: string) => value ?? '-' },
    {
      title: '成本归属', dataIndex: 'costOwner', key: 'costOwner', width: 100,
      render: (value: FinanceProfitLedgerRow['costOwner']) => ({ MARKET: '市场', WAREHOUSE: '仓库', EXTERNAL: '外部', INTERNAL: '内部' } as const)[value]
    },
    { title: '应收（RMB）', dataIndex: 'receivableRmbAmount', key: 'receivableRmbAmount', width: 118, align: 'right', sortable: true, render: (value: number) => value ? money(value) : '-' },
    { title: '业务成本参考（RMB）', dataIndex: 'businessCostRmbAmount', key: 'businessCostRmbAmount', width: 150, align: 'right', sortable: true, render: (value: number) => value ? money(value) : '-' },
    { title: '真实应付（RMB）', dataIndex: 'payableRmbAmount', key: 'payableRmbAmount', width: 130, align: 'right', sortable: true, render: (value: number) => value ? money(value) : '-' },
    {
      title: '公司利润影响（RMB）', dataIndex: 'companyProfitImpactRmbAmount', key: 'companyProfitImpactRmbAmount', width: 150, align: 'right', sortable: true,
      render: (value: number) => value === 0 ? <Text type="secondary">-</Text> : <Text strong type={value < 0 ? 'danger' : 'success'}>{money(value)}</Text>
    },
    {
      title: '成本归属状态', dataIndex: 'attributionStatus', key: 'attributionStatus', width: 125,
      render: (value: FinanceProfitAttributionStatus) => ({
        ASSIGNED: statusTag('已归属', 'success'),
        PENDING_BUSINESS_COST: statusTag('待业务成本', 'warning'),
        PENDING_ORDER: statusTag('待订单', 'orange')
      } as const)[value]
    },
    {
      title: '资金状态', dataIndex: 'cashStatus', key: 'cashStatus', width: 115,
      render: (value: FinanceProfitCashStatus) => ({
        NOT_APPLICABLE: statusTag('不适用', 'default'),
        UNPAID: statusTag('未收 / 未付', 'default'),
        PARTIAL: statusTag('部分收款', 'processing'),
        READY: statusTag('待发起付款', 'warning'),
        PAYMENT_PENDING: statusTag('付款中', 'processing'),
        PAID: statusTag('已收 / 已付', 'success')
      } as const)[value]
    },
    { title: '利润生效时间', dataIndex: 'effectiveAt', key: 'effectiveAt', width: 150, sortable: true, render: (value: string) => formatBeijingDateTime(value) },
    { title: '制单人', dataIndex: 'createdBy', key: 'createdBy', width: 100, ellipsis: true, render: (value?: string) => value ?? '系统' },
    { title: '审单人', dataIndex: 'reviewedBy', key: 'reviewedBy', width: 100, ellipsis: true, render: (value?: string) => value ?? '-' },
    { title: '结算状态', dataIndex: 'settlementStatus', key: 'settlementStatus', width: 120, render: settlementTag }
  ];
  return (
    <AppPage className="misc-fee-page misc-fee-finance-profit-page">
      <AppPageHeader
        title="财务利润结算"
        description="公司真实利润与待归属成本台账"
        actions={(
          <Space wrap>
            <Button icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>
            {canExport ? <Button icon={<Download size={15} />} loading={exporting} onClick={() => void exportLedger()}>导出明细</Button> : null}
          </Space>
        )}
      />
      {viewSwitcher}
      <Card className="misc-fee-finance-profit-bridge" variant="borderless">
        <div className="misc-fee-finance-profit-formula" aria-label="公司利润计算公式">
          <span><Text type="secondary">已审核应收</Text><strong>{money(response.totals.receivableRmbAmount)}</strong></span>
          <b aria-hidden="true">−</b>
          <span><Text type="secondary">真实对外应付</Text><strong>{money(response.totals.payableRmbAmount)}</strong></span>
          <b aria-hidden="true">=</b>
          <span className="is-result"><Text type="secondary">公司总利润</Text><strong>{money(response.totals.companyProfitRmbAmount)}</strong></span>
        </div>
        <Flex className="misc-fee-finance-profit-reference" gap={18} wrap>
          <Text>业务成本参考 <strong>{money(response.totals.businessCostRmbAmount)}</strong>（不重复扣减）</Text>
          <Text>市场利润 <strong>{money(response.totals.marketProfitRmbAmount)}</strong></Text>
          <Text>仓库利润 <strong>{money(response.totals.warehouseProfitRmbAmount)}</strong></Text>
          <Text type={response.totals.unmatchedPayableRmbAmount > 0 ? 'warning' : 'secondary'}>待归属成本 <strong>{money(response.totals.unmatchedPayableRmbAmount)}</strong></Text>
        </Flex>
      </Card>
      <AppFilterBar>
        <Form form={form} layout="inline" className="misc-fee-filter-form" initialValues={filters} onFinish={applyFilters}>
          {renderFilterField('关键词', <Form.Item name="keyword" noStyle><Input allowClear placeholder="客户 / 运单 / 转单 / 费用" /></Form.Item>)}
          {renderFilterField('生效时间', <Form.Item name="ledgerRange" noStyle><AppDateRangePicker /></Form.Item>)}
          {renderFilterField('财务类型', <Form.Item name="financeType" noStyle><Select options={[
            { label: '全部', value: 'ALL' }, { label: '应收', value: 'RECEIVABLE' }, { label: '业务成本参考', value: 'BUSINESS_COST' }, { label: '真实应付', value: 'PAYABLE' }
          ]} /></Form.Item>)}
          {renderFilterField('成本归属', <Form.Item name="attributionStatus" noStyle><Select options={[
            { label: '全部', value: 'ALL' }, { label: '已归属', value: 'ASSIGNED' }, { label: '待业务成本', value: 'PENDING_BUSINESS_COST' }, { label: '待订单', value: 'PENDING_ORDER' }
          ]} /></Form.Item>)}
          {renderFilterField('资金状态', <Form.Item name="cashStatus" noStyle><Select options={[
            { label: '全部', value: 'ALL' }, { label: '不适用', value: 'NOT_APPLICABLE' }, { label: '未收 / 未付', value: 'UNPAID' }, { label: '部分收款', value: 'PARTIAL' }, { label: '待发起付款', value: 'READY' }, { label: '付款中', value: 'PAYMENT_PENDING' }, { label: '已收 / 已付', value: 'PAID' }
          ]} /></Form.Item>)}
          {renderFilterField('代理 / 收款方', <Form.Item name="agent" noStyle><Select allowClear showSearch optionFilterProp="label" placeholder="全部" options={response.agentOptions.map((value) => ({ label: value, value }))} /></Form.Item>)}
          {renderFilterField('费用名称', <Form.Item name="feeName" noStyle><Select allowClear showSearch optionFilterProp="label" placeholder="全部" options={response.feeNameOptions.map((value) => ({ label: value, value }))} /></Form.Item>)}
          {renderFilterField('结算状态', <Form.Item name="settlementStatus" noStyle><Select options={[
            { label: '全部', value: 'ALL' }, { label: '未结算', value: 'UNSETTLED' }, { label: '结算草稿', value: 'DRAFT' }, { label: '结算待审核', value: 'PENDING_AUDIT' }, { label: '结算已审核', value: 'APPROVED' }, { label: '已归档', value: 'ARCHIVED' }
          ]} /></Form.Item>)}
          {renderFilterActions(() => form.submit(), resetFilters)}
        </Form>
      </AppFilterBar>
      <Card className="misc-fee-ledger-card misc-fee-finance-profit-ledger">
        <ManagedTable<FinanceProfitLedgerRow>
          rowKey="id"
          loading={loading}
          dataSource={response.rows}
          columns={columns}
          pagination={{
            ...tenRowTablePagination,
            current: response.pagination.page,
            pageSize: response.pagination.pageSize,
            total: response.pagination.totalItems,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize !== pageSize ? 1 : nextPage);
              setPageSize(nextPageSize);
            }
          }}
          minimumScrollX={2250}
          density="dense"
          columnSettings={{ storageKey: 'misc-fee-finance-profit-ledger-v1', title: '财务利润明细列设置' }}
        />
      </Card>
    </AppPage>
  );
}

function ProfitWorkbench({
  apiClient,
  permissions,
  role,
  section,
  type,
  viewSwitcher
}: {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role: RoleKey;
  section: MiscFeeSectionKey;
  type: ProfitSettlementType;
  viewSwitcher?: ReactNode;
}) {
  const { message, modal } = AntdApp.useApp();
  const [form] = Form.useForm<{ period: [string | undefined, string | undefined]; siteScope?: string; remark?: string }>();
  const [rows, setRows] = useState<ProfitSettlementSummary[]>([]);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ProfitSettlementDetail>();
  const [detailLoading, setDetailLoading] = useState(false);
  const permissionPrefix = `misc-fee:${section}`;
  const miscFeeDataScope = resolveMiscFeeUiDataScope(role, permissions);
  const can = (action: string) => profitSettlementAllowedForScope(type, miscFeeDataScope)
    && (role === 'ADMIN' || permissions.includes(`${permissionPrefix}:${action}` as PermissionKey));
  const currentItem = sectionItems.find((item) => item.key === section)!;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.miscFeeProfitSettlements({ type, status: 'ALL', page: 1, pageSize: 100 });
      setRows(response.rows);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '利润结算单加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, message, type]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (type !== 'WAREHOUSE' || miscFeeDataScope === 'WAREHOUSE_SITE') return;
    void apiClient.waterReceiptSiteOptions()
      .then((items) => setSites(items.filter((item) => item.enabled)))
      .catch((error) => message.error(error instanceof Error ? error.message : '站点加载失败'));
  }, [apiClient, message, miscFeeDataScope, type]);

  const create = async () => {
    try {
      const values = await form.validateFields();
      const [periodFrom, periodTo] = values.period;
      if (!periodFrom || !periodTo) return;
      const input: ProfitSettlementInput = {
        type,
        siteScope: values.siteScope,
        periodFrom: new Date(`${periodFrom}T00:00:00+08:00`).toISOString(),
        periodTo: new Date(`${periodTo}T23:59:59+08:00`).toISOString(),
        remark: values.remark,
        idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `settlement-${Date.now()}`
      };
      await apiClient.createMiscFeeProfitSettlement(input);
      message.success('利润结算草稿已生成');
      setCreateOpen(false);
      form.resetFields();
      await load();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    }
  };

  const transition = async (
    row: ProfitSettlementSummary,
    action: 'submit' | 'audit' | 'reverse-audit' | 'archive'
  ) => {
    try {
      await apiClient.transitionMiscFeeProfitSettlement(row.id, action, { version: row.version });
      message.success('结算单状态已更新');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '结算单操作失败');
    }
  };

  const recompute = async (row: ProfitSettlementSummary) => {
    try {
      await apiClient.recomputeMiscFeeProfitSettlement(row.id, { version: row.version });
      message.success('结算草稿已按最新费用重算');
      await load();
      if (detail?.id === row.id) setDetail(await apiClient.miscFeeProfitSettlement(row.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '结算草稿重算失败');
    }
  };

  const release = (row: ProfitSettlementSummary) => {
    let reason = '';
    modal.confirm({
      title: `释放结算草稿 ${row.settlementNo}？`,
      content: (
        <Space direction="vertical" size={8} className="misc-fee-full-width">
          <Text>释放后将删除该草稿并解除全部费用占用；费用可重新纳入其他结算单，已审核结算单不受影响。</Text>
          <Input.TextArea
            aria-label="释放原因"
            placeholder="请填写释放原因"
            maxLength={500}
            rows={3}
            onChange={(event) => { reason = event.target.value; }}
          />
        </Space>
      ),
      okText: '释放草稿',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          if (!reason.trim()) throw new Error('释放原因不能为空');
          const result = await apiClient.releaseMiscFeeProfitSettlement(row.id, { version: row.version, reason: reason.trim() });
          message.success(`草稿已释放，共解除 ${result.releasedLineCount} 条费用占用`);
          if (detail?.id === row.id) setDetail(undefined);
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '结算草稿释放失败');
          throw error;
        }
      }
    });
  };

  const openDetail = async (row: ProfitSettlementSummary) => {
    setDetailLoading(true);
    try {
      setDetail(await apiClient.miscFeeProfitSettlement(row.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '结算明细加载失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ManagedTableColumns<ProfitSettlementSummary> = [
    { title: '结算单号', dataIndex: 'settlementNo', key: 'settlementNo', width: 190, render: (value: string) => <Text strong>{value}</Text> },
    {
      title: '结算期间',
      key: 'period',
      width: 220,
      render: (_, row) => `${formatBeijingDate(row.periodFrom)} 至 ${formatBeijingDate(row.periodTo)}`
    },
    {
      title: '金额口径',
      key: 'amounts',
      width: 320,
      render: (_, row) => (
        <ManagedMatrixCell
          labelWidth={76}
          columns={2}
          fields={[
            { key: 'receivable', label: '应收', value: money(row.receivableRmbAmount) },
            { key: 'business', label: '业务成本', value: money(row.businessRmbAmount) },
            { key: 'payable', label: '真实应付', value: money(row.payableRmbAmount) },
            { key: 'unmatched', label: '待归属成本', value: money(row.unmatchedPayableRmbAmount) }
          ]}
        />
      )
    },
    { title: '结算利润', dataIndex: 'profitRmbAmount', key: 'profitRmbAmount', width: 150, render: (value: number) => <strong className="misc-fee-profit-amount">{money(value)}</strong> },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: ProfitSettlementSummary['status']) => ({
        DRAFT: statusTag('草稿', 'default'),
        PENDING_AUDIT: statusTag('待审核', 'processing'),
        APPROVED: statusTag('已审核', 'success'),
        ARCHIVED: statusTag('已归档', 'blue')
      }[value])
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 270,
      render: (_, row) => (
        <Space size={4} wrap>
          <Button size="small" onClick={() => void openDetail(row)}>明细</Button>
          {can('settlement-generate') && row.status === 'DRAFT' ? <Button size="small" onClick={() => void recompute(row)}>重算</Button> : null}
          {can('settlement-generate') && row.status === 'DRAFT' ? <Button size="small" onClick={() => void transition(row, 'submit')}>提交</Button> : null}
          {can('settlement-generate') && row.status === 'DRAFT' ? <Button size="small" danger onClick={() => release(row)}>释放</Button> : null}
          {can('settlement-audit') && row.status === 'PENDING_AUDIT' ? <Button size="small" type="primary" onClick={() => void transition(row, 'audit')}>审核</Button> : null}
          {can('settlement-reverse') && row.status === 'APPROVED' ? <Button size="small" onClick={() => void transition(row, 'reverse-audit')}>反审</Button> : null}
          {can('settlement-audit') && row.status === 'APPROVED' ? <Button size="small" onClick={() => void transition(row, 'archive')}>归档</Button> : null}
        </Space>
      )
    }
  ];

  return (
    <AppPage className="misc-fee-page">
      <AppPageHeader
        title={currentItem.label}
        description={currentItem.description}
        actions={(
          <Space wrap>
            <Button icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>
            {can('settlement-generate') ? <Button type="primary" icon={<CalendarRange size={15} />} onClick={() => setCreateOpen(true)}>生成结算单</Button> : null}
          </Space>
        )}
      />
      {viewSwitcher}
      <Alert
        type="info"
        showIcon
        message={type === 'FINANCE'
          ? '公司总利润 = 已审核应收 − 全部真实对外应付；业务成本不重复扣减。'
          : '结算单审核后冻结费用明细、汇率和计算结果，不自动产生奖金或付款。'}
      />
      <Card className="misc-fee-ledger-card">
        <ManagedTable<ProfitSettlementSummary>
          className="misc-fee-profit-table"
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={{ ...tenRowTablePagination, total: rows.length }}
          minimumScrollX={1270}
          density="compact"
          columnSettings={{ storageKey: `misc-fee-${section}-settlement`, lockedKeys: ['action'] }}
        />
      </Card>
      <Modal
        title={`生成${currentItem.label}单`}
        open={createOpen}
        okText="生成草稿"
        onOk={() => void create()}
        onCancel={() => setCreateOpen(false)}
      >
        <Form form={form} layout="vertical">
          {type === 'WAREHOUSE' && miscFeeDataScope !== 'WAREHOUSE_SITE' ? (
            <Form.Item name="siteScope" label="结算站点" rules={[{ required: true, message: '请选择结算站点' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="选择仓库站点"
                options={sites.map((site) => ({ label: site.name, value: site.name }))}
              />
            </Form.Item>
          ) : null}
          {type === 'WAREHOUSE' && miscFeeDataScope === 'WAREHOUSE_SITE' ? (
            <Alert type="info" showIcon message="系统将按当前仓库账号归属站点生成结算单。" />
          ) : null}
          <Form.Item name="period" label="结算期间" rules={[{ required: true, message: '请选择结算期间' }]}>
            <AppDateRangePicker className="misc-fee-full-width" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title={detail ? `利润结算明细 · ${detail.settlementNo}` : '利润结算明细'}
        width={1120}
        open={Boolean(detail) || detailLoading}
        loading={detailLoading}
        onClose={() => setDetail(undefined)}
      >
        {detail ? (
          <Space direction="vertical" size={12} className="misc-fee-full-width">
            <Alert
              type="info"
              showIcon
              message={`${formatBeijingDate(detail.periodFrom)} 至 ${formatBeijingDate(detail.periodTo)} · 共 ${detail.lines.length} 条来源明细`}
            />
            <ManagedTable
              rowKey="id"
              dataSource={detail.lines}
              columns={[
                { title: '客户编号', dataIndex: 'customerCode', key: 'customerCode', width: 110, render: (value?: string) => value ?? '-' },
                { title: '出货单号', dataIndex: 'systemOrderNo', key: 'systemOrderNo', width: 170, render: (value?: string) => value ?? '未匹配订单' },
                { title: '费用名称', dataIndex: 'feeName', key: 'feeName', width: 150 },
                { title: '代理', dataIndex: 'agentName', key: 'agentName', width: 140, render: (value?: string) => value ?? '-' },
                { title: '业务成本', dataIndex: 'businessRmbAmount', key: 'businessRmbAmount', width: 120, render: (value: number) => money(value) },
                { title: '真实应付', dataIndex: 'payableRmbAmount', key: 'payableRmbAmount', width: 120, render: (value: number) => money(value) },
                { title: '应收', dataIndex: 'receivableRmbAmount', key: 'receivableRmbAmount', width: 120, render: (value: number) => money(value) },
                { title: '利润', dataIndex: 'profitRmbAmount', key: 'profitRmbAmount', width: 120, render: (value: number) => <Text strong>{money(value)}</Text> },
                { title: '归属', dataIndex: 'unmatched', key: 'unmatched', width: 100, render: (value: boolean) => value ? <Tag color="warning">待归属</Tag> : <Tag color="success">已归属</Tag> },
                {
                  title: '冻结口径',
                  key: 'snapshot',
                  width: 260,
                  render: (_: unknown, item) => {
                    const snapshot = item.snapshot ?? {};
                    const values = [
                      snapshot.originalAmount !== undefined ? `原币 ${snapshot.originalAmount} ${snapshot.currency ?? ''}`.trim() : undefined,
                      snapshot.exchangeRate !== undefined ? `汇率 ${snapshot.exchangeRate}` : undefined,
                      snapshot.businessAmount !== undefined ? `业务成本 ${snapshot.businessAmount} ${snapshot.businessCurrency ?? ''}`.trim() : undefined,
                      snapshot.businessExchangeRate !== undefined ? `业务汇率 ${snapshot.businessExchangeRate}` : undefined,
                      snapshot.payableAmount !== undefined ? `真实应付 ${snapshot.payableAmount} ${snapshot.payableCurrency ?? ''}`.trim() : undefined,
                      snapshot.payableExchangeRate !== undefined ? `应付汇率 ${snapshot.payableExchangeRate}` : undefined,
                      snapshot.effectiveAt ? `生效 ${formatBeijingDateTime(String(snapshot.effectiveAt))}` : undefined,
                      snapshot.reviewedAt ? `审核 ${formatBeijingDateTime(String(snapshot.reviewedAt))}` : undefined,
                      `来源 ${item.sourceKey}`
                    ].filter((value): value is string => Boolean(value));
                    return <Space direction="vertical" size={0}>{values.map((value) => <Text key={value} type="secondary">{value}</Text>)}</Space>;
                  }
                }
              ]}
              pagination={{ ...tenRowTablePagination, total: detail.lines.length }}
              minimumScrollX={1410}
              density="compact"
              columnSettings={{ storageKey: `misc-fee-${section}-settlement-detail` }}
            />
          </Space>
        ) : null}
      </Drawer>
    </AppPage>
  );
}
