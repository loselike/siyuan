import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

describe('ApiClient gateway errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a module-neutral message for gateway failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><title>502 Bad Gateway</title></html>', { status: 502 })));
    const client = new ApiClient(() => null, vi.fn());

    await expect(client.shipments()).rejects.toThrow('服务暂不可用，请稍后重试');
  });
});

describe('ApiClient Dubai price query compatibility', () => {
  it('forwards legacy JSON read methods to the price-book query client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const dubaiPriceTable = vi.spyOn(client.priceBookQuery, 'dubaiPriceTable').mockResolvedValue({} as never);
    const dubaiPriceDisplay = vi.spyOn(client.priceBookQuery, 'dubaiPriceDisplay').mockResolvedValue({} as never);
    const dubaiPriceDisplayVersions = vi.spyOn(client.priceBookQuery, 'dubaiPriceDisplayVersions').mockResolvedValue({ versions: [] } as never);

    await client.dubaiPriceTable();
    await client.dubaiPriceDisplay();
    await client.dubaiPriceDisplayVersions();

    expect(dubaiPriceTable).toHaveBeenCalledOnce();
    expect(dubaiPriceDisplay).toHaveBeenCalledOnce();
    expect(dubaiPriceDisplayVersions).toHaveBeenCalledOnce();
  });
});
