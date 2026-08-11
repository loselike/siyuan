import type { ProblemTicketCreateInput, ProblemTicketSummary } from '@siyuan/shared/problem-ticket';
import type { PermissionKey, Principal, RoleKey } from '../../rbac.js';

export const PROBLEM_TICKET_COMMAND_REPOSITORY = Symbol('PROBLEM_TICKET_COMMAND_REPOSITORY');

export interface ProblemTicketCommandRepository {
  hasPermission(role: RoleKey, permission: PermissionKey): Promise<boolean>;
  recordPermissionDenied(
    principal: Principal,
    input: { permissions: PermissionKey[]; method: string; path: string }
  ): Promise<unknown>;
  assertCustomerServiceProblemCreationAllowed(principal: Principal, shipmentId: string): Promise<void>;
  createProblemTicket(principal: Principal, shipmentId: string, input: ProblemTicketCreateInput): Promise<ProblemTicketSummary>;
  replyProblemTicket(principal: Principal, ticketId: string, message: string): Promise<ProblemTicketSummary>;
  closeProblemTicket(principal: Principal, ticketId: string, reason?: string): Promise<ProblemTicketSummary>;
  assistProblemTicket(principal: Principal, ticketId: string, reason: string): Promise<ProblemTicketSummary>;
}
