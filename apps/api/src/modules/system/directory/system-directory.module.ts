import { Module } from '@nestjs/common';
import { DataAccessModule, usePrismaRepository } from '../../data-access.module.js';
import { LegacySystemDirectoryRepository } from './legacy-system-directory.repository.js';
import { SystemDirectoryController } from './system-directory.controller.js';
import {
  PrismaSystemDirectoryRepository,
  SYSTEM_DIRECTORY_REPOSITORY
} from './system-directory.repository.js';
import { SystemDirectoryService } from './system-directory.service.js';

const systemDirectoryRepositoryProvider = usePrismaRepository
  ? { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: PrismaSystemDirectoryRepository }
  : { provide: SYSTEM_DIRECTORY_REPOSITORY, useClass: LegacySystemDirectoryRepository };

@Module({
  imports: [DataAccessModule],
  controllers: [SystemDirectoryController],
  providers: [SystemDirectoryService, systemDirectoryRepositoryProvider],
  exports: [SystemDirectoryService]
})
export class SystemDirectoryModule {}
