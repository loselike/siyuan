import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PrismaRepository } from './prisma.repository.js';
import { PrismaService } from './prisma.service.js';
import type { Principal } from './rbac.js';
import { PrismaSystemDirectoryRepository } from './system/directory/system-directory.repository.js';

const admin: Principal = { id: 'u-admin', username: 'admin', role: 'ADMIN' };
const operator: Principal = { id: 'u-operator', username: 'operator', role: 'OPERATOR' };

describe('PrismaSystemDirectoryRepository', () => {
  it('queries and maps departments and sites with the existing ordering contract', async () => {
    const departmentFindMany = vi.fn().mockResolvedValue([
      { id: 'department-business', name: '业务部', enabled: true, ignored: 'value' }
    ]);
    const siteFindMany = vi.fn().mockResolvedValue([
      { id: 'site-shenzhen', name: '深圳站', enabled: true, sortOrder: 2, ignored: 'value' }
    ]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        PrismaSystemDirectoryRepository,
        {
          provide: PrismaService,
          useValue: {
            department: { findMany: departmentFindMany },
            site: { findMany: siteFindMany }
          }
        }
      ]
    }).compile();
    const repository = moduleRef.get(PrismaSystemDirectoryRepository);

    await expect(repository.getDepartments(admin)).resolves.toEqual([
      { id: 'department-business', name: '业务部', enabled: true }
    ]);
    await expect(repository.getSites(admin)).resolves.toEqual([
      { id: 'site-shenzhen', name: '深圳站', enabled: true, sortOrder: 2 }
    ]);
    expect(departmentFindMany).toHaveBeenCalledWith({
      orderBy: [{ enabled: 'desc' }, { name: 'asc' }]
    });
    expect(siteFindMany).toHaveBeenCalledWith({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
  });

  it('keeps the repository-level admin restriction before querying Prisma', async () => {
    const departmentFindMany = vi.fn();
    const siteFindMany = vi.fn();
    const repository = new PrismaSystemDirectoryRepository({
      department: { findMany: departmentFindMany },
      site: { findMany: siteFindMany }
    } as unknown as PrismaService);

    await expect(repository.getDepartments(operator)).rejects.toThrow('只有管理员可以查看部门');
    await expect(repository.getSites(operator)).rejects.toThrow('只有管理员可以查看站点');
    expect(departmentFindMany).not.toHaveBeenCalled();
    expect(siteFindMany).not.toHaveBeenCalled();
  });

  it('keeps legacy PrismaRepository methods as compatibility forwarding', async () => {
    const departmentFindMany = vi.fn().mockResolvedValue([
      { id: 'department-business', name: '业务部', enabled: true }
    ]);
    const siteFindMany = vi.fn().mockResolvedValue([
      { id: 'site-shenzhen', name: '深圳站', enabled: true, sortOrder: 2 }
    ]);
    const facade = new PrismaRepository({
      department: { findMany: departmentFindMany },
      site: { findMany: siteFindMany }
    } as unknown as PrismaService);

    await expect(facade.getDepartments(admin)).resolves.toEqual([
      { id: 'department-business', name: '业务部', enabled: true }
    ]);
    await expect(facade.getSites(admin)).resolves.toEqual([
      { id: 'site-shenzhen', name: '深圳站', enabled: true, sortOrder: 2 }
    ]);
    expect(departmentFindMany).toHaveBeenCalledOnce();
    expect(siteFindMany).toHaveBeenCalledOnce();
  });
});
