import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey, Principal } from '../../rbac.js';
import {
  PROBLEM_TICKET_TAG_REPOSITORY,
  type ProblemTicketTagCreateInput,
  type ProblemTicketTagRepository,
  type ProblemTicketTagUpdateInput
} from './problem-ticket-tag.repository.js';

export const problemTicketTagReadPermissions: PermissionKey[] = [
  'customer-service:problem:view',
  'customer-service:problem:create',
  'customer-service:pending-routing:problem-create',
  'customer-service:waiting-departure:problem-create',
  'customer-service:departed:problem-create',
  'customer-service:arrived-port:problem-create',
  'customer-service:delivering:problem-create',
  'customer-service:delivering:after-sale-create',
  'customer-service:signed:after-sale-create',
  'operations:line-shipment:problem-create',
  'business:shipment:problem-create'
];

@Injectable()
export class ProblemTicketTagService {
  constructor(
    @Inject(PROBLEM_TICKET_TAG_REPOSITORY)
    private readonly repository: ProblemTicketTagRepository
  ) {}

  async list(principal: Principal) {
    const checks = await Promise.all(
      problemTicketTagReadPermissions.map((permission) => this.repository.hasPermission(principal.role, permission))
    );
    if (!checks.some(Boolean)) {
      await this.repository.recordPermissionDenied(principal, {
        permissions: problemTicketTagReadPermissions,
        method: 'SERVER',
        path: 'customer-service granular action'
      }).catch(() => undefined);
      throw new ForbiddenException('没有访问权限');
    }
    return this.repository.getProblemTicketCommonTags(principal);
  }

  async create(principal: Principal, input: ProblemTicketTagCreateInput) {
    return this.repository.createProblemTicketCommonTag(principal, input);
  }

  async update(principal: Principal, id: string, input: ProblemTicketTagUpdateInput) {
    return this.repository.updateProblemTicketCommonTag(principal, id, input);
  }

  async delete(principal: Principal, id: string) {
    return this.repository.deleteProblemTicketCommonTag(principal, id);
  }
}
