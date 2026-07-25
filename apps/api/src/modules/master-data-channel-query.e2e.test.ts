import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Master data channel query API', () => {
  const app = setupE2eApp();

  it('keeps carrier, channel and channel-category response contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const snapshot = await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', authorization)
      .expect(200);

    const carriers = await request(app.getHttpServer())
      .get('/api/master-data/carriers')
      .set('Authorization', authorization)
      .expect(200);
    expect(carriers.body).toEqual(snapshot.body.carriers);

    const channels = await request(app.getHttpServer())
      .get('/api/master-data/channels')
      .set('Authorization', authorization)
      .expect(200);
    expect(channels.body).toEqual(snapshot.body.channels);

    const channelCategories = await request(app.getHttpServer())
      .get('/api/master-data/channel-categories')
      .set('Authorization', authorization)
      .expect(200);
    expect(channelCategories.body).toEqual(snapshot.body.channelCategories);
  });

  it('keeps authentication and customer permission denial unchanged', async () => {
    const customerToken = await app.loginAs('customer');
    const authorization = app.auth(customerToken);

    await request(app.getHttpServer())
      .get('/api/master-data/channels')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });

    for (const path of [
      '/api/master-data/carriers',
      '/api/master-data/channels',
      '/api/master-data/channel-categories'
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', authorization)
        .expect(403)
        .expect((response) => {
          expect(response.body.message).toBe('没有访问权限');
        });
    }
  });
});
