import { Injectable } from '@nestjs/common';
import type { ProblemTicketSummary } from '@siyuan/shared/problem-ticket';
import { PrismaService } from '../../prisma.service.js';
import type { Principal } from '../../rbac.js';
import type { ProblemTicketQueryRepository } from './problem-ticket-query.repository.js';

@Injectable()
export class PrismaProblemTicketQueryRepository implements ProblemTicketQueryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(principal: Principal): Promise<ProblemTicketSummary[]> {
    const rows = await this.prisma.problemTicket.findMany({
      where:
        principal.role === 'CUSTOMER'
          ? { customerVisible: true, shipment: { customerId: principal.customerId } }
          : undefined,
      include: {
        shipment: { include: { customer: true } },
        replies: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipmentId,
      systemOrderNo: row.shipment.systemOrderNo,
      customerName: `${row.shipment.customer.code}-${row.shipment.customer.name}`,
      reason: row.reason,
      status: row.status,
      customerVisible: row.customerVisible,
      createdAt: row.createdAt.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      closedBy: row.closedBy ?? undefined,
      closeReason: row.closeReason ?? undefined,
      assistanceReason: row.assistanceReason ?? undefined,
      assistanceRequestedAt: row.assistanceAt?.toISOString(),
      tagSnapshot: (row.tagSnapshot as string[] | null) ?? undefined,
      replies: row.replies.map((reply) => ({
        id: reply.id,
        author: reply.author,
        message: reply.message,
        createdAt: reply.createdAt.toISOString()
      }))
    }));
  }
}
