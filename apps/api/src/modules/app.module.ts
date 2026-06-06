import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AuthController } from './auth.controller.js';
import { DataController } from './data.controller.js';
import { DatabaseSeedService } from './database-seed.service.js';
import { InMemoryRepository } from './in-memory.repository.js';
import { PrismaRepository } from './prisma.repository.js';
import { PrismaService } from './prisma.service.js';
import { RbacGuard } from './rbac.guard.js';

const repositoryProviders =
  process.env.USE_PRISMA_REPOSITORY === 'true'
    ? [PrismaService, PrismaRepository, DatabaseSeedService]
    : [{ provide: PrismaRepository, useClass: InMemoryRepository }];

@Module({
  controllers: [AuthController, DataController, AiController],
  providers: [
    AiService,
    ...repositoryProviders,
    {
      provide: APP_GUARD,
      useClass: RbacGuard
    }
  ]
})
export class AppModule {}
