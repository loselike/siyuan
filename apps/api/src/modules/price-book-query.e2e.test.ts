import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Price book query API', () => {
  const app = setupE2eApp();

  it('keeps price-book and legacy health contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .query({ targetModule: 'amazon' })
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          books: expect.any(Array),
          rows: []
        });
      });

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .query({ includeRows: 'true' })
      .set('Authorization', authorization)
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('价格表列表不支持返回完整明细，请使用分页线路接口');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/sync-health')
      .query({ page: 1, pageSize: 20, legacyModule: 'amazon' })
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          rows: expect.any(Array),
          stats: expect.any(Object),
          pagination: expect.objectContaining({ page: 1, pageSize: 20 })
        }));
      });

    await request(app.getHttpServer())
      .get('/api/pricing/books/import-jobs/codex-phase25-nonexistent')
      .set('Authorization', authorization)
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('价格表导入任务不存在');
      });

    await request(app.getHttpServer())
      .get('/api/pricing/legacy/sources')
      .query({ module: 'amazon' })
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({ sources: expect.any(Array) });
      });

    await request(app.getHttpServer())
      .get('/api/pricing/legacy/health-report')
      .query({ module: 'amazon' })
      .set('Authorization', authorization)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          module: 'amazon',
          rowCount: expect.any(Number),
          issues: expect.any(Array)
        });
      });
  });

  it('keeps market access, authentication and customer denials unchanged', async () => {
    const marketToken = await app.loginAs('market');
    const customerToken = await app.loginAs('customer');

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .set('Authorization', app.auth(marketToken))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/pricing/books')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });

    for (const path of [
      '/api/pricing/books',
      '/api/pricing/sync-health',
      '/api/pricing/books/import-jobs/codex-phase25-nonexistent',
      '/api/pricing/legacy/sources?module=amazon',
      '/api/pricing/legacy/health-report?module=amazon'
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', app.auth(customerToken))
        .expect(403)
        .expect((response) => {
          expect(response.body.message).toBe('没有访问权限');
        });
    }
  });
});
