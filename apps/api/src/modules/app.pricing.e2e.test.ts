import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Siyuan API pricing', () => {
  const app = setupE2eApp();

  it('keeps markup rules admin-only and strips internal price fields for operator lookup', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    const channelRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: 'a代理', channelName: '海运洛杉矶专线', markupPerKg: 3, enabled: true })
      .expect(201);
    expect(channelRule.body.channelName).toBe('海运洛杉矶专线');

    const lineRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: 'a代理', channelName: 'DHL HK', realChannelName: 'DHL代理', markupPerKg: 2, enabled: true })
      .expect(201);
    expect(lineRule.body.realChannelName).toBe('DHL代理');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: 'DHL线路测试价格表.xls',
        rows: [
          {
            agentName: 'a代理',
            carrierName: 'DHL',
            sourceSheetName: 'DHL测试小表',
            channelName: 'DHL HK',
            businessRouteName: 'HK-DHL',
            realChannelName: 'DHL代理',
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
      .post('/api/pricing/lookup')
      .set('Authorization', app.auth(operatorToken))
      .send({ destinationCountry: '美国', chargeableWeightKg: 10, amazonCode: 'AMZ-US-001' })
      .expect(201)
      .expect((response) => {
        expect(JSON.stringify(response.body)).not.toContain('costPerKg');
        expect(JSON.stringify(response.body)).not.toContain('grossProfit');
        const dhlRecommendation = response.body.recommendations.find((item: any) => item.realChannelName === 'DHL代理');
        expect(dhlRecommendation.totalSales).toBe(220);
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

    const imported = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '测试价格表.xlsx',
        rows: [
          {
            agentName: '规则保留代理',
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
    expect(imported.body.book.rowCount).toBe(1);
    expect(imported.body.rows[0].priceBookId).toBe(imported.body.book.id);
    const markupRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(adminToken))
      .send({ agentName: '规则保留代理', markupPerKg: 0.9, enabled: true })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/pricing/books/${imported.body.book.id}/remark`)
      .set('Authorization', app.auth(adminToken))
      .send({ remark: '亚马逊卡派最长边 180CM-220CM' })
      .expect(200)
      .expect((response) => {
        expect(response.body.remark).toContain('最长边');
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

  it('accepts large parsed price book imports from XLS uploads', async () => {
    const adminToken = await app.loginAs('admin');
    const rows = Array.from({ length: 800 }, (_, index) => ({
      agentName: '大表代理',
      carrierName: '专线',
      channelName: `海运测试渠道-${index}`,
      realChannelName: `TEST-REAL-${index}`,
      warehouseCode: 'LAX9',
      destinationCountry: '美国',
      minWeightKg: 0,
      maxWeightKg: 99999,
      costPerKg: 18 + (index % 5),
      currency: 'RMB',
      transitDays: 22,
      transitLabel: '22-28 天',
      surchargeFee: 0,
      surchargeDetails: [{ name: '测试附加费', amount: 0 }]
    }));

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({ fileName: '大价格表.xlsx', rows })
      .expect(201)
      .expect((response) => {
        expect(response.body.book.rowCount).toBe(rows.length);
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
        expect(response.body.recommendations[0].productSurchargeRemark).toContain('带磁');
        expect(response.body.recommendations[0].specialRemark).toContain('超长件');
      });
  });

  it('maps Amazon warehouse codes to regional price table rows before lookup', async () => {
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', app.auth(adminToken))
      .send({
        fileName: '亚马逊仓库映射测试价格表.xls',
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
});
