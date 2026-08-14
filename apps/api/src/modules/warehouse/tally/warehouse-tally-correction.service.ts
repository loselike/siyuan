import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_TALLY_CORRECTION_REPOSITORY,
  type WarehouseTallyCorrectionRepository
} from './warehouse-tally-correction.repository.js';

type WarehouseTallyHistoricalAggregateCorrectionInput = Parameters<
  WarehouseTallyCorrectionRepository['correctWarehouseTallyHistoricalAggregate']
>[2];

@Injectable()
export class WarehouseTallyCorrectionService {
  constructor(
    @Inject(WAREHOUSE_TALLY_CORRECTION_REPOSITORY)
    private readonly repository: WarehouseTallyCorrectionRepository
  ) {}

  preview(principal: Principal, id: string) {
    return this.repository.getWarehouseTallyHistoricalAggregateCorrectionPreview(principal, id);
  }

  correct(
    principal: Principal,
    id: string,
    input: WarehouseTallyHistoricalAggregateCorrectionInput
  ) {
    return this.repository.correctWarehouseTallyHistoricalAggregate(principal, id, input);
  }
}
