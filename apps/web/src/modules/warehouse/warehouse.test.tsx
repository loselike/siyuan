import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { addRowsWorksheet, createWorkbook, writeWorkbookBuffer } from '../shared/excel';
import { employeeShipments, renderAndLogin, shipment } from '../testSupport/appTestHarness';
import { canEditUnenteredWarehousePackage } from './WarehousePage';

function expectNoWarehouseFinanceText(scope: HTMLElement) {
  [/业务成本/, /市场成本/, /代理成本/, /应收/, /应付/, /利润/, /银行/, /水单/, /收款/].forEach((pattern) => {
    expect(within(scope).queryByText(pattern)).not.toBeInTheDocument();
  });
}

function getBatchDispatchButton() {
  const header = screen.getByText(/已选 \d+ 票 \//).closest('.ant-card-head') as HTMLElement | null;
  const button = header ? within(header).getByRole('button', { name: /出\s*货/ }) : undefined;
  if (!button) {
    throw new Error('missing batch dispatch button');
  }
  return button;
}

describe('Warehouse flows', () => {
  it('allows unentered in-stock packages to be edited regardless of receipt state', () => {
    expect(canEditUnenteredWarehousePackage({ shipmentId: undefined })).toBe(true);
    expect(canEditUnenteredWarehousePackage({ shipmentId: 'shipment-001' })).toBe(false);
  });

  it('shows today receipts dashboard, manual exception, and 手动添加收货多条箱规 form', async () => {
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

    await user.type(screen.getByLabelText('今日收货客户编号筛选'), '1399');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    await screen.findAllByRole('row', { name: /1399-KY4001036478949/ });
    const receiptRow = screen.getAllByRole('row', { name: /1399-KY4001036478949/ }).find((row) => within(row).queryByText(/128×46×51/));
    if (!receiptRow) {
      throw new Error('missing expected 1399 receipt row');
    }
    expect(within(receiptRow).getAllByText('1399').length).toBeGreaterThanOrEqual(1);
    expect(within(receiptRow).getByText(/128×46×51/)).toBeInTheDocument();
    expect(within(receiptRow).getByText('单件体积 CBM')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '精密台账模式' }));
    expect(screen.getByRole('columnheader', { name: '单件体积 CBM' })).toBeInTheDocument();
    const ledgerReceiptRow = screen.getAllByRole('row', { name: /1399-KY4001036478949/ }).find((row) => within(row).queryByText(/128×46×51/));
    if (!ledgerReceiptRow) {
      throw new Error('missing expected 1399 ledger receipt row');
    }
    expect(within(ledgerReceiptRow).getByText('0.300288 CBM')).toBeInTheDocument();
    expect(within(ledgerReceiptRow).getByText('60.06')).toBeInTheDocument();
    expect(within(ledgerReceiptRow).getByText('50.05')).toBeInTheDocument();

    await user.click(within(ledgerReceiptRow).getByRole('checkbox'));
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
    expect(screen.getAllByRole('button', { name: '列设置' }).length).toBeGreaterThan(0);
    const todayHeaders = within(screen.getByRole('region', { name: '今日收货' })).getAllByRole('columnheader');
    expect(within(todayHeaders[0]).getByRole('checkbox', { name: '全选今日收货包裹' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '手动添加收货' }));
    expect(await screen.findByText('基础信息')).toBeInTheDocument();
    expect(screen.getByText('箱规')).toBeInTheDocument();
    const manualCustomerCodeInput = screen.getByRole('combobox', { name: '手动添加客户编号' });
    await user.type(manualCustomerCodeInput, '9409');
    await user.click(await screen.findByText('9409 - Daloday'));
    expect(manualCustomerCodeInput).toHaveValue('9409');
    const manualCustomerCodeSelect = manualCustomerCodeInput.closest('.warehouse-manual-receipt-customer-select');
    expect(manualCustomerCodeSelect).not.toBeNull();
    expect(screen.getByLabelText('手动添加客户名称')).toHaveValue('Daloday');
    await user.type(screen.getByLabelText('手动添加快递单号'), 'SF-TODAY-001');
    await user.clear(screen.getByLabelText('手动添加客户编号-快递单号'));
    await user.type(screen.getByLabelText('手动添加客户编号-快递单号'), '9409-SF-TODAY-EDITED');
    fireEvent.change(screen.getByLabelText('手动添加扫描时间'), { target: { value: '2026-06-26T14:24' } });
    await user.clear(screen.getByLabelText('第 1 条箱规件数'));
    await user.type(screen.getByLabelText('第 1 条箱规件数'), '2');
    await user.clear(screen.getByLabelText('第 1 条箱规重量 KG'));
    await user.type(screen.getByLabelText('第 1 条箱规重量 KG'), '5');
    await user.clear(screen.getByLabelText('第 1 条箱规长 cm'));
    await user.type(screen.getByLabelText('第 1 条箱规长 cm'), '40');
    await user.clear(screen.getByLabelText('第 1 条箱规宽 cm'));
    await user.type(screen.getByLabelText('第 1 条箱规宽 cm'), '30');
    await user.clear(screen.getByLabelText('第 1 条箱规高 cm'));
    await user.type(screen.getByLabelText('第 1 条箱规高 cm'), '20');
    await user.click(screen.getByRole('button', { name: '在第 1 条后新增箱规' }));
    await user.clear(screen.getByLabelText('第 2 条箱规重量 KG'));
    await user.type(screen.getByLabelText('第 2 条箱规重量 KG'), '7');
    await user.clear(screen.getByLabelText('第 2 条箱规长 cm'));
    await user.type(screen.getByLabelText('第 2 条箱规长 cm'), '50');
    await user.clear(screen.getByLabelText('第 2 条箱规宽 cm'));
    await user.type(screen.getByLabelText('第 2 条箱规宽 cm'), '40');
    await user.clear(screen.getByLabelText('第 2 条箱规高 cm'));
    await user.type(screen.getByLabelText('第 2 条箱规高 cm'), '30');
    await user.clear(screen.getByLabelText('第 2 条箱规件数'));
    await user.type(screen.getByLabelText('第 2 条箱规件数'), '3');
    await user.type(screen.getByLabelText('手动添加异常'), '外箱潮湿');
    await user.click(screen.getByRole('button', { name: '确认添加收货' }));
    const createdNotices = await screen.findAllByText(/已手动添加收货/);
    expect(createdNotices.some((element) => element.textContent?.includes('9409-SF-TODAY-EDITED'))).toBe(true);
    expect(await screen.findAllByText('外箱潮湿')).toHaveLength(2);
    expect(await screen.findAllByText('2026-06-26 14:24:00')).toHaveLength(2);
    const createPackageCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url, init]) => String(url).endsWith('/api/warehouse/packages/manual-receipt') && init?.method === 'POST'
    );
    expect(JSON.parse(String(createPackageCall?.[1]?.body))).toMatchObject({
      scanTime: '2026-06-26T06:24:00.000Z',
      cartonSpecs: [
        { packageCount: 2, weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20 },
        { packageCount: 3, weightKg: 7, lengthCm: 50, widthCm: 40, heightCm: 30 }
      ]
    });
  }, 10000);

  it('requires a customer selected from master data for manual receiving', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: '手动添加收货' }));
    await screen.findByText('9409 - Daloday');
    await user.type(screen.getByRole('combobox', { name: '手动添加客户编号' }), 'UNKNOWN');
    await user.type(screen.getByLabelText('手动添加快递单号'), 'SF-UNKNOWN-001');
    await user.click(screen.getByRole('button', { name: '确认添加收货' }));

    expect(await screen.findByText('客户编号不存在，请从客户资料中选择')).toBeInTheDocument();
  });

  it('supports 修改 on 今日收货 and 在仓数据 with 客户编号 件数 and 异常 refresh', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();

    await screen.findAllByRole('row', { name: /1399-KY4001036478949/ });
    const receiptRow = screen.getAllByRole('row', { name: /1399-KY4001036478949/ }).find((row) => within(row).queryByText(/128×46×51/));
    if (!receiptRow) {
      throw new Error('missing editable receipt row');
    }
    expect(within(receiptRow).getByRole('button', { name: /修\s*改/ })).toBeInTheDocument();
    await user.click(within(receiptRow).getByRole('button', { name: /修\s*改/ }));

    const dialog = await screen.findByRole('dialog', { name: '修改入仓包裹' });
    await user.clear(within(dialog).getByLabelText('修改客户编号'));
    await user.type(within(dialog).getByLabelText('修改客户编号'), '9409');
    await user.clear(within(dialog).getByLabelText('修改快递单号'));
    await user.type(within(dialog).getByLabelText('修改快递单号'), 'KY-EDITED-001');
    await waitFor(() => expect(within(dialog).getByLabelText('修改客户编号-快递单号')).toHaveValue('9409-KY-EDITED-001'));
    fireEvent.change(within(dialog).getByLabelText('修改件数'), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByLabelText('修改单件实重'), { target: { value: '6.5' } });
    fireEvent.change(within(dialog).getByLabelText('修改长 cm'), { target: { value: '50' } });
    fireEvent.change(within(dialog).getByLabelText('修改宽 cm'), { target: { value: '40' } });
    fireEvent.change(within(dialog).getByLabelText('修改高 cm'), { target: { value: '30' } });
    await user.clear(within(dialog).getByLabelText('修改备注'));
    await user.type(within(dialog).getByLabelText('修改备注'), '修改后备注');
    await user.type(within(dialog).getByLabelText('修改人工异常'), '人工异常复核');
    await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    expect(await screen.findByText('包裹 9409-KY-EDITED-001 已保存')).toBeInTheDocument();
    const updatedTodayRow = await screen.findByRole('row', { name: /9409-KY-EDITED-001/ });
    expect(within(updatedTodayRow).getByText('2')).toBeInTheDocument();
    expect(within(updatedTodayRow).getByText('0.120000')).toBeInTheDocument();
    expect(within(updatedTodayRow).getByText('24.00')).toBeInTheDocument();
    expect(within(updatedTodayRow).getByText('20.00')).toBeInTheDocument();
    expect(within(updatedTodayRow).getByText('人工异常复核')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    const stockRow = await screen.findByRole('row', { name: /9409-KY-EDITED-001/ });
    expect(within(stockRow).getByRole('button', { name: /修\s*改/ })).toBeInTheDocument();
    expect(within(stockRow).getByDisplayValue('修改后备注')).toBeInTheDocument();
    expect(within(stockRow).getByText('人工异常复核')).toBeInTheDocument();
  }, 10000);

  it('keeps warehouse workbench free of finance-sensitive labels', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expectNoWarehouseFinanceText(screen.getByRole('region', { name: '今日收货' }));

    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    expect(await screen.findByRole('region', { name: '在仓数据' })).toBeInTheDocument();
    const stockRegion = screen.getByRole('region', { name: '在仓数据' });
    expectNoWarehouseFinanceText(stockRegion);
    const stockHeaders = within(stockRegion).getAllByRole('columnheader');
    expect(within(stockHeaders[0]).getByRole('checkbox', { name: '全选在仓包裹' })).toBeInTheDocument();
  });

  it('全选只选当前页并保持已选数量准确，批量理货批量录单只使用实际勾选行', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await Promise.all(Array.from({ length: 12 }, (_, index) =>
      fetch('/api/warehouse/packages', {
        method: 'POST',
        body: JSON.stringify({
          customerCode: '9409',
          customerOrderNo: '9409',
          domesticTrackingNo: `KY-PAGE-${String(index + 1).padStart(3, '0')}`,
          expectedTotalPackageCount: 12,
          packageIndex: index + 1,
          packageCount: 1,
          weightKg: 1,
          lengthCm: 30,
          widthCm: 20,
          heightCm: 10,
          scanTime: `2026-06-26T10:${String(index).padStart(2, '0')}:00.000+08:00`
        })
      })
    ));

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^在仓数据/ }));
    const stockRegion = await screen.findByRole('region', { name: '在仓数据' });

    const stockHeaders = within(stockRegion).getAllByRole('columnheader');
    const currentPageSelectableCount = within(stockRegion)
      .getAllByRole('checkbox')
      .filter((checkbox) => checkbox.getAttribute('aria-label')?.startsWith('选择在仓包裹')).length;
    expect(currentPageSelectableCount).toBeGreaterThan(0);
    await user.click(within(stockHeaders[0]).getByRole('checkbox', { name: '全选在仓包裹' }));
    expect(await within(stockRegion).findByText(`已选 ${currentPageSelectableCount}`)).toBeInTheDocument();
    expect(within(stockRegion).getByRole('button', { name: '批量理货' })).toBeInTheDocument();
    expect(within(stockRegion).getByRole('button', { name: '批量录单' })).toBeInTheDocument();

    const nextPageButton = stockRegion.querySelector('.ant-pagination-next button');
    if (nextPageButton && !nextPageButton.closest('li')?.classList.contains('ant-pagination-disabled')) {
      await user.click(nextPageButton as HTMLButtonElement);
      expect(await within(stockRegion).findByText(`已选 ${currentPageSelectableCount}`)).toBeInTheDocument();
      const checkedOnSecondPage = within(stockRegion).getAllByRole('checkbox').filter((checkbox) => (checkbox as HTMLInputElement).checked);
      expect(checkedOnSecondPage).toHaveLength(0);
    }
  });

  it('does not expose warehouse navigation to business operators', async () => {
    await renderAndLogin('operator', 'operator123');
    expect(screen.queryByRole('menuitem', { name: '仓库管理' })).not.toBeInTheDocument();
  });

  it('keeps order entry out of warehouse role while preserving warehouse actions', async () => {
    const user = userEvent.setup();
    await renderAndLogin('warehouse', 'warehouse123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^在仓数据/ }));
    const stockRegion = await screen.findByRole('region', { name: '在仓数据' });

    expect(within(stockRegion).queryByRole('button', { name: /录\s*单/ })).not.toBeInTheDocument();
    expect(within(stockRegion).queryByRole('button', { name: '合票录单' })).not.toBeInTheDocument();
    expect(within(stockRegion).queryByRole('button', { name: '批量录单' })).not.toBeInTheDocument();
    expect(within(stockRegion).queryByRole('button', { name: /^合\s*票$/ })).not.toBeInTheDocument();
    expect(within(stockRegion).getByRole('button', { name: '批量理货' })).toBeInTheDocument();
    expect(within(stockRegion).getAllByRole('button', { name: /^理\s*货$/ }).length).toBeGreaterThan(0);
    expect(within(stockRegion).getAllByRole('button', { name: /^拆\s*票$/ }).length).toBeGreaterThan(0);
  });

  it('imports original sheet transit rows and hides unified channel wording in line details', async () => {
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
    expect(await screen.findByText(/已导入价格表 origin-transit-price\.xlsx，新增 \d+ 条代理成本价，亮崽模块：.*同步 1 条加价规则/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = screen
      .getAllByText('代理加价规则')
      .map((element) => element.closest('.ant-card'))
      .find((element): element is HTMLElement => element instanceof HTMLElement);
    expect(markupRuleCard).not.toBeNull();
    const yiYangRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /亿阳国际.*¥0\.50\/kg/ });
    await user.click(yiYangRuleRow);
    await user.click(within(yiYangRuleRow).getByRole('button', { name: '查看线路' }));

    const detailDialog = await screen.findByRole('dialog', { name: '亿阳国际 渠道线路详情' });
    expect(within(detailDialog).queryByText('统一渠道')).not.toBeInTheDocument();
    expect(within(detailDialog).getAllByText('24-26天左右').length).toBeGreaterThan(0);
  });


  it('supports 待出库 batch dispatch with 代理交接单 and 已出库 archive after consolidation', async () => {
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
    const queueHeaders = screen.getAllByRole('columnheader').map((header) => header.textContent?.replace(/\s+/g, '') ?? '');
    ['选择', '出货单创建时间', '业务员', '出货单号', '代理', '代理渠道', '客户编号', '目的地', '渠道', '业务数据', '件数', '总量', '体积', '计费重', '唛头', '品名', '报关', '敏感'].forEach((header) => {
      expect(queueHeaders).toContain(header);
    });
    expect(queueHeaders.indexOf('出货单创建时间')).toBeLessThan(queueHeaders.indexOf('业务员'));
    expect(queueHeaders.indexOf('业务员')).toBeLessThan(queueHeaders.indexOf('出货单号'));
    expect(queueHeaders.indexOf('出货单号')).toBeLessThan(queueHeaders.indexOf('代理'));
    expect(queueHeaders.indexOf('代理')).toBeLessThan(queueHeaders.indexOf('代理渠道'));
    expect(queueHeaders.indexOf('代理渠道')).toBeLessThan(queueHeaders.indexOf('客户编号'));
    expect(queueHeaders.indexOf('客户编号')).toBeLessThan(queueHeaders.indexOf('目的地'));
    expect(queueHeaders.indexOf('目的地')).toBeLessThan(queueHeaders.indexOf('渠道'));
    expect(queueHeaders.indexOf('渠道')).toBeLessThan(queueHeaders.indexOf('业务数据'));
    const consolidationQueueRow = screen.getByRole('row', { name: /1399-OUT001/ });

    await user.click(within(consolidationQueueRow).getByRole('checkbox', { name: /选择待出库订单 1399-OUT001/ }));
    expect(screen.getByText('已选 1 票 / 3 件')).toBeInTheDocument();
    await user.click(getBatchDispatchButton());
    const firstHandoverDialog = await screen.findByRole('dialog', { name: '代理交接单' });
    expect(within(firstHandoverDialog).getByText('深圳思远国际货运代理有限公司')).toBeInTheDocument();
    expect(within(firstHandoverDialog).getByText('代理')).toBeInTheDocument();
    expect(within(firstHandoverDialog).getByText('出货时间')).toBeInTheDocument();
    ['出货单号', '入仓号', '渠道', '品名', '件数', '是否', '报关退税', '备注', '目的地'].forEach((text) => {
      expect(within(firstHandoverDialog).getAllByText((content) => content.includes(text)).length).toBeGreaterThan(0);
    });
    expect(within(firstHandoverDialog).getByText('1399-OUT001')).toBeInTheDocument();
    expect(within(firstHandoverDialog).getByText(/1399-KY4001036478949/)).toBeInTheDocument();
    expect(within(firstHandoverDialog).getByText('待确认代理')).toBeInTheDocument();
    expect(within(firstHandoverDialog).getByText('票数')).toBeInTheDocument();
    expect(within(firstHandoverDialog).getAllByText('1').length).toBeGreaterThan(0);
    expect(within(firstHandoverDialog).getAllByText('3').length).toBeGreaterThan(0);
    expect(within(firstHandoverDialog).getByText('收件人：')).toBeInTheDocument();
    await user.click(within(firstHandoverDialog).getByRole('button', { name: /取\s*消/ }));
    await user.click(within(consolidationQueueRow).getByRole('checkbox', { name: /选择待出库订单 1399-OUT001/ }));

    expect(screen.queryByRole('button', { name: '待出库列设置' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();
    const warehouseQueueCard = screen.getByRole('button', { name: '列设置' }).closest('.ant-card') as HTMLElement;
    expect(warehouseQueueCard).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '列设置' }));
    const columnSettingsDialog = (await screen.findByText('业务数据：件数')).closest('.ant-modal') as HTMLElement;
    expect(columnSettingsDialog).toBeTruthy();
    expect(screen.getByText('待出库列设置')).toBeInTheDocument();
    expect(within(columnSettingsDialog).getByLabelText('业务数据：件数')).toBeInTheDocument();
    expect(within(columnSettingsDialog).getByLabelText('唛头')).toBeInTheDocument();
    await user.click(within(columnSettingsDialog).getByLabelText('业务数据：件数'));
    expect(within(warehouseQueueCard).queryAllByRole('columnheader', { name: '件数' })).toHaveLength(0);
    expect(within(warehouseQueueCard).getAllByRole('columnheader', { name: '业务数据' }).length).toBeGreaterThan(0);
    await user.click(within(columnSettingsDialog).getByRole('button', { name: '恢复默认' }));
    expect(within(warehouseQueueCard).getAllByRole('columnheader', { name: '件数' }).length).toBeGreaterThan(0);
    await user.click(within(columnSettingsDialog).getByRole('button', { name: /完\s*成/ }));
    await waitFor(() => expect(screen.queryByText('待出库列设置')).not.toBeInTheDocument());
    expect(screen.getAllByText('美国').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1399-OUT001').length).toBeGreaterThan(0);

    expect(screen.queryByRole('button', { name: /收货交接单/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /已出库/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^待出库$/ }));
    const refreshedConsolidationQueueRow = screen.getAllByRole('row', { name: /1399-OUT001/ })
      .find((row) => within(row).queryByRole('checkbox', { name: /选择待出库订单 1399-OUT001/ })) as HTMLElement;

    await user.click(getBatchDispatchButton());
    expect(await screen.findByText('请先勾选待出库订单')).toBeInTheDocument();
    await user.click(within(refreshedConsolidationQueueRow).getByRole('checkbox', { name: /选择待出库订单 1399-OUT001/ }));
    expect(screen.getByText('已选 1 票 / 3 件')).toBeInTheDocument();
    await user.click(getBatchDispatchButton());
    const handoverDialog = await screen.findByRole('dialog', { name: '代理交接单' });
    expect(within(handoverDialog).getByText(/已选择 1 个待出库订单/)).toBeInTheDocument();
    expect(within(handoverDialog).getByText('待确认代理')).toBeInTheDocument();
    expect(within(handoverDialog).getByText('1399-OUT001')).toBeInTheDocument();
    expect(within(handoverDialog).queryByRole('button', { name: '确认出货' })).not.toBeInTheDocument();
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn()
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow as unknown as Window);
    await user.click(within(handoverDialog).getByRole('button', { name: '打印' }));
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('1399-OUT001'));
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('深圳思远国际货运代理有限公司'));
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('收件人：'));
    expect(printWindow.print).toHaveBeenCalled();
    expect(await screen.findByText('已批量出货 1 个待出库订单')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /选择待出库订单 1399-OUT001/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /已出库/ }));
    const archiveRow = (await screen.findAllByRole('row', { name: /1399-OUT001/ }))
      .find((row) => within(row).queryByText('HD-1399-OUT001')) as HTMLElement;
    expect(archiveRow).toBeInTheDocument();
    expect(within(archiveRow).getByText('HD-1399-OUT001')).toBeInTheDocument();
    expect(within(archiveRow).getByText('待确认代理')).toBeInTheDocument();
    expect(within(archiveRow).getByText('3 件')).toBeInTheDocument();
    expect(within(archiveRow).getByText('151.32 kg')).toBeInTheDocument();
    expect(within(archiveRow).getByText('仓库')).toBeInTheDocument();
    expect(within(archiveRow).getByText('已出库')).toBeInTheDocument();
    expectNoWarehouseFinanceText(archiveRow);
    const progressedArchiveRow = screen.getByRole('row', { name: /SYGJ06061239999/ });
    expect(within(progressedArchiveRow).getByText('HD-SYGJ06061239999')).toBeInTheDocument();
    expect(within(progressedArchiveRow).getByText('已出库历史')).toBeInTheDocument();
    openSpy.mockRestore();
  });

  it('待出库批量出货表头全选只选择当前页并按实际已选统计', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(...Array.from({ length: 12 }, (_, index) => shipment(
      `s-batch-dispatch-${index}`,
      `BATCH-DISPATCH-${String(index + 1).padStart(2, '0')}`,
      `BATCH-OUT-${String(index + 1).padStart(2, '0')}`,
      'WAITING_DISPATCH',
      '9409-Daloday',
      {
        packageCount: 2,
        agentName: '宇环',
        channelName: 'DHL HK',
        routeAgentChannelName: '宇环 DHL',
        routeCostTotal: 120,
        routeCurrency: 'RMB'
      }
    )));
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^待出库$/ }));
    const queueRegion = await screen.findByRole('region', { name: '待出库' });
    const rowCheckboxes = within(queueRegion).getAllByRole('checkbox', { name: /选择待出库订单 BATCH-DISPATCH-/ });
    expect(rowCheckboxes).toHaveLength(10);
    const headerCheckbox = within(queueRegion).getAllByRole('checkbox')
      .find((checkbox) => !checkbox.getAttribute('aria-label')?.startsWith('选择待出库订单'));
    expect(headerCheckbox).not.toBeNull();

    await user.click(headerCheckbox as HTMLInputElement);
    expect(await within(queueRegion).findByText('已选 10 票 / 20 件')).toBeInTheDocument();
    expect(rowCheckboxes.filter((checkbox) => (checkbox as HTMLInputElement).checked)).toHaveLength(10);
    expect(within(queueRegion).queryByText('BATCH-DISPATCH-11')).not.toBeInTheDocument();

    const nextPageButton = queueRegion.querySelector('.ant-pagination-next button');
    expect(nextPageButton).not.toBeNull();
    await user.click(nextPageButton as HTMLButtonElement);
    expect(await within(queueRegion).findByText('已选 0 票 / 0 件')).toBeInTheDocument();
    const checkedOnSecondPage = within(queueRegion).getAllByRole('checkbox').filter((checkbox) => (checkbox as HTMLInputElement).checked);
    expect(checkedOnSecondPage).toHaveLength(0);
  });


  it('supports warehouse receiving measurement validation and manual package consolidation', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));

    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /今日收货/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /待出库订单/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^在仓数据/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /未完成理货/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^待出库$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /收货交接单/ })).not.toBeInTheDocument();
    const pendingDispatchButton = screen.getByRole('button', { name: /^待出库$/ });
    const outboundedButton = screen.getByRole('button', { name: /已出库/ });
    expect(Boolean(pendingDispatchButton.compareDocumentPosition(outboundedButton) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(screen.queryByText('文档覆盖样例')).not.toBeInTheDocument();
    expect(screen.queryByText('路由归属确认')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /未完成理货/ }));
    expect(await screen.findByText('待理货包裹')).toBeInTheDocument();
    const tallyPackageCard = screen.getByText('待理货包裹').closest('.ant-card') as HTMLElement;
    const tallyPackageHeaders = within(tallyPackageCard).getAllByRole('columnheader');
    expect(within(tallyPackageHeaders[0]).getByRole('checkbox', { name: '全选待理货包裹' })).toBeInTheDocument();
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


  it('shows API warehouse package rows from real scan test data with partial inbound progress', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    expect(await screen.findByRole('heading', { name: '仓库管理中心' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    expect(screen.getAllByText('在仓数据').length).toBeGreaterThan(0);
    expect(screen.queryByText('导入仓库 XLS')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '目的国家' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '入仓号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '收货渠道' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '计费重' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: '单件5000材积' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('columnheader', { name: '单件6000材积' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('1399-KY4001036478949').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/部分到仓/).length).toBeGreaterThan(0);
    expect(screen.getByText('2026-06-08 10:07:28')).toBeInTheDocument();
    expect(screen.getByText('2026-06-08 10:08:08')).toBeInTheDocument();
    expect(screen.getByText('2026-06-08 10:08:48')).toBeInTheDocument();
    expect(screen.getByText('0.300288')).toBeInTheDocument();
    expect(screen.getAllByText('60.06').length).toBeGreaterThan(0);
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

  it('prefills 录单 from a single in-stock warehouse package row', async () => {
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
    await user.type(screen.getByLabelText('在仓组合号筛选'), '9409-KY-ENTRY-001');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    const stockRow = await screen.findByRole('row', { name: /9409-KY-ENTRY-001/ });
    expect(within(stockRow).getByRole('button', { name: /^录\s*单$/ })).toBeInTheDocument();
    expect(within(stockRow).getByRole('button', { name: /理\s*货/ })).toBeInTheDocument();
    expect(within(stockRow).queryByRole('button', { name: /^合\s*票$/ })).not.toBeInTheDocument();

    await user.click(within(stockRow).getByRole('button', { name: /^录\s*单$/ }));
    expect(await screen.findByText('运单基础信息')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/app/business/finance-entry'));
    await waitFor(() => expect(screen.getByText('1 条')).toBeInTheDocument());
    expect(screen.getByText('2 件')).toBeInTheDocument();
    expect(screen.getByText('5.00 kg')).toBeInTheDocument();
    expect(screen.getByText('0.048000 CBM')).toBeInTheDocument();
    expect(screen.getByText('8.00 kg')).toBeInTheDocument();
    expect(screen.getByLabelText('客户编号')).toHaveValue('9409');
    expect(screen.getByLabelText('入仓号')).toHaveValue('KY-ENTRY-001');
    const selectedList = screen.getByLabelText('已选货物列表');
    expect(within(selectedList).queryByText('理')).not.toBeInTheDocument();
  });

  it('shows 理 marker and tally history after 录单 preselects a tallied warehouse package', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    const created = await fetch('/api/warehouse/packages', {
      method: 'POST',
      body: JSON.stringify({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-TALLY-ENTRY-001',
        expectedTotalPackageCount: 6,
        packageIndex: 1,
        packageCount: 6,
        weightKg: 2,
        lengthCm: 60,
        widthCm: 40,
        heightCm: 30,
        scanTime: '2026-06-26T11:30:00.000+08:00',
        remark: '理货后录单'
      })
    }).then((response) => response.json());
    const task = await fetch('/api/warehouse/tally-tasks', {
      method: 'POST',
      body: JSON.stringify({ packageIds: [created.id], tallyRequirement: '换箱后录单标记检查' })
    }).then((response) => response.json());
    const completed = await fetch(`/api/warehouse/tally-tasks/${task.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ packageCount: 3, weightKg: 9, lengthCm: 80, widthCm: 50, heightCm: 40 })
    }).then((response) => response.json());
    const labeled = await fetch(`/api/warehouse/tally-tasks/${completed.id}/label`, { method: 'POST' }).then((response) => response.json());
    await fetch('/api/warehouse/tally-tasks/label-scan', {
      method: 'POST',
      body: JSON.stringify({ labelNo: labeled.labelNo })
    });

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^在仓数据/ }));
    await user.type(screen.getByLabelText('在仓组合号筛选'), '9409-KY-TALLY-ENTRY-001');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    const talliedRow = await screen.findByRole('row', { name: /9409-KY-TALLY-ENTRY-001/ });
    expect(within(talliedRow).getByText('理')).toBeInTheDocument();
    await user.click(within(talliedRow).getByRole('button', { name: /^录\s*单$/ }));

    expect(await screen.findByText('运单基础信息')).toBeInTheDocument();
    const selectedList = await screen.findByLabelText('已选货物列表');
    expect(within(selectedList).getByText('理')).toBeInTheDocument();
    await user.click(within(selectedList).getByText('理'));
    const historyDialog = await screen.findByRole('dialog', { name: '理货历史详情' });
    expect(within(historyDialog).getByText('换箱后录单标记检查')).toBeInTheDocument();
    expect(within(historyDialog).getByText('来源组合号：')).toBeInTheDocument();
    expect(within(historyDialog).getAllByText('9409-KY-TALLY-ENTRY-001').length).toBeGreaterThan(0);
    expect(within(historyDialog).getByText('原始件重尺')).toBeInTheDocument();
    expect(within(historyDialog).getByText('理货后件重尺')).toBeInTheDocument();
    expect(within(historyDialog).getByText('标签应用时间：')).toBeInTheDocument();
    expectNoWarehouseFinanceText(historyDialog);
  });

  it('creates and completes 理货 tasks from in-stock rows', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    const printWindow = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      setTimeout: (callback: () => void) => { callback(); return 1; },
      opener: null
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow as unknown as Window);
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
    await user.type(screen.getByLabelText('在仓组合号筛选'), '9409-KY-TALLY-001');
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    const stockRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001/ });
    await user.click(within(stockRow).getByRole('button', { name: /^理\s*货$/ }));
    expect(await screen.findByRole('dialog', { name: '发起理货' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('理货需求'), '拆分 50/25，保留原箱唛头');
    await user.click(screen.getByRole('button', { name: '确认发起' }));

    expect(await screen.findByText(/已发起理货任务/)).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: '未完成理货' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    const pendingStockRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001/ });
    expect(within(pendingStockRow).getByText('理货中')).toBeInTheDocument();
    expect(within(pendingStockRow).queryByRole('button', { name: /查看理货记录 9409-KY-TALLY-001/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^未完成理货/ }));
    const taskRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001/ });
    expect(within(taskRow).getByText('拆分 50/25，保留原箱唛头')).toBeInTheDocument();
    await user.click(within(taskRow).getByRole('button', { name: '处理理货' }));
    expect(await screen.findByText(/仅处理已关联的原始包裹/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认完成' }));

    expect(await screen.findByText(/已完成理货任务/)).toBeInTheDocument();
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('<svg'));
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringMatching(/9409\d{4}(?:\d{2})?LH/));
    expect(printWindow.print).toHaveBeenCalled();
    expect(await screen.findByRole('region', { name: '已完成理货' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    const completedMarkedStockRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001/ });
    const completedTallyMark = within(completedMarkedStockRow).getByRole('button', { name: /查看理货记录 9409-KY-TALLY-001/ });
    expect(completedTallyMark).toBeInTheDocument();
    await user.click(completedTallyMark);
    expect(await screen.findByText(/理货任务号：/)).toBeInTheDocument();
    expect(await screen.findByText('拆分 50/25，保留原箱唛头')).toBeInTheDocument();
    expect(await screen.findByText('完成人：warehouse')).toBeInTheDocument();
    expectNoWarehouseFinanceText(document.body);
    await user.keyboard('{Escape}');
    expect(within(completedMarkedStockRow).getByText('待重新过机')).toBeInTheDocument();
    expect(within(completedMarkedStockRow).getByRole('button', { name: /^理\s*货$/ })).toBeDisabled();
    expect(within(completedMarkedStockRow).getByRole('button', { name: /^录\s*单$/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^已完成理货/ }));
    expect(await screen.findByRole('region', { name: '已完成理货' })).toBeInTheDocument();
    const completedRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001/ });
    expect(within(completedRow).getByText('已生成')).toBeInTheDocument();
    expect(within(completedRow).getByText('warehouse')).toBeInTheDocument();
    await user.click(within(completedRow).getByRole('button', { name: '重打标签' }));
    expect(await screen.findByText(/已生成理货标签/)).toBeInTheDocument();
    expect(await screen.findByText(/WAREHOUSE_TALLY_LABEL/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /打\s*印/ }));
    expect(await screen.findByText(/已记录理货标签打印/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /下\s*载/ }));
    expect(await screen.findByText(/已下载理货标签/)).toBeInTheDocument();
    expect(within(completedRow).queryByRole('button', { name: /应\s*用/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^在仓数据/ }));
    const talliedStockRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001/ });
    await user.click(within(talliedStockRow).getByText('理'));
    expect(await screen.findByText(/理货任务号/)).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: /^已完成理货历史/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^已完成理货/ }));
    expect(await screen.findByRole('region', { name: '已完成理货' })).toBeInTheDocument();
    await user.click(screen.getByText('已完成理货历史'));
    const historyRow = await screen.findByRole('row', { name: /9409-KY-TALLY-001.*理货完成/ });
    expect(within(historyRow).getByText('75')).toBeInTheDocument();
    expect(within(historyRow).getByText('1.00 kg')).toBeInTheDocument();
    expect(within(historyRow).getByText('100×50×40')).toBeInTheDocument();
    expect(within(historyRow).getByText(/LH|TL/)).toBeInTheDocument();
    expect(within(historyRow).getByText('理货归档')).toBeInTheDocument();
    openSpy.mockRestore();
  });


  it('supports 批量录单 from selected warehouse package rows after in-stock split', async () => {
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
    expect(screen.getAllByRole('button', { name: '列设置' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '批量理货' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量录单' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '合票录单' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^合\s*票$/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '批量录单' }));
    expect(await screen.findByText('请先勾选需要录单的包裹')).toBeInTheDocument();

    await user.type(screen.getByLabelText('在仓组合号筛选'), '9409-KY-STOCK-075');
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
    await user.click(screen.getAllByRole('button', { name: '列设置' })[0]);
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
    await user.click(screen.getByRole('button', { name: '批量录单' }));
    expect(await screen.findByText('运单基础信息')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/app/business/finance-entry'));
    await waitFor(() => expect(screen.getByText('2 条')).toBeInTheDocument());
    expect(screen.getByText('75 件')).toBeInTheDocument();
    expect(screen.getByText('1.00 kg')).toBeInTheDocument();
    expect(screen.getByText('15.000000 CBM')).toBeInTheDocument();
    expect(screen.getByText('2500.00 kg')).toBeInTheDocument();
    expect(screen.getByLabelText('客户编号')).toHaveValue('9409');
    expect(screen.getByLabelText('入仓号')).toHaveValue('KY-STOCK-075');
    expect(screen.queryByLabelText('合票理货需求')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认合票' })).not.toBeInTheDocument();
  });


  it('shows transfer numbers in the customer portal without internal label controls', async () => {
    await renderAndLogin('customer', 'customer123');

    expect(await screen.findByText('DHL26060600001')).toBeInTheDocument();
    expect(screen.getByText('已生成面单')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '作废面单' })).not.toBeInTheDocument();
  });


  it('requires 唛头 confirmation before batch dispatch from 待出库', async () => {
    const user = userEvent.setup();
    employeeShipments.unshift(shipment('s-routing-label', 'SYGJ06061239997', 'SORT-LABEL-0606', 'WAITING_SORT', '9409-Daloday', {
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
      routeCurrency: 'RMB',
      shippingMarkRequired: true
    }));
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '市场管理' }));
    const routingSubNav = await screen.findByLabelText('市场管理二级功能');
    await user.click(within(routingSubNav).getByRole('button', { name: '待排货' }));
    const routingRow = await screen.findByRole('row', { name: /SYGJ06061239997/ });
    await user.click(within(routingRow).getByRole('button', { name: /审\s*核/ }));
    const routingConfirmation = await screen.findByRole('dialog', { name: '确认审核排货' });
    await user.click(within(routingConfirmation).getByRole('button', { name: '确认审核' }));
    expect(await screen.findByText(/SYGJ06061239997 审核通过，已同步进入已排货和待出库/)).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: /待排货/ })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    await user.click(await screen.findByRole('button', { name: /^待出库$/ }));
    const warehouseQueueRow = await screen.findByRole('row', { name: /SYGJ06061239997/ });

    expect(within(warehouseQueueRow).getByText('operator')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByText('DHL HK')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByText('深圳宇环')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByText('9409')).toBeInTheDocument();
    expect(within(warehouseQueueRow).getByText('需贴唛头')).toBeInTheDocument();
    expectNoWarehouseFinanceText(warehouseQueueRow);
    expect(within(warehouseQueueRow).queryByRole('button', { name: '打单' })).not.toBeInTheDocument();
    expect(within(warehouseQueueRow).queryByRole('button', { name: '出货' })).not.toBeInTheDocument();
    expect(within(warehouseQueueRow).queryByRole('button', { name: '确认收货' })).not.toBeInTheDocument();
    expect(within(warehouseQueueRow).queryByRole('button', { name: '申请面单' })).not.toBeInTheDocument();
    expect(screen.getAllByText('SYGJ06061239997').length).toBeGreaterThan(0);

    await user.click(within(warehouseQueueRow).getByRole('checkbox', { name: /选择待出库订单 SYGJ06061239997/ }));
    await user.click(getBatchDispatchButton());
    const handoverDialog = await screen.findByRole('dialog', { name: '代理交接单' });
    expect(within(handoverDialog).getByText('深圳思远国际货运代理有限公司')).toBeInTheDocument();
    expect(within(handoverDialog).getByText('深圳宇环')).toBeInTheDocument();
    expect(within(handoverDialog).getByText('DHL HK')).toBeInTheDocument();
    expect(within(handoverDialog).getByLabelText('已确认所选需贴唛头订单均已贴好唛头')).toBeInTheDocument();
    expectNoWarehouseFinanceText(handoverDialog);
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn()
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow as unknown as Window);
    await user.click(within(handoverDialog).getByRole('button', { name: '打印' }));
    expect(await screen.findByText('所选订单包含需贴唛头，请确认已贴唛头后再出货')).toBeInTheDocument();
    expect(printWindow.print).not.toHaveBeenCalled();
    await user.click(within(handoverDialog).getByLabelText('已确认所选需贴唛头订单均已贴好唛头'));
    await user.click(within(handoverDialog).getByRole('button', { name: '打印' }));
    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('SYGJ06061239997'));
    expect(printWindow.print).toHaveBeenCalled();
    openSpy.mockRestore();
    expect(await screen.findByRole('heading', { name: '仓库管理' })).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /SYGJ06061239997/ })).toBeInTheDocument();
  });

  it('shows 待出库出货单创建时间 as the business-specified entry date column', async () => {
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
    expect(screen.getByRole('columnheader', { name: '出货单创建时间' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '进入待出库时间' })).not.toBeInTheDocument();
    expect(within(queueRow).getByText('2026-06-06 17:40:00')).toBeInTheDocument();
  });

  it('shows warehouse 待排货 without cost fields in table and 列设置 while staying 只读', async () => {
    const user = userEvent.setup();
    employeeShipments[0] = { ...employeeShipments[0], status: 'WAITING_SORT' };
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    const warehouseSubNav = await screen.findByRole('group', { name: '仓库管理二级功能' });
    await user.click(within(warehouseSubNav).getByRole('button', { name: '待排货' }));

    const pendingRegion = await screen.findByRole('region', { name: '待排货' });
    [
      '日期',
      '站点',
      '业务员',
      '客户编号',
      '出货单号',
      '公司渠道',
      '货物数据',
      '选项',
      '代理',
      '代理渠道',
      '操作'
    ].forEach((name) => {
      expect(within(pendingRegion).getByRole('columnheader', { name })).toBeInTheDocument();
    });
    expect(within(pendingRegion).queryByRole('columnheader', { name: '业务成本' })).not.toBeInTheDocument();
    expect(within(pendingRegion).queryByRole('columnheader', { name: '业务成本合计' })).not.toBeInTheDocument();
    expect(within(pendingRegion).queryByRole('columnheader', { name: '应付成本' })).not.toBeInTheDocument();
    expect(within(pendingRegion).queryByRole('columnheader', { name: '应付合计' })).not.toBeInTheDocument();
    await user.click(within(pendingRegion).getByRole('button', { name: '列设置' }));
    const columnSettingsDialog = (await screen.findByText('待排货列设置')).closest('.ant-modal') as HTMLElement;
    expect(columnSettingsDialog).toBeTruthy();
    expect(within(columnSettingsDialog).queryByText('业务成本')).not.toBeInTheDocument();
    expect(within(columnSettingsDialog).queryByText('业务成本合计')).not.toBeInTheDocument();
    expect(within(columnSettingsDialog).queryByText('应付成本')).not.toBeInTheDocument();
    expect(within(columnSettingsDialog).queryByText('应付合计')).not.toBeInTheDocument();
    await user.click(within(columnSettingsDialog).getByRole('button', { name: /完\s*成/ }));
    await waitFor(() => expect(screen.queryByText('待排货列设置')).not.toBeInTheDocument());
    expect(within(pendingRegion).getAllByText('待市场排货').length).toBeGreaterThan(0);
    expect(within(pendingRegion).getAllByText('只读').length).toBeGreaterThan(0);
    expect(within(pendingRegion).queryByRole('button', { name: /^排\s*货$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  });

  it('keeps warehouse role 待排货 read-only with synced fields', async () => {
    const user = userEvent.setup();
    employeeShipments[0] = { ...employeeShipments[0], status: 'WAITING_SORT' };
    await renderAndLogin('warehouse', 'warehouse123');

    await user.click(screen.getByRole('menuitem', { name: '仓库管理' }));
    const warehouseSubNav = await screen.findByRole('group', { name: '仓库管理二级功能' });
    await user.click(within(warehouseSubNav).getByRole('button', { name: '待排货' }));

    const pendingRegion = await screen.findByRole('region', { name: '待排货' });
    [
      '日期',
      '站点',
      '业务员',
      '客户编号',
      '出货单号',
      '公司渠道',
      '货物数据',
      '选项',
      '代理',
      '代理渠道',
      '操作'
    ].forEach((name) => {
      expect(within(pendingRegion).getByRole('columnheader', { name })).toBeInTheDocument();
    });
    expect(within(pendingRegion).queryByRole('columnheader', { name: '业务成本' })).not.toBeInTheDocument();
    expect(within(pendingRegion).queryByRole('columnheader', { name: '业务成本合计' })).not.toBeInTheDocument();
    expect(within(pendingRegion).queryByRole('columnheader', { name: '应付成本' })).not.toBeInTheDocument();
    expect(within(pendingRegion).queryByRole('columnheader', { name: '应付合计' })).not.toBeInTheDocument();
    expect(within(pendingRegion).getAllByText('待市场排货').length).toBeGreaterThan(0);
    expect(within(pendingRegion).getAllByText('只读').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^排\s*货$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  });

});
