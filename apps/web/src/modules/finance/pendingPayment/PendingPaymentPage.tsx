import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, App as AntdApp, Button, Card, Checkbox, Col, Flex, Form, Image, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { RefreshCw } from 'lucide-react';
import type {
  PayeeBankAccountInput,
  PayeeBankAccountSummary,
  PendingPaymentListQuery,
  PendingPaymentListResponse,
  PendingPaymentSummary,
  PaymentApplicationCreateInput,
  PaymentVoucherInput
} from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { downloadCsv } from '../exportCsv';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { ManagedTable } from '../../shared/ui';

const { Text } = Typography;

type PendingPaymentFormValues = PendingPaymentListQuery;

type PaymentApplicationFormValues = PaymentApplicationCreateInput & PayeeBankAccountInput & PaymentVoucherInput & {
  saveBank?: boolean;
  voucherImage?: VoucherImageValue;
};

type PaymentVoucherFormValues = PaymentVoucherInput & {
  voucherImage?: VoucherImageValue;
};

type PendingPaymentPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
  initialQuery?: PendingPaymentListQuery;
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

function formatMoney(amount?: number, currency = 'RMB') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  if (currency === 'RMB' || currency === 'CNY') return formatCurrency(amount);
  return `${currency} ${amount.toFixed(2)}`;
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

export function PendingPaymentPage({ apiClient, permissions, renderShipmentOrderNoLink, initialQuery }: PendingPaymentPageProps) {
  const { message } = AntdApp.useApp();
  const [queryForm] = Form.useForm<PendingPaymentFormValues>();
  const [applicationForm] = Form.useForm<PaymentApplicationFormValues>();
  const [voucherForm] = Form.useForm<PaymentVoucherFormValues>();
  const [response, setResponse] = useState<PendingPaymentListResponse>({ rows: [], totals: { count: 0, amountByCurrency: [] }, pagination: { page: 1, pageSize: 10, totalItems: 0 } });
  const [query, setQuery] = useState<PendingPaymentListQuery>(defaultPendingPaymentQuery);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [voucherTarget, setVoucherTarget] = useState<PendingPaymentSummary | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PendingPaymentSummary | null>(null);
  const [bankOptions, setBankOptions] = useState<PayeeBankAccountSummary[]>([]);
  const canMaintainPayment = hasPermission(permissions, 'finance:payable:payment');
  const canMaintainBank = hasPermission(permissions, 'finance:payable:bank');
  const canUploadAttachment = hasPermission(permissions, 'finance:payable:attachment');
  const canExport = hasPermission(permissions, 'finance:payable:export');

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

  const groupedApplications = useMemo(() => {
    const groups = new Map<string, { key: string; agentName: string; currency: 'RMB' | 'USD'; bank?: PayeeBankAccountSummary; rows: PendingPaymentSummary[]; amount: number }>();
    selectedRows.forEach((row) => {
      const key = `${row.agentName ?? '未指定代理'}|${row.bankAccount?.bankAccountNo ?? '待选择银行'}|${row.currency}`;
      const current = groups.get(key) ?? { key, agentName: row.agentName ?? '未指定代理', currency: row.currency, bank: row.bankAccount, rows: [], amount: 0 };
      current.rows.push(row);
      current.amount = Number((current.amount + row.amount).toFixed(2));
      groups.set(key, current);
    });
    return Array.from(groups.values());
  }, [selectedRows]);
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

  const openApplication = async () => {
    if (!selectedRows.length) {
      message.warning('请先勾选待付款记录');
      return;
    }
    if (hasMultipleApplicationGroups) {
      message.warning('当前选择跨代理、银行或币种，请按同一付款组分开生成待支付申请');
      return;
    }
    const first = selectedRows[0];
    applicationForm.setFieldsValue({
      pendingPaymentIds: selectedIds,
      agentName: first.agentName,
      currency: first.currency,
      bankAccountId: first.bankAccount?.id,
      accountName: first.bankAccount?.accountName,
      bankName: first.bankAccount?.bankName,
      bankAccountNo: first.bankAccount?.bankAccountNo,
      voucherImage: first.vouchers[0],
      saveBank: true
    });
    setApplicationOpen(true);
    try {
      const banks = first.agentName ? await apiClient.payeeBankAccounts({ agentName: first.agentName, currency: first.currency }) : [];
      setBankOptions(banks);
    } catch (error) {
      setBankOptions([]);
      message.error(error instanceof Error ? error.message : '收款银行加载失败');
    }
  };

  const submitApplication = async () => {
    const values = await applicationForm.validateFields();
    if (hasMultipleApplicationGroups) {
      message.warning('当前选择跨代理、银行或币种，请分开提交');
      return;
    }
    const useManual = !values.bankAccountId && values.accountName && values.bankName && values.bankAccountNo;
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
    });
    message.success('付款申请已提交');
    setApplicationOpen(false);
    applicationForm.resetFields();
    setSelectedIds([]);
    await loadRows();
  };

  const submitVoucher = async () => {
    if (!voucherTarget) return;
    const values = await voucherForm.validateFields();
    if (!values.voucherImage) {
      message.warning('请先粘贴或选择图片');
      return;
    }
    message.success('对账单凭证已记录');
    setVoucherTarget(null);
    voucherForm.resetFields();
    await loadRows();
  };

  const cancelApplication = async (row: PendingPaymentSummary) => {
    if (!row.paymentApplicationId) {
      message.warning('该记录缺少付款申请关联，无法撤回');
      return;
    }
    await apiClient.cancelPaymentApplication(row.paymentApplicationId, { reason: '财务撤回付款申请' });
    message.success('付款申请已撤回');
    await loadRows();
  };

  const exportRows = async () => {
    const exported = await apiClient.exportPaymentApplications({ ids: selectedIds.length ? selectedIds : undefined, query });
    downloadCsv('pending-payments.csv', [
      { key: 'date', label: '日期' },
      { key: 'agentName', label: '代理' },
      { key: 'salesperson', label: '业务员' },
      { key: 'customerCode', label: '客户编号' },
      { key: 'systemOrderNo', label: '运单号' },
      { key: 'feeName', label: '应付费用' },
      { key: 'currency', label: '币种' },
      { key: 'amount', label: '合计金额' },
      { key: 'remark', label: '备注' },
      { key: 'status', label: '状态' },
      { key: 'paymentApplicationNo', label: '付款申请编号' }
    ], exported.rows as unknown as Array<Record<string, unknown>>);
    message.success(`付款申请导出已生成：${exported.rows.length} 条`);
  };

  return (
    <Card
      title="深圳思远国际货运代理有限公司付款申请单"
      className="finance-work-card"
      extra={(
        <Space>
          <Button disabled={!canExport} onClick={() => void exportRows()}>导出</Button>
          <Button icon={<RefreshCw size={15} />} onClick={() => void loadRows()}>刷新</Button>
        </Space>
      )}
    >
      <Form form={queryForm} layout="vertical" className="finance-pending-filter-card">
        <div className="finance-pending-filter-bar" role="group" aria-label="待付款筛选条件">
          <Form.Item name="agent" label="代理"><Input allowClear /></Form.Item>
          <Form.Item name="salesperson" label="业务员"><Input allowClear /></Form.Item>
          <Form.Item name="customerCode" label="客户编号"><Input allowClear /></Form.Item>
          <Form.Item name="systemOrderNo" label="运单号"><Input allowClear /></Form.Item>
          <Form.Item name="feeName" label="应付费用"><Input allowClear /></Form.Item>
          <Form.Item name="currency" label="币种"><Select options={[{ label: '全部', value: 'ALL' }, { label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} /></Form.Item>
          <Form.Item name="amount" label="合计金额"><InputNumber className="full-width" min={0} /></Form.Item>
          <Form.Item name="payeeName" label="收款方名称"><Input allowClear /></Form.Item>
          <Form.Item name="bankAccountNo" label="收款方银行账号"><Input allowClear /></Form.Item>
          <Form.Item name="applicationDateFrom" label="申请付款日期起"><Input type="date" /></Form.Item>
          <Form.Item name="applicationDateTo" label="申请付款日期止"><Input type="date" /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={[{ label: '全部', value: 'ALL' }, { label: '待付款', value: 'PENDING' }, { label: '资料已完善', value: 'READY' }, { label: '已进入待支付', value: 'APPLIED' }, { label: '已失效', value: 'INVALIDATED' }]} /></Form.Item>
          <Form.Item name="remark" label="备注" className="finance-pending-filter-wide"><Input allowClear /></Form.Item>
          <Form.Item label=" " className="finance-pending-filter-actions">
            <Space>
              <Button type="primary" onClick={applyFilters}>查询</Button>
              <Button onClick={resetFilters}>重置</Button>
            </Space>
          </Form.Item>
        </div>
      </Form>

      <div className="finance-payment-command-bar">
        <Space wrap className="finance-payment-command-primary">
          <Button type="primary" disabled={!canMaintainPayment || !selectedIds.length || hasMultipleApplicationGroups} onClick={openApplication}>生成待支付申请</Button>
          <Text type="secondary">已选 {selectedIds.length} 条，按代理、银行账号、币种自动合并</Text>
          {hasMultipleApplicationGroups ? <Text type="warning">当前包含多个付款组，请分组提交</Text> : null}
        </Space>
        <Space wrap className="finance-payment-command-summary">
          {selectedAmountByCurrency.map((item) => <Tag color="blue" key={`selected-${item.currency}`}>已选 {item.currency} {formatMoney(item.amount, item.currency)}</Tag>)}
          {response.totals.amountByCurrency.map((item) => <Tag key={`total-${item.currency}`}>{item.currency} 合计 {formatMoney(item.amount, item.currency)}</Tag>)}
        </Space>
      </div>

      <ManagedTable
        className="finance-work-table"
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ current: response.pagination.page, pageSize: response.pagination.pageSize, total: response.pagination.totalItems, showSizeChanger: true }}
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (row) => ({ disabled: row.status === 'APPLIED' || row.status === 'INVALIDATED' || row.status === 'PAID' }) }}
        rowClassName={(row) => selectedIds.includes(row.id) ? 'finance-payment-row-selected' : ''}
        scroll={{ x: 1500 }}
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
        columns={[
          { title: '日期', dataIndex: 'date', width: 170, sorter: true, render: (value?: string) => value ? formatBeijingDateTime(value) : '-' },
          { title: '代理', dataIndex: 'agentName', width: 140, render: (value?: string) => value ?? '-' },
          { title: '业务员', dataIndex: 'salesperson', width: 110, render: (value?: string) => value ?? '-' },
          { title: '客户编号', dataIndex: 'customerCode', width: 110 },
          { title: '运单号', dataIndex: 'systemOrderNo', width: 190, render: (value?: string) => renderShipmentOrderNoLink(value) },
          { title: '应付费用', dataIndex: 'feeName', width: 140 },
          { title: '币种', dataIndex: 'currency', width: 90 },
          { title: '合计金额', dataIndex: 'amount', width: 130, align: 'right', sorter: true, render: (value: number, row) => <Text strong className="finance-payment-amount">{formatMoney(value, row.currency)}</Text> },
          { title: '备注', dataIndex: 'remark', width: 160, ellipsis: true, render: (value?: string) => value ?? '-' },
          {
            title: '对账单凭证',
            dataIndex: 'vouchers',
            width: 150,
            render: (value: PendingPaymentSummary['vouchers'], row) => value.length
              ? <Button className="finance-payment-voucher-button" size="small" onDoubleClick={() => setPreviewTarget(row)} onClick={() => setPreviewTarget(row)}>{value.length} 张凭证</Button>
              : <Button size="small" disabled={!canUploadAttachment} onClick={() => setVoucherTarget(row)}>记录凭证</Button>
          },
          { title: '收款方银行信息', dataIndex: 'bankAccount', width: 260, render: (value?: PayeeBankAccountSummary) => value ? `${value.accountName} / ${value.bankName} / ${value.bankAccountNo}` : '待选择' },
          { title: '状态', dataIndex: 'status', width: 120, render: renderPaymentStatus },
          {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 120,
            render: (_, row) => row.status === 'APPLIED' && row.paymentApplicationId && canMaintainPayment ? (
              <Popconfirm title="确认撤回该付款申请？" onConfirm={() => void cancelApplication(row)}>
                <Button size="small">撤回</Button>
              </Popconfirm>
            ) : '-'
          }
        ]}
      />

      <Modal title="生成待支付申请" className="finance-modal finance-payment-application-modal" open={applicationOpen} onCancel={() => { setApplicationOpen(false); applicationForm.resetFields(); }} onOk={submitApplication} okText="提交为待支付" cancelText="取消" width={920}>
        <Space direction="vertical" className="full-width" size={12}>
          {hasMultipleApplicationGroups ? <Alert type="warning" showIcon message="当前包含多个付款组，请关闭后按同一代理、银行和币种分开提交。" /> : null}
          <section className="finance-payment-modal-section">
            <div className="finance-payment-section-title">已选付款组摘要</div>
            <Table
              className="finance-work-table finance-embedded-table finance-payment-group-table"
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={groupedApplications}
              columns={[
                { title: '代理', dataIndex: 'agentName' },
                { title: '币种', dataIndex: 'currency', width: 90 },
                { title: '明细数', dataIndex: 'rows', width: 90, render: (value: PendingPaymentSummary[]) => value.length },
                { title: '合计金额', dataIndex: 'amount', width: 140, align: 'right', render: (value: number, row) => <Text strong>{formatMoney(value, row.currency)}</Text> },
                { title: '银行账号', dataIndex: 'bank', render: (value?: PayeeBankAccountSummary) => value ? `${value.bankName} / ${value.bankAccountNo}` : <Text type="warning">待选择</Text> }
              ]}
            />
          </section>
          <Form form={applicationForm} layout="vertical">
            <section className="finance-payment-modal-section">
              <div className="finance-payment-section-title">收款银行</div>
              <Row gutter={12}>
                <Col xs={24} md={12}><Form.Item name="bankAccountId" label="选择收款银行"><Select allowClear disabled={!canMaintainBank} options={bankOptions.map((item) => ({ value: item.id, label: `${item.currency} / ${item.bankName} / ${item.accountName} / ${item.bankAccountNo}` }))} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="currency" label="银行币种"><Select disabled={!canMaintainBank} options={[{ label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} /></Form.Item></Col>
              </Row>
            </section>
            <section className="finance-payment-modal-section">
              <div className="finance-payment-section-title">手动银行信息</div>
              <Row gutter={12}>
                <Col xs={24} md={8}><Form.Item name="accountName" label="手动收款方名称"><Input disabled={!canMaintainBank} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="bankName" label="手动开户行"><Input disabled={!canMaintainBank} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="bankAccountNo" label="手动银行账号"><Input disabled={!canMaintainBank} /></Form.Item></Col>
                <Col xs={24}>
                  <Form.Item name="saveBank" valuePropName="checked">
                    <Checkbox disabled={!canMaintainBank}>保存为代理银行，下次复用</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </section>
            <section className="finance-payment-modal-section">
              <div className="finance-payment-section-title">供应商账单截图</div>
              <Form.Item name="voucherImage" label="供应商账单截图">
                <VoucherImageInput
                  disabled={!canUploadAttachment}
                  uploadFile={(file) => apiClient.uploadVoucherImage({ file, context: 'PENDING_PAYMENT_BILL', pendingPaymentId: selectedRows[0]?.id }) as Promise<VoucherImageValue>}
                />
              </Form.Item>
            </section>
            <section className="finance-payment-modal-section">
              <div className="finance-payment-section-title">备注</div>
              <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
            </section>
          </Form>
        </Space>
      </Modal>

      <Modal title="记录对账单凭证" className="finance-modal" width={720} open={Boolean(voucherTarget)} onCancel={() => { setVoucherTarget(null); voucherForm.resetFields(); }} onOk={submitVoucher} okText="保存凭证" cancelText="取消" destroyOnHidden>
        <Form form={voucherForm} layout="vertical" className="finance-payment-voucher-form">
          <section className="finance-payment-modal-section">
            <div className="finance-payment-section-title">供应商账单截图</div>
            <Text type="secondary">支持选择、粘贴或拖入图片，保存后会回到当前待付款列表。</Text>
            <Form.Item name="voucherImage" label="供应商账单截图">
              <VoucherImageInput
                disabled={!canUploadAttachment || !voucherTarget}
                uploadFile={(file) => apiClient.uploadVoucherImage({ file, context: 'PENDING_PAYMENT_BILL', pendingPaymentId: voucherTarget?.id }) as Promise<VoucherImageValue>}
              />
            </Form.Item>
          </section>
        </Form>
      </Modal>

      <Modal title="对账单凭证预览" className="finance-modal finance-preview-modal finance-payment-preview-modal" open={Boolean(previewTarget)} footer={null} onCancel={() => setPreviewTarget(null)} width={780}>
        <Space direction="vertical" className="full-width" size={12}>
          {previewTarget?.vouchers.map((voucher) => (
            <Card key={voucher.id} size="small" title={voucher.fileName} className="finance-payment-preview-card">
              {voucher.url ? <Image src={voucher.url} alt={voucher.fileName} fallback="" /> : <Text type="secondary">{voucher.mimeType ?? '图片凭证'} / {voucher.sizeBytes ?? 0} Bytes</Text>}
            </Card>
          ))}
        </Space>
      </Modal>
    </Card>
  );
}
