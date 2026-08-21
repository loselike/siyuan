import { describe, expect, it, vi } from 'vitest';
import { fetchWithReadAvailabilityRetry } from './apiTransport';

describe('API availability retry boundary', () => {
  it('bridges transient gateway failures for read requests', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('bad gateway', { status: 502 }))
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const wait = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWithReadAvailabilityRetry('/api/shipments', {}, { fetchImpl, wait });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenNthCalledWith(1, 150);
    expect(wait).toHaveBeenNthCalledWith(2, 350);
  });

  it('retries a transient network failure for GET but preserves the final response', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const response = await fetchWithReadAvailabilityRetry('/api/auth/session', { method: 'GET' }, {
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined)
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('never replays a write request automatically', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 }));

    const response = await fetchWithReadAvailabilityRetry('/api/shipments', {
      method: 'POST',
      body: JSON.stringify({ customerCode: '9409' })
    }, { fetchImpl, wait: vi.fn().mockResolvedValue(undefined) });

    expect(response.status).toBe(502);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('does not retry business or authorization responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }));

    const response = await fetchWithReadAvailabilityRetry('/api/finance/payables', {}, {
      fetchImpl,
      wait: vi.fn().mockResolvedValue(undefined)
    });

    expect(response.status).toBe(403);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
