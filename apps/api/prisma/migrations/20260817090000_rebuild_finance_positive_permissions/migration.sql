-- Rebuild the nine Finance workspace pages as canonical positive permissions.
-- Only Permission and Role<->Permission rows are changed; finance/business rows are guarded below.
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

CREATE TEMP TABLE "_FinancePermissionSnapshot" (
  "roleId" text PRIMARY KEY,
  "codes" text[] NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE "_FinanceBusinessRowCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_FinanceBusinessRowCounts" ("tableName", "rowCount") VALUES
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('PayablePaymentApplication', (SELECT COUNT(*) FROM "PayablePaymentApplication")),
  ('PaymentApplication', (SELECT COUNT(*) FROM "PaymentApplication")),
  ('PaymentVoucher', (SELECT COUNT(*) FROM "PaymentVoucher")),
  ('WaterReceipt', (SELECT COUNT(*) FROM "WaterReceipt")),
  ('WaterReceiptMatch', (SELECT COUNT(*) FROM "WaterReceiptMatch")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog")),
  ('PermissionNonFinance', (SELECT COUNT(*) FROM "Permission" WHERE "code" NOT LIKE 'finance:%')),
  ('PermissionRoleNonFinance', (
    SELECT COUNT(*)
    FROM "_PermissionToRole" link
    JOIN "Permission" permission ON permission."id" = link."A"
    WHERE permission."code" NOT LIKE 'finance:%'
  ));

INSERT INTO "_FinancePermissionSnapshot" ("roleId", "codes")
SELECT role."id", array_agg(permission."code")
FROM "Role" role
JOIN "_PermissionToRole" link ON link."B" = role."id"
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" LIKE 'finance:%'
  AND split_part(permission."code", ':', 2) IN (
  'dashboard', 'receivable', 'business-cost', 'payable', 'pending-payment',
  'paid-payment', 'water-receipt', 'water-match', 'agent-bill'
)
GROUP BY role."id";

WITH canonical("code") AS (
  VALUES
    ('finance:dashboard:view'),
    ('finance:receivable:read'), ('finance:receivable:create'), ('finance:receivable:audit'), ('finance:receivable:reverse'), ('finance:receivable:void'), ('finance:receivable:export'), ('finance:receivable:view-all'),
    ('finance:business-cost:read'), ('finance:business-cost:manage'), ('finance:business-cost:audit'), ('finance:business-cost:reverse'), ('finance:business-cost:void'), ('finance:business-cost:export'), ('finance:business-cost:view-all'), ('finance:business-cost:view-agent'), ('finance:business-cost:view-profit'),
    ('finance:payable:read'), ('finance:payable:manage'), ('finance:payable:match-shipment'), ('finance:payable:audit'), ('finance:payable:reverse'), ('finance:payable:void'), ('finance:payable:export'), ('finance:payable:view-sensitive'), ('finance:payable:view-profit'),
    ('finance:pending-payment:read'), ('finance:pending-payment:create'), ('finance:pending-payment:cancel'), ('finance:pending-payment:bank-select'), ('finance:pending-payment:bank-manage'), ('finance:pending-payment:bill-voucher-upload'), ('finance:pending-payment:export'),
    ('finance:paid-payment:read'), ('finance:paid-payment:confirm'), ('finance:paid-payment:update'), ('finance:paid-payment:reverse'), ('finance:paid-payment:voucher-view'), ('finance:paid-payment:voucher-upload'), ('finance:paid-payment:bank-view'), ('finance:paid-payment:export'),
    ('finance:water-receipt:read'), ('finance:water-receipt:create'), ('finance:water-receipt:update'), ('finance:water-receipt:arrive'), ('finance:water-receipt:archive'), ('finance:water-receipt:void'), ('finance:water-receipt:voucher-view'), ('finance:water-receipt:voucher-upload'), ('finance:water-receipt:voucher-delete'), ('finance:water-receipt:export'), ('finance:water-receipt:view-all'),
    ('finance:water-match:read'), ('finance:water-match:create'), ('finance:water-match:audit'), ('finance:water-match:reverse'), ('finance:water-match:adjust'), ('finance:water-match:cancel'), ('finance:water-match:export'),
    ('finance:agent-bill:read'), ('finance:agent-bill:import'), ('finance:agent-bill:difference-resolve'), ('finance:agent-bill:archive'), ('finance:agent-bill:reverse-archive')
)
INSERT INTO "Permission" ("id", "code")
SELECT 'perm-finance-v3-' || substr(md5("code"), 1, 24), "code"
FROM canonical
ON CONFLICT ("code") DO NOTHING;

-- Preserve the existing single-order receivable edit ability outside the nine
-- Finance pages under a non-assignable cross-module canonical permission.
INSERT INTO "Permission" ("id", "code")
VALUES ('perm-finance-v3-' || substr(md5('finance:order-fee:receivable:manage'), 1, 24), 'finance:order-fee:receivable:manage')
ON CONFLICT ("code") DO NOTHING;

-- Carry forward only equivalent, user-observable capabilities. Single and batch
-- grants converge on one canonical action. Dormant operations are intentionally not mapped.
WITH mapping("target", "legacy") AS (
  VALUES
    ('finance:dashboard:view', ARRAY['finance:dashboard:view']::text[]),
    ('finance:receivable:read', ARRAY['finance:receivable:read','finance:receivable:detail','finance:receivable:view-sensitive']::text[]),
    ('finance:receivable:create', ARRAY['finance:receivable:create']::text[]),
    ('finance:order-fee:receivable:manage', ARRAY['finance:receivable:update']::text[]),
    ('finance:receivable:audit', ARRAY['finance:receivable:audit','finance:receivable:batch-audit']::text[]),
    ('finance:receivable:reverse', ARRAY['finance:receivable:reverse','finance:receivable:batch-reverse']::text[]),
    ('finance:receivable:void', ARRAY['finance:receivable:void','finance:receivable:batch-void']::text[]),
    ('finance:receivable:export', ARRAY['finance:receivable:export']::text[]),
    ('finance:receivable:view-all', ARRAY['finance:receivable:view-all']::text[]),

    ('finance:business-cost:read', ARRAY['finance:business-cost:read','finance:business-cost:detail','finance:business-cost:view-sensitive']::text[]),
    ('finance:business-cost:manage', ARRAY['finance:business-cost:manage']::text[]),
    ('finance:business-cost:audit', ARRAY['finance:business-cost:audit','finance:business-cost:batch-audit']::text[]),
    ('finance:business-cost:reverse', ARRAY['finance:business-cost:reverse','finance:business-cost:batch-reverse']::text[]),
    ('finance:business-cost:void', ARRAY['finance:business-cost:void','finance:business-cost:batch-void']::text[]),
    ('finance:business-cost:export', ARRAY['finance:business-cost:export']::text[]),
    ('finance:business-cost:view-all', ARRAY['finance:business-cost:view-all']::text[]),
    ('finance:business-cost:view-agent', ARRAY['finance:business-cost:view-agent']::text[]),
    ('finance:business-cost:view-profit', ARRAY['finance:business-cost:view-profit']::text[]),

    ('finance:payable:read', ARRAY['finance:payable:read','finance:payable:detail']::text[]),
    ('finance:payable:manage', ARRAY['finance:payable:manage']::text[]),
    ('finance:payable:match-shipment', ARRAY['finance:payable:match-shipment']::text[]),
    ('finance:payable:audit', ARRAY['finance:payable:audit','finance:payable:batch-audit']::text[]),
    ('finance:payable:reverse', ARRAY['finance:payable:reverse','finance:payable:batch-reverse']::text[]),
    ('finance:payable:void', ARRAY['finance:payable:void','finance:payable:batch-void']::text[]),
    ('finance:payable:export', ARRAY['finance:payable:export']::text[]),
    ('finance:payable:view-sensitive', ARRAY['finance:payable:view-sensitive']::text[]),
    ('finance:payable:view-profit', ARRAY['finance:payable:view-profit']::text[]),

    ('finance:pending-payment:read', ARRAY['finance:pending-payment:read','finance:pending-payment:detail','finance:pending-payment:view-sensitive','finance:payable:payment','finance:payable:bank','finance:payable:attachment']::text[]),
    ('finance:pending-payment:create', ARRAY['finance:pending-payment:create','finance:payable:payment']::text[]),
    ('finance:pending-payment:cancel', ARRAY['finance:pending-payment:cancel','finance:payable:payment']::text[]),
    ('finance:pending-payment:bank-select', ARRAY['finance:pending-payment:bank-select','finance:payable:bank']::text[]),
    ('finance:pending-payment:bank-manage', ARRAY['finance:pending-payment:bank-manage','finance:payable:bank']::text[]),
    ('finance:pending-payment:bill-voucher-upload', ARRAY['finance:pending-payment:bill-voucher-upload','finance:pending-payment:create','finance:payable:attachment']::text[]),
    ('finance:pending-payment:export', ARRAY['finance:pending-payment:export']::text[]),

    ('finance:paid-payment:read', ARRAY['finance:paid-payment:read','finance:paid-payment:detail','finance:paid-payment:view-sensitive','finance:payable:paid-read']::text[]),
    ('finance:paid-payment:confirm', ARRAY['finance:paid-payment:confirm','finance:payable:paid-confirm']::text[]),
    ('finance:paid-payment:update', ARRAY['finance:paid-payment:update']::text[]),
    ('finance:paid-payment:reverse', ARRAY['finance:paid-payment:reverse','finance:payable:paid-reverse']::text[]),
    ('finance:paid-payment:voucher-view', ARRAY['finance:paid-payment:voucher-view','finance:payable:paid-voucher']::text[]),
    ('finance:paid-payment:voucher-upload', ARRAY['finance:paid-payment:voucher-upload','finance:payable:paid-voucher']::text[]),
    ('finance:paid-payment:bank-view', ARRAY['finance:paid-payment:bank-view','finance:payable:paid-bank-view']::text[]),
    ('finance:paid-payment:export', ARRAY['finance:paid-payment:export','finance:payable:paid-export']::text[]),

    ('finance:water-receipt:read', ARRAY['finance:water-receipt:read','finance:water-receipt:detail','finance:water-receipt:view-sensitive','finance:water-receipt:manage']::text[]),
    ('finance:water-receipt:create', ARRAY['finance:water-receipt:create','finance:water-receipt:manage']::text[]),
    ('finance:water-receipt:update', ARRAY['finance:water-receipt:update','finance:water-receipt:manage','finance:water-receipt:adjust','finance:water-receipt:arrived-update']::text[]),
    ('finance:water-receipt:arrive', ARRAY['finance:water-receipt:arrive']::text[]),
    ('finance:water-receipt:archive', ARRAY['finance:water-receipt:archive']::text[]),
    ('finance:water-receipt:void', ARRAY['finance:water-receipt:void']::text[]),
    ('finance:water-receipt:voucher-view', ARRAY['finance:water-receipt:voucher-view','finance:water-receipt:voucher']::text[]),
    ('finance:water-receipt:voucher-upload', ARRAY['finance:water-receipt:voucher-upload','finance:water-receipt:voucher']::text[]),
    ('finance:water-receipt:voucher-delete', ARRAY['finance:water-receipt:voucher-delete','finance:water-receipt:voucher']::text[]),
    ('finance:water-receipt:export', ARRAY['finance:water-receipt:export']::text[]),
    ('finance:water-receipt:view-all', ARRAY['finance:water-receipt:view-all']::text[]),

    ('finance:water-match:read', ARRAY['finance:water-match:read','finance:water-match:receivable-view','finance:water-match:history-view','finance:water-match:difference-view','finance:water-receipt:match']::text[]),
    ('finance:water-match:create', ARRAY['finance:water-match:create','finance:water-receipt:match']::text[]),
    ('finance:water-match:audit', ARRAY['finance:water-match:audit']::text[]),
    ('finance:water-match:reverse', ARRAY['finance:water-match:reverse']::text[]),
    ('finance:water-match:adjust', ARRAY['finance:water-match:adjust']::text[]),
    ('finance:water-match:cancel', ARRAY['finance:water-match:cancel']::text[]),
    ('finance:water-match:export', ARRAY['finance:water-match:export']::text[]),

    ('finance:agent-bill:read', ARRAY['finance:agent-bill:read','finance:agent-bill:detail','finance:agent-bill:view-sensitive','finance:agent-bill:attachment-view','finance:payable:attachment']::text[]),
    ('finance:agent-bill:import', ARRAY['finance:agent-bill:import','finance:agent-bill:save','finance:agent-bill:attachment-upload','finance:payable:attachment']::text[]),
    ('finance:agent-bill:difference-resolve', ARRAY['finance:agent-bill:difference-resolve','finance:agent-bill:difference-manage']::text[]),
    ('finance:agent-bill:archive', ARRAY['finance:agent-bill:archive']::text[]),
    ('finance:agent-bill:reverse-archive', ARRAY['finance:agent-bill:reverse-archive']::text[])
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM mapping
JOIN "_FinancePermissionSnapshot" snapshot ON snapshot."codes" && mapping."legacy"
JOIN "Permission" permission ON permission."code" = mapping."target"
ON CONFLICT DO NOTHING;

-- Every operation keeps its one visible page entry. Generating a payment
-- application also carries the mandatory supplier-bill upload prerequisite.
WITH dependency("action", "view") AS (
  SELECT permission."code", CASE split_part(permission."code", ':', 2)
    WHEN 'dashboard' THEN 'finance:dashboard:view'
    WHEN 'receivable' THEN 'finance:receivable:read'
    WHEN 'business-cost' THEN 'finance:business-cost:read'
    WHEN 'payable' THEN 'finance:payable:read'
    WHEN 'pending-payment' THEN 'finance:pending-payment:read'
    WHEN 'paid-payment' THEN 'finance:paid-payment:read'
    WHEN 'water-receipt' THEN 'finance:water-receipt:read'
    WHEN 'water-match' THEN 'finance:water-match:read'
    WHEN 'agent-bill' THEN 'finance:agent-bill:read'
  END
  FROM "Permission" permission
  WHERE permission."code" LIKE 'finance:%'
    AND split_part(permission."code", ':', 2) IN (
    'dashboard', 'receivable', 'business-cost', 'payable', 'pending-payment',
    'paid-payment', 'water-receipt', 'water-match', 'agent-bill'
  )
), grants AS (
  SELECT DISTINCT viewPermission."id" AS "A", actionLink."B"
  FROM dependency
  JOIN "Permission" actionPermission ON actionPermission."code" = dependency."action"
  JOIN "_PermissionToRole" actionLink ON actionLink."A" = actionPermission."id"
  JOIN "Permission" viewPermission ON viewPermission."code" = dependency."view"
  WHERE dependency."action" <> dependency."view"
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT "A", "B" FROM grants
ON CONFLICT DO NOTHING;

-- Water-match review buttons live in the receivable-audit workspace. Granting
-- either review action must therefore make that workspace reachable.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT receivableRead."id", actionLink."B"
FROM "Permission" actionPermission
JOIN "_PermissionToRole" actionLink ON actionLink."A" = actionPermission."id"
JOIN "Permission" receivableRead ON receivableRead."code" = 'finance:receivable:read'
WHERE actionPermission."code" IN ('finance:water-match:audit', 'finance:water-match:reverse')
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT uploadPermission."id", createLink."B"
FROM "Permission" createPermission
JOIN "_PermissionToRole" createLink ON createLink."A" = createPermission."id"
JOIN "Permission" uploadPermission ON uploadPermission."code" = 'finance:pending-payment:bill-voucher-upload'
WHERE createPermission."code" = 'finance:pending-payment:create'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT bankSelectPermission."id", createLink."B"
FROM "Permission" createPermission
JOIN "_PermissionToRole" createLink ON createLink."A" = createPermission."id"
JOIN "Permission" bankSelectPermission ON bankSelectPermission."code" = 'finance:pending-payment:bank-select'
WHERE createPermission."code" = 'finance:pending-payment:create'
ON CONFLICT DO NOTHING;

-- Remove only obsolete codes belonging to the nine Finance pages. Cross-module
-- customer-account and order-fee permissions remain untouched.
DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT "id" FROM "Permission"
  WHERE "code" LIKE 'finance:%'
  AND split_part("code", ':', 2) IN (
    'dashboard', 'receivable', 'business-cost', 'payable', 'pending-payment',
    'paid-payment', 'water-receipt', 'water-match', 'agent-bill'
  )
  AND "code" NOT IN (
    'finance:dashboard:view',
    'finance:receivable:read','finance:receivable:create','finance:receivable:audit','finance:receivable:reverse','finance:receivable:void','finance:receivable:export','finance:receivable:view-all',
    'finance:business-cost:read','finance:business-cost:manage','finance:business-cost:audit','finance:business-cost:reverse','finance:business-cost:void','finance:business-cost:export','finance:business-cost:view-all','finance:business-cost:view-agent','finance:business-cost:view-profit',
    'finance:payable:read','finance:payable:manage','finance:payable:match-shipment','finance:payable:audit','finance:payable:reverse','finance:payable:void','finance:payable:export','finance:payable:view-sensitive','finance:payable:view-profit',
    'finance:pending-payment:read','finance:pending-payment:create','finance:pending-payment:cancel','finance:pending-payment:bank-select','finance:pending-payment:bank-manage','finance:pending-payment:bill-voucher-upload','finance:pending-payment:export',
    'finance:paid-payment:read','finance:paid-payment:confirm','finance:paid-payment:update','finance:paid-payment:reverse','finance:paid-payment:voucher-view','finance:paid-payment:voucher-upload','finance:paid-payment:bank-view','finance:paid-payment:export',
    'finance:water-receipt:read','finance:water-receipt:create','finance:water-receipt:update','finance:water-receipt:arrive','finance:water-receipt:archive','finance:water-receipt:void','finance:water-receipt:voucher-view','finance:water-receipt:voucher-upload','finance:water-receipt:voucher-delete','finance:water-receipt:export','finance:water-receipt:view-all',
    'finance:water-match:read','finance:water-match:create','finance:water-match:audit','finance:water-match:reverse','finance:water-match:adjust','finance:water-match:cancel','finance:water-match:export',
    'finance:agent-bill:read','finance:agent-bill:import','finance:agent-bill:difference-resolve','finance:agent-bill:archive','finance:agent-bill:reverse-archive'
  )
);

DELETE FROM "Permission"
WHERE "code" LIKE 'finance:%'
AND split_part("code", ':', 2) IN (
  'dashboard', 'receivable', 'business-cost', 'payable', 'pending-payment',
  'paid-payment', 'water-receipt', 'water-match', 'agent-bill'
)
AND "code" NOT IN (
  'finance:dashboard:view',
  'finance:receivable:read','finance:receivable:create','finance:receivable:audit','finance:receivable:reverse','finance:receivable:void','finance:receivable:export','finance:receivable:view-all',
  'finance:business-cost:read','finance:business-cost:manage','finance:business-cost:audit','finance:business-cost:reverse','finance:business-cost:void','finance:business-cost:export','finance:business-cost:view-all','finance:business-cost:view-agent','finance:business-cost:view-profit',
  'finance:payable:read','finance:payable:manage','finance:payable:match-shipment','finance:payable:audit','finance:payable:reverse','finance:payable:void','finance:payable:export','finance:payable:view-sensitive','finance:payable:view-profit',
  'finance:pending-payment:read','finance:pending-payment:create','finance:pending-payment:cancel','finance:pending-payment:bank-select','finance:pending-payment:bank-manage','finance:pending-payment:bill-voucher-upload','finance:pending-payment:export',
  'finance:paid-payment:read','finance:paid-payment:confirm','finance:paid-payment:update','finance:paid-payment:reverse','finance:paid-payment:voucher-view','finance:paid-payment:voucher-upload','finance:paid-payment:bank-view','finance:paid-payment:export',
  'finance:water-receipt:read','finance:water-receipt:create','finance:water-receipt:update','finance:water-receipt:arrive','finance:water-receipt:archive','finance:water-receipt:void','finance:water-receipt:voucher-view','finance:water-receipt:voucher-upload','finance:water-receipt:voucher-delete','finance:water-receipt:export','finance:water-receipt:view-all',
  'finance:water-match:read','finance:water-match:create','finance:water-match:audit','finance:water-match:reverse','finance:water-match:adjust','finance:water-match:cancel','finance:water-match:export',
  'finance:agent-bill:read','finance:agent-bill:import','finance:agent-bill:difference-resolve','finance:agent-bill:archive','finance:agent-bill:reverse-archive'
);

DELETE FROM "_PermissionToRole"
WHERE "A" IN (SELECT "id" FROM "Permission" WHERE "code" IN ('finance:read', 'finance:settle'));
DELETE FROM "Permission" WHERE "code" IN ('finance:read', 'finance:settle');

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" LIKE 'finance:%' AND split_part("code", ':', 2) IN (
    'dashboard', 'receivable', 'business-cost', 'payable', 'pending-payment',
    'paid-payment', 'water-receipt', 'water-match', 'agent-bill'
  )) <> 64 THEN
    RAISE EXCEPTION 'finance permission catalog was not rebuilt cleanly';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "_PermissionToRole" link
    JOIN "Permission" permission ON permission."id" = link."A"
    WHERE permission."code" LIKE 'finance:%'
      AND permission."code" !~ '^finance:(dashboard|receivable|business-cost|payable|pending-payment|paid-payment|water-receipt|water-match|agent-bill|customer-account|order-fee):'
  ) THEN
    RAISE EXCEPTION 'unexpected finance permission family remains assigned';
  END IF;
  IF (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'PayablePaymentApplication') <> (SELECT COUNT(*) FROM "PayablePaymentApplication")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'PaymentApplication') <> (SELECT COUNT(*) FROM "PaymentApplication")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'PaymentVoucher') <> (SELECT COUNT(*) FROM "PaymentVoucher")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'WaterReceipt') <> (SELECT COUNT(*) FROM "WaterReceipt")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'WaterReceiptMatch') <> (SELECT COUNT(*) FROM "WaterReceiptMatch")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'AuditLog') <> (SELECT COUNT(*) FROM "AuditLog")
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'PermissionNonFinance') <> (SELECT COUNT(*) FROM "Permission" WHERE "code" NOT LIKE 'finance:%')
    OR (SELECT "rowCount" FROM "_FinanceBusinessRowCounts" WHERE "tableName" = 'PermissionRoleNonFinance') <> (
      SELECT COUNT(*)
      FROM "_PermissionToRole" link
      JOIN "Permission" permission ON permission."id" = link."A"
      WHERE permission."code" NOT LIKE 'finance:%'
    ) THEN
    RAISE EXCEPTION 'finance permission migration changed protected business rows';
  END IF;
END $$;

COMMIT;
