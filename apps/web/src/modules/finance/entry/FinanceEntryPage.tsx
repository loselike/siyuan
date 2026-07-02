import type { Key } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AutoComplete, Button, Card, Checkbox, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AgentSummary, CustomerContactSummary, CustomerSummary, ExchangeRateSummary, FinanceCatalogItemSummary, FinanceCatalogCategory, OrderEntryCreateInput, ShipmentFinanceItemType, WarehousePackageSummary, WaterReceiptSummary } from '@siyuan/shared';
import type { ApiClient, RoleKey } from '../../../apiClient';
import { businessTypeLabels } from '@siyuan/shared';
import { formatBeijingDateTime } from '../../shared/format';
import { confirmDangerousAction } from '../../shared/dangerousAction';
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

const { Text } = Typography;

function toDatetimeLocal(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

interface FinanceEntryPageProps {
  apiClient: ApiClient;
  role: RoleKey;
  username: string;
  financeCatalogItems: FinanceCatalogItemSummary[];
  customers: CustomerSummary[];
  customerContacts: CustomerContactSummary[];
  onCustomerContactsChange?: (contacts: CustomerContactSummary[]) => void;
  onCreated?: () => Promise<void> | void;
  preselectedPackageIds?: string[];
  onPreselectedPackageIdsConsumed?: () => void;
}

export function FinanceEntryPage({ apiClient, role, username, financeCatalogItems, customers, customerContacts, onCustomerContactsChange, onCreated, preselectedPackageIds, onPreselectedPackageIdsConsumed }: FinanceEntryPageProps) {
  const [form] = Form.useForm<FinanceEntryFormValues>();
  const [packages, setPackages] = useState<WarehousePackageSummary[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  const [selectedPackageIds, setSelectedPackageIds] = useState<Key[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [receiptPickerRow, setReceiptPickerRow] = useState<FinanceEntryFeeDraft | null>(null);
  const [receiptRows, setReceiptRows] = useState<WaterReceiptSummary[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateSummary[]>([]);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receivables, setReceivables] = useState<FinanceEntryFeeDraft[]>([
    createFinanceEntryFeeDraft('RECEIVABLE', { name: '运费' })
  ]);
  const [businessCosts, setBusinessCosts] = useState<FinanceEntryFeeDraft[]>([
    createFinanceEntryFeeDraft('BUSINESS_COST', { name: '业务员成本' })
  ]);
  const [payables, setPayables] = useState<FinanceEntryFeeDraft[]>([
    createFinanceEntryFeeDraft('PAYABLE', { name: '代理成本' })
  ]);
  const canViewPayables = role === 'ADMIN' || role === 'FINANCE';
  const canEditEntryAt = role === 'ADMIN' || role === 'FINANCE';
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
  const createdAtText = useMemo(() => formatBeijingDateTime(new Date().toISOString()), []);
  const entryAtDefault = useMemo(() => toDatetimeLocal(new Date()), []);
  const watchedSystemOrderNo = Form.useWatch('systemOrderNo', form);
  const watchedAgentName = Form.useWatch('agentName', form);
  const watchedCustomerCode = Form.useWatch('customerCode', form);
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
  const cargoTypeOptions = useMemo(
    () => financeCatalogItems
      .filter((item) => item.category === 'CARGO_TYPE' && item.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
      .map((item) => ({ label: item.name, value: item.name })),
    [financeCatalogItems]
  );
  const feeNameSet = useMemo(
    () => new Set(financeCatalogItems.filter((item) => item.category === 'FEE_NAME').map((item) => item.name.trim())),
    [financeCatalogItems]
  );
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
    Modal.confirm({
      title: `保存新的${label}？`,
      content: `${name} 不在资料库中，是否保存到资料库供下次选择？`,
      okText: '保存',
      cancelText: '暂不保存',
      onOk: async () => {
        await apiClient.createFinanceCatalogItem({
          category,
          name,
          enabled: true,
          currency: category === 'FEE_NAME' ? 'RMB' : undefined
        });
        message.success('已保存到资料库');
        await onCreated?.();
      }
    });
  }, [apiClient, cargoTypeSet, feeNameSet, onCreated, productNameSet]);

  const loadPackages = useCallback(async () => {
    setPackageLoading(true);
    try {
      setPackages(await apiClient.orderEntryPackages());
    } catch (error) {
      Modal.error({ title: '仓库货物加载失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setPackageLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    let mounted = true;
    apiClient.masterData()
      .then((snapshot) => {
        if (!mounted) return;
        setExchangeRates(snapshot.exchangeRates);
        if (canViewPayables) setAgents(snapshot.agents);
      })
      .catch(() => {
        if (mounted) setAgents([]);
      });
    return () => {
      mounted = false;
    };
  }, [apiClient, canViewPayables]);

  const selectedPackages = useMemo(() => {
    const ids = new Set(selectedPackageIds.map(String));
    return packages.filter((pkg) => ids.has(pkg.id));
  }, [selectedPackageIds, packages]);

  const totals = useMemo(() => selectedPackages.reduce(
    (summary, pkg) => ({
      packageCount: summary.packageCount + pkg.packageCount,
      weightKg: summary.weightKg + pkg.weightKg,
      cbm: summary.cbm + pkg.cbm,
      chargeWeightKg: summary.chargeWeightKg + pkg.chargeableWeightKg
    }),
    { packageCount: 0, weightKg: 0, cbm: 0, chargeWeightKg: 0 }
  ), [selectedPackages]);
  const matchedWarehouseText = useMemo(() => {
    if (!selectedPackages.length) return '-';
    const scanTimes = selectedPackages.flatMap((pkg) => (pkg.scanTime ? [pkg.scanTime] : [])).sort();
    if (!scanTimes.length) return '已选择仓库货物';
    return `${formatBeijingDateTime(scanTimes[0])}${scanTimes.length > 1 ? ` - ${formatBeijingDateTime(scanTimes[scanTimes.length - 1])}` : ''}`;
  }, [selectedPackages]);
  const matchedSalesperson = selectedPackages.find((pkg) => pkg.salesperson)?.salesperson || (role === 'OPERATOR' ? username : '系统匹配');

  const applyReceiverContact = (contactId?: string) => {
    const contact = selectedCustomerContacts.find((item) => item.id === contactId);
    if (!contact) return;
    form.setFieldsValue({
      receiverName: contact.name,
      receiverCompany: contact.company,
      receiverPhone: contact.phone,
      receiverAddress: contact.address,
      receiverCountry: contact.country,
      receiverState: contact.state,
      receiverPostalCode: contact.postalCode
    });
  };

  const maybeSaveReceiverContact = async (values: FinanceEntryFormValues) => {
    if (!values.saveReceiverToCustomer) return;
    const customerCode = values.customerCode?.trim();
    const customer = customers.find((item) => item.code === customerCode || item.id === customerCode);
    if (!customer) return;
    const activeContacts = customerContacts.filter((contact) => contact.customerId === customer.id && contact.enabled);
    if (activeContacts.length >= 4) return;
    const name = values.receiverName?.trim();
    if (!name) return;
    const phone = values.receiverPhone?.trim() || '';
    const address = values.receiverAddress?.trim() || '';
    const exists = activeContacts.some((contact) =>
      contact.name.trim() === name &&
      (contact.phone?.trim() || '') === phone &&
      (contact.address?.trim() || '') === address
    );
    if (exists) return;
    const contact = await apiClient.createCustomerContact(customer.id, {
      name,
      company: values.receiverCompany?.trim() || undefined,
      phone: phone || undefined,
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
        currency: type === 'PAYABLE' ? 'RMB' : formCurrency,
        agentName: type !== 'RECEIVABLE' ? form.getFieldValue('agentName') : undefined,
        chargeWeightKg
      })
    ]);
  };

  const removeFee = (type: ShipmentFinanceItemType, id: string) => {
    updateRows(type, (rows) => rows.length <= 1 ? rows : rows.filter((row) => row.id !== id));
  };
  const confirmRemoveFee = (type: ShipmentFinanceItemType, id: string) => {
    confirmDangerousAction({
      title: '确认删除该费用行？',
      content: '删除后该费用行会从当前录单草稿中移除，提交时不会写入订单费用。',
      okText: '删除',
      danger: true,
      onOk: () => removeFee(type, id)
    });
  };

  const reset = () => {
    form.resetFields();
    form.setFieldsValue({ entryAt: toDatetimeLocal(new Date()) });
    setSelectedPackageIds([]);
    setReceivables([createFinanceEntryFeeDraft('RECEIVABLE', { name: '运费' })]);
    setBusinessCosts([createFinanceEntryFeeDraft('BUSINESS_COST', { name: '业务员成本' })]);
    setPayables([createFinanceEntryFeeDraft('PAYABLE', { name: '代理成本' })]);
  };

  const openReceiptPicker = useCallback(async (row: FinanceEntryFeeDraft) => {
    const customerCode = form.getFieldValue('customerCode')?.trim();
    if (!customerCode) {
      Modal.warning({ title: '请先填写客户编号', content: '水单匹配只能选择同客户编号下的已到账水单。' });
      return;
    }
    setReceiptPickerRow(row);
    setReceiptLoading(true);
    try {
      const response = await apiClient.waterReceipts({ customerCode, status: 'ALL', page: 1, pageSize: 1000 });
      setReceiptRows(response.rows.filter((item) => ['ARRIVED', 'PARTIAL_MATCHED'].includes(item.status) && Number(item.balance) > 0));
    } catch (error) {
      Modal.error({ title: '水单加载失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setReceiptLoading(false);
    }
  }, [apiClient, form]);

  const selectReceiptForRow = useCallback((receipt: WaterReceiptSummary) => {
    if (!receiptPickerRow) return;
    if ((receipt.currency ?? 'RMB') !== getFeeCurrency(receiptPickerRow, 'RECEIVABLE')) {
      Modal.warning({ title: '币种不一致', content: '水单币种必须与应收费用币种一致。' });
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

  const applyPackageSelection = useCallback((selectedRows: WarehousePackageSummary[]) => {
    if (!selectedRows.length) return;
    const first = selectedRows[0];
    const totalChargeWeight = roundFinanceNumber(selectedRows.reduce((sum, pkg) => sum + pkg.chargeableWeightKg, 0));
    form.setFieldsValue({
      customerCode: first.customerCode,
      customerName: form.getFieldValue('customerName') || `${first.customerCode}-仓库客户`,
      customerOrderNo: first.customerOrderNo || first.customerCode,
      inboundNo: form.getFieldValue('inboundNo') || first.domesticTrackingNo || first.combinedOrderNo,
      businessType: form.getFieldValue('businessType') || 'DEDICATED_LINE',
      packageType: form.getFieldValue('packageType') || 'WPX',
      destinationCountry: first.destinationCountry || form.getFieldValue('destinationCountry') || '美国',
      receivingChannel: first.receivingChannel || form.getFieldValue('receivingChannel')
    });
    setReceivables((rows) => rows.map((row) => ({ ...row, chargeWeightKg: row.chargeWeightKg ?? totalChargeWeight })));
    setBusinessCosts((rows) => rows.map((row) => ({
      ...row,
      chargeWeightKg: row.chargeWeightKg ?? totalChargeWeight,
      agentName: row.agentName || form.getFieldValue('agentName')
    })));
    setPayables((rows) => rows.map((row) => ({
      ...row,
      chargeWeightKg: row.chargeWeightKg ?? totalChargeWeight,
      agentName: row.agentName || form.getFieldValue('agentName')
    })));
  }, [form]);

  const handlePackageSelection = (selectedRowKeys: Key[], selectedRows: WarehousePackageSummary[]) => {
    setSelectedPackageIds(selectedRowKeys);
    applyPackageSelection(selectedRows);
  };

  const applyCurrentChargeWeightToFees = useCallback(() => {
    const chargeWeightKg = totals.chargeWeightKg ? roundFinanceNumber(totals.chargeWeightKg) : undefined;
    setReceivables((rows) => rows.map((row) => ({ ...row, chargeWeightKg })));
    setBusinessCosts((rows) => rows.map((row) => ({ ...row, chargeWeightKg })));
    setPayables((rows) => rows.map((row) => ({ ...row, chargeWeightKg })));
  }, [totals.chargeWeightKg]);

  const preselectedPackageKey = (preselectedPackageIds ?? []).join('|');
  useEffect(() => {
    if (!preselectedPackageIds?.length || !packages.length) return;
    const ids = new Set(preselectedPackageIds);
    const rows = packages.filter((pkg) => ids.has(pkg.id));
    if (!rows.length) return;
    setSelectedPackageIds(rows.map((pkg) => pkg.id));
    applyPackageSelection(rows);
    onPreselectedPackageIdsConsumed?.();
  }, [applyPackageSelection, onPreselectedPackageIdsConsumed, packages, preselectedPackageIds, preselectedPackageKey]);

  const buildFeeRows = (rows: FinanceEntryFeeDraft[], type: ShipmentFinanceItemType) => rows
    .map((row) => ({
      type,
      name: row.name.trim(),
      amount: calculateFinanceEntryFeeAmount(row),
      currency: normalizeFinanceCatalogCurrency(row.currency) ?? normalizeFinanceCatalogCurrency(form.getFieldValue('currency')) ?? 'RMB',
      settlementMethod: row.settlementMethod || form.getFieldValue('settlementMethod'),
      paymentNo: row.paymentNo,
      agentName: type !== 'RECEIVABLE' ? (row.agentName || form.getFieldValue('agentName')) : undefined,
      chargeWeightKg: row.chargeWeightKg,
      unitPrice: row.unitPrice,
      receiptId: type === 'RECEIVABLE' ? row.receiptId : undefined,
      receiptMatchAmount: type === 'RECEIVABLE' ? row.receiptMatchAmount : undefined,
      remark: row.remark
    }))
    .filter((row) => row.name && row.amount > 0);

  const submit = async (submitForReview: boolean) => {
    const values = await form.validateFields();
    if (!selectedPackages.length) {
      Modal.warning({ title: '请选择仓库货物', content: '录单需要至少选择一条仓库货物。' });
      return;
    }
    const input: OrderEntryCreateInput = {
      shipment: {
        customerCode: values.customerCode,
          customerOrderNo: values.customerOrderNo || values.customerCode || selectedPackages[0].customerOrderNo,
          systemOrderNo: values.systemOrderNo,
          entryAt: values.entryAt,
        subOrderNo: values.subOrderNo,
        inboundNo: values.inboundNo,
        businessType: values.businessType ?? 'DEDICATED_LINE',
        packageType: values.packageType ?? 'WPX',
        destinationCountry: values.destinationCountry ?? selectedPackages[0].destinationCountry ?? '美国',
        receivingChannel: values.receivingChannel || values.channelName,
        declarationRequired: Boolean(values.declarationRequired),
        sensitive: Boolean(values.sensitive),
        cargoType: values.cargoType ?? '',
        productName: values.productName ?? '',
        settlementMethod: values.settlementMethod ?? '',
        tradeTerms: values.tradeTerms,
        fbaInboundNo: values.fbaInboundNo,
        receiverName: values.receiverName,
        receiverCompany: values.receiverCompany,
        receiverPhone: values.receiverPhone,
        receiverAddress: values.receiverAddress,
        receiverCountry: values.receiverCountry,
        receiverState: values.receiverState,
        receiverPostalCode: values.receiverPostalCode,
        fbaWarehouseCode: values.fbaWarehouseCode,
        remark: values.remark
      },
      warehousePackageIds: selectedPackages.map((pkg) => pkg.id),
      receivables: buildFeeRows(receivables, 'RECEIVABLE'),
      businessCosts: buildFeeRows(businessCosts, 'BUSINESS_COST'),
      payables: canViewPayables ? buildFeeRows(payables, 'PAYABLE') : [],
      submitForReview
    };
    setSubmitting(true);
    try {
      const detail = await apiClient.createOrderEntry(input);
      try {
        await maybeSaveReceiverContact(values);
      } catch (error) {
        message.warning(error instanceof Error ? `运单已创建，收货人保存失败：${error.message}` : '运单已创建，收货人保存失败');
      }
      Modal.success({
        title: submitForReview ? '录单已提交审核' : '录单草稿已保存',
        content: `已生成运单 ${detail.shipment.systemOrderNo}`
      });
      reset();
      await loadPackages();
      await onCreated?.();
    } catch (error) {
      Modal.error({ title: '录单失败', content: error instanceof Error ? error.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const packageColumns: ColumnsType<WarehousePackageSummary> = [
    {
      title: '客户单号-快递单号',
      width: 230,
      render: (_, record) => (
        <div className="finance-entry-package-cell">
          <Text strong>{record.combinedOrderNo || `${record.customerOrderNo}-${record.domesticTrackingNo}`}</Text>
          <Text type="secondary">箱序：{record.packageIndex ?? '-'} / {record.expectedTotalPackageCount ?? '-'}</Text>
        </div>
      )
    },
    { title: '系统单号', dataIndex: 'systemOrderNo', width: 150, render: (value?: string) => value || '-' },
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

  const renderFeeTable = (type: ShipmentFinanceItemType, title: string, rows: FinanceEntryFeeDraft[]) => {
    if (type === 'RECEIVABLE') {
      const columns: ColumnsType<FinanceEntryFeeDraft> = [
        { title: '业务员', width: 100, render: () => renderReadonlyCell(matchedSalesperson) },
        { title: '费用名称', width: 150, render: (_, row) => <Input value={row.name} onBlur={() => maybeSaveCatalogItem('FEE_NAME', row.name)} onChange={(event) => updateFee(type, row.id, { name: event.target.value })} /> },
        { title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
        { title: '运单号', width: 150, render: () => renderReadonlyCell(watchedSystemOrderNo, '待生成') },
        { title: '转单号', width: 130, render: () => renderReadonlyCell(undefined, '待回填') },
        { title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
        {
          title: '匹配水单编号',
          width: 260,
          render: (_, row) => (
            <Space size={6} wrap>
              {row.receiptNo ? <Tag color="blue">{row.receiptNo}</Tag> : <Text type="secondary">未匹配</Text>}
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
        { title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => confirmRemoveFee(type, row.id)}>删除</Button> }
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
      const columns: ColumnsType<FinanceEntryFeeDraft> = [
        ...(canViewPayables ? [{
          title: '代理',
          width: 150,
          render: (_: unknown, row: FinanceEntryFeeDraft) => <Select showSearch allowClear value={row.agentName || watchedAgentName} options={agentOptions} onChange={(value) => updateFee(type, row.id, { agentName: value })} />
        }] : []),
        { title: '费用名称', width: 150, render: (_, row) => <Input value={row.name} onBlur={() => maybeSaveCatalogItem('FEE_NAME', row.name)} onChange={(event) => updateFee(type, row.id, { name: event.target.value })} /> },
        { title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
        { title: '运单号', width: 150, render: () => renderReadonlyCell(watchedSystemOrderNo, '待生成') },
        { title: '转单号', width: 130, render: () => renderReadonlyCell(undefined, '待回填') },
        { title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
        { title: '计费重', width: 110, render: (_, row) => <InputNumber min={0} precision={2} value={row.chargeWeightKg} onChange={(value) => updateFee(type, row.id, { chargeWeightKg: value ?? undefined })} /> },
        { title: '单价', width: 120, render: (_, row) => <InputNumber min={0} precision={2} value={row.unitPrice} onChange={(value) => updateFee(type, row.id, { unitPrice: value ?? undefined })} /> },
        { title: '总金额', width: 120, align: 'right', render: (_, row) => <InputNumber readOnly precision={2} value={calculateFinanceEntryFeeAmount(row)} /> },
        { title: '合计', width: 120, align: 'right', render: (_, row) => <Text>{`RMB ${(calculateFinanceEntryFeeAmount(row) * currencyToRmb(getFeeCurrency(row, type))).toFixed(2)}`}</Text> },
        { title: '业务利润', width: 120, align: 'right', render: () => <Text>{(getFeeRmbTotal(receivables, 'RECEIVABLE') - getFeeRmbTotal(businessCosts, 'BUSINESS_COST')).toFixed(2)}</Text> },
        { title: '制单日期', width: 170, render: () => renderReadonlyCell(createdAtText) },
        { title: '制单人', width: 110, render: () => renderReadonlyCell(username) },
        { title: '备注', width: 180, render: (_, row) => <Input value={row.remark} onChange={(event) => updateFee(type, row.id, { remark: event.target.value })} /> },
        { title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => confirmRemoveFee(type, row.id)}>删除</Button> }
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
      {
        title: '代理',
        width: 150,
        render: (_: unknown, row: FinanceEntryFeeDraft) => <Select showSearch allowClear value={row.agentName || watchedAgentName} options={agentOptions} onChange={(value) => updateFee(type, row.id, { agentName: value })} />
      },
      { title: '费用名称', width: 150, render: (_, row) => <Input value={row.name} onBlur={() => maybeSaveCatalogItem('FEE_NAME', row.name)} onChange={(event) => updateFee(type, row.id, { name: event.target.value })} /> },
      { title: '客户编号', width: 110, render: () => renderReadonlyCell(watchedCustomerCode) },
      { title: '运单号', width: 150, render: () => renderReadonlyCell(watchedSystemOrderNo, '待生成') },
      { title: '转单号', width: 130, render: () => renderReadonlyCell(undefined, '待回填') },
      { title: '币种', width: 100, render: (_, row) => <Select value={getFeeCurrency(row, type)} options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} onChange={(value) => updateFee(type, row.id, { currency: value })} /> },
      { title: '计费重', width: 110, render: (_, row) => <InputNumber min={0} precision={2} value={row.chargeWeightKg} onChange={(value) => updateFee(type, row.id, { chargeWeightKg: value ?? undefined })} /> },
      { title: '代理成本单价', width: 125, render: (_, row) => <InputNumber min={0} precision={2} value={row.unitPrice} onChange={(value) => updateFee(type, row.id, { unitPrice: value ?? undefined })} /> },
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
      { title: '操作', width: 80, fixed: 'right', render: (_, row) => <Button danger disabled={rows.length <= 1} onClick={() => confirmRemoveFee(type, row.id)}>删除</Button> }
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
        <Col xs={24} xl={9} xxl={8}>
          <Card className="finance-entry-workbench-card" title="仓库货物" extra={<Button onClick={loadPackages} loading={packageLoading}>刷新</Button>}>
            <Table<WarehousePackageSummary>
              className="finance-embedded-table"
              rowKey="id"
              size="small"
              loading={packageLoading}
              dataSource={packages}
              columns={packageColumns}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: 980 }}
              rowSelection={{ selectedRowKeys: selectedPackageIds, onChange: handlePackageSelection }}
              onRow={(record) => ({
                onDoubleClick: () => {
                  Modal.info({
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
                      </div>
                    )
                  });
                }
              })}
            />
          </Card>
        </Col>
        <Col xs={24} xl={15} xxl={16}>
          <Card className="finance-entry-workbench-card finance-entry-form-card" title="运单基础信息">
            <div className="finance-entry-summary-grid">
              <div className="finance-entry-summary-card"><Text type="secondary">已选货物</Text><Text strong>{selectedPackages.length} 条</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">总件数</Text><Text strong>{totals.packageCount} 件</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">实重</Text><Text strong>{totals.weightKg.toFixed(2)} kg</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">方数</Text><Text strong>{totals.cbm.toFixed(6)} CBM</Text></div>
              <div className="finance-entry-summary-card"><Text type="secondary">计费重</Text><Text strong>{totals.chargeWeightKg.toFixed(2)} kg</Text></div>
            </div>
            <Form form={form} layout="vertical" initialValues={{ businessType: 'DEDICATED_LINE', packageType: 'WPX', currency: 'RMB', declarationRequired: false, sensitive: false, entryAt: entryAtDefault }}>
              <Row gutter={12}>
                <Col xs={24} md={8}><Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请输入客户编号' }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="customerName" label="客户名称"><Input readOnly /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="customerOrderNo" label="客户单号" rules={[{ required: true, message: '请输入客户单号' }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="systemOrderNo" label="运单号" rules={[{ required: true, message: '请输入运单号' }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="subOrderNo" label="分单号"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="inboundNo" label="入仓号"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="entryAt" label="运单录入日期"><Input type="datetime-local" readOnly={!canEditEntryAt} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item label="仓库入库匹配"><Input readOnly value={matchedWarehouseText} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item label="出库日期"><Input readOnly value="仓库出货后自动生成" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item label="应收审核日期"><Input readOnly value="提交审核后自动生成" /></Form.Item></Col>
                {role !== 'OPERATOR' ? <Col xs={24} md={8}><Form.Item label="业务成本审核日期"><Input readOnly value="提交审核后自动生成" /></Form.Item></Col> : null}
                {canViewPayables ? <Col xs={24} md={8}><Form.Item label="应付审核日期"><Input readOnly value="提交审核后自动生成" /></Form.Item></Col> : null}
                <Col xs={24} md={8}><Form.Item name="destinationCountry" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="businessType" label="业务类型"><Select options={Object.entries(businessTypeLabels).map(([value, label]) => ({ value, label }))} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="packageType" label="包裹类型"><Select options={[{ value: 'WPX', label: '包裹' }, { value: 'PAK', label: '袋装' }, { value: 'DOC', label: '文件' }]} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="cargoType" label="货物属性" rules={[{ required: true, message: '请选择货物属性' }]}><AutoComplete options={cargoTypeOptions} onBlur={() => maybeSaveCatalogItem('CARGO_TYPE', form.getFieldValue('cargoType'))} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="productName" label="品名" rules={[{ required: true, message: '请输入品名' }]}><AutoComplete options={productNameOptions} onBlur={() => maybeSaveCatalogItem('PRODUCT_NAME', form.getFieldValue('productName'))} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="declarationRequired" label="是否报关" rules={[{ required: true, message: '请选择是否报关' }]}><Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="sensitive" label="是否敏感"><Select options={[{ value: false, label: '否' }, { value: true, label: '是' }]} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="settlementMethod" label="结算方式" rules={[{ required: true, message: '请选择结算方式' }]}><Select showSearch options={settlementOptions} onChange={(value) => form.setFieldsValue({ currency: getSettlementMethodCurrency(settlementRows, value) ?? form.getFieldValue('currency') ?? 'RMB' })} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="currency" label="默认币种"><Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} /></Form.Item></Col>
                {canViewPayables ? (
                  <Col xs={24} md={8}>
                    <Form.Item name="agentName" label="代理渠道">
                      <Select
                        showSearch
                        allowClear
                        options={agentOptions}
	                        onChange={(value) => {
	                          setPayables((rows) => rows.map((row) => ({ ...row, agentName: row.agentName || value })));
	                          setBusinessCosts((rows) => rows.map((row) => ({ ...row, agentName: row.agentName || value })));
	                        }}
                      />
                    </Form.Item>
                  </Col>
                ) : null}
                <Col xs={24} md={8}><Form.Item name="receivingChannel" label="业务渠道"><Input onBlur={applyCurrentChargeWeightToFees} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="tradeTerms" label="贸易条款"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="fbaInboundNo" label="FBA 入仓号"><Input /></Form.Item></Col>
                <Col xs={24} md={16}><Form.Item name="remark" label="备注"><Input /></Form.Item></Col>
              </Row>
              <div className="finance-entry-form-subtitle">收货人信息</div>
              <Row gutter={12}>
                <Col xs={24} md={8}>
                  <Form.Item name="receiverContactId" label="选择收货人">
                    <Select
                      allowClear
                      disabled={!selectedCustomer}
                      placeholder={selectedCustomer ? '选择已有收货人' : '先输入客户编号'}
                      options={selectedCustomerContacts.map((contact) => ({
                        value: contact.id,
                        label: [contact.name, contact.company, contact.phone].filter(Boolean).join(' / ')
                      }))}
                      onChange={applyReceiverContact}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="saveReceiverToCustomer" valuePropName="checked" label="保存收货人">
                    <Checkbox disabled={!selectedCustomer || selectedCustomerContacts.length >= 4}>
                      保存到客户资料
                    </Checkbox>
                  </Form.Item>
                </Col>
                {selectedCustomer && selectedCustomerContacts.length >= 4 ? (
                  <Col xs={24} md={8}>
                    <Form.Item label="保存状态">
                      <Input readOnly value="该客户已有 4 组收货人" />
                    </Form.Item>
                  </Col>
                ) : null}
                <Col xs={24} md={8}><Form.Item name="receiverName" label="收货人名称"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="receiverCompany" label="收货人公司名称"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="receiverPhone" label="收货人电话"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="fbaWarehouseCode" label="FBA 仓库代码"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="receiverCountry" label="国家"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="receiverState" label="州/省"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="receiverPostalCode" label="邮编"><Input /></Form.Item></Col>
                <Col xs={24} md={16}><Form.Item name="receiverAddress" label="收货人地址"><Input /></Form.Item></Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
      <div className="finance-entry-fee-stack">
        {renderFeeTable('RECEIVABLE', '应收费用', receivables)}
        {renderFeeTable('BUSINESS_COST', '业务成本', businessCosts)}
        {canViewPayables ? renderFeeTable('PAYABLE', '应付费用', payables) : null}
      </div>
      <div className="finance-entry-actions">
        <Button onClick={reset} disabled={submitting}>清空</Button>
        <Button onClick={() => submit(false)} loading={submitting}>保存草稿</Button>
        <Button type="primary" onClick={() => submit(true)} loading={submitting}>提交审核</Button>
      </div>
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
