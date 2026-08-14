import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_TALLY_LABEL_REPOSITORY,
  type WarehouseTallyLabelRepository
} from './warehouse-tally-label.repository.js';

type WarehouseTallyLabelScanInput = Parameters<
  WarehouseTallyLabelRepository['applyWarehouseTallyTaskLabel']
>[1];

@Injectable()
export class WarehouseTallyLabelService {
  constructor(
    @Inject(WAREHOUSE_TALLY_LABEL_REPOSITORY)
    private readonly repository: WarehouseTallyLabelRepository
  ) {}

  generate(principal: Principal, id: string) {
    return this.repository.generateWarehouseTallyTaskLabel(principal, id);
  }

  print(principal: Principal, id: string) {
    return this.repository.printWarehouseTallyTaskLabel(principal, id);
  }

  download(principal: Principal, id: string) {
    return this.repository.downloadWarehouseTallyTaskLabel(principal, id);
  }

  apply(principal: Principal, input: WarehouseTallyLabelScanInput) {
    return this.repository.applyWarehouseTallyTaskLabel(principal, input);
  }
}
