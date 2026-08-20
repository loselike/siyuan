import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from './auth/auth-session.service.js';
import type { Principal } from './rbac.js';
import { SystemDirectoryController } from './system/directory/system-directory.controller.js';
import {
  PrismaSystemDirectoryRepository,
  SYSTEM_DIRECTORY_REPOSITORY
} from './system/directory/system-directory.repository.js';
import { SystemDirectoryService } from './system/directory/system-directory.service.js';
import { setupPrismaReadE2eApp } from './test-support/prisma-read-e2e-harness.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const operator: Principal = { id: 'u-operator', username: 'operator', role: 'OPERATOR' };
const departmentFindMany = vi.fn().mockResolvedValue([
  { id: 'department-business', name: '业务部', enabled: true }
]);
const siteFindMany = vi.fn().mockResolvedValue([
  { id: 'site-shenzhen', name: '深圳站', enabled: true, sortOrder: 2 }
]);

describe('System directory API', () => {
  const app = setupPrismaReadE2eApp({
    controllers: [SystemDirectoryController],
    providers: [
      SystemDirectoryService,
      PrismaSystemDirectoryRepository,
      {
        provide: AuthSessionService,
        useValue: {
          hydrateCurrentSession: vi.fn(async (principal: Principal) => (
            principal.role === 'ADMIN' ? ['system:accounts:read', 'system:sites:read'] : []
          )),
          recordPermissionDenied: vi.fn(async () => undefined)
        }
      },
      { provide: SYSTEM_DIRECTORY_REPOSITORY, useExisting: PrismaSystemDirectoryRepository }
    ],
    prisma: {
      department: { findMany: departmentFindMany },
      site: { findMany: siteFindMany }
    }
  });

  it('keeps department and site response contracts for an allowed role', async () => {
    const adminToken = app.tokenFor(admin);

    const departments = await request(app.getHttpServer())
      .get('/api/system/departments')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(departments.body).toEqual([
      { id: 'department-business', name: '业务部', enabled: true }
    ]);

    const sites = await request(app.getHttpServer())
      .get('/api/system/sites')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(sites.body).toEqual([
      { id: 'site-shenzhen', name: '深圳站', enabled: true, sortOrder: 2 }
    ]);
  });

  it('keeps authentication and permission denial behavior', async () => {
    const operatorToken = app.tokenFor(operator);

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
