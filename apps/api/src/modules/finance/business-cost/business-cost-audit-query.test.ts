import { describe, expect, it, vi } from 'vitest';
import type { Principal } from '../../rbac.js';
import type { PrismaService } from '../../prisma.service.js';
import { PrismaRepository } from '../../prisma.repository.js';
import { buildBusinessCostAuditCandidateWhere } from './business-cost-audit-query.js';

const admin: Principal = { id: 'admin', username: 'admin', role: 'ADMIN' };
const salesOperator: Principal = {
  id: 'operator',
  username: 'operator',
  name: '业务员',
  nickname: '小思',
  role: 'OPERATOR',
  dataScope: 'SALES_OWN'
};

describe('business cost audit database candidate query', () => {
  it('pushes the reviewed, active and sales-scope baseline into Prisma', () => {
    expect(buildBusinessCostAuditCandidateWhere({}, ['operator', '业务员'])).toEqual({
      AND: [
        { type: 'BUSINESS_COST', miscFeeRecordId: null },
        {
          shipment: {
            is: {
              businessReviewedAt: { not: null },
              OR: [
                { entryBy: { in: ['operator', '业务员'] } },
                { customer: { salesperson: { in: ['operator', '业务员'] } } }
              ]
            }
          }
        },
        { voided: false }
      ]
    });
  });

  it('translates safe text, status and Beijing date filters without changing their bounds', () => {
    const where = buildBusinessCostAuditCandidateWhere({
      outboundOrderNo: 'OUT-001',
      customerCode: '9409',
      transferNo: 'TR-001',
      salesperson: 'operator',
      feeName: '运费',
      createdBy: 'creator',
      reviewedBy: 'reviewer',
      paymentNo: 'PAY-001',
      remark: '备注',
      reconciliationStatus: 'CONFIRMED',
      createdFrom: '2026-08-01',
      createdTo: '2026-08-02',
      reviewedFrom: '2026-08-03',
      reviewedTo: '2026-08-04'
    });

    expect(where).toMatchObject({
      AND: expect.arrayContaining([
        { reconciliationStatus: 'CONFIRMED' },
        { name: { contains: '运费', mode: 'insensitive' } },
        { createdBy: { contains: 'creator', mode: 'insensitive' } },
        { reviewedBy: { contains: 'reviewer', mode: 'insensitive' } },
        { paymentNo: { contains: 'PAY-001', mode: 'insensitive' } },
        { remark: { contains: '备注', mode: 'insensitive' } },
        {
          createdAt: {
            gte: new Date('2026-07-31T16:00:00.000Z'),
            lt: new Date('2026-08-02T16:00:00.000Z')
          }
        },
        {
          reviewedAt: {
            not: null,
            gte: new Date('2026-08-02T16:00:00.000Z'),
            lt: new Date('2026-08-04T16:00:00.000Z')
          }
        }
      ])
    });
  });

  it('leaves concatenated customer-name searches to the legacy final predicate', () => {
    const where = buildBusinessCostAuditCandidateWhere({ customer: '9409-客户一', customerName: '9409-客户一' });
    expect(JSON.stringify(where)).not.toContain('9409-客户一');
  });

  it('preserves the legacy invalid reviewed-date behavior by requiring a non-null value only', () => {
    expect(buildBusinessCostAuditCandidateWhere({ reviewedFrom: 'not-a-date' })).toMatchObject({
      AND: expect.arrayContaining([{ reviewedAt: { not: null } }])
    });
  });

  it('keeps the legacy response builder as the final result authority', async () => {
    const shipmentFinanceItem = {
      findMany: vi.fn().mockResolvedValue([
        businessCostRow('cost-visible', 'OUT-001'),
        businessCostRow('cost-extra-candidate', 'OUT-002')
      ])
    };
    const repository = new PrismaRepository({
      shipmentFinanceItem,
      auditLog: { findMany: vi.fn().mockResolvedValue([]) }
    } as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockResolvedValue(true);

    const response = await repository.getBusinessCostAudits(admin, { outboundOrderNo: 'OUT-001' });

    expect(response.rows.map((row) => row.id)).toEqual(['cost-visible']);
    expect(response.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 1 });
    expect(shipmentFinanceItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          {
            shipment: {
              is: {
                OR: [
                  { customerOrderNo: { contains: 'OUT-001', mode: 'insensitive' } },
                  { systemOrderNo: { contains: 'OUT-001', mode: 'insensitive' } }
                ]
              }
            }
          }
        ])
      })
    }));
  });

  it('uses the same legacy sales ownership scope before loading finance relations', async () => {
    const shipmentFinanceItem = { findMany: vi.fn().mockResolvedValue([]) };
    const repository = new PrismaRepository({ shipmentFinanceItem } as unknown as PrismaService);
    vi.spyOn(repository, 'hasPermission').mockImplementation(async (_role, permission) => (
      permission !== 'finance:business-cost:view-all'
    ));

    await repository.getBusinessCostAudits(salesOperator);

    expect(shipmentFinanceItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: expect.arrayContaining([{
          shipment: {
            is: {
              businessReviewedAt: { not: null },
              OR: [
                { entryBy: { in: ['operator', '业务员', '小思'] } },
                { customer: { salesperson: { in: ['operator', '业务员', '小思'] } } }
              ]
            }
          }
        }])
      })
    }));
  });
});

function businessCostRow(id: string, customerOrderNo: string) {
  const createdAt = new Date('2026-08-01T01:00:00.000Z');
  return {
    id,
    shipmentId: `shipment-${id}`,
    type: 'BUSINESS_COST',
    name: '业务成本运费',
    amount: 100,
    currency: 'RMB',
    reconciliationStatus: 'PENDING',
    createdAt,
    reviewedAt: null,
    createdBy: 'operator',
    reviewedBy: null,
    paymentNo: null,
    remark: null,
    locked: false,
    voided: false,
    miscFeeRecordId: null,
    shipment: {
      id: `shipment-${id}`,
      customerOrderNo,
      systemOrderNo: `SY-${id}`,
      transferNo: null,
      entryBy: 'operator',
      businessReviewedAt: createdAt,
      outboundAt: createdAt,
      customer: { code: '9409', name: '客户一', salesperson: 'operator' },
      agent: null,
      receivableFees: [],
      financeItems: []
    }
  };
}
