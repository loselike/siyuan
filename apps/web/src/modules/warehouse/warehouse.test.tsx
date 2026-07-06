import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { addRowsWorksheet, createWorkbook, writeWorkbookBuffer } from '../shared/excel';
import { employeeShipments, renderAndLogin, shipment } from '../testSupport/appTestHarness';

function expectNoWarehouseFinanceText(scope: HTMLElement) {
  [/业务成本/, /市场成本/, /代理成本/, /应收/, /应付/, /利润/, /银行/, /水单/, /收款/].forEach((pattern) => {
    expect(within(scope).queryByText(pattern)).not.toBeInTheDocument();
  });
}

describe('Warehouse flows', () => {
  it('shows today receipts dashboard, manual exception, and manual receiving form', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /今日收货/ })).toBeInTheDocument();

    expect(screen.getByText('收货票数')).toBeInTheDocument();
    expect(screen.getByText('总件数')).toBeInTheDocument();
    expect(screen.getByText('总重量')).toBeInTheDocument();
    expect(screen.getByText('总体积')).toBeInTheDocument();
    expect(screen.getAllByText('待出库').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待理货').length).toBeGreaterThan(0);
    expect(screen.getAllByText('异常').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('今日收货客户单号筛选'), '1399');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    await screen.findAllByRole('row', { name: /1399-KY4001036478949/ });
    const receiptRow = screen.getAllByRole('row', { name: /1399-KY4001036478949/ }).find((row) => within(row).queryByText(/128×46×51/));
    if (!receiptRow) {
      throw new Error('missing expected 1399 receipt row');
    }
    expect(within(receiptRow).getAllByText('1399').length).toBeGreaterThanOrEqual(1);
    expect(within(receiptRow).getByText(/128×46×51/)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '单件方数' })).toBeInTheDocument();
    expect(within(receiptRow).getByText('0.300288')).toBeInTheDocument();
    expect(within(receiptRow).getByText('60.06')).toBeInTheDocument();
    expect(within(receiptRow).getByText('50.05')).toBeInTheDocument();

    await user.click(within(receiptRow).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: '添加异常' }));
    expect(await screen.findByRole('dialog', { name: '添加异常' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('异常内容'), '包装破损');
    await user.click(screen.getByRole('button', { name: '确认添加异常' }));
    await screen.findAllByText('包装破损');
    expect(screen.getAllByText('包装破损').length).toBeGreaterThan(0);
    const refreshedReceiptRow = screen.getAllByRole('row', { name: /1399-KY4001036478949/ }).find((row) => within(row).queryByText(/128×46×51/));
    if (!refreshedReceiptRow) {
      throw new Error('missing refreshed 1399 receipt row');
    }
    const todayRemarkInput = within(refreshedReceiptRow).getByLabelText(/今日收货备注/);
    await user.clear(todayRemarkInput);
    await user.type(todayRemarkInput, '今日收货备注复核');
    fireEvent.blur(todayRemarkInput);
    expect(await screen.findByText('包裹备注已保存')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /重\s*置/ }));
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '手动添加收货' }));
    expect(await screen.findByText('基础信息')).toBeInTheDocument();
    await user.type(screen.getByLabelText('手动添加客户编号'), '1399');
    await user.type(screen.getByLabelText('手动添加快递单号'), 'SF-TODAY-001');
    await user.clear(screen.getByLabelText('手动添加客户单号-快递单号'));
    await user.type(screen.getByLabelText('手动添加客户单号-快递单号'), '1399-SF-TODAY-EDITED');
    fireEvent.change(screen.getByLabelText('手动添加扫描时间'), { target: { value: '2026-06-26T14:24' } });
    await user.clear(screen.getByLabelText('手动添加件数'));
    await user.type(screen.getByLabelText('手动添加件数'), '2');
    await user.clear(screen.getByLabelText('手动添加单件实重'));
    await user.type(screen.getByLabelText('手动添加单件实重'), '5');
    await user.clear(screen.getByLabelText('手动添加长 cm'));
    await user.type(screen.getByLabelText('手动添加长 cm'), '40');
    await user.clear(screen.getByLabelText('手动添加宽 cm'));
    await user.type(screen.getByLabelText('手动添加宽 cm'), '30');
    await user.clear(screen.getByLabelText('手动添加高 cm'));
    await user.type(screen.getByLabelText('手动添加高 cm'), '20');
    await user.type(screen.getByLabelText('手动添加异常'), '外箱潮湿');
    await user.click(screen.getByRole('button', { name: '确认添加收货' }));
    const createdNotices = await screen.findAllByText(/已手动添加收货/);
    expect(createdNotices.some((element) => element.textContent?.includes('1399-SF-TODAY-EDITED'))).toBe(true);
    expect(await screen.findByText('外箱潮湿')).toBeInTheDocument();
  });

  it('keeps warehouse workbench free of finance-sensitive labels', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expectNoWarehouseFinanceText(screen.getByRole('region', { name: '今日收货' }));

    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    expect(await screen.findByRole('region', { name: '在仓数据' })).toBeInTheDocument();
    expectNoWarehouseFinanceText(screen.getByRole('region', { name: '在仓数据' }));
  });

  it('keeps operator warehouse access read-only for warehouse actions', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    const todayRegion = screen.getByRole('region', { name: '今日收货' });
    expectNoWarehouseFinanceText(todayRegion);
    expect(within(todayRegion).queryByLabelText('今日收货站点筛选')).not.toBeInTheDocument();
    expect(within(todayRegion).queryByRole('columnheader', { name: '站点' })).not.toBeInTheDocument();
    expect(within(todayRegion).queryByRole('button', { name: '添加异常' })).not.toBeInTheDocument();
    expect(within(todayRegion).queryByRole('button', { name: '手动添加收货' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    const stockRegion = await screen.findByRole('region', { name: '在仓数据' });
    expectNoWarehouseFinanceText(stockRegion);
    expect(within(stockRegion).queryByLabelText('在仓站点筛选')).not.toBeInTheDocument();
    expect(within(stockRegion).queryByRole('columnheader', { name: '站点' })).not.toBeInTheDocument();
    expect(within(stockRegion).queryByRole('button', { name: '批量理货/合票生成运单' })).not.toBeInTheDocument();
    expect(within(stockRegion).queryByRole('button', { name: /理货|拆票|合票/ })).not.toBeInTheDocument();
  });

  it('keeps order entry out of warehouse role while preserving warehouse actions', async () => {
    const user = userEvent.setup();
    await renderAndLogin('warehouse', 'warehouse123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^在仓数据/ }));
    const stockRegion = await screen.findByRole('region', { name: '在仓数据' });

    expect(within(stockRegion).queryByRole('button', { name: /录\s*单/ })).not.toBeInTheDocument();
    expect(within(stockRegion).queryByRole('button', { name: '合票录单' })).not.toBeInTheDocument();
    expect(within(stockRegion).getByRole('button', { name: '批量理货' })).toBeInTheDocument();
    expect(within(stockRegion).getAllByRole('button', { name: /^理\s*货$/ }).length).toBeGreaterThan(0);
    expect(within(stockRegion).getAllByRole('button', { name: /^拆\s*票$/ }).length).toBeGreaterThan(0);
    expect(within(stockRegion).getAllByRole('button', { name: /^合\s*票$/ }).length).toBeGreaterThan(0);
  });

  it('imports original sheet transit labels and hides unified channel wording in line details', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '海卡快速查询', [
      ['FBA 仓库代码（右侧红框输入仓库代码查找价格）', '', '', '', '', '', '', 'ONT8'],
      ['收货仓点', '义乌仓', '', '', '深圳（福永/龙岗）仓/广州仓', '', '', '参考时效（不做赔付使用，仅供参考）'],
      ['对应渠道', '12KG+', '51KG+', '100KG+', '12KG+', '51KG+', '100KG+', '参考时效（不做赔付使用，仅供参考）'],
      ['YY美西特惠海卡', 5, 5, '/', 5.5, 4.5, '/', '24-26天左右']
    ]);
    const fileData = await writeWorkbookBuffer(workbook);
    const file = new File([fileData], 'origin-transit-price.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    await user.click(screen.getByRole('button', { name: /价格表管理/ }));
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText('已导入价格表 origin-transit-price.xlsx，新增 4 条代理成本价，同步 1 条加价规则')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = screen
      .getAllByText('代理加价规则')
      .find((element) => element.classList.contains('ant-card-head-title'))
      ?.closest('.ant-card');
    expect(markupRuleCard).not.toBeNull();
    const yiYangRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /亿阳国际.*¥0\.50\/kg/ });
    await user.click(yiYangRuleRow);
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: '查看线路' }));

    const detailDialog = await screen.findByRole('dialog', { name: '亿阳国际 渠道线路详情' });
    expect(within(detailDialog).queryByText('统一渠道')).not.toBeInTheDocument();
    expect(within(detailDialog).getAllByText('24-26天左右').length).toBeGreaterThan(0);
  });


  it('prints warehouse outbound labels after consolidation and dispatches them from the label queue', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /未完成理货/ }));
    await user.type(screen.getByLabelText('理货业务员唛头筛选'), '1399');
    expect(screen.getAllByText('P710-999056444656').length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);

    for (const checkbox of screen.getAllByRole('checkbox', { name: /1399-KY40010364789/ })) {
      await user.click(checkbox);
    }
    await user.click(screen.getByRole('button', { name: '理货并创建出货单' }));
    expect(await screen.findByText('已理货合并 3 个入库包裹并生成出货单 1399-OUT001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^待出库$/ }));
    expect(screen.getByText('1399-OUT001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '申请面单' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    const consolidationQueueRow = screen.getByRole('row', { name: /1399-OUT001/ });

    await user.click(within(consolidationQueueRow).getByRole('button', { name: '打单' }));
    expect(await screen.findByText('已生成 1399-OUT001 面单 3 张')).toBeInTheDocument();
    expect(screen.getAllByText('内部交货面单').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^A\d{6}$/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/条形码 A\d{6}/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/内部交货面单 A\d{6} 美国 1\/3 1399-OUT001/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '待出库列设置' })).toBeInTheDocument();
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();
    expect(screen.getAllByText('美国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1399-OUT001').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /收货交接单/ }));
    expect(screen.getByRole('button', { name: '下载 Word' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 PDF' })).toBeInTheDocument();
    const handoverRow = screen.getByRole('row', { name: /1399-OUT001/ });
    expect(handoverRow).toBeInTheDocument();
    expect(within(handoverRow).getByText('HD-1399-OUT001')).toBeInTheDocument();
    expect(within(handoverRow).getByText(/1399-KY4001036478949/)).toBeInTheDocument();
    expect(within(handoverRow).getByText(/2026-06-08 10:07:28/)).toBeInTheDocument();
    expect(within(handoverRow).getByText('3 件')).toBeInTheDocument();
    expect(within(handoverRow).getByText('151.32 kg')).toBeInTheDocument();
    expect(screen.getByText('理货待出货')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^待出库$/ }));
    const refreshedConsolidationQueueRow = screen.getByRole('row', { name: /1399-OUT001/ });

    await user.click(within(refreshedConsolidationQueueRow).getByRole('button', { name: '出货' }));
    expect(await screen.findByText('确认出货？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认出货' }));
    expect(await screen.findByText('已出货 1399-OUT001')).toBeInTheDocument();
  });


  it('supports warehouse receiving measurement validation and manual package consolidation', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));

    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /今日收货/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /待出库订单/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^在仓数据/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /未完成理货/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^待出库$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /收货交接单/ })).toBeInTheDocument();
    expect(screen.queryByText('文档覆盖样例')).not.toBeInTheDocument();
    expect(screen.queryByText('路由归属确认')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /待出库订单/ }));
    await user.type(screen.getByLabelText('业务员唛头'), 'RCV0606');
    await user.type(screen.getByLabelText('快递单号'), 'SF000001');
    await user.clear(screen.getByLabelText('重量 kg'));
    await user.type(screen.getByLabelText('重量 kg'), '10');
    await user.clear(screen.getByLabelText('长 cm'));
    await user.type(screen.getByLabelText('长 cm'), '100');
    await user.clear(screen.getByLabelText('宽 cm'));
    await user.type(screen.getByLabelText('宽 cm'), '50');
    await user.clear(screen.getByLabelText('高 cm'));
    await user.type(screen.getByLabelText('高 cm'), '40');
    await user.click(screen.getByRole('button', { name: '新增入库包裹' }));

    expect((await screen.findAllByText('RCV0606-SF000001')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('33.33').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /未完成理货/ }));
    expect(await screen.findByText('待理货包裹')).toBeInTheDocument();
    expect(screen.getByLabelText('理货业务员唛头筛选')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1399-KY4001036478949').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('理货业务员唛头筛选'), '1399');
    expect(screen.getAllByText('P710-999056444656').length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);

    const warehouse1399Checks = screen.getAllByRole('checkbox', {
      name: /1399-KY40010364789/
    }).slice(0, 2);
    for (const checkbox of warehouse1399Checks) {
      await user.click(checkbox);
    }
    expect(screen.getByRole('button', { name: '合并成一箱' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '理货并创建出货单' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '合并成一箱' }));

    expect(await screen.findByText('已理货合并 2 个入库包裹，暂不出货')).toBeInTheDocument();
    expect(screen.getByText('理货记录')).toBeInTheDocument();
    expect(screen.getByText(/2 个包裹/)).toBeInTheDocument();
    expect(screen.getByText('仅理货')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看明细' }));

    expect(await screen.findByText('理货明细')).toBeInTheDocument();
    expect(screen.getByText('1399-MERGE001')).toBeInTheDocument();
    expect(screen.getAllByText('1399-KY4001036478949').length).toBeGreaterThan(0);
    expect(screen.getAllByText('API仓库-1399').length).toBeGreaterThan(0);
  });


  it('creates warehouse inbound labels from simple receiving input and keeps split source trace', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /待出库订单/ }));
    expect(screen.getByText('入库标签预览')).toBeInTheDocument();
    expect(screen.getByText('未录入')).toBeInTheDocument();
    expect(screen.queryByLabelText('入仓号')).not.toBeInTheDocument();
    expect(screen.queryByText('收货渠道')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('业务员唛头'));
    await user.type(screen.getByLabelText('业务员唛头'), 'WHSYA006');
    await user.type(screen.getByLabelText('快递单号'), 'SF1561933636038');
    fireEvent.change(screen.getByLabelText('总箱数'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('当前箱序'), { target: { value: '5' } });
    await user.clear(screen.getByLabelText('重量 kg'));
    await user.type(screen.getByLabelText('重量 kg'), '18');
    await user.clear(screen.getByLabelText('长 cm'));
    await user.type(screen.getByLabelText('长 cm'), '60');
    await user.clear(screen.getByLabelText('宽 cm'));
    await user.type(screen.getByLabelText('宽 cm'), '50');
    await user.clear(screen.getByLabelText('高 cm'));
    await user.type(screen.getByLabelText('高 cm'), '40');
    await user.type(screen.getByLabelText('入库备注'), '木架');

    expect(screen.getByText('WHSYA006')).toBeInTheDocument();
    expect(screen.getByText('SF1561933636038')).toBeInTheDocument();
    expect(screen.getByText('5/8')).toBeInTheDocument();
    expect(screen.getByText('6000材积 20.00 kg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新增入库包裹' }));
    expect(await screen.findByText('已新增入库包裹 WHSYA006-SF1561933636038')).toBeInTheDocument();
    expect(screen.getAllByText('WHSYA006-SF1561933636038').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /未完成理货/ }));
    await user.type(screen.getByLabelText('理货业务员唛头筛选'), 'WHSYA006');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    const splitRow = await screen.findByRole('row', { name: /WHSYA006-SF1561933636038/ });
    await user.click(within(splitRow).getByRole('button', { name: /拆\s*分/ }));
    expect(await screen.findByText('拆分入库箱')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('拆分箱数'), { target: { value: '2' } });
    await user.type(screen.getByLabelText('拆分备注'), '拆成 2 箱便于理货');
    await user.click(screen.getByRole('button', { name: '确认拆分' }));

    expect(await screen.findByText('已拆分 WHSYA006-SF1561933636038 为 2 个新箱')).toBeInTheDocument();
    expect(screen.getAllByText('来源：WHSYA006-SF1561933636038').length).toBeGreaterThan(0);
  });


  it('shows API warehouse package rows from real scan test data with partial inbound progress', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /待出库订单/ }));
    expect(screen.getByText('API 包裹数据明细')).toBeInTheDocument();
    expect(screen.queryByText('导入仓库 XLS')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '目的国家' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '入仓号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '收货渠道' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '计费重' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: '5000材积' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('columnheader', { name: '6000材积' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('1399-KY4001036478949').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已到 3/10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('部分到仓 3/10').length).toBeGreaterThan(0);
    expect(screen.getByText('2026-06-08 10:07:28')).toBeInTheDocument();
    expect(screen.getByText('2026-06-08 10:08:08')).toBeInTheDocument();
    expect(screen.getByText('2026-06-08 10:08:48')).toBeInTheDocument();
    expect(screen.getByText('0.300288')).toBeInTheDocument();
    expect(screen.getByText('60.06')).toBeInTheDocument();
    expect(screen.getAllByText('50.05').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50.83').length).toBeGreaterThan(0);
    expect(screen.getAllByText('50.44').length).toBeGreaterThan(0);
    const remarkInput = screen.getByDisplayValue('木架，外箱轻微磨损');
    await user.clear(remarkInput);
    await user.type(remarkInput, '木箱，外包装完整');
    fireEvent.blur(remarkInput);
    expect(await screen.findByText('包裹备注已保存')).toBeInTheDocument();
    expect(screen.getAllByText('P710-999056444656').length).toBeGreaterThan(0);
  });

  it('opens order entry from in-stock data with the selected warehouse package', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await fetch('/api/warehouse/packages', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-ENTRY-001',
        expectedTotalPackageCount: 1,
        packageIndex: 1,
        packageCount: 2,
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        scanTime: '2026-06-26T11:00:00.000+08:00',
        remark: '待录单'
      })
    });

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^在仓数据/ }));
    await user.type(screen.getByLabelText('在仓组合单号筛选'), '9409-KY-ENTRY-001');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    const stockRow = await screen.findByRole('row', { name: /9409-KY-ENTRY-001/ });
    await user.click(within(stockRow).getByRole('button', { name: /录\s*单/ }));

    expect(await screen.findByText('运单基础信息')).toBeInTheDocument();
    expect((await screen.findAllByDisplayValue('9409')).length).toBeGreaterThan(0);
    expect(await screen.findByDisplayValue('KY-ENTRY-001')).toBeInTheDocument();
    expect(screen.getByText('已选货物')).toBeInTheDocument();
    expect(screen.getAllByText('2 件').length).toBeGreaterThan(0);
  });

  it('creates and completes tally tasks from in-stock rows', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await fetch('/api/warehouse/packages', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-TALLY-001',
        expectedTotalPackageCount: 75,
        packageIndex: 1,
        packageCount: 75,
        weightKg: 1,
        lengthCm: 100,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-06-26T10:00:00.000+08:00',
        remark: '待理货'
      })
    });

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^在仓数据/ }));
    await user.type(screen.getByLabelText('在仓组合单号筛选'), '9409-KY-TALLY-001');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    const stockRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001/ });
    await user.click(within(stockRow).getByRole('button', { name: /^理\s*货$/ }));
    expect(await screen.findByRole('dialog', { name: '发起理货' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('理货需求'), '拆分 50/25，保留原箱唛头');
    await user.click(screen.getByRole('button', { name: '确认发起' }));

    expect(await screen.findByText(/已发起理货任务 9409-KY-TALLY-001-TL001/)).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: '未完成理货' })).toBeInTheDocument();
    const taskRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001-TL001/ });
    expect(within(taskRow).getByText('拆分 50/25，保留原箱唛头')).toBeInTheDocument();
    await user.click(within(taskRow).getByRole('button', { name: '完成理货' }));
    expect(await screen.findByText('来源：9409-KY-TALLY-001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认完成' }));

    expect(await screen.findByText(/已完成理货任务 9409-KY-TALLY-001-TL001/)).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: '已完成理货' })).toBeInTheDocument();
    const completedRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001-TL001/ });
    expect(within(completedRow).getByText('待生成')).toBeInTheDocument();
    expect(within(completedRow).getByText('warehouse')).toBeInTheDocument();
    await user.click(within(completedRow).getByRole('button', { name: '生成标签' }));
    expect(await screen.findByText(/已生成理货标签 9409-KY-TALLY-001-TL001-LBL/)).toBeInTheDocument();
    expect(await screen.findByText('9409-KY-TALLY-001-TL001-LBL')).toBeInTheDocument();
    expect(await screen.findByText(/WAREHOUSE_TALLY_LABEL/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /打\s*印/ }));
    expect(await screen.findByText(/已记录理货标签打印 9409-KY-TALLY-001-TL001-LBL/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /下\s*载/ }));
    expect(await screen.findByText(/已下载理货标签 9409-KY-TALLY-001-TL001-LBL/)).toBeInTheDocument();
  });


  it('manages in-stock rows with filters, split pieces, column settings, and merge shipment generation', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await fetch('/api/warehouse/packages', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-STOCK-075',
        expectedTotalPackageCount: 75,
        packageIndex: 1,
        packageCount: 75,
        weightKg: 1,
        lengthCm: 100,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-06-26T10:00:00.000+08:00',
        remark: '整票待拆'
      })
    });

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    expect(screen.getByText('收货票数')).toBeInTheDocument();
    expect(screen.getAllByText('件数').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量理货' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /录\s*单/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '合票录单' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^合\s*票$/ }).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('在仓组合单号筛选'), '9409-KY-STOCK-075');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    const stockRow = await screen.findByRole('row', { name: /9409-KY-STOCK-075/ });
    expect(within(stockRow).getByText('75')).toBeInTheDocument();
    expect(within(stockRow).getByText('0.200000')).toBeInTheDocument();
    expect(within(stockRow).getByText('40.00')).toBeInTheDocument();
    expect(within(stockRow).getByText('33.33')).toBeInTheDocument();
    expect(within(stockRow).getByText('15.000')).toBeInTheDocument();
    expect(within(stockRow).getByText('2500.00')).toBeInTheDocument();
    expect(within(stockRow).getByText('3000.00')).toBeInTheDocument();
    expect(within(stockRow).getByDisplayValue('整票待拆')).toBeInTheDocument();

    await user.click(within(stockRow).getByRole('checkbox'));
    expect(await screen.findByText('已选 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '批量理货' }));
    expect(await screen.findByRole('dialog', { name: '发起理货' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /取\s*消/ }));
    await user.click(screen.getByRole('button', { name: '列设置' }));
    expect((await screen.findAllByText('客户名称')).length).toBeGreaterThan(0);
    await user.keyboard('{Escape}');
    await user.click(within(stockRow).getByRole('button', { name: /拆\s*票/ }));
    expect(await screen.findByText('拆分入库箱')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('拆分件数组合'));
    await user.type(screen.getByLabelText('拆分件数组合'), '50,25');
    await user.type(screen.getByLabelText('拆分备注'), '拆分 50/25 理货');
    await user.click(screen.getByRole('button', { name: '确认拆分' }));
    expect(await screen.findByText('已拆分 9409-KY-STOCK-075 为 2 个新箱')).toBeInTheDocument();

    const firstSplitRow = await screen.findByRole('row', { name: /9409-KY-STOCK-075-1/ });
    const secondSplitRow = await screen.findByRole('row', { name: /9409-KY-STOCK-075-2/ });
    expect(within(firstSplitRow).getByText('50')).toBeInTheDocument();
    expect(within(secondSplitRow).getByText('25')).toBeInTheDocument();
    await user.click(within(firstSplitRow).getByRole('checkbox'));
    await user.click(within(secondSplitRow).getByRole('checkbox'));
    expect(await screen.findByText('已选 2')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /^合\s*票$/ })[0]);
    expect(await screen.findByLabelText('合票理货需求')).toBeInTheDocument();
    await user.type(screen.getByLabelText('合票理货需求'), '合票保留原箱唛头');
    await user.click(screen.getByRole('button', { name: '确认合票' }));
    expect(await screen.findByText(/已合票/)).toBeInTheDocument();
    expect(screen.queryByText('运单基础信息')).not.toBeInTheDocument();
    expect(screen.queryByText('已选货物')).not.toBeInTheDocument();
  });


  it('shows transfer numbers in the customer portal without internal label controls', async () => {
    await renderAndLogin('customer', 'customer123');

    expect(await screen.findByText('DHL26060600001')).toBeInTheDocument();
    expect(screen.getByText('已生成面单')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '作废面单' })).not.toBeInTheDocument();
  });


  it('sends routed shipments to warehouse label queue for printing and dispatch', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-label', 'SYGJ06061239997', 'SORT-LABEL-0606', 'WAITING_SORT', '9409-Daloday', { businessType: 'DEDICATED_LINE', latestTracking: '收货扫描' }));
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
    await user.click(screen.getByRole('button', { name: /待排货/ }));
    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239997/ });
    await user.click(within(routingRow).getByRole('button', { name: /^排\s*货$/ }));
    const assignmentDialog = await screen.findByRole('dialog', { name: '市场排货' });
    await user.click(within(assignmentDialog).getByLabelText('代理'));
    await user.click(await screen.findByText('宇环 / 深圳宇环'));
    await user.type(within(assignmentDialog).getByLabelText('代理渠道'), '宇环 DHL');
    await user.type(within(assignmentDialog).getByLabelText('计费重'), '12.5');
    await user.type(within(assignmentDialog).getByLabelText('单价'), '8');
    await user.click(within(assignmentDialog).getByLabelText('需要贴麦头'));
    await user.click(within(assignmentDialog).getByRole('button', { name: '确认排货' }));
    expect(await screen.findByText('市场排货完成，已进入已排货')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^待出库$/ }));
    const warehouseQueueRow = await screen.findByRole('row', { name: /SYGJ06061239997/ });

    expect(within(warehouseQueueRow).getByText('待仓库出货')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByText('DHL HK')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByText('深圳宇环')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByText('需贴麦头')).toBeInTheDocument();
    expectNoWarehouseFinanceText(warehouseQueueRow);
    expect(within(warehouseQueueRow).getByRole('button', { name: '打单' })).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByRole('button', { name: '出货' })).toBeInTheDocument();
    expect(within(warehouseQueueRow).queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    expect(within(warehouseQueueRow).queryByRole('button', { name: '申请面单' })).not.toBeInTheDocument();

    await user.click(within(warehouseQueueRow).getByRole('button', { name: '打单' }));
    expect(await screen.findByText(/已生成仓库出货面单/)).toBeInTheDocument();
    expect(screen.getAllByText('内部交货面单').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^A\d{6}$/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/条形码 A\d{6}/)).toBeInTheDocument();
    expect(screen.getByLabelText(/内部交货面单 A\d{6} 美国 1\/1 SYGJ06061239997/)).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getAllByText('美国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SYGJ06061239997').length).toBeGreaterThan(0);

    await user.click(within(warehouseQueueRow).getByRole('button', { name: '出货' }));
    expect(await screen.findByText('确认出货？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认出货' })).toBeDisabled();
    await user.click(screen.getByLabelText('已贴麦头'));
    await user.click(screen.getByRole('button', { name: '确认出货' }));
    expect(await screen.findByRole('heading', { name: '客服管理' })).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /SYGJ06061239997/ })).toBeInTheDocument();
  });

  it('shows the routed time as the warehouse waiting-dispatch stage time', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-time', 'SYGJ06061239993', 'SORT-TIME-0606', 'WAITING_DISPATCH', '9409-Daloday', {
      businessType: 'DEDICATED_LINE',
      agentName: '深圳宇环',
      channelName: 'DHL HK',
      routedAt: '2026-07-01T09:30:00.000Z'
    }));
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(screen.getByRole('button', { name: /^待出库$/ }));

    const queueRow = await screen.findByRole('row', { name: /SYGJ06061239993/ });
    expect(screen.getByRole('columnheader', { name: '进入待出库时间' })).toBeInTheDocument();
    expect(within(queueRow).getByText('2026-07-01 17:30:00')).toBeInTheDocument();
  });

  it('keeps warehouse pending routing read-only without cost fields', async () => {
    const user = userEvent.setup();
    employeeShipments[0] = { ...employeeShipments[0], status: 'WAITING_SORT' };
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(screen.getByRole('button', { name: /待排货/ }));

    const pendingRegion = await screen.findByRole('region', { name: '待排货' });
    expect(screen.getByRole('columnheader', { name: '站点' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '业务员' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '渠道' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '目的地' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '客户编号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '客户' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '运单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '货物数据' })).not.toBeInTheDocument();
    expectNoWarehouseFinanceText(pendingRegion);
    expect(within(pendingRegion).getByRole('button', { name: /^排\s*货$/ })).toBeInTheDocument();
  });

  it('hides pending routing costs from warehouse role', async () => {
    const user = userEvent.setup();
    employeeShipments[0] = { ...employeeShipments[0], status: 'WAITING_SORT' };
    await renderAndLogin('warehouse', 'warehouse123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(screen.getByRole('button', { name: /待排货/ }));

    const pendingRegion = await screen.findByRole('region', { name: '待排货' });
    expect(within(pendingRegion).getByRole('columnheader', { name: '站点' })).toBeInTheDocument();
    expect(within(pendingRegion).getByRole('columnheader', { name: '业务员' })).toBeInTheDocument();
    expect(within(pendingRegion).getByRole('columnheader', { name: '渠道' })).toBeInTheDocument();
    expect(within(pendingRegion).getByRole('columnheader', { name: '目的地' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '客户编号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '客户' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '运单号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '货物数据' })).not.toBeInTheDocument();
    expectNoWarehouseFinanceText(pendingRegion);
    expect(screen.queryByRole('button', { name: /^排\s*货$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  });

});
