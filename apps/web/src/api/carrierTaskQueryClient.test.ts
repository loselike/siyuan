import type { CarrierTaskSummary } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { CarrierTaskQueryClient, type CarrierTaskQueryRequest } from './carrierTaskQueryClient';

describe('CarrierTaskQueryClient', () => {
  it('keeps the carrier-task read path and response passthrough unchanged', async () => {
    const response: CarrierTaskSummary[] = [];
    const request = vi.fn().mockResolvedValue(response) as CarrierTaskQueryRequest;
    const client = new CarrierTaskQueryClient(request);

    await expect(client.carrierTasks()).resolves.toBe(response);

    expect(request).toHaveBeenCalledWith('/carrier-tasks');
  });

  it('passes carrier-task query errors through without changing their message', async () => {
    const request = vi.fn().mockRejectedValue(new Error('没有访问权限')) as CarrierTaskQueryRequest;
    const client = new CarrierTaskQueryClient(request);

    await expect(client.carrierTasks()).rejects.toThrow('没有访问权限');
  });
});
