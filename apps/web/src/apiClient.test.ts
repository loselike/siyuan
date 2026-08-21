import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

describe('ApiClient gateway errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a module-neutral message for gateway failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html><title>502 Bad Gateway</title></html>', { status: 502 })));
    const client = new ApiClient(() => null, vi.fn());

    await expect(client.login('operator', 'password')).rejects.toThrow('服务暂不可用，请稍后重试');
  });

  it('keeps anonymous auth requests and authenticated session requests unchanged through the facade', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ captchaId: 'captcha-1', image: 'data:image/png;base64,x' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: 'u-1', username: 'operator', role: 'UG_BUSINESS' }, permissions: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ApiClient(() => 'token-1', vi.fn());

    await client.captcha();
    await client.currentSession();

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:3001/api/auth/captcha', expect.objectContaining({
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://localhost:3001/api/auth/session', expect.objectContaining({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-1' }
    }));
  });

  it('keeps the single unauthorized callback at the shared transport boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: '登录已失效' }), { status: 401 })));
    const onUnauthorized = vi.fn();
    const client = new ApiClient(() => 'expired-token', onUnauthorized);

    await expect(client.currentSession()).rejects.toThrow('登录已失效');
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
