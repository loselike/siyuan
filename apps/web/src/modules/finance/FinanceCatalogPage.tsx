import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select, Space, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd/es/form';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table/interface';
import type {
  FinanceCatalogCategory,
  FinanceCatalogItemInput,
  FinanceCatalogItemSummary
} from '@siyuan/shared/finance-catalog';
import {
  financeCatalogCategories,
  financeCatalogCategoryLabels,
  financeCatalogCurrencyOptions,
  normalizeFinanceCatalogCurrency
} from './catalog';
import { ManagedTable } from '../shared/ui';

const { Text } = Typography;

export type FinanceCatalogFilters = Record<FinanceCatalogCategory, { keyword: string; enabledOnly: boolean }>;
export type FinanceCatalogCapabilities = Partial<Record<FinanceCatalogCategory, {
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  reorder?: boolean;
}>>;

const financeCatalogTableScrollX: Record<'write' | 'read', Record<FinanceCatalogCategory, number>> = {
  write: {
    FEE_NAME: 984,
    SETTLEMENT_METHOD: 984,
    CARGO_TYPE: 886,
    PRODUCT_NAME: 984
  },
  read: {
    FEE_NAME: 764,
    SETTLEMENT_METHOD: 764,
    CARGO_TYPE: 686,
    PRODUCT_NAME: 764
  }
};

type FinanceCatalogPageProps = {
  items: FinanceCatalogItemSummary[];
  loading: boolean;
  filters: FinanceCatalogFilters;
  editingItem: FinanceCatalogItemSummary | null;
  editingCategory: FinanceCatalogCategory;
  editorOpen: boolean;
  submitting: boolean;
  form: FormInstance<FinanceCatalogItemInput>;
  pagination: TablePaginationConfig | false;
  title?: string;
  categories?: FinanceCatalogCategory[];
  canWrite?: boolean;
  capabilities?: FinanceCatalogCapabilities;
  onFilterChange: (category: FinanceCatalogCategory, patch: Partial<{ keyword: string; enabledOnly: boolean }>) => void;
  onRefresh: () => void | Promise<void>;
  onCreate: (category: FinanceCatalogCategory) => void;
  onEdit: (item: FinanceCatalogItemSummary) => void;
  onToggle: (item: FinanceCatalogItemSummary) => void | Promise<void>;
  onDelete: (item: FinanceCatalogItemSummary) => void | Promise<void>;
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
  capabilities,
  onFilterChange,
  onRefresh,
  onCreate,
  onEdit,
  onToggle,
  onDelete,
  onMove,
  onCloseEditor,
  onSubmit
}: FinanceCatalogPageProps) {
  const visibleCategories = useMemo(
    () => categories.length > 0 ? categories : financeCatalogCategories,
    [categories]
  );
  const [activeCategory, setActiveCategory] = useState<FinanceCatalogCategory>(visibleCategories[0] ?? 'FEE_NAME');

  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory(visibleCategories[0] ?? 'FEE_NAME');
    }
  }, [activeCategory, visibleCategories]);

  const createColumns = (category: FinanceCatalogCategory): ColumnsType<FinanceCatalogItemSummary> => {
    const capability = capabilities?.[category];
    const canUpdate = capability?.update ?? canWrite;
    const canDelete = capability?.delete ?? canWrite;
    const canReorder = capability?.reorder ?? canWrite;
    const hasRowActions = canUpdate || canDelete;
    const actionColumnWidth = canWrite ? 178 : 82;
    const columns: ColumnsType<FinanceCatalogItemSummary> = [
      { title: '排序', dataIndex: 'sortOrder', width: 56, align: 'center' },
      {
        title: financeCatalogCategoryLabels[category],
        dataIndex: 'name',
        width: category === 'CARGO_TYPE' ? 344 : 338,
        className: 'finance-catalog-name-column',
        render: (value: string, row) => (
          <Space direction="vertical" size={2} className="finance-catalog-name-cell">
            <Text strong className="finance-catalog-name-text" title={value}>{value}</Text>
            {row.remark ? <Text type="secondary" className="finance-catalog-remark-text" title={row.remark}>{row.remark}</Text> : null}
          </Space>
        )
      }
    ];

    if (category !== 'CARGO_TYPE') {
      columns.push({
        title: '默认币种',
        dataIndex: 'currency',
        width: 84,
        align: 'center',
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
        width: 78,
        align: 'center',
        render: (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '停用'}</Tag>
      },
      ...(canReorder ? [{
        title: '排序调整',
        key: 'sort',
        width: 124,
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
        width: actionColumnWidth,
        fixed: 'right',
        render: (_, row) => (
          hasRowActions ? (
            <Space size={4} className="finance-catalog-inline-actions">
              {canUpdate ? <Button size="small" onClick={() => onEdit(row)}>编辑</Button> : null}
              {canUpdate ? (
                <Popconfirm
                  title={`确认${row.enabled ? '停用' : '启用'}该资料？`}
                  onConfirm={() => void onToggle(row)}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button size="small" danger={row.enabled}>{row.enabled ? '停用' : '启用'}</Button>
                </Popconfirm>
              ) : null}
              {canDelete ? (
                <Popconfirm
                  title="确认删除该资料？"
                  description="删除后会从财务资料库和后续新增选择项中移除，历史单据已保存文本不受影响。"
                  onConfirm={() => void onDelete(row)}
                  okText="确认删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              ) : null}
            </Space>
          ) : <Tag>只读</Tag>
        )
      }
    );

    return columns;
  };

  const rows = getCategoryRows(items, filters, activeCategory);
  const activeCapability = capabilities?.[activeCategory];
  const canCreateActiveCategory = activeCapability?.create ?? canWrite;

  return (
    <>
      <Card title={title} className="finance-work-card">
        <div className="finance-catalog-workbench">
          <div className="finance-catalog-switchbar">
            <Segmented
              aria-label="财务资料分类切换"
              className="finance-catalog-category-switch"
              options={visibleCategories.map((category) => ({
                label: financeCatalogCategoryLabels[category],
                value: category
              }))}
              value={activeCategory}
              onChange={(value) => setActiveCategory(value as FinanceCatalogCategory)}
            />
            {canCreateActiveCategory ? <Button type="primary" onClick={() => onCreate(activeCategory)}>
              新增{financeCatalogCategoryLabels[activeCategory]}
            </Button> : null}
          </div>
          <Card
            className="finance-catalog-card"
            title={(
              <span className="finance-catalog-title">
                <span className="finance-catalog-title-main">{financeCatalogCategoryLabels[activeCategory]}</span>
              </span>
            )}
          >
            <div className="finance-catalog-toolbar">
              <Input
                allowClear
                placeholder={`搜索${financeCatalogCategoryLabels[activeCategory]}`}
                value={filters[activeCategory].keyword}
                onChange={(event) => onFilterChange(activeCategory, { keyword: event.target.value })}
              />
              <Checkbox
                checked={filters[activeCategory].enabledOnly}
                onChange={(event) => onFilterChange(activeCategory, { enabledOnly: event.target.checked })}
              >
                只看启用
              </Checkbox>
              <Button onClick={() => void onRefresh()}>刷新</Button>
            </div>
            <ManagedTable
              recordDetail={{ title: '财务资料详情' }}
              rowKey="id"
              size="small"
              loading={loading}
              pagination={pagination}
              dataSource={rows}
              columns={createColumns(activeCategory)}
              tableLayout="fixed"
              rowClassName={(record) => (record.enabled ? '' : 'finance-catalog-disabled-row')}
              className="finance-catalog-table"
              scroll={{ x: financeCatalogTableScrollX[canWrite ? 'write' : 'read'][activeCategory] }}
            />
          </Card>
        </div>
      </Card>
      <Modal
        title={`${editingItem ? '编辑' : '新增'}${financeCatalogCategoryLabels[editingCategory]}`}
        className="finance-modal"
        width={680}
        open={editorOpen}
        onCancel={onCloseEditor}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        destroyOnHidden
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
