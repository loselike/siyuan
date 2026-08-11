import type { PrismaRepository } from '../../prisma.repository.js';

export const CARRIER_TASK_COMMAND_REPOSITORY = Symbol('CARRIER_TASK_COMMAND_REPOSITORY');

export type CarrierTaskCommandRepository = Pick<
  PrismaRepository,
  'runCarrierTask' | 'retryCarrierTask'
>;
