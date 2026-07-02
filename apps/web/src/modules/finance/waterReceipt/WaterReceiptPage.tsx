import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Image, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  CustomerAccountSummary,
  ReceivableAuditSummary,
  WaterReceiptCreateInput,
  WaterReceiptListQuery,
  WaterReceiptListResponse,
  WaterReceiptSummary
} from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { confirmDangerousAction } from '../../shared/dangerousAction';
import { downloadCsv } from '../exportCsv';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { ManagedTable } from '../../shared/ui';

const { Text } = Typography;

type WaterReceiptPageProps = {
  apiClient: ApiClient;
  permissions: PermissionKey[];
  accounts: CustomerAccountSummary[];
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
};

type VoucherFormValues = { voucherImage?: VoucherImageValue };
type MatchFormValues = { rows: Array<{ receivableFinanceItemId?: string; amount?: number }> };

const defaultQuery: WaterReceiptListQuery = { page: 1, pageSize: 10, status: 'ALL', sortBy: 'receiptDate', sortOrder: 'desc' };

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

function statusTag(status: WaterReceiptSummary['status']) {
  const map: Record<WaterReceiptSummary['status'], { label: string; color: string }> = {
    PENDING: { label: '未到账', color: 'default' },
    ARRIVED: { label: '已到账', color: 'processing' },
    PARTIAL_MATCHED: { label: '部分匹配', color: 'warning' },
    MATCHED: { label: '已匹配', color: 'success' },
    ARCHIVED: { label: '已归档', color: 'default' },
    VOIDED: { label: '已作废', color: 'default' }
  };
  const item = map[status] ?? map.PENDING;
  return <Tag color={item.color}>{item.label}</Tag>;
}

function customerCodeFromName(value?: string) {
  return value?.split('-')[0];
}

export function WaterReceiptPage({ apiClient, permissions, accounts, renderShipmentOrderNoLink }: WaterReceiptPageProps) {
  const [queryForm] = Form.useForm<WaterReceiptListQuery>();
  const [form] = Form.useForm<WaterReceiptCreateInput>();
  const [voucherForm] = Form.useForm<VoucherFormValues>();
  const [matchForm] = Form.useForm<MatchFormValues>();
  const [query, setQuery] = useState<WaterReceiptListQuery>(defaultQuery);
  const [response, setResponse] = useState<WaterReceiptListResponse>({
    rows: [],
    totals: { count: 0, pendingCount: 0, arrivedCount: 0, matchedCount: 0, archivedCount: 0, amount: 0, matchedAmount: 0, balance: 0 },
    pagination: { page: 1, pageSize: 10, totalItems: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<WaterReceiptSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [voucherRow, setVoucherRow] = useState<WaterReceiptSummary | null>(null);
  const [matchRow, setMatchRow] = useState<WaterReceiptSummary | null>(null);
  const [matchableRows, setMatchableRows] = useState<ReceivableAuditSummary[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>();

  const canManage = hasPermission(permissions, 'finance:water-receipt:manage');
  const canArrive = hasPermission(permissions, 'finance:water-receipt:arrive');
  const canMatch = hasPermission(permissions, 'finance:water-receipt:match');
  const canVoid = hasPermission(permissions, 'finance:water-receipt:void');
  const canArchive = hasPermission(permissions, 'finance:water-receipt:archive');
  const canExport = hasPermission(permissions, 'finance:water-receipt:export');
  const canVoucher = hasPermission(permissions, 'finance:water-receipt:voucher');

  const customerOptions = useMemo(() => accounts.map((account) => ({
    label: account.customerName,
    value: customerCodeFromName(account.customerName) ?? account.customerId
  })), [accounts]);

  const load = useCallback(async (nextQuery = query) => {
    setLoading(true);
    try {
      setResponse(await apiClient.waterReceipts(nextQuery));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载水单失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, query]);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ site: '思远收款', receiptMethod: '对公', receiptDate: new Date().toISOString().slice(0, 10), currency: 'RMB', amount: 0 });
    setFormOpen(true);
  };

  const openEdit = (row: WaterReceiptSummary) => {
    setEditing(row);
    form.setFieldsValue({
      customerCode: row.customerCode,
      site: row.site,
      receiptMethod: row.receiptMethod,
      receiptDate: row.receiptDate?.slice(0, 10),
      currency: row.currency ?? 'RMB',
      amount: row.amount,
      paymentNo: row.paymentNo,
      remark: row.remark
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await apiClient.updateWaterReceipt(editing.id, values);
        message.success('水单已更新');
      } else {
        await apiClient.createWaterReceipt(values);
        message.success('水单已新增');
      }
      setFormOpen(false);
      form.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存水单失败');
    }
  };

  const markArrived = async (row: WaterReceiptSummary) => {
    try {
      await apiClient.markWaterReceiptArrived(row.id, {});
      message.success('已标记到账');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标记到账失败');
    }
  };
  const confirmMarkArrived = (row: WaterReceiptSummary) => {
    confirmDangerousAction({
      title: '确认标记该水单已到账？',
      content: '到账后金额会锁定，并进入应收匹配和客户账户流水，请确认到账金额与凭证无误。',
      okText: '确认到账',
      onOk: () => markArrived(row)
    });
  };
  const confirmArchive = (row: WaterReceiptSummary) => {
    confirmDangerousAction({
      title: '确认归档该水单？',
      content: '归档后该水单默认不再出现在待匹配列表，后续需按归档状态查询。',
      okText: '归档',
      onOk: async () => {
        await apiClient.archiveWaterReceipt(row.id);
        await load();
      }
    });
  };

  const openMatch = async (row: WaterReceiptSummary) => {
    setMatchRow(row);
    const rows = await apiClient.waterReceiptMatchableReceivables(row.id);
    setMatchableRows(rows);
    matchForm.setFieldsValue({ rows: [{ amount: Math.min(row.balance, rows[0]?.amount ?? row.balance), receivableFinanceItemId: rows[0]?.id }] });
  };

  const submitMatch = async () => {
    if (!matchRow) return;
    const values = await matchForm.validateFields();
    try {
      await apiClient.matchWaterReceiptOrders(matchRow.id, {
        matches: (values.rows ?? []).filter((row) => row.receivableFinanceItemId && row.amount).map((row) => ({ receivableFinanceItemId: row.receivableFinanceItemId as string, amount: Number(row.amount) }))
      });
      message.success('水单已匹配');
      setMatchRow(null);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '匹配失败');
    }
  };

  const submitVoucher = async () => {
    if (!voucherRow) return;
    const values = await voucherForm.validateFields();
    try {
      if (!values.voucherImage) {
        message.warning('请先粘贴或选择图片');
        return;
      }
      message.success('凭证已保存');
      setVoucherRow(null);
      voucherForm.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存凭证失败');
    }
  };

  const unmatch = async (row: WaterReceiptSummary) => {
    const matchIds = row.matches.filter((match) => !match.voided).map((match) => match.id);
    if (!matchIds.length) {
      message.warning('当前水单没有可撤销的匹配记录');
      return;
    }
    try {
      await apiClient.unmatchWaterReceipt(row.id, { matchIds, reason: '财务撤销匹配' });
      message.success('匹配已撤销');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '撤销匹配失败');
    }
  };

  const exportRows = async () => {
    try {
      const result = await apiClient.exportWaterReceipts({ query });
      downloadCsv('water-receipts.csv', [
        { key: 'site', label: '站点' },
        { key: 'receiptNo', label: '水单编号' },
        { key: 'salesperson', label: '业务员归属' },
        { key: 'customerCode', label: '客户编号' },
        { key: 'receiptMethod', label: '收款方式' },
        { key: 'receiptDate', label: '日期' },
        { key: 'currency', label: '币种' },
        { key: 'amount', label: '金额' },
        { key: 'paymentNo', label: '付款编号' },
        { key: 'status', label: '状态' },
        { key: 'matchedAmount', label: '匹配金额' },
        { key: 'balance', label: '余额' },
        { key: 'remark', label: '备注' }
      ], result.rows as unknown as Array<Record<string, unknown>>);
      message.success(`已导出 ${result.rows.length} 条水单`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导出失败');
    }
  };

  const columns = useMemo<ColumnsType<WaterReceiptSummary>>(() => [
    { title: '站点', dataIndex: 'site', width: 120 },
    { title: '水单编号', dataIndex: 'receiptNo', width: 150 },
    { title: '业务员归属', dataIndex: 'salesperson', width: 120, render: (value?: string) => value ?? '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 120, render: (value?: string) => value ?? '-' },
    { title: '收款方式', dataIndex: 'receiptMethod', width: 130, render: (value?: string) => value ?? '-' },
    { title: '日期', dataIndex: 'receiptDate', width: 155, render: (value?: string) => (value ? formatBeijingDateTime(value) : '-') },
    { title: '币种', dataIndex: 'currency', width: 90, render: (value?: string) => value ?? 'RMB' },
    { title: '金额', dataIndex: 'amount', width: 120, align: 'right', render: (value: number, row) => `${row.currency ?? 'RMB'} ${value.toFixed(2)}` },
    {
      title: '水单',
      dataIndex: 'voucher',
      width: 120,
      render: (_, row) => row.voucher?.url
        ? <Button size="small" onClick={() => setPreviewUrl(row.voucher?.url)}>查看</Button>
        : row.voucher?.fileName ?? '-'
    },
    { title: '付款编号', dataIndex: 'paymentNo', width: 160, render: (value?: string) => value ?? '-' },
    { title: '状态', dataIndex: 'status', width: 120, render: statusTag },
    {
      title: '匹配订单',
      dataIndex: 'matches',
      width: 220,
      render: (_, row) => row.matches.length ? row.matches.map((match) => renderShipmentOrderNoLink(match.systemOrderNo)).reduce<ReactNode[]>((list, node, index) => [...list, index ? '、' : null, node], []) : '-'
    },
    { title: '匹配金额', dataIndex: 'matchedAmount', width: 120, align: 'right', render: (value: number, row) => `${row.currency ?? 'RMB'} ${value.toFixed(2)}` },
    { title: '余额', dataIndex: 'balance', width: 120, align: 'right', render: (value: number, row) => `${row.currency ?? 'RMB'} ${value.toFixed(2)}` },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 300,
      render: (_, row) => (
        <Space size={6}>
          {canManage ? <Button size="small" onClick={() => openEdit(row)}>编辑</Button> : null}
          {canArrive && row.status === 'PENDING' ? <Button size="small" type="primary" onClick={() => confirmMarkArrived(row)}>到账</Button> : null}
          {canMatch && row.balance > 0 && row.status !== 'PENDING' && row.status !== 'VOIDED' ? <Button size="small" onClick={() => void openMatch(row)}>匹配</Button> : null}
          {canMatch && row.matches.some((match) => !match.voided) ? (
            <Popconfirm title="确认撤销该水单全部匹配？" onConfirm={() => void unmatch(row)}>
              <Button size="small">撤销匹配</Button>
            </Popconfirm>
          ) : null}
          {canVoucher ? <Button size="small" onClick={() => { setVoucherRow(row); voucherForm.setFieldsValue({ voucherImage: row.voucher }); }}>凭证</Button> : null}
          {canArchive && row.balance <= 0 && row.status !== 'ARCHIVED' ? <Button size="small" onClick={() => confirmArchive(row)}>归档</Button> : null}
          {canVoid && row.matchedAmount <= 0 && row.status !== 'VOIDED' ? (
            <Popconfirm title="确认作废该水单？" onConfirm={() => void apiClient.voidWaterReceipt(row.id, { reason: '手动作废' }).then(() => load())}>
              <Button size="small" danger>作废</Button>
            </Popconfirm>
          ) : null}
        </Space>
      )
    }
  ], [apiClient, canArchive, canArrive, canManage, canMatch, canVoid, canVoucher, load, renderShipmentOrderNoLink, voucherForm]);

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card
        title="收款管理"
        extra={<Space><Button onClick={() => void load()}>刷新</Button>{canExport ? <Button onClick={() => void exportRows()}>导出</Button> : null}{canManage ? <Button type="primary" onClick={openCreate}>新增水单</Button> : null}</Space>}
      >
        <Form form={queryForm} layout="vertical" initialValues={defaultQuery} onFinish={(values) => setQuery({ ...defaultQuery, ...values, page: 1 })}>
          <Row gutter={12}>
            <Col xs={24} md={6}><Form.Item name="receiptNo" label="水单编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="customerCode" label="客户编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="salesperson" label="业务员归属"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="receiptMethod" label="收款方式"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="paymentNo" label="付款编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="status" label="状态"><Select options={[{ label: '全部', value: 'ALL' }, { label: '未到账', value: 'PENDING' }, { label: '已到账', value: 'ARRIVED' }, { label: '部分匹配', value: 'PARTIAL_MATCHED' }, { label: '已归档', value: 'ARCHIVED' }, { label: '已作废', value: 'VOIDED' }]} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="dateFrom" label="日期起"><Input type="date" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="dateTo" label="日期止"><Input type="date" /></Form.Item></Col>
          </Row>
          <Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={() => { queryForm.resetFields(); setQuery(defaultQuery); }}>重置</Button></Space>
        </Form>
      </Card>

      <Card>
        <Space size={8} wrap className="finance-work-summary">
          <Text type="secondary">水单 {response.totals.count}</Text>
          <Text type="secondary">已到账 {response.totals.arrivedCount}</Text>
          <Text type="secondary">已归档 {response.totals.archivedCount}</Text>
          <Text strong>金额 {formatCurrency(response.totals.amount)}</Text>
          <Text strong>余额 {formatCurrency(response.totals.balance)}</Text>
        </Space>
        <ManagedTable
          className="finance-work-table"
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 1900 }}
          dataSource={response.rows}
          columns={columns}
          pagination={{
            current: response.pagination.page,
            pageSize: response.pagination.pageSize,
            total: response.pagination.totalItems,
            showSizeChanger: true,
            onChange: (page, pageSize) => setQuery((current) => ({ ...current, page, pageSize }))
          }}
        />
      </Card>

      <Modal title={editing ? '编辑水单' : '新增水单'} open={formOpen} onCancel={() => setFormOpen(false)} onOk={() => void submitForm()} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请选择客户编号' }]}><Select showSearch options={customerOptions} /></Form.Item>
          <Form.Item name="site" label="站点"><Input /></Form.Item>
          <Form.Item name="receiptMethod" label="收款方式"><Select options={['对公', '对私', '支付宝', '微信', '阿里', '账户收款'].map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="receiptDate" label="日期" rules={[{ required: true, message: '请选择日期' }]}><Input type="date" /></Form.Item>
          <Form.Item name="currency" label="币种" rules={[{ required: true, message: '请选择币种' }]}><Select options={['RMB', 'USD'].map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请填写金额' }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
          {editing && editing.status !== 'PENDING' ? <Form.Item name="adjustReason" label="已到账金额修改原因"><Input /></Form.Item> : null}
          <Form.Item name="paymentNo" label="付款编号"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="记录水单凭证" open={Boolean(voucherRow)} onCancel={() => setVoucherRow(null)} onOk={() => void submitVoucher()} destroyOnHidden>
        <Form form={voucherForm} layout="vertical">
          <Form.Item name="voucherImage" label="水单凭证截图">
            <VoucherImageInput
              disabled={!canVoucher || !voucherRow}
              uploadFile={(file) => apiClient.uploadVoucherImage({ file, context: 'WATER_RECEIPT', waterReceiptId: voucherRow?.id }) as Promise<VoucherImageValue>}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="匹配订单应收" open={Boolean(matchRow)} onCancel={() => setMatchRow(null)} onOk={() => void submitMatch()} destroyOnHidden width={760}>
        <Text type="secondary">可用余额：{formatCurrency(matchRow?.balance ?? 0)}</Text>
        <Form form={matchForm} layout="vertical">
          <Form.List name="rows">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                {fields.map((field) => (
                  <Row gutter={12} key={field.key}>
                    <Col span={15}>
                      <Form.Item {...field} name={[field.name, 'receivableFinanceItemId']} label="订单应收" rules={[{ required: true, message: '请选择订单应收' }]}>
                        <Select options={matchableRows.map((row) => ({ value: row.id, label: `${row.systemOrderNo} / ${row.name} / 未收 ${formatCurrency(row.amount - (row.receivedAmount ?? 0))}` }))} />
                      </Form.Item>
                    </Col>
                    <Col span={7}>
                      <Form.Item {...field} name={[field.name, 'amount']} label="匹配金额" rules={[{ required: true, message: '请填写金额' }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
                    </Col>
                    <Col span={2}><Button style={{ marginTop: 30 }} onClick={() => remove(field.name)}>删</Button></Col>
                  </Row>
                ))}
                <Button onClick={() => add()}>增加匹配行</Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal title="水单凭证预览" open={Boolean(previewUrl)} footer={null} onCancel={() => setPreviewUrl(undefined)} destroyOnHidden>
        {previewUrl ? <Image src={previewUrl} alt="水单凭证" style={{ maxWidth: '100%' }} /> : null}
      </Modal>
    </Space>
  );
}
