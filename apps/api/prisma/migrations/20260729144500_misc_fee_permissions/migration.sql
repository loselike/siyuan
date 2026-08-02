-- Register every misc-fee permission before assigning it to persisted roles.
-- Runtime RBAC reads the database assignments whenever a Role row exists, so
-- the TypeScript defaults alone are not sufficient for existing environments.
WITH sections(section) AS (
  VALUES
    ('kuayue'),
    ('pickup'),
    ('tally'),
    ('purchase'),
    ('delivery'),
    ('hang'),
    ('market-profit'),
    ('warehouse-profit'),
    ('finance-profit')
), actions(action) AS (
  VALUES
    ('read'),
    ('create'),
    ('update'),
    ('confirm'),
    ('audit'),
    ('reverse-audit'),
    ('void'),
    ('match'),
    ('hang'),
    ('hang-approve'),
    ('attachment-view'),
    ('attachment-upload'),
    ('export'),
    ('view-payable'),
    ('view-all'),
    ('settlement-generate'),
    ('settlement-audit'),
    ('settlement-reverse')
), permission_codes(code) AS (
  SELECT 'misc-fee:' || section || ':' || action
  FROM sections
  CROSS JOIN actions
)
INSERT INTO "Permission" ("id", "code")
SELECT 'perm-' || md5(code), code
FROM permission_codes
ON CONFLICT ("code") DO NOTHING;

-- Administrators and finance roles receive the complete misc-fee permission set.
WITH sections(section) AS (
  VALUES
    ('kuayue'),
    ('pickup'),
    ('tally'),
    ('purchase'),
    ('delivery'),
    ('hang'),
    ('market-profit'),
    ('warehouse-profit'),
    ('finance-profit')
), actions(action) AS (
  VALUES
    ('read'),
    ('create'),
    ('update'),
    ('confirm'),
    ('audit'),
    ('reverse-audit'),
    ('void'),
    ('match'),
    ('hang'),
    ('hang-approve'),
    ('attachment-view'),
    ('attachment-upload'),
    ('export'),
    ('view-payable'),
    ('view-all'),
    ('settlement-generate'),
    ('settlement-audit'),
    ('settlement-reverse')
), finance_permissions(code) AS (
  SELECT 'misc-fee:' || section || ':' || action
  FROM sections
  CROSS JOIN actions
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM finance_permissions
JOIN "Permission" AS permission ON permission."code" = finance_permissions.code
JOIN "Role" AS role
  ON role."name" IN ('ADMIN', 'FINANCE', 'UG_FINANCE', 'UG_PAYABLE_FINANCE')
ON CONFLICT ("A", "B") DO NOTHING;

-- Business roles may work only with their customer-scoped business-cost paths.
WITH business_permissions(code) AS (
  VALUES
    ('misc-fee:kuayue:read'),
    ('misc-fee:kuayue:update'),
    ('misc-fee:kuayue:confirm'),
    ('misc-fee:kuayue:match'),
    ('misc-fee:kuayue:hang'),
    ('misc-fee:kuayue:attachment-view'),
    ('misc-fee:pickup:read'),
    ('misc-fee:pickup:create'),
    ('misc-fee:pickup:update'),
    ('misc-fee:pickup:confirm'),
    ('misc-fee:pickup:match'),
    ('misc-fee:pickup:hang'),
    ('misc-fee:pickup:attachment-view'),
    ('misc-fee:pickup:attachment-upload'),
    ('misc-fee:tally:read'),
    ('misc-fee:tally:match'),
    ('misc-fee:purchase:read'),
    ('misc-fee:purchase:create'),
    ('misc-fee:purchase:update'),
    ('misc-fee:purchase:confirm'),
    ('misc-fee:purchase:hang'),
    ('misc-fee:purchase:attachment-view'),
    ('misc-fee:purchase:attachment-upload'),
    ('misc-fee:delivery:read'),
    ('misc-fee:hang:read')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM business_permissions
JOIN "Permission" AS permission ON permission."code" = business_permissions.code
JOIN "Role" AS role ON role."name" IN (
  'OPERATOR',
  'UG_BUSINESS',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR',
  'UG_MARKET'
)
ON CONFLICT ("A", "B") DO NOTHING;

-- Warehouse roles are limited to warehouse-owned fee work and warehouse profit.
WITH warehouse_permissions(code) AS (
  VALUES
    ('misc-fee:pickup:read'),
    ('misc-fee:pickup:create'),
    ('misc-fee:pickup:update'),
    ('misc-fee:pickup:confirm'),
    ('misc-fee:pickup:match'),
    ('misc-fee:pickup:hang'),
    ('misc-fee:pickup:attachment-view'),
    ('misc-fee:pickup:attachment-upload'),
    ('misc-fee:pickup:view-payable'),
    ('misc-fee:tally:read'),
    ('misc-fee:tally:create'),
    ('misc-fee:tally:update'),
    ('misc-fee:tally:confirm'),
    ('misc-fee:tally:match'),
    ('misc-fee:tally:hang'),
    ('misc-fee:tally:attachment-view'),
    ('misc-fee:tally:attachment-upload'),
    ('misc-fee:tally:view-payable'),
    ('misc-fee:warehouse-profit:read'),
    ('misc-fee:warehouse-profit:settlement-generate')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM warehouse_permissions
JOIN "Permission" AS permission ON permission."code" = warehouse_permissions.code
JOIN "Role" AS role
  ON role."name" IN ('WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND')
ON CONFLICT ("A", "B") DO NOTHING;

-- Market staff inherit the business set above and additionally receive market
-- pickup/delivery payable visibility and market-profit generation permissions.
WITH market_permissions(code) AS (
  VALUES
    ('misc-fee:pickup:read'),
    ('misc-fee:pickup:create'),
    ('misc-fee:pickup:update'),
    ('misc-fee:pickup:confirm'),
    ('misc-fee:pickup:match'),
    ('misc-fee:pickup:hang'),
    ('misc-fee:pickup:attachment-view'),
    ('misc-fee:pickup:attachment-upload'),
    ('misc-fee:pickup:view-payable'),
    ('misc-fee:delivery:read'),
    ('misc-fee:delivery:create'),
    ('misc-fee:delivery:update'),
    ('misc-fee:delivery:confirm'),
    ('misc-fee:delivery:view-payable'),
    ('misc-fee:market-profit:read'),
    ('misc-fee:market-profit:settlement-generate')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM market_permissions
JOIN "Permission" AS permission ON permission."code" = market_permissions.code
JOIN "Role" AS role ON role."name" = 'UG_MARKET'
ON CONFLICT ("A", "B") DO NOTHING;
