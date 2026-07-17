import { screen, waitFor, within } from '@testing-library/react';
import { Modal } from 'antd';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { employeeShipments, renderAndLogin, shipment } from '../testSupport/appTestHarness';
import { createPendingRoutingColumns } from '../shared/pendingRoutingColumns';

async function openRoutingFulfillment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
  expect(await screen.findByRole('heading', { name: '市场管理' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '待排货' }));
  expect(await screen.findByRole('region', { name: /待排货/ })).toBeInTheDocument();
}

describe('Routing flows', () => {
  it('does not expose market management to ordinary business operators', async () => {
    await renderAndLogin('operator', 'operator123');

    expect(screen.queryByRole('menuitem', { name: '市场管理' })).not.toBeInTheDocument();
  });

  it('shows market dashboard task cards with status colors and navigation', async () => {
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
        agentName: '出货代理A',
        outboundAt: '2026-06-01T10:00:00.000Z',
        businessType: 'DEDICATED_LINE'
      }),
      shipment('s-routing-dashboard-reroute', 'SYGJ06061239987', 'REROUTE-DASHBOARD-0606', 'OUTBOUNDED', '9409-Daloday', {
        agentName: '异常代理',
        businessType: 'DEDICATED_LINE',
        routeReturnedAt: routedAt
      }),
      shipment('s-routing-dashboard-weekly-outbound-1', 'SYGJ06061239990', 'OUT-DASHBOARD-0607', 'OUTBOUNDED', '9409-Daloday', {
        agentName: '出货代理A',
        outboundAt: routedAt,
        businessType: 'DEDICATED_LINE'
      }),
      shipment('s-routing-dashboard-weekly-outbound-2', 'SYGJ06061239989', 'OUT-DASHBOARD-0608', 'OUTBOUNDED', '9409-Daloday', {
        agentName: '出货代理A',
        outboundAt: routedAt,
        businessType: 'DEDICATED_LINE'
      }),
      shipment('s-routing-dashboard-weekly-outbound-3', 'SYGJ06061239988', 'OUT-DASHBOARD-0609', 'OUTBOUNDED', '9409-Daloday', {
        agentName: '出货代理B',
        outboundAt: routedAt,
        businessType: 'DEDICATED_LINE'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
    expect(await screen.findByRole('heading', { name: '市场管理' })).toBeInTheDocument();

    const dashboard = document.querySelector('.market-dashboard') as HTMLElement;
    expect(dashboard).not.toBeNull();
    expect(within(dashboard).getByText('待处理')).toBeInTheDocument();
    expect(within(dashboard).getByText('流转中')).toBeInTheDocument();
    expect(within(dashboard).getByText('今日结果')).toBeInTheDocument();
    expect(within(dashboard).getByText('本周风险')).toBeInTheDocument();
    expect(dashboard.querySelector('.market-status-card-amber')).not.toBeNull();
    expect(dashboard.querySelector('.market-status-card-blue')).not.toBeNull();
    expect(dashboard.querySelector('.market-status-card-green')).not.toBeNull();
    expect(dashboard.querySelector('.market-status-card-red')).not.toBeNull();
    expect(dashboard.querySelector('.market-status-row-indigo')).not.toBeNull();
    expect(within(dashboard).getByRole('button', { name: /待排货 1 票/ })).toBeInTheDocument();
    expect(within(dashboard).getByRole('button', { name: /已排货\/待出库 \d+ 票/ })).toBeInTheDocument();
    expect(within(dashboard).getByRole('button', { name: /今日出货 3 票/ })).toBeInTheDocument();
    expect(within(dashboard).getByRole('button', { name: /退回重排 1 票/ })).toBeInTheDocument();
    expect(within(dashboard).getByRole('button', { name: /敏感货物 1 票/ })).toBeInTheDocument();
    expect(within(dashboard).getByRole('button', { name: /报关货物 1 票/ })).toBeInTheDocument();
    expect(screen.getByText('本周排货代理')).toBeInTheDocument();
    expect(screen.getByText('今日排货')).toBeInTheDocument();
    expect(screen.getByText('今日出货')).toBeInTheDocument();
    expect(screen.getByText('空运代理')).toBeInTheDocument();
    expect(screen.getByText('海运代理')).toBeInTheDocument();
    expect(screen.getByText('本周排货渠道（空运/海运）')).toBeInTheDocument();
    expect(screen.getByText('空运')).toBeInTheDocument();
    expect(screen.getByText('海运')).toBeInTheDocument();
    expect(screen.getByText('本周敏感货物')).toBeInTheDocument();
    expect(screen.getAllByText('带电/带磁/敏感').length).toBeGreaterThan(0);
    expect(screen.getByText('本周报关货物')).toBeInTheDocument();
    expect(screen.queryByText('待排货概览')).not.toBeInTheDocument();
    expect(screen.queryByText('代理成本')).not.toBeInTheDocument();
    expect(screen.queryByText('利润')).not.toBeInTheDocument();
    expect(screen.queryByText('应付合计')).not.toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /SYGJ06061239994/ })).not.toBeInTheDocument();

    await user.click(within(dashboard).getByRole('button', { name: /待排货 1 票/ }));
    expect(await screen.findByRole('region', { name: /待排货/ })).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /SYGJ06061239994/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '市场看板' }));
    const refreshedDashboard = document.querySelector('.market-dashboard') as HTMLElement;
    await user.click(within(refreshedDashboard).getByRole('button', { name: /已排货\/待出库 \d+ 票/ }));
    expect(await screen.findByRole('region', { name: /已排货/ })).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /SYGJ06061239993/ })).toBeInTheDocument();
  });

  it('shows 待排货 fields in market-workbench order with 排货 审核 修改 操作日志 actions', async () => {
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
    expect(screen.getAllByText('公司渠道').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务成本合计').length).toBeGreaterThan(0);
    expect(screen.getAllByText('应付合计').length).toBeGreaterThan(0);
    expect(screen.queryByText('出货单号 / 转单号')).not.toBeInTheDocument();
    expect(screen.queryByText('渠道 / 代理')).not.toBeInTheDocument();
    expect(screen.getAllByText('运单号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理渠道').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /待排货/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /待审核/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();

    const routingRow = screen.getByRole('row', { name: /SYGJ06061239995/ });
    const expectedFieldOrder = ['日期', '站点', '业务员', '客户编号', '运单号', '公司渠道', '国家', '货物数据', '业务成本', '业务成本合计', '选项', '代理', '代理渠道', '应付成本', '应付合计', '操作'];
    const columnTitles = createPendingRoutingColumns({ mode: 'market' }).map((column) => String(column.title));
    expect(columnTitles).toEqual(expectedFieldOrder);
    expect(screen.getByRole('columnheader', { name: '日期' })).toBeInTheDocument();
    expect(within(routingRow).getByText('2026-07-01 17:00:00')).toBeInTheDocument();
    expect(within(routingRow).queryByRole('button', { name: '添加轨迹' })).not.toBeInTheDocument();
    expect(within(routingRow).getByRole('button', { name: /排\s*货/ })).toBeInTheDocument();
    expect(within(routingRow).getByRole('button', { name: /审\s*核/ })).toBeInTheDocument();
    expect(within(routingRow).getByRole('button', { name: /修\s*改/ })).toBeInTheDocument();
    expect(within(routingRow).getByRole('button', { name: '操作日志' })).toBeInTheDocument();
    expect(within(routingRow).queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
    await user.dblClick(routingRow);
    const routingDialog = await screen.findByRole('dialog', { name: '市场排货' });
    expect(within(routingDialog).getByRole('tab', { name: '基本信息' })).toBeInTheDocument();
    expect(within(routingDialog).getByRole('tab', { name: '业务成本' })).toBeInTheDocument();
    expect(within(routingDialog).getByRole('tab', { name: '应付成本' })).toBeInTheDocument();
    expect(within(routingDialog).getByLabelText('国家')).toBeInTheDocument();
    await user.click(within(routingDialog).getByRole('button', { name: /取\s*消/ }));
    expect(screen.getAllByText('操作').length).toBeGreaterThan(0);
    expect(screen.queryByText('履约操作')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收款' })).not.toBeInTheDocument();
  });

  it('shows newly added payable costs in the pending-routing dialog without reopening it', async () => {
    const user = userEvent.setup();
    const suffix = Date.now();
    const systemOrderNo = `SYROUTECOST${suffix}`;
    const feeName = `即时显示应付费用-${suffix}`;
    employeeShipments.unshift(
      shipment(`s-routing-cost-refresh-${suffix}`, systemOrderNo, `ROUTE-COST-${suffix}`, 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await openRoutingFulfillment(user);
    const routingRow = await screen.findByRole('row', { name: new RegExp(systemOrderNo) });
    await user.click(within(routingRow).getByRole('button', { name: /排\s*货/ }));
    const routingDialog = await screen.findByRole('dialog', { name: '市场排货' });
    await user.click(within(routingDialog).getByRole('tab', { name: '应付成本' }));
    await user.click(within(routingDialog).getByRole('button', { name: '新增费用' }));

    const costDialog = await screen.findByRole('dialog', { name: '应付成本费用' });
    await user.type(within(costDialog).getByLabelText('费用名称'), feeName);
    await user.type(within(costDialog).getByLabelText('手工总金额'), '25');
    await user.click(within(costDialog).getByRole('button', { name: '保存费用' }));

    await waitFor(() => expect(within(routingDialog).getByText(feeName)).toBeInTheDocument());
    expect(within(routingDialog).getByText('25.00 RMB')).toBeInTheDocument();
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
    expect(within(sortableRow).getByRole('button', { name: /排\s*货/ })).toBeInTheDocument();
    expect(within(sortableRow).getByRole('button', { name: /审\s*核/ })).toBeInTheDocument();
    expect(within(sortableRow).getByRole('button', { name: /修\s*改/ })).toBeInTheDocument();
  });

  it('审核通过 moves a completed routing row into routed and warehouse dispatch queues', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(
      shipment('s-routing-approve', 'SYGJ06061239989', 'SORT-APPROVE-0606', 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        latestTracking: '待市场审核',
        channelId: 'ch-dhl-hk',
        channelName: 'DHL HK',
        agentId: 'a-yuhuan',
        agentName: '宇环',
        routeAgentChannelName: '宇环 DHL',
        routeChargeWeightKg: 12.5,
        routeUnitPrice: 8,
        routeOtherFee: 0,
        routeCurrency: 'RMB'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await openRoutingFulfillment(user);

    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239989/ });
    await user.click(within(routingRow).getByRole('button', { name: /审\s*核/ }));
    const confirmation = await screen.findByRole('dialog', { name: '确认审核排货' });
    await user.click(within(confirmation).getByRole('button', { name: '确认审核' }));

    expect(await screen.findByText(/SYGJ06061239989 审核通过，已同步进入已排货和待出库/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '已排货' }));
    expect(await screen.findByRole('row', { name: /SYGJ06061239989/ })).toBeInTheDocument();
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
    expect(screen.getByRole('columnheader', { name: '代理渠道' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '状态' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();
    const routedTable = document.querySelector('.routing-routed-table') as HTMLElement;
    expect(routedTable).not.toBeNull();
    expect(routedTable.querySelector('.managed-table-settings-column')).toBeInTheDocument();
    expect(routedTable.querySelector('.managed-table-toolbar')).toBeNull();
    expect(within(routedRow).getByText('2026/7/1 17:30:00')).toBeInTheDocument();
    expect(within(routedRow).getByText('代理成本 105.00 RMB')).toBeInTheDocument();
    expect(within(routedRow).getByRole('button', { name: /修\s*改/ })).toBeInTheDocument();
    expect(within(routedRow).getByRole('button', { name: '排货日志' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '待排货' }));
    expect(screen.getByRole('columnheader', { name: '业务成本' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '业务成本合计' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '应付成本' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '应付合计' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '市场成本' })).not.toBeInTheDocument();
  });

  it('keeps the market pending-routing context after routing succeeds', async () => {
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
    await user.click(within(routingRow).getByRole('button', { name: /修\s*改/ }));
    const assignmentDialog = await screen.findByRole('dialog', { name: '市场排货' });
    expect(within(assignmentDialog).getByLabelText('代理')).toBeInTheDocument();
    expect(within(assignmentDialog).getByLabelText('代理渠道')).toBeInTheDocument();
    await user.click(within(assignmentDialog).getByLabelText('代理'));
    await user.click(await screen.findByText('宇环 / 深圳宇环'));
    await user.type(within(assignmentDialog).getByLabelText('代理渠道'), '宇环 DHL');
    await user.type(within(assignmentDialog).getByLabelText('计费重'), '12.5');
    await user.type(within(assignmentDialog).getByLabelText('单价'), '8');
    await user.clear(within(assignmentDialog).getByLabelText('其他费用'));
    await user.type(within(assignmentDialog).getByLabelText('其他费用'), '5');
    await user.type(within(assignmentDialog).getByLabelText('其他费用备注'), '偏远费');
    expect(within(assignmentDialog).getByText('105.00 RMB')).toBeInTheDocument();
    await user.click(within(assignmentDialog).getByRole('button', { name: /排\s*货/ }));
    await user.click(await screen.findByRole('button', { name: '确认排货' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/shipments\/s-routing-log\/route$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 12.5, unitPrice: 8, otherFee: 5, otherFeeRemark: '偏远费', currency: 'RMB', shippingMarkRequired: false, approve: true })
        })
      )
    );
    expect(await screen.findByText('市场排货审核通过，已进入待出库')).toBeInTheDocument();
    const pendingRegion = await screen.findByRole('region', { name: /待排货/ });
    expect(within(pendingRegion).queryByRole('row', { name: /SYGJ06061239998/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /已排货/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '已排货' }));
    const routedRow = await screen.findByRole('row', { name: /SYGJ06061239998/ });
    await user.click(within(routedRow).getByRole('button', { name: '排货日志' }));
    const routingLogDialog = await screen.findByRole('dialog', { name: '排货日志' });
    expect(within(routingLogDialog).getByText(/排货生命周期记录/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText(/渠道排货：代理/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText('操作时间')).toBeInTheDocument();
  });

  it('opens 待排货 操作日志 without exposing a delete action', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(
      shipment('s-routing-delete', 'SYGJ06061239986', 'SORT-DELETE-0606', 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        latestTracking: '等待市场排货',
        reviewedAt: '2026-07-01T09:00:00.000Z'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await openRoutingFulfillment(user);

    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239986/ });
    await user.click(within(routingRow).getByRole('button', { name: '操作日志' }));
    const routingLogDialog = await screen.findByRole('dialog', { name: '操作日志' });
    expect(within(routingLogDialog).getByText(/全生命周期操作记录/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText('渠道排货：进入待排货')).toBeInTheDocument();
    await user.click(within(routingLogDialog).getByRole('button', { name: /关\s*闭/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '操作日志' })).not.toBeInTheDocument());
    expect(within(await screen.findByRole('row', { name: /SYGJ06061239986/ })).queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
  });

  it('keeps routing dialog open and shows backend errors when assignment fails', async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(Modal, 'error').mockReturnValue({ destroy: vi.fn(), update: vi.fn() } as never);
    employeeShipments.unshift(
      shipment('s-routing-fail', 'SYGJ06061239997', 'SORT-FAIL-0606', 'WAITING_SORT', '9409-Daloday', {
        businessType: 'DEDICATED_LINE',
        latestTracking: '收货扫描'
      })
    );
    await renderAndLogin('admin', 'admin123');

    await openRoutingFulfillment(user);

    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239997/ });
    await user.click(within(routingRow).getByRole('button', { name: /修\s*改/ }));
    const assignmentDialog = await screen.findByRole('dialog', { name: '市场排货' });
    await user.click(within(assignmentDialog).getByLabelText('代理'));
    await user.click(await screen.findByText('宇环 / 深圳宇环'));
    await user.type(within(assignmentDialog).getByLabelText('代理渠道'), '宇环 DHL');
    await user.type(within(assignmentDialog).getByLabelText('计费重'), '12.5');
    await user.type(within(assignmentDialog).getByLabelText('单价'), '8');

    const target = employeeShipments.find((item) => item.id === 's-routing-fail');
    if (target) target.status = 'OUTBOUNDED';

    await user.click(within(assignmentDialog).getByRole('button', { name: /排\s*货/ }));
    await user.click(await screen.findByRole('button', { name: '确认排货' }));

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ title: '排货失败', content: '当前状态不允许排货' })));
    expect(screen.getByRole('dialog', { name: '市场排货' })).toBeInTheDocument();
    expect(within(assignmentDialog).getByDisplayValue('宇环 DHL')).toBeInTheDocument();
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
