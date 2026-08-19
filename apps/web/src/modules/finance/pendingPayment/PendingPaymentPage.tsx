import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, App as AntdApp, Button, Card, Checkbox, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import { Download, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import type {
  PayeeBankAccountInput,
  PayeeBankAccountSummary,
  PendingPaymentListQuery,
  PendingPaymentListResponse,
  PendingPaymentSummary,
  PaymentApplicationCreateInput,
  PaymentVoucherInput
} from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../../apiClient';
import { downloadCsv } from '../exportCsv';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { formatBeijingDateTime } from '../../shared/format';
import { agentFieldLabels } from '../../shared/agentFieldLabels';
import { AppDatePicker, isAppDateRangeInvalid, ManagedDualViewTable, ManagedMatrixCell, ManagedMatrixDateTime, ManagedTable, renderAuthorizedAction, type ManagedTableColumns } from '../../shared/ui';
import { resolveShipmentOutboundOrderNo } from '../../shared/shipmentOrderNo';
import { getGlobalFieldMaskVisibility } from '../../shared/globalFieldMask';

const { Text } = Typography;
const bankAccountOrdinals = ['一', '二', '三'];

type PendingPaymentFormValues = PendingPaymentListQuery;

type PaymentApplicationFormValues = PaymentApplicationCreateInput & PayeeBankAccountInput & PaymentVoucherInput & {
  saveBank?: boolean;
  voucherImage?: VoucherImageValue;
};

type PendingPaymentPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role?: RoleKey | string;
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
  initialQuery?: PendingPaymentListQuery;
};

type PaymentApplicationGroup = {
  key: string;
  agentName: string;
  agentShortName: string;
  currency: 'RMB' | 'USD';
  bank?: PayeeBankAccountSummary;
  rows: PendingPaymentSummary[];
  amount: number;
};

const defaultPendingPaymentQuery: PendingPaymentListQuery = {
  page: 1,
  pageSize: 10,
  status: 'ALL',
  currency: 'ALL',
  sortBy: 'date',
  sortOrder: 'desc'
};

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

function formatMoney(amount?: number) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return amount.toFixed(2);
}

function groupPaymentApplications(rows: PendingPaymentSummary[]) {
  const groups = new Map<string, PaymentApplicationGroup>();
  rows.forEach((row) => {
    const bankIdentity = row.bankAccount
      ? `${row.bankAccount.id}|${row.bankAccount.accountName}|${row.bankAccount.bankName}|${row.bankAccount.bankAccountNo}`
      : '待选择银行';
    const key = `${row.agentName ?? '未指定代理'}|${bankIdentity}|${row.currency}`;
    const current = groups.get(key) ?? {
      key,
      agentName: row.agentName ?? '未指定代理',
      agentShortName: row.agentShortName ?? '-',
      currency: row.currency,
      bank: row.bankAccount,
      rows: [],
      amount: 0
    };
    current.rows.push(row);
    current.amount = Number((current.amount + row.amount).toFixed(2));
    groups.set(key, current);
  });
  return Array.from(groups.values());
}

function renderPaymentStatus(status: PendingPaymentSummary['status']) {
  const statusView = {
    APPLIED: { color: 'processing', label: '已进入待支付' },
    INVALIDATED: { color: 'default', label: '已失效' },
    READY: { color: 'success', label: '资料已完善' },
    PENDING: { color: 'warning', label: '待付款' },
    PAID: { color: 'success', label: '已支付' }
  } satisfies Record<PendingPaymentSummary['status'], { color: string; label: string }>;
  const view = statusView[status] ?? statusView.PENDING;
  return <Tag className="finance-payment-status-tag" color={view.color}>{view.label}</Tag>;
}

export function PendingPaymentPage({ apiClient, permissions, role, renderShipmentOrderNoLink, initialQuery }: PendingPaymentPageProps) {
  const { message } = AntdApp.useApp();
  const [queryForm] = Form.useForm<PendingPaymentFormValues>();
  const [applicationForm] = Form.useForm<PaymentApplicationFormValues>();
  const [response, setResponse] = useState<PendingPaymentListResponse>({ rows: [], totals: { count: 0, amountByCurrency: [] }, pagination: { page: 1, pageSize: 10, totalItems: 0 } });
  const [query, setQuery] = useState<PendingPaymentListQuery>(defaultPendingPaymentQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [applicationVoucherFile, setApplicationVoucherFile] = useState<File>();
  const [applicationSubmitting, setApplicationSubmitting] = useState(false);
  const applicationSubmittingRef = useRef(false);
  const [bankOptions, setBankOptions] = useState<PayeeBankAccountSummary[]>([]);
  const [bankOptionsLoading, setBankOptionsLoading] = useState(false);
  const [manualBankMode, setManualBankMode] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const canUsePayableAgentData = fieldVisibility.showAgentData
    && fieldVisibility.showAgentShortName
    && fieldVisibility.showAgentCompanyName
    && fieldVisibility.showAgentChannel;
  const canViewBankData = canUsePayableAgentData && fieldVisibility.showPayableCost;
  const canCreatePaymentApplication = canUsePayableAgentData && fieldVisibility.showPayableCost && hasPermission(permissions, 'finance:pending-payment:create');
  const canCancelPaymentApplication = fieldVisibility.showPayableStatus && hasPermission(permissions, 'finance:pending-payment:cancel');
  const canSelectBank = canViewBankData && hasPermission(permissions, 'finance:pending-payment:bank-select');
  const canMaintainBank = canViewBankData && hasPermission(permissions, 'finance:pending-payment:bank-manage');
  const canViewBank = canSelectBank || canMaintainBank;
  const canUploadAttachment = hasPermission(permissions, 'finance:pending-payment:bill-voucher-upload');
  const canExport = fieldVisibility.showPayableCost
    && fieldVisibility.showPayableStatus
    && hasPermission(permissions, 'finance:pending-payment:export');

  const loadRows = async (nextQuery = query) => {
    setLoading(true);
    try {
      const next = await apiClient.pendingPayments(nextQuery);
      setResponse(next);
      setSelectedIds((ids) => ids.filter((id) => next.rows.some((row) => row.id === id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialQuery) return;
    const next = { ...defaultPendingPaymentQuery, ...initialQuery };
    queryForm.setFieldsValue(next);
    setQuery(next);
    void loadRows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const selectedRows = useMemo(
    () => response.rows.filter((row) => selectedIds.includes(row.id)),
    [response.rows, selectedIds]
  );

  const groupedApplications = useMemo(() => groupPaymentApplications(selectedRows), [selectedRows]);
  const hasMultipleApplicationGroups = groupedApplications.length > 1;
  const selectedAmountByCurrency = useMemo(() => {
    const amountMap = new Map<string, number>();
    selectedRows.forEach((row) => {
      amountMap.set(row.currency, Number(((amountMap.get(row.currency) ?? 0) + row.amount).toFixed(2)));
    });
    return Array.from(amountMap.entries()).map(([currency, amount]) => ({ currency, amount }));
  }, [selectedRows]);

  const applyFilters = async () => {
    const values = queryForm.getFieldsValue();
    if (isAppDateRangeInvalid(values.applicationDateFrom, values.applicationDateTo)) {
      message.warning('结束日期不能早于开始日期');
      return;
    }
    const next: PendingPaymentListQuery = {
      ...query,
      ...values,
      page: 1
    };
    setQuery(next);
    await loadRows(next);
  };

  const resetFilters = async () => {
    queryForm.resetFields();
    const next: PendingPaymentListQuery = defaultPendingPaymentQuery;
    setQuery(next);
    await loadRows(next);
  };

  const openApplication = async (rows = selectedRows) => {
    if (!canCreatePaymentApplication || !canSelectBank) {
      message.warning('当前账号无权查看付款申请字段');
      return;
    }
    if (!rows.length) {
      message.warning('请先勾选待付款记录');
      return;
    }
    const groups = groupPaymentApplications(rows);
    if (groups.length > 1) {
      message.warning('当前选择跨收款方、银行账号或币种，请按同一付款组分开生成付款申请');
      return;
    }
    const rowIds = rows.map((row) => row.id);
    const first = rows[0];
    setSelectedIds(rowIds);
    setApplicationVoucherFile(undefined);
    setBankOptions([]);
    setManualBankMode(false);
    applicationForm.setFieldsValue({
      pendingPaymentIds: rowIds,
      agentName: first.agentName,
      currency: first.currency,
      bankAccountId: canSelectBank ? first.bankAccount?.id : undefined,
      accountName: first.bankAccount?.accountName,
      bankName: first.bankAccount?.bankName,
      bankAccountNo: first.bankAccount?.bankAccountNo,
      voucherImage: undefined,
      saveBank: true
    });
    setApplicationOpen(true);
    setBankOptionsLoading(true);
    try {
      const banks = canSelectBank && first.agentName ? await apiClient.payeeBankAccounts({ agentName: first.agentName, currency: first.currency }) : [];
      setBankOptions(banks);
      const selectedBank = banks.find((bank) => bank.id === first.bankAccount?.id) ?? first.bankAccount;
      if (selectedBank) {
        applicationForm.setFieldsValue({
          bankAccountId: selectedBank.id,
          accountName: selectedBank.accountName,
          bankName: selectedBank.bankName,
          bankAccountNo: selectedBank.bankAccountNo,
          currency: selectedBank.currency
        });
      } else if (!banks.length && canMaintainBank) {
        setManualBankMode(true);
        applicationForm.setFieldsValue({
          bankAccountId: undefined,
          accountName: undefined,
          bankName: undefined,
          bankAccountNo: undefined
        });
      }
    } catch (error) {
      setBankOptions([]);
      if (canMaintainBank) setManualBankMode(true);
      message.error(error instanceof Error ? error.message : '收款银行加载失败');
    } finally {
      setBankOptionsLoading(false);
    }
  };

  const selectBankAccount = (bankAccountId?: string) => {
    const bank = bankOptions.find((item) => item.id === bankAccountId);
    if (!bank) {
      setManualBankMode(canMaintainBank);
      applicationForm.setFieldsValue({
        bankAccountId: undefined,
        accountName: undefined,
        bankName: undefined,
        bankAccountNo: undefined
      });
      return;
    }
    setManualBankMode(false);
    applicationForm.setFieldsValue({
      bankAccountId: bank.id,
      accountName: bank.accountName,
      bankName: bank.bankName,
      bankAccountNo: bank.bankAccountNo,
      currency: bank.currency
    });
  };

  const startManualBankEntry = () => {
    if (!canMaintainBank) return;
    setManualBankMode(true);
    applicationForm.setFieldsValue({
      bankAccountId: undefined,
      accountName: undefined,
      bankName: undefined,
      bankAccountNo: undefined,
      saveBank: true
    });
  };

  const closeApplication = () => {
    if (applicationSubmittingRef.current) return;
    setApplicationOpen(false);
    setBankOptions([]);
    setManualBankMode(false);
    applicationForm.resetFields();
    setApplicationVoucherFile(undefined);
  };

  const submitApplication = async () => {
    if (applicationSubmittingRef.current) return;
    applicationSubmittingRef.current = true;
    setApplicationSubmitting(true);
    try {
      const values = await applicationForm.validateFields();
      if (hasMultipleApplicationGroups) {
        message.warning('当前选择跨收款方、银行账号或币种，请分开提交');
        return;
      }
      const useManual = canMaintainBank && !values.bankAccountId && values.accountName && values.bankName && values.bankAccountNo;
      const useExistingBank = !values.bankAccountId
        && !useManual
        && selectedRows.every((row) => Boolean(row.bankAccount?.id));
      if (!values.bankAccountId && !useManual && !useExistingBank) {
        message.warning('请补齐收款银行信息');
        return;
      }
      if (!applicationVoucherFile || !values.voucherImage?.fileName) {
        message.warning('请上传供应商账单截图');
        return;
      }
      await apiClient.createPaymentApplications({
        pendingPaymentIds: selectedIds,
        bankAccountId: values.bankAccountId,
        remark: values.remark,
        manualBankAccount: useManual ? {
          agentName: values.agentName ?? selectedRows[0]?.agentName ?? '未指定代理',
          accountName: values.accountName,
          bankName: values.bankName,
          bankAccountNo: values.bankAccountNo,
          currency: values.currency ?? selectedRows[0]?.currency ?? 'RMB',
          remark: values.remark
        } : undefined,
        saveManualBankAccount: useManual ? values.saveBank !== false : undefined,
        voucher: values.voucherImage?.fileName ? values.voucherImage : undefined
      }, applicationVoucherFile);
      message.success('付款申请已提交');
      setApplicationOpen(false);
      applicationForm.resetFields();
      setApplicationVoucherFile(undefined);
      setSelectedIds([]);
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '付款申请提交失败');
    } finally {
      applicationSubmittingRef.current = false;
      setApplicationSubmitting(false);
    }
  };

  const cancelApplication = async (row: PendingPaymentSummary) => {
    if (!row.paymentApplicationId) {
      message.warning('该记录缺少付款申请关联，无法撤回');
      return;
    }
    try {
      await apiClient.cancelPaymentApplication(row.paymentApplicationId, { reason: '财务撤回付款申请' });
      message.success('付款申请已撤回');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '付款申请撤回失败');
    } finally {
      await loadRows();
    }
  };

  const exportRows = async () => {
    const exported = await apiClient.exportPaymentApplications({ ids: selectedIds.length ? selectedIds : undefined, query });
    downloadCsv('pending-payments.csv', [
      { key: 'date', label: '日期' },
      ...(fieldVisibility.showAgentShortName ? [{ key: 'agentShortName', label: agentFieldLabels.shortName }] : []),
      { key: 'salesperson', label: '业务员' },
      { key: 'customerCode', label: '客户编号' },
      { key: 'outboundOrderNo', label: '出货单号' },
      { key: 'feeName', label: '应付费用' },
      { key: 'currency', label: '币种' },
      ...(fieldVisibility.showPayableCost ? [{ key: 'amount', label: '合计金额' }] : []),
      { key: 'remark', label: '备注' },
      ...(fieldVisibility.showPayableStatus ? [{ key: 'status', label: '状态' }] : []),
      { key: 'paymentApplicationNo', label: '付款申请编号' }
    ], exported.rows.map((row) => ({ ...row, date: row.date ? formatBeijingDateTime(row.date) : '-' })) as unknown as Array<Record<string, unknown>>);
    message.success(`付款申请导出已生成：${exported.rows.length} 条`);
  };

  const columns: ManagedTableColumns<PendingPaymentSummary> = [
    { title: '日期', dataIndex: 'date', width: 170, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
    ...(fieldVisibility.showAgentShortName ? [{ title: agentFieldLabels.shortName, dataIndex: 'agentShortName', width: 130, render: (value?: string) => value ?? '-' }] : []),
    { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value ?? '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 110 },
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 190, render: (_: string | undefined, row) => renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)) },
    { title: '应付费用', dataIndex: 'feeName', width: 140 },
    { title: '币种', dataIndex: 'currency', width: 90 },
    ...(fieldVisibility.showPayableCost ? [{ title: '合计金额', dataIndex: 'amount', width: 130, align: 'right' as const, sorter: true, render: (value: number) => <Text strong className="finance-payment-amount">{formatMoney(value)}</Text> }] : []),
    { title: '备注', dataIndex: 'remark', width: 160, ellipsis: true, render: (value?: string) => value ?? '-' },
    ...(canViewBank ? [{ title: '收款方银行信息', dataIndex: 'bankAccount', width: 260, render: (value?: PayeeBankAccountSummary) => value ? `${value.accountName} / ${value.bankName} / ${value.bankAccountNo}` : '待选择' }] : []),
    ...(fieldVisibility.showPayableStatus ? [{ title: '状态', dataIndex: 'status', width: 120, render: renderPaymentStatus }] : []),
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 140,
      render: (_, row) => {
        if (row.status === 'APPLIED' && row.paymentApplicationId && canCancelPaymentApplication) {
          return (
            <Popconfirm title="确认撤回该付款申请？" onConfirm={() => void cancelApplication(row)}>
              <Button size="small">撤回</Button>
            </Popconfirm>
          );
        }
        if ((row.status === 'PENDING' || row.status === 'READY') && canCreatePaymentApplication) {
          return <Button size="small" type="link" onClick={() => void openApplication([row])}>发起付款</Button>;
        }
        return '-';
      }
    }
  ];

  const matrixColumns: ManagedTableColumns<PendingPaymentSummary> = [
    {
      key: 'matrixInformation',
      title: '信息',
      width: 960,
      className: 'managed-matrix-group-primary',
      render: (_value, row) => (
        <ManagedMatrixCell
          columns={4}
          labelWidth={66}
          fields={[
            { key: 'date', label: '日期', value: <ManagedMatrixDateTime value={row.date ? formatBeijingDateTime(row.date) : undefined} /> },
            { key: 'customerCode', label: '客户编号', value: row.customerCode || '-' },
            { key: 'salesperson', label: '业务员', value: row.salesperson || '-' },
            { key: 'systemOrderNo', label: '出货单号', value: renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)), title: resolveShipmentOutboundOrderNo(row) },
            fieldVisibility.showAgentShortName ? { key: 'agentShortName', label: agentFieldLabels.shortName, value: row.agentShortName || '-' } : null,
            { key: 'feeName', label: '应付费用', value: row.feeName || '-', title: row.feeName, wrap: true },
            row.remark ? { key: 'remark', label: '备注', value: row.remark, title: row.remark, wrap: true } : null,
            fieldVisibility.showPayableCost ? { key: 'amount', label: '合计金额', value: <Text strong className="finance-payment-amount">{row.currency} {formatMoney(row.amount)}</Text> } : null,
            canViewBank ? { key: 'bankAccount', label: '收款银行', value: row.bankAccount ? `${row.bankAccount.accountName} / ${row.bankAccount.bankName} / ${row.bankAccount.bankAccountNo}` : '待选择', title: row.bankAccount?.bankAccountNo, wrap: true } : null,
            fieldVisibility.showPayableStatus ? { key: 'status', label: '状态', value: renderPaymentStatus(row.status) } : null
          ]}
        />
      )
    },
    { ...columns[columns.length - 1], key: 'action', width: 110, fixed: 'right' }
  ];

  if (!fieldVisibility.showPayableCost || !fieldVisibility.showPayableStatus) {
    return <Alert type="warning" showIcon message="当前账号无权查看该页面" />;
  }

  return (
    <Card
      title="深圳思远国际货运代理有限公司付款申请单"
      className="finance-work-card"
      extra={(
        <Space>
          <Button icon={<RefreshCw size={15} />} onClick={() => void loadRows()}>刷新</Button>
          {renderAuthorizedAction(canExport, <Button icon={<Download size={15} />} onClick={() => void exportRows()}>导出</Button>)}
        </Space>
      )}
    >
      <Form
        form={queryForm}
        layout="vertical"
        className="finance-pending-filter-form"
        initialValues={defaultPendingPaymentQuery}
        onFinish={() => void applyFilters()}
      >
        <Row gutter={[10, 10]} className="finance-filter-bar finance-audit-filter-grid finance-pending-filter-primary" role="group" aria-label="待付款筛选条件">
          {fieldVisibility.showAgentShortName ? <Col xs={24} md={8} xl={4}><Form.Item name="agent" label={agentFieldLabels.shortName}><Input allowClear placeholder="输入代理简称" /></Form.Item></Col> : null}
          <Col xs={24} md={8} xl={4}><Form.Item name="salesperson" label="业务员"><Input allowClear placeholder="输入业务员" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="customerCode" label="客户编号"><Input allowClear placeholder="输入客户编号" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="systemOrderNo" label="出货单号"><Input allowClear placeholder="输入出货单号" /></Form.Item></Col>
          {fieldVisibility.showPayableStatus ? <Col xs={24} md={8} xl={4}><Form.Item name="status" label="状态"><Select placeholder="全部状态" options={[{ label: '全部', value: 'ALL' }, { label: '待付款', value: 'PENDING' }, { label: '资料已完善', value: 'READY' }, { label: '已进入待支付', value: 'APPLIED' }, { label: '已失效', value: 'INVALIDATED' }]} /></Form.Item></Col> : null}
          <Col xs={24} md={16} xl={4} className="finance-audit-filter-actions finance-pending-filter-actions">
            <Space size={8} wrap>
              <Button type="primary" htmlType="submit" icon={<Search size={15} />}>查询</Button>
              <Button onClick={() => void resetFilters()}>重置</Button>
              <Button
                icon={<SlidersHorizontal size={15} />}
                aria-expanded={advancedFiltersOpen}
                onClick={() => setAdvancedFiltersOpen((current) => !current)}
              >
                {advancedFiltersOpen ? '收起筛选' : '更多筛选'}
              </Button>
            </Space>
          </Col>
        </Row>
        {advancedFiltersOpen ? (
          <Row gutter={[10, 10]} className="finance-audit-filter-grid finance-audit-filter-advanced finance-pending-filter-advanced">
            <Col xs={24} md={8} xl={4}><Form.Item name="feeName" label="应付费用"><Input allowClear placeholder="输入费用名称" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="currency" label="币种"><Select placeholder="全部币种" options={[{ label: '全部', value: 'ALL' }, { label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} /></Form.Item></Col>
            {fieldVisibility.showPayableCost ? <Col xs={24} md={8} xl={4}><Form.Item name="amount" label="合计金额"><InputNumber className="full-width" min={0} placeholder="输入金额" /></Form.Item></Col> : null}
            <Col xs={24} md={8} xl={4}><Form.Item name="payeeName" label="收款方名称"><Input allowClear placeholder="输入收款方名称" /></Form.Item></Col>
            {canViewBank ? <Col xs={24} md={8} xl={4}><Form.Item name="bankAccountNo" label="收款方银行账号"><Input allowClear placeholder="输入收款账号" /></Form.Item></Col> : null}
            <Col xs={24} md={8} xl={4}><Form.Item name="remark" label="备注"><Input allowClear placeholder="输入备注关键词" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="applicationDateFrom" label="申请付款日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="applicationDateTo" label="申请付款日期止"><AppDatePicker /></Form.Item></Col>
          </Row>
        ) : null}
      </Form>

      <div className="finance-payment-command-bar">
        <Space wrap className="finance-payment-command-primary">
          {canCreatePaymentApplication ? (
            <Button type="primary" disabled={!selectedRows.length} onClick={() => void openApplication()}>
              批量发起付款
            </Button>
          ) : null}
          {canCreatePaymentApplication ? <Text type="secondary">已选 {selectedRows.length} 条</Text> : null}
          {canCreatePaymentApplication && hasMultipleApplicationGroups ? <Text type="warning">当前包含多个付款组，请分组提交</Text> : null}
        </Space>
        <Space wrap className="finance-payment-command-summary">
          {fieldVisibility.showPayableCost ? selectedAmountByCurrency.map((item) => <Tag color="blue" key={`selected-${item.currency}`}>已选 {item.currency}：{formatMoney(item.amount)}</Tag>) : null}
        </Space>
      </div>

      <ManagedDualViewTable<PendingPaymentSummary>
        viewStorageKey="sunny.finance.pendingPayment.view-v1"
        viewAriaLabel="待付款表格视图"
        defaultView="matrix"
        views={{
          matrix: {
            label: '矩阵视图',
            columns: matrixColumns,
            tableProps: {
              className: 'finance-work-table finance-pending-payment-matrix-table',
              minimumScrollX: 0,
              tableLayout: 'fixed',
              showHeader: false,
              recordDetail: { title: '待付款详情', columns },
              columnSettings: { storageKey: 'sunny.finance.pendingPayment.matrix-columns-v2', title: '待付款矩阵列设置', lockedKeys: ['action'] }
            }
          },
          ledger: {
            label: '精密台账模式',
            columns,
            tableProps: {
              className: 'finance-work-table finance-pending-payment-ledger-table',
              minimumScrollX: 1500,
              recordDetail: { title: '待付款详情' },
              columnSettings: { storageKey: 'sunny.finance.pendingPayment.columns-v1', title: '待付款列设置', lockedKeys: ['systemOrderNo', 'action'] }
            }
          }
        }}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ current: response.pagination.page, pageSize: response.pagination.pageSize, total: response.pagination.totalItems, showSizeChanger: true }}
        rowSelection={canCreatePaymentApplication ? { selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (row) => ({ disabled: row.status === 'APPLIED' || row.status === 'INVALIDATED' || row.status === 'PAID' }) } : undefined}
        rowClassName={(row) => selectedIds.includes(row.id) ? 'finance-payment-row-selected' : ''}
        dataSource={response.rows}
        onChange={(pagination, _, sorter) => {
          const sort = Array.isArray(sorter) ? sorter[0] : sorter;
          const next: PendingPaymentListQuery = {
            ...query,
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? 10,
            sortBy: typeof sort?.field === 'string' ? sort.field as PendingPaymentListQuery['sortBy'] : query.sortBy,
            sortOrder: sort?.order === 'ascend' ? 'asc' : sort?.order === 'descend' ? 'desc' : query.sortOrder
          };
          setQuery(next);
          void loadRows(next);
        }}
        columnSettingsPlacement="toolbar"
      />

      <Modal
        title={(
          <div className="finance-payment-application-title">
            <span>生成付款申请</span>
            <Text type="secondary">确认付款对象、收款账户和账单凭证后提交</Text>
          </div>
        )}
        className="finance-modal finance-payment-application-modal"
        open={applicationOpen}
        onCancel={closeApplication}
        onOk={submitApplication}
        confirmLoading={applicationSubmitting}
        cancelButtonProps={{ disabled: applicationSubmitting }}
        closable={!applicationSubmitting}
        maskClosable={!applicationSubmitting}
        okText="提交付款申请"
        cancelText="取消"
        width={980}
        footer={(
          <Flex className="finance-payment-application-footer" align="center" justify="space-between" gap={12}>
            <Text>
              已选 <Text strong>{selectedRows.length}</Text> 项
              {fieldVisibility.showPayableCost ? selectedAmountByCurrency.map((item) => (
                <Text key={`modal-total-${item.currency}`}>
                  {' '}· {item.currency} <Text strong className="finance-payment-application-footer-amount">{formatMoney(item.amount)}</Text>
                </Text>
              )) : null}
            </Text>
            <Space>
              <Button disabled={applicationSubmitting} onClick={closeApplication}>取消</Button>
              <Button type="primary" loading={applicationSubmitting} onClick={() => void submitApplication()}>提交付款申请</Button>
            </Space>
          </Flex>
        )}
      >
        <Space direction="vertical" className="full-width" size={12}>
          {hasMultipleApplicationGroups ? <Alert type="warning" showIcon message="当前包含多个付款组，请关闭后按同一收款方、银行账号和币种分开提交。" /> : null}
          {canViewBankData ? <section className="finance-payment-modal-section">
            <div className="finance-payment-section-title">付款摘要</div>
            <ManagedTable
              className="finance-work-table finance-embedded-table finance-payment-group-table"
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={groupedApplications}
              columns={[
                ...(fieldVisibility.showAgentShortName ? [{ title: agentFieldLabels.shortName, dataIndex: 'agentShortName' }] : []),
                { title: '币种', dataIndex: 'currency', width: 90 },
                { title: '明细数', dataIndex: 'rows', width: 90, render: (value: PendingPaymentSummary[]) => value.length },
                ...(fieldVisibility.showPayableCost ? [{ title: '合计金额', dataIndex: 'amount', width: 160, align: 'right' as const, render: (value: number) => <Text strong className="finance-payment-application-summary-amount">{formatMoney(value)}</Text> }] : [])
              ]}
            />
          </section> : null}
          <Form form={applicationForm} layout="vertical">
            {canViewBank ? <section className="finance-payment-modal-section">
              <div className="finance-payment-section-heading">
                <div>
                  <div className="finance-payment-section-title">收款银行信息</div>
                  <Text type="secondary">从代理资料中选择已保存的收款银行，也可新增填写</Text>
                </div>
                <Tag color="blue">代理资料</Tag>
              </div>
              <Row gutter={12} align="bottom">
                <Col xs={24} md={20}>
                  <Form.Item name="bankAccountId" label="选择收款银行">
                    <Select
                      allowClear
                      showSearch
                      loading={bankOptionsLoading}
                      placeholder={bankOptionsLoading ? '正在加载收款银行' : '请选择代理资料中的收款银行'}
                      disabled={!canSelectBank}
                      filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.trim().toLowerCase())}
                      onChange={(value) => selectBankAccount(value)}
                      options={bankOptions.map((item, index) => ({
                        value: item.id,
                        label: `收款银行账户${bankAccountOrdinals[index] ?? index + 1} · ${item.bankName} · ${item.accountName} · ${item.bankAccountNo}`
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  {canMaintainBank ? <Button className="full-width" onClick={startManualBankEntry}>新增填写</Button> : null}
                </Col>
              </Row>
              <div className="finance-payment-bank-divider"><span>银行资料</span></div>
              <Row gutter={12}>
                <Col xs={24} md={8}><Form.Item name="accountName" label="账户名称"><Input aria-label="账户名称" readOnly={!manualBankMode} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="bankName" label="开户行"><Input aria-label="开户行" readOnly={!manualBankMode} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="bankAccountNo" label="银行账号"><Input aria-label="银行账号" readOnly={!manualBankMode} /></Form.Item></Col>
                <Col xs={24}>
                  <Form.Item name="currency" hidden><Input /></Form.Item>
                  {manualBankMode ? (
                    <Form.Item name="saveBank" valuePropName="checked" className="finance-payment-bank-save">
                      <Checkbox disabled={!canMaintainBank}>保存到代理资料的收款银行账户，下次可直接选择</Checkbox>
                    </Form.Item>
                  ) : null}
                  {manualBankMode ? <Text type="secondary" className="finance-payment-bank-save-location">保存位置：基础资料库 &gt; 代理资料；已有三个账户时不会覆盖原账户</Text> : null}
                </Col>
              </Row>
            </section> : null}
            <Row gutter={12} className="finance-payment-support-row">
              {canUploadAttachment ? <Col xs={24} md={12}>
                <section className="finance-payment-modal-section finance-payment-support-section">
                  <div className="finance-payment-section-title">供应商账单截图</div>
                  <Form.Item name="voucherImage">
                    <VoucherImageInput
                      apiClient={apiClient}
                      onFileChange={setApplicationVoucherFile}
                    />
                  </Form.Item>
                </section>
              </Col> : null}
              <Col xs={24} md={canUploadAttachment ? 12 : 24}>
                <section className="finance-payment-modal-section finance-payment-support-section">
                  <div className="finance-payment-section-title">备注</div>
                  <Form.Item name="remark"><Input.TextArea rows={3} placeholder="填写付款说明（选填）" /></Form.Item>
                </section>
              </Col>
            </Row>
          </Form>
        </Space>
      </Modal>
    </Card>
  );
}
