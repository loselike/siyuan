import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';

describe('Siyuan API MVP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
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
              password: 'admin123',
              permissions: expect.arrayContaining(['system:manage', 'finance:settle'])
            }),
            expect.objectContaining({ key: 'CUSTOMER_SERVICE', account: 'service', password: 'service123' })
          ])
        );
      });

    const financeLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'finance', password: 'finance123' })
      .expect(201);

    await request(app.getHttpServer())
      .put('/api/system/roles/OPERATOR/permissions')
      .set('Authorization', `Bearer ${financeLogin.body.accessToken}`)
      .send({ permissions: ['shipments:read'] })
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER_SERVICE/permissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permissions: ['shipments:read', 'master-data:read'] })
      .expect(200)
      .expect((response) => {
        expect(response.body.permissions).toEqual(['shipments:read', 'master-data:read']);
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
});
