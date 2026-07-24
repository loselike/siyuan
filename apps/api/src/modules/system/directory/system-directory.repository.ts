import { Inject, Injectable } from '@nestjs/common';
import type { DepartmentSummary, SiteSummary } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';

export const SYSTEM_DIRECTORY_REPOSITORY = 'SYSTEM_DIRECTORY_REPOSITORY';

export interface SystemDirectoryRepository {
  getDepartments(principal: Principal): Promise<DepartmentSummary[]>;
  getSites(principal: Principal): Promise<SiteSummary[]>;
}

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
