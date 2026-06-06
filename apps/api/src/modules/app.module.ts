import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { DataController } from './data.controller.js';
import { InMemoryRepository } from './in-memory.repository.js';
import { RbacGuard } from './rbac.guard.js';

@Module({
  controllers: [AuthController, DataController],
  providers: [
    InMemoryRepository,
    {
      provide: APP_GUARD,
      useClass: RbacGuard
    }
  ]
})
export class AppModule {}
