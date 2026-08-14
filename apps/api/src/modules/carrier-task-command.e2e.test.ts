import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Carrier task command API', () => {
  const app = setupE2eApp();

  it('keeps run, fail, retry, repeat, permission, and response contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');

    for (const [path, body] of [
      ['/api/carrier-tasks/ct-seed-dhl/run', {}],
      ['/api/carrier-tasks/ct-seed-ups/retry', {}]
    ] as const) {
      await request(app.getHttpServer())
        .post(path)
        .send(body)
        .expect(401)
        .expect((response) => expect(response.body.message).toBe('缺少登录凭证'));
      await request(app.getHttpServer())
        .post(path)
        .set('Authorization', app.auth(customerToken))
        .send(body)
        .expect(403)
        .expect((response) => expect(response.body.message).toBe('没有访问权限'));
    }

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/phase23-missing/run')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(404)
      .expect((response) => expect(response.body.message).toBe('承运商任务不存在'));

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/phase23-missing/retry')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(404)
      .expect((response) => expect(response.body.message).toBe('承运商任务不存在'));

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/ct-seed-dhl/retry')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('只有失败任务可以重试'));

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/ct-seed-dhl/run')
      .set('Authorization', app.auth(adminToken))
      .send({ fail: true })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          task: expect.objectContaining({
            id: 'ct-seed-dhl',
            shipmentId: 's-seed-2',
            status: 'FAILED',
            attempts: 1,
            lastError: '模拟承运商接口失败'
          }),
          shipment: expect.objectContaining({ id: 's-seed-2' })
        }));
      });

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/ct-seed-dhl/retry')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          task: expect.objectContaining({
            id: 'ct-seed-dhl',
            status: 'SUCCESS',
            attempts: 2,
            completedAt: expect.any(String)
          }),
          shipment: expect.objectContaining({
            id: 's-seed-2',
            latestTracking: 'DHL 已揽收 9064656160',
            trackingStaleDays: 0
          })
        }));
        expect(response.body.task.lastError).toBeUndefined();
      });

    await request(app.getHttpServer())
      .post('/api/carrier-tasks/ct-seed-dhl/run')
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('已成功任务不能重复执行'));

    await request(app.getHttpServer())
      .get('/api/carrier-tasks')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: 'ct-seed-dhl', status: 'SUCCESS', attempts: 2 })
        ]));
      });
  });
});
