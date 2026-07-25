import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Warehouse tally query API', () => {
  const app = setupE2eApp();

  it('keeps tally list, history-chain and missing output response contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);

    const tasks = await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .set('Authorization', authorization)
      .expect(200);
    expect(Array.isArray(tasks.body)).toBe(true);

    const history = await request(app.getHttpServer())
      .get('/api/warehouse/tally-task-history-chain')
      .query({ packageId: 'codex-phase23-nonexistent' })
      .set('Authorization', authorization)
      .expect(200);
    expect(history.body).toEqual([]);

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks/codex-phase23-nonexistent/output-packages')
      .set('Authorization', authorization)
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('理货任务不存在');
      });
  });

  it('keeps authentication and warehouse tally permission denial behavior unchanged', async () => {
    const customerToken = await app.loginAs('customer');
    const authorization = app.auth(customerToken);

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks')
      .set('Authorization', authorization)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/warehouse/consolidations/codex-phase23-nonexistent/items')
      .set('Authorization', authorization)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/warehouse/tally-task-history-chain')
      .query({ packageId: 'codex-phase23-nonexistent' })
      .set('Authorization', authorization)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/warehouse/tally-tasks/codex-phase23-nonexistent/output-packages')
      .set('Authorization', authorization)
      .expect(403);
  });
});
