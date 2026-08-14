import type { PrismaRepository } from '../../prisma.repository.js';

export const TRACKING_MANUAL_EVENT_COMMAND_REPOSITORY = Symbol('TRACKING_MANUAL_EVENT_COMMAND_REPOSITORY');

export type TrackingManualEventInput = Parameters<PrismaRepository['addTrackingEvent']>[2];

export type TrackingManualEventCommandRepository = Pick<PrismaRepository, 'addTrackingEvent'>;
