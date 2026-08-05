import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CustomerSourceInput, CustomerSourceSummary } from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import { ManagedTable, tenRowTablePagination } from '../shared/ui';
import { formatBeijingDateTime } from '../shared/format';

const { Text } = Typography;

interface CustomerSourcesPageProps {
  apiClient: ApiClient;
  canWrite: boolean;
  canDelete: boolean;
  onNotice: (message: string) => void;
}

export function CustomerSourcesPage({ apiClient, canWrite, canDelete, onNotice }: CustomerSourcesPageProps) {
  const [rows, setRows] = useState<CustomerSourceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerSourceSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<CustomerSourceInput>();

  const loadRows = useCallback(async (searchKeyword = '') => {
    setLoading(true);
    try {
      const response = await apiClient.customerSources({ keyword: searchKeyword.trim() || undefined });
      setRows(response.items);
    } catch (error) {
      onNotice(error instanceof Error ? `客户来源加载失败：${error.message}` : '客户来源加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, onNotice]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const visibleRows = useMemo(() => rows.filter((row) => (
    status === 'ALL' || (status === 'ENABLED' ? row.enabled : !row.enabled)
  )), [rows, status]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ name: '', remark: '', enabled: true });
    setEditorOpen(true);
  };

  const openEdit = (row: CustomerSourceSummary) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, remark: row.remark, enabled: row.enabled });
    setEditorOpen(true);
  };

  const submit = async (values: CustomerSourceInput) => {
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.updateCustomerSource(editing.id, values);
        onNotice('客户来源已更新');
      } else {
        await apiClient.createCustomerSource(values);
        onNotice('客户来源已新增');
      }
      setEditorOpen(false);
      form.resetFields();
      await loadRows(keyword);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '客户来源保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (row: CustomerSourceSummary) => {
    try {
      await apiClient.deleteCustomerSource(row.id);
      onNotice('客户来源已删除');
      await loadRows(keyword);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '客户来源删除失败');
    }
  };

  const columns: ColumnsType<CustomerSourceSummary> = [
    {
      title: '客户来源',
      dataIndex: 'name',
      width: 220,
      render: (value: string) => <Text strong>{value}</Text>
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '停用'}</Tag>
    },
    {
      title: '使用客户',
      dataIndex: 'customerCount',
      width: 110,
      sorter: (left, right) => left.customerCount - right.customerCount,
      render: (value: number) => `${value} 个`
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value?: string) => value || '-'
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 170,
      render: (value?: string) => value ? formatBeijingDateTime(value) : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: canWrite || canDelete ? 150 : 76,
      fixed: 'right',
      render: (_: unknown, row: CustomerSourceSummary) => canWrite || canDelete ? (
        <Space size={4}>
          {canWrite ? <Button size="small" onClick={() => openEdit(row)}>修改</Button> : null}
          {canDelete ? (
            <Popconfirm
              title="确认删除该客户来源？"
              description={row.customerCount > 0 ? `删除后不再用于新客户选择，已有 ${row.customerCount} 个客户的历史来源文字会保留。` : '删除后不再用于新客户选择。'}
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => void remove(row)}
            >
              <Button size="small" danger>删除</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ) : <Tag>只读</Tag>
    }
  ];

  return (
    <>
      <Card
        className="finance-work-card"
        title="客户来源"
        extra={canWrite ? <Button type="primary" onClick={openCreate}>新增客户来源</Button> : null}
      >
        <div className="payer-bank-toolbar">
          <Input.Search
            allowClear
            enterButton="查询"
            placeholder="搜索来源名称或备注"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onSearch={(value) => void loadRows(value)}
          />
          <Select
            aria-label="客户来源状态"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'ALL', label: '全部状态' },
              { value: 'ENABLED', label: '启用' },
              { value: 'DISABLED', label: '停用' }
            ]}
          />
          <Button onClick={() => void loadRows(keyword)}>刷新</Button>
        </div>
        <ManagedTable
          rowKey="id"
          size="small"
          loading={loading}
          pagination={tenRowTablePagination}
          dataSource={visibleRows}
          columns={columns}
          scroll={{ x: 920 }}
          locale={{ emptyText: '暂无客户来源' }}
          recordDetail={{ title: '客户来源详情' }}
        />
      </Card>

      <Modal
        title={editing ? '编辑客户来源' : '新增客户来源'}
        open={editorOpen}
        width={620}
        confirmLoading={submitting}
        okText={editing ? '保存修改' : '确认新增'}
        cancelText="取消"
        onCancel={() => setEditorOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={(values) => void submit(values)} initialValues={{ enabled: true }}>
          <Row gutter={12}>
            <Col xs={24} md={16}>
              <Form.Item
                name="name"
                label="来源名称"
                rules={[
                  { required: true, whitespace: true, message: '请输入来源名称' },
                  { max: 80, message: '来源名称不能超过 80 个字符' }
                ]}
              >
                <Input placeholder="例如：展会、转介绍、线上询盘" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="enabled" valuePropName="checked" label="状态">
                <Checkbox>启用并用于下拉选择</Checkbox>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注" rules={[{ max: 500, message: '备注不能超过 500 个字符' }]}>
            <Input.TextArea rows={3} showCount maxLength={500} placeholder="可填写来源说明或适用场景" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
