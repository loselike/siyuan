CREATE TABLE "WarehouseRentRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "site" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "freeDays" INTEGER NOT NULL,
    "billingUnit" TEXT NOT NULL,
    "densityMin" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "densityMax" DECIMAL(65,30),
    "unitRate" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RMB',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseRentRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WarehouseRentRule_freeDays_check" CHECK ("freeDays" >= 0),
    CONSTRAINT "WarehouseRentRule_billingUnit_check" CHECK ("billingUnit" IN ('CBM', 'KG')),
    CONSTRAINT "WarehouseRentRule_densityRange_check" CHECK ("densityMin" >= 0 AND ("densityMax" IS NULL OR "densityMax" > "densityMin")),
    CONSTRAINT "WarehouseRentRule_unitRate_check" CHECK ("unitRate" > 0),
    CONSTRAINT "WarehouseRentRule_currency_check" CHECK ("currency" = 'RMB')
);

CREATE INDEX "WarehouseRentRule_site_enabled_effectiveFrom_idx"
ON "WarehouseRentRule"("site", "enabled", "effectiveFrom");

CREATE INDEX "WarehouseRentRule_effectiveFrom_effectiveTo_idx"
ON "WarehouseRentRule"("effectiveFrom", "effectiveTo");

INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-warehouse-rent-detail-view', 'warehouse:rent-detail:view'),
  ('perm-warehouse-rent-detail-export', 'warehouse:rent-detail:export'),
  ('perm-warehouse-rent-rule-view', 'warehouse:rent-rule:view'),
  ('perm-warehouse-rent-rule-manage', 'warehouse:rent-rule:manage')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
JOIN "Role" AS role
  ON role."name" IN ('WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND')
WHERE permission."code" IN (
  'warehouse:rent-detail:view',
  'warehouse:rent-detail:export',
  'warehouse:rent-rule:view'
)
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
JOIN "Role" AS role ON role."name" = 'ADMIN'
WHERE permission."code" IN (
  'warehouse:rent-detail:view',
  'warehouse:rent-detail:export',
  'warehouse:rent-rule:view',
  'warehouse:rent-rule:manage'
)
ON CONFLICT ("A", "B") DO NOTHING;
