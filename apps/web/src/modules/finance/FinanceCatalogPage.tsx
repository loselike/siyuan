import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table/interface';
import type {
  FinanceCatalogCategory,
  FinanceCatalogItemInput,
  FinanceCatalogItemSummary
} from '@siyuan/shared';
import {
  financeCatalogCategories,
  financeCatalogCategoryLabels,
  financeCatalogCurrencyOptions,
  normalizeFinanceCatalogCurrency
} from './catalog';

const { Text } = Typography;

export type FinanceCatalogFilters = Record<FinanceCatalogCategory, { keyword: string; enabledOnly: boolean }>;

type FinanceCatalogPageProps = {
  items: FinanceCatalogItemSummary[];
  loading: boolean;
  filters: FinanceCatalogFilters;
  editingItem: FinanceCatalogItemSummary | null;
  editingCategory: FinanceCatalogCategory;
  editorOpen: boolean;
  submitting: boolean;
  form: FormInstance<FinanceCatalogItemInput>;
  pagination: TablePaginationConfig;
  title?: string;
  categories?: FinanceCatalogCategory[];
  canWrite?: boolean;
  onFilterChange: (category: FinanceCatalogCategory, patch: Partial<{ keyword: string; enabledOnly: boolean }>) => void;
  onRefresh: () => void | Promise<void>;
  onCreate: (category: FinanceCatalogCategory) => void;
  onEdit: (item: FinanceCatalogItemSummary) => void;
  onToggle: (item: FinanceCatalogItemSummary) => void | Promise<void>;
  onMove: (category: FinanceCatalogCategory, id: string, direction: -1 | 1) => void | Promise<void>;
  onCloseEditor: () => void;
  onSubmit: (values: FinanceCatalogItemInput) => void | Promise<void>;
};

function getCategoryRows(
  items: FinanceCatalogItemSummary[],
  filters: FinanceCatalogFilters,
  category: FinanceCatalogCategory
) {
  const filter = filters[category];
  const keyword = filter.keyword.trim().toLowerCase();
  return items
    .filter((item) => item.category === category)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
    .filter((item) => !filter.enabledOnly || item.enabled)
    .filter((item) => {
      if (!keyword) return true;
      return [item.name, item.currency, item.remark].some((value) => (value ?? '').toLowerCase().includes(keyword));
    });
}

export function FinanceCatalogPage({
  items,
  loading,
  filters,
  editingItem,
  editingCategory,
  editorOpen,
  submitting,
  form,
  pagination,
  title = '财务资料库',
  categories = financeCatalogCategories,
  canWrite = true,
  onFilterChange,
  onRefresh,
  onCreate,
  onEdit,
  onToggle,
  onMove,
  onCloseEditor,
  onSubmit
}: FinanceCatalogPageProps) {
  const createColumns = (category: FinanceCatalogCategory): ColumnsType<FinanceCatalogItemSummary> => {
    const columns: ColumnsType<FinanceCatalogItemSummary> = [
      { title: '排序', dataIndex: 'sortOrder', width: 70, align: 'center' },
      {
        title: financeCatalogCategoryLabels[category],
        dataIndex: 'name',
        width: 260,
        className: 'finance-catalog-name-column',
        render: (value: string, row) => (
          <Space direction="vertical" size={2} className="finance-catalog-name-cell">
            <Text strong className="finance-catalog-name-text">{value}</Text>
            {row.remark ? <Text type="secondary" className="table-compact-text">{row.remark}</Text> : null}
          </Space>
        )
      }
    ];

    if (category !== 'CARGO_TYPE') {
      columns.push({
        title: '默认币种',
        dataIndex: 'currency',
        width: 120,
        render: (value?: string) => {
          const currency = normalizeFinanceCatalogCurrency(value);
          return currency ? <Tag color={currency === 'USD' ? 'blue' : 'default'}>{currency}</Tag> : '-';
        }
      });
    }

    columns.push(
      {
        title: '状态',
        dataIndex: 'enabled',
        width: 95,
        render: (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '停用'}</Tag>
      },
      ...(canWrite ? [{
        title: '排序调整',
        key: 'sort',
        width: 180,
        render: (_: unknown, row: FinanceCatalogItemSummary) => (
          <Space size={6} className="finance-catalog-inline-actions">
            <Button size="small" onClick={() => void onMove(category, row.id, -1)}>上移</Button>
            <Button size="small" onClick={() => void onMove(category, row.id, 1)}>下移</Button>
          </Space>
        )
      }] : []),
      {
        title: '操作',
        key: 'actions',
        width: 180,
        fixed: 'right',
        render: (_, row) => (
          <Space size={6} className="finance-catalog-inline-actions">
            <Button size="small" disabled={!canWrite} onClick={() => onEdit(row)}>编辑</Button>
            <Popconfirm
              title={`确认${row.enabled ? '停用' : '启用'}该资料？`}
              onConfirm={() => void onToggle(row)}
              okText="确认"
              cancelText="取消"
              disabled={!canWrite}
            >
              <Button size="small" danger={row.enabled} disabled={!canWrite}>{row.enabled ? '停用' : '启用'}</Button>
            </Popconfirm>
          </Space>
        )
      }
    );

    return columns;
  };

  const renderSection = (category: FinanceCatalogCategory) => {
    const rows = getCategoryRows(items, filters, category);
    return (
      <Card
        key={category}
        className="finance-catalog-card"
        title={(
          <span className="finance-catalog-title">
            <span className="finance-catalog-title-main">{financeCatalogCategoryLabels[category]}</span>
          </span>
        )}
        extra={<Button size="small" type="primary" disabled={!canWrite} onClick={() => onCreate(category)}>新增</Button>}
      >
        <div className="finance-catalog-toolbar">
          <Input
            allowClear
            placeholder={`搜索${financeCatalogCategoryLabels[category]}`}
            value={filters[category].keyword}
            onChange={(event) => onFilterChange(category, { keyword: event.target.value })}
          />
          <Checkbox
            checked={filters[category].enabledOnly}
            onChange={(event) => onFilterChange(category, { enabledOnly: event.target.checked })}
          >
            只看启用
          </Checkbox>
          <Button onClick={() => void onRefresh()}>刷新</Button>
        </div>
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          pagination={pagination}
          dataSource={rows}
          columns={createColumns(category)}
          rowClassName={(record) => (record.enabled ? '' : 'finance-catalog-disabled-row')}
          className="finance-catalog-table"
          scroll={{ x: category === 'CARGO_TYPE' ? 820 : 960 }}
        />
      </Card>
    );
  };

  return (
    <>
      <Card title={title}>
        <div className="finance-catalog-grid">
          {categories.map(renderSection)}
        </div>
      </Card>
      <Modal
        title={`${editingItem ? '编辑' : '新增'}${financeCatalogCategoryLabels[editingCategory]}`}
        open={editorOpen}
        onCancel={onCloseEditor}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnClose
        okText={editingItem ? '保存修改' : '新增'}
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => void onSubmit(values)}
          initialValues={{ enabled: true }}
        >
          <Form.Item name="category" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label={financeCatalogCategoryLabels[editingCategory]}
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
          {editingCategory !== 'CARGO_TYPE' ? (
            <Form.Item
              label="默认币种"
              name="currency"
              rules={[{ required: editingCategory === 'SETTLEMENT_METHOD', message: '请选择默认币种' }]}
            >
              <Select options={financeCatalogCurrencyOptions.map((value) => ({ label: value, value }))} />
            </Form.Item>
          ) : null}
          <Form.Item label="排序" name="sortOrder">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="可填写用途、匹配规则或说明" />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked">
            <Checkbox>启用</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
