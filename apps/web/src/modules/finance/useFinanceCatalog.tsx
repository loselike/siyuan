import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, Modal } from 'antd';
import type { FinanceCatalogCategory, FinanceCatalogItemInput, FinanceCatalogItemSummary } from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import {
  createFinanceCatalogFilters,
  createSettlementMethodOptions,
  getSettlementMethodRows,
  normalizeFinanceCatalogCurrency
} from './catalog';

export function useFinanceCatalog(apiClient: ApiClient) {
  const [items, setItems] = useState<FinanceCatalogItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(createFinanceCatalogFilters);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinanceCatalogItemSummary | null>(null);
  const [editingCategory, setEditingCategory] = useState<FinanceCatalogCategory>('FEE_NAME');
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FinanceCatalogItemInput>();

  const showError = useCallback((title: string, error: unknown) => {
    Modal.error({ title, content: error instanceof Error ? error.message : '请稍后重试' });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.financeCatalog();
      setItems(Array.isArray(response.items) ? response.items : []);
    } catch (error) {
      showError('财务资料库加载失败', error);
    } finally {
      setLoading(false);
    }
  }, [apiClient, showError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getCategoryRows = useCallback(
    (category: FinanceCatalogCategory) => items
      .filter((item) => item.category === category)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN')),
    [items]
  );

  const settlementRows = useMemo(() => getSettlementMethodRows(items), [items]);
  const settlementOptions = useMemo(() => createSettlementMethodOptions(settlementRows), [settlementRows]);

  const updateFilter = (category: FinanceCatalogCategory, patch: Partial<{ keyword: string; enabledOnly: boolean }>) => {
    setFilters((current) => ({
      ...current,
      [category]: { ...current[category], ...patch }
    }));
  };

  const openCreate = (category: FinanceCatalogCategory) => {
    const nextSortOrder = getCategoryRows(category).reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
    setEditingCategory(category);
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      category,
      enabled: true,
      sortOrder: nextSortOrder,
      currency: category === 'SETTLEMENT_METHOD' ? 'RMB' : undefined
    });
    setEditorOpen(true);
  };

  const openEdit = (item: FinanceCatalogItemSummary) => {
    setEditingCategory(item.category);
    setEditingItem(item);
    form.resetFields();
    form.setFieldsValue({
      category: item.category,
      name: item.name,
      currency: normalizeFinanceCatalogCurrency(item.currency),
      sortOrder: item.sortOrder,
      remark: item.remark,
      enabled: item.enabled
    });
    setEditorOpen(true);
  };

  const submit = async (values: FinanceCatalogItemInput) => {
    const category = editingItem?.category ?? editingCategory;
    const payload: FinanceCatalogItemInput = {
      category,
      name: values.name,
      sortOrder: values.sortOrder,
      remark: values.remark,
      enabled: values.enabled !== false
    };
    const currency = normalizeFinanceCatalogCurrency(values.currency);
    if (category !== 'CARGO_TYPE') {
      payload.currency = currency ?? (category === 'SETTLEMENT_METHOD' ? 'RMB' : undefined);
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        await apiClient.updateFinanceCatalogItem(editingItem.id, payload);
      } else {
        await apiClient.createFinanceCatalogItem(payload);
      }
      setEditorOpen(false);
      setEditingItem(null);
      await refresh();
    } catch (error) {
      showError(editingItem ? '财务资料修改失败' : '财务资料新增失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = async (item: FinanceCatalogItemSummary) => {
    try {
      if (item.enabled) {
        await apiClient.disableFinanceCatalogItem(item.id);
      } else {
        await apiClient.updateFinanceCatalogItem(item.id, { enabled: true });
      }
      await refresh();
    } catch (error) {
      showError(item.enabled ? '财务资料停用失败' : '财务资料启用失败', error);
    }
  };

  const remove = async (item: FinanceCatalogItemSummary) => {
    try {
      await apiClient.deleteFinanceCatalogItem(item.id);
      await refresh();
    } catch (error) {
      showError('财务资料删除失败', error);
    }
  };

  const move = async (category: FinanceCatalogCategory, id: string, direction: -1 | 1) => {
    const rows = getCategoryRows(category);
    const index = rows.findIndex((item) => item.id === id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) return;
    const nextRows = [...rows];
    [nextRows[index], nextRows[targetIndex]] = [nextRows[targetIndex], nextRows[index]];
    try {
      const response = await apiClient.reorderFinanceCatalogItems({
        category,
        orderedIds: nextRows.map((item) => item.id)
      });
      setItems((current) => [
        ...current.filter((item) => item.category !== category),
        ...response.items
      ]);
    } catch (error) {
      showError('财务资料排序失败', error);
    }
  };

  return {
    items,
    loading,
    filters,
    editingItem,
    editingCategory,
    editorOpen,
    submitting,
    form,
    settlementRows,
    settlementOptions,
    refresh,
    updateFilter,
    openCreate,
    openEdit,
    toggle,
    remove,
    move,
    closeEditor: () => setEditorOpen(false),
    pageProps: {
      items,
      loading,
      filters,
      editingItem,
      editingCategory,
      editorOpen,
      submitting,
      form,
      onFilterChange: updateFilter,
      onRefresh: refresh,
      onCreate: openCreate,
      onEdit: openEdit,
      onToggle: toggle,
      onDelete: remove,
      onMove: move,
      onCloseEditor: () => setEditorOpen(false),
      onSubmit: submit
    }
  };
}
