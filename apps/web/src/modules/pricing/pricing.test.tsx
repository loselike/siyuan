import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePriceWorkbook } from './excel';
import { buildPriceBookImportAgentOptions, filterPriceBookImportAgentOption, getMarkupRowLookupChannel, getMarkupRowLookupDestination, inferSouthAfricaMaterialCategory, priceBookImportModules } from './PricingPage';
import { addRowsWorksheet, createWorkbook, loadExcel, writeWorkbookBuffer } from '../shared/excel';
import { cleanup, renderAndLogin } from '../testSupport/appTestHarness';

describe('Pricing flows', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('uses the same parsed route and destination in markup details as pricing lookup', () => {
    const legacyRow = {
      sourceSheetName: '德国海运直送和卡派',
      channelName: '德国海运直送和卡派 - 德国海运卡派包税',
      businessRouteName: '德国海运卡派包税',
      realChannelName: '系统下单渠道 德国海运亚马逊卡派包税 德国海运亚马逊卡派不包税 备注 时效',
      destinationCountry: 'A:头程进我司暂存'
    };
    expect(getMarkupRowLookupChannel(legacyRow)).toBe('德国海运直送和卡派 - 德国海运卡派包税');
    expect(getMarkupRowLookupDestination(legacyRow)).toBe('德国');
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

  async function selectImportModule(user: ReturnType<typeof userEvent.setup>, moduleLabel: string) {
    const selector = screen.getByText('选择查价模块').closest('.ant-select-selector') as HTMLElement;
    fireEvent.mouseDown(selector);
    await user.click(await screen.findByRole('option', { name: moduleLabel }));
  }

  async function selectImportAgent(user: ReturnType<typeof userEvent.setup>, agentName: string) {
    const selector = screen.getByText('选择代理简称').closest('.ant-select-selector') as HTMLElement;
    fireEvent.mouseDown(selector);
    await user.click(await screen.findByRole('option', { name: agentName }));
  }

  it('imports Yiyang warehouse-code tables with 51KG and CBM prices', async () => {
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

    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.warehouseCode)).toEqual(['ONT8', 'LAX9', 'ONT8', 'LAX9', 'ONT8', 'LAX9']);
    expect(rows.every((row) => row.sourceSheetName === '义乌仓')).toBe(true);
    expect(rows.map((row) => row.costPerKg)).toEqual([10.7, 10.7, 9.7, 9.7, 1940, 1940]);
    expect(rows.map((row) => `${row.minWeightKg}-${row.maxWeightKg}`)).toEqual([
      '12-50.999',
      '12-50.999',
      '51-99999',
      '51-99999',
      '0-99999',
      '0-99999'
    ]);
    expect(rows.filter((row) => row.cbmPrice === 1940).map((row) => row.priceTierLabel)).toEqual(['按方未标注', '按方未标注']);
    expect(rows.every((row) => row.agentName === '亿阳国际')).toBe(true);
    expect(rows.every((row) => row.productSurchargeRemark?.includes('带磁加收费用'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('超长件单询'))).toBe(true);
  });

  it('保留美国派格原始50KG档位并解析双层空海运表头', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '海运快递派', [
      ['渠道名称', '分区', '华南（深圳/广州/东莞/中山）', '', '', '', '其它条款'],
      ['', '', '12KG+', '45KG+', '71KG+', '101KG+', ''],
      ['美森限时达 UPS/FedEx派送', '美西-邮编8-9', 18.2, 16.7, 15.7, 14.2, '纸箱包装，超长件单询'],
      ['美中-邮编4.5.6.7开头', '美中-邮编5-7', 19.5, 18, 17, 15.5, '']
    ]);
    addRowsWorksheet(workbook, 'FBA卡派汇总', [
      ['对应渠道', '仓库编码', '50KG+', '参考时效'],
      ['ORD-FBA', 'MDW2', 23, '44-46天左右'],
      ['萨凡纳-FBA', 'IUSR', 23, '42-45天左右']
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '7-9派格.xls');
    const seaRows = rows.filter((row) => row.channelName.includes('美森限时达'));
    const fbaRow = rows.find((row) => row.warehouseCode === 'MDW2');

    expect(seaRows).toHaveLength(8);
    expect(seaRows.map((row) => row.priceTierLabel)).toEqual([
      '12KG+', '45KG+', '71KG+', '101KG+',
      '12KG+', '45KG+', '71KG+', '101KG+'
    ]);
    expect(seaRows.slice(0, 4).map((row) => `${row.minWeightKg}-${row.maxWeightKg}`)).toEqual([
      '12-44.999', '45-70.999', '71-100.999', '101-99999'
    ]);
    expect(seaRows.every((row) => row.destinationCountry === '美国' && row.sourceSheetName === '华南')).toBe(true);
    expect(seaRows.slice(0, 4).every((row) => row.postalRule === '美西-邮编8-9')).toBe(true);
    expect(fbaRow).toEqual(expect.objectContaining({
      priceTierLabel: '50KG+',
      minWeightKg: 50,
      maxWeightKg: 99999,
      costPerKg: 23
    }));
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ warehouseCode: 'IUSR', priceTierLabel: '50KG+', minWeightKg: 50 })
    ]));
  });

  it('识别美国价格表的渠道和邮编段别名', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '美国快递派', [
      ['渠道', '邮编段', '12KG+', '51KG+'],
      ['美国快递派送', '4、5、6、7邮编', 22, 20]
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '美国快递派.xlsx');

    expect(rows).toEqual([
      expect.objectContaining({
        channelName: '美国快递派送',
        postalRule: '4、5、6、7邮编',
        priceTierLabel: '12KG+',
        costPerKg: 22
      }),
      expect.objectContaining({
        channelName: '美国快递派送',
        postalRule: '4、5、6、7邮编',
        priceTierLabel: '51KG+',
        costPerKg: 20
      })
    ]);
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

  it('价格表管理默认进入亚马逊分区，导入前只需选择代理简称', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));

    expect(await screen.findByRole('status', { name: '当前模块规则同步进度' })).toHaveTextContent('规则同步');
    expect(screen.getByText('已是最新规则')).toBeInTheDocument();

    const importButton = screen.getByRole('button', { name: '增加价格表' });
    expect(importButton).toBeDisabled();
    expect(importButton).toHaveAttribute('title', '请先选择代理简称');
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['未选模块代理', '未选模块渠道', '美国', 0, 100, 10, 'RMB']
    ]);
    expect(screen.getByText('选择代理简称')).toBeInTheDocument();
    const moduleTabs = screen.getByRole('tablist', { name: '价格表查价模块分区' });
    expect(within(moduleTabs).getByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    expect(moduleTabs).toHaveTextContent('欧洲海运超大件查询');
    expect(moduleTabs).toHaveTextContent('迪拜空海运查询');
    await user.upload(screen.getByLabelText('增加价格表'), new File(
      [await writeWorkbookBuffer(workbook)],
      '未选代理价格表.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ));

    expect(await screen.findByText('请先选择代理简称')).toBeInTheDocument();
  });

  it('价格表管理下载选中的原始价格表', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));
    await selectImportAgent(user, 'a代理');
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['a代理', '下载测试渠道', '美国', 0, 100, 10, 'RMB']
    ]);
    await user.upload(screen.getByLabelText('增加价格表'), new File(
      [await writeWorkbookBuffer(workbook)],
      '下载测试价格表.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ));
    expect(await screen.findByText(/已导入价格表 下载测试价格表\.xlsx/)).toBeInTheDocument();

    const priceBookCard = getPriceBookCard() as HTMLElement;
    const downloadButton = within(priceBookCard).getByRole('button', { name: '下载价格表' });
    expect(downloadButton).toBeDisabled();
    await selectPriceBookRow(user, priceBookCard, /下载测试价格表\.xlsx/);
    await user.click(downloadButton);
    expect(await screen.findByText('已下载价格表 下载测试价格表.xlsx')).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('价格表导入代理简称下拉只使用启用代理并支持简称和公司名模糊搜索', () => {
    const options = buildPriceBookImportAgentOptions([
      { id: 'agent-zhenyun', code: 'ZY', shortName: '振韵', name: '深圳振韵国际', createdAt: '2026-07-09T00:00:00.000Z', enabled: true },
      { id: 'agent-disabled', code: 'TY', shortName: '停用代理', name: '停用代理详细公司', createdAt: '2026-07-09T00:00:00.000Z', enabled: false }
    ]);

    expect(options).toHaveLength(1);
    expect(options[0]).toEqual(expect.objectContaining({ value: 'agent-zhenyun', label: '振韵', shortName: '振韵' }));
    expect(filterPriceBookImportAgentOption('振韵', options[0])).toBe(true);
    expect(filterPriceBookImportAgentOption('深圳振韵国际', options[0])).toBe(true);
    expect(filterPriceBookImportAgentOption('不存在', options[0])).toBe(false);
    expect(priceBookImportModules.map((item) => item.key)).toEqual([
      'amazon',
      'inquiry',
      'europeExpress',
      'southAfrica',
      'usaAirSea',
      'canadaAirSea',
      'dubaiAirSea'
    ]);
    expect(priceBookImportModules.map((item) => item.label)).toEqual(expect.arrayContaining(['美国空海运查询', '加拿大空海查询', '迪拜空海运查询']));
  });

  it('迪拜空海运价格表按价格块继承渠道代码并保留展示字段', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '阿联酋空派', [
      ['产品类别', '区域', '', '', '进仓地', '参考时效（工作日）', '备注', '注意事项', '渠道代码'],
      ['', '', '16-99KG', '100-499KG', '', '', '', '', ''],
      ['内电普货', 'A区', 18, 16, '义乌仓', '5-7天', '空运备注', '不接危险品', 'AE空运-P AE空运-P-电商'],
      ['', 'B区', 19, 17, '义乌仓', '', '', '', '']
    ]);
    addRowsWorksheet(workbook, '阿联酋海派', [
      ['服务内容', '0.5-5CBM 价格RMB/方', '5CBM以上 价格RMB/方', '入仓要求', '时效（自然日）', '备注', '渠道代码'],
      ['普货类', 1800, 1700, '深圳仓', '25-30天', '海运备注', 'AH海运-P AH海运-P-电商']
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '迪拜专线测试.xlsx');
    const airRows = rows.filter((row) => row.sourceSheetName === '阿联酋空派');
    const seaRows = rows.filter((row) => row.sourceSheetName === '阿联酋海派');

    expect(airRows).toHaveLength(4);
    expect(airRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ productCategory: '内电普货', region: 'A区', inboundRequirement: '义乌仓', channelCode: 'AE空运-P AE空运-P-电商' }),
      expect.objectContaining({ productCategory: '内电普货', region: 'B区', channelCode: 'AE空运-P AE空运-P-电商' })
    ]));
    expect(seaRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ serviceContent: '普货类', inboundRequirement: '深圳仓', channelCode: 'AH海运-P AH海运-P-电商', cbmPrice: 1800 })
    ]));
  });

  it('迪拜空海运模块直接展示已发布原表图片且不提供查价表单', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    const requestedUrls: string[] = [];

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/pricing/legacy/dubai-air-sea/display')) {
        requestedUrls.push(url);
        return Promise.resolve(new Response(JSON.stringify({
          airPages: [{
            id: 'dubai-air-page',
            mode: 'AIR',
            sheetName: '阿联酋空运价格表',
            pageNo: 1,
            url: '/api/uploads/pricing-dubai/version-1/air-001.png'
          }, {
            id: 'dubai-air-page-2',
            mode: 'AIR',
            sheetName: '阿联酋空运价格表',
            pageNo: 2,
            url: '/api/uploads/pricing-dubai/version-1/air-002.png'
          }],
          seaPages: [{
            id: 'dubai-sea-page',
            mode: 'SEA',
            sheetName: '阿联酋海运价格表',
            pageNo: 1,
            url: '/api/uploads/pricing-dubai/version-1/sea-001.png'
          }],
          updatedAt: '2026-07-13T00:00:00.000Z'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));

    expect(await screen.findByRole('button', { name: '美国空海运查询' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '加拿大空海查询' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '美国空海运查询' }));
    expect(await screen.findByLabelText('美国邮编')).toBeInTheDocument();
    const fixedUsDestination = screen.getAllByDisplayValue('美国').find((element) => element.hasAttribute('disabled'));
    expect(fixedUsDestination).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '加拿大空海查询' }));
    expect(await screen.findByLabelText('收货地址类型')).toHaveValue('PRIVATE');
    expect(screen.queryByLabelText('亚马逊仓库前三位')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('收货地址类型'));
    await user.click(await screen.findByRole('option', { name: '亚马逊仓' }));
    expect(await screen.findByLabelText('亚马逊仓库前三位')).toBeInTheDocument();
    await user.type(screen.getByLabelText('亚马逊仓库前三位'), 'yvr');
    expect(screen.getByLabelText('亚马逊仓库前三位')).toHaveValue('YVR');
    await user.click(screen.getByRole('button', { name: '迪拜空海运查询' }));
    expect(await screen.findByText('迪拜空运价格表')).toBeInTheDocument();
    expect(screen.getByText('迪拜海运价格表')).toBeInTheDocument();
    expect(await screen.findByAltText('迪拜空运价格表第 1 页')).toBeInTheDocument();
    expect(screen.getByAltText('迪拜海运价格表第 1 页')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(await screen.findByAltText('迪拜空运价格表第 2 页')).toBeInTheDocument();
    expect(screen.queryByAltText('迪拜空运价格表第 1 页')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('目的国家/地区')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('渠道关键词')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查价查询' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查询报价' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清空' })).not.toBeInTheDocument();
    expect(screen.queryByText(/成本|毛利|源 sheet|源行号|价格表名称|sourceFile/i)).not.toBeInTheDocument();
    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain('/api/pricing/legacy/dubai-air-sea/display');

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('南非专线按品名关键词自动识别物料类别', () => {
    const rules = [
      { id: 'sa-cosmetic', category: '化妆品类', name: '化妆品类', keywords: ['化妆品', '洗面奶', '面膜'], ratePerCbm: 3500, consult: false, enabled: true, createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-09T00:00:00.000Z' },
      { id: 'sa-phone', category: '3C配件类', name: '手机配件', keywords: ['手机', '手机壳'], ratePerCbm: 2600, consult: false, enabled: true, createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-09T00:00:00.000Z' },
      { id: 'sa-disabled', category: '停用类', name: '停用面膜', keywords: ['面膜'], ratePerCbm: 999, consult: false, enabled: false, createdAt: '2026-07-09T00:00:00.000Z', updatedAt: '2026-07-09T00:00:00.000Z' }
    ];

    expect(inferSouthAfricaMaterialCategory('面膜', rules)).toBe('化妆品类');
    expect(inferSouthAfricaMaterialCategory('补水面膜套装', rules)).toBe('化妆品类');
    expect(inferSouthAfricaMaterialCategory('儿童手机壳', rules)).toBe('3C配件类');
    expect(inferSouthAfricaMaterialCategory('无法识别新品', rules)).toBeUndefined();
  });

  it('振韵多工作表渠道要求按工作表绑定且不串到其他渠道', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '深圳振韵欧洲快递', [
      ['UPS红单渠道'],
      ['国家/重量区间', '0-10KG', '10KG+', '渠道要求', '时效'],
      ['德国', 26, 25, 'UPS超标准附加费按实收取', '参考时效起飞6-8天提取 （海关查验及亚马逊排仓除外） 非亚马逊地址+1元/kg'],
      ['法国', 27, 26, '托盘数计算方法：计费方数除以1.5等于托盘数', ''],
      ['备注', '带磁产品需磁检，报关冲货罚款客户承担'],
      ['DHL经济渠道'],
      ['国家/重量区间', '0-10KG', '10KG+', '备注'],
      ['德国', 22, 21, '整车可装24-26个托盘，托盘费12磅/托'],
      ['备注', '拒收件需提前确认'],
      ['渠道说明'],
      ['不含税查验费：装卸费1000欧，分拣费260欧，其他费用实报实销'],
      ['此渠道单件最低计费重不低于13KG，低于13kg按13kg收费'],
      ['做关税递延，关税递延按申报5%预收，税单出来之后多退少补'],
      ['4）自行车、平衡车、床垫螺丝、螺母、轮胎等反倾销品类不接'],
      ['特别提示：关于收件人接收超大件和托盘货，国外司机不负责卸货，收件人需自行具备卸货能力'],
      ['受战争影响，燃油价格快速上涨，派送费需额外收燃油附加13%']
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '7.3振韵.xls');
    const upsRows = rows.filter((row) => row.channelName.includes('UPS红单渠道'));
    const dhlRows = rows.filter((row) => row.channelName.includes('DHL经济渠道'));

    expect(upsRows.length).toBeGreaterThan(0);
    expect(dhlRows.length).toBeGreaterThan(0);
    expect(upsRows.every((row) => row.agentName === '深圳振韵国际')).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('UPS超标准附加费'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('托盘数计算方法'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('磁检'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('不含税查验费'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('单件最低计费重'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('关税递延'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('反倾销品类不接'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('收件人接收超大件'))).toBe(true);
    expect(upsRows.every((row) => row.specialRemark?.includes('燃油附加13%'))).toBe(true);
    expect(upsRows.every((row) => row.transitLabel === '参考时效起飞6-8天提取 （海关查验及亚马逊排仓除外） 非亚马逊地址+1元/kg')).toBe(true);
    expect(upsRows.every((row) => row.transitDays === 6)).toBe(true);
    expect(upsRows.every((row) => !row.specialRemark?.includes('拒收件'))).toBe(true);
    expect(upsRows.every((row) => !row.specialRemark?.includes('整车可装'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('整车可装'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('拒收件'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('不含税查验费'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('单件最低计费重'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('关税递延'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('反倾销品类不接'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('收件人接收超大件'))).toBe(true);
    expect(dhlRows.every((row) => row.specialRemark?.includes('燃油附加13%'))).toBe(true);
    expect(dhlRows.every((row) => !row.specialRemark?.includes('磁检'))).toBe(true);
  });

  it('振韵欧洲海运超大件把连续总备注绑定到整张 sheet 并回填时效', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '欧洲海运普货超大件专线', [
      ['深圳振韵国际货运代理有限公司'],
      ['系统下单渠道', '欧洲海运普货超大件', '备注'],
      ['国家', '分区', '邮编（偏远和岛屿不走）', '30KG+', '50KG+', '100KG+', '备注'],
      ['法国', 'A', '60750', 16.6, 14.3, 11.7, '开船30-40天提取 （不包含塞港，海关查验）'],
      ['德国', 'B', 'DTM1', 17.2, 15.2, 12.8, ''],
      ['欧洲海运电池超大件'],
      ['国家', '分区', '邮编（偏远和岛屿不走）', '30KG+', '50KG+', '100KG+'],
      ['法国', 'A', '60750', 18.6, 16.3, 13.7],
      ['德国', 'B', 'DTM1', 19.2, 17.2, 14.8],
      ['操作明细收费'],
      ['1、单边超长费：以A区为标准，超2.4米+300元/件；超3.5米+600元/件'],
      ['2、每票品名免费五个，超过部分按30元/个收费，签收单收50元/票'],
      ['渠道货物限制：'],
      ['A:此渠道不收亚马逊件，只接受单票全木箱或单票全纸箱货物'],
      ['B:整票实重计费超过2500KG或材积计费超过1250kg会分票打单'],
      ['卸货能力要求：'],
      ['A:等候费：卸货免费30分钟，超过按照59.5欧/小时计算'],
      ['B:额外费用：尾板卸货、尺寸和重量在尾板承载范围内实报实销'],
      ['特别提示：如客户一旦同意接收我公司服务，我司默认客户已详细阅读过此价格表备注内容，并接受各条款的约束。'],
      ['受战争影响，燃油价格快速上涨，派送费即报价表里托盘价需额外收燃油附加13%']
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '7.3振韵.xls');
    const generalRows = rows.filter((row) => row.channelName.includes('欧洲海运普货超大件'));
    const batteryRows = rows.filter((row) => row.channelName.includes('欧洲海运电池超大件'));

    expect(generalRows.length).toBeGreaterThan(0);
    expect(batteryRows.length).toBeGreaterThan(0);
    expect(generalRows.every((row) => row.transitLabel === '开船30-40天提取 （不包含塞港，海关查验）')).toBe(true);
    expect(generalRows.every((row) => row.transitDays === 30)).toBe(true);
    expect(generalRows.every((row) => row.specialRemark?.includes('开船30-40天提取 （不包含塞港，海关查验）'))).toBe(true);
    expect(generalRows.every((row) => row.specialRemark?.includes('操作明细收费'))).toBe(true);
    expect(generalRows.every((row) => row.specialRemark?.includes('渠道货物限制'))).toBe(true);
    expect(generalRows.every((row) => row.specialRemark?.includes('卸货能力要求'))).toBe(true);
    expect(generalRows.every((row) => row.specialRemark?.includes('签收单收50元/票'))).toBe(true);
    expect(generalRows.every((row) => row.specialRemark?.includes('额外费用：尾板卸货'))).toBe(true);
    expect(generalRows.every((row) => row.specialRemark?.includes('燃油附加13%'))).toBe(true);
    expect(batteryRows.every((row) => !row.specialRemark?.includes('开船30-40天提取'))).toBe(true);
    expect(batteryRows.every((row) => row.specialRemark?.includes('操作明细收费'))).toBe(true);
    expect(batteryRows.every((row) => row.specialRemark?.includes('渠道货物限制'))).toBe(true);
    expect(batteryRows.every((row) => row.specialRemark?.includes('卸货能力要求'))).toBe(true);
    expect(batteryRows.every((row) => row.transitLabel)).toBe(false);
  });

  it('拓普达国家分区小表继承完整时效并过滤赔偿说明', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, 'TPD-加拿大直航快线', [
      ['TPD-加拿大海卡快线（ERS快提）'],
      ['国家分区', '仓库分区', '21KG+', '100KG+', '船期', '参考时效'],
      ['加拿大东部', '多伦多', 9.25, 8.25, '多伦多清关', '开船后35-40自然日派送'],
      ['加拿大东部', '渥太华', 9.65, 8.65, '多伦多清关', ''],
      ['私人地址（偏远另计）', '', 0, 0, '', '私人地址派送时效加5-10天'],
      ['=DISPIMG("ID_12345",1)'],
      ['渠道说明：义乌交货+0.5/KG！卡派单件最低计费5KG，不足5KG按5KG计费！'],
      ['1，可收超大件，超长超重单询，FBA地址卡派加收20USD/托'],
      ['常见产品加收:'],
      ['1）纺织品、鞋子、皮革制品、箱包、纯金属制产品等产品+2/KG'],
      ['加拿大的UPS偏远分区 分四个区间'],
      ['运输地区附加费：10RMB/票'],
      ['赔偿说明:'],
      ['1）丢件赔偿：最高补偿RMB20/KG退运费'],
      ['免责声明:'],
      ['1. 箱单发票申报务必准确，否则因申报不符导致扣货我司不负责'],
      ['特别声明：如客户一旦交付货物并接受我司服务，我司默认客户已阅读并接受各条款约束。']
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '7.6-拓普达.xlsx');

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.transitLabel === '开船后35-40自然日派送')).toBe(true);
    expect(rows.every((row) => row.transitDays === 35)).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('渠道说明：义乌交货+0.5/KG'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('常见产品加收'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('加拿大的UPS偏远分区'))).toBe(true);
    expect(rows.every((row) => !row.specialRemark?.includes('赔偿说明'))).toBe(true);
    expect(rows.every((row) => !row.specialRemark?.includes('丢件赔偿'))).toBe(true);
    expect(rows.every((row) => !row.specialRemark?.includes('最高补偿'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('免责声明'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('特别声明'))).toBe(true);
    expect(rows.every((row) => !row.specialRemark?.includes('DISPIMG'))).toBe(true);
  });

  it('渠道要求过滤按方包税和赔偿条款并保留真实限制说明', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '渠道要求过滤', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '备注'],
      [
        '规则过滤代理',
        '欧洲海运过滤渠道',
        '法国',
        100,
        99999,
        12,
        'RMB',
        [
          '1、按方包税计算方式：根据仓库实际体积计费，最低1CBM起运，1CBM=363KGS，重轻货报价按此执行',
          '2、单票货物超过5个品名需提前单询，提供资料后确认',
          '3、开船后第二天开始计算时效，超过承诺时效按每天赔偿，最高理赔100元，签收当天不计赔偿日',
          '4、清关查验费实报实销，尺寸超长和尾板卸货需提前单询'
        ].join('\n')
      ]
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '渠道要求过滤.xlsx');
    const remark = rows[0]?.specialRemark ?? '';

    expect(remark).not.toContain('按方包税计算方式');
    expect(remark).not.toContain('最低1CBM起运');
    expect(remark).not.toContain('1CBM=363KGS');
    expect(remark).not.toContain('超过承诺时效');
    expect(remark).not.toContain('最高理赔');
    expect(remark).toContain('单票货物超过5个品名需提前单询');
    expect(remark).toContain('清关查验费实报实销');
    expect(remark).toContain('尺寸超长和尾板卸货需提前单询');
  });

  it('欧洲空运横向小表从右侧说明提取真实时效且不把保留7日当时效', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '欧洲空运超大件', [
      ['欧洲空运超大件（大陆转飞）', '', '', '', '专业10年操作'],
      ['目的地', '30KG+', '50KG+', '100KG+', '专业10年操作'],
      [
        '法国、奥地利、丹麦',
        50.5,
        45.5,
        44.5,
        '参考时效12-15天提取（海关查验及亚马逊排仓除外），不包税暂停，单票单件不能低于30kg，两件及两件以上不接受纸箱包装'
      ],
      ['误判限制渠道'],
      ['目的地', '30KG+', '50KG+', '专业10年操作'],
      [
        '法国',
        60,
        55,
        '立陶宛如果实重超过25kg无法送货上门，需要提醒收件人到站点自提，如拒收，我们站点只保留7日，然后会退回寄件方，退回费用将正常收取'
      ]
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '7.3振韵.xls');
    const transitRows = rows.filter((row) => row.channelName.includes('欧洲空运超大件'));
    const falseTransitRows = rows.filter((row) => row.channelName.includes('误判限制渠道'));

    expect(transitRows.length).toBeGreaterThan(0);
    expect(transitRows.every((row) => row.transitLabel === '12-15天')).toBe(true);
    expect(transitRows.every((row) => row.transitDays === 12)).toBe(true);
    expect(transitRows.every((row) => row.specialRemark?.includes('不包税暂停'))).toBe(true);
    expect(transitRows.every((row) => row.specialRemark?.includes('不接受纸箱包装'))).toBe(true);
    expect(falseTransitRows.length).toBeGreaterThan(0);
    expect(falseTransitRows.every((row) => row.transitLabel)).toBe(false);
    expect(falseTransitRows.every((row) => row.transitDays)).toBe(false);
    expect(falseTransitRows.every((row) => row.specialRemark?.includes('只保留7日'))).toBe(true);
    expect(falseTransitRows.every((row) => row.specialRemark?.includes('无法送货上门'))).toBe(true);
  });

  it('通用价格表备注列和总备注合并为渠道要求', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '通用价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '仓库编码', '备注', '产品附加'],
      ['通用代理', '亚马逊带备注渠道', '美国', 50, 99999, 18, 'RMB', 'FTW5', '亚马逊小表备注：托盘费按实收取', '带磁产品需磁检'],
      ['通用代理', '欧洲海运超大件渠道', '法国', 100, 99999, 12, 'RMB', '', '海运小表备注：卸货费客户承担', ''],
      ['通用代理', '欧洲空运快递渠道', '法国', 21, 99999, 30, 'RMB', '', '空运小表备注：带电需确认', ''],
      ['特别提示：收件人需具备卸货能力'],
      ['受战争影响，燃油附加13%每周更新']
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '通用价格表.xlsx');

    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.channelName.includes('亚马逊'))?.productSurchargeRemark).toContain('磁检');
    expect(rows.find((row) => row.channelName.includes('亚马逊'))?.specialRemark).toContain('亚马逊小表备注');
    expect(rows.find((row) => row.channelName.includes('海运'))?.specialRemark).toContain('海运小表备注');
    expect(rows.find((row) => row.channelName.includes('空运'))?.specialRemark).toContain('空运小表备注');
    expect(rows.every((row) => row.specialRemark?.includes('收件人需具备卸货能力'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('燃油附加13%'))).toBe(true);
  });

  it('亚马逊仓库汇总价格表备注列和总备注合并为渠道要求', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '亚马逊仓库汇总', [
      ['对应渠道', '仓库编码', '12KG+', '51KG+', '备注'],
      ['TPD-Z4经济达', 'FTW5', 8.58, 8.2, '仓库汇总备注：托盘尺寸100cm*120cm'],
      ['特别提示：国外司机不负责卸货'],
      ['受战争影响，派送费需额外收燃油附加13%']
    ]);

    const rows = await parsePriceWorkbook(await writeWorkbookBuffer(workbook), await loadExcel(), '亚马逊汇总.xlsx');

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.specialRemark?.includes('仓库汇总备注'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('国外司机不负责卸货'))).toBe(true);
    expect(rows.every((row) => row.specialRemark?.includes('燃油附加13%'))).toBe(true);
  });

  it('imports 备注 and 时效 as separate fields from sheet-level transit notes', async () => {
    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '海运价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['时效代理', '美西海卡', '美国', 100, 99999, 18, 'RMB'],
      ['渠道说明', '航程时效28-33天']
    ]);
    addRowsWorksheet(workbook, '特别说明', [
      ['时效：28至33天'],
      ['超长件需提前确认']
    ]);
    const fileData = await writeWorkbookBuffer(workbook);

    const rows = await parsePriceWorkbook(fileData, await loadExcel(), '时效测试.xlsx');

    expect(rows).toEqual([
      expect.objectContaining({
        transitDays: 28,
            transitLabel: '航程时效28-33天',
            specialRemark: expect.stringContaining('超长件需提前确认')
      })
    ]);
    expect(rows[0].specialRemark).toContain('航程时效28-33天');

    const variantWorkbook = createWorkbook();
    addRowsWorksheet(variantWorkbook, '时效格式', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '参考时效'],
      ['时效代理', '单天渠道', '美国', 0, 10, 20, 'RMB', '时效：28天'],
      ['时效代理', '波浪渠道', '美国', 10, 20, 19, 'RMB', '28~33天']
    ]);
    const variantRows = await parsePriceWorkbook(await writeWorkbookBuffer(variantWorkbook), await loadExcel(), '时效格式.xlsx');

    expect(variantRows.map((row) => row.transitLabel)).toEqual(['时效:28天', '28~33天']);
  });

  it('亚马逊查询重量段固定且隐藏源文件关键词和只看可报价', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));

    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    expect(screen.queryByText('报价表管理')).not.toBeInTheDocument();
    expect(screen.queryByText('数据体检')).not.toBeInTheDocument();
    expect(screen.queryByText('代理加价规则')).not.toBeInTheDocument();
    expect(screen.getByLabelText('亚马逊仓库代码')).toHaveValue('FTW5');
    expect(screen.getByLabelText('重量段')).toBeInTheDocument();
    expect(screen.queryByLabelText('代理')).not.toBeInTheDocument();
    expect(screen.getByLabelText('出货仓')).toBeInTheDocument();
    expect(screen.getByLabelText('国家/地区关键词')).toBeInTheDocument();
    expect(screen.getByLabelText('渠道关键词')).toBeInTheDocument();
    expect(screen.queryByLabelText('源文件关键词')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/只看可报价/)).not.toBeInTheDocument();
    expect(screen.getByText('12KG+')).toBeInTheDocument();
    await user.click(screen.getByLabelText('重量段'));
    expect(await screen.findByRole('option', { name: '12KG+' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '50KG+' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: '51KG+' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '100KG+' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '按方包税' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '按方不包税' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '按方未标注' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '全部重量段' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '100+' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '1000+' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '1000kg+' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '1000KG+' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '1001KG' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '1001KG+' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: '51KG+' }));
    expect(screen.getByRole('option', { name: '51KG+', selected: true })).toBeInTheDocument();

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
    expect(screen.queryByLabelText('代理')).not.toBeInTheDocument();
    expect(screen.getByLabelText('计费重量 KG')).toBeInTheDocument();
    expect(screen.getByLabelText('方数 CBM')).toBeInTheDocument();
    expect(screen.getByLabelText('税务口径')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: '南非专线查询' }));
    expect(await screen.findByLabelText('品名/明细关键词')).toHaveValue('');
    expect(screen.getByLabelText('指定物料类别')).toBeInTheDocument();
    expect(screen.getByLabelText('体积 CBM')).toBeInTheDocument();
    expect(screen.queryByLabelText('重量 KG')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('备注/申报信息')).not.toBeInTheDocument();

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

  it('欧洲空海运铁路快递查询条件按基础尺寸辅助分组排版且提交字段不变', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/europe-express/quote')) {
        const payload = JSON.parse(String(init?.body ?? '{}'));
        return Promise.resolve(new Response(JSON.stringify({
          module: 'europeExpress',
          query: payload,
          recommendations: [],
          cheapestRecommendations: [],
          fastestRecommendations: [],
          selected: undefined,
          agentErrors: [],
          metrics: { matchedRows: 0, agents: 0, channels: 0, sources: 0 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: '欧洲空海运铁路快递查询' }));

    expect(await screen.findByText('基础查询条件')).toBeInTheDocument();
    expect(screen.getByText('尺寸信息')).toBeInTheDocument();
    expect(screen.getByText('辅助信息')).toBeInTheDocument();
    expect(screen.getByLabelText('目的国家')).toBeInTheDocument();
    expect(screen.getByLabelText('渠道')).toBeInTheDocument();
    expect(screen.getByLabelText('渠道')).toHaveValue('');
    expect(screen.getAllByText('全部渠道').length).toBeGreaterThan(0);
    expect(screen.queryByText('请选择渠道')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('渠道'));
    expect(await screen.findByRole('option', { name: '空运' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '快递' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('计费重量 KG')).toBeInTheDocument();
    expect(screen.getByLabelText('长 cm')).toBeInTheDocument();
    expect(screen.getByLabelText('宽 cm')).toBeInTheDocument();
    expect(screen.getByLabelText('高 cm')).toBeInTheDocument();
    expect(screen.getByLabelText('件数')).toBeInTheDocument();
    expect(screen.getByLabelText('单件实重 KG')).toBeInTheDocument();
    expect(screen.getByLabelText('包装')).toBeInTheDocument();
    expect(document.querySelector('.pricing-calculator-grid-europeExpress')).toBeInTheDocument();
    expect(document.querySelector('.pricing-form-grid-express-extra')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('目的国家'));
    await user.type(screen.getByLabelText('目的国家'), '德国');
    await user.clear(screen.getByLabelText('长 cm'));
    await user.type(screen.getByLabelText('长 cm'), '60');
    await user.clear(screen.getByLabelText('宽 cm'));
    await user.type(screen.getByLabelText('宽 cm'), '50');
    await user.clear(screen.getByLabelText('高 cm'));
    await user.type(screen.getByLabelText('高 cm'), '40');
    await user.clear(screen.getByLabelText('单件实重 KG'));
    await user.type(screen.getByLabelText('单件实重 KG'), '20');
    await user.clear(screen.getByLabelText('计费重量 KG'));
    await user.type(screen.getByLabelText('计费重量 KG'), '80');
    await user.clear(screen.getByLabelText('品名（可选）'));
    await user.type(screen.getByLabelText('品名（可选）'), '普货');
    await user.clear(screen.getByLabelText('包装'));
    await user.type(screen.getByLabelText('包装'), '纸箱');
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/pricing/legacy/europe-express/quote'));
      expect(calls.length).toBeGreaterThan(0);
      expect(JSON.parse(String(calls.at(-1)?.[1]?.body))).toMatchObject({
        destinationCountry: '德国',
        channel: '',
        chargeableWeightKg: 80,
        lengthCm: 60,
        widthCm: 50,
        heightCm: 40,
        packageCount: 1,
        unitActualWeightKg: 20,
        productName: '普货',
        packageInfo: '纸箱'
      });
    });

    await user.click(screen.getByRole('button', { name: /清\s*空/ }));
    expect(screen.getByLabelText('渠道')).toHaveValue('');
    expect(screen.getAllByText('全部渠道').length).toBeGreaterThan(0);

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('南非专线按面膜和体积自动报价，隐藏重量申报并展示完整报价表', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    const lookupPayloads: Array<Record<string, unknown>> = [];
    const quoteText = [
      '南非SA海运DDP专线：面膜',
      '分类：化妆品类/化妆品类',
      '计费方：1.000CBM',
      '运费：¥3500.00/CBM，运费 ¥3500.00',
      '备注：无牌无侵权；约翰内斯堡自提、低消0.5CBM  报关件需要单询'
    ].join('\n');
    const expectQuotePreview = () => {
      expect(screen.getByText((_content, element) => element?.tagName.toLowerCase() === 'pre' && element.textContent === quoteText)).toBeInTheDocument();
    };
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/pricing/south-africa/rules') && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(new Response(JSON.stringify({
          rules: [
            {
              id: 'sa-rule-cosmetic',
              category: '化妆品类',
              name: '化妆品类',
              keywords: ['化妆品', '面膜'],
              ratePerCbm: 3500,
              consult: false,
              remark: '无牌无侵权；约翰内斯堡自提、低消0.5CBM  报关件需要单询',
              enabled: true,
              createdAt: '2026-07-08T10:00:00.000Z',
              updatedAt: '2026-07-08T10:00:00.000Z'
            },
            {
              id: 'sa-rule-disabled-mask',
              category: '停用类',
              name: '停用面膜',
              keywords: ['面膜'],
              ratePerCbm: 999,
              consult: false,
              enabled: false,
              createdAt: '2026-07-08T10:00:00.000Z',
              updatedAt: '2026-07-08T10:00:00.000Z'
            }
          ]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (url.includes('/api/pricing/south-africa/images') && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(new Response(JSON.stringify({ images: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (url.includes('/api/pricing/south-africa/lookup') && init?.method === 'POST') {
        const payload = JSON.parse(String(init.body ?? '{}'));
        lookupPayloads.push(payload);
        const result = {
          id: 'sa-rule-cosmetic',
          category: '化妆品类',
          materialName: '化妆品类',
          matchedKeywords: ['面膜'],
          consult: false,
          ratePerCbm: 3500,
          volumeCbm: Number(payload.volumeCbm),
          chargeableCbm: 1,
          freightFee: 3500,
          totalFee: 3500,
          formulaText: 'max(0.5, 1) = 1.000 CBM',
          remark: '无牌无侵权；约翰内斯堡自提、低消0.5CBM  报关件需要单询',
          quoteText
        };
        return Promise.resolve(new Response(JSON.stringify({
          query: payload,
          result,
          recommendations: [result]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: '南非专线查询' }));
    expect(screen.queryByLabelText('重量 KG')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('备注/申报信息')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('品名/明细关键词'));
    await user.type(screen.getByLabelText('品名/明细关键词'), '面膜');
    await user.clear(screen.getByLabelText('体积 CBM'));
    await user.type(screen.getByLabelText('体积 CBM'), '1.000');

    expect(await screen.findByText('南非专线查询 · 业务报价')).toBeInTheDocument();
    await waitFor(() => expect(lookupPayloads.length).toBeGreaterThan(0));
    expect(lookupPayloads.at(-1)).toEqual(expect.objectContaining({ productName: '面膜', volumeCbm: 1, category: '化妆品类' }));
    expect(lookupPayloads.at(-1)).not.toHaveProperty('actualWeightKg');
    expect(lookupPayloads.at(-1)).not.toHaveProperty('packageInfo');
    expect(screen.getByText('化妆品类 / 化妆品类')).toBeInTheDocument();
    expect(screen.getAllByText('1.000CBM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('¥3500.00').length).toBeGreaterThan(0);
    expect(screen.queryByText((_content, element) => element?.tagName.toLowerCase() === 'pre' && element.textContent === quoteText)).not.toBeInTheDocument();
    await user.click(screen.getByText('查看可复制报价文案'));
    expectQuotePreview();
    expect(screen.queryByText(/风险费|单证费用|预估合计/)).not.toBeInTheDocument();
    expect(screen.getByText('南非专线报价表')).toBeInTheDocument();
    expect(screen.getAllByText('面膜').some((element) => element.classList.contains('pricing-south-africa-keyword-tag'))).toBe(true);
    const hitRow = screen.getByRole('row', { name: /化妆品类 化妆品类.*面膜.*¥3500\.00\/CBM/ });
    expect(hitRow).toHaveClass('pricing-south-africa-hit-row');
    expect(screen.getByRole('row', { name: /停用类 停用面膜/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新增物料规则' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '复制报价' }));
    expect(await screen.findByText('南非报价模板已复制')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    await waitFor(() => expect(lookupPayloads.length).toBeGreaterThan(1));
    expectQuotePreview();

    cleanup();
    localStorage.clear();

    const admin = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await admin.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await admin.click(await screen.findByRole('button', { name: /价格表管理/ }));
    expect(priceBookImportModules).toContainEqual(expect.objectContaining({ key: 'southAfrica', label: '南非专线查询' }));
    expect(screen.queryByText('南非专线图片价格表与物料规则')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('上传南非价格表图片')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '新增规则' })).not.toBeInTheDocument();

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('亚马逊查询选择 51KG 和 100KG 后结果、toast、复制报价保持一致', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/quote-meta')) {
        return Promise.resolve(new Response(JSON.stringify({
          modules: [{ key: 'amazon', label: '亚马逊查询', rowCount: 4, sourceCount: 1 }],
          agents: ['自动重量段代理'],
          origins: [],
          warehouseCodes: ['FTW5'],
          tiers: ['12KG+', '51KG+', '100KG+']
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (String(input).includes('/api/pricing/legacy/amazon/quote')) {
        const payload = JSON.parse(String(init?.body ?? '{}'));
        const weightBand = String(payload.weightBand ?? payload.tier);
        const unitPrice = weightBand === '100KG+' ? 30.5 : weightBand === '51KG+' ? 20.5 : 10.5;
        const weight = weightBand === '100KG+' ? 100 : weightBand === '51KG+' ? 51 : 12;
        const recommendation = {
          id: `mock-amazon-${weightBand}`,
          module: 'amazon',
          sourceId: 'mock-amazon-source',
          agentName: '重量段代理',
          origin: '亚马逊',
          channelName: `${weightBand}美西线`,
          serviceName: `${weightBand}美西线`,
          warehouseCode: payload.amazonCode,
          destinationCountry: payload.destinationCountry,
          weightSegmentLabel: weightBand,
          quoteMode: 'kg',
          costUnitPrice: unitPrice - 0.5,
          salesUnitPrice: unitPrice,
          costTotal: (unitPrice - 0.5) * weight,
          salesTotal: unitPrice * weight,
          grossProfit: 0.5 * weight,
          chargeableWeightKg: weight,
          transitLabel: '22-28 天'
        };
        return Promise.resolve(new Response(JSON.stringify({
          module: 'amazon',
          query: { ...payload, tier: weightBand, weightBand },
          recommendations: [recommendation],
          cheapestRecommendations: [recommendation],
          fastestRecommendations: [recommendation],
          selected: recommendation,
          agentErrors: [],
          metrics: { matchedRows: 1, agents: 1, channels: 1, sources: 1 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'FTW5');
    await user.type(screen.getByLabelText('国家/地区关键词'), '重量段美国');
    await user.click(screen.getByLabelText('重量段'));
    await user.click(await screen.findByRole('option', { name: '51KG+' }));
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes('/api/pricing/legacy/amazon/quote'))).toBe(true));
    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText(/51KG\+/).length).toBeGreaterThan(0);
    expect(screen.getByText('51KG+ / ¥20.5/kg')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: '51KG+' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('12KG+ / ¥10.5/kg')).not.toBeInTheDocument();
    const amazonCalls = vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes('/api/pricing/legacy/amazon/quote'));
    expect(JSON.parse(String(amazonCalls.at(-1)?.[1]?.body))).toMatchObject({ tier: '51KG+', weightBand: '51KG+', chargeableWeightKg: 51 });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await user.click(screen.getByRole('button', { name: '复制推荐报价' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('重量段：51KG+'));

    await user.click(screen.getByLabelText('重量段'));
    await user.click(await screen.findByRole('option', { name: '100KG+' }));
    expect(screen.queryByText(/51KG\+ 51kg 报价/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText(/100KG\+/).length).toBeGreaterThan(0);
    expect(screen.getByText('100KG+ / ¥30.5/kg')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: '100KG+' }).length).toBeGreaterThan(0);

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('亚马逊查询按实重自动匹配重量段并带正确计费重请求', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/quote-meta')) {
        return Promise.resolve(new Response(JSON.stringify({
          destinations: ['重量段美国'],
          channels: [],
          origins: [],
          tiers: ['12KG+', '51KG+', '100KG+'],
          amazonWarehouses: ['FTW5']
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (String(input).includes('/api/pricing/legacy/amazon/quote')) {
        const payload = JSON.parse(String(init?.body ?? '{}'));
        const weightBand = String(payload.weightBand ?? payload.tier);
        const recommendation = {
          id: `auto-amazon-${weightBand}`,
          module: 'amazon',
          sourceId: 'auto-amazon-source',
          agentName: '自动重量段代理',
          origin: '亚马逊',
          channelName: `${weightBand}自动线`,
          serviceName: `${weightBand}自动线`,
          warehouseCode: payload.amazonCode,
          destinationCountry: payload.destinationCountry,
          weightSegmentLabel: weightBand,
          quoteMode: 'kg',
          costUnitPrice: 10,
          salesUnitPrice: 12,
          costTotal: Number(payload.chargeableWeightKg) * 10,
          salesTotal: Number(payload.chargeableWeightKg) * 12,
          grossProfit: Number(payload.chargeableWeightKg) * 2,
          chargeableWeightKg: Number(payload.chargeableWeightKg),
          transitLabel: '22-28 天'
        };
        return Promise.resolve(new Response(JSON.stringify({
          module: 'amazon',
          query: { ...payload, tier: weightBand, weightBand },
          recommendations: [recommendation],
          cheapestRecommendations: [recommendation],
          fastestRecommendations: [recommendation],
          selected: recommendation,
          agentErrors: [],
          metrics: { matchedRows: 1, agents: 1, channels: 1, sources: 1 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    await user.click(screen.getByLabelText('重量段'));
    expect(await screen.findByRole('option', { name: '12KG+' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '21KG+' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'FTW5');
    await user.type(screen.getByLabelText('国家/地区关键词'), '重量段美国');

    const actualWeightInput = screen.getByLabelText('实重 KG');
    const assertAutoBand = async (weight: string, expectedBand: string, expectedChargeable: number) => {
      await user.clear(actualWeightInput);
      await user.type(actualWeightInput, weight);
      await user.click(screen.getByRole('button', { name: '查价查询' }));
      await waitFor(() => {
        const amazonCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/pricing/legacy/amazon/quote'));
        expect(amazonCalls.length).toBeGreaterThan(0);
        expect(JSON.parse(String(amazonCalls.at(-1)?.[1]?.body))).toMatchObject({
          tier: expectedBand,
          weightBand: expectedBand,
          chargeableWeightKg: expectedChargeable
        });
      });
    };

    await assertAutoBand('20', '12KG+', 20);
    await assertAutoBand('21', '12KG+', 21);
    await assertAutoBand('50', '12KG+', 50);
    await assertAutoBand('55', '51KG+', 55);
    await assertAutoBand('60', '51KG+', 60);
    await assertAutoBand('80', '51KG+', 80);
    await assertAutoBand('100', '100KG+', 100);
    await assertAutoBand('120', '100KG+', 120);
    await assertAutoBand('400', '100KG+', 400);
    await assertAutoBand('500', '100KG+', 500);

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('查价表单支持 Tab 顺序并按尺寸自动计算方数和计费重', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/inquiry/quote')) {
        const payload = JSON.parse(String(init?.body ?? '{}'));
        const recommendation = {
          id: 'inquiry-cbm-auto',
          module: 'inquiry',
          sourceId: 'inquiry-cbm-source',
          agentName: '方数代理',
          origin: '深圳',
          channelName: '欧洲海运方数线',
          serviceName: '欧洲海运方数线',
          destinationCountry: payload.destinationCountry,
          weightSegmentLabel: `${payload.chargeableWeightKg}KG`,
          quoteMode: 'kg',
          costUnitPrice: 10,
          salesUnitPrice: 12,
          costTotal: Number(payload.chargeableWeightKg) * 10,
          salesTotal: Number(payload.chargeableWeightKg) * 12,
          grossProfit: Number(payload.chargeableWeightKg) * 2,
          chargeableWeightKg: Number(payload.chargeableWeightKg),
          transitLabel: '35-40 天'
        };
        return Promise.resolve(new Response(JSON.stringify({
          module: 'inquiry',
          query: payload,
          recommendations: [recommendation],
          cheapestRecommendations: [recommendation],
          fastestRecommendations: [],
          selected: recommendation,
          agentErrors: [],
          metrics: { matchedRows: 1, agents: 1, channels: 1, sources: 1 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await renderAndLogin('operator', 'operator123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: '欧洲海运超大件查询' }));

    const productInput = await screen.findByLabelText('品名');
    productInput.focus();
    expect(productInput).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('目的国家')).toHaveFocus();
    await user.tab({ shift: true });
    expect(productInput).toHaveFocus();

    await user.clear(screen.getByLabelText('长 cm'));
    await user.type(screen.getByLabelText('长 cm'), '100');
    await user.clear(screen.getByLabelText('宽 cm'));
    await user.type(screen.getByLabelText('宽 cm'), '100');
    await user.clear(screen.getByLabelText('高 cm'));
    await user.type(screen.getByLabelText('高 cm'), '100');
    await waitFor(() => expect(screen.getByLabelText('方数')).toHaveValue('1.000'));
    expect(await screen.findByText('167 KG')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('方数'));
    await user.type(screen.getByLabelText('方数'), '2');
    expect(await screen.findByText('334 KG')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('长 cm'));
    await user.clear(screen.getByLabelText('宽 cm'));
    await user.clear(screen.getByLabelText('高 cm'));
    await user.clear(screen.getByLabelText('方数'));
    await user.type(screen.getByLabelText('方数'), '3');
    expect(await screen.findByText('501 KG')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查价查询' }));
    await waitFor(() => {
      const inquiryCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('/api/pricing/legacy/inquiry/quote'));
      expect(inquiryCalls.length).toBeGreaterThan(0);
      expect(JSON.parse(String(inquiryCalls.at(-1)?.[1]?.body))).toMatchObject({
        volumeCbm: 3,
        chargeableWeightKg: 501
      });
    });

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('欧洲空海运铁路快递查询将大件交由后端按实际线路决定是否可承接', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();

    await renderAndLogin('operator', 'operator123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: '欧洲空海运铁路快递查询' }));

    await user.type(await screen.findByLabelText('品名（可选）'), '桌子');
    await user.type(screen.getByLabelText('长 cm'), '181');
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/api/pricing/legacy/europe-express/quote'))).toBe(true));

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('渠道要求备注详情不显示亮崽兼容或兼容报价文案', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/amazon/quote')) {
        const payload = JSON.parse(String(init?.body ?? '{}'));
        const recommendation = {
          id: 'mock-channel-requirement',
          module: 'amazon',
          sourceId: 'mock-source',
          agentName: '内部代理',
          origin: '广州',
          channelName: '美西组合海卡',
          serviceName: '美西组合海卡',
          warehouseCode: payload.amazonCode,
          destinationCountry: payload.destinationCountry,
          weightSegmentLabel: payload.weightBand ?? payload.tier ?? '12KG+',
          quoteMode: 'kg',
          costUnitPrice: 10,
          salesUnitPrice: 10.5,
          costTotal: 120,
          salesTotal: 126,
          grossProfit: 6,
          chargeableWeightKg: 12,
          transitLabel: '22-28 天',
          remark: '单箱超长需提前确认',
          productSurchargeRemark: '带磁产品加收',
          specialRemark: '偏远地址单询'
        };
        return Promise.resolve(new Response(JSON.stringify({
          module: 'amazon',
          query: { ...payload, tier: recommendation.weightSegmentLabel, weightBand: recommendation.weightSegmentLabel },
          recommendations: [recommendation],
          cheapestRecommendations: [recommendation],
          fastestRecommendations: [recommendation],
          selected: recommendation,
          agentErrors: [],
          metrics: { matchedRows: 1, agents: 1, channels: 1, sources: 1 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'FTW5');
    await user.type(screen.getByLabelText('国家/地区关键词'), '美国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText('渠道要求').length).toBeGreaterThan(0);
    expect(screen.queryByText(/亮崽兼容|兼容报价|legacy|旧系统/i)).not.toBeInTheDocument();

    const detailButton = screen
      .getAllByRole('button', { name: '渠道要求' })
      .find((button) => button.closest('td'));
    expect(detailButton).toBeTruthy();
    await user.click(detailButton as HTMLElement);

    const detailDialog = await screen.findByRole('dialog', { name: '渠道要求详情' });
    expect(within(detailDialog).getByText('渠道要求')).toBeInTheDocument();
    expect(within(detailDialog).getByText(/单箱超长需提前确认/)).toBeInTheDocument();
    expect(within(detailDialog).queryByText('产品附加')).not.toBeInTheDocument();
    expect(within(detailDialog).getByText(/带磁产品加收/)).toBeInTheDocument();
    expect(within(detailDialog).queryByText(/亮崽兼容|兼容报价|legacy|旧系统/i)).not.toBeInTheDocument();

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('亚马逊、欧洲海运、欧洲空运查价结果显示时效和渠道要求', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    const modules = [
      { key: 'amazon', endpoint: 'amazon', button: '亚马逊查询', title: '亚马逊查询 · 业务报价', channel: '亚马逊带备注渠道', segment: '51KG+', transit: '22-28天', remark: '亚马逊原表备注：特别提示收件人需具备卸货能力，燃油附加13%每周更新' },
      { key: 'inquiry', endpoint: 'inquiry', button: '欧洲海运超大件查询', title: '欧洲海运超大件查询 · 业务报价', channel: '欧洲海运带备注渠道', segment: '100KG+', transit: '28-33天', remark: '欧洲海运原表备注：特别提示收件人需具备卸货能力，燃油附加13%每周更新' },
      { key: 'europeExpress', endpoint: 'europe-express', button: '欧洲空海运铁路快递查询', title: '欧洲空海运铁路快递查询 · 业务报价', channel: '欧洲空运带备注渠道', segment: '21KG+', transit: '6-8天', remark: '欧洲空运原表备注：特别提示收件人需具备卸货能力，燃油附加13%每周更新' }
    ];

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const matchedModule = modules.find((item) => url.includes(`/api/pricing/legacy/${item.endpoint}/quote`));
      if (matchedModule) {
        const payload = JSON.parse(String(init?.body ?? '{}'));
        const recommendation = {
          id: `mock-${matchedModule.key}-visible-notes`,
          module: matchedModule.key,
          sourceId: `mock-${matchedModule.key}-source`,
          agentName: '时效备注代理',
          origin: '广州',
          channelName: matchedModule.channel,
          serviceName: matchedModule.channel,
          warehouseCode: payload.amazonCode,
          destinationCountry: payload.destinationCountry || '法国',
          weightSegmentLabel: matchedModule.segment,
          quoteMode: 'kg',
          costUnitPrice: 10,
          salesUnitPrice: 10.5,
          costTotal: 1050,
          salesTotal: 1100,
          grossProfit: 50,
          chargeableWeightKg: 100,
          transitLabel: matchedModule.transit,
          remark: matchedModule.remark
        };
        return Promise.resolve(new Response(JSON.stringify({
          module: matchedModule.key,
          query: { ...payload, module: matchedModule.key },
          recommendations: [recommendation],
          cheapestRecommendations: [recommendation],
          fastestRecommendations: [recommendation],
          selected: recommendation,
          agentErrors: [],
          metrics: { matchedRows: 1, agents: 1, channels: 1, sources: 1 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));

    for (const item of modules) {
      await user.click(await screen.findByRole('button', { name: item.button }));
      await user.click(screen.getByRole('button', { name: '查价查询' }));
      expect(await screen.findByText(item.title)).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader', { name: '时效' }).length).toBeGreaterThan(0);
      expect(screen.queryByRole('columnheader', { name: '备注' })).not.toBeInTheDocument();
      expect(screen.getAllByText(item.transit).length).toBeGreaterThan(0);
      expect(screen.queryByText(new RegExp(`备注\\s*${item.remark}`))).not.toBeInTheDocument();
      expect(screen.queryByText(item.remark)).not.toBeInTheDocument();
      const detailButton = screen
        .getAllByRole('button', { name: '渠道要求' })
        .find((button) => button.closest('td'));
      expect(detailButton).toBeTruthy();
      await user.click(detailButton as HTMLElement);
      const detailDialog = await screen.findByRole('dialog', { name: '渠道要求详情' });
      expect(within(detailDialog).getByText('渠道要求')).toBeInTheDocument();
      expect(within(detailDialog).getByText(item.remark)).toBeInTheDocument();
      await user.click(within(detailDialog).getByRole('button', { name: /关\s*闭/ }));

      await user.click(screen.getByRole('row', { name: new RegExp(item.channel) }));
      const rowDetailDialog = await screen.findByRole('dialog', { name: '渠道要求详情' });
      expect(within(rowDetailDialog).getByText('渠道要求')).toBeInTheDocument();
      expect(within(rowDetailDialog).getByText(item.remark)).toBeInTheDocument();
      await user.click(within(rowDetailDialog).getByRole('button', { name: /关\s*闭/ }));
    }

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/inquiry/quote')) {
        const payload = JSON.parse(String(init?.body ?? '{}'));
        const recommendation = {
          id: 'mock-inquiry-empty-notes',
          module: 'inquiry',
          sourceId: 'mock-inquiry-empty-source',
          agentName: '空备注代理',
          channelName: '欧洲海运空备注渠道',
          serviceName: '欧洲海运空备注渠道',
          destinationCountry: payload.destinationCountry || '法国',
          weightSegmentLabel: '100KG+',
          quoteMode: 'kg',
          costUnitPrice: 10,
          salesUnitPrice: 10.5,
          costTotal: 1050,
          salesTotal: 1100,
          grossProfit: 50,
          chargeableWeightKg: 100
        };
        return Promise.resolve(new Response(JSON.stringify({
          module: 'inquiry',
          query: { ...payload, module: 'inquiry' },
          recommendations: [recommendation],
          cheapestRecommendations: [recommendation],
          fastestRecommendations: [],
          selected: recommendation,
          agentErrors: [],
          metrics: { matchedRows: 1, agents: 1, channels: 1, sources: 1 }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await user.click(screen.getByRole('button', { name: '欧洲海运超大件查询' }));
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('欧洲海运超大件查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText('时效待确认').length).toBeGreaterThan(0);
    expect(screen.getAllByText('暂无渠道要求').length).toBeGreaterThan(0);

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('queries europe express prices without chargeable weight and shows actionable empty states', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));

    const workbook = createWorkbook();
    addRowsWorksheet(workbook, '欧洲空海运铁路快递', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['欧洲快递代理', '欧洲快递高价', '法国', 0, 10, 30, 'RMB'],
      ['欧洲快递代理', '欧洲快递低价', '法国', 50, 100, 20, 'RMB']
    ]);
    await selectImportModule(user, '欧洲空海运铁路快递查询');
    await user.upload(screen.getByLabelText('增加价格表'), new File(
      [await writeWorkbookBuffer(workbook)],
      '7.9-欧洲快递代理.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ));
    expect(await screen.findByText(/已导入价格表 7\.9-欧洲快递代理\.xlsx/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^查价/ }));
    await user.click(screen.getByRole('button', { name: '欧洲空海运铁路快递查询' }));
    expect(await screen.findByLabelText('目的国家')).toHaveValue('法国');

    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('未填写计费重，已按最低单价展示可报价线路。')).toBeInTheDocument();
    expect(await screen.findByText(/未填写计费重，当前结果按最低单价排序/)).toBeInTheDocument();
    expect(screen.getByText('欧洲空海运铁路快递查询 · 业务报价')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '代理' })).not.toBeInTheDocument();
    expect(screen.getAllByText('欧洲快递低价').length).toBeGreaterThan(0);
    expect(screen.getAllByText('¥20.5/kg').length).toBeGreaterThan(0);

    await user.clear(screen.getByLabelText('目的国家'));
    await user.type(screen.getByLabelText('目的国家'), '德国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('未匹配到报价')).toBeInTheDocument();
    expect(screen.getByText('请检查国家、渠道，或填写计费重量后重试。')).toBeInTheDocument();
  });

  it('四个模块查询有 loading 状态并在失败或切换时不无限转圈', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('button', { name: '亚马逊查询' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '欧洲海运超大件查询' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '欧洲空海运铁路快递查询' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '南非专线查询' })).toBeInTheDocument();

    const fetchMock = vi.mocked(fetch);
    const originalFetch = fetchMock.getMockImplementation();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/amazon/quote')) {
        return new Promise<Response>(() => undefined);
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });

    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('查询中')).toBeInTheDocument();
    expect(screen.getByText('正在匹配报价，请稍候。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '欧洲海运超大件查询' }));
    await waitFor(() => expect(screen.queryByText('查询中')).not.toBeInTheDocument());
    expect(screen.queryByText('填写信息后查询报价')).not.toBeInTheDocument();

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/pricing/legacy/inquiry/quote')) {
        return Promise.reject(new Error('Failed to fetch'));
      }
      return originalFetch?.(input, init) ?? Promise.reject(new Error('unexpected fetch'));
    });
    await user.click(screen.getByRole('button', { name: '查价查询' }));
    expect(await screen.findByText('查询失败')).toBeInTheDocument();
    expect(screen.getAllByText('查价请求失败，请检查网络后重试').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '重试查询' })).toBeInTheDocument();

    if (originalFetch) {
      fetchMock.mockImplementation(originalFetch);
    }
  });

  it('查看线路会在当前价格表的新标签页打开线路阶梯工作台', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.click(await screen.findByRole('button', { name: /价格表管理/ }));

    const topdaWorkbook = createWorkbook();
    addRowsWorksheet(topdaWorkbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['亿阳国际', '拓普达美线', '美国', 0, 1000, 18, 'RMB'],
      ['亿阳国际', '拓普达慢线', '美国', 0, 1000, 19, 'RMB']
    ]);
    await selectImportModule(user, '亚马逊查询');
    await user.upload(screen.getByLabelText('增加价格表'), new File(
      [await writeWorkbookBuffer(topdaWorkbook)],
      '7.6-拓普达.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ));
    expect(await screen.findByText(/已导入价格表 7\.6-拓普达\.xlsx/)).toBeInTheDocument();

    const zhenyunWorkbook = createWorkbook();
    addRowsWorksheet(zhenyunWorkbook, '价格表', [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['深圳振韵国际', '欧洲空派快递派', '法国', 0, 1000, 26.5, 'RMB']
    ]);
    await selectImportModule(user, '欧洲空海运铁路快递查询');
    await user.upload(screen.getByLabelText('增加价格表'), new File(
      [await writeWorkbookBuffer(zhenyunWorkbook)],
      '7.3振韵.xls',
      { type: 'application/vnd.ms-excel' }
    ));
    expect(await screen.findByText(/已导入价格表 7\.3振韵\.xls/)).toBeInTheDocument();

    const priceBookCard = getPriceBookCard();
    expect(priceBookCard).not.toBeNull();
    await user.click(within(priceBookCard as HTMLElement).getByRole('button', { name: '同步体检' }));
    const healthDialog = await screen.findByRole('dialog', { name: '价格表-加价规则同步体检' });
    expect(within(healthDialog).getByText('7.6-拓普达.xlsx')).toBeInTheDocument();
    expect(within(healthDialog).getByRole('row', { name: /拓普达/ })).toBeInTheDocument();
    expect(within(healthDialog).getByText('7.3振韵.xls')).toBeInTheDocument();
    expect(within(healthDialog).getByRole('row', { name: /振韵/ })).toBeInTheDocument();
    expect(within(healthDialog).getAllByText('默认同步').length).toBeGreaterThanOrEqual(2);
    expect(within(healthDialog).getAllByText('模块隔离正常').length).toBeGreaterThanOrEqual(2);
    expect(within(healthDialog).getByText('有加价规则但无有效价格表')).toBeInTheDocument();
    await user.click(within(healthDialog).getByRole('button', { name: /关\s*闭/ }));

    await user.click(screen.getByRole('button', { name: /代理加价规则/ }));
    const markupRuleCard = getMarkupRuleCard();
    expect(markupRuleCard).not.toBeNull();
    const topdaRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /拓普达/ });
    expect(within(markupRuleCard as HTMLElement).getByRole('row', { name: /振韵/ })).toBeInTheDocument();

    await user.click(topdaRow);
    await user.click(within(markupRuleCard as HTMLElement).getByRole('button', { name: /^修\s*改$/ }));
    const editDialog = await screen.findByRole('dialog', { name: '修改代理加价' });
    expect(within(editDialog).getByDisplayValue('拓普达')).toBeInTheDocument();
    await user.clear(within(editDialog).getByLabelText('业务员加价 / kg'));
    await user.type(within(editDialog).getByLabelText('业务员加价 / kg'), '0.8');
    await user.click(within(editDialog).getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText(/拓普达 加价规则已(保存|更新)：\+¥0\.80\/kg/)).toBeInTheDocument();

    const updatedTopdaRow = within(markupRuleCard as HTMLElement).getByRole('row', { name: /拓普达/ });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    await user.click(within(updatedTopdaRow).getByRole('button', { name: '查看线路' }));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('/app/pricing/markup?view=route-editor&priceBookId='), '_blank', 'noopener');
    expect(openSpy.mock.calls[0][0]).toContain('agentName=%E6%8B%93%E6%99%AE%E8%BE%BE');
    openSpy.mockRestore();
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
    expect(screen.queryByText('填写信息后查询报价')).not.toBeInTheDocument();
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
    expect(screen.queryByText('报价结果')).not.toBeInTheDocument();
    expect(screen.queryByText('已按当前查价模块输出报价')).not.toBeInTheDocument();

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
    await selectImportModule(user, '欧洲空海运铁路快递查询');
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText(/已导入价格表 agent-price\.xlsx，新增 1 条代理成本价，查价模块：欧洲空海运铁路快递查询/)).toBeInTheDocument();
    expect(screen.getAllByText(/欧洲空海运铁路快递 1 条/).length).toBeGreaterThan(0);
    expect(screen.getByText('未填写')).toBeInTheDocument();
    expect(screen.queryByText('导入原始备注：超长件需要单询')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '编辑自定义备注' }));
    const priceBookRemarkDialog = await screen.findByRole('dialog', { name: '编辑自定义备注' });
    await user.clear(within(priceBookRemarkDialog).getByLabelText('自定义备注'));
    await user.type(within(priceBookRemarkDialog).getByLabelText('自定义备注'), '亿阳国际渠道报价备注：实重 30-45KG 加 1元/KG，超长件单询');
    await user.click(within(priceBookRemarkDialog).getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('agent-price.xlsx 自定义备注已更新')).toBeInTheDocument();
    expect(await screen.findByText('已填写')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'agent-price.xlsx 自定义备注' }));
    const priceBookCustomRemarkDialog = await screen.findByRole('dialog', { name: 'agent-price.xlsx · 自定义备注' });
    expect(within(priceBookCustomRemarkDialog).getByText(/亿阳国际渠道报价备注/)).toBeInTheDocument();
    await user.click(within(priceBookCustomRemarkDialog).getByRole('button', { name: /关\s*闭/ }));

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
    expect(screen.getAllByText('渠道要求').length).toBeGreaterThan(0);
    expect(screen.queryByText(/亮崽兼容|兼容报价|旧系统/i)).not.toBeInTheDocument();
    const detailButton = screen
      .getAllByRole('button', { name: '渠道要求' })
      .find((button) => button.closest('td'));
    expect(detailButton).toBeTruthy();
    await user.click(detailButton as HTMLElement);
    const detailDialog = await screen.findByRole('dialog', { name: '渠道要求详情' });
    expect(within(detailDialog).getByText('渠道要求')).toBeInTheDocument();
    expect(within(detailDialog).queryByText(/亿阳国际渠道报价备注/)).not.toBeInTheDocument();
    expect(within(detailDialog).queryByText('产品附加')).not.toBeInTheDocument();
    expect(within(detailDialog).getByText(/纸箱超大/)).toBeInTheDocument();
    expect(within(detailDialog).queryByText('特别说明/尺寸要求')).not.toBeInTheDocument();
    expect(within(detailDialog).getByText(/heavy box/)).toBeInTheDocument();
    expect(within(detailDialog).getByText('成本单价')).toBeInTheDocument();
    expect(within(detailDialog).getByText('毛利')).toBeInTheDocument();
    await user.click(within(detailDialog).getByRole('button', { name: /关\s*闭/ }));

    const customRemarkButton = screen
      .getAllByRole('button', { name: '自定义备注' })
      .find((button) => button.closest('td'));
    expect(customRemarkButton).toBeTruthy();
    await user.click(customRemarkButton as HTMLElement);
    const customRemarkDialog = await screen.findByRole('dialog', { name: /自定义备注/ });
    expect(within(customRemarkDialog).getByText(/亿阳国际渠道报价备注/)).toBeInTheDocument();
    await user.click(within(customRemarkDialog).getByRole('button', { name: /关\s*闭/ }));

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
    expect(await screen.findByText(/已导入价格表 persist-price\.xlsx，新增 1 条代理成本价，渠道分类：/)).toBeInTheDocument();
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

    expect(await screen.findByText(/已删除价格表 persist-price\.xlsx，其报价已失效，请重新查询/)).toBeInTheDocument();
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

    await selectImportModule(user, '亚马逊查询');
    await user.upload(screen.getByLabelText('增加价格表'), file);
    expect(await screen.findByText(/已导入价格表 驰汉导入\.xlsx，新增 2 条代理成本价，查价模块：亚马逊查询/)).toBeInTheDocument();
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
    expect(await screen.findByText('查价成功')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/pricing/legacy/amazon/quote'), expect.anything());
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/pricing/lookup'), expect.anything());
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/pricing/books'), expect.anything());
    expect(screen.queryByText('报价结果')).not.toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.queryByText('已按当前查价模块输出报价')).not.toBeInTheDocument();
    expect(screen.queryByText(/代理加价/)).not.toBeInTheDocument();
    expect(screen.queryByText('代理加价规则')).not.toBeInTheDocument();
    expect(screen.queryByText('业务员加价')).not.toBeInTheDocument();
    expect(screen.queryByText('毛利')).not.toBeInTheDocument();
    expect(screen.queryByText('代理成本单价')).not.toBeInTheDocument();
    expect(screen.queryByText('成本合计')).not.toBeInTheDocument();
    expect(screen.getAllByText('海运洛杉矶专线').length).toBeGreaterThan(0);
    expect(screen.queryByText('a代理')).not.toBeInTheDocument();
    expect(screen.queryByText('DHK')).not.toBeInTheDocument();
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
    expect(await screen.findByText('查价成功')).toBeInTheDocument();
    expect(screen.queryByText('报价结果')).not.toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.getAllByText('a代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/毛利/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/成本/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/¥[\d,.]+/).length).toBeGreaterThan(0);
  });

  it('业务报价渠道对业务员隐藏 TPD YY 并展示美西组合海卡和黄金达海卡', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'FTW5');
    await user.type(screen.getByLabelText('国家/地区关键词'), '业务渠道展示国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText('美西组合海卡').length).toBeGreaterThan(0);
    expect(screen.getAllByText('黄金达海卡').length).toBeGreaterThan(0);
    expect(screen.getAllByText('可报价线路').length).toBeGreaterThan(0);
    expect(screen.queryByText(/TPD|S4|YY黄金|DHL Express/)).not.toBeInTheDocument();
    expect(screen.queryByText('拓普达')).not.toBeInTheDocument();
    expect(screen.queryByText('亿阳国际')).not.toBeInTheDocument();
    expect(screen.queryByText('英文代理')).not.toBeInTheDocument();
    expect(screen.queryByText(/毛利/)).not.toBeInTheDocument();
    expect(screen.queryByText(/成本/)).not.toBeInTheDocument();

    cleanup();
    localStorage.clear();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'FTW5');
    await user.type(screen.getByLabelText('国家/地区关键词'), '业务渠道展示国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText('TPD-S4-美西组合海卡').length).toBeGreaterThan(0);
    expect(screen.getAllByText('YY黄金达海卡').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DHL Express').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/毛利/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/成本/).length).toBeGreaterThan(0);
  });

  it('亚马逊出货仓下拉只展示地名并按地名筛选 FTW 报价', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '报价查价' }));
    expect(await screen.findByRole('heading', { name: '报价查价中心' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '亚马逊查询' }));
    await user.click(screen.getByLabelText('出货仓'));
    expect(await screen.findByRole('option', { name: '全部出货仓' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: '义乌仓' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: '华东' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: '华南' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: '汕头' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: '深圳/广州仓' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /欧洲空派快递派|欧洲铁路包税|欧洲铁路超大件专线|西班牙专线|英国海运/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: '华南' }));
    await user.clear(screen.getByLabelText('亚马逊仓库代码'));
    await user.type(screen.getByLabelText('亚马逊仓库代码'), 'FTW5');
    await user.type(screen.getByLabelText('国家/地区关键词'), '业务渠道展示国');
    await user.click(screen.getByRole('button', { name: '查价查询' }));

    expect(await screen.findByText('亚马逊查询 · 业务报价')).toBeInTheDocument();
    expect(screen.getAllByText('黄金达海卡').length).toBeGreaterThan(0);
    expect(screen.queryByText('美西组合海卡')).not.toBeInTheDocument();
    const quoteCalls = vi.mocked(fetch).mock.calls.filter(([input]) => String(input).includes('/api/pricing/legacy/amazon/quote'));
    expect(JSON.parse(String(quoteCalls.at(-1)?.[1]?.body))).toMatchObject({ amazonCode: 'FTW5', origin: '华南' });
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
    expect(screen.queryByText('报价结果')).not.toBeInTheDocument();
    expect(screen.queryByText('报价结果明细')).not.toBeInTheDocument();
    expect(screen.queryByText('代理异常')).not.toBeInTheDocument();
    expect(screen.queryByText('BSD (0) Token不正确')).not.toBeInTheDocument();
    expect(screen.queryByText('已按当前查价模块输出报价')).not.toBeInTheDocument();
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
    expect(within(detailDialog).getByLabelText('按工作表筛选线路')).toBeInTheDocument();
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
    expect(within(detailDialog).getByLabelText('按工作表筛选线路')).toBeInTheDocument();
    expect(within(detailDialog).getByRole('button', { name: '批量统一加价' })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHK03.*美国.*0-1000kg/ })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHK01.*美国.*0-1000kg/ })).toBeInTheDocument();
    expect(within(detailDialog).getByRole('row', { name: /DHL-A.*美国.*0-1000kg/ })).toBeInTheDocument();
  });

});
