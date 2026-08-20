import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  toExternalTrackingShipmentSummary,
  type CarrierTaskSummary,
  type ExternalTrackingShipmentSummary,
  type Shipment
} from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';
import { mapCarrierTask } from '../tracking.shared.js';

export const TRACKING_QUERY_REPOSITORY = 'TRACKING_QUERY_REPOSITORY';

export interface TrackingQueryRepository {
  getCarrierTasks(principal: Principal): Promise<CarrierTaskSummary[]>;
  getExternalShipments(principal: Principal): Promise<ExternalTrackingShipmentSummary[]>;
  getExternalShipmentDetail(principal: Principal, shipmentId: string): Promise<Shipment>;
}

@Injectable()
export class PrismaTrackingQueryRepository implements TrackingQueryRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PrismaRepository) private readonly permissions: Pick<PrismaRepository, 'hasPermission' | 'getTrackingShipments' | 'getTrackingShipmentDetail'>
  ) {}

  async getCarrierTasks(principal: Principal): Promise<CarrierTaskSummary[]> {
    if (!await this.permissions.hasPermission(principal.role, 'tracking:carrier-task:view')) {
      throw new ForbiddenException('没有承运商任务查看权限');
    }
    const visibleShipmentIds = (await this.permissions.getTrackingShipments(principal)).map((shipment) => shipment.id);
    const tasks = await this.prisma.carrierTask.findMany({
      where: {
        shipmentId: { in: visibleShipmentIds }
      },
      include: { shipment: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return tasks.map((task) => {
      return mapCarrierTask(task);
    });
  }

  async getExternalShipments(principal: Principal): Promise<ExternalTrackingShipmentSummary[]> {
    if (!await this.permissions.hasPermission(principal.role, 'tracking:external:view')) {
      throw new ForbiddenException('没有外部物流轨迹查看权限');
    }
    return (await this.permissions.getTrackingShipments(principal)).map(toExternalTrackingShipmentSummary);
  }

  async getExternalShipmentDetail(principal: Principal, shipmentId: string): Promise<Shipment> {
    if (!await this.permissions.hasPermission(principal.role, 'tracking:external:detail')) {
      throw new ForbiddenException('没有外部物流轨迹详情权限');
    }
    return this.permissions.getTrackingShipmentDetail(principal, shipmentId);
  }
}
