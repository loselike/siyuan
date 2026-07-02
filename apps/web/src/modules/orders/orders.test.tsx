import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';

async function openOrderManagement(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
  expect(await screen.findByRole('heading', { name: '业务管理' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '运单管理' }));
  expect(await screen.findByRole('heading', { name: '我的订单中心' })).toBeInTheDocument();
}

describe('Orders flows', () => {
  it('shows the orders workspace and creates an outbound order without changing create logic', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.getByRole('button', { name: '新建出货订单' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '订单预览' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI 订单助手/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();

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
    expect(screen.getByText('德国')).toBeInTheDocument();
    expect(screen.getByText('客户要求优先入库，周五前排货')).toBeInTheDocument();
    expect(screen.getAllByText('海运DDP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '审核通过' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '审核不通过' }).length).toBeGreaterThan(0);
  });

  it('keeps order payment and audit actions wired to the existing parent callbacks', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await openOrderManagement(user);
    expect(screen.getAllByText('收款金额').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未知').length).toBeGreaterThanOrEqual(2);

    await user.click(screen.getAllByRole('button', { name: /收\s*款/ })[0]);
    const paymentDialog = await screen.findByRole('dialog', { name: '登记收款金额' });
    await user.clear(within(paymentDialog).getByLabelText('收款金额 USD'));
    await user.type(within(paymentDialog).getByLabelText('收款金额 USD'), '258.5');
    await user.selectOptions(within(paymentDialog).getByLabelText('收款方式'), '阿里店铺');
    await user.click(within(paymentDialog).getByRole('button', { name: '确认收款' }));
    await screen.findByText('确认登记收款？');
    const confirmPaymentButtons = screen.getAllByRole('button', { name: '确认收款' });
    await user.click(confirmPaymentButtons[confirmPaymentButtons.length - 1]);

    expect(await screen.findByText('已登记收款 SYGJ06061230001：$258.50 / RMB 未知 / 阿里店铺')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '登记收款金额' })).not.toBeInTheDocument());
    expect(screen.getByText('$258.50')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建出货订单' }));
    await user.clear(await screen.findByLabelText('客户单号'));
    await user.type(screen.getByLabelText('客户单号'), 'APPROVE-ORDER-001');
    await user.clear(screen.getByLabelText('系统单号'));
    await user.type(screen.getByLabelText('系统单号'), 'SYAPPROVE0606001');
    await user.click(screen.getByRole('button', { name: '创建订单' }));

    const createdOrderRow = await screen.findByRole('row', { name: /SYAPPROVE0606001/ });
    await user.click(within(createdOrderRow).getByRole('button', { name: '审核通过' }));
    expect(await screen.findByText('确认审核通过？')).toBeInTheDocument();
    await user.click(within(await screen.findByRole('tooltip')).getByRole('button', { name: '审核通过' }));
    expect(await screen.findByText('已审核通过，进入待排货')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shipments/s-new-SYAPPROVE0606001/operational'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"status":"WAITING_SORT"')
      })
    );
  });

  it('only shows fulfillment action buttons when the order status can execute them', async () => {
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
    expect(screen.queryByRole('button', { name: '分配渠道' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '填写转单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量添加轨迹' })).not.toBeInTheDocument();
  });
});
