import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type * as XLSXModule from 'xlsx';
import { Activity, ClipboardCheck, FileInput, FileText, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Alert, Button, Card, Checkbox, Col, Flex, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { AuditLogListResponse, AuditLogQuery, AuditLogSummary, SiteSummary, StaffAccountCreateInput, StaffAccountQuery, StaffAccountRoleKey, StaffAccountSummary, StaffGender } from '@siyuan/shared';
import { ApiClient, type PermissionKey, type RoleGroupInput, type RoleKey, type RolePermissionMatrix, type RolePermissionRow } from '../../apiClient';
import { getPasswordStrengthErrorForUi } from '../appShell/config';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { PlaceholderPanel } from '../shared/PlaceholderPanel';
import { formatBeijingDateTime } from '../shared/format';
import { AppActionGroup, AppPage, AppPageHeader, ManagedTable, MetricCard, renderFilterActions, renderFilterField, renderNoticeBar, tenRowTablePagination } from '../shared/ui';

type XlsxModule = typeof XLSXModule;

function loadXlsx(): Promise<XlsxModule> {
  return import('xlsx');
}

const { Text } = Typography;

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

const staffImportHeaders = ['账户', '密码', '业务员', '中文名', '性别', '所属站点', '状态', '所属用户组'];

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

export function SettingsPage({
  apiClient,
  onAiAssist,
  aiLoading
}: {
  apiClient: ApiClient;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [roleMatrix, setRoleMatrix] = useState<RolePermissionMatrix | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<Record<string, PermissionKey[]>>({});
  const [activeSettingsSection, setActiveSettingsSection] = useState('accounts');
  const [auditLogs, setAuditLogs] = useState<AuditLogSummary[]>([]);
  const [auditWarnings, setAuditWarnings] = useState<AuditLogListResponse['suspiciousDeleteWarnings']>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, pageSize: 10, totalItems: 0 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditDraftFilters, setAuditDraftFilters] = useState<AuditLogQuery>({});
  const [auditAppliedFilters, setAuditAppliedFilters] = useState<AuditLogQuery>({});
  const [auditRawViewingLog, setAuditRawViewingLog] = useState<AuditLogSummary | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccountSummary[]>([]);
  const [staffAccountsLoading, setStaffAccountsLoading] = useState(false);
  const [selectedStaffAccountIds, setSelectedStaffAccountIds] = useState<string[]>([]);
  const [staffFilters, setStaffFilters] = useState<StaffAccountQuery>({ status: 'ALL' });
  const [staffAppliedFilters, setStaffAppliedFilters] = useState<StaffAccountQuery>({ status: 'ALL' });
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);
  const [editingStaffAccount, setEditingStaffAccount] = useState<StaffAccountSummary | null>(null);
  const [staffCreateForm] = Form.useForm<StaffAccountCreateInput>();
  const staffImportInputRef = useRef<HTMLInputElement | null>(null);
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
  const [roleGroupOpen, setRoleGroupOpen] = useState(false);
  const [editingRoleGroup, setEditingRoleGroup] = useState<RolePermissionRow | null>(null);
  const [roleGroupDisableConfirmOpen, setRoleGroupDisableConfirmOpen] = useState(false);
  const [roleGroupForm] = Form.useForm<RoleGroupFormValues>();
  const [selectedPermissionRoleKey, setSelectedPermissionRoleKey] = useState<RoleKey | null>(null);
  const settingsSubItems: ModuleSubNavItem[] = [
    { key: 'userGroups', label: '用户组', description: '组织与角色组' },
    { key: 'accounts', label: '用户名', description: '账号与数据范围' },
    { key: 'sites', label: '站点', description: '站点资料' },
    { key: 'customers', label: '客户资料', description: '客户主数据' },
    { key: 'audit', label: '操作日志', description: '操作记录' },
    { key: 'rolePermissions', label: '角色权限分配', description: '员工端权限' },
    { key: 'security', label: '权限安全区', description: '风险边界提示' },
    { key: 'aiSecurity', label: 'AI 接口安全', description: '密钥与调用入口' },
    { key: 'baseConfig', label: '系统基础配置', description: '模板与状态字典' }
  ];
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
      const rows = await apiClient.sites();
      setSites(Array.isArray(rows) ? rows : []);
    } catch (error) {
      setSettingsNotice(error instanceof Error ? error.message : '站点加载失败');
      setSites([]);
    } finally {
      setSitesLoading(false);
    }
  }, [apiClient]);

  async function submitSite() {
    const values = await siteForm.validateFields();
    const input = { name: values.name.trim(), sortOrder: Number(values.sortOrder) || 0, enabled: values.enabled === 'true' };
    const site = editingSite ? await apiClient.updateSite(editingSite.id, input) : await apiClient.createSite(input);
    setSites((current) => [...current.filter((item) => item.id !== site.id), site].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
    setSiteCreateOpen(false);
    setEditingSite(null);
    siteForm.resetFields();
    setSettingsNotice(editingSite ? `${site.name} 已更新` : `${site.name} 已创建`);
  }

  async function disableSite(site: SiteSummary) {
    const updated = await apiClient.updateSiteEnabled(site.id, { enabled: false });
    setSites((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSettingsNotice(`${updated.name} 已停用`);
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
      templateRole: values.templateRole
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

  async function submitStaffAccountCreate() {
    const values = await staffCreateForm.validateFields();
    const saved = editingStaffAccount
      ? await apiClient.updateStaffAccount(editingStaffAccount.id, values)
      : await apiClient.createStaffAccount(values);
    setStaffCreateOpen(false);
    setEditingStaffAccount(null);
    staffCreateForm.resetFields();
    setSettingsNotice(editingStaffAccount ? `${saved.username} 已更新` : `已新建用户 ${saved.username}，该账号首次登录必须修改密码。`);
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
    if (activeSettingsSection !== 'accounts') {
      return;
    }
    void loadStaffAccounts();
  }, [activeSettingsSection, loadStaffAccounts]);

  useEffect(() => {
    if (!['accounts', 'sites'].includes(activeSettingsSection)) {
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
    void apiClient
      .auditLogs({ page: auditPagination.page, pageSize: auditPagination.pageSize, ...auditAppliedFilters })
      .then((response) => {
        if (!mounted) {
          return;
        }
        setAuditLogs(response.rows);
        setAuditWarnings(response.suspiciousDeleteWarnings);
        setAuditPagination(response.pagination);
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

  const allRoleRows = roleMatrix?.roles ?? [];
  const roleRows = allRoleRows.filter((role) => role.key !== 'CUSTOMER');
  const rolePermissionRows = roleRows.filter((role) => role.enabled !== false && (!role.systemBuiltin || role.key === 'ADMIN'));
  const selectedPermissionRole =
    rolePermissionRows.find((role) => role.key === selectedPermissionRoleKey)
    ?? rolePermissionRows.find((role) => role.key !== 'ADMIN')
    ?? rolePermissionRows[0]
    ?? null;
  const userGroupRows = roleRows.filter((role) => !role.systemBuiltin);
  const selectedRoleGroup = userGroupRows.find((role) => role.key === selectedRoleGroupKey) ?? null;
  const staffRoleOptions: Array<{ label: string; value: StaffAccountRoleKey }> = roleMatrix
    ? rolePermissionRows
      .filter((role) => !role.systemBuiltin)
      .map((role) => ({ label: role.label, value: role.key as StaffAccountRoleKey }))
    : builtinStaffRoleOptions;
  const templateRoleOptions = builtinStaffRoleOptions.filter((role) => role.value !== 'ADMIN');
  const permissionGroups = Object.entries(
    (roleMatrix?.availablePermissions ?? []).reduce<Record<string, RolePermissionMatrix['availablePermissions']>>((acc, permission) => {
      acc[permission.group] = [...(acc[permission.group] ?? []), permission];
      return acc;
    }, {})
  );
  const filteredSites = sites.filter((site) => {
    const keyword = siteAppliedFilters.name.trim().toLowerCase();
    const matchesName = !keyword || site.name.toLowerCase().includes(keyword);
    const matchesStatus = siteAppliedFilters.status === 'ALL' || (siteAppliedFilters.status === 'ENABLED' ? site.enabled : !site.enabled);
    return matchesName && matchesStatus;
  });
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null;
  const enabledSiteOptions = sites.filter((site) => site.enabled).map((site) => ({ label: site.name, value: site.name }));
  const selectedStaffAccount = selectedStaffAccountIds.length === 1 ? staffAccounts.find((account) => account.id === selectedStaffAccountIds[0]) ?? null : null;

  async function downloadStaffImportTemplate() {
    const xlsx = await loadXlsx();
    const defaultRole = staffRoleOptions.find((role) => role.value === 'OPERATOR') ?? staffRoleOptions[0];
    const worksheet = xlsx.utils.aoa_to_sheet([
      staffImportHeaders,
      ['import001', 'Import@123', '张三', '张三', '男', enabledSiteOptions[0]?.value ?? '', '在职', defaultRole?.label ?? '业务员']
    ]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '用户名导入模板');
    xlsx.writeFile(workbook, '用户名批量导入模板.xlsx');
  }

  async function importStaffAccounts(file: File) {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setSettingsNotice('仅支持导入 .xlsx 模板文件');
      return;
    }
    const xlsx = await loadXlsx();
    const workbook = xlsx.read(await readFileAsArrayBuffer(file), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const roleByText = new Map(staffRoleOptions.flatMap((role) => [[role.label, role.value], [role.value, role.value]]));
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
        await apiClient.createStaffAccount({
          username,
          password: getImportCell(row, '密码') || undefined,
          nickname: getImportCell(row, '业务员') || undefined,
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
  }

  function toggleRolePermission(roleKey: RoleKey, permission: PermissionKey, checked: boolean) {
    setDraftPermissions((current) => {
      const currentPermissions = new Set(current[roleKey] ?? []);
      if (checked) {
        currentPermissions.add(permission);
      } else {
        currentPermissions.delete(permission);
      }
      return { ...current, [roleKey]: [...currentPermissions] };
    });
  }

  async function exportAuditLogs() {
    const xlsx = await loadXlsx();
    const worksheet = xlsx.utils.json_to_sheet(
      auditLogs.map((row) => ({
        时间: formatBeijingDateTime(row.createdAt),
        操作人: row.actorUsername,
        模块: row.moduleLabel,
        动作: row.actionLabel,
        动作编码: row.action,
        对象: getAuditTargetDisplay(row).label,
        接口: row.target,
        结果: row.resultLabel,
        变更前: row.before ? JSON.stringify(row.before) : '',
        变更后: row.after ? JSON.stringify(row.after) : ''
      }))
    );
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, '高危操作审计');
    xlsx.writeFile(workbook, `高危操作审计-${new Date().toISOString().slice(0, 10)}.xlsx`);
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

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <MetricCard icon={<ShieldCheck />} title="管理员权限" value="100%" extra="菜单、按钮、数据范围、系统参数" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Users />} title="员工角色" value={roleRows.length || 5} extra="管理员/客服/业务员/仓库/财务" />
        </Col>
        <Col xs={24} md={8}>
          <MetricCard icon={<Activity />} title="审计项" value="9" extra="权限修改必须写入 audit_logs" />
        </Col>
      </Row>

      <ModuleSubWorkspace items={settingsSubItems} activeKey={activeSettingsSection} onChange={setActiveSettingsSection}>
      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24}>
          {activeSettingsSection === 'customers' ? (
            <PlaceholderPanel title={settingsSubItems.find((item) => item.key === activeSettingsSection)?.label ?? '系统管理'} />
          ) : null}
          {activeSettingsSection === 'userGroups' ? (
          <Card
            title="用户组"
            extra={
              <Space>
                <Button size="small" onClick={() => {
                  setEditingRoleGroup(null);
                  roleGroupForm.setFieldsValue({
                    sortOrder: String(Math.max(0, ...userGroupRows.map((role) => role.sortOrder ?? 0)) + 1),
                    label: '',
                    description: '',
                    site: '深圳思远',
                    enabled: 'true',
                    templateRole: 'OPERATOR'
                  });
                  setRoleGroupOpen(true);
                }}>
                  增加
                </Button>
                <Button size="small" disabled={!selectedRoleGroup} onClick={() => {
                  if (!selectedRoleGroup) return;
                  setEditingRoleGroup(selectedRoleGroup);
                  roleGroupForm.setFieldsValue({
                    sortOrder: String(selectedRoleGroup.sortOrder ?? 0),
                    label: selectedRoleGroup.label,
                    description: selectedRoleGroup.description ?? '',
                    site: selectedRoleGroup.site ?? '',
                    enabled: selectedRoleGroup.enabled === false ? 'false' : 'true',
                    templateRole: 'OPERATOR'
                  });
                  setRoleGroupOpen(true);
                }}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该用户组？"
                  description="停用后不再作为新建员工可选角色，已绑定员工不会被删除。"
                  okText="确认停用"
                  cancelText="取消"
                  disabled={!selectedRoleGroup}
                  open={roleGroupDisableConfirmOpen}
                  onOpenChange={(open) => setRoleGroupDisableConfirmOpen(Boolean(selectedRoleGroup && open))}
                  onConfirm={async () => {
                    if (selectedRoleGroup) await disableRoleGroup(selectedRoleGroup);
                    setRoleGroupDisableConfirmOpen(false);
                  }}
                  onCancel={() => setRoleGroupDisableConfirmOpen(false)}
                >
                  <Button size="small" disabled={!selectedRoleGroup}>删除</Button>
                </Popconfirm>
              </Space>
            }
          >
            <Table
              rowKey="key"
              size="small"
              loading={!roleMatrix}
              pagination={tenRowTablePagination}
              dataSource={userGroupRows}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedRoleGroupKey ? [selectedRoleGroupKey] : [],
                onChange: (keys) => setSelectedRoleGroupKey(String(keys[0] ?? ''))
              }}
              onRow={(record) => ({ onClick: () => setSelectedRoleGroupKey(record.key) })}
              columns={[
                { title: '排序', dataIndex: 'sortOrder', width: 100, render: (value?: number) => value ?? 0 },
                { title: '用户组名称', dataIndex: 'label', width: 180, render: (value: string) => <Text strong>{value}</Text> },
                { title: '用户组说明', dataIndex: 'description', width: 260, render: (value?: string) => value || '-' },
                { title: '站点', dataIndex: 'site', width: 180, render: (value?: string) => value || '-' },
                { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled?: boolean) => <Tag color={enabled === false ? 'default' : 'green'}>{enabled === false ? '停用' : '启用'}</Tag> }
              ]}
              scroll={{ x: 860 }}
            />
          </Card>
          ) : null}
          {activeSettingsSection === 'sites' ? (
          <Card
            title="站点"
            extra={
              <Space>
                <Button size="small" onClick={() => {
                  setEditingSite(null);
                  siteForm.setFieldsValue({ sortOrder: String(Math.max(0, ...sites.map((site) => site.sortOrder)) + 1), name: '', enabled: 'true' });
                  setSiteCreateOpen(true);
                }}>
                  增加
                </Button>
                <Button size="small" disabled={!selectedSite} onClick={() => {
                  if (!selectedSite) return;
                  setEditingSite(selectedSite);
                  siteForm.setFieldsValue({ sortOrder: String(selectedSite.sortOrder), name: selectedSite.name, enabled: selectedSite.enabled ? 'true' : 'false' });
                  setSiteCreateOpen(true);
                }}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该站点？"
                  description="停用后不再作为新建员工可选站点，不会影响历史业务数据。"
                  okText="确认停用"
                  cancelText="取消"
                  disabled={!selectedSite}
                  open={siteDisableConfirmOpen}
                  onOpenChange={(open) => setSiteDisableConfirmOpen(Boolean(selectedSite && open))}
                  onConfirm={async () => {
                    if (selectedSite) await disableSite(selectedSite);
                    setSiteDisableConfirmOpen(false);
                  }}
                  onCancel={() => setSiteDisableConfirmOpen(false)}
                >
                  <Button size="small" disabled={!selectedSite}>删除</Button>
                </Popconfirm>
              </Space>
            }
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Row gutter={[10, 10]} className="module-filter-grid">
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('站点名称', (
                    <Input
                      aria-label="站点名称筛选"
                      value={siteFilters.name}
                      onChange={(event) => setSiteFilters((current) => ({ ...current, name: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('状态', (
                    <select
                      aria-label="站点状态筛选"
                      className="native-select"
                      value={siteFilters.status}
                      onChange={(event) => setSiteFilters((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      <option value="ENABLED">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterActions(
                    () => setSiteAppliedFilters(siteFilters),
                    () => {
                      const emptyFilters = { name: '', status: 'ALL' };
                      setSiteFilters(emptyFilters);
                      setSiteAppliedFilters(emptyFilters);
                    }
                  )}
                </Col>
              </Row>
              <Table
                rowKey="id"
                size="small"
                loading={sitesLoading}
                pagination={tenRowTablePagination}
                dataSource={filteredSites}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedSiteId ? [selectedSiteId] : [],
                  onChange: (keys) => setSelectedSiteId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({ onClick: () => setSelectedSiteId(record.id) })}
                columns={[
                  { title: '排序', dataIndex: 'sortOrder', width: 120 },
                  { title: '站点名称', dataIndex: 'name', render: (value: string) => <Text strong>{value}</Text> },
                  { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
                ]}
                scroll={{ x: 560 }}
              />
            </Space>
          </Card>
          ) : null}
          {activeSettingsSection === 'accounts' ? (
          <Card
            className="settings-account-card"
            title={
              <Flex align="center" gap={8}>
                <Users size={18} />
                <span>员工账号管理</span>
              </Flex>
            }
            extra={
              <Space wrap>
                <Button
                  size="small"
                  onClick={() => {
                    setEditingStaffAccount(null);
                    staffCreateForm.resetFields();
                    staffCreateForm.setFieldsValue({ role: 'OPERATOR', gender: 'UNKNOWN', enabled: true });
                    setStaffCreateOpen(true);
                  }}
                >
                  新增
                </Button>
                <Button size="small" onClick={() => void downloadStaffImportTemplate()}>
                  模板下载
                </Button>
                <Button size="small" onClick={() => staffImportInputRef.current?.click()}>
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
                <Button
                  size="small"
                  disabled={!selectedStaffAccount}
                  onClick={() => {
                    if (!selectedStaffAccount) return;
                    setEditingStaffAccount(selectedStaffAccount);
                    staffCreateForm.setFieldsValue({
                      username: selectedStaffAccount.username,
                      name: selectedStaffAccount.name,
                      nickname: selectedStaffAccount.nickname,
                      phone: selectedStaffAccount.phone,
                      gender: selectedStaffAccount.gender ?? 'UNKNOWN',
                      site: selectedStaffAccount.site,
                      enabled: selectedStaffAccount.enabled,
                      role: selectedStaffAccount.role
                    });
                    setStaffCreateOpen(true);
                  }}
                >
                  修改
                </Button>
                <Popconfirm
                  title="确认删除该员工账号？"
                  description="删除会把账号设为离职/停用，不会物理删除历史数据。"
                  okText="确认删除"
                  cancelText="取消"
                  disabled={!selectedStaffAccount}
                  onConfirm={() => selectedStaffAccount ? deleteStaffAccount(selectedStaffAccount.id) : undefined}
                >
                  <Button size="small" danger disabled={!selectedStaffAccount}>
                    删除
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="确认批量重置密码？"
                  description="选中员工的密码会重置为“用户名@123”，后端立即生效，且下次登录必须修改密码。"
                  okText="确认重置"
                  cancelText="取消"
                  disabled={!selectedStaffAccountIds.length}
                  onConfirm={() => resetStaffAccountPasswords(selectedStaffAccountIds)}
                >
                  <Button size="small" disabled={!selectedStaffAccountIds.length}>
                    员工账号重置密码
                  </Button>
                </Popconfirm>
              </Space>
            }
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Flex gap={12} wrap="wrap" align="end">
                {renderFilterField('关键字', (
                  <Input
                    aria-label="员工账号关键字"
                    placeholder="账户 / 中文名 / 业务员"
                    value={staffFilters.keyword}
                    onChange={(event) => setStaffFilters((current) => ({ ...current, keyword: event.target.value }))}
                  />
                ))}
                {renderFilterField('所属站点', (
                  <Select
                    allowClear
                    style={{ minWidth: 160 }}
                    options={enabledSiteOptions}
                    value={staffFilters.site}
                    onChange={(value) => setStaffFilters((current) => ({ ...current, site: value }))}
                    placeholder="全部"
                  />
                ))}
                {renderFilterField('状态', (
                  <select
                    aria-label="员工账号状态"
                    className="native-select"
                    value={staffFilters.status ?? 'ALL'}
                    onChange={(event) => setStaffFilters((current) => ({ ...current, status: event.target.value as StaffAccountQuery['status'] }))}
                  >
                    <option value="ALL">全部</option>
                    <option value="ENABLED">在职</option>
                    <option value="DISABLED">离职</option>
                  </select>
                ))}
                {renderFilterField('所属用户组', (
                  <Select
                    allowClear
                    style={{ minWidth: 180 }}
                    options={staffRoleOptions}
                    value={staffFilters.role}
                    onChange={(value) => setStaffFilters((current) => ({ ...current, role: value }))}
                    placeholder="全部"
                  />
                ))}
                {renderFilterActions(
                  () => setStaffAppliedFilters(staffFilters),
                  () => {
                    const empty: StaffAccountQuery = { status: 'ALL' };
                    setStaffFilters(empty);
                    setStaffAppliedFilters(empty);
                  }
                )}
              </Flex>
            <ManagedTable<StaffAccountSummary>
              rowKey="id"
              size="small"
              className="settings-account-table"
              minimumScrollX={1560}
              scroll={{ y: 'calc(100vh - 540px)' }}
              pagination={tenRowTablePagination}
              dataSource={staffAccounts}
              loading={staffAccountsLoading}
              onRow={(record) => ({ onClick: () => record ? setSelectedStaffAccountIds([record.id]) : undefined })}
              rowSelection={{
                selectedRowKeys: selectedStaffAccountIds,
                onChange: (keys) => setSelectedStaffAccountIds(keys.map(String))
              }}
              columns={[
                { title: '序列', width: 80, render: (_: unknown, __: StaffAccountSummary | undefined, index: number) => index + 1 },
                {
                  title: '业务员',
                  dataIndex: 'nickname',
                  width: 120,
                  render: (value?: string, record?: StaffAccountSummary) => value || record?.name || '-'
                },
                { title: '中文名', dataIndex: 'name', width: 120, render: (value?: string) => value || '-' },
                { title: '账户', dataIndex: 'username', width: 150, render: (value: string) => <Text code>{value}</Text> },
                { title: '密码', width: 130, render: () => <Text type="secondary">已设置</Text> },
                { title: '性别', dataIndex: 'gender', width: 90, render: (value?: StaffGender) => getStaffGenderLabel(value) },
                { title: '所属站点', dataIndex: 'site', width: 140, render: (value?: string) => value || '-' },
                {
                  title: '改密要求',
                  dataIndex: 'mustChangePassword',
                  width: 120,
                  render: (value?: boolean) => <Tag color={value ? 'orange' : 'green'}>{value ? '需改密码' : '正常'}</Tag>
                },
                { title: '状态', dataIndex: 'enabled', width: 110, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '在职' : '离职'}</Tag> },
                {
                  title: '所属用户组',
                  dataIndex: 'roleLabel',
                  width: 150,
                  render: (value: string, record?: StaffAccountSummary) => <Tag color={record?.role === 'ADMIN' ? 'red' : record?.role === 'FINANCE' ? 'gold' : 'blue'}>{value}</Tag>
                },
                { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
                {
                  title: '操作',
                  width: 130,
                  fixed: 'right',
                  render: (_, record?: StaffAccountSummary) => record ? (
                    <Popconfirm
                      title="确认重置密码？"
                      description={`账号 ${record.username} 的密码会重置为 ${record.username}@123，并要求下次登录修改密码。`}
                      okText="确认重置"
                      cancelText="取消"
                      onConfirm={() => resetStaffAccountPasswords([record.id])}
                    >
                      <Button size="small">重置密码</Button>
                    </Popconfirm>
                  ) : null
                }
              ]}
            />
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'rolePermissions' ? (
          <Card className="module-grid" title="角色权限分配">
            {roleMatrix && selectedPermissionRole ? (
              <div className="role-permission-editor">
                <aside className="role-permission-roles" aria-label="角色列表">
                  {rolePermissionRows.map((role) => {
                    const selected = role.key === selectedPermissionRole.key;
                    const permissionCount = (draftPermissions[role.key] ?? role.permissions).length;
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
                        <Tag color={role.key === 'ADMIN' ? 'red' : 'blue'}>{permissionCount}</Tag>
                      </button>
                    );
                  })}
                </aside>
                <section className="role-permission-detail" aria-label={`${selectedPermissionRole.label}权限`}>
                  <Flex justify="space-between" align="center" className="role-permission-detail-header">
                    <Space direction="vertical" size={2}>
                      <Text strong>{selectedPermissionRole.label}</Text>
                      <Text type="secondary">{selectedPermissionRole.description || selectedPermissionRole.scope}</Text>
                    </Space>
                    <Button size="small" disabled={selectedPermissionRole.key === 'ADMIN'} onClick={() => saveRolePermissions(selectedPermissionRole)}>
                      保存{selectedPermissionRole.label.replace('系统管理员', '管理员')}{selectedPermissionRole.systemBuiltin ? '' : '用户组'}权限
                    </Button>
                  </Flex>
                  {selectedPermissionRole.key === 'ADMIN' ? (
                    <Space wrap className="role-permission-admin-tags">
                      {selectedPermissionRole.permissions.map((permission) => (
                        <Tag key={permission} color="red">{roleMatrix.availablePermissions.find((item) => item.code === permission)?.label ?? permission}</Tag>
                      ))}
                    </Space>
                  ) : (
                    <div className="role-permission-groups">
                      {permissionGroups.map(([group, permissions]) => (
                        <div key={group} className="role-permission-group">
                          <Flex justify="space-between" align="center" className="role-permission-group-title">
                            <Text strong>{group}</Text>
                            <Text type="secondary">
                              {permissions.filter((permission) => (draftPermissions[selectedPermissionRole.key] ?? []).includes(permission.code)).length}/{permissions.length}
                            </Text>
                          </Flex>
                          <div className="role-permission-options">
                            {permissions.map((permission) => (
                              <Checkbox
                                key={permission.code}
                                checked={(draftPermissions[selectedPermissionRole.key] ?? []).includes(permission.code)}
                                onChange={(event) => toggleRolePermission(selectedPermissionRole.key, permission.code, event.target.checked)}
                              >
                                {permission.label}
                              </Checkbox>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <Table rowKey="key" size="small" pagination={false} dataSource={[]} loading />
            )}
          </Card>
          ) : null}
        </Col>

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
              <Alert type="success" showIcon message="所有 AI 调用统一走后端 /api/ai/assist" />
              <Alert type="warning" showIcon message="SILICONFLOW_API_KEY 只读取环境变量，不写入前端代码" />
            </Space>
          </Card>
          ) : null}

          {activeSettingsSection === 'audit' ? (
          <Card
            className="automation-card"
            title="操作日志"
            extra={
              <Space>
                <Button onClick={() => setAuditAppliedFilters({ ...auditAppliedFilters })}>刷新</Button>
                <Button type="primary" icon={<FileInput size={16} />} disabled={!auditLogs.length} onClick={() => void exportAuditLogs()}>
                  导出 Excel
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" size={14} className="quality-panel">
              <Row gutter={[10, 10]} className="module-filter-grid">
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
                  {renderFilterField('结果', (
                    <Select
                      allowClear
                      value={auditDraftFilters.result}
                      placeholder="选择结果"
                      options={[
                        { label: '成功', value: 'SUCCESS' },
                        { label: '失败', value: 'FAILED' }
                      ]}
                      onChange={(value) => setAuditDraftFilters((current) => ({ ...current, result: value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={12} lg={8} xl={6}>
                  {renderFilterField('开始时间', (
                    <Input
                      type="datetime-local"
                      value={auditDraftFilters.startedAt}
                      onChange={(event) => setAuditDraftFilters((current) => ({ ...current, startedAt: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={12} lg={8} xl={6}>
                  {renderFilterField('结束时间', (
                    <Input
                      type="datetime-local"
                      value={auditDraftFilters.endedAt}
                      onChange={(event) => setAuditDraftFilters((current) => ({ ...current, endedAt: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={12} lg={8} xl={6}>
                  {renderFilterActions(
                    () => {
                      setAuditPagination((current) => ({ ...current, page: 1 }));
                      setAuditAppliedFilters({ ...auditDraftFilters });
                    },
                    () => {
                      setAuditDraftFilters({});
                      setAuditPagination((current) => ({ ...current, page: 1 }));
                      setAuditAppliedFilters({});
                    }
                  )}
                </Col>
              </Row>

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

              <Table
                rowKey="id"
                size="small"
                loading={auditLoading}
                dataSource={auditLogs}
                pagination={{
                  current: auditPagination.page,
                  pageSize: auditPagination.pageSize,
                  total: auditPagination.totalItems,
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条`
                }}
                onChange={(pagination) => setAuditPagination((current) => ({
                  ...current,
                  page: pagination.current ?? current.page,
                  pageSize: pagination.pageSize ?? current.pageSize
                }))}
                columns={[
                  { title: '时间', dataIndex: 'createdAt', width: 170, render: (value: string) => formatBeijingDateTime(value) },
                  { title: '操作人', dataIndex: 'actorUsername', width: 130 },
                  {
                    title: '模块',
                    dataIndex: 'moduleLabel',
                    width: 130,
                    render: (value: string) => <Tag color="blue">{value}</Tag>
                  },
                  {
                    title: '操作动作',
                    dataIndex: 'actionLabel',
                    width: 160,
                    render: (value: string, row: AuditLogSummary) => (
                      <Space direction="vertical" size={0}>
                        <Text strong>{value}</Text>
                        <Text type="secondary">{row.result === 'SUCCESS' ? '已完成' : '未完成'}</Text>
                      </Space>
                    )
                  },
                  {
                    title: '操作对象',
                    dataIndex: 'target',
                    width: 260,
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
                    title: '执行结果',
                    dataIndex: 'resultLabel',
                    width: 100,
                    render: (value: string, row: AuditLogSummary) => <Tag color={row.result === 'SUCCESS' ? 'green' : 'red'}>{value}</Tag>
                  },
                  {
                    title: '审计说明',
                    dataIndex: 'summary',
                    width: 360,
                    render: (_value: unknown, row: AuditLogSummary) => (
                      <Text type="secondary">{summarizeAuditChange(row)}</Text>
                    )
                  },
                  {
                    title: '原始日志',
                    width: 120,
                    render: (_value: unknown, row: AuditLogSummary) => (
                      <Button size="small" icon={<FileText size={14} />} onClick={() => setAuditRawViewingLog(row)}>
                        查看
                      </Button>
                    )
                  }
                ]}
                scroll={{ x: 1350 }}
              />
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
                <Input placeholder="例如 深圳思远" />
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
          {!editingRoleGroup ? (
            <Form.Item name="templateRole" label="初始权限模板" initialValue="OPERATOR">
              <Select options={templateRoleOptions} />
            </Form.Item>
          ) : null}
        </Form>
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
                <Form.Item name="nickname" label="业务员" rules={[{ max: 40, message: '业务员最多 40 个字符' }]}>
                  <Input placeholder="例如 张三" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="name" label="中文名" rules={[{ max: 40, message: '中文名最多 40 个字符' }]}>
                  <Input placeholder="例如 张三" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="password"
                  label="密码"
                  extra={editingStaffAccount ? '不填则不修改密码。' : '不填则使用“账户@123”。'}
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
                  <Select allowClear options={enabledSiteOptions} placeholder="请选择站点" />
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
      <Modal
        className="audit-raw-log-modal"
        title="原始日志查看"
        open={Boolean(auditRawViewingLog)}
        width={860}
        footer={<Button onClick={() => setAuditRawViewingLog(null)}>关闭</Button>}
        onCancel={() => setAuditRawViewingLog(null)}
      >
        <Text type="secondary">以下为系统保存的原始审计内容，保留技术字段与完整 JSON，便于排查和导出核对。</Text>
        <pre className="audit-raw-log-content">{auditRawViewingLog ? buildAuditRawLog(auditRawViewingLog) : ''}</pre>
      </Modal>
    </AppPage>
  );
}
