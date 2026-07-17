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

  it('allows an unregistered customer code to be received first and matches it when the customer is created', async () => {
    const adminToken = await app.loginAs('admin');
    const customerCode = `P${String(Date.now()).slice(-5)}`;
    const trackingNo = `KY-PENDING-${Date.now()}`;

    await request(app.getHttpServer())
      .get('/api/warehouse/manual-receipt/customers')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({ code: '9409', name: 'Daloday' })
        ]));
        expect(response.body.every((customer: Record<string, unknown>) => Object.keys(customer).every((key) => ['code', 'name'].includes(key)))).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode,
        customerOrderNo: customerCode,
        domesticTrackingNo: trackingNo,
        combinedOrderNo: `${customerCode}-${trackingNo}`,
        cartonSpecs: [{ weightKg: 5, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 1 }]
      })
      .expect(201)
      .expect((response) => {
        const pendingPackage = response.body.packages.find((pkg: { customerCode: string }) => pkg.customerCode === customerCode);
        expect(pendingPackage).toBeDefined();
        expect(pendingPackage).not.toHaveProperty('customerName');
        expect(pendingPackage).not.toHaveProperty('salesperson');
      });

    await request(app.getHttpServer())
      .post('/api/master-data/customers')
      .set('Authorization', app.auth(adminToken))
      .send({ code: customerCode, name: '待匹配收货客户', salesperson: 'operator' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ customerCode, customerName: `${customerCode}-待匹配收货客户`, salesperson: 'operator' })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=master_data.customer.match_pending_packages&pageSize=20')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'master_data.customer.match_pending_packages', after: expect.objectContaining({ customerCode, matchedPackageCount: 1 }) })
        ]));
      });
  });

  it('manual receipt creates multi carton warehouse package rows atomically and blocks duplicate submissions', async () => {
    const adminToken = await app.loginAs('admin');
    const trackingNo = `KY-MULTI-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        combinedOrderNo: `9409-${trackingNo}`,
        cartonSpecs: [
          { weightKg: 29.9, lengthCm: 67, widthCm: 49, heightCm: 48, packageCount: 3 },
          { weightKg: 10.6, lengthCm: 51, widthCm: 44, heightCm: 36, packageCount: 1 }
        ],
        scanTime: '2026-06-12T09:00:00.000+08:00',
        scanSource: '手动添加',
        remark: '多箱规收货'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.totalCartonSpecs).toBe(2);
        expect(response.body.totalPackages).toBe(4);
        expect(response.body.packages).toEqual(expect.arrayContaining([
          expect.objectContaining({ combinedOrderNo: `9409-${trackingNo}`, weightKg: 29.9, lengthCm: 67, widthCm: 49, heightCm: 48, packageCount: 3, exceptions: [] }),
          expect.objectContaining({ combinedOrderNo: `9409-${trackingNo}`, weightKg: 10.6, lengthCm: 51, widthCm: 44, heightCm: 36, packageCount: 1, exceptions: [] })
        ]));
      });

    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        combinedOrderNo: `9409-${trackingNo}`,
        cartonSpecs: [
          { weightKg: 29.9, lengthCm: 67, widthCm: 49, heightCm: 48, packageCount: 3 }
        ]
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('已入仓');
      });

    const invalidTrackingNo = `KY-MULTI-BAD-${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: invalidTrackingNo,
        combinedOrderNo: `9409-${invalidTrackingNo}`,
        cartonSpecs: [
          { weightKg: 8, lengthCm: 42, widthCm: 33, heightCm: 23, packageCount: 1 },
          { weightKg: 0, lengthCm: 36, widthCm: 26, heightCm: 17, packageCount: 1 }
        ]
      })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toContain('第 2 条箱规重量必须大于 0');
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const rows = response.body.rows as Array<{ combinedOrderNo: string }>;
        expect(rows.filter((row) => row.combinedOrderNo === `9409-${trackingNo}`)).toHaveLength(2);
        expect(rows.some((row) => row.combinedOrderNo === `9409-${invalidTrackingNo}`)).toBe(false);
      });
  });

  async function approveForRouting(token: string, shipmentId: string, agentName = '仓库测试供应商') {
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
      .set('Authorization', app.auth(token))
      .send({ businessReview: true })
      .expect(201);
  }

  async function printWarehouseHandover(token: string, shipmentId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(token))
      .send({ shipmentIds: [shipmentId] })
      .expect(201);
    return response.body.rows[0] as { handoverNo: string };
  }

  it('updates warehouse package inbound data, remark, and exception fields', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    const created = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-EDIT-001',
        expectedTotalPackageCount: 3,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        scanTime: '2026-06-12T09:00:00.000+08:00',
        remark: '入仓待复核'
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}`)
      .set('Authorization', app.auth(operatorToken))
      .send({ weightKg: 7 })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '1399',
        customerOrderNo: '1399',
        domesticTrackingNo: 'KY-EDIT-002',
        combinedOrderNo: '1399-KY-EDIT-002',
        expectedTotalPackageCount: 4,
        packageIndex: 2,
        packageCount: 2,
        weightKg: 6.5,
        lengthCm: 50,
        widthCm: 40,
        heightCm: 30,
        scanTime: '2026-06-12T10:30:00.000+08:00',
        remark: '修改后备注',
        manualException: '人工异常复核'
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          customerCode: '1399',
          customerOrderNo: '1399',
          domesticTrackingNo: 'KY-EDIT-002',
          combinedOrderNo: '1399-KY-EDIT-002',
          labelNo: '1399-KY-EDIT-002-2/4',
          expectedTotalPackageCount: 4,
          packageIndex: 2,
          packageCount: 2,
          weightKg: 6.5,
          cbm: 0.12,
          volumetricWeightKg: 20,
          volumetricWeightKg5000: 24,
          chargeableWeightKg: 20,
          remark: '修改后备注',
          manualException: '人工异常复核'
        }));
        expectNoWarehousePriceLeak(response.body);
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ customerOrderNo: '1399', domesticTrackingNo: 'KY-EDIT-002' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.totals).toEqual(expect.objectContaining({
          receiptTickets: 1,
          totalPackages: 2,
          totalWeightKg: 13,
          totalCbm: 0.12,
          exceptionTickets: 1
        }));
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            combinedOrderNo: '1399-KY-EDIT-002',
            remark: '修改后备注',
            manualException: '人工异常复核'
          })
        ]));
        expectNoWarehousePriceLeak(response.body);
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
            before: expect.objectContaining({ customerCode: '9409', domesticTrackingNo: 'KY-EDIT-001' }),
            after: expect.objectContaining({
              customerCode: '1399',
              combinedOrderNo: '1399-KY-EDIT-002',
              packageCount: 2,
              weightKg: 6.5,
              remark: '修改后备注',
              manualException: '人工异常复核'
            })
          })
        ]));
      });
  });

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
      .send({ ...mojiaPayload, barcode: '9409-KYMJ-BAD', weightKg: 0 })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'false', message: 'weight 必须是大于 0 的数字' });
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.request.write.failed')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.request.write.failed',
            target: 'POST /api/integrations/mojia/measurements',
            result: 'FAILED',
            after: expect.objectContaining({ errorMessage: 'weight 必须是大于 0 的数字' })
          })
        ]));
      });

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
      .send({
        barcode: 'SHB056-KK000034086467',
        lengthCm: 24,
        widthCm: 15,
        heightCm: 9,
        weightKg: 0.7,
        measuredAt: '1783323455600',
        deviceNo: 'MJ20210327'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'true', message: 'SHB056-KK000034086467 录入成功' });
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-07-06', customTo: '2026-07-06', combinedOrderNo: 'SHB056-KK000034086467' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0]).toEqual(expect.objectContaining({
          customerCode: 'SHB056',
          domesticTrackingNo: 'KK000034086467',
          combinedOrderNo: 'SHB056-KK000034086467',
          scanTime: '2026-07-06T07:37:35.000Z',
          remark: '设备号：MJ20210327'
        }));
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
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send({ ...mojiaPayload, barcode: 'A286-302169950419001', measuredAt: '2026.07.06/17:15:56' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({ result: 'true', message: 'A286-302169950419001 录入成功' });
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-07-06', customTo: '2026-07-06', combinedOrderNo: 'A286-302169950419001' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows[0]).toEqual(expect.objectContaining({
          combinedOrderNo: 'A286-302169950419001',
          scanTime: '2026-07-06T09:15:56.000Z'
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
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-TODAY-001',
        expectedTotalPackageCount: 2,
        packageIndex: 1,
        packageCount: 1,
        weightKg: 10,
        lengthCm: 100,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-07-16T10:00:00.000+08:00',
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
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-TODAY-001',
        expectedTotalPackageCount: 2,
        packageIndex: 2,
        packageCount: 2,
        weightKg: 5,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20,
        scanTime: '2026-07-16T10:01:00.000+08:00',
        scanSource: '扫码'
      })
      .expect(201);

    const adminToday = await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-07-16', customTo: '2026-07-16', customerOrderNo: '9409', domesticTrackingNo: 'KY-TODAY-001' })
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

    await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .query({ datePreset: 'CUSTOM', customFrom: '2026-06-12', customTo: '2026-06-12' })
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

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
              target: expect.stringContaining('/api/warehouse/today-receipts'),
              result: 'FAILED',
              after: expect.objectContaining({ permissions: expect.arrayContaining(['warehouse:today-receipt:view']) })
            })
          ])
        );
      });
  });

  it('groups warehouse API packages and creates draft shipments from consolidation', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;
    const suffix = `${Date.now()}`.slice(-6);
    const mergeTrackingNo = `LIN-M-${suffix}`;
    const shipTrackingNo = `LIN-S-${suffix}`;

    const mergePackageIds: string[] = [];
    for (const packageIndex of [1, 2, 3]) {
      const created = await request(app.getHttpServer())
        .post('/api/warehouse/packages')
        .set('Authorization', app.auth(token))
        .send({
          customerCode: '9409',
          customerOrderNo: '9409',
          domesticTrackingNo: mergeTrackingNo,
          expectedTotalPackageCount: 10,
          packageIndex,
          packageCount: 1,
          weightKg: 1,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10
        })
        .expect(201);
      mergePackageIds.push(created.body.id);
    }
    const shipPackageIds: string[] = [];
    for (const packageIndex of [1, 2]) {
      const created = await request(app.getHttpServer())
        .post('/api/warehouse/packages')
        .set('Authorization', app.auth(token))
        .send({
          customerCode: '9409',
          customerOrderNo: '9409',
          domesticTrackingNo: shipTrackingNo,
          expectedTotalPackageCount: 2,
          packageIndex,
          packageCount: 1,
          weightKg: 1,
          lengthCm: 10,
          widthCm: 10,
          heightCm: 10
        })
        .expect(201);
      shipPackageIds.push(created.body.id);
    }

    const groups = await request(app.getHttpServer())
      .get('/api/warehouse/package-groups')
      .set('Authorization', app.auth(token))
      .expect(200);

    const mergeGroupNo = `9409-${mergeTrackingNo}`;
    const group = groups.body.find((row: { combinedOrderNo: string }) => row.combinedOrderNo === mergeGroupNo);
    expect(group).toEqual(expect.objectContaining({
      combinedOrderNo: mergeGroupNo,
      expectedTotalPackageCount: 10,
      arrivedPackageCount: 3,
      remainingPackageCount: 7
    }));

    const mergeOnly = await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(token))
      .send({ packageIds: mergePackageIds.slice(0, 2), mode: 'MERGE_ONLY' })
      .expect(201);
    expect(mergeOnly.body.consolidationNo).toMatch(/^9409-MERGE\d+$/);
    expect(mergeOnly.body.systemOrderNo).toBeUndefined();

    const mergeAndShip = await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(token))
      .send({ packageIds: shipPackageIds, mode: 'MERGE_AND_SHIP' })
      .expect(201);
    expect(mergeAndShip.body.systemOrderNo).toMatch(/^9409-OUT\d+$/);

    const draftShipment = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(token))
      .expect(200)
      .then((response) => response.body.find((shipment: { systemOrderNo: string }) => shipment.systemOrderNo === mergeAndShip.body.systemOrderNo));
    expect(draftShipment).toEqual(expect.objectContaining({ status: 'DRAFT' }));

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining(
            shipPackageIds.map((id: string) =>
              expect.objectContaining({ id, shipmentId: draftShipment.id, systemOrderNo: mergeAndShip.body.systemOrderNo, status: 'CONSOLIDATED' })
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
            expect.objectContaining({ systemOrderNo: mergeAndShip.body.systemOrderNo, status: 'DRAFT' })
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

    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

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
      taskNo: expect.stringMatching(/^9409\d{4}(?:\d{2,})?LH$/),
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
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            tallyTaskId: tallyTask.body.id,
            tallyTaskNo: tallyTask.body.taskNo,
            tallyCompleted: false,
            tallyStatus: '理货中'
          })
        ]));
        const row = response.body.rows.find((item: { id: string }) => item.id === created.body.id);
        expect(row.tallyTaskId).toBe(tallyTask.body.id);
        expect(row.tallyTaskNo).toBe(tallyTask.body.taskNo);
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .query({ status: 'PENDING', combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

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
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo: '9409-KY-STOCK-075' })
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: created.body.id,
            tallyTaskId: tallyTask.body.id,
            tallyTaskNo: tallyTask.body.taskNo,
            tallyCompleted: true,
            tallyStatus: '已理货'
          })
        ]));
        expectNoWarehousePriceLeak(response.body);
      });

    const retallyTask = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({
        packageIds: [created.body.id],
        tallyRequirement: '同一包裹二次理货'
      })
      .expect(201);
    expect(retallyTask.body).toEqual(expect.objectContaining({
      status: 'PENDING',
      packageIds: [created.body.id],
      taskNo: `${tallyTask.body.taskNo}02`,
      tallyRequirement: '同一包裹二次理货'
    }));

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${retallyTask.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageCount: 70, weightKg: 74, lengthCm: 99, widthCm: 49, heightCm: 39 })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-task-history-chain')
      .query({ packageId: created.body.id })
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.map((task: { taskNo: string }) => task.taskNo)).toEqual([
          tallyTask.body.taskNo,
          retallyTask.body.taskNo
        ]);
      });

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
      labelNo: tallyTask.body.taskNo,
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
      labelNo: tallyTask.body.taskNo,
      labelPrintedBy: 'warehouse'
    }));
    expect(printedLabel.body.labelPrintedAt).toBeTruthy();

    const downloadedLabel = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${tallyTask.body.id}/label/download`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(downloadedLabel.body).toEqual(expect.objectContaining({
      labelNo: tallyTask.body.taskNo,
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
      alreadyApplied: true,
      task: expect.objectContaining({
        id: tallyTask.body.id
      }),
      package: expect.objectContaining({
        id: created.body.id,
        combinedOrderNo: '9409-KY-STOCK-075',
        tallyTaskId: tallyTask.body.id,
        tallyTaskNo: tallyTask.body.taskNo,
        status: 'RECEIVED'
      })
    }));
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
        expect(response.body.rows.some((row: { id: string }) => row.id === created.body.id)).toBe(true);
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
            labelNo: tallyTask.body.taskNo,
            labelStatus: 'GENERATED',
            labelDownloadedBy: 'warehouse'
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
            target: tallyTask.body.taskNo,
            after: expect.objectContaining({
              labelNo: tallyTask.body.taskNo,
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
            target: tallyTask.body.taskNo,
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
            target: tallyTask.body.taskNo,
            after: expect.objectContaining({ labelDownloadedBy: 'warehouse' })
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
    expect(afterMerge.body.rows).toHaveLength(0);
  });

  it('creates pending remeasure tally outputs and applies machine or manual measurements without duplicate packages', async () => {
    process.env.MOJIA_DEVICE_TOKEN = 'test-mojia-token';
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const source = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'KY-TALLY-REMEASURE',
        expectedTotalPackageCount: 8,
        packageIndex: 1,
        packageCount: 8,
        weightKg: 10,
        lengthCm: 40,
        widthCm: 30,
        heightCm: 20
      })
      .expect(201);
    const task = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageIds: [source.body.id], tallyRequirement: '拆成 5 件和 3 件后重新过机' })
      .expect(201);
    const completed = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({
        packageCount: 8,
        results: [
          { sourcePackageIds: [source.body.id], packageCount: 5 },
          { sourcePackageIds: [source.body.id], packageCount: 3 }
        ]
      })
      .expect(201);
    expect(completed.body).toEqual(expect.objectContaining({
      status: 'COMPLETED',
      completedPackageCount: 8,
      labelStatus: 'GENERATED',
      labelNo: task.body.taskNo
    }));

    const outputs = await request(app.getHttpServer())
      .get(`/api/warehouse/tally-tasks/${task.body.id}/output-packages`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(200);
    expect(outputs.body).toEqual([
      expect.objectContaining({ labelNo: `${task.body.taskNo}-01`, packageIndex: 1, packageCount: 5, measurementStatus: 'PENDING_REMEASURE', weightKg: 0 }),
      expect.objectContaining({ labelNo: `${task.body.taskNo}-02`, packageIndex: 2, packageCount: 3, measurementStatus: 'PENDING_REMEASURE', weightKg: 0 })
    ]);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label/print`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201)
      .expect((response) => expect(response.body).toEqual(expect.objectContaining({
        labelNo: task.body.taskNo,
        labelPrintedBy: 'warehouse'
      })));

    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .query({ packageIds: outputs.body.map((pkg: { id: string }) => pkg.id) })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => expect(response.body).toEqual([]));
    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageIds: [outputs.body[0].id], tallyRequirement: '尚未复测时再次理货' })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('待重新过机'));
    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: outputs.body[0].labelNo })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('待重新过机'));

    const machinePayload = {
      barcode: outputs.body[0].labelNo,
      weightKg: 25,
      lengthCm: 60,
      widthCm: 50,
      heightCm: 40,
      measuredAt: '2026-07-16T09:00:00.000+08:00',
      deviceNo: 'MJ-TALLY-01'
    };
    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send(machinePayload)
      .expect(201)
      .expect((response) => expect(response.body).toEqual({ result: 'true', message: `${outputs.body[0].labelNo} 复测覆盖成功` }));
    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .query({ status: 'COMPLETED' })
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const refreshedTask = response.body.find((row: { id: string }) => row.id === task.body.id);
        expect(refreshedTask.outputPackages).toEqual([
          expect.objectContaining({ id: outputs.body[0].id, measurementStatus: 'MEASURED', weightKg: 25, lengthCm: 60, widthCm: 50, heightCm: 40 }),
          expect.objectContaining({ id: outputs.body[1].id, measurementStatus: 'PENDING_REMEASURE', weightKg: 0 })
        ]);
      });
    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send(machinePayload)
      .expect(201)
      .expect((response) => expect(response.body).toEqual({ result: 'true', message: `${outputs.body[0].labelNo} 已接收` }));
    await request(app.getHttpServer())
      .post('/api/integrations/mojia/measurements')
      .set('X-Device-Token', 'test-mojia-token')
      .send({ ...machinePayload, weightKg: 26 })
      .expect(201)
      .expect((response) => expect(response.body).toEqual(expect.objectContaining({ result: 'false', message: expect.stringContaining('人工确认') })));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${outputs.body[1].id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ weightKg: 18, lengthCm: 55, widthCm: 45, heightCm: 35 })
      .expect(200)
      .expect((response) => expect(response.body).toEqual(expect.objectContaining({
        measurementStatus: 'MEASURED',
        measurementMatchedBy: 'admin',
        scanSource: '人工录入-理货复测'
      })));

    const measuredOutputs = await request(app.getHttpServer())
      .get(`/api/warehouse/tally-tasks/${task.body.id}/output-packages`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(200);
    expect(measuredOutputs.body).toEqual([
      expect.objectContaining({ id: outputs.body[0].id, measurementStatus: 'MEASURED', measurementMatchedBy: '墨家设备:MJ-TALLY-01' }),
      expect.objectContaining({ id: outputs.body[1].id, measurementStatus: 'MEASURED', measurementMatchedBy: 'admin' })
    ]);
    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .query({ status: 'COMPLETED' })
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const refreshedTask = response.body.find((row: { id: string }) => row.id === task.body.id);
        expect(refreshedTask).toEqual(expect.objectContaining({
          completedWeightKg: 43,
          outputPackages: [
            expect.objectContaining({ id: outputs.body[0].id, measurementStatus: 'MEASURED', measurementMatchedBy: '墨家设备:MJ-TALLY-01' }),
            expect.objectContaining({ id: outputs.body[1].id, measurementStatus: 'MEASURED', measurementMatchedBy: 'admin' })
          ]
        }));
      });
    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: outputs.body[0].labelNo })
      .expect(201)
      .expect((response) => {
        expect(response.body.alreadyApplied).toBe(true);
        expect(response.body.package.id).toBe(outputs.body[0].id);
      });

    const retally = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageIds: [outputs.body[0].id], tallyRequirement: '同一包裹第二次理货' })
      .expect(201);
    expect(retally.body.taskNo).toBe(`${task.body.taskNo}02`);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${retally.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({
        packageCount: 5,
        results: [{ sourcePackageIds: [outputs.body[0].id], packageCount: 5 }]
      })
      .expect(201);
    const retallyOutputs = await request(app.getHttpServer())
      .get(`/api/warehouse/tally-tasks/${retally.body.id}/output-packages`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(200);
    expect(retallyOutputs.body).toEqual([
      expect.objectContaining({ labelNo: `${task.body.taskNo}02`, measurementStatus: 'PENDING_REMEASURE' })
    ]);
    await request(app.getHttpServer())
      .get('/api/warehouse/tally-task-history-chain')
      .query({ packageId: retallyOutputs.body[0].id })
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => expect(response.body.map((row: { taskNo: string }) => row.taskNo)).toEqual([
        task.body.taskNo,
        `${task.body.taskNo}02`
      ]));
  });

  it('creates inbound warehouse labels and preserves source packages when splitting', async () => {
    const adminToken = await app.loginAs('admin');
    const token = adminToken;

    const created = await request(app.getHttpServer())
      .post('/api/warehouse/packages')
      .set('Authorization', app.auth(token))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: 'SF1561933636038',
        expectedTotalPackageCount: 8,
        packageIndex: 5,
        packageCount: 1,
        weightKg: 18,
        lengthCm: 60,
        widthCm: 50,
        heightCm: 40,
        scanTime: '2026-07-16T09:49:48.000+08:00',
        remark: '木架'
      })
      .expect(201);

    expect(created.body).toEqual(expect.objectContaining({
      customerCode: '9409',
      customerOrderNo: '9409',
      domesticTrackingNo: 'SF1561933636038',
      combinedOrderNo: '9409-SF1561933636038',
      expectedTotalPackageCount: 8,
      packageIndex: 5,
      divisor: 6000,
      volumetricWeightKg: 20,
      chargeableWeightKg: 20,
      remark: '木架'
    }));
    expect(created.body.labelNo).toContain('9409');

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
        sourcePackageNo: '9409-SF1561933636038',
        packageIndex: 1,
        expectedTotalPackageCount: 2,
        divisor: 6000
      }),
      expect.objectContaining({
        sourcePackageId: created.body.id,
        sourcePackageNo: '9409-SF1561933636038',
        packageIndex: 2,
        expectedTotalPackageCount: 2,
        divisor: 6000
      })
    ]));
  });

  it('creates mock carrier labels, reuses active labels, dispatches with generated transfer number, handover audit, and outbounded archive data, and protects staff-only label details', async () => {
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
    const label = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', app.auth(token))
      .expect(201);

    expect(label.body.label.status).toBe('CREATED');
    expect(label.body.label.transferNo).toMatch(/^DHL\d{11}$/);
    expect(label.body.label.labelUrl).toBe(`/mock-labels/${label.body.label.labelNo}.pdf`);
    expect(label.body.shipment.transferNo).toBe(label.body.label.transferNo);
    expect(label.body.shipment.latestTracking).toBe('已生成面单');

    const warehouseToken = await app.loginAs('warehouse');
    await request(app.getHttpServer())
      .get('/api/warehouse/dispatch-shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        expect(row).toEqual(expect.objectContaining({
          status: 'WAITING_DISPATCH',
          agentName: '深圳宇环',
          routeAgentChannelName: '宇环 DHL'
        }));
        expect(row).not.toHaveProperty('paymentAmountCny');
        expect(row).not.toHaveProperty('paymentAmountUsd');
      });

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

    const printedHandover = await printWarehouseHandover(warehouseToken, created.body.id);
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
      .send({
        shippingMarkConfirmed: true,
        batchDispatchSource: 'warehouse.batch_dispatch_handover'
      })
      .expect(201);
    expect(dispatched.body.status).toBe('OUTBOUNDED');
    expect(dispatched.body.transferNo).toBe(label.body.label.transferNo);
    expect(dispatched.body.outboundAt).toBeTruthy();

    await request(app.getHttpServer())
      .get('/api/warehouse/dispatch-shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        const row = response.body.find((shipment: { id: string }) => shipment.id === created.body.id);
        expect(row).toBeTruthy();
        expect(row).toEqual(expect.objectContaining({
          handoverNo: printedHandover.handoverNo,
          outboundBy: 'warehouse',
          batchDispatchSource: 'warehouse.batch_dispatch_handover',
          outboundAt: expect.any(String)
        }));
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
              handoverNo: printedHandover.handoverNo,
              agentName: expect.stringContaining('宇环'),
              channelName: expect.any(String),
              packageCount: 1,
              chargeableWeightKg: 4,
              outboundBy: 'warehouse',
              batchDispatchSource: 'warehouse.batch_dispatch_handover',
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

    await printWarehouseHandover(token, created.body.id);

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
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/labels`).set('Authorization', app.auth(token)).expect(201);
    await printWarehouseHandover(token, created.body.id);
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
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/labels`).set('Authorization', app.auth(token)).expect(201);
    await printWarehouseHandover(token, created.body.id);
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
