import { useEffect, useState, type ClipboardEvent } from 'react';
import { AlertTriangle, Bot, Building2, CheckCircle, Download, Edit, FileText, Plus, Power, Route, Settings, Sparkles, Trash2, Upload as UploadIcon, UserRound, Users } from 'lucide-react';
import { Alert, AutoComplete, Button, Card, Checkbox, Col, Flex, Form, Input, Modal, Popconfirm, Row, Select, Space, Tag, Typography, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { companyChannelBusinessTypeLabels, summarizeMasterDataSnapshot, type AgentBankAccountSummary, type AgentChannelSummary, type AgentIntegrationType, type AgentSummary, type ChannelCategorySummary, type ChannelSummary, type CompanyChannelBusinessType, type CompanyChannelMinimumChargeUnit, type CustomerContactSummary, type CustomerSourceSummary, type CustomerSummary, type ExchangeRateSummary, type MasterDataSnapshot, type StaffAccountSummary } from '@siyuan/shared';
import { ApiClient, type PermissionKey, type Principal } from '../../apiClient';
import { FinanceCatalogPage } from '../finance/FinanceCatalogPage';
import { useFinanceCatalog } from '../finance/useFinanceCatalog';
import { PayerBankAccountsPage } from './PayerBankAccountsPage';
import { CustomerSourcesPage } from './CustomerSourcesPage';
import { ModuleSubWorkspace, type ModuleSubNavItem } from '../shared/ModuleSubWorkspace';
import { agentFieldLabels } from '../shared/agentFieldLabels';
import { getGlobalFieldMaskVisibility } from '../shared/globalFieldMask';
import { AppActionGroup, AppDatePicker, AppPage, AppPageHeader, ManagedTable, MetricCard, renderFilterActions, renderFilterField, renderNoticeBar, tenRowTablePagination } from '../shared/ui';
import { formatBeijingDate, formatBeijingDateTime, formatBusinessDate } from '../shared/format';

const { Title, Text } = Typography;

interface MasterCustomerFormValues {
  customerCode: string;
  customerName: string;
  customerSource: string;
  saveCustomerSourceToCatalog?: boolean;
  salesperson?: string;
  defaultSettlementMethod: string;
  contacts?: MasterCustomerContactFormValues[];
}

const customerSalespersonRoles = new Set([
  'OPERATOR',
  'UG_BUSINESS',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR'
]);

export function isCustomerSalesperson(account: Pick<StaffAccountSummary, 'enabled' | 'role'>) {
  return account.enabled && customerSalespersonRoles.has(account.role);
}

interface MasterCustomerContactFormValues {
  receiverName: string;
  receiverCompany?: string;
  receiverPhone?: string;
  fbaWarehouseCode?: string;
  receiverAddress?: string;
  receiverCountry?: string;
  receiverState?: string;
  receiverPostalCode?: string;
}

interface MasterAgentFormValues {
  agentCode?: string;
  agentShortName: string;
  agentName: string;
  settlementCycle?: AgentSummary['settlementCycle'];
  warehouses: MasterAgentWarehouseFormValues[];
  invoiceTemplates: MasterAgentInvoiceTemplateFormValues[];
  trackingWebsite: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankName: string;
  bankAccounts: MasterAgentBankAccountFormValues[];
  agentIntegrationType?: AgentIntegrationType;
  agentEnabled?: 'true' | 'false';
}

interface MasterAgentInvoiceTemplateFormValues {
  id?: string;
  name?: string;
  url?: string;
}

export type InvoiceTemplateFileKind = 'xls' | 'xlsx';

function invoiceTemplateFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
}

export function detectInvoiceTemplateFileKind(bytes: Uint8Array): InvoiceTemplateFileKind | null {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'xlsx';
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return 'xls';
  return null;
}

async function readInvoiceTemplatePrefix(file: File): Promise<Uint8Array> {
  const slice = file.slice(0, 4);
  if (typeof slice.arrayBuffer === 'function') {
    return new Uint8Array(await slice.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('无法读取 Excel 文件'));
    reader.readAsArrayBuffer(slice);
  });
}

export async function normalizeInvoiceTemplateFile(file: File): Promise<{ file: File; corrected: boolean; kind: InvoiceTemplateFileKind }> {
  const extension = invoiceTemplateFileExtension(file.name);
  if (extension !== '.xls' && extension !== '.xlsx') {
    throw new Error('请上传 .xls/.xlsx 发票模板');
  }
  const bytes = await readInvoiceTemplatePrefix(file);
  const kind = detectInvoiceTemplateFileKind(bytes);
  if (!kind) {
    throw new Error('Excel 文件内容无法识别，请重新导出为 .xls 或 .xlsx 文件');
  }
  const expectedExtension = `.${kind}`;
  if (extension === expectedExtension) return { file, corrected: false, kind };
  const correctedName = `${file.name.slice(0, -extension.length)}${expectedExtension}`;
  const correctedFile = new File([file], correctedName, {
    type: kind === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/vnd.ms-excel',
    lastModified: file.lastModified
  });
  return { file: correctedFile, corrected: true, kind };
}

interface MasterAgentWarehouseFormValues {
  address?: string;
  contactName?: string;
  contactPhone?: string;
}

interface MasterAgentBankAccountFormValues {
  id?: string;
  accountName?: string;
  bankName?: string;
  bankAccountNo?: string;
  currency?: string;
  remark?: string;
  enabled?: 'true' | 'false';
}

interface MasterAgentChannelFormValues {
  agentId: string;
  channelName: string;
  enabled: 'true' | 'false';
}

interface MasterCompanyChannelFormValues {
  name: string;
  carrierId?: string;
  businessType: CompanyChannelBusinessType;
  category?: string;
  volumeDivisor: string;
  multiPieceWeightRule: string;
  singleWeightRoundingRule: string;
  settlementWeightRule: string;
  settlementWeightRoundingRule: string;
  largeCargoThresholdKg: string;
  overweightWarningThresholdKg: string;
  overGirthLengthWidthHeightThresholdCm: string;
  overGirthLengthPlusTwoWidthHeightThresholdCm: string;
  perPieceMinimumChargeWeightKg: string;
  perShipmentMinimumCharge: string;
  perShipmentMinimumChargeUnit: CompanyChannelMinimumChargeUnit;
  densityRatio: string;
  remoteAreaRule?: string;
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

function formatMasterDateTime(value?: string) {
  return value ? formatBeijingDateTime(value) : '-';
}

function compareMasterCreatedAt(left?: string, right?: string) {
  const leftTime = left ? Date.parse(left) : 0;
  const rightTime = right ? Date.parse(right) : 0;
  return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
}

const multiPieceWeightRuleOptions = [
  { value: 'SUM_THEN_COMPARE', label: '先累加再比较' },
  { value: 'COMPARE_ROUND_THEN_SUM', label: '先比较进位再累加' },
  { value: 'COMPARE_THEN_SUM', label: '先比较再累加' },
  { value: 'SUM_THEN_COMPARE_ROUND', label: '先累加再比较进位' }
];
const multiPieceWeightRuleDescriptions: Record<string, string> = {
  SUM_THEN_COMPARE: '实重、材积重分别累加 → 按结算规则取值 → 应用整票进位规则',
  COMPARE_ROUND_THEN_SUM: '逐件按结算规则取值 → 单件进位 → 累加 → 应用整票进位规则',
  COMPARE_THEN_SUM: '逐件按结算规则取值 → 不做单件进位 → 累加 → 应用整票进位规则',
  SUM_THEN_COMPARE_ROUND: '实重、材积重分别累加 → 按结算规则取值 → 结果进位 → 应用整票进位规则'
};
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
const agentSettlementCycleOptions = [
  { value: 'WEEKLY', label: '周结' },
  { value: 'MONTHLY', label: '月结' },
  { value: 'PER_SHIPMENT', label: '单票结算' }
];

function settlementCycleLabel(value?: AgentSummary['settlementCycle']) {
  return agentSettlementCycleOptions.find((option) => option.value === value)?.label ?? '-';
}
const optionLabel = (options: Array<{ value: string; label: string }>, value?: string) => options.find((item) => item.value === value)?.label ?? value ?? '-';
const currencyNames: Record<string, string> = { USD: '美金', RMB: '人民币', CNY: '人民币', EUR: '欧元', GBP: '英镑', HKD: '港币' };
const currencyName = (code: string) => currencyNames[code.toUpperCase()] ?? code.toUpperCase();
const todayDate = () => formatBeijingDate(new Date());
const MAX_AGENT_WAREHOUSES = 3;
const MAX_AGENT_BANK_ACCOUNTS = 3;
const MAX_AGENT_INVOICE_TEMPLATES = 20;
const agentItemOrdinals = ['一', '二', '三'];
const emptyAgentWarehouse = (): MasterAgentWarehouseFormValues => ({ address: '', contactName: '', contactPhone: '' });
const emptyAgentBankAccounts = (): MasterAgentBankAccountFormValues[] => [{ currency: 'RMB', enabled: 'true' }];
const optionalPositiveRule = { pattern: /^$|^(?:0*[1-9]\d*(?:\.\d+)?|0*\.\d*[1-9]\d*)$/, message: '请输入大于 0 的数值' };
const optionalFormNumber = (value?: string) => value?.trim() ? Number(value) : null;
function agentWarehouses(agent?: AgentSummary): MasterAgentWarehouseFormValues[] {
  const addresses = [agent?.warehouseAddress1, agent?.warehouseAddress2, agent?.warehouseAddress3];
  const contactNames = [agent?.warehouseContactName1 ?? agent?.warehouseContact, agent?.warehouseContactName2, agent?.warehouseContactName3];
  const contactPhones = [agent?.warehouseContactPhone1, agent?.warehouseContactPhone2, agent?.warehouseContactPhone3];
  const warehouses = addresses.map((address, index) => ({
    address: address?.trim() ?? '',
    contactName: contactNames[index]?.trim() ?? '',
    contactPhone: contactPhones[index]?.trim() ?? ''
  })).filter((warehouse) => Boolean(warehouse.address || warehouse.contactName || warehouse.contactPhone));
  return warehouses.length ? warehouses : [emptyAgentWarehouse()];
}
function formatWarehouseContact(name?: string, phone?: string) {
  return [name?.trim(), phone?.trim()].filter(Boolean).join(' / ') || '-';
}
function agentBankAccountTime(row: AgentBankAccountSummary) {
  return Date.parse(row.updatedAt ?? row.createdAt ?? '') || 0;
}
function matchesAgentBank(agent: AgentSummary, bank: AgentBankAccountSummary) {
  return bank.agentId === agent.id || bank.agentName === agent.name || bank.agentName === agent.shortName;
}
function sortAgentBanks(rows: AgentBankAccountSummary[]) {
  return [...rows].sort((left, right) => agentBankAccountTime(right) - agentBankAccountTime(left));
}
export function MasterDataPage({
  apiClient,
  initialSection,
  masterData,
  permissions,
  currentUser,
  notice,
  onMasterDataChange,
  onNotice,
  onAiAssist,
  aiLoading
}: {
  apiClient: ApiClient;
  initialSection?: string;
  masterData: MasterDataSnapshot;
  permissions: PermissionKey[];
  currentUser: Principal;
  notice: string | null;
  onMasterDataChange: (updater: (current: MasterDataSnapshot) => MasterDataSnapshot) => void;
  onNotice: (message: string) => void;
  onAiAssist: (input: { module?: string; task?: string; scenario?: string; prompt: string; context?: Record<string, unknown> }) => Promise<void>;
  aiLoading: boolean;
}) {
  const summary = summarizeMasterDataSnapshot(masterData);
  const currentSalesperson = currentUser.username;
  const fieldVisibility = getGlobalFieldMaskVisibility(currentUser.role, permissions);
  const [masterCustomerForm] = Form.useForm<MasterCustomerFormValues>();
  const watchedCustomerSource = Form.useWatch('customerSource', masterCustomerForm) ?? '';
  const [masterCustomerContactForm] = Form.useForm<MasterCustomerContactFormValues>();
  const [masterAgentForm] = Form.useForm<MasterAgentFormValues>();
  const [masterAgentChannelForm] = Form.useForm<MasterAgentChannelFormValues>();
  const [masterCompanyChannelForm] = Form.useForm<MasterCompanyChannelFormValues>();
  const watchedMultiPieceWeightRule = Form.useWatch('multiPieceWeightRule', masterCompanyChannelForm) ?? 'SUM_THEN_COMPARE';
  const watchedPerShipmentMinimumChargeUnit = Form.useWatch('perShipmentMinimumChargeUnit', masterCompanyChannelForm) ?? 'KG';
  const usesIntermediateWeightRounding = watchedMultiPieceWeightRule === 'COMPARE_ROUND_THEN_SUM'
    || watchedMultiPieceWeightRule === 'SUM_THEN_COMPARE_ROUND';
  const intermediateWeightRoundingLabel = watchedMultiPieceWeightRule === 'COMPARE_ROUND_THEN_SUM'
    ? '单件重量进位规则'
    : watchedMultiPieceWeightRule === 'SUM_THEN_COMPARE_ROUND'
      ? '比较后进位规则'
      : '中间进位规则';
  const [masterChannelCategoryForm] = Form.useForm<MasterChannelCategoryFormValues>();
  const [masterExchangeRateForm] = Form.useForm<MasterExchangeRateFormValues>();
  const [masterCustomerOpen, setMasterCustomerOpen] = useState(false);
  const [customerSources, setCustomerSources] = useState<CustomerSourceSummary[]>([]);
  const [customerSourcesLoading, setCustomerSourcesLoading] = useState(false);
  const [salespersonAccounts, setSalespersonAccounts] = useState<StaffAccountSummary[]>([]);
  const [salespersonAccountsLoading, setSalespersonAccountsLoading] = useState(false);
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
  const [uploadingInvoiceTemplateIndex, setUploadingInvoiceTemplateIndex] = useState<number | null>(null);
  const [invoiceUploadInputVersion, setInvoiceUploadInputVersion] = useState(0);
  const [customerFilters, setCustomerFilters] = useState({
    name: '',
    code: '',
    status: 'ALL',
    customerSource: '',
    salesperson: ''
  });
  const [appliedCustomerFilters, setAppliedCustomerFilters] = useState(customerFilters);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [customerListSettingOpen, setCustomerListSettingOpen] = useState(false);
  const [customerDisableConfirmOpen, setCustomerDisableConfirmOpen] = useState(false);
  const [showCustomerStatus, setShowCustomerStatus] = useState(true);
  const [agentFilters, setAgentFilters] = useState({
    name: '',
    code: '',
    status: 'ALL',
    integrationType: 'ALL'
  });
  const [appliedAgentFilters, setAppliedAgentFilters] = useState(agentFilters);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [agentDisableConfirmOpen, setAgentDisableConfirmOpen] = useState(false);
  const [agentChannelFilters, setAgentChannelFilters] = useState({ agentId: 'ALL', channelName: '', status: 'ALL' });
  const [appliedAgentChannelFilters, setAppliedAgentChannelFilters] = useState(agentChannelFilters);
  const [selectedAgentChannelId, setSelectedAgentChannelId] = useState<string | null>(null);
  const [companyChannelFilters, setCompanyChannelFilters] = useState({ keyword: '', businessType: 'ALL', category: 'ALL', status: 'ALL' });
  const [appliedCompanyChannelFilters, setAppliedCompanyChannelFilters] = useState(companyChannelFilters);
  const [selectedCompanyChannelIds, setSelectedCompanyChannelIds] = useState<string[]>([]);
  const [channelCategoryFilters, setChannelCategoryFilters] = useState({ name: '', status: 'ALL' });
  const [appliedChannelCategoryFilters, setAppliedChannelCategoryFilters] = useState(channelCategoryFilters);
  const [selectedChannelCategoryId, setSelectedChannelCategoryId] = useState<string | null>(null);
  const [editingMasterExchangeRate, setEditingMasterExchangeRate] = useState<ExchangeRateSummary | null>(null);
  const [activeMasterSection, setActiveMasterSection] = useState(initialSection ?? 'financeCatalog');
  const financeCatalog = useFinanceCatalog(apiClient, activeMasterSection === 'financeCatalog');
  const hasMasterPermission = (...keys: PermissionKey[]) => currentUser.role === 'ADMIN' || keys.some((key) => permissions.includes(key));
  const canReadCustomers = hasMasterPermission('master-data:customers:read');
  const canCreateCustomers = hasMasterPermission('master-data:customers:create');
  const canUpdateCustomers = hasMasterPermission('master-data:customers:update');
  const canEnableCustomers = canUpdateCustomers;
  const canDeleteCustomers = hasMasterPermission('master-data:customers:delete');
  const canExportCustomers = hasMasterPermission('master-data:customers:export');
  const canWriteCustomers = canCreateCustomers || canUpdateCustomers;
  const canDeleteCustomerSources = hasMasterPermission('master-data:customers:delete');
  const canManageCustomerContacts = hasMasterPermission('master-data:customers:contacts-manage');
  const canDisableCustomerContacts = canManageCustomerContacts;
  const canAssignCustomerSalesperson = canUpdateCustomers;

  useEffect(() => {
    if (initialSection) setActiveMasterSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (!masterCustomerOpen || !canAssignCustomerSalesperson) return undefined;
    let active = true;
    setSalespersonAccountsLoading(true);
    void apiClient.staffAccounts({ status: 'ENABLED' })
      .then((rows) => {
        if (!active) return;
        setSalespersonAccounts(rows.filter(isCustomerSalesperson));
      })
      .catch((error) => {
        if (active) onNotice(error instanceof Error ? `业务员选项加载失败：${error.message}` : '业务员选项加载失败');
      })
      .finally(() => {
        if (active) setSalespersonAccountsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiClient, canAssignCustomerSalesperson, masterCustomerOpen, onNotice]);
  useEffect(() => {
    if (!masterCustomerOpen || !canReadCustomers) return undefined;
    let active = true;
    setCustomerSourcesLoading(true);
    void apiClient.customerSources()
      .then((response) => {
        if (active) setCustomerSources(response.items);
      })
      .catch((error) => {
        if (active) onNotice(error instanceof Error ? `客户来源选项加载失败：${error.message}` : '客户来源选项加载失败');
      })
      .finally(() => {
        if (active) setCustomerSourcesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiClient, canReadCustomers, masterCustomerOpen, onNotice]);
  const canReadFinanceCatalog = hasMasterPermission('master-data:finance:read');
  const financeCatalogCapabilities = {
    FEE_NAME: {
      create: hasMasterPermission('master-data:finance:fee-name:create'),
      update: hasMasterPermission('master-data:finance:fee-name:update'),
      delete: hasMasterPermission('master-data:finance:fee-name:delete'),
      reorder: hasMasterPermission('master-data:finance:fee-name:reorder')
    },
    SETTLEMENT_METHOD: {
      create: hasMasterPermission('master-data:finance:settlement:create'),
      update: hasMasterPermission('master-data:finance:settlement:update'),
      delete: hasMasterPermission('master-data:finance:settlement:delete')
    },
    CARGO_TYPE: {
      create: hasMasterPermission('master-data:finance:cargo-type:create'),
      update: hasMasterPermission('master-data:finance:cargo-type:update'),
      delete: hasMasterPermission('master-data:finance:cargo-type:delete')
    },
    PRODUCT_NAME: {
      create: hasMasterPermission('master-data:finance:product-name:create'),
      update: hasMasterPermission('master-data:finance:product-name:update'),
      delete: hasMasterPermission('master-data:finance:product-name:delete')
    }
  } as const;
  // 付款方银行资料属于公司付款信息，不应因为代理字段被屏蔽而
  // 一并消失；它只受应付成本总规则和本模块权限控制。
  const canReadPayerBanks = fieldVisibility.showPayableCost
    && hasMasterPermission('master-data:payer-banks:read');
  const canCreatePayerBanks = canReadPayerBanks && hasMasterPermission('master-data:payer-banks:create');
  const canUpdatePayerBanks = canReadPayerBanks && hasMasterPermission('master-data:payer-banks:update');
  const canDeletePayerBanks = canReadPayerBanks && hasMasterPermission('master-data:payer-banks:delete');
  const canReadAgents = fieldVisibility.showAgentData
    && hasMasterPermission('master-data:agents:read');
  const canCreateAgents = canReadAgents
    && fieldVisibility.showAgentShortName
    && fieldVisibility.showAgentCompanyName
    && hasMasterPermission('master-data:agents:create');
  const canUpdateAgents = canReadAgents
    && fieldVisibility.showAgentShortName
    && fieldVisibility.showAgentCompanyName
    && hasMasterPermission('master-data:agents:update');
  const canDeleteAgents = canReadAgents && hasMasterPermission('master-data:agents:delete');
  const canReadAgentChannels = fieldVisibility.showAgentData
    && fieldVisibility.showAgentChannel
    && hasMasterPermission('master-data:agent-channels:read');
  const canCreateAgentChannels = canReadAgentChannels
    && fieldVisibility.showAgentShortName
    && hasMasterPermission('master-data:agent-channels:create');
  const canUpdateAgentChannels = canReadAgentChannels
    && fieldVisibility.showAgentShortName
    && hasMasterPermission('master-data:agent-channels:update');
  const canDeleteAgentChannels = canReadAgentChannels && hasMasterPermission('master-data:agent-channels:delete');
  const canReadChannels = hasMasterPermission('master-data:channels:read');
  const canCreateChannels = hasMasterPermission('master-data:channels:create');
  const canUpdateChannels = hasMasterPermission('master-data:channels:update');
  const canManageChannelWarnings = canUpdateChannels;
  const canManageChannelMinimumCharges = canUpdateChannels;
  const canDeleteChannels = hasMasterPermission('master-data:channels:delete');
  const canReadChannelCategories = hasMasterPermission('master-data:channel-categories:read');
  const canCreateChannelCategories = hasMasterPermission('master-data:channel-categories:create');
  const canUpdateChannelCategories = hasMasterPermission('master-data:channel-categories:update');
  const canDeleteChannelCategories = hasMasterPermission('master-data:channel-categories:delete');
  const canReadRemoteAreas = hasMasterPermission('master-data:remote-areas:read');
  const canUploadRemoteAreas = hasMasterPermission('master-data:remote-areas:file-upload');
  const canDeleteRemoteAreas = hasMasterPermission('master-data:remote-areas:file-delete');
  const canReadExchangeRates = hasMasterPermission('master-data:exchange-rates:read');
  const canCreateExchangeRates = hasMasterPermission('master-data:exchange-rates:create');
  const canUpdateExchangeRates = hasMasterPermission('master-data:exchange-rates:update');
  const canDisableExchangeRates = hasMasterPermission('master-data:exchange-rates:disable');
  const canReadAssistant = hasMasterPermission('master-data:assistant:read');
  const canReadAgentBanks = canReadAgents
    && fieldVisibility.showAgentData
    && fieldVisibility.showAgentShortName
    && fieldVisibility.showAgentCompanyName
    && fieldVisibility.showAgentChannel
    && fieldVisibility.showPayableCost;
  const canCreateAgentBanks = canReadAgentBanks && canCreateAgents;
  const canUpdateAgentBanks = canReadAgentBanks && canUpdateAgents;
  const normalizedWatchedCustomerSource = watchedCustomerSource.trim().toLocaleLowerCase('zh-CN');
  const watchedCustomerSourceExists = Boolean(normalizedWatchedCustomerSource)
    && customerSources.some((source) => source.enabled && source.normalizedName === normalizedWatchedCustomerSource);
  const showSaveCustomerSourceOption = Boolean(normalizedWatchedCustomerSource) && !watchedCustomerSourceExists;
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
    ...(canReadCustomers ? [{ key: 'customers', label: '客户资料', description: '业务员归属、客户编号、客户名称' }] : []),
    ...(canReadCustomers ? [{ key: 'customerSources', label: '客户来源', description: '获客来源选项与使用状态' }] : []),
    ...(canReadFinanceCatalog ? [{ key: 'financeCatalog', label: '财务资料', description: '费用、结算、货物、品名' }] : []),
    ...(canReadPayerBanks ? [{ key: 'payerBanks', label: '付款银行资料', description: '付款银行、户名与账号' }] : []),
    ...(canReadAgents ? [
      { key: 'agents', label: '代理资料', description: '代理简称、详细公司名、仓库与模板' },
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
    customerSource: customer.customerSource ?? '',
    salesperson: customer.salesperson || '未分配',
    defaultSettlementMethod: customer.defaultSettlementMethod ?? ''
  }));
  const filteredCustomerRows = customerRows.filter((customer) => {
    const nameKeyword = appliedCustomerFilters.name.trim().toLowerCase();
    const codeKeyword = appliedCustomerFilters.code.trim().toLowerCase();
    const salespersonKeyword = appliedCustomerFilters.salesperson.trim().toLowerCase();
    const sourceKeyword = appliedCustomerFilters.customerSource.trim().toLowerCase();
    const matchesName = !nameKeyword || `${customer.code} ${customer.name}`.toLowerCase().includes(nameKeyword);
    const matchesCode = !codeKeyword || customer.code.toLowerCase().includes(codeKeyword);
    const matchesSalesperson = !salespersonKeyword || customer.salesperson.toLowerCase().includes(salespersonKeyword);
    const matchesSource = !sourceKeyword || customer.customerSource.toLowerCase().includes(sourceKeyword);
    const matchesStatus =
      appliedCustomerFilters.status === 'ALL' ||
      (appliedCustomerFilters.status === 'ENABLED' ? customer.enabled : !customer.enabled);
    return matchesName && matchesCode && matchesSalesperson && matchesSource && matchesStatus;
  });
  const selectedCustomer = customerRows.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedCustomerForAction = selectedCustomerIds.length === 1
    ? customerRows.find((customer) => customer.id === selectedCustomerIds[0]) ?? null
    : null;
  const selectedCustomerContacts = selectedCustomer
    ? masterData.contacts.filter((contact) => contact.customerId === selectedCustomer.id && contact.enabled)
    : [];
  const customerMetrics = {
    total: customerRows.length,
    enabled: customerRows.filter((customer) => customer.enabled).length,
    missingSettlement: customerRows.filter((customer) => !customer.defaultSettlementMethod).length,
    contacts: masterData.contacts.filter((contact) => contact.enabled).length
  };
  const salespersonFilterOptions = Array.from(new Set(customerRows.map((customer) => customer.salesperson).filter(Boolean)));
  const customerContactsById = new Map(customerRows.map((customer) => [
    customer.id,
    masterData.contacts.filter((contact) => contact.customerId === customer.id && contact.enabled)
  ]));
  useEffect(() => {
    if (activeMasterSection !== 'customers') return;
    if (!filteredCustomerRows.length) {
      setSelectedCustomerId(null);
      setSelectedCustomerIds((current) => current.length ? [] : current);
      return;
    }
    setSelectedCustomerIds((current) => {
      const nextIds = current.filter((id) => filteredCustomerRows.some((customer) => customer.id === id));
      return nextIds.length === current.length ? current : nextIds;
    });
    if (!selectedCustomerId || !filteredCustomerRows.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(filteredCustomerRows[0].id);
    }
  }, [activeMasterSection, filteredCustomerRows, selectedCustomerId]);
  const customerColumns: ColumnsType<(typeof customerRows)[number]> = [
    { title: '业务员归属', dataIndex: 'salesperson', width: 120 },
    { title: '客户编号', dataIndex: 'code', width: 120, render: (value: string) => <Text strong>{value}</Text> },
    { title: '客户名称', dataIndex: 'name', width: 180, render: (value: string) => <Text strong>{value}</Text> },
    { title: '客户来源', dataIndex: 'customerSource', width: 140, render: (value?: string) => value || '-' },
    { title: '结算方式', dataIndex: 'defaultSettlementMethod', width: 130, render: (value: string) => value ? <Tag color="green">{value}</Tag> : <Tag color="orange">缺失</Tag> },
    { title: '收货人', width: 90, render: (_value, record) => customerContactsById.get(record.id)?.length ?? 0 },
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
      width: 180,
      fixed: 'right',
      render: (_value, record) => (
        <Space size={6}>
          {canUpdateCustomers ? <Button size="small" type="link" onClick={(event) => { event.stopPropagation(); void handleEditMasterCustomer(record); }}>编辑</Button> : null}
          {canEnableCustomers ? <Popconfirm
            title={`确认${record.enabled ? '停用' : '启用'}该客户？`}
            okText={`确认${record.enabled ? '停用' : '启用'}`}
            cancelText="取消"
            okButtonProps={{ danger: record.enabled }}
            onConfirm={() => record.enabled ? handleDisableMasterCustomer(record) : handleEnableMasterCustomer(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger={record.enabled} onClick={(event) => event.stopPropagation()}>
              {record.enabled ? '停用' : '启用'}
            </Button>
          </Popconfirm> : null}
          {canDeleteCustomers ? <Popconfirm
            title="删除客户资料"
            description="删除后不可恢复，请确认该客户无未完成运单、费用或收款记录。"
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteMasterCustomer(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger onClick={(event) => event.stopPropagation()}>
              删除
            </Button>
          </Popconfirm> : null}
        </Space>
      )
    }
  ];
  const customerContactColumns: ColumnsType<CustomerContactSummary> = [
    { title: '收货信息', width: 110, render: (_value, _record, index) => `收货信息${['一', '二', '三', '四'][index] ?? index + 1}` },
    { title: '收货人名称', dataIndex: 'name', width: 130, render: (value: string) => <Text strong>{value}</Text> },
    { title: '收货人公司名称', dataIndex: 'company', width: 150, render: (value?: string) => value || '-' },
    { title: '收货人电话', dataIndex: 'phone', width: 140, render: (value?: string) => value || '-' },
    { title: 'FBA仓库代码', dataIndex: 'fbaWarehouseCode', width: 130, render: (value?: string) => value || '-' },
    { title: '收货人地址', dataIndex: 'address', render: (value?: string) => value || '-' },
    { title: '收货国家', dataIndex: 'country', width: 90, render: (value?: string) => value || '-' },
    { title: '州/省', dataIndex: 'state', width: 90, render: (value?: string) => value || '-' },
    { title: '邮编', dataIndex: 'postalCode', width: 100, render: (value?: string) => value || '-' },
    {
      title: '操作',
      width: 130,
      fixed: 'right',
      render: (_value, record) => (
        <Space size={4}>
          {canManageCustomerContacts ? <Button size="small" type="link" onClick={() => handleEditMasterCustomerContact(record)}>
            修改
          </Button> : null}
          {canDisableCustomerContacts ? <Popconfirm
            title="确认停用该收货人？"
            okText="确认停用"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDisableMasterCustomerContact(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger>
              停用
            </Button>
          </Popconfirm> : null}
        </Space>
      )
    }
  ];
  const agentRows = masterData.agents
    .map((agent) => {
      const visibleCompanyName = fieldVisibility.showAgentCompanyName ? agent.name : undefined;
      const visibleShortName = fieldVisibility.showAgentShortName ? agent.shortName : undefined;
      const code = agent.code
        ?? visibleCompanyName?.toUpperCase().slice(0, 6)
        ?? `AGENT-${agent.id.slice(0, 6).toUpperCase()}`;
      return {
        ...agent,
        code,
        name: visibleCompanyName ?? '',
        shortName: visibleShortName ?? code,
        integrationType: agent.integrationType ?? 'MANUAL',
        bankAccounts: sortAgentBanks(agentBankAccounts.filter((bank) => bank.enabled && matchesAgentBank(agent, bank))).slice(0, 3)
      };
    })
    .sort((left, right) => compareMasterCreatedAt(left.createdAt, right.createdAt)
      || String(left.name ?? left.shortName ?? left.code).localeCompare(String(right.name ?? right.shortName ?? right.code), 'zh-CN'));
  const filteredAgentRows = agentRows.filter((agent) => {
    const nameKeyword = fieldVisibility.showAgentCompanyName ? appliedAgentFilters.name.trim().toLowerCase() : '';
    const codeKeyword = appliedAgentFilters.code.trim().toLowerCase();
    const matchesName = !nameKeyword || String(agent.name ?? '').toLowerCase().includes(nameKeyword);
    const matchesCode = !codeKeyword || agent.code.toLowerCase().includes(codeKeyword);
    const matchesStatus =
      appliedAgentFilters.status === 'ALL' ||
      (appliedAgentFilters.status === 'ENABLED' ? agent.enabled : !agent.enabled);
    const matchesType = appliedAgentFilters.integrationType === 'ALL' || agent.integrationType === appliedAgentFilters.integrationType;
    return matchesName && matchesCode && matchesStatus && matchesType;
  });
  const selectedAgents = agentRows.filter((agent) => selectedAgentIds.includes(agent.id));
  const selectedAgent = selectedAgents.length === 1 ? selectedAgents[0] : null;
  const agentColumns: ColumnsType<(typeof agentRows)[number]> = [
    { title: '代理编码', dataIndex: 'code', width: 140, render: (value: string) => <Text strong>{value}</Text> },
    ...(fieldVisibility.showAgentShortName ? [{ title: agentFieldLabels.shortName, dataIndex: 'shortName', width: 180, render: (value: string) => <Text strong>{value}</Text> }] : []),
    ...(fieldVisibility.showAgentCompanyName ? [{ title: agentFieldLabels.detailedCompanyName, dataIndex: 'name', width: 220 }] : []),
    { title: '代理账期', dataIndex: 'settlementCycle', width: 130, render: (value?: AgentSummary['settlementCycle']) => settlementCycleLabel(value) },
    { title: '创建时间', dataIndex: 'createdAt', width: 170, render: (value?: string) => formatMasterDateTime(value) },
    { title: '仓库地址一', dataIndex: 'warehouseAddress1', width: 220, render: (value?: string) => value || '-' },
    { title: '仓库地址二', dataIndex: 'warehouseAddress2', width: 220, render: (value?: string) => value || '-' },
    { title: '仓库地址三', dataIndex: 'warehouseAddress3', width: 220, render: (value?: string) => value || '-' },
    {
      title: '查询网站',
      dataIndex: 'trackingWebsite',
      width: 260,
      render: (value?: string) => value ? <Text copyable>{value}</Text> : '-'
    },
    ...(canReadAgentBanks ? [0, 1, 2].map((index) => ({
      title: `收款银行账户${['一', '二', '三'][index]}`,
      key: `bankAccount${index + 1}`,
      dataIndex: 'bankAccounts',
      width: 260,
      render: (banks: AgentBankAccountSummary[]) => {
        const bank = banks[index];
        return bank ? (
          <Space direction="vertical" size={2}>
            <Text>{`${bank.accountName} / ${bank.bankName}`}</Text>
            <Text type="secondary">{`${bank.bankAccountNo} / ${bank.currency ?? 'RMB'}`}</Text>
            {!bank.enabled ? <Tag>停用</Tag> : null}
          </Space>
        ) : '-';
      }
    })) : []),
    ...([0, 1, 2] as const).map((index) => ({
      title: `仓库联系人${agentItemOrdinals[index]}`,
      key: `warehouseContact${index + 1}`,
      width: 190,
      render: (_value: unknown, agent: AgentSummary) => formatWarehouseContact(
        [agent.warehouseContactName1 ?? agent.warehouseContact, agent.warehouseContactName2, agent.warehouseContactName3][index],
        [agent.warehouseContactPhone1, agent.warehouseContactPhone2, agent.warehouseContactPhone3][index]
      )
    })),
    {
      title: '发票模板',
      key: 'invoiceTemplates',
      width: 220,
      render: (_value: unknown, record: AgentSummary) => {
        const templates = record.invoiceTemplates?.length ? record.invoiceTemplates : [
          { id: 'legacy-1', name: record.invoiceTemplateName || '模板 1', url: record.invoiceTemplateUrl || '' },
          { id: 'legacy-2', name: record.invoiceTemplateName2 || '模板 2', url: record.invoiceTemplateUrl2 || '' },
          { id: 'legacy-3', name: record.invoiceTemplateName3 || '模板 3', url: record.invoiceTemplateUrl3 || '' }
        ].filter((template) => Boolean(template.url));
        return templates.length ? <Space direction="vertical" size={2}>{templates.map((template, index) => template.url ? (
          <a href={template.url} key={template.id} target="_blank" rel="noreferrer">{`模板 ${index + 1}：${template.name || '查看模板'}`}</a>
        ) : <Text key={template.id}>{`模板 ${index + 1}：${template.name}`}</Text>)}</Space> : '-';
      }
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
    },
    {
      title: '对接类型',
      dataIndex: 'integrationType',
      width: 130,
      render: (value: AgentIntegrationType) => <Tag>{agentIntegrationLabels[value]}</Tag>
    }
  ];
  useEffect(() => {
    if (!canReadAgentBanks) {
      setAgentBankAccounts([]);
      return;
    }
    let alive = true;
    apiClient.agentBankAccounts({ includeDisabled: true }).then((rows) => {
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
    if (!canUploadRemoteAreas) return;
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
    ...(fieldVisibility.showAgentShortName ? [{ title: agentFieldLabels.shortName, dataIndex: 'agentName', width: 220, render: (value: string) => <Text strong>{value}</Text> }] : []),
    ...(fieldVisibility.showAgentChannel ? [{ title: '渠道名称', dataIndex: 'channelName' }] : []),
    { title: '状态', dataIndex: 'enabled', width: 90, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag> }
  ];
  const companyChannelRows = masterData.channels.map((channel) => ({
    ...channel,
    businessType: channel.businessType ?? 'EXPRESS',
    category: channel.category ?? '',
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
  const selectedCompanyChannel = selectedCompanyChannelIds.length === 1
    ? companyChannelRows.find((channel) => channel.id === selectedCompanyChannelIds[0]) ?? null
    : null;
  const canDeleteSelectedCompanyChannels = selectedCompanyChannelIds.length > 0 && canDeleteChannels;
  const enabledCompanyChannelCategoryOptions = masterData.channelCategories.filter((category) => category.enabled).map((category) => category.name);
  const companyChannelCategoryFilterOptions = Array.from(new Set([...enabledCompanyChannelCategoryOptions, ...companyChannelRows.map((channel) => channel.category)].filter(Boolean)));
  const companyChannelCategoryFormOptions = Array.from(new Set([...enabledCompanyChannelCategoryOptions, editingMasterCompanyChannel?.category].filter(Boolean)));
  const companyChannelColumns: ColumnsType<(typeof companyChannelRows)[number]> = [
    { title: '业务类型', dataIndex: 'businessType', width: 110, render: (value: CompanyChannelBusinessType) => <Tag>{companyChannelBusinessTypeLabels[value] ?? value}</Tag> },
    { title: '渠道类别', dataIndex: 'category', width: 120, render: (value?: string) => value || '-' },
    { title: '渠道名称', dataIndex: 'name', width: 180, render: (value: string) => <Text strong>{value}</Text> },
    { title: '承运商', dataIndex: 'carrierName', width: 120, render: (value?: string) => value || '-' },
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
            {canUploadRemoteAreas ? (
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
                {canDeleteRemoteAreas ? <Button size="small" onClick={() => setRemoteAreaFiles((current) => current.filter((item) => item.id !== file.id))}>删除</Button> : null}
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
    { title: '开始日期', dataIndex: 'activeAt', width: 190, render: (value: string) => formatBusinessDate(value) },
    { title: '结束日期', dataIndex: 'endAt', width: 190, render: (value?: string) => formatBusinessDate(value) },
    { title: '汇率', dataIndex: 'rate', width: 120, render: (value: number) => Number(value).toFixed(4).replace(/\.?0+$/, '') },
    {
      title: '操作',
      width: 150,
      render: (_value, record) => (
        <Space size={8}>
          {canUpdateExchangeRates ? <Button size="small" type="link" onClick={() => openEditMasterExchangeRate(record)}>
            修改
          </Button> : null}
          {canDisableExchangeRates ? <Popconfirm
            title="确认停用该汇率？"
            okText="确认停用"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDisableMasterExchangeRate(record)}
            destroyOnHidden
          >
            <Button size="small" type="link" danger>
              停用
            </Button>
          </Popconfirm> : null}
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
      customerCode: '',
      customerName: '',
      customerSource: '',
      saveCustomerSourceToCatalog: false,
      salesperson: canAssignCustomerSalesperson ? undefined : currentSalesperson,
      defaultSettlementMethod: undefined,
      contacts: []
    });
    setMasterCustomerOpen(true);
  }

  async function handleEditMasterCustomer(customer: CustomerSummary) {
    setEditingMasterCustomer(customer);
    masterCustomerForm.setFieldsValue({
      customerCode: customer.code,
      customerName: customer.name,
      customerSource: customer.customerSource ?? '',
      saveCustomerSourceToCatalog: false,
      salesperson: canAssignCustomerSalesperson ? customer.salesperson : currentSalesperson,
      defaultSettlementMethod: customer.defaultSettlementMethod ?? '',
      contacts: []
    });
    setMasterCustomerOpen(true);
  }

  async function handleSubmitMasterCustomer() {
    const values = await masterCustomerForm.validateFields();
    try {
      const customerCode = values.customerCode.trim();
      const customerName = values.customerName.trim();
      const customerSource = values.customerSource.trim();
      const salesperson = canAssignCustomerSalesperson ? values.salesperson?.trim() || undefined : currentSalesperson;
      const defaultSettlementMethod = values.defaultSettlementMethod.trim();
      const input = {
        code: customerCode,
        name: customerName,
        customerSource: customerSource || undefined,
        saveCustomerSourceToCatalog: Boolean(customerSource && values.saveCustomerSourceToCatalog),
        salesperson: salesperson ?? '',
        defaultSettlementMethod,
        enabled: editingMasterCustomer?.enabled ?? true
      };
      const contactInputs = (editingMasterCustomer ? [] : values.contacts ?? []).map((contact) => ({
        name: contact.receiverName.trim(),
        company: contact.receiverCompany?.trim() || undefined,
        phone: contact.receiverPhone?.trim() || undefined,
        fbaWarehouseCode: contact.fbaWarehouseCode?.trim() || undefined,
        address: contact.receiverAddress?.trim() || undefined,
        country: contact.receiverCountry?.trim() || undefined,
        state: contact.receiverState?.trim() || undefined,
        postalCode: contact.receiverPostalCode?.trim() || undefined
      }));
      const wasEditing = Boolean(editingMasterCustomer);
      const customer = editingMasterCustomer
        ? await apiClient.updateCustomer(editingMasterCustomer.id, input)
        : await apiClient.createCustomer(input);
      const contacts = contactInputs.length
        ? await Promise.all(contactInputs.map((contact) => apiClient.createCustomerContact(customer.id, contact)))
        : [];
      onMasterDataChange((current) => ({
        ...current,
        customers: [...current.customers.filter((item) => item.id !== customer.id), customer],
        contacts: contacts.length
          ? [...current.contacts.filter((item) => item.customerId !== customer.id), ...contacts]
          : current.contacts
      }));
      setMasterCustomerOpen(false);
      setEditingMasterCustomer(null);
      masterCustomerForm.resetFields();
      onNotice(wasEditing
        ? `${customer.code}-${customer.name} 已更新`
        : `已创建客户 ${customer.code}-${customer.name}${contacts.length ? `，并新增 ${contacts.length} 位收货人` : ''}，业务员 ${salesperson ?? '未指派'}`);
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
      if (selectedCustomerId === deletedCustomer.id) setCustomerDetailOpen(false);
      onNotice(`${deletedCustomer.code}-${deletedCustomer.name} 已删除`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '客户删除失败');
    }
  }

  function exportCustomers() {
    const header = ['业务员归属', '客户编号', '客户名称', '客户来源', '结算方式', '状态'];
    const rows = filteredCustomerRows.map((customer) => [
      customer.salesperson,
      customer.code,
      customer.name,
      customer.customerSource || '-',
      customer.defaultSettlementMethod || '-',
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
      fbaWarehouseCode: contact.fbaWarehouseCode ?? '',
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
      fbaWarehouseCode: contact.fbaWarehouseCode,
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
      fbaWarehouseCode: values.fbaWarehouseCode?.trim() || undefined,
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
      settlementCycle: undefined,
      agentIntegrationType: 'MANUAL',
      agentEnabled: 'true',
      warehouses: [emptyAgentWarehouse()],
      invoiceTemplates: [],
      trackingWebsite: '',
      bankAccountName: '',
      bankAccountNo: '',
      bankName: '',
      bankAccounts: emptyAgentBankAccounts()
    });
    setMasterAgentOpen(true);
  }

  async function handleEditMasterAgent(agent: AgentSummary) {
    setEditingMasterAgent(agent);
    const banks = sortAgentBanks(agentBankAccounts.filter((item) => matchesAgentBank(agent, item))).slice(0, MAX_AGENT_BANK_ACCOUNTS);
    const bankForms: MasterAgentBankAccountFormValues[] = banks.length
      ? banks.map((bank) => ({
        id: bank.id,
        accountName: bank.accountName,
        bankAccountNo: bank.bankAccountNo,
        bankName: bank.bankName,
        currency: bank.currency ?? 'RMB',
        remark: bank.remark ?? '',
        enabled: bank.enabled ? 'true' : 'false'
      }))
      : emptyAgentBankAccounts();
    const bank = banks[0];
    masterAgentForm.setFieldsValue({
      agentCode: agent.code ?? '',
      agentShortName: agent.shortName ?? agent.name,
      agentName: agent.name,
      settlementCycle: agent.settlementCycle,
      warehouses: agentWarehouses(agent),
      invoiceTemplates: agent.invoiceTemplates?.length ? agent.invoiceTemplates : [
        { id: 'legacy-1', name: agent.invoiceTemplateName ?? '模板 1', url: agent.invoiceTemplateUrl ?? '' },
        { id: 'legacy-2', name: agent.invoiceTemplateName2 ?? '模板 2', url: agent.invoiceTemplateUrl2 ?? '' },
        { id: 'legacy-3', name: agent.invoiceTemplateName3 ?? '模板 3', url: agent.invoiceTemplateUrl3 ?? '' }
      ].filter((template) => Boolean(template.url)),
      trackingWebsite: agent.trackingWebsite ?? '',
      bankAccountName: bank?.accountName ?? '',
      bankAccountNo: bank?.bankAccountNo ?? '',
      bankName: bank?.bankName ?? '',
      bankAccounts: bankForms,
      agentIntegrationType: agent.integrationType ?? 'MANUAL',
      agentEnabled: agent.enabled ? 'true' : 'false'
    });
    setMasterAgentOpen(true);
  }

  async function handleAgentInvoiceTemplate(index: number, file: File) {
    const urlField: ['invoiceTemplates', number, 'url'] = ['invoiceTemplates', index, 'url'];
    setUploadingInvoiceTemplateIndex(index);
    masterAgentForm.setFields([{ name: urlField, errors: [] }]);
    try {
      const normalized = await normalizeInvoiceTemplateFile(file);
      const uploaded = await apiClient.uploadAgentInvoiceTemplate(normalized.file);
      const templates = [...(masterAgentForm.getFieldValue('invoiceTemplates') ?? [])];
      templates[index] = { ...templates[index], name: templates[index]?.name?.trim() || uploaded.fileName, url: uploaded.url };
      masterAgentForm.setFieldValue('invoiceTemplates', templates);
      masterAgentForm.setFields([{ name: urlField, errors: [] }]);
      onNotice(normalized.corrected
        ? `已识别文件内容为 .${normalized.kind}，已自动修正扩展名并上传：${uploaded.fileName}`
        : `已上传模板：${uploaded.fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '发票模板上传失败，请重试';
      masterAgentForm.setFields([{ name: urlField, errors: [message] }]);
      onNotice(message);
    } finally {
      setUploadingInvoiceTemplateIndex(null);
      setInvoiceUploadInputVersion((version) => version + 1);
    }
  }

  function handleAgentInvoicePaste(index: number, event: ClipboardEvent<HTMLElement>) {
    const file = Array.from(event.clipboardData.files).find((item) => ['.xls', '.xlsx'].includes(item.name.slice(item.name.lastIndexOf('.')).toLowerCase()));
    if (!file) return;
    event.preventDefault();
    void handleAgentInvoiceTemplate(index, file);
  }

  async function handleSubmitMasterAgent() {
    const values = await masterAgentForm.validateFields();
    const warehouses = (values.warehouses ?? [])
      .map((warehouse, formIndex) => ({
        formIndex,
        address: warehouse.address?.trim() ?? '',
        contactName: warehouse.contactName?.trim() ?? '',
        contactPhone: warehouse.contactPhone?.trim() ?? ''
      }))
      .filter((warehouse) => Boolean(warehouse.address || warehouse.contactName || warehouse.contactPhone))
      .slice(0, MAX_AGENT_WAREHOUSES);
    const warehouseErrors: Parameters<typeof masterAgentForm.setFields>[0] = [];
    warehouses.forEach((warehouse) => {
      if (!warehouse.address && (warehouse.contactName || warehouse.contactPhone)) {
        warehouseErrors.push({ name: ['warehouses', warehouse.formIndex, 'address'], errors: [`仓库${agentItemOrdinals[warehouse.formIndex]}请输入仓库地址`] });
      }
      if (warehouse.contactPhone && !warehouse.contactName) {
        warehouseErrors.push({ name: ['warehouses', warehouse.formIndex, 'contactName'], errors: [`仓库${agentItemOrdinals[warehouse.formIndex]}请输入联系人姓名`] });
      }
    });
    if (warehouseErrors.length) {
      masterAgentForm.setFields(warehouseErrors);
      return;
    }
    const bankInputs = (values.bankAccounts ?? []).slice(0, MAX_AGENT_BANK_ACCOUNTS).map((bank) => ({
      id: bank.id,
      accountName: bank.accountName?.trim() ?? '',
      bankAccountNo: bank.bankAccountNo?.trim() ?? '',
      bankName: bank.bankName?.trim() ?? '',
      currency: (bank.currency?.trim() || 'RMB').toUpperCase(),
      remark: bank.remark?.trim() || undefined,
      enabled: bank.enabled !== 'false'
    }));
    const bankErrors: Parameters<typeof masterAgentForm.setFields>[0] = [];
    bankInputs.forEach((bank, index) => {
      const hasBankValue = Boolean(bank.accountName || bank.bankAccountNo || bank.bankName || bank.remark);
      if (hasBankValue && (!bank.accountName || !bank.bankAccountNo || !bank.bankName || !bank.currency)) {
        if (!bank.accountName) bankErrors.push({ name: ['bankAccounts', index, 'accountName'], errors: [`第 ${index + 1} 组请输入收款方`] });
        if (!bank.bankAccountNo) bankErrors.push({ name: ['bankAccounts', index, 'bankAccountNo'], errors: [`第 ${index + 1} 组请输入银行账号`] });
        if (!bank.bankName) bankErrors.push({ name: ['bankAccounts', index, 'bankName'], errors: [`第 ${index + 1} 组请输入开户银行`] });
        if (!bank.currency) bankErrors.push({ name: ['bankAccounts', index, 'currency'], errors: [`第 ${index + 1} 组请输入币种`] });
      }
    });
    if (bankErrors.length) {
      masterAgentForm.setFields(bankErrors);
      return;
    }
    const input = {
      code: values.agentCode?.trim() || undefined,
      shortName: values.agentShortName.trim(),
      name: values.agentName.trim(),
      settlementCycle: values.settlementCycle,
      warehouseAddress1: warehouses[0]?.address || undefined,
      warehouseAddress2: warehouses[1]?.address || undefined,
      warehouseAddress3: warehouses[2]?.address || undefined,
      warehouseContactName1: warehouses[0]?.contactName || undefined,
      warehouseContactPhone1: warehouses[0]?.contactPhone || undefined,
      warehouseContactName2: warehouses[1]?.contactName || undefined,
      warehouseContactPhone2: warehouses[1]?.contactPhone || undefined,
      warehouseContactName3: warehouses[2]?.contactName || undefined,
      warehouseContactPhone3: warehouses[2]?.contactPhone || undefined,
      warehouseContact: [warehouses[0]?.contactName, warehouses[0]?.contactPhone].filter(Boolean).join(' ') || undefined,
      invoiceTemplates: (values.invoiceTemplates ?? []).map((template) => ({
        id: template.id,
        name: template.name?.trim(),
        url: template.url?.trim()
      })),
      trackingWebsite: values.trackingWebsite?.trim(),
      integrationType: values.agentIntegrationType ?? 'MANUAL',
      enabled: values.agentEnabled !== 'false'
    };
    let agent: AgentSummary;
    try {
      agent = editingMasterAgent
        ? await apiClient.updateAgent(editingMasterAgent.id, input)
        : await apiClient.createAgent(input);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '代理资料保存失败');
      return;
    }
    if (editingMasterAgent ? canUpdateAgentBanks : canCreateAgentBanks) {
      const savedBanks: AgentBankAccountSummary[] = [];
      const existingEditableBanks = editingMasterAgent
        ? sortAgentBanks(agentBankAccounts.filter((bank) => matchesAgentBank(editingMasterAgent, bank))).slice(0, MAX_AGENT_BANK_ACCOUNTS)
        : [];
      const submittedBankIds = new Set(bankInputs.flatMap((bank) => bank.id ? [bank.id] : []));
      for (const bankInput of bankInputs) {
        const hasBankValue = Boolean(bankInput.accountName || bankInput.bankAccountNo || bankInput.bankName || bankInput.remark);
        const existingBank = bankInput.id ? agentBankAccounts.find((bank) => bank.id === bankInput.id) : undefined;
        if (!hasBankValue && !existingBank) continue;
        const bank = await apiClient.saveAgentBankAccount({
          id: bankInput.id,
          agentId: agent.id,
          agentName: agent.name,
          accountName: hasBankValue ? bankInput.accountName : existingBank?.accountName ?? '',
          bankAccountNo: hasBankValue ? bankInput.bankAccountNo : existingBank?.bankAccountNo ?? '',
          bankName: hasBankValue ? bankInput.bankName : existingBank?.bankName ?? '',
          currency: hasBankValue ? bankInput.currency : existingBank?.currency ?? 'RMB',
          remark: hasBankValue ? bankInput.remark : existingBank?.remark,
          enabled: hasBankValue ? bankInput.enabled : false
        });
        savedBanks.push(bank);
      }
      for (const removedBank of existingEditableBanks.filter((bank) => !submittedBankIds.has(bank.id))) {
        savedBanks.push(await apiClient.saveAgentBankAccount({
          id: removedBank.id,
          agentId: agent.id,
          agentName: agent.name,
          accountName: removedBank.accountName,
          bankAccountNo: removedBank.bankAccountNo,
          bankName: removedBank.bankName,
          currency: removedBank.currency ?? 'RMB',
          remark: removedBank.remark,
          enabled: false
        }));
      }
      if (savedBanks.length) {
        setAgentBankAccounts((current) => [
          ...savedBanks,
          ...current.filter((item) => !savedBanks.some((bank) => bank.id === item.id))
        ]);
      }
    }
    onMasterDataChange((current) => ({
      ...current,
      agents: [...current.agents.filter((item) => item.id !== agent.id), agent]
    }));
    setSelectedAgentIds([agent.id]);
    setMasterAgentOpen(false);
    setEditingMasterAgent(null);
    masterAgentForm.resetFields();
    onNotice(editingMasterAgent ? `${agent.name} 已更新` : `${agent.name} 已创建`);
  }

  async function handleDeleteSelectedMasterAgents() {
    if (!selectedAgentIds.length) return;
    try {
      const result = await apiClient.deleteAgents({ ids: selectedAgentIds });
      onMasterDataChange((current) => ({
        ...current,
        agents: current.agents.filter((item) => !result.deletedAgents.some((row) => row.id === item.id))
      }));
      const deletedIds = new Set(result.deletedAgents.map((agent) => agent.id));
      setAgentBankAccounts((current) => current.filter((item) => !deletedIds.has(item.agentId ?? '')));
      setSelectedAgentIds(result.failures.map((failure) => failure.id));
      const failureText = result.failures
        .map((failure) => `${failure.shortName ?? failure.name ?? failure.id}（${failure.reasons.join('、')}）`)
        .join('；');
      if (result.successCount > 0 && result.failures.length > 0) {
        onNotice(`部分代理资料删除失败：已删除 ${result.successCount} 条；${result.failures.length} 条未删除：${failureText}`);
      } else if (result.failures.length > 0) {
        onNotice(`代理资料删除失败：存在业务引用，未删除：${failureText}`);
      } else {
        onNotice(`已物理删除 ${result.successCount} 条代理资料`);
      }
    } catch (error) {
      onNotice(`代理资料删除失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
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

  async function handleDeleteMasterAgentChannel(channel: AgentChannelSummary) {
    try {
      const deletedChannel = await apiClient.deleteAgentChannel(channel.id);
      onMasterDataChange((current) => ({
        ...current,
        agentChannels: current.agentChannels.filter((item) => item.id !== deletedChannel.id)
      }));
      setSelectedAgentChannelId((current) => (current === deletedChannel.id ? null : current));
      onNotice(`${deletedChannel.channelName} 已删除`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '代理渠道删除失败');
    }
  }

  async function handleCreateMasterCompanyChannel() {
    setEditingMasterCompanyChannel(null);
    masterCompanyChannelForm.resetFields();
    masterCompanyChannelForm.setFieldsValue({
      name: '',
      carrierId: undefined,
      businessType: 'EXPRESS',
      category: '',
      volumeDivisor: '5000',
      multiPieceWeightRule: 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: 'ACTUAL',
      settlementWeightRule: 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: 'NONE',
      largeCargoThresholdKg: '',
      overweightWarningThresholdKg: '',
      overGirthLengthWidthHeightThresholdCm: '',
      overGirthLengthPlusTwoWidthHeightThresholdCm: '',
      perPieceMinimumChargeWeightKg: '',
      perShipmentMinimumCharge: '',
      perShipmentMinimumChargeUnit: 'KG',
      densityRatio: '',
      remoteAreaRule: '',
      enabled: 'true'
    });
    setMasterCompanyChannelOpen(true);
  }

  async function handleEditMasterCompanyChannel(channel: ChannelSummary) {
    setEditingMasterCompanyChannel(channel);
    masterCompanyChannelForm.setFieldsValue({
      name: channel.name,
      carrierId: channel.carrierId,
      businessType: channel.businessType ?? 'EXPRESS',
      category: channel.category ?? '',
      volumeDivisor: String(channel.volumeDivisor ?? 5000),
      multiPieceWeightRule: channel.multiPieceWeightRule ?? 'SUM_THEN_COMPARE',
      singleWeightRoundingRule: channel.singleWeightRoundingRule ?? 'ACTUAL',
      settlementWeightRule: channel.settlementWeightRule ?? 'MAX_ACTUAL_VOLUME',
      settlementWeightRoundingRule: channel.settlementWeightRoundingRule ?? 'NONE',
      largeCargoThresholdKg: channel.largeCargoThresholdKg ? String(channel.largeCargoThresholdKg) : '',
      overweightWarningThresholdKg: channel.overweightWarningThresholdKg ? String(channel.overweightWarningThresholdKg) : '',
      overGirthLengthWidthHeightThresholdCm: channel.overGirthLengthWidthHeightThresholdCm ? String(channel.overGirthLengthWidthHeightThresholdCm) : '',
      overGirthLengthPlusTwoWidthHeightThresholdCm: channel.overGirthLengthPlusTwoWidthHeightThresholdCm ? String(channel.overGirthLengthPlusTwoWidthHeightThresholdCm) : '',
      perPieceMinimumChargeWeightKg: channel.perPieceMinimumChargeWeightKg ? String(channel.perPieceMinimumChargeWeightKg) : '',
      perShipmentMinimumCharge: channel.perShipmentMinimumCharge ? String(channel.perShipmentMinimumCharge) : '',
      perShipmentMinimumChargeUnit: channel.perShipmentMinimumChargeUnit ?? 'KG',
      densityRatio: channel.densityRatio ? String(channel.densityRatio) : '',
      remoteAreaRule: channel.remoteAreaRule === 'NONE' ? '' : channel.remoteAreaRule ?? '',
      enabled: channel.enabled ? 'true' : 'false'
    });
    setMasterCompanyChannelOpen(true);
  }

  async function handleSubmitMasterCompanyChannel() {
    const values = await masterCompanyChannelForm.validateFields();
    const category = values.category?.trim() ?? '';
    const selectedCarrier = values.carrierId
      ? masterData.carriers.find((carrier) => carrier.id === values.carrierId)
      : undefined;
    const remoteAreaRule = values.remoteAreaRule?.trim();
    const input = {
      name: values.name.trim(),
      carrierId: selectedCarrier?.id ?? null,
      carrierName: selectedCarrier?.name ?? null,
      businessType: values.businessType,
      category,
      volumeDivisor: Number(values.volumeDivisor) || 5000,
      multiPieceWeightRule: values.multiPieceWeightRule,
      singleWeightRoundingRule: values.singleWeightRoundingRule,
      settlementWeightRule: values.settlementWeightRule,
      settlementWeightRoundingRule: values.settlementWeightRoundingRule,
      largeCargoThresholdKg: optionalFormNumber(values.largeCargoThresholdKg),
      ...(canManageChannelWarnings ? {
        overweightWarningThresholdKg: optionalFormNumber(values.overweightWarningThresholdKg),
        overGirthLengthWidthHeightThresholdCm: optionalFormNumber(values.overGirthLengthWidthHeightThresholdCm),
        overGirthLengthPlusTwoWidthHeightThresholdCm: optionalFormNumber(values.overGirthLengthPlusTwoWidthHeightThresholdCm)
      } : {}),
      ...(canManageChannelMinimumCharges ? {
        perPieceMinimumChargeWeightKg: optionalFormNumber(values.perPieceMinimumChargeWeightKg),
        perShipmentMinimumCharge: optionalFormNumber(values.perShipmentMinimumCharge),
        perShipmentMinimumChargeUnit: values.perShipmentMinimumCharge?.trim() ? values.perShipmentMinimumChargeUnit : null,
        densityRatio: optionalFormNumber(values.densityRatio)
      } : {}),
      remoteAreaRule: !remoteAreaRule || remoteAreaRule === '无偏远' ? 'NONE' : remoteAreaRule,
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

  async function handleDeleteSelectedMasterCompanyChannels() {
    if (!selectedCompanyChannelIds.length) return;
    try {
      const result = selectedCompanyChannelIds.length === 1 && canDeleteChannels
        ? {
            successCount: 1,
            deletedChannels: [await apiClient.deleteChannel(selectedCompanyChannelIds[0])],
            failures: [] as Array<{ id: string; name?: string; reasons: string[] }>,
            hardDelete: true as const
          }
        : await apiClient.deleteChannels({ ids: selectedCompanyChannelIds });
      onMasterDataChange((current) => ({
        ...current,
        channels: current.channels.filter((item) => !result.deletedChannels.some((row) => row.id === item.id))
      }));
      setSelectedCompanyChannelIds(result.failures.map((failure) => failure.id));
      const failureText = result.failures
        .map((failure) => `${failure.name ?? failure.id}（${failure.reasons.join('、')}）`)
        .join('；');
      if (result.successCount > 0 && result.failures.length > 0) {
        onNotice(`公司渠道部分删除完成：已删除 ${result.successCount} 条；${result.failures.length} 条未删除：${failureText}`);
      } else if (result.failures.length > 0) {
        onNotice(`公司渠道删除失败：${result.failures.length} 条未删除：${failureText}`);
      } else {
        onNotice(`已删除 ${result.successCount} 条公司渠道；历史业务引用已保留`);
      }
    } catch (error) {
      onNotice(`公司渠道删除失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
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

  async function handleDeleteMasterChannelCategory(category: ChannelCategorySummary) {
    try {
      const deletedCategory = await apiClient.deleteChannelCategory(category.id);
      onMasterDataChange((current) => ({
        ...current,
        channelCategories: current.channelCategories.filter((item) => item.id !== deletedCategory.id)
      }));
      setSelectedChannelCategoryId((current) => (current === deletedCategory.id ? null : current));
      onNotice(`${deletedCategory.name} 已删除`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '渠道类别删除失败');
    }
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
        description={fieldVisibility.showAgentData ? '按手册维护客户资料和代理资料，支持查询、增删改和列表设置。' : '按手册维护客户资料，支持查询、增删改和列表设置。'}
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
                  prompt: fieldVisibility.showAgentData ? '请检查客户资料和代理资料的完整性，输出缺失项和处理顺序。' : '请检查客户资料的完整性，输出缺失项和处理顺序。',
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
            <MetricCard icon={<Users />} title="客户资料" value={customerMetrics.total} extra="业务员归属、客户编号、客户名称" />
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
            <MetricCard icon={<Users />} title="客户资料" value={summary.enabledCustomers} extra="业务员归属、客户编号、客户名称、结算方式" />
          </Col>
          <Col xs={24} md={8}>
            {canReadAgents ? <MetricCard icon={<Route />} title="代理资料" value={summary.enabledAgents} extra={`${summary.enabledChannels} 条渠道 / ${summary.enabledCarriers} 个承运商`} /> : null}
          </Col>
          <Col xs={24} md={8}>
            <MetricCard icon={<FileText />} title="费用/汇率" value={summary.enabledSurcharges} extra={`${summary.activeExchangeRates} 条启用汇率`} />
          </Col>
        </Row>
      )}

      <ModuleSubWorkspace items={masterSubItems} activeKey={activeMasterSection} onChange={setActiveMasterSection}>
      <Row gutter={[16, 16]} className="main-grid">
        <Col xs={24}>
          {activeMasterSection === 'customerSources' ? (
            <CustomerSourcesPage
              apiClient={apiClient}
              canWrite={canWriteCustomers}
              canDelete={canDeleteCustomerSources}
              onNotice={onNotice}
            />
          ) : null}
          {activeMasterSection === 'financeCatalog' ? (
            <FinanceCatalogPage
              {...financeCatalog.pageProps}
              title="财务资料"
              pagination={tenRowTablePagination}
              canWrite={Object.values(financeCatalogCapabilities).some((capability) => Object.values(capability).some(Boolean))}
              capabilities={financeCatalogCapabilities}
            />
          ) : null}
          {activeMasterSection === 'payerBanks' ? (
            <PayerBankAccountsPage
              apiClient={apiClient}
              canCreate={canCreatePayerBanks}
              canUpdate={canUpdatePayerBanks}
              canDelete={canDeletePayerBanks}
              onNotice={onNotice}
            />
          ) : null}
          {activeMasterSection === 'remoteAreas' ? (
            <Card className="module-grid" title="偏远">
              <ManagedTable
                recordDetail={{ title: '偏远规则详情' }}
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
                <ManagedTable
                  recordDetail={{ title: '当前汇率详情' }}
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
                        <AppDatePicker />
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
                        <AppDatePicker />
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
                            disabled={editingMasterExchangeRate ? !canUpdateExchangeRates : !canCreateExchangeRates}
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
                <ManagedTable
                  recordDetail={{ title: '历史汇率详情' }}
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
                {canCreateChannelCategories ? <Button size="small" aria-label="新增渠道类别" onClick={() => void handleCreateMasterChannelCategory()}>
                  新增
                </Button> : null}
                {canUpdateChannelCategories ? <Button size="small" aria-label="修改渠道类别" disabled={!selectedChannelCategory} onClick={() => selectedChannelCategory && void handleEditMasterChannelCategory(selectedChannelCategory)}>
                  修改
                </Button> : null}
                {canDeleteChannelCategories ? <Popconfirm
                  title="确认删除该渠道类别？"
                  description="删除后不可恢复；已被公司渠道引用时不能删除。"
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedChannelCategory}
                  destroyOnHidden
                  onConfirm={() => selectedChannelCategory && handleDeleteMasterChannelCategory(selectedChannelCategory)}
                >
                  <Button size="small" aria-label="删除渠道类别" disabled={!selectedChannelCategory}>
                    删除
                  </Button>
                </Popconfirm> : null}
              </Space>
              <ManagedTable
                recordDetail={{ title: '渠道类别详情' }}
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
                      {Object.entries(companyChannelBusinessTypeLabels).map(([value, label]) => (
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
                    () => {
                      setAppliedCompanyChannelFilters(companyChannelFilters);
                      setSelectedCompanyChannelIds([]);
                    },
                    () => {
                      const emptyFilters = { keyword: '', businessType: 'ALL', category: 'ALL', status: 'ALL' };
                      setCompanyChannelFilters(emptyFilters);
                      setAppliedCompanyChannelFilters(emptyFilters);
                      setSelectedCompanyChannelIds([]);
                    }
                  )}
                </Col>
              </Row>
              <Space wrap className="surface-strip">
                {canCreateChannels ? <Button size="small" aria-label="增加公司渠道" onClick={() => void handleCreateMasterCompanyChannel()}>
                  增加
                </Button> : null}
                {canUpdateChannels ? <Button size="small" aria-label="修改公司渠道" disabled={!selectedCompanyChannel} onClick={() => selectedCompanyChannel && void handleEditMasterCompanyChannel(selectedCompanyChannel)}>
                  修改
                </Button> : null}
                {canDeleteChannels ? <Popconfirm
                  title={`确认删除已选 ${selectedCompanyChannelIds.length} 条公司渠道？`}
                  description="删除后将从当前资料和新业务选项中移除；已有运单、报价规则和燃油费率历史不会被级联删除。"
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!canDeleteSelectedCompanyChannels}
                  destroyOnHidden
                  onConfirm={() => handleDeleteSelectedMasterCompanyChannels()}
                >
                  <Button size="small" aria-label="删除公司渠道" disabled={!canDeleteSelectedCompanyChannels}>
                    删除
                  </Button>
                </Popconfirm> : null}
              </Space>
              <ManagedTable
                recordDetail={{ title: '公司渠道详情' }}
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredCompanyChannelRows}
                rowSelection={{
                  selectedRowKeys: selectedCompanyChannelIds,
                  onChange: (keys) => setSelectedCompanyChannelIds(keys.map(String))
                }}
                onRow={(record) => ({
                  onClick: () => setSelectedCompanyChannelIds([record.id])
                })}
                columns={companyChannelColumns}
                scroll={{ x: 1450 }}
              />
            </Space>
          </Card>
          ) : null}
          {activeMasterSection === 'agentChannels' && canReadAgentChannels ? (
          <Card className="module-grid" title="代理渠道">
            <Space direction="vertical" size={12} className="ai-list">
              <Row gutter={[10, 10]} className="module-filter-grid">
                {fieldVisibility.showAgentShortName ? <Col xs={24} md={8} xl={5}>
                  {renderFilterField(agentFieldLabels.shortName, (
                    <select
                      aria-label={`${agentFieldLabels.shortName}筛选`}
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
                </Col> : null}
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
                {canCreateAgentChannels ? <Button size="small" aria-label="增加代理渠道" disabled={agentRows.length === 0} onClick={() => void handleCreateMasterAgentChannel()}>
                  增加
                </Button> : null}
                {canUpdateAgentChannels ? <Button size="small" aria-label="修改代理渠道" disabled={!selectedAgentChannel} onClick={() => selectedAgentChannel && void handleEditMasterAgentChannel(selectedAgentChannel)}>
                  修改
                </Button> : null}
                {canDeleteAgentChannels ? <Popconfirm
                  title="确认删除该代理渠道？"
                  description="删除后不可恢复。"
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedAgentChannel}
                  destroyOnHidden
                  onConfirm={() => selectedAgentChannel && handleDeleteMasterAgentChannel(selectedAgentChannel)}
                >
                  <Button size="small" aria-label="删除代理渠道" disabled={!selectedAgentChannel}>
                    删除
                  </Button>
                </Popconfirm> : null}
              </Space>
              <ManagedTable
                recordDetail={{ title: '代理渠道详情' }}
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
                  <Text type="secondary">共 {customerRows.length} 条客户，双击客户查看详情</Text>
                </Space>
              }
              extra={
                <Space wrap>
                  {canCreateCustomers ? <Button type="primary" icon={<Plus size={16} />} aria-label="增加客户" onClick={() => void handleCreateMasterCustomer()}>
                    新增客户
                  </Button> : null}
                  <Button icon={<UploadIcon size={16} />} onClick={() => onNotice('客户导入请使用当前模板整理后导入')}>
                    导入
                  </Button>
                  {canExportCustomers ? <Button icon={<Download size={16} />} onClick={exportCustomers}>
                    导出
                  </Button> : null}
                  <Button icon={<Settings size={16} />} aria-label="客户列表设置" onClick={() => setCustomerListSettingOpen(true)}>
                    列表设置
                  </Button>
                </Space>
              }
            >
              <Space direction="vertical" size={10} className="customer-master-stack">
                <div className="customer-master-filter">
                  <Space.Compact className="customer-master-keyword">
                    <span>客户名称/编号</span>
                    <Input
                      aria-label="客户编号筛选"
                      placeholder="输入客户名称或编号"
                      value={customerFilters.name}
                      onChange={(event) => setCustomerFilters((current) => ({ ...current, name: event.target.value, code: '' }))}
                    />
                  </Space.Compact>
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
                      {salespersonFilterOptions.map((salesperson) => <option key={salesperson} value={salesperson}>{salesperson}</option>)}
                    </select>
                  </label>
                  <Button type="primary" onClick={() => setAppliedCustomerFilters(customerFilters)}>查询</Button>
                  <Button
                    onClick={() => {
                      const emptyFilters = { name: '', code: '', status: 'ALL', customerSource: '', salesperson: '' };
                      setCustomerFilters(emptyFilters);
                      setAppliedCustomerFilters(emptyFilters);
                    }}
                  >
                    重置
                  </Button>
                </div>
                <div className="customer-master-batch">
                  <Text>已选择 {selectedCustomerIds.length} 项</Text>
                  {canUpdateCustomers ? <Button icon={<Edit size={15} />} disabled={!selectedCustomerForAction} onClick={() => selectedCustomerForAction && void handleEditMasterCustomer(selectedCustomerForAction)}>
                    修改
                  </Button> : null}
                  {canEnableCustomers ? <Popconfirm
                    title={`确认${selectedCustomerForAction?.enabled === false ? '启用' : '停用'}该客户？`}
                    description={selectedCustomerForAction?.enabled === false ? '启用后可重新用于业务下单。' : '停用保留历史记录，不影响既有业务数据。'}
                    okText={`确认${selectedCustomerForAction?.enabled === false ? '启用' : '停用'}`}
                    cancelText="取消"
                    okButtonProps={{ danger: selectedCustomerForAction?.enabled !== false }}
                    disabled={!selectedCustomerForAction}
                    destroyOnHidden
                    open={customerDisableConfirmOpen}
                    onOpenChange={(open) => setCustomerDisableConfirmOpen(Boolean(selectedCustomerForAction && canEnableCustomers && open))}
                    onConfirm={async () => {
                      if (selectedCustomerForAction) {
                        await (selectedCustomerForAction.enabled ? handleDisableMasterCustomer(selectedCustomerForAction) : handleEnableMasterCustomer(selectedCustomerForAction));
                      }
                      setCustomerDisableConfirmOpen(false);
                    }}
                    onCancel={() => setCustomerDisableConfirmOpen(false)}
                  >
                    <Button icon={<Power size={15} />} danger={selectedCustomerForAction?.enabled !== false} disabled={!selectedCustomerForAction}>
                      {selectedCustomerForAction?.enabled === false ? '启用' : '停用'}
                    </Button>
                  </Popconfirm> : null}
                  {canDeleteCustomers ? <Popconfirm
                    title="删除客户资料"
                    description="删除后不可恢复，请确认该客户无未完成运单、费用或收款记录。"
                    okText="确认删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                    disabled={!selectedCustomerForAction}
                    onConfirm={() => selectedCustomerForAction ? handleDeleteMasterCustomer(selectedCustomerForAction) : undefined}
                    destroyOnHidden
                  >
                    <Button icon={<Trash2 size={15} />} danger aria-label="删除客户" disabled={!selectedCustomerForAction}>
                      删除
                    </Button>
                  </Popconfirm> : null}
                </div>
                <ManagedTable
                  recordDetail={false}
                  rowKey="id"
                  size="small"
                  className="customer-master-table"
                  pagination={tenRowTablePagination}
                  dataSource={filteredCustomerRows}
                  rowSelection={{
                    selectedRowKeys: selectedCustomerIds,
                    onChange: (keys) => {
                      const nextIds = keys.map(String);
                      setSelectedCustomerIds(nextIds);
                      if (nextIds.length && !nextIds.includes(selectedCustomerId ?? '')) {
                        setSelectedCustomerId(nextIds[nextIds.length - 1]);
                      }
                    }
                  }}
                  rowClassName={(record) => record.id === selectedCustomerId ? 'customer-master-row-selected' : ''}
                  onRow={(record) => ({
                    tabIndex: 0,
                    'aria-label': `双击查看客户 ${record.code}-${record.name} 详情`,
                    onClick: (event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest('.ant-checkbox') || target.closest('.ant-checkbox-wrapper')) return;
                      setSelectedCustomerId(record.id);
                    },
                    onDoubleClick: (event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest('button, a, input, select, textarea, .ant-checkbox, .ant-checkbox-wrapper')) return;
                      setSelectedCustomerId(record.id);
                      setCustomerDetailOpen(true);
                    },
                    onKeyDown: (event) => {
                      if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
                      setSelectedCustomerId(record.id);
                      setCustomerDetailOpen(true);
                    }
                  })}
                  columns={customerColumns}
                  scroll={{ x: 1120 }}
                />
              </Space>
            </Card>
            <Modal
              className="customer-detail-modal"
              title={selectedCustomer ? `客户详情 · ${selectedCustomer.code}` : '客户详情'}
              open={customerDetailOpen && Boolean(selectedCustomer)}
              width={1120}
              footer={null}
              destroyOnHidden
              onCancel={() => setCustomerDetailOpen(false)}
            >
              {selectedCustomer ? (
                <Space direction="vertical" size={14} className="customer-detail-stack">
                  <Flex align="center" gap={14}>
                    <span className="customer-detail-icon"><Building2 size={30} /></span>
                    <Space direction="vertical" size={2}>
                      <Space>
                        <Title level={4}>{selectedCustomer.name}</Title>
                        <Tag color={selectedCustomer.enabled ? 'green' : 'default'}>{selectedCustomer.enabled ? '启用' : '停用'}</Tag>
                      </Space>
                      <Text type="secondary">{selectedCustomer.code}</Text>
                    </Space>
                  </Flex>
                  <div className="customer-detail-section">
                    <Text strong>基础信息</Text>
                    <div className="customer-detail-fields">
                      <Text type="secondary">业务员归属</Text><Text>{selectedCustomer.salesperson}</Text>
                      <Text type="secondary">客户编号</Text><Text>{selectedCustomer.code}</Text>
                      <Text type="secondary">客户名称</Text><Text>{selectedCustomer.name}</Text>
                      <Text type="secondary">客户来源</Text><Text>{selectedCustomer.customerSource || '-'}</Text>
                      <Text type="secondary">结算方式</Text><Text>{selectedCustomer.defaultSettlementMethod || '缺失'}</Text>
                    </div>
                  </div>
                  <div className="customer-detail-section">
                    <Flex justify="space-between" align="center">
                      <Text strong>收货信息</Text>
                      {canManageCustomerContacts ? <Button
                        size="small"
                        type="text"
                        icon={<Plus size={14} />}
                        aria-label="新增收货人"
                        title="新增收货人"
                        disabled={!selectedCustomer || selectedCustomerContacts.length >= 4}
                        onClick={() => void handleOpenMasterCustomerContact()}
                      /> : null}
                    </Flex>
                    <ManagedTable
                      recordDetail={false}
                      rowKey="id"
                      size="small"
                      className="customer-detail-contact-table"
                      dataSource={selectedCustomerContacts}
                      columns={customerContactColumns}
                      pagination={false}
                      scroll={{ x: 1040 }}
                      locale={{ emptyText: '暂无维护收货人' }}
                    />
                  </div>
                  <Flex gap={10} justify="flex-end" className="customer-detail-actions">
                    {canUpdateCustomers ? <Button onClick={() => void handleEditMasterCustomer(selectedCustomer)}>编辑客户</Button> : null}
                    {canEnableCustomers ? <Button danger onClick={() => selectedCustomer.enabled ? void handleDisableMasterCustomer(selectedCustomer) : void handleEnableMasterCustomer(selectedCustomer)}>
                      {selectedCustomer.enabled ? '停用' : '启用'}
                    </Button> : null}
                    {canDeleteCustomers ? <Popconfirm
                      title="删除客户资料"
                      description="删除后不可恢复，请确认该客户无未完成运单、费用或收款记录。"
                      okText="确认删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteMasterCustomer(selectedCustomer)}
                      destroyOnHidden
                    >
                      <Button danger type="primary">删除</Button>
                    </Popconfirm> : null}
                  </Flex>
                </Space>
              ) : null}
            </Modal>
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
                <Checkbox checked={showCustomerStatus} onChange={(event) => setShowCustomerStatus(event.target.checked)}>
                  显示状态
                </Checkbox>
              </Space>
            </Modal>
          </div>
          ) : null}

          {activeMasterSection === 'agents' && canReadAgents ? (
          <Card className="module-grid" title="代理资料">
            <Space direction="vertical" size={8} className="ai-list master-agent-stack">
              <div className="master-agent-command-bar">
                <Row gutter={[10, 10]} className="module-filter-grid master-agent-filter-grid">
                  {fieldVisibility.showAgentCompanyName ? <Col xs={24} md={9} xl={7}>
                  {renderFilterField(agentFieldLabels.detailedCompanyName, (
                    <Input
                      aria-label={`${agentFieldLabels.detailedCompanyName}筛选`}
                      value={agentFilters.name}
                      onChange={(event) => setAgentFilters((current) => ({ ...current, name: event.target.value }))}
                    />
                  ))}
                  </Col> : null}
                  <Col xs={24} md={7} xl={5}>
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
                  <Col xs={24} md={8} xl={6}>
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
                <Space wrap size={8} className="master-agent-actions">
                {canCreateAgents ? <Button size="small" aria-label="增加代理" onClick={() => void handleCreateMasterAgent()}>
                  增加
                </Button> : null}
                {canUpdateAgents ? <Button size="small" aria-label="修改代理" disabled={!selectedAgent || selectedAgentIds.length !== 1} onClick={() => selectedAgent && void handleEditMasterAgent(selectedAgent)}>
                  修改
                </Button> : null}
                {canDeleteAgents ? <Popconfirm
                  title="是否确认删除？"
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedAgentIds.length}
                  destroyOnHidden
                  open={agentDisableConfirmOpen}
                  onOpenChange={(open) => setAgentDisableConfirmOpen(Boolean(selectedAgentIds.length && canDeleteAgents && open))}
                  onConfirm={async () => {
                    await handleDeleteSelectedMasterAgents();
                    setAgentDisableConfirmOpen(false);
                  }}
                  onCancel={() => setAgentDisableConfirmOpen(false)}
                >
                  <Button size="small" aria-label="删除代理" disabled={!selectedAgentIds.length}>
                    删除
                  </Button>
                </Popconfirm> : null}
                </Space>
              </div>
              <ManagedTable
                recordDetail={{ title: '代理资料详情' }}
                className="master-agent-table"
                rowKey="id"
                size="small"
                pagination={tenRowTablePagination}
                dataSource={filteredAgentRows}
                rowSelection={{
                  selectedRowKeys: selectedAgentIds,
                  onChange: (keys) => setSelectedAgentIds(keys.map(String))
                }}
                columns={agentColumns}
                columnSettings={{
                  storageKey: 'sunny.master-data.agents.columns-v2',
                  title: '代理资料列设置',
                  defaultHiddenKeys: ['code', 'enabled', 'integrationType']
                }}
                scroll={{ x: canReadAgentBanks ? 2370 : 1570 }}
              />
            </Space>
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
              {fieldVisibility.showAgentData ? <Alert type="warning" showIcon message="代理 API 对接预留不需要填写真实 key" /> : null}
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
        width={960}
        onOk={() => void handleSubmitMasterCompanyChannel()}
        onCancel={() => {
          setMasterCompanyChannelOpen(false);
          setEditingMasterCompanyChannel(null);
          masterCompanyChannelForm.resetFields();
        }}
      >
        <Form form={masterCompanyChannelForm} layout="vertical" className="company-channel-rule-form">
          <Title level={5}>基础信息</Title>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="渠道名称" rules={[{ required: true, whitespace: true, message: '请输入渠道名称' }]}>
                <Input placeholder="例如 CNUPS红单" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="businessType" label="业务类型" rules={[{ required: true, message: '请选择业务类型' }]}>
                <select aria-label="公司渠道业务类型" className="native-select">
                  {Object.entries(companyChannelBusinessTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="carrierId"
                label="承运商（选填）"
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="未选择时保持为空"
                  options={masterData.carriers.filter((carrier) => carrier.enabled || carrier.id === editingMasterCompanyChannel?.carrierId).map((carrier) => ({ label: carrier.name, value: carrier.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="category" label="渠道类别（选填）">
                <select aria-label="公司渠道类别" className="native-select">
                  <option value="">--不填写--</option>
                  {companyChannelCategoryFormOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
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
              <Form.Item name="volumeDivisor" label="除材积" rules={[{ required: true, message: '请选择除材积' }]}>
                <select aria-label="除材积" className="native-select">
                  <option value="5000">5000</option>
                  <option value="6000">6000</option>
                </select>
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
              <Form.Item name="singleWeightRoundingRule" label={intermediateWeightRoundingLabel} rules={[{ required: true, message: '请选择重量进位规则' }]}>
                <select aria-label={intermediateWeightRoundingLabel} className="native-select" disabled={!usesIntermediateWeightRounding}>
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
              <Form.Item name="largeCargoThresholdKg" label="大货起始重量" rules={[optionalPositiveRule]}>
                <Input type="number" min={0} placeholder="默认单位 KG" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <div className="company-channel-rule-preview" aria-live="polite">
                <Text strong>计算顺序</Text>
                <Text>{multiPieceWeightRuleDescriptions[watchedMultiPieceWeightRule]}</Text>
              </div>
            </Col>
          </Row>
          <Title level={5}>最低消费</Title>
          <Row gutter={12}>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name="perPieceMinimumChargeWeightKg" label="单件最低消费（KG）" rules={[optionalPositiveRule]}>
                <Input type="number" min={0} disabled={!canManageChannelMinimumCharges} placeholder="留空不套用" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name="perShipmentMinimumCharge" label={`单票最低消费（${watchedPerShipmentMinimumChargeUnit}）`} rules={[optionalPositiveRule]}>
                <Input type="number" min={0} disabled={!canManageChannelMinimumCharges} placeholder="留空不套用" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item name="perShipmentMinimumChargeUnit" label="单票最低消费单位">
                <select aria-label="单票最低消费单位" className="native-select" disabled={!canManageChannelMinimumCharges}>
                  <option value="KG">KG</option>
                  <option value="CBM">CBM</option>
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12} xl={6}>
              <Form.Item
                name="densityRatio"
                label="比重（1:n）"
                rules={[
                  optionalPositiveRule,
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('perShipmentMinimumCharge') && getFieldValue('perShipmentMinimumChargeUnit') === 'CBM' && !String(value ?? '').trim()) {
                        return Promise.reject(new Error('单票最低消费选择 CBM 时必须填写比重'));
                      }
                      return Promise.resolve();
                    }
                  })
                ]}
              >
                <Input type="number" min={0} prefix="1 :" disabled={!canManageChannelMinimumCharges} placeholder="例如 167" />
              </Form.Item>
            </Col>
          </Row>
          <Title level={5}>自动预警</Title>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="overweightWarningThresholdKg" label="单件实重超重（KG）" rules={[optionalPositiveRule]}>
                <Input type="number" min={0} disabled={!canManageChannelWarnings} placeholder="留空不预警" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="overGirthLengthWidthHeightThresholdCm" label="超围·长+宽+高（CM）" rules={[optionalPositiveRule]}>
                <Input type="number" min={0} disabled={!canManageChannelWarnings} placeholder="留空不预警" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="overGirthLengthPlusTwoWidthHeightThresholdCm" label="超围·长+2×（宽+高）（CM）" rules={[optionalPositiveRule]}>
                <Input type="number" min={0} disabled={!canManageChannelWarnings} placeholder="留空不预警" />
              </Form.Item>
            </Col>
          </Row>
          <Title level={5}>其他规则</Title>
          <Form.Item name="remoteAreaRule" label="偏远规则（选填）">
            <Input list="company-channel-remote-options" placeholder="DHL偏远 / UPS偏远 / FEDEX偏远 / 自定义" />
          </Form.Item>
          <datalist id="company-channel-remote-options">
            {remoteAreaRuleOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
        </Form>
      </Modal>
      <Modal
        title={editingMasterAgentChannel ? '编辑代理渠道' : '新建代理渠道'}
        open={masterAgentChannelOpen && canReadAgentChannels}
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
          <Form.Item name="agentId" label={agentFieldLabels.shortName} rules={[{ required: true, message: `请选择${agentFieldLabels.shortName}` }]}>
            <select aria-label={`代理渠道所属${agentFieldLabels.shortName}`} className="native-select">
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
        width={1180}
        className="customer-editor-modal"
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
          message="客户资料维护客户主数据、业务员归属、结算方式和收货人；删除会物理删除无业务引用客户，存在引用时会被阻止。"
        />
        <Form form={masterCustomerForm} layout="vertical">
          <section className="customer-editor-section">
            <div className="customer-editor-section-heading">客户基础信息</div>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="customerCode"
                  label="客户编号"
                  rules={[{ required: true, whitespace: true, message: '请输入客户编号' }]}
                >
                  <Input placeholder="例如 9409" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item
                  name="customerName"
                  label="客户名称"
                  rules={[{ required: true, whitespace: true, message: '请输入客户名称' }]}
                >
                  <Input placeholder="例如 Daloday" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12} lg={8}>
                <Form.Item name="customerSource" label="客户来源">
                  <AutoComplete
                    allowClear
                    options={customerSources
                      .filter((source) => source.enabled)
                      .map((source) => ({ value: source.name, label: source.name }))}
                    filterOption={(inputValue, option) => String(option?.value ?? '').toLocaleLowerCase('zh-CN').includes(inputValue.toLocaleLowerCase('zh-CN'))}
                    notFoundContent={customerSourcesLoading ? '正在加载来源资料库…' : '资料库中没有，可直接输入'}
                    placeholder="选择已有来源，或直接输入自定义来源"
                  />
                </Form.Item>
                {showSaveCustomerSourceOption ? (
                  <Form.Item name="saveCustomerSourceToCatalog" valuePropName="checked" className="customer-source-save-option">
                    <Checkbox>同时保存到客户来源资料库，供下次选择</Checkbox>
                  </Form.Item>
                ) : null}
              </Col>
              {canAssignCustomerSalesperson ? (
                <Col xs={24} md={12} lg={12}>
                  {editingMasterCustomer?.salesperson && !salespersonAccounts.some((account) => account.username === editingMasterCustomer.salesperson) ? (
                    <Alert
                      className="customer-editor-salesperson-warning"
                      type="warning"
                      showIcon
                      message={`当前归属 ${editingMasterCustomer.salesperson} 已停用或不属于业务组，请改派给启用的业务组人员或清空归属。`}
                    />
                  ) : null}
                  <Form.Item name="salesperson" label="业务员归属">
                    <Select
                      allowClear
                      showSearch
                      loading={salespersonAccountsLoading}
                      optionFilterProp="label"
                      placeholder="选择启用的业务组人员；留空表示未指派"
                      options={[
                        ...salespersonAccounts.map((account) => ({
                          value: account.username,
                          label: `${account.username}${account.name || account.nickname ? ` · ${account.name || account.nickname}` : ''}${account.site ? ` · ${account.site}` : ''} · 启用`
                        })),
                        ...(editingMasterCustomer?.salesperson && !salespersonAccounts.some((account) => account.username === editingMasterCustomer.salesperson)
                          ? [{ value: editingMasterCustomer.salesperson, label: `${editingMasterCustomer.salesperson} · 已停用/非业务组`, disabled: true }]
                          : [])
                      ]}
                    />
                  </Form.Item>
                </Col>
              ) : (
                <Col xs={24} md={12} lg={12}>
                  <Form.Item name="salesperson" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label="业务员归属" htmlFor="salespersonReadonly">
                    <Input id="salespersonReadonly" aria-label="业务员归属" value={currentSalesperson} disabled />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} md={12} lg={12}>
                <Form.Item
                  name="defaultSettlementMethod"
                  label="结算方式"
                  rules={[{ required: true, message: '请选择结算方式' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    loading={financeCatalog.loading}
                    options={financeCatalog.settlementOptions}
                    placeholder="请选择资料库结算方式"
                  />
                </Form.Item>
              </Col>
            </Row>
          </section>
          {!editingMasterCustomer && canManageCustomerContacts ? (
            <Form.List name="contacts">
              {(fields, { add, remove }) => (
                <section className="customer-editor-section customer-editor-contacts-section">
                  <Flex justify="space-between" align="center" className="customer-editor-contact-heading">
                    <Space size={8}>
                      <div className="customer-editor-section-heading">收货信息</div>
                      <Text type="secondary">可选，最多 4 位</Text>
                    </Space>
                    <Button
                      type="text"
                      icon={<Plus size={18} />}
                      aria-label="新增收货人"
                      title="新增收货人"
                      disabled={fields.length >= 4}
                      onClick={() => add({ receiverName: '', receiverCompany: '', receiverPhone: '', fbaWarehouseCode: '', receiverAddress: '', receiverCountry: '', receiverState: '', receiverPostalCode: '' })}
                    />
                  </Flex>
                  {fields.length ? fields.map((field, index) => (
                    <div className="customer-editor-contact-row" key={field.key}>
                      <Flex justify="space-between" align="center" className="customer-editor-contact-row-heading">
                        <Text strong>收货人 {index + 1}</Text>
                        <Button
                          type="text"
                          danger
                          icon={<Trash2 size={16} />}
                          aria-label={`删除收货人 ${index + 1}`}
                          title="删除收货人"
                          onClick={() => remove(field.name)}
                        />
                      </Flex>
                      <Row gutter={[12, 0]}>
                        <Col xs={24} md={12} lg={4}>
                          <Form.Item name={[field.name, 'receiverName']} label="收货人名称" rules={[{ required: true, whitespace: true, message: '请输入收货人名称' }]}>
                            <Input placeholder="姓名" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12} lg={4}>
                          <Form.Item name={[field.name, 'receiverCompany']} label="收货人公司名称">
                            <Input placeholder="公司名称" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12} lg={4}>
                          <Form.Item name={[field.name, 'receiverPhone']} label="收货人电话">
                            <Input placeholder="联系电话" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12} lg={3}>
                          <Form.Item name={[field.name, 'fbaWarehouseCode']} label="FBA仓库代码">
                            <Input placeholder="例如 ONT8" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8} lg={3}>
                          <Form.Item name={[field.name, 'receiverCountry']} label="收货国家">
                            <Input placeholder="US" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8} lg={3}>
                          <Form.Item name={[field.name, 'receiverState']} label="州/省">
                            <Input placeholder="CA" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={8} lg={3}>
                          <Form.Item name={[field.name, 'receiverPostalCode']} label="邮编">
                            <Input placeholder="90001" />
                          </Form.Item>
                        </Col>
                        <Col xs={24}>
                          <Form.Item name={[field.name, 'receiverAddress']} label="收货人地址">
                            <Input placeholder="详细收货地址" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  )) : <div className="customer-editor-contact-empty">点击右侧 + 添加收货信息</div>}
                </section>
              )}
            </Form.List>
          ) : null}
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
            label="收货人名称"
            rules={[{ required: true, whitespace: true, message: '请输入收货人名称' }]}
          >
            <Input placeholder="例如 Daloday Contact" />
          </Form.Item>
          <Form.Item name="receiverCompany" label="收货人公司名称">
            <Input placeholder="例如 Daloday Inc." />
          </Form.Item>
          <Form.Item name="receiverPhone" label="收货人电话">
            <Input placeholder="例如 13800000001" />
          </Form.Item>
          <Form.Item name="fbaWarehouseCode" label="FBA仓库代码">
            <Input placeholder="例如 ONT8" />
          </Form.Item>
          <Form.Item name="receiverAddress" label="收货人地址">
            <Input placeholder="例如 9409 Sample Street" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="receiverCountry" label="收货国家">
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
        open={masterAgentOpen && canReadAgents}
        destroyOnHidden
        okText={editingMasterAgent ? '保存代理' : '创建代理'}
        cancelText="取消"
        width={1000}
        className="master-agent-edit-modal"
        onOk={() => void handleSubmitMasterAgent()}
        onCancel={() => {
          setMasterAgentOpen(false);
          setEditingMasterAgent(null);
          masterAgentForm.resetFields();
        }}
      >
        <Form form={masterAgentForm} layout="vertical" className="master-agent-edit-form">
          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item
                name="agentShortName"
                label="代理简称"
                rules={[{ required: true, whitespace: true, message: '请输入代理简称' }]}
              >
                <Input placeholder="例如 加时特" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="settlementCycle" label="代理账期">
                <Select allowClear placeholder="请选择代理账期" options={agentSettlementCycleOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="agentName"
                label={agentFieldLabels.detailedCompanyName}
                rules={[{ required: true, whitespace: true, message: `请输入${agentFieldLabels.detailedCompanyName}` }]}
              >
                <Input placeholder="例如 深圳加时特" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.List name="warehouses">
                {(fields, { add, remove }) => (
                  <Card
                    className="master-agent-warehouse-card"
                    size="small"
                    title="仓库信息"
                    extra={
                      <Space size={4}>
                        <Text type="secondary">{`${fields.length}/${MAX_AGENT_WAREHOUSES}`}</Text>
                        <Button
                          aria-label="新增仓库"
                          disabled={fields.length >= MAX_AGENT_WAREHOUSES}
                          icon={<Plus size={16} />}
                          onClick={() => add(emptyAgentWarehouse())}
                          size="small"
                          type="text"
                        />
                      </Space>
                    }
                  >
                    <Space className="full-width" direction="vertical" size={8}>
                      {fields.map((field, index) => (
                        <div className="master-agent-warehouse-record" key={field.key}>
                          <div className="master-agent-warehouse-record-head">
                            <Text strong>{`仓库${agentItemOrdinals[index]}`}</Text>
                            {fields.length > 1 ? (
                              <Button
                                aria-label={`删除仓库${agentItemOrdinals[index]}`}
                                danger
                                icon={<Trash2 size={15} />}
                                onClick={() => remove(field.name)}
                                size="small"
                                type="text"
                              />
                            ) : null}
                          </div>
                          <Row gutter={12}>
                            <Col xs={24} md={12} lg={14}>
                              <Form.Item label="仓库地址" name={[field.name, 'address']}>
                                <Input aria-label={`仓库${agentItemOrdinals[index]}仓库地址`} placeholder="请输入仓库详细地址" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6} lg={5}>
                              <Form.Item label="联系人姓名" name={[field.name, 'contactName']}>
                                <Input aria-label={`仓库${agentItemOrdinals[index]}联系人姓名`} placeholder="请输入姓名" />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} md={6} lg={5}>
                              <Form.Item label="联系电话" name={[field.name, 'contactPhone']}>
                                <Input aria-label={`仓库${agentItemOrdinals[index]}联系电话`} inputMode="tel" placeholder="请输入电话" />
                              </Form.Item>
                            </Col>
                          </Row>
                        </div>
                      ))}
                    </Space>
                  </Card>
                )}
              </Form.List>
            </Col>
            <Col xs={24}>
              <Form.Item name="trackingWebsite" label="查询网站">
                <Input placeholder="例如 https://track.example.com?no={transferNo}" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.List name="invoiceTemplates">
                {(fields, { add, remove }) => (
                  <Card
                    size="small"
                    title="发票模板"
                    extra={<Space size={4}>
                      <Text type="secondary">{fields.length ? `${fields.length} 套；运单下载时人工选择` : '按需添加'}</Text>
                      <Button aria-label="新增发票模板" disabled={fields.length >= MAX_AGENT_INVOICE_TEMPLATES} icon={<Plus size={16} />} onClick={() => add({ name: '', url: '' })} size="small" type="text" />
                    </Space>}
                  >
                    {fields.length ? (
                      <Space className="full-width" direction="vertical" size={8}>
                        {fields.map((field, index) => (
                          <Row gutter={12} key={field.key} align="top">
                            <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                            <Col xs={24} md={8}><Form.Item name={[field.name, 'name']} label={`模板 ${index + 1} 名称`} rules={[{ required: true, whitespace: true, message: '请输入模板名称' }]}><Input placeholder={`例如 模板 ${index + 1}.xlsx`} /></Form.Item></Col>
                            <Col xs={24} md={15}><Form.Item label={`模板 ${index + 1} 文件`} required><Space.Compact className="full-width">
                              <Form.Item name={[field.name, 'url']} noStyle rules={[{ required: true, whitespace: true, message: '请上传或填写模板文件' }]}><Input aria-label={`模板 ${index + 1} 文件`} placeholder="上传或粘贴 Excel 后自动填充" onPaste={(event) => handleAgentInvoicePaste(index, event)} /></Form.Item>
                              <Upload key={`invoice-template-upload-${index}-${invoiceUploadInputVersion}`} accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={uploadingInvoiceTemplateIndex !== null} showUploadList={false} beforeUpload={(file) => { void handleAgentInvoiceTemplate(index, file as File); return false; }}><Button loading={uploadingInvoiceTemplateIndex === index}>上传模板</Button></Upload>
                            </Space.Compact></Form.Item></Col>
                            <Col xs={24} md={1}><Button aria-label={`删除发票模板 ${index + 1}`} danger icon={<Trash2 size={15} />} onClick={() => remove(field.name)} size="small" type="text" /></Col>
                          </Row>
                        ))}
                      </Space>
                    ) : <Text type="secondary">暂无发票模板，点击右上角“+”添加。</Text>}
                  </Card>
                )}
              </Form.List>
            </Col>
            {canReadAgentBanks ? (
              <>
                <Form.List name="bankAccounts">
                  {(fields, { add, remove }) => (
                    <Col xs={24}>
                      <Card
                        size="small"
                        title="收款银行账户"
                        extra={
                          <Space size={4}>
                            <Text type="secondary">{`${fields.length}/${MAX_AGENT_BANK_ACCOUNTS}`}</Text>
                            {canCreateAgentBanks ? <Button
                              aria-label="新增收款银行账户"
                              disabled={fields.length >= MAX_AGENT_BANK_ACCOUNTS}
                              icon={<Plus size={16} />}
                              onClick={() => add({ currency: 'RMB', enabled: 'true' })}
                              size="small"
                              type="text"
                            /> : null}
                          </Space>
                        }
                      >
                        <Space className="full-width" direction="vertical" size={12}>
                          {fields.map((field, index) => {
                            const bankAccountId = masterAgentForm.getFieldValue(['bankAccounts', field.name, 'id']);
                            const canWriteBankAccount = bankAccountId ? canUpdateAgentBanks : canCreateAgentBanks;
                            return <Card
                              key={field.key}
                              size="small"
                              title={fields.length === 1 ? '收款银行账户' : `收款银行账户${agentItemOrdinals[index]}`}
                              extra={fields.length > 1 ? (
                                <Button
                                  aria-label={`删除收款银行账户${agentItemOrdinals[index]}`}
                                  danger
                                  disabled={!canWriteBankAccount}
                                  icon={<Trash2 size={15} />}
                                  onClick={() => remove(field.name)}
                                  size="small"
                                  type="text"
                                />
                              ) : undefined}
                            >
                              <Form.Item name={[field.name, 'id']} hidden>
                                <Input />
                              </Form.Item>
                              <Row gutter={12}>
                                <Col xs={24} md={8}>
                                  <Form.Item name={[field.name, 'accountName']} label="收款方">
                                    <Input disabled={!canWriteBankAccount} placeholder="例如 深圳市鲸链国际物流有限公司" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                  <Form.Item name={[field.name, 'bankName']} label="开户银行">
                                    <Input disabled={!canWriteBankAccount} placeholder="例如 招商银行深圳福永支行" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                  <Form.Item name={[field.name, 'bankAccountNo']} label="银行账号">
                                    <Input disabled={!canWriteBankAccount} placeholder="例如 755972950810001" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                  <Form.Item name={[field.name, 'currency']} label="币种">
                                    <select aria-label={`收款银行账户${index + 1}币种`} className="native-select" disabled={!canWriteBankAccount}>
                                      <option value="RMB">RMB</option>
                                      <option value="USD">USD</option>
                                    </select>
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                  <Form.Item name={[field.name, 'enabled']} label="状态">
                                    <select aria-label={`收款银行账户${index + 1}状态`} className="native-select" disabled={!canWriteBankAccount}>
                                      <option value="true">启用</option>
                                      <option value="false">停用</option>
                                    </select>
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={8}>
                                  <Form.Item name={[field.name, 'remark']} label="备注">
                                    <Input disabled={!canWriteBankAccount} placeholder="例如 默认付款账户" />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </Card>;
                          })}
                        </Space>
                      </Card>
                    </Col>
                  )}
                </Form.List>
              </>
            ) : null}
          </Row>
          <Form.Item name="agentCode" hidden><Input /></Form.Item>
          <Form.Item name="agentEnabled" hidden><Input /></Form.Item>
          <Form.Item name="agentIntegrationType" hidden><Input /></Form.Item>
        </Form>
      </Modal>
    </AppPage>
  );
}
