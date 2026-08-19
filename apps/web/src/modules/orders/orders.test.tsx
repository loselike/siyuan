import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAndLogin, shipment } from '../testSupport/appTestHarness';
import { matchesOrderManagementFilters } from './OrdersPage';

async function openOrderManagement(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
  expect(await screen.findByRole('heading', { name: '业务管理' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '运单管理' }));
  expect(await screen.findByRole('heading', { name: '我的运单生命周期' })).toBeInTheDocument();
}

describe('Orders flows', () => {
  it('filters visible lifecycle shipments by site and salesperson together', () => {
    const target = shipment('filter-target', 'SYS-FILTER-1', 'CUSTOMER-FILTER-1', 'DECLARED', '筛选客户', {
      site: '深圳思远',
      salesperson: 'Rachel'
    });
    const anotherSite = shipment('filter-site', 'SYS-FILTER-2', 'CUSTOMER-FILTER-2', 'DECLARED', '筛选客户', {
      site: '广州思远',
      salesperson: 'Rachel'
    });
    const anotherSalesperson = shipment('filter-sales', 'SYS-FILTER-3', 'CUSTOMER-FILTER-3', 'DECLARED', '筛选客户', {
      site: '深圳思远',
      salesperson: 'Marina'
    });

    expect([target, anotherSite, anotherSalesperson].filter((row) => matchesOrderManagementFilters(row, {
      customerKeyword: '',
      outboundOrderKeyword: '',
      site: '深圳思远',
      salesperson: 'Rachel',
      node: ''
    }))).toEqual([target]);
  });

  it('shows site and salesperson filters in the lifecycle toolbar', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.getByRole('combobox', { name: '站点' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '业务员' })).toBeInTheDocument();
  });

  it('shows the orders workspace and creates an outbound order without changing create logic', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.getByRole('button', { name: '新建出货订单' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '全生命周期运单' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI 订单助手/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('代理')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'TEST-ORDER-001');
    await user.clear(screen.getByLabelText('出货单号'));
    await user.type(screen.getByLabelText('出货单号'), 'SYTEST0606001');
    await user.clear(screen.getByLabelText('目的地'));
    await user.type(screen.getByLabelText('目的地'), '德国');
    expect(screen.queryByLabelText('承运商')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('收货渠道').closest('.ant-select-selector')!);
    await user.click(await screen.findByTitle('海运DDP'));
    await user.type(screen.getByLabelText('备注'), '客户要求优先入库，周五前排货');
    await user.click(screen.getByRole('button', { name: '创建订单' }));

    expect(await screen.findByText('SYTEST0606001')).toBeInTheDocument();
    expect(screen.getAllByText('待获取快递号').length).toBeGreaterThan(0);
    expect(screen.getByText('德国')).toBeInTheDocument();
    expect(screen.getByText('客户要求优先入库，周五前排货')).toBeInTheDocument();
    expect(screen.getAllByText('海运DDP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /运输中/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '审核通过' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '审核不通过' })).not.toBeInTheDocument();
  });

  it('keeps review actions in the pending-review flow instead of the order management list', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.queryByRole('button', { name: /收\s*款/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '操作日志' }).length).toBeGreaterThan(0);
  });

  it('only shows fulfillment action buttons when the order status can execute them', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    const approvedRow = screen.getByRole('row', { name: /SYGJ06061230001/ });
    expect(within(approvedRow).getByText('已通过')).toBeInTheDocument();
    expect(within(approvedRow).getByRole('button', { name: '操作日志' })).toBeInTheDocument();
    expect(within(approvedRow).queryByRole('button', { name: '反审核' })).not.toBeInTheDocument();
    expect(within(approvedRow).queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
    expect(within(approvedRow).queryByRole('button', { name: '修 改' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
  });
});
