import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';

describe('Finance flows', () => {
  const clickFinanceSideButton = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    const buttons = await screen.findAllByRole('button', { name });
    await user.click(buttons[0]);
  };

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
    expect((await within(detailDialog).findAllByText('应付费用')).length).toBeGreaterThan(0);
    expect(await within(detailDialog).findByText('利润汇总')).toBeInTheDocument();
    expect(await within(detailDialog).findByText('代理运费')).toBeInTheDocument();
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


  it('shows receivables and creates customer statement drafts on the finance page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    expect(screen.queryByRole('button', { name: '财务资料库' })).not.toBeInTheDocument();
    await clickFinanceSideButton(user, '应收审核');
    expect((await screen.findAllByRole('button', { name: '应收审核' })).length).toBeGreaterThan(0);
	    expect(await screen.findByText('基础运费')).toBeInTheDocument();
	    expect(screen.getAllByText('Rachel').length).toBeGreaterThan(0);
		    expect(screen.getAllByText('待审核').length).toBeGreaterThan(0);
	    expect(screen.getByText('USD 200.00')).toBeInTheDocument();
	    expect(screen.getByText('RMB 合计 ¥1518.00')).toBeInTheDocument();

	    await user.clear(screen.getByLabelText('转单号'));
	    await user.type(screen.getByLabelText('转单号'), 'NO-SUCH-TRANSFER');
	    expect(screen.getByText('燃油费')).toBeInTheDocument();
	    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
	    expect(screen.queryByText('燃油费')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /重\s*置/ }));
    expect(await screen.findByText('燃油费')).toBeInTheDocument();

    const receivableRow = screen.getByText('基础运费').closest('tr');
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

    await user.click(screen.getByRole('button', { name: '生成 9409 对账单' }));
    expect(await screen.findByText('对账单草稿 ¥230')).toBeInTheDocument();
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

  it('opens pending review detail only after selecting an order from the list', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '待审核运单' }));

    expect(await screen.findByText('待审核列表')).toBeInTheDocument();
    expect(screen.getAllByText('客户编号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户名称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务渠道').length).toBeGreaterThan(0);
    expect(screen.getAllByText('目的地').length).toBeGreaterThan(0);
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
    expect(screen.getByText('返回列表')).toBeInTheDocument();
    expect(screen.queryByText('请选择待审核订单')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /修\s*改/ }));
    const editDialog = await screen.findByRole('dialog', { name: '人工修改轨迹与状态' });
    expect(within(editDialog).getByLabelText('发货渠道')).toBeInTheDocument();
    expect(within(editDialog).getByLabelText('品名')).toBeInTheDocument();
    expect(within(editDialog).getByLabelText('目的地')).toBeInTheDocument();
    expect(within(editDialog).getByLabelText('件数')).toBeInTheDocument();
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

  it('shows order-entry fee fields required by the finance entry spec', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '业务管理' }));
    await user.click(await screen.findByRole('button', { name: '录单' }));

    expect(await screen.findByText('应收费用')).toBeInTheDocument();
    expect(screen.getByText('业务成本')).toBeInTheDocument();
    expect(screen.getByText('应付费用')).toBeInTheDocument();
    expect(screen.getAllByText('运单号').length).toBeGreaterThan(0);
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
    expect(screen.getAllByText('业务渠道').length).toBeGreaterThan(0);
    expect(screen.getAllByText('应付备注').length).toBeGreaterThan(0);
    expect(screen.queryByText('对账状态')).not.toBeInTheDocument();
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
    expect(screen.queryByText('仓库货物')).not.toBeInTheDocument();

    expect(screen.getAllByDisplayValue('运费')).toHaveLength(1);
    await user.click(screen.getAllByRole('button', { name: '新增项目' })[0]);
    expect(screen.getAllByDisplayValue('运费')).toHaveLength(2);
    const deleteButtons = screen.getAllByRole('button', { name: /删\s*除/ }).filter((button) => !(button as HTMLButtonElement).disabled);
    await user.click(deleteButtons[0]);
    await waitFor(() => expect(screen.getAllByDisplayValue('运费')).toHaveLength(1));

    await user.type(screen.getByLabelText('客户编号'), '9409');
    await user.click(screen.getByRole('button', { name: '仓库数据' }));
    const packageDialog = await screen.findByRole('dialog', { name: '仓库数据 · 9409' });
    await waitFor(() => expect(within(packageDialog).getAllByRole('checkbox').length).toBeGreaterThan(1));
    await user.click(within(packageDialog).getAllByRole('checkbox')[1]);
    await user.click(within(packageDialog).getByRole('button', { name: /关\s*闭/ }));
    expect(screen.getByText('已选货物')).toBeInTheDocument();
    await user.click(screen.getByLabelText('选择收货人'));
    await user.click(await screen.findByText(/Lina/));
    expect(screen.getByDisplayValue('Lina')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Daloday Inc.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13800000001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9409 Sample Street')).toBeInTheDocument();
    expect(screen.getByLabelText('保存到客户资料')).toBeInTheDocument();

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
    expect(screen.getByText('应付费用')).toBeInTheDocument();
    expect(screen.getAllByText('出货成本单价').length).toBeGreaterThan(0);
    expect(screen.getAllByText('operator').length).toBeGreaterThan(0);
    expect(screen.queryByText('系统匹配')).not.toBeInTheDocument();
  });

  it('moves a submitted business order entry to the operator pending review page', async () => {
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
    await user.click(within(packageDialog).getByRole('button', { name: /关\s*闭/ }));
    fireEvent.change(screen.getByLabelText('客户单号'), { target: { value: 'TEST-CUSTOMER-001' } });
    fireEvent.change(screen.getByLabelText('运单号'), { target: { value: orderNo } });
    fireEvent.change(screen.getByLabelText('目的地'), { target: { value: '美国' } });
    fireEvent.change(screen.getByLabelText('货物属性'), { target: { value: '普货' } });
    fireEvent.change(screen.getByLabelText('品名'), { target: { value: '测试货物' } });
    await user.click(screen.getByRole('button', { name: '提交审核' }));

    expect(await screen.findByText('待审核摘要')).toBeInTheDocument();
    expect((await screen.findAllByText(orderNo)).length).toBeGreaterThan(0);
    expect(await screen.findByRole('button', { name: '自审通过' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '审核通过' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '自审通过' }));
    expect(await screen.findByText('自审通过后，订单进入待排货，并同步进入财务管理的业务成本审核。')).toBeInTheDocument();
  });

  it('shows pending payments and creates grouped payment applications', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '市场应付审核');
    const payableRow = await screen.findByText('代理运费');
    await user.click(within(payableRow.closest('tr')!).getByRole('button', { name: /审\s*核/ }));
    expect(await screen.findByText('确认审核该市场应付并进入代理账单核对？')).toBeInTheDocument();
    const auditButtons = screen.getAllByRole('button', { name: /审\s*核/ });
    await user.click(auditButtons[auditButtons.length - 1]);
    expect((await screen.findAllByText('已完成市场应付审核')).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('button', { name: '去代理账单' }));
    expect(await screen.findByText('登记代理账单')).toBeInTheDocument();

    await clickFinanceSideButton(user, '待付款');
    expect(await screen.findByText('深圳思远国际货运代理有限公司付款申请单')).toBeInTheDocument();
    expect(screen.getByLabelText('申请付款日期起')).toBeInTheDocument();
    expect(screen.getByLabelText('申请付款日期止')).toBeInTheDocument();
    expect(screen.getByLabelText('收款方银行账号')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('申请付款日期起'), { target: { value: '2026-06-17' } });
    fireEvent.change(screen.getByLabelText('申请付款日期止'), { target: { value: '2026-06-18' } });
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    await waitFor(() => {
      const urls = (fetch as unknown as { mock: { calls: Array<[unknown]> } }).mock.calls.map(([input]) => String(input));
      expect(urls.some((url) => url.includes('/api/finance/pending-payments')
        && url.includes('applicationDateFrom=2026-06-17')
        && url.includes('applicationDateTo=2026-06-18'))).toBe(true);
    });
    expect(await screen.findByText('RMB 合计 ¥140.00')).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByRole('button', { name: '生成待支付申请' })).not.toBeDisabled());
    const createButton = screen.getByRole('button', { name: '生成待支付申请' });
    await user.click(createButton);
    const applicationDialog = await screen.findByRole('dialog', { name: '生成待支付申请' });
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
    await user.click(within(applicationDialog).getByRole('button', { name: '提交为待支付' }));
    expect(await screen.findByText('已进入待支付')).toBeInTheDocument();
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


  it('lets finance staff register a payment and settle selected receivables', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '财务管理' }));
    await clickFinanceSideButton(user, '应收审核');
    expect(await screen.findByText('账户余额')).toBeInTheDocument();
    expect((await screen.findAllByText('¥10000.00')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '登记 9409 收款并核销' }));

    expect(await screen.findByText('收款已核销 ¥230')).toBeInTheDocument();
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
