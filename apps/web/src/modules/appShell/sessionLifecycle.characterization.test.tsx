import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Session } from '../../apiClient';
import { renderAndLogin } from '../testSupport/appTestHarness';

function requestedSessionRefreshes() {
  return vi.mocked(fetch).mock.calls.filter(([input]) => String(input).endsWith('/api/auth/session'));
}

function requestedPath(pathname: string) {
  return vi.mocked(fetch).mock.calls.filter(([input]) => new URL(String(input), 'http://test.local').pathname === pathname);
}

describe('app session lifecycle characterization', () => {
  it('persists the login session and immediately reconciles it with the current session endpoint', async () => {
    await renderAndLogin('admin', 'admin123');

    await waitFor(() => expect(requestedSessionRefreshes()).toHaveLength(1));
    const stored = JSON.parse(localStorage.getItem('siyuan-session') ?? 'null') as Session | null;
    expect(stored).toMatchObject({
      accessToken: 'ADMIN-token',
      user: {
        id: 'u-admin',
        username: 'admin',
        role: 'ADMIN'
      }
    });
    expect(stored?.permissions.length).toBeGreaterThan(0);
  });

  it('loads each workspace request group once through the session-owned refresh', async () => {
    globalThis.history.replaceState(null, '', '/app/workspace');

    await renderAndLogin('admin', 'admin123');

    await waitFor(() => expect(requestedPath('/api/master-data')).toHaveLength(1));
    expect(requestedPath('/api/shipments')).toHaveLength(1);
    expect(requestedPath('/api/finance/business-cost-audits')).toHaveLength(1);
    expect(requestedPath('/api/master-data')).toHaveLength(1);
  });

  it('keeps the confirmation step and removes the persisted session only after confirmed logout', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await waitFor(() => expect(localStorage.getItem('siyuan-session')).not.toBeNull());

    await user.click(await screen.findByRole('button', { name: '退出登录' }));
    const dialog = screen.getByRole('dialog', { name: '确认退出登录' });
    expect(localStorage.getItem('siyuan-session')).not.toBeNull();

    await user.click(within(dialog).getByRole('button', { name: '确认退出' }));

    expect(await screen.findByRole('heading', { name: '登录工作台' })).toBeInTheDocument();
    expect(localStorage.getItem('siyuan-session')).toBeNull();
  });
});
