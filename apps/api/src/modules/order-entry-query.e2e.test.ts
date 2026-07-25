import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Order entry query API', () => {
  const app = setupE2eApp();

  it('keeps package query parameters, data scope, and authentication unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const financeToken = await app.loginAs('finance');

    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .query({ customerCode: '9409' })
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.any(Array));
        response.body.forEach((item: { customerCode: string }) => {
          expect(item.customerCode).toBe('9409');
        });
      });

    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .query({ customerCode: '1344' })
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .set('Authorization', app.auth(financeToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('没有访问权限');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/WAREHOUSE/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['business:order-entry:warehouse-package-select'] })
      .expect(200);

    const warehouseToken = await app.loginAs('warehouse');
    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .query({ customerCode: '9409' })
      .set('Authorization', app.auth(warehouseToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('当前角色不能使用内部录单');
      });

    await request(app.getHttpServer())
      .get('/api/shipments/order-entry/packages')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });
  });

  it('keeps detail response fields, data scope, and customer denial unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-1/order-entry')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          shipment: expect.objectContaining({ id: 's-seed-1' }),
          packages: expect.any(Array),
          receivables: expect.any(Array),
          businessCosts: expect.any(Array),
          payables: expect.any(Array),
          canViewPayables: true
        }));
      });

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-2/order-entry')
      .set('Authorization', app.auth(operatorToken))
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('录单不存在');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/CUSTOMER/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['business:order-entry:view'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-1/order-entry')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('当前角色不能使用内部录单');
      });
  });
});
