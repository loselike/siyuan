import type { ProblemTicketSummary } from '@siyuan/shared/problem-ticket';
import { describe, expect, it } from 'vitest';
import type { Principal } from '../../rbac.js';
import { LegacyProblemTicketQueryRepository } from './problem-ticket-query.legacy-repository.js';
import { PrismaProblemTicketQueryRepository } from './problem-ticket-query.prisma-repository.js';
import type { ProblemTicketQueryRepository } from './problem-ticket-query.repository.js';

const admin: Principal = { id: 'admin', username: 'admin', role: 'ADMIN' };
const customer: Principal = { id: 'customer', username: 'customer', role: 'CUSTOMER', customerId: 'customer-1' };

const summaries: ProblemTicketSummary[] = [
  {
    id: 'internal', shipmentId: 'shipment-1', systemOrderNo: 'SY001', customerName: 'C001-客户一',
    reason: '内部问题', status: 'OPEN', customerVisible: false, createdAt: '2026-08-02T02:00:00.000Z', replies: []
  },
  {
    id: 'visible', shipmentId: 'shipment-1', systemOrderNo: 'SY001', customerName: 'C001-客户一',
    reason: '客户可见问题', status: 'OPEN', customerVisible: true, createdAt: '2026-08-02T01:00:00.000Z',
    replies: [{ id: 'reply-1', author: 'service', message: '处理中', createdAt: '2026-08-02T01:30:00.000Z' }]
  }
];

function createLegacyRepository(): ProblemTicketQueryRepository {
  return new LegacyProblemTicketQueryRepository({
    getProblemTickets: async (principal: Principal) => principal.role === 'CUSTOMER'
      ? summaries.filter((ticket) => ticket.customerVisible && principal.customerId === 'customer-1')
      : summaries
  } as never);
}

function createPrismaRepository(): ProblemTicketQueryRepository {
  const rows = summaries.map((ticket) => ({
    ...ticket,
    createdAt: new Date(ticket.createdAt),
    closedAt: null,
    closedBy: null,
    closeReason: null,
    assistanceReason: null,
    assistanceAt: null,
    tagSnapshot: null,
    shipment: { customerId: 'customer-1', systemOrderNo: ticket.systemOrderNo, customer: { code: 'C001', name: '客户一' } },
    replies: ticket.replies.map((reply) => ({ ...reply, createdAt: new Date(reply.createdAt) }))
  }));
  return new PrismaProblemTicketQueryRepository({
    problemTicket: {
      findMany: async ({ where }: { where?: { customerVisible?: boolean; shipment?: { customerId?: string } } }) => rows.filter((row) => (
        !where || (row.customerVisible === where.customerVisible && row.shipment.customerId === where.shipment?.customerId)
      ))
    }
  } as never);
}

function queryContract(name: string, createRepository: () => ProblemTicketQueryRepository) {
  describe(name, () => {
    it('returns complete internal summaries without changing order or replies', async () => {
      const result = await createRepository().list(admin);
      expect(result.map((ticket) => ticket.id)).toEqual(['internal', 'visible']);
      expect(result[1]).toMatchObject({
        systemOrderNo: 'SY001',
        customerName: 'C001-客户一',
        replies: [{ author: 'service', message: '处理中' }]
      });
    });

    it('keeps customer scope limited to visible tickets of that customer', async () => {
      const result = await createRepository().list(customer);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'visible', customerVisible: true });
    });
  });
}

queryContract('LegacyProblemTicketQueryRepository contract', createLegacyRepository);
queryContract('PrismaProblemTicketQueryRepository contract', createPrismaRepository);
