import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';

describe('Siyuan API MVP', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('authenticates staff and returns shipment data', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.length).toBeGreaterThan(1);
      });
  });

  it('prevents customers from reading employee master data', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'customer', password: 'customer123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(403);
  });

  it('allows finance users to read receivables', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'finance', password: 'finance123' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/finance/receivables')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body[0].amount).toBeGreaterThan(0);
      });
  });
});
