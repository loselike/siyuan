import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PayerBankAccountInput, PayerBankAccountSummary } from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import { ManagedTable, tenRowTablePagination } from '../shared/ui';

const { Text } = Typography;

interface PayerBankAccountsPageProps {
  apiClient: ApiClient;
  canWrite: boolean;
  onNotice: (message: string) => void;
}

export function PayerBankAccountsPage({
  apiClient,
  canWrite,
  onNotice
}: PayerBankAccountsPageProps) {
  const [rows, setRows] = useState<PayerBankAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PayerBankAccountSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<PayerBankAccountInput>();

  const loadRows = useCallback(async (searchKeyword: string) => {
    setLoading(true);
    try {
      const response = await apiClient.payerBankAccounts({ keyword: searchKeyword.trim() || undefined });
      setRows(response.items);
    } catch (error) {
      onNotice(error instanceof Error ? `付款银行资料加载失败：${error.message}` : '付款银行资料加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, onNotice]);

  useEffect(() => {
    void loadRows('');
  }, [loadRows]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setEditorOpen(true);
  };

  const openEdit = (row: PayerBankAccountSummary) => {
    setEditing(row);
    form.setFieldsValue({
      bankName: row.bankName,
      accountName: row.accountName,
      accountNo: row.accountNo,
      remark: row.remark
    });
    setEditorOpen(true);
  };

  const submit = async (values: PayerBankAccountInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.updatePayerBankAccount(editing.id, values);
        onNotice('付款银行资料已更新');
      } else {
        await apiClient.createPayerBankAccount(values);
        onNotice('付款银行资料已新增');
      }
      setEditorOpen(false);
      form.resetFields();
      await loadRows(keyword);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '付款银行资料保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row: PayerBankAccountSummary) => {
    try {
      await apiClient.deletePayerBankAccount(row.id);
      onNotice('付款银行资料已删除');
      await loadRows(keyword);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '付款银行资料删除失败');
    }
  };

  const columns: ColumnsType<PayerBankAccountSummary> = [
    {
      title: '付款方银行',
      dataIndex: 'bankName',
      width: 220,
      render: (value: string) => <Text strong>{value}</Text>
    },
    { title: '付款方户名', dataIndex: 'accountName', width: 220 },
    {
      title: '付款方账号',
      dataIndex: 'accountNo',
      width: 260,
      render: (value: string) => (
        <Text className="payer-bank-account-number" copyable={{ text: value }}>{value}</Text>
      )
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value?: string) => value || '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: canWrite ? 142 : 76,
      fixed: 'right',
      render: (_: unknown, row: PayerBankAccountSummary) => canWrite ? (
        <Space size={4}>
          <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
          <Popconfirm
            title="确认删除该付款银行资料？"
            description="删除后不能恢复，请确认该账号已不再使用。"
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => void remove(row)}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ) : <Tag>只读</Tag>
    }
  ];

  return (
    <>
      <Card
        className="finance-work-card"
        title="付款银行资料"
        extra={canWrite ? <Button type="primary" onClick={openCreate}>新增付款银行</Button> : null}
      >
        <div className="payer-bank-toolbar">
          <Input.Search
            allowClear
            enterButton="查询"
            placeholder="搜索银行、户名或备注"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onSearch={(value) => void loadRows(value)}
          />
          <Button onClick={() => void loadRows(keyword)}>刷新</Button>
        </div>
        <ManagedTable
          rowKey="id"
          size="small"
          loading={loading}
          pagination={tenRowTablePagination}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 980 }}
          locale={{ emptyText: '暂无付款银行资料' }}
          recordDetail={{ title: '付款银行资料详情' }}
        />
      </Card>

      <Modal
        title={editing ? '编辑付款银行资料' : '新增付款银行资料'}
        open={editorOpen}
        width={680}
        confirmLoading={submitting}
        okText={editing ? '保存修改' : '确认新增'}
        cancelText="取消"
        onCancel={() => setEditorOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => void submit(values)}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="bankName"
                label="付款方银行"
                rules={[
                  { required: true, whitespace: true, message: '请输入付款方银行' },
                  { max: 120, message: '付款方银行不能超过 120 个字符' }
                ]}
              >
                <Input placeholder="例如：中国银行深圳分行" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="accountName"
                label="付款方户名"
                rules={[
                  { required: true, whitespace: true, message: '请输入付款方户名' },
                  { max: 120, message: '付款方户名不能超过 120 个字符' }
                ]}
              >
                <Input placeholder="请输入银行账户户名" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="accountNo"
            label="付款方账号"
            rules={[
              { required: true, whitespace: true, message: '请输入付款方账号' },
              { max: 80, message: '付款方账号不能超过 80 个字符' }
            ]}
          >
            <Input className="payer-bank-account-number" placeholder="请输入银行账号" />
          </Form.Item>
          <Form.Item
            name="remark"
            label="备注"
            rules={[{ max: 500, message: '备注不能超过 500 个字符' }]}
          >
            <Input.TextArea rows={3} showCount maxLength={500} placeholder="可填写用途、币种或其他说明" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
