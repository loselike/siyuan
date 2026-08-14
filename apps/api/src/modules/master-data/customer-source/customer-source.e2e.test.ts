import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from '../../test-support/e2e-harness.js';

describe('Customer source API', () => {
  const app = setupE2eApp();

  it('preserves routes, permissions, normalization, persistence and audit actions', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/master-data/customer-sources')
      .expect(401)
      .expect({ message: '缺少登录凭证', error: 'Unauthorized', statusCode: 401 });

    await request(app.getHttpServer())
      .post('/api/master-data/customer-sources')
      .set('Authorization', app.auth(customerToken))
      .send({ name: '越权来源' })
      .expect(403)
      .expect({ message: '没有访问权限', error: 'Forbidden', statusCode: 403 });

    const created = await request(app.getHttpServer())
      .post('/api/master-data/customer-sources')
      .set('Authorization', app.auth(adminToken))
      .send({ name: '  契约   来源  ', remark: '  保留备注  ', enabled: true })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          name: '契约   来源',
          normalizedName: '契约   来源',
          remark: '保留备注',
          enabled: true,
          customerCount: 0
        }));
      });

    await request(app.getHttpServer())
      .get('/api/master-data/customer-sources')
      .set('Authorization', app.auth(adminToken))
      .query({ keyword: '  契约  ', enabledOnly: 'true' })
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toEqual([
          expect.objectContaining({ id: created.body.id, name: '契约   来源', enabled: true })
        ]);
      });

    await request(app.getHttpServer())
      .put(`/api/master-data/customer-sources/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .send({ name: '契约更新', enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: created.body.id,
          name: '契约更新',
          enabled: false
        }));
      });

    await request(app.getHttpServer())
      .delete(`/api/master-data/customer-sources/${created.body.id}`)
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect({ id: created.body.id, deleted: true });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .query({ action: 'master_data.customer_source', operator: 'admin' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'master_data.customer_source.create', target: `customerSource:${created.body.id}` }),
          expect.objectContaining({ action: 'master_data.customer_source.disable', target: `customerSource:${created.body.id}` }),
          expect.objectContaining({ action: 'master_data.customer_source.delete', target: `customerSource:${created.body.id}` })
        ]));
      });
  });
});
