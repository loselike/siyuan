import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Image, Input, InputNumber, message, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  CustomerSummary,
  ReceivableAuditSummary,
  WaterReceiptCreateInput,
  WaterReceiptListQuery,
  WaterReceiptListResponse,
  WaterReceiptVoucherSummary,
  WaterReceiptSummary
} from '@siyuan/shared';
import type { ApiClient, PermissionKey } from '../../../apiClient';
import { resolveApiAssetUrl } from '../../../apiClient';
import { downloadCsv } from '../exportCsv';
import { VoucherImageInput, type VoucherImageValue } from '../VoucherImageInput';
import { formatBeijingDateTime, formatCurrency } from '../../shared/format';
import { AppDatePicker, ConfirmActionButton, ManagedTable } from '../../shared/ui';

const { Text } = Typography;

type WaterReceiptPageProps = {
  mode?: 'arrival' | 'matching';
  apiClient: ApiClient;
  permissions: PermissionKey[];
  customers: CustomerSummary[];
  settlementOptions: Array<{ label: string; value: string }>;
  renderShipmentOrderNoLink: (systemOrderNo?: string) => ReactNode;
};

type VoucherFormValues = { voucherImage?: VoucherImageValue };
type MatchFormValues = { rows: Array<{ receivableFinanceItemId?: string; amount?: number }> };

const defaultQuery: WaterReceiptListQuery = { page: 1, pageSize: 10, status: 'ALL', sortBy: 'receiptDate', sortOrder: 'desc' };
const arrivalDefaultQuery: WaterReceiptListQuery = { ...defaultQuery, status: 'PENDING' };

function hasPermission(permissions: PermissionKey[], permission: PermissionKey) {
  return permissions.includes(permission);
}

function arrivalStatusTag(status: WaterReceiptSummary['status']) {
  return <Tag color={status === 'PENDING' ? 'default' : 'processing'}>{status === 'PENDING' ? '未到账' : '已到账'}</Tag>;
}

function matchStatusTag(row: Pick<WaterReceiptSummary, 'status' | 'balance'>) {
  if (row.status === 'PENDING') return <Tag>未匹配</Tag>;
  return <Tag color={Number(row.balance) <= 0 ? 'success' : 'warning'}>{Number(row.balance) <= 0 ? '已匹配' : '未匹配'}</Tag>;
}

function statusLabel(status: WaterReceiptSummary['status']) {
  const map: Record<WaterReceiptSummary['status'], string> = {
    PENDING: '未到账',
    ARRIVED: '已到账',
    PARTIAL_MATCHED: '部分匹配',
    MATCHED: '已匹配',
    ARCHIVED: '已归档',
    VOIDED: '已作废'
  };
  return map[status] ?? status;
}

function formatPlainAmount(value?: number) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

export function WaterReceiptPage({ mode = 'matching', apiClient, permissions, customers, settlementOptions, renderShipmentOrderNoLink }: WaterReceiptPageProps) {
  const [queryForm] = Form.useForm<WaterReceiptListQuery>();
  const [form] = Form.useForm<WaterReceiptCreateInput>();
  const [voucherForm] = Form.useForm<VoucherFormValues>();
  const [matchForm] = Form.useForm<MatchFormValues>();
  const pageDefaultQuery = mode === 'arrival' ? arrivalDefaultQuery : defaultQuery;
  const isMatchingMode = mode === 'matching';
  const pageTitle = mode === 'arrival' ? '水单到账查询' : '水单订单匹配';
  const [query, setQuery] = useState<WaterReceiptListQuery>(pageDefaultQuery);
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
  const [previewVoucher, setPreviewVoucher] = useState<WaterReceiptVoucherSummary>();
  const [createVoucherFile, setCreateVoucherFile] = useState<File>();
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(() => new Set());

  const canManage = hasPermission(permissions, 'finance:water-receipt:update');
  const canCreate = hasPermission(permissions, 'finance:water-receipt:create');
  const canArrive = hasPermission(permissions, 'finance:water-receipt:arrive');
  const canMatch = hasPermission(permissions, 'finance:water-match:create');
  const canVoid = hasPermission(permissions, 'finance:water-receipt:void');
  const canArchive = hasPermission(permissions, 'finance:water-receipt:archive');
  const canExport = hasPermission(permissions, 'finance:water-receipt:export');
  const canVoucher = hasPermission(permissions, 'finance:water-receipt:voucher-upload');

  const customerOptions = useMemo(() => customers
    .filter((customer) => customer.enabled)
    .sort((left, right) => left.code.localeCompare(right.code, 'zh-CN'))
    .map((customer) => ({
      label: `${customer.code} - ${customer.name}`,
      value: customer.code
    })), [customers]);
  const statusOptions = mode === 'arrival'
    ? [{ label: '未到账', value: 'PENDING' }, { label: '已到账', value: 'ARRIVED' }]
    : [{ label: '全部', value: 'ALL' }, { label: '未到账', value: 'PENDING' }, { label: '已到账', value: 'ARRIVED' }];
  const editorSettlementOptions = useMemo(() => {
    if (!editing?.receiptMethod || settlementOptions.some((item) => item.value === editing.receiptMethod)) return settlementOptions;
    return [...settlementOptions, { value: editing.receiptMethod, label: `${editing.receiptMethod} · 已停用（请改选启用结算方式）` }];
  }, [editing?.receiptMethod, settlementOptions]);

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
    form.resetFields();
    setCreateVoucherFile(undefined);
    form.setFieldsValue({ site: '思远收款', receiptMethod: settlementOptions[0]?.value, receiptDate: new Date().toISOString().slice(0, 10), currency: 'RMB', amount: 0, paymentNo: undefined });
    setFormOpen(true);
  };

  const openEdit = (row: WaterReceiptSummary) => {
    setEditing(row);
    setCreateVoucherFile(undefined);
    form.resetFields();
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
        const created = await apiClient.createWaterReceipt(values);
        if (createVoucherFile) {
          await apiClient.uploadVoucherImage({ file: createVoucherFile, context: 'WATER_RECEIPT', waterReceiptId: created.id });
        }
        message.success('水单已新增');
      }
      setFormOpen(false);
      form.resetFields();
      setCreateVoucherFile(undefined);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存水单失败');
    }
  };

  const markArrived = async (row: WaterReceiptSummary) => {
    setArrivingIds((current) => new Set(current).add(row.id));
    try {
      const arrived = await apiClient.markWaterReceiptArrived(row.id, {});
      setResponse((current) => ({
        ...current,
        rows: current.rows.map((item) => (item.id === arrived.id ? arrived : item))
      }));
      message.success('已标记到账');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标记到账失败');
    } finally {
      setArrivingIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    }
  };

  const openMatch = async (row: WaterReceiptSummary) => {
    if (!['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status)) {
      message.warning(row.status === 'PENDING' ? '水单未到账，不能匹配订单' : '当前水单不能匹配订单');
      return;
    }
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

  const deleteVoucher = async () => {
    if (!voucherRow) return;
    try {
      await apiClient.deleteWaterReceiptVoucher(voucherRow.id);
      voucherForm.resetFields();
      setVoucherRow((current) => current ? { ...current, voucher: undefined } : current);
      message.success('水单凭证已删除');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除凭证失败');
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
        { key: 'receiptNo', label: '系统水单号' },
        { key: 'salesperson', label: '业务员归属' },
        { key: 'customerCode', label: '客户编号' },
        { key: 'receiptMethod', label: '结算方式' },
        { key: 'receiptDate', label: '日期' },
        { key: 'currency', label: '币种' },
        { key: 'amount', label: '金额' },
        { key: 'paymentNo', label: '水单编号' },
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
    { title: '系统水单号', dataIndex: 'receiptNo', width: 150 },
    { title: '业务员归属', dataIndex: 'salesperson', width: 120, render: (value?: string) => value ?? '-' },
    { title: '客户编号', dataIndex: 'customerCode', width: 120, render: (value?: string) => value ?? '-' },
    { title: '结算方式', dataIndex: 'receiptMethod', width: 130, render: (value?: string) => value ?? '-' },
    { title: '日期', dataIndex: 'receiptDate', width: 155, render: (value?: string) => (value ? formatBeijingDateTime(value) : '-') },
    { title: '币种', dataIndex: 'currency', width: 90, render: (value?: string) => value ?? 'RMB' },
    { title: '金额', dataIndex: 'amount', width: 120, align: 'right', render: (value: number) => formatPlainAmount(value) },
    {
      title: '凭证',
      dataIndex: 'voucher',
      width: 220,
      render: (_, row) => {
        if (!canVoucher) return '-';
        if (!row.voucher) return <Button size="small" onClick={() => { setVoucherRow(row); voucherForm.resetFields(); }}>凭证</Button>;
        return (
          <Space size={6} wrap>
            {row.voucher.url ? <Button size="small" onClick={() => setPreviewVoucher(row.voucher)}>查看</Button> : null}
            <Button size="small" onClick={() => { setVoucherRow(row); voucherForm.setFieldsValue({ voucherImage: row.voucher }); }}>凭证</Button>
            <Text>{row.voucher.fileName}</Text>
          </Space>
        );
      }
    },
    { title: '水单编号', dataIndex: 'paymentNo', width: 160, render: (value?: string) => value ?? '-' },
    { title: '到账状态', dataIndex: 'status', width: 110, render: arrivalStatusTag },
    { title: '匹配状态', key: 'matchStatus', width: 110, render: (_, row) => matchStatusTag(row) },
    {
      title: '匹配订单',
      dataIndex: 'matches',
      width: 220,
      render: (_, row) => row.matches.length ? row.matches.map((match) => (
        <Space key={match.id} size={4}>{renderShipmentOrderNoLink(match.systemOrderNo)}<Tag color={match.source === 'AUTO' ? 'green' : 'blue'}>{match.source === 'AUTO' ? '自动' : '手动'}</Tag></Space>
      )) : '-'
    },
    { title: '匹配金额', dataIndex: 'matchedAmount', width: 140, align: 'right', render: (value: number, row) => `${formatPlainAmount(value)}/${formatPlainAmount(row.amount)}` },
    { title: '余额', dataIndex: 'balance', width: 120, align: 'right', render: (value: number) => formatPlainAmount(value) },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 300,
      render: (_, row) => (
        <Space size={6}>
          {canManage ? <Button size="small" onClick={() => openEdit(row)}>编辑</Button> : null}
          {canArrive && row.status === 'PENDING' ? (
            <ConfirmActionButton
              size="small"
              type="primary"
              loading={arrivingIds.has(row.id)}
              disabled={arrivingIds.has(row.id)}
              actionName="到账"
              objectName={row.receiptNo}
              currentStatus={statusLabel(row.status)}
              nextStatus="已到账"
              count={1}
              amount={formatPlainAmount(row.amount)}
              currency={row.currency ?? 'RMB'}
              riskTip="到账后该水单会进入可匹配范围，并影响客户收款余额。"
              risk="warning"
              onConfirm={() => markArrived(row)}
            >
              到账
            </ConfirmActionButton>
          ) : null}
          {isMatchingMode && canMatch && row.balance > 0 && ['ARRIVED', 'PARTIAL_MATCHED'].includes(row.status) ? <Button size="small" onClick={() => void openMatch(row)}>匹配</Button> : null}
          {isMatchingMode && canMatch && row.balance > 0 && row.status === 'PENDING' ? <Button size="small" disabled title="水单未到账，不能匹配订单">匹配</Button> : null}
          {canMatch && row.matches.some((match) => !match.voided) ? (
            <Popconfirm title="确认撤销该水单全部匹配？" onConfirm={() => void unmatch(row)}>
              <Button size="small">撤销匹配</Button>
            </Popconfirm>
          ) : null}
          {canArchive && row.balance <= 0 && row.status !== 'ARCHIVED' ? (
            <ConfirmActionButton
              size="small"
              actionName="归档"
              objectName={row.receiptNo}
              currentStatus={statusLabel(row.status)}
              nextStatus="已归档"
              count={1}
              amount={formatPlainAmount(row.balance)}
              currency={row.currency ?? 'RMB'}
              riskTip="归档后该水单默认不再出现在待匹配列表，后续需按归档状态查询。"
              risk="warning"
              onConfirm={async () => {
                await apiClient.archiveWaterReceipt(row.id);
                await load();
              }}
            >
              归档
            </ConfirmActionButton>
          ) : null}
          {canVoid && row.matchedAmount <= 0 && row.status !== 'VOIDED' ? (
            <ConfirmActionButton
              size="small"
              danger
              actionName="作废"
              objectName={row.receiptNo}
              currentStatus={statusLabel(row.status)}
              nextStatus="已作废"
              count={1}
              amount={formatPlainAmount(row.amount)}
              currency={row.currency ?? 'RMB'}
              riskTip="作废后该水单不能再用于到账或匹配，本次原因会写入审计。"
              requireReason
              risk="danger"
              onConfirm={async (reason) => {
                await apiClient.voidWaterReceipt(row.id, { reason });
                message.success('水单已作废');
                await load();
              }}
            >
              作废
            </ConfirmActionButton>
          ) : null}
        </Space>
      )
    }
  ], [apiClient, arrivingIds, canArchive, canArrive, canManage, canMatch, canVoid, canVoucher, isMatchingMode, load, renderShipmentOrderNoLink, voucherForm]);

  return (
    <Space direction="vertical" size={12} className="finance-workspace">
      <Card
        title={pageTitle}
        className="finance-filter-card"
        extra={<Space><Button onClick={() => void load()}>刷新</Button>{canExport ? <Button onClick={() => void exportRows()}>导出</Button> : null}{canCreate ? <Button type="primary" onClick={openCreate}>新增水单</Button> : null}</Space>}
      >
        <Form form={queryForm} layout="vertical" initialValues={pageDefaultQuery} onFinish={(values) => setQuery({ ...pageDefaultQuery, ...values, page: 1 })}>
          <Row gutter={12}>
            <Col xs={24} md={6}><Form.Item name="receiptNo" label="系统水单号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="customerCode" label="客户编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="salesperson" label="业务员归属"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="receiptMethod" label="结算方式"><Select allowClear options={settlementOptions} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="paymentNo" label="水单编号"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="status" label="到账状态"><Select options={statusOptions} /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="dateFrom" label="日期起"><AppDatePicker /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item name="dateTo" label="日期止"><AppDatePicker /></Form.Item></Col>
          </Row>
          <Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={() => { queryForm.resetFields(); setQuery(pageDefaultQuery); }}>重置</Button></Space>
        </Form>
      </Card>

      <Card className="finance-table-card">
        <Space size={8} wrap className="finance-work-status-strip finance-work-summary">
          <Text type="secondary">未匹配到账 {response.totals.arrivedCount}</Text>
          <Text strong>金额 {formatPlainAmount(response.totals.amount)}</Text>
          <Text strong>余额 {formatPlainAmount(response.totals.balance)}</Text>
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

      <Modal title={editing ? '编辑水单' : '新增水单'} className="finance-modal" width={760} open={formOpen} onCancel={() => setFormOpen(false)} onOk={() => void submitForm()} destroyOnHidden>
        <Form form={form} layout="vertical">
          {editing ? <Form.Item label="系统水单号"><Input aria-label="系统水单号" value={editing.receiptNo} readOnly /></Form.Item> : null}
          <Form.Item name="customerCode" label="客户编号" rules={[{ required: true, message: '请选择客户编号' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="输入客户编号或名称搜索"
              options={customerOptions}
            />
          </Form.Item>
          <Form.Item name="site" label="站点"><Input /></Form.Item>
          {editing?.receiptMethod && !settlementOptions.some((item) => item.value === editing.receiptMethod) ? <Text type="warning">当前历史结算方式已停用，保存前请改选启用结算方式。</Text> : null}
          <Form.Item name="receiptMethod" label="结算方式" rules={[{ required: true, message: '请选择结算方式' }]}><Select aria-label="结算方式" options={editorSettlementOptions} /></Form.Item>
          <Form.Item name="receiptDate" label="日期" rules={[{ required: true, message: '请选择日期' }]}><AppDatePicker /></Form.Item>
          <Form.Item name="currency" label="币种" rules={[{ required: true, message: '请选择币种' }]}><Select options={['RMB', 'USD'].map((value) => ({ label: value, value }))} /></Form.Item>
          <Form.Item name="amount" label="金额" rules={[{ required: true, message: '请填写金额' }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
          {editing && editing.status !== 'PENDING' ? <Form.Item name="adjustReason" label="已到账金额修改原因"><Input /></Form.Item> : null}
          <Form.Item name="paymentNo" label="水单编号" rules={[{ required: true, whitespace: true, message: '请填写水单编号' }]}><Input aria-label="水单编号" /></Form.Item>
          {!editing ? <Form.Item label="水单图片（可选）"><VoucherImageInput onFileChange={setCreateVoucherFile} /></Form.Item> : null}
          <Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="记录水单凭证" className="finance-modal" width={720} open={Boolean(voucherRow)} onCancel={() => setVoucherRow(null)} onOk={() => void submitVoucher()} destroyOnHidden>
        <Form form={voucherForm} layout="vertical">
          <Form.Item name="voucherImage" label="水单凭证截图">
            <VoucherImageInput
              disabled={!canVoucher || !voucherRow}
              uploadFile={(file) => apiClient.uploadVoucherImage({ file, context: 'WATER_RECEIPT', waterReceiptId: voucherRow?.id }) as Promise<VoucherImageValue>}
              onUploaded={(voucher) => setVoucherRow((current) => current
                ? {
                    ...current,
                    voucher: {
                      ...voucher,
                      id: current.voucher?.id ?? `water-receipt-voucher-${current.id}`,
                      waterReceiptId: current.id
                    }
                  }
                : current)}
            />
          </Form.Item>
          {!voucherRow?.voucher ? <Text type="secondary">暂无水单图片</Text> : null}
          {voucherRow?.voucher ? <Popconfirm title="确认删除水单凭证？" onConfirm={() => void deleteVoucher()}><Button danger>删除图片</Button></Popconfirm> : null}
        </Form>
      </Modal>

      <Modal title="匹配订单应收" className="finance-modal" open={Boolean(matchRow)} onCancel={() => setMatchRow(null)} onOk={() => void submitMatch()} destroyOnHidden width={860}>
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

      <Modal title="水单凭证预览" className="finance-modal finance-preview-modal" width={760} open={Boolean(previewVoucher)} footer={null} onCancel={() => setPreviewVoucher(undefined)} destroyOnHidden>
        {previewVoucher ? (
          <Space direction="vertical" className="full-width">
            <Text>{previewVoucher.fileName}</Text>
            {previewVoucher.url ? (
              <Image
                src={resolveApiAssetUrl(previewVoucher.url)}
                alt={previewVoucher.fileName}
                style={{ maxWidth: '100%' }}
                onError={() => message.error('图片预览加载失败')}
              />
            ) : null}
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
}
