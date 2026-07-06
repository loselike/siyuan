import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, employeeShipments, renderAndLogin, shipment } from '../testSupport/appTestHarness';

async function openOrderManagement(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
  expect(await screen.findByRole('heading', { name: '业务管理' })).toBeInTheDocument();
  let orderManagementButton = await screen.findByRole('button', { name: '运单管理' }).catch(() => null);
  if (!orderManagementButton) {
    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    orderManagementButton = await screen.findByRole('button', { name: '运单管理' });
  }
  await user.click(orderManagementButton);
  expect(await screen.findByRole('heading', { name: '我的订单中心' })).toBeInTheDocument();
}

async function openMarketFulfillment(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
  expect(await screen.findByRole('heading', { name: '市场管理' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '待排货' }));
  expect(await screen.findByRole('region', { name: /待排货/ })).toBeInTheDocument();
}

describe('Workspace flows', () => {
  it('logs in staff and loads API shipments into the existing workspace', async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
    await renderAndLogin('admin', 'admin123');

    expect(await screen.findByRole('heading', { name: 'AI 物流运营工作台' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /专线 \d+/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /快递/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /小包/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /已预报/ })).not.toBeInTheDocument();
    const staffMenuItems = screen.getAllByRole('menuitem').map((item) => item.textContent ?? '');
    expect(staffMenuItems).toEqual(expect.arrayContaining(['运营工作台', '业务管理', '仓库管理', '市场管理']));
    expect(screen.getByRole('button', { name: /专线运单池/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI 优先队列/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /产品地图/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /导入质检/ })).toBeInTheDocument();
    expect(screen.queryByText('全模块产品地图')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /产品地图/ }));
    expect(await screen.findByText('全模块产品地图')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /导入质检/ }));
    expect(await screen.findByText('智能导入质检')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /专线运单池/ }));
    expect(await screen.findByText('待处理运单')).toBeInTheDocument();
    expect(screen.getByText('履约风险')).toBeInTheDocument();
    expect(screen.getByText('今日待出库')).toBeInTheDocument();
    expect(screen.getByText('预计应收')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索客户 / 运单号 / 转单号 / 渠道 / 代理')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /全\s*部/ }).at(-1)!);
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(await screen.findByText('SYGJ06061230001')).toBeInTheDocument();
    expect(screen.getAllByText('9409-Daloday').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-06-06').length).toBeGreaterThan(0);
    expect(screen.queryByText('2026-06-06T09:40:00.000Z')).not.toBeInTheDocument();
    const orderRow = screen.getByRole('row', { name: /SYGJ06061230001/ });
    await user.click(within(orderRow).getByRole('button', { name: 'SYGJ06061230001' }));
    const detailDialog = await screen.findByRole('dialog', { name: /运单详情/ });
    const expectDetailText = (text: string) => {
      expect(within(detailDialog).getAllByText(text).length).toBeGreaterThan(0);
    };
    expect(within(detailDialog).getByRole('tab', { name: '基本信息' })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('tab', { name: '单件明细' })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('tab', { name: '费用明细' })).toBeInTheDocument();
    expectDetailText('客户单号');
    expect(within(detailDialog).getByText('RCV-0606')).toBeInTheDocument();
    expectDetailText('渠道');
    expect(within(detailDialog).getByText('DHL HK')).toBeInTheDocument();
    expectDetailText('创建时间');
    expectDetailText('客户名称');
    expectDetailText('运单号');
    expectDetailText('转单号');
    expectDetailText('目的地');
    expectDetailText('代理');
    expectDetailText('最新轨迹');
    expectDetailText('状态');
    expectDetailText('时效');
    expectDetailText('备注');
    expect(within(detailDialog).getByText('未指定代理')).toBeInTheDocument();
    expect(within(detailDialog).getByText('待获取快递号')).toBeInTheDocument();
    expect(within(detailDialog).getByText('无备注')).toBeInTheDocument();
    await user.click(within(detailDialog).getByRole('tab', { name: '单件明细' }));
    expect(await within(detailDialog).findByText('重量与件数')).toBeInTheDocument();
    expectDetailText('件数');
    expectDetailText('应收计费重');
    expectDetailText('代理计费重');
    await user.click(within(detailDialog).getByRole('tab', { name: '费用明细' }));
    expect(await within(detailDialog).findByText('费用与收款')).toBeInTheDocument();
    expectDetailText('收款金额');
    expectDetailText('收款币种');
    expectDetailText('收款方式');
    expect(await within(detailDialog).findByText('费用与利润')).toBeInTheDocument();
    await within(detailDialog).findByText('费用与利润');
    expect(within(detailDialog).getAllByText('应收费用').length).toBeGreaterThan(0);
    expect(within(detailDialog).getAllByText('应付费用').length).toBeGreaterThan(0);
    expect(await within(detailDialog).findByText('利润汇总')).toBeInTheDocument();
    expect(within(detailDialog).getByText('基础运费')).toBeInTheDocument();
    expect(within(detailDialog).getByText('代理运费')).toBeInTheDocument();
    expect(within(detailDialog).getByText('¥70.00')).toBeInTheDocument();
    await user.click(within(detailDialog).getByRole('button', { name: '关闭' }));
    const transferRow = screen.getByRole('row', { name: /SYGJ05291344165.*9064656160/ });
    expect(within(transferRow).getByRole('button', { name: 'SYGJ05291344165' })).toBeInTheDocument();
    expect(within(transferRow).getByRole('button', { name: /详\s*情/ })).toBeInTheDocument();
    expect(promptSpy).not.toHaveBeenCalled();
  });

  it('returns to the operations workspace when staff clicks the brand logo', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回运营工作台' }));
    expect(await screen.findByRole('heading', { name: 'AI 物流运营工作台' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '运营工作台' })).toHaveClass('is-active');
  });


  it('lets staff customize shipment table column order from the shipment pool toolbar', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('button', { name: '列设置' }));
    const columnSettingsDialog = await screen.findByRole('dialog', { name: '运单列设置' });
    const agentColumnRow = within(columnSettingsDialog).getByText('代理').closest('.column-settings-row');
    expect(agentColumnRow).not.toBeNull();
    await user.click(within(agentColumnRow as HTMLElement).getByRole('button', { name: /上\s*移/ }));
    expect(within(columnSettingsDialog).getByText('代理')).toBeInTheDocument();
  });


  it('calls the receive API and refreshes shipment state', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.getByRole('button', { name: '新建出货订单' })).toBeInTheDocument();
    const orderPreviewRegion = screen.getByRole('region', { name: '订单预览' });
    expect(orderPreviewRegion).toBeInTheDocument();
    expect(within(orderPreviewRegion).getByRole('columnheader', { name: '轨迹状态' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新建预报' })).not.toBeInTheDocument();
    expect(screen.getAllByText('收款金额').length).toBeGreaterThan(0);
    expect(screen.getAllByText('收款方式').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未知').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('$128.00')).not.toBeInTheDocument();
    expect(screen.queryByText('¥927.36')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /收\s*款/ })[0]);
    const paymentDialog = await screen.findByRole('dialog', { name: '登记收款金额' });
    expect(paymentDialog).toBeInTheDocument();
    await user.clear(within(paymentDialog).getByLabelText('收款金额 USD'));
    await user.type(within(paymentDialog).getByLabelText('收款金额 USD'), '258.5');
    await user.selectOptions(within(paymentDialog).getByLabelText('收款方式'), '阿里店铺');
    await user.click(within(paymentDialog).getByRole('button', { name: '确认收款' }));
    await screen.findByText('确认登记收款？');
    const confirmPaymentButtons = screen.getAllByRole('button', { name: '确认收款' });
    await user.click(confirmPaymentButtons[confirmPaymentButtons.length - 1]);
    expect(await screen.findByText('已登记收款 SYGJ06061230001：$258.50 / RMB 未知 / 阿里店铺')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '登记收款金额' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('确认登记收款？')).not.toBeInTheDocument());
    expect(screen.getByText('$258.50')).toBeInTheDocument();
    expect(screen.getByText('RMB 未知')).toBeInTheDocument();
    expect(screen.getByText('阿里店铺')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('代理')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'TEST-ORDER-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYTEST0606001');
    await user.clear(screen.getByLabelText('目的地'));
    await user.type(screen.getByLabelText('目的地'), '德国');
    expect(screen.queryByLabelText('承运商')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('收货渠道').closest('.ant-select-selector')!);
    await user.click(await screen.findByTitle('海运DDP'));
    await user.type(screen.getByLabelText('备注'), '客户要求优先入库，周五前排货');
    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('SYTEST0606001')).toBeInTheDocument();
    expect(screen.getAllByText('待获取快递号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9409-Daloday').length).toBeGreaterThan(0);
    expect(screen.getByText('德国')).toBeInTheDocument();
    expect(screen.getAllByText('备注').length).toBeGreaterThan(0);
    expect(screen.getByText('客户要求优先入库，周五前排货')).toBeInTheDocument();
    expect(screen.getAllByText('海运DDP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '审核通过' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '审核不通过' }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expect(screen.queryByText('SYTEST0606001')).not.toBeInTheDocument();

    await openOrderManagement(user);
    expect(await screen.findByText('SYTEST0606001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'CUSTOM-CHANNEL-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYCUSTOM0606001');
    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('SYCUSTOM0606001')).toBeInTheDocument();
    expect(screen.getAllByText('快递').length).toBeGreaterThan(0);
    const createdOrderRow = screen.getByRole('row', { name: /SYTEST0606001/ });
    expect(within(createdOrderRow).getByRole('button', { name: '审核通过' })).toBeInTheDocument();
    expect(within(createdOrderRow).getByRole('button', { name: '审核不通过' })).toBeInTheDocument();
    await user.click(within(createdOrderRow).getByRole('button', { name: '审核通过' }));
    expect(await screen.findByText('确认审核通过？')).toBeInTheDocument();
    expect(screen.queryByText('已审核通过，进入待排货')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('tooltip')).getByRole('button', { name: /^取\s*消$/ }));
    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    await user.click(within(createdOrderRow).getByRole('button', { name: '审核通过' }));
    await user.click(within(await screen.findByRole('tooltip')).getByRole('button', { name: '审核通过' }));
    expect(await screen.findByText('已审核通过，进入待排货')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shipments/s-new-SYTEST0606001/operational'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"status":"WAITING_SORT"')
      })
    );
    await openMarketFulfillment(user);
    const reviewedRoutingRow = await screen.findByRole('row', { name: /SYTEST0606001/ });
    expect(within(reviewedRoutingRow).getByRole('button', { name: '排 货' })).toBeInTheDocument();
    await openOrderManagement(user);

    expect(screen.queryByText('待预报')).not.toBeInTheDocument();
    expect(screen.queryByText('货物到仓信息')).not.toBeInTheDocument();
    expect(screen.queryByText('渠道/代理分配')).not.toBeInTheDocument();
    expect(screen.queryByText('出库确认')).not.toBeInTheDocument();
    expect(screen.queryByText('轨迹跟进')).not.toBeInTheDocument();
    expect(screen.getByText('新建出货订单待确认')).toBeInTheDocument();
    expect(screen.getByText('已登记收款金额或方式')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '已预报 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /已入库/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待排货/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待发货/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待上网/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待签收/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /退货\/滞留/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /审核通过 \d+/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /审核不通过 \d+/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /审核通过 \d+/ }));
    expect(screen.getAllByText('时效').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /全部/ }));
    expect(screen.getByText('在途 4 天')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /审核通过 \d+/ }));
    expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
  }, 10000);


  it('only shows fulfillment action buttons when the shipment status can execute them', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    const approvedRow = screen.getByRole('row', { name: /SYGJ06061230001/ });
    expect(within(approvedRow).getByText('已通过')).toBeInTheDocument();
    expect(within(approvedRow).getByRole('button', { name: '收 款' })).toBeInTheDocument();
    expect(within(approvedRow).getByRole('button', { name: '操作日志' })).toBeInTheDocument();
    expect(within(approvedRow).getByRole('button', { name: /删\s*除/ })).toBeInTheDocument();
    expect(within(approvedRow).queryByRole('button', { name: '修 改' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /SYGJ06061230003/ })).queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /SYGJ05291344165/ })).queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    expect(screen.getAllByText('已通过').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '标记退货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建问题件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认发货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
  });


  it('lets staff reject a pending fulfillment review with confirmation', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'REJECT-ORDER-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYREJECT0606001');
    await user.click(screen.getByRole('button', { name: '创建订单' }));

    const reviewRow = await screen.findByRole('row', { name: /SYREJECT0606001/ });
    await user.click(within(reviewRow).getByRole('button', { name: '审核不通过' }));
    expect(await screen.findByText('确认审核不通过？')).toBeInTheDocument();
    expect(screen.queryByText('已审核不通过，等待业务员修改资料')).not.toBeInTheDocument();
    await user.click(within(await screen.findByRole('tooltip')).getByRole('button', { name: '审核不通过' }));

    expect(await screen.findByText('已审核不通过，等待业务员修改资料')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /审核不通过 \d+/ }));
    const rejectedRow = await screen.findByRole('row', { name: /SYREJECT0606001/ });
    expect(within(rejectedRow).getByText('未通过')).toBeInTheDocument();
    expect(within(rejectedRow).queryByRole('button', { name: '审核通过' })).not.toBeInTheDocument();
  });


  it('lets staff persistently delete an outdated fulfillment shipment from the backend board', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    const targetRow = screen.getByRole('row', { name: /SYGJ06061230003/ });

    await user.click(within(targetRow).getByRole('button', { name: /删\s*除/ }));
    expect(await screen.findByText('确认删除该运单？')).toBeInTheDocument();
    expect(screen.getByText('SYGJ06061230003')).toBeInTheDocument();
    const confirmDeleteButtons = screen.getAllByRole('button', { name: /^删\s*除$/ });
    await user.click(confirmDeleteButtons[confirmDeleteButtons.length - 1]);

    expect(await screen.findByText('已人工删除运单 SYGJ06061230003')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ06061230003')).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shipments/s-3'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });


  it('shows customer portal for customer users only', async () => {
    await renderAndLogin('customer', 'customer123');

    expect(await screen.findByRole('heading', { name: '客户门户' })).toBeInTheDocument();
    expect(screen.getByText('新建预报')).toBeInTheDocument();
    expect(screen.getByText('我的运单')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统管理' })).not.toBeInTheDocument();
  });


  it('lets customer create a declared shipment and shows it in my shipments', async () => {
    const user = userEvent.setup();
    await renderAndLogin('customer', 'customer123');

    await user.type(screen.getByLabelText('客户单号'), 'CUST-NEW-001');
    await user.type(screen.getByLabelText('目的地国家'), '美国');
    await user.clear(screen.getByLabelText('重量'));
    await user.type(screen.getByLabelText('重量'), '2.4');
    await user.click(screen.getByRole('button', { name: '提交预报' }));

    expect(await screen.findByText('CUST-NEW-001')).toBeInTheDocument();
    expect(screen.getByText('已预报')).toBeInTheDocument();
  });


  it('shows realistic data child functions and SiliconFlow AI capability for every staff module', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    const moduleExpectations: Array<{ menu: string; heading: string; record: string; subNav?: RegExp }> = [
      { menu: '仓库管理', heading: '仓库管理中心', record: '待出库订单' },
      { menu: '市场管理', heading: '市场管理', record: '排货操作', subNav: /待排货/ },
      { menu: '物流轨迹管理', heading: '轨迹监控中心', record: '9064656160' },
      { menu: '客服管理', heading: '客服管理', record: '轨迹超过3天未更新', subNav: /问题件/ },
      { menu: '报价查价', heading: '报价查价中心', record: '查价' },
      { menu: '财务管理', heading: '财务管理', record: '基础运费', subNav: /应收审核/ },
      { menu: '基础资料库', heading: '基础资料库', record: '9409', subNav: /客户资料/ },
      { menu: '系统管理', heading: '系统管理', record: '管理员' }
    ];

    for (const item of moduleExpectations) {
      await user.click(screen.getByRole('menuitem', { name: item.menu }));
      expect(await screen.findByRole('heading', { name: item.heading })).toBeInTheDocument();
      if (item.subNav) {
        await user.click(screen.getAllByRole('button', { name: item.subNav })[0]);
      }
      expect(screen.getAllByText(item.record, { exact: false }).length).toBeGreaterThan(0);
    }

    await openMarketFulfillment(user);
    expect(screen.queryByText('核心能力')).not.toBeInTheDocument();
    expect(screen.queryByText('功能点')).not.toBeInTheDocument();
    expect(screen.queryByText('查询、筛选、批量处理、状态记录')).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '物流轨迹管理' }));
    expect(screen.queryByText('客户可见轨迹')).not.toBeInTheDocument();
  });


  it('shows carrier tasks on tracking page and syncs tracking manually', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '物流轨迹管理' }));
    expect(await screen.findByRole('heading', { name: '轨迹监控中心' })).toBeInTheDocument();
    expect(screen.getAllByText('承运商任务').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SYGJ05291344165').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SYGJ06061230003').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '同步轨迹' }));
    expect(await screen.findByText('轨迹同步成功：DHL 已揽收 9064656160')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /最新轨迹/ }));
    expect(screen.getByText('DHL 已揽收 9064656160')).toBeInTheDocument();
  });


  it('retries failed carrier tasks and keeps task controls staff-only', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '物流轨迹管理' }));
    expect(await screen.findByText('模拟承运商接口失败')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByText('轨迹同步成功：UPS 运输中 1Z26060600001')).toBeInTheDocument();

    cleanup();
    localStorage.clear();
    await renderAndLogin('customer', 'customer123');
    expect(screen.queryByRole('button', { name: '同步轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByText('承运商任务')).not.toBeInTheDocument();
  });


  it('masks detailed route and agent information for operator users only', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await openOrderManagement(user);

    await waitFor(() => expect(screen.getAllByText('DHL').length).toBeGreaterThan(0));
    expect(screen.queryByText('DHL HK')).not.toBeInTheDocument();
    expect(screen.queryByText('宇环')).not.toBeInTheDocument();

    cleanup();
    localStorage.clear();
    await renderAndLogin('admin', 'admin123');
    await openOrderManagement(user);

    expect(await screen.findAllByText('DHL HK')).not.toHaveLength(0);
    expect(screen.getAllByText('宇环')).not.toHaveLength(0);
  });


  it('shows the fulfillment stage board from the routing workspace too', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-board', 'SYGJ06061239997', 'SORT-BOARD-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await openMarketFulfillment(user);
    expect(screen.getAllByText('待排货').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户编号').length).toBeGreaterThan(0);
    expect(screen.queryByText('系统单号 / 转单号')).not.toBeInTheDocument();
    expect(screen.queryByText('渠道 / 代理')).not.toBeInTheDocument();
    expect(screen.getAllByText('运单号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理渠道').length).toBeGreaterThan(0);
    expect(screen.getAllByText('排货建议').length).toBeGreaterThan(0);
    expect(screen.getAllByText('排货操作').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SYGJ06061239997').length).toBeGreaterThan(0);
    expect(screen.queryByText('$128.00')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /待排货/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /待审核/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /已入库/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待发货/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待上网/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待签收/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /退货\/滞留/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量排货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量获取转单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量标记异常' })).not.toBeInTheDocument();
    expect(document.querySelector('.batch-bar')).not.toBeInTheDocument();
  });


  it('keeps routing workspace row actions independent from fulfillment actions', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-actions', 'SYGJ06061239996', 'SORT-ACTIONS-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await openMarketFulfillment(user);

    const routingRow = screen.getByRole('row', { name: /SYGJ06061239996/ });
    expect(within(routingRow).queryByRole('button', { name: '添加轨迹' })).not.toBeInTheDocument();
    expect(screen.getAllByText('排货操作').length).toBeGreaterThan(0);
    expect(screen.queryByText('履约操作')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收款' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建问题件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '标记退货' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
  });


  it('keeps delete hidden from pending routing rows', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-no-delete', 'SYGJ06061239995', 'SORT-NODELETE-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await openMarketFulfillment(user);
    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239995/ });

    expect(within(routingRow).queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
    expect(screen.queryByText('确认删除该运单？')).not.toBeInTheDocument();
  });


  it('only shows routing assignment when the shipment is waiting for route allocation', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-ready', 'SYGJ06061239999', 'SORT-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await openMarketFulfillment(user);

    expect(screen.queryByText('SYGJ06061230001')).not.toBeInTheDocument();
    expect(screen.queryByText('SYGJ06061230003')).not.toBeInTheDocument();
    expect(screen.queryByText('SYGJ05291344165')).not.toBeInTheDocument();

    const sortableRow = await screen.findByRole('row', { name: /SYGJ06061239999/ });
    expect(within(sortableRow).getByRole('button', { name: '排 货' })).toBeInTheDocument();
  });


  it('hides routing mutation buttons for shipments that are still waiting for audit', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    expect(await screen.findByRole('dialog', { name: '新建出货订单' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'ROUTE-DRAFT-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYDRAFTROUTE001');
    await user.click(screen.getByRole('button', { name: '创建订单' }));
    expect(await screen.findByText('SYDRAFTROUTE001')).toBeInTheDocument();

    await openMarketFulfillment(user);
    expect(screen.queryByText('SYDRAFTROUTE001')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '添加轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建问题件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '标记退货' })).not.toBeInTheDocument();
  });


  it('opens routing lifecycle logs from the routing workspace', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-log', 'SYGJ06061239998', 'SORT-LOG-0606', 'WAITING_SORT', '9409-Daloday', { latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await openMarketFulfillment(user);

    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239998/ });
    await user.click(within(routingRow).getByRole('button', { name: '排 货' }));
    const assignmentDialog = await screen.findByRole('dialog', { name: '市场排货' });
    expect(within(assignmentDialog).getByLabelText('代理')).toBeInTheDocument();
    expect(within(assignmentDialog).getByLabelText('代理渠道')).toBeInTheDocument();
    await user.click(within(assignmentDialog).getByLabelText('代理'));
    await user.click(await screen.findByText('宇环 / 深圳宇环'));
    await user.type(within(assignmentDialog).getByLabelText('代理渠道'), '宇环 DHL');
    await user.clear(within(assignmentDialog).getByLabelText('计费重'));
    await user.type(within(assignmentDialog).getByLabelText('计费重'), '12');
    await user.clear(within(assignmentDialog).getByLabelText('单价'));
    await user.type(within(assignmentDialog).getByLabelText('单价'), '8');
    await user.click(within(assignmentDialog).getByRole('button', { name: '确认排货' }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/shipments\/s-routing-log\/route$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            channelId: 'ch-dhl-hk',
            agentId: 'a-yuhuan',
            agentChannelName: '宇环 DHL',
            chargeWeightKg: 12,
            unitPrice: 8,
            otherFee: 0,
            currency: 'RMB',
            shippingMarkRequired: false
          })
        })
      )
    );
    expect(await screen.findByText('市场排货完成，已进入已排货')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '已排货' }));

    const routedRow = await screen.findByRole('row', { name: /SYGJ06061239998/ });
    await user.click(within(routedRow).getByRole('button', { name: '排货日志' }));
    const routingLogDialog = await screen.findByRole('dialog', { name: '排货日志' });
    expect(within(routingLogDialog).getByText(/排货生命周期记录/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText(/渠道排货：代理 深圳宇环，渠道 DHL HK/)).toBeInTheDocument();
    expect(within(routingLogDialog).getByText('操作时间')).toBeInTheDocument();
    expect(routingLogDialog.querySelector('.ant-pagination')).toBeInTheDocument();
  });


  it('keeps bulk tracking import hidden from the fulfillment workspace', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '批量添加轨迹' })).not.toBeInTheDocument();
  });


  it('calls AI assist from module buttons and renders the returned content', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
    await user.click(await screen.findByRole('button', { name: 'AI 辅助处理' }));

    expect(await screen.findByText(/硅基流动实时输出|本地兜底输出/)).toBeInTheDocument();
    expect(screen.getByText('AI 已输出市场管理建议')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/assist'),
      expect.objectContaining({ method: 'POST' })
    );
  });

});
