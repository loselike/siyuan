import type { ChangeEvent, Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Banknote,
  Bot,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileInput,
  FileText,
  LogOut,
  PackageCheck,
  UserCircle,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Truck
} from 'lucide-react';
import {
  businessTypeLabels,
  calculateTransitTimeLabel,
  createAutomationPlan,
  createBulkTrackingImportResult,
  createFulfillmentAdvice,
  createShipmentInsights,
  getAvailableFulfillmentActions,
  getModuleCoverageSummary,
  productModules,
  shipmentStatusLabels,
  summarizeFulfillmentStages,
  summarizeStatusCounts,
  validateShipmentImportRows,
  type AccountLedgerSummary,
  type BusinessType,
  type BulkTrackingImportResult,
  type BulkTrackingImportRow,
  type CarrierTaskSummary,
  type CustomerAccountSummary,
  type CustomerStatementSummary,
  type FinanceCatalogItemSummary,
  type FulfillmentAction,
  type MasterDataSnapshot,
  type BusinessCostAuditCreateInput,
  type BusinessCostAuditSummary,
  type BusinessCostAuditUpdateInput,
  type PayableAuditCreateInput,
  type PayableAuditSummary,
  type PayableAuditUpdateInput,
  type ReceivableAuditCreateInput,
  type ReceivableAuditSummary,
  type ReceivableFeeSummary,
  type Shipment,
  type ShipmentCreateInput,
  type ShipmentFinanceDetailSummary,
  type ShipmentPaymentUpdateInput,
  type ShipmentPaymentMethod,
  type StaffGender,
  type StaffRoleKey,
  type StaffMenuKey,
  type ShipmentStatus,
  type WarehouseConsolidationSummary,
  type WarehousePackageStatus,
  type WarehousePackageSummary
} from '@siyuan/shared';
import { ApiClient, type AiAssistResponse, type LoginLogSummary, type PermissionKey, type Principal, type ProfileUpdateInput, type RoleKey, type Session } from './apiClient';
import { LoginPage } from './modules/auth/LoginPage';
import {
  appTheme,
  businessWorkspaceConfigs,
  defaultHiddenShipmentColumns,
  defaultShipmentColumnOrder,
  demoOperationalNow,
  editableShipmentStatuses,
  emptyMasterData,
  getFulfillmentAuditStageCount,
  getRouteCategory,
  importCheckRows,
  isShipmentColumnOrderMode,
  menuItems,
  modulePageConfigs,
  passwordStrengthRule,
  routingFulfillmentStages,
  sanitizeShipmentColumnOrder,
  sanitizeHiddenShipmentColumns,
  shipmentColumnLabels,
  shipmentHiddenColumnsStorageKey,
  shipmentColumnOrderOptions,
  shipmentColumnOrders,
  shipmentColumnOrderStorageKey,
  shipmentCustomColumnOrderStorageKey,
  staffGenderOptions,
  statusOrder,
  type MenuKey,
  type ShipmentColumnKey,
  type ShipmentColumnOrderMode
} from './modules/appShell/config';
import { formatPaymentSummary, fulfillmentActionLabels, getRoleDisplayName, getVisibleStaffMenuKeysByPermissions, resolveFulfillmentAction } from './modules/appShell/utils';
import { CustomerPortal } from './modules/customer/CustomerPortal';
import { CustomerServicePage } from './modules/customerService/CustomerServicePage';
import {
  createFinanceCatalogFilters,
  createSettlementMethodOptions,
  getSettlementMethodRows,
  normalizeFinanceCatalogCurrency
} from './modules/finance/catalog';
import { FinancePage } from './modules/finance/FinancePage';
import { OrderFeePanel } from './modules/finance/orderFee/OrderFeePanel';
import { OperationsPage } from './modules/operations/OperationsPage';
import {
  OrdersPage,
  orderAuditStages,
  type EditShipmentOperationalFormValues,
  type OrdersAuditStageKey,
  type OutboundOrderFormValues,
  type ShipmentPaymentFormValues
} from './modules/orders/OrdersPage';
import { RoutingPage, type RoutingAssignmentFormValues, type RoutingStageKey } from './modules/routing/RoutingPage';
import {
  getModuleSubNavSignature,
  ModuleSubNavContext,
  ModuleSubWorkspace,
  type ModuleSubNavContextValue,
  type ModuleSubNavItem,
  type SidebarSubNavState
} from './modules/shared/ModuleSubWorkspace';
import { MasterDataPage } from './modules/masterData/MasterDataPage';
import { PricingPage } from './modules/pricing/PricingPage';
import { ProblemTicketsPage } from './modules/problemTickets/ProblemTicketsPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { TrackingPage } from './modules/tracking/TrackingPage';
import { formatTrackingImportDate, loadXlsx, parseBulkTrackingWorkbook, readFileAsArrayBuffer } from './modules/tracking/bulkImport';
import { formatBeijingDateTime, formatCurrency, formatUsd } from './modules/shared/format';
import { MetricCard, StatusTag, renderFilterActions, renderFilterField, renderNoticeBar, riskLabel, riskWeight, tenRowTablePagination } from './modules/shared/ui';
import { WarehousePage } from './modules/warehouse/WarehousePage';


const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface AiResult {
  title: string;
  response: AiAssistResponse;
}

interface ShipmentOperationLog {
  id: string;
  operatedAt: string;
  operator: string;
  action: string;
}

type ShipmentLogViewMode = 'operation' | 'routing';
type ShipmentEditSource = 'operation' | 'routing';

export function App() {
  const [outboundOrderForm] = Form.useForm<OutboundOrderFormValues>();
  const selectedReceivingChannel = Form.useWatch('carrier', outboundOrderForm);
  const [editShipmentForm] = Form.useForm<EditShipmentOperationalFormValues>();
  const [shipmentPaymentForm] = Form.useForm<ShipmentPaymentFormValues>();
  const [routingAssignmentForm] = Form.useForm<RoutingAssignmentFormValues>();
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem('siyuan-session');
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const [activeMenuKey, setActiveMenuKey] = useState<MenuKey>('workspace');
  const [expandedMenuKey, setExpandedMenuKey] = useState<MenuKey | null>('workspace');
  const [sidebarSubNav, setSidebarSubNav] = useState<SidebarSubNavState | null>(null);
  const businessType: BusinessType = 'DEDICATED_LINE';
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState('shipmentPool');
  const [activeFulfillmentSection, setActiveFulfillmentSection] = useState('stageBoard');
  const [selectedFulfillmentStage, setSelectedFulfillmentStage] = useState<OrdersAuditStageKey>('all');
  const [selectedRoutingStage, setSelectedRoutingStage] = useState<RoutingStageKey>('all');
  const [shipmentColumnOrderMode, setShipmentColumnOrderMode] = useState<ShipmentColumnOrderMode>(() => {
    const saved = localStorage.getItem(shipmentColumnOrderStorageKey);
    return isShipmentColumnOrderMode(saved) ? saved : 'default';
  });
  const [customShipmentColumnOrder, setCustomShipmentColumnOrder] = useState<ShipmentColumnKey[]>(() => {
    try {
      return sanitizeShipmentColumnOrder(JSON.parse(localStorage.getItem(shipmentCustomColumnOrderStorageKey) ?? 'null'));
    } catch {
      return defaultShipmentColumnOrder;
    }
  });
  const [hiddenShipmentColumns, setHiddenShipmentColumns] = useState<ShipmentColumnKey[]>(() => {
    try {
      return sanitizeHiddenShipmentColumns(JSON.parse(localStorage.getItem(shipmentHiddenColumnsStorageKey) ?? 'null'));
    } catch {
      return defaultHiddenShipmentColumns;
    }
  });
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [localShipments, setLocalShipments] = useState<Shipment[]>([]);
  const [shipmentOperationLogs, setShipmentOperationLogs] = useState<Record<string, ShipmentOperationLog[]>>({});
  const [problemTickets, setProblemTickets] = useState<Awaited<ReturnType<ApiClient['problemTickets']>>>([]);
  const [receivables, setReceivables] = useState<ReceivableAuditSummary[]>([]);
  const [businessCostAudits, setBusinessCostAudits] = useState<BusinessCostAuditSummary[]>([]);
  const [payableAudits, setPayableAudits] = useState<PayableAuditSummary[]>([]);
  const [customerStatements, setCustomerStatements] = useState<CustomerStatementSummary[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccountSummary[]>([]);
  const [accountLedger, setAccountLedger] = useState<AccountLedgerSummary[]>([]);
  const [masterData, setMasterData] = useState<MasterDataSnapshot>(emptyMasterData);
  const [carrierTasks, setCarrierTasks] = useState<CarrierTaskSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [outboundOrderOpen, setOutboundOrderOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editingShipmentSource, setEditingShipmentSource] = useState<ShipmentEditSource>('operation');
  const [routingAssignmentShipment, setRoutingAssignmentShipment] = useState<Shipment | null>(null);
  const [collectingShipment, setCollectingShipment] = useState<Shipment | null>(null);
  const [detailViewingShipment, setDetailViewingShipment] = useState<Shipment | null>(null);
  const [shipmentFinanceDetails, setShipmentFinanceDetails] = useState<Record<string, ShipmentFinanceDetailSummary>>({});
  const [shipmentFinanceLoading, setShipmentFinanceLoading] = useState(false);
  const [pendingShipmentPayment, setPendingShipmentPayment] = useState<{
    shipment: Shipment;
    input: ShipmentPaymentUpdateInput;
  } | null>(null);
  const [logViewingShipment, setLogViewingShipment] = useState<Shipment | null>(null);
  const [logViewingMode, setLogViewingMode] = useState<ShipmentLogViewMode>('operation');
  const [bulkTrackingOpen, setBulkTrackingOpen] = useState(false);
  const [bulkTrackingFileName, setBulkTrackingFileName] = useState<string | null>(null);
  const [bulkTrackingRows, setBulkTrackingRows] = useState<BulkTrackingImportRow[]>([]);
  const [bulkTrackingResult, setBulkTrackingResult] = useState<BulkTrackingImportResult | null>(null);
  const [bulkTrackingError, setBulkTrackingError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [personalCenterOpen, setPersonalCenterOpen] = useState(false);
  const [loginLogs, setLoginLogs] = useState<LoginLogSummary[]>([]);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [passwordForm] = Form.useForm();
  const [profileForm] = Form.useForm<ProfileUpdateInput>();
  const [forcePasswordForm] = Form.useForm();
  const [forcePasswordChangeOpen, setForcePasswordChangeOpen] = useState(() => Boolean(session?.user.mustChangePassword));
  const [forcePasswordChangeLoading, setForcePasswordChangeLoading] = useState(false);
  const [forcePasswordChangeError, setForcePasswordChangeError] = useState<string | null>(null);
  const [settlementCatalogItems, setSettlementCatalogItems] = useState<FinanceCatalogItemSummary[]>([]);
  const [orderEntryPrefillPackageIds, setOrderEntryPrefillPackageIds] = useState<string[]>([]);
  const businessWorkspaceConfig = businessWorkspaceConfigs.DEDICATED_LINE;
  const apiClient = useMemo(
    () => new ApiClient(() => session?.accessToken ?? null, handleUnauthorized),
    [session?.accessToken]
  );
  const settlementMethodRows = useMemo(() => getSettlementMethodRows(settlementCatalogItems), [settlementCatalogItems]);
  const settlementMethodOptions = useMemo(() => createSettlementMethodOptions(settlementMethodRows), [settlementMethodRows]);
  const visibleMenuKeys = useMemo(
    () => (session && session.user.role !== 'CUSTOMER' ? getVisibleStaffMenuKeysByPermissions(session.permissions ?? [], session.user.role) : []),
    [session]
  );
  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => visibleMenuKeys.includes(item.key)),
    [visibleMenuKeys]
  );
  const currentMenuKey = useMemo<MenuKey>(
    () =>
      session && session.user.role !== 'CUSTOMER' && visibleMenuKeys.includes(activeMenuKey)
        ? activeMenuKey
        : visibleMenuKeys[0] ?? 'workspace',
    [activeMenuKey, session, visibleMenuKeys]
  );
  const registerSidebarSubNav = useCallback(
    (state: Omit<SidebarSubNavState, 'parentKey' | 'signature'>) => {
      const signature = getModuleSubNavSignature(state.items);
      setSidebarSubNav((current) => {
        if (
          current?.parentKey === currentMenuKey &&
          current.activeKey === state.activeKey &&
          current.signature === signature &&
          current.onChange === state.onChange
        ) {
          return current;
        }

        return {
          parentKey: currentMenuKey,
          items: state.items,
          activeKey: state.activeKey,
          onChange: state.onChange,
          signature
        };
      });
    },
    [currentMenuKey]
  );
  const clearSidebarSubNav = useCallback((parentKey: string) => {
    setSidebarSubNav((current) => (current?.parentKey === parentKey ? null : current));
  }, []);
  const sidebarSubNavContextValue = useMemo<ModuleSubNavContextValue>(
    () => ({
      parentKey: currentMenuKey,
      register: registerSidebarSubNav,
      clear: clearSidebarSubNav
    }),
    [clearSidebarSubNav, currentMenuKey, registerSidebarSubNav]
  );
  const handlePrimaryMenuClick = (key: MenuKey) => {
    setNotice(null);
    setActiveMenuKey(key);
    setExpandedMenuKey((current) => (currentMenuKey === key && current === key ? null : key));
  };
  const openOrderEntryFromWarehouse = useCallback((packageIds: string[]) => {
    setOrderEntryPrefillPackageIds(packageIds);
    setActiveMenuKey('business');
    setExpandedMenuKey('business');
  }, []);
  const canViewShipmentFinanceDetail = session?.user.role === 'ADMIN' || session?.user.role === 'FINANCE' || session?.user.role === 'OPERATOR';
  const canViewInternalShipmentFinance = session?.user.role === 'ADMIN' || session?.user.role === 'FINANCE';

  useEffect(() => {
    localStorage.setItem(shipmentColumnOrderStorageKey, shipmentColumnOrderMode);
  }, [shipmentColumnOrderMode]);

  useEffect(() => {
    localStorage.setItem(shipmentCustomColumnOrderStorageKey, JSON.stringify(customShipmentColumnOrder));
  }, [customShipmentColumnOrder]);

  useEffect(() => {
    localStorage.setItem(shipmentHiddenColumnsStorageKey, JSON.stringify(hiddenShipmentColumns));
  }, [hiddenShipmentColumns]);

  useEffect(() => {
    if (!session || session.user.mustChangePassword) {
      return;
    }
    void refreshWorkspace(apiClient);
  }, [apiClient, session]);

  useEffect(() => {
    if (!session || session.user.role === 'CUSTOMER') {
      return;
    }
    if (!visibleMenuKeys.includes(activeMenuKey)) {
      setActiveMenuKey(visibleMenuKeys[0] ?? 'workspace');
    }
  }, [activeMenuKey, session, visibleMenuKeys]);

  useEffect(() => {
    if (!session || session.user.role === 'CUSTOMER') {
      setSettlementCatalogItems([]);
      return;
    }

    let cancelled = false;
    apiClient
      .financeCatalog({ category: 'SETTLEMENT_METHOD', enabledOnly: true })
      .then((response) => {
        if (!cancelled) {
          setSettlementCatalogItems(Array.isArray(response.items) ? response.items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettlementCatalogItems([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, session]);

  useEffect(() => {
    setExpandedMenuKey(currentMenuKey);
  }, [currentMenuKey]);

  useEffect(() => {
    if (!detailViewingShipment || !canViewShipmentFinanceDetail || shipmentFinanceDetails[detailViewingShipment.id]) {
      return;
    }

    let cancelled = false;
    setShipmentFinanceLoading(true);
    apiClient
      .shipmentFinanceDetail(detailViewingShipment.id)
      .then((detail) => {
        if (!cancelled) {
          setShipmentFinanceDetails((current) => ({ ...current, [detail.shipmentId]: detail }));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : '订单财务明细加载失败');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setShipmentFinanceLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, canViewShipmentFinanceDetail, detailViewingShipment, shipmentFinanceDetails]);

  async function reloadShipmentFinanceDetail(shipmentId: string) {
    setShipmentFinanceLoading(true);
    try {
      const detail = await apiClient.shipmentFinanceDetail(shipmentId);
      setShipmentFinanceDetails((current) => ({ ...current, [detail.shipmentId]: detail }));
      return detail;
    } finally {
      setShipmentFinanceLoading(false);
    }
  }

  async function refreshFinanceDetailIfOpen() {
    if (!detailViewingShipment || !canViewShipmentFinanceDetail) {
      return;
    }
    await reloadShipmentFinanceDetail(detailViewingShipment.id);
  }

  function mergeSessionUser(user: Principal) {
    setSession((current) => {
      if (!current) {
        return current;
      }
      const nextSession = { ...current, user: { ...current.user, ...user } };
      localStorage.setItem('siyuan-session', JSON.stringify(nextSession));
      return nextSession;
    });
  }

  function handleUnauthorized() {
    localStorage.removeItem('siyuan-session');
    setSession(null);
    setLocalShipments([]);
    setProblemTickets([]);
    setReceivables([]);
    setBusinessCostAudits([]);
    setPayableAudits([]);
    setCustomerStatements([]);
    setCustomerAccounts([]);
    setAccountLedger([]);
    setMasterData(emptyMasterData);
    setCarrierTasks([]);
    setAiResult(null);
    setForcePasswordChangeOpen(false);
    passwordForm.resetFields();
    profileForm.resetFields();
    forcePasswordForm.resetFields();
  }

  async function refreshWorkspace(client = apiClient, user = session?.user) {
    const canReadFinance = user?.role === 'ADMIN' || user?.role === 'FINANCE' || user?.role === 'CUSTOMER';
    const canReadBusinessCosts = user?.role === 'ADMIN' || user?.role === 'FINANCE' || user?.role === 'OPERATOR';
    const canReadInternalFinance = user?.role === 'ADMIN' || user?.role === 'FINANCE';
    const canReadCarrierTasks = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SERVICE' || user?.role === 'OPERATOR' || user?.role === 'WAREHOUSE';
    const canReadMasterData = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SERVICE' || user?.role === 'OPERATOR' || user?.role === 'FINANCE';
    const canReadProblems = user?.role === 'ADMIN' || user?.role === 'CUSTOMER_SERVICE' || user?.role === 'OPERATOR' || user?.role === 'CUSTOMER';
    const [nextShipments, nextTickets] = await Promise.all([
      client.shipments(),
      canReadProblems ? client.problemTickets() : Promise.resolve([])
    ]);
    setLocalShipments(nextShipments);
    setProblemTickets(nextTickets);
    if (canReadFinance || canReadBusinessCosts) {
      const [nextReceivables, nextBusinessCosts, nextPayables, nextStatements, nextAccounts, nextLedger] = await Promise.all([
        canReadFinance ? client.receivableAudits({ pageSize: 100 }) : Promise.resolve({ rows: [] }),
        canReadBusinessCosts ? client.businessCostAudits({ pageSize: 100 }) : Promise.resolve({ rows: [] }),
        canReadInternalFinance ? client.payableAudits({ pageSize: 100 }) : Promise.resolve({ rows: [] }),
        canReadFinance ? client.customerStatements() : Promise.resolve([]),
        canReadFinance ? client.customerAccounts() : Promise.resolve([]),
        canReadFinance ? client.accountLedger() : Promise.resolve([])
      ]);
      setReceivables(nextReceivables.rows);
      setBusinessCostAudits(nextBusinessCosts.rows);
      setPayableAudits(nextPayables.rows);
      setCustomerStatements(nextStatements);
      setCustomerAccounts(nextAccounts);
      setAccountLedger(nextLedger);
    } else {
      setReceivables([]);
      setBusinessCostAudits([]);
      setPayableAudits([]);
      setCustomerStatements([]);
      setCustomerAccounts([]);
      setAccountLedger([]);
    }
    if (canReadCarrierTasks) {
      try {
        setCarrierTasks(await client.carrierTasks());
      } catch {
        setCarrierTasks([]);
      }
    } else {
      setCarrierTasks([]);
    }
    if (canReadMasterData) {
      setMasterData(await client.masterData());
    } else {
      setMasterData(emptyMasterData);
    }
  }

  async function handleLogin(username: string, password: string, captchaId: string, captchaCode: string) {
    const nextSession = await apiClient.login(username, password, captchaId, captchaCode);
    localStorage.setItem('siyuan-session', JSON.stringify(nextSession));
    setSession(nextSession);
    setActiveMenuKey(getVisibleStaffMenuKeysByPermissions(nextSession.permissions ?? [], nextSession.user.role)[0] ?? 'workspace');
    setPersonalCenterOpen(false);
    const requiresPasswordChange = Boolean(nextSession.user.mustChangePassword);
    setForcePasswordChangeOpen(requiresPasswordChange);
    setForcePasswordChangeError(null);
    setLoginLogs([]);
    setLoginLogsLoading(false);
    setAiResult(null);
    setNotice(null);
    if (requiresPasswordChange) {
      return;
    }
    const loginClient = new ApiClient(() => nextSession.accessToken, handleUnauthorized);
    await refreshWorkspace(loginClient, nextSession.user);
  }

  async function openPersonalCenter() {
    setPersonalCenterOpen(true);
    try {
      const profile = await apiClient.me();
      mergeSessionUser(profile);
      profileForm.setFieldsValue({
        name: profile.name,
        phone: profile.phone,
        gender: (profile.gender ?? 'UNKNOWN') as StaffGender,
        nickname: profile.nickname
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '个人资料加载失败');
    }
    setLoginLogsLoading(true);
    try {
      setLoginLogs(await apiClient.loginLogs());
    } finally {
      setLoginLogsLoading(false);
    }
  }

  async function submitPasswordChange() {
    const values = await passwordForm.validateFields();
    await apiClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword
    });
    passwordForm.resetFields();
    setNotice('密码已修改，请使用新密码重新登录');
    setPersonalCenterOpen(false);
    handleUnauthorized();
  }

  async function submitProfileUpdate() {
    const values = await profileForm.validateFields();
    const profile = await apiClient.updateProfile(values);
    mergeSessionUser(profile);
    setNotice('个人资料已更新');
  }

  async function submitForcedPasswordChange() {
    try {
      setForcePasswordChangeLoading(true);
      setForcePasswordChangeError(null);
      const values = await forcePasswordForm.validateFields();
      await apiClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      forcePasswordForm.resetFields();
      setForcePasswordChangeOpen(false);
      if (session) {
        const nextUser = { ...session.user, mustChangePassword: false };
        mergeSessionUser(nextUser);
        await refreshWorkspace(apiClient, nextUser);
      }
      setNotice('密码已修改，可以继续使用系统');
    } catch (error) {
      setForcePasswordChangeError(error instanceof Error ? error.message : '密码修改失败，请检查后重试');
    } finally {
      setForcePasswordChangeLoading(false);
    }
  }

  const visibleShipments = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return localShipments.filter((shipment) => {
      const matchesStatus = selectedStatus === 'ALL' || shipment.status === selectedStatus;
      const matchesKeyword =
        normalized.length === 0 ||
        [
          shipment.customerName,
          shipment.customerOrderNo,
          shipment.systemOrderNo,
          shipment.transferNo,
          shipment.destinationCountry,
          shipment.carrier,
          shipment.channelName,
          shipment.agentName
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalized));

      return matchesStatus && matchesKeyword;
    });
  }, [keyword, localShipments, selectedStatus]);

  const businessShipments = useMemo(
    () => localShipments,
    [localShipments]
  );
  const findShipmentBySystemOrderNo = useCallback(
    (systemOrderNo?: string) =>
      systemOrderNo ? localShipments.find((shipment) => shipment.systemOrderNo === systemOrderNo) : undefined,
    [localShipments]
  );
  const renderShipmentOrderNoLink = useCallback(
    (
      systemOrderNo?: string,
      options: { shipment?: Shipment; subtitle?: string; copyText?: string } = {}
    ) => {
      if (!systemOrderNo) {
        return <Text type="secondary">-</Text>;
      }

      const shipment = options.shipment ?? findShipmentBySystemOrderNo(systemOrderNo);
      const copyText = options.copyText ?? (shipment?.transferNo ? `${systemOrderNo}\n${shipment.transferNo}` : systemOrderNo);
      const subtitle = options.subtitle ?? (shipment ? '点击查看详情' : '未匹配订单');

      return (
        <div className="order-number-cell">
          <div className="order-number-main">
            {shipment ? (
              <Button
                className="order-number-link"
                type="link"
                size="small"
                onClick={() => setDetailViewingShipment(shipment)}
              >
                {systemOrderNo}
              </Button>
            ) : (
              <Text className="order-number-text">{systemOrderNo}</Text>
            )}
            <Text className="order-number-copy" copyable={{ text: copyText }} />
          </div>
          <Text className="order-number-subtitle" type="secondary">{subtitle}</Text>
        </div>
      );
    },
    [findShipmentBySystemOrderNo]
  );
  const statusCounts = summarizeStatusCounts(businessShipments);
  const aiQueue = useMemo(
    () =>
      businessShipments
        .map((shipment) => ({
          shipment,
          insight: createShipmentInsights({
            status: shipment.status,
            trackingStaleDays: shipment.trackingStaleDays,
            isRemoteArea: shipment.isRemoteArea,
            hasProblemTicket: shipment.hasProblemTicket,
            chargeableWeightKg: shipment.receivableWeightKg,
            carrier: shipment.carrier
          })
        }))
        .filter(({ insight }) => insight.riskLevel !== 'low')
        .sort((a, b) => riskWeight(b.insight.riskLevel) - riskWeight(a.insight.riskLevel)),
    [businessShipments]
  );
  const automationPlan = useMemo(() => createAutomationPlan(businessShipments).slice(0, 4), [businessShipments]);
  const importValidation = useMemo(() => validateShipmentImportRows(importCheckRows), []);
  const moduleSummary = getModuleCoverageSummary();
  const spotlightModules = productModules.filter((module) =>
    ['我的订单', '问题件中心', '客户门户', 'AI 助手', '开放 API', '系统设置'].includes(module.name)
  );
  const fulfillmentStageSummary = summarizeFulfillmentStages(localShipments, 'ALL');
  const fulfillmentAuditMetricCards = [
    {
      title: '待审核',
      value: getFulfillmentAuditStageCount(businessShipments, 'reviewing'),
      extra: '新建出货订单待确认',
      icon: <ClipboardCheck />
    },
    {
      title: '审核通过',
      value: getFulfillmentAuditStageCount(businessShipments, 'approved'),
      extra: '可进入后续仓库/排货流程',
      icon: <ShieldCheck />
    },
    {
      title: '审核不通过',
      value: getFulfillmentAuditStageCount(businessShipments, 'rejected'),
      extra: '需修改资料后重新处理',
      icon: <TicketCheck />
    },
    {
      title: '已收款',
      value: businessShipments.filter((shipment) => shipment.paymentAmountUsd !== undefined || shipment.paymentAmountCny !== undefined).length,
      extra: '已登记收款金额或方式',
      icon: <CircleDollarSign />
    }
  ];
  const fulfillmentShipments = useMemo(() => {
    const activeStage = orderAuditStages.find((stage) => stage.key === selectedFulfillmentStage);
    return activeStage ? businessShipments.filter(activeStage.predicate) : businessShipments;
  }, [businessShipments, selectedFulfillmentStage]);
  const routingFulfillmentShipments = useMemo(() => {
    const activeStage = routingFulfillmentStages.find((stage) => stage.key === selectedRoutingStage);
    return businessShipments.filter(
      (shipment) => selectedRoutingStage === 'all' || activeStage?.statuses.includes(shipment.status)
    );
  }, [businessShipments, selectedRoutingStage]);
  const fulfillmentAdviceQueue = useMemo(
    () =>
      businessShipments
        .map((shipment) => ({ shipment, advice: createFulfillmentAdvice(shipment) }))
        .filter((item) => item.advice.priority !== 'normal')
        .slice(0, 5),
    [businessShipments]
  );
  const allShipmentLogs = logViewingShipment
    ? shipmentOperationLogs[logViewingShipment.id] ?? [
        {
          id: `initial-${logViewingShipment.id}`,
          operatedAt: logViewingShipment.createdAt,
          operator: '系统',
          action: '创建/导入运单'
        }
      ]
    : [];
  const shipmentLogs =
    logViewingMode === 'routing'
      ? allShipmentLogs.filter((log) => log.action.startsWith('渠道排货：'))
      : allShipmentLogs;

  function openShipmentLogModal(record: Shipment, mode: ShipmentLogViewMode) {
    setLogViewingMode(mode);
    setLogViewingShipment(record);
  }

  function appendShipmentOperationLog(shipmentId: string, action: string) {
    const operator = session?.user.username ?? '未知用户';
    setShipmentOperationLogs((current) => ({
      ...current,
      [shipmentId]: [
        {
          id: `shipment-log-${Date.now()}-${current[shipmentId]?.length ?? 0}`,
          operatedAt: new Date().toISOString(),
          operator,
          action
        },
        ...(current[shipmentId] ?? [])
      ]
    }));
  }

  function upsertLocalShipment(shipment: Shipment) {
    setLocalShipments((current) => {
      const exists = current.some((item) => item.id === shipment.id);
      return exists ? current.map((item) => (item.id === shipment.id ? shipment : item)) : [shipment, ...current];
    });
  }

  const shipmentColumnMap: Record<ShipmentColumnKey, ColumnsType<Shipment>[number]> = {
    createdAt: {
      key: 'createdAt',
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 145,
      render: (value: string) => formatBeijingDateTime(value),
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt)
    },
    customerName: {
      key: 'customerName',
      title: '客户名称',
      dataIndex: 'customerName',
      width: 170,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary">{record.customerOrderNo}</Text>
        </Space>
      )
    },
    salesperson: {
      key: 'salesperson',
      title: '业务员归属',
      dataIndex: 'salesperson',
      width: 120,
      render: (value?: string) => <Text type={value ? undefined : 'secondary'}>{value || '未分配'}</Text>
    },
    systemOrderNo: {
      key: 'systemOrderNo',
      title: '运单号',
      dataIndex: 'systemOrderNo',
      width: 150,
      render: (value: string, record) => renderShipmentOrderNoLink(value, { shipment: record, subtitle: '点击查看详情' })
    },
    transferNo: {
      key: 'transferNo',
      title: '转单号',
      dataIndex: 'transferNo',
      width: 155,
      render: (value?: string) => <Text type={value ? undefined : 'secondary'}>{value ?? '待获取快递号'}</Text>
    },
    destinationCountry: {
      key: 'destinationCountry',
      title: '目的地',
      dataIndex: 'destinationCountry',
      width: 110,
      render: (value: string, record) => (
        <Space>
          <span>{value}</span>
          {record.isRemoteArea ? <Tag color="gold">偏远</Tag> : null}
        </Space>
      )
    },
    channel: {
      key: 'channel',
      title: '渠道',
      width: 130,
      render: (_, record) => {
        if (session?.user.role === 'OPERATOR') {
          return <Text>{getRouteCategory(record.channelName)}</Text>;
        }
        return <Text>{record.channelName || record.carrier}</Text>;
      }
    },
    agent: {
      key: 'agent',
      title: '代理',
      width: 120,
      render: (_, record) => <Text type={session?.user.role === 'OPERATOR' ? 'secondary' : undefined}>{session?.user.role === 'OPERATOR' ? '按权限隐藏' : record.agentName}</Text>
    },
    packageCount: {
      key: 'packageCount',
      title: '件数',
      dataIndex: 'packageCount',
      width: 70,
      align: 'right'
    },
    weight: {
      key: 'weight',
      title: '应收/代理计费重',
      width: 140,
      render: (_, record) => `${record.receivableWeightKg.toFixed(3)} / ${record.agentWeightKg.toFixed(3)}`
    },
    latestTracking: {
      key: 'latestTracking',
      title: '最新轨迹',
      dataIndex: 'latestTracking',
      width: 160,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text>{value}</Text>
          <Text type={record.trackingStaleDays >= 5 ? 'danger' : 'secondary'}>
            {record.trackingStaleDays ? `${record.trackingStaleDays} 天未更新` : '今日更新'}
          </Text>
        </Space>
      )
    },
    status: {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: ShipmentStatus) => <StatusTag status={status} />
    },
    transitTime: {
      key: 'transitTime',
      title: '时效',
      width: 110,
      render: (_, record) => <Text>{calculateTransitTimeLabel(record, demoOperationalNow)}</Text>
    },
    paymentAmount: {
      key: 'paymentAmount',
      title: '收款金额',
      width: 130,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.paymentAmountUsd === undefined && record.paymentAmountCny === undefined ? (
            <Text type="secondary">未知</Text>
          ) : (
            <>
              <Text>{record.paymentAmountUsd === undefined ? 'USD 未知' : formatUsd(record.paymentAmountUsd)}</Text>
              <Text type="secondary">{record.paymentAmountCny === undefined ? 'RMB 未知' : formatCurrency(record.paymentAmountCny)}</Text>
            </>
          )}
        </Space>
      )
    },
    paymentCurrency: {
      key: 'paymentCurrency',
      title: '收款币种',
      width: 100,
      render: (_, record) => {
        const currencies = [
          record.paymentAmountUsd === undefined ? null : 'USD',
          record.paymentAmountCny === undefined ? null : 'RMB'
        ].filter(Boolean);
        return <Tag color={currencies.length ? 'green' : 'default'}>{currencies.length ? currencies.join(' + ') : '未知'}</Tag>;
      }
    },
    paymentMethod: {
      key: 'paymentMethod',
      title: '收款方式',
      dataIndex: 'paymentMethod',
      width: 110,
      render: (value?: ShipmentPaymentMethod) => <Tag color={value ? 'blue' : 'default'}>{value ?? '未知'}</Tag>
    },
    remark: {
      key: 'remark',
      title: '备注',
      dataIndex: 'remark',
      width: 180,
      render: (value?: string) => <Text type={value ? undefined : 'secondary'}>{value || '无备注'}</Text>
    }
  };
  const activeShipmentColumnOrder =
    shipmentColumnOrderMode === 'custom' ? customShipmentColumnOrder : shipmentColumnOrders[shipmentColumnOrderMode];
  const visibleShipmentColumnOrder = activeShipmentColumnOrder.filter((key) => !hiddenShipmentColumns.includes(key));
  const moveShipmentColumn = (key: ShipmentColumnKey, direction: 'up' | 'down') => {
    setCustomShipmentColumnOrder((current) => {
      const next = [...current];
      const index = next.indexOf(key);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setShipmentColumnOrderMode('custom');
  };
  const resetShipmentColumnOrder = () => {
    setCustomShipmentColumnOrder(defaultShipmentColumnOrder);
    setShipmentColumnOrderMode('default');
    setHiddenShipmentColumns(defaultHiddenShipmentColumns);
  };
  const toggleShipmentColumn = (key: ShipmentColumnKey, visible: boolean) => {
    setHiddenShipmentColumns((current) => {
      if (visible) {
        return current.filter((item) => item !== key);
      }
      const visibleCount = defaultShipmentColumnOrder.length - current.length;
      if (visibleCount <= 1 && !current.includes(key)) {
        return current;
      }
      return current.includes(key) ? current : [...current, key];
    });
  };
  const visibleShipmentColumnKeys: ShipmentColumnKey[] = visibleShipmentColumnOrder.length ? visibleShipmentColumnOrder : ['systemOrderNo'];
  const columns: ColumnsType<Shipment> = visibleShipmentColumnKeys.map((key) => shipmentColumnMap[key]);
  const workspaceColumns: ColumnsType<Shipment> = columns.map((column) => {
    if (column.key !== 'systemOrderNo') {
      return column;
    }

    return {
      ...column,
      render: (value: string, record: Shipment) => (
        renderShipmentOrderNoLink(value, { shipment: record, subtitle: '点击查看详情' })
      )
    };
  });

  const auditStatusColumn: ColumnsType<Shipment>[number] = {
    title: '审核状态',
    width: 110,
    render: (_, record) => {
      if (record.status === 'DRAFT') {
        return <Tag color="warning">待审核</Tag>;
      }
      if (record.status === 'REVIEW_REJECTED') {
        return <Tag color="red">未通过</Tag>;
      }
      return <Tag color="green">已通过</Tag>;
    }
  };

  const fulfillmentColumns: ColumnsType<Shipment> = [
    ...columns,
    auditStatusColumn,
    {
      title: 'AI 下一步',
      width: 170,
      render: (_, record) => {
        const advice = createFulfillmentAdvice(record);
        return (
          <Space direction="vertical" size={0}>
            <Text strong>{advice.nextAction}</Text>
            <Text type={advice.priority === 'urgent' ? 'danger' : 'secondary'}>{advice.riskReasons[0]}</Text>
          </Space>
        );
      }
    },
    {
      title: '履约操作',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
	          {(() => {
            const actions = getAvailableFulfillmentActions({
	            status: record.status,
	            hasTransferNo: Boolean(record.transferNo)
	          }).filter((action) => !['confirm-receive', 'assign-route', 'mark-return', 'create-problem', 'fill-transfer-no', 'confirm-dispatch', 'add-tracking'].includes(action)).slice(0, 3);
            return (
              <>
                {actions.map((action) =>
                  action === 'confirm-declare' ? (
                    <Popconfirm
                      key={action}
                      title="确认审核通过？"
                      description="审核通过后，该订单会进入待排货队列，可继续分配代理和渠道。"
                      okText="审核通过"
                      cancelText="取消"
                      onConfirm={() => handleFulfillmentAction(record, action)}
                    >
                      <Button size="small">{fulfillmentActionLabels[action]}</Button>
                    </Popconfirm>
                  ) : action === 'reject-declare' ? (
                    <Popconfirm
                      key={action}
                      title="确认审核不通过？"
                      description="审核不通过后，该订单会进入审核不通过列表，等待业务员修改资料。"
                      okText="审核不通过"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleFulfillmentAction(record, action)}
                    >
                      <Button size="small" danger>
                        {fulfillmentActionLabels[action]}
                      </Button>
                    </Popconfirm>
                  ) : action === 'confirm-dispatch' ? (
                    <Popconfirm
                      key={action}
                      title="确认出库？"
                      description="确认后订单会进入已出库，等待客服补齐转单号。"
                      okText="确认出库"
                      cancelText="取消"
                      onConfirm={() => handleFulfillmentAction(record, action)}
                    >
                      <Button size="small">{fulfillmentActionLabels[action]}</Button>
                    </Popconfirm>
                  ) : (
                    <Button key={action} size="small" onClick={() => handleFulfillmentAction(record, action)}>
                      {fulfillmentActionLabels[action]}
                    </Button>
                  )
                )}
                {record.status === 'DRAFT' ? (
                  <Button size="small" onClick={() => openEditShipmentOperationalModal(record)}>
                    修改
                  </Button>
                ) : null}
                <Button size="small" onClick={() => openShipmentPaymentModal(record)}>
                  收款
                </Button>
                <Button size="small" onClick={() => openShipmentLogModal(record, 'operation')}>
                  操作日志
                </Button>
                <Popconfirm
                  title="确认删除该运单？"
                  description="删除后该运单会从当前工作台移除，请确认这不是仍需处理的业务单。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDeleteShipment(record)}
                >
                  <Button size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </>
            );
          })()}
        </Space>
      )
    }
  ];

  function openOutboundOrderModal() {
    outboundOrderForm.setFieldsValue({
      customerName: '9409-Daloday',
      customerOrderNo: `OUT-${localShipments.length + 1}`,
      systemOrderNo: `SYOUT${String(localShipments.length + 1).padStart(6, '0')}`,
      destinationCountry: '美国',
      carrier: '快递',
      customReceivingChannel: undefined,
      packageCount: 1,
      receivableWeightKg: 18,
      agentWeightKg: 18
    });
    setOutboundOrderOpen(true);
  }

  async function handleDeleteShipment(record: Shipment) {
    await apiClient.deleteShipment(record.id);
    setLocalShipments((current) => current.filter((shipment) => shipment.id !== record.id));
    if (editingShipment?.id === record.id) {
      setEditingShipment(null);
      setEditingShipmentSource('operation');
    }
    if (collectingShipment?.id === record.id) {
      setCollectingShipment(null);
    }
    if (logViewingShipment?.id === record.id) {
      setLogViewingShipment(null);
    }
    setNotice(`已人工删除运单 ${record.systemOrderNo}`);
  }

  async function handleCreateOutboundOrder() {
    const values = await outboundOrderForm.validateFields();
    const systemOrderNo = values.systemOrderNo?.trim() || `SYOUT${Date.now()}`;
    const customerInput = values.customerName.trim();
    const customer = masterData.customers.find((item) =>
      [item.code, item.name, item.shortName, item.fullName, `${item.code}-${item.name}`].filter(Boolean).includes(customerInput)
    ) ?? masterData.customers[0];
    const carrierInput = values.carrier.trim();
    const receivingChannel = carrierInput === '自定义' ? values.customReceivingChannel?.trim() : carrierInput;
    const channel = masterData.channels.find((item) => item.name === receivingChannel || item.carrierName === receivingChannel || item.name.includes(receivingChannel ?? '')) ?? masterData.channels[0];

    if (!customer) {
      setNotice('请先在基础资料维护客户，再创建出货订单');
      return;
    }

    const created = await apiClient.createShipment({
      customerId: customer.id,
      customerOrderNo: values.customerOrderNo.trim(),
      systemOrderNo,
      businessType: 'DEDICATED_LINE',
      packageType: 'WPX',
      destinationCountry: values.destinationCountry.trim(),
      packageCount: values.packageCount,
      receivableWeightKg: values.receivableWeightKg,
      agentWeightKg: values.agentWeightKg,
      channelId: channel?.id,
      receivingChannel,
      initialStatus: 'DRAFT',
      latestTracking: '新建出货订单，待审核'
    });
    const shipment = values.remark?.trim() ? { ...created, remark: values.remark.trim() } : created;

    upsertLocalShipment(shipment);
    appendShipmentOperationLog(created.id, `新建出货订单：${systemOrderNo}`);
    setSelectedFulfillmentStage('all');
    setOutboundOrderOpen(false);
    outboundOrderForm.resetFields();
    setNotice(`已创建出货订单 ${systemOrderNo}，等待审核`);
  }

  async function handleFulfillmentAction(record: Shipment, action: FulfillmentAction) {
    const actionResult = resolveFulfillmentAction(record, action);

    if (!actionResult.ok) {
      setNotice(actionResult.message);
      return;
    }

    const updated =
      action === 'confirm-receive'
        ? await apiClient.receiveShipment(record.id)
        : action === 'confirm-declare' || action === 'reject-declare'
          ? await apiClient.updateShipmentOperational(record.id, {
              status: actionResult.patch?.status,
              latestTracking: actionResult.patch?.latestTracking
            })
        : action === 'assign-route'
          ? await apiClient.routeShipment(record.id, { channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' })
        : action === 'confirm-dispatch'
          ? await apiClient.dispatchShipment(record.id, {})
        : action === 'fill-transfer-no'
          ? await apiClient.updateShipmentOperational(record.id, {
              transferNo: record.transferNo ?? `TRK-${record.systemOrderNo}`,
              latestTracking: actionResult.patch?.latestTracking ?? '已出库，已补齐转单号'
            })
            : action === 'add-tracking'
              ? await apiClient.addTrackingEvent(record.id, { status: '手工轨迹更新', happenedAt: new Date().toISOString() })
              : action === 'create-problem'
                ? (await apiClient.createProblemTicket(record.id, { reason: '人工创建问题件', customerVisible: true }), { ...record, hasProblemTicket: true, status: 'PROBLEM' as ShipmentStatus })
                : { ...record, ...actionResult.patch };

    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, actionResult.message);
    setNotice(actionResult.message);
  }

  async function handleWarehouseDispatchShipment(record: Shipment) {
    const updated = await apiClient.dispatchShipment(record.id, {});
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, '仓库管理：确认出库');
    setNotice(`仓库已确认 ${record.systemOrderNo} 出库，等待客服补齐转单号`);
  }

  async function handleWarehouseRouteShipment(record: Shipment) {
    const channel = masterData.channels.find((item) => item.name === record.channelName)
      ?? masterData.channels.find((item) => item.enabled)
      ?? masterData.channels[0];
    const agent = masterData.agents.find((item) => item.name === record.agentName || item.shortName === record.agentName)
      ?? masterData.agents.find((item) => item.enabled)
      ?? masterData.agents[0];

    if (!channel) {
      setNotice('请先维护公司渠道后再排货');
      return;
    }

    const updated = await apiClient.routeShipment(record.id, { channelId: channel.id, agentId: agent?.id });
    const patched: Shipment = {
      ...updated,
      channelName: channel.name,
      carrier: channel.carrierName,
      agentName: agent?.name ?? updated.agentName
    };
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? patched : shipment)));
    appendShipmentOperationLog(record.id, `仓库管理：排货到 ${channel.name}`);
    setNotice(`已排货 ${record.systemOrderNo}，进入待出库`);
  }

  function openRoutingAssignmentModal(record: Shipment) {
    const matchedChannel = masterData.channels.find((channel) => channel.name === record.channelName);

    routingAssignmentForm.setFieldsValue({
      agentId: undefined,
      manualAgentName: undefined,
      channelId: matchedChannel?.id ?? masterData.channels.find((channel) => channel.enabled)?.id,
      manualChannelName: undefined,
      agentChannelName: undefined,
      chargeWeightKg: record.routeChargeWeightKg,
      unitPrice: record.routeUnitPrice,
      otherFee: record.routeOtherFee ?? 0,
      currency: record.routeCurrency ?? 'RMB'
    });
    setRoutingAssignmentShipment(record);
  }

  async function resolveRoutingAgent(values: RoutingAssignmentFormValues) {
    const manualAgentName = values.manualAgentName?.trim();
    const selectedAgent = values.agentId ? masterData.agents.find((agent) => agent.id === values.agentId) : undefined;
    const matchedManualAgent = manualAgentName
      ? masterData.agents.find((agent) => [agent.name, agent.shortName, agent.code].filter(Boolean).includes(manualAgentName))
      : undefined;

    if (matchedManualAgent ?? selectedAgent) {
      return matchedManualAgent ?? selectedAgent;
    }

    if (!manualAgentName) {
      return undefined;
    }

    const createdAgent = await apiClient.createAgent({
      name: manualAgentName,
      shortName: manualAgentName,
      code: manualAgentName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || undefined,
      integrationType: 'MANUAL'
    });
    setMasterData((current) => ({ ...current, agents: [...current.agents, createdAgent] }));
    return createdAgent;
  }

  async function resolveRoutingChannel(values: RoutingAssignmentFormValues) {
    const manualChannelName = values.manualChannelName?.trim();
    const selectedChannel = values.channelId ? masterData.channels.find((channel) => channel.id === values.channelId) : undefined;
    const matchedManualChannel = manualChannelName ? masterData.channels.find((channel) => channel.name === manualChannelName) : undefined;

    if (matchedManualChannel ?? selectedChannel) {
      return matchedManualChannel ?? selectedChannel;
    }

    if (!manualChannelName) {
      return undefined;
    }

    const carrier = masterData.carriers.find((item) => item.enabled) ?? (await apiClient.createCarrier({ name: '自定义承运商' }));
    if (!masterData.carriers.some((item) => item.id === carrier.id)) {
      setMasterData((current) => ({ ...current, carriers: [...current.carriers, carrier] }));
    }
    const createdChannel = await apiClient.createChannel({ name: manualChannelName, carrierId: carrier.id });
    setMasterData((current) => ({ ...current, channels: [...current.channels, createdChannel] }));
    return createdChannel;
  }

  async function handleConfirmRoutingAssignment() {
    if (!routingAssignmentShipment) {
      return;
    }
    if (routingAssignmentShipment.status !== 'WAITING_SORT') {
      setNotice('当前状态不允许执行分配渠道');
      return;
    }

    try {
      const values = await routingAssignmentForm.validateFields();
      const agent = await resolveRoutingAgent(values);
      const channel = await resolveRoutingChannel(values);

      if (!agent) {
        setNotice('请选择代理');
        return;
      }
      if (!channel) {
        setNotice('请填写代理渠道');
        return;
      }

      const otherFee = Number(values.otherFee || 0);
      const routeCostTotal = Number(values.chargeWeightKg || 0) * Number(values.unitPrice || 0) + otherFee;
      const updated = await apiClient.routeShipment(routingAssignmentShipment.id, {
        channelId: channel.id,
        agentId: agent.id,
        agentChannelName: values.agentChannelName,
        chargeWeightKg: values.chargeWeightKg,
        unitPrice: values.unitPrice,
      otherFee,
      otherFeeRemark: values.otherFeeRemark?.trim() || undefined,
      currency: values.currency ?? 'RMB'
    });
      const patched: Shipment = {
        ...updated,
        channelName: channel.name,
        carrier: channel.carrierName,
        agentName: agent.name
      };
      setLocalShipments((current) => current.map((shipment) => (shipment.id === routingAssignmentShipment.id ? patched : shipment)));
      if (session?.user.role === 'ADMIN' || session?.user.role === 'FINANCE') {
        await refreshPayableAudits();
      }
      void apiClient.masterData().then(setMasterData).catch(() => undefined);
      appendShipmentOperationLog(routingAssignmentShipment.id, `渠道排货：代理 ${agent.name}，渠道 ${channel.name}，成本 ${routeCostTotal.toFixed(2)} ${values.currency ?? 'RMB'}`);
      setRoutingAssignmentShipment(null);
      routingAssignmentForm.resetFields();
      setNotice('市场排货完成，进入仓库管理待出库');
    } catch (error) {
      if (error instanceof Error && error.message) {
        setNotice(error.message);
      }
    }
  }

  async function handleRerouteShipment(record: Shipment, reason: string) {
    const updated = await apiClient.rerouteShipment(record.id, { reason });
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, `渠道排货：代理退回重排（${reason}）`);
    setNotice(`${record.systemOrderNo} 已退回待排货`);
  }

  function openEditShipmentOperationalModal(record: Shipment, source: ShipmentEditSource = 'operation') {
    setEditingShipmentSource(source);
    setEditingShipment(record);
    editShipmentForm.setFieldsValue({
      latestTracking: record.latestTracking,
      transferNo: record.transferNo ?? '',
      status: record.status,
      etaAt: record.etaAt ?? '',
      etdAt: record.etdAt ?? ''
    });
  }

  async function handleSubmitShipmentOperationalEdit() {
    if (!editingShipment) {
      return;
    }

    const values = await editShipmentForm.validateFields();
    const oldTransferNo = editingShipment.transferNo ?? '空';
    const nextTransferNo = values.transferNo?.trim() || undefined;
    const updated = await apiClient.updateShipmentOperational(editingShipment.id, {
      latestTracking: values.latestTracking.trim(),
      transferNo: nextTransferNo,
      status: values.status,
      etaAt: values.etaAt?.trim() || undefined,
      etdAt: values.etdAt?.trim() || undefined
    });
    setLocalShipments((current) => current.map((shipment) => (shipment.id === editingShipment.id ? updated : shipment)));
    const logPrefix = editingShipmentSource === 'routing' ? '渠道排货：' : '';
    if (oldTransferNo !== (nextTransferNo ?? '空')) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新转单号：${oldTransferNo} -> ${nextTransferNo ?? '空'}`);
    }
    if (editingShipment.latestTracking !== updated.latestTracking) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新最新轨迹：${updated.latestTracking}`);
    }
    if (editingShipment.status !== updated.status) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新状态：${shipmentStatusLabels[editingShipment.status]} -> ${shipmentStatusLabels[updated.status]}`);
    }
    setEditingShipment(null);
    setEditingShipmentSource('operation');
    editShipmentForm.resetFields();
    setNotice(`已人工修改 ${updated.systemOrderNo} 的轨迹、转单号和状态`);
  }

  function openShipmentPaymentModal(record: Shipment) {
    setCollectingShipment(record);
    shipmentPaymentForm.setFieldsValue({
      paymentAmountUsd: record.paymentAmountUsd,
      paymentAmountCny: record.paymentAmountCny,
      paymentMethod: record.paymentMethod ?? '对公'
    });
  }

  async function handleSubmitShipmentPayment() {
    if (!collectingShipment) {
      return;
    }

    const values = await shipmentPaymentForm.validateFields();
    const hasUsd = values.paymentAmountUsd !== undefined && values.paymentAmountUsd !== null;
    const hasCny = values.paymentAmountCny !== undefined && values.paymentAmountCny !== null;

    if (!hasUsd && !hasCny) {
      shipmentPaymentForm.setFields([
        { name: 'paymentAmountUsd', errors: ['USD 或 RMB 至少填写一个'] },
        { name: 'paymentAmountCny', errors: ['USD 或 RMB 至少填写一个'] }
      ]);
      return;
    }

    const paymentInput: ShipmentPaymentUpdateInput = {
      paymentAmountUsd: hasUsd ? Number(values.paymentAmountUsd) : undefined,
      paymentAmountCny: hasCny ? Number(values.paymentAmountCny) : undefined,
      paymentMethod: values.paymentMethod
    };

    setPendingShipmentPayment({ shipment: collectingShipment, input: paymentInput });
  }

  async function confirmShipmentPayment() {
    if (!pendingShipmentPayment) {
      return;
    }

    const { shipment, input } = pendingShipmentPayment;
    const updated = await apiClient.registerShipmentPayment(shipment.id, input);
    setLocalShipments((current) => current.map((item) => (item.id === shipment.id ? updated : item)));
    appendShipmentOperationLog(shipment.id, `登记收款：${formatPaymentSummary(updated.paymentAmountUsd, updated.paymentAmountCny)} / ${updated.paymentMethod ?? '未登记'}`);
    setCollectingShipment(null);
    setPendingShipmentPayment(null);
    shipmentPaymentForm.resetFields();
    setNotice(`已登记收款 ${updated.systemOrderNo}：${formatPaymentSummary(updated.paymentAmountUsd, updated.paymentAmountCny)} / ${updated.paymentMethod ?? '未登记'}`);
  }

  function openBulkTrackingImportModal() {
    setBulkTrackingOpen(true);
    setBulkTrackingFileName(null);
    setBulkTrackingRows([]);
    setBulkTrackingResult(null);
    setBulkTrackingError(null);
  }

  async function handleBulkTrackingFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkTrackingError(null);

    try {
      const rows = parseBulkTrackingWorkbook(await readFileAsArrayBuffer(file), await loadXlsx());
      const result = createBulkTrackingImportResult(rows, localShipments);
      setBulkTrackingRows(rows);
      setBulkTrackingResult(result);
      setBulkTrackingFileName(file.name);
    } catch (error) {
      setBulkTrackingRows([]);
      setBulkTrackingResult(null);
      setBulkTrackingError(error instanceof Error ? error.message : '轨迹表解析失败');
    } finally {
      event.target.value = '';
    }
  }

  async function handleConfirmBulkTrackingImport() {
    if (!bulkTrackingResult || bulkTrackingResult.updates.length === 0) {
      setBulkTrackingError('没有可导入的轨迹记录');
      return;
    }

    const response = await apiClient.importTrackingEvents({ updates: bulkTrackingResult.updates });
    const updatedByShipmentId = new Map(response.updated.map((shipment) => [shipment.id, shipment]));
    setLocalShipments((current) => current.map((shipment) => updatedByShipmentId.get(shipment.id) ?? shipment));
    bulkTrackingResult.updates.forEach((update) => {
      appendShipmentOperationLog(update.shipmentId, `批量添加轨迹：${formatTrackingImportDate(update.trackingDate)} ${update.latestTracking}`);
    });
    setBulkTrackingOpen(false);
    setNotice(`已批量导入轨迹 ${bulkTrackingResult.updates.length} 票，未匹配 ${bulkTrackingResult.unmatchedOrderNos.length} 个单号`);
  }

  async function handleRunCarrierTask(task: CarrierTaskSummary) {
    const response = await apiClient.runCarrierTask(task.id);
    setCarrierTasks((current) => current.map((item) => (item.id === response.task.id ? response.task : item)));
    setLocalShipments((current) => current.map((shipment) => (shipment.id === response.shipment.id ? response.shipment : shipment)));
    setNotice(`轨迹同步成功：${response.shipment.latestTracking}`);
  }

  async function handleRetryCarrierTask(task: CarrierTaskSummary) {
    const response = await apiClient.retryCarrierTask(task.id);
    setCarrierTasks((current) => current.map((item) => (item.id === response.task.id ? response.task : item)));
    setLocalShipments((current) => current.map((shipment) => (shipment.id === response.shipment.id ? response.shipment : shipment)));
    setNotice(`轨迹同步成功：${response.shipment.latestTracking}`);
  }

  async function handleCreateCustomerStatement() {
    const statement = await apiClient.createCustomerStatement({
      customerId: 'c-9409',
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30'
    });
    setCustomerStatements((current) => [statement, ...current.filter((item) => item.id !== statement.id)]);
    setNotice(`对账单草稿 ¥${statement.total}`);
  }

  async function handleCreatePayment() {
    const selectedFees = receivables.filter((fee) => fee.customerName.startsWith('9409-') && !fee.settled);
    const amount = selectedFees.reduce((sum, fee) => sum + fee.amount, 0);
    const response = await apiClient.createPayment({
      customerId: 'c-9409',
      amount,
      feeIds: selectedFees.map((fee) => fee.id),
      note: '收款登记'
    });
    await refreshReceivableAudits();
    setCustomerAccounts((current) => current.map((account) => (account.customerId === response.account.customerId ? response.account : account)));
    setAccountLedger(await apiClient.accountLedger());
    setNotice(`收款已核销 ¥${response.payment.settledAmount}`);
  }

  async function refreshReceivableAudits() {
    setReceivables((await apiClient.receivableAudits({ pageSize: 100 })).rows);
  }

  async function refreshBusinessCostAudits() {
    setBusinessCostAudits((await apiClient.businessCostAudits({ pageSize: 100 })).rows);
  }

  async function refreshPayableAudits() {
    setPayableAudits((await apiClient.payableAudits({ pageSize: 100 })).rows);
  }

  async function handleAuditReceivable(id: string) {
    await apiClient.auditReceivable(id);
    await refreshReceivableAudits();
    setNotice('应收已审核');
  }

  async function handleReverseAuditReceivable(id: string) {
    await apiClient.reverseAuditReceivable(id);
    await refreshReceivableAudits();
    setNotice('应收已反审核');
  }

  async function handleDeleteReceivableAudit(id: string) {
    await apiClient.deleteReceivableAudit(id);
    await refreshReceivableAudits();
    setNotice('应收已删除');
  }

  async function handleBatchAuditReceivables(ids: string[]) {
    if (ids.length === 0) return;
    const result = await apiClient.batchAuditReceivables({ ids });
    await refreshReceivableAudits();
    setNotice(`批量审核完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
  }

  async function handleBatchReverseAuditReceivables(ids: string[]) {
    if (ids.length === 0) return;
    const result = await apiClient.batchReverseAuditReceivables({ ids });
    await refreshReceivableAudits();
    setNotice(`批量反审核完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
  }

  async function handleCreateReceivableAudit(input: ReceivableAuditCreateInput) {
    await apiClient.createReceivableAudit(input);
    await refreshReceivableAudits();
    setNotice('应收已新增');
  }

  async function handleExportReceivableAudits(ids: string[]) {
    const response = await apiClient.exportReceivableAudits({ ids: ids.length ? ids : undefined });
    setNotice(`应收导出已生成：${response.rows.length} 条`);
  }

  async function handleCreateBusinessCostAudit(input: BusinessCostAuditCreateInput) {
    await apiClient.createBusinessCostAudit(input);
    await refreshBusinessCostAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('业务成本已新增');
  }

  async function handleUpdateBusinessCostAudit(id: string, input: BusinessCostAuditUpdateInput) {
    await apiClient.updateBusinessCostAudit(id, input);
    await refreshBusinessCostAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('业务成本已修改');
  }

  async function handleAuditBusinessCost(id: string) {
    await apiClient.auditBusinessCost(id);
    await refreshBusinessCostAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('业务成本已审核');
  }

  async function handleReverseAuditBusinessCost(id: string) {
    await apiClient.reverseAuditBusinessCost(id);
    await refreshBusinessCostAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('业务成本已反审核');
  }

  async function handleDeleteBusinessCostAudit(id: string) {
    await apiClient.deleteBusinessCostAudit(id);
    await refreshBusinessCostAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('业务成本已删除');
  }

  async function handleBatchAuditBusinessCosts(ids: string[]) {
    if (ids.length === 0) return;
    const result = await apiClient.batchAuditBusinessCosts({ ids });
    await refreshBusinessCostAudits();
    await refreshFinanceDetailIfOpen();
    setNotice(`批量审核完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
  }

  async function handleBatchReverseAuditBusinessCosts(ids: string[]) {
    if (ids.length === 0) return;
    const result = await apiClient.batchReverseAuditBusinessCosts({ ids });
    await refreshBusinessCostAudits();
    await refreshFinanceDetailIfOpen();
    setNotice(`批量反审核完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
  }

  async function handleExportBusinessCostAudits(ids: string[]) {
    const response = await apiClient.exportBusinessCostAudits({ ids: ids.length ? ids : undefined });
    setNotice(`业务成本导出已生成：${response.rows.length} 条`);
  }

  async function handleCreatePayableAudit(input: PayableAuditCreateInput) {
    await apiClient.createPayableAudit(input);
    await refreshPayableAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('应付已新增');
  }

  async function handleUpdatePayableAudit(id: string, input: PayableAuditUpdateInput) {
    await apiClient.updatePayableAudit(id, input);
    await refreshPayableAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('应付已修改');
  }

  async function handleAuditPayable(id: string) {
    await apiClient.auditPayable(id);
    await refreshPayableAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('应付已审核');
  }

  async function handleReverseAuditPayable(id: string) {
    await apiClient.reverseAuditPayable(id);
    await refreshPayableAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('应付已反审核');
  }

  async function handleDeletePayableAudit(id: string) {
    await apiClient.deletePayableAudit(id);
    await refreshPayableAudits();
    await refreshFinanceDetailIfOpen();
    setNotice('应付已删除');
  }

  async function handleBatchAuditPayables(ids: string[]) {
    if (ids.length === 0) return;
    const result = await apiClient.batchAuditPayables({ ids });
    await refreshPayableAudits();
    await refreshFinanceDetailIfOpen();
    setNotice(`批量审核完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
  }

  async function handleBatchReverseAuditPayables(ids: string[]) {
    if (ids.length === 0) return;
    const result = await apiClient.batchReverseAuditPayables({ ids });
    await refreshPayableAudits();
    await refreshFinanceDetailIfOpen();
    setNotice(`批量反审核完成：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`);
  }

  async function handleExportPayableAudits(ids: string[]) {
    const response = await apiClient.exportPayableAudits({ ids: ids.length ? ids : undefined });
    setNotice(`应付导出已生成：${response.rows.length} 条`);
  }

  async function handleAiAssist(input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) {
    setAiLoading(true);
    try {
      const response = await apiClient.aiAssist(input);
      setAiResult({ title: input.task ?? input.scenario ?? input.module ?? 'AI 辅助处理', response });
    } catch (error) {
      setAiResult({
        title: input.task ?? 'AI 辅助处理',
        response: {
          provider: 'siliconflow',
          mode: 'mock',
          model: 'local-error',
          content: error instanceof Error ? error.message : 'AI 调用失败，请稍后重试'
        }
      });
    } finally {
      setAiLoading(false);
    }
  }

  const getDetailText = (value: string | undefined | null, fallback = '-') => {
    const text = value?.trim();
    return text ? text : fallback;
  };

  const getShipmentPaymentCurrencyLabel = (shipment: Shipment) => {
    const currencies = [
      shipment.paymentAmountUsd === undefined ? null : 'USD',
      shipment.paymentAmountCny === undefined ? null : 'RMB'
    ].filter(Boolean);
    return currencies.length ? currencies.join(' + ') : '未知';
  };

  const renderShipmentDetailField = (
    label: string,
    value: ReactNode,
    options: { copyText?: string; wide?: boolean; muted?: boolean } = {}
  ) => (
    <div className={options.wide ? 'shipment-detail-field shipment-detail-field-wide' : 'shipment-detail-field'}>
      <span className="shipment-detail-field-label">{label}</span>
      <div className={options.wide ? 'shipment-detail-field-value shipment-detail-long-text' : 'shipment-detail-field-value'}>
        {options.copyText ? <Text copyable={{ text: options.copyText }}>{value}</Text> : <span className={options.muted ? 'shipment-detail-muted-value' : undefined}>{value}</span>}
      </div>
    </div>
  );

  const renderShipmentFinancePanel = (shipment: Shipment, detail?: ShipmentFinanceDetailSummary) => {
    if (!canViewShipmentFinanceDetail) {
      return null;
    }
    return session ? (
      <OrderFeePanel
        apiClient={apiClient}
        role={session.user.role}
        permissions={session.permissions}
        shipment={shipment}
        detail={detail}
        loading={shipmentFinanceLoading}
        onReload={reloadShipmentFinanceDetail}
        renderShipmentOrderNoLink={renderShipmentOrderNoLink}
      />
    ) : null;
  };

  const renderShipmentDetailContent = (shipment: Shipment) => {
    const transferNo = getDetailText(shipment.transferNo, '待获取快递号');
    const agentName = getDetailText(shipment.agentName, '未指定代理');
    const paymentCurrency = getShipmentPaymentCurrencyLabel(shipment);
    const paymentAmount = formatPaymentSummary(shipment.paymentAmountUsd, shipment.paymentAmountCny);
    const paymentMethod = getDetailText(shipment.paymentMethod, '未知');
    const latestTracking = getDetailText(shipment.latestTracking, '暂无轨迹');
    const remark = getDetailText(shipment.remark, '无备注');
    const financeDetail = shipmentFinanceDetails[shipment.id];

    const basicInfo = (
      <>
        <section className="shipment-detail-section">
          <div className="shipment-detail-section-title">单号信息</div>
          <div className="shipment-detail-grid">
            {renderShipmentDetailField('运单号', shipment.systemOrderNo, { copyText: shipment.systemOrderNo })}
            {renderShipmentDetailField('客户单号', shipment.customerOrderNo, { copyText: shipment.customerOrderNo })}
            {renderShipmentDetailField('转单号', transferNo, shipment.transferNo ? { copyText: shipment.transferNo } : { muted: true })}
          </div>
        </section>

        <section className="shipment-detail-section">
          <div className="shipment-detail-section-title">客户与目的地</div>
          <div className="shipment-detail-grid">
            {renderShipmentDetailField('客户名称', shipment.customerName)}
            {renderShipmentDetailField('目的地', shipment.destinationCountry)}
            {renderShipmentDetailField('创建时间', formatBeijingDateTime(shipment.createdAt))}
          </div>
        </section>

        <section className="shipment-detail-section">
          <div className="shipment-detail-section-title">渠道与代理</div>
          <div className="shipment-detail-grid">
            {renderShipmentDetailField('渠道', getDetailText(shipment.channelName || shipment.carrier, '-'))}
            {renderShipmentDetailField('代理', agentName, { muted: !shipment.agentName })}
          </div>
        </section>

        <section className="shipment-detail-section">
          <div className="shipment-detail-section-title">履约与轨迹</div>
          <div className="shipment-detail-grid">
            {renderShipmentDetailField('状态', <StatusTag status={shipment.status} />)}
            {renderShipmentDetailField('时效', calculateTransitTimeLabel(shipment, demoOperationalNow))}
            {renderShipmentDetailField('ETD', shipment.etdAt ? formatBeijingDateTime(shipment.etdAt) : '未填写', { muted: !shipment.etdAt })}
            {renderShipmentDetailField('ETA', shipment.etaAt ? formatBeijingDateTime(shipment.etaAt) : '未填写', { muted: !shipment.etaAt })}
            {renderShipmentDetailField('最新轨迹', latestTracking, { wide: true })}
          </div>
        </section>

        <section className="shipment-detail-section">
          <div className="shipment-detail-section-title">备注</div>
          <div className="shipment-detail-grid">
            {renderShipmentDetailField('备注', remark, { wide: true, muted: remark === '无备注' })}
          </div>
        </section>
      </>
    );

    const packageDetail = (
      <section className="shipment-detail-section">
        <div className="shipment-detail-section-title">重量与件数</div>
        <div className="shipment-detail-grid">
          {renderShipmentDetailField('件数', shipment.packageCount)}
          {renderShipmentDetailField('应收计费重', `${shipment.receivableWeightKg.toFixed(3)} kg`)}
          {renderShipmentDetailField('代理计费重', `${shipment.agentWeightKg.toFixed(3)} kg`)}
        </div>
      </section>
    );

    const financeDetailContent = (
      <>
        <section className="shipment-detail-section">
          <div className="shipment-detail-section-title">费用与收款</div>
          <div className="shipment-detail-grid">
            {renderShipmentDetailField('收款金额', paymentAmount)}
            {renderShipmentDetailField('收款币种', paymentCurrency)}
            {renderShipmentDetailField('收款方式', paymentMethod, { muted: paymentMethod === '未知' })}
          </div>
        </section>

        {renderShipmentFinancePanel(shipment, financeDetail)}
      </>
    );

    return (
      <div className="shipment-detail-layout">
        <section className="shipment-detail-hero">
          <div className="shipment-detail-hero-main">
            <span className="shipment-detail-eyebrow">运单号</span>
            <Text className="shipment-detail-order-no" copyable={{ text: shipment.systemOrderNo }}>
              {shipment.systemOrderNo}
            </Text>
            <Text className="shipment-detail-customer">{shipment.customerName}</Text>
          </div>
          <div className="shipment-detail-hero-meta">
            <StatusTag status={shipment.status} />
            <span>客户单号：{shipment.customerOrderNo}</span>
            <span>转单号：{transferNo}</span>
          </div>
        </section>

        <Tabs
          className="shipment-detail-tabs"
          items={[
            { key: 'basic', label: '基本信息', children: <div className="shipment-detail-tab-panel">{basicInfo}</div> },
            { key: 'package', label: '单件明细', children: <div className="shipment-detail-tab-panel">{packageDetail}</div> },
            { key: 'finance', label: '费用明细', children: <div className="shipment-detail-tab-panel">{financeDetailContent}</div> }
          ]}
        />
      </div>
    );
  };

  if (!session) {
    return <LoginPage apiClient={apiClient} theme={appTheme} onLogin={handleLogin} />;
  }

  if (session.user.role === 'CUSTOMER') {
    return (
      <CustomerPortal
        theme={appTheme}
        user={session.user}
        shipments={localShipments}
        problemTickets={problemTickets}
        receivables={receivables}
        statements={customerStatements}
        accounts={customerAccounts}
        ledger={accountLedger}
        onLogout={handleUnauthorized}
        onCreate={async (input) => {
          const created = await apiClient.createShipment(input);
          upsertLocalShipment(created);
        }}
      />
    );
  }

  return (
    <ConfigProvider theme={appTheme}>
      <Layout className="app-shell">
        <a className="skip-link" href="#main-content">
          跳到主内容
        </a>
        <Sider className="sidebar" width={196}>
          <div className="brand">
            <div className="brand-mark brand-logo-mark">
              <img src="/green-cargo-logo.png" alt="Green Cargo 思远物流标识" width={66} height={36} />
            </div>
            <div>
              <Text className="brand-title">思远物流</Text>
              <Text className="brand-subtitle">AI TMS / OMS</Text>
            </div>
          </div>
          <nav className="side-nav" role="menu" aria-label="员工端主导航">
            {visibleMenuItems.map((item) => {
              const isActive = currentMenuKey === item.key;
              const subNav = sidebarSubNav?.parentKey === item.key ? sidebarSubNav : null;
              const hasSubNav = Boolean(subNav?.items.length);
              const isExpanded = isActive && expandedMenuKey === item.key && hasSubNav;

              return (
                <div className="side-nav-group" key={item.key}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`side-nav-item${isActive ? ' is-active' : ''}`}
                    aria-label={item.label}
                    aria-expanded={hasSubNav ? isExpanded : undefined}
                    onClick={() => handlePrimaryMenuClick(item.key)}
                  >
                    <span className="side-nav-icon">{item.icon}</span>
                    <span className="side-nav-label">{item.label}</span>
                    {hasSubNav ? (
                      <span className="side-nav-chevron" aria-hidden="true">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                    ) : null}
                  </button>
                  {isExpanded && subNav ? (
                    <div className="side-sub-nav" role="group" aria-label={`${item.label}二级功能`}>
                      {subNav.items.map((subItem) => (
                        <button
                          type="button"
                          key={subItem.key}
                          className={`side-sub-nav-item${subItem.key === subNav.activeKey ? ' is-active' : ''}`}
                          aria-current={subItem.key === subNav.activeKey ? 'page' : undefined}
                          onClick={() => {
                            subNav.onChange(subItem.key);
                            setExpandedMenuKey(item.key);
                          }}
                        >
                          <span>{subItem.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
          <Card className="sidebar-card" size="small">
            <Space direction="vertical" size={8}>
              <Flex align="center" gap={8}>
                <Bot size={16} />
                <Text strong>AI 助手在线</Text>
              </Flex>
            </Space>
          </Card>
        </Sider>
        <Layout>
          <Header className="topbar">
            <Space className="business-switch" role="group" aria-label="业务类型">
              <Button
                type="primary"
                onClick={() => {
                  setSelectedStatus('ALL');
                  setActiveMenuKey('workspace');
                }}
              >
                专线 {localShipments.length}
              </Button>
            </Space>
            <Input
              className="global-search"
              prefix={<Search size={16} />}
              placeholder="搜索客户、内部单号、快递号、国家、渠道"
              aria-label="全局搜索客户、内部单号、快递号、国家、渠道"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              allowClear
            />
            <Space>
              <Button icon={<UserCircle size={16} />} onClick={() => void openPersonalCenter()}>
                个人中心
              </Button>
              <Button icon={<LogOut size={16} />} onClick={handleUnauthorized}>
                退出登录
              </Button>
              <Button icon={<ShieldCheck size={16} />}>权限视图</Button>
              <Button
                type="primary"
                icon={<Sparkles size={16} />}
                loading={aiLoading}
                aria-label="打开 AI 工作流建议"
                onClick={() =>
                  handleAiAssist({
                    module: '全局工作流',
                    task: '生成跨模块处理建议',
                    prompt: `请基于当前专线聚合业务、${businessShipments.length}票运单、${aiQueue.length}个风险项，输出今日优先处理建议。`,
                    context: { businessType: 'DEDICATED_LINE_AGGREGATED', shipmentCount: businessShipments.length, riskCount: aiQueue.length }
                  })
                }
              >
                AI 工作流
              </Button>
            </Space>
          </Header>
          <Modal
            title="个人中心"
            open={personalCenterOpen}
            width={920}
            destroyOnHidden
            footer={(
              <Button onClick={() => setPersonalCenterOpen(false)}>关闭</Button>
            )}
            onCancel={() => setPersonalCenterOpen(false)}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Card size="small" title="账号信息">
                  <Form
                    form={profileForm}
                    layout="vertical"
                    initialValues={{
                      name: session.user.name,
                      phone: session.user.phone,
                      gender: (session.user.gender ?? 'UNKNOWN') as StaffGender,
                      nickname: session.user.nickname
                    }}
                  >
                    <Form.Item label="员工账号">
                      <Input value={session.user.username} disabled />
                    </Form.Item>
                    <Form.Item label="当前角色">
                      <Tag color={session.user.role === 'ADMIN' ? 'red' : 'blue'}>{getRoleDisplayName(session.user.role)}</Tag>
                    </Form.Item>
                    <Form.Item name="name" label="姓名" rules={[{ max: 40, message: '姓名最多 40 个字符' }]}>
                      <Input placeholder="请输入姓名" />
                    </Form.Item>
                    <Form.Item name="phone" label="手机号" rules={[{ max: 30, message: '手机号最多 30 个字符' }]}>
                      <Input placeholder="请输入手机号" />
                    </Form.Item>
                    <Form.Item name="gender" label="性别">
                      <Select options={staffGenderOptions} />
                    </Form.Item>
                    <Form.Item name="nickname" label="昵称" rules={[{ max: 40, message: '昵称最多 40 个字符' }]}>
                      <Input placeholder="请输入昵称" />
                    </Form.Item>
                    <Button block onClick={() => void submitProfileUpdate()}>
                      保存个人资料
                    </Button>
                  </Form>
                </Card>
                <Card size="small" title="修改密码" className="personal-center-card">
                  <Form form={passwordForm} layout="vertical">
                    <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      name="newPassword"
                      label="新密码"
                      rules={[
                        { required: true, message: '请输入新密码' },
                        passwordStrengthRule()
                      ]}
                      extra="密码长度需大于或等于 8 位，且至少包含大写字母、小写字母、数字、特殊字符中的 3 类。"
                    >
                      <Input.Password />
                    </Form.Item>
                    <Form.Item
                      name="confirmPassword"
                      label="确认新密码"
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: '请再次输入新密码' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('两次输入的新密码不一致'));
                          }
                        })
                      ]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Button type="primary" block onClick={() => void submitPasswordChange()}>
                      保存新密码
                    </Button>
                  </Form>
                </Card>
              </Col>
              <Col xs={24} lg={16}>
                <Card size="small" title="登录日志">
                  <Table<LoginLogSummary>
                    rowKey="id"
                    size="small"
                    loading={loginLogsLoading}
                    pagination={tenRowTablePagination}
                    dataSource={loginLogs}
                    columns={[
                      { title: '登录时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
                      { title: 'IP', dataIndex: 'ip', width: 140 },
                      { title: '地区', dataIndex: 'region', width: 140 },
                      { title: '设备', dataIndex: 'userAgent', ellipsis: true, render: (value?: string) => value ?? '-' }
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          </Modal>
          <Modal
            title="首次登录需要修改密码"
            open={forcePasswordChangeOpen}
            width={560}
            closable={false}
            maskClosable={false}
            keyboard={false}
            destroyOnHidden
            footer={null}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Alert
                type="warning"
                showIcon
                message="请先修改初始密码"
                description="新建账号或被管理员重置密码后，必须修改初始密码才能继续使用系统。新密码长度需大于或等于 8 位，并至少包含 3 种不同字符类型。"
              />
              {forcePasswordChangeError ? (
                <Alert type="error" showIcon message={forcePasswordChangeError} />
              ) : null}
              <Form form={forcePasswordForm} layout="vertical" onFinish={() => void submitForcedPasswordChange()}>
                <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
                  <Input.Password autoFocus />
                </Form.Item>
                <Form.Item
                  name="newPassword"
                  label="新密码"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    passwordStrengthRule()
                  ]}
                >
                  <Input.Password />
                </Form.Item>
                <Form.Item
                  name="confirmPassword"
                  label="确认新密码"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '请再次输入新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的新密码不一致'));
                      }
                    })
                  ]}
                >
                  <Input.Password />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={forcePasswordChangeLoading}>
                  保存新密码并进入系统
                </Button>
              </Form>
            </Space>
          </Modal>
          <Modal
            title={
              <Space direction="vertical" size={2} className="shipment-detail-title">
                <Text strong>{detailViewingShipment ? `运单详情 · ${detailViewingShipment.systemOrderNo}` : '运单详情'}</Text>
                <Text type="secondary">基础订单信息</Text>
              </Space>
            }
            open={Boolean(detailViewingShipment)}
            width={860}
            className="shipment-detail-modal-shell"
            footer={<Button aria-label="关闭" onClick={() => setDetailViewingShipment(null)}>关闭</Button>}
            onCancel={() => setDetailViewingShipment(null)}
          >
            {detailViewingShipment ? renderShipmentDetailContent(detailViewingShipment) : null}
          </Modal>
          <Modal
            title="运单列设置"
            open={columnSettingsOpen}
            width={620}
            onCancel={() => setColumnSettingsOpen(false)}
            footer={[
              <Button key="show-all" onClick={() => setHiddenShipmentColumns([])}>
                全选
              </Button>,
              <Button key="reset" onClick={resetShipmentColumnOrder}>
                恢复默认
              </Button>,
              <Button key="close" type="primary" onClick={() => setColumnSettingsOpen(false)}>
                完成
              </Button>
            ]}
          >
            <Space direction="vertical" size={12} className="column-settings-panel">
              <Alert
                type="info"
                showIcon
                message="不同岗位可以按自己的查看习惯选择显示字段并调整顺序。保存后会应用到运营工作台、我的订单和渠道排货的运单表格。"
              />
              <div className="column-settings-list">
                {customShipmentColumnOrder.map((key, index) => (
                  <div className="column-settings-row" key={key}>
                    <Space>
                      <Tag color="blue">{index + 1}</Tag>
                      <Checkbox
                        checked={!hiddenShipmentColumns.includes(key)}
                        onChange={(event) => toggleShipmentColumn(key, event.target.checked)}
                      >
                        <Text strong>{shipmentColumnLabels[key]}</Text>
                      </Checkbox>
                    </Space>
                    <Space>
                      <Button size="small" disabled={index === 0} onClick={() => moveShipmentColumn(key, 'up')}>
                        上移
                      </Button>
                      <Button
                        size="small"
                        disabled={index === customShipmentColumnOrder.length - 1}
                        onClick={() => moveShipmentColumn(key, 'down')}
                      >
                        下移
                      </Button>
                    </Space>
                  </div>
                ))}
              </div>
            </Space>
          </Modal>
          <ModuleSubNavContext.Provider value={sidebarSubNavContextValue}>
          <Content id="main-content" className="content" role="main" tabIndex={-1}>
            {aiResult ? (
              <Alert
                className="notice-bar"
                type={aiResult.response.mode === 'live' ? 'success' : 'info'}
                showIcon
                closable
                onClose={() => setAiResult(null)}
                message={`${aiResult.title} · ${aiResult.response.mode === 'live' ? '硅基流动实时输出' : '本地兜底输出'}`}
                description={
                  <Space direction="vertical" size={6}>
                    <Text type="secondary">{aiResult.response.model}</Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{aiResult.response.content}</Text>
                  </Space>
                }
              />
            ) : null}
            {currentMenuKey === 'business' || currentMenuKey === 'orders' ? (
              <FinancePage
                menuMode="business"
                role={session.user.role}
                username={session.user.username}
                permissions={session.permissions}
                receivables={receivables}
                businessCostAudits={businessCostAudits}
                payableAudits={payableAudits}
                statements={customerStatements}
                accounts={customerAccounts}
                ledger={accountLedger}
                notice={notice}
                onCreateStatement={handleCreateCustomerStatement}
                onCreatePayment={handleCreatePayment}
                onAuditReceivable={handleAuditReceivable}
                onReverseAuditReceivable={handleReverseAuditReceivable}
                onDeleteReceivable={handleDeleteReceivableAudit}
                onBatchAuditReceivables={handleBatchAuditReceivables}
                onBatchReverseAuditReceivables={handleBatchReverseAuditReceivables}
                onCreateReceivable={handleCreateReceivableAudit}
                onReceivableRowsChange={setReceivables}
                onExportReceivables={handleExportReceivableAudits}
                onAuditBusinessCost={handleAuditBusinessCost}
                onReverseAuditBusinessCost={handleReverseAuditBusinessCost}
                onDeleteBusinessCost={handleDeleteBusinessCostAudit}
                onBatchAuditBusinessCosts={handleBatchAuditBusinessCosts}
                onBatchReverseAuditBusinessCosts={handleBatchReverseAuditBusinessCosts}
                onCreateBusinessCost={handleCreateBusinessCostAudit}
                onUpdateBusinessCost={handleUpdateBusinessCostAudit}
                onBusinessCostRowsChange={setBusinessCostAudits}
                onExportBusinessCosts={handleExportBusinessCostAudits}
                onAuditPayable={handleAuditPayable}
                onReverseAuditPayable={handleReverseAuditPayable}
                onDeletePayable={handleDeletePayableAudit}
                onBatchAuditPayables={handleBatchAuditPayables}
                onBatchReverseAuditPayables={handleBatchReverseAuditPayables}
                onCreatePayable={handleCreatePayableAudit}
                onUpdatePayable={handleUpdatePayableAudit}
                onPayableRowsChange={setPayableAudits}
                onExportPayables={handleExportPayableAudits}
                shipments={localShipments}
                shipmentFinanceDetails={shipmentFinanceDetails}
                shipmentOperationLogs={shipmentOperationLogs}
                onApproveShipment={(record) => handleFulfillmentAction(record, 'confirm-declare')}
                onRejectShipment={(record) => handleFulfillmentAction(record, 'reject-declare')}
                onEditShipment={(record) => openEditShipmentOperationalModal(record)}
                onViewShipmentLog={(record) => openShipmentLogModal(record, 'operation')}
                onDeleteShipment={handleDeleteShipment}
                renderShipmentFinancePanel={renderShipmentFinancePanel}
                renderShipmentOrderNoLink={renderShipmentOrderNoLink}
                apiClient={apiClient}
                customers={masterData.customers}
                customerContacts={masterData.contacts}
                onCustomerContactsChange={(contacts) => setMasterData((current) => ({ ...current, contacts }))}
                prefillOrderEntryPackageIds={orderEntryPrefillPackageIds}
                onOrderEntryPrefillConsumed={() => setOrderEntryPrefillPackageIds([])}
                renderOrderManagement={() => (
                  <OrdersPage
                    notice={null}
                    shipments={businessShipments}
                    visibleShipments={fulfillmentShipments}
                    columns={fulfillmentColumns}
                    metricCards={fulfillmentAuditMetricCards}
                    selectedStage={selectedFulfillmentStage}
                    onSelectStage={setSelectedFulfillmentStage}
                    activeSection={activeFulfillmentSection}
                    onActiveSectionChange={setActiveFulfillmentSection}
                    outboundOrderOpen={outboundOrderOpen}
                    outboundOrderForm={outboundOrderForm}
                    selectedReceivingChannel={selectedReceivingChannel}
                    onOpenOutboundOrder={openOutboundOrderModal}
                    onCreateOutboundOrder={handleCreateOutboundOrder}
                    onCloseOutboundOrder={() => setOutboundOrderOpen(false)}
                    editingShipment={editingShipment}
                    editShipmentForm={editShipmentForm}
                    editableStatuses={statusOrder}
                    onSubmitShipmentOperationalEdit={handleSubmitShipmentOperationalEdit}
                    onCancelShipmentOperationalEdit={() => setEditingShipment(null)}
                    routingAssignmentShipment={routingAssignmentShipment}
                    routingAssignmentForm={routingAssignmentForm}
                    masterData={masterData}
                    onConfirmRoutingAssignment={handleConfirmRoutingAssignment}
                    onCancelRoutingAssignment={() => {
                      setRoutingAssignmentShipment(null);
                      routingAssignmentForm.resetFields();
                    }}
                    collectingShipment={collectingShipment}
                    shipmentPaymentForm={shipmentPaymentForm}
                    onSubmitShipmentPayment={handleSubmitShipmentPayment}
                    onCancelShipmentPayment={() => setCollectingShipment(null)}
                    pendingShipmentPayment={pendingShipmentPayment}
                    onConfirmShipmentPayment={confirmShipmentPayment}
                    onCancelPendingShipmentPayment={() => setPendingShipmentPayment(null)}
                    logViewingShipment={logViewingShipment}
                    logViewingMode={logViewingMode}
                    shipmentLogs={allShipmentLogs}
                    onCloseShipmentLog={() => setLogViewingShipment(null)}
                    formatPaymentSummary={formatPaymentSummary}
                    onAiAssist={handleAiAssist}
                    aiLoading={aiLoading}
                  />
                )}
              />
            ) : currentMenuKey === 'settings' ? (
              <SettingsPage apiClient={apiClient} onAiAssist={handleAiAssist} aiLoading={aiLoading} />
            ) : currentMenuKey === 'master' ? (
              <MasterDataPage
                apiClient={apiClient}
                masterData={masterData}
                permissions={session.permissions}
                notice={notice}
                onMasterDataChange={setMasterData}
                onNotice={setNotice}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : currentMenuKey === 'pricing' ? (
              <PricingPage
                apiClient={apiClient}
                role={session.user.role}
                notice={notice}
                onNotice={setNotice}
              />
            ) : currentMenuKey === 'finance' ? (
              <FinancePage
                menuMode="finance"
                role={session.user.role}
                username={session.user.username}
                permissions={session.permissions}
                receivables={receivables}
                businessCostAudits={businessCostAudits}
                payableAudits={payableAudits}
                statements={customerStatements}
                accounts={customerAccounts}
                ledger={accountLedger}
                notice={notice}
                onCreateStatement={handleCreateCustomerStatement}
                onCreatePayment={handleCreatePayment}
                onAuditReceivable={handleAuditReceivable}
                onReverseAuditReceivable={handleReverseAuditReceivable}
                onDeleteReceivable={handleDeleteReceivableAudit}
                onBatchAuditReceivables={handleBatchAuditReceivables}
	                onBatchReverseAuditReceivables={handleBatchReverseAuditReceivables}
	                onCreateReceivable={handleCreateReceivableAudit}
	                onReceivableRowsChange={setReceivables}
	                onExportReceivables={handleExportReceivableAudits}
                onAuditBusinessCost={handleAuditBusinessCost}
                onReverseAuditBusinessCost={handleReverseAuditBusinessCost}
                onDeleteBusinessCost={handleDeleteBusinessCostAudit}
                onBatchAuditBusinessCosts={handleBatchAuditBusinessCosts}
                onBatchReverseAuditBusinessCosts={handleBatchReverseAuditBusinessCosts}
                onCreateBusinessCost={handleCreateBusinessCostAudit}
                onUpdateBusinessCost={handleUpdateBusinessCostAudit}
                onBusinessCostRowsChange={setBusinessCostAudits}
                onExportBusinessCosts={handleExportBusinessCostAudits}
                onAuditPayable={handleAuditPayable}
                onReverseAuditPayable={handleReverseAuditPayable}
                onDeletePayable={handleDeletePayableAudit}
                onBatchAuditPayables={handleBatchAuditPayables}
                onBatchReverseAuditPayables={handleBatchReverseAuditPayables}
                onCreatePayable={handleCreatePayableAudit}
                onUpdatePayable={handleUpdatePayableAudit}
                onPayableRowsChange={setPayableAudits}
                onExportPayables={handleExportPayableAudits}
                shipments={localShipments}
                shipmentFinanceDetails={shipmentFinanceDetails}
                shipmentOperationLogs={shipmentOperationLogs}
                onApproveShipment={(record) => handleFulfillmentAction(record, 'confirm-declare')}
                onRejectShipment={(record) => handleFulfillmentAction(record, 'reject-declare')}
                onEditShipment={(record) => openEditShipmentOperationalModal(record)}
                onViewShipmentLog={(record) => openShipmentLogModal(record, 'operation')}
                onDeleteShipment={handleDeleteShipment}
                renderShipmentFinancePanel={renderShipmentFinancePanel}
                renderShipmentOrderNoLink={renderShipmentOrderNoLink}
                apiClient={apiClient}
                customers={masterData.customers}
                customerContacts={masterData.contacts}
                onCustomerContactsChange={(contacts) => setMasterData((current) => ({ ...current, contacts }))}
              />
            ) : currentMenuKey === 'receive' ? (
              <WarehousePage
                apiClient={apiClient}
                role={session.user.role}
                canWriteWarehouse={session.permissions.includes('warehouse:write')}
                shipments={businessShipments}
                notice={notice}
                onDispatch={handleWarehouseDispatchShipment}
                onRoute={handleWarehouseRouteShipment}
                canRouteShipments={session.permissions.includes('routing:write') && !['WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND'].includes(session.user.role)}
                findShipmentBySystemOrderNo={findShipmentBySystemOrderNo}
                renderShipmentOrderNoLink={renderShipmentOrderNoLink}
                onCreateOrderEntry={openOrderEntryFromWarehouse}
              />
            ) : currentMenuKey === 'customerService' ? (
              <CustomerServicePage
                shipments={businessShipments}
                problemTickets={problemTickets}
                apiClient={apiClient}
                onShipmentUpdated={upsertLocalShipment}
                onProblemTicketCreated={(ticket) => setProblemTickets((current) => [ticket, ...current])}
                onProblemTicketUpdated={(ticket) => setProblemTickets((current) => current.map((item) => item.id === ticket.id ? ticket : item))}
                onNotice={setNotice}
              />
            ) : currentMenuKey === 'logisticsTracking' || currentMenuKey === 'tracking' ? (
              <TrackingPage
                shipments={businessShipments}
                tasks={carrierTasks}
                notice={notice}
                onRunTask={handleRunCarrierTask}
                onRetryTask={handleRetryCarrierTask}
                onViewShipment={setDetailViewingShipment}
              />
            ) : currentMenuKey === 'market' || currentMenuKey === 'routing' ? (
              <RoutingPage
                config={{ ...modulePageConfigs.routing!, title: '市场管理', description: '市场看板、待排货和本周排货数据。' }}
                notice={notice}
                stageSummary={fulfillmentStageSummary}
                shipments={routingFulfillmentShipments}
                baseColumns={columns}
                auditStatusColumn={auditStatusColumn}
                selectedStage={selectedRoutingStage}
                onSelectStage={setSelectedRoutingStage}
                assignmentShipment={routingAssignmentShipment}
                assignmentForm={routingAssignmentForm}
                masterData={masterData}
                businessCostAudits={businessCostAudits}
                onOpenAssignment={openRoutingAssignmentModal}
                onCancelAssignment={() => {
                  setRoutingAssignmentShipment(null);
                  routingAssignmentForm.resetFields();
                }}
                onConfirmAssignment={handleConfirmRoutingAssignment}
                onRerouteShipment={handleRerouteShipment}
                onEditShipment={(record) => openEditShipmentOperationalModal(record, 'routing')}
                onViewRoutingLog={(record) => openShipmentLogModal(record, 'routing')}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : currentMenuKey === 'problems' ? (
              <ProblemTicketsPage
                config={modulePageConfigs.problems}
                notice={notice}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : currentMenuKey === 'reports' ? (
              <ReportsPage
                config={modulePageConfigs.reports}
                notice={notice}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : (
              <OperationsPage
                businessWorkspaceConfig={businessWorkspaceConfig}
                businessShipments={businessShipments}
                aiQueue={aiQueue}
                importValidation={importValidation}
                businessType={businessType}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
                selectedStatus={selectedStatus}
                onSelectStatus={setSelectedStatus}
                statusOrder={statusOrder}
                statusCounts={statusCounts}
                shipmentColumnOrderMode={shipmentColumnOrderMode}
                onShipmentColumnOrderModeChange={setShipmentColumnOrderMode}
                shipmentColumnOrderOptions={shipmentColumnOrderOptions}
                onOpenColumnSettings={() => setColumnSettingsOpen(true)}
                workspaceColumns={workspaceColumns}
                visibleShipments={visibleShipments}
                activeWorkspaceSection={activeWorkspaceSection}
                onActiveWorkspaceSectionChange={setActiveWorkspaceSection}
                automationPlan={automationPlan}
                moduleSummary={moduleSummary}
                spotlightModules={spotlightModules}
              />
            )}
            <Modal
              title="批量添加轨迹"
              open={bulkTrackingOpen && currentMenuKey !== 'orders'}
              destroyOnHidden
              okText="确认导入"
              cancelText="取消"
              width={760}
              okButtonProps={{ disabled: !bulkTrackingResult || bulkTrackingResult.updates.length === 0 }}
              onOk={() => void handleConfirmBulkTrackingImport().catch((error) => {
                setBulkTrackingError(error instanceof Error ? error.message : '轨迹导入失败');
              })}
              onCancel={() => setBulkTrackingOpen(false)}
            >
              <Alert
                className="notice-bar"
                type="info"
                showIcon
                message="客户单号为内部单号，转单号为快递号；支持按任一单号匹配。同一单号多条轨迹只取日期最新的一条。"
              />
              <Space direction="vertical" size={12} className="ai-list">
                <div>
                  <label className="upload-label" htmlFor="bulk-tracking-upload-global">
                    导入轨迹表
                  </label>
                  <input
                    id="bulk-tracking-upload-global"
                    aria-label="导入轨迹表"
                    className="file-input"
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={(event) => void handleBulkTrackingFileChange(event)}
                  />
                </div>
                {bulkTrackingFileName ? <Text type="secondary">{bulkTrackingFileName}</Text> : null}
                {bulkTrackingError ? <Alert type="error" showIcon message={bulkTrackingError} /> : null}
                {bulkTrackingResult ? (
                  <>
                    <Space wrap>
                      <Tag color="default">原始轨迹 {bulkTrackingRows.length} 行</Tag>
                      <Tag color="blue">待更新 {bulkTrackingResult.updates.length} 票</Tag>
                      <Tag color={bulkTrackingResult.unmatchedOrderNos.length ? 'orange' : 'green'}>
                        未匹配 {bulkTrackingResult.unmatchedOrderNos.length} 个单号
                      </Tag>
                    </Space>
                    {bulkTrackingResult.unmatchedOrderNos.length ? (
                      <Text type="secondary">未匹配：{bulkTrackingResult.unmatchedOrderNos.join('、')}</Text>
                    ) : null}
                    <Table
                      rowKey="shipmentId"
                      size="small"
                      pagination={tenRowTablePagination}
                      dataSource={bulkTrackingResult.updates.slice(0, 6)}
                      columns={[
                        { title: '匹配单号', dataIndex: 'customerOrderNo' },
                        { title: '轨迹日期', dataIndex: 'trackingDate', render: (value) => formatTrackingImportDate(value) },
                        { title: '将写入最新轨迹', dataIndex: 'latestTracking' }
                      ]}
                    />
                  </>
                ) : null}
              </Space>
            </Modal>
            <Modal
              title="人工修改轨迹与状态"
              open={Boolean(editingShipment) && currentMenuKey !== 'orders'}
              destroyOnHidden
              okText="确认修改"
              cancelText="取消"
              width={560}
              onOk={() => void handleSubmitShipmentOperationalEdit().catch(() => undefined)}
              onCancel={() => {
                setEditingShipment(null);
                setEditingShipmentSource('operation');
                editShipmentForm.resetFields();
              }}
            >
              <Alert
                className="notice-bar"
                type="warning"
                showIcon
                  message={
                    editingShipmentSource === 'routing'
                      ? '从渠道排货入口修改会写入排货日志，并同步覆盖该票最新轨迹、转单号和状态。'
                    : '人工修改会直接覆盖该票最新轨迹、转单号和状态，并写入后端操作记录。'
                }
              />
              <Form form={editShipmentForm} layout="vertical">
                <Form.Item
                  name="latestTracking"
                  label="最新轨迹"
                  rules={[{ required: true, whitespace: true, message: '请输入最新轨迹' }]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="transferNo" label="转单号">
                  <Input placeholder="可直接修改或清空快递号" />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                  <select aria-label="状态" className="native-select">
                    {editableShipmentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {shipmentStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </Form.Item>
              </Form>
            </Modal>
            <Modal
              title={<span id="shipment-operation-log-title-global">{logViewingMode === 'routing' ? '排货日志' : '操作日志'}</span>}
              aria-labelledby="shipment-operation-log-title-global"
              open={Boolean(logViewingShipment) && currentMenuKey !== 'orders'}
              destroyOnHidden
              width={760}
              footer={<Button onClick={() => setLogViewingShipment(null)}>关闭</Button>}
              onCancel={() => setLogViewingShipment(null)}
            >
              <Alert
                className="notice-bar"
                type="info"
                showIcon
                message={
                  logViewingShipment
                    ? `${logViewingShipment.systemOrderNo} ${logViewingMode === 'routing' ? '排货生命周期记录' : '全生命周期操作记录'}`
                    : logViewingMode === 'routing'
                      ? '单票排货生命周期记录'
                      : '单票全生命周期操作记录'
                }
              />
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={shipmentLogs}
                columns={[
                  { title: '操作时间', dataIndex: 'operatedAt', width: 210, render: (value: string) => formatBeijingDateTime(value) },
                  { title: '操作人员', dataIndex: 'operator', width: 130 },
                  { title: '操作动作', dataIndex: 'action' }
                ]}
              />
            </Modal>
          </Content>
          </ModuleSubNavContext.Provider>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
