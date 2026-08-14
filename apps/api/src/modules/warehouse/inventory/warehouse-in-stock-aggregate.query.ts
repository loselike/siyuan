import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma.service.js';

interface WarehouseInStockAggregateRow {
  totalItems: bigint;
  receiptTickets: bigint;
  totalPackages: bigint;
  totalWeightKg: Prisma.Decimal | number;
  totalCbm: Prisma.Decimal | number;
  pendingTallyTickets: bigint;
  exceptionTickets: bigint;
}

export interface WarehouseInStockAggregate {
  totalItems: number;
  receiptTickets: number;
  totalPackages: number;
  totalWeightKg: number;
  totalCbm: number;
  pendingTallyTickets: number;
  exceptionTickets: number;
}

export async function queryWarehouseInStockAggregate(
  prisma: PrismaService,
  where: Record<string, unknown>,
  currentSalespeople?: readonly string[]
): Promise<WarehouseInStockAggregate> {
  const aggregateWhere = buildWarehouseInStockAggregateWhere(where, currentSalespeople);
  const rows = await prisma.$queryRaw<WarehouseInStockAggregateRow[]>(Prisma.sql`
    WITH "filtered" AS (
      SELECT
        "id",
        "combinedOrderNo",
        "customerOrderNo",
        "domesticTrackingNo",
        "packageCount",
        "weightKg",
        "cbm",
        "status",
        "manualException",
        "exceptions"
      FROM "WarehousePackage"
      WHERE ${aggregateWhere}
    ),
    "pending_tally_tickets" AS (
      SELECT
        COALESCE(
          NULLIF(task."sourceCombinedOrderNo", ''),
          NULLIF(filtered."combinedOrderNo", ''),
          filtered."customerOrderNo" || '-' || filtered."domesticTrackingNo"
        ) AS "ticketKey"
      FROM "WarehouseTallyTask" task
      JOIN "filtered" filtered ON filtered."id" = ANY(task."packageIds")
      WHERE task."status" = 'PENDING'
        AND task."tallyProgressStatus" IN ('WAITING', 'IN_PROGRESS')
      GROUP BY 1
    ),
    "tickets" AS (
      SELECT
        COALESCE(NULLIF("combinedOrderNo", ''), "customerOrderNo" || '-' || "domesticTrackingNo") AS "ticketKey",
        BOOL_OR("status" = 'RECEIVED') AS "pendingTally",
        BOOL_OR(("manualException" IS NOT NULL AND "manualException" <> '') OR cardinality("exceptions") > 0) AS "hasException"
      FROM "filtered"
      GROUP BY 1
    )
    SELECT
      COUNT(*)::bigint AS "totalItems",
      (SELECT COUNT(*)::bigint FROM "tickets") AS "receiptTickets",
      COALESCE(SUM("packageCount"), 0)::bigint AS "totalPackages",
      COALESCE(SUM("weightKg"::double precision * "packageCount"), 0::double precision) AS "totalWeightKg",
      COALESCE(SUM("cbm"::double precision), 0::double precision) AS "totalCbm",
      (SELECT COUNT(*)::bigint FROM "pending_tally_tickets") AS "pendingTallyTickets",
      (SELECT COUNT(*)::bigint FROM "tickets" WHERE "hasException") AS "exceptionTickets"
    FROM "filtered"
  `);
  return mapWarehouseInStockAggregate(rows[0]);
}

function buildWarehouseInStockAggregateWhere(
  where: Record<string, unknown>,
  currentSalespeople?: readonly string[]
): Prisma.Sql {
  const filters: Prisma.Sql[] = [];
  const status = typeof where.status === 'string' ? where.status : undefined;
  if (status) filters.push(Prisma.sql`"status" = ${status}`);
  const archivedAt = where.archivedAt as { gte?: Date } | undefined;
  if (archivedAt?.gte) filters.push(Prisma.sql`"archivedAt" >= ${archivedAt.gte}`);
  if (typeof where.site === 'string') filters.push(Prisma.sql`"site" = ${where.site}`);
  appendInsensitiveContainsFilter(filters, 'customerOrderNo', where.customerOrderNo);
  appendInsensitiveContainsFilter(filters, 'domesticTrackingNo', where.domesticTrackingNo);
  appendInsensitiveContainsFilter(filters, 'combinedOrderNo', where.combinedOrderNo);
  appendStringInFilter(filters, 'customerCode', where.customerCode);
  appendStringInFilter(filters, 'id', where.id);
  if (currentSalespeople) {
    filters.push(currentSalespeople.length
      ? Prisma.sql`EXISTS (
          SELECT 1
          FROM "Customer"
          WHERE "Customer"."code" = "WarehousePackage"."customerCode"
            AND "Customer"."salesperson" IN (${Prisma.join([...currentSalespeople])})
        )`
      : Prisma.sql`FALSE`);
  }
  if (!filters.length) throw new Error('仓库在库汇总缺少查询范围');
  return Prisma.join(filters, ' AND ');
}

function appendInsensitiveContainsFilter(
  filters: Prisma.Sql[],
  column: 'customerOrderNo' | 'domesticTrackingNo' | 'combinedOrderNo',
  value: unknown
) {
  const contains = (value as { contains?: unknown } | undefined)?.contains;
  if (typeof contains !== 'string') return;
  const pattern = `%${contains}%`;
  if (column === 'customerOrderNo') filters.push(Prisma.sql`"customerOrderNo" ILIKE ${pattern}`);
  if (column === 'domesticTrackingNo') filters.push(Prisma.sql`"domesticTrackingNo" ILIKE ${pattern}`);
  if (column === 'combinedOrderNo') filters.push(Prisma.sql`"combinedOrderNo" ILIKE ${pattern}`);
}

function appendStringInFilter(
  filters: Prisma.Sql[],
  column: 'customerCode' | 'id',
  value: unknown
) {
  const values = (value as { in?: unknown } | undefined)?.in;
  if (!Array.isArray(values) || values.some((item) => typeof item !== 'string')) return;
  if (!values.length) {
    filters.push(Prisma.sql`FALSE`);
  }
  if (values.length && column === 'customerCode') filters.push(Prisma.sql`"customerCode" IN (${Prisma.join(values)})`);
  if (values.length && column === 'id') filters.push(Prisma.sql`"id" IN (${Prisma.join(values)})`);
}

function mapWarehouseInStockAggregate(row?: WarehouseInStockAggregateRow): WarehouseInStockAggregate {
  return {
    totalItems: Number(row?.totalItems ?? 0),
    receiptTickets: Number(row?.receiptTickets ?? 0),
    totalPackages: Number(row?.totalPackages ?? 0),
    totalWeightKg: roundWarehouseAggregate(row?.totalWeightKg ?? 0),
    totalCbm: roundWarehouseAggregate(row?.totalCbm ?? 0),
    pendingTallyTickets: Number(row?.pendingTallyTickets ?? 0),
    exceptionTickets: Number(row?.exceptionTickets ?? 0)
  };
}

function roundWarehouseAggregate(value: Prisma.Decimal | number): number {
  return Math.round(Number(value) * 100) / 100;
}
