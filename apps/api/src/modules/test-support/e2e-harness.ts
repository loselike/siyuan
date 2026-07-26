import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll } from 'vitest';
import { configureApp } from '../../configure-app.js';
import { AppModule } from '../app.module.js';

const e2eUsers = {
  admin: 'admin123',
  finance: 'finance123',
  operator: 'operator123',
  market: 'market123',
  warehouse: 'warehouse123',
  customer: 'customer123',
  service: 'service123',
  'R-market': 'R-market@123'
} as const;

type E2eUser = keyof typeof e2eUsers;

// Existing broad E2E tests still boot AppModule with the current in-memory
// adapter. New read-only domain tests should use prisma-read-e2e-harness.ts;
// write workflows should use a dedicated Prisma test database instead of
// expanding InMemoryRepository.
export function setupE2eApp() {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  return {
    getHttpServer() {
      if (!app) {
        throw new Error('E2E app has not been initialized');
      }
      return app.getHttpServer();
    },
    async loginAs(username: E2eUser) {
      const response = await request(this.getHttpServer())
        .post('/api/auth/login')
        .send({ username, password: e2eUsers[username] })
        .expect(201);
      return response.body.accessToken as string;
    },
    auth(token: string) {
      return `Bearer ${token}`;
    }
  };
}
