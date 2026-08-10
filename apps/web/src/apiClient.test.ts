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

  it('serializes warehouse rent package ids as repeated query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ totals: {}, rows: [], sites: [], salespeople: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ApiClient(() => null, vi.fn());

    await client.warehouseRentDetails({ status: 'IN_STOCK', packageIds: ['pkg-1', 'pkg-2'] });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/warehouse/rent-details?status=IN_STOCK&packageIds=pkg-1&packageIds=pkg-2',
      expect.any(Object)
    );
  });
});
