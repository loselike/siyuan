import type { ProblemTicketSummary } from '@siyuan/shared/problem-ticket';

export interface ProblemTicketClient {
  problemTickets(): Promise<ProblemTicketSummary[]>;
}

export function loadProblemTickets(client: ProblemTicketClient) {
  return client.problemTickets();
}
