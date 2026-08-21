import request from 'supertest';
import { describe, expect, it } from 'vitest';
import * as xlsx from '@e965/xlsx';
import { CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE, matchesEuropeanPostalRule, matchUsPostalRule } from '@siyuan/shared';
import { inferEuropeTransportMode, inspectEuropeOversizeWorkbookSheets, normalizePricingImportRowForModule, parsePriceWorkbookBuffer, pricingParserRuleVersion, sanitizePricingChannelRequirement, sanitizePricingTransitLabel } from './pricing-excel.js';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Siyuan API pricing', () => {
  const app = setupE2eApp();

  it('classifies a Europe display channel from its price group instead of a generic sheet name', () => {
    expect(inferEuropeTransportMode({
      sourceSheetName: '欧洲空海运铁路快递',
      channelName: '欧洲空海运铁路快递 - 中欧海运快船包税',
      realChannelName: '内部下单渠道'
    })).toBe('SEA');
  });

  it('keeps only the natural-day pickup promise as the transit label', () => {
    expect(sanitizePricingTransitLabel('交货次日8个自然日提取，，运费赔完即止,需货型比例达到1:250以上')).toBe('交货次日8个自然日提取');
    expect(sanitizePricingTransitLabel('10个自然日内提取，运费赔完即止')).toBe('10个自然日内提取');
  });

  it('keeps the Canada sea transit promise before an unpunctuated volume-discount ladder', () => {
    expect(sanitizePricingTransitLabel('有ERS加急服务 开船后32-38天 1:200优惠0.2RMB/KG 1:250优惠0.5RMB/KG 船晚开，塞港，海关查验及天气等不可控因素影响除外'))
      .toBe('开船后32-38天');
    expect(sanitizePricingTransitLabel('1:300报价-2: 1:500报价-3 7-8个工作日提取 亚马逊标签上的SHIP TO跟SHIP FROM需为空白'))
      .toBe('7-8个工作日提取');
  });

  it('combines main transport and private-address delivery promises into one transit range', () => {
    expect(sanitizePricingTransitLabel('开船后第二天开始算30天；私人地址派送时效40天；赔偿上限100元/票'))
      .toBe('30-40天');
    expect(sanitizePricingTransitLabel('航程时效28-33天')).toBe('时效28-33天');
  });

  it('imports unlabelled price-table tail paragraphs as channel requirements in every shared pricing module', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['通用代理', '通用海运', '德国', 100, 99999, 18, 'RMB'],
      ['收货场地须一楼可进大车，否则客户自提']
    ]), '通用价格表');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    for (const targetModule of ['amazon', 'inquiry', 'europeExpress', 'usaAirSea', 'canadaAirSea'] as const) {
      const rows = await parsePriceWorkbookBuffer(buffer, '通用价格表.xlsx', targetModule, '通用代理');
      expect(rows).toEqual([expect.objectContaining({
        specialRemark: expect.stringContaining('收货场地须一楼可进大车，否则客户自提')
      })]);
    }
  });

  it('removes agent company identities but preserves the remaining channel requirement', () => {
    const requirement = '深圳市派格福通货运代理有限公司 Shen zhen PAGO LOGISTICS Co.,Ltd；产品附加费问题请咨询业务员；仅接受普货。';
    expect(sanitizePricingChannelRequirement(requirement, ['派格'])).toBe('产品附加费问题请咨询业务员；仅接受普货。');
  });

  it('removes upstream warehouse addresses and contacts from channel requirements', () => {
    const requirement = [
      '仅接受普货，需提供完整收件信息。',
      '深圳天瑞操作中心 / 深圳市宝安区石岩街道办应人石上龙路5号 仓库上班时间【上午9点到晚上10点】',
      '广州操作中心 / 广州市白云区空港二号国际创新产业园5栋104-106号 联系人：肖国庆 15889427490',
      '备注：提前预约客户，方数尽量准确。',
      '客服投诉电话：15989328127'
    ].join('\n');
    expect(sanitizePricingChannelRequirement(requirement)).toBe('仅接受普货，需提供完整收件信息。\n备注：提前预约客户，方数尽量准确。');
  });

  it('does not expose address-style remarks from the south Africa lookup or rule list', async () => {
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .post('/api/pricing/south-africa/rules')
      .set('Authorization', app.auth(adminToken))
      .send({
        category: '南非脱敏测试',
        name: '地址测试货物',
        keywords: ['地址测试货物'],
        pricingMode: 'fixed',
        ratePerCbm: 2600,
        remark: '仅接受普货。\n深圳天瑞操作中心 / 深圳市宝安区石岩街道办应人石上龙路5号 联系人：肖健风 13826539502'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/south-africa/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ productName: '地址测试货物', volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        const payload = JSON.stringify(response.body);
        expect(payload).toContain('仅接受普货');
        expect(payload).not.toContain('石岩街道');
        expect(payload).not.toContain('13826539502');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/south-africa/rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const payload = JSON.stringify(response.body);
        expect(payload).toContain('仅接受普货');
        expect(payload).not.toContain('石岩街道');
        expect(payload).not.toContain('13826539502');
      });
  });

  it('does not expose agent company names from legacy quote requirement fields', async () => {
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '渠道要求代理脱敏.xlsx',
        targetModule: 'usaAirSea',
        agentShortName: '亮崽统一代理',
        rows: [{
          agentName: '亮崽统一代理',
          channelName: '美国空运专线',
          realChannelName: '美国空运专线',
          destinationCountry: '美国',
          postalRule: '5-7',
          minWeightKg: 71,
          maxWeightKg: 99999,
          costPerKg: 60,
          currency: 'RMB',
          remark: '深圳市派格福通货运代理有限公司 Shen zhen PAGO LOGISTICS Co.,Ltd；请提供完整收件信息。\n深圳天瑞操作中心 / 深圳市宝安区石岩街道办应人石上龙路5号 联系人：肖健风 13826539502',
          productSurchargeRemark: '产品附加费请单询。',
          specialRemark: '深圳市派格福通货运代理有限公司；仅接受普货。'
        }]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', postalCode: '50001', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        const payload = JSON.stringify(response.body);
        expect(payload).not.toContain('深圳市派格福通货运代理有限公司');
        expect(payload).not.toContain('PAGO LOGISTICS');
        expect(payload).not.toContain('石岩街道');
        expect(payload).not.toContain('13826539502');
        expect(payload).toContain('产品附加费请单询');
        expect(payload).toContain('仅接受普货');
      });
  });

  it('does not expose agent company names from the standard quote response or nested price row', async () => {
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .post('/api/master-data/agents')
      .set('Authorization', app.auth(adminToken))
      .send({ name: '深圳市派格福通货运代理有限公司', shortName: '派格', code: 'PAGO' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '标准查价渠道要求代理脱敏.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '亮崽统一代理',
        rows: [{
          agentName: '亮崽统一代理',
          channelName: '标准查价专线',
          realChannelName: '标准查价专线',
          destinationCountry: '查价代理脱敏国',
          minWeightKg: 0,
          maxWeightKg: 99999,
          costPerKg: 60,
          currency: 'RMB',
          productSurchargeRemark: '深圳市派格福通货运代理有限公司 Shen zhen PAGO LOGISTICS Co.,Ltd；仅接受普货。',
          specialRemark: '派格 请按要求提供资料。'
        }]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '查价代理脱敏国', chargeableWeightKg: 10 })
      .expect(201)
      .expect((response) => {
        const payload = JSON.stringify(response.body);
        expect(payload).not.toContain('深圳市派格福通货运代理有限公司');
        expect(payload).not.toContain('PAGO LOGISTICS');
        expect(payload).not.toContain('派格');
        expect(payload).toContain('仅接受普货');
        expect(payload).toContain('请按要求提供资料');
      });
  });

  it('imports every Zhenyun Europe oversized sheet into the combined pool with explicit route and cargo labels', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      [null, '欧洲空派超大件（大陆直飞）'],
      [null, '目的地', '30kg', '100kg', '参考时效起飞6-8天提取'],
      [null, '西班牙', 60, 53]
    ]), '欧洲空运超大件');
    const zoneSheet = (title: string, price: number) => xlsx.utils.aoa_to_sheet([
      ['系统下单渠道', null, null, null, null, title],
      ['国家', '分区', '邮编（偏远和岛屿不走）', null, null, '30KG+', '100KG+'],
      ['西班牙', 'A', '29011', null, null, price + 1, price]
    ]);
    xlsx.utils.book_append_sheet(workbook, zoneSheet('欧洲海运普货超大件', 16), '欧洲海运普货超大件专线');
    xlsx.utils.book_append_sheet(workbook, zoneSheet('欧洲铁路普货超大件渠道', 20), '欧洲铁路超大件专线');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['系统下单渠道', '中欧海运超大件联邦专线包税'],
      ['国家/重量区间', '30kg+', '100kg+'],
      ['西班牙', 22, 18],
      ['单件要求不能低于30kg，两件以上不接受纸箱包装'],
      ['最长边＜240CM，没有附加费，单件计费重限制：1000kg/件以内'],
      ['此报价不含带尾板费用，需要尾板的单询'],
      ['联邦账号超标准附加费']
    ]), '中欧铁海运超大件联邦专线');
    xlsx.utils.book_append_sheet(workbook, zoneSheet('电池超大件专线', 15), '电池专线超大件专线');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xls' }));

    const rows = await parsePriceWorkbookBuffer(buffer, '振韵超大件.xls', 'inquiry', '振韵');
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceSheetName: '欧洲空运超大件', transportMode: 'AIR', cargoType: 'GENERAL', destinationCountry: '西班牙', minWeightKg: 100, costPerKg: 53 }),
      expect.objectContaining({ sourceSheetName: '欧洲海运普货超大件专线', transportMode: 'SEA', cargoType: 'GENERAL', postalRule: '29011', costPerKg: 16 }),
      expect.objectContaining({ sourceSheetName: '欧洲铁路超大件专线', transportMode: 'RAIL', cargoType: 'GENERAL', postalRule: '29011', costPerKg: 20 }),
      expect.objectContaining({
        sourceSheetName: '中欧铁海运超大件联邦专线',
        transportMode: 'SEA',
        cargoType: 'GENERAL',
        costPerKg: 18,
        specialRemark: expect.stringContaining('单件要求不能低于30kg')
      }),
      expect.objectContaining({ sourceSheetName: '电池专线超大件专线', transportMode: 'RAIL', cargoType: 'BATTERY', postalRule: '29011', costPerKg: 15 })
    ]));
    const seaRailRequirement = rows.find((row) => row.sourceSheetName === '中欧铁海运超大件联邦专线' && row.costPerKg === 18)?.specialRemark;
    expect(seaRailRequirement).toContain('最长边＜240CM，没有附加费');
    expect(seaRailRequirement).toContain('此报价不含带尾板费用，需要尾板的单询');
    expect(seaRailRequirement).toContain('联邦账号超标准附加费');
    expect(inspectEuropeOversizeWorkbookSheets(buffer, rows).sheets).toEqual(expect.arrayContaining([
      expect.objectContaining({ sheetName: '欧洲空运超大件', importedRows: expect.any(Number) }),
      expect.objectContaining({ sheetName: '电池专线超大件专线', importedRows: expect.any(Number) })
    ]));
  });

  it('filters the Europe oversized pool by transport, cargo type, and returns all cargo types when omitted', async () => {
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '欧洲超大件综合筛选.xlsx',
        targetModule: 'inquiry',
        agentShortName: '振韵',
        rows: [
          { agentName: '振韵', channelName: '欧洲空运超大件', businessRouteName: '欧洲空派超大件', destinationCountry: '组合价法国', minWeightKg: 30, maxWeightKg: 99999, costPerKg: 30, currency: 'RMB', transportMode: 'AIR', cargoType: 'GENERAL' },
          { agentName: '振韵', channelName: '欧洲海运超大件', businessRouteName: '欧洲海运超大件', destinationCountry: '组合价法国', minWeightKg: 30, maxWeightKg: 99999, costPerKg: 12, currency: 'RMB', transportMode: 'SEA', cargoType: 'GENERAL' },
          { agentName: '振韵', channelName: '欧洲电池超大件', businessRouteName: '欧洲电池超大件', destinationCountry: '组合价法国', minWeightKg: 30, maxWeightKg: 99999, costPerKg: 9, currency: 'RMB', transportMode: 'RAIL', cargoType: 'BATTERY' }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '组合价法国', channel: '空运', cargoType: 'GENERAL', chargeableWeightKg: 100, volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual([expect.objectContaining({ channelName: '欧洲空运超大件', transportMode: 'AIR', cargoType: 'GENERAL' })]);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '组合价法国', cargoType: 'GENERAL', chargeableWeightKg: 100, volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations.map((item: { cargoType: string }) => item.cargoType)).not.toContain('BATTERY');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '组合价法国', chargeableWeightKg: 100, volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations.map((item: { cargoType: string }) => item.cargoType)).toEqual(expect.arrayContaining(['GENERAL', 'BATTERY']));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '组合价法国', cargoType: 'BATTERY', chargeableWeightKg: 100, volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual([expect.objectContaining({ channelName: '欧洲电池超大件', transportMode: 'RAIL', cargoType: 'BATTERY' })]);
      });
  });

  it('prefers a natural-day pickup promise from channel requirements over a flight-leg description', () => {
    const requirements = '主要使用韩国/香港机场统配航线，航程1-3天，末端 UPS/FedEx 派送。\n当天18点前入库后第二天计算，10个自然日内提取，第11个自然日起未提取按1CNY/KG/自然日赔付。';
    const row = normalizePricingImportRowForModule({
      channelName: '美国十日提空派带电专线',
      transitLabel: '主要使用韩国/香港机场统配航线，航程1-3天，末端 UPS/FedEx 派送。',
      specialRemark: requirements
    }, 'usaAirSea');

    expect(row.transitLabel).toBe('10个自然日内提取');
    expect(row.specialRemark).toBe(requirements);
  });

  it('marks a newly imported price book with the active parser-rule revision', async () => {
    const adminToken = await app.loginAs('admin');
    const response = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '规则版本回归.xlsx',
        targetModule: 'europeExpress',
        agentShortName: 'a代理',
        rows: [{
          agentName: 'a代理', channelName: '欧洲海运快递派', realChannelName: '欧洲海运快递派',
          sourceSheetName: '欧洲海运快递派', destinationCountry: '法国', minWeightKg: 0,
          maxWeightKg: 100, costPerKg: 10, currency: 'RMB', transitLabel: '40-45天'
        }]
      })
      .expect(201);

    expect(response.body.book.parserRuleVersion).toBe(pricingParserRuleVersion('europeExpress'));
    expect(response.body.book.refreshStatus).toBe('CURRENT');

    const progress = await request(app.getHttpServer())
      .get('/api/pricing/books/rule-refresh-progress')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    const europeProgress = progress.body.modules.find((item: { module: string }) => item.module === 'europeExpress');
    expect(europeProgress).toMatchObject({
      ruleVersion: pricingParserRuleVersion('europeExpress'),
      latestRuleApplied: true
    });
    expect(europeProgress.currentBooks).toBeGreaterThan(0);
  });

  it('uses the sheet and price-group header for Europe channel labels and retains source transit', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['UPS英国海运双清-1:300减0.5'],
      ['渠道', '5KG+', '11KG+', '21KG+', '45KG+', '101KG+', '301KG+', '时效'],
      ['不包税', 20.2, 15.2, 8.2, 6.2, 5.2, 5.2, '正常开船后40-45天左右'],
      ['包税', 23, 18, 11, 9, 8, 8, '正常开船后40-45天左右']
    ]), '英国海运');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['系统下单渠道', '', '', '欧洲海运电池快递专线', '', '', '备注', '包装要求'],
      ['国家/重量区间', '12KG+', '24KG+', '50KG+', '100KG+', '200KG+', '备注', '包装要求'],
      ['德国', 17, 15, 12.5, 11, 10.5, '40-45天（装柜-提取）', 'MSDS、UN38.3']
    ]), '欧洲海运电池快递专线');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));
    const rows = await parsePriceWorkbookBuffer(buffer, '欧洲报价.xlsx', 'europeExpress');
    const ukRows = await parsePriceWorkbookBuffer(buffer, '欧洲报价.xlsx', 'ukExpress');

    const upsRows = ukRows.filter((row) => row.sourceSheetName === '英国海运');
    expect(upsRows.length).toBeGreaterThan(0);
    expect(upsRows.every((row) => row.channelName === '英国海运 - UPS英国海运双清')).toBe(true);
    expect(upsRows.every((row) => row.businessRouteName === 'UPS英国海运双清')).toBe(true);
    expect(upsRows.every((row) => row.transitLabel?.includes('40-45天'))).toBe(true);
    expect(upsRows.every((row) => !/1:300|不包税|包税/.test(row.channelName))).toBe(true);

    const batteryRows = rows.filter((row) => row.sourceSheetName === '欧洲海运电池快递专线');
    expect(batteryRows.length).toBeGreaterThan(0);
    expect(batteryRows.every((row) => row.channelName === '欧洲海运电池快递专线 - 欧洲海运电池快递专线')).toBe(true);
    expect(batteryRows.every((row) => !/系统下单渠道|备注|包装要求/.test(row.channelName))).toBe(true);
  });

  it('splits Chihan UK rows from the Europe Express price pool', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['UPS英国海运双清-1:300减0.5'],
      ['渠道', '5KG+', '11KG+', '21KG+', '45KG+', '101KG+', '301KG+', '时效'],
      ['不包税', 20.2, 15.2, 8.2, 6.2, 5.2, 5.2, '正常开船后40-45天左右'],
      ['包税', 23, 18, 11, 9, 8, 8, '正常开船后40-45天左右'],
      ['卡车英国海运双清-头程费用不含派送费及托盘费'],
      ['渠道', '0CBM+', '', '10CBM+', '', '20CBM+', '', '时效'],
      ['不包税', 900, '', 880, '', 850, '', '正常开船后40-45天左右'],
      ['包税', 1120, '', 1100, '', 1070, '', '正常开船后40-45天左右']
    ]), '英国海运');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['UPS欧洲海运双清-1:300减0.5'],
      ['不包税', '', '', '', '', '', '', '', '包税'],
      ['国家', '5KG+', '11KG+', '21KG+', '45KG+', '101KG+', '301KG+', '', '5KG+', '11KG+', '21KG+', '45KG+', '101KG+', '301KG+'],
      ['德国', 17.8, 14.3, 8.8, 6.8, 6.3, 6.3, '', 19.3, 15.8, 10.3, 8.3, 7.8, 7.8],
      ['卢森堡 荷兰 比利时', 18.3, 14.8, 9.3, 7.3, 6.8, 6.8, '', 19.8, 16.3, 10.8, 8.8, 8.3, 8.3]
    ]), '非英海运');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const europeRows = await parsePriceWorkbookBuffer(buffer, '7.8-驰汉.xlsx', 'europeExpress', '驰汉');
    const ukRows = await parsePriceWorkbookBuffer(buffer, '7.8-驰汉.xlsx', 'ukExpress', '驰汉');

    expect(ukRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ destinationCountry: '英国', channelName: '英国海运 - UPS英国海运双清（不包税）', priceTierLabel: '21KG+', costPerKg: 8.2, minWeightKg: 21, maxWeightKg: 44.999 }),
      expect.objectContaining({ destinationCountry: '英国', channelName: '英国海运 - UPS英国海运双清（包税）', priceTierLabel: '101KG+', costPerKg: 8 }),
      expect.objectContaining({ destinationCountry: '英国', channelName: '英国海运 - 卡车英国海运双清（不包税）', priceTierLabel: '10CBM+', cbmPrice: 880, specialRemark: expect.stringContaining('头程参考价') })
    ]));
    expect(europeRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ destinationCountry: '荷兰', channelName: '非英海运 - UPS欧洲海运双清（包税）', priceTierLabel: '21KG+', costPerKg: 10.8 }),
      expect.objectContaining({ destinationCountry: '德国', channelName: '非英海运 - UPS欧洲海运双清（不包税）', priceTierLabel: '301KG+', minWeightKg: 301, maxWeightKg: 99999, costPerKg: 6.3 })
    ]));
    expect(ukRows.every((row) => row.destinationCountry === '英国' && /包税）$/.test(row.channelName))).toBe(true);
    expect(europeRows.every((row) => row.destinationCountry !== '英国' && /包税）$/.test(row.channelName))).toBe(true);
    await expect(parsePriceWorkbookBuffer(buffer, '7.8-驰汉.xlsx', 'amazon', '驰汉')).rejects.toThrow('仅适用于欧洲或英国空海运铁路快递查询');
  });

  it('filters Chihan UK results by tax inclusion without mixing tax statuses', async () => {
    const adminToken = await app.loginAs('admin');
    const imported = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '7.8-驰汉-税务筛选.xlsx',
        targetModule: 'ukExpress',
        agentShortName: '驰汉',
        rows: [
          { agentName: '驰汉', sourceSheetName: '英国海运', channelName: '英国海运 - UPS英国海运双清（包税）', realChannelName: 'UPS英国海运双清', businessRouteName: 'UPS英国海运双清（包税）', destinationCountry: '英国', minWeightKg: 21, maxWeightKg: 44.999, costPerKg: 11, priceTierLabel: '21KG+', currency: 'RMB' },
          { agentName: '驰汉', sourceSheetName: '英国海运', channelName: '英国海运 - UPS英国海运双清（不包税）', realChannelName: 'UPS英国海运双清', businessRouteName: 'UPS英国海运双清（不包税）', destinationCountry: '英国', minWeightKg: 21, maxWeightKg: 44.999, costPerKg: 8.2, priceTierLabel: '21KG+', currency: 'RMB' }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/uk-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '英国', channel: '海运', taxInclusion: 'EXCLUDED', chargeableWeightKg: 21 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toHaveLength(1);
        expect(response.body.query.destinationCountry).toBe('英国');
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '英国海运 - UPS英国海运双清（不包税）', costUnitPrice: 8.2 }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '英国', channel: '海运', chargeableWeightKg: 21 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '错误欧洲英国线路.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '驰汉',
        rows: [{ agentName: '驰汉', channelName: '英国海运', destinationCountry: '英国', minWeightKg: 1, maxWeightKg: 100, costPerKg: 10, currency: 'RMB' }]
      })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('不能写入欧洲价格池'));

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '错误英国欧洲线路.xlsx',
        targetModule: 'ukExpress',
        agentShortName: '驰汉',
        rows: [{ agentName: '驰汉', channelName: '德国海运', destinationCountry: '德国', minWeightKg: 1, maxWeightKg: 100, costPerKg: 10, currency: 'RMB' }]
      })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('只允许导入英国'));
  });

  it('does not expand European numeric postal regions into warehouse-code rows', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['系统下单渠道', '中欧意大利专线卡派含税', '', '', '', '中欧意大利专线卡派不包税', '', '', '备注', '时效'],
      ['国家/重量区间', '300KG+', '1000KG+', '2000KG+', '', '300KG+', '1000KG+', '2000KG+', '', ''],
      ['10,12,13,14', 10.7, 10.2, 9.7, '', 9.7, 9.2, 8.7, '带尾板单询', '40-48天']
    ]), '意大利专线');

    const rows = await parsePriceWorkbookBuffer(
      Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' })),
      '7.3振韵.xls',
      'europeExpress'
    );

    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.destinationCountry === '意大利')).toBe(true);
    expect(rows.every((row) => row.postalRule === '10,12,13,14')).toBe(true);
    expect(rows.every((row) => row.warehouseCode === undefined)).toBe(true);
  });

  it('keeps Zhenyun Amazon, oversized-sea, and Europe-express price pools separate', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['系统下单渠道', '德国海运卡派包税', '', '', '', '德国海运卡派不包税', '', '', '备注', '时效'],
      ['国家/重量区间', '1-5CBM', '5.1-15CBM', '15.01CBM+', '', '1-5CBM', '5.1-15CBM', '15.01CBM+', '', ''],
      ['DTM1、DTM2', 1220, 1200, 1200, '', 990, 950, 950, '每周2水船', '40-48天（开船-提取）'],
      ['系统下单渠道', '德国海运亚马逊卡派包税', '', '', '', '德国海运亚马逊卡派不包税', '', '', '备注', '时效'],
      ['国家/重量区间', '15KG+', '50KG+', '100KG+', '', '15KG+', '50KG+', '100KG+', '', ''],
      ['DTM1、DTM2', 9.3, 7.3, 6.3, '', 8.3, 6.3, 5.3, '每周2水船', '40-48天（开船-提取）']
    ]), '德国海运直送和卡派');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['系统下单渠道', '', '', '', '', '欧洲海运普货超大件', '', '', '', '', '', '', '', '', '', '备注'],
      ['国家', '分区', '邮编（偏远和岛屿不走）', '', '', '30KG+', '50KG+', '100KG+', '200KG+', '300KG+', '501KG+', '1001KG+', '1501KG+', '2001KG+', '3000KG+'],
      ['德国', 'A', '20 22 33', '', '', 16.6, 14.3, 11.7, 11.2, 10.2, 9.7, 9.6, 8.7, 8.5, 8.1, '开船30-40天提取'],
      ['', 'B', '01 04 06', '', '', 19.9, 17.2, 13.2, 12.2, 11.7, 10.9, 10.1, 9.7, 8.7, 8.7],
      ['荷兰、比利时、卢森堡', 'A', '全境', '', '', 15.7, 13.6, 11.2, 10.1, 9.8, 9.6, 9.5, 8.7, 8.4, 8.4]
    ]), '欧洲海运普货超大件专线');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['欧洲空派普货快递专线（大陆直飞）'],
      ['目的地', '21-45KG', '46-99KG', '100-999KG', '1000KG+', '参考时效起飞6-8天提取'],
      ['德国', 49, 47, 45, 45],
      ['法国、意大利（10000-50999）、比利时', 52, 50, 48, 48],
      ['希腊、意大利-其他', 54, 52, 50, 50],
      ['欧洲空派普货快递专线（大陆转飞）'],
      ['目的地', '21-45KG', '46-99KG', '100-999KG', '1000KG+', '参考时效装车12-15天提取'],
      ['德国', 39, 37, 35, 35]
    ]), '欧洲空派快递派');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xls' }));

    const amazonRows = await parsePriceWorkbookBuffer(buffer, '7.3振韵.xls', 'amazon', '振韵');
    const inquiryRows = await parsePriceWorkbookBuffer(buffer, '7.3振韵.xls', 'inquiry', '振韵');
    const expressRows = await parsePriceWorkbookBuffer(buffer, '7.3振韵.xls', 'europeExpress', '振韵');

    expect(amazonRows.every((row) => row.sourceSheetName === '德国海运直送和卡派' && row.warehouseCode && !row.postalRule)).toBe(true);
    expect(amazonRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ warehouseCode: 'DTM1', channelName: '德国海运直送和卡派 - 德国海运卡派包税', priceTierLabel: '1-5CBM', cbmPrice: 1220, transitLabel: expect.stringContaining('40-48天') }),
      expect.objectContaining({ warehouseCode: 'DTM2', channelName: '德国海运直送和卡派 - 德国海运亚马逊卡派包税', priceTierLabel: '15KG+', minWeightKg: 15, maxWeightKg: 49.999, costPerKg: 9.3 })
    ]));

    expect(inquiryRows.every((row) => row.sourceSheetName === '欧洲海运普货超大件专线' && !row.warehouseCode)).toBe(true);
    expect(inquiryRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ destinationCountry: '德国', postalRule: '20 22 33', channelName: '欧洲海运普货超大件专线 - 欧洲海运普货超大件', priceTierLabel: '30KG+', maxWeightKg: 49.999, transitLabel: expect.stringContaining('30-40天') }),
      expect.objectContaining({ destinationCountry: '荷兰', postalRule: '全境' })
    ]));
    expect(matchesEuropeanPostalRule('20 22 33', '20100')).toBe(true);
    expect(matchesEuropeanPostalRule('20 22 33', '99100')).toBe(false);
    expect(matchesEuropeanPostalRule('全境', '99999')).toBe(true);

    expect(expressRows.every((row) => row.sourceSheetName === '欧洲空派快递派' && !row.warehouseCode)).toBe(true);
    expect(expressRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ destinationCountry: '意大利', postalRule: '10000-50999', channelName: '欧洲空派快递派 - 欧洲空派普货快递专线（大陆直飞）', priceTierLabel: '46-99KG', minWeightKg: 46, maxWeightKg: 99, costPerKg: 50, transitLabel: expect.stringContaining('6-8天') }),
      expect.objectContaining({ destinationCountry: '意大利', postalRule: '其他10000-50999', channelName: '欧洲空派快递派 - 欧洲空派普货快递专线（大陆直飞）' }),
      expect.objectContaining({ destinationCountry: '德国', channelName: '欧洲空派快递派 - 欧洲空派普货快递专线（大陆转飞）', transitLabel: expect.stringContaining('12-15天') })
    ]));
    expect(matchesEuropeanPostalRule('10000-50999', '20100')).toBe(true);
    expect(matchesEuropeanPostalRule('10000-50999', '60100')).toBe(false);
    expect(matchesEuropeanPostalRule('其他10000-50999', '60100')).toBe(true);
  });

  it('keeps TPD route hierarchy, Canadian regions, and warehouse codes separate', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['TPD-加拿大直航经济线（包税）'],
      ['TPD-加拿大直航海卡经济 下单渠道：TPD-加拿大直航卡派经济'],
      ['国家分区', '仓库分区', '21KG+', '100KG+', '船期', '参考时效'],
      ['加拿大东部', '多伦多（YYZ/YHM1/YOO1/YDC5/XYY4）', 8.75, 7.75, '多伦多清关', '开船后40-45自然日派送'],
      ['', '多伦多（YGK1/YXU1）', 8.95, 7.95, '多伦多清关', ''],
      ['加拿大西部', '温哥华（YVR/YXX2）', 9.19, 8.19, '卡尔加里清关', '开船后40-45自然日派送'],
      ['TPD-加拿大直航海派经济（快递派） 下单渠道：TPD-加拿大直航海派经济'],
      ['国家分区', '仓库分区', '21KG+', '100KG+', '船期', '参考时效'],
      ['加拿大东部', '多伦多（YYZ/YHM1/YOO1/YDC5/XYY4）', 12.58, 11.58, '多伦多清关', '开船后40-45自然日派送']
    ]), 'TPD-加拿大直航经济线');

    const rows = await parsePriceWorkbookBuffer(
      Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' })),
      '加拿大报价.xlsx',
      'canadaAirSea',
      '拓普达'
    );

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channelName: 'TPD-加拿大直航经济线-TPD-加拿大直航海卡经济',
        realChannelName: 'TPD-加拿大直航经济线-TPD-加拿大直航海卡经济',
        businessRouteName: 'TPD-加拿大直航卡派经济',
        destinationCountry: '加拿大东部',
        warehouseCode: 'XYY4',
        minWeightKg: 21,
        maxWeightKg: 99.999,
        costPerKg: 8.75
      }),
      expect.objectContaining({
        channelName: 'TPD-加拿大直航经济线-TPD-加拿大直航海派经济（快递派）',
        destinationCountry: '加拿大东部',
        warehouseCode: 'YHM1',
        minWeightKg: 100,
        maxWeightKg: 99999,
        costPerKg: 11.58
      }),
      expect.objectContaining({
        destinationCountry: '加拿大西部',
          warehouseCode: 'YXX2',
        costPerKg: 9.19
      })
    ]));
    expect(rows.every((row) => !/系统下单渠道|仓库分区/.test(row.realChannelName ?? ''))).toBe(true);
  });

  it('parses TPD US air-sea ZIP regions and source weight tiers by the USA module contract', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['美国空运价格表'],
      ['美国六日提空派专线'],
      ['区域/重量', '12KG+', '45KG+', '101KG+', '渠道说明', '限时赔付', '备注'],
      ['美西（邮编80000-99999）', 64, 60, 55, '洛杉矶机场直飞', '', '下单渠道：美国空运六日提'],
      ['美中（邮编40000-79999）', 66, 62, 57, '芝加哥机场直飞', '', ''],
      ['美东（邮编00000-39999）', 67, 63, 58, '纽约机场直飞', '', ''],
      ['美国十日提空派专线'],
      ['区域/重量', '12KG+', '45KG+', '101KG+', '渠道说明', '限时赔付', '备注'],
      ['美西（邮编80000-99999）', 61, 58, 53, '洛杉矶机场直飞', '', '下单渠道：美国空运十日提']
    ]), '美国空运专线');

    const rows = await parsePriceWorkbookBuffer(
      Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' })),
      '拓普达美国报价.xlsx',
      'usaAirSea',
      '拓普达'
    );

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        agentName: '拓普达',
        channelName: '美国空运专线-美国六日提空派专线',
        businessRouteName: '美国六日提空派专线',
        destinationCountry: '美国',
        postalRule: '80000-99999',
        minWeightKg: 12,
        maxWeightKg: 44.999,
        costPerKg: 64
      }),
      expect.objectContaining({
        channelName: '美国空运专线-美国六日提空派专线',
        postalRule: '80000-99999',
        minWeightKg: 45,
        maxWeightKg: 100.999,
        costPerKg: 60
      }),
      expect.objectContaining({
        channelName: '美国空运专线-美国十日提空派专线',
        postalRule: '80000-99999',
        minWeightKg: 101,
        maxWeightKg: 99999,
        costPerKg: 53
      })
    ]));
    expect(rows.filter((row) => row.postalRule === '80000-99999')).toHaveLength(6);
    expect(rows.every((row) => row.destinationCountry === '美国')).toBe(true);
    expect(matchUsPostalRule('80000-99999', '80000')).toBeDefined();
    expect(matchUsPostalRule('80000-99999', '99999')).toBeDefined();
    expect(matchUsPostalRule('80000-99999', '60750')).toBeUndefined();
    expect(matchUsPostalRule('8-9', '90155')).toBeDefined();
    expect(matchUsPostalRule('8-96', '96999')).toBeDefined();
    expect(matchUsPostalRule('8-96', '97000')).toBeUndefined();
    expect(matchUsPostalRule('8-9-10', '10001')).toBeDefined();
    expect(matchUsPostalRule('8-9-10', '70000')).toBeUndefined();
  });

  it('uses one Topuda profile but writes only the selected warehouse or ZIP branch', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['TPD-加拿大直航经济线（包税）'],
      ['TPD-加拿大直航海卡经济 下单渠道：TPD-加拿大直航卡派经济'],
      ['国家分区', '仓库分区', '21KG+', '100KG+', '参考时效'],
      ['加拿大东部', 'YYZ1-YYZ9, YYZ1+YYZ2+YYZ3, YYZ', 8.75, 7.75, '开船后40-45自然日派送']
    ]), 'TPD-加拿大直航经济线');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['美国空运价格表'],
      ['美国六日提空派专线'],
      ['区域/重量', '12KG+', '45KG+', '101KG+', '参考时效'],
      ['美西（邮编8-9）', 64, 60, 55, '当天18点前入库后3-6个自然日交付；超过13天赔付']
    ]), '美国空运专线');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const amazonRows = await parsePriceWorkbookBuffer(buffer, '7.6-拓普达.xlsx', 'amazon', '拓普达');
    const usaRows = await parsePriceWorkbookBuffer(buffer, '7.6-拓普达.xlsx', 'usaAirSea', '拓普达');

    expect(amazonRows.length).toBeGreaterThan(0);
    expect(amazonRows.every((row) => row.warehouseCode && !row.postalRule)).toBe(true);
    expect(amazonRows.some((row) => row.warehouseCode === 'YYZ4' && row.minWeightKg === 21 && row.maxWeightKg === 99.999)).toBe(true);
    expect(usaRows).toHaveLength(3);
    expect(usaRows.every((row) => !row.warehouseCode && row.postalRule === '8-9')).toBe(true);
    expect(usaRows.find((row) => row.minWeightKg === 12)?.transitLabel).toBe('当天18点前入库后3-6个自然日交付');
  });

  it('imports Topuda US sea courier summaries and retains warehouse summaries for Amazon without polluting the Canada pool', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['TPD-加拿大直航经济线（包税）'],
      ['TPD-加拿大直航海卡经济 下单渠道：TPD-加拿大直航卡派经济'],
      ['国家分区', '仓库分区', '21KG+', '100KG+', '参考时效'],
      ['加拿大东部', 'YYZ1', 8.75, 7.75, '开船后40-45自然日派送']
    ]), 'TPD-加拿大直航经济线');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['对应渠道', '仓库编码', '12KG+', '51KG+', '100KG+', '1CBM+ 按方包税', '参考时效'],
      ['TPD-加拿大直航卡派经济', 'YYZ1', 9, 8, 7, 1200, '35-40自然日派送'],
      ['TPD-S4 美西组合海卡', 'ONT8', 7, 6, 5, 1000, '20-25自然日派送']
    ]), '仓库渠道汇总表');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['渠道', '起始ZIP', '结束ZIP', '分区名', '12KG+', '71KG+', '100KG+'],
      ['TPD-RS8-特快美森快递派', 80000, 95999, '80000-95999', 17.18, 16.98, 14.98],
      ['TPD-RS8-特快美森快递派', 0, 29999, '00000-29999', 19.68, 19.48, 17.48],
      ['TPD-RS5 超大件快递派（OA）', 50000, 79999, '50000-79999', 26.8, 25.8, 23.8]
    ]), '快递渠道汇总表');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['TPD-RS5 超大件快递派（OA）', null, null, null, null, null, null, 'TPD-RS8-特快美森快递派'],
      ['美国分区（邮编）', '25KG-40KG', '41KG-100KG', '101KG+', null, '备注', null, '12KG+', '71KG+', '100KG+', '拆柜后提取时效'],
      ['美国西部（8-96）', 25.8, 24.8, 22.8, null, '单箱重量在40-65KG，FedEx派送', null, 17.18, 16.98, 14.98, '12天左右提取'],
      ['美国中部（7-5-97-98-99）', 26.8, 25.8, 23.8, null, null, null, 18.68, 18.48, 16.48, null],
      ['3（邮编）', 27.8, 26.8, 24.8, null, null, null, 20.28, 20.08, 18.08, null]
    ]), 'RS6-RS8美国海派包税专线');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const usaRows = await parsePriceWorkbookBuffer(buffer, '7.6-拓普达.xlsx', 'usaAirSea', '拓普达');
    const amazonRows = await parsePriceWorkbookBuffer(buffer, '7.6-拓普达.xlsx', 'amazon', '拓普达');
    const canadaRows = await parsePriceWorkbookBuffer(buffer, '7.6-拓普达.xlsx', 'canadaAirSea', '拓普达');

    expect(usaRows).toHaveLength(18);
    expect(usaRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        agentName: '拓普达',
        sourceSheetName: 'RS6-RS8美国海派包税专线',
        channelName: '美国海运专线-TPD-RS8-特快美森快递派',
        businessRouteName: 'TPD-RS8-特快美森快递派',
        postalRule: '8-96',
        minWeightKg: 12,
        maxWeightKg: 50.999,
        costPerKg: 17.18
      }),
      expect.objectContaining({ channelName: '美国海运专线-TPD-RS5 超大件快递派（OA）', postalRule: '8-96', minWeightKg: 25, maxWeightKg: 40, costPerKg: 25.8, specialRemark: expect.stringContaining('单箱重量') }),
      expect.objectContaining({ channelName: '美国海运专线-TPD-RS8-特快美森快递派', postalRule: '8-96', minWeightKg: 12, costPerKg: 17.18, transitLabel: '12天左右提取' }),
      expect.objectContaining({ channelName: '美国海运专线-TPD-RS8-特快美森快递派', postalRule: '3-3', minWeightKg: 12, costPerKg: 20.28 })
    ]));
    expect(matchUsPostalRule('80000-95999', '90001')).toBeDefined();
    expect(matchUsPostalRule('80000-95999', '79999')).toBeUndefined();

    expect(amazonRows).toEqual(expect.arrayContaining([
      expect.objectContaining({ channelName: 'TPD-加拿大直航卡派经济', warehouseCode: 'YYZ1', destinationCountry: '加拿大', minWeightKg: 12, costPerKg: 9 }),
      expect.objectContaining({ channelName: 'TPD-S4 美西组合海卡', warehouseCode: 'ONT8', destinationCountry: '美国', minWeightKg: 51, costPerKg: 6 }),
      expect.objectContaining({ channelName: 'TPD-S4 美西组合海卡', warehouseCode: 'ONT8', destinationCountry: '美国', cbmPrice: 1000 })
    ]));
    expect(canadaRows).toEqual([
      expect.objectContaining({ channelName: 'TPD-加拿大直航经济线-TPD-加拿大直航海卡经济', warehouseCode: 'YYZ1', destinationCountry: '加拿大东部' }),
      expect.objectContaining({ channelName: 'TPD-加拿大直航经济线-TPD-加拿大直航海卡经济', warehouseCode: 'YYZ1', destinationCountry: '加拿大东部', minWeightKg: 100 })
    ]);
  });

  it('scans every Topuda US FBA sea-rate tab instead of stopping after the first small sheet', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['TPD-M8/M7美森海卡专线'],
      ['目的地', '12+(包税)', '1CBM+ 按方包税', null, null, null, '12+(包税)', '1CBM+ 按方包税', null, '渠道说明'],
      ['亚马逊FBA代码', 'M8美森正班', null, null, '下单渠道：\nTPD-M8', null, 'M7美森加班', null, null, '下单渠道：\nTPD-M7'],
      ['ONT8/LGB8', 10.38, 2179.8, null, null, null, 9.88, 2074.8, null, null]
    ]), 'M8-M7美森专线');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['TPD-Q8休斯顿专线'],
      ['亚马逊FBA代码', '目的港', '12KG+', '51KG+', '1CBM+ 按方包税', '渠道说明'],
      ['HOU8/HOU7', '休斯顿', 7.67, 7.17, 1505.7, '下单渠道：\nTPD-Q8\n航程时效28-33天']
    ]), 'Q8-休斯顿专线');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));
    const rows = await parsePriceWorkbookBuffer(buffer, '7.6-拓普达.xlsx', 'amazon', '拓普达');

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceSheetName: 'M8-M7美森专线', channelName: 'TPD-M8 美森正班', warehouseCode: 'ONT8', minWeightKg: 12, priceTierLabel: '12KG+', costPerKg: 10.38 }),
      expect.objectContaining({ sourceSheetName: 'M8-M7美森专线', channelName: 'TPD-M7 美森加班', warehouseCode: 'LGB8', cbmPrice: 2074.8 }),
      expect.objectContaining({ sourceSheetName: 'Q8-休斯顿专线', channelName: 'TPD-Q8休斯顿专线', warehouseCode: 'HOU8', minWeightKg: 51, costPerKg: 7.17, transitLabel: expect.stringContaining('28-33天') })
    ]));
    expect(new Set(rows.map((row) => row.sourceSheetName))).toEqual(new Set(['M8-M7美森专线', 'Q8-休斯顿专线']));
  });

  it('parses Paige air express as USA-only postal pricing with its original tiers and delivery time', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['以下空运所有渠道后端随机选派，指定UPS派送+1元/KG'],
      ['渠道名称', '分区', '华南（深圳/广州/东莞/中山）', '', '', '', '其它相关费用', '时效赔付'],
      ['', '', '10KG+', '21KG+', '71KG+', '101KG+', '', ''],
      ['大陆直飞\nUPS/FedEx派送', '美西-邮编8-9', 56.7, 54.7, 53.7, 51.7, '磁检费+480元/票', '交货次日8个自然日提取，第9个自然日开始提取按1RMB/KG/天赔付'],
      ['美中-邮编4.5.6.7开头', '美中-邮编5-7（98000-99999）', 58.2, 56.2, 55.2, 53.2, '', ''],
      ['美东-邮编0.1.2.3开头', '美东-邮编0-4', 59.2, 57.2, 56.2, 54.2, '', '']
    ]), '空运快递派');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['对应渠道', '仓库编码', '50KG+'],
      ['ORD-FBA', 'MDW2', 23]
    ]), 'FBA卡派汇总');
    const rows = await parsePriceWorkbookBuffer(
      Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xls' })),
      '7-9派格.xls',
      'usaAirSea',
      '派格'
    );

    expect(rows).toHaveLength(12);
    expect(rows.every((row) => !row.warehouseCode && row.destinationCountry === '美国')).toBe(true);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channelName: '空运快递派 - 大陆直飞 UPS/FedEx派送',
        businessRouteName: '大陆直飞 UPS/FedEx派送',
        postalRule: '美西-邮编8-9',
        priceTierLabel: '10KG+',
        minWeightKg: 10,
        maxWeightKg: 20.999,
        costPerKg: 56.7,
        transitDays: 8,
        transitLabel: expect.stringContaining('8个自然日')
      }),
      expect.objectContaining({
        channelName: '空运快递派 - 大陆直飞 UPS/FedEx派送',
        postalRule: '美西-邮编8-9',
        priceTierLabel: '71KG+',
        minWeightKg: 71,
        maxWeightKg: 100.999,
        costPerKg: 53.7
      }),
      expect.objectContaining({
        postalRule: '美中-邮编5-7（98000-99999）',
        priceTierLabel: '101KG+',
        minWeightKg: 101,
        maxWeightKg: 99999,
        costPerKg: 53.2
      })
    ]));
    expect(matchUsPostalRule('美西-邮编8-9', '90001')).toBeDefined();
    expect(matchUsPostalRule('美中-邮编5-7（98000-99999）', '60000')).toBeDefined();
    expect(matchUsPostalRule('美中-邮编5-7（98000-99999）', '98001')).toBeDefined();
    expect(matchUsPostalRule('美中-邮编5-7（98000-99999）', '80000')).toBeUndefined();
  });

  it('allows admin and market to maintain pricing while stripping internal price fields for operator lookup', async () => {
    const adminToken = await app.loginAs('admin');
    const marketToken = await app.loginAs('market');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(marketToken))
      .expect(200);

    const channelRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '权限测试代理', channelName: '权限测试海运专线', markupPerKg: 3, enabled: true })
      .expect(201);
    expect(channelRule.body.channelName).toBe('权限测试海运专线');

    const lineRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(marketToken))
      .send({ agentName: '权限测试代理', channelName: 'DHL HK 权限', realChannelName: 'DHL权限代理', markupPerKg: 2, enabled: true })
      .expect(201);
    expect(lineRule.body.realChannelName).toBe('DHL权限代理');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(marketToken))
      .send({
        fileName: 'DHL线路测试价格表.xls',
        targetModule: 'europeExpress',
        agentShortName: '权限测试代理',
        rows: [
          {
            agentName: '权限测试代理',
            carrierName: 'DHL',
            sourceSheetName: 'DHL测试小表',
            channelName: 'DHL HK 权限',
            businessRouteName: 'HK-DHL',
            realChannelName: 'DHL权限代理',
            destinationCountry: '美国',
            minWeightKg: 0,
            maxWeightKg: 20,
            costPerKg: 20,
            currency: 'RMB',
            transitDays: 5,
            transitLabel: '4-7 天'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(marketToken))
      .send({
        fileName: '虚拟默认加价删除测试.xls',
        targetModule: 'europeExpress',
        agentShortName: '虚拟删除代理',
        rows: [
          {
            agentName: '虚拟删除代理',
            carrierName: 'DHL',
            sourceSheetName: '虚拟删除',
            channelName: '虚拟删除线路',
            businessRouteName: '虚拟删除线路',
            realChannelName: '虚拟删除真实线路',
            destinationCountry: '美国',
            minWeightKg: 0,
            maxWeightKg: 20,
            costPerKg: 20,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ agentName: '虚拟删除代理' })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-delete')
      .set('Authorization', app.auth(adminToken))
      .send({ agentNames: ['虚拟删除代理'] })
      .expect(201)
      .expect((response) => {
        expect(response.body.successCount).toBe(1);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ agentName: '虚拟默认加价删除测试' })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '美国', chargeableWeightKg: 10, amazonCode: 'AMZ-US-001' })
      .expect(201)
      .expect((response) => {
        expect(JSON.stringify(response.body)).not.toContain('costPerKg');
        expect(JSON.stringify(response.body)).not.toContain('grossProfit');
        expect(JSON.stringify(response.body)).not.toContain('权限测试代理');
        expect(JSON.stringify(response.body)).not.toContain('DHL HK 权限');
        expect(JSON.stringify(response.body)).not.toContain('DHL权限代理');
        const publicRecommendation = response.body.recommendations.find((item: any) => item.channelName === '权限');
        expect(publicRecommendation.totalSales).toBe(220);
      });

    const batchRules = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-upsert')
      .set('Authorization', app.auth(marketToken))
      .send({
        rows: [
          { agentName: '权限测试代理', channelName: 'DHL HK 权限', realChannelName: 'DHL权限代理', markupPerKg: 4, enabled: true },
          { agentName: '权限测试代理', channelName: 'DHL HK 权限', realChannelName: 'DHL权限代理', destinationCountry: '美国', markupPerKg: 1.5, enabled: true }
        ]
      })
      .expect(201);
    expect(batchRules.body.successCount).toBe(2);
    expect(batchRules.body.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: lineRule.body.id, markupValue: 4 }),
      expect.objectContaining({ destinationCountry: '美国', markupValue: 1.5 })
    ]));
    const countryRule = batchRules.body.rows.find((rule: any) => rule.destinationCountry === '美国');

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '批量冲突代理', channelName: '重复线路', realChannelName: '重复真实线路', destinationCountry: '法国', priority: 100, markupPerKg: 0.5, enabled: true })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '批量冲突代理', channelName: '重复线路', realChannelName: '重复真实线路', destinationCountry: '法国', priority: 101, markupPerKg: 0.6, enabled: true })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-upsert')
      .set('Authorization', app.auth(marketToken))
      .send({
        rows: [
          { agentName: '批量冲突代理', channelName: '重复线路', realChannelName: '重复真实线路', destinationCountry: '法国', priority: 100, markupPerKg: 0.1, enabled: true }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.successCount).toBe(1);
        expect(response.body.errorRows).toEqual([]);
        expect(response.body.rows[0].markupValue).toBe(0.1);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-status')
      .set('Authorization', app.auth(marketToken))
      .send({ agentNames: ['权限测试代理'], enabled: false })
      .expect(201)
      .expect((response) => {
        expect(response.body.successCount).toBeGreaterThanOrEqual(3);
        expect(response.body.rows.every((rule: any) => rule.enabled === false)).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-delete')
      .set('Authorization', app.auth(adminToken))
      .send({ ids: [countryRule.id] })
      .expect(201)
      .expect((response) => {
        expect(response.body.successCount).toBe(1);
      });

    await request(app.getHttpServer())
      .delete(`/api/pricing/markup-rules/${lineRule.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(lineRule.body.id));

    await request(app.getHttpServer())
      .delete(`/api/pricing/markup-rules/${channelRule.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(channelRule.body.id));

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const ids = response.body.rows.map((rule: any) => rule.id);
        expect(ids).not.toContain(lineRule.body.id);
        expect(ids).not.toContain(channelRule.body.id);
      });
  });

  it('maintains channel pricing rules and generates shipment fees from rule quotes', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .get('/api/pricing/rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ channelId: 'ch-dhl-hk', destinationCountry: '美国' })]));
      });

    const rule = await request(app.getHttpServer())
      .post('/api/pricing/rules')
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', destinationCountry: '美国', minWeightKg: 20, maxWeightKg: 30, ratePerKg: 9, currency: 'USD' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/rules/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', destinationCountry: '美国', chargeableWeightKg: 24 })
      .expect(201)
      .expect((response) => {
        expect(response.body.rule.id).toBe(rule.body.id);
        expect(response.body.exchangeRate).toBe(7.245);
        expect(response.body.freight).toBe(1564.92);
        expect(response.body.fuel).toBe(234.74);
        expect(response.body.surchargeTotal).toBeGreaterThanOrEqual(50);
        expect(response.body.total).toBeGreaterThan(1800);
      });

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'M8-FEE-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 24,
        agentWeightKg: 20,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/fees/generate`)
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body.receivables.map((fee: { name: string }) => fee.name)).toEqual(['基础运费', '燃油费', '附加费']);
        expect(response.body.receivableTotal).toBeGreaterThan(1800);
      });

    await request(app.getHttpServer())
      .put(`/api/pricing/rules/${rule.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/rules/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ channelId: 'ch-dhl-hk', destinationCountry: '美国', chargeableWeightKg: 24 })
      .expect(400);

    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/pricing/rules')
      .set('Authorization', app.auth(customerToken))
      .expect(403);
  });

  it('persists imported price books with remarks and admin-only management', async () => {
    const adminToken = await app.loginAs('admin');

    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '缺少所属代理.xlsx',
        targetModule: 'amazon',
        rows: [
          { agentName: 'Excel原始代理', channelName: '测试渠道', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 100, costPerKg: 10, currency: 'RMB' }
        ]
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('请选择所属代理');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '缺少查价模块.xlsx',
        agentShortName: '规则保留代理',
        rows: [
          { agentName: 'Excel原始代理', channelName: '测试渠道', destinationCountry: '美国', minWeightKg: 0, maxWeightKg: 100, costPerKg: 10, currency: 'RMB' }
        ]
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('请选择本次导入适用的查价模块');
      });

    const imported = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '测试价格表.xlsx',
        targetModule: 'amazon',
        agentShortName: '规则保留代理',
        rows: [
          {
            agentName: 'Excel原始代理',
            carrierName: '专线',
            channelName: '海运洛杉矶专线',
            realChannelName: '海运洛杉矶专线',
            warehouseCode: 'LAX9',
            destinationCountry: '美国',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 18,
            currency: 'RMB',
            transitDays: 22,
            transitLabel: '22-28 天'
          }
        ]
      })
      .expect(201);

    expect(imported.body.book.fileName).toBe('测试价格表.xlsx');
    expect(imported.body.book.agentShortName).toBe('规则保留代理');
    expect(imported.body.book.rowCount).toBe(1);
    expect(imported.body.rows).toHaveLength(0);
    const southAfricaImported = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '南非专线价格表.xlsx',
        targetModule: 'southAfrica',
        agentShortName: '规则保留代理',
        rows: [
          {
            agentName: 'Excel南非代理',
            channelName: '南非专线',
            destinationCountry: '南非',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 100,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);
    expect(southAfricaImported.body.book.agentShortName).toBe('规则保留代理');
    expect(southAfricaImported.body.book.legacyModuleCounts).toEqual({ southAfrica: 1 });
    await request(app.getHttpServer())
      .get(`/api/pricing/books/${imported.body.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0].priceBookId).toBe(imported.body.book.id);
        expect(response.body.rows[0].agentName).toBe('规则保留代理');
      });
    const markupRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '规则保留代理', markupPerKg: 0.9, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/pricing/books/${imported.body.book.id}/remark`)
      .set('Authorization', app.auth(adminToken))
      .send({ customRemark: '亚马逊卡派最长边 180CM-220CM' })
      .expect(200)
      .expect((response) => {
        expect(response.body.customRemark).toContain('最长边');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'LAX9', destinationCountry: '美国', weightBand: '100KG+', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({
          channelName: '海运洛杉矶专线',
          customRemark: expect.stringContaining('最长边')
        }));
        expect(response.body.selected.remark).toBeUndefined();
      });

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(operatorToken))
      .send({
        fileName: '业务员不能导入.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '越权代理',
        rows: [
          {
            agentName: '越权代理',
            channelName: '越权渠道',
            destinationCountry: '美国',
            minWeightKg: 0,
            maxWeightKg: 10,
            costPerKg: 10,
            currency: 'RMB'
          }
        ]
      })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/pricing/books/${imported.body.book.id}/remark`)
      .set('Authorization', app.auth(operatorToken))
      .send({ remark: '业务员不能改' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/pricing/books/${imported.body.book.id}`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/pricing/books/${imported.body.book.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.books).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: imported.body.book.id })]));
        expect(response.body.rows).not.toEqual(expect.arrayContaining([expect.objectContaining({ priceBookId: imported.body.book.id })]));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'agent:规则保留代理', agentName: '规则保留代理', ruleCount: 1 })]));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules?detail=true')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ id: markupRule.body.id, agentName: '规则保留代理' })]));
      });
  });

  it('imports a 5000-row price book through an async upload job without full rows payloads', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const workbook = xlsx.utils.book_new();
    const rows = [
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '参考时效'],
      ...Array.from({ length: 5000 }, (_, index) => [
        '大表代理',
        `海运测试渠道-${index}`,
        '美国',
        index,
        index + 1,
        18 + (index % 5),
        'RMB',
        '22-28 天'
      ])
    ];
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(rows), '价格表');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const uploadedFileName = '大价格表.xlsx';
    const multipartFileName = Buffer.from(uploadedFileName, 'utf8').toString('latin1');
    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'europeExpress')
      .field('agentShortName', '大表代理')
      .attach('file', buffer, { filename: multipartFileName, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201)
      .expect((response) => {
        expect(response.body.job.status).toBe('PENDING');
        expect(response.body.job.fileName).toBe(uploadedFileName);
        expect(response.body.job.book).toBeUndefined();
      });

    let job = started.body.job;
    for (let attempt = 0; attempt < 80 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');
    expect(job.processedRows).toBe(5000);
    expect(job.book.rowCount).toBe(5000);

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/download`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect('content-type', /spreadsheetml/)
      .expect('content-disposition', /filename\*=UTF-8''%E5%A4%A7%E4%BB%B7%E6%A0%BC%E8%A1%A8\.xlsx/)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect((response) => {
        expect(Buffer.compare(response.body, buffer)).toBe(0);
      });

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/download`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.books).toEqual(expect.arrayContaining([expect.objectContaining({ id: job.book.id, rowCount: 5000 })]));
        expect(response.body.rows).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=100`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toHaveLength(100);
        expect(response.body.pagination.totalItems).toBe(5000);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/sync-health?page=1&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.length).toBeLessThanOrEqual(20);
        expect(response.body.stats.lines).toBeGreaterThanOrEqual(5000);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules?includeHits=false')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.metrics.unmatchedQuotes).toBe(0);
        expect(JSON.stringify(response.body)).not.toContain('海运测试渠道-4999');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', chargeableWeightKg: 100.5, amazonCode: 'AMZ-US-001' })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations.length).toBeGreaterThan(0);
        expect(response.body.recommendations[0].salesRatePerKg).toBeGreaterThan(response.body.recommendations[0].price.costPerKg);
      });
  });

  it('imports pricing transit time from sheet-level 时效 notes without polluting remarks', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种'],
      ['时效代理', '美西海卡', '美国', 100, 99999, 18, 'RMB'],
      ['渠道说明', '航程时效28-33天']
    ]), '海运价格表');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['时效：28至33天'],
      ['超长件需提前确认']
    ]), '特别说明');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'inquiry')
      .field('agentShortName', '无时效代理')
      .attach('file', buffer, { filename: Buffer.from('时效价格表.xlsx', 'utf8').toString('latin1'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual([
          expect.objectContaining({
            transitDays: 28,
            transitLabel: '时效28-33天',
            specialRemark: expect.stringContaining('超长件需提前确认')
          })
        ]);
        expect(response.body.rows[0].specialRemark).toContain('航程时效28-33天');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '美国', chargeableWeightKg: 120 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual(expect.arrayContaining([
          expect.objectContaining({
            transitLabel: '时效28-33天',
            price: expect.objectContaining({ transitLabel: '时效28-33天' })
          })
        ]));
        const importedRecommendation = response.body.recommendations.find((item: { transitLabel?: string }) => item.transitLabel === '时效28-33天');
        expect(importedRecommendation.price.costPerKg).toBeUndefined();
        expect(importedRecommendation.grossProfit).toBeUndefined();
      });
  });

  it('imports 振韵 horizontal price book channel requirements per small table into book rows', async () => {
    const adminToken = await app.loginAs('admin');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
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
    ]), '深圳振韵欧洲快递');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'europeExpress')
      .field('agentShortName', '振韵')
      .attach('file', buffer, { filename: Buffer.from('7.3振韵.xlsx', 'utf8').toString('latin1'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const upsRow = response.body.rows.find((row: { channelName: string }) => row.channelName.includes('UPS红单渠道'));
        const dhlRow = response.body.rows.find((row: { channelName: string }) => row.channelName.includes('DHL经济渠道'));
        expect(upsRow.specialRemark).toContain('UPS超标准附加费');
        expect(upsRow.specialRemark).toContain('托盘数计算方法');
        expect(upsRow.specialRemark).toContain('磁检');
        expect(upsRow.specialRemark).toContain('不含税查验费');
        expect(upsRow.specialRemark).toContain('单件最低计费重');
        expect(upsRow.specialRemark).toContain('关税递延');
        expect(upsRow.specialRemark).toContain('反倾销品类不接');
        expect(upsRow.specialRemark).toContain('收件人接收超大件');
        expect(upsRow.specialRemark).toContain('燃油附加13%');
        expect(upsRow.transitLabel).toBe('6-8天');
        expect(upsRow.transitDays).toBe(6);
        expect(upsRow.specialRemark).not.toContain('拒收件');
        expect(upsRow.specialRemark).not.toContain('整车可装');
        expect(dhlRow.specialRemark).toContain('整车可装');
        expect(dhlRow.specialRemark).toContain('拒收件');
        expect(dhlRow.specialRemark).toContain('不含税查验费');
        expect(dhlRow.specialRemark).toContain('单件最低计费重');
        expect(dhlRow.specialRemark).toContain('关税递延');
        expect(dhlRow.specialRemark).toContain('反倾销品类不接');
        expect(dhlRow.specialRemark).toContain('收件人接收超大件');
        expect(dhlRow.specialRemark).toContain('燃油附加13%');
        expect(dhlRow.specialRemark).not.toContain('磁检');
      });

    const topdaWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(topdaWorkbook, xlsx.utils.aoa_to_sheet([
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
    ]), 'TPD-加拿大直航快线');
    const topdaBuffer = Buffer.from(xlsx.write(topdaWorkbook, { type: 'array', bookType: 'xlsx' }));
    const topdaStarted = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'inquiry')
      .field('agentShortName', '拓普达')
      .attach('file', topdaBuffer, { filename: Buffer.from('7.6-拓普达.xlsx', 'utf8').toString('latin1'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    let topdaJob = topdaStarted.body.job;
    for (let attempt = 0; attempt < 40 && topdaJob.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${topdaStarted.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      topdaJob = current.body.job;
    }
    expect(topdaJob.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${topdaJob.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.length).toBeGreaterThan(0);
        expect(response.body.rows.every((row: any) => row.transitLabel === '开船后35-40自然日派送')).toBe(true);
        expect(response.body.rows.every((row: any) => row.transitDays === 35)).toBe(true);
        expect(response.body.rows.every((row: any) => row.specialRemark?.includes('渠道说明：义乌交货+0.5/KG'))).toBe(true);
        expect(response.body.rows.every((row: any) => row.specialRemark?.includes('常见产品加收'))).toBe(true);
        expect(response.body.rows.every((row: any) => row.specialRemark?.includes('加拿大的UPS偏远分区'))).toBe(true);
        expect(response.body.rows.every((row: any) => !row.specialRemark?.includes('赔偿说明'))).toBe(true);
        expect(response.body.rows.every((row: any) => !row.specialRemark?.includes('丢件赔偿'))).toBe(true);
        expect(response.body.rows.every((row: any) => !row.specialRemark?.includes('最高补偿'))).toBe(true);
        expect(response.body.rows.every((row: any) => row.specialRemark?.includes('免责声明'))).toBe(true);
        expect(response.body.rows.every((row: any) => row.specialRemark?.includes('特别声明'))).toBe(true);
        expect(response.body.rows.every((row: any) => !row.specialRemark?.includes('DISPIMG'))).toBe(true);
      });

    const oversizedWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(oversizedWorkbook, xlsx.utils.aoa_to_sheet([
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
    ]), '欧洲海运普货超大件专线');
    xlsx.utils.book_append_sheet(oversizedWorkbook, xlsx.utils.aoa_to_sheet([
      ['其他后续操作详细费用请参考一件代发报价表'],
      ['注意：'],
      ['1. 因亚马逊和快递公司罢仓、水/火/风灾等不可抗力因素导致的损失，和本仓库对货物保全的费用，由货主自行承担。'],
      ['2. 纸箱不结实、包装方式不合格、受潮、挤压破裂等原因，导致的箱内产品丢失和损坏，本仓库不承担责任。']
    ]), '振韵国际首页');
    const oversizedBuffer = Buffer.from(xlsx.write(oversizedWorkbook, { type: 'array', bookType: 'xlsx' }));
    const oversizedStarted = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'inquiry')
      .field('agentShortName', '振韵')
      .attach('file', oversizedBuffer, { filename: Buffer.from('欧洲海运超大件总备注.xlsx', 'utf8').toString('latin1'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    let oversizedJob = oversizedStarted.body.job;
    for (let attempt = 0; attempt < 40 && oversizedJob.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${oversizedStarted.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      oversizedJob = current.body.job;
    }
    expect(oversizedJob.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${oversizedJob.book.id}/rows?page=1&pageSize=50`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const generalRow = response.body.rows.find((row: { channelName: string }) => row.channelName.includes('欧洲海运普货超大件'));
        expect(generalRow.transitLabel).toBe('30-40天（开船-提取）');
        expect(generalRow.transitDays).toBe(30);
        expect(generalRow.specialRemark).toContain('操作明细收费');
        expect(generalRow.specialRemark).toContain('渠道货物限制');
        expect(generalRow.specialRemark).toContain('卸货能力要求');
        expect(generalRow.specialRemark).toContain('签收单收50元/票');
        expect(generalRow.specialRemark).toContain('额外费用：尾板卸货');
        expect(generalRow.specialRemark).toContain('燃油附加13%');
        expect(generalRow.specialRemark).toContain('纸箱不结实');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '法国', chargeableWeightKg: 835, volumeCbm: 5 })
      .expect(201)
      .expect((response) => {
        const quote = response.body.recommendations.find((item: { channelName: string }) => item.channelName.includes('欧洲海运普货超大件'));
        expect(quote.transitLabel).toBe('30-40天（开船-提取）');
        expect(quote.specialRemark).toContain('操作明细收费');
        expect(quote.specialRemark).toContain('渠道货物限制');
        expect(quote.specialRemark).toContain('卸货能力要求');
        expect(quote.specialRemark).toContain('燃油附加13%');
      });
  });

  it('imports 欧洲空运 horizontal price book transit from right-side remarks without treating 保留7日 as transit', async () => {
    const adminToken = await app.loginAs('admin');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['欧洲空派快递派（大陆转飞）', '', '', '', '专业10年操作'],
      ['目的地', '30KG+', '50KG+', '100KG+', '专业10年操作'],
      [
        '法国',
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
    ]), '欧洲空派快递派');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'europeExpress')
      .field('agentShortName', '原始欧洲快递代理')
      .attach('file', buffer, { filename: Buffer.from('欧洲空运横向小表时效.xlsx', 'utf8').toString('latin1'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=50`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const transitRows = response.body.rows.filter((row: { channelName: string }) => row.channelName.includes('大陆转飞'));
        const falseTransitRows = response.body.rows.filter((row: { channelName: string }) => row.channelName.includes('误判限制渠道'));
        expect(transitRows.length).toBeGreaterThan(0);
        expect(transitRows.every((row: any) => row.transitLabel === '12-15天')).toBe(true);
        expect(transitRows.every((row: any) => row.transitDays === 12)).toBe(true);
        expect(transitRows.every((row: any) => row.specialRemark?.includes('不包税暂停'))).toBe(true);
        expect(transitRows.every((row: any) => row.specialRemark?.includes('不接受纸箱包装'))).toBe(true);
        expect(falseTransitRows.length).toBeGreaterThan(0);
        expect(falseTransitRows.every((row: any) => row.transitLabel)).toBe(false);
        expect(falseTransitRows.every((row: any) => row.transitDays)).toBe(false);
        expect(falseTransitRows.every((row: any) => row.specialRemark?.includes('只保留7日'))).toBe(true);
        expect(falseTransitRows.every((row: any) => row.specialRemark?.includes('无法送货上门'))).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '法国', channel: '空派', chargeableWeightKg: 88 })
      .expect(201)
      .expect((response) => {
        const quote = response.body.recommendations.find((item: { channelName?: string; transitLabel?: string }) =>
          item.channelName?.includes('大陆转飞') && item.transitLabel === '12-15天'
        );
        expect(quote).toEqual(expect.objectContaining({
          transitLabel: '12-15天',
          specialRemark: expect.stringContaining('不包税暂停')
        }));
      });
  });

  it('filters price book channel requirements for 按方包税 and compensation rules while keeping restrictions', async () => {
    const adminToken = await app.loginAs('admin');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '备注'],
      [
        '规则过滤代理',
        '欧洲海运过滤渠道',
        '过滤法国',
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
    ]), '渠道要求过滤');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'inquiry')
      .field('agentShortName', '亮崽统一代理')
      .attach('file', buffer, { filename: Buffer.from('渠道要求过滤.xlsx', 'utf8').toString('latin1'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const remark = response.body.rows[0]?.specialRemark ?? '';
        expect(remark).not.toContain('按方包税计算方式');
        expect(remark).not.toContain('最低1CBM起运');
        expect(remark).not.toContain('1CBM=363KGS');
        expect(remark).not.toContain('超过承诺时效');
        expect(remark).not.toContain('最高理赔');
        expect(remark).toContain('单票货物超过5个品名需提前单询');
        expect(remark).toContain('清关查验费实报实销');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '过滤法国', chargeableWeightKg: 120 })
      .expect(201)
      .expect((response) => {
        const quote = response.body.recommendations.find((item: { channelName: string }) => item.channelName.includes('欧洲海运过滤渠道'));
        expect(quote.specialRemark).not.toContain('按方包税计算方式');
        expect(quote.specialRemark).not.toContain('最高理赔');
        expect(quote.specialRemark).toContain('单票货物超过5个品名需提前单询');
        expect(quote.specialRemark).toContain('清关查验费实报实销');
      });
  });

  it('imports generic price book row remarks into selected amazon module without leaking to other quote modules', async () => {
    const adminToken = await app.loginAs('admin');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '仓库编码', '备注', '产品附加'],
      ['通用备注代理', '亚马逊带备注渠道', '通用美国', 50, 99999, 18, 'RMB', 'FTW5', '亚马逊小表备注：托盘费按实收取', '带磁产品需磁检'],
      ['通用备注代理', '欧洲海运超大件渠道', '通用法国', 100, 99999, 12, 'RMB', '', '海运小表备注：卸货费客户承担', ''],
      ['通用备注代理', '欧洲空运快递渠道', '通用法国', 21, 99999, 30, 'RMB', '', '空运小表备注：带电需确认', ''],
      ['特别提示：收件人需具备卸货能力'],
      ['受战争影响，燃油附加13%每周更新']
    ]), '通用价格表');
    const buffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'amazon')
      .field('agentShortName', '亮崽统一代理')
      .attach('file', buffer, { filename: Buffer.from('通用备注价格表.xlsx', 'utf8').toString('latin1'), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '通用美国', tier: '51KG+', weightBand: '51KG+', chargeableWeightKg: 51 })
      .expect(201)
      .expect((response) => {
        const quote = response.body.recommendations.find((item: { channelName: string }) => item.channelName.includes('亚马逊带备注渠道'));
        expect(quote.productSurchargeRemark).toContain('磁检');
        expect(quote.specialRemark).toContain('亚马逊小表备注');
        expect(quote.specialRemark).toContain('收件人需具备卸货能力');
        expect(quote.specialRemark).toContain('燃油附加13%');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '通用法国', chargeableWeightKg: 835, volumeCbm: 5 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('美国邮编格式错误');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '通用法国', channel: '空运', chargeableWeightKg: 88 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('没有匹配的代理成本价');
      });
  });

  it('guards pricing import source payloads from full rows responses and oversized JSON imports', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .get('/api/pricing/books?includeRows=true')
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('价格表列表不支持返回完整明细');
      });

    const rows = Array.from({ length: 2001 }, (_, index) => ({
      agentName: 'JSON大表代理',
      channelName: `JSON渠道-${index}`,
      destinationCountry: '美国',
      minWeightKg: index,
      maxWeightKg: index + 1,
      costPerKg: 10,
      currency: 'RMB'
    }));

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({ fileName: 'json-oversized.xlsx', targetModule: 'europeExpress',
        agentShortName: '亿阳国际', rows })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('请使用文件导入任务上传');
      });
  });

  it('feeds price book imports into the selected legacy module only with cross-module isolation', async () => {
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '亮崽统一代理', markupPerKg: 0.5, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '亮崽统一入口价格表.xlsx',
        targetModule: 'inquiry',
        agentShortName: '亮崽统一代理',
        rows: [
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '欧洲空海运铁路快递',
            channelName: '法国快递专线',
            realChannelName: '法国快递专线',
            destinationCountry: '模块归属法国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 8,
            currency: 'RMB',
            transitLabel: '8-12天'
          },
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '亚马逊仓库渠道汇总表',
            channelName: '亚马逊LAX9海卡',
            realChannelName: '亚马逊LAX9海卡',
            warehouseCode: 'LAX9',
            destinationCountry: '美国',
            minWeightKg: 12,
            maxWeightKg: 99999,
            costPerKg: 10,
            currency: 'RMB'
          },
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '广州星禾南非海运价格表',
            channelName: '纺织品 服饰',
            realChannelName: '南非海运',
            destinationCountry: '南非',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 6,
            currency: 'RMB',
            productSurchargeRemark: '风隐费 ¥1000，文件费 ¥350'
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.book.legacyModuleCounts).toEqual({ inquiry: 3 });
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '模块归属法国', channel: '快递', chargeableWeightKg: 835, volumeCbm: 5 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual(expect.arrayContaining([expect.objectContaining({ channelName: '法国快递专线', salesUnitPrice: 8.5 })]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '模块归属法国', channel: '快递', chargeableWeightKg: 835 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('欧洲查询仅支持空运、海运、铁路或全部渠道筛选');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'LAX9', destinationCountry: '美国', weightBand: '12KG+', chargeableWeightKg: 20 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('没有匹配的代理成本价');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const book = response.body.books.find((item: any) => item.fileName === '亮崽统一入口价格表.xlsx');
        expect(book).toEqual(expect.objectContaining({ legacyModuleCounts: { inquiry: 3 } }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/sources/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        module: 'amazon',
        fileName: '亮崽统一入口价格表.xlsx',
        rows: [
          { agentName: '亮崽统一代理', channelName: '污染亚马逊行', destinationCountry: '美国', minWeightKg: 12, maxWeightKg: 99999, costPerKg: 1, warehouseCode: 'LAX9' }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/sync-health?legacyModule=inquiry&page=1&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.rows.find((item: any) => item.fileName === '亮崽统一入口价格表.xlsx');
        expect(row.issues).not.toEqual(expect.arrayContaining(['同一价格表混入多个模块']));
      });
  });

  it('keeps same-named price books in separate lookup pools and only replaces the same pool', async () => {
    const adminToken = await app.loginAs('admin');
    const fileName = '7.6-拓普达.xlsx';
    const amazonRow = (costPerKg: number) => ({
      agentName: '亮崽统一代理',
      sourceSheetName: 'FBA仓库报价',
      channelName: '拓普达亚马逊海卡',
      realChannelName: '拓普达亚马逊海卡',
      warehouseCode: 'LAX9',
      destinationCountry: '美国',
      minWeightKg: 12,
      maxWeightKg: 99999,
      costPerKg,
      currency: 'RMB'
    });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({ fileName, targetModule: 'amazon', agentShortName: '亮崽统一代理', rows: [amazonRow(10)] })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName,
        targetModule: 'usaAirSea',
        agentShortName: '亮崽统一代理',
        rows: [{
          agentName: '亮崽统一代理',
          sourceSheetName: '美国空海运分区报价',
          channelName: '拓普达美国空海运',
          realChannelName: '拓普达美国空海运',
          destinationCountry: '美国',
          postalRule: '90000-90099',
          minWeightKg: 12,
          maxWeightKg: 99999,
          costPerKg: 20,
          currency: 'RMB'
        }]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'LAX9', destinationCountry: '美国', weightBand: '12KG+', chargeableWeightKg: 20 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '拓普达亚马逊海卡', costUnitPrice: 10 }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', postalCode: '90001', channel: '空海', chargeableWeightKg: 20 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '拓普达美国空海运', costUnitPrice: 20 }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({ fileName, targetModule: 'amazon', agentShortName: '亮崽统一代理', rows: [amazonRow(11)] })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'LAX9', destinationCountry: '美国', weightBand: '12KG+', chargeableWeightKg: 20 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '拓普达亚马逊海卡', costUnitPrice: 11 }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', postalCode: '90001', channel: '空海', chargeableWeightKg: 20 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '拓普达美国空海运', costUnitPrice: 20 }));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/sync-health?page=1&pageSize=200')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows.filter((item: any) => item.fileName === fileName);
        expect(rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ issues: [], markupRule: expect.objectContaining({ legacyModule: 'amazon' }) }),
          expect.objectContaining({ issues: [], markupRule: expect.objectContaining({ legacyModule: 'usaAirSea' }) })
        ]));
      });
  });

  it('supports usa canada dubai pricing module isolation and module scoped markup rules', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '亮崽统一代理', legacyModule: 'dubaiAirSea', markupPerKg: 2, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '迪拜专线 6.29（生效）大客户.xlsx',
        targetModule: 'dubaiAirSea',
        agentShortName: '亮崽统一代理',
        rows: [
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '迪拜空海运专线',
            channelName: '迪拜空海运专线',
            realChannelName: '迪拜空海运专线',
            destinationCountry: '迪拜',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 18,
            currency: 'RMB',
            transitLabel: '5-7天',
            specialRemark: '需提前确认派送地址'
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.book.legacyModuleCounts).toEqual({ dubaiAirSea: 1 });
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '美国空海运测试价格表.xlsx',
        targetModule: 'usaAirSea',
        agentShortName: '亮崽统一代理',
        rows: [
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '美国空海运',
            channelName: '美国空海运专线',
            realChannelName: '美国空海运专线',
            destinationCountry: '美国',
            postalRule: '全国通用',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 20,
            currency: 'RMB'
          },
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '美国空海运',
            channelName: '美国空海运专线',
            realChannelName: '美国空海运专线',
            destinationCountry: '美国',
            postalRule: '90000-90099',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 21,
            currency: 'RMB'
          },
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '美国空海运',
            channelName: '美国空海运专线',
            realChannelName: '美国空海运专线',
            destinationCountry: '美国',
            postalRule: '90001',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 22,
            currency: 'RMB'
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.book.legacyModuleCounts).toEqual({ usaAirSea: 3 });
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '加拿大空海测试价格表.xlsx',
        targetModule: 'canadaAirSea',
        agentShortName: '亮崽统一代理',
        rows: [
          {
            agentName: '亮崽统一代理',
            sourceSheetName: '加拿大空海',
            channelName: '加拿大空海专线',
            realChannelName: '加拿大空海专线',
            destinationCountry: '加拿大',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 22,
            currency: 'RMB'
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.book.legacyModuleCounts).toEqual({ canadaAirSea: 1 });
      });

    await request(app.getHttpServer())
      .get('/api/pricing/legacy/quote-meta')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.modules).toEqual(expect.arrayContaining([
          expect.objectContaining({ key: 'usaAirSea', label: '美国空海运查询' }),
          expect.objectContaining({ key: 'canadaAirSea', label: '加拿大空海查询' }),
          expect.objectContaining({ key: 'dubaiAirSea', label: '迪拜空海运查询' })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/books?targetModule=usaAirSea')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.books).toEqual(expect.arrayContaining([
          expect.objectContaining({ fileName: '美国空海运测试价格表.xlsx', legacyModuleCounts: { usaAirSea: 3 } })
        ]));
        expect(JSON.stringify(response.body.books)).not.toContain('加拿大空海测试价格表.xlsx');
        expect(JSON.stringify(response.body.books)).not.toContain('迪拜专线 6.29（生效）大客户.xlsx');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/dubai-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '迪拜', channel: '空海', chargeableWeightKg: 100 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('迪拜空海运模块仅支持价格表浏览');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/dubai-air-sea/quote')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '迪拜', channel: '空海', chargeableWeightKg: 100 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('迪拜空海运模块仅支持价格表浏览');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', postalCode: '90001', channel: '空海', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual(expect.arrayContaining([
          expect.objectContaining({ module: 'usaAirSea', channelName: '美国空海运专线', postalRule: '全国通用' }),
          expect.objectContaining({ module: 'usaAirSea', channelName: '美国空海运专线', postalRule: '90000-90099' }),
          expect.objectContaining({ module: 'usaAirSea', channelName: '美国空海运专线', postalRule: '90001' })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', channel: '空海', chargeableWeightKg: 100 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('美国邮编格式错误');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/canada-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '加拿大', channel: '空海', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ module: 'canadaAirSea', channelName: '加拿大空海专线' }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'DXB', destinationCountry: '迪拜', weightBand: '12KG+', chargeableWeightKg: 100 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('没有匹配的代理成本价');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '迪拜', channel: '空海', chargeableWeightKg: 100 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('美国邮编格式错误');
      });
  });

  it('parses Kunyun Canada zone-tier sheets for the Canada air-sea module', async () => {
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['加拿大空派-A'],
      ['分区', '21-44Kg', '45-70kg', '71-100kg', '101KG+', '提取时效'],
      ['YVR+YXX2', 42, 42, 39, 37, '7-8个工作日提取'],
      ['非亚马逊地址', 46, 46, 43, 41, ''],
      ['产品附加费', '带电产品、带磁、带电机、带马达产品'],
      ['拒收产品', '纯电池、仿牌、液体、粉末、食品']
    ]), '加拿大空派-A');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['FBA海卡按方包税'],
      ['国家', 'FBA仓', '1CBM-1.99CBM', '2CBM-4.99CBM', '时效'],
      ['加拿大', 'YYZ1/YYZ2', 1350, 1350, '全程35-40天'],
      ['注意：单件重量不超30kg，超过单询']
    ]), 'FBA海卡按方包税');

    const rows = await parsePriceWorkbookBuffer(
      Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' })),
      '7月16号坤宇.xlsx',
      'canadaAirSea',
      '坤宇'
    );

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ agentName: '坤宇', sourceSheetName: '加拿大空派-A', channelName: '加拿大空派-A', destinationCountry: '加拿大', warehouseCode: 'YVR', minWeightKg: 21, maxWeightKg: 44, costPerKg: 42, transitLabel: '7-8个工作日提取', productSurchargeRemark: expect.stringContaining('产品附加费'), specialRemark: expect.stringContaining('拒收产品') }),
      expect.objectContaining({ sourceSheetName: '加拿大空派-A', warehouseCode: CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE, minWeightKg: 21, maxWeightKg: 44, costPerKg: 46 }),
      expect.objectContaining({ sourceSheetName: 'FBA海卡按方包税', destinationCountry: '加拿大', warehouseCode: 'YYZ', cbmPrice: 1350, specialRemark: expect.stringContaining('单件重量不超30kg') })
    ]));
  });

  it('keeps Canada private-address and FBA-prefix prices mutually exclusive', async () => {
    const adminToken = await app.loginAs('admin');
    const channelName = '加拿大地址类型隔离测试';
    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '加拿大地址类型隔离测试.xlsx',
        targetModule: 'canadaAirSea',
        agentShortName: '亮崽统一代理',
        rows: [
          { agentName: '亮崽统一代理', sourceSheetName: channelName, channelName, destinationCountry: '加拿大', warehouseCode: CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE, minWeightKg: 21, maxWeightKg: 99999, costPerKg: 46, currency: 'RMB' },
          { agentName: '亮崽统一代理', sourceSheetName: channelName, channelName, destinationCountry: '加拿大', warehouseCode: 'YVR', minWeightKg: 21, maxWeightKg: 99999, costPerKg: 42, currency: 'RMB' },
          { agentName: '亮崽统一代理', sourceSheetName: channelName, channelName, destinationCountry: '加拿大', warehouseCode: 'YYZ', minWeightKg: 21, maxWeightKg: 99999, costPerKg: 41, currency: 'RMB' }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/canada-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ canadaAddressType: 'PRIVATE', channel: channelName, chargeableWeightKg: 30 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual([expect.objectContaining({ warehouseCode: CANADA_PRIVATE_ADDRESS_WAREHOUSE_CODE })]);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/canada-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ canadaAddressType: 'AMAZON', amazonCode: 'yvr', channel: channelName, chargeableWeightKg: 30 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual([expect.objectContaining({ warehouseCode: 'YVR' })]);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/canada-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ canadaAddressType: 'AMAZON', amazonCode: 'YV', channel: channelName, chargeableWeightKg: 30 })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('亚马逊仓请填写三位仓库代码，例如 YVR'));
  });

  it('only flags overlapping US ZIP rules when they compete in the same channel price tier', async () => {
    const adminToken = await app.loginAs('admin');
    const commonRow = {
      agentName: '亮崽统一代理',
      sourceSheetName: '美国空运专线',
      channelName: '美国六日提空派专线',
      businessRouteName: '美国六日提空派专线',
      realChannelName: '美国六日提空派专线',
      destinationCountry: '美国',
      currency: 'RMB'
    };

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '美国邮编跨重量段正常复用.xlsx',
        targetModule: 'usaAirSea',
        agentShortName: '亮崽统一代理',
        rows: [
          { ...commonRow, postalRule: '80000-99999', minWeightKg: 12, maxWeightKg: 44.999, costPerKg: 64, priceTierLabel: '12KG+' },
          { ...commonRow, postalRule: '80000-99999', minWeightKg: 45, maxWeightKg: 100.999, costPerKg: 60, priceTierLabel: '45KG+' },
          { ...commonRow, postalRule: '80000-99999', minWeightKg: 101, maxWeightKg: 99999, costPerKg: 55, priceTierLabel: '101KG+' }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/sync-health?legacyModule=usaAirSea&page=1&pageSize=200')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const health = response.body.rows.find((row: { fileName: string }) => row.fileName === '美国邮编跨重量段正常复用.xlsx');
        expect(health.issues).not.toContain('同一渠道、价格组和重量段存在邮编区间重叠');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '美国邮编同档竞争.xlsx',
        targetModule: 'usaAirSea',
        agentShortName: '亮崽统一代理',
        rows: [
          { ...commonRow, postalRule: '80000-99999', minWeightKg: 12, maxWeightKg: 44.999, costPerKg: 64, priceTierLabel: '12KG+' },
          { ...commonRow, postalRule: '90000-99999', minWeightKg: 12, maxWeightKg: 44.999, costPerKg: 63, priceTierLabel: '12KG+' }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/sync-health?legacyModule=usaAirSea&page=1&pageSize=200')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const health = response.body.rows.find((row: { fileName: string }) => row.fileName === '美国邮编同档竞争.xlsx');
        expect(health.issues).toContain('同一渠道、价格组和重量段存在邮编区间重叠');
      });
  });

  it('serves Dubai air and sea price tables with channel codes and public-only business prices', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '亿阳国际', legacyModule: 'dubaiAirSea', markupPerKg: 2, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '迪拜空海运价格表.xlsx',
        targetModule: 'dubaiAirSea',
        agentShortName: '亿阳国际',
        rows: [
          {
            agentName: '亿阳国际',
            sourceSheetName: '阿联酋空派',
            channelName: '阿联酋空派 内电普货 A区',
            realChannelName: '阿联酋空派 内电普货 A区',
            destinationCountry: '迪拜',
            minWeightKg: 16,
            maxWeightKg: 99,
            costPerKg: 18,
            currency: 'RMB',
            priceTierLabel: '16-99KG',
            productCategory: '内电普货',
            region: 'A区',
            inboundRequirement: '义乌仓',
            channelCode: 'AE空运-P',
            transitLabel: '5-7天',
            specialRemark: '深圳市派格福通货运代理有限公司 Shen zhen PAGO LOGISTICS Co.,Ltd；不接危险品'
          },
          {
            agentName: '亿阳国际',
            sourceSheetName: '阿联酋海派',
            channelName: '阿联酋海派 普货类',
            realChannelName: '阿联酋海派 普货类',
            destinationCountry: '迪拜',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 1800,
            cbmPrice: 1800,
            currency: 'RMB',
            priceTierLabel: '0.5-5CBM',
            serviceContent: '普货类',
            inboundRequirement: '深圳仓',
            channelCode: 'AH海运-P',
            transitLabel: '25-30天',
            specialRemark: '不接危险品'
          },
          {
            agentName: '亿阳国际',
            sourceSheetName: '阿联酋海派',
            channelName: '阿联酋海派 敏感货',
            realChannelName: '阿联酋海派 敏感货',
            destinationCountry: '迪拜',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 1600,
            currency: 'RMB',
            priceTierLabel: '0KG+',
            serviceContent: '敏感货',
            inboundRequirement: '义乌仓需加收转运费',
            channelCode: 'AH海运-M',
            transitLabel: '30-35天',
            specialRemark: '按渠道代码归到海运'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/legacy/dubai-air-sea/table')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.air).toEqual(expect.arrayContaining([
          expect.objectContaining({ channelCode: 'AE空运-P', businessUnitPrice: 20, unit: 'RMB/KG', productCategory: '内电普货' })
        ]));
        expect(response.body.sea).toEqual(expect.arrayContaining([
          expect.objectContaining({ channelCode: 'AH海运-P', businessUnitPrice: 1802, unit: 'RMB/CBM', serviceContent: '普货类' }),
          expect.objectContaining({ channelCode: 'AH海运-M', businessUnitPrice: 1602, unit: 'RMB/CBM', serviceContent: '敏感货', priceTierLabel: '按方' })
        ]));
        expect(JSON.stringify(response.body.air)).not.toContain('AH海运-M');
        const payload = JSON.stringify(response.body);
        expect(payload).not.toContain('costPerKg');
        expect(payload).not.toContain('grossProfit');
        expect(payload).not.toContain('sourceSheetName');
        expect(payload).not.toContain('agentName');
        expect(payload).not.toContain('markup');
        expect(payload).not.toContain('深圳市派格福通货运代理有限公司');
        expect(payload).not.toContain('PAGO LOGISTICS');
        expect(payload).toContain('不接危险品');
      });
  });

  it('automatically serves the latest successful Dubai air and sea image version after conversion', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([['迪拜空运价格表'], ['普货', 18]]), '迪拜空运');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([['迪拜海运价格表'], ['普货', 1800]]), '迪拜海运');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([['内部说明']]), '说明');
    const fileBuffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'dubaiAirSea')
      .field('agentShortName', '亿阳国际')
      .attach('file', fileBuffer, { filename: '迪拜展示版本.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 25));
    await request(app.getHttpServer())
      .get('/api/pricing/legacy/dubai-air-sea/display')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.airPages).toEqual([expect.objectContaining({ sheetName: '迪拜空运', url: expect.stringContaining('/api/uploads/pricing-dubai/') })]);
        expect(response.body.seaPages).toEqual([expect.objectContaining({ sheetName: '迪拜海运', url: expect.stringContaining('/api/uploads/pricing-dubai/') })]);
        expect(response.body.airPages[0].url).toContain('?v=');
        expect(JSON.stringify(response.body)).not.toContain('迪拜展示版本.xlsx');
      });

    const versions = await request(app.getHttpServer())
      .get('/api/pricing/legacy/dubai-air-sea/display-versions')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.versions).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String), originalName: '迪拜展示版本.xlsx', status: 'READY', isActiveAir: true, isActiveSea: true })
        ]));
        expect(response.body.versions.some((item: { unassignedSheets?: string[] }) => item.unassignedSheets?.includes('说明'))).toBe(true);
      });
    const version = versions.body.versions.find((item: { originalName: string }) => item.originalName === '迪拜展示版本.xlsx');
    expect(version).toBeTruthy();

    const airOnlyWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(airOnlyWorkbook, xlsx.utils.aoa_to_sheet([['迪拜空运新价格表'], ['普货', 20]]), '迪拜空运新版本');
    await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'dubaiAirSea')
      .field('agentShortName', '亿阳国际')
      .attach('file', Buffer.from(xlsx.write(airOnlyWorkbook, { type: 'array', bookType: 'xlsx' })), { filename: '迪拜空运新版本.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      .expect(201);
    await new Promise((resolve) => setTimeout(resolve, 25));
    await request(app.getHttpServer())
      .get('/api/pricing/legacy/dubai-air-sea/display')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.airPages).toEqual([expect.objectContaining({ sheetName: '迪拜空运新版本' })]);
        expect(response.body.seaPages).toEqual([expect.objectContaining({ sheetName: '迪拜海运' })]);
      });

    // 旧文件重新转换完成，也不能覆盖后来导入的空运展示版本。
    await request(app.getHttpServer())
      .post(`/api/pricing/legacy/dubai-air-sea/display-versions/${version.id}/retry`)
      .set('Authorization', app.auth(adminToken))
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/pricing/legacy/dubai-air-sea/display')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.airPages).toEqual([expect.objectContaining({ sheetName: '迪拜空运新版本' })]);
        expect(response.body.seaPages).toEqual([expect.objectContaining({ sheetName: '迪拜海运' })]);
      });

    // 只有管理员明确确认时，才允许回切到历史版本。
    await request(app.getHttpServer())
      .put(`/api/pricing/legacy/dubai-air-sea/display-versions/${version.id}/activate`)
      .set('Authorization', app.auth(adminToken))
      .send({ salesSafe: true })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/pricing/legacy/dubai-air-sea/display')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.airPages).toEqual([expect.objectContaining({ sheetName: '迪拜空运' })]);
        expect(response.body.seaPages).toEqual([expect.objectContaining({ sheetName: '迪拜海运' })]);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/legacy/dubai-air-sea/display-versions')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    expect(started.body.job.targetModule).toBe('dubaiAirSea');
  });

  it('keeps explicitly imported module pricing independent while matching every warehouse code in a grouped source cell', async () => {
    const adminToken = await app.loginAs('admin');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['TPD-加拿大直航海卡经济'],
      ['下单渠道：TPD-加拿大直航卡派经济'],
      ['国家分区', '仓库分区', '21KG+', '100KG+', '船期', '参考时效'],
      ['加拿大东部', '多伦多（YYZ/YHM1/YOO1/YDC5/XYY4）', 8.45, 7.45, '多伦多清关', '开船后40-45自然日派送']
    ]), 'TPD-加拿大直航海卡经济');
    const fileBuffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'amazon')
      .field('agentShortName', '亮崽统一代理')
      .attach('file', fileBuffer, {
        filename: Buffer.from('拓普达加拿大卡派.xlsx', 'utf8').toString('latin1'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');
    expect(job.targetModule).toBe('amazon');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=50`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ warehouseCode: 'XYY4', destinationCountry: '加拿大', minWeightKg: 21, maxWeightKg: 99.999, costPerKg: 8.45 }),
          expect.objectContaining({ warehouseCode: 'YHM1', destinationCountry: '加拿大', minWeightKg: 21, costPerKg: 8.45 }),
          expect.objectContaining({ warehouseCode: 'YYZ', destinationCountry: '加拿大', minWeightKg: 21, costPerKg: 8.45 })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
    .send({ amazonCode: 'XYY4', actualWeightKg: 50, weightBand: '12KG+' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          module: 'amazon',
          query: expect.objectContaining({ amazonCode: 'XYY4', weightBand: '21KG+' }),
          selected: expect.objectContaining({ warehouseCode: 'XYY4', destinationCountry: '加拿大', weightSegmentLabel: '21KG+' })
        }));
      });

    // 原表中的裸 YYZ 是前缀规则，YYZ4 必须复用同一条 21KG+ 价格，不能要求重传为 YYZ4。
    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'YYZ4', actualWeightKg: 50, weightBand: '12KG+' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          module: 'amazon',
          query: expect.objectContaining({ amazonCode: 'YYZ4', weightBand: '21KG+' }),
          selected: expect.objectContaining({ warehouseCode: 'YYZ', destinationCountry: '加拿大', weightSegmentLabel: '21KG+' })
        }));
      });
  });

  it('parses 加拿大 YYZ 仓库 ranges, combinations and prefixes without turning invalid ranges into quotes', async () => {
    const adminToken = await app.loginAs('admin');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['代理', '渠道', '目的地', '最小重量', '最大重量', '成本单价', '币种', '仓库编码'],
      ['仓库规则代理', '范围仓报价', '加拿大组合仓', 21, 99.999, 8.45, 'RMB', 'YYZ1-YYZ9'],
      ['仓库规则代理', '组合仓报价', '加拿大组合仓', 21, 99.999, 8.6, 'RMB', 'YYZ1+YYZ2+YYZ3'],
      ['仓库规则代理', '前缀仓报价', '加拿大组合仓', 21, 99.999, 9.2, 'RMB', 'YYZ'],
      ['仓库规则代理', '精确仓报价', '加拿大组合仓', 21, 99.999, 10.5, 'RMB', 'YYZ4'],
      ['仓库规则代理', '温哥华前缀仓报价', '加拿大组合仓', 21, 99.999, 8.8, 'RMB', 'YVR'],
      ['仓库规则代理', '温哥华精确仓报价', '加拿大组合仓', 21, 99.999, 10.8, 'RMB', 'YVR4'],
      ['仓库规则代理', '百公斤范围仓报价', '加拿大组合仓', 100, 99999, 7.45, 'RMB', 'YYZ1-YYZ9'],
      ['仓库规则代理', '非法范围报价', '加拿大组合仓', 21, 99.999, 6, 'RMB', 'YYZ9-YYZ1']
    ]), '加拿大仓库组合');
    const fileBuffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'amazon')
      .field('agentShortName', '亮崽统一代理')
      .attach('file', fileBuffer, {
        filename: Buffer.from('加拿大YYZ仓库组合.xlsx', 'utf8').toString('latin1'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=100`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ channelName: '范围仓报价', warehouseCode: 'YYZ1' }),
          expect.objectContaining({ channelName: '范围仓报价', warehouseCode: 'YYZ9' }),
          expect.objectContaining({ channelName: '组合仓报价', warehouseCode: 'YYZ3' })
        ]));
        expect(response.body.rows).not.toEqual(expect.arrayContaining([
          expect.objectContaining({ channelName: '组合仓报价', warehouseCode: 'YYZ4' })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'YYZ4', destinationCountry: '加拿大组合仓', actualWeightKg: 21, weightBand: '12KG+' })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '范围仓报价', warehouseCode: 'YYZ4' }));
        expect(response.body.recommendations.some((row: { channelName: string }) => row.channelName === '前缀仓报价')).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'YVR4', destinationCountry: '加拿大组合仓', actualWeightKg: 21, weightBand: '12KG+' })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '温哥华精确仓报价', warehouseCode: 'YVR4' }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'YYZ9', destinationCountry: '加拿大组合仓', actualWeightKg: 21, weightBand: '12KG+' })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '范围仓报价', warehouseCode: 'YYZ9' }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'YYZ4', destinationCountry: '加拿大组合仓', actualWeightKg: 100, weightBand: '100KG+' })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '百公斤范围仓报价', warehouseCode: 'YYZ4' }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'XYY1', destinationCountry: '加拿大组合仓', actualWeightKg: 21, weightBand: '12KG+' })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('没有匹配');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/sync-health?legacyModule=amazon&page=1&pageSize=200')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const health = response.body.rows.find((row: { fileName: string }) => row.fileName === '加拿大YYZ仓库组合.xlsx');
        expect(health.issues).toContain('仓库编码规则无效：YYZ9-YYZ1，需修正或重新导入');
      });
  });

  it('imports Paige two-level USA air-sea tiers with original 50KG pricing and keeps modules isolated', async () => {
    const adminToken = await app.loginAs('admin');
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['渠道名称', '分区', '华南（深圳/广州/东莞/中山）', '', '', '', '其它条款'],
      ['', '', '12KG+', '45KG+', '71KG+', '101KG+', ''],
      ['美森限时达 UPS/FedEx派送', '美西-邮编8-9', 18.2, 16.7, 15.7, 14.2, '纸箱包装，超长件单询'],
      ['美中-邮编4.5.6.7开头', '美中-邮编5-7', 19.5, 18, 17, 15.5, ''],
      ['特殊快递派送', '96-99（邮编）', 20.5, 19, 18, 16.5, '']
    ]), '海运快递派');
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([
      ['对应渠道', '仓库编码', '50KG+', '参考时效'],
      ['ORD-FBA', 'MDW2', 23, '44-46天左右'],
      ['萨凡纳-FBA', 'IUSR', 23, '42-45天左右']
    ]), 'FBA卡派汇总');
    const fileBuffer = Buffer.from(xlsx.write(workbook, { type: 'array', bookType: 'xls' }));

    const started = await request(app.getHttpServer())
      .post('/api/pricing/books/import-jobs')
      .set('Authorization', app.auth(adminToken))
      .field('targetModule', 'usaAirSea')
      .field('agentShortName', '亮崽统一代理')
      .attach('file', fileBuffer, {
        filename: Buffer.from('7-9派格.xls', 'utf8').toString('latin1'),
        contentType: 'application/vnd.ms-excel'
      })
      .expect(201);

    let job = started.body.job;
    for (let attempt = 0; attempt < 40 && job.status !== 'SUCCESS'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const current = await request(app.getHttpServer())
        .get(`/api/pricing/books/import-jobs/${started.body.job.id}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200);
      job = current.body.job;
    }
    expect(job.status).toBe('SUCCESS');
    expect(job.processedRows).toBe(12);

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${job.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ channelName: expect.stringContaining('美森限时达'), priceTierLabel: '45KG+', minWeightKg: 45, maxWeightKg: 70.999 })
        ]));
        expect(response.body.rows.some((row: { warehouseCode?: string }) => row.warehouseCode)).toBe(false);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const book = response.body.books.find((item: { id: string }) => item.id === job.book.id);
        expect(book).toEqual(expect.objectContaining({ legacyModuleCounts: { usaAirSea: 12 } }));
      });

    for (const chargeableWeightKg of [50, 60]) {
      await request(app.getHttpServer())
        .post('/api/pricing/legacy/usa-air-sea/quote')
        .set('Authorization', app.auth(adminToken))
        .send({ destinationCountry: '美国', postalCode: '90001', channel: '美森限时达', chargeableWeightKg })
        .expect(201)
        .expect((response) => {
          expect(response.body.selected).toEqual(expect.objectContaining({
            module: 'usaAirSea',
            channelName: expect.stringContaining('美森限时达'),
            weightSegmentLabel: '45KG+',
            postalRule: '8-9'
          }));
        });
    }

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', postalCode: '98101', channel: '特殊快递', chargeableWeightKg: 60 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({
          channelName: '特殊快递派送',
            postalRule: '96-99',
          weightSegmentLabel: '45KG+'
        }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/usa-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', postalCode: '90001', channel: '美森限时达', chargeableWeightKg: 1 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/canada-air-sea/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', channel: 'ORD-FBA', chargeableWeightKg: 60 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'MDW2', destinationCountry: '美国', chargeableWeightKg: 60 })
      .expect(400);
  });

  it('applies Liangzai large cargo routing across amazon, inquiry and europe express modules', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '亮崽大件海运池.xlsx',
        targetModule: 'inquiry',
        agentShortName: '亿阳国际',
        rows: [
          {
            agentName: '亿阳国际',
            channelName: '法国海运卡派超大件',
            destinationCountry: '亮崽大件法国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 10,
            currency: 'RMB',
            remark: '可承接木箱、托盘、超大件'
          },
          {
            agentName: '亿阳国际',
            channelName: '法国普通快递普货',
            destinationCountry: '亮崽大件法国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 5,
            currency: 'RMB',
            remark: '仅限小包普货'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '亮崽普通空运池.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '亿阳国际',
        rows: [
          {
            agentName: '亿阳国际',
            channelName: '法国空运普货',
            destinationCountry: '亮崽空运法国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 20,
            currency: 'RMB',
            transitLabel: '6-8天'
          },
          {
            agentName: '亿阳国际',
            channelName: '法国卡派超大件错池',
            destinationCountry: '亮崽空运法国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 1,
            currency: 'RMB',
            remark: '卡派可接木箱托盘'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '亮崽亚马逊大件.xlsx',
        targetModule: 'amazon',
        agentShortName: '亿阳国际',
        rows: [
          {
            agentName: '亿阳国际',
            channelName: 'FTW5普通小包快递',
            warehouseCode: 'FTW5',
            destinationCountry: '美国',
            minWeightKg: 50,
            maxWeightKg: 99999,
            costPerKg: 4,
            currency: 'RMB'
          },
          {
            agentName: '亿阳国际',
            channelName: 'FTW5美西海卡超大件',
            warehouseCode: 'FTW5',
            destinationCountry: '美国',
            minWeightKg: 50,
            maxWeightKg: 99999,
            costPerKg: 8,
            currency: 'RMB',
            remark: '可接托盘、木架、超大件'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '亮崽空运法国', channel: '空运', productName: '桌子', lengthCm: 181, chargeableWeightKg: 100 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('长度 181cm 超过 180cm');
        expect(response.body.message).toContain('应走欧洲超大件综合查询');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '亮崽空运法国', channel: '空运', lengthCm: 180, widthCm: 80, heightCm: 10, chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        const channelNames = response.body.recommendations.map((item: { channelName: string }) => item.channelName);
        expect(channelNames).toContain('法国空运普货');
        expect(channelNames).not.toContain('法国卡派超大件错池');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '亮崽大件法国', productName: '桌子', volumeCbm: 1, chargeableWeightKg: 167 })
      .expect(201)
      .expect((response) => {
        const channelNames = response.body.recommendations.map((item: { channelName: string }) => item.channelName);
        expect(channelNames).toContain('法国海运卡派超大件');
        expect(channelNames).not.toContain('法国普通快递普货');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', weightBand: '50KG+', packageInfo: '木箱', chargeableWeightKg: 60 })
      .expect(201)
      .expect((response) => {
        const channelNames = response.body.recommendations.map((item: { channelName: string }) => item.channelName);
        expect(channelNames).toContain('FTW5美西海卡超大件');
        expect(channelNames).not.toContain('FTW5普通小包快递');
      });
  });

  it('supports southAfrica 面膜 quoteText by CBM only and ignores disabled rules', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const disabled = await request(app.getHttpServer())
      .post('/api/pricing/south-africa/rules')
      .set('Authorization', app.auth(adminToken))
      .send({
        category: '停用类',
        name: '停用面膜',
        keywords: ['面膜'],
        ratePerCbm: 999,
        enabled: false
      })
      .expect(201);
    expect(disabled.body.enabled).toBe(false);

    await request(app.getHttpServer())
      .get('/api/pricing/south-africa/rules')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rules).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: disabled.body.id, category: '停用类', enabled: false }),
          expect.objectContaining({ category: '化妆品类', name: '化妆品类', enabled: true })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/south-africa/rules')
      .set('Authorization', app.auth(operatorToken))
      .send({ category: '越权测试', name: '业务员不可维护', keywords: ['越权'], ratePerCbm: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/pricing/south-africa/rules/${disabled.body.id}/enabled`)
      .set('Authorization', app.auth(operatorToken))
      .send({ enabled: true })
      .expect(403);

    const quote = await request(app.getHttpServer())
      .post('/api/pricing/south-africa/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ productName: '面膜', volumeCbm: 1, actualWeightKg: 400, packageInfo: '这段备注不参与匹配' })
      .expect(201);

    expect(quote.body.result).toEqual(expect.objectContaining({
      category: '化妆品类',
      materialName: '化妆品类',
      chargeableCbm: 1,
      ratePerCbm: 3500,
      freightFee: 3500,
      totalFee: 3500
    }));
    expect(quote.body.result.riskFee).toBeUndefined();
    expect(quote.body.result.documentFee).toBeUndefined();
    expect(quote.body.query.actualWeightKg).toBeUndefined();
    expect(quote.body.query.packageInfo).toBeUndefined();
    expect(quote.body.result.quoteText).toBe([
      '南非SA海运DDP专线：面膜',
      '分类：化妆品类/化妆品类',
      '计费方：1.000CBM',
      '运费：¥3500.00/CBM，运费 ¥3500.00',
      '备注：无牌无侵权；约翰内斯堡自提、低消0.5CBM  报关件需要单询'
    ].join('\n'));
    expect(quote.body.result.remark).toBe('无牌无侵权；约翰内斯堡自提、低消0.5CBM  报关件需要单询');
    expect(quote.body.result.quoteText).not.toMatch(/风险费|单证费用|预估合计/);

    await request(app.getHttpServer())
      .post('/api/pricing/south-africa/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ productName: '补水面膜套装', volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.result).toEqual(expect.objectContaining({
          category: '化妆品类',
          matchedKeywords: expect.arrayContaining(['面膜'])
        }));
      });

    const consult = await request(app.getHttpServer())
      .post('/api/pricing/south-africa/rules')
      .set('Authorization', app.auth(adminToken))
      .send({ category: '敏感类', name: '纯电需单询', keywords: ['纯电'], consult: true })
      .expect(201);
    expect(consult.body.consult).toBe(true);

    const consultQuote = await request(app.getHttpServer())
      .post('/api/pricing/south-africa/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ productName: '纯电池', volumeCbm: 1 })
      .expect(201);
    expect(consultQuote.body.result).toEqual(expect.objectContaining({ consult: true }));
    expect(consultQuote.body.result.totalFee).toBeUndefined();

    await request(app.getHttpServer())
      .post('/api/pricing/south-africa/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ productName: '面膜', category: '敏感类', volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.result).toEqual(expect.objectContaining({ category: '敏感类', consult: true }));
      });
  });

  it('keeps standalone legacy sources out of current pricing markup and book-rows management', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/sources/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        module: 'amazon',
        fileName: 'data/quotes.json',
        rows: [
          {
            agentName: '天图7.2',
            channelName: '亮崽历史渠道',
            warehouseCode: 'FTW5',
            destinationCountry: '美国',
            minWeightKg: 12,
            maxWeightKg: 99999,
            costPerKg: 9,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '7.6-拓普达.xlsx',
        targetModule: 'amazon',
        agentShortName: '拓普达',
        rows: [
          {
            agentName: '亿阳国际',
            sourceSheetName: '亚马逊仓库渠道汇总表',
            channelName: '思远当前线路',
            realChannelName: '思远当前线路',
            warehouseCode: 'FTW5',
            destinationCountry: '美国',
            minWeightKg: 12,
            maxWeightKg: 99999,
            costPerKg: 10,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules?includeHits=false')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const agentNames = response.body.rows.map((row: any) => row.agentName);
        expect(agentNames).toContain('拓普达');
        expect(agentNames).not.toContain('天图7.2');
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            agentName: '拓普达',
            activeLineCount: 4,
            retainedOnly: false,
            sourcePriceBooks: [expect.objectContaining({ fileName: '7.6-拓普达.xlsx', lineCount: 4 })]
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/book-rows?agentName=%E5%A4%A9%E5%9B%BE7.2&page=1&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toHaveLength(0);
        expect(response.body.pagination.totalItems).toBe(0);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/book-rows?agentName=%E6%8B%93%E6%99%AE%E8%BE%BE&page=1&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ agentName: '拓普达', channelName: '思远当前线路' })
        ]));
        expect(JSON.stringify(response.body)).not.toContain('亿阳国际');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/book-rows?page=1&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('查看线路必须选择价格表或代理');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/book-rows?agentName=%E6%8B%93%E6%99%AE%E8%BE%BE&page=1&pageSize=999')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.pagination.pageSize).toBe(200);
      });
  });

  it('cleanup removes 亿阳国际 and 深圳振韵国际 while keeping 拓普达 and 振韵 price lines', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '拓普达.xlsx',
        targetModule: 'amazon',
        agentShortName: '亿阳国际',
        rows: [
          {
            agentName: '亿阳国际',
            sourceSheetName: '拓普达小表',
            channelName: '拓普达美线',
            realChannelName: '拓普达美线',
            warehouseCode: 'FTW5',
            destinationCountry: '美国',
            minWeightKg: 12,
            maxWeightKg: 99999,
            costPerKg: 10,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '振韵清理测试.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '振韵',
        rows: [
          {
            agentName: '深圳振韵国际',
            sourceSheetName: '振韵小表',
            channelName: '振韵欧洲线',
            realChannelName: '振韵欧洲线',
            destinationCountry: '法国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 20,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/cleanup-old-original-agents')
      .set('Authorization', app.auth(adminToken))
      .send({ dryRun: true })
      .expect(201)
      .expect((response) => {
        expect(response.body.dryRun).toBe(true);
        expect(response.body.affectedRows).toBeGreaterThanOrEqual(1);
        expect(response.body.details).toEqual(expect.arrayContaining([
          expect.objectContaining({ oldAgentName: '亿阳国际', newAgentName: '拓普达', sourceType: 'PRICE_BOOK_ROW' })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/cleanup-old-original-agents')
      .set('Authorization', app.auth(adminToken))
      .send({ dryRun: false })
      .expect(201)
      .expect((response) => {
        expect(response.body.dryRun).toBe(false);
        expect(response.body.totalPriceBookRows).toBeGreaterThanOrEqual(1);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/cleanup-old-original-agents')
      .set('Authorization', app.auth(adminToken))
      .send({ dryRun: true })
      .expect(201)
      .expect((response) => {
        expect(response.body.affectedRows).toBe(0);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/book-rows?agentName=%E6%8B%93%E6%99%AE%E8%BE%BE&page=1&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(JSON.stringify(response.body)).not.toContain('亿阳国际');
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ agentName: '拓普达' })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/book-rows?agentName=%E6%8C%AF%E9%9F%B5&page=1&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(JSON.stringify(response.body)).not.toContain('深圳振韵国际');
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ agentName: '振韵', channelName: '振韵欧洲线' })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', amazonCode: 'FTW5', chargeableWeightKg: 12 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toEqual(expect.arrayContaining([
          expect.objectContaining({ agentName: '拓普达' })
        ]));
      });
  });

  it('returns mixed markup buckets and line markup sources for batch settings', async () => {
    const adminToken = await app.loginAs('admin');

    const book = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '混合加价价格表.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '混合加价代理',
        rows: [
          {
            agentName: '混合加价代理',
            carrierName: '专线',
            sourceSheetName: '小表A',
            channelName: '混合线路A',
            realChannelName: '混合真实线路A',
            destinationCountry: '混合国A',
            minWeightKg: 0,
            maxWeightKg: 50,
            costPerKg: 10,
            currency: 'RMB'
          },
          {
            agentName: '混合加价代理',
            carrierName: '专线',
            sourceSheetName: '小表B',
            channelName: '混合线路B',
            realChannelName: '混合真实线路B',
            destinationCountry: '混合国B',
            minWeightKg: 0,
            maxWeightKg: 50,
            costPerKg: 20,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-upsert')
      .set('Authorization', app.auth(adminToken))
      .send({
        rows: [
          {
            priceBookId: book.body.book.id,
            agentName: '混合加价代理',
            channelName: '混合线路A',
            realChannelName: '混合真实线路A',
            destinationCountry: '混合国A',
            markupPerKg: 0.1,
            enabled: true
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.successCount).toBe(1);
        expect(response.body.errorRows).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules?includeHits=false')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            agentName: '混合加价代理',
            markupDisplayMode: 'MIXED',
            markupRange: '+¥0.10-0.50/KG',
            markupBuckets: expect.arrayContaining([
              expect.objectContaining({ markupPerKg: 0.1, lineCount: 1 }),
              expect.objectContaining({ markupPerKg: 0.5, lineCount: 1 })
            ])
          })
        ]));
      });

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${book.body.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ channelName: '混合线路A', lineMarkupPerKg: 0.1, markupSource: 'LINE_CUSTOM' }),
          expect.objectContaining({ channelName: '混合线路B', lineMarkupPerKg: 0.5, markupSource: 'VIRTUAL_DEFAULT' })
        ]));
      });

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${book.body.book.id}/rows?page=1&pageSize=20&markupAmount=0.1`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.pagination.totalItems).toBe(1);
        expect(response.body.rows).toEqual([
          expect.objectContaining({ channelName: '混合线路A', lineMarkupPerKg: 0.1, markupSource: 'LINE_CUSTOM' })
        ]);
      });

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${book.body.book.id}/rows?page=1&pageSize=20&markupAmount=0.5`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.pagination.totalItems).toBe(1);
        expect(response.body.rows).toEqual([
          expect.objectContaining({ channelName: '混合线路B', lineMarkupPerKg: 0.5, markupSource: 'VIRTUAL_DEFAULT' })
        ]);
      });

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${book.body.book.id}/rows?page=1&pageSize=20&markupSource=LINE_CUSTOM`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.pagination.totalItems).toBe(1);
        expect(response.body.rows[0]).toEqual(expect.objectContaining({ channelName: '混合线路A', markupSource: 'LINE_CUSTOM' }));
      });

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${book.body.book.id}/rows?page=1&pageSize=20&markupSort=DESC`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.map((row: any) => row.lineMarkupPerKg)).toEqual([0.5, 0.1]);
      });
  });

  it('quotes classified Europe express rows without chargeable weight by lowest unit price', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '7.9-欧洲快递代理.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '原始欧洲快递代理',
        rows: [
          {
            agentName: '原始欧洲快递代理',
            carrierName: 'FedEx',
            sourceSheetName: '欧洲空海运铁路快递',
            channelName: '欧洲空运快递高价',
            businessRouteName: '欧洲空运快递高价',
            realChannelName: '欧洲空运快递高价',
            destinationCountry: '欧洲快递测试国',
            minWeightKg: 0,
            maxWeightKg: 10,
            costPerKg: 30,
            currency: 'RMB'
          },
          {
            agentName: '原始欧洲快递代理',
            carrierName: 'FedEx',
            sourceSheetName: '欧洲空海运铁路快递',
            channelName: '欧洲空运快递低价',
            businessRouteName: '欧洲空运快递低价',
            realChannelName: '欧洲空运快递低价',
            destinationCountry: '欧洲快递测试国',
            minWeightKg: 51,
            maxWeightKg: 100,
            costPerKg: 20,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '欧洲快递测试国', channel: '空运', chargeableWeightKg: 0 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toHaveLength(2);
        expect(response.body.selected.channelName).toBe('欧洲空运快递低价');
        expect(response.body.selected.chargeableWeightKg).toBe(0);
        expect(response.body.selected.salesUnitPrice).toBe(20.5);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '欧洲快递测试国', channel: '空运', chargeableWeightKg: 8 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toHaveLength(1);
        expect(response.body.selected.channelName).toBe('欧洲空运快递高价');
        expect(response.body.selected.salesTotal).toBe(244);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '无报价测试国', channel: '空运', chargeableWeightKg: 0 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations).toHaveLength(0);
        expect(response.body.selected).toBeUndefined();
      });
  });

  it('removes price-book markup rules after deleting price books and never quotes deleted price rows', async () => {
    const adminToken = await app.loginAs('admin');

    const syncedBook = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '7.8-自动同步代理.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '自动同步代理',
        rows: [
          {
            agentName: '自动同步代理',
            carrierName: '专线',
            channelName: '自动同步专线',
            realChannelName: '自动同步真实线路',
            destinationCountry: '自动同步国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 10,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            agentName: '自动同步代理',
            markupValue: 0.5,
            enabled: true,
            activeLineCount: 1,
            retainedOnly: false,
            sourcePriceBooks: [expect.objectContaining({ fileName: '7.8-自动同步代理.xlsx', lineCount: 1 })]
          })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '自动同步国', chargeableWeightKg: 10 })
      .expect(201)
      .expect((response) => {
        expect(response.body.totalSales).toBe(105);
      });

    await request(app.getHttpServer())
      .delete(`/api/pricing/books/${syncedBook.body.book.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '自动同步国', chargeableWeightKg: 10 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('没有匹配的代理成本价');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => expect(response.body.rows.some((row: { agentName: string }) => row.agentName === '自动同步代理')).toBe(false));

    const rule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '保留规则代理', markupPerKg: 1.25, enabled: true })
      .expect(201);

    const julyBook = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '7.8-保留规则代理.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '保留规则代理',
        rows: [
          {
            agentName: '保留规则代理',
            carrierName: '专线',
            channelName: 'TDP-Q8 休斯顿专线',
            realChannelName: 'TDP-Q8 休斯顿专线',
            destinationCountry: '保留规则国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 10,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '保留规则国', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.totalSales).toBe(1125);
      });

    await request(app.getHttpServer())
      .delete(`/api/pricing/books/${julyBook.body.book.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules?detail=true')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([expect.objectContaining({ id: rule.body.id, agentName: '保留规则代理', enabled: true })]));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            agentName: '保留规则代理',
            markupDisplayMode: 'RETAINED_ONLY',
            retainedOnly: true,
            activeLineCount: 0
          })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '保留规则国', chargeableWeightKg: 100 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('没有匹配的代理成本价');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '7.9-保留规则代理.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '保留规则代理',
        rows: [
          {
            agentName: '保留规则代理',
            carrierName: '专线',
            channelName: 'TDP-Q8 休斯顿专线',
            realChannelName: 'TDP-Q8 休斯顿专线',
            destinationCountry: '保留规则国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 20,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '保留规则国', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.totalSales).toBe(2125);
      });
  });

  it('does not reuse cheapest rows as fastest when transit time is unknown', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '无时效代理', markupPerKg: 0.5, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '无时效价格表.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '无时效代理',
        rows: [
          {
            agentName: '无时效代理',
            carrierName: 'UPS',
            channelName: '无时效便宜渠道',
            realChannelName: '无时效便宜渠道',
            destinationCountry: '无时效测试国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 7,
            currency: 'RMB'
          },
          {
            agentName: '无时效代理',
            carrierName: 'UPS',
            channelName: '无时效较贵渠道',
            realChannelName: '无时效较贵渠道',
            destinationCountry: '无时效测试国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 9,
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '无时效测试国', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.cheapestRecommendations.map((item: any) => item.channelName)).toEqual([
          '无时效便宜渠道',
          '无时效较贵渠道'
        ]);
        expect(response.body.fastestRecommendations).toEqual([]);
      });
  });

  it('calculates price lookup on the backend and masks internal cost fields for operators', async () => {
    const adminToken = await app.loginAs('admin');

    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '未导入国', amazonCode: 'AMZ-US-001', chargeableWeightKg: 835 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('没有匹配的代理成本价');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '测试价格表.xls',
        targetModule: 'amazon',
        agentShortName: 'a代理',
        rows: [
          {
            agentName: 'a代理',
            carrierName: 'DHL',
            sourceSheetName: 'YY美西快线海卡渠道汇总',
            channelName: '海运洛杉矶专线',
            businessRouteName: 'HK-DHL',
            realChannelName: 'DHK03',
            destinationCountry: '美国',
            minWeightKg: 0,
            maxWeightKg: 1000,
            costPerKg: 18,
            currency: 'RMB',
            transitDays: 25,
            transitLabel: '22-28 天',
            productSurchargeRemark: '产品附加：带磁加2元/KG',
            specialRemark: '特别说明/尺寸要求：超长件单询'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', amazonCode: 'AMZ-US-001', chargeableWeightKg: 835 })
      .expect(201)
      .expect((response) => {
        expect(response.body.channelName).toBe('海运洛杉矶专线');
        expect(response.body.totalSales).toBe(15447.5);
        expect(response.body.totalCost).toBe(15030);
        expect(response.body.grossProfit).toBe(417.5);
        expect(response.body.price.costPerKg).toBe(18);
        expect(response.body.markup.markupPerKg).toBe(0.5);
        expect(response.body.recommendations[0].productSurchargeRemark).toContain('带磁');
        expect(response.body.recommendations[0].specialRemark).toContain('超长件');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '美国', amazonCode: 'AMZ-US-001', chargeableWeightKg: 1, volumeCbm: 5 })
      .expect(201)
      .expect((response) => {
        expect(response.body.chargeableWeightKg).toBe(835);
        expect(response.body.totalSales).toBe(15447.5);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '美国', amazonCode: 'AMZ-US-001', chargeableWeightKg: 835 })
      .expect(201)
      .expect((response) => {
        expect(response.body.channelName).toBe('海运洛杉矶专线');
        expect(response.body.totalSales).toBe(15447.5);
        expect(response.body.totalCost).toBeUndefined();
        expect(response.body.grossProfit).toBeUndefined();
        expect(response.body.markup).toBeUndefined();
        expect(response.body.price.costPerKg).toBeUndefined();
        expect(response.body.recommendations[0].price.costPerKg).toBeUndefined();
        expect(response.body.recommendations[0].grossProfit).toBeUndefined();
        expect(response.body.recommendations[0].agentName).toBe('海运洛杉矶专线');
        expect(response.body.recommendations[0].channelName).toBe('海运洛杉矶专线');
        expect(response.body.recommendations[0].productSurchargeRemark).toContain('带磁');
        expect(response.body.recommendations[0].specialRemark).toContain('超长件');
      });
  });

  it('business operator publicChannel hides TPD YY codes and supports amazon origin warehouse FTW 出货仓 filtering', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '业务渠道展示价格表.xls',
        targetModule: 'amazon',
        agentShortName: '拓普达',
        rows: [
          {
            agentName: '拓普达',
            carrierName: '海运',
            sourceSheetName: '华东',
            channelName: 'TPD-S4-美西组合海卡',
            realChannelName: 'TPD-S4-美西组合海卡',
            warehouseCode: 'FTW5',
            destinationCountry: '业务渠道展示国',
            minWeightKg: 12,
            maxWeightKg: 100,
            costPerKg: 10,
            currency: 'RMB',
            transitDays: 24,
            transitLabel: '22-26 天'
          },
          {
            agentName: '亿阳国际',
            carrierName: '海运',
            sourceSheetName: '华南',
            channelName: 'YY黄金达海卡',
            realChannelName: 'YY黄金达海卡',
            warehouseCode: 'FTW5',
            destinationCountry: '业务渠道展示国',
            minWeightKg: 12,
            maxWeightKg: 100,
            costPerKg: 11,
            currency: 'RMB',
            transitDays: 25,
            transitLabel: '23-27 天'
          },
          {
            agentName: '英文代理',
            carrierName: '快递',
            sourceSheetName: '深圳/广州仓',
            channelName: 'DHL Express',
            realChannelName: 'DHL Express',
            warehouseCode: 'FTW5',
            destinationCountry: '业务渠道展示国',
            minWeightKg: 12,
            maxWeightKg: 100,
            costPerKg: 12,
            currency: 'RMB',
            transitDays: 5,
            transitLabel: '5-7 天'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '业务渠道展示国', amazonCode: 'FTW5', chargeableWeightKg: 50 })
      .expect(201)
      .expect((response) => {
        expect(response.body.recommendations.map((item: { channelName: string }) => item.channelName)).toEqual(
          expect.arrayContaining(['TPD-S4-美西组合海卡', 'YY黄金达海卡', 'DHL Express'])
        );
        expect(response.body.recommendations[0].totalCost).toBeDefined();
        expect(response.body.recommendations[0].grossProfit).toBeDefined();
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '业务渠道展示国', amazonCode: 'FTW5', chargeableWeightKg: 50 })
      .expect(201)
      .expect((response) => {
        const channels = response.body.recommendations.map((item: { channelName: string }) => item.channelName);
        expect(channels).toEqual(expect.arrayContaining(['美西组合海卡', '黄金达海卡', '可报价线路']));
        expect(response.body.channelName).toBe('美西组合海卡');
        expect(JSON.stringify(response.body)).not.toMatch(/TPD|S4|YY黄金|DHL Express/);
        expect(response.body.totalCost).toBeUndefined();
        expect(response.body.grossProfit).toBeUndefined();
        expect(response.body.markup).toBeUndefined();
        expect(response.body.recommendations[0].price.priceBookId).toBe('');
        expect(response.body.recommendations[0].price.sourceSheetName).toBeUndefined();
        expect(response.body.recommendations[0].price.markupSource).toBeUndefined();
        expect(response.body.recommendations[0].price.costPerKg).toBeUndefined();
        expect(response.body.recommendations[0].grossProfit).toBeUndefined();
      });

    await request(app.getHttpServer())
      .get('/api/pricing/legacy/quote-meta')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.origins).toEqual(expect.arrayContaining(['华东', '华南', '深圳/广州仓']));
        expect(response.body.origins).not.toEqual(expect.arrayContaining(['欧洲空派快递派', '欧洲铁路包税', '西班牙专线', '英国海运', 'TPD-S4-美西组合海卡']));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '业务渠道展示国', amazonCode: 'FTW5', origin: '华东', weightBand: '12KG+', chargeableWeightKg: 50 })
      .expect(201)
      .expect((response) => {
        const bodyText = JSON.stringify(response.body);
        expect(response.body.selected.channelName).toBe('美西组合海卡');
        expect(response.body.recommendations).toHaveLength(1);
        expect(response.body.selected.sourceId).toBeUndefined();
        expect(response.body.selected.sourceFile).toBeUndefined();
        expect(response.body.selected.origin).toBeUndefined();
        expect(response.body.selected.costUnitPrice).toBeUndefined();
        expect(response.body.selected.costTotal).toBeUndefined();
        expect(response.body.selected.grossProfit).toBeUndefined();
        expect(response.body.selected.markup).toBeUndefined();
        expect(response.body.selected.raw).toBeUndefined();
        expect(bodyText).not.toMatch(/拓普达|业务渠道展示价格表|TPD|S4|YY黄金|DHL Express/);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '业务渠道展示国', amazonCode: 'FTW5', origin: '华南', weightBand: '12KG+', chargeableWeightKg: 50 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected.channelName).toBe('YY黄金达海卡');
        expect(response.body.selected.origin).toBe('华南');
        expect(response.body.recommendations).toHaveLength(1);
      });
  });

  it('maps Amazon warehouse codes to regional price table rows before lookup', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '亚马逊仓库映射测试价格表.xls',
        targetModule: 'amazon',
        agentShortName: 'a代理',
        rows: [
          {
            agentName: 'a代理',
            carrierName: '专线',
            sourceSheetName: 'YY美西快线海卡渠道汇总',
            channelName: 'YY美西特惠海卡',
            realChannelName: 'YY美西特惠海卡',
            warehouseCode: 'LAX9',
            destinationCountry: '映射测试国',
            minWeightKg: 0,
            maxWeightKg: 1000,
            costPerKg: 18,
            currency: 'RMB',
            transitDays: 25,
            transitLabel: '22-28 天'
          },
          {
            agentName: 'a代理',
            carrierName: '专线',
            sourceSheetName: 'YY美中快线海卡渠道汇总',
            channelName: 'YY美中休斯顿海卡',
            realChannelName: 'YY美中休斯顿海卡',
            warehouseCode: 'HOU8',
            destinationCountry: '映射测试国',
            minWeightKg: 0,
            maxWeightKg: 1000,
            costPerKg: 12,
            currency: 'RMB',
            transitDays: 20,
            transitLabel: '20-25 天'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '映射测试国', amazonCode: 'ONT8', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.channelName).toBe('YY美西特惠海卡');
        expect(response.body.recommendations.map((item: { channelName: string }) => item.channelName)).not.toContain(
          'YY美中休斯顿海卡'
        );
      });
  });

  it('prefers exact Amazon warehouse fallback tiers before mapped warehouse rows', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '亿阳国际', markupPerKg: 0.5, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: 'ONT8高重量回退价格表.xls',
        targetModule: 'amazon',
        agentShortName: '亿阳国际',
        rows: [
          {
            agentName: '亿阳国际',
            carrierName: '海运',
            sourceSheetName: '海卡快速查询',
            channelName: 'YY美西特惠海卡',
            realChannelName: 'YY美西特惠海卡',
            warehouseCode: 'ONT8',
            destinationCountry: 'ONT8回退测试国',
            minWeightKg: 51,
            maxWeightKg: 99.999,
            costPerKg: 5,
            currency: 'RMB',
            transitDays: 25,
            transitLabel: '24-26 天左右'
          },
          {
            agentName: '亿阳国际',
            carrierName: '海运',
            sourceSheetName: '海卡快速查询',
            channelName: 'YY美西特惠海卡',
            realChannelName: 'YY美西特惠海卡',
            warehouseCode: 'ONT8',
            destinationCountry: 'ONT8回退测试国',
            minWeightKg: 51,
            maxWeightKg: 99.999,
            costPerKg: 4.5,
            currency: 'RMB',
            transitDays: 25,
            transitLabel: '24-26 天左右'
          },
          {
            agentName: '亿阳国际',
            carrierName: '海运',
            sourceSheetName: '海卡快速查询',
            channelName: 'YY美西特惠海卡',
            realChannelName: 'YY美西特惠海卡',
            warehouseCode: 'IUSJ',
            destinationCountry: 'ONT8回退测试国',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 4.8,
            currency: 'RMB',
            transitDays: 25,
            transitLabel: '24-26 天左右'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: 'ONT8回退测试国', amazonCode: 'ONT8', chargeableWeightKg: 835 })
      .expect(201)
      .expect((response) => {
        expect(response.body.price.warehouseCode).toBe('ONT8');
        expect(response.body.price.costPerKg).toBe(4.5);
        expect(response.body.salesRatePerKg).toBe(5);
        expect(response.body.totalSales).toBe(4175);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'ONT8', chargeableWeightKg: 835 })
      .expect(201)
      .expect((response) => {
        expect(response.body.price.warehouseCode).toBe('ONT8');
        expect(response.body.channelName).toBe('YY美西特惠海卡');
        expect(response.body.price.destinationCountry).toBe('ONT8回退测试国');
      });
  });

  it('pricing lookup performance keeps amazon inquiry europeExpress payloads bounded', async () => {
    const adminToken = await app.loginAs('admin');

    const performanceRows = [
      {
        targetModule: 'amazon',
        fileName: '性能治理亚马逊价格表.xls',
        row: {
          agentName: '性能代理',
          carrierName: '海运',
          sourceSheetName: '亚马逊',
          channelName: '美西海卡性能线',
          realChannelName: '美西海卡性能线',
          warehouseCode: 'FTW5',
          destinationCountry: '性能美国',
          minWeightKg: 12,
          maxWeightKg: 1000,
          costPerKg: 10,
          currency: 'RMB'
        }
      },
      {
        targetModule: 'inquiry',
        fileName: '性能治理欧洲海运超大件价格表.xls',
        row: {
          agentName: '性能代理',
          carrierName: '海运',
          sourceSheetName: '欧洲海运超大件',
          channelName: '欧洲海运超大件性能线',
          realChannelName: '欧洲海运超大件性能线',
          destinationCountry: '性能法国',
          minWeightKg: 0,
          maxWeightKg: 2000,
          costPerKg: 20,
          currency: 'RMB'
        }
      },
      {
        targetModule: 'europeExpress',
        fileName: '性能治理欧洲快递价格表.xls',
        row: {
          agentName: '性能代理',
          carrierName: '空运',
          sourceSheetName: '欧洲空海运铁路快递',
          channelName: '欧洲空运快递性能线',
          realChannelName: '欧洲空运快递性能线',
          destinationCountry: '性能法国',
          minWeightKg: 0,
          maxWeightKg: 1000,
          costPerKg: 30,
          currency: 'RMB'
        }
      }
    ] as const;
    for (const item of performanceRows) {
      await request(app.getHttpServer())
        .post('/api/pricing/books/import')
        .set('Authorization', app.auth(adminToken))
        .send({ fileName: item.fileName, targetModule: item.targetModule, agentShortName: item.row.agentName, rows: [item.row] })
        .expect(201);
    }
    const cases = [
      ['/api/pricing/legacy/amazon/quote', { amazonCode: 'FTW5', destinationCountry: '性能美国', chargeableWeightKg: 12 }],
      ['/api/pricing/legacy/inquiry/quote', { destinationCountry: '性能法国', chargeableWeightKg: 835, volumeCbm: 5 }],
      ['/api/pricing/legacy/europe-express/quote', { destinationCountry: '性能法国', channel: '空运' }]
    ] as const;

    for (const [path, body] of cases) {
      await request(app.getHttpServer())
        .post(path)
        .set('Authorization', app.auth(adminToken))
        .send(body)
        .expect(201)
        .expect((response) => {
          expect(response.body.rows).toBeUndefined();
          expect(response.body.recommendations.length).toBeGreaterThan(0);
          expect(response.body.recommendations.length).toBeLessThanOrEqual(100);
          expect(response.body.metrics.matchedRows).toBeGreaterThan(0);
        });
    }
  });

  it('amazon lookup preserves the source workbook weight tier instead of collapsing 21KG into 51KG', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '亚马逊重量段测试价格表.xls',
        targetModule: 'amazon',
        agentShortName: '重量段代理',
        rows: [
          {
            agentName: '重量段代理',
            carrierName: '海运',
            sourceSheetName: '亚马逊',
            channelName: '12段美西线',
            realChannelName: '12段美西线',
            warehouseCode: 'FTW5',
            destinationCountry: '重量段美国',
            minWeightKg: 12,
            maxWeightKg: 49.99,
            costPerKg: 10,
            priceTierLabel: '12KG+',
            currency: 'RMB'
          },
          {
            agentName: '重量段代理',
            carrierName: '海运',
            sourceSheetName: '亚马逊',
            channelName: '51段美西线',
            realChannelName: '51段美西线',
            warehouseCode: 'FTW5',
            destinationCountry: '重量段美国',
            minWeightKg: 50,
            maxWeightKg: 99.999,
            costPerKg: 20,
            priceTierLabel: '51KG+',
            currency: 'RMB'
          },
          {
            agentName: '重量段代理',
            carrierName: '海运',
            sourceSheetName: '亚马逊',
            channelName: '100段美西线',
            realChannelName: '100段美西线',
            warehouseCode: 'FTW5',
            destinationCountry: '重量段美国',
            minWeightKg: 100,
            maxWeightKg: 999,
            costPerKg: 30,
            priceTierLabel: '100KG+',
            currency: 'RMB'
          },
          {
            agentName: '重量段代理',
            carrierName: '海运',
            sourceSheetName: '亚马逊',
            channelName: '21段加拿大线',
            realChannelName: '21段加拿大线',
            warehouseCode: 'YYZ4',
            destinationCountry: '21档加拿大',
            minWeightKg: 21,
            maxWeightKg: 99.999,
            costPerKg: 21,
            priceTierLabel: '21KG+',
            currency: 'RMB'
          },
          {
            agentName: '重量段代理',
            carrierName: '海运',
            sourceSheetName: '亚马逊',
            channelName: '按方包税美西线',
            realChannelName: '按方包税美西线',
            warehouseCode: 'FTW5',
            destinationCountry: '重量段美国',
            minWeightKg: 0,
            maxWeightKg: 99999,
            costPerKg: 1900,
            cbmPrice: 1900,
            priceTierLabel: '按方包税',
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'YYZ4', destinationCountry: '21档加拿大', tier: '12KG+', weightBand: '12KG+', chargeableWeightKg: 50 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('21KG+');
        expect(response.body.selected.weightSegmentLabel).toBe('21KG+');
        expect(response.body.selected.channelName).toBe('21段加拿大线');
        expect(response.body.recommendations.every((row: any) => row.weightSegmentLabel === '21KG+')).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '重量段美国', tier: '51KG+', weightBand: '51KG+', chargeableWeightKg: 51 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('51KG+');
        expect(response.body.selected.weightSegmentLabel).toBe('51KG+');
        expect(response.body.recommendations.every((row: any) => row.weightSegmentLabel === '51KG+')).toBe(true);
        expect(response.body.recommendations.some((row: any) => row.channelName.includes('12段'))).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '重量段美国', tier: '51KG+', weightBand: '51KG+', chargeableWeightKg: 60 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected.warehouseCode).toBe('FTW5');
        expect(response.body.selected.weightSegmentLabel).toBe('51KG+');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '重量段美国', tier: '51KG+', weightBand: '51KG+', chargeableWeightKg: 80 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('51KG+');
        expect(response.body.selected.weightSegmentLabel).toBe('51KG+');
        expect(response.body.recommendations.every((row: any) => row.weightSegmentLabel === '51KG+')).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '重量段美国', tier: '100KG+', weightBand: '100KG+', chargeableWeightKg: 100 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('100KG+');
        expect(response.body.selected.weightSegmentLabel).toBe('100KG+');
        expect(response.body.recommendations.every((row: any) => row.weightSegmentLabel === '100KG+')).toBe(true);
        expect(response.body.recommendations.some((row: any) => row.channelName.includes('12段'))).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '重量段美国', tier: '100KG+', weightBand: '100KG+', chargeableWeightKg: 400 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('100KG+');
        expect(response.body.selected.weightSegmentLabel).toBe('100KG+');
        expect(response.body.recommendations.every((row: any) => row.weightSegmentLabel === '100KG+')).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '重量段美国', tier: '12KG+', weightBand: '12KG+', chargeableWeightKg: 500 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('100KG+');
        expect(response.body.selected.weightSegmentLabel).toBe('100KG+');
        expect(response.body.recommendations.every((row: any) => row.weightSegmentLabel === '100KG+')).toBe(true);
        expect(response.body.recommendations.some((row: any) => row.channelName.includes('12段'))).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW5', destinationCountry: '重量段美国', tier: '按方包税', weightBand: '按方包税', volumeCbm: 1 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('100KG+');
        expect(response.body.selected.weightSegmentLabel).toBe('100KG+');
        expect(response.body.selected.quoteMode).toBe('kg');
        expect(response.body.recommendations.some((row: any) => row.weightSegmentLabel === '按方包税')).toBe(false);
      });

  });

  it('uses the supplier highest actual KG tier when an amazon price book has no 100KG tier', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '最高档51KG价格表.xls',
        targetModule: 'amazon',
        agentShortName: '拓普达',
        rows: [
          {
            agentName: '拓普达',
            carrierName: '海运',
            sourceSheetName: '义乌仓',
            channelName: '仅51KG档美西线',
            realChannelName: '仅51KG档美西线',
            warehouseCode: 'FTW9',
            destinationCountry: '最高档美国',
            minWeightKg: 51,
            maxWeightKg: 99.999,
            costPerKg: 7.4,
            priceTierLabel: '51KG+',
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ amazonCode: 'FTW9', destinationCountry: '最高档美国', tier: '100KG+', weightBand: '100KG+', chargeableWeightKg: 300 })
      .expect(201)
      .expect((response) => {
        expect(response.body.query.weightBand).toBe('51KG+');
        expect(response.body.selected).toEqual(expect.objectContaining({
          channelName: '仅51KG档美西线',
          weightSegmentLabel: '51KG+',
          salesUnitPrice: 7.9,
          salesTotal: 2370
        }));
      });
  });

  it('uses the highest open-ended source tier for non-amazon KG quote modules', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '欧洲最高档51KG价格表.xls',
        targetModule: 'europeExpress',
        agentShortName: '振韵',
        rows: [
          {
            agentName: '振韵',
            carrierName: '空运',
            sourceSheetName: '欧洲空运',
            channelName: '仅51KG档欧洲空运线',
            realChannelName: '仅51KG档欧洲空运线',
            destinationCountry: '最高档法国',
            minWeightKg: 51,
            maxWeightKg: 99.999,
            costPerKg: 8,
            priceTierLabel: '51KG+',
            currency: 'RMB'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '最高档法国', chargeableWeightKg: 300 })
      .expect(201)
      .expect((response) => {
        expect(response.body.selected).toEqual(expect.objectContaining({
          module: 'europeExpress',
          channelName: '欧洲空运 - 仅档 线',
          salesUnitPrice: 8.5,
          salesTotal: 2550
        }));
      });
  });

  it('matches one agent channel KG tier by chargeable weight and rejects overlapping or mismatched-unit tiers', async () => {
    const adminToken = await app.loginAs('admin');
    const importedBook = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '渠道阶梯加价测试.xls',
        targetModule: 'europeExpress',
        agentShortName: '拓普达',
        rows: [{
          agentName: '拓普达',
          carrierName: '阶梯承运商',
          sourceSheetName: '欧洲空运',
          channelName: '阶梯测试渠道',
          realChannelName: '阶梯测试线路',
          destinationCountry: '阶梯测试国',
          minWeightKg: 0,
          maxWeightKg: 9999,
          costPerKg: 10,
          currency: 'RMB'
        }]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/batch-upsert')
      .set('Authorization', app.auth(adminToken))
      .send({ rows: [
        { priceBookId: importedBook.body.book.id, legacyModule: 'europeExpress', agentName: '拓普达', channelName: '阶梯测试渠道', realChannelName: '阶梯测试线路', destinationCountry: '阶梯测试国', markupType: 'WEIGHT', markupPerKg: 1, markupValue: 1, markupUnit: 'KG', minChargeableValue: 12, maxChargeableValue: 51, priority: 10, enabled: true },
        { priceBookId: importedBook.body.book.id, legacyModule: 'europeExpress', agentName: '拓普达', channelName: '阶梯测试渠道', realChannelName: '阶梯测试线路', destinationCountry: '阶梯测试国', markupType: 'WEIGHT', markupPerKg: 0.8, markupValue: 0.8, markupUnit: 'KG', minChargeableValue: 51, maxChargeableValue: 100, priority: 10, enabled: true },
        { priceBookId: importedBook.body.book.id, legacyModule: 'europeExpress', agentName: '拓普达', channelName: '阶梯测试渠道', realChannelName: '阶梯测试线路', destinationCountry: '阶梯测试国', markupType: 'WEIGHT', markupPerKg: 0.5, markupValue: 0.5, markupUnit: 'KG', minChargeableValue: 100, priority: 10, enabled: true }
      ] })
      .expect(201)
      .expect((response) => expect(response.body.successCount).toBe(3));

    for (const [weight, unitPrice] of [[49, 11], [60, 10.8], [120, 10.5]]) {
      await request(app.getHttpServer())
        .post('/api/pricing/legacy/europe-express/quote')
        .set('Authorization', app.auth(adminToken))
        .send({ destinationCountry: '阶梯测试国', chargeableWeightKg: weight })
        .expect(201)
        .expect((response) => {
          expect(response.body.selected).toEqual(expect.objectContaining({ channelName: '阶梯测试渠道', salesUnitPrice: unitPrice, salesTotal: unitPrice * weight }));
        });
    }

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ priceBookId: importedBook.body.book.id, legacyModule: 'europeExpress', agentName: '拓普达', channelName: '阶梯测试渠道', realChannelName: '阶梯测试线路', destinationCountry: '阶梯测试国', markupType: 'WEIGHT', markupPerKg: 2, markupValue: 2, markupUnit: 'KG', minChargeableValue: 49, maxChargeableValue: 60, enabled: true })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('阶梯区间冲突'));

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ priceBookId: importedBook.body.book.id, legacyModule: 'europeExpress', agentName: '拓普达', channelName: '阶梯测试渠道', realChannelName: '阶梯测试线路', destinationCountry: '阶梯测试国', markupType: 'WEIGHT', markupPerKg: 2, markupValue: 2, markupUnit: 'CBM', minChargeableValue: 0, enabled: true })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('CBM'));
  });

  it('keeps route tiers price-book scoped, previews the calculation chain, and removes them with the price book', async () => {
    const adminToken = await app.loginAs('admin');
    const createBook = (fileName: string, costPerKg: number) => request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName,
        targetModule: 'europeExpress',
        agentShortName: '拓普达',
        rows: [{ agentName: '拓普达', sourceSheetName: '德国空运', channelName: '范围渠道', realChannelName: '范围真实线路', destinationCountry: '德国', minWeightKg: 0, maxWeightKg: 9999, costPerKg, currency: 'RMB' }]
      })
      .expect(201);
    const first = await createBook('范围-一.xlsx', 10);
    const second = await createBook('范围-二.xlsx', 20);
    const route = { priceBookId: first.body.book.id, agentName: '拓普达', channelName: '范围渠道', realChannelName: '范围真实线路', destinationCountry: '德国', markupUnit: 'KG' as const, chargeableValue: 80 };

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/route-tiers')
      .set('Authorization', app.auth(adminToken))
      .send({ ...route, tiers: [{ minChargeableValue: 0, maxChargeableValue: 100, markupValue: 1 }] })
      .expect(201)
      .expect((response) => {
        expect(response.body.calculation).toEqual(expect.objectContaining({
          cost: expect.objectContaining({ unitPrice: 10, weightSegmentLabel: '0-9999KG' }),
          markup: expect.objectContaining({ source: 'LINE_TIER', configuredValue: 1 }),
          sale: expect.objectContaining({ unitPrice: 11, totalPrice: 880 })
        }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/route-preview')
      .set('Authorization', app.auth(adminToken))
      .send({ ...route, priceBookId: second.body.book.id })
      .expect(201)
      .expect((response) => expect(response.body.calculation).toEqual(expect.objectContaining({
        markup: expect.objectContaining({ source: 'VIRTUAL_DEFAULT' }),
        sale: expect.objectContaining({ unitPrice: 20.5, totalPrice: 1640 })
      })));

    await request(app.getHttpServer())
      .delete(`/api/pricing/books/${first.body.book.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules/route-preview')
      .set('Authorization', app.auth(adminToken))
      .send(route)
      .expect(404);
  });

  it('does not expose agent channel custom remarks in any pricing module', async () => {
    const adminToken = await app.loginAs('admin');
    await request(app.getHttpServer())
      .get('/api/pricing/channel-custom-remarks?legacyModule=europeExpress')
      .set('Authorization', app.auth(adminToken))
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/pricing/channel-custom-remarks')
      .set('Authorization', app.auth(adminToken))
      .send({ legacyModule: 'europeExpress', agentName: '拓普达', channelName: '备注测试渠道', content: '仅用于客户沟通的渠道提醒' })
      .expect(404);

    await request(app.getHttpServer())
      .put('/api/pricing/channel-custom-remarks/any-id/enabled')
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(404);
  });

  it('normalizes Europe display channels and strips fee or compensation clauses from transit labels', async () => {
    const adminToken = await app.loginAs('admin');
    const imported = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '欧洲渠道时效展示.xlsx',
        targetModule: 'inquiry',
        agentShortName: '拓普达',
        rows: [{
          agentName: '拓普达',
          sourceSheetName: '欧洲海运快递派',
          channelName: '系统下单渠道 中欧海运快船包税 备注 开船后第二天开始算30天',
          realChannelName: '内部下单渠道',
          businessRouteName: '系统下单渠道',
          destinationCountry: '时效展示法国',
          minWeightKg: 100,
          maxWeightKg: 99999,
          costPerKg: 12,
          currency: 'RMB',
          transitLabel: '开船后第二天开始算30天；私人地址派送时效40天；赔偿上限100元/票；私人地址+0.5元/kg，最低80元/票'
        }]
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/pricing/books/${imported.body.book.id}/rows?page=1&pageSize=20`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0]).toEqual(expect.objectContaining({
          channelName: '欧洲海运快递派 - 中欧海运快船包税',
          transitLabel: '30-40天'
        }));
      });

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/inquiry/quote')
      .set('Authorization', app.auth(adminToken))
      .send({ destinationCountry: '时效展示法国', chargeableWeightKg: 120 })
      .expect(201)
      .expect((response) => {
        const hit = response.body.recommendations.find((item: { channelName?: string }) => item.channelName === '欧洲海运快递派 - 中欧海运快船包税');
        expect(hit).toEqual(expect.objectContaining({ transitLabel: '30-40天' }));
        expect(JSON.stringify(hit)).not.toMatch(/赔偿|元\/kg|元\/票/);
      });
  });

  it('merges Europe routes named 快递 into air, sea or rail and excludes unclassified routes', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '欧洲快递归类回归.xlsx',
        targetModule: 'europeExpress',
        agentShortName: '拓普达',
        rows: [
          { agentName: '拓普达', sourceSheetName: '欧洲空海运铁路快递', channelName: '欧洲海运快递派', realChannelName: '欧洲海运快递派', destinationCountry: '欧洲归类测试国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 10, currency: 'RMB' },
          { agentName: '拓普达', sourceSheetName: '欧洲空海运铁路快递', channelName: '空运快递专线', realChannelName: '空运快递专线', destinationCountry: '欧洲归类测试国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 11, currency: 'RMB' },
          { agentName: '拓普达', sourceSheetName: '欧洲空海运铁路快递', channelName: '铁路快递派', realChannelName: '铁路快递派', destinationCountry: '欧洲归类测试国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 12, currency: 'RMB' },
          { agentName: '拓普达', sourceSheetName: '欧洲空海运铁路快递', channelName: '欧洲快递服务', realChannelName: '欧洲快递服务', destinationCountry: '欧洲归类测试国', minWeightKg: 0, maxWeightKg: 1000, costPerKg: 9, currency: 'RMB' }
        ]
      })
      .expect(201);

    const quote = (token: string, channel?: string) => request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(token))
      .send({ destinationCountry: '欧洲归类测试国', chargeableWeightKg: 20, ...(channel ? { channel } : {}) });

    await quote(adminToken)
      .expect(201)
      .expect((response) => {
        const names = response.body.recommendations.map((item: { channelName: string }) => item.channelName);
        expect(names).toEqual(expect.arrayContaining(['欧洲海运快递派', '空运快递专线', '铁路快递派']));
        expect(names).not.toContain('欧洲快递服务');
      });
    await quote(adminToken, '海运').expect(201).expect((response) => expect(response.body.recommendations.map((item: { channelName: string }) => item.channelName)).toEqual(['欧洲海运快递派']));
    await quote(adminToken, '空运').expect(201).expect((response) => expect(response.body.recommendations.map((item: { channelName: string }) => item.channelName)).toEqual(['空运快递专线']));
    await quote(adminToken, '铁路').expect(201).expect((response) => expect(response.body.recommendations.map((item: { channelName: string }) => item.channelName)).toEqual(['铁路快递派']));
    await quote(adminToken, '快递').expect(400).expect((response) => expect(response.body.message).toBe('欧洲查询仅支持空运、海运、铁路或全部渠道筛选'));
    await quote(operatorToken, '海运')
      .expect(201)
      .expect((response) => {
        const row = response.body.recommendations[0];
        expect(row).not.toHaveProperty('costUnitPrice');
        expect(row).not.toHaveProperty('grossProfit');
        expect(JSON.stringify(row)).not.toContain('sourceSheetName');
      });
  });

  it('enforces saved fine-grained pricing permissions while keeping customers outside internal lookup', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_BUSINESS/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['pricing:lookup:view', 'pricing:lookup:meta-view', 'pricing:lookup:amazon', 'pricing:lookup:europe-express'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/pricing/legacy/quote-meta')
      .set('Authorization', app.auth(operatorToken))
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/europe-express/quote')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '德国', chargeableWeightKg: 10 })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('没有匹配的代理成本价'));

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/uk-express/quote')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '英国', channel: '海运', chargeableWeightKg: 10 })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/canada-air-sea/quote')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '加拿大', chargeableWeightKg: 10 })
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['pricing:lookup:amazon'] })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/pricing/legacy/amazon/quote')
      .set('Authorization', app.auth(customerToken))
      .send({ destinationCountry: '美国', amazonCode: 'AMZ-US-001', chargeableWeightKg: 10 })
      .expect(403);
  });
});
