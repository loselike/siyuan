import type { ChangeEvent, MouseEvent, ReactNode } from 'react';
import { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  App as AntdApp,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileDown,
  LogOut,
  UserCircle,
  Search,
  ShieldCheck,
  Sparkles,
  TicketCheck
} from 'lucide-react';
import {
  calculateTransitTimeLabel,
  createAutomationPlan,
  createBulkTrackingImportResult,
  createShipmentInsights,
  getModuleCoverageSummary,
  productModules,
  shipmentStatusLabels,
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
  type BusinessCostAuditSummary,
  type PayableAuditSummary,
  type PayableFeeSummary,
  type BusinessCostFeeSummary,
  type ReceivableAuditSummary,
  type Shipment,
  type ShipmentFinanceDetailSummary,
  type ShipmentPaymentMethod,
  type ShipmentReviewDetailSummary,
  type ShipmentReviewEventSummary,
  type ShipmentLogisticsTrackingEventSummary,
  type StaffGender,
  type ShipmentStatus
} from '@siyuan/shared';
import type { ProblemTicketCreateInput, ProblemTicketSummary } from '@siyuan/shared/problem-ticket';
import { ApiClient, type AiAssistResponse, type Principal, type ProfileUpdateInput, type Session } from './apiClient';
import { agentFieldLabels } from './modules/shared/agentFieldLabels';
import { LoginPage } from './modules/auth/LoginPage';
import { AppPageBoundary, type PageRenderErrorReport } from './modules/appShell/AppPageBoundary';
import {
  appTheme,
  businessWorkspaceConfigs,
  defaultHiddenShipmentColumns,
  defaultShipmentColumnOrder,
  demoOperationalNow,
  editableShipmentStatuses,
  emptyMasterData,
  getShipmentLifecycleStageCount,
  getStaffModuleHref,
  getStaffSectionHref,
  getRouteCategory,
  importCheckRows,
  isShipmentColumnOrderMode,
  menuItems,
  modulePageConfigs,
  passwordStrengthRule,
  parseStaffAppRoute,
  resolveStaffSectionKey,
  sanitizeShipmentColumnOrder,
  sanitizeHiddenShipmentColumns,
  shipmentHiddenColumnsStorageKey,
  shipmentColumnOrders,
  shipmentColumnOrderStorageKey,
  shipmentCustomColumnOrderStorageKey,
  staffGenderOptions,
  statusOrder,
  type MenuKey,
  type ShipmentColumnKey,
  type ShipmentColumnOrderMode
} from './modules/appShell/config';
import { resolveModuleInitialSection } from './modules/appShell/moduleInitialSection';
import { resolveExpandedMenuAfterPrimaryClick } from './modules/appShell/sidebarMenuState';
import { formatPaymentSummary, fulfillmentActionLabels, getRoleDisplayName, getVisibleStaffMenuKeysByPermissions, resolveFulfillmentAction } from './modules/appShell/utils';
import { CustomerPortal } from './modules/customer/CustomerPortal';
import { resolveCustomerServiceInitialSection } from './modules/customerService/customerServiceNavigation';
import { ProblemTicketCreateModal } from './modules/customerService/ProblemTicketCreateModal';
import { OrderFeePanel } from './modules/finance/orderFee/OrderFeePanel';
import { NotificationCenter } from './modules/notifications/NotificationCenter';
import { OperationsPage } from './modules/operations/OperationsPage';
import {
  canViewOrderManagementAgentDetails,
  OrdersPage,
  lifecycleStatusColor,
  orderManagementStatusLabel,
  type EditShipmentOperationalFormValues,
  type OrdersLifecycleStageKey,
  type OutboundOrderFormValues
} from './modules/orders/OrdersPage';
import { RoutingPage, type RoutingAssignmentFormValues } from './modules/routing/RoutingPage';
import { shouldLoadRoutingFeeNameCatalog } from './modules/routing/routingFeeCatalog';
import {
  getModuleSubNavSignature,
  ModuleSubNavContext,
  type ModuleSubNavContextValue,
  type SidebarSubNavState
} from './modules/shared/ModuleSubWorkspace';
import { MasterDataPage } from './modules/masterData/MasterDataPage';
import { PricingPage } from './modules/pricing/PricingPage';
import { ProblemTicketsPage } from './modules/problemTickets/ProblemTicketsPage';
import { loadProblemTickets } from './modules/problemTickets/problemTicketClient';
import { ReportsPage } from './modules/reports/ReportsPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { TrackingPage } from './modules/tracking/TrackingPage';
import { loadExcel } from './modules/shared/excel';
import { formatTrackingImportDate, parseBulkTrackingWorkbook, readFileAsArrayBuffer } from './modules/tracking/bulkImport';
import { formatBeijingDateTime, formatCurrency, formatUsd } from './modules/shared/format';
import { getCustomerDisplayName } from './modules/shared/customerDisplay';
import { getPendingRoutingApprovalReadiness } from './modules/shared/pendingRoutingColumns';
import { ManagedTable, StatusTag, createNoticeMessage, paginationWhenNeeded, riskWeight, type ManagedTableColumns } from './modules/shared/ui';

const loadCustomerServicePage = () => import('./modules/customerService/CustomerServicePage').then((module) => ({ default: module.CustomerServicePage }));
const loadFinancePage = () => import('./modules/finance/FinancePage').then((module) => ({ default: module.FinancePage }));
const loadWarehousePage = () => import('./modules/warehouse/WarehousePage').then((module) => ({ default: module.WarehousePage }));
const loadMiscFeesPage = () => import('./modules/miscFees/MiscFeesPage').then((module) => ({ default: module.MiscFeesPage }));
const CustomerServicePage = lazy(loadCustomerServicePage);
const FinancePage = lazy(loadFinancePage);
const WarehousePage = lazy(loadWarehousePage);
const MiscFeesPage = lazy(loadMiscFeesPage);

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

function normalizeRoutingAgentChannelName(value: string | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

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
type ShipmentEditSource = 'operation' | 'operationsPool' | 'routing';
function formatNavigationUnreadCount(count: number) {
  return count > 999 ? '999+' : String(count);
}

export function App() {
  const [outboundOrderForm] = Form.useForm<OutboundOrderFormValues>();
  const selectedReceivingChannel = Form.useWatch('carrier', outboundOrderForm);
  const [editShipmentForm] = Form.useForm<EditShipmentOperationalFormValues>();
  const [routingAssignmentForm] = Form.useForm<RoutingAssignmentFormValues>();
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem('siyuan-session');
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const [requestedAppRoute, setRequestedAppRoute] = useState(() => parseStaffAppRoute(window.location.pathname));
  const [pendingNotificationTarget, setPendingNotificationTarget] = useState<{ type: string; id: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('notificationEntityType');
    const id = params.get('notificationEntityId');
    return type && id ? { type, id } : null;
  });
  const [expandedMenuKey, setExpandedMenuKey] = useState<MenuKey | null>('workspace');
  const [sidebarSubNav, setSidebarSubNav] = useState<SidebarSubNavState | null>(null);
  const [navigationUnreadBadges, setNavigationUnreadBadges] = useState<Awaited<ReturnType<ApiClient['appShell']['navigationUnreadBadges']>>['items']>([]);
  const businessType: BusinessType = 'DEDICATED_LINE';
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState(() => resolveModuleInitialSection(
    'workspace',
    requestedAppRoute?.menuKey === 'workspace' ? requestedAppRoute.sectionKey : undefined,
    'shipmentPool'
  ));
  const [activeFulfillmentSection, setActiveFulfillmentSection] = useState('stageBoard');
  const [selectedFulfillmentStage, setSelectedFulfillmentStage] = useState<OrdersLifecycleStageKey>('all');
  const [shipmentColumnOrderMode] = useState<ShipmentColumnOrderMode>(() => {
    const saved = localStorage.getItem(shipmentColumnOrderStorageKey);
    return isShipmentColumnOrderMode(saved) ? saved : 'default';
  });
  const [customShipmentColumnOrder] = useState<ShipmentColumnKey[]>(() => {
    try {
      return sanitizeShipmentColumnOrder(JSON.parse(localStorage.getItem(shipmentCustomColumnOrderStorageKey) ?? 'null'));
    } catch {
      return defaultShipmentColumnOrder;
    }
  });
  const [hiddenShipmentColumns] = useState<ShipmentColumnKey[]>(() => {
    try {
      return sanitizeHiddenShipmentColumns(JSON.parse(localStorage.getItem(shipmentHiddenColumnsStorageKey) ?? 'null'));
    } catch {
      return defaultHiddenShipmentColumns;
    }
  });
  const [keyword, setKeyword] = useState('');
  const [localShipments, setLocalShipments] = useState<Shipment[]>([]);
  const [shipmentOperationLogs, setShipmentOperationLogs] = useState<Record<string, ShipmentOperationLog[]>>({});
  const [problemTickets, setProblemTickets] = useState<ProblemTicketSummary[]>([]);
  const [receivables, setReceivables] = useState<ReceivableAuditSummary[]>([]);
  const [businessCostAudits, setBusinessCostAudits] = useState<BusinessCostAuditSummary[]>([]);
  const [payableAudits, setPayableAudits] = useState<PayableAuditSummary[]>([]);
  const [customerStatements, setCustomerStatements] = useState<CustomerStatementSummary[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccountSummary[]>([]);
  const [accountLedger, setAccountLedger] = useState<AccountLedgerSummary[]>([]);
  const [masterData, setMasterData] = useState<MasterDataSnapshot>(emptyMasterData);
  const [carrierTasks, setCarrierTasks] = useState<CarrierTaskSummary[]>([]);
  const [notice, setNoticeState] = useState<string | null>(null);
  const setNotice = useCallback((message: string | null) => {
    setNoticeState(createNoticeMessage(message));
  }, []);
  const [outboundOrderOpen, setOutboundOrderOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [editingShipmentSource, setEditingShipmentSource] = useState<ShipmentEditSource>('operation');
  const [routingAssignmentShipment, setRoutingAssignmentShipment] = useState<Shipment | null>(null);
  const [pendingRoutingApprovalShipment, setPendingRoutingApprovalShipment] = useState<Shipment | null>(null);
  const [detailViewingShipment, setDetailViewingShipment] = useState<Shipment | null>(null);
  const [shipmentFinancePrewarmed, setShipmentFinancePrewarmed] = useState(false);
  const [shipmentReviewRequestedId, setShipmentReviewRequestedId] = useState<string>();
  const [shipmentFeeCatalogItems, setShipmentFeeCatalogItems] = useState<FinanceCatalogItemSummary[] | null>(null);
  const [fulfillmentProblemShipment, setFulfillmentProblemShipment] = useState<Shipment | null>(null);
  const [shipmentFinanceDetails, setShipmentFinanceDetails] = useState<Record<string, ShipmentFinanceDetailSummary>>({});
  const [shipmentFinanceLoading, setShipmentFinanceLoading] = useState(false);
  const [shipmentReviewDetails, setShipmentReviewDetails] = useState<Record<string, ShipmentReviewDetailSummary>>({});
  const [shipmentReviewDetailLoading, setShipmentReviewDetailLoading] = useState(false);
  const [logViewingShipment, setLogViewingShipment] = useState<Shipment | null>(null);
  const [logViewingMode, setLogViewingMode] = useState<ShipmentLogViewMode>('operation');
  const [bulkTrackingFileName, setBulkTrackingFileName] = useState<string | null>(null);
  const [bulkTrackingRows, setBulkTrackingRows] = useState<BulkTrackingImportRow[]>([]);
  const [bulkTrackingResult, setBulkTrackingResult] = useState<BulkTrackingImportResult | null>(null);
  const [bulkTrackingError, setBulkTrackingError] = useState<string | null>(null);
  const [bulkTrackingImporting, setBulkTrackingImporting] = useState(false);
  const [customerServiceInitialSection, setCustomerServiceInitialSection] = useState('service-dashboard');
  const [prefillOrderEntryPackageIds, setPrefillOrderEntryPackageIds] = useState<string[]>([]);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [personalCenterOpen, setPersonalCenterOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [passwordForm] = Form.useForm();
  const [profileForm] = Form.useForm<ProfileUpdateInput>();
  const [forcePasswordForm] = Form.useForm();
  const [forcePasswordChangeOpen, setForcePasswordChangeOpen] = useState(() => Boolean(session?.user.mustChangePassword));
  const [forcePasswordChangeLoading, setForcePasswordChangeLoading] = useState(false);
  const [forcePasswordChangeError, setForcePasswordChangeError] = useState<string | null>(null);
  const [feeNameCatalogItems, setFeeNameCatalogItems] = useState<FinanceCatalogItemSummary[]>([]);
  const businessWorkspaceConfig = businessWorkspaceConfigs.DEDICATED_LINE;
  const apiClient = useMemo(
    () => new ApiClient(() => session?.accessToken ?? null, handleUnauthorized),
    [session?.accessToken]
  );
  const reportPageRenderError = useCallback((report: PageRenderErrorReport) => {
    void apiClient.appShell.reportPageRenderError(report).catch(() => undefined);
  }, [apiClient]);
  function openOrderEntryFromWarehouse(packageIds: string[]) {
    const ids = Array.from(new Set(packageIds.map((id) => id.trim()).filter(Boolean)));
    if (!ids.length) return;
    setPrefillOrderEntryPackageIds(ids);
    navigateToAppRoute('business', 'finance-entry');
  }
  const visibleMenuKeys = useMemo(
    () => (session && session.user.role !== 'CUSTOMER' ? getVisibleStaffMenuKeysByPermissions(session.permissions ?? [], session.user.role) : []),
    [session]
  );
  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => visibleMenuKeys.includes(item.key)),
    [visibleMenuKeys]
  );
  useEffect(() => {
    if (!session) return;
    const preload = () => {
      const preloadTasks: Promise<unknown>[] = [];
      if (visibleMenuKeys.includes('customerService')) preloadTasks.push(loadCustomerServicePage());
      if (visibleMenuKeys.includes('business') || visibleMenuKeys.includes('finance')) preloadTasks.push(loadFinancePage());
      if (visibleMenuKeys.includes('receive')) preloadTasks.push(loadWarehousePage());
      if (visibleMenuKeys.includes('miscFees')) preloadTasks.push(loadMiscFeesPage());
      void Promise.allSettled(preloadTasks);
    };
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1_500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = globalThis.setTimeout(preload, 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, [session, visibleMenuKeys]);
  const navigationUnreadByKey = useMemo(
    () => new Map(navigationUnreadBadges.map((item) => [`${item.moduleKey}:${item.sectionKey ?? ''}`, item.unreadCount])),
    [navigationUnreadBadges]
  );
  const currentMenuKey = useMemo<MenuKey>(
    () =>
      session && session.user.role !== 'CUSTOMER' && requestedAppRoute?.menuKey && visibleMenuKeys.includes(requestedAppRoute.menuKey)
        ? requestedAppRoute.menuKey
        : visibleMenuKeys[0] ?? 'workspace',
    [requestedAppRoute, session, visibleMenuKeys]
  );
  const requestedSectionKey = requestedAppRoute?.menuKey === currentMenuKey ? requestedAppRoute.sectionKey : undefined;
  const resolvedRouteSectionKey = sidebarSubNav?.parentKey === currentMenuKey
    ? resolveStaffSectionKey(currentMenuKey, requestedSectionKey, sidebarSubNav.items.map((item) => item.key))
    : undefined;
  const activeSectionKey = resolvedRouteSectionKey
    ?? (sidebarSubNav?.parentKey === currentMenuKey ? sidebarSubNav.activeKey : undefined);
  const orderManagementOwnsShipmentOverlays = currentMenuKey === 'orders'
    || (currentMenuKey === 'business' && activeSectionKey === 'order-management');
  const navigateToAppRoute = useCallback((menuKey: MenuKey, sectionKey?: string, mode: 'push' | 'replace' = 'push') => {
    const href = getStaffSectionHref(menuKey, sectionKey);
    const route = parseStaffAppRoute(href) ?? { menuKey, sectionKey };
    if (window.location.pathname !== href) {
      window.history[mode === 'replace' ? 'replaceState' : 'pushState'](null, '', href);
    }
    setRequestedAppRoute(route);
    setNotice(null);
    if (menuKey === 'customerService' && !sectionKey) {
      setCustomerServiceInitialSection('service-dashboard');
    }
    setExpandedMenuKey(menuKey);
  }, [setNotice]);
  const handleNotificationNavigate = useCallback((targetPath: string) => {
    const targetUrl = new URL(targetPath, window.location.origin);
    if (targetUrl.origin !== window.location.origin) {
      message.warning('通知跳转地址无效');
      return;
    }
    const targetRoute = parseStaffAppRoute(targetUrl.pathname);
    if (!targetRoute || !visibleMenuKeys.includes(targetRoute.menuKey)) {
      message.warning('当前账号没有该业务页面的访问权限');
      return;
    }
    navigateToAppRoute(targetRoute.menuKey, targetRoute.sectionKey);
    if (targetUrl.search) {
      window.history.replaceState(null, '', `${targetUrl.pathname}${targetUrl.search}`);
    }
    const targetType = targetUrl.searchParams.get('notificationEntityType');
    const targetId = targetUrl.searchParams.get('notificationEntityId');
    setPendingNotificationTarget(targetType && targetId ? { type: targetType, id: targetId } : null);
  }, [navigateToAppRoute, visibleMenuKeys]);
  const consumePendingNotificationTarget = useCallback((target: { type: string; id: string }) => {
    setPendingNotificationTarget((current) => current?.type === target.type && current.id === target.id ? null : current);
    const currentUrl = new URL(window.location.href);
    if (
      currentUrl.searchParams.get('notificationEntityType') === target.type
      && currentUrl.searchParams.get('notificationEntityId') === target.id
    ) {
      currentUrl.searchParams.delete('notificationEntityType');
      currentUrl.searchParams.delete('notificationEntityId');
      window.history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}`);
    }
  }, []);
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
      routeKey: `${currentMenuKey}:${requestedSectionKey ?? ''}`,
      requestedSectionKey,
      resolveSectionKey: (sectionKeys) => resolveStaffSectionKey(currentMenuKey, requestedSectionKey, sectionKeys),
      navigateToSection: (sectionKey, mode) => navigateToAppRoute(currentMenuKey, sectionKey, mode),
      register: registerSidebarSubNav,
      clear: clearSidebarSubNav
    }),
    [clearSidebarSubNav, currentMenuKey, navigateToAppRoute, registerSidebarSubNav, requestedSectionKey]
  );
  const handlePrimaryMenuClick = useCallback((event: MouseEvent<globalThis.HTMLAnchorElement>, key: MenuKey) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const clickResult = resolveExpandedMenuAfterPrimaryClick({
      clickedKey: key,
      currentKey: currentMenuKey,
      expandedKey: expandedMenuKey,
      hasSubNav: sidebarSubNav?.parentKey === key && sidebarSubNav.items.length > 0
    });
    setExpandedMenuKey(clickResult.expandedKey);
    if (!clickResult.shouldNavigate) return;
    navigateToAppRoute(key);
  }, [currentMenuKey, expandedMenuKey, navigateToAppRoute, sidebarSubNav]);
  const handleSecondaryMenuClick = useCallback((event: MouseEvent<globalThis.HTMLAnchorElement>, menuKey: MenuKey, sectionKey: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateToAppRoute(menuKey, sectionKey);
  }, [navigateToAppRoute]);
  const handleBrandClick = () => {
    navigateToAppRoute('workspace', 'shipmentPool');
  };
  const canViewShipmentFinanceDetail = session?.user.role === 'ADMIN' || session?.user.role === 'FINANCE' || session?.user.role === 'OPERATOR';

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
    void refreshWorkspace(apiClient, session.user, session.permissions ?? []);
  }, [apiClient, session]);

  useEffect(() => {
    if (!session || session.user.role === 'CUSTOMER') {
      setNavigationUnreadBadges([]);
      return;
    }
    let cancelled = false;
    apiClient.appShell.navigationUnreadBadges().then((response) => {
      if (!cancelled) setNavigationUnreadBadges(response.items);
    }).catch(() => {
      if (!cancelled) setNavigationUnreadBadges([]);
    });
    return () => { cancelled = true; };
  }, [apiClient, session]);

  useEffect(() => {
    if (!session || session.user.role === 'CUSTOMER' || !activeSectionKey) return;
    const sectionKey = activeSectionKey;
    void apiClient.appShell.markNavigationRead({ moduleKey: currentMenuKey, sectionKey }).then(() => {
      setNavigationUnreadBadges((current) => current.map((item) => {
        if (item.moduleKey === currentMenuKey && item.sectionKey === sectionKey) return { ...item, unreadCount: 0, displayCount: '0' };
        if (item.moduleKey === currentMenuKey && !item.sectionKey) {
          const childTotal = current
            .filter((child) => child.moduleKey === currentMenuKey && child.sectionKey && child.sectionKey !== sectionKey)
            .reduce((total, child) => total + child.unreadCount, 0);
          return { ...item, unreadCount: childTotal, displayCount: childTotal > 999 ? '999+' : String(childTotal) };
        }
        return item;
      }));
    }).catch(() => undefined);
  }, [activeSectionKey, apiClient, currentMenuKey, session]);

  useEffect(() => {
    if (!session || session.user.role === 'CUSTOMER') {
      return;
    }
    const requestedMenuKey = requestedAppRoute?.menuKey;
    const nextMenuKey = requestedMenuKey && visibleMenuKeys.includes(requestedMenuKey)
      ? requestedMenuKey
      : visibleMenuKeys[0] ?? 'workspace';
    if (requestedMenuKey && !visibleMenuKeys.includes(requestedMenuKey)) {
      const fallbackHref = getStaffModuleHref(nextMenuKey);
      if (window.location.pathname !== fallbackHref) {
        window.history.replaceState(null, '', fallbackHref);
      }
      setRequestedAppRoute({ menuKey: nextMenuKey });
      setNotice('当前账号无权限访问该模块，已跳转至可访问模块。');
    }
  }, [requestedAppRoute, session, setNotice, visibleMenuKeys]);

  useEffect(() => {
    const handlePopState = () => {
      const route = parseStaffAppRoute(window.location.pathname);
      setRequestedAppRoute(route);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!session || session.user.role === 'CUSTOMER' || !shouldLoadRoutingFeeNameCatalog(currentMenuKey)) {
      setFeeNameCatalogItems([]);
      return;
    }

    let cancelled = false;
    apiClient
      .financeCatalog({ category: 'FEE_NAME', enabledOnly: true })
      .then((response) => {
        if (!cancelled) {
          setFeeNameCatalogItems(Array.isArray(response.items) ? response.items : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeeNameCatalogItems([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, currentMenuKey, session]);

  useEffect(() => {
    setExpandedMenuKey(currentMenuKey);
  }, [currentMenuKey]);

  useEffect(() => {
    if (!detailViewingShipment || !canViewShipmentFinanceDetail) {
      return;
    }

    let cancelled = false;
    const prewarm = () => {
      if (!cancelled) setShipmentFinancePrewarmed(true);
    };
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prewarm, { timeout: 1_200 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }
    const timeoutId = globalThis.setTimeout(prewarm, 180);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [canViewShipmentFinanceDetail, detailViewingShipment]);

  useEffect(() => {
    if (
      !detailViewingShipment
      || !canViewShipmentFinanceDetail
      || !shipmentFinancePrewarmed
      || shipmentReviewRequestedId === detailViewingShipment.id
      || shipmentFinanceDetails[detailViewingShipment.id]
    ) {
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
  }, [
    apiClient,
    canViewShipmentFinanceDetail,
    detailViewingShipment,
    shipmentFinanceDetails,
    shipmentFinancePrewarmed,
    shipmentReviewRequestedId
  ]);

  useEffect(() => {
    if (!detailViewingShipment || !canViewShipmentFinanceDetail || !shipmentFinancePrewarmed || shipmentFeeCatalogItems !== null) {
      return;
    }
    let cancelled = false;
    apiClient
      .financeCatalog({ enabledOnly: true })
      .then((response) => {
        if (!cancelled) setShipmentFeeCatalogItems(Array.isArray(response.items) ? response.items : []);
      })
      .catch(() => {
        if (!cancelled) setShipmentFeeCatalogItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, canViewShipmentFinanceDetail, detailViewingShipment, shipmentFeeCatalogItems, shipmentFinancePrewarmed]);

  useEffect(() => {
    if (!detailViewingShipment || shipmentReviewRequestedId !== detailViewingShipment.id || shipmentReviewDetails[detailViewingShipment.id]) {
      return;
    }
    let cancelled = false;
    setShipmentReviewDetailLoading(true);
    apiClient
      .shipmentReviewDetail(detailViewingShipment.id)
      .then((detail) => {
        if (!cancelled) {
          setShipmentReviewDetails((current) => ({ ...current, [detail.shipment.id]: detail }));
          if (canViewShipmentFinanceDetail) {
            setShipmentFinanceDetails((current) => current[detail.shipment.id]
              ? current
              : { ...current, [detail.shipment.id]: detail.finance });
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setShipmentReviewDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, canViewShipmentFinanceDetail, detailViewingShipment, shipmentReviewDetails, shipmentReviewRequestedId]);

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

  async function refreshWorkspace(client = apiClient, user = session?.user, permissions = session?.permissions ?? []) {
    const permissionSet = new Set(permissions);
    const canReadFinance = permissions.some((permission) => permission.startsWith('finance:'));
    const canReadBusinessCosts = permissionSet.has('finance:business-cost:read');
    const canReadInternalFinance = permissionSet.has('finance:payable:read');
    const canReadCarrierTasks = permissionSet.has('tracking:carrier-task:view') && user?.role !== 'CUSTOMER';
    const canReadMasterData = permissions.some((permission) => permission.startsWith('master-data:') && permission.endsWith(':read'));
    const canReadProblems = permissionSet.has('customer-service:problem:view');
    const canReadBusinessShipments = permissionSet.has('business:shipment:list');
    const canReadWarehouseDispatch = permissionSet.has('warehouse:dispatch-pending:view') || permissionSet.has('warehouse:outbounded:view');
    const [nextShipments, nextTickets] = await Promise.all([
      canReadBusinessShipments
        ? client.shipments()
        : canReadWarehouseDispatch
          ? client.warehouseDispatchShipments()
          : Promise.resolve([]),
      canReadProblems ? loadProblemTickets(client) : Promise.resolve([])
    ]);
    setLocalShipments(nextShipments);
    setProblemTickets(nextTickets);
    if (canReadFinance || canReadBusinessCosts) {
      const [nextReceivables, nextBusinessCosts, nextPayables, nextStatements, nextAccounts, nextLedger] = await Promise.all([
        canReadFinance ? client.receivableAudits({ pageSize: 100 }).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
        canReadBusinessCosts ? client.businessCostAudits({ pageSize: 100 }).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
        canReadInternalFinance ? client.payableAudits({ pageSize: 100 }).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
        canReadFinance ? client.customerStatements().catch(() => []) : Promise.resolve([]),
        canReadFinance ? client.customerAccounts().catch(() => []) : Promise.resolve([]),
        canReadFinance ? client.accountLedger().catch(() => []) : Promise.resolve([])
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
        setCarrierTasks(await client.carrierTaskQuery.carrierTasks());
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
    setPersonalCenterOpen(false);
    const requiresPasswordChange = Boolean(nextSession.user.mustChangePassword);
    setForcePasswordChangeOpen(requiresPasswordChange);
    setForcePasswordChangeError(null);
    setAiResult(null);
    setNotice(null);
    if (requiresPasswordChange) {
      return;
    }
    const loginClient = new ApiClient(() => nextSession.accessToken, handleUnauthorized);
    await refreshWorkspace(loginClient, nextSession.user, nextSession.permissions ?? []);
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
        await refreshWorkspace(apiClient, nextUser, session.permissions ?? []);
      }
      setNotice('密码已修改，可以继续使用系统');
    } catch (error) {
      setForcePasswordChangeError(error instanceof Error ? error.message : '密码修改失败，请检查后重试');
    } finally {
      setForcePasswordChangeLoading(false);
    }
  }

  const businessShipments = useMemo(
    () => localShipments,
    [localShipments]
  );
  const findShipmentBySystemOrderNo = useCallback(
    (systemOrderNo?: string) =>
      systemOrderNo ? localShipments.find((shipment) => shipment.systemOrderNo === systemOrderNo) : undefined,
    [localShipments]
  );
  const openShipmentDetail = useCallback((shipment: Shipment) => {
    setShipmentFinancePrewarmed(false);
    setShipmentReviewRequestedId(undefined);
    setDetailViewingShipment(shipment);
  }, []);
  useEffect(() => {
    if (pendingNotificationTarget?.type !== 'SHIPMENT') return;
    const shipment = localShipments.find((item) => item.id === pendingNotificationTarget.id);
    if (!shipment) return;
    openShipmentDetail(shipment);
    consumePendingNotificationTarget(pendingNotificationTarget);
  }, [consumePendingNotificationTarget, localShipments, openShipmentDetail, pendingNotificationTarget]);
  const closeShipmentDetail = useCallback(() => {
    setDetailViewingShipment(null);
    setShipmentFinancePrewarmed(false);
    setShipmentReviewRequestedId(undefined);
  }, []);
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
                onClick={() => openShipmentDetail(shipment)}
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
    [findShipmentBySystemOrderNo, openShipmentDetail]
  );
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
  const fulfillmentAuditMetricCards = [
    {
      title: '全部运单',
      value: getShipmentLifecycleStageCount(businessShipments, 'all'),
      extra: '本人全生命周期运单',
      icon: <ClipboardCheck />
    },
    {
      title: '仓内待出',
      value: getShipmentLifecycleStageCount(businessShipments, 'warehouse'),
      extra: '入库、排货或待出库',
      icon: <ShieldCheck />
    },
    {
      title: '运输中',
      value: getShipmentLifecycleStageCount(businessShipments, 'inTransit'),
      extra: '已出库至签收前',
      icon: <TicketCheck />
    },
    {
      title: '问题件',
      value: getShipmentLifecycleStageCount(businessShipments, 'problem'),
      extra: '需要持续跟进处理',
      icon: <CircleDollarSign />
    }
  ];
  const allShipmentLogs = logViewingShipment
    ? [
        {
          id: `initial-${logViewingShipment.id}`,
          operatedAt: logViewingShipment.createdAt,
          operator: '系统',
          action: '创建/导入运单'
        },
        ...(logViewingShipment.status === 'WAITING_SORT' || logViewingShipment.routedAt || logViewingShipment.routeReturnedAt
          ? [{
              id: `routing-enter-${logViewingShipment.id}`,
              operatedAt: logViewingShipment.reviewedAt ?? logViewingShipment.businessReviewedAt ?? logViewingShipment.createdAt,
              operator: logViewingShipment.reviewedBy ?? logViewingShipment.businessReviewedBy ?? '系统',
              action: '渠道排货：进入待排货'
            }]
          : []),
        ...(shipmentOperationLogs[logViewingShipment.id] ?? [])
      ]
    : [];
  const shipmentLogs = logViewingMode === 'routing'
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

  const shipmentColumnMap: Record<ShipmentColumnKey, ManagedTableColumns<Shipment>[number]> = {
    createdAt: {
      key: 'createdAt',
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 145,
      render: (value: string) => formatBeijingDateTime(value),
      recordDetail: { value: (record) => formatBeijingDateTime(record.createdAt) },
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt)
    },
    customerName: {
      key: 'customerName',
      title: '客户名称',
      dataIndex: 'customerName',
      width: 170,
      render: (_: string, record) => <Text strong>{getCustomerDisplayName(record)}</Text>,
      recordDetail: { value: (record) => getCustomerDisplayName(record), span: 2 }
    },
    salesperson: {
      key: 'salesperson',
      title: '业务员归属',
      dataIndex: 'salesperson',
      width: 120,
      render: (value?: string) => <Text type={value ? undefined : 'secondary'}>{value || '未分配'}</Text>,
      recordDetail: { value: (record) => record.salesperson || '未分配' }
    },
    systemOrderNo: {
      key: 'systemOrderNo',
      title: '出货单号',
      dataIndex: 'systemOrderNo',
      width: 150,
      render: (value: string, record) => renderShipmentOrderNoLink(value, { shipment: record, subtitle: '点击查看详情' }),
      recordDetail: { value: (record) => record.systemOrderNo || '-' }
    },
    transferNo: {
      key: 'transferNo',
      title: '转单号',
      dataIndex: 'transferNo',
      width: 155,
      render: (value?: string) => <Text type={value ? undefined : 'secondary'}>{value ?? '待获取快递号'}</Text>,
      recordDetail: { value: (record) => record.transferNo || '待获取快递号' }
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
      ),
      recordDetail: {
        value: (record) => (
          <Space>
            <span>{record.destinationCountry || '-'}</span>
            {record.isRemoteArea ? <Tag color="gold">偏远</Tag> : null}
          </Space>
        )
      }
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
      },
      recordDetail: { value: (record) => session?.user.role === 'OPERATOR' ? getRouteCategory(record.channelName) : (record.channelName || record.carrier || '-') }
    },
    agent: {
      key: 'agent',
      title: agentFieldLabels.detailedCompanyName,
      width: 190,
      render: (_, record) => <Text type={session?.user.role === 'OPERATOR' ? 'secondary' : undefined}>{session?.user.role === 'OPERATOR' ? '按权限隐藏' : record.agentName}</Text>,
      recordDetail: { value: (record) => session?.user.role === 'OPERATOR' ? '按权限隐藏' : (record.agentName || '-') }
    },
    packageCount: {
      key: 'packageCount',
      title: '件数',
      dataIndex: 'packageCount',
      width: 70,
      align: 'right',
      recordDetail: { value: (record) => record.packageCount }
    },
    weight: {
      key: 'weight',
      title: '应收/代理计费重',
      width: 140,
      render: (_, record) => `${record.receivableWeightKg.toFixed(3)} / ${record.agentWeightKg.toFixed(3)}`,
      recordDetail: { value: (record) => `${record.receivableWeightKg.toFixed(3)} / ${record.agentWeightKg.toFixed(3)} kg` }
    },
    latestTracking: {
      key: 'latestTracking',
      title: '最新物流轨迹',
      dataIndex: 'latestTracking',
      width: 160,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text>{value}</Text>
          <Text type={record.trackingStaleDays >= 5 ? 'danger' : 'secondary'}>
            {record.trackingStaleDays ? `${record.trackingStaleDays} 天未更新` : '今日更新'}
          </Text>
        </Space>
      ),
      recordDetail: {
        value: (record) => (
          <Space direction="vertical" size={0}>
            <Text>{record.latestTracking || '-'}</Text>
            <Text type={record.trackingStaleDays >= 5 ? 'danger' : 'secondary'}>
              {record.trackingStaleDays ? `${record.trackingStaleDays} 天未更新` : '今日更新'}
            </Text>
          </Space>
        )
      }
    },
    status: {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: ShipmentStatus) => <StatusTag status={status} />,
      recordDetail: { value: (record) => <StatusTag status={record.status} /> }
    },
    transitTime: {
      key: 'transitTime',
      title: '时效',
      width: 110,
      render: (_, record) => <Text>{calculateTransitTimeLabel(record, demoOperationalNow)}</Text>,
      recordDetail: { value: (record) => calculateTransitTimeLabel(record, demoOperationalNow) }
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
      ),
      recordDetail: {
        value: (record) => (
          <Space direction="vertical" size={0}>
            <Text>{record.paymentAmountUsd === undefined ? 'USD 未知' : formatUsd(record.paymentAmountUsd)}</Text>
            <Text type="secondary">{record.paymentAmountCny === undefined ? 'RMB 未知' : formatCurrency(record.paymentAmountCny)}</Text>
          </Space>
        )
      }
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
      },
      recordDetail: {
        value: (record) => {
          const currencies = [record.paymentAmountUsd === undefined ? null : 'USD', record.paymentAmountCny === undefined ? null : 'RMB'].filter(Boolean);
          return <Tag color={currencies.length ? 'green' : 'default'}>{currencies.length ? currencies.join(' + ') : '未知'}</Tag>;
        }
      }
    },
    paymentMethod: {
      key: 'paymentMethod',
      title: '收款方式',
      dataIndex: 'paymentMethod',
      width: 110,
      render: (value?: ShipmentPaymentMethod) => <Tag color={value ? 'blue' : 'default'}>{value ?? '未知'}</Tag>,
      recordDetail: { value: (record) => <Tag color={record.paymentMethod ? 'blue' : 'default'}>{record.paymentMethod ?? '未知'}</Tag> }
    },
    remark: {
      key: 'remark',
      title: '备注',
      dataIndex: 'remark',
      width: 180,
      render: (value?: string) => <Text type={value ? undefined : 'secondary'}>{value || '无备注'}</Text>,
      recordDetail: { value: (record) => record.remark || '无备注', span: 3 }
    }
  };
  const activeShipmentColumnOrder =
    shipmentColumnOrderMode === 'custom' ? customShipmentColumnOrder : shipmentColumnOrders[shipmentColumnOrderMode];
  const visibleShipmentColumnOrder = activeShipmentColumnOrder.filter((key) => !hiddenShipmentColumns.includes(key));
  const visibleShipmentColumnKeys: ShipmentColumnKey[] = visibleShipmentColumnOrder.length ? visibleShipmentColumnOrder : ['systemOrderNo'];
  const columns: ManagedTableColumns<Shipment> = visibleShipmentColumnKeys.map((key) => shipmentColumnMap[key]);
  const fulfillmentTrackingColumn: ManagedTableColumns<Shipment>[number] = {
    ...shipmentColumnMap.latestTracking,
    key: 'trackingStatus',
    title: '轨迹状态'
  };
  const showFulfillmentAgentDetails = session ? canViewOrderManagementAgentDetails(session.user.role) : false;
  const fulfillmentBaseColumns = columns.filter(
    (column) => column.key !== 'latestTracking'
      && column.key !== 'status'
      && (showFulfillmentAgentDetails || column.key !== 'agent')
  );
  const fulfillmentTrackingInsertIndex = fulfillmentBaseColumns.findIndex((column) => column.key === 'channel');
  const fulfillmentDisplayColumns =
    fulfillmentTrackingInsertIndex >= 0
      ? [
          ...fulfillmentBaseColumns.slice(0, fulfillmentTrackingInsertIndex + 1),
          fulfillmentTrackingColumn,
          ...fulfillmentBaseColumns.slice(fulfillmentTrackingInsertIndex + 1)
        ]
      : [fulfillmentTrackingColumn, ...fulfillmentBaseColumns];
  const auditStatusColumn: ManagedTableColumns<Shipment>[number] = {
    key: 'auditStatus',
    title: '审核状态',
    width: 110,
    render: (_, record) => {
      if (record.status === 'DRAFT' || record.status === 'REVIEW_PENDING') {
        return <Tag color="warning">待审核</Tag>;
      }
      if (record.status === 'REVIEW_REJECTED') {
        return <Tag color="red">未通过</Tag>;
      }
      return <Tag color="green">已通过</Tag>;
    },
    recordDetail: {
      value: (record) => {
        if (record.status === 'DRAFT' || record.status === 'REVIEW_PENDING') return <Tag color="warning">待审核</Tag>;
        if (record.status === 'REVIEW_REJECTED') return <Tag color="red">未通过</Tag>;
        return <Tag color="green">已通过</Tag>;
      }
    }
  };
  const lifecycleStatusColumn: ManagedTableColumns<Shipment>[number] = {
    key: 'lifecycleStatus',
    title: '当前节点',
    width: 126,
    render: (_, record) => (
      <Tag color={record.hasProblemTicket && !['PROBLEM', 'STUCK'].includes(record.status) ? 'error' : lifecycleStatusColor(record.status)}>
        {record.hasProblemTicket && !['PROBLEM', 'STUCK'].includes(record.status) ? '有问题件' : orderManagementStatusLabel(record.status)}
      </Tag>
    ),
    recordDetail: {
      value: (record) => (
        <Tag color={record.hasProblemTicket && !['PROBLEM', 'STUCK'].includes(record.status) ? 'error' : lifecycleStatusColor(record.status)}>
          {record.hasProblemTicket && !['PROBLEM', 'STUCK'].includes(record.status) ? '有问题件' : orderManagementStatusLabel(record.status)}
        </Tag>
      )
    }
  };

  const fulfillmentColumns: ManagedTableColumns<Shipment> = [
    ...fulfillmentDisplayColumns,
    lifecycleStatusColumn,
    auditStatusColumn,
    {
      key: 'actions',
      title: '操作',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
	          {(() => {
            const actions: FulfillmentAction[] = [];
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
                {record.status === 'WAITING_SORT' && (session?.user.role === 'ADMIN' || session?.permissions.includes('business:review:reverse') || session?.permissions.includes('market:pending-routing:update')) ? (
                  <Popconfirm title="确认反审核该运单？" description="订单将回到待审核运单，待排货草稿会一并解除。" okText="反审核" cancelText="取消" onConfirm={() => void handleReverseShipmentReview(record)}>
                    <Button size="small" danger>反审核</Button>
                  </Popconfirm>
                ) : null}
                <Button size="small" onClick={() => openShipmentLogModal(record, 'operation')}>
                  操作日志
                </Button>
                {record.status === 'WAITING_DISPATCH'
                  && record.invoiceTemplateAvailable
                  && (session?.user.role === 'ADMIN' || session?.permissions.includes('business:order-entry:invoice-upload')) ? (
                    <Button size="small" icon={<FileDown size={14} />} onClick={() => void handleDownloadShipmentInvoiceTemplate(record)}>
                      下载发票模板
                    </Button>
                  ) : null}
              </>
            );
          })()}
        </Space>
      )
    }
  ];
  const fulfillmentMatrixSourceColumns: ManagedTableColumns<Shipment> = [
    ...defaultShipmentColumnOrder
      .filter((key) => key !== 'latestTracking' && key !== 'status' && (showFulfillmentAgentDetails || key !== 'agent'))
      .map((key) => shipmentColumnMap[key]),
    fulfillmentTrackingColumn,
    lifecycleStatusColumn,
    auditStatusColumn,
    fulfillmentColumns[fulfillmentColumns.length - 1]
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
    if (action === 'create-problem') {
      setFulfillmentProblemShipment(record);
      return;
    }
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
              : { ...record, ...actionResult.patch };

    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, actionResult.message);
    setNotice(actionResult.message);
  }

  async function submitFulfillmentProblem(input: ProblemTicketCreateInput) {
    if (!fulfillmentProblemShipment) throw new Error('请选择需要创建问题件的运单');
    await apiClient.createBusinessProblemTicket(fulfillmentProblemShipment.id, input);
    setLocalShipments((current) => current.map((shipment) => shipment.id === fulfillmentProblemShipment.id
      ? { ...shipment, hasProblemTicket: true, status: 'PROBLEM' }
      : shipment));
    appendShipmentOperationLog(fulfillmentProblemShipment.id, '已创建问题件');
    setNotice(`${fulfillmentProblemShipment.systemOrderNo} 已创建问题件`);
  }

  async function handleReverseShipmentReview(record: Shipment) {
    try {
      const detail = await apiClient.reverseShipmentReview(record.id);
      setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? detail.shipment : shipment)));
      appendShipmentOperationLog(record.id, '反审核：待排货 -> 待审核');
      setNotice(`已反审核 ${record.systemOrderNo}，订单已回到待审核`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '反审核失败');
    }
  }

  async function handleWarehouseDispatchShipment(record: Shipment, options: { shippingMarkConfirmed?: boolean; handoverNo?: string; batchDispatchSource?: string; miscFeeIdsToMatch?: string[] } = {}) {
    const updated = await apiClient.dispatchShipment(record.id, {
      shippingMarkConfirmed: options.shippingMarkConfirmed,
      handoverNo: options.handoverNo,
      batchDispatchSource: options.batchDispatchSource,
      miscFeeIdsToMatch: options.miscFeeIdsToMatch
    });
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? updated : shipment)));
    appendShipmentOperationLog(record.id, '仓库管理：确认出库');
    setNotice(`仓库已确认 ${record.systemOrderNo} 出库，已进入客服数据确认`);
  }

  async function handleUploadShipmentBusinessInvoice(record: Shipment, file: File) {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xls', '.xlsx'].includes(extension) || extension === '.xlsm') {
      setNotice('请上传 .xls/.xlsx 发票文件');
      return;
    }
    const result = await apiClient.uploadShipmentBusinessInvoice(record.id, file);
    setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? result.shipment : shipment)));
    appendShipmentOperationLog(record.id, `业务上传发票：${result.fileName}`);
    setNotice(`已上传 ${record.systemOrderNo} 业务发票`);
  }

  async function handleDownloadShipmentInvoiceTemplate(record: Shipment) {
    try {
      const file = await apiClient.downloadShipmentInvoiceTemplate(record.id);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      Modal.error({ title: '下载失败', content: error instanceof Error ? error.message : '发票模板下载失败' });
    }
  }

  function openRoutingAssignmentModal(record: Shipment) {
    const matchedChannel = masterData.channels.find((channel) => channel.name === record.channelName);

    routingAssignmentForm.setFieldsValue({
      agentId: record.agentId,
      channelId: matchedChannel?.id ?? masterData.channels.find((channel) => channel.enabled)?.id,
      manualChannelName: undefined,
      agentChannelName: record.routeAgentChannelName,
      destinationCountry: record.destinationCountry,
      shippingMarkRequired: record.shippingMarkRequired === true,
      saveAgentChannelToMasterData: false
    });
    setRoutingAssignmentShipment(record);
    void apiClient.shipmentFinanceDetail(record.id)
      .then((detail) => setShipmentFinanceDetails((current) => ({ ...current, [record.id]: detail })))
      .catch(() => undefined);
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
      return false;
    }
    if (routingAssignmentShipment.status !== 'WAITING_SORT') {
      setNotice('当前状态不允许执行分配渠道');
      return false;
    }

    try {
      const values = await routingAssignmentForm.validateFields();
      const destinationCountry = values.destinationCountry?.trim();
      if (!destinationCountry) {
        setNotice('请先填写国家，再保存排货资料');
        return false;
      }
      if (destinationCountry !== routingAssignmentShipment.destinationCountry) {
        const updatedCountry = await apiClient.updateShipmentOperational(routingAssignmentShipment.id, { destinationCountry });
        setLocalShipments((current) => current.map((shipment) => (shipment.id === updatedCountry.id ? updatedCountry : shipment)));
        appendShipmentOperationLog(routingAssignmentShipment.id, `渠道排货：修改国家为 ${destinationCountry}`);
      }
      const agent = values.agentId ? masterData.agents.find((item) => item.id === values.agentId && item.enabled) : undefined;
      const channel = await resolveRoutingChannel(values);

      if (!agent) {
        setNotice('请选择代理');
        return false;
      }
      if (!channel) {
        setNotice('请填写代理渠道');
        return false;
      }
      const agentChannelName = values.agentChannelName?.trim();
      const matchingAgentChannels = masterData.agentChannels.filter((item) => (
        item.agentId === agent.id
        && normalizeRoutingAgentChannelName(item.channelName) === normalizeRoutingAgentChannelName(agentChannelName)
      ));
      const matchedAgentChannel = matchingAgentChannels.find((item) => item.enabled) ?? matchingAgentChannels[0];

      const updated = await apiClient.routeShipment(routingAssignmentShipment.id, {
        channelId: channel.id,
        agentId: agent.id,
        agentChannelId: matchedAgentChannel?.id,
        agentChannelName,
        saveAgentChannelToMasterData: values.saveAgentChannelToMasterData === true && !matchedAgentChannel,
        shippingMarkRequired: values.shippingMarkRequired === true,
        approve: false
      });
      const patched: Shipment = {
        ...updated,
        channelName: channel.name,
        carrier: channel.carrierName,
        agentName: agent.name,
        routeAgentChannelName: agentChannelName
      };
      setLocalShipments((current) => current.map((shipment) => (shipment.id === routingAssignmentShipment.id ? patched : shipment)));
      if (session?.user.role === 'ADMIN' || session?.user.role === 'FINANCE') {
        await refreshPayableAudits();
      }
      void apiClient.masterData().then(setMasterData).catch(() => undefined);
      appendShipmentOperationLog(routingAssignmentShipment.id, `渠道排货：代理 ${agent.name}，代理渠道 ${agentChannelName}`);
      setRoutingAssignmentShipment(null);
      routingAssignmentForm.resetFields();
      setNotice('排货信息已保存，请返回列表点击审核进入已排货');
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) {
        return false;
      }
      if (error instanceof Error && error.message) {
        Modal.error({ title: '保存失败', content: error.message });
      }
      return false;
    }
  }

  async function handleApprovePendingRouting(record: Shipment, confirmed = false) {
    if (record.status !== 'WAITING_SORT') {
      setNotice('当前状态不允许审核排货');
      return;
    }

    const approvalReadiness = getPendingRoutingApprovalReadiness(record);
    if (!approvalReadiness.ready) {
      openRoutingAssignmentModal(record);
      setNotice(`请先保存排货资料并补齐：${approvalReadiness.missingFields.join('、')}`);
      return;
    }

    const channel = masterData.channels.find((item) => item.id === record.channelId && item.enabled);
    const agent = masterData.agents.find((item) => item.id === record.agentId && item.enabled);
    const agentChannelName = record.routeAgentChannelName?.trim();
    if (!channel || !agent || !agentChannelName) {
      openRoutingAssignmentModal(record);
      setNotice('已保存的代理或渠道资料已失效，请重新选择并保存后再审核');
      return;
    }

    if (!confirmed) {
      setPendingRoutingApprovalShipment(record);
      return;
    }

    try {
      const updated = await apiClient.routeShipment(record.id, {
        channelId: channel.id,
        agentId: agent.id,
        agentChannelName,
        shippingMarkRequired: record.shippingMarkRequired === true
      });
      const patched: Shipment = {
        ...updated,
        channelName: channel.name,
        carrier: channel.carrierName,
        agentName: agent.name,
        routeAgentChannelName: agentChannelName
      };
      setLocalShipments((current) => current.map((shipment) => (shipment.id === record.id ? patched : shipment)));
      appendShipmentOperationLog(record.id, `排货审核通过：进入已排货/待出库`);
      setNotice(`${record.systemOrderNo} 审核通过，已同步进入已排货和待出库`);
    } catch (error) {
      Modal.error({ title: '审核失败', content: error instanceof Error ? error.message : '排货审核失败' });
    }
  }

  async function confirmPendingRoutingApproval() {
    const record = pendingRoutingApprovalShipment;
    if (!record) return;
    setPendingRoutingApprovalShipment(null);
    await handleApprovePendingRouting(record, true);
  }

  async function handleSavePendingRoutingCost(
    shipment: Shipment,
    type: 'BUSINESS_COST' | 'PAYABLE',
    feeId: string | undefined,
    input: { name: string; currency: string; chargeWeightKg?: number; unitPrice?: number; amount: number }
  ) {
    const payload = {
      type,
      name: input.name,
      currency: input.currency,
      chargeWeightKg: input.chargeWeightKg,
      unitPrice: input.unitPrice,
      amount: input.amount
    };
    const savedItem = feeId
      ? await apiClient.updateShipmentFinanceItem(shipment.id, feeId, payload)
      : await apiClient.createShipmentFinanceItem(shipment.id, payload);
    setShipmentFinanceDetails((current) => {
      const detail = current[shipment.id];
      if (!detail) return current;
      if (type === 'BUSINESS_COST') {
        const savedBusinessCost = savedItem as BusinessCostFeeSummary;
        const businessCosts = feeId
          ? (detail.businessCosts ?? []).map((item) => item.id === savedBusinessCost.id ? savedBusinessCost : item)
          : [...(detail.businessCosts ?? []), savedBusinessCost];
        return { ...current, [shipment.id]: { ...detail, businessCosts } };
      }
      const savedPayable = savedItem as PayableFeeSummary;
      const payables = feeId
        ? (detail.payables ?? []).map((item) => item.id === savedPayable.id ? savedPayable : item)
        : [...(detail.payables ?? []), savedPayable];
      return { ...current, [shipment.id]: { ...detail, payables } };
    });
    await refreshWorkspace();
    appendShipmentOperationLog(shipment.id, `渠道排货：${type === 'BUSINESS_COST' ? '修改业务成本' : '修改应付成本'} ${input.name}`);
    setNotice(`已保存${type === 'BUSINESS_COST' ? '业务成本' : '应付成本'}`);
  }

  async function handleDeletePendingRoutingCost(shipment: Shipment, feeId: string) {
    await apiClient.deleteShipmentFinanceItem(shipment.id, feeId);
    setShipmentFinanceDetails((current) => {
      const detail = current[shipment.id];
      if (!detail) return current;
      return {
        ...current,
        [shipment.id]: {
          ...detail,
          businessCosts: (detail.businessCosts ?? []).filter((item) => item.id !== feeId),
          payables: (detail.payables ?? []).filter((item) => item.id !== feeId)
        }
      };
    });
    await refreshWorkspace();
    appendShipmentOperationLog(shipment.id, '渠道排货：删除成本费用');
    setNotice('已删除成本费用');
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
      channelId: masterData.channels.find((channel) => channel.name === record.channelName)?.id,
      customerOrderNo: record.customerOrderNo,
      productName: record.productName,
      destinationCountry: record.destinationCountry,
      packageCount: record.packageCount,
      receivableWeightKg: record.receivableWeightKg,
      agentWeightKg: record.agentWeightKg,
      declarationRequired: record.declarationRequired,
      sensitive: record.sensitive,
      cargoType: record.cargoType,
      volumeCbm: record.volumeCbm,
      settlementMethod: record.settlementMethod,
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
    const operationalInput = {
      latestTracking: values.latestTracking.trim(),
      transferNo: nextTransferNo,
      channelId: values.channelId || undefined,
      customerOrderNo: values.customerOrderNo?.trim() || undefined,
      productName: values.productName?.trim() || undefined,
      destinationCountry: values.destinationCountry?.trim() || undefined,
      packageCount: values.packageCount,
      receivableWeightKg: values.receivableWeightKg,
      agentWeightKg: values.agentWeightKg,
      declarationRequired: values.declarationRequired,
      sensitive: values.sensitive,
      cargoType: values.cargoType?.trim() || undefined,
      volumeCbm: values.volumeCbm,
      settlementMethod: values.settlementMethod?.trim() || undefined,
      status: values.status,
      etaAt: values.etaAt?.trim() || undefined,
      etdAt: values.etdAt?.trim() || undefined
    };
    const updated = editingShipmentSource === 'operationsPool'
      ? await apiClient.updateOperationShipmentOperational(editingShipment.id, operationalInput)
      : await apiClient.updateShipmentOperational(editingShipment.id, operationalInput);
    setLocalShipments((current) => current.map((shipment) => (shipment.id === editingShipment.id ? updated : shipment)));
    const logPrefix = editingShipmentSource === 'routing' ? '渠道排货：' : '';
    if (oldTransferNo !== (nextTransferNo ?? '空')) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新转单号：${oldTransferNo} -> ${nextTransferNo ?? '空'}`);
    }
    if (editingShipment.latestTracking !== updated.latestTracking) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新最新物流轨迹：${updated.latestTracking}`);
    }
    if (editingShipment.status !== updated.status) {
      appendShipmentOperationLog(editingShipment.id, `${logPrefix}更新状态：${shipmentStatusLabels[editingShipment.status]} -> ${shipmentStatusLabels[updated.status]}`);
    }
    setEditingShipment(null);
    setEditingShipmentSource('operation');
    editShipmentForm.resetFields();
    setNotice(`已人工修改 ${updated.systemOrderNo} 的轨迹、转单号和状态`);
  }

  async function handleBulkTrackingFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkTrackingError(null);

    try {
      const rows = await parseBulkTrackingWorkbook(await readFileAsArrayBuffer(file), await loadExcel());
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

    setBulkTrackingImporting(true);
    try {
      const response = await apiClient.importTrackingEvents({
        updates: bulkTrackingResult.updates,
        fileName: bulkTrackingFileName ?? undefined,
        rawRowCount: bulkTrackingResult.rawRowCount ?? bulkTrackingRows.length,
        failedRowCount: (bulkTrackingResult.errorRows?.length ?? 0) + (bulkTrackingResult.conflictOrderNos?.length ?? 0),
        unmatchedOrderNos: bulkTrackingResult.unmatchedOrderNos
      });
      const updatedByShipmentId = new Map(response.updated.map((shipment) => [shipment.id, shipment]));
      setLocalShipments((current) => current.map((shipment) => updatedByShipmentId.get(shipment.id) ?? shipment));
      bulkTrackingResult.updates.forEach((update) => {
        appendShipmentOperationLog(update.shipmentId, `批量覆盖轨迹：${formatTrackingImportDate(update.trackingDate)} ${update.latestTracking}`);
      });
      setNotice(`已覆盖轨迹 ${response.importedCount ?? response.affectedShipmentCount ?? bulkTrackingResult.shipmentPreviews?.length ?? 0} 票，未匹配 ${response.unmatchedCount ?? bulkTrackingResult.unmatchedOrderNos.length} 个单号，失败行 ${response.failedRowCount ?? bulkTrackingResult.errorRows?.length ?? 0} 行`);
      setBulkTrackingError(null);
    } catch (error) {
      setBulkTrackingError(error instanceof Error ? error.message : '轨迹导入失败');
    } finally {
      setBulkTrackingImporting(false);
    }
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

  async function refreshPayableAudits() {
    setPayableAudits((await apiClient.payableAudits({ pageSize: 100 })).rows);
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

  const renderShipmentMatrixField = (
    label: string,
    value: ReactNode,
    options: {
      copyText?: string;
      muted?: boolean;
      emphasis?: boolean;
      span?: 2 | 3 | 4 | 5 | 'full';
    } = {}
  ) => {
    const className = [
      'shipment-detail-matrix-cell',
      options.span ? `shipment-detail-matrix-cell-span-${options.span}` : '',
      options.emphasis ? 'shipment-detail-matrix-cell-emphasis' : ''
    ].filter(Boolean).join(' ');

    return (
      <div className={className}>
        <span className="shipment-detail-matrix-label">{label}</span>
        <div className={`shipment-detail-matrix-value${options.muted ? ' shipment-detail-muted-value' : ''}`}>
          {options.copyText ? <Text copyable={{ text: options.copyText }}>{value}</Text> : value}
        </div>
      </div>
    );
  };

  const renderShipmentFinancePanel = (shipment: Shipment, detail?: ShipmentFinanceDetailSummary) => {
    if (!canViewShipmentFinanceDetail) {
      return null;
    }
    return session ? (
      <OrderFeePanel
        apiClient={apiClient}
        role={session.user.role}
        permissions={session.permissions}
        agents={masterData.agents}
        catalogItems={shipmentFeeCatalogItems ?? []}
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
    const canViewShipmentSensitiveFields = ['ADMIN', 'FINANCE', 'UG_FINANCE', 'BOSS', 'OWNER'].includes(session?.user.role ?? '');
    const agentName = getDetailText(shipment.agentName, '未指定代理');
    const paymentCurrency = getShipmentPaymentCurrencyLabel(shipment);
    const paymentAmount = formatPaymentSummary(shipment.paymentAmountUsd, shipment.paymentAmountCny);
    const paymentMethod = getDetailText(shipment.paymentMethod, '未知');
    const latestTracking = getDetailText(shipment.latestTracking, '暂无轨迹');
    const remark = getDetailText(shipment.remark, '无备注');
    const financeDetail = shipmentFinanceDetails[shipment.id];
    const reviewDetail = shipmentReviewDetails[shipment.id];
    const internalTrackingColumns: ColumnsType<ShipmentReviewEventSummary> = [
      { title: '时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
      { title: '阶段', dataIndex: 'stage', width: 110, render: (value?: string) => value || '-' },
      { title: '操作人', dataIndex: 'operator', width: 110, render: (value?: string) => value || '系统' },
      { title: '来源模块', dataIndex: 'sourceModule', width: 120, render: (value?: string) => value || '-' },
      { title: '动作', dataIndex: 'action', width: 120, render: (value: string | undefined, row) => value || row.title },
      { title: '内容', dataIndex: 'note', width: 280, render: (value?: string) => value || '-' }
    ];
    const logisticsTrackingColumns: ColumnsType<ShipmentLogisticsTrackingEventSummary> = [
      { title: '轨迹时间', dataIndex: 'trackingAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
      { title: '物流节点', dataIndex: 'node', width: 140 },
      { title: '地点', dataIndex: 'location', width: 110, render: (value?: string) => value || '-' },
      { title: '承运商', dataIndex: 'carrier', width: 110, render: (value?: string) => value || '-' },
      { title: '转单号 / 物流单号', dataIndex: 'transferNo', width: 170, render: (value?: string) => value || '-' },
      { title: '原始内容', dataIndex: 'rawContent', width: 240, render: (value?: string) => value || '-' },
      { title: '来源', dataIndex: 'source', width: 110 }
    ];

    const basicInfo = (
      <div className="shipment-detail-basic-matrix">
        <section className="shipment-detail-matrix-section shipment-detail-matrix-section-entry" aria-labelledby="shipment-detail-entry-title">
          <div className="shipment-detail-matrix-section-title" id="shipment-detail-entry-title">录入与货物</div>
          <div className="shipment-detail-matrix-grid shipment-detail-matrix-grid-4">
            {renderShipmentMatrixField('运单录入日期', shipment.entryAt ? formatBeijingDateTime(shipment.entryAt) : formatBeijingDateTime(shipment.createdAt))}
            {renderShipmentMatrixField('客户编号', getDetailText(shipment.customerCode, '-'))}
            {renderShipmentMatrixField('客户名称', shipment.customerName)}
            {renderShipmentMatrixField('出货单号', shipment.outboundOrderNo || shipment.systemOrderNo, { copyText: shipment.outboundOrderNo || shipment.systemOrderNo })}
            {renderShipmentMatrixField('公司渠道', getDetailText(shipment.channelName || shipment.carrier, '-'))}
            {renderShipmentMatrixField('转单号', transferNo, shipment.transferNo ? { copyText: shipment.transferNo } : { muted: true })}
            {renderShipmentMatrixField('入仓号', getDetailText(shipment.inboundNo, '-'), { muted: !shipment.inboundNo })}
            {renderShipmentMatrixField('品名', getDetailText(shipment.productName, '-'))}
            <div className="shipment-detail-cargo-strip">
              <span className="shipment-detail-matrix-label">货物数据</span>
              <span><small>件数</small>{shipment.packageCount}</span>
              <span><small>实重</small>{(shipment.weightKg ?? shipment.receivableWeightKg).toFixed(3)} kg</span>
              <span><small>体积</small>{shipment.volumeCbm === undefined ? '-' : `${shipment.volumeCbm.toFixed(3)} m³`}</span>
              <span><small>计费重</small>{(shipment.chargeableWeightKg ?? shipment.agentWeightKg ?? shipment.receivableWeightKg).toFixed(3)} kg</span>
              <span><small>来源</small><Tag color="cyan">{shipment.cargoDataSource === 'MANUAL_ADJUSTED' ? '手动调整' : '自动匹配'}</Tag></span>
            </div>
          </div>
        </section>

        <section className="shipment-detail-matrix-section shipment-detail-matrix-section-outbound" aria-labelledby="shipment-detail-outbound-title">
          <div className="shipment-detail-matrix-section-title" id="shipment-detail-outbound-title">出库与审核</div>
          <div className="shipment-detail-matrix-grid shipment-detail-matrix-grid-5">
            {renderShipmentMatrixField('出库日期', shipment.outboundAt ? formatBeijingDateTime(shipment.outboundAt) : '-', { muted: !shipment.outboundAt })}
            {renderShipmentMatrixField('目的地', shipment.destinationCountry)}
            {renderShipmentMatrixField('报关', shipment.declarationRequired ? '是' : '否')}
            {renderShipmentMatrixField('货物类型', getDetailText(shipment.cargoType, '-'))}
            {renderShipmentMatrixField('是否敏感', shipment.sensitive ? '是' : '否')}
            {canViewShipmentSensitiveFields ? renderShipmentMatrixField(agentFieldLabels.detailedCompanyName, agentName, { muted: !shipment.agentName }) : null}
            {renderShipmentMatrixField('分单号', getDetailText(shipment.subOrderNo, '-'))}
            {renderShipmentMatrixField('FBA 入仓单号', getDetailText(shipment.fbaInboundNo, '-'))}
            {renderShipmentMatrixField('结算方式', getDetailText(shipment.settlementMethod, '-'))}
            {canViewShipmentFinanceDetail ? renderShipmentMatrixField('应收总额', financeDetail ? formatCurrency(financeDetail.receivableTotal) : '待加载', { emphasis: true }) : null}
            {renderShipmentMatrixField('备注', remark, {
              span: canViewShipmentSensitiveFields ? (canViewShipmentFinanceDetail ? 2 : 3) : undefined,
              muted: remark === '无备注'
            })}
            {renderShipmentMatrixField('应收审核日期', shipment.reviewedAt ? formatBeijingDateTime(shipment.reviewedAt) : '-', { muted: !shipment.reviewedAt })}
            {canViewShipmentSensitiveFields ? renderShipmentMatrixField('业务成本审核日期', shipment.businessReviewedAt ? formatBeijingDateTime(shipment.businessReviewedAt) : '-', { muted: !shipment.businessReviewedAt }) : null}
            {canViewShipmentSensitiveFields ? renderShipmentMatrixField('应付审核日期', '-', { muted: true }) : null}
          </div>
        </section>

        <section className="shipment-detail-matrix-section shipment-detail-matrix-section-receiver" aria-labelledby="shipment-detail-receiver-title">
          <div className="shipment-detail-matrix-section-title" id="shipment-detail-receiver-title">收货信息</div>
          <div className="shipment-detail-matrix-grid shipment-detail-matrix-grid-4">
            {renderShipmentMatrixField('收货人名称', getDetailText(shipment.receiverName, '-'), { muted: !shipment.receiverName })}
            {renderShipmentMatrixField('收货人公司名称', getDetailText(shipment.receiverCompany, '-'), { muted: !shipment.receiverCompany })}
            {renderShipmentMatrixField('FBA仓库代码', getDetailText(shipment.fbaWarehouseCode, '-'), { muted: !shipment.fbaWarehouseCode })}
            {renderShipmentMatrixField('国家', getDetailText(shipment.receiverCountry, '-'), { muted: !shipment.receiverCountry })}
            {renderShipmentMatrixField('收货人地址', getDetailText(shipment.receiverAddress, '-'), { muted: !shipment.receiverAddress })}
            {renderShipmentMatrixField('州/省', getDetailText(shipment.receiverState, '-'), { muted: !shipment.receiverState })}
            {renderShipmentMatrixField('收货人电话', getDetailText(shipment.receiverPhone, '-'), { muted: !shipment.receiverPhone })}
            {renderShipmentMatrixField('邮编', getDetailText(shipment.receiverPostalCode, '-'), { muted: !shipment.receiverPostalCode })}
          </div>
        </section>

        <section className="shipment-detail-matrix-section shipment-detail-matrix-section-fulfillment" aria-labelledby="shipment-detail-fulfillment-title">
          <div className="shipment-detail-matrix-section-title" id="shipment-detail-fulfillment-title">履约与轨迹</div>
          <div className="shipment-detail-matrix-grid shipment-detail-matrix-grid-5">
            {renderShipmentMatrixField('出货单号', shipment.outboundOrderNo || shipment.systemOrderNo, { copyText: shipment.outboundOrderNo || shipment.systemOrderNo })}
            {renderShipmentMatrixField('状态', <StatusTag status={shipment.status} />)}
            {renderShipmentMatrixField('时效', calculateTransitTimeLabel(shipment, demoOperationalNow))}
            {renderShipmentMatrixField('ETD', shipment.etdAt ? formatBeijingDateTime(shipment.etdAt) : '未填写', { muted: !shipment.etdAt })}
            {renderShipmentMatrixField('ETA', shipment.etaAt ? formatBeijingDateTime(shipment.etaAt) : '未填写', { muted: !shipment.etaAt })}
            {renderShipmentMatrixField('最新物流轨迹', latestTracking, { span: 'full', muted: latestTracking === '暂无轨迹' })}
          </div>
        </section>
      </div>
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
        <section className="shipment-finance-payment-band" aria-label="收款信息">
          <div className="shipment-finance-payment-band-title">收款信息</div>
          <div className="shipment-finance-payment-item">
            <span>收款金额</span>
            <strong>{paymentAmount}</strong>
          </div>
          <div className="shipment-finance-payment-item">
            <span>收款币种</span>
            <strong>{paymentCurrency}</strong>
          </div>
          <div className="shipment-finance-payment-item">
            <span>收款方式</span>
            <strong className={paymentMethod === '未知' ? 'shipment-detail-muted-value' : ''}>{paymentMethod}</strong>
          </div>
        </section>

        {renderShipmentFinancePanel(shipment, financeDetail)}
      </>
    );

    return (
      <div className="shipment-detail-layout">
        <section className="shipment-detail-summary" aria-label="运单摘要">
          <div className="shipment-detail-summary-item">
            <span>出货单号</span>
            <Text copyable={{ text: shipment.outboundOrderNo || shipment.systemOrderNo }}>{shipment.outboundOrderNo || shipment.systemOrderNo}</Text>
          </div>
          <div className="shipment-detail-summary-item">
            <span>客户名称</span>
            <strong>{shipment.customerName}</strong>
          </div>
          <div className="shipment-detail-summary-item">
            <span>客户单号</span>
            <strong>{shipment.customerOrderNo}</strong>
          </div>
          <div className="shipment-detail-summary-item">
            <span>转单号</span>
            {shipment.transferNo ? <Text copyable={{ text: shipment.transferNo }}>{shipment.transferNo}</Text> : <strong className="shipment-detail-muted-value">{transferNo}</strong>}
          </div>
          <StatusTag status={shipment.status} />
        </section>

        <Tabs
          key={shipment.id}
          className="shipment-detail-tabs"
          onChange={(key) => {
            if (key === 'finance') {
              setShipmentFinancePrewarmed(true);
            }
            if (key === 'internal-tracking' || key === 'logistics-tracking') {
              setShipmentReviewRequestedId(shipment.id);
            }
          }}
          items={[
            { key: 'basic', label: '基本信息', children: <div className="shipment-detail-tab-panel">{basicInfo}</div> },
            { key: 'package', label: '单件明细', children: <div className="shipment-detail-tab-panel">{packageDetail}</div> },
            ...(canViewShipmentFinanceDetail ? [{
              key: 'finance',
              label: '费用明细',
              forceRender: shipmentFinancePrewarmed,
              children: <div className="shipment-detail-tab-panel shipment-detail-finance-tab-panel">{financeDetailContent}</div>
            }] : []),
            {
              key: 'internal-tracking',
              label: '内部轨迹',
              children: reviewDetail ? (
                reviewDetail.internalTrackingEvents.length
                  ? <ManagedTable rowKey="id" size="small" columns={internalTrackingColumns} dataSource={reviewDetail.internalTrackingEvents} pagination={false} scroll={{ x: 920 }} sticky={false} resizableColumns={false} columnSettings={false} recordDetail={false} />
                  : <Text type="secondary">暂无公司内部生命周期记录</Text>
              ) : (shipmentReviewDetailLoading ? <Text type="secondary">正在加载内部轨迹…</Text> : <Text type="secondary">暂无公司内部生命周期记录</Text>)
            },
            {
              key: 'logistics-tracking',
              label: '物流轨迹',
              children: reviewDetail ? (
                reviewDetail.logisticsTrackingEvents.length
                  ? <ManagedTable rowKey="id" size="small" columns={logisticsTrackingColumns} dataSource={reviewDetail.logisticsTrackingEvents} pagination={false} scroll={{ x: 1120 }} sticky={false} resizableColumns={false} columnSettings={false} recordDetail={false} />
                  : <Text type="secondary">暂无外部物流轨迹</Text>
              ) : (shipmentReviewDetailLoading ? <Text type="secondary">正在加载物流轨迹…</Text> : <Text type="secondary">暂无外部物流轨迹</Text>)
            }
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
        apiClient={apiClient}
        theme={appTheme}
        user={session.user}
        permissions={session.permissions}
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
      <AntdApp>
      <Layout className="app-shell">
        <a className="skip-link" href="#main-content">
          跳到主内容
        </a>
        <Sider className="sidebar" width={196}>
          <button type="button" className="brand" aria-label="返回运营工作台" onClick={handleBrandClick}>
            <div className="brand-mark brand-logo-mark">
              <img src="/green-cargo-logo.png" alt="Green Cargo 思远物流标识" width={66} height={36} />
            </div>
            <div>
              <Text className="brand-title">思远物流</Text>
              <Text className="brand-subtitle">AI TMS / OMS</Text>
            </div>
          </button>
          <nav className="side-nav" role="menu" aria-label="员工端主导航">
            {visibleMenuItems.map((item) => {
              const isActive = currentMenuKey === item.key;
              const subNav = sidebarSubNav?.parentKey === item.key ? sidebarSubNav : null;
              const hasSubNav = Boolean(subNav?.items.length);
              const isExpanded = isActive && expandedMenuKey === item.key && hasSubNav;
              const moduleUnreadCount = navigationUnreadByKey.get(`${item.key}:`) ?? 0;

              return (
                <div className="side-nav-group" key={item.key}>
                  <a
                    href={getStaffModuleHref(item.key)}
                    role="menuitem"
                    className={`side-nav-item${isActive ? ' is-active' : ''}`}
                    aria-label={item.label}
                    aria-expanded={hasSubNav ? isExpanded : undefined}
                    onClick={(event) => handlePrimaryMenuClick(event, item.key)}
                  >
                    <span className="side-nav-icon">{item.icon}</span>
                    <span className="side-nav-label">{item.label}</span>
                    <span className="side-nav-meta" aria-hidden="true">
                      {moduleUnreadCount > 0 && !isExpanded ? (
                        <span className="side-nav-unread-dot" title={`${formatNavigationUnreadCount(moduleUnreadCount)} 条未读变化`} />
                      ) : null}
                      {hasSubNav ? (
                        <span className="side-nav-chevron">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      ) : null}
                    </span>
                  </a>
                  {isExpanded && subNav ? (
                    <div className="side-sub-nav" role="group" aria-label={`${item.label}二级功能`}>
                      {subNav.items.map((subItem) => (
                        (() => {
                          const unreadCount = navigationUnreadByKey.get(`${item.key}:${subItem.key}`) ?? 0;
                          return (
                            <a
                              href={getStaffSectionHref(item.key, subItem.key)}
                              key={subItem.key}
                              role="button"
                              className={`side-sub-nav-item${subItem.key === activeSectionKey ? ' is-active' : ''}`}
                              aria-current={subItem.key === activeSectionKey ? 'page' : undefined}
                              onClick={(event) => {
                                handleSecondaryMenuClick(event, item.key, subItem.key);
                                setExpandedMenuKey(item.key);
                              }}
                            >
                              <span className="side-sub-nav-label">{subItem.label}</span>
                              {unreadCount > 0 ? (
                                <span className="side-sub-nav-unread-count" aria-hidden="true" title={`${formatNavigationUnreadCount(unreadCount)} 条未读变化`}>
                                  {formatNavigationUnreadCount(unreadCount)}
                                </span>
                              ) : null}
                            </a>
                          );
                        })()
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
                  navigateToAppRoute('workspace', 'shipmentPool');
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
              <NotificationCenter apiClient={apiClient} permissions={session.permissions} onNavigate={(targetPath) => handleNotificationNavigate(targetPath)} />
              <Button icon={<UserCircle size={16} />} onClick={() => void openPersonalCenter()}>
                个人中心
              </Button>
              <Button icon={<LogOut size={16} />} onClick={() => setLogoutConfirmOpen(true)}>
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
            title="确认退出登录"
            open={logoutConfirmOpen}
            okText="确认退出"
            cancelText="取消"
            onOk={() => {
              setLogoutConfirmOpen(false);
              handleUnauthorized();
            }}
            onCancel={() => setLogoutConfirmOpen(false)}
          >
            <p>退出后需要重新登录才能继续使用系统。</p>
          </Modal>
          <Modal
            title="个人中心"
            open={personalCenterOpen}
            width={980}
            destroyOnHidden
            footer={(
              <Button onClick={() => setPersonalCenterOpen(false)}>关闭</Button>
            )}
            onCancel={() => setPersonalCenterOpen(false)}
          >
            <Space direction="vertical" size={16} className="personal-center-shell">
              <Card size="small" title="账号资料" className="personal-center-profile">
                <div className="personal-center-readonly-grid" aria-label="只读账号信息">
                  <div>
                    <span>员工账号</span>
                    <strong>{session.user.username}</strong>
                  </div>
                  <div>
                    <span>当前角色</span>
                    <Tag color={session.user.role === 'ADMIN' ? 'red' : 'blue'}>{getRoleDisplayName(session.user.role)}</Tag>
                  </div>
                </div>
                <Form
                  form={profileForm}
                  layout="vertical"
                  className="personal-center-profile-form"
                  initialValues={{
                    name: session.user.name,
                    phone: session.user.phone,
                    gender: (session.user.gender ?? 'UNKNOWN') as StaffGender,
                    nickname: session.user.nickname
                  }}
                >
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
                  <Button type="primary" onClick={() => void submitProfileUpdate()}>
                    保存个人资料
                  </Button>
                </Form>
              </Card>
              <Row gutter={[16, 16]}>
                <Col xs={24}>
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
              </Row>
            </Space>
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
            title={<Text strong className="shipment-detail-title">{detailViewingShipment ? `运单详情 · ${detailViewingShipment.systemOrderNo}` : '运单详情'}</Text>}
            open={Boolean(detailViewingShipment)}
            width={1440}
            className="shipment-detail-modal-shell"
            footer={<Button aria-label="关闭" onClick={closeShipmentDetail}>关闭</Button>}
            onCancel={closeShipmentDetail}
          >
            {detailViewingShipment ? renderShipmentDetailContent(detailViewingShipment) : null}
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
            <AppPageBoundary
              resetKey={`${currentMenuKey}:${activeSectionKey ?? ''}`}
              menuKey={currentMenuKey}
              sectionKey={activeSectionKey}
              onReport={reportPageRenderError}
            >
            {currentMenuKey === 'business' || currentMenuKey === 'orders' ? (
              <FinancePage
                menuMode="business"
                initialSection={resolveModuleInitialSection(
                  'business',
                  requestedAppRoute?.menuKey === 'business' ? requestedAppRoute.sectionKey : undefined,
                  'business-dashboard'
                )}
                role={session.user.role}
                username={session.user.username}
                permissions={session.permissions}
                receivables={receivables}
                businessCostAudits={businessCostAudits}
                payableAudits={payableAudits}
                agents={masterData.agents}
                statements={customerStatements}
                accounts={customerAccounts}
                notice={notice}
                onCreateStatement={handleCreateCustomerStatement}
                onCreatePayment={handleCreatePayment}
                onReceivableRowsChange={setReceivables}
                onBusinessCostRowsChange={setBusinessCostAudits}
                onPayableRowsChange={setPayableAudits}
                shipments={localShipments}
                onViewShipmentLog={(record) => openShipmentLogModal(record, 'operation')}
                renderShipmentFinancePanel={renderShipmentFinancePanel}
                renderShipmentOrderNoLink={renderShipmentOrderNoLink}
                apiClient={apiClient}
                prefillOrderEntryPackageIds={prefillOrderEntryPackageIds}
                onOrderEntryPrefillConsumed={() => setPrefillOrderEntryPackageIds([])}
                customers={masterData.customers}
                customerContacts={masterData.contacts}
                onCustomerContactsChange={(contacts) => setMasterData((current) => ({ ...current, contacts }))}
                renderOrderManagement={() => (
                  <OrdersPage
                    notice={null}
                    shipments={businessShipments}
                    columns={fulfillmentColumns}
                    matrixSourceColumns={fulfillmentMatrixSourceColumns}
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
                    onUploadShipmentBusinessInvoice={handleUploadShipmentBusinessInvoice}
                    logViewingShipment={logViewingShipment}
                    logViewingMode={logViewingMode}
                    shipmentLogs={allShipmentLogs}
                    onCloseShipmentLog={() => setLogViewingShipment(null)}
                    formatPaymentSummary={formatPaymentSummary}
                    onAiAssist={handleAiAssist}
                    aiLoading={aiLoading}
                    permissions={session.permissions}
                    role={session.user.role}
                  />
                )}
              />
            ) : currentMenuKey === 'settings' ? (
              <SettingsPage
                apiClient={apiClient}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
                permissions={session.permissions}
                onNavigateToSection={(sectionKey) => navigateToAppRoute('settings', sectionKey)}
                initialSection={resolveModuleInitialSection(
                  'settings',
                  requestedAppRoute?.menuKey === 'settings' ? requestedAppRoute.sectionKey : undefined,
                  'accounts'
                )}
              />
            ) : currentMenuKey === 'master' ? (
              <MasterDataPage
                apiClient={apiClient}
                initialSection={resolveModuleInitialSection(
                  'master',
                  requestedAppRoute?.menuKey === 'master' ? requestedAppRoute.sectionKey : undefined,
                  'financeCatalog'
                )}
                masterData={masterData}
                permissions={session.permissions}
                currentUser={session.user}
                notice={notice}
                onMasterDataChange={setMasterData}
                onNotice={setNotice}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : currentMenuKey === 'pricing' ? (
              <PricingPage
                apiClient={apiClient}
                initialSection={resolveModuleInitialSection(
                  'pricing',
                  requestedAppRoute?.menuKey === 'pricing' ? requestedAppRoute.sectionKey : undefined,
                  'lookup'
                )}
                role={session.user.role}
                permissions={session.permissions}
                notice={notice}
                onNotice={setNotice}
              />
            ) : currentMenuKey === 'finance' ? (
              <FinancePage
                menuMode="finance"
                initialSection={resolveModuleInitialSection(
                  'finance',
                  requestedAppRoute?.menuKey === 'finance' ? requestedAppRoute.sectionKey : undefined,
                  'finance-dashboard'
                )}
                role={session.user.role}
                username={session.user.username}
                permissions={session.permissions}
                receivables={receivables}
                businessCostAudits={businessCostAudits}
                payableAudits={payableAudits}
                agents={masterData.agents}
                statements={customerStatements}
                accounts={customerAccounts}
                notice={notice}
                onCreateStatement={handleCreateCustomerStatement}
                onCreatePayment={handleCreatePayment}
	                onReceivableRowsChange={setReceivables}
                onBusinessCostRowsChange={setBusinessCostAudits}
                onPayableRowsChange={setPayableAudits}
                shipments={localShipments}
                onViewShipmentLog={(record) => openShipmentLogModal(record, 'operation')}
                renderShipmentFinancePanel={renderShipmentFinancePanel}
                renderShipmentOrderNoLink={renderShipmentOrderNoLink}
                apiClient={apiClient}
                notificationTarget={pendingNotificationTarget?.type === 'WATER_RECEIPT' ? pendingNotificationTarget : undefined}
                onNotificationTargetHandled={consumePendingNotificationTarget}
                customers={masterData.customers}
                customerContacts={masterData.contacts}
                onCustomerContactsChange={(contacts) => setMasterData((current) => ({ ...current, contacts }))}
              />
            ) : currentMenuKey === 'miscFees' ? (
              <MiscFeesPage
                apiClient={apiClient}
                initialSection={resolveModuleInitialSection(
                  'miscFees',
                  requestedAppRoute?.menuKey === 'miscFees' ? requestedAppRoute.sectionKey : undefined,
                  'pickup'
                )}
                role={session.user.role}
                permissions={session.permissions}
                agents={masterData.agents}
              />
            ) : currentMenuKey === 'receive' ? (
              <WarehousePage
                apiClient={apiClient}
                initialSection={resolveModuleInitialSection(
                  'receive',
                  requestedAppRoute?.menuKey === 'receive' ? requestedAppRoute.sectionKey : undefined,
                  'today'
                )}
                notificationTarget={pendingNotificationTarget && ['WAREHOUSE_PACKAGE', 'WAREHOUSE_TALLY'].includes(pendingNotificationTarget.type) ? pendingNotificationTarget : undefined}
                onNotificationTargetHandled={consumePendingNotificationTarget}
                role={session.user.role}
                permissions={session.permissions}
                shipments={businessShipments}
                businessCostAudits={businessCostAudits}
                notice={notice}
                onDispatch={handleWarehouseDispatchShipment}
                canCreateOrderEntry={session.user.role === 'ADMIN' || (
                  session.permissions.includes('business:order-entry:view')
                  && session.permissions.includes('business:order-entry:create')
                  && session.permissions.includes('warehouse:in-stock:order-entry-select')
                )}
                onCreateOrderEntryFromWarehouse={openOrderEntryFromWarehouse}
                findShipmentBySystemOrderNo={findShipmentBySystemOrderNo}
                renderShipmentOrderNoLink={renderShipmentOrderNoLink}
              />
            ) : currentMenuKey === 'customerService' ? (
              <CustomerServicePage
                shipments={businessShipments}
                problemTickets={problemTickets}
                businessCostAudits={businessCostAudits}
                agents={masterData.agents}
                apiClient={apiClient}
                permissions={session.permissions}
                role={session.user.role}
                onShipmentUpdated={upsertLocalShipment}
                onProblemTicketCreated={(ticket) => setProblemTickets((current) => [ticket, ...current])}
                onProblemTicketUpdated={(ticket) => setProblemTickets((current) => current.map((item) => item.id === ticket.id ? ticket : item))}
                onNotice={setNotice}
                initialSection={requestedAppRoute?.menuKey === 'customerService'
                  ? resolveCustomerServiceInitialSection(requestedAppRoute.sectionKey)
                  : customerServiceInitialSection}
              />
            ) : currentMenuKey === 'logisticsTracking' || currentMenuKey === 'tracking' ? (
              <TrackingPage
                shipments={businessShipments}
                tasks={carrierTasks}
                notice={notice}
                permissions={session.permissions}
                bulkTrackingFileName={bulkTrackingFileName}
                bulkTrackingRows={bulkTrackingRows}
                bulkTrackingResult={bulkTrackingResult}
                bulkTrackingError={bulkTrackingError}
                bulkTrackingImporting={bulkTrackingImporting}
                onBulkTrackingFileChange={(event) => void handleBulkTrackingFileChange(event)}
                onConfirmBulkTrackingImport={handleConfirmBulkTrackingImport}
                onRunTask={handleRunCarrierTask}
                onRetryTask={handleRetryCarrierTask}
                onViewShipment={openShipmentDetail}
              />
            ) : currentMenuKey === 'market' || currentMenuKey === 'routing' ? (
              <RoutingPage
                config={{ ...modulePageConfigs.routing!, title: '市场管理', description: '市场看板、待排货和周期排货数据。' }}
                notice={notice}
                shipments={businessShipments}
                assignmentShipment={routingAssignmentShipment}
                assignmentForm={routingAssignmentForm}
                masterData={masterData}
                feeNameCatalogItems={feeNameCatalogItems}
                businessCostAudits={businessCostAudits}
                payableAudits={payableAudits}
                assignmentFinanceDetail={routingAssignmentShipment ? shipmentFinanceDetails[routingAssignmentShipment.id] : undefined}
                permissions={session.permissions}
                onOpenAssignment={openRoutingAssignmentModal}
                onApproveRouting={handleApprovePendingRouting}
                onCancelAssignment={() => {
                  setRoutingAssignmentShipment(null);
                  routingAssignmentForm.resetFields();
                }}
                onConfirmAssignment={handleConfirmRoutingAssignment}
                onRerouteShipment={handleRerouteShipment}
                onEditShipment={(record) => openEditShipmentOperationalModal(record, 'routing')}
                onViewRoutingLog={(record) => openShipmentLogModal(record, 'routing')}
                onViewPendingRoutingLog={(record) => openShipmentLogModal(record, 'operation')}
                onSavePendingRoutingCost={handleSavePendingRoutingCost}
                onDeletePendingRoutingCost={handleDeletePendingRoutingCost}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : currentMenuKey === 'problems' ? (
              <ProblemTicketsPage
                config={modulePageConfigs.problems}
                tickets={problemTickets}
                notice={notice}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : currentMenuKey === 'reports' ? (
              <ReportsPage
                config={modulePageConfigs.reports}
                notice={notice}
                shipments={businessShipments}
                receivables={receivables}
                businessCostAudits={businessCostAudits}
                payableAudits={payableAudits}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
              />
            ) : (
              <OperationsPage
                businessWorkspaceConfig={businessWorkspaceConfig}
                aiQueue={aiQueue}
                importValidation={importValidation}
                businessType={businessType}
                onAiAssist={handleAiAssist}
                aiLoading={aiLoading}
                activeWorkspaceSection={activeWorkspaceSection}
                onActiveWorkspaceSectionChange={setActiveWorkspaceSection}
                automationPlan={automationPlan}
                moduleSummary={moduleSummary}
                spotlightModules={spotlightModules}
                apiClient={apiClient}
                permissions={session.permissions}
                role={session.user.role}
                onViewShipment={openShipmentDetail}
                onProcessShipment={(shipment) => openEditShipmentOperationalModal(shipment, 'operationsPool')}
              />
            )}
            </AppPageBoundary>
            <Modal
              title="人工修改轨迹与状态"
              open={Boolean(editingShipment) && !orderManagementOwnsShipmentOverlays}
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
                      ? '从渠道排货入口修改会写入排货日志，并同步覆盖该票最新物流轨迹、转单号和状态。'
                    : '人工修改会直接覆盖该票最新物流轨迹、转单号和状态；内部生命周期节点不会写入物流轨迹。'
                }
              />
              <Form form={editShipmentForm} layout="vertical">
                <Form.Item
                  name="latestTracking"
                  label="最新物流轨迹"
                  rules={[{ required: true, whitespace: true, message: '请输入最新物流轨迹' }]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item name="transferNo" label="转单号">
                  <Input placeholder="可直接修改或清空快递号" />
                </Form.Item>
                <Form.Item name="channelId" label="发货渠道">
                  <Select
                    allowClear
                    showSearch
                    placeholder="选择发货渠道"
                    optionFilterProp="label"
                    options={masterData.channels
                      .filter((channel) => channel.enabled)
                      .map((channel) => ({
                        label: `${channel.name} / ${channel.carrierName}`,
                        value: channel.id
                    }))}
                  />
                </Form.Item>
                <Row gutter={12}>
                  <Col xs={24} md={12}>
                    <Form.Item name="customerOrderNo" label="客户单号">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="productName" label="品名">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="destinationCountry" label="目的地">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="cargoType" label="货物属性">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="packageCount" label="件数">
                      <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="receivableWeightKg" label="实重/计费重">
                      <InputNumber min={0} precision={3} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="volumeCbm" label="体积 CBM">
                      <InputNumber min={0} precision={3} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="settlementMethod" label="结算方式">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Space size={16}>
                      <Form.Item name="declarationRequired" valuePropName="checked" noStyle>
                        <Checkbox>报关</Checkbox>
                      </Form.Item>
                      <Form.Item name="sensitive" valuePropName="checked" noStyle>
                        <Checkbox>敏感</Checkbox>
                      </Form.Item>
                    </Space>
                  </Col>
                </Row>
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
              title="确认审核排货"
              open={Boolean(pendingRoutingApprovalShipment)}
              destroyOnHidden
              okText="确认审核"
              cancelText="取消"
              onOk={() => void confirmPendingRoutingApproval()}
              onCancel={() => setPendingRoutingApprovalShipment(null)}
            >
              <Alert
                className="notice-bar"
                type="warning"
                showIcon
                message={pendingRoutingApprovalShipment
                  ? `${pendingRoutingApprovalShipment.systemOrderNo} 审核通过后将进入已排货，并同步进入仓库待出库。`
                  : '确认后将进入仓库待出库。'}
              />
            </Modal>
            <Modal
              title={<span id="shipment-operation-log-title-global">{logViewingMode === 'routing' ? '排货日志' : '操作日志'}</span>}
              aria-labelledby="shipment-operation-log-title-global"
              className="shipment-operation-log-modal"
              open={Boolean(logViewingShipment) && !orderManagementOwnsShipmentOverlays}
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
              <ManagedTable
                className="shipment-operation-log-table"
                rowKey="id"
                size="small"
                pagination={paginationWhenNeeded(shipmentLogs.length)}
                dataSource={shipmentLogs}
                sticky={false}
                minimumScrollX={0}
                resizableColumns={false}
                columnSettings={false}
                recordDetail={false}
                tableLayout="fixed"
                columns={[
                  { title: '操作时间', dataIndex: 'operatedAt', width: 180, render: (value: string) => formatBeijingDateTime(value) },
                  { title: '操作人员', dataIndex: 'operator', width: 96 },
                  { title: '操作动作', dataIndex: 'action' }
                ]}
              />
            </Modal>
            <ProblemTicketCreateModal
              shipment={fulfillmentProblemShipment}
              apiClient={apiClient}
              role={session.user.role}
              defaultCustomerVisible
              showCustomerVisible={false}
              onCancel={() => setFulfillmentProblemShipment(null)}
              onSubmit={submitFulfillmentProblem}
            />
          </Content>
          </ModuleSubNavContext.Provider>
        </Layout>
      </Layout>
      </AntdApp>
    </ConfigProvider>
  );
}
