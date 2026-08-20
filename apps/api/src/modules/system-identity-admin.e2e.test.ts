import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('System identity admin API', () => {
  const app = setupE2eApp();

  it('keeps representative read routes admin-only at the HTTP boundary', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .get('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          availablePermissions: expect.any(Array),
          roles: expect.any(Array)
        }));
      });

    await request(app.getHttpServer())
      .get('/api/system/staff-accounts')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.any(Array));
      });

    await request(app.getHttpServer())
      .get('/api/system/roles')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/system/staff-accounts')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/system/roles')
      .expect(401);
  });
});
