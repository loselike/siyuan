import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Warehouse inventory query API', () => {
  const app = setupE2eApp();

  it('keeps the existing warehouse inventory response shapes and returns matching dashboard totals', async () => {
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

    const inStockPage = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock-page?page=1&pageSize=1')
      .set('Authorization', authorization)
      .expect(200);
    expect(inStockPage.body).toEqual(expect.objectContaining({
      totals: inStock.body.totals,
      rows: expect.any(Array),
      pagination: {
        page: 1,
        pageSize: 1,
        totalItems: inStock.body.rows.length
      }
    }));
    expect(inStockPage.body.rows.length).toBeLessThanOrEqual(1);

    const inStockSummary = await request(app.getHttpServer())
      .get('/api/warehouse/in-stock-summary')
      .set('Authorization', authorization)
      .expect(200);
    expect(inStockSummary.body).toEqual({ totals: inStock.body.totals });
    expect(inStockSummary.body).not.toHaveProperty('rows');

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
    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock-summary')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock-summary')
      .set('Authorization', app.auth(customerToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock-page?page=1&pageSize=10')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock-page?page=1&pageSize=10')
      .set('Authorization', app.auth(customerToken))
      .expect(403);
  });
});
