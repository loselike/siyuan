import type { PrismaRepository } from '../../prisma.repository.js';

export const PROBLEM_TICKET_TAG_REPOSITORY = Symbol('PROBLEM_TICKET_TAG_REPOSITORY');

export type ProblemTicketTagCreateInput = Parameters<PrismaRepository['createProblemTicketCommonTag']>[1];
export type ProblemTicketTagUpdateInput = Parameters<PrismaRepository['updateProblemTicketCommonTag']>[2];

export type ProblemTicketTagRepository = Pick<
  PrismaRepository,
  | 'hasPermission'
  | 'recordPermissionDenied'
  | 'getProblemTicketCommonTags'
  | 'createProblemTicketCommonTag'
  | 'updateProblemTicketCommonTag'
  | 'deleteProblemTicketCommonTag'
>;
