import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_RENT_REPOSITORY,
  type WarehouseRentRepository
} from './warehouse-rent.repository.js';

type WarehouseRentDetailQuery = Parameters<WarehouseRentRepository['getWarehouseRentDetails']>[1];
type WarehouseRentRuleInput = Parameters<WarehouseRentRepository['createWarehouseRentRule']>[1];
type WarehouseRentRuleEnabledInput = Parameters<WarehouseRentRepository['updateWarehouseRentRuleEnabled']>[2];

@Injectable()
export class WarehouseRentService {
  constructor(
    @Inject(WAREHOUSE_RENT_REPOSITORY)
    private readonly repository: WarehouseRentRepository
  ) {}

  details(principal: Principal, query: WarehouseRentDetailQuery) {
    return this.repository.getWarehouseRentDetails(principal, query);
  }

  exportDetails(principal: Principal, query: WarehouseRentDetailQuery) {
    return this.repository.exportWarehouseRentDetails(principal, query);
  }

  rules(principal: Principal) {
    return this.repository.getWarehouseRentRules(principal);
  }

  createRule(principal: Principal, input: WarehouseRentRuleInput) {
    return this.repository.createWarehouseRentRule(principal, input);
  }

  updateRule(principal: Principal, id: string, input: WarehouseRentRuleInput) {
    return this.repository.updateWarehouseRentRule(principal, id, input);
  }

  deleteRule(principal: Principal, id: string) {
    return this.repository.deleteWarehouseRentRule(principal, id);
  }

  updateRuleEnabled(principal: Principal, id: string, input: WarehouseRentRuleEnabledInput) {
    return this.repository.updateWarehouseRentRuleEnabled(principal, id, input);
  }
}
