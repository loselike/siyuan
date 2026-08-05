import type { Key } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, AutoComplete, Button, Card, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { calculateCompanyChannelChargeWeight, calculateCompanyChannelChargeWeightFromCargo, evaluateCompanyChannelWarnings, formatShipmentProductNames, getCompanyChannelAggregateCargoValidationError, normalizeShipmentProductNames, type AgentSummary, type ChannelSummary, type CustomerContactSummary, type CustomerSummary, type ExchangeRateSummary, type FinanceCatalogItemSummary, type FinanceCatalogCategory, type MiscFeeTallyDueSummary, type OrderEntryCreateInput, type OrderEntryDetailSummary, type OrderEntryWarehousePackageQuery, type ShipmentFinanceItemType, type WarehousePackageSummary, type WarehouseTallyTaskSummary, type WaterReceiptSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../../apiClient';
import { formatBeijingDateTime, formatBeijingDateTimeInputValue, parseBeijingDateTimeInputToIso } from '../../shared/format';
import {
  createFinanceFeeNameOptions,
  createSettlementMethodOptions,
  financeCatalogCurrencyOptions,
  getSettlementMethodCurrency,
  getSettlementMethodRows,
  normalizeFinanceCatalogCurrency
} from '../catalog';
import {
  calculateFinanceEntryFeeAmount,
  createFinanceEntryFeeDraft,
  roundFinanceNumber,
  type FinanceEntryFeeDraft,
  type FinanceEntryFormValues
} from './entryModel';
import { countryOptions as builtInCountryOptions, filterLocationOption, getStateOptions } from './countryStateOptions';
import { WarehouseTallyHistoryChain } from '../../warehouse/WarehouseTallyHistoryChain';
import { ManagedTable } from '../../shared/ui';
import { WarehousePackageNoWithTallyStatus } from '../../shared/WarehousePackageNoWithTallyStatus';
import { agentFieldLabels } from '../../shared/agentFieldLabels';
import { getDetailedCompanyAgentOptions, resolveAgentIdByIdentity } from '../../shared/agentIdentity';
import { resolveShipmentOutboundOrderNo } from '../../shared/shipmentOrderNo';

const { Text } = Typography;

export function resolveCurrentUsdToRmbRate(exchangeRates: ExchangeRateSummary[], now = new Date()) {
  const timestamp = now.getTime();
  return exchangeRates
    .filter((rate) => rate.enabled
      && rate.baseCurrency.toUpperCase() === 'USD'
      && rate.quoteCurrency.toUpperCase() === 'RMB'
      && Date.parse(rate.activeAt) <= timestamp
      && (!rate.endAt || Date.parse(rate.endAt) >= timestamp))
    .sort((left, right) => Date.parse(right.activeAt) - Date.parse(left.activeAt))[0]?.rate;
}

function getDefaultFeeName(items: FinanceCatalogItemSummary[], preferred: string) {
  return items.find((item) => item.category === 'FEE_NAME' && item.enabled && item.name === preferred)?.name ?? '';
}

export function resolveOrderEntryBusinessCostAccess(role: RoleKey, permissions: readonly PermissionKey[]) {
  const canManage = role === 'ADMIN' || permissions.includes('business:order-entry:business-cost-write');
  return {
    canManage,
    canView: canManage || permissions.includes('business:order-entry:business-cost-view')
  };
}

function summarizeWarehouseCargo(packages: WarehousePackageSummary[]) {
  return packages.reduce(
    (total, pkg) => {
      const packageCount = Math.max(1, Number(pkg.packageCount) || 1);
      return {
        packageCount: total.packageCount + packageCount,
        // 仓库记录中的重量是单件实重，方数已是该行全部件数的总方数。
        weightKg: total.weightKg + Math.max(0, Number(pkg.weightKg) || 0) * packageCount,
        cbm: total.cbm + Math.max(0, Number(pkg.totalCbm ?? pkg.cbm) || 0)
      };
    },
    { packageCount: 0, weightKg: 0, cbm: 0 }
  );
}

function calculateSelectedPackageVolumetricWeight(pkg: WarehousePackageSummary, divisor: 5000 | 6000) {
  if (divisor === 5000 && pkg.volumetricWeightKg5000 !== undefined) return pkg.volumetricWeightKg5000;
  if (divisor === 6000 && pkg.totalVolumetricWeightKg !== undefined) return pkg.totalVolumetricWeightKg;
  const volumetricWeight = (Number(pkg.lengthCm) || 0) * (Number(pkg.widthCm) || 0) * (Number(pkg.heightCm) || 0) * Math.max(1, Number(pkg.packageCount) || 1) / divisor;
  return roundFinanceNumber(volumetricWeight);
}

interface FinanceEntryPageProps {
  apiClient: ApiClient;
  role: RoleKey;
  permissions: PermissionKey[];
  username: string;
  financeCatalogItems: FinanceCatalogItemSummary[];
  customers: CustomerSummary[];
  customerContacts: CustomerContactSummary[];
  onCustomerContactsChange?: (contacts: CustomerContactSummary[]) => void;
  onCatalogChange?: () => Promise<void> | void;
  onCreated?: (detail?: OrderEntryDetailSummary, submittedForReview?: boolean) => Promise<void> | void;
  draftId?: string;
  initialDraftDetail?: OrderEntryDetailSummary;
  canCreateOrderEntry: boolean;
  canSaveDraft: boolean;
  canSubmitForReview: boolean;
  canUseAgentFields: boolean;
  onDraftClosed?: () => void;
  preselectedPackageIds?: string[];
  onPreselectedPackageIdsConsumed?: () => void;
}

export function FinanceEntryPage({ apiClient, role, permissions, username, financeCatalogItems, customers, customerContacts, onCustomerContactsChange, onCatalogChange, onCreated, draftId, initialDraftDetail, canCreateOrderEntry, canSaveDraft, canSubmitForReview, canUseAgentFields, onDraftClosed, preselectedPackageIds, onPreselectedPackageIdsConsumed }: FinanceEntryPageProps) {
  const { message: messageApi, modal } = AntdApp.useApp();
  const [form] = Form.useForm<FinanceEntryFormValues>();
  const [packages, setPackages] = useState<WarehousePackageSummary[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<WarehousePackageSummary[]>([]);
  const [packagePickerSelected, setPackagePickerSelected] = useState<WarehousePackageSummary[]>([]);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [selectedPackageDetailsOpen, setSelectedPackageDetailsOpen] = useState(false);
  const [packageTrackingQuery, setPackageTrackingQuery] = useState('');
  const [packageQuery, setPackageQuery] = useState<OrderEntryWarehousePackageQuery | null>(null);
  const [preselectedPackageLoadKey, setPreselectedPackageLoadKey] = useState('');
  const [preselectedPackageWarning, setPreselectedPackageWarning] = useState<{ requestedCount: number; availableCount: number } | null>(null);
  const [tallyHistoryPackage, setTallyHistoryPackage] = useState<WarehousePackageSummary | null>(null);
  const [tallyHistoryTasks, setTallyHistoryTasks] = useState<WarehouseTallyTaskSummary[]>([]);
  const [tallyHistoryLoading, setTallyHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptPickerRow, setReceiptPickerRow] = useState<FinanceEntryFeeDraft | null>(null);
  const [receiptRows, setReceiptRows] = useState<WaterReceiptSummary[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateSummary[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [tallyMiscFeeDue, setTallyMiscFeeDue] = useState<MiscFeeTallyDueSummary | null>(null);
  const [selectedTallyMiscFeeIds, setSelectedTallyMiscFeeIds] = useState<string[]>([]);
  const [receivables, setReceivables] = useState<FinanceEntryFeeDraft[]>([
    createFinanceEntryFeeDraft('RECEIVABLE', { name: getDefaultFeeName(financeCatalogItems, '运费') })
  ]);
  const [businessCosts, setBusinessCosts] = useState<FinanceEntryFeeDraft[]>([
    createFinanceEntryFeeDraft('BUSINESS_COST', { name: getDefaultFeeName(financeCatalogItems, '业务员成本') })
  ]);
  const [payables, setPayables] = useState<FinanceEntryFeeDraft[]>([
    createFinanceEntryFeeDraft('PAYABLE')
  ]);
  const [cargoDataSource, setCargoDataSource] = useState<'AUTO_MATCHED' | 'MANUAL_ADJUSTED'>('AUTO_MATCHED');
  const [chargeWeightOverridden, setChargeWeightOverridden] = useState(false);
  const [receiverContactEdited, setReceiverContactEdited] = useState(false);
  const canEditOrderEntryPayables = role === 'ADMIN' || permissions.includes('finance:order-fee:payable:manage');
  const businessCostAccess = resolveOrderEntryBusinessCostAccess(role, permissions);
  const canWriteOrderEntryBusinessCosts = businessCostAccess.canManage;
  const canViewOrderEntryBusinessCosts = businessCostAccess.canView;
  const canViewFinanceAuditFields = role === 'ADMIN' || [
    'business:review:finance-detail-view',
    'finance:order-fee:payable:view',
    'finance:payable:view-sensitive',
    'finance:business-cost:view-agent',
    'finance:business-cost:view-profit'
  ].some((permission) => permissions.includes(permission as PermissionKey));
  const canEditEntryAt = role === 'ADMIN' || permissions.includes('finance:payable:manage');
  const settlementRows = useMemo(() => getSettlementMethodRows(financeCatalogItems), [financeCatalogItems]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(settlementRows), [settlementRows]);
  const agentOptions = useMemo(
    () => getDetailedCompanyAgentOptions(agents),
    [agents]
  );
  const businessChannelOptions = useMemo(
    () => channels
      .filter((channel) => channel.enabled)
      .map((channel) => ({ label: channel.name, value: channel.id })),
    [channels]
  );
  const createdAtText = useMemo(() => formatBeijingDateTime(new Date().toISOString()), []);
  const entryAtDefault = useMemo(() => formatBeijingDateTimeInputValue(), []);
  const watchedCustomerOrderNo = Form.useWatch('customerOrderNo', form);
  const watchedAgentId = Form.useWatch('agentId', form);
  const watchedCustomerCode = Form.useWatch('customerCode', form);
  const watchedReceiverCountry = Form.useWatch('receiverCountry', form);
  const watchedReceivingChannel = Form.useWatch('receivingChannel', form);
  const watchedPackageCount = Form.useWatch('packageCount', form);
  const watchedActualWeightKg = Form.useWatch('actualWeightKg', form);
  const watchedVolumeCbm = Form.useWatch('volumeCbm', form);
  const watchedChargeableWeightKg = Form.useWatch('chargeableWeightKg', form);
  const selectedCompanyChannel = useMemo(
    () => channels.find((channel) => channel.id === watchedReceivingChannel || channel.name === watchedReceivingChannel),
    [channels, watchedReceivingChannel]
  );
  const selectedCustomer = useMemo(
    () => {
      const customerCode = watchedCustomerCode?.trim();
      if (!customerCode) return undefined;
      return customers.find((customer) => customer.code === customerCode || customer.id === customerCode);
    },
    [customers, watchedCustomerCode]
  );
  const selectedCustomerContacts = useMemo(
    () => selectedCustomer ? customerContacts.filter((contact) => contact.customerId === selectedCustomer.id && contact.enabled) : [],
    [customerContacts, selectedCustomer]
  );
  const selectedReceiverContactId = Form.useWatch('receiverContactId', form);
  const selectedReceiverContact = useMemo(
    () => selectedCustomerContacts.find((contact) => contact.id === selectedReceiverContactId),
    [selectedCustomerContacts, selectedReceiverContactId]
  );
  const countryOptions = useMemo(() => builtInCountryOptions, []);
  const stateOptions = useMemo(() => getStateOptions(watchedReceiverCountry), [watchedReceiverCountry]);
  useEffect(() => {
    const settlementMethod = form.getFieldValue('settlementMethod') || selectedCustomer?.defaultSettlementMethod || settlementRows[0]?.name;
    form.setFieldsValue({
      // 客户名称只由客户编号对应的资料库记录带出，避免编号变更后保留旧名称。
      customerName: selectedCustomer?.name ?? '',
      settlementMethod,
      currency: settlementMethod ? getSettlementMethodCurrency(settlementRows, settlementMethod) ?? form.getFieldValue('currency') ?? 'RMB' : form.getFieldValue('currency') ?? 'RMB'
    });
  }, [form, selectedCustomer, settlementRows]);
  useEffect(() => {
    form.setFieldsValue({ receiverContactId: undefined, saveReceiverToCustomer: false });
    setReceiverContactEdited(false);
  }, [form, selectedCustomer?.id]);
  const cargoTypeOptions = useMemo(
    () => financeCatalogItems
      .filter((item) => item.category === 'CARGO_TYPE' && item.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
      .map((item) => ({ label: item.name, value: item.name })),
    [financeCatalogItems]
  );
  const feeNameOptions = useMemo(
    () => createFinanceFeeNameOptions(financeCatalogItems),
    [financeCatalogItems]
  );
  const receivableDefaultFeeName = useMemo(() => getDefaultFeeName(financeCatalogItems, '运费'), [financeCatalogItems]);
  const businessCostDefaultFeeName = useMemo(() => getDefaultFeeName(financeCatalogItems, '业务员成本'), [financeCatalogItems]);
  const feeNameSet = useMemo(
    () => new Set(financeCatalogItems.filter((item) => item.category === 'FEE_NAME').map((item) => item.name.trim())),
    [financeCatalogItems]
  );

  useEffect(() => {
    if (receivableDefaultFeeName) {
      setReceivables((rows) => rows.map((row) => row.name ? row : { ...row, name: receivableDefaultFeeName }));
    }
    if (businessCostDefaultFeeName) {
      setBusinessCosts((rows) => rows.map((row) => row.name ? row : { ...row, name: businessCostDefaultFeeName }));
    }
  }, [businessCostDefaultFeeName, receivableDefaultFeeName]);
  const cargoTypeSet = useMemo(
    () => new Set(financeCatalogItems.filter((item) => item.category === 'CARGO_TYPE').map((item) => item.name.trim())),
    [financeCatalogItems]
  );
  const productNameOptions = useMemo(
    () => financeCatalogItems
      .filter((item) => item.category === 'PRODUCT_NAME' && item.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
      .map((item) => ({ label: item.name, value: item.name })),
    [financeCatalogItems]
  );
  const productNameSet = useMemo(
    () => new Set(financeCatalogItems.filter((item) => item.category === 'PRODUCT_NAME').map((item) => item.name.trim())),
    [financeCatalogItems]
  );

  useEffect(() => {
    const customerCode = watchedCustomerCode?.trim();
    if (!customerCode) {
      setReceiptRows([]);
      return;
    }
    let mounted = true;
    apiClient.waterReceipts({ customerCode, status: 'ALL', page: 1, pageSize: 1000 })
      .then((response) => {
        if (mounted) setReceiptRows(response.rows.filter((item) => ['ARRIVED', 'PARTIAL_MATCHED'].includes(item.status) && Number(item.balance) > 0));
      })
      .catch(() => {
        if (mounted) setReceiptRows([]);
      });
    return () => {
      mounted = false;
    };
  }, [apiClient, watchedCustomerCode]);

  useEffect(() => {
    const customerCode = watchedCustomerCode?.trim();
    if (!customerCode) {
      setTallyMiscFeeDue(null);
      setSelectedTallyMiscFeeIds([]);
      return;
    }
    let mounted = true;
    apiClient.miscFeeTallyDue(customerCode)
      .then((response) => {
        if (!mounted) return;
        setTallyMiscFeeDue(response);
        setSelectedTallyMiscFeeIds(response.rows.filter((row) => row.dueLevel === 'MANDATORY' && row.confirmationStatus === 'CONFIRMED').map((row) => row.id));
      })
      .catch(() => {
        if (!mounted) return;
        setTallyMiscFeeDue(null);
        setSelectedTallyMiscFeeIds([]);
      });
    return () => {
      mounted = false;
    };
  }, [apiClient, watchedCustomerCode]);

  const maybeSaveCatalogItem = useCallback((category: FinanceCatalogCategory, rawName?: string) => {
    const name = rawName?.trim();
    if (!name) return;
    const exists = category === 'FEE_NAME' ? feeNameSet.has(name) : category === 'CARGO_TYPE' ? cargoTypeSet.has(name) : productNameSet.has(name);
    if (exists) return;
    const label = category === 'FEE_NAME' ? '费用名称' : category === 'CARGO_TYPE' ? '货物类型' : '品名';
    modal.confirm({
      title: `保存新的${label}？`,
      content: `${name} 不在资料库中，是否保存到资料库供下次选择？`,
      okText: '保存',
      cancelText: '暂不保存',
      onOk: async () => {
        try {
          await apiClient.createFinanceCatalogItem({
            category,
            name,
            enabled: true,
            currency: category === 'FEE_NAME' ? 'RMB' : undefined
          });
          messageApi.success('已保存到资料库');
          await onCatalogChange?.();
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : '保存到资料库失败');
        }
      }
    });
  }, [apiClient, cargoTypeSet, feeNameSet, messageApi, onCatalogChange, productNameSet]);

  const packagePickerSelectedIds = useMemo<Key[]>(() => packagePickerSelected.map((pkg) => pkg.id), [packagePickerSelected]);

  const loadPackages = useCallback(async (query: OrderEntryWarehousePackageQuery) => {
    setPackageLoading(true);
    try {
      setPackages(await apiClient.orderEntryPackages(query));
      setPackageQuery(query);
    } catch (error) {
      modal.error({ title: '仓库货物加载失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setPackageLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    let mounted = true;
    apiClient.masterData()
      .then((snapshot) => {
        if (!mounted) return;
        setExchangeRates(snapshot.exchangeRates);
        setChannels(snapshot.channels);
        if (canUseAgentFields) setAgents(snapshot.agents);
      })
      .catch(() => {
        if (mounted) {
          setAgents([]);
          setChannels([]);
        }
      });
    return () => {
      mounted = false;
    };
  }, [apiClient, canUseAgentFields]);

  const matchedCargoTotals = useMemo(() => {
    const summary = summarizeWarehouseCargo(selectedPackages);
    const chargeWeightKg = selectedCompanyChannel
      ? calculateCompanyChannelChargeWeight(selectedCompanyChannel, selectedPackages)
      : selectedPackages.reduce((sum, pkg) => sum + pkg.chargeableWeightKg, 0);
    return { ...summary, chargeWeightKg: roundFinanceNumber(chargeWeightKg) };
  }, [selectedCompanyChannel, selectedPackages]);
  const companyChannelWarnings = useMemo(
    () => selectedCompanyChannel ? evaluateCompanyChannelWarnings(selectedCompanyChannel, selectedPackages) : [],
    [selectedCompanyChannel, selectedPackages]
  );
  const companyChannelWarningsByPackageIndex = useMemo(() => {
    const warningsByPackageIndex = new Map<number, typeof companyChannelWarnings>();
    companyChannelWarnings.forEach((warning) => {
      const packageWarnings = warningsByPackageIndex.get(warning.packageIndex - 1) ?? [];
      packageWarnings.push(warning);
      warningsByPackageIndex.set(warning.packageIndex - 1, packageWarnings);
    });
    return warningsByPackageIndex;
  }, [companyChannelWarnings]);
  const aggregateCargoRuleError = useMemo(() => {
    if (!selectedCompanyChannel || cargoDataSource !== 'MANUAL_ADJUSTED') return undefined;
    return getCompanyChannelAggregateCargoValidationError(selectedCompanyChannel, {
      packageCount: Number(watchedPackageCount ?? 0),
      actualWeightKg: Number(watchedActualWeightKg ?? 0),
      volumeCbm: Number(watchedVolumeCbm ?? 0)
    });
  }, [cargoDataSource, selectedCompanyChannel, watchedActualWeightKg, watchedPackageCount, watchedVolumeCbm]);
  const totals = useMemo(() => ({
    packageCount: Number(watchedPackageCount ?? matchedCargoTotals.packageCount) || 0,
    weightKg: Number(watchedActualWeightKg ?? matchedCargoTotals.weightKg) || 0,
    cbm: Number(watchedVolumeCbm ?? matchedCargoTotals.cbm) || 0,
    chargeWeightKg: Number(watchedChargeableWeightKg ?? matchedCargoTotals.chargeWeightKg) || 0
  }), [matchedCargoTotals, watchedActualWeightKg, watchedChargeableWeightKg, watchedPackageCount, watchedVolumeCbm]);
  const syncCargoChargeWeightToFees = useCallback((chargeWeightKg: number) => {
    const patch = { chargeWeightKg: chargeWeightKg > 0 ? roundFinanceNumber(chargeWeightKg) : undefined };
    setReceivables((rows) => rows.map((row) => ({ ...row, ...patch })));
    setBusinessCosts((rows) => rows.map((row) => ({ ...row, ...patch })));
    setPayables((rows) => rows.map((row) => ({ ...row, ...patch })));
  }, []);
  const calculateCurrentCargoChargeWeight = useCallback((values: Pick<FinanceEntryFormValues, 'packageCount' | 'actualWeightKg' | 'volumeCbm'>, channel = selectedCompanyChannel) => {
    const actualWeightKg = Number(values.actualWeightKg ?? 0);
    const volumeCbm = Number(values.volumeCbm ?? 0);
    if (channel) {
      if (getCompanyChannelAggregateCargoValidationError(channel, {
        packageCount: Number(values.packageCount ?? 0),
        actualWeightKg,
        volumeCbm
      })) return 0;
      return roundFinanceNumber(calculateCompanyChannelChargeWeightFromCargo(channel, {
        packageCount: Number(values.packageCount ?? 0),
        actualWeightKg,
        volumeCbm
      }));
    }
    return roundFinanceNumber(Math.max(actualWeightKg, volumeCbm > 0 ? volumeCbm * 200 : 0));
  }, [selectedCompanyChannel]);
  const updateCargoMetric = useCallback((field: 'packageCount' | 'actualWeightKg' | 'volumeCbm' | 'chargeableWeightKg', value: number | null) => {
    const nextValue = value === null ? undefined : Number(value);
    form.setFieldValue(field, nextValue);
    setCargoDataSource('MANUAL_ADJUSTED');
    if (field === 'chargeableWeightKg') {
      setChargeWeightOverridden(true);
      syncCargoChargeWeightToFees(nextValue ?? 0);
      return;
    }
    const values = { ...form.getFieldsValue(true), [field]: nextValue } as FinanceEntryFormValues;
    if (!chargeWeightOverridden) {
      const chargeWeightKg = calculateCurrentCargoChargeWeight(values);
      form.setFieldValue('chargeableWeightKg', chargeWeightKg);
      syncCargoChargeWeightToFees(chargeWeightKg);
    }
  }, [calculateCurrentCargoChargeWeight, chargeWeightOverridden, form, syncCargoChargeWeightToFees]);
  const recalculateCargoChargeWeight = useCallback((channelValue?: string) => {
    const channel = channelValue === undefined
      ? selectedCompanyChannel
      : channels.find((item) => item.id === channelValue || item.name === channelValue);
    const warehouseCargo = summarizeWarehouseCargo(selectedPackages);
    const useWarehouseCargo = selectedPackages.length > 0 && cargoDataSource === 'AUTO_MATCHED';
    const chargeWeightKg = useWarehouseCargo
      ? roundFinanceNumber(channel
        ? calculateCompanyChannelChargeWeight(channel, selectedPackages)
        : selectedPackages.reduce((sum, pkg) => sum + pkg.chargeableWeightKg, 0))
      : calculateCurrentCargoChargeWeight(form.getFieldsValue(true), channel);
    if (useWarehouseCargo) {
      form.setFieldsValue({
        packageCount: warehouseCargo.packageCount,
        actualWeightKg: roundFinanceNumber(warehouseCargo.weightKg),
        volumeCbm: roundFinanceNumber(warehouseCargo.cbm, 6)
      });
    }
    form.setFieldValue('chargeableWeightKg', chargeWeightKg);
    setChargeWeightOverridden(false);
    syncCargoChargeWeightToFees(chargeWeightKg);
  }, [calculateCurrentCargoChargeWeight, cargoDataSource, channels, form, selectedCompanyChannel, selectedPackages, syncCargoChargeWeightToFees]);
  const matchedSalesperson = username;
  const clearSelectedPackages = useCallback(() => {
    setSelectedPackages([]);
    setSelectedPackageDetailsOpen(false);
    form.setFieldsValue({ packageCount: undefined, actualWeightKg: undefined, volumeCbm: undefined, chargeableWeightKg: undefined });
    setChargeWeightOverridden(false);
    syncCargoChargeWeightToFees(0);
  }, [form, syncCargoChargeWeightToFees]);

  const applyReceiverContact = (contactId?: string) => {
    const contact = selectedCustomerContacts.find((item) => item.id === contactId);
    if (!contact) {
      setReceiverContactEdited(false);
      return;
    }
    form.setFieldsValue({
      receiverName: contact.name,
      receiverCompany: contact.company,
      receiverPhone: contact.phone,
      fbaWarehouseCode: contact.fbaWarehouseCode,
      receiverAddress: contact.address,
      receiverCountry: contact.country,
      receiverState: contact.state,
      receiverPostalCode: contact.postalCode,
      saveReceiverToCustomer: false
    });
    setReceiverContactEdited(false);
  };

  const handleEntryValuesChange = (changedValues: Partial<FinanceEntryFormValues>) => {
    if (!selectedReceiverContact || !Object.keys(changedValues).some((field) => [
      'receiverName',
      'receiverCompany',
      'receiverPhone',
      'fbaWarehouseCode',
      'receiverAddress',
      'receiverCountry',
      'receiverState',
      'receiverPostalCode'
    ].includes(field))) {
      return;
    }
    setReceiverContactEdited(true);
  };

  const maybeSaveReceiverContact = async (values: FinanceEntryFormValues) => {
    if (!values.saveReceiverToCustomer) return;
    const customerCode = values.customerCode?.trim();
    const customer = customers.find((item) => item.code === customerCode || item.id === customerCode);
    if (!customer) return;
    const activeContacts = customerContacts.filter((contact) => contact.customerId === customer.id && contact.enabled);
    const name = values.receiverName?.trim();
    if (!name) return;
    const phone = values.receiverPhone?.trim() || '';
    const address = values.receiverAddress?.trim() || '';
    const fbaWarehouseCode = values.fbaWarehouseCode?.trim() || '';
    const exists = activeContacts.some((contact) =>
      contact.name.trim() === name &&
      (contact.phone?.trim() || '') === phone &&
      (contact.address?.trim() || '') === address &&
      (contact.fbaWarehouseCode?.trim() || '') === fbaWarehouseCode &&
      (contact.company?.trim() || '') === (values.receiverCompany?.trim() || '') &&
      (contact.country?.trim() || '') === (values.receiverCountry?.trim() || '') &&
      (contact.state?.trim() || '') === (values.receiverState?.trim() || '') &&
      (contact.postalCode?.trim() || '') === (values.receiverPostalCode?.trim() || '')
    );
    if (exists) return;
    const contact = await apiClient.createCustomerContact(customer.id, {
      name,
      company: values.receiverCompany?.trim() || undefined,
      phone: phone || undefined,
      fbaWarehouseCode: fbaWarehouseCode || undefined,
      address: address || undefined,
      country: values.receiverCountry?.trim() || undefined,
      state: values.receiverState?.trim() || undefined,
      postalCode: values.receiverPostalCode?.trim() || undefined
    });
    onCustomerContactsChange?.([...customerContacts.filter((item) => item.id !== contact.id), contact]);
  };

  const updateRows = (type: ShipmentFinanceItemType, updater: (rows: FinanceEntryFeeDraft[]) => FinanceEntryFeeDraft[]) => {
    if (type === 'RECEIVABLE') setReceivables(updater);
    else if (type === 'BUSINESS_COST') setBusinessCosts(updater);
    else setPayables(updater);
  };

  const updateFee = (type: ShipmentFinanceItemType, id: string, patch: Partial<FinanceEntryFeeDraft>) => {
    updateRows(type, (rows) => rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  const addFee = (type: ShipmentFinanceItemType) => {
    const chargeWeightKg = totals.chargeWeightKg ? roundFinanceNumber(totals.chargeWeightKg) : undefined;
    const formCurrency = normalizeFinanceCatalogCurrency(form.getFieldValue('currency')) ?? 'RMB';
    updateRows(type, (rows) => [
      ...rows,
      createFinanceEntryFeeDraft(type, {
        name: type === 'RECEIVABLE' ? receivableDefaultFeeName : type === 'BUSINESS_COST' ? businessCostDefaultFeeName : undefined,
        currency: type === 'PAYABLE' ? 'RMB' : formCurrency,
        agentId: type !== 'RECEIVABLE' ? form.getFieldValue('agentId') : undefined,
        chargeWeightKg
      })
    ]);
  };

  const removeFee = (type: ShipmentFinanceItemType, id: string) => {
    updateRows(type, (rows) => {
      if (rows.length <= 1) {
        return rows;
      }
      messageApi.success('费用行已删除');
      return rows.filter((row) => row.id !== id);
    });
  };

  const reset = () => {
    form.resetFields();
    form.setFieldsValue({ entryAt: formatBeijingDateTimeInputValue() });
    setPackages([]);
    setPackageQuery(null);
    setPackageTrackingQuery('');
    setPackageModalOpen(false);
    clearSelectedPackages();
    setReceivables([createFinanceEntryFeeDraft('RECEIVABLE', { name: receivableDefaultFeeName })]);
    setBusinessCosts([createFinanceEntryFeeDraft('BUSINESS_COST', { name: businessCostDefaultFeeName })]);
    setPayables([createFinanceEntryFeeDraft('PAYABLE')]);
    onDraftClosed?.();
  };

  const hydrateDraftDetail = useCallback((detail: OrderEntryDetailSummary) => {
    const shipment = detail.shipment;
    const toFeeDraft = (type: ShipmentFinanceItemType, row: typeof detail.receivables[number] | typeof detail.businessCosts[number] | typeof detail.payables[number]) =>
      createFinanceEntryFeeDraft(type, {
        name: row.name,
        currency: row.currency,
        amount: row.amount,
        settlementMethod: row.settlementMethod,
        paymentNo: row.paymentNo,
        agentId: canUseAgentFields && 'agentId' in row
          ? row.agentId ?? resolveAgentIdByIdentity(agents, 'agentName' in row ? row.agentName : undefined)
          : undefined,
        agentName: canUseAgentFields && 'agentName' in row ? row.agentName : undefined,
        chargeWeightKg: 'chargeWeightKg' in row ? row.chargeWeightKg : undefined,
        unitPrice: 'unitPrice' in row ? row.unitPrice : undefined,
        remark: row.remark
      });
    form.setFieldsValue({
      entryAt: shipment.entryAt ? formatBeijingDateTimeInputValue(shipment.entryAt) : undefined,
      customerCode: shipment.customerCode,
      customerName: shipment.customerName,
      customerOrderNo: shipment.customerOrderNo,
      subOrderNo: shipment.subOrderNo,
      inboundNo: shipment.inboundNo,
      destinationCountry: shipment.destinationCountry,
      receivingChannel: shipment.channelId || shipment.channelName || shipment.carrier || detail.packages[0]?.receivingChannel,
      agentId: canUseAgentFields ? shipment.agentId ?? resolveAgentIdByIdentity(agents, shipment.agentName) : undefined,
      declarationRequired: shipment.declarationRequired,
      sensitive: shipment.sensitive,
      cargoType: shipment.cargoType,
      packageCount: shipment.packageCount,
      actualWeightKg: shipment.actualWeightKg ?? shipment.weightKg,
      volumeCbm: shipment.volumeCbm,
      chargeableWeightKg: shipment.chargeableWeightKg ?? shipment.receivableWeightKg,
      productNames: normalizeShipmentProductNames(shipment.productNames, shipment.productName),
      settlementMethod: shipment.settlementMethod,
      fbaInboundNo: shipment.fbaInboundNo,
      receiverName: shipment.receiverName,
      receiverCompany: shipment.receiverCompany,
      receiverPhone: shipment.receiverPhone,
      receiverAddress: shipment.receiverAddress,
      receiverCountry: shipment.receiverCountry,
      receiverState: shipment.receiverState,
      receiverPostalCode: shipment.receiverPostalCode,
      fbaWarehouseCode: shipment.fbaWarehouseCode,
      remark: shipment.remark
    });
    setPackages(detail.packages);
    setPackageQuery(detail.shipment.customerCode ? { customerCode: detail.shipment.customerCode } : null);
    setSelectedPackages(detail.packages);
    setCargoDataSource(shipment.cargoDataSource ?? 'AUTO_MATCHED');
    setChargeWeightOverridden(Boolean(shipment.chargeWeightOverridden));
    setReceivables(detail.receivables.length ? detail.receivables.map((row) => toFeeDraft('RECEIVABLE', row)) : [createFinanceEntryFeeDraft('RECEIVABLE', { name: receivableDefaultFeeName })]);
    setBusinessCosts(detail.businessCosts.length ? detail.businessCosts.map((row) => toFeeDraft('BUSINESS_COST', row)) : [createFinanceEntryFeeDraft('BUSINESS_COST', { name: businessCostDefaultFeeName })]);
    setPayables(detail.payables.length ? detail.payables.map((row) => toFeeDraft('PAYABLE', row)) : [createFinanceEntryFeeDraft('PAYABLE')]);
  }, [agents, businessCostDefaultFeeName, canUseAgentFields, form, receivableDefaultFeeName]);

  useEffect(() => {
    if (!draftId) return;
    if (initialDraftDetail?.shipment.id === draftId) {
      hydrateDraftDetail(initialDraftDetail);
      setDraftLoading(false);
      return;
    }
    let active = true;
    setDraftLoading(true);
    apiClient.orderEntryDetail(draftId)
      .then((detail) => {
        if (!active) return;
        hydrateDraftDetail(detail);
      })
      .catch((error) => {
        if (!active) return;
        modal.error({ title: '草稿加载失败', content: error instanceof Error ? error.message : '请稍后重试' });
        onDraftClosed?.();
      })
      .finally(() => {
        if (active) setDraftLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiClient, draftId, hydrateDraftDetail, initialDraftDetail, modal, onDraftClosed]);

  const openReceiptPicker = useCallback(async (row: FinanceEntryFeeDraft) => {
    const customerCode = form.getFieldValue('customerCode')?.trim();
    if (!customerCode) {
      modal.warning({ title: '请先填写客户编号', content: '水单匹配只能选择同客户编号下的已到账水单。' });
      return;
    }
    setReceiptPickerRow(row);
    setReceiptLoading(true);
    try {
      const response = await apiClient.waterReceipts({ customerCode, status: 'ALL', page: 1, pageSize: 1000 });
      setReceiptRows(response.rows.filter((item) => ['ARRIVED', 'PARTIAL_MATCHED'].includes(item.status) && Number(item.balance) > 0));
    } catch (error) {
      modal.error({ title: '水单加载失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setReceiptLoading(false);
    }
  }, [apiClient, form]);

  const selectReceiptForRow = useCallback((receipt: WaterReceiptSummary) => {
    if (!receiptPickerRow) return;
    if ((receipt.currency ?? 'RMB') !== getFeeCurrency(receiptPickerRow, 'RECEIVABLE')) {
      modal.warning({ title: '币种不一致', content: '水单币种必须与应收费用币种一致。' });
      return;
    }
    const amount = calculateFinanceEntryFeeAmount(receiptPickerRow);
    const matchAmount = roundFinanceNumber(Math.min(amount || receipt.balance, receipt.balance));
    updateFee('RECEIVABLE', receiptPickerRow.id, {
      receiptId: receipt.id,
      receiptNo: receipt.receiptNo,
      paymentNo: receipt.receiptNo,
      receiptBalance: receipt.balance,
      receiptMatchAmount: matchAmount
    });
    setReceiptPickerRow(null);
  }, [receiptPickerRow]);

  const clearReceiptForRow = useCallback((row: FinanceEntryFeeDraft) => {
    updateFee('RECEIVABLE', row.id, {
      receiptId: undefined,
      receiptNo: undefined,
      paymentNo: undefined,
      receiptBalance: undefined,
      receiptMatchAmount: undefined
    });
  }, []);

  const openPackageModal = useCallback(async () => {
    const customerCode = form.getFieldValue('customerCode')?.trim();
    if (!customerCode) {
      modal.warning({ title: '请先填写客户编号', content: '仓库数据会按当前客户编号筛选在仓货物。' });
      return;
    }
    if (!selectedCustomer) {
      modal.warning({ title: '客户资料不存在', content: '请先维护客户资料后再选择仓库数据。' });
      return;
    }
    setPackageTrackingQuery('');
    setPackagePickerSelected(selectedPackages);
    setPackageModalOpen(true);
    await loadPackages({ customerCode });
  }, [form, loadPackages, modal, selectedCustomer, selectedPackages]);

  const searchPackages = useCallback(async () => {
    const customerCode = form.getFieldValue('customerCode')?.trim();
    if (!customerCode || !selectedCustomer) {
      modal.warning({ title: '请先填写客户编号', content: '只有已维护且归属当前业务员的客户才能查看仓库数据。' });
      return;
    }
    await loadPackages({ customerCode, domesticTrackingNo: packageTrackingQuery.trim() || undefined });
  }, [form, loadPackages, modal, packageTrackingQuery, selectedCustomer]);

  const resetPackageSearch = useCallback(async () => {
    const customerCode = form.getFieldValue('customerCode')?.trim();
    if (!customerCode || !selectedCustomer) {
      return;
    }
    setPackageTrackingQuery('');
    await loadPackages({ customerCode });
  }, [form, loadPackages, selectedCustomer]);

  const applyPackageSelection = useCallback((selectedRows: WarehousePackageSummary[]) => {
    if (!selectedRows.length) return;
    const first = selectedRows[0];
    const currentChannelValue = form.getFieldValue('receivingChannel');
    // A person-selected company channel takes precedence. If it has not yet
    // been selected, retain the former warehouse-channel prefill behaviour.
    const companyChannel = channels.find((channel) => channel.id === currentChannelValue || channel.name === currentChannelValue)
      ?? channels.find((channel) => channel.id === first.receivingChannel || channel.name === first.receivingChannel);
    const warehouseCargo = summarizeWarehouseCargo(selectedRows);
    const totalChargeWeight = roundFinanceNumber(companyChannel
      ? calculateCompanyChannelChargeWeight(companyChannel, selectedRows)
      : selectedRows.reduce((sum, pkg) => sum + pkg.chargeableWeightKg, 0));
    form.setFieldsValue({
      customerCode: form.getFieldValue('customerCode') || first.customerCode,
      customerName: selectedCustomer?.name ?? '',
      customerOrderNo: first.customerOrderNo || first.customerCode,
      inboundNo: form.getFieldValue('inboundNo') || first.domesticTrackingNo || first.combinedOrderNo,
      businessType: form.getFieldValue('businessType') || 'DEDICATED_LINE',
      packageType: form.getFieldValue('packageType') || 'WPX',
      destinationCountry: first.destinationCountry || form.getFieldValue('destinationCountry') || '美国',
      receivingChannel: companyChannel?.id || currentChannelValue || first.receivingChannel,
      packageCount: warehouseCargo.packageCount,
      actualWeightKg: roundFinanceNumber(warehouseCargo.weightKg),
      volumeCbm: roundFinanceNumber(warehouseCargo.cbm, 6),
      chargeableWeightKg: totalChargeWeight
    });
    setCargoDataSource('AUTO_MATCHED');
    setChargeWeightOverridden(false);
    setReceivables((rows) => rows.map((row) => ({ ...row, chargeWeightKg: totalChargeWeight })));
    setBusinessCosts((rows) => rows.map((row) => ({
      ...row,
      chargeWeightKg: totalChargeWeight,
      agentId: row.agentId || form.getFieldValue('agentId')
    })));
    setPayables((rows) => rows.map((row) => ({
      ...row,
      chargeWeightKg: totalChargeWeight,
      agentId: row.agentId || form.getFieldValue('agentId')
    })));
  }, [channels, form, selectedCustomer?.name]);

  useEffect(() => {
    if (!selectedCompanyChannel || chargeWeightOverridden) return;
    const values = form.getFieldsValue(true) as FinanceEntryFormValues;
    if (!values.actualWeightKg && !values.volumeCbm && !selectedPackages.length) return;
    const chargeWeightKg = selectedPackages.length && cargoDataSource === 'AUTO_MATCHED'
      ? matchedCargoTotals.chargeWeightKg
      : calculateCurrentCargoChargeWeight(values);
    form.setFieldValue('chargeableWeightKg', chargeWeightKg);
    syncCargoChargeWeightToFees(chargeWeightKg);
  }, [calculateCurrentCargoChargeWeight, cargoDataSource, chargeWeightOverridden, form, matchedCargoTotals.chargeWeightKg, selectedCompanyChannel, selectedPackages.length, syncCargoChargeWeightToFees]);

  const handlePackageSelection = (selectedRowKeys: Key[], selectedRows: WarehousePackageSummary[]) => {
    const visibleIds = new Set(packages.map((pkg) => pkg.id));
    setPackagePickerSelected((current) => {
      const next = new Map(current.map((pkg) => [pkg.id, pkg] as const));
      visibleIds.forEach((id) => next.delete(id));
      selectedRows.forEach((row) => next.set(row.id, row));
      return Array.from(next.values());
    });
  };

  const closePackageModal = useCallback(() => {
    setPackagePickerSelected(selectedPackages);
    setPackageModalOpen(false);
  }, [selectedPackages]);

  const confirmPackageSelection = useCallback(() => {
    setSelectedPackages(packagePickerSelected);
    setPreselectedPackageWarning(null);
    if (packagePickerSelected.length) {
      applyPackageSelection(packagePickerSelected);
    } else {
      setReceivables((items) => items.map((row) => ({ ...row, chargeWeightKg: undefined })));
      setBusinessCosts((items) => items.map((row) => ({ ...row, chargeWeightKg: undefined })));
      setPayables((items) => items.map((row) => ({ ...row, chargeWeightKg: undefined })));
    }
    setPackageModalOpen(false);
  }, [applyPackageSelection, packagePickerSelected]);

  const preselectedPackageKey = (preselectedPackageIds ?? []).join('|');
  useEffect(() => {
    if (!preselectedPackageIds?.length) return;
    const ids = new Set(preselectedPackageIds);
    const loadedPackageKey = (packageQuery?.packageIds ?? []).join('|');
    if (loadedPackageKey !== preselectedPackageKey && preselectedPackageLoadKey !== preselectedPackageKey) {
      setPreselectedPackageWarning(null);
      setPreselectedPackageLoadKey(preselectedPackageKey);
      void loadPackages({ packageIds: Array.from(ids) });
    }
  }, [loadPackages, packageQuery?.packageIds, preselectedPackageIds, preselectedPackageKey, preselectedPackageLoadKey]);

  useEffect(() => {
    if (!preselectedPackageIds?.length || packageLoading) return;
    const loadedPackageKey = (packageQuery?.packageIds ?? []).join('|');
    if (loadedPackageKey !== preselectedPackageKey) return;
    const ids = new Set(preselectedPackageIds);
    const rows = packages.filter((pkg) => ids.has(pkg.id));
    const unavailableCount = Math.max(0, preselectedPackageIds.length - rows.length);
    setPreselectedPackageWarning(unavailableCount
      ? { requestedCount: preselectedPackageIds.length, availableCount: rows.length }
      : null);
    if (!rows.length) return;
    setSelectedPackages(rows);
    applyPackageSelection(rows);
    setPreselectedPackageLoadKey('');
    onPreselectedPackageIdsConsumed?.();
  }, [applyPackageSelection, onPreselectedPackageIdsConsumed, packageLoading, packageQuery?.packageIds, packages, preselectedPackageIds, preselectedPackageKey]);

  useEffect(() => {
    if (draftLoading) return;
    const currentCode = watchedCustomerCode?.trim() || form.getFieldValue('customerCode')?.trim();
    if (!currentCode) {
      setPackages([]);
      setPackageQuery(null);
      setPackageTrackingQuery('');
      setPackageModalOpen(false);
      if (selectedPackages.length) {
        clearSelectedPackages();
      }
      return;
    }
    if (!selectedPackages.length) {
      return;
    }
    if (selectedPackages.some((pkg) => pkg.customerCode !== currentCode)) {
      clearSelectedPackages();
      setPackageModalOpen(false);
      setPackages([]);
      setPackageQuery(null);
      setPackageTrackingQuery('');
      form.setFieldValue('inboundNo', undefined);
      messageApi.warning('客户编号已变更，请重新选择仓库数据。');
    }
  }, [clearSelectedPackages, draftLoading, form, messageApi, selectedPackages, watchedCustomerCode]);

  useEffect(() => {
    const customerCode = watchedCustomerCode?.trim();
    if (!customerCode || !packageQuery || packageQuery.customerCode === customerCode) {
      return;
    }
    setPackageModalOpen(false);
    setPackages([]);
    setPackageQuery(null);
    setPackageTrackingQuery('');
  }, [packageQuery, watchedCustomerCode]);

  const buildFeeRows = (rows: FinanceEntryFeeDraft[], type: ShipmentFinanceItemType) => rows
    .map((row) => ({
      type,
      name: row.name.trim(),
      amount: calculateFinanceEntryFeeAmount(row),
      currency: normalizeFinanceCatalogCurrency(row.currency) ?? normalizeFinanceCatalogCurrency(form.getFieldValue('currency')) ?? 'RMB',
      settlementMethod: row.settlementMethod || form.getFieldValue('settlementMethod'),
      paymentNo: row.paymentNo,
      agentId: canUseAgentFields && type !== 'RECEIVABLE' ? (row.agentId || form.getFieldValue('agentId')) : undefined,
      chargeWeightKg: row.chargeWeightKg,
      unitPrice: row.unitPrice,
      receiptId: type === 'RECEIVABLE' ? row.receiptId : undefined,
      receiptMatchAmount: type === 'RECEIVABLE' ? row.receiptMatchAmount : undefined,
      remark: row.remark
    }))
    .filter((row) => row.name && row.amount > 0);

  const submit = async (submitForReview: boolean) => {
    if (!canSaveDraft) {
      modal.warning({ title: '没有保存草稿权限', content: '请联系管理员授予“保存录单草稿”权限后再编辑。' });
      return;
    }
    if (!draftId && !canCreateOrderEntry) {
      modal.warning({ title: '没有新建录单权限', content: '当前账号只能编辑已有草稿，不能新建录单。' });
      return;
    }
    if (submitForReview && !canSubmitForReview) {
      modal.warning({ title: '没有提交审核权限', content: '草稿可以继续保存，但不能提交审核。' });
      return;
    }
    const values = submitForReview
      ? await form.validateFields()
      : form.getFieldsValue(true);
    const firstPackage = selectedPackages[0];
    const customerCode = values.customerCode?.trim() || firstPackage?.customerCode;
    if (!customerCode) {
      modal.warning({ title: '请填写客户编号', content: '保存草稿至少需要客户编号。' });
      return;
    }
    const selectedBusinessChannel = channels.find((channel) => channel.id === values.receivingChannel || channel.name === values.receivingChannel);
    const productNames = normalizeShipmentProductNames(values.productNames, values.productName);
    const input: OrderEntryCreateInput = {
      shipment: {
        customerCode,
        customerOrderNo: values.customerOrderNo || customerCode || firstPackage?.customerOrderNo || '',
        outboundOrderNo: values.customerOrderNo?.trim(),
        systemOrderNo: values.customerOrderNo?.trim(),
        entryAt: values.entryAt ? parseBeijingDateTimeInputToIso(values.entryAt) : undefined,
        subOrderNo: values.subOrderNo,
        inboundNo: values.inboundNo,
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: values.destinationCountry ?? firstPackage?.destinationCountry ?? '',
        receivingChannel: selectedBusinessChannel?.name || values.receivingChannel || values.channelName,
        channelId: selectedBusinessChannel?.id,
        agentId: canUseAgentFields ? values.agentId : undefined,
        declarationRequired: values.declarationRequired ?? false,
        sensitive: Boolean(values.sensitive),
        cargoType: values.cargoType ?? '',
        productName: formatShipmentProductNames(productNames),
        productNames,
        settlementMethod: values.settlementMethod ?? '',
        fbaInboundNo: values.fbaInboundNo,
        receiverName: values.receiverName,
        receiverCompany: values.receiverCompany,
        receiverPhone: values.receiverPhone,
        receiverAddress: values.receiverAddress,
        receiverCountry: values.receiverCountry,
        receiverState: values.receiverState,
        receiverPostalCode: values.receiverPostalCode,
        fbaWarehouseCode: values.fbaWarehouseCode,
        remark: values.remark,
        packageCount: totals.packageCount,
        actualWeightKg: totals.weightKg,
        volumeCbm: totals.cbm,
        chargeableWeightKg: totals.chargeWeightKg,
        cargoDataSource,
        chargeWeightOverridden
      },
      warehousePackageIds: selectedPackages.map((pkg) => pkg.id),
      receivables: buildFeeRows(receivables, 'RECEIVABLE'),
      businessCosts: canWriteOrderEntryBusinessCosts ? buildFeeRows(businessCosts, 'BUSINESS_COST') : [],
      payables: canEditOrderEntryPayables ? buildFeeRows(payables, 'PAYABLE') : [],
      miscFeeIdsToMatch: submitForReview ? selectedTallyMiscFeeIds : [],
      submitForReview
    };
    setSubmitting(true);
    try {
      const detail = draftId ? await apiClient.updateOrderEntryDraft(draftId, input) : await apiClient.createOrderEntry(input);
      try {
        await maybeSaveReceiverContact(values);
      } catch (error) {
        messageApi.warning(error instanceof Error ? `运单已创建，收货人保存失败：${error.message}` : '运单已创建，收货人保存失败');
      }
      const savedForCompletion = submitForReview && detail.shipment.status === 'DRAFT' && detail.shipment.reviewRejectedReason;
      (savedForCompletion ? modal.warning : modal.success)({
        title: savedForCompletion ? '提交未通过，已保存到草稿箱' : submitForReview ? '录单已提交审核' : '录单草稿已保存',
        content: savedForCompletion
          ? `待完善原因：${detail.shipment.reviewRejectedReason}`
          : submitForReview
          ? `已生成出货单号 ${resolveShipmentOutboundOrderNo(detail.shipment)}`
          : `草稿已保存，可在录单草稿箱继续编辑。草稿号/出货单号：${resolveShipmentOutboundOrderNo(detail.shipment)}`
      });
      reset();
      await onCreated?.(detail, submitForReview && !savedForCompletion);
    } catch (error) {
      modal.error({ title: '录单失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const isTalliedPackage = (record: Pick<WarehousePackageSummary, 'tallyCompleted'>) => record.tallyCompleted === true;

  const openTallyHistory = useCallback(async (record: WarehousePackageSummary) => {
    if (!isTalliedPackage(record)) return;
    setTallyHistoryPackage(record);
    setTallyHistoryTasks([]);
    setTallyHistoryLoading(true);
    try {
      setTallyHistoryTasks(await apiClient.warehouseQuery.warehouseTallyTaskHistoryChain(record.id));
    } catch {
      setTallyHistoryTasks([]);
    } finally {
      setTallyHistoryLoading(false);
    }
  }, [apiClient]);

  const renderPackageNoWithTally = (record: WarehousePackageSummary) => {
    const packageNo = record.combinedOrderNo || `${record.customerOrderNo}-${record.domesticTrackingNo}`;
    return (
      <WarehousePackageNoWithTallyStatus
        packageNo={packageNo}
        record={record}
        onOpenTallyHistory={isTalliedPackage(record) ? () => void openTallyHistory(record) : undefined}
      />
    );
  };

  const packageColumns: ColumnsType<WarehousePackageSummary> = [
    {
      title: '客户单号-快递单号',
      width: 190,
      render: (_, record) => (
        <div className="finance-entry-package-cell">
          {renderPackageNoWithTally(record)}
          <Text type="secondary">箱序：{record.packageIndex ?? '-'} / {record.expectedTotalPackageCount ?? '-'}</Text>
        </div>
      )
    },
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 125, ellipsis: true, render: (_: string | undefined, record) => resolveShipmentOutboundOrderNo(record) },
    { title: '件数', dataIndex: 'packageCount', width: 60 },
    { title: '实重', dataIndex: 'weightKg', width: 80, render: (value: number) => `${value.toFixed(2)} kg` },
    {
      title: '5000材积',
      dataIndex: 'volumetricWeightKg5000',
      width: 92,
      render: (value: number | undefined, record) => `${(value ?? (record.lengthCm * record.widthCm * record.heightCm * record.packageCount) / 5000).toFixed(2)} kg`
    },
    { title: '6000材积', dataIndex: 'volumetricWeightKg', width: 92, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '扫描时间', dataIndex: 'scanTime', width: 145, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true, render: (value?: string) => value || '-' }
  ];

  const selectedPackageDetailColumns: ColumnsType<WarehousePackageSummary> = [
    {
      title: '包裹',
      width: 180,
      render: (_, record) => (
        <div className="finance-entry-package-cell">
          <Text strong>{record.combinedOrderNo || `${record.customerOrderNo}-${record.domesticTrackingNo}`}</Text>
          <Text type="secondary">箱序：{record.packageIndex ?? '-'} / {record.expectedTotalPackageCount ?? '-'}</Text>
        </div>
      )
    },
    { title: '件数', dataIndex: 'packageCount', width: 66, align: 'right' },
    { title: '规格（长 × 宽 × 高）', width: 172, align: 'right', render: (_, record) => `${record.lengthCm.toFixed(2)} × ${record.widthCm.toFixed(2)} × ${record.heightCm.toFixed(2)} cm` },
    { title: '实重', dataIndex: 'weightKg', width: 92, align: 'right', render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '方数', width: 106, align: 'right', render: (_, record) => `${Number(record.totalCbm ?? record.cbm).toFixed(6)} CBM` },
    { title: '5000材积', width: 104, align: 'right', render: (_, record) => `${calculateSelectedPackageVolumetricWeight(record, 5000).toFixed(2)} kg` },
    { title: '6000材积', width: 104, align: 'right', render: (_, record) => `${calculateSelectedPackageVolumetricWeight(record, 6000).toFixed(2)} kg` },
    {
      title: selectedCompanyChannel ? '渠道计费重' : '仓库计费重',
      width: 112,
      align: 'right',
      render: (_, record) => `${(selectedCompanyChannel
        ? calculateCompanyChannelChargeWeight(selectedCompanyChannel, [record])
        : record.chargeableWeightKg).toFixed(2)} kg`
    },
    {
      title: '预警',
      width: 260,
      render: (_, __, packageIndex) => {
        const warnings = companyChannelWarningsByPackageIndex.get(packageIndex) ?? [];
        if (!selectedCompanyChannel) return <Text type="secondary">请选择公司渠道后判断</Text>;
        if (!warnings.length) return <Tag color="green">未命中预警</Tag>;
        return (
          <Space direction="vertical" size={2} className="finance-entry-package-warning-list">
            {warnings.map((warning) => <Text key={warning.code} type="danger">{warning.message}</Text>)}
          </Space>
        );
      }
    }
  ];

  const getFeeCurrency = (row: FinanceEntryFeeDraft, type: ShipmentFinanceItemType) => {
    if (type === 'PAYABLE') return normalizeFinanceCatalogCurrency(row.currency) ?? 'RMB';
    return normalizeFinanceCatalogCurrency(row.currency) ?? normalizeFinanceCatalogCurrency(form.getFieldValue('currency')) ?? 'RMB';
  };

  const currentUsdToRmbRate = resolveCurrentUsdToRmbRate(exchangeRates);
  const currencyToRmb = (currency?: string) => {
    const normalized = normalizeFinanceCatalogCurrency(currency) ?? 'RMB';
    if (normalized === 'RMB') return 1;
    if (normalized === 'USD') return currentUsdToRmbRate;
    return undefined;
  };

  const renderReadonlyCell = (value?: string | number | null, placeholder = '-') => <Text>{value === undefined || value === null || value === '' ? placeholder : value}</Text>;

  const getFeeRmbAmount = (row: FinanceEntryFeeDraft, type: ShipmentFinanceItemType) => {
    const exchangeRate = currencyToRmb(getFeeCurrency(row, type));
    return exchangeRate === undefined ? undefined : calculateFinanceEntryFeeAmount(row) * exchangeRate;
  };
  const getFeeRmbTotal = (rows: FinanceEntryFeeDraft[], type: ShipmentFinanceItemType) => {
    const amounts = rows.map((row) => getFeeRmbAmount(row, type));
    return amounts.some((amount) => amount === undefined)
      ? undefined
      : amounts.reduce<number>((sum, amount) => sum + Number(amount), 0);
  };
  const formatFeeRmbAmount = (amount?: number) => amount === undefined ? '缺少有效汇率' : `RMB ${amount.toFixed(2)}`;
  const receivableCurrencyRows = ['USD', 'RMB'].map((currency) => ({
    currency,
    balance: receiptRows
      .filter((row) => (row.currency ?? 'RMB') === currency)
      .reduce((sum, row) => sum + row.balance, 0),
    amount: receivables
      .filter((row) => getFeeCurrency(row, 'RECEIVABLE') === currency)
      .reduce((sum, row) => sum + calculateFinanceEntryFeeAmount(row), 0)
  }));
  const renderFeeNameSelect = (type: ShipmentFinanceItemType, row: FinanceEntryFeeDraft, label: string) => (
    <Select
      aria-label={`${label}费用名称`}
      showSearch
      allowClear
      placeholder="选择费用名称"
      value={row.name || undefined}
      options={feeNameOptions}
      optionFilterProp="label"
      notFoundContent="暂无启用费用名称"
      onChange={(value) => updateFee(type, row.id, { name: value ?? '' })}
    />
  );

  const renderFeeTable = (type: ShipmentFinanceItemType, title: string, rows: FinanceEntryFeeDraft[]) => {
    if (type === 'RECEIVABLE') {
      const columns: ColumnsType<FinanceEntryFeeDraft> = [
        { key: 'salesperson', title: '业务员', width: 100, render: () => renderReadonlyCell(matchedSalesperson) },
        { key: 'feeName', title: '费用名称', width: 150, render: (_, row) => renderFeeNameSelect(type, row, title) },
        { key: 'customerCode', title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
        { key: 'systemOrderNo', title: '出货单号', width: 150, render: () => renderReadonlyCell(watchedCustomerOrderNo, '待生成') },
        { key: 'currency', title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
        {
          key: 'receiptNo',
          title: '申请匹配水单',
          width: 260,
          render: (_, row) => (
            <Space size={6} wrap>
              {row.receiptNo ? <Tag color={row.receiptMatchSource === 'AUTO' ? 'green' : 'blue'}>{row.receiptNo}{row.receiptMatchSource === 'AUTO' ? '（自动）' : ''}</Tag> : <Text type="secondary">未匹配</Text>}
              {!row.receiptNo && row.receiptMatchHint ? <Text type="warning">{row.receiptMatchHint}</Text> : null}
              {row.receiptId ? <InputNumber min={0} max={row.receiptBalance} precision={2} value={row.receiptMatchAmount} onChange={(value) => updateFee(type, row.id, { receiptMatchAmount: value ?? undefined })} /> : null}
              <Button size="small" onClick={() => openReceiptPicker(row)}>选择</Button>
              {row.receiptId ? <Button size="small" onClick={() => clearReceiptForRow(row)}>清除</Button> : null}
            </Space>
          )
        },
        { key: 'amount', title: '金额', width: 120, render: (_, row) => <InputNumber min={0} max={row.receiptBalance} precision={2} value={row.amount} onChange={(value) => updateFee(type, row.id, { amount: value ?? undefined })} /> },
        {
          key: 'settlementMethod',
          title: '结算方式',
          width: 170,
          render: (_, row) => (
            <Select
              allowClear
              value={row.settlementMethod}
              options={settlementOptions}
              onChange={(value) => updateFee(type, row.id, { settlementMethod: value, currency: getSettlementMethodCurrency(settlementRows, value) ?? row.currency })}
            />
          )
        },
        { key: 'totalRmb', title: '合计', width: 120, align: 'right', render: (_, row) => <Text>{formatFeeRmbAmount(getFeeRmbAmount(row, type))}</Text> },
        { key: 'createdAt', title: '制单日期', width: 170, render: () => renderReadonlyCell(createdAtText) },
        { key: 'createdBy', title: '制单人', width: 110, render: () => renderReadonlyCell(username) },
        { key: 'auditedAt', title: '审单日期', width: 120, render: () => renderReadonlyCell(null) },
        { key: 'auditedBy', title: '审单人', width: 100, render: () => renderReadonlyCell(null) },
        { key: 'remark', title: '备注', width: 180, render: (_, row) => <Input value={row.remark} onChange={(event) => updateFee(type, row.id, { remark: event.target.value })} /> },
        { key: 'action', title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => removeFee(type, row.id)}>删除</Button> }
      ];
      return (
        <Card className="finance-entry-fee-card" title={title} extra={<Button onClick={() => addFee(type)}>新增项目</Button>}>
          <Table
            className="finance-entry-amount-table finance-embedded-table"
            rowKey="currency"
            size="small"
            pagination={false}
            dataSource={receivableCurrencyRows}
            columns={[
              { title: '币种', dataIndex: 'currency', width: 100 },
              { title: '余额', dataIndex: 'balance', width: 140, align: 'right', render: (value: number) => value.toFixed(2) },
              { title: '金额', dataIndex: 'amount', width: 140, align: 'right', render: (value: number) => value.toFixed(2) }
            ]}
          />
          <ManagedTable<FinanceEntryFeeDraft>
            className="finance-entry-editable-table finance-work-table finance-embedded-table"
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={rows}
            scroll={{ x: 2050 }}
            columnSettings={false}
            recordDetail={false}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={Math.max(1, columns.length - 1)}>
                    <Text strong>合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={columns.length - 1} align="right">
                    <Text strong>{formatFeeRmbAmount(getFeeRmbTotal(rows, type))}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
            columns={columns.map((column) => ({ ...column, sortable: false }))}
          />
        </Card>
      );
    }

    if (type === 'BUSINESS_COST') {
      if (!canWriteOrderEntryBusinessCosts) {
        return (
          <Card className="finance-entry-fee-card" title={title} extra={<Tag>只读</Tag>}>
            <ManagedTable<FinanceEntryFeeDraft>
              className="finance-work-table finance-embedded-table"
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={rows}
              columnSettings={false}
              recordDetail={false}
              columns={[
                { key: 'feeName', title: '费用名称', dataIndex: 'name' },
                { key: 'currency', title: '币种', render: (_, row) => getFeeCurrency(row, type) },
                { key: 'amount', title: '总金额', align: 'right', render: (_, row) => calculateFinanceEntryFeeAmount(row).toFixed(2) },
                { key: 'remark', title: '备注', dataIndex: 'remark', render: (value) => value || '-' }
              ]}
            />
          </Card>
        );
      }
      const receivableRmbTotal = getFeeRmbTotal(receivables, 'RECEIVABLE');
      const businessCostRmbTotal = getFeeRmbTotal(businessCosts, 'BUSINESS_COST');
      const profitColumns: ColumnsType<FinanceEntryFeeDraft> = canViewFinanceAuditFields ? [
        {
          key: 'businessProfit',
          title: '业务利润',
          width: 120,
          align: 'right',
          render: () => <Text>{receivableRmbTotal === undefined || businessCostRmbTotal === undefined
            ? '缺少有效汇率'
            : (receivableRmbTotal - businessCostRmbTotal).toFixed(2)}</Text>
        }
      ] : [];
      const columns: ColumnsType<FinanceEntryFeeDraft> = [
        ...(canUseAgentFields ? [{
          key: 'agent',
          title: agentFieldLabels.detailedCompanyName,
          width: 150,
          render: (_: unknown, row: FinanceEntryFeeDraft) => <Select showSearch allowClear optionFilterProp="searchText" value={row.agentId || watchedAgentId} options={agentOptions} onChange={(value) => updateFee(type, row.id, { agentId: value })} />
        }] : []),
        { key: 'feeName', title: '费用名称', width: 150, render: (_, row) => renderFeeNameSelect(type, row, title) },
        { key: 'customerCode', title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
        { key: 'systemOrderNo', title: '出货单号', width: 150, render: () => renderReadonlyCell(watchedCustomerOrderNo, '待生成') },
        { key: 'currency', title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
        { key: 'chargeWeightKg', title: '计费重', width: 110, render: (_, row) => <InputNumber min={0} precision={2} value={row.chargeWeightKg} onChange={(value) => updateFee(type, row.id, { chargeWeightKg: value ?? undefined })} /> },
        { key: 'unitPrice', title: '单价', width: 120, render: (_, row) => <InputNumber min={0} precision={2} value={row.unitPrice} onChange={(value) => updateFee(type, row.id, { unitPrice: value ?? undefined })} /> },
        { key: 'totalAmount', title: '总金额', width: 120, align: 'right', render: (_, row) => <InputNumber readOnly precision={2} value={calculateFinanceEntryFeeAmount(row)} /> },
        { key: 'totalRmb', title: '合计', width: 120, align: 'right', render: (_, row) => <Text>{formatFeeRmbAmount(getFeeRmbAmount(row, type))}</Text> },
        ...profitColumns,
        { key: 'createdAt', title: '制单日期', width: 170, render: () => renderReadonlyCell(createdAtText) },
        { key: 'createdBy', title: '制单人', width: 110, render: () => renderReadonlyCell(username) },
        { key: 'remark', title: '备注', width: 180, render: (_, row) => <Input value={row.remark} onChange={(event) => updateFee(type, row.id, { remark: event.target.value })} /> },
        { key: 'action', title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => removeFee(type, row.id)}>删除</Button> }
      ];
      return (
        <Card className="finance-entry-fee-card" title={title} extra={<Button onClick={() => addFee(type)}>新增项目</Button>}>
          <ManagedTable<FinanceEntryFeeDraft>
            className="finance-entry-editable-table finance-work-table finance-embedded-table"
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={rows}
            scroll={{ x: Math.max(1600, columns.length * 125) }}
            columnSettings={false}
            recordDetail={false}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={Math.max(1, columns.length - 1)}>
                    <Text strong>合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={columns.length - 1} align="right">
                    <Text strong>{formatFeeRmbAmount(getFeeRmbTotal(rows, type))}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
            columns={columns.map((column) => ({ ...column, sortable: false }))}
          />
        </Card>
      );
    }

    const columns: ColumnsType<FinanceEntryFeeDraft> = [
      ...(canUseAgentFields ? [{
        key: 'agent',
        title: agentFieldLabels.detailedCompanyName,
        width: 150,
        render: (_: unknown, row: FinanceEntryFeeDraft) => <Select showSearch allowClear optionFilterProp="searchText" value={row.agentId || watchedAgentId} options={agentOptions} onChange={(value) => updateFee(type, row.id, { agentId: value })} />
      }] : []),
      { key: 'feeName', title: '费用名称', width: 150, render: (_, row) => renderFeeNameSelect(type, row, title) },
      { key: 'customerCode', title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
      { key: 'systemOrderNo', title: '出货单号', width: 150, render: () => renderReadonlyCell(watchedCustomerOrderNo, '待生成') },
      { key: 'currency', title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
      { key: 'chargeWeightKg', title: '计费重', width: 110, render: (_, row) => <InputNumber min={0} precision={2} value={row.chargeWeightKg} onChange={(value) => updateFee(type, row.id, { chargeWeightKg: value ?? undefined })} /> },
      { key: 'outboundUnitPrice', title: '出货成本单价', width: 125, render: (_, row) => <InputNumber min={0} precision={2} value={row.unitPrice} onChange={(value) => updateFee(type, row.id, { unitPrice: value ?? undefined })} /> },
      { key: 'totalAmount', title: '总金额', width: 120, align: 'right', render: (_, row) => <InputNumber readOnly precision={2} value={calculateFinanceEntryFeeAmount(row)} /> },
      { key: 'totalRmb', title: '合计', width: 120, align: 'right', render: (_, row) => <Text>{formatFeeRmbAmount(getFeeRmbAmount(row, type))}</Text> },
      {
        key: 'paymentNo',
        title: '付款编号',
        width: 150,
        render: (_, row) => <Input value={row.paymentNo} onChange={(event) => updateFee(type, row.id, { paymentNo: event.target.value })} />
      },
      { key: 'createdAt', title: '制单日期', width: 170, render: () => renderReadonlyCell(createdAtText) },
      { key: 'createdBy', title: '制单人', width: 110, render: () => renderReadonlyCell(username) },
      { key: 'auditedAt', title: '审单日期', width: 120, render: () => renderReadonlyCell(null) },
      { key: 'auditedBy', title: '审单人', width: 100, render: () => renderReadonlyCell(null) },
      { key: 'remark', title: '应付备注', width: 180, render: (_, row) => <Input value={row.remark} onChange={(event) => updateFee(type, row.id, { remark: event.target.value })} /> },
      { key: 'action', title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => removeFee(type, row.id)}>删除</Button> }
    ];
    return (
      <Card className="finance-entry-fee-card" title={title} extra={<Button onClick={() => addFee(type)}>新增项目</Button>}>
        <ManagedTable<FinanceEntryFeeDraft>
          className="finance-entry-editable-table finance-work-table finance-embedded-table"
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={rows}
          scroll={{ x: Math.max(1800, columns.length * 125) }}
          columnSettings={false}
          recordDetail={false}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={Math.max(1, columns.length - 1)}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={columns.length - 1} align="right">
                  <Text strong>{formatFeeRmbAmount(getFeeRmbTotal(rows, type))}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
          columns={columns.map((column) => ({ ...column, sortable: false }))}
        />
      </Card>
    );
  };

  return (
    <div className="finance-entry-page">
      <Row gutter={[12, 12]} className="finance-entry-workbench-row">
        <Col xs={24}>
          <Card className="finance-entry-workbench-card finance-entry-form-card" title={draftId ? '继续编辑录单草稿' : '运单基础信息'} loading={draftLoading}>
            {preselectedPackageWarning ? (
              <Alert
                type={preselectedPackageWarning.availableCount ? 'warning' : 'error'}
                showIcon
                message={preselectedPackageWarning.availableCount
                  ? `原选 ${preselectedPackageWarning.requestedCount} 件，仅 ${preselectedPackageWarning.availableCount} 件可录单`
                  : `原选 ${preselectedPackageWarning.requestedCount} 件均不可录单`}
                description={preselectedPackageWarning.availableCount
                  ? '其余包裹可能已绑定运单、被草稿占用或状态已变化；本页只会保存当前列出的可用包裹。'
                  : '包裹可能已绑定运单、被草稿占用或状态已变化，请返回仓库重新选择。'}
                action={!preselectedPackageWarning.availableCount
                  ? <Button size="small" onClick={() => window.history.back()}>返回仓库</Button>
                  : undefined}
                style={{ marginBottom: 12 }}
              />
            ) : null}
            {tallyMiscFeeDue?.rows.length ? (
              <Alert
                type={tallyMiscFeeDue.mandatoryCount ? 'error' : tallyMiscFeeDue.warehouseDueCount ? 'warning' : 'info'}
                showIcon
                message={tallyMiscFeeDue.mandatoryCount
                  ? `该客户有 ${tallyMiscFeeDue.mandatoryCount} 笔满 60 天理货杂费，提交前必须处理`
                  : `该客户有 ${tallyMiscFeeDue.rows.length} 笔未匹配理货杂费`}
                description={(
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {tallyMiscFeeDue.rows.map((fee) => {
                      const mandatory = fee.dueLevel === 'MANDATORY';
                      const warehouseConfirmed = fee.confirmationStatus === 'CONFIRMED';
                      return (
                        <Checkbox
                          key={fee.id}
                          checked={selectedTallyMiscFeeIds.includes(fee.id)}
                          disabled={mandatory || !warehouseConfirmed}
                          onChange={(event) => setSelectedTallyMiscFeeIds((current) => event.target.checked
                            ? Array.from(new Set([...current, fee.id]))
                            : current.filter((id) => id !== fee.id))}
                        >
                          <Space size={6} wrap>
                            <Text strong>{fee.feeName}</Text>
                            <Text>{fee.businessAmount === undefined ? '待仓库补充金额' : `${fee.businessAmount.toFixed(2)} ${fee.businessCurrency}`}</Text>
                            {!warehouseConfirmed ? <Tag color="gold">待仓库确认</Tag> : null}
                            <Tag color={mandatory ? 'red' : fee.dueLevel === 'WAREHOUSE_DUE' ? 'orange' : 'blue'}>
                              {mandatory ? `${fee.ageDays} 天·必须处理` : fee.dueLevel === 'WAREHOUSE_DUE' ? `${fee.ageDays} 天·仓库可处理` : `${fee.ageDays} 天`}
                            </Tag>
                          </Space>
                        </Checkbox>
                      );
                    })}
                    <Text type="secondary">仓库确认后可勾选；提交审核时自动匹配本运单并写入业务成本。满 60 天记录必须处理。</Text>
                  </Space>
                )}
                style={{ marginBottom: 12 }}
              />
            ) : null}
            <div className="finance-entry-summary-grid">
              <div className="finance-entry-summary-card"><Text type="secondary">已选货物</Text><Text strong>{selectedPackages.length} 条</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">总件数</Text><Text strong>{totals.packageCount} 件</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">实重</Text><Text strong>{totals.weightKg.toFixed(2)} kg</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">方数</Text><Text strong>{totals.cbm.toFixed(6)} CBM</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">计费重</Text><Text strong>{totals.chargeWeightKg.toFixed(2)} kg</Text></div>
            </div>
            {selectedPackages.length ? (
              <div className="finance-entry-selected-packages" aria-label="已选货物列表">
                {selectedPackages.map((pkg) => (
                  <div className="finance-entry-selected-package" key={pkg.id}>
                    {renderPackageNoWithTally(pkg)}
                    <Text type="secondary">{pkg.packageCount} 件 / {pkg.weightKg.toFixed(2)} kg / {pkg.cbm.toFixed(6)} CBM</Text>
                  </div>
                ))}
              </div>
            ) : null}
            <Form
              form={form}
              layout="vertical"
              initialValues={{ currency: 'RMB', declarationRequired: false, sensitive: false, entryAt: entryAtDefault, saveReceiverToCustomer: false }}
              onValuesChange={handleEntryValuesChange}
            >
              <section className="finance-entry-field-panel finance-entry-primary-panel">
                <div className="finance-entry-form-subtitle">录入与货物</div>
                <Row gutter={12}>
                  <Col xs={24} md={12} xl={6}><Form.Item name="entryAt" label="运单录入日期"><Input type="datetime-local" readOnly={!canEditEntryAt} /></Form.Item></Col>
                  <Col xs={24} md={12} xl={6}><Form.Item label="仓库数据"><Button block onClick={() => void openPackageModal()} disabled={!watchedCustomerCode?.trim()}>仓库数据</Button></Form.Item></Col>
                  <Col xs={24} md={12} xl={6}><Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请输入客户编号' }]}><Input /></Form.Item></Col>
                  <Col xs={24} md={12} xl={6}><Form.Item name="customerName" label="客户名称"><Input readOnly placeholder={watchedCustomerCode?.trim() ? '未匹配客户资料' : '填写客户编号后自动带出'} /></Form.Item></Col>
                  <Col xs={24} md={12} xl={8}><Form.Item name="customerOrderNo" label="出货单号" rules={[{ required: true, message: '请输入出货单号' }]}><Input /></Form.Item></Col>
                  <Col xs={24} md={12} xl={8}>
                    <Form.Item name="receivingChannel" label="公司渠道" rules={[{ required: true, message: '请选择公司渠道' }]}>
                      <Select showSearch allowClear options={businessChannelOptions} onChange={(value) => recalculateCargoChargeWeight(value)} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} xl={8}>
                    <Form.Item name="destinationCountry" label="国家" rules={[{ required: true, message: '请选择或输入国家' }]}>
                      <AutoComplete
                        allowClear
                        options={countryOptions}
                        filterOption={filterLocationOption}
                        placeholder="例如 美国"
                        popupMatchSelectWidth={320}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} xl={6} className="finance-entry-inbound-field"><Form.Item name="inboundNo" label="入仓号"><Input /></Form.Item></Col>
                  <Col xs={24} md={12} xl={18} className="finance-entry-product-field">
                    <Row gutter={8}>
                      {[0, 1, 2, 3].map((index) => (
                        <Col xs={24} sm={12} lg={6} key={index}>
                          <Form.Item
                            name={['productNames', index]}
                            label={`品名${index + 1}`}
                            rules={index === 0 ? [{ required: true, whitespace: true, message: '请输入品名1' }] : undefined}
                          >
                            <AutoComplete
                              allowClear
                              options={productNameOptions}
                              onBlur={() => maybeSaveCatalogItem('PRODUCT_NAME', form.getFieldValue(['productNames', index]))}
                            />
                          </Form.Item>
                        </Col>
                      ))}
                    </Row>
                  </Col>
                </Row>
                <div className="finance-entry-cargo-metrics" aria-label="货物数据">
                  <div className="finance-entry-cargo-toolbar">
                    <Space wrap align="center">
                      <Text strong>货物数据</Text>
                      <Tag
                        aria-disabled={!selectedPackages.length}
                        aria-label="双击查看已选包裹详情"
                        className="finance-entry-cargo-detail-trigger"
                        color={cargoDataSource === 'MANUAL_ADJUSTED' ? 'gold' : 'blue'}
                        role="button"
                        tabIndex={selectedPackages.length ? 0 : -1}
                        title={selectedPackages.length ? `双击查看已选的 ${selectedPackages.length} 条包裹详情` : '请先从仓库数据选择包裹'}
                        onDoubleClick={() => {
                          if (selectedPackages.length) setSelectedPackageDetailsOpen(true);
                        }}
                        onKeyDown={(event) => {
                          if (selectedPackages.length && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            setSelectedPackageDetailsOpen(true);
                          }
                        }}
                      >
                        {cargoDataSource === 'MANUAL_ADJUSTED' ? '手动调整' : '仓库自动汇总'}
                      </Tag>
                      {chargeWeightOverridden ? <Tag color="orange">计费重已手动覆盖</Tag> : null}
                    </Space>
                    <Button size="small" onClick={() => recalculateCargoChargeWeight()} disabled={!selectedCompanyChannel && !totals.weightKg && !totals.cbm}>按公司渠道重新计算</Button>
                  </div>
                  <div className="finance-entry-cargo-grid">
                    <Form.Item name="packageCount" label="件数"><InputNumber min={0} precision={0} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('packageCount', value)} /></Form.Item>
                    <Form.Item label="实重 kg"><div className="finance-entry-cargo-unit-input"><Form.Item name="actualWeightKg" noStyle><InputNumber aria-label="实重 kg" min={0} precision={2} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('actualWeightKg', value)} /></Form.Item><span>kg</span></div></Form.Item>
                    <Form.Item label="体积 CBM"><div className="finance-entry-cargo-unit-input"><Form.Item name="volumeCbm" noStyle><InputNumber aria-label="体积 CBM" min={0} precision={6} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('volumeCbm', value)} /></Form.Item><span>CBM</span></div></Form.Item>
                    <Form.Item label="计费重 kg"><div className="finance-entry-cargo-unit-input"><Form.Item name="chargeableWeightKg" noStyle><InputNumber aria-label="计费重 kg" min={0} precision={2} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('chargeableWeightKg', value)} /></Form.Item><span>kg</span></div></Form.Item>
                  </div>
                  {selectedCompanyChannel ? <Text type="secondary">已按 {selectedCompanyChannel.name} 计算：除材积 {selectedCompanyChannel.volumeDivisor} / {selectedCompanyChannel.multiPieceWeightRule} / {selectedCompanyChannel.settlementWeightRule}</Text> : <Text type="secondary">请选择公司渠道；仓库货物会按该渠道规则计算计费重。</Text>}
                  {aggregateCargoRuleError ? <Alert type="warning" showIcon message={aggregateCargoRuleError} /> : null}
                  {companyChannelWarnings.length ? (
                    <Alert
                      type="warning"
                      showIcon
                      message={`公司渠道预警（${companyChannelWarnings.length} 项）`}
                      description={(
                        <Space direction="vertical" size={0}>
                          {companyChannelWarnings.map((warning) => (
                            <Text key={`${warning.code}-${warning.packageIndex}`}>
                              第 {warning.packageIndex} 条货物{warning.affectedPackageCount > 1 ? `（${warning.affectedPackageCount} 件）` : ''}：{warning.message}
                            </Text>
                          ))}
                        </Space>
                      )}
                    />
                  ) : null}
                </div>
              </section>
              <div className="finance-entry-two-column-layout">
                <section className="finance-entry-field-panel finance-entry-receiver-panel">
                  <div className="finance-entry-form-subtitle">收货信息</div>
                  <Row gutter={12}>
                    <Col xs={24} md={12} xxl={8}><Form.Item name="receiverName" label="收货人名称"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={8}><Form.Item name="receiverPhone" label="收货人电话"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={8}>
                      <Form.Item name="receiverCountry" label="收货国家">
                        <AutoComplete
                          allowClear
                          options={countryOptions}
                          filterOption={filterLocationOption}
                          popupMatchSelectWidth={320}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xxl={12}><Form.Item name="receiverCompany" label="收货人公司名称"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={6}>
                      <Form.Item name="receiverState" label="州/省">
                        <AutoComplete
                          allowClear
                          options={stateOptions}
                          filterOption={filterLocationOption}
                          popupMatchSelectWidth={320}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xxl={6}><Form.Item name="receiverPostalCode" label="邮编"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={6}><Form.Item name="fbaWarehouseCode" label="FBA仓库代码"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={18}><Form.Item name="receiverAddress" label="收货人地址"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={10}>
                      <Form.Item name="receiverContactId" label="已有收货地址">
                        <Select
                          allowClear
                          disabled={!selectedCustomer}
                          placeholder={selectedCustomer ? selectedCustomerContacts.length ? '选择后自动带入，可继续修改' : '该客户暂无已保存收货地址' : '先输入客户编号'}
                          options={selectedCustomerContacts.map((contact) => ({
                            value: contact.id,
                            label: [contact.name, contact.company, contact.phone, contact.address, contact.country].filter(Boolean).join(' / ')
                          }))}
                          onChange={applyReceiverContact}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12} xxl={14}>
                      <Form.Item
                        name="saveReceiverToCustomer"
                        valuePropName="checked"
                        label={receiverContactEdited ? '保存为新地址' : '保存到客户地址库'}
                        extra={receiverContactEdited
                          ? '已修改已选地址；勾选后会新增一条收货地址，不会覆盖原资料。'
                          : selectedReceiverContact
                            ? '可继续手动修改；如需保留修改后的地址，请勾选后另存为新地址。'
                            : '手动填写后可按需保存；默认不保存，避免写入无效地址。'}
                      >
                        <Checkbox disabled={!selectedCustomer}>
                          {receiverContactEdited ? '保存为新地址' : '保存到客户地址库'}
                        </Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                </section>
                <section className="finance-entry-field-panel finance-entry-audit-panel">
                  <div className="finance-entry-form-subtitle">出库设置</div>
                  <Row gutter={12}>
                    <Col xs={24} md={12} xxl={8}><Form.Item name="destinationCountry" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={8}><Form.Item name="cargoType" label="货物类型" rules={[{ required: true, message: '请选择货物类型' }]}><AutoComplete options={cargoTypeOptions} onBlur={() => maybeSaveCatalogItem('CARGO_TYPE', form.getFieldValue('cargoType'))} /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={8}><Form.Item name="fbaInboundNo" label="FBA 入仓单号"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={canUseAgentFields ? 6 : 8}><Form.Item name="declarationRequired" label="报关" rules={[{ required: true, message: '请选择报关' }]}><Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={canUseAgentFields ? 6 : 8}><Form.Item name="sensitive" label="是否敏感"><Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} /></Form.Item></Col>
                    {canUseAgentFields ? (
                      <Col xs={24} md={12} xxl={6}>
                        <Form.Item name="agentId" label={agentFieldLabels.detailedCompanyName}>
                          <Select showSearch allowClear optionFilterProp="searchText" options={agentOptions} onChange={(value) => {
                            setPayables((rows) => rows.map((row) => ({ ...row, agentId: row.agentId || value })));
                            setBusinessCosts((rows) => rows.map((row) => ({ ...row, agentId: row.agentId || value })));
                          }} />
                        </Form.Item>
                      </Col>
                    ) : null}
                    <Col xs={24} md={12} xxl={canUseAgentFields ? 6 : 8}><Form.Item name="subOrderNo" label="分单号"><Input /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={12}><Form.Item name="settlementMethod" label="结算方式" rules={[{ required: true, message: '请选择结算方式' }]}><Select showSearch options={settlementOptions} onChange={(value) => form.setFieldsValue({ currency: getSettlementMethodCurrency(settlementRows, value) ?? form.getFieldValue('currency') ?? 'RMB' })} /></Form.Item></Col>
                    <Col xs={24} md={12} xxl={12}><Form.Item label="应收总额"><Input aria-label="应收总额" readOnly value={formatFeeRmbAmount(getFeeRmbTotal(receivables, 'RECEIVABLE'))} /></Form.Item></Col>
                    <Col xs={24}><Form.Item name="remark" label="备注"><Input /></Form.Item></Col>
                  </Row>
                </section>
              </div>
              <section className="finance-entry-system-date-panel" aria-label="系统日期">
                <div className="finance-entry-system-date-title">系统日期</div>
                <div className="finance-entry-system-date-grid">
                  <div className="finance-entry-system-date-item">
                    <Text type="secondary">出库日期</Text>
                    <Text>仓库出货后自动生成</Text>
                  </div>
                  <div className="finance-entry-system-date-item">
                    <Text type="secondary">应收审核日期</Text>
                    <Text>待生成</Text>
                  </div>
                  {canViewFinanceAuditFields ? (
                    <div className="finance-entry-system-date-item">
                      <Text type="secondary">业务成本审核日期</Text>
                      <Text>待生成</Text>
                    </div>
                  ) : null}
                  {canViewFinanceAuditFields ? (
                    <div className="finance-entry-system-date-item">
                      <Text type="secondary">应付审核日期</Text>
                      <Text>待生成</Text>
                    </div>
                  ) : null}
                </div>
              </section>
            </Form>
          </Card>
        </Col>
      </Row>
      <div className="finance-entry-fee-stack">
        {renderFeeTable('RECEIVABLE', '应收费用', receivables)}
        {canViewOrderEntryBusinessCosts ? renderFeeTable('BUSINESS_COST', '业务成本', businessCosts) : null}
        {canEditOrderEntryPayables ? renderFeeTable('PAYABLE', '应付费用', payables) : null}
      </div>
      <div className="finance-entry-actions">
        <Button onClick={reset} disabled={submitting || draftLoading}>清空</Button>
        <Button onClick={() => submit(false)} loading={submitting} disabled={draftLoading || !canSaveDraft || (!draftId && !canCreateOrderEntry)}>保存草稿</Button>
        <Button type="primary" onClick={() => submit(true)} loading={submitting} disabled={draftLoading || !canSaveDraft || !canSubmitForReview || (!draftId && !canCreateOrderEntry)}>提交审核</Button>
      </div>
      <Modal
        title={`已选包裹详情（${selectedPackages.length} 条）`}
        open={selectedPackageDetailsOpen}
        onCancel={() => setSelectedPackageDetailsOpen(false)}
        footer={<Button onClick={() => setSelectedPackageDetailsOpen(false)}>关闭</Button>}
        width={1240}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} className="full-width">
          {selectedCompanyChannel ? (
            companyChannelWarnings.length ? (
              <Alert
                type="error"
                showIcon
                message={`当前公司渠道“${selectedCompanyChannel.name}”命中 ${companyChannelWarnings.length} 项预警`}
                description="红色行表示该包裹超过当前渠道配置的超重或超围阈值，请复核尺寸、重量或渠道规则。"
              />
            ) : <Alert type="success" showIcon message={`当前公司渠道“${selectedCompanyChannel.name}”下，所选包裹均未命中超重或超围预警`} />
          ) : <Alert type="info" showIcon message="请先选择公司渠道，系统才能按该渠道的超重和超围规则预警" />}
          <Table<WarehousePackageSummary>
            className="finance-embedded-table finance-entry-package-detail-table"
            rowKey="id"
            size="small"
            dataSource={selectedPackages}
            columns={selectedPackageDetailColumns}
            pagination={false}
            tableLayout="fixed"
            scroll={{ x: 1196 }}
            rowClassName={(_, packageIndex) => (companyChannelWarningsByPackageIndex.has(packageIndex) ? 'finance-entry-package-warning-row' : '')}
          />
        </Space>
      </Modal>
      <Modal
        title={`仓库数据${watchedCustomerCode?.trim() ? ` · ${watchedCustomerCode.trim()}` : ''}`}
        open={packageModalOpen}
        onCancel={closePackageModal}
        footer={(
          <Space>
            <Button onClick={closePackageModal}>关闭</Button>
            <Button type="primary" disabled={!packagePickerSelected.length} onClick={confirmPackageSelection}>
              确认选择这些包裹 ({packagePickerSelected.length})
            </Button>
          </Space>
        )}
        width={1080}
        destroyOnHidden
      >
        <Space direction="vertical" size={12} className="full-width">
          <Space wrap>
            <Input
              aria-label="快递单号"
              placeholder="按快递单号筛选"
              value={packageTrackingQuery}
              onChange={(event) => setPackageTrackingQuery(event.target.value)}
              onPressEnter={() => void searchPackages()}
              style={{ width: 240 }}
            />
            <Button onClick={() => void searchPackages()} loading={packageLoading}>查询</Button>
            <Button onClick={() => void resetPackageSearch()} disabled={packageLoading}>重置</Button>
            <Button onClick={() => packageQuery ? void loadPackages(packageQuery) : void searchPackages()} loading={packageLoading}>刷新</Button>
          </Space>
          <Table<WarehousePackageSummary>
            className="finance-embedded-table finance-modal-fit-table"
            rowKey="id"
            size="small"
            loading={packageLoading}
            dataSource={packages}
            columns={packageColumns}
            pagination={packages.length > 50 ? {
              defaultPageSize: 50,
              pageSizeOptions: [50, 100, 300],
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`
            } : false}
            tableLayout="fixed"
            rowSelection={{ selectedRowKeys: packagePickerSelectedIds, onChange: handlePackageSelection, columnWidth: 48 }}
            locale={{ emptyText: selectedCustomer ? '暂无该客户编号可录单的在仓货物' : '请先维护客户资料' }}
            onRow={(record) => ({
              onDoubleClick: () => {
                modal.info({
                  title: '仓库货物明细',
                  content: (
                    <div className="finance-entry-package-detail">
                      <p>客户编号：{record.customerCode}</p>
                      <p>客户单号：{record.customerOrderNo}</p>
                      <p>快递单号：{record.domesticTrackingNo || '-'}</p>
                      <p>件数：{record.packageCount}</p>
                      <p>实重：{record.weightKg.toFixed(2)} kg</p>
                      <p>体积：{record.cbm.toFixed(6)} CBM</p>
                      <p>计费重：{record.chargeableWeightKg.toFixed(2)} kg</p>
                      <p>扫描时间：{record.scanTime ? formatBeijingDateTime(record.scanTime) : '-'}</p>
                      {record.tallyStatus && record.tallyStatus !== '待理货' ? (
                        <>
                          <p>理货标记：{record.tallyStatus}</p>
                          <p>理货任务：{record.tallyTaskNo || record.tallyTaskId || '-'}</p>
                        </>
                      ) : null}
                    </div>
                  )
                });
              }
            })}
          />
          <Text type="secondary">弹窗仅显示当前客户编号名下、且尚未被录单占用的在仓货物。</Text>
        </Space>
      </Modal>
      <Modal
        title="理货历史详情"
        open={Boolean(tallyHistoryPackage)}
        onCancel={() => {
          setTallyHistoryPackage(null);
          setTallyHistoryTasks([]);
        }}
        footer={<Button onClick={() => {
          setTallyHistoryPackage(null);
          setTallyHistoryTasks([]);
        }}>关闭</Button>}
        width={760}
        destroyOnHidden
      >
        {tallyHistoryPackage ? (
          <Space direction="vertical" size={12} className="full-width">
            {tallyHistoryLoading ? <Text type="secondary">正在加载理货历史...</Text> : <WarehouseTallyHistoryChain tasks={tallyHistoryTasks} />}
          </Space>
        ) : null}
      </Modal>
      <Modal
        title="选择已到账水单"
        open={Boolean(receiptPickerRow)}
        onCancel={() => setReceiptPickerRow(null)}
        footer={null}
        width={860}
        destroyOnHidden
      >
        <Table<WaterReceiptSummary>
          className="finance-embedded-table finance-modal-fit-table"
          rowKey="id"
          size="small"
          loading={receiptLoading}
          dataSource={receiptRows}
          pagination={receiptRows.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
          tableLayout="fixed"
          columns={[
            { title: '客户编号', dataIndex: 'customerCode', width: 96, ellipsis: true },
            { title: '水单编号', dataIndex: 'receiptNo', width: 140, ellipsis: true },
            { title: '币种', dataIndex: 'currency', width: 70, render: (value?: string) => value ?? 'RMB' },
            { title: '金额', dataIndex: 'amount', width: 92, align: 'right', render: (value: number) => value.toFixed(2) },
            { title: '余额', dataIndex: 'balance', width: 92, align: 'right', render: (value: number) => value.toFixed(2) },
            { title: '收款方式', dataIndex: 'receiptMethod', width: 100, ellipsis: true, render: (value?: string) => value || '-' },
            { title: '付款编号', dataIndex: 'paymentNo', width: 120, ellipsis: true, render: (value?: string) => value || '-' },
            {
              title: '操作',
              key: 'actions',
              width: 78,
              render: (_, row) => {
                const disabled = Boolean(receiptPickerRow && (row.currency ?? 'RMB') !== getFeeCurrency(receiptPickerRow, 'RECEIVABLE'));
                return <Button size="small" type="primary" disabled={disabled} onClick={() => selectReceiptForRow(row)}>选择</Button>;
              }
            }
          ]}
          locale={{ emptyText: '暂无可匹配的已到账水单' }}
        />
        <Text type="secondary">保存草稿不会占用水单余额；业务员提交后生成待审核匹配申请，财务在应收审核通过后才更新相关余额。</Text>
      </Modal>
    </div>
  );
}
