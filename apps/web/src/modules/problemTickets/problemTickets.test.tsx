import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';

describe('Problem tickets module', () => {
  it('opens the problem tickets page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '客服管理' }));

    expect(await screen.findByRole('heading', { name: '客服管理' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '问题件' }));
    expect(screen.getByText('轨迹超过3天未更新')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '问题件内容' })).toBeInTheDocument();
  });
});
