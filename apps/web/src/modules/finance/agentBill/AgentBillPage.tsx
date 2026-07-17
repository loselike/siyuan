import { useEffect, useState } from 'react';
import { App as AntdApp, Button, Card, Col, Form, Input, InputNumber, Row, Select, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PaymentVoucherInput, PaymentVoucherListQuery, PaymentVoucherSummary } from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { formatBeijingDateTime } from '../../shared/format';
import { AppDatePicker, ManagedTable } from '../../shared/ui';

type AgentBillPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
};

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

const statusLabels: Record<string, string> = {
  IMPORTED: '已导入',
  MATCHED: '已匹配',
  DIFFERENCE_PENDING: '差异待处理',
  DIFFERENCE_HANDLED: '差异已处理',
  ARCHIVED: '已归档'
};

export function AgentBillPage({ apiClient, permissions }: AgentBillPageProps) {
  const { message } = AntdApp.useApp();
  const [queryForm] = Form.useForm<PaymentVoucherListQuery>();
  const [form] = Form.useForm<PaymentVoucherInput>();
  const [rows, setRows] = useState<PaymentVoucherSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const canImport = hasPermission(permissions, 'finance:agent-bill:import');
  const canResolveDifference = hasPermission(permissions, 'finance:agent-bill:difference-resolve');
  const canArchive = hasPermission(permissions, 'finance:agent-bill:archive') || hasPermission(permissions, 'finance:agent-bill:reverse-archive');

  const loadRows = async (query: PaymentVoucherListQuery = queryForm.getFieldsValue()) => {
    setLoading(true);
    try {
      setRows(await apiClient.paymentVouchers({ ...query, pageSize: 50 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (values: PaymentVoucherInput) => {
    setSaving(true);
    try {
      await apiClient.addPaymentVoucher({
        ...values,
        voucherType: 'BILL',
        status: values.differenceType ? 'DIFFERENCE_PENDING' : 'IMPORTED',
        differenceStatus: values.differenceType ? 'PENDING' : undefined,
        billDate: values.billDate ? new Date(values.billDate).toISOString() : undefined,
        extraFeeOccurredAt: values.extraFeeOccurredAt ? new Date(values.extraFeeOccurredAt).toISOString() : undefined,
        kuayueBillDate: values.kuayueBillDate ? new Date(values.kuayueBillDate).toISOString() : undefined
      });
      message.success('代理账单已登记');
      form.resetFields();
      await loadRows(queryForm.getFieldsValue());
    } finally {
      setSaving(false);
    }
  };

  const handleDifference = async (row: PaymentVoucherSummary) => {
    setSaving(true);
    try {
      await apiClient.updatePaymentVoucherDifference(row.id, {
        differenceType: row.differenceType,
        differenceAmount: row.differenceAmount,
        differenceReason: row.differenceReason || '差异已处理',
        differenceStatus: 'HANDLED'
      });
      message.success('差异已处理');
      await loadRows(queryForm.getFieldsValue());
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (row: PaymentVoucherSummary) => {
    setSaving(true);
    try {
      const archived = row.status !== 'ARCHIVED';
      await apiClient.updatePaymentVoucherArchive(row.id, { archived, reason: archived ? '账单核对完成归档' : '账单恢复核对' });
      message.success(archived ? '账单已归档' : '账单已反归档');
      await loadRows(queryForm.getFieldsValue());
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<PaymentVoucherSummary> = [
    { title: '账单号', dataIndex: 'billNo', width: 150, fixed: 'left' },
    { title: '代理', dataIndex: 'agentName', width: 140 },
    { title: '账单日期', dataIndex: 'billDate', width: 130, render: (value?: string) => value ? value.slice(0, 10) : '-' },
    { title: '币种', dataIndex: 'currency', width: 90 },
    { title: '账单金额', dataIndex: 'billAmount', width: 120, render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
    { title: '出货单号', dataIndex: 'systemOrderNo', width: 150 },
    { title: '转单号', dataIndex: 'transferNo', width: 140, render: (value?: string) => value || '-' },
    { title: '代理渠道', dataIndex: 'agentChannel', width: 140, render: (value?: string) => value || '-' },
    { title: '计费重', dataIndex: 'chargeWeightKg', width: 100, render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
    { title: '单价', dataIndex: 'unitPrice', width: 90, render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
    { title: '应付金额', dataIndex: 'payableAmount', width: 110, render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
    { title: '应付费用 id', dataIndex: 'payableFinanceItemId', width: 170, render: (value?: string) => value || '-' },
    { title: '付款申请号', dataIndex: 'paymentApplicationNo', width: 170, render: (value?: string) => value || '-' },
    { title: '已支付记录', dataIndex: 'paidPaymentId', width: 150, render: (value?: string) => value || '-' },
    { title: '差异类型', dataIndex: 'differenceType', width: 120, render: (value?: string) => value || '-' },
    { title: '差异金额', dataIndex: 'differenceAmount', width: 110, render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
    { title: '差异原因', dataIndex: 'differenceReason', width: 180, render: (value?: string) => value || '-' },
    { title: '处理人', dataIndex: 'differenceHandledBy', width: 100, render: (value?: string) => value || '-' },
    { title: '处理时间', dataIndex: 'differenceHandledAt', width: 170, render: formatBeijingDateTime },
    { title: '杂费类型', dataIndex: 'extraFeeType', width: 120, render: (value?: string) => value || '-' },
    { title: '杂费金额', dataIndex: 'extraFeeAmount', width: 110, render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
    { title: '杂费币种', dataIndex: 'extraFeeCurrency', width: 90, render: (value?: string) => value || '-' },
    { title: '杂费代理', dataIndex: 'extraFeeAgentName', width: 130, render: (value?: string) => value || '-' },
    { title: '归属客户', dataIndex: 'extraFeeCustomerCode', width: 110, render: (value?: string) => value || '-' },
    { title: '归属订单', dataIndex: 'extraFeeSystemOrderNo', width: 150, render: (value?: string) => value || '-' },
    { title: '发生日期', dataIndex: 'extraFeeOccurredAt', width: 120, render: (value?: string) => value ? value.slice(0, 10) : '-' },
    { title: '关联费用 id', dataIndex: 'extraFeeFinanceItemId', width: 160, render: (value?: string) => value || '-' },
    { title: '跨越账单号', dataIndex: 'kuayueBillNo', width: 150, render: (value?: string) => value || '-' },
    { title: '跨越客户', dataIndex: 'kuayueCustomerCode', width: 110, render: (value?: string) => value || '-' },
    { title: '跨越订单', dataIndex: 'kuayueSystemOrderNo', width: 150, render: (value?: string) => value || '-' },
    { title: '跨越金额', dataIndex: 'kuayueAmount', width: 110, render: (value?: number) => typeof value === 'number' ? value.toFixed(2) : '-' },
    { title: '跨越币种', dataIndex: 'kuayueCurrency', width: 90, render: (value?: string) => value || '-' },
    { title: '跨越日期', dataIndex: 'kuayueBillDate', width: 120, render: (value?: string) => value ? value.slice(0, 10) : '-' },
    { title: '跨越状态', dataIndex: 'kuayueStatus', width: 110, render: (value?: string) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: (value?: string) => <Tag color={value === 'DIFFERENCE_PENDING' ? 'orange' : 'blue'}>{statusLabels[value || 'IMPORTED'] ?? value}</Tag> },
    { title: '明细文件/图片', dataIndex: 'fileName', width: 180 },
    { title: '导入人', dataIndex: 'uploadedBy', width: 100 },
    { title: '导入时间', dataIndex: 'createdAt', width: 170, render: formatBeijingDateTime },
    { title: '操作', key: 'actions', width: 180, fixed: 'right', render: (_, row) => (
      <Space size={6}>
        <Button size="small" disabled={!canResolveDifference || row.status !== 'DIFFERENCE_PENDING'} loading={saving} onClick={() => handleDifference(row)}>处理差异</Button>
        <Button size="small" disabled={!canArchive} loading={saving} onClick={() => handleArchive(row)}>{row.status === 'ARCHIVED' ? '反归档' : '归档'}</Button>
      </Space>
    ) }
  ];

  return (
    <Space direction="vertical" size={12} className="finance-workspace">
      <Card title="代理账单人工导入" className="finance-filter-card">
        <Form name="agentBillQuery" form={queryForm} layout="inline" onFinish={loadRows} initialValues={{ currency: 'ALL', status: 'ALL' }}>
          <Form.Item name="billNo" label="账单号筛选"><Input allowClear /></Form.Item>
          <Form.Item name="agentName" label="代理筛选"><Input allowClear /></Form.Item>
          <Form.Item name="currency" label="币种"><Select style={{ width: 96 }} options={['ALL', 'RMB', 'USD'].map((value) => ({ label: value === 'ALL' ? '全部' : value, value }))} /></Form.Item>
          <Form.Item name="status" label="状态"><Select style={{ width: 130 }} options={[{ label: '全部', value: 'ALL' }, { label: '已导入', value: 'IMPORTED' }, { label: '已匹配', value: 'MATCHED' }, { label: '差异待处理', value: 'DIFFERENCE_PENDING' }, { label: '差异已处理', value: 'DIFFERENCE_HANDLED' }, { label: '已归档', value: 'ARCHIVED' }]} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={loading}>查询</Button></Form.Item>
        </Form>
      </Card>

      <Card title="登记代理账单" className="finance-work-card">
        <Form name="agentBillImport" form={form} layout="vertical" disabled={!canImport} initialValues={{ currency: 'RMB' }} onFinish={submit}>
          <Row gutter={[12, 0]}>
            <Col xs={24} md={6}><Form.Item name="billNo" label="账单号" rules={[{ required: true, whitespace: true, message: '请输入账单号' }]}><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="agentName" label="代理" rules={[{ required: true, whitespace: true, message: '请输入代理' }]}><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="billDate" label="账单日期" rules={[{ required: true, message: '请选择账单日期' }]}><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={3}><Form.Item name="currency" label="币种"><Select options={['RMB', 'USD'].map((value) => ({ label: value, value }))} /></Form.Item></Col>
            <Col xs={24} md={3}><Form.Item name="billAmount" label="账单金额" rules={[{ required: true, message: '请输入金额' }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="differenceType" label="差异类型"><Input /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="differenceAmount" label="差异金额"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="differenceReason" label="差异原因"><Input /></Form.Item></Col>
            <Col xs={24} md={5}><Form.Item name="extraFeeType" label="杂费类型"><Input /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="extraFeeAmount" label="杂费金额"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={3}><Form.Item name="extraFeeCurrency" label="杂费币种"><Select allowClear options={['RMB', 'USD'].map((value) => ({ label: value, value }))} /></Form.Item></Col>
            <Col xs={24} md={5}><Form.Item name="extraFeeAgentName" label="杂费代理"><Input /></Form.Item></Col>
            <Col xs={24} md={3}><Form.Item name="extraFeeCustomerCode" label="归属客户"><Input /></Form.Item></Col>
            <Col xs={24} md={5}><Form.Item name="extraFeeSystemOrderNo" label="归属订单"><Input /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="extraFeeOccurredAt" label="发生日期"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={5}><Form.Item name="extraFeeFinanceItemId" label="关联费用 id"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="extraFeeRemark" label="杂费备注"><Input /></Form.Item></Col>
            <Col xs={24} md={5}><Form.Item name="kuayueBillNo" label="跨越账单号"><Input /></Form.Item></Col>
            <Col xs={24} md={3}><Form.Item name="kuayueCustomerCode" label="跨越客户"><Input /></Form.Item></Col>
            <Col xs={24} md={5}><Form.Item name="kuayueSystemOrderNo" label="跨越订单"><Input /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="kuayueAmount" label="跨越金额"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} md={3}><Form.Item name="kuayueCurrency" label="跨越币种"><Select allowClear options={['RMB', 'USD'].map((value) => ({ label: value, value }))} /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="kuayueBillDate" label="跨越账单日期"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={4}><Form.Item name="kuayueStatus" label="跨越状态"><Select allowClear options={[{ label: '已登记', value: 'REGISTERED' }, { label: '已关联', value: 'LINKED' }, { label: '已归档', value: 'ARCHIVED' }]} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="fileName" label="明细文件/图片" rules={[{ required: true, whitespace: true, message: '请输入文件名' }]}><Input /></Form.Item></Col>
            <Col xs={24} md={10}><Form.Item name="url" label="文件路径/URL"><Input /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label=" "><Button type="primary" htmlType="submit" loading={saving} disabled={!canImport}>保存代理账单</Button></Form.Item></Col>
          </Row>
        </Form>
      </Card>

      <Card title="代理账单列表" className="finance-table-card">
        <ManagedTable rowKey="id" size="small" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 4990 }} className="finance-work-table" />
      </Card>
    </Space>
  );
}
