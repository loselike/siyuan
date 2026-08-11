import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { PermissionKey, Principal } from '../../rbac.js';
import {
  SHIPMENT_LABEL_LIFECYCLE_AUTHORIZER,
  SHIPMENT_LABEL_LIFECYCLE_REPOSITORY,
  type ShipmentLabelLifecycleAuthorizer,
  type ShipmentLabelLifecycleRepository
} from './shipment-label-lifecycle.repository.js';
import {
  ShipmentLabelFileStorage,
  type ShipmentLabelUploadFile
} from './shipment-label-file.storage.js';

@Injectable()
export class ShipmentLabelLifecycleService {
  constructor(
    @Inject(SHIPMENT_LABEL_LIFECYCLE_REPOSITORY)
    private readonly repository: ShipmentLabelLifecycleRepository,
    @Inject(SHIPMENT_LABEL_LIFECYCLE_AUTHORIZER)
    private readonly authorizer: ShipmentLabelLifecycleAuthorizer,
    @Inject(ShipmentLabelFileStorage)
    private readonly storage: ShipmentLabelFileStorage
  ) {}

  async labels(principal: Principal, shipmentId: string) {
    this.assertStaff(principal, '客户不能查看内部面单');
    await this.ensureAnyPermission(principal, [
      'warehouse:dispatch-pending:label-view',
      'customer-service:transfer:label-view'
    ]);
    return this.repository.getShipmentLabels(principal, shipmentId);
  }

  create(principal: Principal, shipmentId: string) {
    this.assertStaff(principal, '客户不能申请面单');
    return this.repository.createShipmentLabel(principal, shipmentId);
  }

  async upload(
    principal: Principal,
    shipmentId: string,
    file: ShipmentLabelUploadFile | undefined,
    transferNo?: string
  ) {
    this.assertStaff(principal, '客户不能上传面单');
    await this.ensureAnyPermission(principal, [
      'business:order-entry:label-upload',
      'customer-service:transfer:label-upload',
      'customer-service:waiting-departure:label-upload'
    ]);
    const stored = await this.storage.store(file);
    return this.repository.uploadShipmentLabel(principal, shipmentId, { ...stored, transferNo });
  }

  async download(principal: Principal, shipmentId: string, labelId: string) {
    this.assertStaff(principal, '客户不能下载内部面单');
    await this.ensureAnyPermission(principal, [
      'warehouse:dispatch-pending:label-view',
      'customer-service:transfer:label-view'
    ]);
    return this.repository.downloadShipmentLabel(principal, shipmentId, labelId);
  }

  void(principal: Principal, shipmentId: string, labelId: string) {
    this.assertStaff(principal, '客户不能作废面单');
    return this.repository.voidShipmentLabel(principal, shipmentId, labelId);
  }

  private assertStaff(principal: Principal, message: string) {
    if (principal.role === 'CUSTOMER') throw new ForbiddenException(message);
  }

  private async ensureAnyPermission(principal: Principal, permissions: PermissionKey[]) {
    const allowed = await Promise.all(
      permissions.map((permission) => this.authorizer.hasPermission(principal.role, permission))
    );
    if (allowed.some(Boolean)) return;
    await this.authorizer.recordPermissionDenied(principal, {
      permissions,
      method: 'SERVER',
      path: 'customer-service granular action'
    }).catch(() => undefined);
    throw new ForbiddenException('没有访问权限');
  }
}
