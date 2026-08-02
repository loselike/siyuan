import {
  defaultFinanceCatalogItems,
  type FinanceCatalogCategory,
  type FinanceCatalogItemSummary
} from '@siyuan/shared/finance-catalog';

export const financeCatalogCategories: FinanceCatalogCategory[] = ['FEE_NAME', 'SETTLEMENT_METHOD', 'CARGO_TYPE', 'PRODUCT_NAME'];

export const financeCatalogCategoryLabels: Record<FinanceCatalogCategory, string> = {
  FEE_NAME: '费用名称',
  SETTLEMENT_METHOD: '结算方式',
  CARGO_TYPE: '货物类型',
  PRODUCT_NAME: '品名'
};

export const financeCatalogCategoryHints: Record<FinanceCatalogCategory, string> = {
  FEE_NAME: '用于录单、应收、业务成本和应付项目',
  SETTLEMENT_METHOD: '维护结算方式，并自动带出默认币种',
  CARGO_TYPE: '用于录单和费用筛选的货物类型',
  PRODUCT_NAME: '用于录单品名选择'
};

export const financeCatalogCurrencyOptions = ['RMB', 'USD', 'HKD'];

type FinanceFeeNameSource = Pick<FinanceCatalogItemSummary, 'category' | 'enabled' | 'sortOrder' | 'name'>;

export function createFinanceFeeNameOptions(items: FinanceFeeNameSource[]) {
  const names = new Set<string>();
  return [...items]
    .filter((item) => item.category === 'FEE_NAME' && item.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'))
    .flatMap((item) => {
      const name = item.name.trim();
      if (!name || names.has(name)) return [];
      names.add(name);
      return [{ label: name, value: name }];
    });
}

export const createFinanceCatalogFilters = (): Record<FinanceCatalogCategory, { keyword: string; enabledOnly: boolean }> => ({
  FEE_NAME: { keyword: '', enabledOnly: false },
  SETTLEMENT_METHOD: { keyword: '', enabledOnly: false },
  CARGO_TYPE: { keyword: '', enabledOnly: false },
  PRODUCT_NAME: { keyword: '', enabledOnly: false }
});

export function normalizeFinanceCatalogCurrency(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  return normalized === 'CNY' ? 'RMB' : normalized;
}

function createDefaultSettlementMethodRows(): FinanceCatalogItemSummary[] {
  return defaultFinanceCatalogItems
    .filter((item) => item.category === 'SETTLEMENT_METHOD')
    .map((item, index) => ({
      ...item,
      id: `default-settlement-${index}`,
      currency: normalizeFinanceCatalogCurrency(item.currency),
      createdAt: '',
      updatedAt: ''
    }));
}

export function getSettlementMethodRows(items?: FinanceCatalogItemSummary[] | null): FinanceCatalogItemSummary[] {
  const enabledRows = (Array.isArray(items) ? items : [])
    .filter((item) => item.category === 'SETTLEMENT_METHOD' && item.enabled)
    .map((item) => ({
      ...item,
      currency: normalizeFinanceCatalogCurrency(item.currency)
    }));
  const rows = enabledRows.length > 0 ? enabledRows : createDefaultSettlementMethodRows();
  return [...rows].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-Hans-CN'));
}

export function createSettlementMethodOptions(rows: FinanceCatalogItemSummary[]) {
  return rows.map((item) => ({
    label: item.currency ? `${item.name} · ${item.currency}` : item.name,
    value: item.name
  }));
}

export function getSettlementMethodCurrency(rows: FinanceCatalogItemSummary[], settlementMethod?: string | null) {
  const method = settlementMethod?.trim();
  if (!method) return undefined;
  const row = rows.find((item) => item.name === method);
  return normalizeFinanceCatalogCurrency(row?.currency);
}

export function applySettlementMethodCurrency(
  form: { setFieldsValue: (values: { currency?: string }) => void },
  rows: FinanceCatalogItemSummary[],
  settlementMethod?: string | null
) {
  const currency = getSettlementMethodCurrency(rows, settlementMethod);
  if (currency) {
    form.setFieldsValue({ currency });
  }
}
