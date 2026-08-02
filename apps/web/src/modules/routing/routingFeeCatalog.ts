import type { FinanceCatalogItemSummary } from '@siyuan/shared';

export type RoutingFeeNameOption = {
  label: string;
  value: string;
  currency?: string;
};

export function shouldLoadRoutingFeeNameCatalog(menuKey: string) {
  return menuKey === 'market' || menuKey === 'routing';
}

export function createRoutingFeeNameOptions(items: FinanceCatalogItemSummary[]): RoutingFeeNameOption[] {
  const names = new Set<string>();
  return [...items]
    .filter((item) => item.category === 'FEE_NAME' && item.enabled)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, 'zh-CN'))
    .flatMap((item) => {
      const name = item.name.trim();
      if (!name || names.has(name)) return [];
      names.add(name);
      return [{ label: name, value: name, currency: item.currency?.trim().toUpperCase() }];
    });
}
