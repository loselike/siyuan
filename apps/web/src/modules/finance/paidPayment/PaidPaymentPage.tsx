import type { Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AutoComplete, Button, Card, Col, Descriptions, Form, Input, InputNumber, List, message, Modal, Popconfirm, Row, Select, Space, Tag, Tooltip, Typography } from 'antd';
import { Download, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import type { PaidPaymentListQuery, PaidPaymentListResponse, PaidPaymentSummary, PayerBankAccountSummary, PaymentVoucherSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey, RoleKey } from '../../../apiClient';
import { downloadCsv } from '../exportCsv';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { ProtectedVoucherImage } from '../ProtectedVoucherImage';
import { formatBeijingDate, formatBusinessDate } from '../../shared/format';
import { agentFieldLabels } from '../../shared/agentFieldLabels';
import { AppDatePicker, ManagedDualViewTable, ManagedMatrixCell, type ManagedTableColumns } from '../../shared/ui';
import { resolveShipmentOutboundOrderNo } from '../../shared/shipmentOrderNo';
import { getGlobalFieldMaskVisibility } from '../../shared/globalFieldMask';

const { Text } = Typography;
const PAID_PAYMENT_MATRIX_COLUMN_WIDTH = 280;

type PaidPaymentPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  role?: RoleKey | string;
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
  viewMode: 'waiting' | 'paid';
};

type ConfirmFormValues = {
  payerBankName: string;
  payerBankAccountName?: string;
  payerBankAccountNo: string;
  paidAt: string;
  paidRemark?: string;
  waterReceiptImage?: VoucherImageValue;
};

type SupplementFormValues = {
  paidRemark?: string;
  waterReceiptImage?: VoucherImageValue;
};

const statusByViewMode = {
  waiting: 'WAITING_PAYMENT',
  paid: 'PAID'
} as const satisfies Record<PaidPaymentPageProps['viewMode'], PaidPaymentListQuery['status']>;

function defaultQuery(viewMode: PaidPaymentPageProps['viewMode']): PaidPaymentListQuery {
  return { page: 1, pageSize: 10, status: statusByViewMode[viewMode], sortBy: 'date', sortOrder: 'desc' };
}

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

function formatAmount(amount?: number) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  return amount.toFixed(2);
}

function statusTag(status: PaidPaymentSummary['status']) {
  if (status === 'PAID') return <Tag color="success">已支付</Tag>;
  if (status === 'CANCELED') return <Tag color="default">已撤回</Tag>;
  return <Tag color="processing">待支付</Tag>;
}

function paymentGroupKey(row: PaidPaymentSummary) {
  return [
    row.payeeBankAccount?.accountName ?? row.agentName ?? '未指定收款方',
    row.currency,
    row.payeeBankAccount?.bankAccountNo ?? '未维护账号'
  ].join('|');
}

function formatBankInfo(row: PaidPaymentSummary) {
  if (!row.payeeBankAccount) return '未维护收款方银行信息';
  return `${row.payeeBankAccount.accountName} / ${row.payeeBankAccount.bankName} / ${row.payeeBankAccount.bankAccountNo}`;
}

function renderVoucherThumb(apiClient: ApiClient, vouchers: PaymentVoucherSummary[], alt: string, onPreview: (url: string) => void, action?: ReactNode) {
  const voucher = vouchers.find((item) => item.url) ?? vouchers[0];
  if (!voucher) return '-';
  return (
    <Space size={6} wrap={false} className="finance-paid-voucher-cell">
      {voucher.url ? (
        <Tooltip title="双击查看凭证">
          <ProtectedVoucherImage
            apiClient={apiClient}
            url={voucher.url}
            alt={alt}
            width={42}
            height={32}
            preview={false}
            className="finance-paid-voucher-thumb"
            onDoubleClick={() => voucher.url && onPreview(voucher.url)}
          />
        </Tooltip>
      ) : null}
      <Text className="table-compact-text" title={voucher.fileName}>{voucher.fileName}</Text>
      {vouchers.length > 1 ? <Tag color="blue">{vouchers.length} 张</Tag> : null}
      {action}
    </Space>
  );
}

export function PaidPaymentPage({ apiClient, permissions, role, renderShipmentOrderNoLink, viewMode }: PaidPaymentPageProps) {
  const [queryForm] = Form.useForm<PaidPaymentListQuery>();
  const [confirmForm] = Form.useForm<ConfirmFormValues>();
  const [supplementForm] = Form.useForm<SupplementFormValues>();
  const fixedStatus = statusByViewMode[viewMode];
  const pageLabel = viewMode === 'waiting' ? '待付款' : '已付款';
  const [query, setQuery] = useState<PaidPaymentListQuery>(() => defaultQuery(viewMode));
  const [response, setResponse] = useState<PaidPaymentListResponse>({
    rows: [],
    totals: { count: 0, waitingPaymentCount: 0, paidCount: 0, amountByCurrency: [] },
    pagination: { page: 1, pageSize: 10, totalItems: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedRow, setSelectedRow] = useState<PaidPaymentSummary>();
  const [supplementRow, setSupplementRow] = useState<PaidPaymentSummary>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [voucherManagerRow, setVoucherManagerRow] = useState<PaidPaymentSummary>();
  const [deletingVoucherId, setDeletingVoucherId] = useState<string>();
  const [confirmReceiptFile, setConfirmReceiptFile] = useState<File>();
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Key[]>([]);
  const [payerBankAccounts, setPayerBankAccounts] = useState<PayerBankAccountSummary[]>([]);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);

  const fieldVisibility = getGlobalFieldMaskVisibility(role, permissions);
  const canViewPayableCost = fieldVisibility.showPayableCost;
  const canViewPayableAgentData = fieldVisibility.showAgentData
    && fieldVisibility.showAgentShortName
    && fieldVisibility.showAgentCompanyName
    && fieldVisibility.showAgentChannel;
  const canViewPayableBankData = canViewPayableAgentData && fieldVisibility.showAgentShortName && canViewPayableCost;
  const canConfirm = canViewPayableBankData && fieldVisibility.showPayableStatus && hasPermission(permissions, 'finance:paid-payment:confirm');
  const canUpdate = fieldVisibility.showPayableStatus && hasPermission(permissions, 'finance:paid-payment:update');
  const canReverse = fieldVisibility.showPayableStatus && hasPermission(permissions, 'finance:paid-payment:reverse');
  const canExport = fieldVisibility.showPayableCost
    && fieldVisibility.showPayableStatus
    && hasPermission(permissions, 'finance:paid-payment:export');
  const canViewVoucher = hasPermission(permissions, 'finance:paid-payment:voucher-view');
  const canUploadVoucher = hasPermission(permissions, 'finance:paid-payment:voucher-upload');
  const canDeleteVoucher = canViewVoucher
    && canViewPayableAgentData
    && canViewPayableCost
    && fieldVisibility.showPayableStatus
    && hasPermission(permissions, 'finance:paid-payment:voucher-delete');
  const canViewBank = canViewPayableBankData && hasPermission(permissions, 'finance:paid-payment:bank-view');
  const canReadPayerBanks = canViewPayableBankData && hasPermission(permissions, 'master-data:payer-banks:read');

  const load = useCallback(async (nextQuery = query) => {
    setLoading(true);
    try {
      setResponse(await apiClient.paidPayments({ ...nextQuery, status: fixedStatus }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : `加载${pageLabel}失败`);
    } finally {
      setLoading(false);
    }
  }, [apiClient, fixedStatus, pageLabel, query]);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  useEffect(() => {
    const visibleIds = new Set(response.rows.map((row) => row.id));
    setSelectedPaymentIds((current) => current.filter((id) => visibleIds.has(String(id))));
  }, [response.rows]);

  useEffect(() => {
    if (!canDeleteVoucher) setVoucherManagerRow(undefined);
  }, [canDeleteVoucher]);

  useEffect(() => {
    if (!voucherManagerRow) return;
    const current = response.rows.find((row) => row.id === voucherManagerRow.id);
    if (!current || current.waterReceipts.length === 0) setVoucherManagerRow(undefined);
    else setVoucherManagerRow(current);
  }, [response.rows, voucherManagerRow?.id]);

  useEffect(() => {
    if (!selectedRow || !canReadPayerBanks) return;
    let active = true;
    void apiClient.payerBankAccounts()
      .then((result) => {
        if (active) setPayerBankAccounts(result.items);
      })
      .catch((error) => {
        if (active) {
          setPayerBankAccounts([]);
          message.warning(error instanceof Error ? error.message : '付款银行资料加载失败，可继续手动填写');
        }
      });
    return () => {
      active = false;
    };
  }, [apiClient, canReadPayerBanks, selectedRow]);

  const payerBankOptions = useMemo(() => payerBankAccounts.map((account) => ({
    key: account.id,
    value: account.id,
    searchText: `${account.bankName} ${account.accountName} ${account.accountNo}`,
    label: (
      <Space direction="vertical" size={0}>
        <Text strong>{account.bankName}</Text>
        <Text type="secondary">{account.accountName} · 尾号 {account.accountNo.slice(-4)}</Text>
      </Space>
    )
  })), [payerBankAccounts]);

  const selectedRows = useMemo(
    () => response.rows.filter((row) => selectedPaymentIds.includes(row.id)),
    [response.rows, selectedPaymentIds]
  );
  const selectedGroups = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      payeeName: string;
      currency: PaidPaymentSummary['currency'];
      bankAccountNo: string;
      bankName: string;
      amount: number;
      count: number;
    }>();
    selectedRows.forEach((row) => {
      const key = paymentGroupKey(row);
      const group = groups.get(key) ?? {
        key,
        payeeName: row.payeeBankAccount?.accountName ?? row.agentName ?? '未指定收款方',
        currency: row.currency,
        bankAccountNo: row.payeeBankAccount?.bankAccountNo ?? '未维护账号',
        bankName: row.payeeBankAccount?.bankName ?? '未维护开户行',
        amount: 0,
        count: 0
      };
      group.amount = Number((group.amount + row.totalAmount).toFixed(2));
      group.count += 1;
      groups.set(key, group);
    });
    return Array.from(groups.values());
  }, [selectedRows]);

  const openConfirm = (row: PaidPaymentSummary) => {
    if (!canConfirm) return;
    setSelectedRow(row);
    setConfirmReceiptFile(undefined);
    confirmForm.setFieldsValue({
      payerBankName: row.payerBankName,
      payerBankAccountName: row.payerBankAccountName,
      payerBankAccountNo: row.payerBankAccountNo,
      paidAt: row.paidAt ? formatBusinessDate(row.paidAt) : formatBeijingDate(new Date()),
      paidRemark: row.paidRemark ?? row.remark
    });
  };

  const submitConfirm = async () => {
    if (!selectedRow) return;
    const values = await confirmForm.validateFields();
    setConfirming(true);
    try {
      await apiClient.confirmPaymentApplicationPaid(selectedRow.id, {
        payerBankName: values.payerBankName,
        payerBankAccountName: values.payerBankAccountName,
        payerBankAccountNo: values.payerBankAccountNo,
        paidAt: values.paidAt,
        paidRemark: values.paidRemark
      });
      if (confirmReceiptFile && canUploadVoucher) {
        await apiClient.uploadVoucherImage({ file: confirmReceiptFile, context: 'PAID_PAYMENT_RECEIPT', paymentApplicationId: selectedRow.id });
      }
      message.success('支付已确认，可在已付款查看');
      setSelectedRow(undefined);
      setConfirmReceiptFile(undefined);
      confirmForm.resetFields();
      try {
        await load();
      } catch {
        message.warning('数据已提交成功，但页面刷新失败，请手动刷新');
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认支付失败');
    } finally {
      setConfirming(false);
    }
  };

  const reverse = async (row: PaidPaymentSummary) => {
    try {
      await apiClient.reversePaidPayment(row.id, { reason: '财务反核销' });
      message.success('已反核销，记录回到待付款');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '反核销失败');
    }
  };

  const exportRows = async () => {
    try {
      const ids = selectedPaymentIds.map(String);
      const result = await apiClient.exportPaidPayments({ query: { ...query, status: fixedStatus }, ...(ids.length ? { ids } : {}) });
      downloadCsv(viewMode === 'waiting' ? 'waiting-payments.csv' : 'paid-payments.csv', [
        { key: 'date', label: '日期' },
        ...(fieldVisibility.showAgentCompanyName ? [{ key: 'agentName', label: agentFieldLabels.detailedCompanyName }] : []),
        { key: 'salesperson', label: '业务员' },
        { key: 'customerCode', label: '客户编号' },
        { key: 'outboundOrderNo', label: '出货单号' },
        { key: 'feeName', label: '应付费用' },
        { key: 'currency', label: '币种' },
        ...(canViewPayableCost ? [{ key: 'totalAmount', label: '合计金额' }] : []),
        { key: 'remark', label: '备注' },
        ...(canViewBank ? [{ key: 'payerBankName', label: '付款方银行' }] : []),
        ...(fieldVisibility.showPayableStatus ? [{ key: 'paidAt', label: '付款日期' }, { key: 'paidBy', label: '付款人' }] : []),
        ...(fieldVisibility.showPayableStatus ? [{ key: 'status', label: '状态' }] : [])
      ], result.rows.map((row) => ({
        ...row,
        date: formatBusinessDate(row.date),
        paidAt: formatBusinessDate(row.paidAt)
      })) as unknown as Array<Record<string, unknown>>);
      message.success(`已导出 ${result.rows.length} 条${pageLabel}记录`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const openSupplement = (row: PaidPaymentSummary) => {
    if (!canUpdate && !canUploadVoucher) return;
    setSupplementRow(row);
    supplementForm.setFieldsValue({
      paidRemark: row.paidRemark ?? row.remark,
      waterReceiptImage: row.waterReceipts[0]
    });
  };

  const submitSupplement = async () => {
    if (!supplementRow) return;
    const values = await supplementForm.validateFields();
    try {
      if (canUpdate) {
        await apiClient.updatePaidPayment(supplementRow.id, {
          paidRemark: values.paidRemark
        });
      }
      message.success(canUpdate ? '付款补充信息已保存' : '付款凭证已补充');
      setSupplementRow(undefined);
      supplementForm.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存补充信息失败');
    }
  };

  const deleteWaterReceipt = useCallback(async (row: PaidPaymentSummary, voucher: PaymentVoucherSummary) => {
    if (!canDeleteVoucher) return;
    setDeletingVoucherId(voucher.id);
    try {
      await apiClient.deletePaymentWaterReceipt(voucher.id);
      const remaining = row.waterReceipts.filter((item) => item.id !== voucher.id);
      setVoucherManagerRow((current) => current?.id === row.id && remaining.length
        ? { ...current, waterReceipts: remaining }
        : undefined);
      message.success('付款水单已删除');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除付款水单失败');
    } finally {
      setDeletingVoucherId(undefined);
    }
  }, [apiClient, canDeleteVoucher, load]);

  const renderWaterReceiptCell = useCallback((row: PaidPaymentSummary) => {
    if (!row.waterReceipts.length) return '-';
    const voucher = row.waterReceipts.find((item) => item.url) ?? row.waterReceipts[0];
    if (!voucher) return '-';
    const action = canDeleteVoucher
      ? row.waterReceipts.length === 1
        ? (
          <Popconfirm
            title="确认删除这张付款水单？"
            description="删除后列表不再显示该凭证，操作记录仍会保留。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, loading: deletingVoucherId === voucher.id }}
            onConfirm={() => void deleteWaterReceipt(row, voucher)}
          >
            <Button type="link" danger size="small" loading={deletingVoucherId === voucher.id}>删除</Button>
          </Popconfirm>
        )
        : <Button type="link" size="small" onClick={() => setVoucherManagerRow(row)}>管理</Button>
      : undefined;
    return renderVoucherThumb(apiClient, row.waterReceipts, '付款水单', setPreviewUrl, action);
  }, [apiClient, canDeleteVoucher, deleteWaterReceipt, deletingVoucherId]);

  const columns = useMemo<ManagedTableColumns<PaidPaymentSummary>>(() => [
    { title: '日期', dataIndex: 'date', width: 155, render: (value?: string) => formatBusinessDate(value) },
    ...(canViewPayableAgentData ? [{ title: agentFieldLabels.detailedCompanyName, dataIndex: 'agentName', width: 190, render: (value?: string) => value ?? '-' }] : []),
    { title: '业务员', dataIndex: 'salesperson', width: 120, render: (value?: string) => value ?? '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 120, render: (value?: string) => value ?? '-' },
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 210, render: (_: string | undefined, row) => renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)) },
    { title: '应付费用', dataIndex: 'feeName', width: 180, render: (value?: string) => value ?? '-' },
    ...(fieldVisibility.showPayableStatus ? [{ title: '状态', dataIndex: 'status', width: 100, render: statusTag }] : []),
    { title: '币种', dataIndex: 'currency', width: 90, render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag> },
    ...(canViewPayableCost ? [{ title: '合计金额', dataIndex: 'totalAmount', width: 120, align: 'right' as const, render: (value: number) => formatAmount(value) }] : []),
    { title: '备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (value?: string) => value ?? '-' },
    ...(canViewVoucher ? [{
      title: '对账单凭证',
      dataIndex: 'billVouchers',
      width: 190,
      render: (_: unknown, row: PaidPaymentSummary) => renderVoucherThumb(apiClient, row.billVouchers, '对账单凭证', setPreviewUrl)
    }] : []),
    ...(canViewBank ? [{
      title: '收款方银行信息',
      dataIndex: 'payeeBankAccount',
      width: 300,
      render: (_: unknown, row: PaidPaymentSummary) => <Text className="table-compact-text" title={formatBankInfo(row)}>{formatBankInfo(row)}</Text>
    }] : []),
    ...(canViewBank ? [{ title: '付款方银行', dataIndex: 'payerBankName', width: 180, render: (value?: string) => value ?? '-' }] : []),
    ...(canViewPayableCost ? [{ title: '付款日期', dataIndex: 'paidAt', width: 155, render: (value?: string) => formatBusinessDate(value) }] : []),
    ...(canViewVoucher ? [{
      title: '水单',
      dataIndex: 'waterReceipts',
      width: canDeleteVoucher ? 220 : 180,
      render: (_: unknown, row: PaidPaymentSummary) => renderWaterReceiptCell(row)
    }] : []),
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 260,
      render: (_, row) => (
        <Space size={6}>
          {row.status === 'WAITING_PAYMENT' && canConfirm ? <Button size="small" type="primary" onClick={() => openConfirm(row)}>确认支付</Button> : null}
          {row.status === 'PAID' && canReverse ? (
            <Popconfirm title="确认反核销？" onConfirm={() => void reverse(row)}>
              <Button size="small">反核销</Button>
            </Popconfirm>
          ) : null}
          {row.status === 'PAID' && (canUpdate || canUploadVoucher) ? <Button size="small" onClick={() => openSupplement(row)}>补充</Button> : null}
        </Space>
      )
    }
  ], [apiClient, canConfirm, canDeleteVoucher, canReverse, canUpdate, canUploadVoucher, canViewBank, canViewPayableAgentData, canViewPayableCost, canViewVoucher, fieldVisibility.showPayableStatus, renderShipmentOrderNoLink, renderWaterReceiptCell]);
  const recordDetailColumns = useMemo<ManagedTableColumns<PaidPaymentSummary>>(() => [
    ...columns,
    {
      title: '订单明细',
      key: 'orderItems',
      recordDetail: {
        span: 3,
        value: (row) => row.items.length ? (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {row.items.map((item, index) => (
              <Card key={item.id} size="small" title={`订单 ${index + 1}`}>
                <Descriptions
                  size="small"
                  column={{ xs: 1, sm: 2, md: 5 }}
                  items={[
                    { key: 'systemOrderNo', label: '出货单号', children: resolveShipmentOutboundOrderNo(item) },
                    { key: 'customerCode', label: '客户编号', children: item.customerCode || '-' },
                    { key: 'feeName', label: '应付费用', children: item.feeName || '-' },
                    { key: 'currency', label: '币种', children: item.currency },
                    ...(canViewPayableCost ? [{ key: 'amount', label: '金额', children: formatAmount(item.amount) }] : [])
                  ]}
                />
              </Card>
            ))}
          </Space>
        ) : '-'
      },
      render: () => null
    }
  ], [columns]);
  const matrixColumns = useMemo<ManagedTableColumns<PaidPaymentSummary>>(() => [
    {
      key: 'matrixPayment',
      title: canViewPayableAgentData ? '付款与代理' : '付款信息',
      width: PAID_PAYMENT_MATRIX_COLUMN_WIDTH,
      className: 'managed-matrix-group-primary',
      render: (_value, row) => (
        <ManagedMatrixCell
          labelWidth={66}
          fields={[
            { key: 'date', label: '申请日期', value: formatBusinessDate(row.date) },
            canViewPayableAgentData ? { key: 'agentName', label: agentFieldLabels.detailedCompanyName, value: row.agentName || '-', title: row.agentName, wrap: true } : null,
            fieldVisibility.showPayableStatus ? { key: 'status', label: '状态', value: statusTag(row.status) } : null,
            canViewPayableCost ? { key: 'totalAmount', label: '合计金额', value: <Text strong>{row.currency} {formatAmount(row.totalAmount)}</Text> } : null
          ]}
        />
      )
    },
    {
      key: 'matrixOrder',
      title: '运单与费用',
      width: PAID_PAYMENT_MATRIX_COLUMN_WIDTH,
      render: (_value, row) => (
        <ManagedMatrixCell
          labelWidth={54}
          fields={[
            { key: 'systemOrderNo', label: '出货单号', value: renderShipmentOrderNoLink(resolveShipmentOutboundOrderNo(row)), title: resolveShipmentOutboundOrderNo(row) },
            { key: 'customerCode', label: '客户编号', value: row.customerCode || '-' },
            { key: 'salesperson', label: '业务员', value: row.salesperson || '-' },
            { key: 'feeName', label: '应付费用', value: row.feeName || '-', title: row.feeName, wrap: true },
            row.remark ? { key: 'remark', label: '备注', value: row.remark, title: row.remark, wrap: true } : null
          ]}
        />
      )
    },
    {
      key: 'matrixEvidence',
      title: canViewBank || canViewVoucher ? '凭证与银行' : '付款信息',
      width: PAID_PAYMENT_MATRIX_COLUMN_WIDTH,
      render: (_value, row) => (
        <ManagedMatrixCell
          labelWidth={66}
          fields={[
            canViewVoucher ? { key: 'billVouchers', label: '对账凭证', value: renderVoucherThumb(apiClient, row.billVouchers, '对账单凭证', setPreviewUrl) } : null,
            canViewBank ? { key: 'payeeBankAccount', label: '收款银行', value: formatBankInfo(row), title: formatBankInfo(row), wrap: true } : null,
            canViewBank ? { key: 'payerBankName', label: '付款方银行', value: row.payerBankName || '-', title: row.payerBankName } : null,
            canViewPayableCost ? { key: 'paidAt', label: '付款日期', value: formatBusinessDate(row.paidAt) } : null,
            canViewVoucher ? { key: 'waterReceipts', label: '水单', value: renderWaterReceiptCell(row) } : null
          ]}
        />
      )
    },
    { ...columns[columns.length - 1], key: 'action', width: PAID_PAYMENT_MATRIX_COLUMN_WIDTH, fixed: 'right' }
  ], [apiClient, canViewBank, canViewPayableAgentData, canViewPayableCost, canViewVoucher, columns, fieldVisibility.showPayableStatus, renderShipmentOrderNoLink, renderWaterReceiptCell]);

  if (!fieldVisibility.showPayableCost || !fieldVisibility.showPayableStatus) {
    return <Alert type="warning" showIcon message="当前账号无权查看该页面" />;
  }

  return (
    <Space direction="vertical" size={12} className="finance-workspace">
      <Card
        title={`深圳思远国际货运代理有限公司${pageLabel}单`}
        className="finance-filter-card finance-paid-filter-card"
        extra={(
          <Space size={8}>
            <Button icon={<RefreshCw size={15} />} onClick={() => void load()}>刷新</Button>
            {canExport ? <Button icon={<Download size={15} />} onClick={() => void exportRows()}>导出</Button> : null}
          </Space>
        )}
      >
        <Form
          form={queryForm}
          className="finance-paid-filter-form"
          layout="vertical"
          initialValues={defaultQuery(viewMode)}
          onFinish={(values) => setQuery({ ...defaultQuery(viewMode), ...values, status: fixedStatus, page: 1 })}
        >
          <Row gutter={[10, 10]} className="finance-filter-bar finance-audit-filter-grid finance-paid-filter-primary">
            {fieldVisibility.showAgentCompanyName ? <Col xs={24} md={8} xl={4}><Form.Item name="agent" label={agentFieldLabels.detailedCompanyName}><Input allowClear placeholder="输入代理名称" /></Form.Item></Col> : null}
            <Col xs={24} md={8} xl={4}><Form.Item name="salesperson" label="业务员"><Input allowClear placeholder="输入业务员" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="customerCode" label="客户编号"><Input allowClear placeholder="输入客户编号" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="systemOrderNo" label="出货单号"><Input allowClear placeholder="输入出货单号" /></Form.Item></Col>
            {canViewBank ? <Col xs={24} md={8} xl={4}><Form.Item name="payeeName" label="收款方名称"><Input allowClear placeholder="输入收款方名称" /></Form.Item></Col> : null}
            <Col xs={24} md={16} xl={4} className="finance-audit-filter-actions finance-paid-filter-actions">
              <Space size={8} wrap>
                <Button type="primary" htmlType="submit" icon={<Search size={15} />}>查询</Button>
                <Button onClick={() => { queryForm.resetFields(); setQuery(defaultQuery(viewMode)); }}>重置</Button>
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
            <Row gutter={[10, 10]} className="finance-audit-filter-grid finance-audit-filter-advanced finance-paid-filter-advanced">
              <Col xs={24} md={8} xl={4}><Form.Item name="feeName" label="应付费用"><Input allowClear placeholder="输入费用名称" /></Form.Item></Col>
              <Col xs={24} md={8} xl={4}><Form.Item name="currency" label="币种"><Select placeholder="全部币种" options={[{ label: '全部', value: 'ALL' }, { label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} /></Form.Item></Col>
              {canViewPayableCost ? <Col xs={24} md={8} xl={4}><Form.Item name="amount" label="合计金额"><InputNumber min={0} placeholder="输入金额" style={{ width: '100%' }} /></Form.Item></Col> : null}
              {canViewBank ? <Col xs={24} md={8} xl={4}><Form.Item name="bankAccountNo" label="收款方银行账号"><Input allowClear placeholder="输入收款账号" /></Form.Item></Col> : null}
              {canViewBank ? <Col xs={24} md={8} xl={4}><Form.Item name="payerBank" label="付款方银行信息"><Input allowClear placeholder="输入付款银行" /></Form.Item></Col> : null}
              <Col xs={24} md={8} xl={4}><Form.Item name="remark" label="备注"><Input allowClear placeholder="输入备注关键词" /></Form.Item></Col>
              <Col xs={24} md={8} xl={4}><Form.Item name="applicationDateFrom" label="申请付款日期起"><AppDatePicker /></Form.Item></Col>
              <Col xs={24} md={8} xl={4}><Form.Item name="applicationDateTo" label="申请付款日期止"><AppDatePicker /></Form.Item></Col>
              <Col xs={24} md={8} xl={4}><Form.Item name="paidDateFrom" label="付款日期起"><AppDatePicker /></Form.Item></Col>
              <Col xs={24} md={8} xl={4}><Form.Item name="paidDateTo" label="付款日期止"><AppDatePicker /></Form.Item></Col>
            </Row>
          ) : null}
        </Form>
      </Card>

      <Card className="finance-table-card">
        <div className="finance-paid-command-bar">
          <Space size={8} wrap className="finance-work-summary">
            <Text type="secondary">{pageLabel} {viewMode === 'waiting' ? response.totals.waitingPaymentCount : response.totals.paidCount}</Text>
            <Text type="secondary">已选 {selectedPaymentIds.length}</Text>
            {fieldVisibility.showPayableCost ? response.totals.amountByCurrency.map((item) => <Text key={item.currency} strong>{item.currency} {formatAmount(item.amount)}</Text>) : null}
          </Space>
          <Space size={8} wrap className="finance-paid-selected-groups">
            {selectedGroups.length ? selectedGroups.map((group) => (
              <Tag key={group.key} color="blue">
                {canViewBank ? `${group.payeeName} / ` : ''}{group.currency} / {group.count} 条{canViewBank ? ` / ${group.bankAccountNo} / ${group.bankName}` : ''}{canViewPayableCost ? ` / ${formatAmount(group.amount)}` : ''}
              </Tag>
            )) : <Text type="secondary">勾选后按收款方名称、币种、银行账号合并付款组</Text>}
          </Space>
        </div>
        <ManagedDualViewTable<PaidPaymentSummary>
          viewStorageKey={`sunny.finance.${viewMode}Payment.view-v1`}
          viewAriaLabel={`${pageLabel}表格视图`}
          defaultView="matrix"
          views={{
            matrix: {
              label: '矩阵视图',
              columns: matrixColumns,
              tableProps: {
                className: 'finance-work-table finance-paid-payment-matrix-table',
                minimumScrollX: 0,
                tableLayout: 'fixed',
                recordDetail: { title: (row) => `${pageLabel}详情 · ${row.applicationNo}`, columns: recordDetailColumns },
                columnSettings: { storageKey: `sunny.finance.${viewMode}Payment.matrix-columns-v1`, title: `${pageLabel}矩阵列设置`, lockedKeys: ['action'] }
              }
            },
            ledger: {
              label: '精密台账模式',
              columns,
              tableProps: {
                className: 'finance-work-table finance-paid-payment-ledger-table',
                minimumScrollX: 2380,
                recordDetail: { title: (row) => `${pageLabel}详情 · ${row.applicationNo}`, columns: recordDetailColumns },
                columnSettings: { storageKey: `sunny.finance.${viewMode}Payment.columns-v1`, title: `${pageLabel}列设置`, lockedKeys: ['systemOrderNo', 'action'] }
              }
            }
          }}
          rowKey="id"
          loading={loading}
          dataSource={response.rows}
          size="small"
          rowClassName={(row) => selectedPaymentIds.includes(row.id) ? 'finance-payment-row-selected' : ''}
          rowSelection={{
            selectedRowKeys: selectedPaymentIds,
            onChange: setSelectedPaymentIds,
            getCheckboxProps: (row) => ({
              disabled: row.status === 'CANCELED',
              'aria-label': `选择付款记录 ${row.applicationNo}`
            })
          }}
          pagination={{
            current: response.pagination.page,
            pageSize: response.pagination.pageSize,
            total: response.pagination.totalItems,
            showSizeChanger: true,
            onChange: (page, pageSize) => setQuery((current) => ({ ...current, status: fixedStatus, page, pageSize }))
          }}
          columnSettingsPlacement="toolbar"
        />
      </Card>

      <Modal
        title="确认支付"
        className="finance-modal"
        width={760}
        open={Boolean(selectedRow)}
        onCancel={() => setSelectedRow(undefined)}
        onOk={() => void submitConfirm()}
        confirmLoading={confirming}
        destroyOnHidden
      >
        <Form form={confirmForm} layout="vertical">
          <Form.Item label="付款方银行" name="payerBankName" rules={[{ required: true, message: '请输入付款方银行' }]}>
            <AutoComplete
              options={payerBankOptions}
              placeholder={canReadPayerBanks ? '请选择付款银行资料或手动输入' : '请输入付款方银行'}
              filterOption={(inputValue, option) => String(option?.searchText ?? '').toLowerCase().includes(inputValue.trim().toLowerCase())}
              onSelect={(_value, option) => {
                const account = payerBankAccounts.find((item) => item.id === option.key);
                if (!account) return;
                confirmForm.setFieldsValue({
                  payerBankName: account.bankName,
                  payerBankAccountName: account.accountName,
                  payerBankAccountNo: account.accountNo
                });
              }}
            />
          </Form.Item>
          <Form.Item label="付款方户名" name="payerBankAccountName"><Input /></Form.Item>
          <Form.Item label="付款方账号" name="payerBankAccountNo" rules={[{ required: true, message: '请输入付款方账号' }]}><Input /></Form.Item>
          <Form.Item label="付款日期" name="paidAt" rules={[{ required: true, message: '请选择付款日期' }]}><AppDatePicker /></Form.Item>
          <Form.Item label="付款备注" name="paidRemark"><Input.TextArea rows={2} /></Form.Item>
          {canUploadVoucher ? (
            <Form.Item label="付款水单截图" name="waterReceiptImage">
              <VoucherImageInput apiClient={apiClient} onFileChange={setConfirmReceiptFile} />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal title="凭证预览" className="finance-modal finance-preview-modal" width={760} open={Boolean(previewUrl)} footer={null} onCancel={() => setPreviewUrl(undefined)} destroyOnHidden>
        {previewUrl ? <ProtectedVoucherImage apiClient={apiClient} url={previewUrl} alt="付款凭证" style={{ maxWidth: '100%' }} /> : null}
      </Modal>

      <Modal
        title={`管理付款水单${voucherManagerRow ? ` · ${voucherManagerRow.applicationNo}` : ''}`}
        className="finance-modal"
        width={720}
        open={Boolean(voucherManagerRow)}
        footer={<Button onClick={() => setVoucherManagerRow(undefined)}>关闭</Button>}
        onCancel={() => setVoucherManagerRow(undefined)}
        destroyOnHidden
      >
        <List
          dataSource={voucherManagerRow?.waterReceipts ?? []}
          locale={{ emptyText: '暂无付款水单' }}
          renderItem={(voucher) => (
            <List.Item
              actions={[
                <Popconfirm
                  key={`delete-${voucher.id}`}
                  title="确认删除这张付款水单？"
                  description="删除后列表不再显示该凭证，操作记录仍会保留。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true, loading: deletingVoucherId === voucher.id }}
                  onConfirm={() => voucherManagerRow && void deleteWaterReceipt(voucherManagerRow, voucher)}
                >
                  <Button type="link" danger loading={deletingVoucherId === voucher.id}>删除</Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={voucher.url ? (
                  <ProtectedVoucherImage
                    apiClient={apiClient}
                    url={voucher.url}
                    alt="付款水单"
                    width={56}
                    height={42}
                    preview={false}
                    className="finance-paid-voucher-thumb"
                    onDoubleClick={() => voucher.url && setPreviewUrl(voucher.url)}
                  />
                ) : null}
                title={voucher.fileName}
                description={`${voucher.uploadedBy ?? '未知上传人'} · ${voucher.createdAt ? formatBusinessDate(voucher.createdAt) : '上传时间未知'}`}
              />
            </List.Item>
          )}
        />
      </Modal>

      <Modal title="补充付款信息" className="finance-modal" width={720} open={Boolean(supplementRow)} onCancel={() => setSupplementRow(undefined)} onOk={() => void submitSupplement()} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={supplementForm} layout="vertical">
          {canUpdate ? <Form.Item label="付款备注" name="paidRemark"><Input.TextArea rows={2} /></Form.Item> : null}
          {canUploadVoucher ? (
            <Form.Item label="付款水单截图" name="waterReceiptImage">
              <VoucherImageInput
                apiClient={apiClient}
                disabled={!supplementRow}
                uploadFile={(file) => apiClient.uploadVoucherImage({ file, context: 'PAID_PAYMENT_RECEIPT', paymentApplicationId: supplementRow?.id }) as Promise<VoucherImageValue>}
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </Space>
  );
}
