import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { parsePriceWorkbook } from './excel';
import { addRowsWorksheet, createWorkbook, loadExcel, writeWorkbookBuffer } from '../shared/excel';
import { cleanup, renderAndLogin } from '../testSupport/appTestHarness';

describe('Pricing flows', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  function getMarkupRuleCard() {
    return screen
      .getAllByText('代理加价规则')
      .map((element) => element.closest('.ant-card'))
      .find((element): element is HTMLElement => element instanceof HTMLElement);
  }

  function getPriceBookCard() {
    return screen
      .getAllByText('价格表管理')
      .map((element) => element.closest('.ant-card'))
      .find((element): element is HTMLElement => element instanceof HTMLElement);
  }

  async function selectPriceBookRow(user: ReturnType<typeof userEvent.setup>, priceBookCard: HTMLElement, fileName: RegExp) {
    const row = within(priceBookCard).getByRole('row', { name: fileName });
    await user.click(within(row).getAllByRole('checkbox')[0]);
  }

  it('imports Yiyang warehouse-code tables without CBM prices or workbook notes', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, 'YY美西快线海卡渠道汇总', [
      ['下单渠道', '仓库代码', '义乌仓', '', '', '时效赔付'],
      ['', '', '12KG+', '51KG+', '1CBM+', ''],
      ['YY荣耀达海卡\nYY荣耀达海卡按方包税\n船司：CLX', 'ONT8、LAX9', 10.7, 9.7, 1940, '16天']
    ]);
    addRowsWorksheet(workbook, '产品附加', [['带磁加收费用']]);
    addRowsWorksheet(workbook, '特别说明', [['超长件单询']]);

    const fileData = await writeWorkbookBuffer(workbook);
    const rows = await parsePriceWorkbook(fileData, await loadExcel(), '6.30号亿阳.xls');

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.warehouseCode)).toEqual(['ONT8', 'LAX9', 'ONT8', 'LAX9']);
    expect(rows.map((row) => row.costPerKg)).toEqual([10.7, 10.7, 9.7, 9.7]);
    expect(rows.map((row) => `${row.minWeightKg}-${row.maxWeightKg}`)).toEqual([
      '12-50.999',
      '12-50.999',
      '51-99.999',
      '51-99.999'
    ]);
    expect(rows.some((row) => row.costPerKg === 1940)).toBe(false);
    expect(rows.every((row) => row.agentName === '亿阳国际')).toBe(true);
    expect(rows.every((row) => row.productSurchargeRemark === undefined && row.specialRemark === undefined)).toBe(true);
  });

  it('imports legacy BIFF XLS price books without zip parsing errors', async () => {
    const xlsx = await import('@e965/xlsx');
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['振韵国际', '欧洲空派快递派', '德国', 0, 100, 26.5, 'RMB']
    ]);
    xlsx.utils.book_append_sheet(workbook, worksheet, '欧洲空派快递派');
    const fileData = xlsx.write(workbook, { bookType: 'xls', type: 'array' }) as ArrayBuffer;

    const rows = await parsePriceWorkbook(fileData, await loadExcel(), '7.3振韵.xls');

    expect(rows).toEqual([
      expect.objectContaining({
        agentName: '振韵国际',
        channelName: '欧洲空派快递派',
        destinationCountry: '德国',
        costPerKg: 26.5
      })
    ]);
  });

  it('shows Liangzai-compatible module fields for business lookup only', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));

    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    expect(screen.queryByText('报价表管理')).not.toBeInTheDocument();
    expect(screen.queryByText('数据体检')).not.toBeInTheDocument();
    expect(screen.queryByText('代理加价规则')).not.toBeInTheDocument();
    expect(screen.getByLabelText('亚马逊仓库代码')).toHaveValue('FTW5');
    expect(screen.getByLabelText('重量段')).toBeInTheDocument();
    expect(screen.getByLabelText('代理')).toBeInTheDocument();
    expect(screen.getByLabelText('出货仓')).toBeInTheDocument();
    expect(screen.getByLabelText('国家/地区关键词')).toBeInTheDocument();
    expect(screen.getByLabelText('渠道关键词')).toBeInTheDocument();
    expect(screen.getByLabelText('源文件关键词')).toBeInTheDocument();
    expect(screen.getByLabelText(/只看可报价/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '欧洲海运超大件查询' }));
    expect(await screen.findByLabelText('品名')).toHaveValue('桌子，椅子');
    expect(screen.getByLabelText('目的国家')).toHaveValue('法国');
    expect(screen.getByLabelText('邮编')).toHaveValue('60750');
    expect(screen.getByLabelText('地址')).toHaveValue('France 549 rue du maubon Choisy au bac');
    expect(screen.getByLabelText('包装')).toBeInTheDocument();
    expect(screen.getByText('自动计费重')).toBeInTheDocument();
    expect(screen.getByText('835 KG')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '欧洲空海运铁路快递查询' }));
    expect(await screen.findByLabelText('目的国家')).toHaveValue('法国');
    expect(screen.getByLabelText('渠道')).toBeInTheDocument();
    expect(screen.getByLabelText('代理')).toBeInTheDocument();
    expect(screen.getByLabelText('计费重量 KG')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '南非专线查询' }));
    expect(await screen.findByLabelText('品名/明细关键词')).toHaveValue('衣服');
    expect(screen.getByLabelText('指定物料类别')).toBeInTheDocument();
    expect(screen.getByLabelText('方数')).toBeInTheDocument();
    expect(screen.getByLabelText('重量 KG')).toBeInTheDocument();
    expect(screen.getByLabelText('备注/申报信息')).toBeInTheDocument();

    cleanup();
    localStorage.clear();

    const admin = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await admin.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    expect(screen.queryByText('报价表管理')).not.toBeInTheDocument();
    expect(screen.queryByText('数据体检')).not.toBeInTheDocument();
    expect(screen.getAllByText('价格表管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理加价规则').length).toBeGreaterThan(0);

    cleanup();
    localStorage.clear();

    const market = userEvent.setup();
    await renderAndLogin('market', 'market123');
    await market.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    expect(screen.getAllByText('价格表管理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理加价规则').length).toBeGreaterThan(0);
  });

  it('shows imported price books as markup line groups and opens their detail rows', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));

    const topdaWorkbook = createWorkbook();
    addRowsWorksheet(topdaWorkbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['拓普达代理', '拓普达美线', '美国', 0, 1000, 18, 'RMB']
    ]);
    await user.upload(screen.getByLabelText('增加价格表'), new File(
      [await writeWorkbookBuffer(topdaWorkbook)],
      '7.6-拓普达.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ));
    expect(await screen.findByText(/已导入价格表 7\.6-拓普达\.xlsx/)).toBeInTheDocument();

    const zhenyunWorkbook = createWorkbook();
    addRowsWorksheet(zhenyunWorkbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['振韵代理', '欧洲空派快递派', '法国', 0, 1000, 26.5, 'RMB']
    ]);
    await user.upload(screen.getByLabelText('增加价格表'), new File(
      [await writeWorkbookBuffer(zhenyunWorkbook)],
      '7.3振韵.xls',
      { type: 'application/vnd.ms-excel' }
    ));
    expect(await screen.findByText(/已导入价格表 7\.3振韵\.xls/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = getMarkupRuleCard();
    expect(markupRuleCard).not.toBeNull();
    const topdaRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /7\.6-拓普达\.xlsx/ });
    expect(within(markupRuleCard as HTMLElement).getByRole('row', { name: /7\.3振韵\.xls/ })).toBeInTheDocument();

    await user.click(within(topdaRow).getByRole('button', { name: '查看线路' }));
    const detailDialog = await screen.findByRole('dialog', { name: '7.6-拓普达.xlsx 渠道线路详情' });
    expect(within(detailDialog).getByRole('row', { name: /拓普达代理.*拓普达美线.*美国/ })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('button', { name: '批量统一加价' })).toBeInTheDocument();
  });

  it.skip('imports agent price sheets and quotes with markup rules on the pricing page', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));

    expect((await screen.findAllByText('查价')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    expect(screen.getAllByText('a代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('默认加价').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^查价/ }));

    expect(screen.getByLabelText('亚马逊代码')).toHaveValue('AMZ-US-001');
    expect(screen.getByLabelText('品名')).toHaveValue('桌子，椅子');
    expect(screen.getByLabelText('邮编')).toHaveValue('60750');
    expect(screen.getByLabelText('地址')).toHaveValue('France 549 rue du maubon Choisy au bac');
    expect(screen.getByLabelText('包装')).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('代理')).not.toBeInTheDocument();
    expect(screen.getByText('自动计费重')).toBeInTheDocument();
    expect(screen.getByText('填写信息后查询报价')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制推荐报价' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '导出结果' })).toBeDisabled();

    await user.clear(screen.getByLabelText('方数'));
    await user.type(screen.getByLabelText('方数'), '5');
    expect(await screen.findByText('835 KG')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AMZ-US-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('桌子，椅子')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60750')).toBeInTheDocument();
    expect(screen.getAllByText('海运洛杉矶专线').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0-1000kg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('¥15447.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('¥18.5/kg').length).toBeGreaterThan(0);
    expect(screen.getByText('报价结果')).toBeInTheDocument();
    expect(screen.getByText('已按当前查价模块输出报价')).toBeInTheDocument();

    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '备注'],
      ['c代理', 'FedEx 促销', '美国', 0, 1000, 16, 'RMB', '导入原始备注：超长件需要单询']
    ]);
    addRowsWorksheet(workbook, '卡派价格汇总表', [
      ['对应渠道', '仓库编码', '12KG+', '51KG+', '100kg+', '按方包税（1CBM+）', '参考时效'],
      ['海运休斯顿专线', 'HOU8', 12, 11, 10, 1900, '25天']
    ]);
    addRowsWorksheet(workbook, '产品附加', [
      ['产品分类', '产品描述', '加收费用'],
      ['二类', '带磁，带小马达，不超过1KG', '加2元/KG'],
      ['三类', '纸箱超大，单边超1.5米', '附加费叠加']
    ]);
    addRowsWorksheet(workbook, '特别说明', [
      ['A.尺寸及偏远说明'],
      ['英国UPS尺寸：单件超过25KG必须贴 heavy box 重货标'],
      ['超大件：单箱不超过70KG，长+2宽+2高<300cm']
    ]);
    const fileData = await writeWorkbookBuffer(workbook);
    const file = new File([fileData], 'agent-price.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    expect(screen.queryByLabelText('导入价格表')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /价格表管理/ }));
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText(/已导入价格表 agent-price\.xlsx，新增 1 条代理成本价，亮崽模块：/)).toBeInTheDocument();
    expect(screen.getAllByText(/欧洲空海运铁路快递 1 条/).length).toBeGreaterThan(0);
    expect(screen.getByText('未填写')).toBeInTheDocument();
    expect(screen.queryByText('导入原始备注：超长件需要单询')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '修改备注' }));
    const priceBookRemarkDialog = await screen.findByRole('dialog', { name: '修改价格表备注' });
    await user.clear(within(priceBookRemarkDialog).getByLabelText('备注'));
    await user.type(within(priceBookRemarkDialog).getByLabelText('备注'), '亿阳国际渠道报价备注：实重 30-45KG 加 1元/KG，超长件单询');
    await user.click(within(priceBookRemarkDialog).getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('agent-price.xlsx 备注已更新')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = getMarkupRuleCard();
    expect(markupRuleCard).not.toBeNull();
    const importedRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /c代理.*1 条.*¥0\.50\/kg/ });
    await user.click(importedRuleRow);
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: /^修\s*改$/ }));
    const createMarkupDialog = await screen.findByRole('dialog', { name: '修改代理加价' });
    await user.clear(within(createMarkupDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(createMarkupDialog).getByLabelText('业务员加价 / kg'), '2');
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('c代理 加价规则已更新：+¥2.00/kg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^查价/ }));
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText('¥15030.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('有备注').length).toBeGreaterThan(0);
    const detailButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.replace(/\s/g, '') === '查看');
    expect(detailButton).toBeTruthy();
    await user.click(detailButton as HTMLElement);
    const detailDialog = await screen.findByRole('dialog', { name: '亮崽兼容报价详情' });
    expect(within(detailDialog).getByText('完整备注')).toBeInTheDocument();
    expect(within(detailDialog).getByText(/亿阳国际渠道报价备注/)).toBeInTheDocument();
    expect(within(detailDialog).getByText('产品附加')).toBeInTheDocument();
    expect(within(detailDialog).getByText(/纸箱超大/)).toBeInTheDocument();
    expect(within(detailDialog).getByText('特别说明/尺寸要求')).toBeInTheDocument();
    expect(within(detailDialog).getByText(/heavy box/)).toBeInTheDocument();
    expect(within(detailDialog).getByText('成本单价')).toBeInTheDocument();
    expect(within(detailDialog).getByText('毛利')).toBeInTheDocument();
    await user.click(within(detailDialog).getByRole('button', { name: /关\s*闭/ }));

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const currentMarkupRuleCard = getMarkupRuleCard();
    expect(currentMarkupRuleCard).not.toBeNull();
    const cRuleRow = within(currentMarkupRuleCard as HTMLElement).getByRole('row', { name: /c代理.*¥2\.00\/kg/ });
    await user.click(cRuleRow);
    await user.click(within(currentMarkupRuleCard as HTMLElement).getByRole('button', { name: /^修\s*改$/ }));
    const editMarkupDialog = await screen.findByRole('dialog', { name: '修改代理加价' });
    await user.clear(within(editMarkupDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(editMarkupDialog).getByLabelText('业务员加价 / kg'), '1');
    await user.click(screen.getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('c代理 加价规则已更新：+¥1.00/kg')).toBeInTheDocument();

    expect(within(currentMarkupRuleCard as HTMLElement).getByRole('row', { name: /c代理.*¥1\.00\/kg/ })).toBeInTheDocument();
  }, 10000);


  it.skip('persists imported price books through the backend and deletes their imported rows', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect((await screen.findAllByText('查价')).length).toBeGreaterThan(0);

    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '参考时效'],
      ['persist代理', '持久测试渠道', '美国', 0, 10, 17, 'RMB', '3天']
    ]);
    const fileData = await writeWorkbookBuffer(workbook);
    const file = new File([fileData], 'persist-price.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    await user.click(screen.getByRole('button', { name: /价格表管理/ }));
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText(/已导入价格表 persist-price\.xlsx，新增 1 条代理成本价，亮崽模块：/)).toBeInTheDocument();
    expect(screen.getByText('persist-price.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();

    cleanup();
    localStorage.removeItem('siyuan-session');
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));
    expect(await screen.findByText('persist-price.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();

    await selectPriceBookRow(user, getPriceBookCard() as HTMLElement, /persist-price\.xlsx/);
    await user.click(screen.getByRole('button', { name: '删除价格表' }));
    expect(await screen.findByText('确认删除该价格表？')).toBeInTheDocument();
    const confirmDeletePriceBookButtons = screen.getAllByRole('button', { name: '删除价格表' });
    await user.click(confirmDeletePriceBookButtons[confirmDeletePriceBookButtons.length - 1]);

    expect(await screen.findByText('已删除价格表 persist-price.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('persist-price.xlsx')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    expect(await screen.findByRole('row', { name: /persist代理.*1 条.*¥0\.50\/kg/ })).toBeInTheDocument();
  });

  it.skip('selects multiple price books and deletes them in batch', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));

    for (const [fileName, agentName] of [['batch-price-a.xlsx', '批量代理A'], ['batch-price-b.xlsx', '批量代理B']] as const) {
      const workbook = createWorkbook();
      addRowsWorksheet(workbook, '价格表', [
        ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
        [agentName, `${agentName}渠道`, '美国', 0, 10, 17, 'RMB']
      ]);
      const fileData = await writeWorkbookBuffer(workbook);
      await user.upload(screen.getByLabelText('增加价格表'), new File([fileData], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }));
      expect(await screen.findByText(new RegExp(`已导入价格表 ${fileName}`))).toBeInTheDocument();
    }

    const priceBookCard = getPriceBookCard() as HTMLElement;
    await selectPriceBookRow(user, priceBookCard, /batch-price-a\.xlsx/);
    await user.click(within(priceBookCard).getByRole('button', { name: '删除价格表' }));
    expect(await screen.findByText('确认删除 2 张价格表？')).toBeInTheDocument();
    const confirmButtons = screen.getAllByRole('button', { name: '删除价格表' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(await screen.findByText('已删除 2 张价格表')).toBeInTheDocument();
    expect(screen.queryByText('batch-price-a.xlsx')).not.toBeInTheDocument();
    expect(screen.queryByText('batch-price-b.xlsx')).not.toBeInTheDocument();
  });

  it.skip('selects all markup rules and deletes them in batch', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = getMarkupRuleCard();
    expect(markupRuleCard).not.toBeNull();

    await user.click(within(markupRuleCard as HTMLElement).getAllByRole('checkbox')[0]);
    const deleteButton = within(markupRuleCard as HTMLElement)
      .getAllByRole('button', { name: /^删\s*除$/ })
      .find((button) => !button.closest('td'));
    expect(deleteButton).toBeTruthy();
    await user.click(deleteButton as HTMLElement);
    expect(await screen.findByText('确认删除 2 条加价规则？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('已删除 2 条加价规则')).toBeInTheDocument();
    expect(within(markupRuleCard as HTMLElement).queryByRole('row', { name: /a代理/ })).not.toBeInTheDocument();
    expect(within(markupRuleCard as HTMLElement).queryByRole('row', { name: /b代理/ })).not.toBeInTheDocument();
  });

  it.skip('uses the uploaded horizontal price file name as the agent when the sheet has no agent header', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));

    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '英国海运', [
      ['渠道', '11KG+', '21KG+'],
      ['UPS英国海运双清', 10, 9]
    ]);
    const fileData = await writeWorkbookBuffer(workbook);
    const file = new File([fileData], '驰汉导入.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText(/已导入价格表 驰汉导入\.xlsx，新增 2 条代理成本价，亮崽模块：/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    expect(screen.getByRole('row', { name: /驰汉.*1 条.*¥0\.50\/kg/ })).toBeInTheDocument();
  });


  it('shows matched pricing channel by role without asking users to choose it', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'AMZ-US-001');
    await user.type(screen.getByLabelText('国家/地区关键词'), '美国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/pricing/legacy/amazon/quote'), expect.anything());
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/pricing/lookup'), expect.anything());
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/pricing/books'), expect.anything());
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.getByText('已按当前查价模块输出报价')).toBeInTheDocument();
    expect(screen.queryByText(/代理加价/)).not.toBeInTheDocument();
    expect(screen.queryByText('代理加价规则')).not.toBeInTheDocument();
    expect(screen.queryByText('业务员加价')).not.toBeInTheDocument();
    expect(screen.queryByText('毛利')).not.toBeInTheDocument();
    expect(screen.queryByText('代理成本单价')).not.toBeInTheDocument();
    expect(screen.queryByText('成本合计')).not.toBeInTheDocument();
    expect(screen.getAllByText('DHK').length).toBeGreaterThan(0);
    expect(screen.queryByText('a代理')).not.toBeInTheDocument();
    expect(screen.queryByText('海运洛杉矶专线')).not.toBeInTheDocument();
    expect(screen.getAllByText(/¥[\d,.]+/).length).toBeGreaterThan(0);

    cleanup();
    localStorage.clear();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    expect(screen.queryByLabelText('渠道')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'AMZ-US-001');
    await user.type(screen.getByLabelText('国家/地区关键词'), '美国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.getAllByText('a代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/毛利/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/成本/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/¥[\d,.]+/).length).toBeGreaterThan(0);
  });


  it('keeps pricing results focused by hiding agent error and unmapped route alert blocks', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'AMZ-US-001');
    await user.type(screen.getByLabelText('国家/地区关键词'), '美国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.queryByText('代理异常')).not.toBeInTheDocument();
    expect(screen.queryByText('BSD (0) Token不正确')).not.toBeInTheDocument();
    expect(screen.getByText('已按当前查价模块输出报价')).toBeInTheDocument();
    expect(screen.queryByText('该报价渠道尚未绑定内部承运路线，请维护渠道映射后再用于正式下单。')).not.toBeInTheDocument();
    expect(screen.getAllByText(/a代理/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/¥[\d,.]+/).length).toBeGreaterThan(0);
  });


  it.skip('keeps agent markup rules and price book management admin-only on pricing page', async () => {
    const nonAdminAccounts = [
      { username: 'service', password: 'service123' },
      { username: 'operator', password: 'operator123' },
      { username: 'finance', password: 'finance123' }
    ];

    for (const account of nonAdminAccounts) {
      const user = userEvent.setup();
      await renderAndLogin(account.username, account.password);
      await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
      expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
      expect(screen.queryByText('代理加价规则')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^增\s*加$/ })).not.toBeInTheDocument();
      expect(screen.queryByText('价格表管理')).not.toBeInTheDocument();
      expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();
      cleanup();
      localStorage.clear();
    }

    const admin = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await admin.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    expect(screen.getAllByText('代理加价规则').length).toBeGreaterThan(0);
    await admin.click(screen.getByRole('button', { name: /代理加价规则/ }));
    expect(screen.getByRole('button', { name: /^增\s*加$/ })).toBeInTheDocument();
    await admin.click(screen.getByRole('button', { name: /价格表管理/ }));
    expect(screen.getAllByText('价格表管理').length).toBeGreaterThan(0);
    expect(screen.queryByText('代理成本价台账')).not.toBeInTheDocument();
  });


  it.skip('opens markup channel details for a selected line-specific rule', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = getMarkupRuleCard();
    expect(markupRuleCard).not.toBeNull();
    const aRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /a代理.*1 条.*¥0\.50\/kg/ });
    await user.click(aRuleRow);
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: /^增\s*加$/ }));
    const createDialog = await screen.findByRole('dialog', { name: '新增代理加价' });
    await user.type(within(createDialog).getByLabelText('代理'), 'a代理');
    await user.type(within(createDialog).getByLabelText('渠道（可选）'), '海运洛杉矶专线');
    await user.type(within(createDialog).getByLabelText('线路自定义（可选）'), 'DHK03');
    await user.type(within(createDialog).getByLabelText('国家（可选）'), '美国');
    await user.clear(within(createDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(createDialog).getByLabelText('业务员加价 / kg'), '2.5');
    await user.click(within(createDialog).getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('a代理 加价规则已新增：+¥2.50/kg')).toBeInTheDocument();

    const aggregateRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /a代理.*2 条.*¥0\.50\/kg/ });
    await user.click(aggregateRuleRow);
    await user.click(within(aggregateRuleRow).getByRole('button', { name: '查看线路' }));

    const detailDialog = await screen.findByRole('dialog', { name: 'a代理 渠道线路详情' });
    expect(within(detailDialog).getByLabelText('按小表筛选线路')).toBeInTheDocument();
    expect(within(detailDialog).getByLabelText('批量业务员加价 / kg')).toBeInTheDocument();
    expect(within(detailDialog).getByRole('button', { name: '批量统一加价' })).toBeInTheDocument();
    expect(within(detailDialog).getAllByText((_, element) => element?.textContent?.includes('+¥2.50/kg') ?? false).length).toBeGreaterThan(0);
    expect(within(detailDialog).getByRole('row', { name: /DHK03.*美国.*0-1000kg.*修改加价/ })).toBeInTheDocument();
  });


  it.skip('shows base markup detail examples for an agent rule', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = getMarkupRuleCard();
    expect(markupRuleCard).not.toBeNull();
    const aRuleRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /a代理.*1 条.*¥0\.50\/kg/ });
    await user.click(aRuleRow);
    await user.click(within(aRuleRow).getByRole('button', { name: '查看线路' }));

    const detailDialog = await screen.findByRole('dialog', { name: 'a代理 渠道线路详情' });
    expect(within(detailDialog).getAllByText((_, element) => element?.textContent?.includes('+¥0.50/kg') ?? false).length).toBeGreaterThan(0);
    expect(within(detailDialog).getByLabelText('按小表筛选线路')).toBeInTheDocument();
    expect(within(detailDialog).getByRole('button', { name: '批量统一加价' })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHK03.*美国.*0-1000kg/ })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHK01.*美国.*0-1000kg/ })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHL-A.*美国.*0-1000kg/ })).toBeInTheDocument();
  });

});
