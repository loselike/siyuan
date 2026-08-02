import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  PROBLEM_TICKET_QUERY_REPOSITORY,
  type ProblemTicketQueryRepository
} from './problem-ticket-query.repository.js';

@Injectable()
export class ProblemTicketQueryService {
  constructor(
    @Inject(PROBLEM_TICKET_QUERY_REPOSITORY)
    private readonly repository: ProblemTicketQueryRepository
  ) {}

  list(principal: Principal) {
    return this.repository.list(principal);
  }
}
