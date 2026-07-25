import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Customer service query API', () => {
  const app = setupE2eApp();

  it('keeps transfer shipment response and access contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const serviceToken = await app.loginAs('service');
    const customerToken = await app.loginAs('customer');

    for (const token of [adminToken, serviceToken]) {
      await request(app.getHttpServer())
        .get('/api/customer-service/transfer-shipments')
        .set('Authorization', app.auth(token))
        .expect(200)
        .expect((response) => {
          expect(Array.isArray(response.body)).toBe(true);
        });
    }

    await request(app.getHttpServer())
      .get('/api/customer-service/transfer-shipments')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });

    await request(app.getHttpServer())
      .get('/api/customer-service/transfer-shipments')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('没有访问权限');
      });
  });

  it('keeps problem ticket customer scope and permission denials unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const serviceToken = await app.loginAs('service');
    const customerToken = await app.loginAs('customer');
    const warehouseToken = await app.loginAs('warehouse');

    const visible = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/problem-tickets')
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '客户可见读取边界样本', customerVisible: true })
      .expect(201);

    const internal = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/problem-tickets')
      .set('Authorization', app.auth(adminToken))
      .send({ reason: '内部读取边界样本', customerVisible: false })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/problem-tickets')
      .set('Authorization', app.auth(customerToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: visible.body.id,
            shipmentId: 's-seed-1',
            customerVisible: true
          })
        ]));
        expect(response.body.some((ticket: { id: string }) => ticket.id === internal.body.id)).toBe(false);
        expect(response.body.every((ticket: { customerVisible: boolean }) => ticket.customerVisible)).toBe(true);
      });

    await request(app.getHttpServer())
      .get('/api/problem-tickets')
      .set('Authorization', app.auth(serviceToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: visible.body.id }),
          expect.objectContaining({ id: internal.body.id })
        ]));
      });

    await request(app.getHttpServer())
      .get('/api/problem-tickets')
      .set('Authorization', app.auth(warehouseToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('没有访问权限');
      });

    await request(app.getHttpServer())
      .get('/api/problem-tickets')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });
  });
});
