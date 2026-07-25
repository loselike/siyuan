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

describe('ApiClient warehouse query compatibility', () => {
  it('forwards tally-task history-chain reads to WarehouseQueryClient', async () => {
    const response = [];
    const client = new ApiClient(() => null, vi.fn());
    const query = vi.spyOn(client.warehouseQuery, 'warehouseTallyTaskHistoryChain').mockResolvedValue(response);

    await expect(client.warehouseTallyTaskHistoryChain('pkg 1/a')).resolves.toBe(response);

    expect(query).toHaveBeenCalledWith('pkg 1/a');
  });
});
