import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';

describe('Tracking module', () => {
  it('opens the tracking monitor page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '物流轨迹管理' }));

    expect(await screen.findByRole('heading', { name: '轨迹监控中心' })).toBeInTheDocument();
    expect(screen.getAllByText('承运商任务').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /最新轨迹/ })).toBeInTheDocument();
  });
});
