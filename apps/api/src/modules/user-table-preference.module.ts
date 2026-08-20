import { Module } from '@nestjs/common';
import { DataAccessModule, usePrismaRepository } from './data-access.module.js';
import { UserTablePreferenceController } from './user-table-preference.controller.js';
import {
  InMemoryUserTablePreferenceService,
  PrismaUserTablePreferenceService,
  UserTablePreferenceService
} from './user-table-preference.service.js';

const userTablePreferenceServiceProvider = usePrismaRepository
  ? { provide: UserTablePreferenceService, useClass: PrismaUserTablePreferenceService }
  : { provide: UserTablePreferenceService, useClass: InMemoryUserTablePreferenceService };

@Module({
  imports: [DataAccessModule],
  controllers: [UserTablePreferenceController],
  providers: [userTablePreferenceServiceProvider]
})
export class UserTablePreferenceModule {}
