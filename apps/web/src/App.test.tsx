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

    await user.click(screen.getByRole('button', { name: '专线 4' }));

    expect(screen.getByText('SYZX0606UK001')).toBeInTheDocument();
    expect(screen.queryByText('SYGJ05291344165')).not.toBeInTheDocument();
  });

  it('shows a dedicated small packet workspace when switching business type', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '小包 6' }));

    expect(screen.getByText('小包运单池')).toBeInTheDocument();
    expect(screen.getByText('轻小件批量预报、邮袋交接、挂号/平邮转单和上网时效跟进。')).toBeInTheDocument();
    expect(screen.getAllByText('邮袋交接').length).toBeGreaterThan(0);
    expect(screen.getByText('SYXB0606DE002')).toBeInTheDocument();
    expect(screen.getByText('燕文小包线')).toBeInTheDocument();
    expect(screen.getAllByText('待交邮袋').length).toBeGreaterThan(0);
  });

  it('shows a dedicated line workspace when switching business type', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '专线 4' }));

    expect(screen.getByText('专线运单池')).toBeInTheDocument();
    expect(screen.getByText('专线业务聚焦 FBA/海外仓大货、装板排舱、清关节点和头程/尾程轨迹。')).toBeInTheDocument();
    expect(screen.getByText('批量装板')).toBeInTheDocument();
    expect(screen.getByText('排舱确认')).toBeInTheDocument();
    expect(screen.getByText('清关资料审核')).toBeInTheDocument();
    expect(screen.getByText('SYZX0606US002')).toBeInTheDocument();
    expect(screen.getByText('美国 FBA 空派')).toBeInTheDocument();
    expect(screen.getByText('欧洲卡航')).toBeInTheDocument();
    expect(screen.getAllByText('清关查验').length).toBeGreaterThan(0);
    expect(screen.getByText('专线作业重点')).toBeInTheDocument();
    expect(screen.getByText('装板/排舱')).toBeInTheDocument();
    expect(screen.getByText('清关资料')).toBeInTheDocument();
    expect(screen.getAllByText('尾程转单').length).toBeGreaterThan(0);
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

  it('shows administrator settings with separated permission areas', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('menuitem', { name: '系统设置' }));

    expect(screen.getByRole('heading', { name: '系统设置中心' })).toBeInTheDocument();
    expect(screen.getByText('系统管理员 · 最大权限')).toBeInTheDocument();
    expect(screen.getByText('员工账号管理')).toBeInTheDocument();
    expect(screen.getByText('新建员工')).toBeInTheDocument();
    expect(screen.getByText('员工账号重置密码')).toBeInTheDocument();
    expect(screen.getByText('角色权限分配')).toBeInTheDocument();
    expect(screen.getByText('分配客户端角色权限')).toBeInTheDocument();
    expect(screen.getAllByText('管理员').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客服').length).toBeGreaterThan(0);
    expect(screen.getAllByText('操作').length).toBeGreaterThan(0);
    expect(screen.getAllByText('财务').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户').length).toBeGreaterThan(0);
    expect(screen.getByText('拥有全部菜单、按钮、数据范围和系统参数权限')).toBeInTheDocument();
    expect(screen.getAllByText('权限修改必须写入 audit_logs').length).toBeGreaterThan(0);
  });
});
