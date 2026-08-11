import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Warehouse dispatch query API', () => {
  const app = setupE2eApp();

  it('keeps dispatch status filtering, response fields, and access control unchanged', async () => {
    const warehouseToken = await app.loginAs('warehouse');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/warehouse/dispatch-shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.any(Array));
        expect(response.body.length).toBeGreaterThan(0);
        response.body.forEach((shipment: {
          status: string;
          paymentNo?: string;
          financeItems?: unknown;
        }) => {
          expect(['WAITING_DISPATCH', 'OUTBOUNDED']).toContain(shipment.status);
          expect(shipment.paymentNo).toBeUndefined();
          expect(shipment.financeItems).toBeUndefined();
        });
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/dispatch-shipments')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('没有访问权限');
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/dispatch-shipments')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });
  });

  it('keeps handover preview fields, missing-record error, and access control unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .send({ shipmentIds: ['s-seed-1'] })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(customerToken))
      .send({ shipmentIds: ['s-seed-1'] })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentIds: [] })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请先选择待出库订单'));

    await request(app.getHttpServer())
      .patch('/api/warehouse/dispatch-shipments/s-seed-1/declaration')
      .send({ declarationRequired: true })
      .expect(401);

    await request(app.getHttpServer())
      .patch('/api/warehouse/dispatch-shipments/s-seed-1/declaration')
      .set('Authorization', app.auth(customerToken))
      .send({ declarationRequired: true })
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/warehouse/handover/s-seed-1')
      .set('Authorization', app.auth(warehouseToken))
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('尚未打印代理交接单');
      });

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/route')
      .set('Authorization', app.auth(adminToken))
      .send({
        channelId: 'ch-dhl-hk',
        agentId: 'a-yuhuan',
        agentChannelName: '宇环 DHL',
        chargeWeightKg: 18,
        unitPrice: 8,
        currency: 'RMB'
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/warehouse/dispatch-shipments/s-seed-1/declaration')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请选择是否报关'));

    await request(app.getHttpServer())
      .patch('/api/warehouse/dispatch-shipments/s-seed-1/declaration')
      .set('Authorization', app.auth(adminToken))
      .send({ declarationRequired: true })
      .expect(200)
      .expect((response) => expect(response.body.declarationRequired).toBe(true));

    await request(app.getHttpServer())
      .patch('/api/warehouse/dispatch-shipments/s-seed-1/declaration')
      .set('Authorization', app.auth(adminToken))
      .send({ declarationRequired: true })
      .expect(200)
      .expect((response) => expect(response.body.declarationRequired).toBe(true));

    const printed = await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentIds: ['s-seed-1'] })
      .expect(201);

    const reprinted = await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentIds: ['s-seed-1', 's-seed-1'] })
      .expect(201);
    expect(reprinted.body.rows).toHaveLength(1);
    expect(reprinted.body.rows[0]).toEqual(expect.objectContaining({
      shipmentId: 's-seed-1',
      handoverNo: printed.body.rows[0].handoverNo,
      printedBy: printed.body.rows[0].printedBy,
      firstPrintedAt: printed.body.rows[0].firstPrintedAt,
      printCount: 2
    }));

    await request(app.getHttpServer())
      .get('/api/warehouse/handover/s-seed-1')
      .set('Authorization', app.auth(warehouseToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(printed.body.rows[0]);
        expect(response.body).toEqual(expect.objectContaining({
          shipmentId: 's-seed-1',
          handoverNo: expect.any(String),
          printedBy: 'admin',
          printCount: 1
        }));
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/handover/s-seed-1')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('没有访问权限');
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .query({ action: 'warehouse.dispatch.declaration.update' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.filter((row: { target: string }) => row.target === 's-seed-1')).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .query({ action: 'warehouse.handover.print' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.filter((row: { target: string }) => row.target === 's-seed-1')).toHaveLength(2);
      });

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/dispatch')
      .send({})
      .expect(401)
      .expect((response) => expect(response.body.message).toBe('缺少登录凭证'));

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/dispatch')
      .set('Authorization', app.auth(customerToken))
      .send({})
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('没有访问权限'));

    const dispatched = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/dispatch')
      .set('Authorization', app.auth(warehouseToken))
      .send({
        batchDispatchSource: 'warehouse.batch_dispatch_handover',
        shippingMarkConfirmed: true
      })
      .expect(201);
    expect(dispatched.body).toEqual(expect.objectContaining({
      id: 's-seed-1',
      status: 'OUTBOUNDED',
      handoverNo: printed.body.rows[0].handoverNo,
      outboundBy: 'warehouse',
      batchDispatchSource: 'warehouse.batch_dispatch_handover'
    }));

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/dispatch')
      .set('Authorization', app.auth(warehouseToken))
      .send({})
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('当前状态不允许出库'));

    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .query({ action: 'shipment.dispatch' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows.filter((row: { target: string }) => row.target === 's-seed-1')).toEqual([
          expect.objectContaining({
            after: expect.objectContaining({
              handoverNo: printed.body.rows[0].handoverNo,
              statusFrom: 'WAITING_DISPATCH',
              statusTo: 'OUTBOUNDED',
              outboundBy: 'warehouse',
              batchDispatchSource: 'warehouse.batch_dispatch_handover',
              shippingMarkConfirmed: true
            })
          })
        ]);
      });
  });
});
