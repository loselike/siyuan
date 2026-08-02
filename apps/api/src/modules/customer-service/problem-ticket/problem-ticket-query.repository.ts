import type { ProblemTicketSummary } from '@siyuan/shared/problem-ticket';
import type { Principal } from '../../rbac.js';

export const PROBLEM_TICKET_QUERY_REPOSITORY = 'PROBLEM_TICKET_QUERY_REPOSITORY';

export interface ProblemTicketQueryRepository {
  list(principal: Principal): Promise<ProblemTicketSummary[]>;
}
