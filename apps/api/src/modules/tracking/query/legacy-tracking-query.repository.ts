import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { toExternalTrackingShipmentSummary, type ExternalTrackingShipmentSummary, type Shipment } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import type { Principal } from '../../rbac.js';
import type { TrackingQueryRepository } from './tracking-query.repository.js';

interface LegacyTrackingQueries {
  hasPermission(role: Principal['role'], permission: 'tracking:carrier-task:view' | 'tracking:external:view' | 'tracking:external:detail'): Promise<boolean>;
  getCarrierTasks(principal: Principal): ReturnType<TrackingQueryRepository['getCarrierTasks']>;
  getTrackingShipments(principal: Principal): Promise<Shipment[]>;
  getTrackingShipmentDetail(principal: Principal, shipmentId: string): Promise<Shipment>;
}

@Injectable()
export class LegacyTrackingQueryRepository implements TrackingQueryRepository {
  constructor(
    @Inject(PrismaRepository)
    private readonly repository: LegacyTrackingQueries
  ) {}

  async getCarrierTasks(principal: Principal) {
    if (!await this.repository.hasPermission(principal.role, 'tracking:carrier-task:view')) {
      throw new ForbiddenException('没有承运商任务查看权限');
    }
    const [tasks, shipments] = await Promise.all([
      this.repository.getCarrierTasks(principal),
      this.repository.getTrackingShipments(principal)
    ]);
    const visibleShipmentIds = new Set(shipments.map((shipment) => shipment.id));
    return tasks.filter((task) => visibleShipmentIds.has(task.shipmentId));
  }

  async getExternalShipments(principal: Principal): Promise<ExternalTrackingShipmentSummary[]> {
    if (!await this.repository.hasPermission(principal.role, 'tracking:external:view')) {
      throw new ForbiddenException('没有外部物流轨迹查看权限');
    }
    return (await this.repository.getTrackingShipments(principal)).map(toExternalTrackingShipmentSummary);
  }

  async getExternalShipmentDetail(principal: Principal, shipmentId: string): Promise<Shipment> {
    if (!await this.repository.hasPermission(principal.role, 'tracking:external:detail')) {
      throw new ForbiddenException('没有外部物流轨迹详情权限');
    }
    return this.repository.getTrackingShipmentDetail(principal, shipmentId);
  }
}
