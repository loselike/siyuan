import type { INestApplication, Provider, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll } from 'vitest';
import { configureApp } from '../../configure-app.js';
import { PrismaRepository } from '../prisma.repository.js';
import { PrismaService } from '../prisma.service.js';
import { RbacGuard, jwtSecret } from '../rbac.guard.js';
import type { PermissionKey, Principal } from '../rbac.js';

type PrismaReadE2eOptions = {
  controllers: Type<unknown>[];
  providers: Provider[];
  prisma: Record<string, unknown>;
  hasPermission?: (role: string, permission: PermissionKey) => boolean | Promise<boolean>;
};

// Lightweight fixture for read-only domain slices. It exercises the real
// controller, RBAC guard, service and Prisma repository without booting the
// legacy InMemoryRepository-backed AppModule.
export function setupPrismaReadE2eApp(options: PrismaReadE2eOptions) {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const permissionRepository = {
      hasPermission: options.hasPermission ?? ((role: string) => role === 'ADMIN'),
      recordPermissionDenied: async () => undefined
    };
    const moduleRef = await Test.createTestingModule({
      controllers: options.controllers,
      providers: [
        ...options.providers,
        { provide: PrismaService, useValue: options.prisma },
        { provide: PrismaRepository, useValue: permissionRepository },
        { provide: APP_GUARD, useClass: RbacGuard }
      ]
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  return {
    getHttpServer() {
      if (!app) throw new Error('Prisma read E2E app has not been initialized');
      return app.getHttpServer();
    },
    tokenFor(principal: Principal) {
      return jwt.sign(principal, jwtSecret(), { expiresIn: '5m' });
    },
    auth(token: string) {
      return `Bearer ${token}`;
    }
  };
}
