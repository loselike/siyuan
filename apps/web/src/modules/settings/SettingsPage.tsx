import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Activity, AlertTriangle, Building2, ChevronDown, ClipboardCheck, Copy, Edit, Ellipsis, FileInput, FileText, LockKeyhole, PlusCircle, Power, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react';
import { Alert, Button, Card, Checkbox, Col, DatePicker, Dropdown, Flex, Form, Input, Modal, Popconfirm, Radio, Row, Select, Space, Statistic, Tag, Typography } from 'antd';
import type { DatePickerProps } from 'antd/es/date-picker';
import zhCNDatePickerLocale from 'antd/es/date-picker/locale/zh_CN';
import type { AuditLogDashboardSummary, AuditLogListResponse, AuditLogQuery, AuditLogSummary, DepartmentSummary, SiteSummary, StaffAccountCreateInput, StaffAccountQuery, StaffAccountRoleKey, StaffAccountSummary, StaffGender } from '@siyuan/shared';
import { ApiClient, isAdministratorRole, type PermissionKey, type RoleGroupInput, type RoleKey, type RolePermissionMatrix, type RolePermissionRow } from '../../apiClient';
import { getPasswordStrengthErrorForUi } from '../appShell/config';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { addRowsWorksheet, createWorkbook, downloadWorkbook, loadExcel, readWorkbook, worksheetToRows } from '../shared/excel';
import { formatBeijingDate, formatBeijingDateTime, formatBeijingDateTimeInputValue, parseBeijingDateTimeInputToIso } from '../shared/format';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, createNoticeMessage, renderFilterActions, renderFilterField, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import {
  getPermissionControls,
  getPermissionGroupAccessState,
  getPermissionGroupAccessControl,
  filterPermissionControlsForRole,
  isPermissionAssignableForRole,
  isUiPreferencePermission,
  updateFinanceOrderFeePermission,
  updatePermissionControl,
  updatePermissionGroupAccess
} from './rolePermissionPresentation';
import { createUserGroupSiteOptions, matchesUserGroupSiteOption } from './userGroupSiteOptions';
import {
  getPermissionWorkspaceDefinition,
  getWorkspacePermissionGroups,
  globalFieldMaskCatalog,
  globalFieldMaskPermissionCode,
  permissionWorkspaceCatalog,
  lineShipmentStageEditControls,
  lineShipmentStageEditPermissionCode,
  pricingLookupModuleControls,
  pricingLookupPermissionCode,
  pricingPriceBookPermissionControls,
  pricingMarkupPermissionControls,
  pricingMarkupPermissionCode,
  orderEntryPermissionControls,
  orderEntryDraftPermissionControls,
  pendingReviewPermissionControls,
  customerServiceDataConfirmPermissionControls,
  customerServicePendingRoutingPermissionControls,
  customerServiceTransferPermissionControls,
  customerServiceViewPermissionFor,
  updateGlobalFieldMaskPermissions,
  type PermissionWorkspaceKey
} from './rolePermissionCatalog';

const { Text } = Typography;
const auditDateTimeFormat = 'YYYY-MM-DD HH:mm';
const auditDatePickerLocale = { ...zhCNDatePickerLocale, lang: { ...zhCNDatePickerLocale.lang, ok: '确认' } } as DatePickerProps['locale'];
const isAdministratorRoleRow = (role: Pick<RolePermissionRow, 'key' | 'administratorEquivalent'> | null | undefined) =>
  role?.administratorEquivalent === true || isAdministratorRole(role?.key);

function getAuditDateTimeValue(value?: string) {
  const parsed = value ? dayjs(formatBeijingDateTimeInputValue(value)) : null;
  return parsed?.isValid() ? parsed : null;
}

function getAuditDateTimeFilterValue(value: string | string[]) {
  return typeof value === 'string' && value ? parseBeijingDateTimeInputToIso(value.replace(' ', 'T')) : undefined;
}

interface SiteFormValues {
  sortOrder: string;
  name: string;
  enabled: 'true' | 'false';
}

interface RoleGroupFormValues {
  sortOrder: string;
  label: string;
  description?: string;
  site?: string;
  enabled: 'true' | 'false';
  templateRole?: RoleKey;
  sourceRoleKey?: RoleKey;
}

interface RolePermissionCopyFormValues {
  sourceRoleKey: RoleKey;
}

const staffGenderOptions: Array<{ label: string; value: StaffGender }> = [
  { label: '未填写', value: 'UNKNOWN' },
  { label: '男', value: 'MALE' },
  { label: '女', value: 'FEMALE' },
  { label: '其他', value: 'OTHER' }
];

function getStaffGenderLabel(gender?: string) {
  return staffGenderOptions.find((item) => item.value === gender)?.label ?? '未填写';
}

function isStaffProfileIncomplete(account: StaffAccountSummary) {
  return !account.name?.trim() || !account.departmentId || !account.site?.trim() || !account.roleLabel?.trim();
}

const staffImportHeaders = ['账户', '密码', '部门', '中文名', '性别', '所属站点', '状态', '所属用户组'];

function getImportCell(row: Record<string, unknown>, key: string) {
  return String(row[key] ?? '').trim();
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  const nativeReader = (file as File & { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
  if (nativeReader) return nativeReader.call(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

const auditModuleOptions = [
  { label: '认证登录', value: 'auth' },
  { label: '系统设置', value: 'system' },
  { label: '我的订单', value: 'shipment' },
  { label: '仓库管理', value: 'warehouse' },
  { label: '财务结算', value: 'finance' },
  { label: '报价查价', value: 'pricing' },
  { label: '轨迹监控', value: 'tracking' },
  { label: '演示数据', value: 'demo' },
  { label: '其他', value: 'other' }
];

const financeCatalogLabels: Record<string, string> = {
  FEE_NAME: '费用名称',
  SETTLEMENT_METHOD: '结算方式',
  CARGO_TYPE: '货物类型',
  PRODUCT_NAME: '品名'
};

function getAuditTargetDisplay(row: AuditLogSummary) {
  const target = row.target.trim();
  const match = target.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/i);
  if (!match) return { label: target || '未记录对象', detail: '' };
  const method = match[1].toUpperCase();
  const url = new URL(match[2], 'http://local');
  const verb = method === 'GET' ? '查看' : method === 'POST' ? '新增' : method === 'DELETE' ? '删除' : '修改';
  if (url.pathname === '/api/finance/catalog') {
    const category = financeCatalogLabels[url.searchParams.get('category') ?? ''] ?? '财务资料';
    return { label: `${verb}财务资料库：${category}`, detail: target };
  }
  if (url.pathname === '/api/shipments') return { label: `${verb}运单列表`, detail: target };
  if (url.pathname === '/api/system/audit-logs') return { label: `${verb}操作日志`, detail: target };
  return { label: `${verb}${row.moduleLabel}数据`, detail: target };
}

function isImportantAudit(row: AuditLogSummary) {
  return row.result === 'FAILED'
    || /(delete|void|purge|clear|删除|作废|清除)/i.test(row.action)
    || /(audit|review|审核|反审核)/i.test(row.action)
    || /(permission|role|权限)/i.test(row.action)
    || /(finance|payment|voucher|receipt|payable|receivable|财务|付款|水单|应收|应付)/i.test(row.action)
    || /(import|export|导入|导出)/i.test(row.action);
}

function getAuditRisk(row: AuditLogSummary) {
  if (row.result === 'FAILED' || /(delete|void|purge|clear|删除|作废|清除|finance|payment|voucher|receipt|permission|role)/i.test(row.action)) {
    return { label: '重要操作', color: 'orange' };
  }
  return { label: '一般操作', color: 'default' };
}

function formatJsonBlock(value: unknown) {
  return value ? JSON.stringify(value, null, 2) : '无记录';
}

function getAuditIpText(row?: AuditLogSummary | null) {
  return row?.ipAddress?.trim() || '-';
}

function buildAuditShortcut(days: number): Pick<AuditLogQuery, 'startedAt' | 'endedAt'> {
  const end = new Date();
  const [year, month, day] = formatBeijingDate(end).split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day - (days - 1), -8, 0, 0, 0));
  return { startedAt: start.toISOString(), endedAt: end.toISOString() };
}

function AuditSparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="audit-sparkline" aria-hidden="true">
      {values.map((value, index) => (
        <span key={`${index}-${value}`} style={{ height: `${Math.max(18, (value / max) * 100)}%` }} />
      ))}
    </span>
  );
}

function AuditMetricCard({ icon, title, metric, tone }: { icon: ReactNode; title: string; metric?: AuditLogDashboardSummary['metrics']['total']; tone: string }) {
  const change = metric?.changePercent ?? 0;
  return (
    <Card className={`audit-metric-card audit-metric-${tone}`}>
      <Flex justify="space-between" align="center" gap={12}>
        <Space align="center" size={12}>
          <span className="audit-metric-icon">{icon}</span>
          <Statistic title={title} value={metric?.value ?? 0} />
        </Space>
        <AuditSparkline values={metric?.trend ?? []} />
      </Flex>
      <Text className={change >= 0 ? 'audit-change-up' : 'audit-change-down'}>
        较昨日 {change >= 0 ? '+' : ''}{change}%
      </Text>
    </Card>
  );
}

export function SettingsPage({
  apiClient,
  onAiAssist,
  aiLoading,
  permissions,
  onNavigateToSection,
  initialSection
}: {
  apiClient: ApiClient;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  permissions: PermissionKey[];
  onNavigateToSection: (sectionKey: string) => void;
  initialSection?: string;
}) {
  const [settingsNotice, setSettingsNoticeState] = useState<string | null>(null);
  const setSettingsNotice = useCallback((message: string | null) => {
    setSettingsNoticeState(createNoticeMessage(message));
  }, []);
  const [roleMatrix, setRoleMatrix] = useState<RolePermissionMatrix | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, PermissionKey[]>>({});
  const [activeSettingsSection, setActiveSettingsSection] = useState(initialSection ?? 'accounts');
  const [auditLogs, setAuditLogs] = useState<AuditLogSummary[]>([]);
  const [auditWarnings, setAuditWarnings] = useState<AuditLogListResponse['suspiciousDeleteWarnings']>([]);
  const [auditDashboard, setAuditDashboard] = useState<AuditLogDashboardSummary | null>(null);
  const [auditPagination, setAuditPagination] = useState({ page: 1, pageSize: 10, totalItems: 0 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditDraftFilters, setAuditDraftFilters] = useState<AuditLogQuery>({});
  const [auditAppliedFilters, setAuditAppliedFilters] = useState<AuditLogQuery>({});
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(null);
  const [auditDetailOpen, setAuditDetailOpen] = useState(false);
  const [auditAdvancedOpen, setAuditAdvancedOpen] = useState(false);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountSummary[]>([]);
  const [staffManagerAccounts, setStaffManagerAccounts] = useState<StaffAccountSummary[]>([]);
  const [staffAccountsLoading, setStaffAccountsLoading] = useState(false);
  const [selectedStaffAccountIds, setSelectedStaffAccountIds] = useState<string[]>([]);
  const [staffFilters, setStaffFilters] = useState<StaffAccountQuery>({ status: 'ALL' });
  const [staffAppliedFilters, setStaffAppliedFilters] = useState<StaffAccountQuery>({ status: 'ALL' });
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);
  const [editingStaffAccount, setEditingStaffAccount] = useState<StaffAccountSummary | null>(null);
  const [staffCreateForm] = Form.useForm<StaffAccountCreateInput>();
  const selectedStaffSite = Form.useWatch('site', staffCreateForm);
  const staffImportInputRef = useRef<HTMLInputElement | null>(null);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [siteFilters, setSiteFilters] = useState({ name: '', status: 'ALL' });
  const [siteAppliedFilters, setSiteAppliedFilters] = useState(siteFilters);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteCreateOpen, setSiteCreateOpen] = useState(false);
  const [siteDisableConfirmOpen, setSiteDisableConfirmOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteSummary | null>(null);
  const [siteForm] = Form.useForm<SiteFormValues>();
  const [selectedRoleGroupKey, setSelectedRoleGroupKey] = useState<RoleKey | null>(null);
  const [roleGroupFilters, setRoleGroupFilters] = useState({ keyword: '', site: undefined as string | undefined, status: 'ALL' as 'ALL' | 'ENABLED' | 'DISABLED' });
  const [roleGroupAppliedFilters, setRoleGroupAppliedFilters] = useState({ keyword: '', site: undefined as string | undefined, status: 'ALL' as 'ALL' | 'ENABLED' | 'DISABLED' });
  const [roleGroupAuditLogs, setRoleGroupAuditLogs] = useState<AuditLogSummary[]>([]);
  const [roleGroupOpen, setRoleGroupOpen] = useState(false);
  const [roleGroupDetailOpen, setRoleGroupDetailOpen] = useState(false);
  const [editingRoleGroup, setEditingRoleGroup] = useState<RolePermissionRow | null>(null);
  const [roleGroupForm] = Form.useForm<RoleGroupFormValues>();
  const [rolePermissionCopyOpen, setRolePermissionCopyOpen] = useState(false);
  const [rolePermissionCopyLoading, setRolePermissionCopyLoading] = useState(false);
  const [rolePermissionCopyError, setRolePermissionCopyError] = useState<string | null>(null);
  const [rolePermissionCopyTarget, setRolePermissionCopyTarget] = useState<RolePermissionRow | null>(null);
  const [rolePermissionCopyForm] = Form.useForm<RolePermissionCopyFormValues>();
  const selectedRolePermissionCopySourceKey = Form.useWatch('sourceRoleKey', rolePermissionCopyForm);
  const [selectedPermissionRoleKey, setSelectedPermissionRoleKey] = useState<RoleKey | null>(null);
  const [selectedPermissionWorkspace, setSelectedPermissionWorkspace] = useState<PermissionWorkspaceKey>('operations');
  const [selectedWorkspacePermissionGroup, setSelectedWorkspacePermissionGroup] = useState<string | null>(null);
  const [selectedPermissionWorkspaceView, setSelectedPermissionWorkspaceView] = useState<'entries' | 'rules'>('entries');
  const hasSystemPermission = (...keys: PermissionKey[]) => keys.some((key) => permissions.includes(key));
  const settingsSubItems: ModuleSubNavItem[] = [
    hasSystemPermission('system:user-groups:read') && { key: 'userGroups', label: '用户组', description: '组织与角色组' },
    hasSystemPermission('system:accounts:read') && { key: 'accounts', label: '用户名', description: '账号与数据范围' },
    hasSystemPermission('system:sites:read') && { key: 'sites', label: '站点', description: '站点资料' },
    hasSystemPermission('system:audit:read') && { key: 'audit', label: '操作日志', description: '操作记录' },
    hasSystemPermission('system:role-permissions:read') && { key: 'rolePermissions', label: '角色权限分配', description: '员工端权限' },
    hasSystemPermission('system:security:read') && { key: 'security', label: '权限安全区', description: '风险边界提示' },
    hasSystemPermission('system:ai-security:read') && { key: 'aiSecurity', label: 'AI 接口安全', description: '密钥与调用入口' },
    hasSystemPermission('system:base-config:read') && { key: 'baseConfig', label: '系统基础配置', description: '模板与状态字典' }
  ].filter(Boolean) as ModuleSubNavItem[];
  useEffect(() => {
    if (initialSection) setActiveSettingsSection(initialSection);
  }, [initialSection]);
  useEffect(() => {
    if (settingsSubItems.length && !settingsSubItems.some((item) => item.key === activeSettingsSection)) {
      setActiveSettingsSection(settingsSubItems[0].key);
    }
  }, [activeSettingsSection, settingsSubItems]);
  const builtinStaffRoleOptions: Array<{ label: string; value: StaffAccountRoleKey }> = [
    { label: '系统管理员', value: 'ADMIN' },
    { label: '客服', value: 'CUSTOMER_SERVICE' },
    { label: '业务员', value: 'OPERATOR' },
    { label: '仓库', value: 'WAREHOUSE' },
    { label: '财务', value: 'FINANCE' }
  ];

  const handleSettingAction = (message: string) => {
    setSettingsNotice(message);
  };

  function openRolePermissions(roleKey: RoleKey) {
    setSelectedPermissionRoleKey(roleKey);
    setActiveSettingsSection('rolePermissions');
    onNavigateToSection('rolePermissions');
  }

  const loadStaffAccounts = useCallback(async () => {
    setStaffAccountsLoading(true);
    try {
      const accounts = await apiClient.staffAccounts(staffAppliedFilters);
      setStaffAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : '员工账号加载失败');
      setStaffAccounts([]);
    } finally {
      setStaffAccountsLoading(false);
    }
  }, [apiClient, staffAppliedFilters]);

  const loadSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const rows = await apiClient.systemDirectory.sites();
      setSites(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : '站点加载失败');
      setSites([]);
    } finally {
      setSitesLoading(false);
    }
  }, [apiClient]);

  const loadDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const rows = await apiClient.systemDirectory.departments();
      setDepartments(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : '部门加载失败');
      setDepartments([]);
    } finally {
      setDepartmentsLoading(false);
    }
  }, [apiClient, setSettingsNotice]);

  async function submitSite() {
    const values = await siteForm.validateFields();
    const input = { name: values.name.trim(), sortOrder: Number(values.sortOrder) || 0, enabled: values.enabled === 'true' };
    const site = editingSite
      ? await apiClient.systemDirectory.updateSite(editingSite.id, input)
      : await apiClient.systemDirectory.createSite(input);
    setSites((current) => [...current.filter((item) => item.id !== site.id), site].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
    setSiteCreateOpen(false);
    setEditingSite(null);
    siteForm.resetFields();
    setSettingsNotice(editingSite ? `${site.name} 已更新` : `${site.name} 已创建`);
  }

  async function updateSiteEnabled(site: SiteSummary, enabled: boolean) {
    const updated = await apiClient.systemDirectory.updateSiteEnabled(site.id, { enabled });
    setSites((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSettingsNotice(`${updated.name} 已${enabled ? '启用' : '停用'}`);
  }

  function upsertRoleRow(role: RolePermissionRow) {
    setRoleMatrix((current) =>
      current
        ? {
            ...current,
            roles: [...current.roles.filter((item) => item.key !== role.key), role].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.label.localeCompare(right.label))
          }
        : current
    );
    setDraftPermissions((current) => ({ ...current, [role.key]: role.permissions }));
  }

  async function submitRoleGroup() {
    const values = await roleGroupForm.validateFields();
    const input: RoleGroupInput = {
      label: values.label.trim(),
      description: values.description?.trim(),
      site: values.site?.trim(),
      sortOrder: Number(values.sortOrder) || 0,
      enabled: values.enabled === 'true',
      sourceRoleKey: values.sourceRoleKey
    };
    const role = editingRoleGroup ? await apiClient.updateRoleGroup(editingRoleGroup.key, input) : await apiClient.createRoleGroup(input);
    upsertRoleRow(role);
    setRoleGroupOpen(false);
    setEditingRoleGroup(null);
    roleGroupForm.resetFields();
    setSelectedRoleGroupKey(role.key);
    setSettingsNotice(editingRoleGroup ? `${role.label} 已更新` : `${role.label} 已创建`);
  }

  async function disableRoleGroup(role: RolePermissionRow) {
    const updated = await apiClient.updateRoleGroupEnabled(role.key, { enabled: false });
    upsertRoleRow(updated);
    setSettingsNotice(`${updated.label} 已停用`);
  }

  async function deleteRoleGroup(role: RolePermissionRow) {
    try {
      const deleted = await apiClient.deleteRoleGroup(role.key);
      setRoleMatrix((current) => current ? { ...current, roles: current.roles.filter((item) => item.key !== role.key) } : current);
      setDraftPermissions((current) => {
        const next = { ...current };
        delete next[role.key];
        return next;
      });
      setSelectedRoleGroupKey(null);
      setRoleGroupDetailOpen(false);
      setSettingsNotice(`${deleted.label} 已删除`);
    } catch (error) {
      setSettingsNotice(`删除用户组失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    }
  }

  function openRolePermissionCopy(role: RolePermissionRow) {
    setRolePermissionCopyTarget(role);
    setRolePermissionCopyError(null);
    rolePermissionCopyForm.resetFields();
    setRolePermissionCopyOpen(true);
  }

  async function submitRolePermissionCopy() {
    if (!rolePermissionCopyTarget) return;
    const values = await rolePermissionCopyForm.validateFields();
    setRolePermissionCopyLoading(true);
    setRolePermissionCopyError(null);
    try {
      const updated = await apiClient.copyRolePermissions(rolePermissionCopyTarget.key, values.sourceRoleKey);
      upsertRoleRow(updated);
      setRolePermissionCopyOpen(false);
      rolePermissionCopyForm.resetFields();
      setSettingsNotice(`已用${selectedRolePermissionCopySource?.label ?? '来源用户组'}的权限覆盖${updated.label}`);
      setRolePermissionCopyTarget(null);
    } catch (error) {
      setRolePermissionCopyError(error instanceof Error ? error.message : '复制权限失败');
    } finally {
      setRolePermissionCopyLoading(false);
    }
  }

  async function submitStaffAccountCreate() {
    const values = await staffCreateForm.validateFields();
    const input = { ...values, directManagerId: values.directManagerId ?? null };
    const saved = editingStaffAccount
      ? await apiClient.updateStaffAccount(editingStaffAccount.id, input)
      : await apiClient.createStaffAccount(input);
    setStaffCreateOpen(false);
    setEditingStaffAccount(null);
    staffCreateForm.resetFields();
    const createdTemporaryPassword = (saved as StaffAccountSummary & { temporaryPassword?: string }).temporaryPassword;
    setSettingsNotice(editingStaffAccount
      ? `${saved.username} 已更新`
      : `已新建用户 ${saved.username}${createdTemporaryPassword ? `，随机初始密码：${createdTemporaryPassword}` : ''}。该账号首次登录必须修改密码。`);
    await loadStaffAccounts();
  }

  function openStaffAccountEditor(account: StaffAccountSummary | null) {
    void apiClient.staffAccounts({ status: 'ENABLED' }).then(setStaffManagerAccounts).catch((error) => {
      setStaffManagerAccounts([]);
      setSettingsNotice(error instanceof Error ? error.message : '直属经理候选加载失败');
    });
    setEditingStaffAccount(account);
    staffCreateForm.resetFields();
    staffCreateForm.setFieldsValue(account
      ? {
          username: account.username,
          name: account.name,
          nickname: account.nickname,
          departmentId: account.departmentId,
          directManagerId: account.directManagerId,
          phone: account.phone,
          gender: account.gender ?? 'UNKNOWN',
          site: account.site,
          enabled: account.enabled,
          role: account.role
        }
      : { role: 'OPERATOR', gender: 'UNKNOWN', enabled: true, directManagerId: null });
    setStaffCreateOpen(true);
  }

  async function updateStaffAccountsEnabled(userIds: string[], enabled: boolean) {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (!ids.length) return;
    await Promise.all(ids.map((id) => apiClient.updateStaffAccountEnabled(id, { enabled })));
    setSettingsNotice(`已${enabled ? '启用' : '停用'} ${ids.length} 个员工账号`);
    await loadStaffAccounts();
  }

  async function deleteStaffAccount(id: string) {
    const deleted = await apiClient.deleteStaffAccount(id);
    setSelectedStaffAccountIds((current) => current.filter((item) => item !== id));
    setSettingsNotice(`${deleted.username} 已删除`);
    await loadStaffAccounts();
  }

  async function resetStaffAccountPasswords(userIds: string[]) {
    const results = await apiClient.resetStaffAccountPasswords({ userIds });
    const passwordHints = results.map((item) => `${item.username}: ${item.temporaryPassword}`).join('；');
    setSettingsNotice(`已重置 ${results.length} 个员工密码。${passwordHints}。这些账号下次登录必须修改密码。`);
    setSelectedStaffAccountIds([]);
    await loadStaffAccounts();
  }

  function confirmStaffAccountRowAction(account: StaffAccountSummary, action: 'reset' | 'toggle' | 'delete') {
    if (action === 'reset') {
      Modal.confirm({
        title: '确认重置密码？',
        content: `账号 ${account.username} 将生成新的随机临时密码，并要求下次登录修改密码。重置后请立即安全转交临时密码。`,
        okText: '确认重置',
        cancelText: '取消',
        onOk: () => resetStaffAccountPasswords([account.id])
      });
      return;
    }
    if (action === 'toggle') {
      Modal.confirm({
        title: `确认${account.enabled ? '停用' : '启用'}该员工账号？`,
        content: account.enabled ? '停用后账号不可登录，但会保留历史记录。' : '启用后账号可重新登录。',
        okText: `确认${account.enabled ? '停用' : '启用'}`,
        cancelText: '取消',
        okButtonProps: account.enabled ? { danger: true } : undefined,
        onOk: () => updateStaffAccountsEnabled([account.id], !account.enabled)
      });
      return;
    }
    Modal.confirm({
      title: '删除员工账号',
      content: '删除后不可恢复，请确认该账号无未完成业务。',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => deleteStaffAccount(account.id)
    });
  }

  useEffect(() => {
    let mounted = true;
    void apiClient.rolePermissions().then((matrix) => {
      if (!mounted) {
        return;
      }
      setRoleMatrix(matrix);
      setDraftPermissions(
        matrix.roles.reduce(
          (acc, role) => ({ ...acc, [role.key]: role.permissions }),
          {} as Record<string, PermissionKey[]>
        )
      );
    });
    return () => {
      mounted = false;
    };
  }, [apiClient]);

  useEffect(() => {
    if (!['accounts', 'userGroups'].includes(activeSettingsSection)) {
      return;
    }
    if (activeSettingsSection === 'userGroups') {
      setStaffAccountsLoading(true);
      void apiClient.staffAccounts({ status: 'ALL' }).then((accounts) => {
        setStaffAccounts(Array.isArray(accounts) ? accounts : []);
      }).catch((error: unknown) => {
        setSettingsNotice(error instanceof Error ? error.message : '员工账号加载失败');
        setStaffAccounts([]);
      }).finally(() => setStaffAccountsLoading(false));
      return;
    }
    void loadStaffAccounts();
  }, [activeSettingsSection, apiClient, loadStaffAccounts, setSettingsNotice]);

  useEffect(() => {
    if (activeSettingsSection !== 'accounts') return;
    void loadDepartments();
  }, [activeSettingsSection, loadDepartments]);

  useEffect(() => {
    if (!['accounts', 'sites', 'userGroups'].includes(activeSettingsSection)) {
      return;
    }
    void loadSites();
  }, [activeSettingsSection, loadSites]);

  useEffect(() => {
    if (activeSettingsSection !== 'audit') {
      return;
    }
    let mounted = true;
    setAuditLoading(true);
    void apiClient.auditQuery
      .auditLogs({ page: auditPagination.page, pageSize: auditPagination.pageSize, ...auditAppliedFilters })
      .then((response) => {
        if (!mounted) {
          return;
        }
        setAuditLogs(response.rows);
        setAuditWarnings(response.suspiciousDeleteWarnings);
        setAuditDashboard(response.dashboard ?? null);
        setAuditPagination(response.pagination);
        setSelectedAuditLogId((current) => (current && response.rows.some((row) => row.id === current) ? current : response.rows[0]?.id ?? null));
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }
        setSettingsNotice(error instanceof Error ? error.message : '审计日志加载失败');
      })
      .finally(() => {
        if (mounted) {
          setAuditLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [activeSettingsSection, apiClient, auditAppliedFilters, auditPagination.page, auditPagination.pageSize]);

  const allRoleRows = useMemo(() => roleMatrix?.roles ?? [], [roleMatrix]);
  const selectedAuditLog = useMemo(
    () => auditLogs.find((row) => row.id === selectedAuditLogId) ?? null,
    [auditLogs, selectedAuditLogId]
  );
  const roleRows = useMemo(() => allRoleRows.filter((role) => role.key !== 'CUSTOMER'), [allRoleRows]);
  const rolePermissionRows = useMemo(() => roleRows.filter((role) => role.enabled !== false && (!role.systemBuiltin || isAdministratorRoleRow(role))), [roleRows]);
  const selectedPermissionRole =
    rolePermissionRows.find((role) => role.key === selectedPermissionRoleKey)
    ?? rolePermissionRows.find((role) => !isAdministratorRoleRow(role))
    ?? rolePermissionRows[0]
    ?? null;
  const userGroupRows = useMemo(() => roleRows.filter((role) => !role.systemBuiltin || role.administratorEquivalent === true), [roleRows]);
  const enabledSiteOptions = useMemo(() => createUserGroupSiteOptions(sites), [sites]);
  const departmentOptions = useMemo(
    () => departments.map((department) => ({ label: department.name, value: department.id, disabled: !department.enabled })),
    [departments]
  );
  const roleGroupSiteOptions = useMemo(
    () => [...new Set([...userGroupRows.map((role) => role.site).filter(Boolean), ...enabledSiteOptions.map((site) => site.value)])].map((site) => ({ label: site as string, value: site as string })),
    [enabledSiteOptions, userGroupRows]
  );
  const filteredUserGroupRows = useMemo(() => userGroupRows.filter((role) => {
    const keyword = roleGroupAppliedFilters.keyword.trim().toLowerCase();
    const matchesKeyword = !keyword || [role.label, role.description, role.site].some((value) => value?.toLowerCase().includes(keyword));
    const matchesSite = !roleGroupAppliedFilters.site || role.site === roleGroupAppliedFilters.site;
    const matchesStatus = roleGroupAppliedFilters.status === 'ALL' || (roleGroupAppliedFilters.status === 'ENABLED' ? role.enabled !== false : role.enabled === false);
    return matchesKeyword && matchesSite && matchesStatus;
  }), [roleGroupAppliedFilters, userGroupRows]);
  const selectedRoleGroup = filteredUserGroupRows.find((role) => role.key === selectedRoleGroupKey) ?? null;
  const roleGroupStaff = staffAccounts.filter((account) => account.role === selectedRoleGroup?.key);
  const roleGroupMetrics = {
    enabled: userGroupRows.filter((role) => role.enabled !== false).length,
    disabled: userGroupRows.filter((role) => role.enabled === false).length,
    boundStaff: staffAccounts.filter((account) => userGroupRows.some((role) => role.key === account.role)).length
  };
  const staffRoleOptions: Array<{ label: string; value: StaffAccountRoleKey }> = roleMatrix
    ? rolePermissionRows
      .filter((role) => !role.systemBuiltin || role.administratorEquivalent === true)
      .map((role) => ({ label: role.label, value: role.key as StaffAccountRoleKey }))
    : builtinStaffRoleOptions;
  const directManagerRoleKeys = useMemo(
    () => new Set((roleMatrix?.roles ?? [])
      .filter((role) => role.enabled !== false
        && role.permissions.includes('business:shipment:team-view')
        && !role.permissions.includes('business:shipment:all-view'))
      .map((role) => role.key)),
    [roleMatrix]
  );
  const directManagerOptions = useMemo(
    () => staffManagerAccounts
      .filter((account) => account.enabled
        && account.id !== editingStaffAccount?.id
        && Boolean(selectedStaffSite)
        && (account.site ?? undefined) === (selectedStaffSite ?? undefined)
        && directManagerRoleKeys.has(account.role))
      .map((account) => ({
        label: `${account.name || account.nickname || account.username} · ${account.username} · ${account.roleLabel}`,
        value: account.id
      })),
    [directManagerRoleKeys, editingStaffAccount?.id, selectedStaffSite, staffManagerAccounts]
  );
  const rolePermissionSourceOptions = rolePermissionRows
    .filter((role) => !isAdministratorRoleRow(role) && role.enabled !== false)
    .map((role) => ({
      label: `${role.label}${role.site ? ` · ${role.site}` : ''}`,
      value: role.key
    }));
  const selectedRolePermissionCopySource = rolePermissionRows.find((role) => role.key === selectedRolePermissionCopySourceKey) ?? null;
  const permissionGroups = useMemo(() => Object.entries(
    (roleMatrix?.availablePermissions ?? []).reduce<Record<string, RolePermissionMatrix['availablePermissions']>>((acc, permission) => {
      acc[permission.group] = [...(acc[permission.group] ?? []), permission];
      return acc;
    }, {})
  ), [roleMatrix?.availablePermissions]);
  const duplicatePermissionCodes = useMemo(() => {
    const seen = new Set<string>();
    return (roleMatrix?.availablePermissions ?? [])
      .filter((permission) => {
        if (seen.has(permission.code)) return true;
        seen.add(permission.code);
        return false;
      })
      .map((permission) => permission.code);
  }, [roleMatrix]);
  useEffect(() => {
    if (import.meta.env.DEV && duplicatePermissionCodes.length) {
      console.warn('角色权限矩阵包含重复 permission code', duplicatePermissionCodes);
    }
  }, [duplicatePermissionCodes]);
  const permissionWorkspace = getPermissionWorkspaceDefinition(selectedPermissionWorkspace);
  const workspacePermissionGroups = useMemo(
    () => getWorkspacePermissionGroups(permissionGroups, selectedPermissionWorkspace),
    [permissionGroups, selectedPermissionWorkspace]
  );
  const selectedWorkspacePermissions = workspacePermissionGroups.find(([group]) => group === selectedWorkspacePermissionGroup)
    ?? null;
  const firstLevelFieldMaskControls = useMemo(
    () => globalFieldMaskCatalog.map((rule) => ({
      ...rule,
      code: globalFieldMaskPermissionCode(rule.key)
    })),
    []
  );
  const selectedPermissionAccessControl = selectedWorkspacePermissions
    ? getPermissionGroupAccessControl(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1])
    : null;
  const selectedRoleGrantedPermissions = selectedPermissionRole
    ? draftPermissions[selectedPermissionRole.key] ?? selectedPermissionRole.permissions
    : [];
  const selectedAssignableWorkspacePermissions = useMemo(
    () => selectedWorkspacePermissions?.[1].filter((permission) =>
      isPermissionAssignableForRole(selectedPermissionRole?.key, permission.code, selectedRoleGrantedPermissions)
    ) ?? [],
    [selectedPermissionRole?.key, selectedRoleGrantedPermissions, selectedWorkspacePermissions]
  );
  const selectedPermissionAccessState = selectedPermissionAccessControl
    ? getPermissionGroupAccessState(
        selectedWorkspacePermissions![0],
        selectedWorkspacePermissions![1],
        selectedRoleGrantedPermissions
      )
    : { checked: false, indeterminate: false, grantedCount: 0 };
  const selectedTotalRules = selectedPermissionWorkspaceView === 'rules';
  const selectedLineShipmentPool = selectedWorkspacePermissions?.[0] === '运营工作台 / 专线运单池';
  const selectedOrderEntry = selectedWorkspacePermissions?.[0] === '业务管理 / 录单';
  const selectedOrderEntryDrafts = selectedWorkspacePermissions?.[0] === '业务管理 / 草稿箱';
  const selectedPendingReview = selectedWorkspacePermissions?.[0] === '业务管理 / 待审核运单';
  const selectedWarehouseEntry = selectedWorkspacePermissions?.[0].startsWith('仓库管理 / ') ?? false;
  const selectedWarehouseRentScope = selectedWorkspacePermissions?.[0] === '仓库管理 / 仓租数据范围';
  const selectedMarketEntry = selectedWorkspacePermissions?.[0].startsWith('市场管理 / ') ?? false;
  const selectedFinanceEntry = selectedWorkspacePermissions?.[0].startsWith('财务管理 / ') ?? false;
  const selectedCustomerServicePendingRouting = selectedWorkspacePermissions?.[0] === '客服管理 / 待排货';
  const selectedCustomerServiceDataConfirm = selectedWorkspacePermissions?.[0] === '客服管理 / 数据确认';
  const selectedCustomerServiceTransfer = selectedWorkspacePermissions?.[0] === '客服管理 / 转单号';
  const selectedCustomerServiceEntry = selectedWorkspacePermissions?.[0].startsWith('客服管理 / ') ?? false;
  const selectedOrderEntryPermissionStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return orderEntryPermissionControls.map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedRoleGrantedPermissions]);
  const selectedOrderEntryDraftPermissionStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return orderEntryDraftPermissionControls.map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedRoleGrantedPermissions]);
  const selectedPendingReviewPermissionStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return pendingReviewPermissionControls.map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedRoleGrantedPermissions]);
  const selectedMarketPermissionStates = useMemo(() => {
    if (!selectedMarketEntry || !selectedWorkspacePermissions) return [];
    const granted = new Set(selectedRoleGrantedPermissions);
    return filterPermissionControlsForRole(
      selectedPermissionRole?.key,
      getPermissionControls(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1]),
      selectedRoleGrantedPermissions
    )
      .map((control) => ({ ...control, checked: control.codes.every((code) => granted.has(code)) }));
  }, [selectedMarketEntry, selectedPermissionRole?.key, selectedRoleGrantedPermissions, selectedWorkspacePermissions]);
  const selectedFinancePermissionStates = useMemo(() => {
    if (!selectedFinanceEntry || !selectedWorkspacePermissions) return [];
    const granted = new Set(selectedRoleGrantedPermissions);
    return filterPermissionControlsForRole(
      selectedPermissionRole?.key,
      getPermissionControls(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1]),
      selectedRoleGrantedPermissions
    )
      .map((control) => ({ ...control, checked: control.codes.every((code) => granted.has(code)) }));
  }, [selectedFinanceEntry, selectedPermissionRole?.key, selectedRoleGrantedPermissions, selectedWorkspacePermissions]);
  const selectedGenericPermissionEntry = Boolean(selectedWorkspacePermissions && (
    (
      selectedWorkspacePermissions[0].startsWith('业务管理 / ')
      && !selectedOrderEntry
      && !selectedOrderEntryDrafts
      && !selectedPendingReview
    )
    || selectedWorkspacePermissions[0].startsWith('物流轨迹管理 / ')
    || selectedWorkspacePermissions[0].startsWith('杂费 / ')
    || selectedWorkspacePermissions[0].startsWith('基础资料库 / ')
    || selectedWorkspacePermissions[0].startsWith('系统管理 / ')
    || (
      selectedWorkspacePermissions[0].startsWith('运营工作台 / ')
      && !selectedLineShipmentPool
    )
  ));
  const selectedGenericPermissionStates = useMemo(() => {
    if (!selectedGenericPermissionEntry || !selectedWorkspacePermissions) return [];
    const granted = new Set(selectedRoleGrantedPermissions);
    return filterPermissionControlsForRole(
      selectedPermissionRole?.key,
      getPermissionControls(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1]),
      selectedRoleGrantedPermissions
    )
      .map((control) => ({ ...control, checked: control.codes.every((code) => granted.has(code)) }));
  }, [selectedGenericPermissionEntry, selectedPermissionRole?.key, selectedRoleGrantedPermissions, selectedWorkspacePermissions]);
  const selectedCustomerServicePendingRoutingPermissionStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return customerServicePendingRoutingPermissionControls
      .filter((control) => isPermissionAssignableForRole(selectedPermissionRole?.key, control.code, selectedRoleGrantedPermissions))
      .map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedPermissionRole?.key, selectedRoleGrantedPermissions]);
  const selectedCustomerServiceDataConfirmPermissionStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return customerServiceDataConfirmPermissionControls
      .filter((control) => isPermissionAssignableForRole(selectedPermissionRole?.key, control.code, selectedRoleGrantedPermissions))
      .map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedPermissionRole?.key, selectedRoleGrantedPermissions]);
  const selectedCustomerServiceTransferPermissionStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return customerServiceTransferPermissionControls
      .filter((control) => isPermissionAssignableForRole(selectedPermissionRole?.key, control.code, selectedRoleGrantedPermissions))
      .map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedPermissionRole?.key, selectedRoleGrantedPermissions]);
  const selectedCustomerServiceGenericPermissionStates = useMemo(() => {
    if (!selectedCustomerServiceEntry || !selectedWorkspacePermissions) return [];
    const explicitCodes = new Set([
      ...customerServicePendingRoutingPermissionControls.map((control) => control.code),
      ...customerServiceDataConfirmPermissionControls.map((control) => control.code),
      ...customerServiceTransferPermissionControls.map((control) => control.code)
    ]);
    const granted = new Set(selectedRoleGrantedPermissions);
    return filterPermissionControlsForRole(
      selectedPermissionRole?.key,
      getPermissionControls(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1]),
      selectedRoleGrantedPermissions
    )
      .filter((control) => !control.codes.every((code) => explicitCodes.has(code)))
      .map((control) => ({ ...control, checked: control.codes.every((code) => granted.has(code)) }));
  }, [selectedCustomerServiceEntry, selectedPermissionRole?.key, selectedRoleGrantedPermissions, selectedWorkspacePermissions]);
  const selectedLineShipmentBasePermissionStates = useMemo(() => {
    if (!selectedLineShipmentPool || !selectedWorkspacePermissions) return [];
    const granted = new Set(selectedRoleGrantedPermissions);
    return filterPermissionControlsForRole(
      selectedPermissionRole?.key,
      getPermissionControls(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1]),
      selectedRoleGrantedPermissions
    ).map((control) => ({ ...control, checked: control.codes.every((code) => granted.has(code)) }));
  }, [selectedLineShipmentPool, selectedPermissionRole?.key, selectedRoleGrantedPermissions, selectedWorkspacePermissions]);
  const selectedLineShipmentStagePermissionStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return lineShipmentStageEditControls.map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedRoleGrantedPermissions]);
  const selectedPricingLookupEntry = selectedWorkspacePermissions?.[0] === '报价查价 / 查价';
  const selectedPricingLookupStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return pricingLookupModuleControls.map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedRoleGrantedPermissions]);
  const selectedPricingMarkupEntry = selectedWorkspacePermissions?.[0] === '报价查价 / 代理加价规则';
  const selectedPricingBusinessEntry = selectedPricingLookupEntry
    || selectedPricingMarkupEntry
    || selectedWorkspacePermissions?.[0] === '报价查价 / 价格表管理';
  const selectedDirectBusinessGrantEntry = selectedPricingBusinessEntry || selectedOrderEntry || selectedOrderEntryDrafts || selectedPendingReview || selectedWarehouseEntry || selectedMarketEntry || selectedFinanceEntry || selectedCustomerServiceEntry || selectedGenericPermissionEntry || selectedLineShipmentPool;
  const selectedPricingMarkupStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return pricingMarkupPermissionControls.map((control) => ({
      ...control,
      actions: control.actions.map((action) => ({ ...action, checked: granted.has(action.code) }))
    }));
  }, [selectedRoleGrantedPermissions]);
  const selectedPriceBookManagementEntry = selectedWorkspacePermissions?.[0] === '报价查价 / 价格表管理';
  const selectedPricingPriceBookStates = useMemo(() => {
    const granted = new Set(selectedRoleGrantedPermissions);
    return pricingPriceBookPermissionControls.map((control) => ({ ...control, checked: granted.has(control.code) }));
  }, [selectedRoleGrantedPermissions]);
  const selectedPermissionRoleIsAdministrator = isAdministratorRoleRow(selectedPermissionRole);
  const filteredSites = sites.filter((site) => {
    const keyword = siteAppliedFilters.name.trim().toLowerCase();
    const matchesName = !keyword || site.name.toLowerCase().includes(keyword);
    const matchesStatus = siteAppliedFilters.status === 'ALL' || (siteAppliedFilters.status === 'ENABLED' ? site.enabled : !site.enabled);
    return matchesName && matchesStatus;
  });
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;
  const siteMetrics = {
    enabled: sites.filter((site) => site.enabled).length,
    disabled: sites.filter((site) => !site.enabled).length,
    boundStaff: staffAccounts.filter((account) => account.site && sites.some((site) => site.name === account.site)).length
  };
  const selectedStaffAccount = selectedStaffAccountIds.length === 1 ? staffAccounts.find((account) => account.id === selectedStaffAccountIds[0]) ?? null : null;
  const staffAccountMetrics = {
    active: staffAccounts.filter((account) => account.enabled).length,
    disabled: staffAccounts.filter((account) => !account.enabled).length,
    mustChangePassword: staffAccounts.filter((account) => account.mustChangePassword).length,
    incomplete: staffAccounts.filter(isStaffProfileIncomplete).length
  };

  useEffect(() => {
    if (activeSettingsSection !== 'userGroups') return;
    setSelectedRoleGroupKey((current) => (current && filteredUserGroupRows.some((role) => role.key === current) ? current : null));
  }, [activeSettingsSection, filteredUserGroupRows]);

  useEffect(() => {
    setSelectedWorkspacePermissionGroup((current) => (
      current && workspacePermissionGroups.some(([group]) => group === current)
        ? current
        : workspacePermissionGroups[0]?.[0] ?? null
    ));
  }, [workspacePermissionGroups]);

  useEffect(() => {
    if (activeSettingsSection !== 'userGroups' || !selectedRoleGroup) {
      setRoleGroupAuditLogs([]);
      return;
    }
    let mounted = true;
    void apiClient.auditQuery.auditLogs({ target: selectedRoleGroup.key, page: 1, pageSize: 5 }).then((response) => {
      if (mounted) setRoleGroupAuditLogs(response.rows);
    }).catch(() => {
      if (mounted) setRoleGroupAuditLogs([]);
    });
    return () => {
      mounted = false;
    };
  }, [activeSettingsSection, apiClient, selectedRoleGroup?.key]);

  async function downloadStaffImportTemplate() {
    const workbook = createWorkbook();
    const defaultRole = staffRoleOptions.find((role) => role.value === 'OPERATOR') ?? staffRoleOptions[0];
    addRowsWorksheet(workbook, '用户名导入模板', [
      staffImportHeaders,
      ['import001', 'Import@123', departmentOptions.find((department) => !department.disabled)?.label ?? '', '张三', '男', enabledSiteOptions[0]?.value ?? '', '在职', defaultRole?.label ?? '业务员']
    ]);
    await downloadWorkbook(workbook, '用户名批量导入模板.xlsx');
  }

  async function importStaffAccounts(file: File) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setSettingsNotice('仅支持导入 .xlsx 模板文件');
      return;
    }
    const workbook = await readWorkbook(await readFileAsArrayBuffer(file), await loadExcel());
    const sheet = workbook.worksheets[0];
    const [headers, ...dataRows] = sheet ? worksheetToRows(sheet) : [];
    const rows = dataRows.map((row) =>
      Object.fromEntries((headers ?? []).map((header, index) => [String(header ?? '').trim(), row[index] ?? '']))
    );
    const roleByText = new Map(staffRoleOptions.flatMap((role) => [[role.label, role.value], [role.value, role.value]]));
    const availableDepartments = departments.length ? departments : await apiClient.systemDirectory.departments();
    const departmentIdByText = new Map(availableDepartments.flatMap((department) => [[department.name, department.id], [department.id, department.id]]));
    const genderByText = new Map<string, StaffGender>([
      ['男', 'MALE'], ['女', 'FEMALE'], ['其他', 'OTHER'], ['未填写', 'UNKNOWN'],
      ['MALE', 'MALE'], ['FEMALE', 'FEMALE'], ['OTHER', 'OTHER'], ['UNKNOWN', 'UNKNOWN']
    ]);
    let successCount = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.entries()) {
      if (!Object.values(row).some((value) => String(value ?? '').trim())) continue;
      const username = getImportCell(row, '账户');
      try {
        const departmentText = getImportCell(row, '部门');
        const departmentId = departmentText ? departmentIdByText.get(departmentText) : undefined;
        if (departmentText && !departmentId) throw new Error(`部门“${departmentText}”不存在`);
        await apiClient.createStaffAccount({
          username,
          password: getImportCell(row, '密码') || undefined,
          departmentId,
          name: getImportCell(row, '中文名') || undefined,
          gender: genderByText.get(getImportCell(row, '性别')) ?? 'UNKNOWN',
          site: getImportCell(row, '所属站点') || undefined,
          enabled: !['离职', '停用', 'false', 'FALSE', '0'].includes(getImportCell(row, '状态')),
          role: roleByText.get(getImportCell(row, '所属用户组')) ?? 'OPERATOR'
        });
        successCount += 1;
      } catch (error) {
        errors.push(`第 ${index + 2} 行 ${username || '未填账号'}：${error instanceof Error ? error.message : '导入失败'}`);
      }
    }
    setSettingsNotice(errors.length ? `导入成功 ${successCount} 条，失败 ${errors.length} 条：${errors.slice(0, 3).join('；')}` : `导入成功 ${successCount} 条`);
    await loadStaffAccounts();
  }

  async function saveRolePermissions(role: RolePermissionRow) {
    try {
      const updated = await apiClient.updateRolePermissions(role.key, draftPermissions[role.key] ?? []);
      setRoleMatrix((current) =>
        current
          ? {
              ...current,
              roles: current.roles.map((item) => (item.key === updated.key ? updated : item))
            }
          : current
      );
      setDraftPermissions((current) => ({ ...current, [updated.key]: updated.permissions }));
      setSettingsNotice(`${updated.label}权限已保存，RBAC 即时生效`);
    } catch (error) {
      setSettingsNotice(`保存权限失败：${error instanceof Error ? error.message : '请稍后重试'}`);
    }
  }

  function togglePermissionGroupAccess(
    roleKey: RoleKey,
    group: string,
    permissions: RolePermissionMatrix['availablePermissions'],
    checked: boolean
  ) {
    setDraftPermissions((current) => {
      const currentPermissions = current[roleKey] ?? selectedPermissionRole?.permissions ?? [];
      if (group === '报价查价 / 查价') {
        const next = new Set(currentPermissions);
        if (!checked) {
          Array.from(next)
            .filter((code) => code.startsWith('pricing:lookup:'))
            .forEach((code) => next.delete(code));
        }
        return { ...current, [roleKey]: Array.from(next) };
      }
      if (group === '报价查价 / 代理加价规则') {
        const next = new Set(currentPermissions);
        if (!checked) {
          Array.from(next)
            .filter((code) => code.startsWith('pricing:markup:'))
            .forEach((code) => next.delete(code));
        }
        return { ...current, [roleKey]: Array.from(next) };
      }
      const next = updatePermissionGroupAccess(
        currentPermissions,
        group,
        permissions,
        checked
      );
      if (group === '业务管理 / 录单' && !checked) {
        return {
          ...current,
          [roleKey]: next.filter((code) => !orderEntryPermissionControls.some((control) => control.code === code))
        };
      }
      return {
        ...current,
        [roleKey]: !checked && group === '运营工作台 / 专线运单池'
          ? next.filter((code) => !code.startsWith('operations:line-shipment:stage-edit:') && !code.startsWith('operations:line-shipment:stage-edit-block:'))
          : next
      };
    });
  }

  function toggleOrderEntryPermission(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      if (checked) next.add(code);
      else {
        next.delete(code);
        if (code === 'business:order-entry:edit') {
          [
            'business:order-entry:create',
            'business:order-entry:warehouse-package-select',
            'business:order-entry:submit-review',
            'business:order-entry:invoice-upload',
            'business:order-entry:label-upload'
          ].forEach((permission) => next.delete(permission as PermissionKey));
        }
      }
      const hasCapability = orderEntryPermissionControls.some((control) => next.has(control.code));
      if (hasCapability) {
        next.add('business:order-entry:view');
        next.add('business:order-entry:draft-view');
      } else {
        next.delete('business:order-entry:view');
        if (!next.has('business:order-entry:draft-edit') && !next.has('business:order-entry:draft-delete')) {
          next.delete('business:order-entry:draft-view');
        }
      }
      if (checked && code === 'business:order-entry:edit') {
        [
          'business:order-entry:create',
          'business:order-entry:warehouse-package-select',
          'business:order-entry:submit-review',
          'business:order-entry:invoice-upload',
          'business:order-entry:label-upload'
        ].forEach((permission) => next.add(permission as PermissionKey));
      }
      if (checked && (code === 'business:order-entry:business-cost' || code === 'business:order-entry:payable-fee')) {
        next.add('master-data:agents:read');
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function shouldKeepCustomerServiceException(permission: PermissionKey, parentCode: PermissionKey) {
    return (parentCode === 'customer-service:problem:view' && permission === 'customer-service:problem:after-sale-view')
      || (parentCode === 'customer-service:signed:view' && permission === 'customer-service:signed:after-sale-view');
  }

  function toggleCustomerServicePermission(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      if (checked) {
        next.add(code);
        const viewPermission = customerServiceViewPermissionFor(code);
        if (viewPermission) next.add(viewPermission);
      } else {
        next.delete(code);
        if (code.endsWith(':view')) {
          const sectionPrefix = `${code.slice(0, -':view'.length)}:`;
          for (const permission of [...next]) {
            if (
              permission.startsWith(sectionPrefix)
              && !permission.endsWith('-block')
              && !shouldKeepCustomerServiceException(permission, code)
            ) next.delete(permission);
          }
        }
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function toggleOrderEntryDraftPermission(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      if (checked) {
        next.add(code);
        next.add('business:order-entry:draft-view');
        if (code === 'business:order-entry:draft-edit') next.add('business:order-entry:view');
      } else {
        next.delete(code);
        if (code === 'business:order-entry:draft-view') {
          next.delete('business:order-entry:draft-edit');
          next.delete('business:order-entry:draft-delete');
        }
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function togglePendingReviewPermission(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      if (checked) {
        next.add(code);
        if (code === 'business:review:edit') next.add('business:review:view');
      } else {
        next.delete(code);
        if (code === 'business:review:view') next.delete('business:review:edit');
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function toggleWarehousePermission(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      const groupPrefix = code.slice(0, code.lastIndexOf(':') + 1);
      if (checked) {
        next.add(code);
        if (code === 'warehouse:rent-detail:view'
          && !Array.from(next).some((permission) => permission.startsWith('warehouse:rent-detail:scope-'))) {
          next.add('warehouse:rent-detail:scope-self');
        }
        if (!code.endsWith(':view') && !code.includes(':scope-')) {
          next.add(`${groupPrefix}view` as PermissionKey);
        }
      } else {
        next.delete(code);
        if (code.endsWith(':view')) {
          Array.from(next).filter((permission) => permission.startsWith(groupPrefix)).forEach((permission) => next.delete(permission));
        }
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function setWarehouseRentScope(roleKey: RoleKey, code: PermissionKey) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      Array.from(next).filter((permission) => permission.startsWith('warehouse:rent-detail:scope-')).forEach((permission) => next.delete(permission));
      next.add(code);
      next.add('warehouse:rent-detail:view');
      return { ...current, [roleKey]: [...next] };
    });
  }

  function clearAllCustomerServicePermissions(roleKey: RoleKey, controls: Array<{ code: PermissionKey }>) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      controls.forEach((control) => {
        next.delete(control.code);
        if (control.code.endsWith(':view')) {
          const sectionPrefix = `${control.code.slice(0, -':view'.length)}:`;
          for (const permission of [...next]) {
            if (
              permission.startsWith(sectionPrefix)
              && !permission.endsWith('-block')
              && !shouldKeepCustomerServiceException(permission, control.code)
            ) {
              next.delete(permission);
            }
          }
        }
      });
      return { ...current, [roleKey]: [...next] };
    });
  }

  function togglePermissionFlag(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const granted = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      if (checked) granted.add(code);
      else granted.delete(code);
      return { ...current, [roleKey]: Array.from(granted) };
    });
  }

  function toggleMarketPermissionControl(roleKey: RoleKey, codes: PermissionKey[], checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      const controls = selectedMarketPermissionStates;
      const groupCodes = controls.flatMap((control) => control.codes);
      const entryCodes = controls[0]?.codes ?? [];
      if (checked) {
        codes.forEach((code) => next.add(code));
        entryCodes.forEach((code) => next.add(code));
      } else if (codes.some((code) => entryCodes.includes(code))) {
        groupCodes.forEach((code) => next.delete(code));
      } else {
        codes.forEach((code) => next.delete(code));
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function clearAllMarketPermissions(roleKey: RoleKey) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      selectedMarketPermissionStates.flatMap((control) => control.codes)
        .forEach((code) => next.delete(code));
      return { ...current, [roleKey]: [...next] };
    });
  }

  function toggleFinancePermissionControl(roleKey: RoleKey, codes: PermissionKey[], checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      const groupCodes = selectedFinancePermissionStates.flatMap((control) => control.codes);
      const entryCodes = selectedFinancePermissionStates.find((control) => control.category === '页面访问')?.codes ?? [];
      if (selectedWorkspacePermissions?.[0] === '财务管理 / 单票费用') {
        return {
          ...current,
          [roleKey]: updateFinanceOrderFeePermission([...next], codes, checked)
        };
      }
      if (checked) {
        codes.forEach((code) => next.add(code));
        entryCodes.forEach((code) => next.add(code));
      } else if (codes.some((code) => entryCodes.includes(code))) {
        groupCodes.forEach((code) => next.delete(code));
      } else {
        codes.forEach((code) => next.delete(code));
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function clearAllFinancePermissions(roleKey: RoleKey) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      selectedFinancePermissionStates.flatMap((control) => control.codes)
        .forEach((code) => next.delete(code));
      return { ...current, [roleKey]: [...next] };
    });
  }

  function toggleGenericPermissionControl(roleKey: RoleKey, controlId: string, checked: boolean) {
    if (!selectedWorkspacePermissions) return;
    const controls = filterPermissionControlsForRole(
      selectedPermissionRole?.key,
      getPermissionControls(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1]),
      selectedRoleGrantedPermissions
    );
    const control = controls.find((item) => item.id === controlId);
    if (!control) return;
    const rawAccessControl = getPermissionGroupAccessControl(selectedWorkspacePermissions[0], selectedWorkspacePermissions[1]);
    const accessControl = rawAccessControl
      ? filterPermissionControlsForRole(selectedPermissionRole?.key, [rawAccessControl], selectedRoleGrantedPermissions)[0] ?? null
      : null;
    setDraftPermissions((current) => {
      const granted = current[roleKey] ?? selectedPermissionRole?.permissions ?? [];
      const togglesAccess = accessControl?.codes.some((code) => control.codes.includes(code)) ?? false;
      let next = togglesAccess && !checked
        ? updatePermissionGroupAccess(granted, selectedWorkspacePermissions[0], selectedWorkspacePermissions[1], false)
        : updatePermissionControl(granted, control, checked);
      if (checked && !togglesAccess && accessControl) {
        const nextSet = new Set(next);
        accessControl.codes.forEach((code) => nextSet.add(code));
        next = [...nextSet];
      }
      return { ...current, [roleKey]: next };
    });
  }

  function clearAllGenericPermissions(roleKey: RoleKey) {
    if (!selectedWorkspacePermissions) return;
    setDraftPermissions((current) => ({
      ...current,
      [roleKey]: updatePermissionGroupAccess(
        current[roleKey] ?? selectedPermissionRole?.permissions ?? [],
        selectedWorkspacePermissions[0],
        selectedWorkspacePermissions[1],
        false
      )
    }));
  }

  function toggleGlobalFieldMask(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => ({
      ...current,
      [roleKey]: updateGlobalFieldMaskPermissions(
        current[roleKey] ?? selectedPermissionRole?.permissions ?? [],
        code,
        checked
      )
    }));
  }

  function toggleLineShipmentStagePermission(
    roleKey: RoleKey,
    stage: Parameters<typeof lineShipmentStageEditPermissionCode>[0],
    checked: boolean
  ) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      const code = lineShipmentStageEditPermissionCode(stage);
      if (checked) {
        next.add(code);
        next.delete(`operations:line-shipment:stage-edit-block:${stage.toLowerCase().replaceAll('_', '-')}` as PermissionKey);
        next.add('operations:line-shipment:view');
        next.add('operations:line-shipment:detail');
        next.add('operations:line-shipment:process');
        next.add('operations:line-shipment:status-update');
      } else next.delete(code);
      return { ...current, [roleKey]: [...next] };
    });
  }

  function clearAllLineShipmentStagePermissions(roleKey: RoleKey) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      lineShipmentStageEditControls.forEach((control) => {
        next.delete(control.code);
      });
      return { ...current, [roleKey]: [...next] };
    });
  }

  function togglePricingLookupModule(
    roleKey: RoleKey,
    module: Parameters<typeof pricingLookupPermissionCode>[0],
    checked: boolean
  ) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      const code = pricingLookupPermissionCode(module);
      if (checked) next.add(code);
      else next.delete(code);
      return { ...current, [roleKey]: [...next] };
    });
  }

  function togglePricingMarkupPermission(
    roleKey: RoleKey,
    module: Parameters<typeof pricingMarkupPermissionCode>[0],
    action: Parameters<typeof pricingMarkupPermissionCode>[1],
    checked: boolean
  ) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      const code = pricingMarkupPermissionCode(module, action);
      const viewCode = pricingMarkupPermissionCode(module, 'view');
      if (checked) {
        next.add(code);
        next.add(viewCode);
      } else {
        next.delete(code);
        if (action === 'view') {
          const prefix = `pricing:markup:${module}:`;
          Array.from(next).filter((permission) => permission.startsWith(prefix)).forEach((permission) => next.delete(permission));
        }
      }
      return { ...current, [roleKey]: [...next] };
    });
  }

  function clearAllPricingMarkupPermissions(roleKey: RoleKey) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      pricingMarkupPermissionControls.forEach((control) => {
        control.actions.forEach((action) => next.delete(action.code));
      });
      return { ...current, [roleKey]: [...next] };
    });
  }

  function togglePricingPriceBookPermission(roleKey: RoleKey, code: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const next = new Set(current[roleKey] ?? selectedPermissionRole?.permissions ?? []);
      if (checked) {
        next.add(code);
        next.add('pricing:price-books:view');
      } else if (code === 'pricing:price-books:view') {
        Array.from(next).filter((permission) => permission.startsWith('pricing:price-books:')).forEach((permission) => next.delete(permission));
      } else next.delete(code);
      return { ...current, [roleKey]: [...next] };
    });
  }

  async function exportAuditLogs() {
    const workbook = createWorkbook();
    const rows = auditLogs.map((row) => ({
        时间: formatBeijingDateTime(row.createdAt),
        操作人: row.actorUsername,
        'IP 地址': getAuditIpText(row),
        模块: row.moduleLabel,
        动作: row.actionLabel,
        动作编码: row.action,
        对象: getAuditTargetDisplay(row).label,
        接口: row.target,
        结果: row.resultLabel,
        变更前: row.before ? JSON.stringify(row.before) : '',
        变更后: row.after ? JSON.stringify(row.after) : ''
      }));
    const headers = ['时间', '操作人', 'IP 地址', '模块', '动作', '动作编码', '对象', '接口', '结果', '变更前', '变更后'];
    addRowsWorksheet(workbook, '高危操作审计', [
      headers,
      ...rows.map((row) => headers.map((header) => row[header as keyof typeof row]))
    ]);
    await downloadWorkbook(workbook, `高危操作审计-${formatBeijingDate(new Date())}.xlsx`);
  }

  function summarizeAuditChange(row: AuditLogSummary) {
    const beforeText = row.before ? '已记录操作前数据' : '操作前无历史数据';
    const afterText = row.after ? '已记录操作后数据' : '操作后无结果快照';
    const resultText = row.result === 'SUCCESS' ? '执行成功' : '执行失败';
    return `${row.moduleLabel}模块发生“${row.actionLabel}”，功能为 ${getAuditTargetDisplay(row).label}，${resultText}；${beforeText}，${afterText}。`;
  }

  function buildAuditRawLog(row: AuditLogSummary) {
    return JSON.stringify(
      {
        id: row.id,
        createdAt: row.createdAt,
        createdAtBeijing: formatBeijingDateTime(row.createdAt),
        actor: {
          id: row.actorId,
          username: row.actorUsername
        },
        ipAddress: getAuditIpText(row),
        module: {
          code: row.module,
          label: row.moduleLabel
        },
        action: {
          code: row.action,
          label: row.actionLabel
        },
        target: row.target,
        result: {
          code: row.result,
          label: row.resultLabel
        },
        before: row.before ?? null,
        after: row.after ?? null
      },
      null,
      2
    );
  }

  function openAuditDetail(row: AuditLogSummary) {
    setSelectedAuditLogId(row.id);
    setAuditDetailOpen(true);
  }

  function openRoleGroupEditor(role: RolePermissionRow | null) {
    setEditingRoleGroup(role);
    roleGroupForm.setFieldsValue(role ? {
      sortOrder: String(role.sortOrder ?? 0),
      label: role.label,
      description: role.description ?? '',
      site: role.site ?? '',
      enabled: role.enabled === false ? 'false' : 'true',
      templateRole: undefined,
      sourceRoleKey: undefined
    } : {
      sortOrder: String(Math.max(0, ...userGroupRows.map((item) => item.sortOrder ?? 0)) + 1),
      label: '',
      description: '',
      site: enabledSiteOptions[0]?.value,
      enabled: 'true',
      templateRole: undefined,
      sourceRoleKey: undefined
    });
    setRoleGroupOpen(true);
  }

  function openRoleGroupDetail(role: RolePermissionRow) {
    setSelectedRoleGroupKey(role.key);
    setRoleGroupDetailOpen(true);
  }

  function confirmRoleGroupDisable(role: RolePermissionRow) {
    Modal.confirm({
      title: '确认停用该用户组？',
      content: '停用后不再作为新建员工可选角色，已绑定员工不会被删除。',
      okText: '确认停用',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => disableRoleGroup(role)
    });
  }

  function confirmRoleGroupDelete(role: RolePermissionRow) {
    const boundStaffCount = staffAccounts.filter((account) => account.role === role.key).length;
    Modal.confirm({
      title: `确认删除用户组“${role.label}”？`,
      content: boundStaffCount > 0
        ? `该用户组仍绑定 ${boundStaffCount} 名员工，请先调整员工用户组后再删除。`
        : '删除后该用户组及其权限配置将永久移除，无法恢复。',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true, disabled: boundStaffCount > 0 },
      onOk: () => deleteRoleGroup(role)
    });
  }

  function getRolePermissionSummary(role: RolePermissionRow) {
    const labels = (roleMatrix?.availablePermissions ?? []).filter((permission) => role.permissions.includes(permission.code)).map((permission) => permission.label);
    return labels.slice(0, 2).join(' / ') || role.restriction || '-';
  }

  return (
    <AppPage>
      <AppPageHeader
        title="系统管理"
        description="系统管理员 · 最大权限"
        actions={
          <AppActionGroup>
            <Button icon={<FileInput size={16} />} onClick={() => handleSettingAction('已触发员工与角色配置导入入口')}>
              导入配置
            </Button>
            <Button icon={<ClipboardCheck size={16} />} onClick={() => handleSettingAction('已触发权限矩阵导出入口')}>
              导出权限
            </Button>
            <Button
              type="primary"
              icon={<Sparkles size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: '系统设置',
                  task: '权限体检',
                  prompt: '请检查管理员、客服、业务员、仓库、财务的权限边界，重点关注报价管理、财务核销、系统设置这些高风险能力。',
                  context: { roles: roleRows.map((role) => ({ key: role.key, label: role.label, permissions: role.permissions })) }
                })
              }
            >
              AI 权限体检
            </Button>
          </AppActionGroup>
        }
      />

      {renderNoticeBar(settingsNotice)}

      {activeSettingsSection === 'audit' ? (
        <Row gutter={[12, 12]} className="audit-dashboard-metrics">
          <Col xs={24} md={12} xl={6}>
            <AuditMetricCard icon={<ClipboardCheck size={20} />} title="今日操作" metric={auditDashboard?.metrics.total} tone="blue" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <AuditMetricCard icon={<AlertTriangle size={20} />} title="失败操作" metric={auditDashboard?.metrics.failed} tone="red" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <AuditMetricCard icon={<Activity size={20} />} title="重要操作" metric={auditDashboard?.metrics.important} tone="orange" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <AuditMetricCard icon={<ShieldCheck size={20} />} title="权限/财务变更" metric={auditDashboard?.metrics.permissionFinance} tone="teal" />
          </Col>
        </Row>
      ) : activeSettingsSection === 'userGroups' ? (
        <section className="user-group-overview" aria-label="用户组概览">
          <Text strong className="user-group-overview-title">用户组概览</Text>
          <div className="user-group-overview-items">
            {[
              { key: 'enabled', icon: <Users />, label: '启用用户组', value: roleGroupMetrics.enabled, tone: 'default' },
              { key: 'disabled', icon: <Power />, label: '停用用户组', value: roleGroupMetrics.disabled, tone: 'default' },
              { key: 'bound', icon: <ShieldCheck />, label: '绑定员工', value: roleGroupMetrics.boundStaff, tone: 'default' }
            ].map((metric) => (
              <div className={`user-group-overview-item is-${metric.tone}`} key={metric.key}>
                <span className="user-group-overview-icon">{metric.icon}</span>
                <span className="user-group-overview-label">{metric.label}</span>
                <strong className="user-group-overview-value">{staffAccountsLoading && metric.key === 'bound' ? '-' : metric.value}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : activeSettingsSection === 'accounts' ? (
        <section className="staff-account-overview" aria-label="账号概览">
          <Text strong className="staff-account-overview-title">账号概览</Text>
          <div className="staff-account-overview-items">
            {[
              { key: 'active', icon: <Users />, label: '在职账号', value: staffAccountMetrics.active, tone: 'default' },
              { key: 'disabled', icon: <Power />, label: '停用账号', value: staffAccountMetrics.disabled, tone: 'default' },
              { key: 'password', icon: <LockKeyhole />, label: '需改密', value: staffAccountMetrics.mustChangePassword, tone: 'default' },
              { key: 'incomplete', icon: <FileText />, label: '资料未完善', value: staffAccountMetrics.incomplete, tone: 'warning' }
            ].map((metric) => (
              <div className={`staff-account-overview-item is-${metric.tone}`} key={metric.key}>
                <span className="staff-account-overview-icon">{metric.icon}</span>
                <span className="staff-account-overview-label">{metric.label}</span>
                <strong className="staff-account-overview-value">{staffAccountsLoading ? '-' : metric.value}</strong>
                <span className="staff-account-overview-ratio">
                  占比 {staffAccounts.length ? Math.round((metric.value / staffAccounts.length) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : activeSettingsSection === 'sites' ? (
        <Row gutter={[12, 12]} className="site-metrics">
          <Col xs={24} md={8}>
            <MetricCard icon={<Building2 />} title="启用站点" value={sitesLoading ? '-' : siteMetrics.enabled} extra={`占比 ${sites.length ? Math.round((siteMetrics.enabled / sites.length) * 100) : 0}%`} />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard icon={<Power />} title="停用站点" value={sitesLoading ? '-' : siteMetrics.disabled} extra={`占比 ${sites.length ? Math.round((siteMetrics.disabled / sites.length) * 100) : 0}%`} />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard icon={<Users />} title="绑定员工" value={staffAccountsLoading ? '-' : siteMetrics.boundStaff} extra="当前已绑定到站点的员工总数" />
          </Col>
        </Row>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <MetricCard icon={<ShieldCheck />} title="管理员权限" value="100%" extra="菜单、按钮、数据范围、系统参数" />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard icon={<Users />} title="员工角色" value={roleRows.length} extra="当前权限矩阵中的内部角色" />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard icon={<Activity />} title="重要审计" value={auditDashboard?.metrics.important.value ?? '-'} extra="重要操作以审计看板实时统计为准" />
          </Col>
        </Row>
      )}

      <ModuleSubWorkspace items={settingsSubItems} activeKey={activeSettingsSection} onChange={setActiveSettingsSection}>
      <Row gutter={[16, 16]} className="main-grid">
        {['userGroups', 'sites', 'accounts', 'rolePermissions'].includes(activeSettingsSection) ? (
        <Col xs={24}>
          {activeSettingsSection === 'userGroups' ? (
          <div className="user-group-workbench">
            <Card
              className="user-group-table-card"
              title={(
                <Space direction="vertical" size={0}>
                  <Text strong>用户组</Text>
                  <Text type="secondary">维护岗位、站点和菜单入口</Text>
                </Space>
              )}
              extra={
                <Space>
                  <Button type="primary" icon={<PlusCircle size={15} />} onClick={() => openRoleGroupEditor(null)}>
                    增加
                  </Button>
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: [
                        { key: 'detail', label: '查看当前组详情', disabled: !selectedRoleGroup },
                        { key: 'edit', label: '编辑当前用户组', disabled: !selectedRoleGroup || isAdministratorRoleRow(selectedRoleGroup) },
                        { key: 'disable', label: '停用当前用户组', danger: true, disabled: !selectedRoleGroup || isAdministratorRoleRow(selectedRoleGroup) || selectedRoleGroup.enabled === false },
                        ...(hasSystemPermission('system:user-groups:delete') ? [{ key: 'delete', label: '删除当前用户组', danger: true, disabled: !selectedRoleGroup || isAdministratorRoleRow(selectedRoleGroup) }] : [])
                      ],
                      onClick: ({ key }) => {
                        if (!selectedRoleGroup) return;
                        if (key === 'detail') openRoleGroupDetail(selectedRoleGroup);
                        if (key === 'edit') openRoleGroupEditor(selectedRoleGroup);
                        if (key === 'disable') confirmRoleGroupDisable(selectedRoleGroup);
                        if (key === 'delete') confirmRoleGroupDelete(selectedRoleGroup);
                      }
                    }}
                  >
                    <Button icon={<Ellipsis size={16} />}>更多</Button>
                  </Dropdown>
                </Space>
              }
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div className="user-group-filter-strip">
                  <Input
                    aria-label="用户组关键字"
                    className="user-group-search"
                    placeholder="用户组名称 / 说明"
                    suffix={<Search size={16} />}
                    value={roleGroupFilters.keyword}
                    onChange={(event) => setRoleGroupFilters((current) => ({ ...current, keyword: event.target.value }))}
                  />
                  <Select
                    allowClear
                    className="user-group-site-select"
                    placeholder="全部站点"
                    options={roleGroupSiteOptions}
                    value={roleGroupFilters.site}
                    onChange={(value) => setRoleGroupFilters((current) => ({ ...current, site: value }))}
                  />
                  <Space.Compact>
                    {[
                      { label: '全部', value: 'ALL' as const },
                      { label: '启用', value: 'ENABLED' as const },
                      { label: '停用', value: 'DISABLED' as const }
                    ].map((item) => (
                      <Button
                        key={item.value}
                        type={roleGroupFilters.status === item.value ? 'primary' : 'default'}
                        onClick={() => setRoleGroupFilters((current) => ({ ...current, status: item.value }))}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Space.Compact>
                  <Button type="primary" icon={<Search size={16} />} onClick={() => setRoleGroupAppliedFilters({ ...roleGroupFilters })}>查询</Button>
                  <Button
                    icon={<RefreshCw size={16} />}
                    onClick={() => {
                      const empty = { keyword: '', site: undefined, status: 'ALL' as const };
                      setRoleGroupFilters(empty);
                      setRoleGroupAppliedFilters(empty);
                    }}
                  >
                    重置
                  </Button>
                </div>
                <ManagedTable
                  recordDetail={false}
                  className="user-group-table"
                  rowKey="key"
                  size="small"
                  density="compact"
                  loading={!roleMatrix || staffAccountsLoading}
                  pagination={tenRowTablePagination}
                  dataSource={filteredUserGroupRows}
                  showSelectionSummary={false}
                  toolbarLeading={(
                    <span className="user-group-result-summary">
                      共 {filteredUserGroupRows.length} 个用户组 <span>· 已选 {selectedRoleGroup ? 1 : 0} 条</span>
                    </span>
                  )}
                  toolbarActions={selectedRoleGroup ? (
                    <Space size={6} wrap className="user-group-batch-actions">
                      {hasSystemPermission('system:role-permissions:copy-role') && !isAdministratorRoleRow(selectedRoleGroup) ? (
                        <Button size="small" icon={<Copy size={14} />} onClick={() => openRolePermissionCopy(selectedRoleGroup)}>复制权限</Button>
                      ) : null}
                      {!isAdministratorRoleRow(selectedRoleGroup) ? <Button size="small" icon={<Edit size={14} />} onClick={() => openRoleGroupEditor(selectedRoleGroup)}>修改</Button> : null}
                      {!isAdministratorRoleRow(selectedRoleGroup) && selectedRoleGroup.enabled !== false ? (
                        <Button size="small" icon={<Power size={14} />} danger onClick={() => confirmRoleGroupDisable(selectedRoleGroup)}>停用</Button>
                      ) : null}
                      {hasSystemPermission('system:user-groups:delete') && !isAdministratorRoleRow(selectedRoleGroup) ? (
                        <Button size="small" icon={<Trash2 size={14} />} danger onClick={() => confirmRoleGroupDelete(selectedRoleGroup)}>删除</Button>
                      ) : null}
                    </Space>
                  ) : null}
                  rowSelection={{
                    type: 'radio',
                    columnTitle: '选择',
                    selectedRowKeys: selectedRoleGroup?.key ? [selectedRoleGroup.key] : [],
                    onChange: (keys) => setSelectedRoleGroupKey(keys[0] ? String(keys[0]) : null)
                  }}
                  onRow={(record) => ({
                    onClick: () => setSelectedRoleGroupKey(record.key),
                    onDoubleClick: () => openRoleGroupDetail(record)
                  })}
                  rowClassName={(record) => (record.key === selectedRoleGroup?.key ? 'user-group-row-selected' : '')}
                  columns={[
                    { title: '排序', dataIndex: 'sortOrder', width: 74, render: (value?: number) => value ?? 0 },
                    { title: '用户组名称', dataIndex: 'label', width: 180, render: (value: string) => <Text strong>{value}</Text> },
                    { title: '用户组说明', dataIndex: 'description', width: 260, render: (value?: string) => value || '-' },
                    { title: '站点', dataIndex: 'site', width: 150, render: (value?: string) => value || '-' },
                    { title: '绑定员工', width: 100, render: (_: unknown, role: RolePermissionRow) => `${staffAccounts.filter((account) => account.role === role.key).length} 人` },
                    { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled?: boolean) => <Tag color={enabled === false ? 'default' : 'green'}>{enabled === false ? '停用' : '启用'}</Tag> },
                    {
                      title: '操作',
                      width: 190,
                      fixed: 'right',
                      render: (_: unknown, role: RolePermissionRow) => (
                        <Space size={6} className="user-group-row-actions">
                          <Button size="small" onClick={(event) => {
                            event.stopPropagation();
                            openRolePermissions(role.key);
                          }}>查看权限</Button>
                          <Dropdown
                            trigger={['click']}
                            menu={{
                              items: [
                                { key: 'detail', label: '查看详情' },
                                { key: 'edit', label: '编辑', disabled: isAdministratorRoleRow(role) },
                                { key: 'disable', label: '停用', danger: true, disabled: isAdministratorRoleRow(role) || role.enabled === false },
                                ...(hasSystemPermission('system:user-groups:delete') && !isAdministratorRoleRow(role) ? [{ key: 'delete', label: '删除', danger: true }] : [])
                              ],
                              onClick: ({ key, domEvent }) => {
                                domEvent.stopPropagation();
                                setSelectedRoleGroupKey(role.key);
                                if (key === 'detail') openRoleGroupDetail(role);
                                if (key === 'edit') openRoleGroupEditor(role);
                                if (key === 'disable') confirmRoleGroupDisable(role);
                                if (key === 'delete') confirmRoleGroupDelete(role);
                              }
                            }}
                          >
                            <Button
                              size="small"
                              icon={<Ellipsis size={15} />}
                              aria-label={`${role.label} 更多操作`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              更多
                            </Button>
                          </Dropdown>
                        </Space>
                      )
                    }
                  ]}
                  minimumScrollX={980}
                  scroll={{ y: 'calc(100vh - 470px)' }}
                />
              </Space>
            </Card>
          </div>
          ) : null}
          {activeSettingsSection === 'sites' ? (
          <Card
            className="settings-site-card"
            title={
              <Space direction="vertical" size={2}>
                <Flex align="center" gap={8}>
                  <Building2 size={18} />
                  <span>站点资料</span>
                </Flex>
                <Text type="secondary">维护业务站点，用于员工归属、客户归属和数据范围。</Text>
              </Space>
            }
            extra={
              <Space wrap>
                <Button type="primary" icon={<PlusCircle size={16} />} onClick={() => {
                  setEditingSite(null);
                  siteForm.setFieldsValue({ sortOrder: String(Math.max(0, ...sites.map((site) => site.sortOrder)) + 1), name: '', enabled: 'true' });
                  setSiteCreateOpen(true);
                }}>
                  增加
                </Button>
                <Button icon={<Edit size={16} />} disabled={!selectedSite} onClick={() => {
                  if (!selectedSite) return;
                  setEditingSite(selectedSite);
                  siteForm.setFieldsValue({ sortOrder: String(selectedSite.sortOrder), name: selectedSite.name, enabled: selectedSite.enabled ? 'true' : 'false' });
                  setSiteCreateOpen(true);
                }}>
                  修改
                </Button>
                <Popconfirm
                  title={`确认${selectedSite?.enabled === false ? '启用' : '停用'}该站点？`}
                  description={selectedSite?.enabled === false ? '启用后可重新作为新建员工可选站点。' : '停用后不再作为新建员工可选站点，不会影响历史业务数据。'}
                  okText={`确认${selectedSite?.enabled === false ? '启用' : '停用'}`}
                  cancelText="取消"
                  disabled={!selectedSite}
                  open={siteDisableConfirmOpen}
                  onOpenChange={(open) => setSiteDisableConfirmOpen(Boolean(selectedSite && open))}
                  onConfirm={async () => {
                    if (selectedSite) await updateSiteEnabled(selectedSite, !selectedSite.enabled);
                    setSiteDisableConfirmOpen(false);
                  }}
                  onCancel={() => setSiteDisableConfirmOpen(false)}
                >
                  <Button icon={<Power size={16} />} danger disabled={!selectedSite}>{selectedSite?.enabled === false ? '启用' : '停用'}</Button>
                </Popconfirm>
              </Space>
            }
          >
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div className="site-filter-strip">
                <Input
                  aria-label="站点名称筛选"
                  className="site-search"
                  placeholder="站点名称"
                  suffix={<Search size={16} />}
                  value={siteFilters.name}
                  onChange={(event) => setSiteFilters((current) => ({ ...current, name: event.target.value }))}
                />
                <Text>状态：</Text>
                <Space.Compact>
                  {(['ALL', 'ENABLED', 'DISABLED'] as const).map((status) => (
                    <Button
                      key={status}
                      type={siteFilters.status === status ? 'primary' : 'default'}
                      onClick={() => setSiteFilters((current) => ({ ...current, status }))}
                    >
                      {status === 'ALL' ? '全部' : status === 'ENABLED' ? '启用' : '停用'}
                    </Button>
                  ))}
                </Space.Compact>
                <Button type="primary" onClick={() => setSiteAppliedFilters(siteFilters)}>
                  查询
                </Button>
                <Button
                  onClick={() => {
                    const emptyFilters = { name: '', status: 'ALL' };
                    setSiteFilters(emptyFilters);
                    setSiteAppliedFilters(emptyFilters);
                  }}
                >
                  重置
                </Button>
              </div>
              <ManagedTable<SiteSummary>
                recordDetail={{ title: '站点详情' }}
                rowKey="id"
                size="small"
                className="settings-site-table"
                loading={sitesLoading}
                pagination={tenRowTablePagination}
                dataSource={filteredSites}
                rowSelection={{
                  columnTitle: '选择',
                  selectedRowKeys: selectedSiteId ? [selectedSiteId] : [],
                  onChange: (keys) => setSelectedSiteId(String(keys[keys.length - 1] ?? ''))
                }}
                onRow={(record) => ({ onClick: () => setSelectedSiteId(record.id) })}
                columns={[
                  { title: '排序', dataIndex: 'sortOrder', width: 120 },
                  {
                    title: '站点名称',
                    dataIndex: 'name',
                    width: 260,
                    render: (value: string) => (
                      <Flex align="center" gap={8}>
                        <span className="site-name-icon"><Building2 size={16} /></span>
                        <Text strong>{value}</Text>
                      </Flex>
                    )
                  },
                  { title: '绑定员工', width: 140, render: (_: unknown, site?: SiteSummary) => `${staffAccounts.filter((account) => account.site === site?.name).length} 人` },
                  { title: '状态', dataIndex: 'enabled', width: 120, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> },
                  {
                    title: '操作',
                    width: 160,
                    fixed: 'right',
                    render: (_: unknown, site?: SiteSummary) => site ? (
                      <Space size={10}>
                        <Button
                          type="link"
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingSite(site);
                            siteForm.setFieldsValue({ sortOrder: String(site.sortOrder), name: site.name, enabled: site.enabled ? 'true' : 'false' });
                            setSiteCreateOpen(true);
                          }}
                        >
                          编辑
                        </Button>
                        <Popconfirm
                          title={`确认${site.enabled ? '停用' : '启用'}该站点？`}
                          description={site.enabled ? '停用后不再作为新建员工可选站点，不会影响历史业务数据。' : '启用后可重新作为新建员工可选站点。'}
                          okText={`确认${site.enabled ? '停用' : '启用'}`}
                          cancelText="取消"
                          onConfirm={() => updateSiteEnabled(site, !site.enabled)}
                        >
                          <Button type="link" size="small" danger={site.enabled}>
                            {site.enabled ? '停用' : '启用'}
                          </Button>
                        </Popconfirm>
                      </Space>
                    ) : null
                  }
                ]}
                scroll={{ x: 760 }}
              />
            </Space>
          </Card>
          ) : null}
          {activeSettingsSection === 'accounts' ? (
          <Card
            className="settings-account-card"
            title={
              <Space direction="vertical" size={2}>
                <Flex align="center" gap={8}>
                  <Users size={18} />
                  <span>员工账号管理</span>
                </Flex>
              </Space>
            }
            extra={
              <Space wrap>
                <Button
                  type="primary"
                  icon={<PlusCircle size={16} />}
                  onClick={() => openStaffAccountEditor(null)}
                >
                  新增
                </Button>
                <Button icon={<FileInput size={16} />} onClick={() => staffImportInputRef.current?.click()}>
                  批量导入
                </Button>
                <input
                  ref={staffImportInputRef}
                  type="file"
                  accept=".xlsx"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void importStaffAccounts(file);
                  }}
                />
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [{ key: 'template', icon: <FileText size={15} />, label: '模板下载' }],
                    onClick: ({ key }) => {
                      if (key === 'template') void downloadStaffImportTemplate();
                    }
                  }}
                >
                  <Button icon={<Ellipsis size={16} />}>更多</Button>
                </Dropdown>
              </Space>
            }
          >
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div className="staff-account-filter-strip">
                {renderFilterField('关键字', (
                  <Input
                    aria-label="员工账号关键字"
                    placeholder="账户 / 中文名 / 部门"
                    suffix={<Search size={16} />}
                    value={staffFilters.keyword}
                    onChange={(event) => setStaffFilters((current) => ({ ...current, keyword: event.target.value }))}
                  />
                ))}
                {renderFilterField('所属站点', (
                  <Select
                    allowClear
                    options={enabledSiteOptions}
                    value={staffFilters.site}
                    onChange={(value) => setStaffFilters((current) => ({ ...current, site: value }))}
                    placeholder="全部站点"
                  />
                ))}
                {renderFilterField('部门', (
                  <Select
                    allowClear
                    loading={departmentsLoading}
                    options={departmentOptions}
                    value={staffFilters.departmentId}
                    onChange={(value) => setStaffFilters((current) => ({ ...current, departmentId: value }))}
                    placeholder="全部部门"
                  />
                ))}
                {renderFilterField('状态', (
                  <Select
                    aria-label="员工账号状态"
                    options={[
                      { label: '全部状态', value: 'ALL' },
                      { label: '在职', value: 'ENABLED' },
                      { label: '停用', value: 'DISABLED' }
                    ]}
                    value={staffFilters.status ?? 'ALL'}
                    onChange={(status) => setStaffFilters((current) => ({ ...current, status }))}
                  />
                ))}
                {renderFilterField('所属用户组', (
                  <Select
                    allowClear
                    options={staffRoleOptions}
                    value={staffFilters.role}
                    onChange={(value) => setStaffFilters((current) => ({ ...current, role: value }))}
                    placeholder="全部用户组"
                  />
                ))}
                <Space wrap className="staff-account-filter-actions">
                  <Button type="primary" icon={<Search size={16} />} onClick={() => setStaffAppliedFilters(staffFilters)}>
                    查询
                  </Button>
                  <Button
                    icon={<RefreshCw size={16} />}
                    onClick={() => {
                      const empty: StaffAccountQuery = { status: 'ALL' };
                      setStaffFilters(empty);
                      setStaffAppliedFilters(empty);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              </div>
            <ManagedTable<StaffAccountSummary>
              recordDetail={{ title: '员工账号详情' }}
              rowKey="id"
              size="small"
              density="compact"
              className="settings-account-table"
              minimumScrollX={1180}
              scroll={{ y: 'calc(100vh - 470px)' }}
              pagination={tenRowTablePagination}
              dataSource={staffAccounts}
              loading={staffAccountsLoading}
              showSelectionSummary={false}
              toolbarLeading={(
                <span className="staff-account-result-summary">
                  共 {staffAccounts.length} 个账号 <span>· 已选 {selectedStaffAccountIds.length} 条</span>
                </span>
              )}
              toolbarActions={selectedStaffAccountIds.length ? (
                <Space size={6} wrap className="staff-account-batch-actions">
                  {selectedStaffAccount ? (
                    <Button size="small" icon={<Edit size={14} />} onClick={() => openStaffAccountEditor(selectedStaffAccount)}>
                      修改
                    </Button>
                  ) : null}
                  <Popconfirm
                    title="确认停用选中员工账号？"
                    description="停用后账号不可登录，但会保留历史记录。"
                    okText="确认停用"
                    cancelText="取消"
                    onConfirm={() => updateStaffAccountsEnabled(selectedStaffAccountIds, false)}
                  >
                    <Button size="small" icon={<Power size={14} />} danger>停用</Button>
                  </Popconfirm>
                  <Popconfirm
                    title="确认批量重置密码？"
                    description="选中员工将分别生成新的随机临时密码，且下次登录必须修改密码。"
                    okText="确认重置"
                    cancelText="取消"
                    onConfirm={() => resetStaffAccountPasswords(selectedStaffAccountIds)}
                  >
                    <Button size="small" icon={<LockKeyhole size={14} />}>重置密码</Button>
                  </Popconfirm>
                  {selectedStaffAccount ? (
                    <Popconfirm
                      title="确认删除该员工账号？"
                      description="删除后不可恢复，请确认该账号无未完成业务。"
                      okText="确认删除"
                      cancelText="取消"
                      onConfirm={() => deleteStaffAccount(selectedStaffAccount.id)}
                    >
                      <Button size="small" icon={<Trash2 size={14} />} danger>删除</Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              ) : null}
              onRow={(record) => ({ onClick: () => record ? setSelectedStaffAccountIds([record.id]) : undefined })}
              rowSelection={{
                columnTitle: '选择',
                selectedRowKeys: selectedStaffAccountIds,
                onChange: (keys) => setSelectedStaffAccountIds(keys.map(String))
              }}
              columns={[
                { title: '账号', dataIndex: 'username', width: 120, render: (value: string) => <Text code>{value}</Text> },
                {
                  title: '姓名 / 部门',
                  width: 170,
                  render: (_, record?: StaffAccountSummary) => record ? (
                    <Space direction="vertical" size={0}>
                      <Text strong>{record.name || '-'}</Text>
                      <Text type="secondary">{record.department || '未分配部门'} / {record.roleLabel}</Text>
                    </Space>
                  ) : null
                },
                {
                  title: '英文名',
                  dataIndex: 'nickname',
                  width: 110,
                  render: (value?: string) => value || '-'
                },
                {
                  title: '直属经理',
                  width: 130,
                  render: (_, record?: StaffAccountSummary) => record
                    ? (record.directManagerName || record.directManagerUsername || '-')
                    : null
                },
                { title: '站点', dataIndex: 'site', width: 120, render: (value?: string) => value || '-' },
                {
                  title: '用户组',
                  dataIndex: 'roleLabel',
                  width: 120,
                  render: (value: string, record?: StaffAccountSummary) => <Tag color={record?.role === 'ADMIN' ? 'red' : record?.role === 'FINANCE' ? 'gold' : 'blue'}>{value}</Tag>
                },
                { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '在职' : '停用'}</Tag> },
                {
                  title: '改密要求',
                  dataIndex: 'mustChangePassword',
                  width: 105,
                  render: (value?: boolean) => <Tag color={value ? 'orange' : 'green'}>{value ? '需改密' : '正常'}</Tag>
                },
                { title: '最近登录', dataIndex: 'lastLoginAt', width: 155, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
                {
                  title: '操作',
                  width: 148,
                  fixed: 'right',
                  render: (_, record?: StaffAccountSummary) => record ? (
                    <Space size={6} wrap={false} className="staff-account-row-actions">
                      <Button size="small" onClick={(event) => { event.stopPropagation(); openStaffAccountEditor(record); }}>
                        编辑
                      </Button>
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'reset', label: '重置密码' },
                            { key: 'toggle', label: record.enabled ? '停用' : '启用', danger: record.enabled },
                            { type: 'divider' },
                            { key: 'delete', label: '删除', danger: true }
                          ],
                          onClick: ({ key }) => confirmStaffAccountRowAction(record, key as 'reset' | 'toggle' | 'delete')
                        }}
                      >
                        <Button
                          size="small"
                          aria-label={`${record.username} 更多操作`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          更多 <ChevronDown size={13} />
                        </Button>
                      </Dropdown>
                    </Space>
                  ) : null
                }
              ]}
            />
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'rolePermissions' ? (
          <Card className="module-grid role-permission-card" title="角色权限分配" extra={<Text type="secondary">保存后对该用户组下所有账号生效</Text>}>
            {roleMatrix && selectedPermissionRole ? (
              <div className="role-permission-editor role-permission-console">
                <aside className="role-permission-roles" aria-label="角色列表">
                  <div className="role-permission-pane-title">
                    <Text strong>选择角色</Text>
                    <Text type="secondary">已授权数量</Text>
                  </div>
                  {rolePermissionRows.map((role) => {
                    const selected = role.key === selectedPermissionRole.key;
                    const preferencePermissionCodes = new Set(
                      (roleMatrix?.availablePermissions ?? [])
                        .filter(isUiPreferencePermission)
                        .map((permission) => permission.code)
                    );
                    const permissionCount = (draftPermissions[role.key] ?? role.permissions)
                      .filter((permission) => !preferencePermissionCodes.has(permission))
                      .length;
                    return (
                      <button
                        type="button"
                        key={role.key}
                        className={`role-permission-role${selected ? ' is-active' : ''}`}
                        onClick={() => setSelectedPermissionRoleKey(role.key)}
                      >
                        <span>
                          <Text strong>{role.label}</Text>
                          <Text type="secondary">{role.systemBuiltin ? '系统角色' : role.site || '用户组'}</Text>
                        </span>
                        <Tag color={isAdministratorRoleRow(role) ? 'red' : 'blue'}>{permissionCount}</Tag>
                      </button>
                    );
                  })}
                </aside>
                <section className="role-permission-modules" aria-label="权限模块">
                  <div className="role-permission-pane-title">
                    <Text strong>模块入口</Text>
                    <Text type="secondary">一级目录固定 11 个，另设总规则；二级入口控制进入权限，具体操作权限按页面配置</Text>
                  </div>
                  <div className="role-permission-workspace-switch" role="tablist" aria-label="一级模块">
                    {permissionWorkspaceCatalog.map((workspace) => (
                      <button
                        type="button"
                        role="tab"
                        aria-label={workspace.label}
                        aria-selected={!selectedTotalRules && selectedPermissionWorkspace === workspace.key}
                        className={`role-permission-workspace-tab${!selectedTotalRules && selectedPermissionWorkspace === workspace.key ? ' is-active' : ''}`}
                        key={workspace.key}
                        onClick={() => {
                          setSelectedPermissionWorkspace(workspace.key);
                          setSelectedWorkspacePermissionGroup(null);
                          setSelectedPermissionWorkspaceView('entries');
                        }}
                      >
                        <span>{workspace.label}</span>
                        {!selectedTotalRules && selectedPermissionWorkspace === workspace.key ? <span className="role-permission-workspace-current">当前</span> : null}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="tab"
                      aria-label="总规则"
                      aria-selected={selectedTotalRules}
                      className={`role-permission-workspace-tab role-permission-workspace-rules-tab${selectedTotalRules ? ' is-active' : ''}`}
                      onClick={() => {
                        setSelectedPermissionWorkspace('operations');
                        setSelectedWorkspacePermissionGroup(null);
                        setSelectedPermissionWorkspaceView('rules');
                      }}
                    >
                      <span>总规则</span>
                      {selectedTotalRules ? <span className="role-permission-workspace-current">当前</span> : null}
                    </button>
                  </div>
                  {!selectedTotalRules ? <div className="role-permission-module-heading">
                    <Text type="secondary">{permissionWorkspace.label} · {workspacePermissionGroups.length} 个二级入口</Text>
                  </div> : null}
                  {!selectedTotalRules ? <div className="role-permission-module-grid">
                    {workspacePermissionGroups.map(([group, permissions]) => {
                      const selected = selectedWorkspacePermissions?.[0] === group;
                      const accessControl = getPermissionGroupAccessControl(group, permissions);
                      const accessState = accessControl
                        ? getPermissionGroupAccessState(group, permissions, selectedRoleGrantedPermissions)
                        : { checked: false, indeterminate: false, grantedCount: 0 };
                      const administrator = isAdministratorRoleRow(selectedPermissionRole);
                      const directBusinessGrantGroup = group === '报价查价 / 查价'
                        || group === '报价查价 / 代理加价规则'
                        || group === '报价查价 / 价格表管理'
                        || group === '业务管理 / 草稿箱'
                        || group.startsWith('市场管理 / ')
                        || group.startsWith('仓库管理 / ')
                        || group.startsWith('财务管理 / ');
                      return (
                        <div
                          className={`role-permission-module-card${selected ? ' is-active is-current' : ''}${administrator || accessState.checked ? ' is-open' : ''}${directBusinessGrantGroup ? ' is-direct' : ''}`}
                          data-current={selected ? 'true' : 'false'}
                          key={group}
                        >
                          <button
                            type="button"
                            className="role-permission-module-select"
                            aria-label={group.replace(`${permissionWorkspace.label} / `, '')}
                            onClick={() => {
                              setSelectedPermissionWorkspaceView('entries');
                              setSelectedWorkspacePermissionGroup(group);
                            }}
                          >
                            <span className="role-permission-module-title">
                              <Text strong>{group.replace(`${permissionWorkspace.label} / `, '')}</Text>
                            </span>
                          </button>
                          {!directBusinessGrantGroup ? <Checkbox
                            aria-label={`授权进入${group.replace(`${permissionWorkspace.label} / `, '')}`}
                            disabled={administrator || !accessControl}
                            checked={administrator || accessState.checked}
                            indeterminate={!administrator && accessState.indeterminate}
                            onChange={(event) => {
                              setSelectedPermissionWorkspaceView('entries');
                              setSelectedWorkspacePermissionGroup(group);
                              togglePermissionGroupAccess(selectedPermissionRole.key, group, permissions, event.target.checked);
                            }}
                          /> : null}
                        </div>
                      );
                    })}
                  </div> : null}
                </section>
                <section className="role-permission-detail" aria-label={`${selectedPermissionRole.label}权限`}>
                  <Flex justify="space-between" align="center" className="role-permission-detail-header">
                    <Space direction="vertical" size={2}>
                      <Text strong>{selectedTotalRules ? '总规则' : selectedWorkspacePermissions?.[0]?.replace(`${permissionWorkspace.label} / `, '') ?? '选择二级入口'}</Text>
                      <Space size={6}>
                        <Text type="secondary">{selectedPermissionRole.label} · {selectedPermissionRole.description || selectedPermissionRole.scope}</Text>
                        {selectedTotalRules
                          ? <Tag color="gold">一级规则</Tag>
                          : null}
                      </Space>
                    </Space>
                    <Space className="role-permission-detail-actions">
                      <Button size="small" type="primary" disabled={selectedPermissionRoleIsAdministrator && !selectedTotalRules} onClick={() => saveRolePermissions(selectedPermissionRole)}>
                        保存权限
                      </Button>
                    </Space>
                  </Flex>
                  {selectedPermissionRoleIsAdministrator ? (
                    <Text type="secondary" className="role-permission-preserved-note">管理员及管理员等效用户组固定拥有全部正向权限；总规则仍可配置且不可绕过。</Text>
                  ) : null}
                  <div className="role-permission-sections" data-testid="role-permission-option-grid">
                    {selectedPermissionRoleIsAdministrator && !selectedTotalRules ? (
                      <div className="role-permission-detail-empty">
                        <Text strong>管理员组权限固定开放</Text>
                        <Text type="secondary">管理员正向权限不可修改；如需限制敏感字段，请切换到“总规则”。</Text>
                      </div>
                    ) : selectedTotalRules && firstLevelFieldMaskControls.length ? (
                      <div className="role-permission-mask-panel">
                        <div className="role-permission-section-heading">
                          <Space direction="vertical" size={0}>
                            <Text strong>全局最高优先级屏蔽</Text>
                            <Text type="secondary">勾选后在全部模块、接口、导出和 AI 上生效；屏蔽优先于任何查看或编辑授权。</Text>
                          </Space>
                          <Tag color="red">勾选＝屏蔽</Tag>
                        </div>
                        <div className="role-permission-option-grid">
                          {firstLevelFieldMaskControls.map((control) => {
                            const granted = new Set(selectedRoleGrantedPermissions);
                            const agentDataChecked = granted.has(globalFieldMaskPermissionCode('agent-data'));
                            const impliedByAgentData = agentDataChecked && ['agent-short-name', 'agent-company-name', 'agent-channel'].includes(control.key);
                            return (
                              <label className={`role-permission-option role-permission-compact-option${granted.has(control.code) || impliedByAgentData ? ' role-permission-granted' : ''}`} key={control.code}>
                                <span className="role-permission-option-copy role-permission-compact-copy">
                                  <Text strong>{control.label}</Text>
                                </span>
                                <Checkbox
                                  aria-label={control.label}
                                  checked={granted.has(control.code) || impliedByAgentData}
                                  disabled={impliedByAgentData}
                                  onChange={(event) => toggleGlobalFieldMask(selectedPermissionRole.key, control.code, event.target.checked)}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : !selectedWorkspacePermissions ? (
                      <div className="role-permission-detail-empty">
                        <Text strong>请选择二级入口</Text>
                        <Text type="secondary">当前一级模块暂未配置一级屏蔽规则；请选择中间的二级入口查看其权限状态。</Text>
                      </div>
                    ) : selectedPricingLookupEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Text strong>查价模块授权</Text>
                          <Tag color={selectedPricingLookupStates.some((control) => control.checked) ? 'blue' : 'orange'}>
                            {selectedPricingLookupStates.filter((control) => control.checked).length}/{selectedPricingLookupStates.length} 个模块已分配
                          </Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedPricingLookupStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配${control.label}`}
                                checked={control.checked}
                                onChange={(event) => togglePricingLookupModule(selectedPermissionRole.key, control.module, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedPricingMarkupEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Text strong>模块功能授权</Text>
                          <Space size={6}>
                            <Tag color="blue">{selectedPricingMarkupStates.reduce((total, control) => total + control.actions.filter((action) => action.checked).length, 0)}/14 已授权</Tag>
                            <Button
                              size="small"
                              onClick={() => clearAllPricingMarkupPermissions(selectedPermissionRole.key)}
                              disabled={selectedPricingMarkupStates.every((control) => control.actions.every((action) => !action.checked))}
                            >
                              全部取消
                            </Button>
                          </Space>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid role-permission-pricing-module-grid">
                          {selectedPricingMarkupStates.map((control) => (
                            <div className={`role-permission-option role-permission-compact-option role-permission-pricing-module-option${control.actions.some((action) => action.checked) ? ' role-permission-granted' : ''}`} key={control.module}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <div className="role-permission-pricing-actions">
                                {control.actions.map((action) => <Checkbox key={action.code} checked={action.checked} onChange={(event) => togglePricingMarkupPermission(selectedPermissionRole.key, control.module, action.key, event.target.checked)}>{action.label}</Checkbox>)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : selectedOrderEntryDrafts ? (
                      <div className="role-permission-stage-block-panel role-permission-draft-panel">
                        <div className="role-permission-section-heading">
                          <Text strong>草稿箱授权</Text>
                          <Tag color={selectedOrderEntryDraftPermissionStates.some((control) => control.checked) ? 'blue' : 'orange'}>
                            {selectedOrderEntryDraftPermissionStates.filter((control) => control.checked).length}/3 已授权
                          </Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedOrderEntryDraftPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配草稿箱${control.label}`}
                                checked={control.checked}
                                onChange={(event) => toggleOrderEntryDraftPermission(selectedPermissionRole.key, control.code, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedPendingReview ? (
                      <div className="role-permission-stage-block-panel role-permission-draft-panel">
                        <div className="role-permission-section-heading">
                          <Text strong>待审核运单授权</Text>
                          <Tag color={selectedPendingReviewPermissionStates.some((control) => control.checked) ? 'blue' : 'orange'}>
                            {selectedPendingReviewPermissionStates.filter((control) => control.checked).length}/2 已授权
                          </Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedPendingReviewPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配待审核运单${control.label}`}
                                checked={control.checked}
                                onChange={(event) => togglePendingReviewPermission(selectedPermissionRole.key, control.code, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : !selectedDirectBusinessGrantEntry && !selectedPermissionAccessState.checked ? (
                      <div className="role-permission-detail-empty">
                        <Text strong>{`先开放“进入${selectedWorkspacePermissions?.[0]?.replace(`${permissionWorkspace.label} / `, '') ?? '该模块'}”`}</Text>
                        <Text type="secondary">开放查看入口后，再按需勾选具体操作权限。</Text>
                      </div>
                    ) : selectedOrderEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Text strong>录单授权</Text>
                          <Tag color={selectedOrderEntryPermissionStates.some((control) => control.checked) ? 'blue' : 'orange'}>
                            {selectedOrderEntryPermissionStates.filter((control) => control.checked).length}/3 已授权
                          </Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedOrderEntryPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配录单${control.label}`}
                                checked={control.checked}
                                onChange={(event) => toggleOrderEntryPermission(selectedPermissionRole.key, control.code, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedWarehouseEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Text strong>{selectedWarehouseRentScope ? '仓租数据范围' : '功能授权'}</Text>
                          <Tag color="blue">
                            {selectedAssignableWorkspacePermissions.filter((permission) => selectedRoleGrantedPermissions.includes(permission.code)).length}/{selectedAssignableWorkspacePermissions.length} 已授权
                          </Tag>
                        </div>
                        {selectedWarehouseRentScope ? (
                          <Radio.Group
                            aria-label="仓租数据范围"
                            value={selectedAssignableWorkspacePermissions.find((permission) => selectedRoleGrantedPermissions.includes(permission.code))?.code}
                            onChange={(event) => setWarehouseRentScope(selectedPermissionRole.key, event.target.value as PermissionKey)}
                          >
                            <Space direction="vertical" size={10}>
                              {selectedAssignableWorkspacePermissions.map((permission) => <Radio key={permission.code} value={permission.code}>{permission.label}</Radio>)}
                            </Space>
                          </Radio.Group>
                        ) : (
                          <div className="role-permission-option-grid role-permission-stage-block-grid">
                            {selectedAssignableWorkspacePermissions.map((permission) => {
                              const checked = selectedRoleGrantedPermissions.includes(permission.code);
                              return (
                                <label className={`role-permission-option role-permission-compact-option${checked ? ' role-permission-granted' : ''}`} key={permission.code}>
                                  <span className="role-permission-option-copy role-permission-compact-copy"><Text strong>{permission.label}</Text></span>
                                  <Checkbox
                                    aria-label={`分配${selectedWorkspacePermissions[0].replace('仓库管理 / ', '')}${permission.label}`}
                                    checked={checked}
                                    onChange={(event) => toggleWarehousePermission(selectedPermissionRole.key, permission.code, event.target.checked)}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : selectedMarketEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Space size={8}>
                            <Text strong>功能授权</Text>
                            <Tag color="blue">{selectedMarketPermissionStates.filter((control) => control.checked).length}/{selectedMarketPermissionStates.length} 已授权</Tag>
                          </Space>
                          <Button
                            size="small"
                            onClick={() => clearAllMarketPermissions(selectedPermissionRole.key)}
                            disabled={selectedMarketPermissionStates.every((control) => !control.checked)}
                          >
                            全部取消
                          </Button>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedMarketPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.id}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配${selectedWorkspacePermissions[0].replace('市场管理 / ', '')}${control.label}`}
                                checked={control.checked}
                                onChange={(event) => toggleMarketPermissionControl(selectedPermissionRole.key, control.codes, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedFinanceEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Space size={8}>
                            <Text strong>功能授权</Text>
                            <Tag color="blue">{selectedFinancePermissionStates.filter((control) => control.checked).length}/{selectedFinancePermissionStates.length} 已授权</Tag>
                          </Space>
                          <Button
                            size="small"
                            onClick={() => clearAllFinancePermissions(selectedPermissionRole.key)}
                            disabled={selectedFinancePermissionStates.every((control) => !control.checked)}
                          >
                            全部取消
                          </Button>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedFinancePermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.id}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配${selectedWorkspacePermissions[0].replace('财务管理 / ', '')}${control.label}`}
                                checked={control.checked}
                                onChange={(event) => toggleFinancePermissionControl(selectedPermissionRole.key, control.codes, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedGenericPermissionEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Space size={8}>
                            <Text strong>功能授权</Text>
                            <Tag color="blue">{selectedGenericPermissionStates.filter((control) => control.checked).length}/{selectedGenericPermissionStates.length} 已授权</Tag>
                          </Space>
                          <Button
                            size="small"
                            onClick={() => clearAllGenericPermissions(selectedPermissionRole.key)}
                            disabled={selectedGenericPermissionStates.every((control) => !control.checked)}
                          >
                            全部取消
                          </Button>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedGenericPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.id}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配${selectedWorkspacePermissions[0].split(' / ')[1] ?? ''}${control.label}`}
                                checked={control.checked}
                                onChange={(event) => toggleGenericPermissionControl(selectedPermissionRole.key, control.id, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedCustomerServiceDataConfirm ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Space size={8}><Text strong>数据确认授权</Text><Button size="small" onClick={() => clearAllCustomerServicePermissions(selectedPermissionRole.key, customerServiceDataConfirmPermissionControls)} disabled={selectedCustomerServiceDataConfirmPermissionStates.every((control) => !control.checked)}>全部取消</Button></Space>
                          <Tag color={selectedCustomerServiceDataConfirmPermissionStates.some((control) => control.checked) ? 'orange' : 'blue'}>
                            {selectedCustomerServiceDataConfirmPermissionStates.some((control) => control.checked) ? '已分配权限' : '未分配权限'}
                          </Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedCustomerServiceDataConfirmPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={control.label}
                                checked={control.checked}
                                onChange={(event) => toggleCustomerServicePermission(selectedPermissionRole.key, control.code, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedCustomerServicePendingRouting ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Space size={8}><Text strong>待排货授权</Text><Button size="small" onClick={() => clearAllCustomerServicePermissions(selectedPermissionRole.key, customerServicePendingRoutingPermissionControls)} disabled={selectedCustomerServicePendingRoutingPermissionStates.every((control) => !control.checked)}>全部取消</Button></Space>
                          <Tag color={selectedCustomerServicePendingRoutingPermissionStates.some((control) => control.checked) ? 'orange' : 'blue'}>
                            {selectedCustomerServicePendingRoutingPermissionStates.some((control) => control.checked) ? '已分配权限' : '未分配权限'}
                          </Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedCustomerServicePendingRoutingPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={control.label}
                                checked={control.checked}
                                onChange={(event) => toggleCustomerServicePermission(selectedPermissionRole.key, control.code, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedCustomerServiceTransfer ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Space size={8}><Text strong>转单号授权</Text><Button size="small" onClick={() => clearAllCustomerServicePermissions(selectedPermissionRole.key, customerServiceTransferPermissionControls)} disabled={selectedCustomerServiceTransferPermissionStates.every((control) => !control.checked)}>全部取消</Button></Space>
                          <Tag color={selectedCustomerServiceTransferPermissionStates.some((control) => control.checked) ? 'orange' : 'blue'}>
                            {selectedCustomerServiceTransferPermissionStates.some((control) => control.checked) ? '已分配权限' : '未分配权限'}
                          </Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedCustomerServiceTransferPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={control.label}
                                checked={control.checked}
                                onChange={(event) => toggleCustomerServicePermission(selectedPermissionRole.key, control.code, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedCustomerServiceEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Space size={8}>
                            <Text strong>功能授权</Text>
                            <Tag color="blue">
                              {selectedCustomerServiceGenericPermissionStates.filter((control) => control.checked).length}/{selectedCustomerServiceGenericPermissionStates.length} 已授权
                            </Tag>
                          </Space>
                          <Space size={6}>
                            <Button
                              size="small"
                              onClick={() => clearAllCustomerServicePermissions(
                                selectedPermissionRole.key,
                                selectedCustomerServiceGenericPermissionStates.flatMap((control) => control.codes).map((code) => ({ code }))
                              )}
                              disabled={selectedCustomerServiceGenericPermissionStates.every((control) => !control.checked)}
                            >
                              全部取消
                            </Button>
                          </Space>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedCustomerServiceGenericPermissionStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.id}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={`分配${control.label}`}
                                checked={control.checked}
                                onChange={(event) => control.codes.forEach((code) => toggleCustomerServicePermission(selectedPermissionRole.key, code, event.target.checked))}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : selectedLineShipmentPool ? (
                      <div style={{ display: 'grid', gap: 16 }}>
                        <div className="role-permission-stage-block-panel">
                          <div className="role-permission-section-heading">
                            <Text strong>基础功能授权</Text>
                            <Tag color="blue">{selectedLineShipmentBasePermissionStates.filter((control) => control.checked).length}/{selectedLineShipmentBasePermissionStates.length} 已授权</Tag>
                          </div>
                          <div className="role-permission-option-grid role-permission-stage-block-grid">
                            {selectedLineShipmentBasePermissionStates.map((control) => (
                              <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.id}>
                                <span className="role-permission-option-copy role-permission-compact-copy">
                                  <Text strong>{control.label}</Text>
                                </span>
                                <Checkbox
                                  aria-label={`分配专线运单池${control.label}`}
                                  checked={control.checked}
                                  onChange={(event) => toggleGenericPermissionControl(selectedPermissionRole.key, control.id, event.target.checked)}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="role-permission-stage-block-panel">
                          <div className="role-permission-section-heading">
                            <Space size={8}>
                              <Text strong>阶段编辑授权</Text>
                              <Tag color={selectedLineShipmentStagePermissionStates.some((control) => control.checked) ? 'blue' : 'orange'}>
                                {selectedLineShipmentStagePermissionStates.filter((control) => control.checked).length}/{selectedLineShipmentStagePermissionStates.length} 个阶段已授权
                              </Tag>
                            </Space>
                            <Space size={6}>
                              <Button size="small" onClick={() => clearAllLineShipmentStagePermissions(selectedPermissionRole.key)} disabled={selectedLineShipmentStagePermissionStates.every((control) => !control.checked)}>全部取消</Button>
                            </Space>
                          </div>
                          <div className="role-permission-option-grid role-permission-stage-block-grid">
                            {selectedLineShipmentStagePermissionStates.map((control) => (
                              <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                                <span className="role-permission-option-copy role-permission-compact-copy">
                                  <Text strong>{control.label}</Text>
                                </span>
                                <Checkbox
                                  aria-label={control.label}
                                  checked={control.checked}
                                  onChange={(event) => toggleLineShipmentStagePermission(selectedPermissionRole.key, control.stage, event.target.checked)}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : selectedPriceBookManagementEntry ? (
                      <div className="role-permission-stage-block-panel">
                        <div className="role-permission-section-heading">
                          <Text strong>价格表功能授权</Text>
                          <Tag color="blue">{selectedPricingPriceBookStates.filter((control) => control.checked).length}/{selectedPricingPriceBookStates.length} 已授权</Tag>
                        </div>
                        <div className="role-permission-option-grid role-permission-stage-block-grid">
                          {selectedPricingPriceBookStates.map((control) => (
                            <label className={`role-permission-option role-permission-compact-option${control.checked ? ' role-permission-granted' : ''}`} key={control.code}>
                              <span className="role-permission-option-copy role-permission-compact-copy">
                                <Text strong>{control.label}</Text>
                              </span>
                              <Checkbox
                                aria-label={control.label}
                                checked={control.checked}
                                onChange={(event) => togglePricingPriceBookPermission(selectedPermissionRole.key, control.code, event.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="role-permission-detail-empty">
                        <Text strong>二级入口已开放</Text>
                        <Text type="secondary">该入口下全部现有操作权限已随二级入口统一生效，三级权限暂不单独配置。</Text>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <ManagedTable rowKey="key" size="small" pagination={false} dataSource={[]} columns={[]} loading recordDetail={false} />
            )}
          </Card>
          ) : null}
        </Col>
        ) : null}

        {['security', 'aiSecurity', 'audit', 'baseConfig'].includes(activeSettingsSection) ? (
        <Col xs={24}>
          {activeSettingsSection === 'security' ? (
          <Card
            title={
              <Flex align="center" gap={8}>
                <ShieldCheck size={18} />
                <span>权限安全区</span>
              </Flex>
            }
          >
            <Space direction="vertical" size={12} className="quality-panel">
              <Alert type="success" showIcon message="系统管理员默认拥有最大权限" />
              <Alert type="warning" showIcon message="客服不能改财务核销" />
              <Alert type="warning" showIcon message="财务不能改系统权限" />
              <Alert type="info" showIcon message="客户只能访问本人或所属客户公司的数据" />
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'aiSecurity' ? (
          <Card className="automation-card" title="AI 接口安全">
            <Space direction="vertical" size={10} className="quality-panel">
              <Tag color="blue">硅基流动</Tag>
              <Alert type="success" showIcon message="AI 调用已统一受控" />
              <Alert type="warning" showIcon message="SILICONFLOW_API_KEY 只读取环境变量，不写入前端代码" />
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'audit' ? (
          <Card
            className="automation-card audit-workbench-card"
            title={(
              <Flex align="center" gap={8}>
                <FileText size={18} />
                <span>操作日志</span>
              </Flex>
            )}
            extra={
              <Space>
                <Button icon={<RefreshCw size={15} />} onClick={() => setAuditAppliedFilters({ ...auditAppliedFilters })}>刷新</Button>
                <Button icon={<FileInput size={16} />} disabled={!auditLogs.length} onClick={() => void exportAuditLogs()}>
                  导出 Excel
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" size={12} className="quality-panel">
              {auditWarnings.length ? (
                <Alert
                  type="warning"
                  showIcon
                  message="发现高频删除风险"
                  description={auditWarnings
                    .map(
                      (warning) =>
                        `${warning.actorUsername} 在 ${formatBeijingDateTime(warning.windowStartedAt)} 至 ${formatBeijingDateTime(
                          warning.windowEndedAt
                        )} 连续删除/作废 ${warning.count} 次`
                    )
                    .join('；')}
                />
              ) : null}

              <div className="audit-filter-strip">
                <Input
                  className="audit-keyword-input"
                  value={auditDraftFilters.target}
                  placeholder="操作人 / 模块 / 对象 / 路径"
                  onChange={(event) => setAuditDraftFilters((current) => ({ ...current, target: event.target.value }))}
                />
                <Space.Compact>
                  {[
                    { label: '全部', value: undefined },
                    { label: '成功', value: 'SUCCESS' as const },
                    { label: '失败', value: 'FAILED' as const }
                  ].map((item) => (
                    <Button
                      key={item.label}
                      type={auditDraftFilters.result === item.value ? 'primary' : 'default'}
                      onClick={() => setAuditDraftFilters((current) => ({ ...current, result: item.value }))}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Space.Compact>
                <Space.Compact>
                  {[
                    { label: '今天', days: 1 },
                    { label: '近7天', days: 7 },
                    { label: '近30天', days: 30 }
                  ].map((item) => (
                    <Button
                      key={item.label}
                      onClick={() => {
                        const next = { ...auditDraftFilters, ...buildAuditShortcut(item.days) };
                        setAuditDraftFilters(next);
                        setAuditPagination((current) => ({ ...current, page: 1 }));
                        setAuditAppliedFilters(next);
                      }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Space.Compact>
                <Button
                  type="primary"
                  onClick={() => {
                    setAuditPagination((current) => ({ ...current, page: 1 }));
                    setAuditAppliedFilters({ ...auditDraftFilters });
                  }}
                >
                  查询
                </Button>
                <Button
                  onClick={() => {
                    setAuditDraftFilters({});
                    setAuditPagination((current) => ({ ...current, page: 1 }));
                    setAuditAppliedFilters({});
                  }}
                >
                  重置
                </Button>
                <Button onClick={() => setAuditAdvancedOpen((current) => !current)}>更多筛选</Button>
              </div>

              {auditAdvancedOpen ? (
                <Row gutter={[10, 10]} className="module-filter-grid audit-advanced-filter">
                  <Col xs={24} md={12} lg={8} xl={6}>
                    {renderFilterField('操作人', (
                      <Input
                        value={auditDraftFilters.operator}
                        placeholder="账号或用户 ID"
                        onChange={(event) => setAuditDraftFilters((current) => ({ ...current, operator: event.target.value }))}
                      />
                    ))}
                  </Col>
                  <Col xs={24} md={12} lg={8} xl={6}>
                    {renderFilterField('模块', (
                      <Select
                        allowClear
                        value={auditDraftFilters.module}
                        placeholder="选择模块"
                        options={auditModuleOptions}
                        onChange={(value) => setAuditDraftFilters((current) => ({ ...current, module: value }))}
                      />
                    ))}
                  </Col>
                  <Col xs={24} md={12} lg={8} xl={6}>
                    {renderFilterField('动作', (
                      <Input
                        value={auditDraftFilters.action}
                        placeholder="例如 审核 / 删除"
                        onChange={(event) => setAuditDraftFilters((current) => ({ ...current, action: event.target.value }))}
                      />
                    ))}
                  </Col>
                  <Col xs={24} md={12} lg={8} xl={6}>
                    {renderFilterField('开始时间', (
                      <DatePicker
                        showTime={{ format: 'HH:mm' }}
                        format={auditDateTimeFormat}
                        value={getAuditDateTimeValue(auditDraftFilters.startedAt)}
                        placeholder="选择开始时间"
                        className="full-width-control"
                        locale={auditDatePickerLocale}
                        needConfirm
                        renderExtraFooter={() => (
                          <div className="app-date-picker-confirm-footer">
                            <Button type="link" size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => setAuditDraftFilters((current) => ({ ...current, startedAt: undefined }))}>
                              清除
                            </Button>
                          </div>
                        )}
                        onChange={(_value, value) => setAuditDraftFilters((current) => ({ ...current, startedAt: getAuditDateTimeFilterValue(value) }))}
                      />
                    ))}
                  </Col>
                  <Col xs={24} md={12} lg={8} xl={6}>
                    {renderFilterField('结束时间', (
                      <DatePicker
                        showTime={{ format: 'HH:mm' }}
                        format={auditDateTimeFormat}
                        value={getAuditDateTimeValue(auditDraftFilters.endedAt)}
                        placeholder="选择结束时间"
                        className="full-width-control"
                        locale={auditDatePickerLocale}
                        needConfirm
                        renderExtraFooter={() => (
                          <div className="app-date-picker-confirm-footer">
                            <Button type="link" size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => setAuditDraftFilters((current) => ({ ...current, endedAt: undefined }))}>
                              清除
                            </Button>
                          </div>
                        )}
                        onChange={(_value, value) => setAuditDraftFilters((current) => ({ ...current, endedAt: getAuditDateTimeFilterValue(value) }))}
                      />
                    ))}
                  </Col>
                </Row>
              ) : null}

              <div className="audit-workbench-layout">
                <ManagedTable
                  recordDetail={false}
                  className="audit-log-table"
                  rowKey="id"
                  size="small"
                  loading={auditLoading}
                  dataSource={auditLogs}
                  pagination={{
                    current: auditPagination.page,
                    pageSize: auditPagination.pageSize,
                    total: auditPagination.totalItems,
                    showTotal: (total) => `共 ${total} 条`
                  }}
                  onChange={(pagination) => setAuditPagination((current) => ({
                    ...current,
                    page: pagination.current ?? current.page,
                    pageSize: pagination.pageSize ?? current.pageSize
                  }))}
                  onRow={(row) => ({
                    onClick: () => openAuditDetail(row)
                  })}
                  rowClassName={(row) => (row.id === selectedAuditLog?.id ? 'audit-row-selected' : '')}
                  columns={[
                    { title: '时间', dataIndex: 'createdAt', width: 145, render: (value: string) => formatBeijingDateTime(value) },
                    {
                      title: '结果',
                      dataIndex: 'resultLabel',
                      width: 72,
                      render: (value: string, row: AuditLogSummary) => <Tag color={row.result === 'SUCCESS' ? 'green' : 'red'}>{value}</Tag>
                    },
                    {
                      title: '风险',
                      width: 92,
                      render: (_value: unknown, row: AuditLogSummary) => {
                        const risk = getAuditRisk(row);
                        return <Tag color={risk.color}>{risk.label}</Tag>;
                      }
                    },
                    { title: '操作人', dataIndex: 'actorUsername', width: 88, ellipsis: true },
                    ...(hasSystemPermission('system:audit:ip-view') ? [{ title: 'IP 地址', dataIndex: 'ipAddress', width: 118, render: (_value: string | undefined, row: AuditLogSummary) => getAuditIpText(row) }] : []),
                    {
                      title: '模块',
                      dataIndex: 'moduleLabel',
                      width: 105,
                      render: (value: string) => <Tag color="blue">{value}</Tag>
                    },
                    { title: '操作动作', dataIndex: 'actionLabel', width: 105 },
                    {
                      title: '操作对象',
                      dataIndex: 'target',
                      width: 250,
                      render: (_value: string, row: AuditLogSummary) => {
                        const target = getAuditTargetDisplay(row);
                        return (
                          <Space direction="vertical" size={0}>
                            <Text strong>{target.label}</Text>
                            {target.detail ? <Text type="secondary">{target.detail}</Text> : null}
                          </Space>
                        );
                      }
                    },
                    {
                      title: '摘要',
                      dataIndex: 'summary',
                      width: 300,
                      render: (_value: unknown, row: AuditLogSummary) => <Text type="secondary">{summarizeAuditChange(row)}</Text>
                    },
                    {
                      title: '操作',
                      fixed: 'right',
                      width: 96,
                      render: (_value: unknown, row: AuditLogSummary) => (
                        <Button
                          type="link"
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAuditDetail(row);
                          }}
                        >
                          查看详情
                        </Button>
                      )
                    }
                  ]}
                  scroll={{ x: 1370 }}
                />
              </div>
              <Modal
                title="审计详情"
                open={auditDetailOpen}
                width={860}
                className="audit-detail-modal"
                footer={<Button type="primary" onClick={() => setAuditDetailOpen(false)}>关闭</Button>}
                onCancel={() => setAuditDetailOpen(false)}
              >
                {selectedAuditLog ? (
                  <Space direction="vertical" size={12} className="quality-panel full-width-control">
                    <Space>
                      <Tag color={selectedAuditLog.result === 'SUCCESS' ? 'green' : 'red'}>{selectedAuditLog.resultLabel}</Tag>
                      <Text type="secondary">{formatBeijingDateTime(selectedAuditLog.createdAt)}</Text>
                    </Space>
                    <div className="audit-detail-fields">
                      <Text type="secondary">操作人</Text><Text>{selectedAuditLog.actorUsername}</Text>
                      <Text type="secondary">IP 地址</Text><Text>{getAuditIpText(selectedAuditLog)}</Text>
                      <Text type="secondary">模块</Text><Text>{selectedAuditLog.moduleLabel}</Text>
                      <Text type="secondary">操作动作</Text><Text>{selectedAuditLog.actionLabel}</Text>
                      <Text type="secondary">操作对象</Text><Text>{getAuditTargetDisplay(selectedAuditLog).label}</Text>
                    </div>
                    {hasSystemPermission('system:audit:before-after-view') ? <><div><Text strong>变更前</Text><pre className="audit-detail-code">{formatJsonBlock(selectedAuditLog.before)}</pre></div><div><Text strong>变更后</Text><pre className="audit-detail-code">{formatJsonBlock(selectedAuditLog.after)}</pre></div></> : null}
                    {hasSystemPermission('system:audit:raw-request-view') ? <div><Text strong>原始请求</Text><pre className="audit-detail-code">{buildAuditRawLog(selectedAuditLog)}</pre></div> : null}
                  </Space>
                ) : (
                  <Text type="secondary">暂无审计日志</Text>
                )}
              </Modal>
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'baseConfig' ? (
          <Card className="automation-card" title="系统基础配置">
            <Space wrap>
              {['公司资料', '模板', '通知', '轨迹规则', '状态字典', '转单提醒'].map((item) => (
                <Button key={item} onClick={() => handleSettingAction(`已进入${item}配置`)}>
                  {item}
                </Button>
              ))}
            </Space>
          </Card>
          ) : null}
        </Col>
        ) : null}
      </Row>
      </ModuleSubWorkspace>
      <Modal
        title={editingSite ? '编辑站点' : '新建站点'}
        open={siteCreateOpen}
        destroyOnHidden
        okText={editingSite ? '保存站点' : '创建站点'}
        cancelText="取消"
        onOk={() => void submitSite()}
        onCancel={() => {
          setSiteCreateOpen(false);
          setEditingSite(null);
          siteForm.resetFields();
        }}
      >
        <Form form={siteForm} layout="vertical">
          <Form.Item name="sortOrder" label="排序" rules={[{ required: true, message: '请输入排序' }]}>
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item name="name" label="站点名称" rules={[{ required: true, whitespace: true, message: '请输入站点名称' }]}>
            <Input placeholder="例如 深圳思远" />
          </Form.Item>
          <Form.Item name="enabled" label="状态" initialValue="true">
            <select aria-label="站点状态" className="native-select">
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="用户组详情"
        open={roleGroupDetailOpen && Boolean(selectedRoleGroup)}
        width={760}
        className="user-group-detail-modal"
        destroyOnHidden
        onCancel={() => setRoleGroupDetailOpen(false)}
        footer={selectedRoleGroup ? (
          <Space>
            <Button onClick={() => setRoleGroupDetailOpen(false)}>关闭</Button>
            {!isAdministratorRoleRow(selectedRoleGroup) ? <Button type="primary" icon={<Edit size={15} />} onClick={() => {
              setRoleGroupDetailOpen(false);
              openRoleGroupEditor(selectedRoleGroup);
            }}>编辑用户组</Button> : null}
          </Space>
        ) : null}
      >
        {selectedRoleGroup ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space align="center" size={12}>
              <span className="user-group-detail-icon"><Users size={28} /></span>
              <Space direction="vertical" size={2}>
                <Space>
                  <Text strong>{selectedRoleGroup.label}</Text>
                  <Tag color={selectedRoleGroup.enabled === false ? 'default' : 'green'}>{selectedRoleGroup.enabled === false ? '停用' : '启用'}</Tag>
                </Space>
                <Text type="secondary">{selectedRoleGroup.description || selectedRoleGroup.restriction || '按岗位维护菜单与数据权限。'}</Text>
              </Space>
            </Space>
            <div className="user-group-detail-section">
              <Text strong>基础信息</Text>
              <div className="user-group-detail-fields">
                <Text type="secondary">站点范围</Text><Text>{selectedRoleGroup.site || '全部站点'}</Text>
                <Text type="secondary">角色类型</Text><Text>{isAdministratorRoleRow(selectedRoleGroup) ? '平台管理' : '业务用户组'}</Text>
                <Text type="secondary">绑定员工</Text><Text>{roleGroupStaff.length} 人</Text>
                <Text type="secondary">创建时间</Text><Text>-</Text>
                <Text type="secondary">更新时间</Text><Text>-</Text>
              </div>
            </div>
            <div className="user-group-detail-section">
              <Flex justify="space-between" align="center">
                <Text strong>绑定员工 ({roleGroupStaff.length})</Text>
                <Button type="link" size="small" onClick={() => {
                  setRoleGroupDetailOpen(false);
                  setStaffFilters({ status: 'ALL', role: selectedRoleGroup.key as StaffAccountRoleKey });
                  setStaffAppliedFilters({ status: 'ALL', role: selectedRoleGroup.key as StaffAccountRoleKey });
                  setActiveSettingsSection('accounts');
                }}>查看全部</Button>
              </Flex>
              <Space wrap>
                {roleGroupStaff.slice(0, 3).map((account) => (
                  <span className="user-group-staff-chip" key={account.id}>
                    <span>{(account.name || account.nickname || account.username).slice(0, 1).toUpperCase()}</span>
                    {account.name || account.nickname || account.username}
                  </span>
                ))}
                {!roleGroupStaff.length ? <Text type="secondary">暂无绑定员工</Text> : null}
              </Space>
            </div>
            <div className="user-group-detail-section">
              <Flex justify="space-between" align="center">
                <Text strong>菜单权限</Text>
                <Button type="link" size="small" onClick={() => {
                  setRoleGroupDetailOpen(false);
                  openRolePermissions(selectedRoleGroup.key);
                }}>查看全部</Button>
              </Flex>
              <Text type="secondary">共 {selectedRoleGroup.permissions.length} 个菜单，已授权 {selectedRoleGroup.permissions.length} 个</Text>
              <div className="user-group-permission-summary">{getRolePermissionSummary(selectedRoleGroup)}</div>
            </div>
            <div className="user-group-detail-section">
              <Flex justify="space-between" align="center">
                <Text strong>数据范围</Text>
                <Button type="link" size="small" onClick={() => {
                  setRoleGroupDetailOpen(false);
                  openRolePermissions(selectedRoleGroup.key);
                }}>查看全部</Button>
              </Flex>
              <Text>{selectedRoleGroup.scope || selectedRoleGroup.restriction || '按用户组权限执行'}</Text>
            </div>
            <div className="user-group-detail-section">
              <Text strong>最近变更</Text>
              <div className="user-group-timeline">
                {roleGroupAuditLogs.length ? roleGroupAuditLogs.slice(0, 2).map((log) => (
                  <div key={log.id}>
                    <Text>{formatBeijingDateTime(log.createdAt)}</Text>
                    <Text type="secondary">{log.actorUsername} 调整：{log.actionLabel}</Text>
                  </div>
                )) : <Text type="secondary">暂无变更记录</Text>}
              </div>
            </div>
          </Space>
        ) : null}
      </Modal>
      <Modal
        title={editingRoleGroup ? '编辑用户组' : '新建用户组'}
        open={roleGroupOpen}
        destroyOnHidden
        okText={editingRoleGroup ? '保存用户组' : '创建用户组'}
        cancelText="取消"
        onOk={() => void submitRoleGroup()}
        onCancel={() => {
          setRoleGroupOpen(false);
          setEditingRoleGroup(null);
          roleGroupForm.resetFields();
        }}
      >
        <Form form={roleGroupForm} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="sortOrder" label="排序" rules={[{ required: true, message: '请输入排序' }]}>
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item name="label" label="用户组名称" rules={[{ required: true, whitespace: true, message: '请输入用户组名称' }]}>
                <Input placeholder="例如 仓库收货" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="用户组说明">
            <Input placeholder="例如 处理一般客服工作" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="site" label="站点">
                <Select
                  allowClear
                  showSearch
                  filterOption={matchesUserGroupSiteOption}
                  loading={sitesLoading}
                  options={enabledSiteOptions}
                  placeholder="请选择或搜索站点"
                  notFoundContent={sitesLoading ? '站点加载中' : '未匹配到启用站点'}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="enabled" label="状态" initialValue="true">
                <select aria-label="用户组状态" className="native-select">
                  <option value="true">启用</option>
                  <option value="false">停用</option>
                </select>
              </Form.Item>
            </Col>
          </Row>
          {!editingRoleGroup
          && hasSystemPermission('system:user-groups:create-from-template')
          && hasSystemPermission('system:role-permissions:copy-role') ? (
            <Form.Item
              name="sourceRoleKey"
              label="复制已有用户组权限（可选）"
              extra="不选择时使用业务员默认权限；仅复制权限，不复制站点、成员和用户组资料。"
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="搜索并选择已有用户组"
                options={rolePermissionSourceOptions}
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
      <Modal
        title="复制权限"
        open={rolePermissionCopyOpen}
        destroyOnHidden
        okText="确认覆盖"
        cancelText="取消"
        confirmLoading={rolePermissionCopyLoading}
        okButtonProps={{ danger: true }}
        onOk={() => void submitRolePermissionCopy()}
        onCancel={() => {
          if (rolePermissionCopyLoading) return;
          setRolePermissionCopyOpen(false);
          setRolePermissionCopyTarget(null);
          setRolePermissionCopyError(null);
          rolePermissionCopyForm.resetFields();
        }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Form form={rolePermissionCopyForm} layout="vertical">
            <Form.Item label="覆盖到当前用户组">
              <Input value={rolePermissionCopyTarget?.label ?? ''} readOnly />
            </Form.Item>
            <Form.Item
              name="sourceRoleKey"
              label="复制权限自"
              rules={[{ required: true, message: '请选择权限来源用户组' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="搜索并选择已有用户组"
                options={rolePermissionSourceOptions.filter((option) => option.value !== rolePermissionCopyTarget?.key)}
              />
            </Form.Item>
          </Form>
          <Alert
            type="warning"
            showIcon
            message={selectedRolePermissionCopySource
              ? `将用“${selectedRolePermissionCopySource.label}”的 ${selectedRolePermissionCopySource.permissions.length} 项权限，完整覆盖“${rolePermissionCopyTarget?.label ?? ''}”当前 ${rolePermissionCopyTarget?.permissions.length ?? 0} 项权限。`
              : '确认后将完整覆盖当前用户组原有权限。'}
            description="用户组名称、站点、说明、状态和绑定员工不会改变；来源组后续调整也不会自动同步。"
          />
          {rolePermissionCopyError ? <Alert type="error" showIcon message={rolePermissionCopyError} /> : null}
        </Space>
      </Modal>
      <Modal
        title={editingStaffAccount ? '修改用户' : '新建用户'}
        open={staffCreateOpen}
        width={680}
        destroyOnHidden
        okText={editingStaffAccount ? '保存用户' : '创建用户'}
        cancelText="取消"
        onOk={() => void submitStaffAccountCreate()}
        onCancel={() => {
          setStaffCreateOpen(false);
          setEditingStaffAccount(null);
          staffCreateForm.resetFields();
        }}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Form form={staffCreateForm} layout="vertical" initialValues={{ role: 'OPERATOR', gender: 'UNKNOWN', enabled: true }}>
            <Form.Item
              name="username"
              label="账户"
              rules={[
                { required: true, message: '请输入账户' },
                { pattern: /^[a-zA-Z0-9_.-]{5,32}$/, message: '账号需为 5-32 位，可包含英文、数字、点、下划线或短横线' },
                {
                  validator(_, value?: string) {
                    return !value || /[a-zA-Z]/.test(value) ? Promise.resolve() : Promise.reject(new Error('账号至少包含一个英文字母'));
                  }
                }
              ]}
            >
              <Input placeholder="例如 siyuan" />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="departmentId" label="部门">
                  <Select
                    allowClear
                    loading={departmentsLoading}
                    options={departmentOptions}
                    placeholder="请选择部门"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="name" label="中文名" rules={[{ max: 40, message: '中文名最多 40 个字符' }]}>
                  <Input placeholder="例如 张三" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="nickname" label="英文名" rules={[{ max: 40, message: '英文名最多 40 个字符' }]}>
                  <Input placeholder="例如 Jason" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  extra={editingStaffAccount ? '不填则不修改密码。' : '不填则由系统生成随机初始密码，并在创建成功后展示一次。'}
                  rules={[
                    {
                      validator(_, value?: string) {
                        const error = value ? getPasswordStrengthErrorForUi(value) : undefined;
                        return error ? Promise.reject(new Error(error)) : Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Input.Password placeholder="可填写初始密码" autoComplete="new-password" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="gender" label="性别">
                  <Select options={staffGenderOptions} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="site" label="所属站点">
                  <Select
                    allowClear
                    options={enabledSiteOptions}
                    placeholder="请选择站点"
                    onChange={() => staffCreateForm.setFieldValue('directManagerId', null)}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="directManagerId"
                  label="直属经理"
                  extra="仅可选择同站点、启用且所属用户组具备团队运单权限的经理账号。"
                >
                  <Select
                    allowClear
                    disabled={!selectedStaffSite}
                    options={directManagerOptions}
                    placeholder={selectedStaffSite ? '请选择直属经理' : '请先选择所属站点'}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="enabled" label="状态">
                  <Select options={[{ label: '在职', value: true }, { label: '离职', value: false }]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="role" label="所属用户组" rules={[{ required: true, message: '请选择所属用户组' }]}>
              <Select options={staffRoleOptions} />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </AppPage>
  );
}
