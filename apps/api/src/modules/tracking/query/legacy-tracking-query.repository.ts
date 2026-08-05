import { Inject, Injectable } from '@nestjs/common';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';
import type { TrackingQueryRepository } from './tracking-query.repository.js';

@Injectable()
export class LegacyTrackingQueryRepository implements TrackingQueryRepository {
  constructor(
    @Inject(PrismaRepository)
    private readonly repository: TrackingQueryRepository
  ) {}

  getCarrierTasks(principal: Principal) {
    return this.repository.getCarrierTasks(principal);
  }
}
