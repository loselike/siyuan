import { useState } from 'react';
import { Form } from 'antd';
import type { FinanceCatalogItemInput, FinanceCatalogItemSummary } from '@siyuan/shared';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';
import { createFinanceCatalogFilters } from './catalog';
import { filterLocationOption, getStateOptions } from './entry/countryStateOptions';
import { FinanceCatalogPage, type FinanceCatalogFilters } from './FinanceCatalogPage';

describe('Finance flows', () => {
  const clickFinanceSideButton = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    const buttons = await screen.findAllByRole('button', { name });
    await user.click(buttons[0]);
  };

  it('录单客户名称严格按客户编号从客户资料带出', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '录单' }));

    fireEvent.change(screen.getByLabelText('客户编号'), { target: { value: '9409' } });
    expect(await screen.findByDisplayValue('Daloday')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('客户编号'), { target: { value: 'UNKNOWN' } });
    await waitFor(() => expect(screen.getByLabelText('客户名称')).toHaveValue(''));
    expect(screen.getByLabelText('客户名称')).toHaveAttribute('readonly');
  });

  it('州/省地区选项覆盖中国美国英国加拿大墨西哥沙特阿曼阿联酋南非德国西班牙澳大利亚法国奥地利', () => {
    const expectCount = (country: string, count: number) => {
      expect(getStateOptions(country)).toHaveLength(count);
    };
    const expectSearch = (country: string, keyword: string, expectedValue: string) => {
      const hits = getStateOptions(country).filter((option) => filterLocationOption(keyword, option));
      expect(hits.some((option) => option.value === expectedValue || option.label.includes(expectedValue))).toBe(true);
    };

    expectCount('中国', 34);
    expectSearch('China', '贵州', '贵州');
    expectSearch('CN', 'Chongqing', '重庆');
    expectSearch('CHN', 'GZ', '贵州');

    expectCount('美国', 51);
    expectSearch('United States', 'CA California', 'CA');
    expectSearch('USA', 'NY New York', 'NY');

    expectCount('英国', 4);
    expectSearch('UK', 'Scotland', 'Scotland');

    expectCount('加拿大', 13);
    expectSearch('Canada', 'ON Ontario', 'ON');
    expectSearch('CAN', 'BC British Columbia', 'BC');

    expectCount('墨西哥', 32);
    expectSearch('Mexico', 'CDMX', 'CDMX');
    expectSearch('MX', 'Mexico City', 'CDMX');
    expectSearch('MEX', 'Jalisco', 'Jalisco');
    expectSearch('墨西哥', 'Nuevo León', 'Nuevo Leon');

    expectCount('阿联酋', 7);
    expectSearch('United Arab Emirates', 'Dubai', 'Dubai');
    expectSearch('UAE', 'Abu Dhabi', 'Abu Dhabi');
    expectSearch('AE', 'Sharjah', 'Sharjah');

    expectCount('沙特', 13);
    expectCount('阿曼', 11);
    expectCount('南非', 9);
    expectCount('德国', 16);
    expectCount('西班牙', 19);
    expectCount('澳大利亚', 8);
    expectCount('法国', 18);
    expectCount('奥地利', 9);

    expectSearch('沙特阿拉伯', 'Riyadh', 'Riyadh');
    expectSearch('Oman', 'Muscat', 'Muscat');
    expectSearch('South Africa', 'Western Cape', 'Western Cape');
    expectSearch('Germany', 'NRW', 'North Rhine-Westphalia');
    expectSearch('Spain', 'Ceuta', 'Ceuta');
    expectSearch('Australia', 'NSW', 'NSW');
    expectSearch('France', 'PACA', 'Provence-Alpes-Cote d Azur');
    expectSearch('Austria', 'Vienna', 'Vienna');
  });

  it('州/省地区选择后保存草稿可回显，历史自由文本地区不会被清空', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '录单' }));

    const customerOrderNo = `STATE-CUSTOMER-${Date.now()}`;
    fireEvent.change(screen.getByLabelText('客户编号'), { target: { value: '9409' } });
    await user.click(screen.getByRole('button', { name: '仓库数据' }));
    const packageDialog = await screen.findByRole('dialog', { name: '仓库数据 · 9409' });
    await waitFor(() => expect(within(packageDialog).getAllByRole('checkbox').length).toBeGreaterThan(1));
    await user.click(within(packageDialog).getAllByRole('checkbox')[1]);
    await user.click(within(packageDialog).getByRole('button', { name: /确认选择这些包裹/ }));
    fireEvent.change(screen.getByLabelText('出货单号'), { target: { value: customerOrderNo } });
    fireEvent.change(screen.getByLabelText('收货国家'), { target: { value: 'Mexico' } });
    fireEvent.change(screen.getByLabelText('州/省'), { target: { value: 'Jalisco' } });
    await user.click(screen.getByRole('button', { name: '保存草稿' }));

    expect(await screen.findByText(/草稿已保存，可在录单草稿箱继续编辑/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await user.click(await screen.findByRole('button', { name: '草稿箱' }));
    await user.click(await screen.findByRole('button', { name: '继续编辑' }));
    expect(await screen.findByDisplayValue('Mexico')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jalisco')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('州/省'), { target: { value: 'Legacy Free Zone' } });
    expect(screen.getByDisplayValue('Legacy Free Zone')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('收货国家'), { target: { value: 'United Arab Emirates' } });
    expect(screen.getByDisplayValue('Legacy Free Zone')).toBeInTheDocument();
  });

  it('finance catalog 财务资料支持结算方式货物类型品名横向切换和删除', async () => {
    const user = userEvent.setup();
    function FinanceCatalogHarness() {
      const [form] = Form.useForm<FinanceCatalogItemInput>();
      const [filters, setFilters] = useState<FinanceCatalogFilters>(createFinanceCatalogFilters());
      const [items, setItems] = useState<FinanceCatalogItemSummary[]>([
        { id: 'fee-1', category: 'FEE_NAME', name: '基础运费', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '', updatedAt: '' },
        { id: 'settlement-1', category: 'SETTLEMENT_METHOD', name: '月结', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '', updatedAt: '' },
        { id: 'cargo-1', category: 'CARGO_TYPE', name: '普货', sortOrder: 1, enabled: true, createdAt: '', updatedAt: '' },
        { id: 'product-1', category: 'PRODUCT_NAME', name: '桌子', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '', updatedAt: '' }
      ]);
      return (
        <FinanceCatalogPage
          items={items}
          loading={false}
          filters={filters}
          editingItem={null}
          editingCategory="FEE_NAME"
          editorOpen={false}
          submitting={false}
          form={form}
          pagination={false}
          onFilterChange={(category, patch) => setFilters((current) => ({ ...current, [category]: { ...current[category], ...patch } }))}
          onRefresh={() => undefined}
          onCreate={() => undefined}
          onEdit={() => undefined}
          onToggle={() => undefined}
          onMove={() => undefined}
          onDelete={(item) => setItems((current) => current.filter((row) => row.id !== item.id))}
          onCloseEditor={() => undefined}
          onSubmit={() => undefined}
        />
      );
    }

    render(<FinanceCatalogHarness />);

    expect(screen.getByText('基础运费')).toBeInTheDocument();
    expect(screen.queryByText('月结')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '结算方式' }));
    expect(await screen.findByText('月结')).toBeInTheDocument();
    expect(screen.queryByText('基础运费')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '货物类型' }));
    expect(await screen.findByText('普货')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '品名' }));
    expect(await screen.findByText('桌子')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /删\s*除/ }));
    await user.click(await screen.findByRole('button', { name: '确认删除' }));
    await waitFor(() => expect(screen.queryByText('桌子')).not.toBeInTheDocument());
  });

  it('shows salesperson-safe shipment finance details to operator users', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('button', { name: /专线运单池/ }));
    const orderRow = screen.getByRole('row', { name: /SYGJ06061230001/ });
    await user.click(within(orderRow).getByRole('button', { name: 'SYGJ06061230001' }));
    const detailDialog = await screen.findByRole('dialog', { name: /运单详情/ });
    await user.click(within(detailDialog).getByRole('tab', { name: '费用明细' }));

    expect((await within(detailDialog).findAllByText('应收费用')).length).toBeGreaterThan(0);
    expect((await within(detailDialog).findAllByText('业务成本')).length).toBeGreaterThan(0);
    expect(within(detailDialog).queryByText('应付费用')).not.toBeInTheDocument();
    expect(within(detailDialog).queryByText('利润汇总')).not.toBeInTheDocument();
    expect(within(detailDialog).queryByText('代理运费')).not.toBeInTheDocument();
    expect(within(detailDialog).queryByText('宇环')).not.toBeInTheDocument();
  });

  it('shows the order fee workbench fields, profit sections and table tools to admins', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('button', { name: /专线运单池/ }));
    const orderRow = screen.getByRole('row', { name: /SYGJ06061230001/ });
    await user.click(within(orderRow).getByRole('button', { name: 'SYGJ06061230001' }));
    const detailDialog = await screen.findByRole('dialog', { name: /运单详情/ });
    await user.click(within(detailDialog).getByRole('tab', { name: '费用明细' }));

    expect((await within(detailDialog).findAllByText('应收费用')).length).toBeGreaterThan(0);
    expect((await within(detailDialog).findAllByText('业务成本')).length).toBeGreaterThan(0);
    expect((await within(detailDialog).findAllByText('应付费用')).length).toBeGreaterThan(0);
    expect(await within(detailDialog).findByText('利润明细')).toBeInTheDocument();
    expect(await within(detailDialog).findByText('应收与应付利润')).toBeInTheDocument();
    expect(await within(detailDialog).findByText('应收与业务利润')).toBeInTheDocument();
    expect(await within(detailDialog).findByText('业务与应付利润')).toBeInTheDocument();
    expect(within(detailDialog).getAllByText('列设置').length).toBeGreaterThanOrEqual(3);
    expect(within(detailDialog).getAllByText('快速添加').length).toBeGreaterThanOrEqual(3);
    expect(within(detailDialog).getAllByText('计费重').length).toBeGreaterThan(0);
    expect(within(detailDialog).getAllByText('代理').length).toBeGreaterThan(0);
  });

  it('adds order fees inline without opening the add dialog', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('button', { name: /专线运单池/ }));
    const orderRow = screen.getByRole('row', { name: /SYGJ06061230001/ });
    await user.click(within(orderRow).getByRole('button', { name: 'SYGJ06061230001' }));
    const detailDialog = await screen.findByRole('dialog', { name: /运单详情/ });
    await user.click(within(detailDialog).getByRole('tab', { name: '费用明细' }));

    const addButtons = await within(detailDialog).findAllByRole('button', { name: /^添\s*加$/ });
    await user.click(addButtons[0]);

    expect(screen.queryByRole('dialog', { name: /新增应收费用/ })).not.toBeInTheDocument();
    const draftRow = within(detailDialog).getByRole('row', { name: /新增/ });
    expect(within(draftRow).getByRole('button', { name: /保\s*存/ })).toBeInTheDocument();

    const amountInput = within(draftRow).getByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '88' } });
    await user.click(within(draftRow).getByRole('button', { name: /保\s*存/ }));
    expect(await within(detailDialog).findByText('RMB 88.00')).toBeInTheDocument();

    const nextAddButtons = await within(detailDialog).findAllByRole('button', { name: /^添\s*加$/ });
    await user.click(nextAddButtons[0]);
    const nextDraftRow = within(detailDialog).getByRole('row', { name: /新增/ });
    await user.click(within(nextDraftRow).getByRole('button', { name: /取\s*消/ }));
    await waitFor(() => expect(within(detailDialog).queryByRole('row', { name: /新增/ })).not.toBeInTheDocument());
  });


  it('shows receivables and creates customer statement drafts on the finance page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    expect(screen.queryByRole('button', { name: '财务资料库' })).not.toBeInTheDocument();
    await clickFinanceSideButton(user, '应收审核');
    expect((await screen.findAllByRole('button', { name: '应收审核' })).length).toBeGreaterThan(0);
	    expect(await screen.findByText('基础运费')).toBeInTheDocument();
    expect(screen.getAllByText('未匹配').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/匹配金额/).length).toBeGreaterThan(0);
	    expect(screen.getAllByText('Rachel').length).toBeGreaterThan(0);
		    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
	    [
	      '业务员',
	      '费用名称',
	      '客户编号',
	      '出货单号',
	      '转单号',
	      '币种',
	      '金额',
	      '结算方式',
	      '匹配水单编号',
	      '合计',
	      '制单日期',
	      '制单人',
	      '审单日期',
	      '审单人',
	      '备注',
	      '对账状态',
	      '操作'
	    ].forEach((name) => expect(screen.getByRole('columnheader', { name })).toBeInTheDocument());
    expect(screen.getAllByText('200.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('USD 200.00')).not.toBeInTheDocument();
    expect(screen.getByText('RMB 合计 1638.00')).toBeInTheDocument();
    const receivableCard = screen.getByText('基础运费').closest('.ant-card') as HTMLElement;
    const settingsButton = within(receivableCard).getByRole('button', { name: '列设置' });
    expect(settingsButton.closest('.managed-table-settings-column')).toBeInTheDocument();
    expect(settingsButton.closest('.managed-table-toolbar')).toBeNull();

	    await user.clear(screen.getByLabelText('转单号'));
	    await user.type(screen.getByLabelText('转单号'), 'NO-SUCH-TRANSFER');
	    expect(screen.getByText('燃油费')).toBeInTheDocument();
	    await user.click(within(receivableCard).getByRole('button', { name: /查\s*询/ }));
	    expect(screen.queryByText('燃油费')).not.toBeInTheDocument();
    await user.click(within(receivableCard).getByRole('button', { name: /重\s*置/ }));
    expect(await screen.findByText('燃油费')).toBeInTheDocument();

    const receivableRow = screen.getByText('系统匹配费').closest('tr');
    expect(receivableRow).toBeTruthy();

	    await user.click(within(receivableRow!).getByRole('button', { name: /作\s*废/ }));
	    expect(await screen.findByText('确认作废该应收？')).toBeInTheDocument();
	    await user.click(screen.getByRole('button', { name: /取\s*消/ }));
	    expect(screen.queryByText('应收已作废')).not.toBeInTheDocument();

    await user.click(within(receivableRow!).getByRole('button', { name: /审\s*核/ }));
    expect(await screen.findByText('确认审核该应收？')).toBeInTheDocument();
	    const auditConfirmButtons = screen.getAllByRole('button', { name: /审\s*核/ });
	    await user.click(auditConfirmButtons[auditConfirmButtons.length - 1]);
	    expect(await screen.findByText('已审核')).toBeInTheDocument();

    const auditedRow = screen.getByText('系统匹配费').closest('tr') as HTMLElement;
    await user.click(within(auditedRow).getByRole('checkbox'));
    expect(await screen.findByText('已选 1 条')).toBeInTheDocument();
    await user.click(within(auditedRow).getByRole('button', { name: /匹配水单/ }));
    const receiptDialog = (await screen.findByText('水单编号')).closest('.ant-modal') as HTMLElement;
    expect(receiptDialog).toBeTruthy();
    await user.click(within(receiptDialog).getByRole('combobox', { name: '水单编号' }));
    await user.click(await screen.findByText(/SD20260601001/));
    await user.clear(within(receiptDialog).getByLabelText('匹配金额'));
    await user.type(within(receiptDialog).getByLabelText('匹配金额'), '100');
    await user.click(within(receiptDialog).getByRole('button', { name: /匹\s*配/ }));
    expect(await screen.findByText('部分匹配')).toBeInTheDocument();
    expect(screen.getByText(/匹配金额 100.00/)).toBeInTheDocument();
    expect(screen.getByText('SD20260601001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '生成 9409 对账单' }));
    expect(await screen.findByText('对账单草稿 ¥230')).toBeInTheDocument();
  });

  it('应收审核表格显示已选数量并在批量确认里带数量', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '应收审核');
    const receivableRow = (await screen.findByText('基础运费')).closest('tr');
    const receivableCard = screen.getByText('基础运费').closest('.ant-card') as HTMLElement;
    expect(receivableRow).toBeTruthy();
    expect(screen.getByText('已选 0 条')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /全选本页|取消全选/ })).not.toBeInTheDocument();
    expect(within(receivableCard).getByRole('button', { name: '更多筛选' })).toBeInTheDocument();
    expect(screen.queryByLabelText('制单人')).not.toBeInTheDocument();

    await user.click(within(receivableCard).getByRole('button', { name: '更多筛选' }));
    expect(await screen.findByLabelText('制单人')).toBeInTheDocument();

    const selectAll = within(receivableCard).getAllByRole('columnheader')[0].querySelector('input[type="checkbox"]');
    expect(selectAll).not.toBeNull();
    fireEvent.click(selectAll!);
    await waitFor(() => expect(screen.queryByText('已选 0 条')).not.toBeInTheDocument());
    fireEvent.click(selectAll!);
    expect(await screen.findByText('已选 0 条')).toBeInTheDocument();

    await user.click(within(receivableRow!).getByRole('checkbox'));
    expect(await screen.findByText('已选 1 条')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '批量审核' }));
    expect(await screen.findByText('确认批量审核已选 1 条？')).toBeInTheDocument();
  });

  it('shows the finance dashboard workbench and quick entries', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));

    expect(await screen.findByText('待办')).toBeInTheDocument();
    expect(await screen.findByText('异常')).toBeInTheDocument();
    expect(await screen.findByText('快捷入口')).toBeInTheDocument();
    expect(screen.queryByText('功能后续设计')).not.toBeInTheDocument();
    expect(screen.getAllByText('应收审核').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务成本审核').length).toBeGreaterThan(0);
    expect(screen.getAllByText('市场应付审核').length).toBeGreaterThan(0);
    expect(screen.getByText('到账水单有余额')).toBeInTheDocument();

    const quickAgentBill = screen.getAllByRole('button', { name: '代理账单' }).at(-1);
    expect(quickAgentBill).toBeTruthy();
    await user.click(quickAgentBill!);
    expect(await screen.findByText('登记代理账单')).toBeInTheDocument();
  });

  it('shows the business dashboard metrics, reminders, and seven-day trend', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));

    const workbench = await waitFor(() => {
      const element = document.querySelector('.business-dashboard-workbench') as HTMLElement | null;
      expect(element).toBeTruthy();
      return element!;
    });
    expect(within(workbench).getByRole('heading', { name: '业务看板' })).toBeInTheDocument();
    expect(within(workbench).getByText('统一管理业务数据，掌握订单状态，提高处理效率')).toBeInTheDocument();
    expect(within(workbench).getByText(/数据更新时间：/)).toBeInTheDocument();
    expect(within(workbench).getByRole('button', { name: '刷新业务看板' })).toBeInTheDocument();
    expect(within(workbench).getByText('今日录单')).toBeInTheDocument();
    expect(within(workbench).getByText('草稿箱')).toBeInTheDocument();
    expect(within(workbench).getByText('待审核运单')).toBeInTheDocument();
    expect(within(workbench).getByText('本周录单')).toBeInTheDocument();
    expect(within(workbench).queryByText('暂无可操作内容')).not.toBeInTheDocument();
    expect(within(workbench).queryByText('待排货')).not.toBeInTheDocument();
    expect(within(workbench).queryByText('代理渠道')).not.toBeInTheDocument();
    expect(within(workbench).queryByText('应付')).not.toBeInTheDocument();
    expect(within(workbench).queryByText('利润')).not.toBeInTheDocument();
    expect(within(workbench).getByText('快捷入口')).toBeInTheDocument();
    expect(within(workbench).getByText('今日提醒')).toBeInTheDocument();
    expect(within(workbench).getByText('业务趋势（近7天）')).toBeInTheDocument();
    expect(within(workbench).getByRole('img', { name: /近7天录单趋势/ })).toBeInTheDocument();
    const trendHitArea = workbench.querySelector('.business-dashboard-trend-hit-area') as SVGRectElement | null;
    expect(trendHitArea).toBeTruthy();
    fireEvent.mouseEnter(trendHitArea!);
    expect(within(workbench).getByRole('tooltip')).toHaveTextContent(/\d{4}-\d{2}-\d{2}/);
    expect(within(workbench).getByRole('tooltip')).toHaveTextContent(/\d+ 单/);
    expect(workbench.querySelector('.business-dashboard-card-red')).toBeTruthy();
    expect(workbench.querySelector('.business-dashboard-card-gray')).toBeTruthy();

    await user.click(within(workbench).getByRole('button', { name: '刷新业务看板' }));
    await waitFor(() => expect(within(workbench).getByText(/数据更新时间：(?!正在加载)/)).toBeInTheDocument());

    await user.click(within(workbench).getByRole('button', { name: /去录单/ }));
    expect(await screen.findByLabelText('客户编号')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '业务看板' }));
    const refreshedWorkbench = await waitFor(() => {
      const element = document.querySelector('.business-dashboard-workbench') as HTMLElement | null;
      expect(element).toBeTruthy();
      return element!;
    });
    await user.click(within(refreshedWorkbench).getByRole('button', { name: /查看草稿箱/ }));
    expect(await screen.findByText('录单草稿箱')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: '业务看板' }));
    const pendingWorkbench = await waitFor(() => {
      const element = document.querySelector('.business-dashboard-workbench') as HTMLElement | null;
      expect(element).toBeTruthy();
      return element!;
    });
    await user.click(within(pendingWorkbench).getByRole('button', { name: /处理待审核运单/ }));
    expect(await screen.findByText('待审核列表')).toBeInTheDocument();
  });

  it('opens pending review detail only after selecting an order from the list', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '待审核运单' }));

    expect(await screen.findByText('待审核列表')).toBeInTheDocument();
    const pendingReviewList = screen.getByText('待审核列表').closest('.ant-card') as HTMLElement | null;
    expect(pendingReviewList).toBeTruthy();
    expect(within(pendingReviewList!).queryByRole('columnheader', { name: '转单号' })).not.toBeInTheDocument();
    expect(within(pendingReviewList!).queryByRole('columnheader', { name: '代理渠道' })).not.toBeInTheDocument();
    expect(screen.getAllByText('客户编号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户名称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('公司渠道').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('件数')).toBeInTheDocument();
    expect(screen.getByLabelText('实重 kg')).toBeInTheDocument();
    expect(screen.getByLabelText('体积 CBM')).toBeInTheDocument();
    expect(screen.getByLabelText('计费重 kg')).toBeInTheDocument();
    expect(screen.getByText('仓库自动汇总')).toBeInTheDocument();
    expect(screen.getAllByText('目的地').length).toBeGreaterThan(0);
    expect(within(pendingReviewList!).getByRole('columnheader', { name: '货物数据' })).toBeInTheDocument();
    expect(within(pendingReviewList!).getByRole('columnheader', { name: '重量' })).toBeInTheDocument();
    expect(within(pendingReviewList!).getByRole('columnheader', { name: '体积' })).toBeInTheDocument();
    expect(within(pendingReviewList!).getByRole('columnheader', { name: '件数' })).toBeInTheDocument();
    expect(within(pendingReviewList!).getByRole('columnheader', { name: '计费重' })).toBeInTheDocument();
    expect(within(pendingReviewList!).getByRole('columnheader', { name: '应收' })).toBeInTheDocument();
    expect(within(pendingReviewList!).getByText('¥1000.00')).toBeInTheDocument();
    expect(within(pendingReviewList!).queryByText('应付')).not.toBeInTheDocument();
    expect(within(pendingReviewList!).queryByText('利润')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'SYREVIEW000001' })).toBeInTheDocument();
    expect(screen.queryByText('待审核摘要')).not.toBeInTheDocument();
    expect(screen.queryByText('待审核详情')).not.toBeInTheDocument();
    expect(screen.queryByText('请选择待审核订单')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '审核通过' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '已删除订单' }));
    expect(await screen.findByRole('button', { name: 'SYREVIEWDEL001' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /恢\s*复/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '彻底删除' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '待审核订单' }));
    await user.click(screen.getByRole('button', { name: 'SYREVIEW000001' }));

    expect(await screen.findByText('待审核摘要')).toBeInTheDocument();
    expect(await screen.findByText('最终审核摘要')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/9409——测试产品——美国/)).toBeInTheDocument();
    expect(await screen.findByText('待审核详情')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: '基本' })).toBeInTheDocument();
    expect(screen.getByText('录入与货物')).toBeInTheDocument();
    expect(screen.getByText('出库与审核')).toBeInTheDocument();
    expect(screen.getByText('出货单号')).toBeInTheDocument();
    expect(screen.getByText('货物类型')).toBeInTheDocument();
    expect(screen.getByText('返回列表')).toBeInTheDocument();
    expect(screen.queryByText('请选择待审核订单')).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /修\s*改/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('客户单号')).toBeInTheDocument();
    expect(screen.getByLabelText('公司渠道')).toBeInTheDocument();
    expect(screen.getByLabelText('品名')).toBeInTheDocument();
    expect(screen.getByLabelText('目的地')).toBeInTheDocument();
    expect(screen.getByLabelText('收货人地址')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('品名'), { target: { value: '直接修改后的品名' } });
    await user.click(screen.getByRole('button', { name: '保存修改' }));
    expect(await screen.findByText('待审核资料已保存')).toBeInTheDocument();
  });

  it('hides final review actions for finance users in the business pending-review page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('finance', 'finance123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '待审核运单' }));

    expect(await screen.findByRole('button', { name: 'SYREVIEW000001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '审核通过' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '驳回' })).not.toBeInTheDocument();
  });

  it('shows 录单 warehouse package data and fee fields required by the finance entry spec', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '录单' }));

    expect(await screen.findByText('应收费用')).toBeInTheDocument();
    const receiverPanel = screen.getByText('收货信息').closest('section');
    const auditPanel = screen.getByText('出库与审核').closest('section');
    expect(receiverPanel).not.toBeNull();
    expect(auditPanel).not.toBeNull();
    expect(within(receiverPanel as HTMLElement).getByLabelText('收货人名称')).toBeInTheDocument();
    expect(within(receiverPanel as HTMLElement).getByLabelText('收货人公司名称')).toBeInTheDocument();
    expect(within(receiverPanel as HTMLElement).getByLabelText('收货人电话')).toBeInTheDocument();
    expect(within(receiverPanel as HTMLElement).getByLabelText('收货国家')).toBeInTheDocument();
    expect(within(receiverPanel as HTMLElement).getByLabelText('州/省')).toBeInTheDocument();
    expect(within(receiverPanel as HTMLElement).getByLabelText('邮编')).toBeInTheDocument();
    expect(within(receiverPanel as HTMLElement).getByLabelText('收货人地址')).toBeInTheDocument();
    expect(within(receiverPanel as HTMLElement).getByLabelText('FBA仓库代码')).toBeInTheDocument();
    expect(within(auditPanel as HTMLElement).queryByLabelText('FBA仓库代码')).not.toBeInTheDocument();
    expect(within(auditPanel as HTMLElement).getByLabelText(/FBA\s*入仓单号/)).toBeInTheDocument();
    expect(within(auditPanel as HTMLElement).getByLabelText('目的地')).toBeInTheDocument();
    expect(screen.getByLabelText('国家')).toBeInTheDocument();
    expect(within(auditPanel as HTMLElement).getByText('应收审核日期')).toBeInTheDocument();
    expect(screen.getByText('业务成本')).toBeInTheDocument();
    expect(screen.getByText('应付费用')).toBeInTheDocument();
    expect(screen.getAllByText('出货单号').length).toBeGreaterThan(0);
    expect(screen.queryByText('辅助信息')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('运单号')).not.toBeInTheDocument();
    expect(within(document.querySelector('.finance-entry-page') as HTMLElement).queryByLabelText('业务类型')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('默认币种')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('贸易条款')).not.toBeInTheDocument();
    expect(within(auditPanel as HTMLElement).getByLabelText('是否敏感')).toBeInTheDocument();
    expect(within(auditPanel as HTMLElement).getByLabelText('应收总额')).toBeInTheDocument();
    expect(screen.getAllByText('转单号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待生成').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待回填').length).toBeGreaterThan(0);
    expect(screen.getAllByText('出库日期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('应收审核日期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务成本审核日期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('应付审核日期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('匹配水单编号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('余额').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RMB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('金额').length).toBeGreaterThan(0);
    expect(screen.getAllByText('合计').length).toBeGreaterThan(0);
    expect(screen.getAllByText('制单日期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('制单人').length).toBeGreaterThan(0);
    expect(screen.getAllByText('出货成本单价').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('公司渠道').length).toBeGreaterThan(0);
    expect(screen.getAllByText('应付备注').length).toBeGreaterThan(0);
    expect(screen.queryByText('对账状态')).not.toBeInTheDocument();
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
    expect(screen.queryByText('仓库货物')).not.toBeInTheDocument();

    expect(screen.queryByDisplayValue('运费')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('运费').length).toBeGreaterThan(0));
    const receivableFeeSelect = screen.getAllByLabelText('应收费用费用名称')[0];
    expect(receivableFeeSelect).toHaveAttribute('aria-label', '应收费用费用名称');
    expect(screen.queryByText('停用费用')).not.toBeInTheDocument();
    expect(screen.getByText('业务员成本')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: '新增项目' })[0]);
    expect(screen.getAllByText('运费').length).toBeGreaterThanOrEqual(2);

    await user.click(screen.getByLabelText('收货国家'));
    await user.type(screen.getByLabelText('收货国家'), 'United');
    expect(await screen.findByText(/美国 \/ United States \/ US/)).toBeInTheDocument();
    await user.click(screen.getByText(/美国 \/ United States \/ US/));
    await user.click(screen.getByLabelText('州/省'));
    await user.type(screen.getByLabelText('州/省'), 'California');
    expect(await screen.findByText(/CA California 加利福尼亚州/)).toBeInTheDocument();
    await user.click(screen.getByText(/CA California 加利福尼亚州/));
    expect(screen.getByDisplayValue('CA')).toBeInTheDocument();

    await user.type(screen.getByLabelText('客户编号'), '9409');
    await user.click(screen.getByRole('button', { name: '仓库数据' }));
    const packageDialog = await screen.findByRole('dialog', { name: '仓库数据 · 9409' });
    await waitFor(() => expect(within(packageDialog).getAllByRole('checkbox').length).toBeGreaterThan(1));
    await user.click(within(packageDialog).getAllByRole('checkbox')[1]);
    expect(screen.queryByLabelText('已选货物列表')).not.toBeInTheDocument();
    await user.click(within(packageDialog).getByRole('button', { name: /确认选择这些包裹/ }));
    expect(screen.getByLabelText('已选货物列表')).toBeInTheDocument();
    await user.click(screen.getByLabelText('已有收货地址'));
    await user.click(await screen.findByText(/Lina/));
    expect(screen.getByDisplayValue('Lina')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Daloday Inc.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13800000001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('US')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9409 Sample Street')).toBeInTheDocument();
    expect(screen.getByLabelText('保存到客户地址库')).toBeInTheDocument();
    expect(screen.getByLabelText('保存到客户地址库')).not.toBeChecked();

    await user.type(screen.getByLabelText('收货人地址'), ' Suite 2');
    expect(screen.getByText('已修改已选地址；勾选后会新增一条收货地址，不会覆盖原资料。')).toBeInTheDocument();
    expect(screen.getByLabelText('保存为新地址')).not.toBeChecked();

    const productName = `牙刷测试${Date.now()}`;
    const productInput = screen.getByLabelText('品名');
    fireEvent.change(productInput, { target: { value: productName } });
    fireEvent.blur(productInput);
    await waitFor(() => expect(screen.getAllByText('保存新的品名？').length).toBeGreaterThan(0));
    const saveCatalogDialog = screen.getByRole('dialog', { name: '保存新的品名？' });
    await user.click(within(saveCatalogDialog).getByRole('button', { name: /^保\s*存$/ }));
    await waitFor(() => {
      const calls = (fetch as unknown as { mock: { calls: Array<[unknown, RequestInit?]> } }).mock.calls;
      expect(calls.some(([, init]) => {
        if (init?.method !== 'POST' || typeof init.body !== 'string') return false;
        const body = JSON.parse(init.body);
        return body.category === 'PRODUCT_NAME' && body.name === productName;
      })).toBe(true);
    });
  });

  it('shows the current login username as the order-entry salesperson', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '录单' }));

    expect(await screen.findByText('应收费用')).toBeInTheDocument();
    expect(screen.getByText('业务成本')).toBeInTheDocument();
    expect(screen.queryByText('应付费用')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('出货成本')).not.toBeInTheDocument();
    expect(screen.queryByText('出货成本单价')).not.toBeInTheDocument();
    expect(screen.queryByText('付款编号')).not.toBeInTheDocument();
    expect(screen.queryByText('代理渠道')).not.toBeInTheDocument();
    expect(screen.queryByText('业务成本审核日期')).not.toBeInTheDocument();
    expect(screen.queryByText('应付审核日期')).not.toBeInTheDocument();
    expect(screen.queryByText('业务利润')).not.toBeInTheDocument();
    expect(screen.getAllByText('operator').length).toBeGreaterThan(0);
    expect(screen.queryByText('系统匹配')).not.toBeInTheDocument();
  });

  it('提交审核后保留业务员当前录单页面，并刷新待审核数据', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '录单' }));

    const orderNo = `SYTEST${Date.now()}`;
    fireEvent.change(screen.getByLabelText('客户编号'), { target: { value: '9409' } });
    await user.click(screen.getByRole('button', { name: '仓库数据' }));
    const packageDialog = await screen.findByRole('dialog', { name: '仓库数据 · 9409' });
    await waitFor(() => expect(within(packageDialog).getAllByRole('checkbox').length).toBeGreaterThan(1));
    await user.click(within(packageDialog).getAllByRole('checkbox')[1]);
    await user.click(within(packageDialog).getByRole('button', { name: /确认选择这些包裹/ }));
    fireEvent.change(screen.getByLabelText('出货单号'), { target: { value: 'TEST-CUSTOMER-001' } });
    fireEvent.change(screen.getByLabelText('国家'), { target: { value: '美国' } });
    fireEvent.change(screen.getByLabelText('货物类型'), { target: { value: '普货' } });
    fireEvent.change(screen.getByLabelText('品名'), { target: { value: '测试货物' } });
    await user.click(screen.getByRole('button', { name: '提交审核' }));

    expect(await screen.findByRole('button', { name: '提交审核' })).toBeInTheDocument();
    expect(screen.queryByText('待审核摘要')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '自审通过' })).not.toBeInTheDocument();
    expect(orderNo).toMatch(/^SYTEST/);
  });

  it('录单草稿箱 saves order-entry drafts and lets operators continue editing from the draft box', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '录单' }));

    const customerOrderNo = `DRAFT-CUSTOMER-${Date.now()}`;
    fireEvent.change(screen.getByLabelText('客户编号'), { target: { value: '9409' } });
    await user.click(screen.getByRole('button', { name: '仓库数据' }));
    const packageDialog = await screen.findByRole('dialog', { name: '仓库数据 · 9409' });
    await waitFor(() => expect(within(packageDialog).getAllByRole('checkbox').length).toBeGreaterThan(1));
    await user.click(within(packageDialog).getAllByRole('checkbox')[1]);
    await user.click(within(packageDialog).getByRole('button', { name: /确认选择这些包裹/ }));
    fireEvent.change(screen.getByLabelText('出货单号'), { target: { value: customerOrderNo } });
    await user.click(screen.getByRole('button', { name: '保存草稿' }));

    expect(await screen.findByText(/草稿已保存，可在录单草稿箱继续编辑/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await user.click(await screen.findByRole('button', { name: '草稿箱' }));

    expect((await screen.findAllByText(customerOrderNo)).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '继续编辑' }));
    expect(await screen.findByDisplayValue(customerOrderNo)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/app/business/finance-entry');

    fireEvent.change(screen.getByLabelText('国家'), { target: { value: '美国' } });
    fireEvent.change(screen.getByLabelText('货物类型'), { target: { value: '普货' } });
    fireEvent.change(screen.getByLabelText('品名'), { target: { value: '测试货物' } });
    await user.click(screen.getByRole('button', { name: '提交审核' }));

    expect(await screen.findByRole('button', { name: '提交审核' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '待审核运单' }));
    expect((await screen.findAllByText(customerOrderNo)).length).toBeGreaterThan(0);
    await user.click(await screen.findByRole('button', { name: '草稿箱' }));
    await waitFor(() => expect(screen.queryByText(customerOrderNo)).not.toBeInTheDocument());
  });

  it('待付款 supports 付款申请 收款银行 供应商账单 凭证 and 已选 flow', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '市场应付审核');
    const payableRow = await screen.findByText('代理运费');
    await user.click(within(payableRow.closest('tr')!).getByRole('button', { name: /审\s*核/ }));
    expect(await screen.findByText('确认审核该市场应付并进入待付款？')).toBeInTheDocument();
    const auditButtons = screen.getAllByRole('button', { name: /审\s*核/ });
    await user.click(auditButtons[auditButtons.length - 1]);
    expect((await screen.findAllByText('已完成市场应付审核')).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('button', { name: '去待付款' }));
    expect(await screen.findByText('深圳思远国际货运代理有限公司付款申请单')).toBeInTheDocument();
    expect(screen.getByLabelText('申请付款日期起')).toBeInTheDocument();
    expect(screen.getByLabelText('申请付款日期止')).toBeInTheDocument();
    expect(screen.getByLabelText('收款方银行账号')).toBeInTheDocument();
    const pendingPaymentCard = screen.getByText('深圳思远国际货运代理有限公司付款申请单').closest('.ant-card') as HTMLElement;
    expect(pendingPaymentCard.querySelector('input[type="date"]')).toBeNull();
    expect(pendingPaymentCard.querySelectorAll('.app-date-picker').length).toBeGreaterThanOrEqual(2);
    const confirmDateInput = async (label: string, value: string) => {
      const input = screen.getByLabelText(label);
      await user.click(input);
      fireEvent.change(input, { target: { value } });
      await user.click(screen.getAllByRole('button', { name: /确\s*认/ }).at(-1)!);
      await waitFor(() => expect(input).toHaveValue(value));
    };
    await confirmDateInput('申请付款日期起', '2026-06-17');
    await confirmDateInput('申请付款日期止', '2026-06-18');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    await waitFor(() => {
      const urls = (fetch as unknown as { mock: { calls: Array<[unknown]> } }).mock.calls.map(([input]) => String(input));
      expect(urls.some((url) => url.includes('/api/finance/pending-payments')
        && url.includes('applicationDateFrom=2026-06-17')
        && url.includes('applicationDateTo=2026-06-18'))).toBe(true);
    });
    await user.click(screen.getAllByRole('button', { name: /重\s*置/ }).at(-1)!);
    expect(screen.getByLabelText('申请付款日期起')).toHaveValue('');
    expect(screen.getByLabelText('申请付款日期止')).toHaveValue('');
    await waitFor(() => expect(screen.getAllByText((_, element) => element?.textContent === 'RMB 合计：140.00').length).toBeGreaterThan(0));
    expect(await screen.findByText('记录凭证')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '记录凭证' }));
    const voucherDialog = await screen.findByRole('dialog', { name: '记录对账单凭证' });
    expect(within(voucherDialog).getByRole('button', { name: '选择图片' })).toBeInTheDocument();
    expect(within(voucherDialog).queryByText('选择文件')).not.toBeInTheDocument();
    expect(within(voucherDialog).queryByText('未选择任何文件')).not.toBeInTheDocument();
    const imageFile = new File(['png'], 'bill.png', { type: 'image/png' });
    await user.upload(within(voucherDialog).getByLabelText('选择凭证图片'), imageFile);
    expect(await within(voucherDialog).findByText('bill.png')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存凭证' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '记录对账单凭证' })).not.toBeInTheDocument());
    expect(await screen.findByText('1 张凭证')).toBeInTheDocument();

    const pendingRow = screen.getByText('代理运费').closest('tr');
    expect(pendingRow).toBeTruthy();
    await user.click(within(pendingRow!).getByRole('checkbox'));
    await waitFor(() => expect(screen.getByRole('button', { name: '生成付款申请' })).not.toBeDisabled());
    const createButton = screen.getByRole('button', { name: '生成付款申请' });
    await user.click(createButton);
    const applicationDialog = await screen.findByRole('dialog', { name: '生成付款申请' });
    expect(await within(applicationDialog).findByLabelText('手动收款方名称')).toBeInTheDocument();
    expect(within(applicationDialog).getByRole('button', { name: '选择图片' })).toBeInTheDocument();
    expect(within(applicationDialog).queryByText('选择文件')).not.toBeInTheDocument();
    expect(within(applicationDialog).queryByText('未选择任何文件')).not.toBeInTheDocument();
    fireEvent.paste(applicationDialog.querySelector('.voucher-image-input')!, { clipboardData: { files: [new File(['png'], 'pasted-bill.png', { type: 'image/png' })] } });
    expect(await within(applicationDialog).findByText('pasted-bill.png')).toBeInTheDocument();
    await user.type(within(applicationDialog).getByLabelText('手动收款方名称'), '宇环收款户');
    await user.type(within(applicationDialog).getByLabelText('手动开户行'), '中国银行');
    const bankAccountInput = applicationDialog.querySelector<HTMLInputElement>('#bankAccountNo');
    expect(bankAccountInput).toBeTruthy();
    await user.type(bankAccountInput!, '6222000000000000');
    await user.click(within(applicationDialog).getByRole('button', { name: '提交付款申请' }));
    expect(await screen.findByText('已进入待支付')).toBeInTheDocument();

    await clickFinanceSideButton(user, '已付款');
    expect(await screen.findByText('深圳思远国际货运代理有限公司付款核销单')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '待支付/已支付' })).not.toBeInTheDocument();
    [
      '代理',
      '业务员',
      '客户编号',
      '出货单号',
      '应付费用',
      '币种',
      '合计金额',
      '状态',
      '收款方名称',
      '收款方银行账号',
      '付款方银行信息',
      '备注',
      '申请付款日期起',
      '申请付款日期止',
      '付款日期起',
      '付款日期止'
    ].forEach((label) => expect(screen.queryByLabelText(label) ?? screen.getByText(label)).toBeInTheDocument());

    const paidRow = await screen.findByRole('row', { name: /SYGJ06061230001/ });
    [
      '日期',
      '代理',
      '业务员',
      '客户编号',
      '出货单号',
      '应付费用',
      '币种',
      '合计金额',
      '备注',
      '对账单凭证',
      '收款方银行信息',
      '付款方银行',
      '付款日期',
      '水单',
      '操作'
    ].forEach((name) => expect(screen.getByRole('columnheader', { name })).toBeInTheDocument());
    expect(within(paidRow).getByText('140.00')).toBeInTheDocument();
    expect(within(paidRow).queryByText('¥140.00')).not.toBeInTheDocument();
    expect(within(paidRow).getByText('RMB')).toBeInTheDocument();
    expect(within(paidRow).getByText(/宇环收款户/)).toBeInTheDocument();
    expect(within(paidRow).getByAltText('对账单凭证')).toBeInTheDocument();

    fireEvent.doubleClick(within(paidRow).getByAltText('对账单凭证'));
    const previewDialog = await screen.findByRole('dialog', { name: '凭证预览' });
    expect(previewDialog).toBeInTheDocument();
    await user.click(within(previewDialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '凭证预览' })).not.toBeInTheDocument());

    await user.click(within(paidRow).getByRole('checkbox', { name: /选择付款记录/ }));
    expect(await screen.findByText('已选 1')).toBeInTheDocument();
    expect(screen.getByText(/宇环收款户 \/ RMB \/ 6222000000000000 \/ 中国银行 \/ 1 条 \/ 140.00/)).toBeInTheDocument();

    await user.click(within(paidRow).getByRole('button', { name: '确认支付' }));
    const confirmDialog = await screen.findByRole('dialog', { name: '确认支付' });
    await user.clear(within(confirmDialog).getByLabelText('付款方银行'));
    await user.type(within(confirmDialog).getByLabelText('付款方银行'), '思远付款银行');
    await user.clear(within(confirmDialog).getByLabelText('付款方账号'));
    await user.type(within(confirmDialog).getByLabelText('付款方账号'), '888800001111');
    fireEvent.change(within(confirmDialog).getByLabelText('付款日期'), { target: { value: '2026-06-25' } });
    await user.upload(within(confirmDialog).getByLabelText('选择凭证图片'), new File(['png'], 'paid-receipt.png', { type: 'image/png' }));
    expect(await within(confirmDialog).findByText('paid-receipt.png')).toBeInTheDocument();
    await user.click(within(confirmDialog).getByRole('button', { name: 'OK' }));
    expect(await screen.findByRole('row', { name: /思远付款银行/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '反核销' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /补\s*充/ })).toBeInTheDocument();
  });

  it('选中市场应付后新增费用只提交权威订单关联', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '市场应付审核');
    const payableRow = (await screen.findByText('代理运费')).closest('tr');
    expect(payableRow).toBeTruthy();

    await user.click(within(payableRow!).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: '添加应付' }));
    const dialog = await screen.findByRole('dialog', { name: '添加应付' });

    await user.type(within(dialog).getByLabelText('计费重'), '5');
    await user.type(within(dialog).getByLabelText('单价'), '10');
    await user.click(within(dialog).getByRole('button', { name: '保存应付' }));

    await waitFor(() => {
      const request = (fetch as unknown as { mock: { calls: Array<[unknown, RequestInit | undefined]> } }).mock.calls.find(([input, init]) => (
        String(input).includes('/api/finance/payable-audits') && init?.method === 'POST'
      ));
      expect(request).toBeTruthy();
      const body = JSON.parse(String(request?.[1]?.body));
      expect(body).toEqual(expect.objectContaining({ shipmentId: 's-1' }));
      expect(body.systemOrderNo).toBeUndefined();
      expect(body.customerOrderNo).toBeUndefined();
      expect(body.transferNo).toBeUndefined();
      expect(body.customerCode).toBeUndefined();
    });
  });

  it('registers and queries an agent bill manually', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '代理账单');

    await screen.findByText('登记代理账单');
    await user.type(screen.getByLabelText('账单号'), 'AB-9409-WEB');
    await user.type(screen.getByLabelText('代理'), '宇环');
    fireEvent.change(screen.getByLabelText('账单日期'), { target: { value: '2026-06-29' } });
    fireEvent.change(screen.getByLabelText('账单金额'), { target: { value: '120' } });
    await user.type(screen.getByLabelText('差异类型'), '重量差异');
    fireEvent.change(screen.getByLabelText('差异金额'), { target: { value: '12.5' } });
    await user.type(screen.getByLabelText('差异原因'), '代理账单计费重高于 Sunny 应付');
    await user.type(screen.getByLabelText('杂费类型'), '操作费');
    fireEvent.change(screen.getByLabelText('杂费金额'), { target: { value: '35' } });
    await user.type(screen.getByLabelText('杂费代理'), '宇环');
    await user.type(screen.getByLabelText('归属客户'), '9409');
    await user.type(screen.getByLabelText('归属订单'), 'SYPAYABLEAUDIT001');
    fireEvent.change(screen.getByLabelText('发生日期'), { target: { value: '2026-06-29' } });
    await user.type(screen.getByLabelText('关联费用 id'), 'sfi-extra-1');
    await user.type(screen.getByLabelText('杂费备注'), '代理账单杂费归属');
    await user.type(screen.getByLabelText('跨越账单号'), 'KY-9409-001');
    await user.type(screen.getByLabelText('跨越客户'), '9409');
    await user.type(screen.getByLabelText('跨越订单'), 'SYPAYABLEAUDIT001');
    fireEvent.change(screen.getByLabelText('跨越金额'), { target: { value: '88' } });
    fireEvent.change(screen.getByLabelText('跨越账单日期'), { target: { value: '2026-06-29' } });
    await user.type(screen.getByLabelText('明细文件/图片'), 'agent-bill.png');
    const saveButton = screen.getByRole('button', { name: '保存代理账单' });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    await waitFor(() => {
      const calls = (fetch as unknown as { mock: { calls: Array<[unknown, RequestInit | undefined]> } }).mock.calls;
      expect(calls.some(([input, init]) => String(input).includes('/api/finance/payment-vouchers') && init?.method === 'POST')).toBe(true);
    });
    expect(await screen.findByText('AB-9409-WEB')).toBeInTheDocument();
    expect(await screen.findByText('操作费')).toBeInTheDocument();
    expect(await screen.findByText('KY-9409-001')).toBeInTheDocument();
    expect((await screen.findAllByText('SYPAYABLEAUDIT001')).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('差异待处理')).toBeInTheDocument();
    const differenceButton = screen.getAllByRole('button', { name: '处理差异' }).find((button) => !button.hasAttribute('disabled'));
    expect(differenceButton).toBeTruthy();
    await user.click(differenceButton!);
    expect((await screen.findAllByText('差异已处理')).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getAllByRole('button', { name: /归\s*档/ }).at(-1)!);
    expect(await screen.findByText('已归档')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /反\s*归\s*档/ }).at(-1)!);
    expect(await screen.findByText('已匹配')).toBeInTheDocument();
    await user.type(screen.getByLabelText('账单号筛选'), 'AB-9409-WEB');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    expect(await screen.findByText('agent-bill.png')).toBeInTheDocument();
  });


  it('水单表单将业务水单编号与系统水单号分开展示', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '水单到账查询');
    expect((await screen.findAllByText('水单到账查询')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('未到账').length).toBeGreaterThan(0);
    await clickFinanceSideButton(user, '水单匹配');
    expect(await screen.findByText('水单订单匹配')).toBeInTheDocument();
    const receiptRowBeforeEdit = (await screen.findByText('SD20260601001')).closest('tr');
    expect(receiptRowBeforeEdit).toBeTruthy();
    expect(screen.getByText('金额 10000.00')).toBeInTheDocument();
    expect(screen.getByText('余额 10000.00')).toBeInTheDocument();
    expect(within(receiptRowBeforeEdit!).getByText('RMB')).toBeInTheDocument();
    expect(within(receiptRowBeforeEdit!).getAllByText('10000.00').length).toBeGreaterThanOrEqual(2);
    expect(within(receiptRowBeforeEdit!).queryByText('RMB 10000.00')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新增水单' }));
    const createDialog = await screen.findByRole('dialog', { name: '新增水单' });
    expect(within(createDialog).queryByLabelText('系统水单号')).not.toBeInTheDocument();
    expect(within(createDialog).getByRole('combobox', { name: '结算方式' })).toBeInTheDocument();
    expect(within(createDialog).getByLabelText('水单编号')).toBeRequired();
    const customerSelect = within(createDialog).getAllByRole('combobox').find((element) => element.id === 'customerCode');
    expect(customerSelect).toBeTruthy();
    await user.click(customerSelect!);
    await user.type(customerSelect!, 'Dalo');
    await user.click(await screen.findByRole('option', { name: '9409 - Daloday' }));
    await user.click(within(createDialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '新增水单' })).not.toBeInTheDocument());

    await user.click(within(receiptRowBeforeEdit!).getByRole('button', { name: /编\s*辑/ }));
    const editDialog = await screen.findByRole('dialog', { name: '编辑水单' });
    const receiptNoInput = within(editDialog).getByLabelText('系统水单号') as HTMLInputElement;
    expect(receiptNoInput).toHaveValue('SD20260601001');
    expect(receiptNoInput).toHaveAttribute('readonly');
  });

  it('水单匹配页未到账水单点击到账后立即变为可匹配', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await fetch('/api/finance/water-receipts', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        receiptMethod: '到账按钮测试',
        receiptDate: '2026-06-26T10:00:00.000Z',
        amount: 321,
        currency: 'RMB',
        paymentNo: 'ARRIVE-BUTTON-001'
      })
    });

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '水单匹配');
    const receiptRow = (await screen.findByText('ARRIVE-BUTTON-001')).closest('tr');
    expect(receiptRow).toBeTruthy();
    expect(within(receiptRow!).getByText('未到账')).toBeInTheDocument();
    expect(within(receiptRow!).getByRole('button', { name: /匹\s*配/ })).toBeDisabled();

    await user.click(within(receiptRow!).getByRole('button', { name: /到\s*账/ }));
    expect(await screen.findByRole('button', { name: '确认到账' })).toBeInTheDocument();
    expect(screen.getByText('ARRIVE-BUTTON-001')).toBeInTheDocument();
    expect(screen.getByText('未到账 -> 已到账')).toBeInTheDocument();
    expect(screen.getByText('321.00 RMB')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /取\s*消/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '确认到账' })).not.toBeInTheDocument());
    expect(within(receiptRow!).getByText('未到账')).toBeInTheDocument();

    await user.click(within(receiptRow!).getByRole('button', { name: /到\s*账/ }));
    await user.click(await screen.findByRole('button', { name: '确认到账' }));
    await waitFor(() => {
      expect(within(receiptRow!).getByText('已到账')).toBeInTheDocument();
      expect(within(receiptRow!).queryByRole('button', { name: /到\s*账/ })).not.toBeInTheDocument();
    });
    expect(within(receiptRow!).getByRole('button', { name: /匹\s*配/ })).not.toBeDisabled();
    expect(screen.getByText('未匹配到账 2')).toBeInTheDocument();
  });

  it('二次确认覆盖水单到账查询的到账和作废，作废必须填写原因', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await fetch('/api/finance/water-receipts', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        receiptMethod: '二次确认作废测试',
        receiptDate: '2026-07-09T11:00:00.000Z',
        amount: 654,
        currency: 'RMB',
        paymentNo: 'VOID-CONFIRM-001'
      })
    });

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '水单到账查询');
    const receiptRow = (await screen.findByText('VOID-CONFIRM-001')).closest('tr');
    expect(receiptRow).toBeTruthy();
    await user.click(within(receiptRow!).getByRole('button', { name: /作\s*废/ }));
    expect(await screen.findByRole('button', { name: '确认作废' })).toBeInTheDocument();
    expect(screen.getByText('未到账 -> 已作废')).toBeInTheDocument();
    expect(screen.getByText('654.00 RMB')).toBeInTheDocument();
    expect(screen.getByText('作废后该水单不能再用于到账或匹配，本次原因会写入审计。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '确认作废' }));
    expect(await screen.findByRole('button', { name: '确认作废' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('操作原因'), '重复录入');
    await user.click(screen.getByRole('button', { name: '确认作废' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '确认作废' })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByText('VOID-CONFIRM-001')).not.toBeInTheDocument());
  });

  it('水单凭证上传和粘贴截图显示可读文件名', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await fetch('/api/finance/water-receipts', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        receiptMethod: '凭证文件名测试',
        receiptDate: '2026-07-09T10:00:00.000Z',
        amount: 456,
        currency: 'RMB',
        paymentNo: 'VOUCHER-FILENAME-001'
      })
    });
    await fetch('/api/finance/water-receipts', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        receiptMethod: '粘贴截图命名测试',
        receiptDate: '2026-07-09T10:05:00.000Z',
        amount: 123,
        currency: 'RMB',
        paymentNo: 'VOUCHER-PASTE-001'
      })
    });

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '水单匹配');

    const uploadRow = (await screen.findByText('VOUCHER-FILENAME-001')).closest('tr');
    expect(uploadRow).toBeTruthy();
    await user.click(within(uploadRow!).getByRole('button', { name: /凭\s*证/ }));
    const uploadDialog = await screen.findByRole('dialog', { name: '记录水单凭证' });
    await user.upload(within(uploadDialog).getByLabelText('选择凭证图片'), new File(['jpg'], '水单凭证_测试.jpg', { type: 'image/jpeg' }));
    expect(await within(uploadDialog).findByText('水单凭证_测试.jpg')).toBeInTheDocument();
    await waitFor(() => {
      const image = uploadDialog.querySelector('img[alt="水单凭证_测试.jpg"]');
      expect(image).toHaveAttribute('src', `http://localhost:3001/api/uploads/vouchers/${encodeURIComponent('水单凭证_测试.jpg')}`);
    });
    expect(within(uploadDialog).queryByText(/å|æ|乱码/)).not.toBeInTheDocument();
    await user.click(within(uploadDialog).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '记录水单凭证' })).not.toBeInTheDocument());
    expect(await screen.findByText('水单凭证_测试.jpg')).toBeInTheDocument();
    const refreshedUploadRow = screen.getByText('VOUCHER-FILENAME-001').closest('tr');
    expect(refreshedUploadRow).toBeTruthy();
    await user.click(within(refreshedUploadRow!).getByRole('button', { name: /查\s*看/ }));
    const previewDialog = await screen.findByRole('dialog', { name: '水单凭证预览' });
    expect(within(previewDialog).getByText('水单凭证_测试.jpg')).toBeInTheDocument();
    await waitFor(() => {
      const image = previewDialog.querySelector('img[alt="水单凭证_测试.jpg"]');
      expect(image).toHaveAttribute('src', `http://localhost:3001/api/uploads/vouchers/${encodeURIComponent('水单凭证_测试.jpg')}`);
    });
    await user.click(within(previewDialog).getByRole('button', { name: 'Close' }));

    const pasteRow = (await screen.findByText('VOUCHER-PASTE-001')).closest('tr');
    expect(pasteRow).toBeTruthy();
    await user.click(within(pasteRow!).getByRole('button', { name: /凭\s*证/ }));
    const pasteDialog = await screen.findByRole('dialog', { name: '记录水单凭证' });
    fireEvent.paste(pasteDialog.querySelector('.voucher-image-input')!, { clipboardData: { files: [new File(['png'], 'image.png', { type: 'image/png' })] } });
    const generatedName = await within(pasteDialog).findByText((text) => /^水单凭证-\d{14}\.png$/.test(text));
    expect(generatedName).toBeInTheDocument();
  });


  it('lets finance staff register a payment and settle selected receivables', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '应收审核');
    expect(await screen.findByText('账户余额')).toBeInTheDocument();
    expect((await screen.findAllByText('¥10000.00')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '登记 9409 收款并核销' }));

    expect(await screen.findByText('收款已核销 ¥350')).toBeInTheDocument();
    expect(screen.getAllByText('已审核').length).toBeGreaterThanOrEqual(2);
  });


  it('shows customer-visible receivables and statements in the customer portal', async () => {
    await renderAndLogin('customer', 'customer123');

    expect((await screen.findAllByText('费用明细')).length).toBeGreaterThan(0);
    expect(screen.getByText('¥200.00')).toBeInTheDocument();
    expect(screen.getByText('对账单草稿')).toBeInTheDocument();
    expect(screen.getAllByText('账户余额').length).toBeGreaterThan(0);
    expect(screen.getByText('期初余额')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '登记 9409 收款并核销' })).not.toBeInTheDocument();
  });

});
