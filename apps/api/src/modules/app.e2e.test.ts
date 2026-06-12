import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureApp } from '../configure-app.js';
import { AppModule } from './app.module.js';

describe('Siyuan API MVP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('authenticates staff and returns shipment data', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeGreaterThan(1);
      });
  });

  it('soft deletes shipments so they no longer return from the workspace list', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = login.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'DELETE-PERSIST-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/shipments/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: created.body.id })])
        );
      });
  });

  it('lets admins edit role permissions and applies the saved matrix to RBAC checks', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .get('/api/system/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.roles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              key: 'ADMIN',
              account: 'admin',
              permissions: expect.arrayContaining(['system:manage', 'finance:settle', 'pricing:manage'])
            }),
            expect.objectContaining({ key: 'CUSTOMER_SERVICE', account: 'service' }),
            expect.objectContaining({ key: 'OPERATOR', label: '业务员', account: 'operator' }),
            expect.objectContaining({ key: 'WAREHOUSE', label: '仓库', account: 'warehouse' })
          ])
        );
        expect(JSON.stringify(response.body)).not.toContain('admin123');
        expect(JSON.stringify(response.body)).not.toContain('service123');
      });

    const financeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'finance', password: 'finance123' })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/system/roles/OPERATOR/permissions')
      .set('Authorization', `Bearer ${financeLogin.body.accessToken}`)
      .send({ permissions: ['orders:read'] })
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER_SERVICE/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissions: ['orders:read', 'pricing:lookup', 'master-data:read'] })
      .expect(200)
      .expect((response) => {
        expect(response.body.permissions).toEqual(['orders:read', 'pricing:lookup', 'master-data:read']);
      });

    const serviceLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'service', password: 'service123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${serviceLogin.body.accessToken}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'CS-NO-WRITE',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        channelId: 'ch-dhl-hk'
      })
      .expect(403);
  });

  it('lets a customer create a declared shipment that staff can see in the receiving queue', async () => {
    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .send({
        customerOrderNo: 'CUST-NEW-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2.4,
        agentWeightKg: 2.4,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    expect(created.body.status).toBe('DECLARED');
    expect(created.body.customerName).toContain('9409');

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.some((shipment: { customerOrderNo: string }) => shipment.customerOrderNo === 'CUST-NEW-001')).toBe(
          true
        );
      });
  });

  it('lets staff create a draft outbound shipment that persists after reload', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = adminLogin.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'OUT-PERSIST-001',
        systemOrderNo: 'SYOUTPERSIST001',
        transferNo: 'DHL-PERSIST-001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 18,
        agentWeightKg: 18,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        latestTracking: '新建出货订单，待审核'
      })
      .expect(201);

    expect(created.body.status).toBe('DRAFT');
    expect(created.body.systemOrderNo).toBe('SYOUTPERSIST001');
    expect(created.body.transferNo).toBe('DHL-PERSIST-001');
    expect(created.body.latestTracking).toBe('新建出货订单，待审核');

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(
          response.body.some(
            (shipment: { customerOrderNo: string; status: string; systemOrderNo: string }) =>
              shipment.customerOrderNo === 'OUT-PERSIST-001' &&
              shipment.status === 'DRAFT' &&
              shipment.systemOrderNo === 'SYOUTPERSIST001'
          )
        ).toBe(true);
      });
  });

  it('keeps markup rules admin-only and strips internal price fields for operator lookup', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const operatorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'operator123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .set('Authorization', `Bearer ${operatorLogin.body.accessToken}`)
      .expect(403);

    const channelRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({ agentName: 'a代理', channelName: '海运洛杉矶专线', markupPerKg: 3, enabled: true })
      .expect(201);
    expect(channelRule.body.channelName).toBe('海运洛杉矶专线');

    const lineRule = await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({ agentName: 'a代理', channelName: 'DHL HK', realChannelName: 'DHL代理', markupPerKg: 2, enabled: true })
      .expect(201);
    expect(lineRule.body.realChannelName).toBe('DHL代理');

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
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
            currency: 'CNY',
            transitDays: 5,
            transitLabel: '4-7 天'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', `Bearer ${operatorLogin.body.accessToken}`)
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
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .expect(200)
      .expect((response) => expect(response.body.enabled).toBe(false));

    await request(app.getHttpServer())
      .delete(`/api/pricing/markup-rules/${channelRule.body.id}`)
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .expect(200)
      .expect((response) => expect(response.body.enabled).toBe(false));
  });

  it('groups warehouse API packages and creates draft shipments from consolidation', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = adminLogin.body.accessToken;

    const groups = await request(app.getHttpServer())
      .get('/api/warehouse/package-groups')
      .set('Authorization', `Bearer ${token}`)
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
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const packageIds = packages.body
      .filter((row: { customerOrderNo: string }) => row.customerOrderNo === '1399')
      .slice(0, 2)
      .map((row: { id: string }) => row.id);

    const mergeOnly = await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', `Bearer ${token}`)
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
      .set('Authorization', `Bearer ${token}`)
      .send({ packageIds: remainingPackageIds, mode: 'MERGE_AND_SHIP' })
      .expect(201);
    expect(mergeAndShip.body.systemOrderNo).toBe('P710-OUT001');

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ systemOrderNo: 'P710-OUT001', status: 'DRAFT' })
          ])
        );
      });
  });

  it('imports valid shipment rows and returns row-level errors', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/import')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        customerId: 'c-9409',
        rows: [
          { customerOrderNo: 'IMP-001', destinationCountry: '美国', weightKg: 2.4, channelName: 'DHL HK' },
          { customerOrderNo: 'IMP-001', destinationCountry: '德国', weightKg: 1.2, channelName: 'DHL HK' },
          { customerOrderNo: 'IMP-003', destinationCountry: '', weightKg: -1, channelName: '' }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.created).toHaveLength(1);
        expect(response.body.errors).toEqual([
          { rowNumber: 2, field: 'customerOrderNo', message: '客户单号重复' },
          { rowNumber: 3, field: 'destinationCountry', message: '目的地国家不能为空' },
          { rowNumber: 3, field: 'weightKg', message: '重量必须大于 0' },
          { rowNumber: 3, field: 'channelName', message: '渠道不能为空' }
        ]);
      });
  });

  it('moves shipments through receive route dispatch tracking and rejects invalid transitions', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = login.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'FLOW-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '加拿大',
        packageCount: 1,
        receivableWeightKg: 3,
        agentWeightKg: 3,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ transferNo: 'BAD-JUMP' })
      .expect(400);

    const received = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(received.body.status).toBe('WAITING_SORT');

    const routed = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelId: 'ch-ups-ca', agentId: 'a-canada' })
      .expect(201);
    expect(routed.body.status).toBe('WAITING_DISPATCH');

    const dispatched = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .send({ transferNo: '1Z999' })
      .expect(201);
    expect(dispatched.body.status).toBe('WAITING_ONLINE');
    expect(dispatched.body.transferNo).toBe('1Z999');

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/tracking-events`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: '已上网', happenedAt: '2026-06-06T10:00:00.000Z' })
      .expect(201)
      .expect((response) => {
        expect(response.body.latestTracking).toBe('已上网');
      });
  });

  it('persists manual shipment edits, shipment payments, and bulk tracking imports through API endpoints', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = login.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'BACKEND-ACTION-001',
        systemOrderNo: 'SYBACKENDACTION001',
        businessType: 'DEDICATED_LINE',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 18,
        agentWeightKg: 18,
        channelId: 'ch-dhl-hk',
        initialStatus: 'DRAFT',
        latestTracking: '新建出货订单，待审核'
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/shipments/${created.body.id}/operational`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        latestTracking: '人工复核通过',
        transferNo: 'TRK-BACKEND-001',
        status: 'WAITING_RECEIVE'
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.latestTracking).toBe('人工复核通过');
        expect(response.body.transferNo).toBe('TRK-BACKEND-001');
        expect(response.body.status).toBe('WAITING_RECEIVE');
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentAmountUsd: 128,
        paymentAmountCny: 927.36,
        paymentMethod: '对公'
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.paymentAmountUsd).toBe(128);
        expect(response.body.paymentAmountCny).toBe(927.36);
        expect(response.body.paymentMethod).toBe('对公');
      });

    await request(app.getHttpServer())
      .post('/api/shipments/tracking-events/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        updates: [
          {
            shipmentId: created.body.id,
            customerOrderNo: 'BACKEND-ACTION-001',
            trackingDate: '2026-06-08T10:00:00.000Z',
            latestTracking: '批量轨迹已签收'
          }
        ]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.updated).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.id,
              latestTracking: '批量轨迹已签收',
              trackingStaleDays: 0
            })
          ])
        );
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.id,
              latestTracking: '批量轨迹已签收',
              transferNo: 'TRK-BACKEND-001',
              paymentAmountUsd: 128,
              paymentAmountCny: 927.36,
              paymentMethod: '对公'
            })
          ])
        );
      });
  });

  it('creates mock carrier labels, reuses active labels, dispatches with generated transfer number, and protects staff-only label details', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = adminLogin.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'LBL-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/receive`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' })
      .expect(201);

    const label = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(label.body.label.status).toBe('CREATED');
    expect(label.body.label.transferNo).toMatch(/^DHL\d{11}$/);
    expect(label.body.label.labelUrl).toBe(`/mock-labels/${label.body.label.labelNo}.pdf`);
    expect(label.body.shipment.transferNo).toBe(label.body.label.transferNo);
    expect(label.body.shipment.latestTracking).toBe('已生成面单');

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((response) => {
        expect(response.body.label.id).toBe(label.body.label.id);
        expect(response.body.label.transferNo).toBe(label.body.label.transferNo);
      });

    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0].labelNo).toBe(label.body.label.labelNo);
      });

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .expect(403);

    const dispatched = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    expect(dispatched.body.status).toBe('WAITING_ONLINE');
    expect(dispatched.body.transferNo).toBe(label.body.label.transferNo);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels/${label.body.label.id}/void`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('voids an unshipped label and prevents dispatching with the voided transfer number', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = adminLogin.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'LBL-VOID-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        channelId: 'ch-ups-ca'
      })
      .expect(201);

    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/receive`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelId: 'ch-ups-ca', agentId: 'a-canada' })
      .expect(201);

    const label = await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(label.body.label.transferNo).toMatch(/^1Z\d{11}$/);

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/labels/${label.body.label.id}/void`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('VOIDED');
        expect(response.body.voidedAt).toBeTruthy();
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/dispatch`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('creates carrier tracking tasks after dispatch and runs a successful customer-visible sync', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = adminLogin.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'TASK-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        channelId: 'ch-ups-ca'
      })
      .expect(201);

    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/receive`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelId: 'ch-ups-ca', agentId: 'a-canada' })
      .expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/labels`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/dispatch`).set('Authorization', `Bearer ${token}`).send({}).expect(201);

    const tasks = await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const task = tasks.body.find((item: { shipmentId: string }) => item.shipmentId === created.body.id);
    expect(task).toMatchObject({ type: 'TRACKING_SYNC', status: 'PENDING', carrier: 'UPS', attempts: 0 });

    const run = await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/run`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);
    expect(run.body.task.status).toBe('SUCCESS');
    expect(run.body.shipment.latestTracking).toBe(`UPS 运输中 ${task.transferNo}`);
    expect(run.body.shipment.status).toBe('WAITING_ONLINE');

    await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/run`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.some((shipment: { id: string; latestTracking: string }) => shipment.id === created.body.id && shipment.latestTracking === `UPS 运输中 ${task.transferNo}`)).toBe(true);
      });
  });

  it('marks carrier tracking tasks failed and lets staff retry them successfully', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = adminLogin.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'TASK-FAIL-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 4,
        agentWeightKg: 4,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/receive`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${created.body.id}/route`)
      .set('Authorization', `Bearer ${token}`)
      .send({ channelId: 'ch-dhl-hk', agentId: 'a-yuhuan' })
      .expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/labels`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${created.body.id}/dispatch`).set('Authorization', `Bearer ${token}`).send({}).expect(201);

    const tasks = await request(app.getHttpServer()).get('/api/carrier-tasks').set('Authorization', `Bearer ${token}`).expect(200);
    const task = tasks.body.find((item: { shipmentId: string }) => item.shipmentId === created.body.id);

    await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/run`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fail: true })
      .expect(201)
      .expect((response) => {
        expect(response.body.task.status).toBe('FAILED');
        expect(response.body.task.attempts).toBe(1);
        expect(response.body.task.lastError).toBe('模拟承运商接口失败');
      });

    await request(app.getHttpServer())
      .post(`/api/carrier-tasks/${task.id}/retry`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body.task.status).toBe('SUCCESS');
        expect(response.body.task.attempts).toBe(2);
        expect(response.body.shipment.latestTracking).toBe(`DHL 已揽收 ${task.transferNo}`);
      });
  });

  it('creates replies and closes problem tickets with customer visibility filtering', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const token = adminLogin.body.accessToken;

    const created = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-2/problem-tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: '轨迹超过3天未更新', customerVisible: true })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/problem-tickets/${created.body.id}/replies`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '已联系代理核实' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/problem-tickets/${created.body.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe('CLOSED');
      });

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/problem-tickets')
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.every((ticket: { customerVisible: boolean }) => ticket.customerVisible)).toBe(true);
      });
  });

  it('prevents customers from reading employee master data', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('lets admins maintain master data and use new agents and channels in fulfillment', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.customers).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'c-9409', enabled: true })]));
        expect(response.body.channels[0]).toHaveProperty('carrierName');
        expect(response.body.surcharges).toEqual(expect.arrayContaining([expect.objectContaining({ name: '偏远附加费' })]));
        expect(response.body.exchangeRates).toEqual(expect.arrayContaining([expect.objectContaining({ baseCurrency: 'USD', quoteCurrency: 'CNY' })]));
      });

    const customer = await request(app.getHttpServer())
      .post('/api/master-data/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: '7777', name: 'M7-Test' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/master-data/customers/${customer.body.id}/contacts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'M7 Contact', phone: '13900000007', email: 'm7@example.com' })
      .expect(201)
      .expect((response) => {
        expect(response.body.customerId).toBe(customer.body.id);
      });

    await request(app.getHttpServer())
      .post(`/api/master-data/customers/${customer.body.id}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'm7customer', password: 'm7pass123' })
      .expect(201)
      .expect((response) => {
        expect(response.body.customerId).toBe(customer.body.id);
        expect(response.body.username).toBe('m7customer');
      });

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'm7customer', password: 'm7pass123' })
      .expect(201)
      .expect((response) => {
        expect(response.body.user.customerId).toBe(customer.body.id);
      });

    const carrier = await request(app.getHttpServer())
      .post('/api/master-data/carriers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'M7 Carrier' })
      .expect(201);
    const agent = await request(app.getHttpServer())
      .post('/api/master-data/agents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'M7 Agent' })
      .expect(201);
    const channel = await request(app.getHttpServer())
      .post('/api/master-data/channels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'M7 Channel', carrierId: carrier.body.id })
      .expect(201);

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'M7-ROUTE-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 2,
        agentWeightKg: 2,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);
    await request(app.getHttpServer()).post(`/api/shipments/${shipment.body.id}/receive`).set('Authorization', `Bearer ${adminToken}`).expect(201);
    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/route`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ channelId: channel.body.id, agentId: agent.body.id })
      .expect(201)
      .expect((response) => {
        expect(response.body.channelName).toBe('M7 Channel');
        expect(response.body.agentName).toBe('M7 Agent');
      });

    await request(app.getHttpServer())
      .post('/api/master-data/surcharges')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'M7 附加费', amount: 88 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/master-data/fuel-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ channelId: channel.body.id, rate: 0.18, activeAt: '2026-06-06T00:00:00.000Z' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/master-data/exchange-rates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ baseCurrency: 'EUR', quoteCurrency: 'CNY', rate: 7.8, activeAt: '2026-06-06T00:00:00.000Z' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/master-data/channels/${channel.body.id}/enabled`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    const serviceLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'service', password: 'service123' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/master-data/agents')
      .set('Authorization', `Bearer ${serviceLogin.body.accessToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  it('allows finance users to read receivables', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'finance', password: 'finance123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body[0].amount).toBeGreaterThan(0);
      });
  });

  it('maintains channel pricing rules and generates shipment fees from rule quotes', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .get('/api/pricing/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ channelId: 'ch-dhl-hk', destinationCountry: '美国' })]));
      });

    const rule = await request(app.getHttpServer())
      .post('/api/pricing/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ channelId: 'ch-dhl-hk', destinationCountry: '美国', minWeightKg: 20, maxWeightKg: 30, ratePerKg: 9, currency: 'USD' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/rules/quote')
      .set('Authorization', `Bearer ${adminToken}`)
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
      .set('Authorization', `Bearer ${adminToken}`)
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
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body.receivables.map((fee: { name: string }) => fee.name)).toEqual(['基础运费', '燃油费', '附加费']);
        expect(response.body.receivableTotal).toBeGreaterThan(1800);
      });

    await request(app.getHttpServer())
      .put(`/api/pricing/rules/${rule.body.id}/enabled`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/rules/quote')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ channelId: 'ch-dhl-hk', destinationCountry: '美国', chargeableWeightKg: 24 })
      .expect(400);

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/rules')
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .expect(403);
  });

  it('persists imported price books with remarks and admin-only management', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    const operatorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'operator123' })
      .expect(201);
    const operatorToken = operatorLogin.body.accessToken;

    const imported = await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fileName: '测试价格表.xlsx',
        rows: [
          {
            agentName: '亿阳国际',
            carrierName: '专线',
            channelName: '海运洛杉矶专线',
            realChannelName: '海运洛杉矶专线',
            warehouseCode: 'LAX9',
            destinationCountry: '美国',
            minWeightKg: 100,
            maxWeightKg: 99999,
            costPerKg: 18,
            currency: 'CNY',
            transitDays: 22,
            transitLabel: '22-28 天'
          }
        ]
      })
      .expect(201);

    expect(imported.body.book.fileName).toBe('测试价格表.xlsx');
    expect(imported.body.book.rowCount).toBe(1);
    expect(imported.body.rows[0].priceBookId).toBe(imported.body.book.id);

    await request(app.getHttpServer())
      .put(`/api/pricing/books/${imported.body.book.id}/remark`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ remark: '亚马逊卡派最长边 180CM-220CM' })
      .expect(200)
      .expect((response) => {
        expect(response.body.remark).toContain('最长边');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/pricing/books/${imported.body.book.id}/remark`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ remark: '业务员不能改' })
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/pricing/books/${imported.body.book.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.books).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: imported.body.book.id })]));
        expect(response.body.rows).not.toEqual(expect.arrayContaining([expect.objectContaining({ priceBookId: imported.body.book.id })]));
      });
  });

  it('accepts large parsed price book imports from XLS uploads', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;
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
      currency: 'CNY',
      transitDays: 22,
      transitLabel: '22-28 天',
      surchargeFee: 0,
      surchargeDetails: [{ name: '测试附加费', amount: 0 }]
    }));

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fileName: '大价格表.xlsx', rows })
      .expect(201)
      .expect((response) => {
        expect(response.body.book.rowCount).toBe(rows.length);
      });
  });

  it('calculates price lookup on the backend and masks internal cost fields for operators', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    const operatorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'operator123' })
      .expect(201);
    const operatorToken = operatorLogin.body.accessToken;

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ destinationCountry: '未导入国', amazonCode: 'AMZ-US-001', chargeableWeightKg: 835 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('没有匹配的代理成本价');
      });

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', `Bearer ${adminToken}`)
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
            currency: 'CNY',
            transitDays: 25,
            transitLabel: '22-28 天'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ destinationCountry: '美国', amazonCode: 'AMZ-US-001', chargeableWeightKg: 835 })
      .expect(201)
      .expect((response) => {
        expect(response.body.channelName).toBe('海运洛杉矶专线');
        expect(response.body.totalSales).toBe(15447.5);
        expect(response.body.totalCost).toBe(15030);
        expect(response.body.grossProfit).toBe(417.5);
        expect(response.body.price.costPerKg).toBe(18);
        expect(response.body.markup.markupPerKg).toBe(0.5);
      });

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', `Bearer ${operatorToken}`)
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
      });
  });

  it('maps Amazon warehouse codes to regional price table rows before lookup', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', `Bearer ${adminToken}`)
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
            currency: 'CNY',
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
            currency: 'CNY',
            transitDays: 20,
            transitLabel: '20-25 天'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', `Bearer ${adminToken}`)
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
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/pricing/books/import')
      .set('Authorization', `Bearer ${adminToken}`)
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
            currency: 'CNY',
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
            currency: 'CNY',
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
            currency: 'CNY',
            transitDays: 25,
            transitLabel: '24-26 天左右'
          }
        ]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/pricing/lookup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ destinationCountry: 'ONT8回退测试国', amazonCode: 'ONT8', chargeableWeightKg: 835 })
      .expect(201)
      .expect((response) => {
        expect(response.body.price.warehouseCode).toBe('ONT8');
        expect(response.body.price.costPerKg).toBe(4.5);
        expect(response.body.salesRatePerKg).toBe(5);
        expect(response.body.totalSales).toBe(4175);
      });
  });

  it('returns a safe SiliconFlow-compatible AI assist response for logged-in staff', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/ai/assist')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ module: '轨迹监控', task: '生成客户说明', prompt: '9064656160 已 9 天未更新' })
      .expect(201)
      .expect((response) => {
        expect(response.body.provider).toBe('siliconflow');
        expect(response.body.mode).toBe('mock');
        expect(response.body.content).toContain('轨迹监控');
        expect(response.body.content).toContain('9064656160');
      });

    await request(app.getHttpServer())
      .post('/api/ai/assist')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ scenario: '权限体检', prompt: '检查角色权限边界' })
      .expect(201)
      .expect((response) => {
        expect(response.body.content).not.toContain('undefined');
        expect(response.body.content).toContain('权限体检');
      });
  });

  it('quotes generates adjusts and drafts customer statements with visibility rules', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/pricing/quote')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: 'c-9409',
        channelId: 'ch-dhl-hk',
        destinationCountry: '美国',
        chargeableWeightKg: 10,
        baseRatePerKg: 20,
        fuelRate: 0.15,
        surcharges: [{ name: '偏远费', amount: 50 }]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.total).toBe(280);
      });

    const shipment = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: 'c-9409',
        customerOrderNo: 'FIN-001',
        businessType: 'EXPRESS',
        packageType: 'WPX',
        destinationCountry: '美国',
        packageCount: 1,
        receivableWeightKg: 10,
        agentWeightKg: 9,
        channelId: 'ch-dhl-hk'
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/fees/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        baseRatePerKg: 20,
        payableRatePerKg: 14,
        fuelRate: 0.15,
        surcharges: [{ name: '偏远费', amount: 50 }]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.receivables.map((fee: { name: string }) => fee.name)).toEqual(['基础运费', '燃油费', '附加费']);
        expect(response.body.receivableTotal).toBe(280);
        expect(response.body.payableTotal).toBe(144.9);
      });

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipment.body.id}/receivable-adjustments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '人工优惠', amount: -15 })
      .expect(201)
      .expect((response) => {
        expect(response.body.name).toBe('人工优惠');
        expect(response.body.amount).toBe(-15);
      });

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.every((fee: { customerName: string }) => fee.customerName.startsWith('9409-'))).toBe(true);
        expect(response.body.some((fee: { name: string; amount: number }) => fee.name === '人工优惠' && fee.amount === -15)).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/finance/customer-statements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'c-9409', periodStart: '2026-06-01', periodEnd: '2026-06-30' })
      .expect(201)
      .expect((response) => {
        expect(response.body.customerName).toBe('9409-Daloday');
        expect(response.body.total).toBeGreaterThanOrEqual(265);
        expect(response.body.status).toBe('DRAFT');
      });

    await request(app.getHttpServer())
      .get('/api/finance/customer-statements')
      .set('Authorization', `Bearer ${customerLogin.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.every((statement: { customerId: string }) => statement.customerId === 'c-9409')).toBe(true);
      });
  });

  it('records customer payments, settles selected receivables, and exposes account ledger read-only to customers', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = adminLogin.body.accessToken;

    const beforeAccounts = await request(app.getHttpServer())
      .get('/api/finance/customer-accounts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const before9409 = beforeAccounts.body.find((account: { customerId: string }) => account.customerId === 'c-9409');
    expect(before9409.balance).toBe(10000);

    const receivables = await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const selectedFees = receivables.body
      .filter((fee: { customerName: string; settled: boolean }) => fee.customerName.startsWith('9409-') && !fee.settled)
      .slice(0, 2);
    const amount = selectedFees.reduce((sum: number, fee: { amount: number }) => sum + fee.amount, 0);

    await request(app.getHttpServer())
      .post('/api/finance/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId: 'c-9409', amount, feeIds: selectedFees.map((fee: { id: string }) => fee.id), note: '测试收款' })
      .expect(201)
      .expect((response) => {
        expect(response.body.payment.settledAmount).toBe(amount);
        expect(response.body.payment.remainingAmount).toBe(0);
        expect(response.body.account.balance).toBe(10000);
        expect(response.body.settledFees.every((fee: { settled: boolean }) => fee.settled)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        const settledIds = new Set(selectedFees.map((fee: { id: string }) => fee.id));
        expect(response.body.filter((fee: { id: string; settled: boolean }) => settledIds.has(fee.id)).every((fee: { settled: boolean }) => fee.settled)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/finance/account-ledger')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ customerId: 'c-9409', amount, note: '测试收款' }),
            expect.objectContaining({ customerId: 'c-9409', amount: -amount, note: '核销应收费用' })
          ])
        );
      });

    const customerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);
    const customerToken = customerLogin.body.accessToken;

    await request(app.getHttpServer())
      .get('/api/finance/customer-accounts')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([expect.objectContaining({ customerId: 'c-9409', balance: 10000 })]);
      });

    await request(app.getHttpServer())
      .get('/api/finance/account-ledger')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.every((entry: { customerId: string }) => entry.customerId === 'c-9409')).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/finance/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ customerId: 'c-9409', amount: 1 })
      .expect(403);
  });
});
