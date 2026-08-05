import { Inject, Injectable } from '@nestjs/common';
import type { CarrierTaskSummary } from '@siyuan/shared';
import { PrismaRepository } from '../../prisma.repository.js';
import { PrismaService } from '../../prisma.service.js';
import { isSalesScopedRole, type Principal } from '../../rbac.js';
import { mapCarrierTask } from '../tracking.shared.js';

export const TRACKING_QUERY_REPOSITORY = 'TRACKING_QUERY_REPOSITORY';

export interface TrackingQueryRepository {
  getCarrierTasks(principal: Principal): Promise<CarrierTaskSummary[]>;
}

@Injectable()
export class PrismaTrackingQueryRepository implements TrackingQueryRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PrismaRepository) private readonly permissions: Pick<PrismaRepository, 'hasPermission'>
  ) {}

  async getCarrierTasks(principal: Principal): Promise<CarrierTaskSummary[]> {
    const canViewErrors = await this.permissions.hasPermission(principal.role, 'tracking:carrier-task:error-view');
    const operatorCustomerScope = this.operatorCustomerScope(principal);
    const tasks = await this.prisma.carrierTask.findMany({
      where: {
        shipment: {
          deletedAt: null,
          ...(principal.role === 'CUSTOMER' ? { customerId: principal.customerId } : {}),
          ...(operatorCustomerScope ? { customer: { salesperson: { in: operatorCustomerScope } } } : {})
        }
      },
      include: { shipment: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return tasks.map((task) => {
      const mapped = mapCarrierTask(task);
      return canViewErrors ? mapped : { ...mapped, lastError: undefined };
    });
  }

  private operatorCustomerScope(principal: Principal) {
    if (principal.role === 'UG_MARKET' || !isSalesScopedRole(principal.role)) return undefined;
    return Array.from(new Set([principal.username, principal.name, principal.nickname].filter((value): value is string => Boolean(value))));
  }
}
