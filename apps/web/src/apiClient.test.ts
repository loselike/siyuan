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

describe('ApiClient South Africa pricing query compatibility', () => {
  it('forwards the rate-rule read to the price-book query client', async () => {
    const client = new ApiClient(() => null, vi.fn());
    const southAfricaRateRules = vi.spyOn(client.priceBookQuery, 'southAfricaRateRules').mockResolvedValue({ rules: [] } as never);

    await client.southAfricaRateRules();

    expect(southAfricaRateRules).toHaveBeenCalledOnce();
  });
});
