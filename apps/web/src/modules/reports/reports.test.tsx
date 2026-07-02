import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';

describe('Reports module', () => {
  it('keeps reports out of the staff main menu after the IA consolidation', async () => {
    await renderAndLogin('admin', 'admin123');

    expect(await screen.findByRole('menuitem', { name: '财务管理' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '统计报表' })).not.toBeInTheDocument();
  });
});
