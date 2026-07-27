import { describe, expect, it } from 'vitest';
import type { AuditLogSummary } from '@siyuan/shared';
import { buildCustomerServiceAuditIndex } from './CustomerServicePage';

function auditLog(
  id: string,
  action: string,
  target: string,
  createdAt: string,
  after?: unknown
): AuditLogSummary {
  return {
    id,
    actorId: 'user-1',
    actorUsername: 'admin',
    action,
    actionLabel: action,
    module: 'customer-service',
    moduleLabel: '客服管理',
    target,
    result: 'SUCCESS',
    resultLabel: '成功',
    after,
    createdAt
  };
}

describe('customer service audit index', () => {
  it('keeps the same latest review, status, tracking and problem records regardless of input order', () => {
    const logs = [
      auditLog('review-new', 'customer_service.business_data.reversed', 'shipment-1', '2026-07-27T03:00:00.000Z'),
      auditLog('status-old', 'customer_service.status.update', 'shipment-1', '2026-07-27T01:00:00.000Z', { statusTo: 'DEPARTED' }),
      auditLog('tracking-new', 'shipment.operational.update', 'shipment-1', '2026-07-27T04:00:00.000Z', { trackingWebsite: 'https://new.example' }),
      auditLog('problem-old', 'customer_service.issue.attach', 'ticket-1', '2026-07-27T01:00:00.000Z'),
      auditLog('review-old', 'customer_service.business_data.approved', 'shipment-1', '2026-07-27T01:00:00.000Z'),
      auditLog('update-stale', 'customer_service.agent_data.updated', 'shipment-1', '2026-07-27T01:30:00.000Z', { snapshot: { weightKg: 10 } }),
      auditLog('status-new', 'customer_service.status.update', 'shipment-1', '2026-07-27T05:00:00.000Z', { statusTo: 'DEPARTED' }),
      auditLog('update-current', 'customer_service.agent_data.updated', 'shipment-1', '2026-07-27T03:30:00.000Z', { snapshot: { weightKg: 20 } }),
      auditLog('tracking-old', 'shipment.operational.update', 'shipment-1', '2026-07-27T02:00:00.000Z', { trackingWebsite: 'https://old.example' }),
      auditLog('problem-new', 'customer_service.issue.close', 'ticket-1', '2026-07-27T06:00:00.000Z')
    ];

    const index = buildCustomerServiceAuditIndex(logs, new Map([['shipment-1', '2026-07-27T02:00:00.000Z']]));

    expect(index.get('shipment-1\u0000review:business')?.id).toBe('review-new');
    expect(index.get('shipment-1\u0000data:agent')?.id).toBe('update-current');
    expect(index.get('shipment-1\u0000status:DEPARTED')?.id).toBe('status-new');
    expect(index.get('shipment-1\u0000tracking')?.id).toBe('tracking-new');
    expect(index.get('ticket-1\u0000problem')?.id).toBe('problem-new');
    expect(index.get('ticket-1\u0000action:customer_service.issue.attach')?.id).toBe('problem-old');
  });
});
