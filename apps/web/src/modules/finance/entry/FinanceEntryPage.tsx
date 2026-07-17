import type { Key } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { App as AntdApp, AutoComplete, Button, Card, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { calculateCompanyChannelChargeWeight, calculateCompanyChannelChargeWeightFromCargo, type AgentSummary, type ChannelSummary, type CustomerContactSummary, type CustomerSummary, type ExchangeRateSummary, type FinanceCatalogItemSummary, type FinanceCatalogCategory, type OrderEntryCreateInput, type OrderEntryDetailSummary, type OrderEntryWarehousePackageQuery, type ShipmentFinanceItemType, type WarehousePackageSummary, type WarehouseTallyTaskSummary, type WaterReceiptSummary } from '@siyuan/shared';
import type { ApiClient, RoleKey } from '../../../apiClient';
import { formatBeijingDateTime } from '../../shared/format';
import {
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

const { Text } = Typography;

function toDatetimeLocal(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function getDefaultFeeName(items: FinanceCatalogItemSummary[], preferred: string) {
  return items.find((item) => item.category === 'FEE_NAME' && item.enabled && item.name === preferred)?.name ?? '';
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

interface FinanceEntryPageProps {
  apiClient: ApiClient;
  role: RoleKey;
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

export function FinanceEntryPage({ apiClient, role, username, financeCatalogItems, customers, customerContacts, onCustomerContactsChange, onCatalogChange, onCreated, draftId, initialDraftDetail, canCreateOrderEntry, canSaveDraft, canSubmitForReview, canUseAgentFields, onDraftClosed, preselectedPackageIds, onPreselectedPackageIdsConsumed }: FinanceEntryPageProps) {
  const { message: messageApi, modal } = AntdApp.useApp();
  const [form] = Form.useForm<FinanceEntryFormValues>();
  const [packages, setPackages] = useState<WarehousePackageSummary[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [channels, setChannels] = useState<ChannelSummary[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<WarehousePackageSummary[]>([]);
  const [packagePickerSelected, setPackagePickerSelected] = useState<WarehousePackageSummary[]>([]);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageTrackingQuery, setPackageTrackingQuery] = useState('');
  const [packageQuery, setPackageQuery] = useState<OrderEntryWarehousePackageQuery | null>(null);
  const [preselectedPackageLoadKey, setPreselectedPackageLoadKey] = useState('');
  const [tallyHistoryPackage, setTallyHistoryPackage] = useState<WarehousePackageSummary | null>(null);
  const [tallyHistoryTasks, setTallyHistoryTasks] = useState<WarehouseTallyTaskSummary[]>([]);
  const [tallyHistoryLoading, setTallyHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptPickerRow, setReceiptPickerRow] = useState<FinanceEntryFeeDraft | null>(null);
  const [receiptRows, setReceiptRows] = useState<WaterReceiptSummary[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateSummary[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
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
  const canEditOrderEntryPayables = role === 'ADMIN' || role === 'FINANCE' || role === 'UG_FINANCE';
  const canViewFinanceAuditFields = role === 'ADMIN' || role === 'FINANCE' || role === 'UG_FINANCE' || role === 'BOSS' || role === 'OWNER';
  const canEditEntryAt = role === 'ADMIN' || role === 'BOSS' || role === 'OWNER';
  const settlementRows = useMemo(() => getSettlementMethodRows(financeCatalogItems), [financeCatalogItems]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(settlementRows), [settlementRows]);
  const agentOptions = useMemo(
    () => agents
      .filter((agent) => agent.enabled)
      .map((agent) => ({
        label: agent.shortName || agent.name || agent.code,
        value: agent.shortName || agent.name || agent.code
      })),
    [agents]
  );
  const businessChannelOptions = useMemo(
    () => channels
      .filter((channel) => channel.enabled)
      .map((channel) => ({ label: channel.name, value: channel.id })),
    [channels]
  );
  const createdAtText = useMemo(() => formatBeijingDateTime(new Date().toISOString()), []);
  const entryAtDefault = useMemo(() => toDatetimeLocal(new Date()), []);
  const watchedCustomerOrderNo = Form.useWatch('customerOrderNo', form);
  const watchedAgentName = Form.useWatch('agentName', form);
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
    () => financeCatalogItems
      .filter((item) => item.category === 'FEE_NAME' && item.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
      .map((item) => ({ label: item.name, value: item.name })),
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
        agentName: type !== 'RECEIVABLE' ? form.getFieldValue('agentName') : undefined,
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
    form.setFieldsValue({ entryAt: toDatetimeLocal(new Date()) });
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
        agentName: canUseAgentFields && 'agentName' in row ? row.agentName : undefined,
        chargeWeightKg: 'chargeWeightKg' in row ? row.chargeWeightKg : undefined,
        unitPrice: 'unitPrice' in row ? row.unitPrice : undefined,
        remark: row.remark
      });
    form.setFieldsValue({
      entryAt: shipment.entryAt ? toDatetimeLocal(new Date(shipment.entryAt)) : undefined,
      customerCode: shipment.customerCode,
      customerName: shipment.customerName,
      customerOrderNo: shipment.customerOrderNo,
      transferNo: shipment.transferNo,
      subOrderNo: shipment.subOrderNo,
      inboundNo: shipment.inboundNo,
      destinationCountry: shipment.destinationCountry,
      receivingChannel: shipment.channelId || shipment.channelName || shipment.carrier || detail.packages[0]?.receivingChannel,
      agentName: canUseAgentFields ? shipment.agentName : undefined,
      declarationRequired: shipment.declarationRequired,
      sensitive: shipment.sensitive,
      cargoType: shipment.cargoType,
      packageCount: shipment.packageCount,
      actualWeightKg: shipment.actualWeightKg ?? shipment.weightKg,
      volumeCbm: shipment.volumeCbm,
      chargeableWeightKg: shipment.chargeableWeightKg ?? shipment.receivableWeightKg,
      productName: shipment.productName,
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
  }, [businessCostDefaultFeeName, canUseAgentFields, form, receivableDefaultFeeName]);

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
      agentName: row.agentName || form.getFieldValue('agentName')
    })));
    setPayables((rows) => rows.map((row) => ({
      ...row,
      chargeWeightKg: totalChargeWeight,
      agentName: row.agentName || form.getFieldValue('agentName')
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
    const hasAllPreselectedPackages = preselectedPackageIds.every((id) => packages.some((pkg) => pkg.id === id));
    if (!hasAllPreselectedPackages && preselectedPackageLoadKey !== preselectedPackageKey) {
      setPreselectedPackageLoadKey(preselectedPackageKey);
      void loadPackages({ packageIds: Array.from(ids) });
      return;
    }
  }, [loadPackages, packages, preselectedPackageIds, preselectedPackageKey, preselectedPackageLoadKey]);

  useEffect(() => {
    if (!preselectedPackageIds?.length || !packages.length) return;
    const ids = new Set(preselectedPackageIds);
    const rows = packages.filter((pkg) => ids.has(pkg.id));
    if (!rows.length) return;
    setSelectedPackages(rows);
    applyPackageSelection(rows);
    setPreselectedPackageLoadKey('');
    onPreselectedPackageIdsConsumed?.();
  }, [applyPackageSelection, onPreselectedPackageIdsConsumed, packages, preselectedPackageIds, preselectedPackageKey]);

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
      agentName: canUseAgentFields && type !== 'RECEIVABLE' ? (row.agentName || form.getFieldValue('agentName')) : undefined,
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
    const input: OrderEntryCreateInput = {
      shipment: {
        customerCode,
        customerOrderNo: values.customerOrderNo || customerCode || firstPackage?.customerOrderNo || '',
        outboundOrderNo: values.customerOrderNo?.trim(),
        systemOrderNo: values.customerOrderNo?.trim(),
        entryAt: values.entryAt,
        transferNo: values.transferNo,
        subOrderNo: values.subOrderNo,
        inboundNo: values.inboundNo,
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: values.destinationCountry ?? firstPackage?.destinationCountry ?? '',
        receivingChannel: selectedBusinessChannel?.name || values.receivingChannel || values.channelName,
        channelId: selectedBusinessChannel?.id,
        declarationRequired: values.declarationRequired ?? false,
        sensitive: Boolean(values.sensitive),
        cargoType: values.cargoType ?? '',
        productName: values.productName ?? '',
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
      businessCosts: buildFeeRows(businessCosts, 'BUSINESS_COST'),
      payables: canEditOrderEntryPayables ? buildFeeRows(payables, 'PAYABLE') : [],
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
          ? `已生成出货单号 ${detail.shipment.outboundOrderNo || detail.shipment.systemOrderNo}`
          : `草稿已保存，可在录单草稿箱继续编辑。草稿号/出货单号：${detail.shipment.outboundOrderNo || detail.shipment.systemOrderNo}`
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
      setTallyHistoryTasks(await apiClient.warehouseTallyTaskHistoryChain(record.id));
    } catch {
      setTallyHistoryTasks([]);
    } finally {
      setTallyHistoryLoading(false);
    }
  }, [apiClient]);

  const renderPackageNoWithTally = (record: WarehousePackageSummary) => {
    const packageNo = record.combinedOrderNo || `${record.customerOrderNo}-${record.domesticTrackingNo}`;
    const tallied = isTalliedPackage(record);
    if (!tallied) {
      return <Text strong>{packageNo}</Text>;
    }
    return (
      <Space size={4} className="finance-entry-tally-inline">
        <Button
          type="link"
          size="small"
          className="finance-entry-package-link"
          onClick={(event) => {
            event.stopPropagation();
            void openTallyHistory(record);
          }}
        >
          {packageNo}
        </Button>
        <Tag
          color="processing"
          className="finance-entry-tally-tag"
          onClick={(event) => {
            event.stopPropagation();
            void openTallyHistory(record);
          }}
        >
          理
        </Tag>
      </Space>
    );
  };

  const packageColumns: ColumnsType<WarehousePackageSummary> = [
    {
      title: '客户单号-快递单号',
      width: 230,
      render: (_, record) => (
        <div className="finance-entry-package-cell">
          {renderPackageNoWithTally(record)}
          <Text type="secondary">箱序：{record.packageIndex ?? '-'} / {record.expectedTotalPackageCount ?? '-'}</Text>
        </div>
      )
    },
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 150, render: (value?: string) => value || '-' },
    { title: '件数', dataIndex: 'packageCount', width: 80 },
    { title: '实重', dataIndex: 'weightKg', width: 100, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '6000材积', dataIndex: 'volumetricWeightKg', width: 110, render: (value: number) => `${value.toFixed(2)} kg` },
    { title: '扫描时间', dataIndex: 'scanTime', width: 170, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    { title: '备注', dataIndex: 'remark', width: 160, render: (value?: string) => value || '-' }
  ];

  const getFeeCurrency = (row: FinanceEntryFeeDraft, type: ShipmentFinanceItemType) => {
    if (type === 'PAYABLE') return normalizeFinanceCatalogCurrency(row.currency) ?? 'RMB';
    return normalizeFinanceCatalogCurrency(row.currency) ?? normalizeFinanceCatalogCurrency(form.getFieldValue('currency')) ?? 'RMB';
  };

  const currencyToRmb = (currency?: string) => {
    const normalized = normalizeFinanceCatalogCurrency(currency) ?? 'RMB';
    if (normalized === 'RMB') return 1;
    if (normalized === 'USD') return exchangeRates.find((rate) => rate.enabled && rate.baseCurrency === 'USD' && rate.quoteCurrency === 'RMB')?.rate ?? 0;
    return 0;
  };

  const renderReadonlyCell = (value?: string | number | null, placeholder = '-') => <Text>{value === undefined || value === null || value === '' ? placeholder : value}</Text>;

  const getFeeRmbTotal = (rows: FinanceEntryFeeDraft[], type: ShipmentFinanceItemType) => rows.reduce((sum, row) => {
    return sum + calculateFinanceEntryFeeAmount(row) * currencyToRmb(getFeeCurrency(row, type));
  }, 0);
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
        { title: '业务员', width: 100, render: () => renderReadonlyCell(matchedSalesperson) },
        { title: '费用名称', width: 150, render: (_, row) => renderFeeNameSelect(type, row, title) },
        { title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
        { title: '出货单号', width: 150, render: () => renderReadonlyCell(watchedCustomerOrderNo, '待生成') },
        { title: '转单号', width: 130, render: () => renderReadonlyCell(undefined, '待回填') },
        { title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
        {
          title: '匹配水单编号',
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
        { title: '金额', width: 120, render: (_, row) => <InputNumber min={0} max={row.receiptBalance} precision={2} value={row.amount} onChange={(value) => updateFee(type, row.id, { amount: value ?? undefined })} /> },
        {
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
        { title: '合计', width: 120, align: 'right', render: (_, row) => <Text>{`RMB ${(calculateFinanceEntryFeeAmount(row) * currencyToRmb(getFeeCurrency(row, type))).toFixed(2)}`}</Text> },
        { title: '制单日期', width: 170, render: () => renderReadonlyCell(createdAtText) },
        { title: '制单人', width: 110, render: () => renderReadonlyCell(username) },
        { title: '审单日期', width: 120, render: () => renderReadonlyCell(null) },
        { title: '审单人', width: 100, render: () => renderReadonlyCell(null) },
        { title: '备注', width: 180, render: (_, row) => <Input value={row.remark} onChange={(event) => updateFee(type, row.id, { remark: event.target.value })} /> },
        { title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => removeFee(type, row.id)}>删除</Button> }
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
          <Table<FinanceEntryFeeDraft>
            className="finance-entry-editable-table finance-work-table finance-embedded-table"
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={rows}
            scroll={{ x: 2050 }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={Math.max(1, columns.length - 1)}>
                    <Text strong>合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={columns.length - 1} align="right">
                    <Text strong>RMB {getFeeRmbTotal(rows, type).toFixed(2)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
            columns={columns}
          />
        </Card>
      );
    }

    if (type === 'BUSINESS_COST') {
      const profitColumns: ColumnsType<FinanceEntryFeeDraft> = canViewFinanceAuditFields ? [
        { title: '业务利润', width: 120, align: 'right', render: () => <Text>{(getFeeRmbTotal(receivables, 'RECEIVABLE') - getFeeRmbTotal(businessCosts, 'BUSINESS_COST')).toFixed(2)}</Text> }
      ] : [];
      const columns: ColumnsType<FinanceEntryFeeDraft> = [
        ...(canUseAgentFields ? [{
          title: '代理',
          width: 150,
          render: (_: unknown, row: FinanceEntryFeeDraft) => <Select showSearch allowClear value={row.agentName || watchedAgentName} options={agentOptions} onChange={(value) => updateFee(type, row.id, { agentName: value })} />
        }] : []),
        { title: '费用名称', width: 150, render: (_, row) => renderFeeNameSelect(type, row, title) },
        { title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
        { title: '出货单号', width: 150, render: () => renderReadonlyCell(watchedCustomerOrderNo, '待生成') },
        { title: '转单号', width: 130, render: () => renderReadonlyCell(undefined, '待回填') },
        { title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
        { title: '计费重', width: 110, render: (_, row) => <InputNumber min={0} precision={2} value={row.chargeWeightKg} onChange={(value) => updateFee(type, row.id, { chargeWeightKg: value ?? undefined })} /> },
        { title: '单价', width: 120, render: (_, row) => <InputNumber min={0} precision={2} value={row.unitPrice} onChange={(value) => updateFee(type, row.id, { unitPrice: value ?? undefined })} /> },
        { title: '总金额', width: 120, align: 'right', render: (_, row) => <InputNumber readOnly precision={2} value={calculateFinanceEntryFeeAmount(row)} /> },
        { title: '合计', width: 120, align: 'right', render: (_, row) => <Text>{`RMB ${(calculateFinanceEntryFeeAmount(row) * currencyToRmb(getFeeCurrency(row, type))).toFixed(2)}`}</Text> },
        ...profitColumns,
        { title: '制单日期', width: 170, render: () => renderReadonlyCell(createdAtText) },
        { title: '制单人', width: 110, render: () => renderReadonlyCell(username) },
        { title: '备注', width: 180, render: (_, row) => <Input value={row.remark} onChange={(event) => updateFee(type, row.id, { remark: event.target.value })} /> },
        { title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => removeFee(type, row.id)}>删除</Button> }
      ];
      return (
        <Card className="finance-entry-fee-card" title={title} extra={<Button onClick={() => addFee(type)}>新增项目</Button>}>
          <Table<FinanceEntryFeeDraft>
            className="finance-entry-editable-table finance-work-table finance-embedded-table"
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={rows}
            scroll={{ x: Math.max(1600, columns.length * 125) }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={Math.max(1, columns.length - 1)}>
                    <Text strong>合计</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={columns.length - 1} align="right">
                    <Text strong>RMB {getFeeRmbTotal(rows, type).toFixed(2)}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
            columns={columns}
          />
        </Card>
      );
    }

    const columns: ColumnsType<FinanceEntryFeeDraft> = [
      ...(canUseAgentFields ? [{
        title: '代理',
        width: 150,
        render: (_: unknown, row: FinanceEntryFeeDraft) => <Select showSearch allowClear value={row.agentName || watchedAgentName} options={agentOptions} onChange={(value) => updateFee(type, row.id, { agentName: value })} />
      }] : []),
      { title: '费用名称', width: 150, render: (_, row) => renderFeeNameSelect(type, row, title) },
      { title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
      { title: '出货单号', width: 150, render: () => renderReadonlyCell(watchedCustomerOrderNo, '待生成') },
      { title: '转单号', width: 130, render: () => renderReadonlyCell(undefined, '待回填') },
      { title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
      { title: '计费重', width: 110, render: (_, row) => <InputNumber min={0} precision={2} value={row.chargeWeightKg} onChange={(value) => updateFee(type, row.id, { chargeWeightKg: value ?? undefined })} /> },
      { title: '出货成本单价', width: 125, render: (_, row) => <InputNumber min={0} precision={2} value={row.unitPrice} onChange={(value) => updateFee(type, row.id, { unitPrice: value ?? undefined })} /> },
      { title: '总金额', width: 120, align: 'right', render: (_, row) => <InputNumber readOnly precision={2} value={calculateFinanceEntryFeeAmount(row)} /> },
      { title: '合计', width: 120, align: 'right', render: (_, row) => <Text>{`RMB ${(calculateFinanceEntryFeeAmount(row) * currencyToRmb(getFeeCurrency(row, type))).toFixed(2)}`}</Text> },
      {
        title: '付款编号',
        width: 150,
        render: (_, row) => <Input value={row.paymentNo} onChange={(event) => updateFee(type, row.id, { paymentNo: event.target.value })} />
      },
      { title: '制单日期', width: 170, render: () => renderReadonlyCell(createdAtText) },
      { title: '制单人', width: 110, render: () => renderReadonlyCell(username) },
      { title: '审单日期', width: 120, render: () => renderReadonlyCell(null) },
      { title: '审单人', width: 100, render: () => renderReadonlyCell(null) },
      { title: '应付备注', width: 180, render: (_, row) => <Input value={row.remark} onChange={(event) => updateFee(type, row.id, { remark: event.target.value })} /> },
      { title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => removeFee(type, row.id)}>删除</Button> }
    ];
    return (
      <Card className="finance-entry-fee-card" title={title} extra={<Button onClick={() => addFee(type)}>新增项目</Button>}>
        <Table<FinanceEntryFeeDraft>
          className="finance-entry-editable-table finance-work-table finance-embedded-table"
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={rows}
          scroll={{ x: Math.max(1800, columns.length * 125) }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={Math.max(1, columns.length - 1)}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={columns.length - 1} align="right">
                  <Text strong>RMB {getFeeRmbTotal(rows, type).toFixed(2)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
          columns={columns}
        />
      </Card>
    );
  };

  return (
    <div className="finance-entry-page">
      <Row gutter={[12, 12]} className="finance-entry-workbench-row">
        <Col xs={24}>
          <Card className="finance-entry-workbench-card finance-entry-form-card" title={draftId ? '继续编辑录单草稿' : '运单基础信息'} loading={draftLoading}>
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
                  <Col xs={24} md={12} xl={6}><Form.Item name="customerOrderNo" label="出货单号" rules={[{ required: true, message: '请输入出货单号' }]}><Input /></Form.Item></Col>
                  <Col xs={24} md={12} xl={6}>
                    <Form.Item name="receivingChannel" label="公司渠道" rules={[{ required: true, message: '请选择公司渠道' }]}>
                      <Select showSearch allowClear options={businessChannelOptions} onChange={(value) => recalculateCargoChargeWeight(value)} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12} xl={6}>
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
                  <Col xs={24} md={12} xl={6}><Form.Item name="transferNo" label="转单号"><Input /></Form.Item></Col>
                  <Col xs={24} md={12} xl={6}><Form.Item name="inboundNo" label="入仓号"><Input /></Form.Item></Col>
                  <Col xs={24}><Form.Item name="productName" label="品名" rules={[{ required: true, message: '请输入品名' }]}><AutoComplete options={productNameOptions} onBlur={() => maybeSaveCatalogItem('PRODUCT_NAME', form.getFieldValue('productName'))} /></Form.Item></Col>
                </Row>
                <div className="finance-entry-cargo-metrics" aria-label="货物数据">
                  <div className="finance-entry-cargo-toolbar">
                    <Space wrap align="center">
                      <Text strong>货物数据</Text>
                      <Tag color={cargoDataSource === 'MANUAL_ADJUSTED' ? 'gold' : 'blue'}>{cargoDataSource === 'MANUAL_ADJUSTED' ? '手动调整' : '仓库自动汇总'}</Tag>
                      {chargeWeightOverridden ? <Tag color="orange">计费重已手动覆盖</Tag> : null}
                    </Space>
                    <Button size="small" onClick={() => recalculateCargoChargeWeight()} disabled={!selectedCompanyChannel && !totals.weightKg && !totals.cbm}>按公司渠道重新计算</Button>
                  </div>
                  <div className="finance-entry-cargo-grid">
                    <Form.Item name="packageCount" label="件数"><InputNumber min={0} precision={0} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('packageCount', value)} /></Form.Item>
                    <Form.Item name="actualWeightKg" label="实重 kg"><div className="finance-entry-cargo-unit-input"><InputNumber min={0} precision={2} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('actualWeightKg', value)} /><span>kg</span></div></Form.Item>
                    <Form.Item name="volumeCbm" label="体积 CBM"><div className="finance-entry-cargo-unit-input"><InputNumber min={0} precision={6} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('volumeCbm', value)} /><span>CBM</span></div></Form.Item>
                    <Form.Item name="chargeableWeightKg" label="计费重 kg"><div className="finance-entry-cargo-unit-input"><InputNumber min={0} precision={2} className="finance-entry-cargo-number" onChange={(value) => updateCargoMetric('chargeableWeightKg', value)} /><span>kg</span></div></Form.Item>
                  </div>
                  {selectedCompanyChannel ? <Text type="secondary">已按 {selectedCompanyChannel.name} 计算：除材积 {selectedCompanyChannel.volumeDivisor} / {selectedCompanyChannel.multiPieceWeightRule} / {selectedCompanyChannel.settlementWeightRule}</Text> : <Text type="secondary">请选择公司渠道；仓库货物会按该渠道规则计算计费重。</Text>}
                </div>
              </section>
              <div className="finance-entry-two-column-layout">
                <section className="finance-entry-field-panel finance-entry-receiver-panel">
                  <div className="finance-entry-form-subtitle">收货信息</div>
                  <Row gutter={12}>
                    <Col xs={24} md={12}><Form.Item name="receiverName" label="收货人名称"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="receiverCompany" label="收货人公司名称"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="receiverPhone" label="收货人电话"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="fbaWarehouseCode" label="FBA仓库代码"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="receiverPostalCode" label="邮编"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="receiverCountry" label="收货国家">
                        <AutoComplete
                          allowClear
                          options={countryOptions}
                          filterOption={filterLocationOption}
                          popupMatchSelectWidth={320}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="receiverState" label="州/省">
                        <AutoComplete
                          allowClear
                          options={stateOptions}
                          filterOption={filterLocationOption}
                          popupMatchSelectWidth={320}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24}><Form.Item name="receiverAddress" label="收货人地址"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}>
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
                    <Col xs={24} md={12}>
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
                  <div className="finance-entry-form-subtitle">出库与审核</div>
                  <Row gutter={12}>
                    <Col xs={24} md={12}><Form.Item label="出库日期"><Input readOnly value="仓库出货后自动生成" /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="fbaInboundNo" label="FBA 入仓单号"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="destinationCountry" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="declarationRequired" label="报关" rules={[{ required: true, message: '请选择报关' }]}><Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="cargoType" label="货物类型" rules={[{ required: true, message: '请选择货物类型' }]}><AutoComplete options={cargoTypeOptions} onBlur={() => maybeSaveCatalogItem('CARGO_TYPE', form.getFieldValue('cargoType'))} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="sensitive" label="是否敏感"><Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} /></Form.Item></Col>
                    {canUseAgentFields ? (
                      <Col xs={24} md={12}>
                        <Form.Item name="agentName" label="代理渠道">
                          <Select showSearch allowClear options={agentOptions} onChange={(value) => {
                            setPayables((rows) => rows.map((row) => ({ ...row, agentName: row.agentName || value })));
                            setBusinessCosts((rows) => rows.map((row) => ({ ...row, agentName: row.agentName || value })));
                          }} />
                        </Form.Item>
                      </Col>
                    ) : null}
                    <Col xs={24} md={12}><Form.Item name="subOrderNo" label="分单号"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="settlementMethod" label="结算方式" rules={[{ required: true, message: '请选择结算方式' }]}><Select showSearch options={settlementOptions} onChange={(value) => form.setFieldsValue({ currency: getSettlementMethodCurrency(settlementRows, value) ?? form.getFieldValue('currency') ?? 'RMB' })} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="应收总额"><Input aria-label="应收总额" readOnly value={`RMB ${getFeeRmbTotal(receivables, 'RECEIVABLE').toFixed(2)}`} /></Form.Item></Col>
                    <Col xs={24}><Form.Item name="remark" label="备注"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="应收审核日期"><Input readOnly value="提交审核后自动生成" /></Form.Item></Col>
                    {canViewFinanceAuditFields ? <Col xs={24} md={12}><Form.Item label="业务成本审核日期"><Input readOnly value="提交审核后自动生成" /></Form.Item></Col> : null}
                    {canViewFinanceAuditFields ? <Col xs={24} md={12}><Form.Item label="应付审核日期"><Input readOnly value="提交审核后自动生成" /></Form.Item></Col> : null}
                  </Row>
                </section>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
      <div className="finance-entry-fee-stack">
        {renderFeeTable('RECEIVABLE', '应收费用', receivables)}
        {renderFeeTable('BUSINESS_COST', '业务成本', businessCosts)}
        {canEditOrderEntryPayables ? renderFeeTable('PAYABLE', '应付费用', payables) : null}
      </div>
      <div className="finance-entry-actions">
        <Button onClick={reset} disabled={submitting || draftLoading}>清空</Button>
        <Button onClick={() => submit(false)} loading={submitting} disabled={draftLoading || !canSaveDraft || (!draftId && !canCreateOrderEntry)}>保存草稿</Button>
        <Button type="primary" onClick={() => submit(true)} loading={submitting} disabled={draftLoading || !canSaveDraft || !canSubmitForReview || (!draftId && !canCreateOrderEntry)}>提交审核</Button>
      </div>
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
        width={980}
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
            className="finance-embedded-table"
            rowKey="id"
            size="small"
            loading={packageLoading}
            dataSource={packages}
            columns={packageColumns}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 980 }}
            rowSelection={{ selectedRowKeys: packagePickerSelectedIds, onChange: handlePackageSelection, columnWidth: 56, fixed: true }}
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
                      {isTalliedPackage(record) ? (
                        <>
                          <p>理货标记：已理货</p>
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
          className="finance-embedded-table"
          rowKey="id"
          size="small"
          loading={receiptLoading}
          dataSource={receiptRows}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          scroll={{ x: 920 }}
          columns={[
            { title: '客户编号', dataIndex: 'customerCode', width: 110 },
            { title: '水单编号', dataIndex: 'receiptNo', width: 160 },
            { title: '币种', dataIndex: 'currency', width: 90, render: (value?: string) => value ?? 'RMB' },
            { title: '金额', dataIndex: 'amount', width: 110, align: 'right', render: (value: number) => value.toFixed(2) },
            { title: '余额', dataIndex: 'balance', width: 110, align: 'right', render: (value: number) => value.toFixed(2) },
            { title: '收款方式', dataIndex: 'receiptMethod', width: 120, render: (value?: string) => value || '-' },
            { title: '付款编号', dataIndex: 'paymentNo', width: 140, render: (value?: string) => value || '-' },
            {
              title: '操作',
              key: 'actions',
              width: 90,
              fixed: 'right',
              render: (_, row) => {
                const disabled = Boolean(receiptPickerRow && (row.currency ?? 'RMB') !== getFeeCurrency(receiptPickerRow, 'RECEIVABLE'));
                return <Button size="small" type="primary" disabled={disabled} onClick={() => selectReceiptForRow(row)}>选择</Button>;
              }
            }
          ]}
          locale={{ emptyText: '暂无可匹配的已到账水单' }}
        />
        <Text type="secondary">保存草稿不会占用水单余额；提交审核成功后才会执行正式匹配。</Text>
      </Modal>
    </div>
  );
}
