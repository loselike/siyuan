import request from 'supertest';
import { describe, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('pricing business capabilities', () => {
  const app = setupE2eApp();

  it('keeps module view and edit grants independent at the API and repository boundaries', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_BUSINESS/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['pricing:markup:amazon:view'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .query({ legacyModule: 'amazon' })
      .set('Authorization', app.auth(operatorToken))
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .query({ legacyModule: 'inquiry' })
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(operatorToken))
      .send({ legacyModule: 'amazon', agentName: '权限保护样本', markupPerKg: 1 })
      .expect(403);

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_BUSINESS/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['pricing:markup:amazon:edit'] })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/pricing/markup-rules')
      .set('Authorization', app.auth(operatorToken))
      .send({ legacyModule: 'amazon', agentName: '权限保护样本', markupPerKg: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/pricing/markup-rules')
      .query({ legacyModule: 'inquiry' })
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
  });
});
