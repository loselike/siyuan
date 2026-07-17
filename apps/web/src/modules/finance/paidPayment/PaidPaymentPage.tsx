import type { Key, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Image, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaidPaymentListQuery, PaidPaymentListResponse, PaidPaymentSummary, PaymentVoucherSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { downloadCsv } from '../exportCsv';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { formatBeijingDateTime } from '../../shared/format';
import { AppDatePicker, ManagedTable } from '../../shared/ui';

const { Text } = Typography;

type PaidPaymentPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
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

const defaultQuery: PaidPaymentListQuery = { page: 1, pageSize: 10, status: 'ALL', sortBy: 'date', sortOrder: 'desc' };

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

function renderVoucherThumb(vouchers: PaymentVoucherSummary[], alt: string, onPreview: (url: string) => void) {
  const voucher = vouchers.find((item) => item.url) ?? vouchers[0];
  if (!voucher) return '-';
  return (
    <Space size={6} wrap={false} className="finance-paid-voucher-cell">
      {voucher.url ? (
        <Tooltip title="双击查看凭证">
          <Image
            src={voucher.url}
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
    </Space>
  );
}

export function PaidPaymentPage({ apiClient, permissions, renderShipmentOrderNoLink }: PaidPaymentPageProps) {
  const [queryForm] = Form.useForm<PaidPaymentListQuery>();
  const [confirmForm] = Form.useForm<ConfirmFormValues>();
  const [supplementForm] = Form.useForm<SupplementFormValues>();
  const [query, setQuery] = useState<PaidPaymentListQuery>(defaultQuery);
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
  const [confirmReceiptFile, setConfirmReceiptFile] = useState<File>();
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Key[]>([]);

  const canConfirm = hasPermission(permissions, 'finance:paid-payment:confirm');
  const canReverse = hasPermission(permissions, 'finance:paid-payment:reverse');
  const canExport = hasPermission(permissions, 'finance:paid-payment:export');
  const canUploadVoucher = hasPermission(permissions, 'finance:paid-payment:voucher-upload');

  const load = useCallback(async (nextQuery = query) => {
    setLoading(true);
    try {
      setResponse(await apiClient.paidPayments(nextQuery));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载已付款失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, query]);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  useEffect(() => {
    const visibleIds = new Set(response.rows.map((row) => row.id));
    setSelectedPaymentIds((current) => current.filter((id) => visibleIds.has(String(id))));
  }, [response.rows]);

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
    setSelectedRow(row);
    setConfirmReceiptFile(undefined);
    confirmForm.setFieldsValue({
      payerBankName: row.payerBankName,
      payerBankAccountName: row.payerBankAccountName,
      payerBankAccountNo: row.payerBankAccountNo,
      paidAt: row.paidAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
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
      message.success('支付已确认');
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
      message.success('已反核销，记录回到待支付');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '反核销失败');
    }
  };

  const exportRows = async () => {
    try {
      const ids = selectedPaymentIds.map(String);
      const result = await apiClient.exportPaidPayments({ query, ...(ids.length ? { ids } : {}) });
      downloadCsv('paid-payments.csv', [
        { key: 'date', label: '日期' },
        { key: 'agentName', label: '代理' },
        { key: 'salesperson', label: '业务员' },
        { key: 'customerCode', label: '客户编号' },
        { key: 'systemOrderNo', label: '运单号' },
        { key: 'feeName', label: '应付费用' },
        { key: 'currency', label: '币种' },
        { key: 'totalAmount', label: '合计金额' },
        { key: 'remark', label: '备注' },
        { key: 'payerBankName', label: '付款方银行' },
        { key: 'paidAt', label: '付款日期' },
        { key: 'paidBy', label: '付款人' },
        { key: 'status', label: '状态' }
      ], result.rows as unknown as Array<Record<string, unknown>>);
      message.success(`已导出 ${result.rows.length} 条已付款记录`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const openSupplement = (row: PaidPaymentSummary) => {
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
      await apiClient.updatePaidPayment(supplementRow.id, {
        paidRemark: values.paidRemark
      });
      message.success('付款补充信息已保存');
      setSupplementRow(undefined);
      supplementForm.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存补充信息失败');
    }
  };

  const columns = useMemo<ColumnsType<PaidPaymentSummary>>(() => [
    { title: '日期', dataIndex: 'date', width: 155, render: (value?: string) => (value ? formatBeijingDateTime(value) : '-') },
    { title: '代理', dataIndex: 'agentName', width: 150, render: (value?: string) => value ?? '-' },
    { title: '业务员', dataIndex: 'salesperson', width: 120, render: (value?: string) => value ?? '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 120, render: (value?: string) => value ?? '-' },
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 210, render: (value?: string) => renderShipmentOrderNoLink(value) },
    { title: '应付费用', dataIndex: 'feeName', width: 180, render: (value?: string) => value ?? '-' },
    { title: '状态', dataIndex: 'status', width: 100, render: statusTag },
    { title: '币种', dataIndex: 'currency', width: 90, render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag> },
    { title: '合计金额', dataIndex: 'totalAmount', width: 120, align: 'right', render: (value: number) => formatAmount(value) },
    { title: '备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (value?: string) => value ?? '-' },
    {
      title: '对账单凭证',
      dataIndex: 'billVouchers',
      width: 190,
      render: (_, row) => renderVoucherThumb(row.billVouchers, '对账单凭证', setPreviewUrl)
    },
    {
      title: '收款方银行信息',
      dataIndex: 'payeeBankAccount',
      width: 300,
      render: (_, row) => <Text className="table-compact-text" title={formatBankInfo(row)}>{formatBankInfo(row)}</Text>
    },
    { title: '付款方银行', dataIndex: 'payerBankName', width: 180, render: (value?: string) => value ?? '-' },
    { title: '付款日期', dataIndex: 'paidAt', width: 155, render: (value?: string) => (value ? formatBeijingDateTime(value) : '-') },
    {
      title: '水单',
      dataIndex: 'waterReceipts',
      width: 180,
      render: (_, row) => renderVoucherThumb(row.waterReceipts, '付款水单', setPreviewUrl)
    },
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
          {row.status === 'PAID' && (canConfirm || canUploadVoucher) ? <Button size="small" onClick={() => openSupplement(row)}>补充</Button> : null}
        </Space>
      )
    }
  ], [canConfirm, canReverse, renderShipmentOrderNoLink]);

  return (
    <Space direction="vertical" size={12} className="finance-workspace">
      <Card
        title="深圳思远国际货运代理有限公司付款核销单"
        className="finance-filter-card"
        extra={<Space><Button onClick={() => void load()}>刷新</Button>{canExport ? <Button onClick={() => void exportRows()}>导出</Button> : null}</Space>}
      >
        <Form form={queryForm} layout="vertical" initialValues={defaultQuery} onFinish={(values) => setQuery({ ...defaultQuery, ...values, page: 1 })}>
          <Row gutter={12}>
            <Col xs={24} md={6}><Form.Item name="agent" label="代理"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="salesperson" label="业务员"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="customerCode" label="客户编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="systemOrderNo" label="出货单号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="feeName" label="应付费用"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="currency" label="币种"><Select options={[{ label: '全部', value: 'ALL' }, { label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="amount" label="合计金额"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="status" label="状态"><Select options={[{ label: '全部', value: 'ALL' }, { label: '待支付', value: 'WAITING_PAYMENT' }, { label: '已支付', value: 'PAID' }, { label: '已撤回', value: 'CANCELED' }]} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="payeeName" label="收款方名称"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="bankAccountNo" label="收款方银行账号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="payerBank" label="付款方银行信息"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="remark" label="备注"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="applicationDateFrom" label="申请付款日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="applicationDateTo" label="申请付款日期止"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="paidDateFrom" label="付款日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="paidDateTo" label="付款日期止"><AppDatePicker /></Form.Item></Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={() => { queryForm.resetFields(); setQuery(defaultQuery); }}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Card className="finance-table-card">
        <div className="finance-paid-command-bar">
          <Space size={8} wrap className="finance-work-summary">
            <Text type="secondary">待支付 {response.totals.waitingPaymentCount}</Text>
            <Text type="secondary">已支付 {response.totals.paidCount}</Text>
            <Text type="secondary">已选 {selectedPaymentIds.length}</Text>
            {response.totals.amountByCurrency.map((item) => <Text key={item.currency} strong>{item.currency} {formatAmount(item.amount)}</Text>)}
          </Space>
          <Space size={8} wrap className="finance-paid-selected-groups">
            {selectedGroups.length ? selectedGroups.map((group) => (
              <Tag key={group.key} color="blue">
                {group.payeeName} / {group.currency} / {group.bankAccountNo} / {group.bankName} / {group.count} 条 / {formatAmount(group.amount)}
              </Tag>
            )) : <Text type="secondary">勾选后按收款方名称、币种、银行账号合并付款组</Text>}
          </Space>
        </div>
        <ManagedTable<PaidPaymentSummary>
          className="finance-work-table"
          rowKey="id"
          loading={loading}
          dataSource={response.rows}
          columns={columns}
          size="small"
          scroll={{ x: 2380 }}
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
            onChange: (page, pageSize) => setQuery((current) => ({ ...current, page, pageSize }))
          }}
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
          <Form.Item label="付款方银行" name="payerBankName" rules={[{ required: true, message: '请输入付款方银行' }]}><Input /></Form.Item>
          <Form.Item label="付款方户名" name="payerBankAccountName"><Input /></Form.Item>
          <Form.Item label="付款方账号" name="payerBankAccountNo" rules={[{ required: true, message: '请输入付款方账号' }]}><Input /></Form.Item>
          <Form.Item label="付款日期" name="paidAt" rules={[{ required: true, message: '请选择付款日期' }]}><AppDatePicker /></Form.Item>
          <Form.Item label="付款备注" name="paidRemark"><Input.TextArea rows={2} /></Form.Item>
          {canUploadVoucher ? (
            <Form.Item label="付款水单截图" name="waterReceiptImage">
              <VoucherImageInput disabled={!canUploadVoucher} onFileChange={setConfirmReceiptFile} />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal title="凭证预览" className="finance-modal finance-preview-modal" width={760} open={Boolean(previewUrl)} footer={null} onCancel={() => setPreviewUrl(undefined)} destroyOnHidden>
        {previewUrl ? <Image src={previewUrl} alt="付款凭证" style={{ maxWidth: '100%' }} /> : null}
      </Modal>

      <Modal title="补充付款信息" className="finance-modal" width={720} open={Boolean(supplementRow)} onCancel={() => setSupplementRow(undefined)} onOk={() => void submitSupplement()} okText="保存" cancelText="取消" destroyOnHidden>
        <Form form={supplementForm} layout="vertical">
          <Form.Item label="付款备注" name="paidRemark"><Input.TextArea rows={2} /></Form.Item>
          {canUploadVoucher ? (
            <Form.Item label="付款水单截图" name="waterReceiptImage">
              <VoucherImageInput
                disabled={!canUploadVoucher || !supplementRow}
                uploadFile={(file) => apiClient.uploadVoucherImage({ file, context: 'PAID_PAYMENT_RECEIPT', paymentApplicationId: supplementRow?.id }) as Promise<VoucherImageValue>}
              />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </Space>
  );
}
