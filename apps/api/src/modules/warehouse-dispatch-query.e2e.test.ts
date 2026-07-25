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

    const printed = await request(app.getHttpServer())
      .post('/api/warehouse/handover/print')
      .set('Authorization', app.auth(adminToken))
      .send({ shipmentIds: ['s-seed-1'] })
      .expect(201);

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
  });
});
