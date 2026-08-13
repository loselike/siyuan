import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WarehouseDashboardPanel } from './WarehouseDashboardPanel';

const totals = {
  receiptTickets: 12,
  totalPackages: 20,
  totalWeightKg: 100,
  totalCbm: 1.5,
  waitingDispatchTickets: 3,
  pendingTallyTickets: 4,
  exceptionTickets: 2
};

describe('WarehouseDashboardPanel', () => {
  afterEach(cleanup);

  it('keeps the existing three queue totals and opens the existing work sections', async () => {
    const user = userEvent.setup();
    const onOpenSection = vi.fn();

    render(
      <WarehouseDashboardPanel
        totals={totals}
        visibleSections={new Set(['today', 'consolidation', 'queue'])}
        onOpenSection={onOpenSection}
      />
    );

    const panel = screen.getByRole('region', { name: '仓库待办总览' });
    expect(panel.querySelector('.warehouse-dashboard-queue-card:nth-child(1)')).toHaveTextContent('待出库3票');
    expect(panel.querySelector('.warehouse-dashboard-queue-card:nth-child(2)')).toHaveTextContent('待理货4票');
    expect(panel.querySelector('.warehouse-dashboard-queue-card:nth-child(3)')).toHaveTextContent('收货异常2票');

    await user.click(screen.getByRole('button', { name: '查看待理货' }));
    await user.click(screen.getByRole('button', { name: '查看待出库' }));
    await user.click(screen.getByRole('button', { name: '查看今日收货' }));

    expect(onOpenSection.mock.calls.map(([section]) => section)).toEqual(['consolidation', 'queue', 'today']);
  });

  it('does not expose navigation actions for sections the current role cannot enter', () => {
    render(
      <WarehouseDashboardPanel
        totals={totals}
        visibleSections={new Set(['today'])}
        onOpenSection={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '查看今日收货' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看待理货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看待出库' })).not.toBeInTheDocument();
  });
});
