import { Inject, Injectable } from '@nestjs/common';
import type { PermissionKey, Principal } from '../rbac.js';
import { PrismaRepository } from '../prisma.repository.js';

export interface AuthSessionRepository {
  hydratePrincipalDepartmentScope(principal: Principal): Promise<PermissionKey[]>;
  recordPermissionDenied?(
    principal: Principal,
    input: { permissions: PermissionKey[]; method?: string; path?: string }
  ): Promise<unknown>;
}

@Injectable()
export class AuthSessionService {
  constructor(@Inject(PrismaRepository) private readonly repository: AuthSessionRepository) {}

  hydrateCurrentSession(principal: Principal): Promise<PermissionKey[]> {
    return this.repository.hydratePrincipalDepartmentScope(principal);
  }

  recordPermissionDenied(
    principal: Principal,
    input: { permissions: PermissionKey[]; method?: string; path?: string }
  ): Promise<unknown> {
    return this.repository.recordPermissionDenied?.(principal, input) ?? Promise.resolve();
  }
}
