import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { DepartmentSummary, SiteSummary } from '@siyuan/shared';
import { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';

export const SYSTEM_DIRECTORY_REPOSITORY = 'SYSTEM_DIRECTORY_REPOSITORY';

export interface SystemDirectoryRepository {
  getDepartments(principal: Principal): Promise<DepartmentSummary[]>;
  getSites(principal: Principal): Promise<SiteSummary[]>;
}

@Injectable()
export class PrismaSystemDirectoryRepository implements SystemDirectoryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getDepartments(principal: Principal): Promise<DepartmentSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看部门');
    const departments = await this.prisma.department.findMany({
      orderBy: [{ enabled: 'desc' }, { name: 'asc' }]
    });
    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      enabled: department.enabled
    }));
  }

  async getSites(principal: Principal): Promise<SiteSummary[]> {
    this.ensureAdmin(principal, '只有管理员可以查看站点');
    const sites = await this.prisma.site.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
    return sites.map((site) => ({
      id: site.id,
      sortOrder: site.sortOrder,
      name: site.name,
      enabled: site.enabled
    }));
  }

  private ensureAdmin(principal: Principal, message: string) {
    if (principal.role !== 'ADMIN') {
      throw new ForbiddenException(message);
    }
  }
}
