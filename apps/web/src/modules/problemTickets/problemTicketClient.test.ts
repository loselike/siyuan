import { describe, expect, it, vi } from 'vitest';
import { loadProblemTickets } from './problemTicketClient';

describe('problem ticket client facade', () => {
  it('loads the existing ticket response without reshaping it', async () => {
    const tickets = [{
      id: 'ticket-1',
      shipmentId: 'shipment-1',
      systemOrderNo: 'SY001',
      customerName: 'C001-客户一',
      reason: '轨迹异常',
      status: 'OPEN',
      customerVisible: true,
      createdAt: '2026-08-02T00:00:00.000Z',
      replies: []
    }];
    const problemTickets = vi.fn().mockResolvedValue(tickets);

    await expect(loadProblemTickets({ problemTickets })).resolves.toBe(tickets);
    expect(problemTickets).toHaveBeenCalledOnce();
  });
});
