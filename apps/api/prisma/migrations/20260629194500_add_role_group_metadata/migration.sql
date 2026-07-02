ALTER TABLE "Role" ADD COLUMN "label" TEXT;
ALTER TABLE "Role" ADD COLUMN "description" TEXT;
ALTER TABLE "Role" ADD COLUMN "site" TEXT;
ALTER TABLE "Role" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Role" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Role" ADD COLUMN "systemBuiltin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Role" SET "label" = '系统管理员', "sortOrder" = 100, "enabled" = true, "systemBuiltin" = true WHERE "name" = 'ADMIN';
UPDATE "Role" SET "label" = '客服', "sortOrder" = 103, "enabled" = true, "systemBuiltin" = true WHERE "name" = 'CUSTOMER_SERVICE';
UPDATE "Role" SET "label" = '业务员', "sortOrder" = 104, "enabled" = true, "systemBuiltin" = true WHERE "name" = 'OPERATOR';
UPDATE "Role" SET "label" = '仓库', "sortOrder" = 102, "enabled" = true, "systemBuiltin" = true WHERE "name" = 'WAREHOUSE';
UPDATE "Role" SET "label" = '财务', "sortOrder" = 105, "enabled" = true, "systemBuiltin" = true WHERE "name" = 'FINANCE';
UPDATE "Role" SET "label" = '客户', "sortOrder" = 106, "enabled" = true, "systemBuiltin" = true WHERE "name" = 'CUSTOMER';

INSERT INTO "Role" ("id", "name", "label", "description", "site", "sortOrder", "enabled", "systemBuiltin")
VALUES
  ('r-ug-warehouse-receive', 'UG_WAREHOUSE_RECEIVE', '仓库收货', NULL, '深圳思远', 1, true, false),
  ('r-ug-warehouse-outbound', 'UG_WAREHOUSE_OUTBOUND', '仓库出货', NULL, '深圳思远', 2, true, false),
  ('r-ug-customer-service', 'UG_CUSTOMER_SERVICE', '客服', '处理一般客服工作', '深圳思远', 3, true, false),
  ('r-ug-finance', 'UG_FINANCE', '财务', NULL, '深圳思远', 4, true, false),
  ('r-ug-payable-finance', 'UG_PAYABLE_FINANCE', '出入账财务', '处理代理结算', '深圳思远', 5, true, false),
  ('r-ug-market', 'UG_MARKET', '市场部', '处理排货', '深圳思远', 6, true, false),
  ('r-ug-business', 'UG_BUSINESS', '业务部', NULL, NULL, 7, true, false),
  ('r-ug-sz-wuhan', 'UG_SZ_WUHAN', '深圳思远武汉', NULL, NULL, 8, true, false),
  ('r-ug-zz-sihua', 'UG_ZZ_SIHUA', '漳州思华', NULL, NULL, 9, true, false),
  ('r-ug-wh-jiuyulian', 'UG_WH_JIUYULIAN', '武汉九域联', NULL, NULL, 10, true, false),
  ('r-ug-business-manager', 'UG_BUSINESS_MANAGER', '业务经理', NULL, NULL, 11, true, false),
  ('r-ug-business-supervisor', 'UG_BUSINESS_SUPERVISOR', '业务主管', NULL, NULL, 12, true, false)
ON CONFLICT ("name") DO UPDATE SET
  "label" = EXCLUDED."label",
  "description" = EXCLUDED."description",
  "site" = EXCLUDED."site",
  "sortOrder" = EXCLUDED."sortOrder",
  "enabled" = EXCLUDED."enabled",
  "systemBuiltin" = EXCLUDED."systemBuiltin";

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT source."A", target."id"
FROM "_PermissionToRole" source
JOIN "Role" template ON template."id" = source."B" AND template."name" = 'WAREHOUSE'
JOIN "Role" target ON target."name" IN ('UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND')
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT source."A", target."id"
FROM "_PermissionToRole" source
JOIN "Role" template ON template."id" = source."B" AND template."name" = 'CUSTOMER_SERVICE'
JOIN "Role" target ON target."name" = 'UG_CUSTOMER_SERVICE'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT source."A", target."id"
FROM "_PermissionToRole" source
JOIN "Role" template ON template."id" = source."B" AND template."name" = 'FINANCE'
JOIN "Role" target ON target."name" IN ('UG_FINANCE', 'UG_PAYABLE_FINANCE')
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT source."A", target."id"
FROM "_PermissionToRole" source
JOIN "Role" template ON template."id" = source."B" AND template."name" = 'OPERATOR'
JOIN "Role" target ON target."name" IN ('UG_MARKET', 'UG_BUSINESS', 'UG_SZ_WUHAN', 'UG_ZZ_SIHUA', 'UG_WH_JIUYULIAN', 'UG_BUSINESS_MANAGER', 'UG_BUSINESS_SUPERVISOR')
ON CONFLICT DO NOTHING;
