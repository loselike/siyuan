import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => cleanup());

describe('AI logistics workspace', () => {
  it('shows the operations dashboard with status counts and AI queue', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'AI 物流运营工作台' })).toBeInTheDocument();
    expect(screen.getByText('快递 9')).toBeInTheDocument();
    expect(screen.getByText('待上网 2')).toBeInTheDocument();
    expect(screen.getByText('AI 优先处理队列')).toBeInTheDocument();
    expect(screen.getByText('导入运单')).toBeInTheDocument();
    expect(screen.getByText('智能录单')).toBeInTheDocument();
  });

  it('filters shipments when switching business type', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '专线 1' }));

    expect(screen.getByText('SYZX0606UK001')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ05291344165')).not.toBeInTheDocument();
  });

  it('surfaces the expanded product modules and AI-first workflows', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '全模块产品地图' })).toBeInTheDocument();
    expect(screen.getByText('员工端')).toBeInTheDocument();
    expect(screen.getByText('客户端')).toBeInTheDocument();
    expect(screen.getByText('AI 助手')).toBeInTheDocument();
    expect(screen.getByText('开放集成')).toBeInTheDocument();
    expect(screen.getByText('智能导入质检')).toBeInTheDocument();
    expect(screen.getByText('报价查价')).toBeInTheDocument();
    expect(screen.getByText('财务结算')).toBeInTheDocument();
    expect(screen.getByText('客户门户')).toBeInTheDocument();
  });

  it('opens the fulfillment page from the sidebar and filters by stage', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    expect(screen.getByRole('heading', { name: '运单履约中心' })).toBeInTheDocument();
    expect(screen.getByText('履约阶段看板')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /待收货/ }));
    expect(screen.getByText('SYGJ06061230001')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ06059409051')).not.toBeInTheDocument();
  });

  it('updates local shipment state through fulfillment actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));
    await user.click(screen.getByRole('button', { name: /待收货/ }));
    await user.click(screen.getByRole('button', { name: '确认收货' }));

    expect(await screen.findByText('已确认收货，进入待排货')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ06061230001')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /待排货/ }));
    expect(screen.getByText('SYGJ06061230001')).toBeInTheDocument();
  });

  it('shows AI fulfillment advice and blocks invalid local actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('menuitem', { name: '运单履约' }));

    expect(screen.getByText('AI 履约助手')).toBeInTheDocument();
    expect(screen.getAllByText('补齐转单号').length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: '确认收货' })[0]);
    expect(await screen.findByText('当前状态不允许执行确认收货')).toBeInTheDocument();
  });

  it('opens independent pages for the remaining operation modules', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('menuitem', { name: '收货打单' }));
    expect(screen.getByRole('heading', { name: '收货打单中心' })).toBeInTheDocument();
    expect(screen.getByText('收货扫描')).toBeInTheDocument();
    expect(screen.getByText('重量异常识别')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    expect(screen.getByRole('heading', { name: '渠道排货中心' })).toBeInTheDocument();
    expect(screen.getByText('规则排货')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(screen.getByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    expect(screen.getByText('自然语言查价')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '财务结算' }));
    expect(screen.getByRole('heading', { name: '财务结算中心' })).toBeInTheDocument();
    expect(screen.getByText('费用差异解释')).toBeInTheDocument();
  });

  it('shows simulated business data for every independent module page', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('menuitem', { name: '收货打单' }));
    expect(screen.getByText('入库扫描批次 RCV-0606-A')).toBeInTheDocument();
    expect(screen.getByText('SYGJ06061230001')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '渠道排货' }));
    expect(screen.getByText('DHL HK 优先')).toBeInTheDocument();
    expect(screen.getByText('UPS 加美线')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '轨迹监控' }));
    expect(screen.getAllByText('9 天未更新').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户可见').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('menuitem', { name: '问题件中心' }));
    expect(screen.getByText('清关资料缺失')).toBeInTheDocument();
    expect(screen.getByText('SLA 18h')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(screen.getByText('美国 12kg DHL')).toBeInTheDocument();
    expect(screen.getByText('¥410.00')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '财务结算' }));
    expect(screen.getByText(/应收 ¥1,864.20/)).toBeInTheDocument();
    expect(screen.getAllByText(/代理对账/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('menuitem', { name: '统计报表' }));
    expect(screen.getByText('今日发货 46')).toBeInTheDocument();
    expect(screen.getByText('利润率 18.6%')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '基础资料' }));
    expect(screen.getByText('9409-Daloday')).toBeInTheDocument();
    expect(screen.getByText('HKD01 代理价')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '系统设置' }));
    expect(screen.getAllByText('状态字典').length).toBeGreaterThan(0);
    expect(screen.getByText('转单提醒')).toBeInTheDocument();
  });
});
