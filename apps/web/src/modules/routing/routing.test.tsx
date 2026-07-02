import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { employeeShipments, renderAndLogin, shipment } from '../testSupport/appTestHarness';

async function openRoutingFulfillment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
  expect(await screen.findByRole('heading', { name: '市场管理' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '待排货' }));
  expect(await screen.findByRole('region', { name: /待排货/ })).toBeInTheDocument();
}

describe('Routing flows', () => {
  it('shows market dashboard weekly agent, channel, sensitive, and declaration metrics', async () => {
    const user = userEvent.setup();
    const routedAt = new Date().toISOString();
    employeeShipments.unshift(
      shipment('s-routing-dashboard-pending', 'SYGJ06061239994', 'SORT-DASHBOARD-0606', 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        latestTracking: '收货扫描'
      }),
      shipment('s-routing-dashboard-air', 'SYGJ06061239993', 'AIR-DASHBOARD-0606', 'WAITING_DISPATCH', '9409-Daloday', {
        agentName: '空运代理',
        businessType: 'DEDICATED_LINE',
        channelName: '空运洛杉矶专线',
        routeAgentChannelName: '空运洛杉矶专线',
        routedAt,
        sensitive: true,
        declarationRequired: true
      }),
      shipment('s-routing-dashboard-sea', 'SYGJ06061239992', 'SEA-DASHBOARD-0606', 'WAITING_DISPATCH', '9409-Daloday', {
        agentName: '海运代理',
        businessType: 'DEDICATED_LINE',
        channelName: '美西海卡',
        routeAgentChannelName: '美西海卡',
        routedAt
      }),
      shipment('s-routing-dashboard-outbound', 'SYGJ06061239991', 'OUT-DASHBOARD-0606', 'OUTBOUNDED', '9409-Daloday', {
        outboundAt: routedAt,
        businessType: 'DEDICATED_LINE'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
    expect(await screen.findByRole('heading', { name: '市场管理' })).toBeInTheDocument();

    expect(screen.getByText('本周排货代理')).toBeInTheDocument();
    expect(screen.getByText('今日排货')).toBeInTheDocument();
    expect(screen.getByText('今日出货')).toBeInTheDocument();
    expect(screen.getByText('空运代理')).toBeInTheDocument();
    expect(screen.getByText('海运代理')).toBeInTheDocument();
    expect(screen.getByText('本周排货渠道（空运/海运）')).toBeInTheDocument();
    expect(screen.getByText('空运')).toBeInTheDocument();
    expect(screen.getByText('海运')).toBeInTheDocument();
    expect(screen.getByText('本周敏感货物')).toBeInTheDocument();
    expect(screen.getByText('带电/带磁/敏感')).toBeInTheDocument();
    expect(screen.getByText('本周报关货物')).toBeInTheDocument();
    expect(screen.queryByText('待排货概览')).not.toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /SYGJ06061239994/ })).not.toBeInTheDocument();
  });

  it('shows routing stage board with routing-only row actions', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(
      shipment('s-routing-board', 'SYGJ06061239995', 'SORT-BOARD-0606', 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        latestTracking: '收货扫描',
        reviewedAt: '2026-07-01T09:00:00.000Z'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await openRoutingFulfillment(user);
    expect(screen.getAllByText('客户').length).toBeGreaterThan(0);
    expect(screen.queryByText('系统单号 / 转单号')).not.toBeInTheDocument();
    expect(screen.queryByText('渠道 / 代理')).not.toBeInTheDocument();
    expect(screen.getAllByText('运单号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理渠道').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /待排货/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /待审核/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();

    const routingRow = screen.getByRole('row', { name: /SYGJ06061239995/ });
    expect(screen.getByRole('columnheader', { name: '进入时间' })).toBeInTheDocument();
    expect(within(routingRow).getByText('2026/7/1 17:00:00')).toBeInTheDocument();
    expect(within(routingRow).queryByRole('button', { name: '添加轨迹' })).not.toBeInTheDocument();
    expect(screen.getAllByText('排货操作').length).toBeGreaterThan(0);
    expect(screen.queryByText('履约操作')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收款' })).not.toBeInTheDocument();
  });

  it('only shows routing assignment when the shipment is waiting for route allocation', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(
      shipment('s-routing-ready', 'SYGJ06061239999', 'SORT-0606', 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        latestTracking: '收货扫描'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await openRoutingFulfillment(user);

    const sortableRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    expect(within(sortableRow).getByRole('button', { name: /^排\s*货$/ })).toBeInTheDocument();
  });

  it('shows business and market costs separately after routing', async () => {
    const user = userEvent.setup();
    employeeShipments[0] = {
      ...employeeShipments[0],
      status: 'WAITING_DISPATCH',
      agentName: '宇环',
      routeAgentChannelName: '宇环 DHL',
      routeChargeWeightKg: 12.5,
      routeUnitPrice: 8,
      routeOtherFee: 5,
      routeCostTotal: 105,
      routeCurrency: 'RMB',
      routedAt: '2026-07-01T09:30:00.000Z'
    };
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
    await user.click(screen.getByRole('button', { name: '已排货' }));

    const routedRow = await screen.findByRole('row', { name: /SYGJ06061230001/ });
    expect(screen.getByRole('columnheader', { name: '业务成本' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '业务成本合计' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '市场成本' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '市场成本合计' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '排货时间' })).toBeInTheDocument();
    expect(within(routedRow).getByText('2026/7/1 17:30:00')).toBeInTheDocument();
    expect(within(routedRow).getByText('空运业务成本 160.00 RMB')).toBeInTheDocument();
    expect(within(routedRow).getByText('代理成本 105.00 RMB')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '待排货' }));
    expect(screen.queryByRole('columnheader', { name: '业务成本' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '市场成本' })).not.toBeInTheDocument();
  });

  it('opens routing assignment and lifecycle logs from the routing module', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(
      shipment('s-routing-log', 'SYGJ06061239998', 'SORT-LOG-0606', 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        latestTracking: '收货扫描'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await openRoutingFulfillment(user);

    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239998/ });
    await user.click(within(routingRow).getByRole('button', { name: /^排\s*货$/ }));
    const assignmentDialog = await screen.findByRole('dialog', { name: '市场排货' });
    expect(within(assignmentDialog).getByLabelText('代理')).toBeInTheDocument();
    expect(within(assignmentDialog).getByLabelText('代理渠道')).toBeInTheDocument();
    expect(within(routingRow).queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    expect(within(routingRow).queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
    await user.click(within(assignmentDialog).getByLabelText('代理'));
    await user.click(await screen.findByText('宇环 / 深圳宇环'));
    await user.type(within(assignmentDialog).getByLabelText('代理渠道'), '宇环 DHL');
    await user.type(within(assignmentDialog).getByLabelText('计费重'), '12.5');
    await user.type(within(assignmentDialog).getByLabelText('单价'), '8');
    await user.clear(within(assignmentDialog).getByLabelText('其他费用'));
    await user.type(within(assignmentDialog).getByLabelText('其他费用'), '5');
    await user.type(within(assignmentDialog).getByLabelText('其他费用备注'), '偏远费');
    expect(within(assignmentDialog).getByText('105.00 RMB')).toBeInTheDocument();
    await user.click(within(assignmentDialog).getByRole('button', { name: '确认排货' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/shipments\/s-routing-log\/route$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 12.5, unitPrice: 8, otherFee: 5, otherFeeRemark: '偏远费', currency: 'RMB' })
        })
      )
    );
    expect(await screen.findByText('市场排货完成，进入仓库管理待出库')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '已排货' }));
    const routedRow = await screen.findByRole('row', { name: /SYGJ06061239998/ });
    await user.click(within(routedRow).getByRole('button', { name: '排货日志' }));
    const routingLogDialog = await screen.findByRole('dialog', { name: '排货日志' });
    expect(within(routingLogDialog).getByText(/排货生命周期记录/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText(/渠道排货：代理/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText('操作时间')).toBeInTheDocument();
  });

  it('returns outbound shipments to pending routing with a reason', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(
      shipment('s-routing-return', 'SYGJ06061239996', 'RETURN-0606', 'OUTBOUNDED', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        agentName: '深圳宇环',
        channelName: 'DHL HK',
        routeAgentChannelName: '宇环 DHL',
        routeCostTotal: 100,
        routeChargeWeightKg: 10,
        routeUnitPrice: 10,
        routedAt: new Date().toISOString()
      })
    );
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
    await user.click(screen.getByRole('button', { name: '本周排货数据' }));
    const row = await screen.findByRole('row', { name: /SYGJ06061239996/ });
    await user.click(within(row).getByRole('button', { name: '退回重排' }));
    const dialog = await screen.findByRole('dialog', { name: '代理退回重排' });
    await user.type(within(dialog).getByLabelText('退回原因'), '代理仓无法出货');
    await user.click(within(dialog).getByRole('button', { name: '确认退回' }));

    expect(await screen.findByText('SYGJ06061239996 已退回待排货')).toBeInTheDocument();
  });
});
