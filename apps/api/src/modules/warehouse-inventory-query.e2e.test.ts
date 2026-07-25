import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Warehouse inventory query API', () => {
  const app = setupE2eApp();

  it('keeps the five warehouse inventory read paths and response shapes unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);

    const packages = await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', authorization)
      .expect(200);
    expect(Array.isArray(packages.body)).toBe(true);

    const today = await request(app.getHttpServer())
      .get('/api/warehouse/today-receipts')
      .set('Authorization', authorization)
      .expect(200);
    expect(today.body).toEqual(expect.objectContaining({
      totals: expect.any(Object),
      rows: expect.any(Array)
    }));

    const inStock = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .set('Authorization', authorization)
      .expect(200);
    expect(inStock.body).toEqual(expect.objectContaining({
      totals: expect.any(Object),
      rows: expect.any(Array)
    }));

    const groups = await request(app.getHttpServer())
      .get('/api/warehouse/package-groups')
      .set('Authorization', authorization)
      .expect(200);
    expect(Array.isArray(groups.body)).toBe(true);

    const customers = await request(app.getHttpServer())
      .get('/api/warehouse/manual-receipt/customers')
      .set('Authorization', authorization)
      .expect(200);
    expect(customers.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: expect.any(String),
        name: expect.any(String)
      })
    ]));
  });

  it('keeps authentication and warehouse permission denial behavior unchanged', async () => {
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(customerToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/warehouse/manual-receipt/customers')
      .set('Authorization', app.auth(customerToken))
      .expect(403);
  });
});
