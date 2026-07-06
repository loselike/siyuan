import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Siyuan API warehouse', () => {
  const app = setupE2eApp();
  const sensitiveWarehouseKeys = [
    'receivable',
    'receivableTotal',
    'payable',
    'payableTotal',
    'businessCost',
    'businessProfit',
    'grossProfit',
    'bankAccountNo',
    'waterReceipt',
    'paymentAmountCny',
    'paymentAmountUsd'
  ];

  function expectNoWarehousePriceLeak(value: unknown) {
    const keys = new Set<string>();
    const collect = (item: unknown) => {
      if (!item || typeof item !== 'object') return;
      if (Array.isArray(item)) {
        item.forEach(collect);
        return;
      }
      Object.entries(item as Record<string, unknown>).forEach(([key, child]) => {
        keys.add(key);
        collect(child);
      });
    };
    collect(value);
    sensitiveWarehouseKeys.forEach((key) => expect(keys.has(key)).toBe(false));
  }

  async function approveForRouting(token: string, shipmentId: string, agentName = '仓库测试供应商') {
    const financeToken = await app.loginAs('finance');
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/finance-items`)
      .set('Authorization', app.auth(token))
      .send({ type: 'RECEIVABLE', name: '客户运费', amount: 100, currency: 'RMB' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/finance-items`)
      .set('Authorization', app.auth(token))
      .send({ type: 'BUSINESS_COST', name: '业务成本', amount: 60, currency: 'RMB', agentName })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/review/approve`)
      .set('Authorization', app.auth(financeToken))
      .expect(201);
  }

  async function approveTransferData(token: string, shipmentId: string) {
    await request(app.getHttpServer()).post(`/api/shipments/${shipmentId}/business-data/approve`).set('Authorization', app.auth(token)).send({}).expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${shipmentId}/agent-data/approve`).set('Authorization', app.auth(token)).send({}).expect(201);
  }

  it('accepts Mojia device measurements and lands them in today receipts', async () => {
    process.env.MOJIA_DEVICE_TOKEN = 'test-mojia-token';
    const adminToken = await app.loginAs('admin');

    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'wrong-token')
      .send({
        orderNo: '9409-KYMJ0001',
        length: 100.1,
        width: 100.2,
        height: 100.3,
        weight: 100.4,
        machineNo: 'MJ20210327'
      })
      .expect(401);

    const mojiaPayload = {
      barcode: '9409-KYMJ0001',
      lengthCm: 100.1,
      widthCm: 100.2,
      heightCm: 100.3,
      weightKg: 100.4,
      measuredAt: '2026-06-12 11:00:00',
      deviceNo: 'MJ20210327'
    };

    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send(mojiaPayload)
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'true', message: '9409-KYMJ0001 录入成功' });
      });

    for (let retryIndex = 0; retryIndex < 3; retryIndex += 1) {
      await request(app.getHttpServer())
        .post('/api/integrations/mojia/measurements')
        .set('X-Device-Token', 'test-mojia-token')
        .send(mojiaPayload)
        .expect(201)
        .expect((response) => {
          expect(response.body).toEqual({ result: 'true', message: '9409-KYMJ0001 已接收' });
        });
    }

    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send({ ...mojiaPayload, barcode: '9409-KYMJ0002', measuredAt: '1783323455600' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'true', message: '9409-KYMJ0002 录入成功' });
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-07-06', customTo: '2026-07-06', combinedOrderNo: '9409-KYMJ0002' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0]).toEqual(expect.objectContaining({
          combinedOrderNo: '9409-KYMJ0002',
          scanTime: '2026-07-06T07:37:35.000Z'
        }));
      });

    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send({ ...mojiaPayload, barcode: '9409-KYMJ0002', measuredAt: '1783323455600' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'true', message: '9409-KYMJ0002 已接收' });
      });

    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send({ ...mojiaPayload, barcode: '9409-KYMJ0003', measuredAt: 'bad-time' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'true', message: '9409-KYMJ0003 录入成功' });
      });

    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send({ ...mojiaPayload, barcode: 'J721-', measuredAt: '1783322828861' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'true', message: 'J721-待补充 录入成功' });
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-07-06', customTo: '2026-07-06', combinedOrderNo: 'J721-待补充' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0]).toEqual(expect.objectContaining({
          customerCode: 'J721',
          domesticTrackingNo: '待补充',
          combinedOrderNo: 'J721-待补充',
          remark: '设备号：MJ20210327'
        }));
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-06-12', customTo: '2026-06-12', combinedOrderNo: '9409-KYMJ0001' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toHaveLength(1);
        expect(response.body.rows).toEqual([
          expect.objectContaining({
            customerCode: '9409',
            customerOrderNo: '9409',
            domesticTrackingNo: 'KYMJ0001',
            combinedOrderNo: '9409-KYMJ0001',
            scanSource: '墨家设备',
            weightKg: 100.4,
            lengthCm: 100.1,
            widthCm: 100.2,
            heightCm: 100.3,
            remark: '设备号：MJ20210327',
            createdBy: 'mojia-device'
          })
        ]);
        expectNoWarehousePriceLeak(response.body);
      });
  });

  it('summarizes today receipts, snapshots staff site, and scopes operator rows', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const site = await request(app.getHttpServer())
      .post('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .send({ name: '深圳站临时', sortOrder: 5 })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ name: '深圳站临时', sortOrder: 5, enabled: true }));
      });
    await request(app.getHttpServer())
      .get('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ name: '深圳思远' }), expect.objectContaining({ name: '深圳站' })]));
      });
    await request(app.getHttpServer())
      .post('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .send({ name: '深圳站临时' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .send({ name: ' ' })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/api/system/sites/${site.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ name: '深圳站临时改', sortOrder: 6 })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ name: '深圳站临时改', sortOrder: 6 }));
      });
    await request(app.getHttpServer())
      .put(`/api/system/sites/${site.body.id}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });
    await request(app.getHttpServer())
      .get('/api/system/sites')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=security.permission.denied')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'security.permission.denied',
              actorUsername: 'operator',
              result: 'FAILED'
            })
          ])
        );
      });

    await request(app.getHttpServer())
      .put('/api/system/staff-accounts/u-op/site')
      .set('Authorization', app.auth(adminToken))
      .send({ site: '深圳站' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({ id: 'u-op', site: '深圳站' }));
      });

    const first = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-TODAY-001',
        expectedTotalPackageCount: 2,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 10,
        lengthCm: 100,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-06-12T10:00:00.000+08:00',
        scanSource: '扫码'
      })
      .expect(201);
    expect(first.body).toEqual(expect.objectContaining({
      customerCode: '9409',
      customerName: '9409-Daloday',
      customerOrderNo: '9409',
      domesticTrackingNo: 'KY-TODAY-001',
      combinedOrderNo: '9409-KY-TODAY-001',
      receivingChannel: '外部标签识别',
      volumetricWeightKg: 33.33,
      volumetricWeightKg5000: 40,
      createdBy: 'admin'
    }));

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.package.create')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'warehouse.package.create',
              target: first.body.id,
              after: expect.objectContaining({
                customerCode: '9409',
                customerOrderNo: '9409',
                domesticTrackingNo: 'KY-TODAY-001',
                combinedOrderNo: '9409-KY-TODAY-001',
                receivingChannel: '外部标签识别',
                packageCount: 1,
                weightKg: 10,
                lengthCm: 100,
                widthCm: 50,
                heightCm: 40,
                volumetricWeightKg: 33.33,
                volumetricWeightKg5000: 40,
                scanSource: '扫码'
              })
            })
          ])
        );
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.receive')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toHaveLength(0);
      });

    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-TODAY-001',
        expectedTotalPackageCount: 2,
        packageIndex: 2,
        packageCount: 2,
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        scanTime: '2026-06-12T10:01:00.000+08:00',
        scanSource: '扫码'
      })
      .expect(201);

    const adminToday = await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-06-12', customTo: '2026-06-12', customerOrderNo: '9409', domesticTrackingNo: 'KY-TODAY-001' })
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    expect(adminToday.body.totals).toEqual(expect.objectContaining({
      receiptTickets: 1,
      totalPackages: 3,
      totalWeightKg: 20,
      pendingTallyTickets: 1
    }));
    expect(adminToday.body.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: first.body.id,
        customerCode: '9409',
        customerName: '9409-Daloday',
        salesperson: 'operator',
        site: '深圳站',
        scanSource: '扫码',
        volumetricWeightKg5000: 40,
        createdBy: 'admin'
      })
    ]));
    expectNoWarehousePriceLeak(adminToday.body);

    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-TODAY-001' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: first.body.id,
            customerCode: '9409',
            combinedOrderNo: '9409-KY-TODAY-001',
            tallyStatus: '待理货',
            outboundStatus: '未出库'
          })
        ]));
        expectNoWarehousePriceLeak(response.body);
      });

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${first.body.id}/exception`)
      .set('Authorization', app.auth(adminToken))
      .send({ manualException: '包装破损' })
      .expect(200)
      .expect((response) => {
        expect(response.body.manualException).toBe('包装破损');
        expect(response.body.exceptions).toContain('部分到仓');
      });

    const operatorToday = await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-06-12', customTo: '2026-06-12' })
      .set('Authorization', app.auth(operatorToken))
      .expect(200);

    expect(operatorToday.body.rows.length).toBeGreaterThan(0);
    expect(operatorToday.body.rows.every((row: { customerCode: string }) => row.customerCode === '9409')).toBe(true);
    expect(operatorToday.body.rows.every((row: { site?: string }) => row.site === undefined)).toBe(true);
    expect(operatorToday.body.totals.exceptionTickets).toBeGreaterThan(0);
    expectNoWarehousePriceLeak(operatorToday.body);

    await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(operatorToken))
      .send({
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-FORBIDDEN-001',
        packageCount: 1,
        weightKg: 1,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10
      })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${first.body.id}/exception`)
      .set('Authorization', app.auth(operatorToken))
      .send({ manualException: '业务员不应能改异常' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${first.body.id}`)
      .set('Authorization', app.auth(operatorToken))
      .send({ weightKg: 1 })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${first.body.id}/split`)
      .set('Authorization', app.auth(operatorToken))
      .send({ splitCount: 2 })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(operatorToken))
      .send({ packageIds: [first.body.id], mode: 'MERGE_ONLY' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=security.permission.denied')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'security.permission.denied',
              actorUsername: 'operator',
              target: expect.stringContaining('/api/warehouse/packages'),
              result: 'FAILED',
              after: expect.objectContaining({ permissions: ['warehouse:write'] })
            })
          ])
        );
      });
  });

  it('groups warehouse API packages and creates draft shipments from consolidation', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const groups = await request(app.getHttpServer())
      .get('/api/warehouse/package-groups')
      .set('Authorization', app.auth(token))
      .expect(200);

    const group1399 = groups.body.find((row: { customerOrderNo: string }) => row.customerOrderNo === '1399');
    expect(group1399).toEqual(expect.objectContaining({
      combinedOrderNo: '1399-KY4001036478949',
      expectedTotalPackageCount: 10,
      arrivedPackageCount: 3,
      remainingPackageCount: 7
    }));

    const packages = await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200);
    const packageIds = packages.body
      .filter((row: { customerOrderNo: string }) => row.customerOrderNo === '1399')
      .slice(0, 2)
      .map((row: { id: string }) => row.id);

    const mergeOnly = await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(token))
      .send({ packageIds, mode: 'MERGE_ONLY' })
      .expect(201);
    expect(mergeOnly.body.consolidationNo).toBe('1399-MERGE001');
    expect(mergeOnly.body.systemOrderNo).toBeUndefined();

    const remainingPackageIds = packages.body
      .filter((row: { customerOrderNo: string; id: string }) => row.customerOrderNo === 'P710')
      .slice(0, 2)
      .map((row: { id: string }) => row.id);
    const mergeAndShip = await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(token))
      .send({ packageIds: remainingPackageIds, mode: 'MERGE_AND_SHIP' })
      .expect(201);
    expect(mergeAndShip.body.systemOrderNo).toBe('P710-OUT001');

    const draftShipment = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .then((response) => response.body.find((shipment: { systemOrderNo: string }) => shipment.systemOrderNo === 'P710-OUT001'));
    expect(draftShipment).toEqual(expect.objectContaining({ status: 'DRAFT' }));

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining(
            remainingPackageIds.map((id: string) =>
              expect.objectContaining({ id, shipmentId: draftShipment.id, systemOrderNo: 'P710-OUT001', status: 'CONSOLIDATED' })
            )
          )
        );
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ systemOrderNo: 'P710-OUT001', status: 'DRAFT' })
          ])
        );
      });
  });

  it('lists in-stock packages, splits by pieces, and creates outbound order with tally requirement', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const operatorToken = await app.loginAs('operator');

    const created = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-STOCK-075',
        expectedTotalPackageCount: 75,
        packageIndex: 1,
        packageCount: 75,
        weightKg: 75,
        lengthCm: 100,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-06-12T11:00:00.000+08:00',
        remark: '整票待拆'
      })
      .expect(201);
    expect(created.body).toEqual(expect.objectContaining({
      customerCode: '9409',
      customerName: '9409-Daloday',
      customerOrderNo: '9409',
      domesticTrackingNo: 'KY-STOCK-075',
      combinedOrderNo: '9409-KY-STOCK-075',
      receivingChannel: '外部标签识别',
      packageCount: 75,
      volumetricWeightKg: 2500,
      volumetricWeightKg5000: 3000,
      createdBy: 'admin'
    }));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({
        packageCount: 75,
        weightKg: 76,
        lengthCm: 101,
        widthCm: 50,
        heightCm: 40,
        remark: '固定样本件重尺复核',
        manualException: '外箱复核'
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          combinedOrderNo: '9409-KY-STOCK-075',
          packageCount: 75,
          weightKg: 76,
          lengthCm: 101,
          remark: '固定样本件重尺复核',
          manualException: '外箱复核',
          customerName: '9409-Daloday',
          volumetricWeightKg: 2525,
          volumetricWeightKg5000: 3030,
          createdBy: 'admin'
        }));
        expect(response.body.cbm).toBeGreaterThan(0);
        expect(response.body.volumetricWeightKg).toBeGreaterThan(0);
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-06-12', customTo: '2026-06-12', combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.totals).toEqual(expect.objectContaining({ receiptTickets: 1, totalPackages: 75 }));
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            customerName: '9409-Daloday',
            combinedOrderNo: '9409-KY-STOCK-075',
            manualException: '外箱复核',
            volumetricWeightKg: 2525,
            volumetricWeightKg5000: 3030,
            createdBy: 'admin'
          })
        ]));
        expectNoWarehousePriceLeak(response.body);
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.today_receipts.view')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.today_receipts.view',
            target: 'warehouse:today-receipts',
            after: expect.objectContaining({
              query: expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075' }),
              rowCount: expect.any(Number)
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .put(`/api/warehouse/packages/${created.body.id}/remark`)
      .set('Authorization', app.auth(adminToken))
      .send({ remark: '今日收货备注复核' })
      .expect(200)
      .expect((response) => {
        expect(response.body.remark).toBe('今日收货备注复核');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.package.remark.update')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.package.remark.update',
            target: created.body.id,
            before: expect.objectContaining({ remark: '固定样本件重尺复核' }),
            after: expect.objectContaining({ remark: '今日收货备注复核' })
          })
        ]));
      });

    const adminInStock = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ customerOrderNo: '9409', combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(adminToken))
      .expect(200);

    expect(adminInStock.body.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: created.body.id,
        customerCode: '9409',
        customerName: '9409-Daloday',
        combinedOrderNo: '9409-KY-STOCK-075',
        packageCount: 75,
        girthCm: 281,
        totalCbm: 15.15,
        volumetricWeightKg: 2525,
        volumetricWeightKg5000: 3030,
        totalVolumetricWeightKg: 2525,
        totalVolumetricWeightKg5000: 3030,
        receiptSourceId: created.body.id,
        tallyStatus: '待理货',
        splitStatus: '原始票',
        consolidationStatus: '未合票',
        outboundStatus: '未出库',
        createdBy: 'admin'
      })
    ]));
    expect(adminInStock.body.totals).toEqual(expect.objectContaining({
      receiptTickets: 1,
      totalPackages: 75,
      totalWeightKg: 5700
    }));
    expectNoWarehousePriceLeak(adminInStock.body);

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.in_stock.view')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.in_stock.view',
            target: 'warehouse:in-stock',
            after: expect.objectContaining({
              query: expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075' }),
              rowCount: expect.any(Number)
            })
          })
        ]));
      });

    const operatorInStock = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(operatorToken))
      .expect(200);
    expect(operatorInStock.body.rows.length).toBeGreaterThan(0);
    expect(operatorInStock.body.rows.every((row: { site?: string }) => row.site === undefined)).toBe(true);
    expectNoWarehousePriceLeak(operatorInStock.body);

    const tallyTask = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({
        packageIds: [created.body.id],
        tallyRequirement: '拆分 50/25，保留原箱唛头',
        remark: '固定样本发起理货'
      })
      .expect(201);
    expect(tallyTask.body).toEqual(expect.objectContaining({
      taskNo: expect.stringMatching(/^9409-KY-STOCK-075-TL001$/),
      status: 'PENDING',
      sourcePackageId: created.body.id,
      sourceCombinedOrderNo: '9409-KY-STOCK-075',
      customerCode: '9409',
      customerName: '9409-Daloday',
      packageCount: 75,
      originalWeightKg: 5700,
      originalLengthCm: 101,
      originalWidthCm: 50,
      originalHeightCm: 40,
      originalVolumetricWeightKg: 2525,
      originalVolumetricWeightKg5000: 3030,
      tallyRequirement: '拆分 50/25，保留原箱唛头',
      createdBy: 'warehouse',
      labelStatus: 'NOT_GENERATED'
    }));
    expectNoWarehousePriceLeak(tallyTask.body);

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .query({ status: 'PENDING', combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: tallyTask.body.id,
            status: 'PENDING',
            tallyRequirement: '拆分 50/25，保留原箱唛头'
          })
        ]));
        expectNoWarehousePriceLeak(response.body);
      });

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/complete`)
      .set('Authorization', app.auth(operatorToken))
      .send({ packageCount: 75, weightKg: 76, lengthCm: 101, widthCm: 50, heightCm: 40 })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/warehouse/tally-tasks/${tallyTask.body.id}`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ remark: '已确认按 50/25 分拣' })
      .expect(200)
      .expect((response) => {
        expect(response.body.remark).toBe('已确认按 50/25 分拣');
      });

    const completedTallyTask = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({
        packageCount: 75,
        weightKg: 76,
        lengthCm: 101,
        widthCm: 50,
        heightCm: 40,
        remark: '理货完成，保留原箱唛头'
      })
      .expect(201);
    expect(completedTallyTask.body).toEqual(expect.objectContaining({
      id: tallyTask.body.id,
      status: 'COMPLETED',
      completedPackageCount: 75,
      completedWeightKg: 76,
      completedLengthCm: 101,
      completedWidthCm: 50,
      completedHeightCm: 40,
      completedVolumetricWeightKg: 2525,
      completedVolumetricWeightKg5000: 3030,
      completedBy: 'warehouse',
      labelStatus: 'NOT_GENERATED'
    }));
    expect(completedTallyTask.body.completedAt).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/label`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    const generatedLabel = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/label`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(generatedLabel.body).toEqual(expect.objectContaining({
      id: tallyTask.body.id,
      labelStatus: 'GENERATED',
      labelNo: '9409-KY-STOCK-075-TL001-LBL',
      labelGeneratedBy: 'warehouse'
    }));
    expect(generatedLabel.body.labelGeneratedAt).toBeTruthy();
    expect(generatedLabel.body.labelQrContent).toEqual(expect.stringContaining('"type":"WAREHOUSE_TALLY_LABEL"'));
    expect(generatedLabel.body.labelQrContent).toEqual(expect.stringContaining('"customerCode":"9409"'));
    expect(generatedLabel.body.labelQrContent).toEqual(expect.stringContaining(`"sourcePackageId":"${created.body.id}"`));
    expect(generatedLabel.body.labelQrContent).toEqual(expect.stringContaining('"packageCount":75'));
    expectNoWarehousePriceLeak(generatedLabel.body);

    const printedLabel = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/label/print`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(printedLabel.body).toEqual(expect.objectContaining({
      labelNo: '9409-KY-STOCK-075-TL001-LBL',
      labelPrintedBy: 'warehouse'
    }));
    expect(printedLabel.body.labelPrintedAt).toBeTruthy();

    const downloadedLabel = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/label/download`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(downloadedLabel.body).toEqual(expect.objectContaining({
      labelNo: '9409-KY-STOCK-075-TL001-LBL',
      labelDownloadedBy: 'warehouse'
    }));
    expect(downloadedLabel.body.labelDownloadedAt).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(operatorToken))
      .send({ labelNo: generatedLabel.body.labelNo })
      .expect(403);

    const appliedLabel = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: generatedLabel.body.labelNo })
      .expect(201);
    expect(appliedLabel.body).toEqual(expect.objectContaining({
      alreadyApplied: false,
      task: expect.objectContaining({
        id: tallyTask.body.id,
        appliedPackageNo: '9409-KY-STOCK-075',
        labelAppliedBy: 'warehouse'
      }),
      package: expect.objectContaining({
        combinedOrderNo: '9409-KY-STOCK-075',
        sourcePackageId: created.body.id,
        sourcePackageNo: '9409-KY-STOCK-075',
        tallyTaskId: tallyTask.body.id,
        tallyTaskNo: '9409-KY-STOCK-075-TL001',
        status: 'RECEIVED',
        tallyStatus: '已理货',
        scanSource: '理货后标签扫描'
      })
    }));
    expect(appliedLabel.body.task.labelAppliedAt).toBeTruthy();
    expectNoWarehousePriceLeak(appliedLabel.body);

    const duplicateAppliedLabel = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: generatedLabel.body.labelNo })
      .expect(201);
    expect(duplicateAppliedLabel.body.alreadyApplied).toBe(true);
    expect(duplicateAppliedLabel.body.package.id).toBe(appliedLabel.body.package.id);

    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: appliedLabel.body.package.id,
            tallyStatus: '已理货'
          })
        ]));
        expect(response.body.rows.some((row: { id: string }) => row.id === created.body.id)).toBe(false);
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .query({ status: 'COMPLETED', combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: tallyTask.body.id,
            status: 'COMPLETED',
            sourceCombinedOrderNo: '9409-KY-STOCK-075',
            labelNo: '9409-KY-STOCK-075-TL001-LBL',
            labelStatus: 'GENERATED',
            labelDownloadedBy: 'warehouse',
            appliedPackageNo: '9409-KY-STOCK-075'
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.create')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.create',
            actorUsername: 'warehouse',
            target: tallyTask.body.id,
            after: expect.objectContaining({
              status: 'PENDING',
              sourcePackageId: created.body.id,
              sourceCombinedOrderNo: '9409-KY-STOCK-075',
              packageCount: 75,
              originalWeightKg: 5700,
              originalLengthCm: 101,
              originalWidthCm: 50,
              originalHeightCm: 40,
              tallyRequirement: '拆分 50/25，保留原箱唛头',
              createdBy: 'warehouse'
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.update')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.update',
            actorUsername: 'warehouse',
            target: tallyTask.body.id,
            before: expect.objectContaining({ remark: '固定样本发起理货' }),
            after: expect.objectContaining({ remark: '已确认按 50/25 分拣' })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.complete')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.complete',
            actorUsername: 'warehouse',
            target: tallyTask.body.id,
            before: expect.objectContaining({ status: 'PENDING', originalWeightKg: 5700 }),
            after: expect.objectContaining({
              status: 'COMPLETED',
              completedPackageCount: 75,
              completedWeightKg: 76,
              completedLengthCm: 101,
              completedWidthCm: 50,
              completedHeightCm: 40,
              completedBy: 'warehouse'
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.label.generate')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.label.generate',
            actorUsername: 'warehouse',
            target: '9409-KY-STOCK-075-TL001-LBL',
            after: expect.objectContaining({
              labelNo: '9409-KY-STOCK-075-TL001-LBL',
              labelStatus: 'GENERATED',
              labelQrContent: expect.stringContaining(`"sourcePackageId":"${created.body.id}"`)
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.label.print')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.label.print',
            actorUsername: 'warehouse',
            target: '9409-KY-STOCK-075-TL001-LBL',
            after: expect.objectContaining({ labelPrintedBy: 'warehouse' })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.label.download')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.label.download',
            actorUsername: 'warehouse',
            target: '9409-KY-STOCK-075-TL001-LBL',
            after: expect.objectContaining({ labelDownloadedBy: 'warehouse' })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.label.apply')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.label.apply',
            actorUsername: 'warehouse',
            target: '9409-KY-STOCK-075-TL001-LBL',
            after: expect.objectContaining({
              archivedPackageIds: expect.arrayContaining([created.body.id])
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.package.update')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.package.update',
            target: created.body.id,
            before: expect.objectContaining({ packageCount: 75, weightKg: 75, lengthCm: 100, widthCm: 50, heightCm: 40 }),
            after: expect.objectContaining({ packageCount: 75, weightKg: 76, lengthCm: 101, widthCm: 50, heightCm: 40, remark: '固定样本件重尺复核' })
          })
        ]));
      });

    const split = await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${created.body.id}/split`)
      .set('Authorization', app.auth(adminToken))
      .send({ pieces: [50, 25], remark: '拆分 50/25 理货' })
      .expect(201);

    expect(split.body.sourcePackage).toEqual(expect.objectContaining({
      id: created.body.id,
      status: 'CONSOLIDATED'
    }));
    expect(split.body.packages).toEqual([
      expect.objectContaining({
        combinedOrderNo: '9409-KY-STOCK-075-1',
        packageCount: 50,
        weightKg: 50.67,
        cbm: expect.any(Number)
      }),
      expect.objectContaining({
        combinedOrderNo: '9409-KY-STOCK-075-2',
        packageCount: 25,
        weightKg: 25.33,
        cbm: expect.any(Number)
      })
    ]);

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.package.split')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'warehouse.package.split',
              target: created.body.id,
              after: expect.objectContaining({
                sourcePackageId: created.body.id,
                sourcePackageNo: '9409-KY-STOCK-075',
                splitCount: 2,
                pieces: [50, 25],
                before: expect.objectContaining({ packageCount: 75, weightKg: 5700 }),
                after: expect.objectContaining({ packageCount: 75, weightKg: 76 }),
                children: expect.arrayContaining([
                  expect.objectContaining({
                    id: split.body.packages[0].id,
                    combinedOrderNo: '9409-KY-STOCK-075-1',
                    sourcePackageId: created.body.id,
                    packageCount: 50,
                    weightKg: 50.67
                  }),
                  expect.objectContaining({
                    id: split.body.packages[1].id,
                    combinedOrderNo: '9409-KY-STOCK-075-2',
                    sourcePackageId: created.body.id,
                    packageCount: 25,
                    weightKg: 25.33
                  })
                ])
              })
            })
          ])
        );
      });

    const splitInStock = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(splitInStock.body.rows.some((row: { id: string }) => row.id === created.body.id)).toBe(false);
    expect(splitInStock.body.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075-1', packageCount: 50 }),
      expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075-2', packageCount: 25 })
    ]));
    expectNoWarehousePriceLeak(splitInStock.body);

    const continuedSplit = await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${split.body.packages[0].id}/split`)
      .set('Authorization', app.auth(adminToken))
      .send({ pieces: [30, 20], remark: '继续拆票续号' })
      .expect(201);

    expect(continuedSplit.body.packages).toEqual([
      expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075-3', packageCount: 30 }),
      expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075-4', packageCount: 20 })
    ]);

    const continuedInStock = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(continuedInStock.body.rows.some((row: { id: string }) => row.id === split.body.packages[0].id)).toBe(false);
    expect(continuedInStock.body.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075-2', packageCount: 25 }),
      expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075-3', packageCount: 30 }),
      expect.objectContaining({ combinedOrderNo: '9409-KY-STOCK-075-4', packageCount: 20 })
    ]));

    const packageIdsForEntry = [split.body.packages[1].id, ...continuedSplit.body.packages.map((pkg: { id: string }) => pkg.id)];
    const consolidation = await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(adminToken))
      .send({
        packageIds: packageIdsForEntry,
        mode: 'MERGE_ONLY',
        tallyRequirement: '合票录单，保留原箱唛头'
      })
      .expect(201);
    expect(consolidation.body.systemOrderNo).toBeUndefined();
    expect(consolidation.body).toEqual(expect.objectContaining({
      packageIds: packageIdsForEntry,
      totalPackages: 75,
      totalActualWeightKg: 76,
      totalVolumetricWeightKg: 2525,
      totalChargeableWeightKg: 2525
    }));
    expectNoWarehousePriceLeak(consolidation.body);

    const orderEntryDraft = await request(app.getHttpServer())
      .post('/api/shipments/order-entry')
      .set('Authorization', app.auth(adminToken))
      .send({
        shipment: {
          customerCode: '9409',
          customerOrderNo: '9409',
          systemOrderNo: '9409-MERGE-DRAFT',
          businessType: 'DEDICATED_LINE',
          packageType: 'WPX',
          destinationCountry: '美国',
          declarationRequired: false,
          cargoType: '普货',
          productName: '配件',
          settlementMethod: 'RMB月结'
        },
        warehousePackageIds: packageIdsForEntry,
        receivables: [],
        businessCosts: [],
        payables: [],
        submitForReview: false
      })
      .expect(201);
    expect(orderEntryDraft.body.shipment).toEqual(expect.objectContaining({
      status: 'DRAFT',
      draftWarehousePackageIds: packageIdsForEntry,
      packageCount: 75
    }));

    await request(app.getHttpServer())
      .get(`/api/warehouse/consolidations/${consolidation.body.id}/items`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: split.body.packages[1].id,
            sourcePackageId: created.body.id,
            sourcePackageNo: '9409-KY-STOCK-075',
            packageCount: 25
          }),
          expect.objectContaining({
            id: continuedSplit.body.packages[0].id,
            sourcePackageId: split.body.packages[0].id,
            sourcePackageNo: '9409-KY-STOCK-075',
            packageCount: 30
          }),
          expect.objectContaining({
            id: continuedSplit.body.packages[1].id,
            sourcePackageId: split.body.packages[0].id,
            sourcePackageNo: '9409-KY-STOCK-075',
            packageCount: 20
          })
        ]));
        expectNoWarehousePriceLeak(response.body);
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.start')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.start',
            target: consolidation.body.id,
            after: expect.objectContaining({
              packageIds: packageIdsForEntry,
              tallyRequirement: '合票录单，保留原箱唛头'
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.consolidation.create')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              action: 'warehouse.consolidation.create',
              target: consolidation.body.id,
              after: expect.objectContaining({
                consolidationNo: consolidation.body.consolidationNo,
                customerCode: '9409',
                packageIds: packageIdsForEntry,
                totalPackages: 75,
                totalActualWeightKg: 76,
                totalVolumetricWeightKg: 2525,
                totalChargeableWeightKg: 2525,
                sourcePackages: expect.arrayContaining([
                  expect.objectContaining({ id: split.body.packages[1].id, combinedOrderNo: '9409-KY-STOCK-075-2', packageCount: 25, weightKg: 25.33 }),
                  expect.objectContaining({ id: continuedSplit.body.packages[0].id, combinedOrderNo: '9409-KY-STOCK-075-3', packageCount: 30, weightKg: 30.4 }),
                  expect.objectContaining({ id: continuedSplit.body.packages[1].id, combinedOrderNo: '9409-KY-STOCK-075-4', packageCount: 20, weightKg: 20.27 })
                ])
              })
            })
          ])
        );
      });

    const afterMerge = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(afterMerge.body.rows).toHaveLength(1);
    expect(afterMerge.body.rows[0]).toEqual(expect.objectContaining({
      id: expect.any(String),
      combinedOrderNo: '9409-KY-STOCK-075',
      tallyTaskId: tallyTask.body.id,
      tallyStatus: '已理货'
    }));
  });

  it('creates inbound warehouse labels and preserves source packages when splitting', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const created = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: 'WHSYA006',
        customerOrderNo: 'WHSYA006',
        domesticTrackingNo: 'SF1561933636038',
        expectedTotalPackageCount: 8,
        packageIndex: 5,
        packageCount: 1,
        weightKg: 18,
        lengthCm: 60,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-06-12T19:49:48.000+08:00',
        remark: '木架'
      })
      .expect(201);

    expect(created.body).toEqual(expect.objectContaining({
      customerCode: 'WHSYA006',
      customerOrderNo: 'WHSYA006',
      domesticTrackingNo: 'SF1561933636038',
      combinedOrderNo: 'WHSYA006-SF1561933636038',
      expectedTotalPackageCount: 8,
      packageIndex: 5,
      divisor: 6000,
      volumetricWeightKg: 20,
      chargeableWeightKg: 20,
      remark: '木架'
    }));
    expect(created.body.labelNo).toContain('WHSYA006');

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            labelNo: created.body.labelNo,
            packageIndex: 5,
            expectedTotalPackageCount: 8
          })
        ]));
      });

    const split = await request(app.getHttpServer())
      .post(`/api/warehouse/packages/${created.body.id}/split`)
      .set('Authorization', app.auth(token))
      .send({ splitCount: 2, remark: '拆成 2 箱便于理货' })
      .expect(201);

    expect(split.body.sourcePackage).toEqual(expect.objectContaining({
      id: created.body.id,
      status: 'CONSOLIDATED'
    }));
    expect(split.body.packages).toHaveLength(2);
    expect(split.body.packages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourcePackageId: created.body.id,
        sourcePackageNo: 'WHSYA006-SF1561933636038',
        packageIndex: 1,
        expectedTotalPackageCount: 2,
        divisor: 6000
      }),
      expect.objectContaining({
        sourcePackageId: created.body.id,
        sourcePackageNo: 'WHSYA006-SF1561933636038',
        packageIndex: 2,
        expectedTotalPackageCount: 2,
        divisor: 6000
      })
    ]));
  });

  it('creates mock carrier labels, reuses active labels, dispatches with generated transfer number, and protects staff-only label details', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'LBL-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        productName: '面单测试产品',
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await approveForRouting(token, created.body.id, '宇环');
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', app.auth(token))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 12.5, unitPrice: 8, currency: 'RMB', shippingMarkRequired: true })
      .expect(201)
      .expect((response) => {
        expect(response.body.shippingMarkRequired).toBe(true);
      });
    await approveTransferData(token, created.body.id);

    const label = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', app.auth(token))
      .expect(201);

    expect(label.body.label.status).toBe('CREATED');
    expect(label.body.label.transferNo).toMatch(/^DHL\d{11}$/);
    expect(label.body.label.labelUrl).toBe(`/mock-labels/${label.body.label.labelNo}.pdf`);
    expect(label.body.shipment.transferNo).toBe(label.body.label.transferNo);
    expect(label.body.shipment.latestTracking).toBe('已生成面单');

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.label.create')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.label.create',
            target: created.body.id,
            after: expect.objectContaining({
              labelId: label.body.label.id,
              labelNo: label.body.label.labelNo,
              labelUrl: label.body.label.labelUrl,
              transferNo: label.body.label.transferNo,
              transferNoFilledBy: 'admin',
              transferNoFilledAt: expect.any(String),
              trackingWebsite: expect.stringContaining(encodeURIComponent(label.body.label.transferNo)),
              trackingWebsiteVisibleToSales: false
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', app.auth(token))
      .expect(201)
      .expect((response) => {
        expect(response.body.label.id).toBe(label.body.label.id);
        expect(response.body.label.transferNo).toBe(label.body.label.transferNo);
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0].labelNo).toBe(label.body.label.labelNo);
      });

    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', app.auth(customerToken))
      .expect(403);

    const warehouseToken = await app.loginAs('warehouse');
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', app.auth(warehouseToken))
      .send({})
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('需要贴麦头');
      });

    const dispatched = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ shippingMarkConfirmed: true })
      .expect(201);
    expect(dispatched.body.status).toBe('OUTBOUNDED');
    expect(dispatched.body.transferNo).toBe(label.body.label.transferNo);
    expect(dispatched.body.outboundAt).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        expect(row).toBeTruthy();
        expect(row).not.toHaveProperty('receivableAmount');
        expect(row).not.toHaveProperty('payableAmount');
        expect(row).not.toHaveProperty('profit');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=shipment.dispatch')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'shipment.dispatch',
            target: created.body.id,
            after: expect.objectContaining({
              outboundOrderNo: dispatched.body.systemOrderNo,
              handoverNo: `HD-${dispatched.body.systemOrderNo}`,
              agentName: expect.stringContaining('宇环'),
              channelName: expect.any(String),
              packageCount: 1,
              chargeableWeightKg: 4,
              outboundBy: 'warehouse',
              archiveStatus: '已出库归档',
              outboundAt: expect.any(String),
              shippingMarkRequired: true,
              shippingMarkConfirmed: true
            })
          })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels/${label.body.label.id}/void`)
      .set('Authorization', app.auth(token))
      .expect(400);
  });

  it('voids an unshipped label and prevents dispatching with the voided transfer number', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'LBL-VOID-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        productName: '作废面单产品',
        channelId: 'ch-ups-ca'
      })
      .expect(201);

    await approveForRouting(token, created.body.id, '加美代理');
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', app.auth(token))
      .send({ channelId: 'ch-ups-ca', agentId: 'a-canada', agentChannelName: '加美 UPS', chargeWeightKg: 12.5, unitPrice: 8, currency: 'RMB' })
      .expect(201);
    await approveTransferData(token, created.body.id);

    const label = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', app.auth(token))
      .expect(201);
    expect(label.body.label.transferNo).toMatch(/^1Z\d{11}$/);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels/${label.body.label.id}/void`)
      .set('Authorization', app.auth(token))
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('VOIDED');
        expect(response.body.voidedAt).toBeTruthy();
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', app.auth(token))
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('OUTBOUNDED');
        expect(response.body.transferNo).toBeUndefined();
      });
  });

  it('creates carrier tracking tasks after dispatch and runs a successful customer-visible sync', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'TASK-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        productName: '轨迹任务产品',
        channelId: 'ch-ups-ca'
      })
      .expect(201);

    await approveForRouting(token, created.body.id, '加美代理');
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', app.auth(token))
      .send({ channelId: 'ch-ups-ca', agentId: 'a-canada', agentChannelName: '加美 UPS', chargeWeightKg: 12.5, unitPrice: 8, currency: 'RMB' })
      .expect(201);
    await approveTransferData(token, created.body.id);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/labels`).set('Authorization', app.auth(token)).expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/dispatch`).set('Authorization', app.auth(token)).send({}).expect(201);

    const tasks = await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', app.auth(token))
      .expect(200);
    const task = tasks.body.find((item: { shipmentId: string }) => item.shipmentId === created.body.id);
    expect(task).toMatchObject({ type: 'TRACKING_SYNC', status: 'PENDING', carrier: 'UPS', attempts: 0 });

    const run = await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/run`)
      .set('Authorization', app.auth(token))
      .send({})
      .expect(201);
    expect(run.body.task.status).toBe('SUCCESS');
    expect(run.body.shipment.latestTracking).toBe(`UPS 运输中 ${task.transferNo}`);
    expect(run.body.shipment.status).toBe('OUTBOUNDED');

    await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/run`)
      .set('Authorization', app.auth(token))
      .send({})
      .expect(400);

    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', app.auth(customerToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(customerToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.some((shipment: { id: string; latestTracking: string }) => shipment.id === created.body.id && shipment.latestTracking === `UPS 运输中 ${task.transferNo}`)).toBe(true);
      });
  });

  it('marks carrier tracking tasks failed and lets staff retry them successfully', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', app.auth(token))
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'TASK-FAIL-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        productName: '失败重试产品',
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await approveForRouting(token, created.body.id, '宇环');
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', app.auth(token))
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan', agentChannelName: '宇环 DHL', chargeWeightKg: 12.5, unitPrice: 8, currency: 'RMB' })
      .expect(201);
    await approveTransferData(token, created.body.id);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/labels`).set('Authorization', app.auth(token)).expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/dispatch`).set('Authorization', app.auth(token)).send({}).expect(201);

    const tasks = await request(app.getHttpServer()).get('/api/carrier-tasks').set('Authorization', app.auth(token)).expect(200);
    const task = tasks.body.find((item: { shipmentId: string }) => item.shipmentId === created.body.id);

    await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/run`)
      .set('Authorization', app.auth(token))
      .send({ fail: true })
      .expect(201)
      .expect((response) => {
        expect(response.body.task.status).toBe('FAILED');
        expect(response.body.task.attempts).toBe(1);
        expect(response.body.task.lastError).toBe('模拟承运商接口失败');
      });

    await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/retry`)
      .set('Authorization', app.auth(token))
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body.task.status).toBe('SUCCESS');
        expect(response.body.task.attempts).toBe(2);
        expect(response.body.shipment.latestTracking).toBe(`DHL 已揽收 ${task.transferNo}`);
      });
  });
});
