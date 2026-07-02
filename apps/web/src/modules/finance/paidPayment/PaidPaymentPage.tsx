import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Image, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaidPaymentListQuery, PaidPaymentListResponse, PaidPaymentSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { downloadCsv } from '../exportCsv';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { ManagedTable } from '../../shared/ui';

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

function formatMoney(amount?: number, currency = 'RMB') {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-';
  if (currency === 'RMB') return formatCurrency(amount);
  return `${currency} ${amount.toFixed(2)}`;
}

function statusTag(status: PaidPaymentSummary['status']) {
  if (status === 'PAID') return <Tag color="success">已付款</Tag>;
  if (status === 'CANCELED') return <Tag color="default">已撤回</Tag>;
  return <Tag color="processing">待确认</Tag>;
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

  const canConfirm = hasPermission(permissions, 'finance:payable:paid-confirm');
  const canReverse = hasPermission(permissions, 'finance:payable:paid-reverse');
  const canExport = hasPermission(permissions, 'finance:payable:paid-export');
  const canUploadVoucher = hasPermission(permissions, 'finance:payable:paid-voucher');

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
      message.success('付款已确认');
      setSelectedRow(undefined);
      setConfirmReceiptFile(undefined);
      confirmForm.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认付款失败');
    } finally {
      setConfirming(false);
    }
  };

  const reverse = async (row: PaidPaymentSummary) => {
    try {
      await apiClient.reversePaidPayment(row.id, { reason: '财务反核销' });
      message.success('已反核销，记录回到待确认');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '反核销失败');
    }
  };

  const exportRows = async () => {
    try {
      const result = await apiClient.exportPaidPayments({ query });
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
    { title: '运单号', dataIndex: 'systemOrderNo', width: 210, render: (value?: string) => renderShipmentOrderNoLink(value) },
    { title: '应付费用', dataIndex: 'feeName', width: 180, render: (value?: string) => value ?? '-' },
    { title: '状态', dataIndex: 'status', width: 100, render: statusTag },
    { title: '币种', dataIndex: 'currency', width: 90, render: (value?: string) => <Tag>{value ?? 'RMB'}</Tag> },
    { title: '合计金额', dataIndex: 'totalAmount', width: 130, align: 'right', render: (value: number, row) => formatMoney(value, row.currency) },
    { title: '备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (value?: string) => value ?? '-' },
    {
      title: '对账单凭证',
      dataIndex: 'billVouchers',
      width: 140,
      render: (_, row) => {
        const voucher = row.billVouchers[0];
        return voucher?.url ? <Button size="small" onClick={() => setPreviewUrl(voucher.url)}>查看</Button> : (voucher?.fileName ?? '-');
      }
    },
    {
      title: '收款方银行信息',
      dataIndex: 'payeeBankAccount',
      width: 260,
      render: (_, row) => row.payeeBankAccount
        ? `${row.payeeBankAccount.accountName} / ${row.payeeBankAccount.bankName} / ${row.payeeBankAccount.bankAccountNo}`
        : '-'
    },
    { title: '付款方银行', dataIndex: 'payerBankName', width: 180, render: (value?: string) => value ?? '-' },
    { title: '付款日期', dataIndex: 'paidAt', width: 155, render: (value?: string) => (value ? formatBeijingDateTime(value) : '-') },
    {
      title: '水单',
      dataIndex: 'waterReceipts',
      width: 130,
      render: (_, row) => {
        const receipt = row.waterReceipts[0];
        return receipt?.url ? <Button size="small" onClick={() => setPreviewUrl(receipt.url)}>查看</Button> : (receipt?.fileName ?? '-');
      }
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 260,
      render: (_, row) => (
        <Space size={6}>
          {row.status === 'WAITING_PAYMENT' && canConfirm ? <Button size="small" type="primary" onClick={() => openConfirm(row)}>确认付款</Button> : null}
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
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card
        title="深圳思远国际货运代理有限公司付款核销单"
        extra={<Space><Button onClick={() => void load()}>刷新</Button>{canExport ? <Button onClick={() => void exportRows()}>导出</Button> : null}</Space>}
      >
        <Form form={queryForm} layout="vertical" initialValues={defaultQuery} onFinish={(values) => setQuery({ ...defaultQuery, ...values, page: 1 })}>
          <Row gutter={12}>
            <Col xs={24} md={6}><Form.Item name="agent" label="代理"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="salesperson" label="业务员"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="customerCode" label="客户编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="systemOrderNo" label="运单号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="feeName" label="应付费用"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="currency" label="币种"><Select options={[{ label: '全部', value: 'ALL' }, { label: 'RMB', value: 'RMB' }, { label: 'USD', value: 'USD' }]} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="amount" label="合计金额"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="status" label="状态"><Select options={[{ label: '全部', value: 'ALL' }, { label: '待确认', value: 'WAITING_PAYMENT' }, { label: '已付款', value: 'PAID' }, { label: '已撤回', value: 'CANCELED' }]} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="payeeName" label="收款方名称"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="bankAccountNo" label="收款方银行账号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="payerBank" label="付款方银行信息"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="remark" label="备注"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="applicationDateFrom" label="申请付款日期起"><Input type="date" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="applicationDateTo" label="申请付款日期止"><Input type="date" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="paidDateFrom" label="付款日期起"><Input type="date" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="paidDateTo" label="付款日期止"><Input type="date" /></Form.Item></Col>
          </Row>
          <Space>
            <Button type="primary" htmlType="submit">查询</Button>
            <Button onClick={() => { queryForm.resetFields(); setQuery(defaultQuery); }}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Card>
        <Space size={8} wrap className="finance-work-summary">
          <Text type="secondary">待确认 {response.totals.waitingPaymentCount}</Text>
          <Text type="secondary">已付款 {response.totals.paidCount}</Text>
          {response.totals.amountByCurrency.map((item) => <Text key={item.currency} strong>{item.currency} {formatMoney(item.amount, item.currency)}</Text>)}
        </Space>
        <ManagedTable
          className="finance-work-table"
          rowKey="id"
          loading={loading}
          dataSource={response.rows}
          columns={columns}
          size="small"
          scroll={{ x: 2200 }}
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
        title="确认付款"
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
          <Form.Item label="付款日期" name="paidAt" rules={[{ required: true, message: '请选择付款日期' }]}><Input type="date" /></Form.Item>
          <Form.Item label="付款备注" name="paidRemark"><Input.TextArea rows={2} /></Form.Item>
          {canUploadVoucher ? (
            <Form.Item label="付款水单截图" name="waterReceiptImage">
              <VoucherImageInput disabled={!canUploadVoucher} onFileChange={setConfirmReceiptFile} />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal title="凭证预览" open={Boolean(previewUrl)} footer={null} onCancel={() => setPreviewUrl(undefined)} destroyOnHidden>
        {previewUrl ? <Image src={previewUrl} alt="付款凭证" style={{ maxWidth: '100%' }} /> : null}
      </Modal>

      <Modal title="补充付款信息" open={Boolean(supplementRow)} onCancel={() => setSupplementRow(undefined)} onOk={() => void submitSupplement()} okText="保存" cancelText="取消" destroyOnHidden>
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
