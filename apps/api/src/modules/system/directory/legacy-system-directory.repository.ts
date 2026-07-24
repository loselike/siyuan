import { Inject, Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';
import type { SystemDirectoryRepository } from './system-directory.repository.js';

@Injectable()
export class LegacySystemDirectoryRepository implements SystemDirectoryRepository {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  getDepartments(principal: Principal) {
    return this.repository.getDepartments(principal);
  }

  getSites(principal: Principal) {
    return this.repository.getSites(principal);
  }
}
