import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import {
  WAREHOUSE_PACKAGE_LIFECYCLE_REPOSITORY,
  type WarehousePackageLifecycleRepository
} from './warehouse-package-lifecycle.repository.js';

type WarehousePackageCreateInput = Parameters<WarehousePackageLifecycleRepository['createWarehousePackage']>[1];
type WarehouseManualReceiptCreateInput = Parameters<WarehousePackageLifecycleRepository['createWarehouseManualReceipt']>[1];
type WarehouseSameSpecReplenishInput = Parameters<WarehousePackageLifecycleRepository['replenishWarehouseSameSpec']>[2];
type WarehousePackageSplitInput = Parameters<WarehousePackageLifecycleRepository['splitWarehousePackage']>[2];
type WarehousePackageUpdateInput = Parameters<WarehousePackageLifecycleRepository['updateWarehousePackage']>[2];
type WarehousePackageRemarkInput = Parameters<WarehousePackageLifecycleRepository['updateWarehousePackageRemark']>[2];
type WarehousePackageExceptionInput = Parameters<WarehousePackageLifecycleRepository['updateWarehousePackageException']>[2];

@Injectable()
export class WarehousePackageLifecycleService {
  constructor(
    @Inject(WAREHOUSE_PACKAGE_LIFECYCLE_REPOSITORY)
    private readonly repository: WarehousePackageLifecycleRepository
  ) {}

  async create(principal: Principal, input: WarehousePackageCreateInput) {
    await this.repository.assertWarehouseManualReceiptCustomer(principal, input.customerCode);
    return this.repository.createWarehousePackage(principal, input);
  }

  async createManualReceipt(principal: Principal, input: WarehouseManualReceiptCreateInput) {
    await this.repository.assertWarehouseManualReceiptCustomer(principal, input.customerCode);
    return this.repository.createWarehouseManualReceipt(principal, input);
  }

  replenishSameSpec(principal: Principal, id: string, input: WarehouseSameSpecReplenishInput) {
    return this.repository.replenishWarehouseSameSpec(principal, id, input);
  }

  split(principal: Principal, id: string, input: WarehousePackageSplitInput) {
    return this.repository.splitWarehousePackage(principal, id, input);
  }

  update(principal: Principal, id: string, input: WarehousePackageUpdateInput) {
    return this.repository.updateWarehousePackage(principal, id, input);
  }

  updateRemark(principal: Principal, id: string, input: WarehousePackageRemarkInput) {
    return this.repository.updateWarehousePackageRemark(principal, id, input);
  }

  updateException(principal: Principal, id: string, input: WarehousePackageExceptionInput) {
    return this.repository.updateWarehousePackageException(principal, id, input);
  }
}
