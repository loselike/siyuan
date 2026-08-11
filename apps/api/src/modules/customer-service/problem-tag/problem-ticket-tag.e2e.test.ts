import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from '../../test-support/e2e-harness.js';

describe('Problem ticket tag API', () => {
  const app = setupE2eApp();

  it('preserves query permissions, normalized CRUD results, persistence and audit actions', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const financeToken = await app.loginAs('finance');
    const operatorToken = await app.loginAs('operator');
    const serviceToken = await app.loginAs('service');

    await request(app.getHttpServer())
      .get('/api/customer-service/problem-tags')
      .expect(401)
      .expect({ message: '缺少登录凭证', error: 'Unauthorized', statusCode: 401 });

    await request(app.getHttpServer())
      .get('/api/customer-service/problem-tags')
      .set('Authorization', app.auth(financeToken))
      .expect(403)
      .expect({ message: '没有访问权限', error: 'Forbidden', statusCode: 403 });

    for (const token of [customerToken, operatorToken, serviceToken]) {
      await request(app.getHttpServer())
        .get('/api/customer-service/problem-tags')
        .set('Authorization', app.auth(token))
        .expect(200)
        .expect((response) => {
          expect(response.body).toHaveLength(8);
          expect(response.body[0]).toEqual({
            id: 'problem-tag-1',
            name: '数据不对',
            scene: 'PROBLEM_TICKET',
            enabled: true,
            customerVisibleAllowed: true,
            sortOrder: 10
          });
          expect(response.body.map((tag: { sortOrder: number }) => tag.sortOrder)).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
        });
    }

    await request(app.getHttpServer())
      .post('/api/customer-service/problem-tags')
      .set('Authorization', app.auth(operatorToken))
      .send({ name: '越权标签' })
      .expect(403)
      .expect({ message: '没有访问权限', error: 'Forbidden', statusCode: 403 });

    const created = await request(app.getHttpServer())
      .post('/api/customer-service/problem-tags')
      .set('Authorization', app.auth(serviceToken))
      .send({ name: '  契约   标签  ' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          name: '契约 标签',
          scene: 'PROBLEM_TICKET',
          enabled: true,
          customerVisibleAllowed: true,
          sortOrder: 90
        }));
      });

    await request(app.getHttpServer())
      .post('/api/customer-service/problem-tags')
      .set('Authorization', app.auth(serviceToken))
      .send({ name: '契约 标签' })
      .expect(409)
      .expect({ message: '常用标签名称已存在', error: 'Conflict', statusCode: 409 });

    await request(app.getHttpServer())
      .put(`/api/customer-service/problem-tags/${created.body.id}`)
      .set('Authorization', app.auth(serviceToken))
      .send({ name: '  契约更新  ' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({ ...created.body, name: '契约更新' });
      });

    await request(app.getHttpServer())
      .put('/api/customer-service/problem-tags/missing-problem-tag')
      .set('Authorization', app.auth(serviceToken))
      .send({ name: '不存在' })
      .expect(404)
      .expect({ message: '常用标签不存在', error: 'Not Found', statusCode: 404 });

    await request(app.getHttpServer())
      .delete(`/api/customer-service/problem-tags/${created.body.id}`)
      .set('Authorization', app.auth(serviceToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({ ...created.body, name: '契约更新' });
      });

    await request(app.getHttpServer())
      .delete(`/api/customer-service/problem-tags/${created.body.id}`)
      .set('Authorization', app.auth(serviceToken))
      .expect(404)
      .expect({ message: '常用标签不存在', error: 'Not Found', statusCode: 404 });

    await request(app.getHttpServer())
      .get('/api/customer-service/problem-tags')
      .set('Authorization', app.auth(serviceToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(8);
        expect(response.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: created.body.id })]));
      });

    await request(app.getHttpServer())
      .get('/api/system/audit-logs')
      .query({ action: 'customer_service.problem_tag', operator: 'service' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({ action: 'customer_service.problem_tag.create', target: created.body.id, actorUsername: 'service' }),
          expect.objectContaining({ action: 'customer_service.problem_tag.update', target: created.body.id, actorUsername: 'service' }),
          expect.objectContaining({ action: 'customer_service.problem_tag.delete', target: created.body.id, actorUsername: 'service' })
        ]));
      });
  });
});
