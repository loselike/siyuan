import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('warehouse rent API contract', () => {
  const app = setupE2eApp();

  it('preserves authentication, role permission and read/export response contracts', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const routes = [
      '/api/warehouse/rent-details',
      '/api/warehouse/rent-details/export',
      '/api/warehouse/rent-rules'
    ];

    for (const route of routes) {
      await request(app.getHttpServer()).get(route).expect(401);
      await request(app.getHttpServer())
        .get(route)
        .set('Authorization', app.auth(customerToken))
        .expect(403);
    }

    for (const route of ['/api/warehouse/rent-details', '/api/warehouse/rent-details/export']) {
      await request(app.getHttpServer())
        .get(route)
        .query({ status: 'IN_STOCK', hasRent: 'false' })
        .set('Authorization', app.auth(adminToken))
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(expect.objectContaining({
            totals: expect.objectContaining({
              inStockCount: expect.any(Number),
              overdueCount: expect.any(Number),
              currentRentAmountRmb: expect.any(Number),
              outboundedRentAmountRmb: expect.any(Number)
            }),
            rows: expect.any(Array),
            sites: expect.any(Array),
            salespeople: expect.any(Array)
          }));
        });
    }

    await request(app.getHttpServer())
      .get('/api/warehouse/rent-rules')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => expect(Array.isArray(response.body)).toBe(true));
  });

  it('preserves rent-rule validation, versioning, deletion restoration and audits', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const authorization = app.auth(adminToken);
    const initialInput = {
      name: 'phase16 仓租规则保护样本',
      site: 'PHASE16',
      effectiveFrom: '2099-01-01',
      freeDays: 7,
      freePeriodUnit: 'DAY',
      billingUnit: 'CBM',
      billingCycleUnit: 'DAY',
      densityMin: 0.123456,
      unitRate: 8.88,
      enabled: true,
      remark: '迁移前后契约保护'
    };

    await request(app.getHttpServer())
      .post('/api/warehouse/rent-rules')
      .send(initialInput)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/warehouse/rent-rules')
      .set('Authorization', app.auth(customerToken))
      .send(initialInput)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/warehouse/rent-rules')
      .set('Authorization', authorization)
      .send({})
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请输入规则名称'));

    const created = await request(app.getHttpServer())
      .post('/api/warehouse/rent-rules')
      .set('Authorization', authorization)
      .send(initialInput)
      .expect(201);
    expect(created.body).toEqual(expect.objectContaining({
      name: initialInput.name,
      site: initialInput.site,
      freeDays: 7,
      freePeriodUnit: 'DAY',
      billingUnit: 'CBM',
      billingCycleUnit: 'DAY',
      densityMin: 0.123456,
      unitRate: 8.88,
      currency: 'RMB',
      enabled: true,
      createdBy: 'admin'
    }));

    const versioned = await request(app.getHttpServer())
      .put(`/api/warehouse/rent-rules/${created.body.id}`)
      .set('Authorization', authorization)
      .send({ ...initialInput, name: 'phase16 仓租规则新版本', effectiveFrom: '2099-02-01', unitRate: 9.99 })
      .expect(200);
    expect(versioned.body).toEqual(expect.objectContaining({
      name: 'phase16 仓租规则新版本',
      effectiveFrom: '2099-01-31T16:00:00.000Z',
      unitRate: 9.99,
      enabled: true
    }));
    expect(versioned.body.id).not.toBe(created.body.id);

    await request(app.getHttpServer())
      .put(`/api/warehouse/rent-rules/${versioned.body.id}/enabled`)
      .set('Authorization', authorization)
      .send({ enabled: false })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('尚未生效的仓租规则请直接删除'));

    await request(app.getHttpServer())
      .delete(`/api/warehouse/rent-rules/${versioned.body.id}`)
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => expect(response.body.id).toBe(versioned.body.id));

    await request(app.getHttpServer())
      .get('/api/warehouse/rent-rules')
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        const restored = response.body.find((rule: { id: string }) => rule.id === created.body.id);
        expect(restored).toEqual(expect.objectContaining({ enabled: true }));
        expect(restored.effectiveTo).toBeUndefined();
        expect(response.body.some((rule: { id: string }) => rule.id === versioned.body.id)).toBe(false);
      });

    for (const action of [
      'warehouse.rent_rule.create',
      'warehouse.rent_rule.version',
      'warehouse.rent_rule.delete'
    ]) {
      await request(app.getHttpServer())
        .get('/api/system/audit-logs')
        .query({ action })
        .set('Authorization', authorization)
        .expect(200)
        .expect((response) => {
          expect(response.body.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({ action, actorUsername: 'admin' })
          ]));
        });
    }
  });
});
