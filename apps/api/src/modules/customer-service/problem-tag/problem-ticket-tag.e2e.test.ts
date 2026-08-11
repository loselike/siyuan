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

  it('preserves tag name and problem ticket snapshot validation', async () => {
    const adminToken = await app.loginAs('admin');
    const serviceToken = await app.loginAs('service');

    for (const sample of [
      { name: '   ', message: '请填写标签名称' },
      { name: '二十一字符标签名称校验样本一二三四五六七八九十', message: '标签名称最多 20 个字符' },
      { name: '标签,名称', message: '标签名称不能包含逗号' },
      { name: '标签，名称', message: '标签名称不能包含逗号' }
    ]) {
      await request(app.getHttpServer())
        .post('/api/customer-service/problem-tags')
        .set('Authorization', app.auth(serviceToken))
        .send({ name: sample.name })
        .expect(400)
        .expect({ message: sample.message, error: 'Bad Request', statusCode: 400 });
    }

    for (const sample of [
      { tags: '不是数组', message: '常用标签格式不正确' },
      { tags: Array.from({ length: 11 }, (_, index) => `标签${index + 1}`), message: '单个问题件最多选择 10 个常用标签' },
      { tags: ['标签,名称'], message: '标签名称不能包含逗号' },
      { tags: ['不存在的有效标签'], message: '常用标签已变更，请刷新后重试' }
    ]) {
      await request(app.getHttpServer())
        .post('/api/shipments/s-seed-2/problem-tickets')
        .set('Authorization', app.auth(adminToken))
        .send({ reason: '标签快照校验样本', tags: sample.tags })
        .expect(400)
        .expect({ message: sample.message, error: 'Bad Request', statusCode: 400 });
    }
  });
});
