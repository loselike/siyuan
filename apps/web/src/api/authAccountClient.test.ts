import { describe, expect, it, vi } from 'vitest';
import { AuthAccountClient, type AuthAccountRequest } from './authAccountClient';

describe('AuthAccountClient', () => {
  it('keeps captcha and login anonymous while preserving the login body', async () => {
    const request = vi.fn().mockResolvedValue({}) as AuthAccountRequest;
    const client = new AuthAccountClient(request);

    await client.captcha();
    await client.login('operator', 'secret', 'captcha-1', '1234');

    expect(request).toHaveBeenNthCalledWith(1, '/auth/captcha', { method: 'GET' }, false);
    expect(request).toHaveBeenNthCalledWith(2, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'operator', password: 'secret', captchaId: 'captcha-1', captchaCode: '1234' })
    }, false);
  });

  it('keeps current-account request contracts authenticated by default', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true }) as AuthAccountRequest;
    const client = new AuthAccountClient(request);
    const profile = { name: '思远', phone: '13800000000', nickname: '运营' };
    const password = { currentPassword: 'old', newPassword: 'new' };

    await client.me();
    await client.currentSession();
    await client.updateProfile(profile);
    await client.changePassword(password);

    expect(request).toHaveBeenNthCalledWith(1, '/auth/me');
    expect(request).toHaveBeenNthCalledWith(2, '/auth/session');
    expect(request).toHaveBeenNthCalledWith(3, '/auth/profile', { method: 'PUT', body: JSON.stringify(profile) });
    expect(request).toHaveBeenNthCalledWith(4, '/auth/change-password', { method: 'POST', body: JSON.stringify(password) });
  });

  it('keeps table-preference paths, encoding and bodies unchanged', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true }) as AuthAccountRequest;
    const client = new AuthAccountClient(request);
    const value = { columns: ['status', 'customerCode'] };

    await client.userTablePreferences();
    await client.updateUserTablePreference('table.columns/a b', value);
    await client.deleteUserTablePreference('table.columns/a b');

    expect(request).toHaveBeenNthCalledWith(1, '/user-table-preferences');
    expect(request).toHaveBeenNthCalledWith(2, '/user-table-preferences/table.columns%2Fa%20b', {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
    expect(request).toHaveBeenNthCalledWith(3, '/user-table-preferences/table.columns%2Fa%20b', { method: 'DELETE' });
  });

  it('passes transport errors through unchanged', async () => {
    const request = vi.fn().mockRejectedValue(new Error('当前账号无权限访问')) as AuthAccountRequest;
    const client = new AuthAccountClient(request);

    await expect(client.currentSession()).rejects.toThrow('当前账号无权限访问');
  });
});
