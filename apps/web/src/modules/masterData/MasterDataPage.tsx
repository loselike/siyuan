import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { AlertTriangle, Bot, Building2, CheckCircle, Download, Edit, FileText, Plus, Power, Route, Settings, Sparkles, Trash2, Upload as UploadIcon, UserRound, Users } from 'lucide-react';
import { Alert, Button, Card, Checkbox, Col, Flex, Form, Input, Modal, Popconfirm, Row, Space, Statistic, Table, Tag, Typography, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { businessTypeLabels, summarizeMasterDataSnapshot, type AgentBankAccountSummary, type AgentChannelSummary, type AgentIntegrationType, type AgentSummary, type AuditLogSummary, type BusinessType, type ChannelCategorySummary, type ChannelSummary, type CustomerContactSummary, type CustomerSummary, type ExchangeRateSummary, type MasterDataSnapshot, type Shipment } from '@siyuan/shared';
import { ApiClient, type PermissionKey, type Principal, type RoleKey } from '../../apiClient';
import { FinanceCatalogPage } from '../finance/FinanceCatalogPage';
import { useFinanceCatalog } from '../finance/useFinanceCatalog';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { AppActionGroup, AppPage, AppPageHeader, MetricCard, renderFilterActions, renderFilterField, renderNoticeBar, tenRowTablePagination } from '../shared/ui';

const { Title, Text } = Typography;

interface MasterCustomerFormValues {
  customerCode: string;
  customerShortName: string;
  customerFullName: string;
  customerType: string;
  customerSource: string;
  salesperson: string;
  defaultSettlementMethod: string;
  customerEnabled: 'true' | 'false';
}

interface MasterCustomerContactFormValues {
  receiverName: string;
  receiverCompany?: string;
  receiverPhone?: string;
  receiverEmail?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  receiverState?: string;
  receiverPostalCode?: string;
}

interface MasterAgentFormValues {
  agentCode: string;
  agentShortName: string;
  agentName: string;
  warehouseAddress1: string;
  warehouseAddress2: string;
  warehouseAddress3: string;
  warehouseContact: string;
  invoiceTemplateName: string;
  invoiceTemplateUrl: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankName: string;
  agentIntegrationType: AgentIntegrationType;
  agentEnabled: 'true' | 'false';
}

interface MasterAgentChannelFormValues {
  agentId: string;
  channelName: string;
  enabled: 'true' | 'false';
}

interface MasterCompanyChannelFormValues {
  name: string;
  carrierId: string;
  carrierName: string;
  businessType: BusinessType;
  category: string;
  volumeDivisor: string;
  multiPieceWeightRule: string;
  singleWeightRoundingRule: string;
  settlementWeightRule: string;
  settlementWeightRoundingRule: string;
  largeCargoThresholdKg: string;
  remoteAreaRule: string;
  enabled: 'true' | 'false';
}

interface MasterChannelCategoryFormValues {
  name: string;
  enabled: 'true' | 'false';
}

interface MasterExchangeRateFormValues {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  activeAt: string;
  endAt: string;
}

type RemoteAreaAttachment = {
  id: string;
  rule: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  source: 'upload' | 'paste';
  uploadedAt: string;
};

const agentIntegrationLabels: Record<AgentIntegrationType, string> = {
  MANUAL: '手工',
  API: 'API 对接',
  PLATFORM: '平台对接',
  OTHER: '其他'
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function isRemoteAreaFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type.startsWith('image/') || ['.xls', '.xlsx', '.csv'].some((suffix) => name.endsWith(suffix));
}

function formatFileSize(sizeBytes: number) {
  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
}

const multiPieceWeightRuleOptions = [
  { value: 'SUM_THEN_COMPARE', label: '先累加再比较' },
  { value: 'COMPARE_ROUND_THEN_SUM', label: '先比较进位再累加' },
  { value: 'COMPARE_THEN_SUM', label: '先比较再累加' },
  { value: 'SUM_THEN_COMPARE_ROUND', label: '先累加再比较进位' }
];
const singleWeightRoundingRuleOptions = [
  { value: 'ACTUAL', label: '按实际' },
  { value: 'HALF_BELOW_HALF_UP', label: '0.5以下进0.5；0.5以上进1' },
  { value: 'CEIL', label: '超0进1' }
];
const settlementWeightRuleOptions = [
  { value: 'MAX_ACTUAL_VOLUME', label: '取实重材积大值' },
  { value: 'ACTUAL_ONLY', label: '取实重不计材积' }
];
const settlementWeightRoundingRuleOptions = [
  { value: 'LARGE_1_SMALL_0_5', label: '大货进1小货进0.5' },
  { value: 'NONE', label: '不进位' },
  { value: 'LARGE_0_1_SMALL_NONE', label: '大货进0.1小货不进位' },
  { value: 'MIN_HALF', label: '不足0.5的按0.5算' }
];
const remoteAreaRuleOptions = ['DHL偏远', 'UPS偏远', 'FEDEX偏远', '无偏远'];
const optionLabel = (options: Array<{ value: string; label: string }>, value?: string) => options.find((item) => item.value === value)?.label ?? value ?? '-';
const currencyNames: Record<string, string> = { USD: '美金', RMB: '人民币', CNY: '人民币', EUR: '欧元', GBP: '英镑', HKD: '港币' };
const currencyName = (code: string) => currencyNames[code.toUpperCase()] ?? code.toUpperCase();
const todayDate = () => new Date().toISOString().slice(0, 10);
export function MasterDataPage({
  apiClient,
  masterData,
  permissions,
  currentUser,
  notice,
  onMasterDataChange,
  onNotice,
  onAiAssist,
  aiLoading,
  shipments = []
}: {
  apiClient: ApiClient;
  masterData: MasterDataSnapshot;
  permissions: PermissionKey[];
  currentUser: Principal;
  notice: string | null;
  onMasterDataChange: (updater: (current: MasterDataSnapshot) => MasterDataSnapshot) => void;
  onNotice: (message: string) => void;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
  shipments?: Shipment[];
}) {
  const summary = summarizeMasterDataSnapshot(masterData);
  const currentSalesperson = currentUser.username;
  const [masterCustomerForm] = Form.useForm<MasterCustomerFormValues>();
  const [masterCustomerContactForm] = Form.useForm<MasterCustomerContactFormValues>();
  const [masterAgentForm] = Form.useForm<MasterAgentFormValues>();
  const [masterAgentChannelForm] = Form.useForm<MasterAgentChannelFormValues>();
  const [masterCompanyChannelForm] = Form.useForm<MasterCompanyChannelFormValues>();
  const [masterChannelCategoryForm] = Form.useForm<MasterChannelCategoryFormValues>();
  const [masterExchangeRateForm] = Form.useForm<MasterExchangeRateFormValues>();
  const [masterCustomerOpen, setMasterCustomerOpen] = useState(false);
  const [masterAgentOpen, setMasterAgentOpen] = useState(false);
  const [masterAgentChannelOpen, setMasterAgentChannelOpen] = useState(false);
  const [masterCompanyChannelOpen, setMasterCompanyChannelOpen] = useState(false);
  const [masterChannelCategoryOpen, setMasterChannelCategoryOpen] = useState(false);
  const [masterCustomerContactOpen, setMasterCustomerContactOpen] = useState(false);
  const [editingMasterCustomer, setEditingMasterCustomer] = useState<CustomerSummary | null>(null);
  const [editingMasterCustomerContact, setEditingMasterCustomerContact] = useState<CustomerContactSummary | null>(null);
  const [editingMasterAgent, setEditingMasterAgent] = useState<AgentSummary | null>(null);
  const [editingMasterAgentChannel, setEditingMasterAgentChannel] = useState<AgentChannelSummary | null>(null);
  const [editingMasterCompanyChannel, setEditingMasterCompanyChannel] = useState<ChannelSummary | null>(null);
  const [editingMasterChannelCategory, setEditingMasterChannelCategory] = useState<ChannelCategorySummary | null>(null);
  const [customerFilters, setCustomerFilters] = useState({
    name: '',
    code: '',
    status: 'ALL',
    customerType: 'ALL',
    customerSource: '',
    salesperson: ''
  });
  const [appliedCustomerFilters, setAppliedCustomerFilters] = useState(customerFilters);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerAuditLogs, setCustomerAuditLogs] = useState<AuditLogSummary[]>([]);
  const [customerListSettingOpen, setCustomerListSettingOpen] = useState(false);
  const [customerDisableConfirmOpen, setCustomerDisableConfirmOpen] = useState(false);
  const [showCustomerStatus, setShowCustomerStatus] = useState(true);
  const [showCustomerType, setShowCustomerType] = useState(true);
  const [agentFilters, setAgentFilters] = useState({
    name: '',
    code: '',
    status: 'ALL',
    integrationType: 'ALL'
  });
  const [appliedAgentFilters, setAppliedAgentFilters] = useState(agentFilters);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentListSettingOpen, setAgentListSettingOpen] = useState(false);
  const [agentDisableConfirmOpen, setAgentDisableConfirmOpen] = useState(false);
  const [showAgentStatus, setShowAgentStatus] = useState(true);
  const [showAgentIntegrationType, setShowAgentIntegrationType] = useState(true);
  const [agentChannelFilters, setAgentChannelFilters] = useState({ agentId: 'ALL', channelName: '', status: 'ALL' });
  const [appliedAgentChannelFilters, setAppliedAgentChannelFilters] = useState(agentChannelFilters);
  const [selectedAgentChannelId, setSelectedAgentChannelId] = useState<string | null>(null);
  const [agentChannelDisableConfirmOpen, setAgentChannelDisableConfirmOpen] = useState(false);
  const [companyChannelFilters, setCompanyChannelFilters] = useState({ keyword: '', businessType: 'ALL', category: 'ALL', status: 'ALL' });
  const [appliedCompanyChannelFilters, setAppliedCompanyChannelFilters] = useState(companyChannelFilters);
  const [selectedCompanyChannelId, setSelectedCompanyChannelId] = useState<string | null>(null);
  const [companyChannelDisableConfirmOpen, setCompanyChannelDisableConfirmOpen] = useState(false);
  const [channelCategoryFilters, setChannelCategoryFilters] = useState({ name: '', status: 'ALL' });
  const [appliedChannelCategoryFilters, setAppliedChannelCategoryFilters] = useState(channelCategoryFilters);
  const [selectedChannelCategoryId, setSelectedChannelCategoryId] = useState<string | null>(null);
  const [channelCategoryDisableConfirmOpen, setChannelCategoryDisableConfirmOpen] = useState(false);
  const [editingMasterExchangeRate, setEditingMasterExchangeRate] = useState<ExchangeRateSummary | null>(null);
  const [activeMasterSection, setActiveMasterSection] = useState('financeCatalog');
  const financeCatalog = useFinanceCatalog(apiClient);
  const hasMasterPermission = (...keys: PermissionKey[]) => currentUser.role === 'ADMIN' || keys.some((key) => permissions.includes(key));
  const canReadCustomers = hasMasterPermission('master-data:read', 'master-data:customers:read');
  const canWriteCustomers = hasMasterPermission('master-data:write', 'master-data:customers:write');
  const canReadFinanceCatalog = hasMasterPermission('master-data:read', 'master-data:finance:read', 'finance:read');
  const canWriteFinanceCatalog = hasMasterPermission('master-data:write', 'master-data:finance:write', 'finance:settle');
  const canReadAgents = hasMasterPermission('master-data:agents:read');
  const canWriteAgents = hasMasterPermission('master-data:agents:write');
  const canReadAgentChannels = hasMasterPermission('master-data:agents:read', 'master-data:agent-channels:read');
  const canWriteAgentChannels = hasMasterPermission('master-data:agents:write', 'master-data:agent-channels:write');
  const canReadChannels = hasMasterPermission('master-data:channels:read');
  const canWriteChannels = hasMasterPermission('master-data:channels:write');
  const canReadChannelCategories = hasMasterPermission('master-data:channels:read', 'master-data:channel-categories:read');
  const canWriteChannelCategories = hasMasterPermission('master-data:channels:write', 'master-data:channel-categories:write');
  const canReadRemoteAreas = hasMasterPermission('master-data:read', 'master-data:remote-areas:read');
  const canWriteRemoteAreas = hasMasterPermission('master-data:write', 'master-data:remote-areas:write');
  const canReadExchangeRates = hasMasterPermission('master-data:read', 'master-data:exchange-rates:read');
  const canWriteExchangeRates = hasMasterPermission('master-data:write', 'master-data:exchange-rates:write');
  const canReadAssistant = hasMasterPermission('master-data:read', 'master-data:assistant:read');
  const canReadAgentBanks = permissions.includes('finance:payable:bank');
  const [agentBankAccounts, setAgentBankAccounts] = useState<AgentBankAccountSummary[]>([]);
  const [remoteAreaFiles, setRemoteAreaFiles] = useState<RemoteAreaAttachment[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem('siyuan.master.remoteAreaFiles') ?? '[]') as RemoteAreaAttachment[];
    } catch {
      return [];
    }
  });
  const masterSubItems: ModuleSubNavItem[] = [
    ...(canReadCustomers ? [{ key: 'customers', label: '客户资料', description: '客户编码、简称、全称' }] : []),
    ...(canReadFinanceCatalog ? [{ key: 'financeCatalog', label: '财务资料', description: '费用、结算、货物、品名' }] : []),
    ...(canReadAgents ? [
      { key: 'agents', label: '代理资料', description: '代理编码、简称、详细公司名' },
    ] : []),
    ...(canReadAgentChannels ? [
      { key: 'agentChannels', label: '代理渠道', description: '代理与渠道名称' }
    ] : []),
    ...(canReadChannels ? [
      { key: 'companyChannels', label: '公司渠道', description: '公司渠道维护' },
    ] : []),
    ...(canReadChannelCategories ? [
      { key: 'channelCategories', label: '渠道类别', description: '渠道分类' }
    ] : []),
    ...(canReadRemoteAreas ? [{ key: 'remoteAreas', label: '偏远', description: '偏远规则' }] : []),
    ...(canReadExchangeRates ? [{ key: 'exchangeRates', label: '汇率', description: '币种汇率' }] : []),
    ...(canReadAssistant ? [{ key: 'assistant', label: '资料辅助', description: '体检与快捷维护' }] : [])
  ];
  useEffect(() => {
    if (masterSubItems.length && !masterSubItems.some((item) => item.key === activeMasterSection)) {
      setActiveMasterSection(masterSubItems[0].key);
    }
  }, [activeMasterSection, masterSubItems]);
  useEffect(() => {
    if (activeMasterSection !== 'customers' || !canReadCustomers) return;
    let cancelled = false;
    apiClient.customers()
      .then((customers) => {
        if (!cancelled) onMasterDataChange((current) => ({ ...current, customers }));
      })
      .catch(() => {
        if (!cancelled) onNotice('客户资料刷新失败');
      });
    return () => {
      cancelled = true;
    };
  }, [activeMasterSection, apiClient, canReadCustomers, onMasterDataChange, onNotice]);
  const customerRows = masterData.customers.map((customer) => ({
    ...customer,
    shortName: customer.shortName ?? customer.name,
    fullName: customer.fullName ?? `${customer.name} Co., Ltd.`,
    customerType: customer.customerType ?? '直客',
    customerSource: customer.customerSource ?? '',
    salesperson: customer.salesperson || '未分配',
    defaultSettlementMethod: customer.defaultSettlementMethod ?? ''
  }));
  const filteredCustomerRows = customerRows.filter((customer) => {
    const nameKeyword = appliedCustomerFilters.name.trim().toLowerCase();
    const codeKeyword = appliedCustomerFilters.code.trim().toLowerCase();
    const salespersonKeyword = appliedCustomerFilters.salesperson.trim().toLowerCase();
    const sourceKeyword = appliedCustomerFilters.customerSource.trim().toLowerCase();
    const matchesName = !nameKeyword || `${customer.code} ${customer.shortName} ${customer.fullName}`.toLowerCase().includes(nameKeyword);
    const matchesCode = !codeKeyword || customer.code.toLowerCase().includes(codeKeyword);
    const matchesSalesperson = !salespersonKeyword || customer.salesperson.toLowerCase().includes(salespersonKeyword);
    const matchesSource = !sourceKeyword || customer.customerSource.toLowerCase().includes(sourceKeyword);
    const matchesStatus =
      appliedCustomerFilters.status === 'ALL' ||
      (appliedCustomerFilters.status === 'ENABLED' ? customer.enabled : !customer.enabled);
    const matchesType = appliedCustomerFilters.customerType === 'ALL' || customer.customerType === appliedCustomerFilters.customerType;
    return matchesName && matchesCode && matchesSalesperson && matchesSource && matchesStatus && matchesType;
  });
  const selectedCustomer = customerRows.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedCustomerContacts = selectedCustomer
    ? masterData.contacts.filter((contact) => contact.customerId === selectedCustomer.id && contact.enabled)
    : [];
  const customerMetrics = {
    total: customerRows.length,
    enabled: customerRows.filter((customer) => customer.enabled).length,
    missingSettlement: customerRows.filter((customer) => !customer.defaultSettlementMethod).length,
    contacts: masterData.contacts.filter((contact) => contact.enabled).length
  };
  const customerTypeOptions = Array.from(new Set(customerRows.map((customer) => customer.customerType).filter(Boolean)));
  const salespersonOptions = Array.from(new Set(customerRows.map((customer) => customer.salesperson).filter(Boolean)));
  const customerContactsById = new Map(customerRows.map((customer) => [
    customer.id,
    masterData.contacts.filter((contact) => contact.customerId === customer.id && contact.enabled)
  ]));
  const latestShipmentByCustomerId = useMemo(() => {
    const latest = new Map<string, Shipment>();
    shipments.forEach((shipment) => {
      const key = customerRows.find((customer) => shipment.customerCode === customer.code || shipment.customerName?.startsWith(`${customer.code}-`))?.id;
      if (!key) return;
      const previous = latest.get(key);
      const nextTime = Date.parse(shipment.createdAt ?? shipment.entryAt ?? '');
      const previousTime = previous ? Date.parse(previous.createdAt ?? previous.entryAt ?? '') : 0;
      if (!previous || nextTime >= previousTime) latest.set(key, shipment);
    });
    return latest;
  }, [customerRows, shipments]);
  useEffect(() => {
    if (activeMasterSection !== 'customers') return;
    if (!filteredCustomerRows.length) {
      setSelectedCustomerId(null);
      return;
    }
    if (!selectedCustomerId || !filteredCustomerRows.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(filteredCustomerRows[0].id);
    }
  }, [activeMasterSection, filteredCustomerRows, selectedCustomerId]);
  useEffect(() => {
    if (activeMasterSection !== 'customers' || !selectedCustomerId) {
      setCustomerAuditLogs([]);
      return;
    }
    let cancelled = false;
    apiClient.auditLogs({ target: selectedCustomerId, pageSize: 3 })
      .then((response) => {
        if (!cancelled) setCustomerAuditLogs(response.rows);
      })
      .catch(() => {
        if (!cancelled) setCustomerAuditLogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMasterSection, apiClient, selectedCustomerId]);
  const customerColumns: ColumnsType<(typeof customerRows)[number]> = [
    { title: '客户编码', dataIndex: 'code', width: 110, render: (value: string) => <Text strong>{value}</Text> },
    {
      title: '客户信息',
      dataIndex: 'shortName',
      width: 180,
      render: (_value: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.shortName}</Text>
          <Text type="secondary">{record.fullName}</Text>
          {record.customerSource ? <Text type="secondary">{record.customerSource}</Text> : null}
        </Space>
      )
    },
    ...(showCustomerType
      ? [
          {
            title: '客户类型',
            dataIndex: 'customerType',
            width: 95,
            render: (value: string) => <Tag color="blue">{value}</Tag>
          }
        ]
      : []),
    { title: '结算信息', dataIndex: 'defaultSettlementMethod', width: 120, render: (value: string) => value ? <Tag color="green">{value}</Tag> : <Tag color="orange">缺失</Tag> },
    { title: '业务员', dataIndex: 'salesperson', width: 110 },
    { title: '收货人', width: 90, render: (_value, record) => customerContactsById.get(record.id)?.length ?? 0 },
    { title: '最近下单', width: 120, render: (_value, record) => latestShipmentByCustomerId.get(record.id)?.createdAt?.slice(0, 10) ?? '-' },
    ...(showCustomerStatus
      ? [
          {
            title: '状态',
            dataIndex: 'enabled',
            width: 90,
            render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
          }
        ]
      : []),
    {
      title: '操作',
      width: 230,
      fixed: 'right',
      render: (_value, record) => (
        <Space size={6}>
          <Button size="small" type="link" onClick={(event) => { event.stopPropagation(); setSelectedCustomerId(record.id); }}>详情</Button>
          <Button size="small" type="link" disabled={!canWriteCustomers} onClick={(event) => { event.stopPropagation(); void handleEditMasterCustomer(record); }}>编辑</Button>
          <Popconfirm
            title={`确认${record.enabled ? '停用' : '启用'}该客户？`}
            okText={`确认${record.enabled ? '停用' : '启用'}`}
            cancelText="取消"
            okButtonProps={{ danger: record.enabled }}
            disabled={!canWriteCustomers}
            onConfirm={() => record.enabled ? handleDisableMasterCustomer(record) : handleEnableMasterCustomer(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger={record.enabled} disabled={!canWriteCustomers} onClick={(event) => event.stopPropagation()}>
              {record.enabled ? '停用' : '启用'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title="删除客户资料"
            description="删除后不可恢复，请确认该客户无未完成运单、费用或收款记录。"
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={!canWriteCustomers}
            onConfirm={() => handleDeleteMasterCustomer(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger disabled={!canWriteCustomers} onClick={(event) => event.stopPropagation()}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
  const customerContactColumns: ColumnsType<CustomerContactSummary> = [
    { title: '收货人', dataIndex: 'name', width: 130, render: (value: string) => <Text strong>{value}</Text> },
    { title: '公司', dataIndex: 'company', width: 150, render: (value?: string) => value || '-' },
    { title: '电话', dataIndex: 'phone', width: 140, render: (value?: string) => value || '-' },
    { title: '邮箱', dataIndex: 'email', width: 170, render: (value?: string) => value || '-' },
    { title: '地址', dataIndex: 'address', render: (value?: string) => value || '-' },
    { title: '国家', dataIndex: 'country', width: 90, render: (value?: string) => value || '-' },
    { title: '州/省', dataIndex: 'state', width: 90, render: (value?: string) => value || '-' },
    { title: '邮编', dataIndex: 'postalCode', width: 100, render: (value?: string) => value || '-' },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_value, record) => (
        <Space size={4}>
          <Button size="small" type="link" disabled={!canWriteCustomers} onClick={() => handleEditMasterCustomerContact(record)}>
            修改
          </Button>
          <Popconfirm
            title="确认停用该收货人？"
            okText="确认停用"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={!canWriteCustomers}
            onConfirm={() => void handleDisableMasterCustomerContact(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger disabled={!canWriteCustomers}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
  const agentRows = masterData.agents.map((agent) => ({
    ...agent,
    code: agent.code ?? agent.name.toUpperCase().slice(0, 6),
    shortName: agent.shortName ?? agent.name,
    integrationType: agent.integrationType ?? 'MANUAL'
  }));
  const filteredAgentRows = agentRows.filter((agent) => {
    const nameKeyword = appliedAgentFilters.name.trim().toLowerCase();
    const codeKeyword = appliedAgentFilters.code.trim().toLowerCase();
    const matchesName = !nameKeyword || `${agent.shortName} ${agent.name}`.toLowerCase().includes(nameKeyword);
    const matchesCode = !codeKeyword || agent.code.toLowerCase().includes(codeKeyword);
    const matchesStatus =
      appliedAgentFilters.status === 'ALL' ||
      (appliedAgentFilters.status === 'ENABLED' ? agent.enabled : !agent.enabled);
    const matchesType = appliedAgentFilters.integrationType === 'ALL' || agent.integrationType === appliedAgentFilters.integrationType;
    return matchesName && matchesCode && matchesStatus && matchesType;
  });
  const selectedAgent = agentRows.find((agent) => agent.id === selectedAgentId) ?? null;
  const agentColumns: ColumnsType<(typeof agentRows)[number]> = [
    { title: '代理编码', dataIndex: 'code', width: 140, render: (value: string) => <Text strong>{value}</Text> },
    { title: '代理简称', dataIndex: 'shortName', width: 180, render: (value: string) => <Text strong>{value}</Text> },
    { title: '代理详细公司名', dataIndex: 'name', width: 220 },
    { title: '仓库地址一', dataIndex: 'warehouseAddress1', width: 220, render: (value?: string) => value || '-' },
    { title: '仓库地址二', dataIndex: 'warehouseAddress2', width: 220, render: (value?: string) => value || '-' },
    { title: '仓库地址三', dataIndex: 'warehouseAddress3', width: 220, render: (value?: string) => value || '-' },
    { title: '仓库联系人', dataIndex: 'warehouseContact', width: 140, render: (value?: string) => value || '-' },
    {
      title: '发票模板',
      dataIndex: 'invoiceTemplateName',
      width: 180,
      render: (value: string | undefined, record) =>
        record.invoiceTemplateUrl ? <a href={record.invoiceTemplateUrl} target="_blank" rel="noreferrer">{value || '查看模板'}</a> : value || '-'
    },
    ...(showAgentStatus
      ? [
          {
            title: '状态',
            dataIndex: 'enabled',
            width: 90,
            render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
          }
        ]
      : []),
    ...(showAgentIntegrationType
      ? [
          {
            title: '对接类型',
            dataIndex: 'integrationType',
            width: 130,
            render: (value: AgentIntegrationType) => <Tag>{agentIntegrationLabels[value]}</Tag>
          }
        ]
      : [])
  ];
  useEffect(() => {
    if (!canReadAgentBanks) {
      setAgentBankAccounts([]);
      return;
    }
    let alive = true;
    apiClient.agentBankAccounts().then((rows) => {
      if (alive) setAgentBankAccounts(rows);
    }).catch(() => {
      if (alive) setAgentBankAccounts([]);
    });
    return () => {
      alive = false;
    };
  }, [apiClient, canReadAgentBanks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('siyuan.master.remoteAreaFiles', JSON.stringify(remoteAreaFiles));
  }, [remoteAreaFiles]);

  async function handleRemoteAreaFile(rule: string, file: File, source: RemoteAreaAttachment['source']) {
    if (!canWriteRemoteAreas) return;
    if (!isRemoteAreaFile(file)) {
      onNotice?.('仅支持 xls、xlsx、csv 或图片');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onNotice?.('文件不能超过 10MB');
      return;
    }
    const url = await readFileAsDataUrl(file);
    const item: RemoteAreaAttachment = {
      id: `${Date.now()}-${file.name}`,
      rule,
      fileName: file.name || '偏远资料',
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      url,
      source,
      uploadedAt: new Date().toISOString()
    };
    setRemoteAreaFiles((current) => [item, ...current.filter((existing) => !(existing.rule === rule && existing.fileName === item.fileName))]);
    onNotice?.(`${rule} 已上传 ${item.fileName}`);
  }

  function handleRemoteAreaPaste(rule: string, event: ClipboardEvent<HTMLElement>) {
    const file = Array.from(event.clipboardData.files).find(isRemoteAreaFile);
    if (!file) return;
    event.preventDefault();
    void handleRemoteAreaFile(rule, file, 'paste');
  }

  const agentChannelRows = masterData.agentChannels.map((channel) => ({
    ...channel,
    agentName: channel.agentName || agentRows.find((agent) => agent.id === channel.agentId)?.shortName || channel.agentId
  }));
  const filteredAgentChannelRows = agentChannelRows.filter((channel) => {
    const nameKeyword = appliedAgentChannelFilters.channelName.trim().toLowerCase();
    const matchesAgent = appliedAgentChannelFilters.agentId === 'ALL' || channel.agentId === appliedAgentChannelFilters.agentId;
    const matchesName = !nameKeyword || channel.channelName.toLowerCase().includes(nameKeyword);
    const matchesStatus =
      appliedAgentChannelFilters.status === 'ALL' ||
      (appliedAgentChannelFilters.status === 'ENABLED' ? channel.enabled : !channel.enabled);
    return matchesAgent && matchesName && matchesStatus;
  });
  const selectedAgentChannel = agentChannelRows.find((channel) => channel.id === selectedAgentChannelId) ?? null;
  const agentChannelColumns: ColumnsType<(typeof agentChannelRows)[number]> = [
    { title: '代理', dataIndex: 'agentName', width: 220, render: (value: string) => <Text strong>{value}</Text> },
    { title: '渠道名称', dataIndex: 'channelName' },
    { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
  ];
  const companyChannelRows = masterData.channels.map((channel) => ({
    ...channel,
    businessType: channel.businessType ?? 'EXPRESS',
    category: channel.category ?? channel.carrierName,
    volumeDivisor: channel.volumeDivisor ?? 5000,
    multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
    singleWeightRoundingRule: channel.singleWeightRoundingRule ?? 'ACTUAL',
    settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
    settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? 'NONE',
    remoteAreaRule: channel.remoteAreaRule ?? 'NONE'
  }));
  const filteredCompanyChannelRows = companyChannelRows.filter((channel) => {
    const keyword = appliedCompanyChannelFilters.keyword.trim().toLowerCase();
    const matchesKeyword = !keyword || [channel.name, channel.carrierName, channel.category, channel.remoteAreaRule].some((value) => (value ?? '').toLowerCase().includes(keyword));
    const matchesBusinessType = appliedCompanyChannelFilters.businessType === 'ALL' || channel.businessType === appliedCompanyChannelFilters.businessType;
    const matchesCategory = appliedCompanyChannelFilters.category === 'ALL' || channel.category === appliedCompanyChannelFilters.category;
    const matchesStatus =
      appliedCompanyChannelFilters.status === 'ALL' ||
      (appliedCompanyChannelFilters.status === 'ENABLED' ? channel.enabled : !channel.enabled);
    return matchesKeyword && matchesBusinessType && matchesCategory && matchesStatus;
  });
  const selectedCompanyChannel = companyChannelRows.find((channel) => channel.id === selectedCompanyChannelId) ?? null;
  const enabledCompanyChannelCategoryOptions = masterData.channelCategories.filter((category) => category.enabled).map((category) => category.name);
  const companyChannelCategoryFilterOptions = Array.from(new Set([...enabledCompanyChannelCategoryOptions, ...companyChannelRows.map((channel) => channel.category)].filter(Boolean)));
  const companyChannelCategoryFormOptions = Array.from(new Set([...enabledCompanyChannelCategoryOptions, editingMasterCompanyChannel?.category].filter(Boolean)));
  const companyChannelColumns: ColumnsType<(typeof companyChannelRows)[number]> = [
    { title: '业务类型', dataIndex: 'businessType', width: 110, render: (value: BusinessType) => <Tag>{businessTypeLabels[value] ?? value}</Tag> },
    { title: '渠道类别', dataIndex: 'category', width: 120 },
    { title: '渠道名称', dataIndex: 'name', width: 180, render: (value: string) => <Text strong>{value}</Text> },
    { title: '承运商', dataIndex: 'carrierName', width: 120 },
    { title: '除材积', dataIndex: 'volumeDivisor', width: 90 },
    { title: '多件重量计算方式', dataIndex: 'multiPieceWeightRule', width: 170, render: (value: string) => optionLabel(multiPieceWeightRuleOptions, value) },
    { title: '结算重量计算规则', dataIndex: 'settlementWeightRule', width: 160, render: (value: string) => optionLabel(settlementWeightRuleOptions, value) },
    { title: '大货起始重量', dataIndex: 'largeCargoThresholdKg', width: 130, render: (value?: number) => value ? `${value} KG` : '-' },
    { title: '偏远', dataIndex: 'remoteAreaRule', width: 130, render: (value: string) => value === 'NONE' ? '无偏远' : value },
    { title: '状态', dataIndex: 'enabled', width: 90, fixed: 'right', render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
  ];
  const remoteAreaRows = Array.from(new Map(
    companyChannelRows
      .filter((channel) => channel.remoteAreaRule && channel.remoteAreaRule !== 'NONE')
      .map((channel) => [`${channel.category}-${channel.remoteAreaRule}`, {
        id: `${channel.category}-${channel.remoteAreaRule}`,
        category: channel.category,
        rule: channel.remoteAreaRule
      }])
  ).values());
  const remoteAreaColumns: ColumnsType<(typeof remoteAreaRows)[number]> = [
    { title: '渠道类别', dataIndex: 'category', width: 180, render: (value: string) => <Text strong>{value}</Text> },
    { title: '偏远逻辑', dataIndex: 'rule', width: 180 },
    {
      title: '文件上传',
      dataIndex: 'rule',
      render: (rule: string) => {
        const files = remoteAreaFiles.filter((file) => file.rule === rule);
        return (
          <Space direction="vertical" size={8} className="full-width" onPaste={(event) => handleRemoteAreaPaste(rule, event)}>
            {canWriteRemoteAreas ? (
              <Upload
                accept=".xls,.xlsx,.csv,image/*"
                showUploadList={false}
                beforeUpload={(file) => {
                  void handleRemoteAreaFile(rule, file as File, 'upload');
                  return false;
                }}
              >
                <Button size="small">上传文件</Button>
              </Upload>
            ) : null}
            {files.length ? files.map((file) => (
              <Space key={file.id} size={6} wrap>
                <a href={file.url} target="_blank" rel="noreferrer">{file.fileName}</a>
                <Tag>{formatFileSize(file.sizeBytes)}</Tag>
                <Tag>{file.source === 'paste' ? '粘贴' : '上传'}</Tag>
                {canWriteRemoteAreas ? <Button size="small" onClick={() => setRemoteAreaFiles((current) => current.filter((item) => item.id !== file.id))}>删除</Button> : null}
              </Space>
            )) : <Text type="secondary">-</Text>}
          </Space>
        );
      }
    }
  ];
  const exchangeRateRows = [...masterData.exchangeRates].sort((left, right) => new Date(right.activeAt).getTime() - new Date(left.activeAt).getTime());
  const exchangeCurrencyOptions = Array.from(new Set(['USD', 'RMB', 'EUR', 'GBP', 'HKD', ...exchangeRateRows.map((rate) => rate.baseCurrency)])).filter(Boolean);
  const now = Date.now();
  const currentExchangeRateRows = Array.from(
    exchangeRateRows.reduce((map, rate) => {
      if (!rate.enabled || Date.parse(rate.activeAt) > now || (rate.endAt && Date.parse(rate.endAt) < now)) return map;
      const key = `${rate.baseCurrency}-${rate.quoteCurrency}`;
      if (!map.has(key)) map.set(key, rate);
      return map;
    }, new Map<string, ExchangeRateSummary>()).values()
  );
  const exchangeRateColumns: ColumnsType<ExchangeRateSummary> = [
    { title: '币别编码', dataIndex: 'baseCurrency', width: 160, render: (value: string) => <Text strong>{value}</Text> },
    { title: '币种名称', dataIndex: 'baseCurrency', width: 180, render: (value: string) => currencyName(value) },
    { title: '当前汇率', dataIndex: 'rate', width: 160, render: (value: number) => Number(value).toFixed(4).replace(/\.?0+$/, '') }
  ];
  const exchangeRateHistoryColumns: ColumnsType<ExchangeRateSummary> = [
    { title: '序号', width: 80, render: (_value, _record, index) => index + 1 },
    {
      title: '币别',
      dataIndex: 'baseCurrency',
      width: 160,
      render: (value: string) => (
        <Space size={6}>
          <Text strong>{value}</Text>
          <Text type="secondary">{currencyName(value)}</Text>
        </Space>
      )
    },
    { title: '开始日期', dataIndex: 'activeAt', width: 190, render: (value: string) => value.slice(0, 19).replace('T', ' ') },
    { title: '结束日期', dataIndex: 'endAt', width: 190, render: (value?: string) => value ? value.slice(0, 19).replace('T', ' ') : '-' },
    { title: '汇率', dataIndex: 'rate', width: 120, render: (value: number) => Number(value).toFixed(4).replace(/\.?0+$/, '') },
    {
      title: '操作',
      width: 150,
      render: (_value, record) => (
        <Space size={8}>
          <Button size="small" type="link" disabled={!canWriteExchangeRates} onClick={() => openEditMasterExchangeRate(record)}>
            修改
          </Button>
          <Popconfirm
            title="确认停用该汇率？"
            okText="确认停用"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            disabled={!canWriteExchangeRates}
            onConfirm={() => void handleDisableMasterExchangeRate(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger disabled={!canWriteExchangeRates}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];
  const channelCategoryRows = masterData.channelCategories.map((category) => ({ ...category }));
  const filteredChannelCategoryRows = channelCategoryRows.filter((category) => {
    const keyword = appliedChannelCategoryFilters.name.trim().toLowerCase();
    const matchesName = !keyword || category.name.toLowerCase().includes(keyword);
    const matchesStatus =
      appliedChannelCategoryFilters.status === 'ALL' ||
      (appliedChannelCategoryFilters.status === 'ENABLED' ? category.enabled : !category.enabled);
    return matchesName && matchesStatus;
  });
  const selectedChannelCategory = channelCategoryRows.find((category) => category.id === selectedChannelCategoryId) ?? null;
  const channelCategoryColumns: ColumnsType<(typeof channelCategoryRows)[number]> = [
    { title: '类别名称', dataIndex: 'name', render: (value: string) => <Text strong>{value}</Text> },
    { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
  ];

  async function handleCreateMasterCustomer() {
    setEditingMasterCustomer(null);
    masterCustomerForm.resetFields();
    masterCustomerForm.setFieldsValue({
      customerSource: '',
      customerType: '直客',
      salesperson: currentSalesperson,
      defaultSettlementMethod: 'RMB月结',
      customerEnabled: 'true'
    });
    setMasterCustomerOpen(true);
  }

  async function handleEditMasterCustomer(customer: CustomerSummary) {
    setEditingMasterCustomer(customer);
    masterCustomerForm.setFieldsValue({
      customerCode: customer.code,
      customerShortName: customer.shortName ?? customer.name,
      customerFullName: customer.fullName ?? `${customer.name} Co., Ltd.`,
      customerType: customer.customerType ?? '直客',
      customerSource: customer.customerSource ?? '',
      salesperson: customer.salesperson ?? '',
      defaultSettlementMethod: customer.defaultSettlementMethod ?? '',
      customerEnabled: customer.enabled ? 'true' : 'false'
    });
    setMasterCustomerOpen(true);
  }

  async function handleSubmitMasterCustomer() {
    const values = await masterCustomerForm.validateFields();
    try {
      const customerCode = values.customerCode.trim();
      const customerShortName = values.customerShortName.trim();
      const customerFullName = values.customerFullName.trim();
      const customerType = values.customerType.trim();
      const customerSource = values.customerSource.trim();
      const salesperson = currentSalesperson;
      const defaultSettlementMethod = values.defaultSettlementMethod.trim();
      const input = {
        code: customerCode,
        name: customerShortName,
        shortName: customerShortName,
        fullName: customerFullName,
        customerType,
        customerSource: customerSource || undefined,
        salesperson,
        defaultSettlementMethod,
        enabled: values.customerEnabled === 'true'
      };
      const wasEditing = Boolean(editingMasterCustomer);
      const customer = editingMasterCustomer
        ? await apiClient.updateCustomer(editingMasterCustomer.id, input)
        : await apiClient.createCustomer(input);
      onMasterDataChange((current) => ({
        ...current,
        customers: [...current.customers.filter((item) => item.id !== customer.id), customer]
      }));
      setMasterCustomerOpen(false);
      setEditingMasterCustomer(null);
      masterCustomerForm.resetFields();
      onNotice(wasEditing ? `${customer.code}-${customer.name} 已更新` : `已创建客户 ${customer.code}-${customer.name}，业务员 ${salesperson}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '客户保存失败');
    }
  }

  async function handleDisableMasterCustomer(customer: CustomerSummary) {
    const updatedCustomer = await apiClient.updateCustomerEnabled(customer.id, { enabled: false });
    onMasterDataChange((current) => ({
      ...current,
      customers: current.customers.map((item) => (item.id === updatedCustomer.id ? updatedCustomer : item))
    }));
    onNotice(`${updatedCustomer.code}-${updatedCustomer.name} 已停用`);
  }

  async function handleEnableMasterCustomer(customer: CustomerSummary) {
    const updatedCustomer = await apiClient.updateCustomerEnabled(customer.id, { enabled: true });
    onMasterDataChange((current) => ({
      ...current,
      customers: current.customers.map((item) => (item.id === updatedCustomer.id ? updatedCustomer : item))
    }));
    onNotice(`${updatedCustomer.code}-${updatedCustomer.name} 已启用`);
  }

  async function handleDeleteMasterCustomer(customer: CustomerSummary) {
    try {
      const deletedCustomer = await apiClient.deleteCustomer(customer.id);
      onMasterDataChange((current) => ({
        ...current,
        customers: current.customers.filter((item) => item.id !== deletedCustomer.id),
        contacts: current.contacts.filter((item) => item.customerId !== deletedCustomer.id),
        customerUsers: current.customerUsers.filter((item) => item.customerId !== deletedCustomer.id)
      }));
      setSelectedCustomerId((current) => (current === deletedCustomer.id ? null : current));
      onNotice(`${deletedCustomer.code}-${deletedCustomer.name} 已删除`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '客户删除失败');
    }
  }

  function exportCustomers() {
    const header = ['客户编码', '客户简称', '客户全称', '客户类型', '结算信息', '业务员', '状态'];
    const rows = filteredCustomerRows.map((customer) => [
      customer.code,
      customer.shortName,
      customer.fullName,
      customer.customerType,
      customer.defaultSettlementMethod || '-',
      customer.salesperson,
      customer.enabled ? '启用' : '停用'
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    link.download = 'customers.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function handleOpenMasterCustomerContact() {
    if (!selectedCustomer) return;
    setEditingMasterCustomerContact(null);
    masterCustomerContactForm.resetFields();
    setMasterCustomerContactOpen(true);
  }

  function handleEditMasterCustomerContact(contact: CustomerContactSummary) {
    setEditingMasterCustomerContact(contact);
    masterCustomerContactForm.setFieldsValue({
      receiverName: contact.name,
      receiverCompany: contact.company ?? '',
      receiverPhone: contact.phone ?? '',
      receiverEmail: contact.email ?? '',
      receiverAddress: contact.address ?? '',
      receiverCountry: contact.country ?? '',
      receiverState: contact.state ?? '',
      receiverPostalCode: contact.postalCode ?? ''
    });
    setMasterCustomerContactOpen(true);
  }

  async function handleDisableMasterCustomerContact(contact: CustomerContactSummary) {
    const updatedContact = await apiClient.updateCustomerContact(contact.customerId, contact.id, {
      name: contact.name,
      company: contact.company,
      phone: contact.phone,
      email: contact.email,
      address: contact.address,
      country: contact.country,
      state: contact.state,
      postalCode: contact.postalCode,
      enabled: false
    });
    onMasterDataChange((current) => ({
      ...current,
      contacts: current.contacts.map((item) => (item.id === updatedContact.id ? updatedContact : item))
    }));
    onNotice(`${contact.name} 已停用`);
  }

  async function handleSubmitMasterCustomerContact() {
    if (!selectedCustomer) return;
    const values = await masterCustomerContactForm.validateFields();
    const input = {
      name: values.receiverName.trim(),
      company: values.receiverCompany?.trim() || undefined,
      phone: values.receiverPhone?.trim() || undefined,
      email: values.receiverEmail?.trim() || undefined,
      address: values.receiverAddress?.trim() || undefined,
      country: values.receiverCountry?.trim() || undefined,
      state: values.receiverState?.trim() || undefined,
      postalCode: values.receiverPostalCode?.trim() || undefined
    };
    const contact = editingMasterCustomerContact
      ? await apiClient.updateCustomerContact(selectedCustomer.id, editingMasterCustomerContact.id, { ...input, enabled: true })
      : await apiClient.createCustomerContact(selectedCustomer.id, input);
    onMasterDataChange((current) => ({
      ...current,
      contacts: [...current.contacts.filter((item) => item.id !== contact.id), contact]
    }));
    setMasterCustomerContactOpen(false);
    setEditingMasterCustomerContact(null);
    masterCustomerContactForm.resetFields();
    onNotice(`${selectedCustomer.code}-${selectedCustomer.name} 已${editingMasterCustomerContact ? '更新' : '新增'}收货人 ${contact.name}`);
  }

  async function handleCreateMasterAgent() {
    setEditingMasterAgent(null);
    masterAgentForm.setFieldsValue({
      agentCode: '',
      agentShortName: '',
      agentName: '',
      agentIntegrationType: 'MANUAL',
      agentEnabled: 'true',
      warehouseAddress1: '',
      warehouseAddress2: '',
      warehouseAddress3: '',
      warehouseContact: '',
      invoiceTemplateName: '',
      invoiceTemplateUrl: '',
      bankAccountName: '',
      bankAccountNo: '',
      bankName: ''
    });
    setMasterAgentOpen(true);
  }

  async function handleEditMasterAgent(agent: AgentSummary) {
    setEditingMasterAgent(agent);
    const bank = agentBankAccounts.find((item) => item.agentId === agent.id || item.agentName === agent.name || item.agentName === agent.shortName);
    masterAgentForm.setFieldsValue({
      agentCode: agent.code ?? '',
      agentShortName: agent.shortName ?? agent.name,
      agentName: agent.name,
      warehouseAddress1: agent.warehouseAddress1 ?? '',
      warehouseAddress2: agent.warehouseAddress2 ?? '',
      warehouseAddress3: agent.warehouseAddress3 ?? '',
      warehouseContact: agent.warehouseContact ?? '',
      invoiceTemplateName: agent.invoiceTemplateName ?? '',
      invoiceTemplateUrl: agent.invoiceTemplateUrl ?? '',
      bankAccountName: bank?.accountName ?? '',
      bankAccountNo: bank?.bankAccountNo ?? '',
      bankName: bank?.bankName ?? '',
      agentIntegrationType: agent.integrationType ?? 'MANUAL',
      agentEnabled: agent.enabled ? 'true' : 'false'
    });
    setMasterAgentOpen(true);
  }

  async function handleAgentInvoiceTemplate(file: File) {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.xls', '.xlsx'].includes(extension) || extension === '.xlsm') {
      masterAgentForm.setFields([{ name: 'invoiceTemplateUrl', errors: ['请上传 .xls/.xlsx 发票模板'] }]);
      return;
    }
    const uploaded = await apiClient.uploadAgentInvoiceTemplate(file);
    masterAgentForm.setFieldsValue({ invoiceTemplateName: uploaded.fileName, invoiceTemplateUrl: uploaded.url });
    masterAgentForm.setFields([{ name: 'invoiceTemplateUrl', errors: [] }]);
    onNotice(`已上传代理发票模板 ${uploaded.fileName}`);
  }

  function handleAgentInvoicePaste(event: ClipboardEvent<HTMLElement>) {
    const file = Array.from(event.clipboardData.files).find((item) => ['.xls', '.xlsx'].includes(item.name.slice(item.name.lastIndexOf('.')).toLowerCase()));
    if (!file) return;
    event.preventDefault();
    void handleAgentInvoiceTemplate(file);
  }

  async function handleSubmitMasterAgent() {
    const values = await masterAgentForm.validateFields();
    const bankValues = {
      accountName: values.bankAccountName?.trim(),
      bankAccountNo: values.bankAccountNo?.trim(),
      bankName: values.bankName?.trim()
    };
    const hasBankValue = Boolean(bankValues.accountName || bankValues.bankAccountNo || bankValues.bankName);
    if (hasBankValue && (!bankValues.accountName || !bankValues.bankAccountNo || !bankValues.bankName)) {
      masterAgentForm.setFields([
        { name: 'bankAccountName', errors: bankValues.accountName ? [] : ['请输入收款方'] },
        { name: 'bankAccountNo', errors: bankValues.bankAccountNo ? [] : ['请输入银行账号'] },
        { name: 'bankName', errors: bankValues.bankName ? [] : ['请输入开户银行'] }
      ]);
      return;
    }
    const input = {
      code: values.agentCode.trim(),
      shortName: values.agentShortName.trim(),
      name: values.agentName.trim(),
      warehouseAddress1: values.warehouseAddress1?.trim(),
      warehouseAddress2: values.warehouseAddress2?.trim(),
      warehouseAddress3: values.warehouseAddress3?.trim(),
      warehouseContact: values.warehouseContact?.trim(),
      invoiceTemplateName: values.invoiceTemplateName?.trim(),
      invoiceTemplateUrl: values.invoiceTemplateUrl?.trim(),
      integrationType: values.agentIntegrationType,
      enabled: values.agentEnabled === 'true'
    };
    const agent = editingMasterAgent
      ? await apiClient.updateAgent(editingMasterAgent.id, input)
      : await apiClient.createAgent(input);
    if (canReadAgentBanks && hasBankValue && bankValues.accountName && bankValues.bankAccountNo && bankValues.bankName) {
      const exists = agentBankAccounts.some((bank) =>
        (bank.agentId === agent.id || bank.agentName === agent.name || bank.agentName === agent.shortName)
        && bank.accountName === bankValues.accountName
        && bank.bankAccountNo === bankValues.bankAccountNo
        && bank.bankName === bankValues.bankName
      );
      if (!exists) {
        const bank = await apiClient.saveAgentBankAccount({
          agentId: agent.id,
          agentName: agent.name,
          accountName: bankValues.accountName,
          bankAccountNo: bankValues.bankAccountNo,
          bankName: bankValues.bankName,
          currency: 'RMB'
        });
        setAgentBankAccounts((current) => [bank, ...current.filter((item) => item.id !== bank.id)]);
      }
    }
    onMasterDataChange((current) => ({
      ...current,
      agents: [...current.agents.filter((item) => item.id !== agent.id), agent]
    }));
    setSelectedAgentId(agent.id);
    setMasterAgentOpen(false);
    setEditingMasterAgent(null);
    masterAgentForm.resetFields();
    onNotice(editingMasterAgent ? `${agent.name} 已更新` : `${agent.name} 已创建`);
  }

  async function handleDisableMasterAgent(agent: AgentSummary) {
    const updatedAgent = await apiClient.updateAgentEnabled(agent.id, { enabled: false });
    onMasterDataChange((current) => ({
      ...current,
      agents: current.agents.map((item) => (item.id === updatedAgent.id ? updatedAgent : item))
    }));
    onNotice(`${updatedAgent.name} 已停用`);
  }

  async function handleCreateMasterAgentChannel() {
    setEditingMasterAgentChannel(null);
    masterAgentChannelForm.setFieldsValue({ agentId: agentRows[0]?.id ?? '', channelName: '', enabled: 'true' });
    setMasterAgentChannelOpen(true);
  }

  async function handleEditMasterAgentChannel(channel: AgentChannelSummary) {
    setEditingMasterAgentChannel(channel);
    masterAgentChannelForm.setFieldsValue({
      agentId: channel.agentId,
      channelName: channel.channelName,
      enabled: channel.enabled ? 'true' : 'false'
    });
    setMasterAgentChannelOpen(true);
  }

  async function handleSubmitMasterAgentChannel() {
    const values = await masterAgentChannelForm.validateFields();
    const input = {
      agentId: values.agentId,
      channelName: values.channelName.trim(),
      enabled: values.enabled === 'true'
    };
    const channel = editingMasterAgentChannel
      ? await apiClient.updateAgentChannel(editingMasterAgentChannel.id, input)
      : await apiClient.createAgentChannel(input);
    onMasterDataChange((current) => ({
      ...current,
      agentChannels: [...current.agentChannels.filter((item) => item.id !== channel.id), channel]
    }));
    setMasterAgentChannelOpen(false);
    setEditingMasterAgentChannel(null);
    masterAgentChannelForm.resetFields();
    onNotice(editingMasterAgentChannel ? `${channel.channelName} 已更新` : `${channel.channelName} 已创建`);
  }

  async function handleDisableMasterAgentChannel(channel: AgentChannelSummary) {
    const updatedChannel = await apiClient.updateAgentChannelEnabled(channel.id, { enabled: false });
    onMasterDataChange((current) => ({
      ...current,
      agentChannels: current.agentChannels.map((item) => (item.id === updatedChannel.id ? updatedChannel : item))
    }));
    onNotice(`${updatedChannel.channelName} 已停用`);
  }

  async function handleCreateMasterCompanyChannel() {
    setEditingMasterCompanyChannel(null);
    masterCompanyChannelForm.resetFields();
    masterCompanyChannelForm.setFieldsValue({
      name: '',
      carrierId: masterData.carriers[0]?.id ?? '',
      carrierName: '',
      businessType: 'EXPRESS',
      category: enabledCompanyChannelCategoryOptions[0] ?? 'DHL',
      volumeDivisor: '5000',
      multiPieceWeightRule: 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: 'ACTUAL',
      settlementWeightRule: 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: 'NONE',
      largeCargoThresholdKg: '',
      remoteAreaRule: '无偏远',
      enabled: 'true'
    });
    setMasterCompanyChannelOpen(true);
  }

  async function handleEditMasterCompanyChannel(channel: ChannelSummary) {
    setEditingMasterCompanyChannel(channel);
    masterCompanyChannelForm.setFieldsValue({
      name: channel.name,
      carrierId: channel.carrierId,
      carrierName: channel.carrierName,
      businessType: channel.businessType ?? 'EXPRESS',
      category: channel.category ?? channel.carrierName,
      volumeDivisor: String(channel.volumeDivisor ?? 5000),
      multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: channel.singleWeightRoundingRule ?? 'ACTUAL',
      settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? 'NONE',
      largeCargoThresholdKg: channel.largeCargoThresholdKg ? String(channel.largeCargoThresholdKg) : '',
      remoteAreaRule: channel.remoteAreaRule === 'NONE' ? '无偏远' : channel.remoteAreaRule ?? '无偏远',
      enabled: channel.enabled ? 'true' : 'false'
    });
    setMasterCompanyChannelOpen(true);
  }

  async function handleSubmitMasterCompanyChannel() {
    const values = await masterCompanyChannelForm.validateFields();
    const input = {
      name: values.name.trim(),
      carrierId: values.carrierId,
      carrierName: values.carrierName?.trim() || undefined,
      businessType: values.businessType,
      category: values.category.trim(),
      volumeDivisor: Number(values.volumeDivisor) || 5000,
      multiPieceWeightRule: values.multiPieceWeightRule,
      singleWeightRoundingRule: values.singleWeightRoundingRule,
      settlementWeightRule: values.settlementWeightRule,
      settlementWeightRoundingRule: values.settlementWeightRoundingRule,
      largeCargoThresholdKg: values.largeCargoThresholdKg ? Number(values.largeCargoThresholdKg) : undefined,
      remoteAreaRule: values.remoteAreaRule.trim() === '无偏远' ? 'NONE' : values.remoteAreaRule.trim(),
      enabled: values.enabled === 'true'
    };
    const channel = editingMasterCompanyChannel
      ? await apiClient.updateChannel(editingMasterCompanyChannel.id, input)
      : await apiClient.createChannel(input);
    onMasterDataChange((current) => ({
      ...current,
      channels: [...current.channels.filter((item) => item.id !== channel.id), channel]
    }));
    setMasterCompanyChannelOpen(false);
    setEditingMasterCompanyChannel(null);
    masterCompanyChannelForm.resetFields();
    onNotice(editingMasterCompanyChannel ? `${channel.name} 已更新` : `${channel.name} 已创建`);
  }

  async function handleDisableMasterCompanyChannel(channel: ChannelSummary) {
    const updatedChannel = await apiClient.updateChannelEnabled(channel.id, { enabled: false });
    onMasterDataChange((current) => ({
      ...current,
      channels: current.channels.map((item) => (item.id === updatedChannel.id ? updatedChannel : item))
    }));
    onNotice(`${updatedChannel.name} 已停用`);
  }

  async function handleCreateMasterChannelCategory() {
    setEditingMasterChannelCategory(null);
    masterChannelCategoryForm.setFieldsValue({ name: '', enabled: 'true' });
    setMasterChannelCategoryOpen(true);
  }

  async function handleEditMasterChannelCategory(category: ChannelCategorySummary) {
    setEditingMasterChannelCategory(category);
    masterChannelCategoryForm.setFieldsValue({ name: category.name, enabled: category.enabled ? 'true' : 'false' });
    setMasterChannelCategoryOpen(true);
  }

  async function handleSubmitMasterChannelCategory() {
    const values = await masterChannelCategoryForm.validateFields();
    const input = { name: values.name.trim(), enabled: values.enabled === 'true' };
    const category = editingMasterChannelCategory
      ? await apiClient.updateChannelCategory(editingMasterChannelCategory.id, input)
      : await apiClient.createChannelCategory({ name: input.name });
    onMasterDataChange((current) => ({
      ...current,
      channelCategories: [...current.channelCategories.filter((item) => item.id !== category.id), category]
    }));
    setMasterChannelCategoryOpen(false);
    setEditingMasterChannelCategory(null);
    masterChannelCategoryForm.resetFields();
    onNotice(editingMasterChannelCategory ? `${category.name} 已更新` : `${category.name} 已创建`);
  }

  async function handleDisableMasterChannelCategory(category: ChannelCategorySummary) {
    const updatedCategory = await apiClient.updateChannelCategoryEnabled(category.id, { enabled: false });
    onMasterDataChange((current) => ({
      ...current,
      channelCategories: current.channelCategories.map((item) => (item.id === updatedCategory.id ? updatedCategory : item))
    }));
    onNotice(`${updatedCategory.name} 已停用`);
  }

  function openEditMasterExchangeRate(rate: ExchangeRateSummary) {
    setEditingMasterExchangeRate(rate);
    masterExchangeRateForm.setFieldsValue({
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      rate: String(rate.rate),
      activeAt: rate.activeAt.slice(0, 10),
      endAt: rate.endAt?.slice(0, 10) ?? ''
    });
  }

  async function handleSubmitMasterExchangeRate() {
    const values = await masterExchangeRateForm.validateFields();
    const input = {
      baseCurrency: values.baseCurrency.trim().toUpperCase(),
      quoteCurrency: (values.quoteCurrency || 'RMB').trim().toUpperCase(),
      rate: Number(values.rate),
      activeAt: values.activeAt.includes('T') ? values.activeAt : `${values.activeAt}T00:00:00.000Z`,
      endAt: values.endAt.includes('T') ? values.endAt : `${values.endAt}T23:59:59.000Z`
    };
    const rate = editingMasterExchangeRate
      ? await apiClient.updateExchangeRate(editingMasterExchangeRate.id, input)
      : await apiClient.createExchangeRate(input);
    onMasterDataChange((current) => ({
      ...current,
      exchangeRates: [...current.exchangeRates.filter((item) => item.id !== rate.id), rate]
    }));
    setEditingMasterExchangeRate(null);
    masterExchangeRateForm.setFieldsValue({ baseCurrency: rate.baseCurrency, quoteCurrency: 'RMB', rate: '', activeAt: todayDate(), endAt: '' });
    onNotice(editingMasterExchangeRate ? `${rate.baseCurrency} 汇率已更新` : `${rate.baseCurrency} 汇率已新增`);
  }

  async function handleDisableMasterExchangeRate(rate: ExchangeRateSummary) {
    const updatedRate = await apiClient.deleteExchangeRate(rate.id);
    onMasterDataChange((current) => ({
      ...current,
      exchangeRates: current.exchangeRates.map((item) => (item.id === updatedRate.id ? updatedRate : item))
    }));
    if (editingMasterExchangeRate?.id === updatedRate.id) {
      setEditingMasterExchangeRate(null);
      masterExchangeRateForm.setFieldsValue({ baseCurrency: updatedRate.baseCurrency, quoteCurrency: 'RMB', rate: '', activeAt: todayDate(), endAt: '' });
    }
    onNotice(`${updatedRate.baseCurrency} 汇率已停用`);
  }

  return (
    <AppPage>
      <AppPageHeader
        title="基础资料库"
        description="按手册维护客户资料和代理资料，支持查询、增删改和列表设置。"
        actions={
          <AppActionGroup>
            <Button
              type="primary"
              icon={<Sparkles size={16} />}
              loading={aiLoading}
              onClick={() =>
                onAiAssist({
                  module: '基础资料',
                  task: '资料体检',
                  prompt: '请检查客户资料和代理资料的完整性，输出缺失项和处理顺序。',
                  context: { masterData }
                })
              }
            >
              AI 资料体检
            </Button>
          </AppActionGroup>
        }
      />

      {renderNoticeBar(notice)}

      {activeMasterSection === 'customers' ? (
        <Row gutter={[12, 12]} className="customer-master-metrics">
          <Col xs={24} md={12} xl={6}>
            <MetricCard icon={<Users />} title="客户资料" value={customerMetrics.total} extra="客户编码、简称、全称" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard icon={<CheckCircle />} title="启用客户" value={customerMetrics.enabled} extra="当前可用于下单" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard icon={<AlertTriangle />} title="缺结算信息" value={customerMetrics.missingSettlement} extra="需补充币种/月结" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <MetricCard icon={<UserRound />} title="收货人" value={customerMetrics.contacts} extra="已维护联系人" />
          </Col>
        </Row>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <MetricCard icon={<Users />} title="客户资料" value={summary.enabledCustomers} extra="客户编码、简称、全称、类型、业务员" />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard icon={<Route />} title="代理资料" value={summary.enabledAgents} extra={`${summary.enabledChannels} 条渠道 / ${summary.enabledCarriers} 个承运商`} />
          </Col>
          <Col xs={24} md={8}>
            <MetricCard icon={<FileText />} title="费用/汇率" value={summary.enabledSurcharges} extra={`${summary.activeExchangeRates} 条启用汇率`} />
          </Col>
        </Row>
      )}

      <ModuleSubWorkspace items={masterSubItems} activeKey={activeMasterSection} onChange={setActiveMasterSection}>
      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24}>
          {activeMasterSection === 'financeCatalog' ? (
            <FinanceCatalogPage
              {...financeCatalog.pageProps}
              title="财务资料"
              pagination={tenRowTablePagination}
              canWrite={canWriteFinanceCatalog}
            />
          ) : null}
          {activeMasterSection === 'remoteAreas' ? (
            <Card className="module-grid" title="偏远">
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={remoteAreaRows}
                columns={remoteAreaColumns}
                scroll={{ x: 760 }}
                locale={{ emptyText: '暂无偏远逻辑' }}
              />
            </Card>
          ) : null}
          {activeMasterSection === 'exchangeRates' ? (
            <Card className="module-grid" title="汇率">
              <Space direction="vertical" size={12} className="ai-list">
                <Text strong>当前汇率</Text>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={tenRowTablePagination}
                  dataSource={currentExchangeRateRows}
                  columns={exchangeRateColumns}
                  scroll={{ x: 560 }}
                  locale={{ emptyText: '暂无启用汇率' }}
                />
                <Text strong>历史汇率:新增</Text>
                <Form form={masterExchangeRateForm} layout="vertical" initialValues={{ baseCurrency: 'USD', quoteCurrency: 'RMB', activeAt: todayDate(), endAt: '' }}>
                  <Row gutter={12} align="bottom">
                    <Col xs={24} md={6}>
                      <Form.Item name="baseCurrency" label="币别" rules={[{ required: true, message: '请选择币别' }]}>
                        <select aria-label="汇率币别" className="native-select">
                          <option value="">--请选择--</option>
                          {exchangeCurrencyOptions.map((currency) => <option key={currency} value={currency}>{currencyName(currency)}</option>)}
                        </select>
                      </Form.Item>
                    </Col>
                    <Form.Item name="quoteCurrency" hidden>
                      <Input />
                    </Form.Item>
                    <Col xs={24} md={6}>
                      <Form.Item name="activeAt" label="开始日期" rules={[{ required: true, message: '请选择开始日期' }]}>
                        <Input type="date" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item
                        name="rate"
                        label="汇率"
                        rules={[
                          { required: true, message: '请输入汇率' },
                          { validator: (_, value) => Number(value) > 0 ? Promise.resolve() : Promise.reject(new Error('汇率必须大于 0')) }
                        ]}
                      >
                        <Input aria-label="历史汇率值" type="number" step="0.0001" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item name="endAt" label="结束日期" rules={[{ required: true, message: '请选择结束日期' }]}>
                        <Input type="date" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Flex justify="end">
                        <Space>
                          {editingMasterExchangeRate ? <Button onClick={() => {
                            setEditingMasterExchangeRate(null);
                            masterExchangeRateForm.setFieldsValue({ baseCurrency: 'USD', quoteCurrency: 'RMB', rate: '', activeAt: todayDate(), endAt: '' });
                          }}>取消修改</Button> : null}
                          <Button
                            type="primary"
                            aria-label={editingMasterExchangeRate ? '保存修改历史汇率' : '新增历史汇率'}
                            disabled={!canWriteExchangeRates}
                            onClick={() => void handleSubmitMasterExchangeRate()}
                          >
                            {editingMasterExchangeRate ? '保存修改' : '新增'}
                          </Button>
                        </Space>
                      </Flex>
                    </Col>
                  </Row>
                </Form>
                <Text strong>历史汇率:列表</Text>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={tenRowTablePagination}
                  dataSource={exchangeRateRows.filter((rate) => rate.enabled)}
                  columns={exchangeRateHistoryColumns}
                  scroll={{ x: 900 }}
                  locale={{ emptyText: '暂无历史汇率' }}
                />
              </Space>
            </Card>
          ) : null}
          {activeMasterSection === 'channelCategories' ? (
          <Card className="module-grid" title="渠道类别">
            <Space direction="vertical" size={12} className="ai-list">
              <Row gutter={[10, 10]} className="module-filter-grid">
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('类别名称', (
                    <Input
                      aria-label="渠道类别名称筛选"
                      value={channelCategoryFilters.name}
                      onChange={(event) => setChannelCategoryFilters((current) => ({ ...current, name: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('状态', (
                    <select
                      aria-label="渠道类别状态筛选"
                      className="native-select"
                      value={channelCategoryFilters.status}
                      onChange={(event) => setChannelCategoryFilters((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      <option value="ENABLED">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterActions(
                    () => setAppliedChannelCategoryFilters(channelCategoryFilters),
                    () => {
                      const emptyFilters = { name: '', status: 'ALL' };
                      setChannelCategoryFilters(emptyFilters);
                      setAppliedChannelCategoryFilters(emptyFilters);
                    }
                  )}
                </Col>
              </Row>
              <Space wrap className="surface-strip">
                <Button size="small" aria-label="新增渠道类别" disabled={!canWriteChannelCategories} onClick={() => void handleCreateMasterChannelCategory()}>
                  新增
                </Button>
                <Button size="small" aria-label="修改渠道类别" disabled={!selectedChannelCategory || !canWriteChannelCategories} onClick={() => selectedChannelCategory && void handleEditMasterChannelCategory(selectedChannelCategory)}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该渠道类别？"
                  description="停用后不再作为公司渠道可选类别，不会影响历史公司渠道。"
                  okText="确认停用"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedChannelCategory || !canWriteChannelCategories}
                  destroyOnHidden
                  open={channelCategoryDisableConfirmOpen}
                  onOpenChange={(open) => setChannelCategoryDisableConfirmOpen(Boolean(selectedChannelCategory && canWriteChannelCategories && open))}
                  onConfirm={async () => {
                    if (selectedChannelCategory) {
                      await handleDisableMasterChannelCategory(selectedChannelCategory);
                    }
                    setChannelCategoryDisableConfirmOpen(false);
                  }}
                  onCancel={() => setChannelCategoryDisableConfirmOpen(false)}
                >
                  <Button size="small" aria-label="删除渠道类别" disabled={!selectedChannelCategory || !canWriteChannelCategories}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredChannelCategoryRows}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedChannelCategoryId ? [selectedChannelCategoryId] : [],
                  onChange: (keys) => setSelectedChannelCategoryId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedChannelCategoryId(record.id)
                })}
                columns={channelCategoryColumns}
                scroll={{ x: 520 }}
              />
            </Space>
          </Card>
          ) : null}
          {activeMasterSection === 'companyChannels' ? (
          <Card className="module-grid" title="公司渠道">
            <Space direction="vertical" size={12} className="ai-list">
              <Row gutter={[10, 10]} className="module-filter-grid">
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('关键词', (
                    <Input
                      aria-label="公司渠道关键词筛选"
                      value={companyChannelFilters.keyword}
                      onChange={(event) => setCompanyChannelFilters((current) => ({ ...current, keyword: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('业务类型', (
                    <select
                      aria-label="公司渠道业务类型筛选"
                      className="native-select"
                      value={companyChannelFilters.businessType}
                      onChange={(event) => setCompanyChannelFilters((current) => ({ ...current, businessType: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      {Object.entries(businessTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('渠道类别', (
                    <select
                      aria-label="公司渠道类别筛选"
                      className="native-select"
                      value={companyChannelFilters.category}
                      onChange={(event) => setCompanyChannelFilters((current) => ({ ...current, category: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      {companyChannelCategoryFilterOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('状态', (
                    <select
                      aria-label="公司渠道状态筛选"
                      className="native-select"
                      value={companyChannelFilters.status}
                      onChange={(event) => setCompanyChannelFilters((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      <option value="ENABLED">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterActions(
                    () => setAppliedCompanyChannelFilters(companyChannelFilters),
                    () => {
                      const emptyFilters = { keyword: '', businessType: 'ALL', category: 'ALL', status: 'ALL' };
                      setCompanyChannelFilters(emptyFilters);
                      setAppliedCompanyChannelFilters(emptyFilters);
                    }
                  )}
                </Col>
              </Row>
              <Space wrap className="surface-strip">
                <Button size="small" aria-label="增加公司渠道" disabled={!canWriteChannels} onClick={() => void handleCreateMasterCompanyChannel()}>
                  增加
                </Button>
                <Button size="small" aria-label="修改公司渠道" disabled={!selectedCompanyChannel || !canWriteChannels} onClick={() => selectedCompanyChannel && void handleEditMasterCompanyChannel(selectedCompanyChannel)}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该公司渠道？"
                  description="停用后该公司渠道不再作为可用渠道展示，不会物理删除历史引用。"
                  okText="确认停用"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedCompanyChannel || !canWriteChannels}
                  destroyOnHidden
                  open={companyChannelDisableConfirmOpen}
                  onOpenChange={(open) => setCompanyChannelDisableConfirmOpen(Boolean(selectedCompanyChannel && canWriteChannels && open))}
                  onConfirm={async () => {
                    if (selectedCompanyChannel) {
                      await handleDisableMasterCompanyChannel(selectedCompanyChannel);
                    }
                    setCompanyChannelDisableConfirmOpen(false);
                  }}
                  onCancel={() => setCompanyChannelDisableConfirmOpen(false)}
                >
                  <Button size="small" aria-label="删除公司渠道" disabled={!selectedCompanyChannel || !canWriteChannels}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredCompanyChannelRows}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedCompanyChannelId ? [selectedCompanyChannelId] : [],
                  onChange: (keys) => setSelectedCompanyChannelId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedCompanyChannelId(record.id)
                })}
                columns={companyChannelColumns}
                scroll={{ x: 1450 }}
              />
            </Space>
          </Card>
          ) : null}
          {activeMasterSection === 'agentChannels' ? (
          <Card className="module-grid" title="代理渠道">
            <Space direction="vertical" size={12} className="ai-list">
              <Row gutter={[10, 10]} className="module-filter-grid">
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('代理', (
                    <select
                      aria-label="代理渠道代理筛选"
                      className="native-select"
                      value={agentChannelFilters.agentId}
                      onChange={(event) => setAgentChannelFilters((current) => ({ ...current, agentId: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      {agentRows.map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.shortName}</option>
                      ))}
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('渠道名称', (
                    <Input
                      aria-label="代理渠道名称筛选"
                      value={agentChannelFilters.channelName}
                      onChange={(event) => setAgentChannelFilters((current) => ({ ...current, channelName: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('状态', (
                    <select
                      aria-label="代理渠道状态筛选"
                      className="native-select"
                      value={agentChannelFilters.status}
                      onChange={(event) => setAgentChannelFilters((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      <option value="ENABLED">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterActions(
                    () => setAppliedAgentChannelFilters(agentChannelFilters),
                    () => {
                      const emptyFilters = { agentId: 'ALL', channelName: '', status: 'ALL' };
                      setAgentChannelFilters(emptyFilters);
                      setAppliedAgentChannelFilters(emptyFilters);
                    }
                  )}
                </Col>
              </Row>
              <Space wrap className="surface-strip">
                <Button size="small" aria-label="增加代理渠道" disabled={!canWriteAgentChannels || agentRows.length === 0} onClick={() => void handleCreateMasterAgentChannel()}>
                  增加
                </Button>
                <Button size="small" aria-label="修改代理渠道" disabled={!selectedAgentChannel || !canWriteAgentChannels} onClick={() => selectedAgentChannel && void handleEditMasterAgentChannel(selectedAgentChannel)}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该代理渠道？"
                  description="停用后该渠道将不再作为可用代理渠道展示，不会物理删除历史数据。"
                  okText="确认停用"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedAgentChannel || !canWriteAgentChannels}
                  destroyOnHidden
                  open={agentChannelDisableConfirmOpen}
                  onOpenChange={(open) => setAgentChannelDisableConfirmOpen(Boolean(selectedAgentChannel && canWriteAgentChannels && open))}
                  onConfirm={async () => {
                    if (selectedAgentChannel) {
                      await handleDisableMasterAgentChannel(selectedAgentChannel);
                    }
                    setAgentChannelDisableConfirmOpen(false);
                  }}
                  onCancel={() => setAgentChannelDisableConfirmOpen(false)}
                >
                  <Button size="small" aria-label="删除代理渠道" disabled={!selectedAgentChannel || !canWriteAgentChannels}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredAgentChannelRows}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedAgentChannelId ? [selectedAgentChannelId] : [],
                  onChange: (keys) => setSelectedAgentChannelId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedAgentChannelId(record.id)
                })}
                columns={agentChannelColumns}
                scroll={{ x: 760 }}
              />
            </Space>
          </Card>
          ) : null}
          {activeMasterSection === 'customers' ? (
          <div className="customer-master-workbench">
            <Card
              className="customer-master-card"
              title={
                <Space direction="vertical" size={2}>
                  <Flex align="center" gap={8}>
                    <FileText size={18} />
                    <span>客户资料</span>
                  </Flex>
                  <Text type="secondary">共 {customerRows.length} 条客户，点击客户查看详情</Text>
                </Space>
              }
              extra={
                <Space wrap>
                  <Button type="primary" icon={<Plus size={16} />} aria-label="增加客户" disabled={!canWriteCustomers} onClick={() => void handleCreateMasterCustomer()}>
                    新增客户
                  </Button>
                  <Button icon={<UploadIcon size={16} />} onClick={() => onNotice('客户导入请使用当前模板整理后导入')}>
                    导入
                  </Button>
                  <Button icon={<Download size={16} />} onClick={exportCustomers}>
                    导出
                  </Button>
                  <Button icon={<Settings size={16} />} aria-label="客户列表设置" onClick={() => setCustomerListSettingOpen(true)}>
                    列表设置
                  </Button>
                </Space>
              }
            >
              <Space direction="vertical" size={10} className="customer-master-stack">
                <div className="customer-master-filter">
                  <Space.Compact className="customer-master-keyword">
                    <span>客户名称/编码</span>
                    <Input
                      aria-label="客户编码筛选"
                      placeholder="输入客户简称、全称或编码"
                      value={customerFilters.name}
                      onChange={(event) => setCustomerFilters((current) => ({ ...current, name: event.target.value, code: '' }))}
                    />
                  </Space.Compact>
                  <label className="customer-master-select">
                    <span>客户类型</span>
                    <select
                      aria-label="客户类型筛选"
                      className="native-select"
                      value={customerFilters.customerType}
                      onChange={(event) => setCustomerFilters((current) => ({ ...current, customerType: event.target.value }))}
                    >
                      <option value="ALL">全部</option>
                      {customerTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="customer-master-select">
                    <span>状态</span>
                    <select
                      aria-label="客户状态筛选"
                      className="native-select"
                      value={customerFilters.status}
                      onChange={(event) => setCustomerFilters((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="ALL">全部</option>
                      <option value="ENABLED">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  </label>
                  <label className="customer-master-select">
                    <span>业务员</span>
                    <select
                      aria-label="业务员筛选"
                      className="native-select"
                      value={customerFilters.salesperson}
                      onChange={(event) => setCustomerFilters((current) => ({ ...current, salesperson: event.target.value }))}
                    >
                      <option value="">全部</option>
                      {salespersonOptions.map((salesperson) => <option key={salesperson} value={salesperson}>{salesperson}</option>)}
                    </select>
                  </label>
                  <Button type="primary" onClick={() => setAppliedCustomerFilters(customerFilters)}>查询</Button>
                  <Button
                    onClick={() => {
                      const emptyFilters = { name: '', code: '', status: 'ALL', customerType: 'ALL', customerSource: '', salesperson: '' };
                      setCustomerFilters(emptyFilters);
                      setAppliedCustomerFilters(emptyFilters);
                    }}
                  >
                    重置
                  </Button>
                </div>
                <div className="customer-master-batch">
                  <Text>已选择 {selectedCustomer ? 1 : 0} 项</Text>
                  <Button icon={<Edit size={15} />} disabled={!selectedCustomer || !canWriteCustomers} onClick={() => selectedCustomer && void handleEditMasterCustomer(selectedCustomer)}>
                    修改
                  </Button>
                  <Popconfirm
                    title={`确认${selectedCustomer?.enabled === false ? '启用' : '停用'}该客户？`}
                    description={selectedCustomer?.enabled === false ? '启用后可重新用于业务下单。' : '停用保留历史记录，不影响既有业务数据。'}
                    okText={`确认${selectedCustomer?.enabled === false ? '启用' : '停用'}`}
                    cancelText="取消"
                    okButtonProps={{ danger: selectedCustomer?.enabled !== false }}
                    disabled={!selectedCustomer || !canWriteCustomers}
                    destroyOnHidden
                    open={customerDisableConfirmOpen}
                    onOpenChange={(open) => setCustomerDisableConfirmOpen(Boolean(selectedCustomer && canWriteCustomers && open))}
                    onConfirm={async () => {
                      if (selectedCustomer) {
                        await (selectedCustomer.enabled ? handleDisableMasterCustomer(selectedCustomer) : handleEnableMasterCustomer(selectedCustomer));
                      }
                      setCustomerDisableConfirmOpen(false);
                    }}
                    onCancel={() => setCustomerDisableConfirmOpen(false)}
                  >
                    <Button icon={<Power size={15} />} danger={selectedCustomer?.enabled !== false} disabled={!selectedCustomer || !canWriteCustomers}>
                      {selectedCustomer?.enabled === false ? '启用' : '停用'}
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title="删除客户资料"
                    description="删除后不可恢复，请确认该客户无未完成运单、费用或收款记录。"
                    okText="确认删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    disabled={!selectedCustomer || !canWriteCustomers}
                    onConfirm={() => selectedCustomer ? handleDeleteMasterCustomer(selectedCustomer) : undefined}
                    destroyOnHidden
                  >
                    <Button icon={<Trash2 size={15} />} danger aria-label="删除客户" disabled={!selectedCustomer || !canWriteCustomers}>
                      删除
                    </Button>
                  </Popconfirm>
                  <Text type="warning">停用保留历史记录；删除需二次确认</Text>
                </div>
                <Table
                  rowKey="id"
                  size="small"
                  className="customer-master-table"
                  pagination={tenRowTablePagination}
                  dataSource={filteredCustomerRows}
                  rowSelection={{
                    selectedRowKeys: selectedCustomerId ? [selectedCustomerId] : [],
                    onChange: (keys) => setSelectedCustomerId(String(keys[keys.length - 1] ?? ''))
                  }}
                  rowClassName={(record) => record.id === selectedCustomerId ? 'customer-master-row-selected' : ''}
                  onRow={(record) => ({
                    onClick: () => setSelectedCustomerId(record.id)
                  })}
                  columns={customerColumns}
                  scroll={{ x: 1120 }}
                />
              </Space>
            </Card>
            <Card
              className="customer-detail-panel"
              title="客户详情"
              extra={<Button type="text" onClick={() => setSelectedCustomerId(null)}>×</Button>}
            >
              {selectedCustomer ? (
                <Space direction="vertical" size={16} className="customer-detail-stack">
                  <Flex align="center" gap={14}>
                    <span className="customer-detail-icon"><Building2 size={30} /></span>
                    <Space direction="vertical" size={2}>
                      <Space>
                        <Title level={4}>{selectedCustomer.name}</Title>
                        <Tag color={selectedCustomer.enabled ? 'green' : 'default'}>{selectedCustomer.enabled ? '启用' : '停用'}</Tag>
                        <Tag color="blue">{selectedCustomer.customerType}</Tag>
                      </Space>
                      <Text type="secondary">{selectedCustomer.code} · {selectedCustomer.fullName}</Text>
                    </Space>
                  </Flex>
                  <div className="customer-detail-section">
                    <Text strong>基础信息</Text>
                    <div className="customer-detail-fields">
                      <Text type="secondary">客户编码</Text><Text>{selectedCustomer.code}</Text>
                      <Text type="secondary">业务员</Text><Text>{selectedCustomer.salesperson}</Text>
                      <Text type="secondary">来源</Text><Text>{selectedCustomer.customerSource || '手工创建'}</Text>
                      <Text type="secondary">创建时间</Text><Text>{latestShipmentByCustomerId.get(selectedCustomer.id)?.createdAt?.slice(0, 16).replace('T', ' ') ?? '-'}</Text>
                    </div>
                  </div>
                  <div className="customer-detail-section">
                    <Text strong>结算信息</Text>
                    <div className="customer-detail-fields">
                      <Text type="secondary">币种</Text><Text>RMB</Text>
                      <Text type="secondary">结算方式</Text><Text>{selectedCustomer.defaultSettlementMethod || '缺失'}</Text>
                      <Text type="secondary">付款周期</Text><Text>{selectedCustomer.defaultSettlementMethod?.includes('月') ? '每月' : '-'}</Text>
                    </div>
                  </div>
                  <div className="customer-detail-section">
                    <Flex justify="space-between" align="center">
                      <Text strong>收货人</Text>
                      <Button
                        size="small"
                        icon={<Plus size={14} />}
                        disabled={!selectedCustomer || !canWriteCustomers || selectedCustomerContacts.length >= 4}
                        onClick={() => void handleOpenMasterCustomerContact()}
                      >
                        新增收货人
                      </Button>
                    </Flex>
                    {selectedCustomerContacts.length ? (
                      <Table
                        rowKey="id"
                        size="small"
                        className="customer-detail-contact-table"
                        dataSource={selectedCustomerContacts}
                        columns={customerContactColumns}
                        pagination={false}
                        scroll={{ x: 920 }}
                      />
                    ) : <Text type="secondary">暂无维护收货人</Text>}
                  </div>
                  <div className="customer-detail-section">
                    <Text strong>最近订单</Text>
                    {latestShipmentByCustomerId.get(selectedCustomer.id) ? (
                      <Flex justify="space-between" align="center">
                        <Text strong type="success">{latestShipmentByCustomerId.get(selectedCustomer.id)?.systemOrderNo}</Text>
                        <Text type="secondary">{latestShipmentByCustomerId.get(selectedCustomer.id)?.createdAt?.slice(0, 10)}</Text>
                      </Flex>
                    ) : <Text type="secondary">暂无订单</Text>}
                  </div>
                  <div className="customer-detail-section">
                    <Text strong>最近变更</Text>
                    {customerAuditLogs.length ? customerAuditLogs.map((log) => (
                      <Space key={log.id} direction="vertical" size={0} className="full-width">
                        <Text type="success">{log.actionLabel}</Text>
                        <Text type="secondary">{log.actorUsername} · {log.createdAt.slice(0, 16).replace('T', ' ')}</Text>
                      </Space>
                    )) : <Text type="secondary">暂无变更记录</Text>}
                  </div>
                  <Flex gap={10}>
                    <Button onClick={() => void handleEditMasterCustomer(selectedCustomer)} disabled={!canWriteCustomers}>编辑客户</Button>
                    <Button danger disabled={!canWriteCustomers} onClick={() => selectedCustomer.enabled ? void handleDisableMasterCustomer(selectedCustomer) : void handleEnableMasterCustomer(selectedCustomer)}>
                      {selectedCustomer.enabled ? '停用' : '启用'}
                    </Button>
                    <Popconfirm
                      title="删除客户资料"
                      description="删除后不可恢复，请确认该客户无未完成运单、费用或收款记录。"
                      okText="确认删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteMasterCustomer(selectedCustomer)}
                      disabled={!canWriteCustomers}
                      destroyOnHidden
                    >
                      <Button danger type="primary" disabled={!canWriteCustomers}>删除</Button>
                    </Popconfirm>
                  </Flex>
                </Space>
              ) : <Text type="secondary">暂无客户详情</Text>}
            </Card>
            <Modal
              title="客户列表设置"
              open={customerListSettingOpen}
              destroyOnHidden
              okText="确定"
              cancelText="取消"
              onOk={() => setCustomerListSettingOpen(false)}
              onCancel={() => setCustomerListSettingOpen(false)}
            >
              <Space direction="vertical">
                <Checkbox checked={showCustomerType} onChange={(event) => setShowCustomerType(event.target.checked)}>
                  显示客户类型
                </Checkbox>
                <Checkbox checked={showCustomerStatus} onChange={(event) => setShowCustomerStatus(event.target.checked)}>
                  显示状态
                </Checkbox>
              </Space>
            </Modal>
          </div>
          ) : null}

          {activeMasterSection === 'agents' ? (
          <Card className="module-grid" title="代理资料">
            <Space direction="vertical" size={12} className="ai-list">
              <Row gutter={[10, 10]} className="module-filter-grid">
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('代理详细公司名', (
                    <Input
                      aria-label="代理详细公司名筛选"
                      value={agentFilters.name}
                      onChange={(event) => setAgentFilters((current) => ({ ...current, name: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('代理编码', (
                    <Input
                      aria-label="代理编码筛选"
                      value={agentFilters.code}
                      onChange={(event) => setAgentFilters((current) => ({ ...current, code: event.target.value }))}
                    />
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterField('状态', (
                    <select
                      aria-label="代理状态筛选"
                      className="native-select"
                      value={agentFilters.status}
                      onChange={(event) => setAgentFilters((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      <option value="ENABLED">启用</option>
                      <option value="DISABLED">停用</option>
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={5}>
                  {renderFilterField('对接类型', (
                    <select
                      aria-label="代理对接类型筛选"
                      className="native-select"
                      value={agentFilters.integrationType}
                      onChange={(event) => setAgentFilters((current) => ({ ...current, integrationType: event.target.value }))}
                    >
                      <option value="ALL">--全部--</option>
                      <option value="MANUAL">手工</option>
                      <option value="API">API 对接</option>
                      <option value="PLATFORM">平台对接</option>
                      <option value="OTHER">其他</option>
                    </select>
                  ))}
                </Col>
                <Col xs={24} md={8} xl={4}>
                  {renderFilterActions(
                    () => setAppliedAgentFilters(agentFilters),
                    () => {
                      const emptyFilters = { name: '', code: '', status: 'ALL', integrationType: 'ALL' };
                      setAgentFilters(emptyFilters);
                      setAppliedAgentFilters(emptyFilters);
                    }
                  )}
                </Col>
              </Row>
              <Space wrap className="surface-strip">
                <Button size="small" aria-label="增加代理" disabled={!canWriteAgents} onClick={() => void handleCreateMasterAgent()}>
                  增加
                </Button>
                <Button size="small" aria-label="修改代理" disabled={!selectedAgent || !canWriteAgents} onClick={() => selectedAgent && void handleEditMasterAgent(selectedAgent)}>
                  修改
                </Button>
                <Popconfirm
                  title="确认停用该代理？"
                  description="停用后该代理将不再作为可用代理资料展示，不会物理删除历史数据。"
                  okText="确认停用"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedAgent || !canWriteAgents}
                  destroyOnHidden
                  open={agentDisableConfirmOpen}
                  onOpenChange={(open) => setAgentDisableConfirmOpen(Boolean(selectedAgent && canWriteAgents && open))}
                  onConfirm={async () => {
                    if (selectedAgent) {
                      await handleDisableMasterAgent(selectedAgent);
                    }
                    setAgentDisableConfirmOpen(false);
                  }}
                  onCancel={() => setAgentDisableConfirmOpen(false)}
                >
                  <Button size="small" aria-label="删除代理" disabled={!selectedAgent || !canWriteAgents}>
                    删除
                  </Button>
                </Popconfirm>
                <Button size="small" aria-label="代理列表设置" onClick={() => setAgentListSettingOpen(true)}>
                  列表设置
                </Button>
              </Space>
              <Table
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredAgentRows}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedAgentId ? [selectedAgentId] : [],
                  onChange: (keys) => setSelectedAgentId(String(keys[0] ?? ''))
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedAgentId(record.id)
                })}
                columns={agentColumns}
                scroll={{ x: 1400 }}
              />
            </Space>
            <Modal
              title="代理列表设置"
              open={agentListSettingOpen}
              destroyOnHidden
              okText="确定"
              cancelText="取消"
              onOk={() => setAgentListSettingOpen(false)}
              onCancel={() => setAgentListSettingOpen(false)}
            >
              <Space direction="vertical">
                <Checkbox checked={showAgentStatus} onChange={(event) => setShowAgentStatus(event.target.checked)}>
                  显示状态
                </Checkbox>
                <Checkbox checked={showAgentIntegrationType} onChange={(event) => setShowAgentIntegrationType(event.target.checked)}>
                  显示代理对接类型
                </Checkbox>
              </Space>
            </Modal>
          </Card>
          ) : null}

        </Col>

        {activeMasterSection === 'assistant' ? (
        <Col xs={24}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <Bot size={18} />
                <span>AI 资料助手</span>
              </Flex>
            }
          >
            <Space direction="vertical" size={12} className="quality-panel">
              <Tag color="blue">硅基流动</Tag>
              <Alert type="info" showIcon message="客户联系人缺手机号时提醒客服补齐" />
              <Alert type="warning" showIcon message="代理 API 对接预留不需要填写真实 key" />
              <Alert type="warning" showIcon message="汇率超过 24 小时未更新时提示复核" />
              <Alert type="info" showIcon message="模板权限变更写入 audit_logs" />
            </Space>
          </Card>

          <Card className="automation-card" title="快捷维护">
            <Space wrap>
              <Tag>客户 {masterData.customers.length}</Tag>
              <Tag>渠道 {masterData.channels.length}</Tag>
              <Tag>费用 {masterData.surcharges.length}</Tag>
              <Tag>燃油 {masterData.fuelRates.length}</Tag>
              <Tag>汇率 {masterData.exchangeRates.length}</Tag>
            </Space>
          </Card>
        </Col>
        ) : null}
      </Row>
      </ModuleSubWorkspace>
      <Modal
        title={editingMasterChannelCategory ? '编辑渠道类别' : '新建渠道类别'}
        open={masterChannelCategoryOpen}
        destroyOnHidden
        okText={editingMasterChannelCategory ? '保存渠道类别' : '创建渠道类别'}
        cancelText="取消"
        onOk={() => void handleSubmitMasterChannelCategory()}
        onCancel={() => {
          setMasterChannelCategoryOpen(false);
          setEditingMasterChannelCategory(null);
          masterChannelCategoryForm.resetFields();
        }}
      >
        <Form form={masterChannelCategoryForm} layout="vertical">
          <Form.Item name="name" label="类别名称" rules={[{ required: true, whitespace: true, message: '请输入类别名称' }]}>
            <Input placeholder="例如 UPS / DHL / 卡车" />
          </Form.Item>
          <Form.Item name="enabled" label="状态" initialValue="true">
            <select aria-label="渠道类别状态" className="native-select">
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={editingMasterCompanyChannel ? '编辑公司渠道' : '新建公司渠道'}
        open={masterCompanyChannelOpen}
        destroyOnHidden
        okText={editingMasterCompanyChannel ? '保存公司渠道' : '创建公司渠道'}
        cancelText="取消"
        width={860}
        onOk={() => void handleSubmitMasterCompanyChannel()}
        onCancel={() => {
          setMasterCompanyChannelOpen(false);
          setEditingMasterCompanyChannel(null);
          masterCompanyChannelForm.resetFields();
        }}
      >
        <Form form={masterCompanyChannelForm} layout="vertical">
          <Title level={5}>基础信息</Title>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="渠道名称" rules={[{ required: true, whitespace: true, message: '请输入渠道名称' }]}>
                <Input placeholder="例如 CNUPS红单" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              {masterData.carriers.length > 0 ? (
                <Form.Item name="carrierId" label="承运商" rules={[{ required: true, message: '请选择承运商' }]}>
                  <select aria-label="公司渠道承运商" className="native-select">
                    {masterData.carriers.map((carrier) => (
                      <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
                    ))}
                  </select>
                </Form.Item>
              ) : (
                <Form.Item name="carrierName" label="承运商" rules={[{ required: true, whitespace: true, message: '请输入承运商' }]}>
                  <Input placeholder="例如 UPS / DHL / FEDEX" />
                </Form.Item>
              )}
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="businessType" label="业务类型" rules={[{ required: true, message: '请选择业务类型' }]}>
                <select aria-label="公司渠道业务类型" className="native-select">
                  {Object.entries(businessTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="category" label="渠道类别" rules={[{ required: true, message: '请选择渠道类别' }]}>
                <select aria-label="公司渠道类别" className="native-select">
                  {companyChannelCategoryFormOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="enabled" label="状态" initialValue="true">
                <select aria-label="公司渠道状态" className="native-select">
                  <option value="true">启用</option>
                  <option value="false">停用</option>
                </select>
              </Form.Item>
            </Col>
          </Row>
          <Title level={5}>计算规则</Title>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="volumeDivisor" label="除材积" rules={[{ required: true, message: '请输入除材积' }]}>
                <Input type="number" min={1} placeholder="5000" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="multiPieceWeightRule" label="多件重量计算方式" rules={[{ required: true, message: '请选择多件重量计算方式' }]}>
                <select aria-label="多件重量计算方式" className="native-select">
                  {multiPieceWeightRuleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="singleWeightRoundingRule" label="单件重量进位规则" rules={[{ required: true, message: '请选择单件重量进位规则' }]}>
                <select aria-label="单件重量进位规则" className="native-select">
                  {singleWeightRoundingRuleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="settlementWeightRule" label="结算重量计算规则" rules={[{ required: true, message: '请选择结算重量计算规则' }]}>
                <select aria-label="结算重量计算规则" className="native-select">
                  {settlementWeightRuleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="settlementWeightRoundingRule" label="结算重量进位规则" rules={[{ required: true, message: '请选择结算重量进位规则' }]}>
                <select aria-label="结算重量进位规则" className="native-select">
                  {settlementWeightRoundingRuleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="largeCargoThresholdKg" label="大货起始重量">
                <Input type="number" min={0} placeholder="默认单位 KG" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="remoteAreaRule" label="偏远规则" rules={[{ required: true, whitespace: true, message: '请选择或填写偏远规则' }]}>
                <Input list="company-channel-remote-options" placeholder="DHL偏远 / UPS偏远 / FEDEX偏远 / 无偏远 / 自定义" />
              </Form.Item>
            </Col>
          </Row>
          <datalist id="company-channel-remote-options">
            {remoteAreaRuleOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
        </Form>
      </Modal>
      <Modal
        title={editingMasterAgentChannel ? '编辑代理渠道' : '新建代理渠道'}
        open={masterAgentChannelOpen}
        destroyOnHidden
        okText={editingMasterAgentChannel ? '保存代理渠道' : '创建代理渠道'}
        cancelText="取消"
        width={520}
        onOk={() => void handleSubmitMasterAgentChannel()}
        onCancel={() => {
          setMasterAgentChannelOpen(false);
          setEditingMasterAgentChannel(null);
          masterAgentChannelForm.resetFields();
        }}
      >
        <Form form={masterAgentChannelForm} layout="vertical">
          <Form.Item name="agentId" label="代理" rules={[{ required: true, message: '请选择代理' }]}>
            <select aria-label="代理渠道所属代理" className="native-select">
              {agentRows.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.shortName}</option>
              ))}
            </select>
          </Form.Item>
          <Form.Item name="channelName" label="渠道名称" rules={[{ required: true, whitespace: true, message: '请输入渠道名称' }]}>
            <Input placeholder="例如 宇环 DHL" />
          </Form.Item>
          <Form.Item name="enabled" label="状态" initialValue="true">
            <select aria-label="代理渠道状态" className="native-select">
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={editingMasterCustomer ? '编辑客户' : '新建客户'}
        open={masterCustomerOpen}
        destroyOnHidden
        okText={editingMasterCustomer ? '保存客户' : '创建客户'}
        cancelText="取消"
        width={560}
        onOk={() => void handleSubmitMasterCustomer()}
        onCancel={() => {
          setMasterCustomerOpen(false);
          setEditingMasterCustomer(null);
          masterCustomerForm.resetFields();
        }}
      >
        <Alert
          className="notice-bar"
          type="info"
          showIcon
          message="客户资料维护客户主数据、业务员、结算信息和收货人；删除会停用客户，不做物理删除。"
        />
        <Form form={masterCustomerForm} layout="vertical">
          <Form.Item
            name="customerCode"
            label="客户编码"
            rules={[{ required: true, whitespace: true, message: '请输入客户编码' }]}
          >
            <Input placeholder="例如 9409" />
          </Form.Item>
          <Form.Item
            name="customerShortName"
            label="客户简称"
            rules={[{ required: true, whitespace: true, message: '请输入客户简称' }]}
          >
            <Input placeholder="例如 Daloday" />
          </Form.Item>
          <Form.Item
            name="customerFullName"
            label="客户全称"
            rules={[{ required: true, whitespace: true, message: '请输入客户全称' }]}
          >
            <Input placeholder="例如 Daloday Inc." />
          </Form.Item>
          <Form.Item
            name="customerType"
            label="客户类型"
            rules={[{ required: true, whitespace: true, message: '请输入客户类型' }]}
          >
            <Input placeholder="例如 直客" />
          </Form.Item>
          <Form.Item name="customerSource" label="客户来源">
            <Input placeholder="例如 展会、转介绍、线上询盘" />
          </Form.Item>
          <Form.Item name="salesperson" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="业务员" htmlFor="salespersonReadonly">
            <Input id="salespersonReadonly" aria-label="业务员" value={currentSalesperson} disabled />
          </Form.Item>
          <Form.Item
            name="defaultSettlementMethod"
            label="结算信息"
            rules={[{ required: true, whitespace: true, message: '请输入结算信息' }]}
          >
            <Input placeholder="例如 RMB月结" />
          </Form.Item>
          <Form.Item
            name="customerEnabled"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <select className="native-select" aria-label="客户状态">
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={editingMasterCustomerContact ? '编辑收货人' : selectedCustomer ? `${selectedCustomer.code}-${selectedCustomer.name} 新增收货人` : '新增收货人'}
        open={masterCustomerContactOpen}
        destroyOnHidden
        okText="保存收货人"
        cancelText="取消"
        width={620}
        onOk={() => void handleSubmitMasterCustomerContact()}
        onCancel={() => {
          setMasterCustomerContactOpen(false);
          setEditingMasterCustomerContact(null);
          masterCustomerContactForm.resetFields();
        }}
      >
        <Form form={masterCustomerContactForm} layout="vertical">
          <Form.Item
            name="receiverName"
            label="收货人"
            rules={[{ required: true, whitespace: true, message: '请输入收货人' }]}
          >
            <Input placeholder="例如 Daloday Contact" />
          </Form.Item>
          <Form.Item name="receiverCompany" label="公司">
            <Input placeholder="例如 Daloday Inc." />
          </Form.Item>
          <Form.Item name="receiverPhone" label="电话">
            <Input placeholder="例如 13800000001" />
          </Form.Item>
          <Form.Item name="receiverEmail" label="邮箱">
            <Input placeholder="例如 receiver@example.com" />
          </Form.Item>
          <Form.Item name="receiverAddress" label="地址">
            <Input placeholder="例如 9409 Sample Street" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="receiverCountry" label="国家">
                <Input placeholder="US" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="receiverState" label="州/省">
                <Input placeholder="CA" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="receiverPostalCode" label="邮编">
                <Input placeholder="90001" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      <Modal
        title={editingMasterAgent ? '编辑代理' : '新建代理'}
        open={masterAgentOpen}
        destroyOnHidden
        okText={editingMasterAgent ? '保存代理' : '创建代理'}
        cancelText="取消"
        width={620}
        onOk={() => void handleSubmitMasterAgent()}
        onCancel={() => {
          setMasterAgentOpen(false);
          setEditingMasterAgent(null);
          masterAgentForm.resetFields();
        }}
      >
        <Form form={masterAgentForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="agentCode"
                label="代理编码"
                rules={[{ required: true, whitespace: true, message: '请输入代理编码' }]}
              >
                <Input placeholder="例如 SZJST" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="agentShortName"
                label="代理简称"
                rules={[{ required: true, whitespace: true, message: '请输入代理简称' }]}
              >
                <Input placeholder="例如 加时特" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item
                name="agentName"
                label="代理详细公司名"
                rules={[{ required: true, whitespace: true, message: '请输入代理详细公司名' }]}
              >
                <Input placeholder="例如 深圳加时特" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="warehouseAddress1" label="仓库地址一">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="warehouseAddress2" label="仓库地址二">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="warehouseAddress3" label="仓库地址三">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="warehouseContact" label="仓库联系人">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="invoiceTemplateName" label="发票模板名称">
                <Input placeholder="例如 代理发票模板.xlsx" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="上传点">
                <Space.Compact className="full-width">
                  <Form.Item name="invoiceTemplateUrl" noStyle>
                    <Input
                      aria-label="上传点"
                      placeholder="上传或粘贴 Excel 后自动填充"
                      onPaste={handleAgentInvoicePaste}
                    />
                  </Form.Item>
                  <Upload
                    accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      void handleAgentInvoiceTemplate(file as File);
                      return false;
                    }}
                  >
                    <Button>上传模板</Button>
                  </Upload>
                </Space.Compact>
              </Form.Item>
            </Col>
            {canReadAgentBanks ? (
              <>
                <Col xs={24}>
                  <Title level={5}>收款方银行信息</Title>
                </Col>
                <Col xs={24}>
                  <Form.Item name="bankAccountName" label="收款方">
                    <Input placeholder="例如 深圳市鲸链国际物流有限公司" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="bankAccountNo" label="银行账号">
                    <Input placeholder="例如 755972950810001" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="bankName" label="开户银行">
                    <Input placeholder="例如 招商银行深圳福永支行" />
                  </Form.Item>
                </Col>
              </>
            ) : null}
            <Col xs={24} md={12}>
              <Form.Item name="agentEnabled" label="状态" initialValue="true">
                <select aria-label="代理状态" className="native-select">
                  <option value="true">启用</option>
                  <option value="false">停用</option>
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="agentIntegrationType" label="代理对接类型" initialValue="MANUAL">
                <select aria-label="代理对接类型" className="native-select">
                  <option value="MANUAL">手工</option>
                  <option value="API">API 对接</option>
                  <option value="PLATFORM">平台对接</option>
                  <option value="OTHER">其他</option>
                </select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </AppPage>
  );
}
