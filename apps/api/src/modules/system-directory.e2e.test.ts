import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('System directory API', () => {
  const app = setupE2eApp();

  it('keeps department and site response contracts for an allowed role', async () => {
    const adminToken = await app.loginAs('admin');

    const departments = await request(app.getHttpServer())
      .get('/api/system/departments')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(departments.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        enabled: expect.any(Boolean)
      })
    ]));

    const sites = await request(app.getHttpServer())
      .get('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(sites.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        enabled: expect.any(Boolean),
        sortOrder: expect.any(Number)
      })
    ]));
  });

  it('keeps authentication and permission denial behavior', async () => {
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .get('/api/system/departments')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/system/departments')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/system/sites')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
  });
});
