import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('warehouse tally operations contract', () => {
  const app = setupE2eApp();

  it('preserves authentication, dynamic consolidation permission and validation behavior', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .send({ packageIds: [], mode: 'MERGE_ONLY' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(operatorToken))
      .send({ packageIds: [], mode: 'MERGE_ONLY' })
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('没有访问权限'));

    await request(app.getHttpServer())
      .post('/api/warehouse/consolidations')
      .set('Authorization', app.auth(adminToken))
      .send({ packageIds: [], mode: 'MERGE_ONLY' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请先选择要合并的包裹'));

    await request(app.getHttpServer())
      .post('/api/warehouse/consolidations/codex-phase15-nonexistent/create-shipment')
      .set('Authorization', app.auth(adminToken))
      .expect(404)
      .expect((response) => expect(response.body.message).toBe('合并批次不存在'));
  });

  it('preserves repeat-statistics route permissions and response shape', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-repeat-statistics')
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-repeat-statistics')
      .set('Authorization', app.auth(customerToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/warehouse/tally-repeat-statistics')
      .query({ datePreset: 'ALL', onlyRepeated: 'true' })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          summary: expect.objectContaining({
            completedBatchCount: expect.any(Number),
            repeatedBatchCount: expect.any(Number),
            extraTallyCount: expect.any(Number),
            repeatRate: expect.any(Number),
            maxTallyCount: expect.any(Number)
          }),
          salespeople: expect.any(Array),
          operators: expect.any(Array),
          batches: expect.any(Array),
          updatedAt: expect.any(String)
        }));
        expect(response.body.batches.every((batch: { tallyCount: number }) => batch.tallyCount > 1)).toBe(true);
      });
  });
});
