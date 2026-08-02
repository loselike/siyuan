import type { FinanceCatalogItemSummary } from '@siyuan/shared/finance-catalog';

const initialItems: FinanceCatalogItemSummary[] = [
  { id: 'fc-fee-freight-default', category: 'FEE_NAME', name: '运费', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-freight', category: 'FEE_NAME', name: '基础运费', currency: 'RMB', sortOrder: 2, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-fuel', category: 'FEE_NAME', name: '燃油费', currency: 'RMB', sortOrder: 3, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-business-cost', category: 'FEE_NAME', name: '业务员成本', currency: 'RMB', sortOrder: 4, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-fee-disabled', category: 'FEE_NAME', name: '停用费用', currency: 'RMB', sortOrder: 5, enabled: false, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-settlement-monthly', category: 'SETTLEMENT_METHOD', name: '月结', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-cargo-normal', category: 'CARGO_TYPE', name: '普货', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
  { id: 'fc-product-desk', category: 'PRODUCT_NAME', name: '桌子', sortOrder: 1, enabled: true, createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }
];

const items = initialItems.map((item) => ({ ...item }));

export function resetFinanceCatalogFixture() {
  items.splice(0, items.length, ...initialItems.map((item) => ({ ...item })));
}

export function handleFinanceCatalogRequest(url: string, init: RequestInit | undefined, body: any): Response | undefined {
  if (url.includes('/api/finance/catalog/reorder') && init?.method === 'PUT') {
    const categoryItems = items.filter((item) => item.category === body.category);
    const nextItems = body.orderedIds
      .map((id: string, index: number) => categoryItems.find((item) => item.id === id) ? { ...categoryItems.find((item) => item.id === id)!, sortOrder: index + 1 } : null)
      .filter(Boolean) as FinanceCatalogItemSummary[];
    items.splice(0, items.length, ...items.filter((item) => item.category !== body.category), ...nextItems);
    return response({ items: nextItems });
  }

  if (url.includes('/api/finance/catalog') && init?.method === 'POST') {
    const item: FinanceCatalogItemSummary = {
      id: `fc-${body.category}-${body.name}`,
      category: body.category,
      name: body.name,
      currency: body.currency,
      remark: body.remark,
      sortOrder: body.sortOrder ?? items.filter((row) => row.category === body.category).length + 1,
      enabled: body.enabled !== false,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z'
    };
    items.push(item);
    return response(item);
  }

  const itemMatch = url.match(/\/api\/finance\/catalog\/([^/?]+)$/);
  if (itemMatch && init?.method === 'PUT') {
    const item = items.find((row) => row.id === itemMatch[1]);
    if (!item) return response({ message: 'Not found' }, 404);
    Object.assign(item, body, { updatedAt: '2026-06-01T00:00:00.000Z' });
    return response(item);
  }

  if (itemMatch && init?.method === 'DELETE') {
    const item = items.find((row) => row.id === itemMatch[1]);
    if (!item) return response({ message: 'Not found' }, 404);
    item.enabled = false;
    return response(item);
  }

  if (url.includes('/api/finance/catalog')) {
    const parsed = new URL(url, 'http://test.local');
    const category = parsed.searchParams.get('category');
    const keyword = parsed.searchParams.get('keyword')?.trim().toLowerCase() ?? '';
    const enabledOnly = parsed.searchParams.get('enabledOnly') === 'true';
    return response({
      items: items
        .filter((item) => !category || item.category === category)
        .filter((item) => !enabledOnly || item.enabled)
        .filter((item) => !keyword || [item.name, item.currency, item.remark].some((value) => (value ?? '').toLowerCase().includes(keyword)))
    });
  }

  return undefined;
}

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
