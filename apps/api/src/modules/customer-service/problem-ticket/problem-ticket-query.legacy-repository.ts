import { Inject, Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';
import type { ProblemTicketQueryRepository } from './problem-ticket-query.repository.js';

/** Compatibility adapter for the non-Prisma test/runtime repository. */
@Injectable()
export class LegacyProblemTicketQueryRepository implements ProblemTicketQueryRepository {
  constructor(@Inject(PrismaRepository) private readonly repository: PrismaRepository) {}

  list(principal: Principal) {
    return this.repository.getProblemTickets(principal);
  }
}
