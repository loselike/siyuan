import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Shipment fulfillment query API', () => {
  const app = setupE2eApp();

  it('keeps label response fields, role denial, and authentication unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');

    const created = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-4/labels')
      .set('Authorization', app.auth(adminToken))
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-4/labels')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([created.body.label]);
        expect(response.body[0]).toEqual(expect.objectContaining({
          shipmentId: 's-seed-4',
          labelNo: expect.any(String),
          transferNo: expect.any(String),
          status: 'CREATED'
        }));
      });

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-4/labels')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('客户不能查看内部面单');
      });

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-4/labels')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });
  });

  it('keeps carrier task fields, customer denial, and unauthenticated rejection unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: 'ct-seed-ups',
            shipmentId: 's-seed-4',
            type: 'TRACKING_SYNC',
            status: 'FAILED',
            lastError: '模拟承运商接口失败'
          })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('没有访问权限');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['tracking:carrier-task:view'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('客户不能查看承运商任务');
      });

    await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });
  });
});
