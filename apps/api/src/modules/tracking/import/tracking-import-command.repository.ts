import type { PrismaRepository } from '../../prisma.repository.js';

export const TRACKING_IMPORT_COMMAND_REPOSITORY = Symbol('TRACKING_IMPORT_COMMAND_REPOSITORY');

export type TrackingImportCommandInput = Parameters<PrismaRepository['importTrackingEvents']>[1];

export type TrackingImportCommandRepository = Pick<
  PrismaRepository,
  'hasPermission' | 'recordPermissionDenied' | 'importTrackingEvents'
>;
