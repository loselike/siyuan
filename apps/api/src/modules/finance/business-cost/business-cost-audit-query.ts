import { Prisma } from '@prisma/client';

interface BusinessCostAuditCandidateQuery {
  outboundOrderNo?: string;
  systemOrderNo?: string;
  customer?: string;
  customerCode?: string;
  customerName?: string;
  transferNo?: string;
  salesperson?: string;
  feeName?: string;
  createdBy?: string;
  reviewedBy?: string;
  paymentNo?: string;
  reconciliationStatus?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  reviewedFrom?: string;
  reviewedTo?: string;
  remark?: string;
}

const BEIJING_DAY_MS = 24 * 60 * 60 * 1000;

function contains(value: string) {
  return { contains: value, mode: Prisma.QueryMode.insensitive };
}

function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  const start = from ? Date.parse(`${from}T00:00:00+08:00`) : Number.NaN;
  const end = to ? Date.parse(`${to}T00:00:00+08:00`) : Number.NaN;
  if (Number.isFinite(start)) filter.gte = new Date(start);
  if (Number.isFinite(end)) filter.lt = new Date(end + BEIJING_DAY_MS);
  return filter;
}

function nullableDateRange(from?: string, to?: string): Prisma.DateTimeNullableFilter | undefined {
  const filter = dateRange(from, to);
  return filter ? { ...filter, not: null } : undefined;
}

/**
 * Builds a database-side candidate set for the legacy business-cost list.
 *
 * The legacy response builder remains the final authority for filtering,
 * sorting, totals and pagination. Every condition here is therefore either an
 * exact translation or a safe superset of its legacy predicate: this function
 * may leave extra rows for the response builder, but must never remove a row
 * that the existing business logic would return.
 */
export function buildBusinessCostAuditCandidateWhere(
  query: BusinessCostAuditCandidateQuery,
  salesScope?: string[]
): Prisma.ShipmentFinanceItemWhereInput {
  const and: Prisma.ShipmentFinanceItemWhereInput[] = [
    { type: 'BUSINESS_COST', miscFeeRecordId: null },
    {
      shipment: {
        is: {
          businessReviewedAt: { not: null },
          ...(salesScope?.length
            ? { OR: [{ entryBy: { in: salesScope } }, { customer: { salesperson: { in: salesScope } } }] }
            : {})
        }
      }
    }
  ];
  const status = query.reconciliationStatus ?? query.status ?? 'ALL';
  and.push(status === 'ALL' ? { voided: false } : { reconciliationStatus: status });

  const outboundOrderNo = query.outboundOrderNo ?? query.systemOrderNo;
  if (outboundOrderNo) {
    and.push({
      shipment: {
        is: {
          OR: [
            { customerOrderNo: contains(outboundOrderNo) },
            { systemOrderNo: contains(outboundOrderNo) }
          ]
        }
      }
    });
  }
  if (query.customerCode) {
    and.push({ shipment: { is: { customer: { code: contains(query.customerCode) } } } });
  }
  if (query.transferNo) {
    and.push({ shipment: { is: { transferNo: contains(query.transferNo) } } });
  }
  if (query.salesperson) {
    and.push({
      shipment: {
        is: {
          OR: [
            { customer: { salesperson: contains(query.salesperson) } },
            { entryBy: contains(query.salesperson) }
          ]
        }
      }
    });
  }

  const itemTextFilters: Array<[keyof Pick<Prisma.ShipmentFinanceItemWhereInput, 'name' | 'createdBy' | 'reviewedBy' | 'paymentNo' | 'remark'>, string | undefined]> = [
    ['name', query.feeName],
    ['createdBy', query.createdBy],
    ['reviewedBy', query.reviewedBy],
    ['paymentNo', query.paymentNo],
    ['remark', query.remark]
  ];
  for (const [field, value] of itemTextFilters) {
    if (value) and.push({ [field]: contains(value) });
  }

  const createdAt = dateRange(query.createdFrom, query.createdTo);
  if (createdAt) and.push({ createdAt });
  const reviewedAt = nullableDateRange(query.reviewedFrom, query.reviewedTo);
  if (reviewedAt) and.push({ reviewedAt });

  return { AND: and };
}
