-- Collapse page-field and technical-step grants into observable page/actions.
-- Only Permission and Role<->Permission rows are modified.
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

CREATE TEMP TABLE "_CrossModuleProtectedCounts" (
  "name" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_CrossModuleProtectedCounts" ("name", "rowCount") VALUES
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog")),
  ('PermissionOutsideScope', (
    SELECT COUNT(*) FROM "Permission"
    WHERE "code" NOT LIKE 'business:%'
      AND "code" NOT LIKE 'tracking:%'
      AND "code" NOT LIKE 'misc-fee:%'
      AND "code" NOT LIKE 'master-data:%'
  )),
  ('PermissionRoleOutsideScope', (
    SELECT COUNT(*)
    FROM "_PermissionToRole" link
    JOIN "Permission" permission ON permission."id" = link."A"
    WHERE permission."code" NOT LIKE 'business:%'
      AND permission."code" NOT LIKE 'tracking:%'
      AND permission."code" NOT LIKE 'misc-fee:%'
      AND permission."code" NOT LIKE 'master-data:%'
  ));

CREATE TEMP TABLE "_CrossModulePermissionSnapshot" (
  "roleId" text PRIMARY KEY,
  "codes" text[] NOT NULL
) ON COMMIT DROP;

INSERT INTO "_CrossModulePermissionSnapshot" ("roleId", "codes")
SELECT role."id", array_agg(permission."code")
FROM "Role" role
JOIN "_PermissionToRole" link ON link."B" = role."id"
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" LIKE 'business:%'
   OR permission."code" LIKE 'tracking:%'
   OR permission."code" LIKE 'misc-fee:%'
   OR permission."code" LIKE 'master-data:%'
GROUP BY role."id";

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-cross-v3-' || substr(md5('tracking:carrier-task:sync'), 1, 22), 'tracking:carrier-task:sync'),
  ('perm-cross-v3-' || substr(md5('tracking:external:import'), 1, 22), 'tracking:external:import'),
  ('perm-cross-v3-' || substr(md5('master-data:payer-banks:read'), 1, 22), 'master-data:payer-banks:read'),
  ('perm-cross-v3-' || substr(md5('master-data:payer-banks:create'), 1, 22), 'master-data:payer-banks:create'),
  ('perm-cross-v3-' || substr(md5('master-data:payer-banks:update'), 1, 22), 'master-data:payer-banks:update'),
  ('perm-cross-v3-' || substr(md5('master-data:payer-banks:delete'), 1, 22), 'master-data:payer-banks:delete')
ON CONFLICT ("code") DO NOTHING;

-- Only historical operations with the same observable business result map to
-- a canonical operation. Field-only and technical-step grants never open a
-- page by themselves.
WITH mapping("target", "legacy") AS (
  VALUES
    ('tracking:carrier-task:sync', ARRAY[
      'tracking:carrier-task:run','tracking:carrier-task:retry'
    ]::text[]),
    ('tracking:external:import', ARRAY[
      'tracking:external:single-add','tracking:external:import-confirm','tracking:external:overwrite'
    ]::text[]),
    ('master-data:customers:update', ARRAY['master-data:customers:enable']::text[]),
    ('master-data:customers:contacts-manage', ARRAY['master-data:customers:contacts-disable']::text[]),
    ('master-data:agents:update', ARRAY[
      'master-data:agents:enable','master-data:agents:batch-enable'
    ]::text[]),
    ('master-data:agents:delete', ARRAY['master-data:agents:batch-delete']::text[]),
    ('master-data:agent-channels:update', ARRAY['master-data:agent-channels:enable']::text[]),
    ('master-data:channels:update', ARRAY[
      'master-data:channels:enable','master-data:channels:carrier-enable'
    ]::text[]),
    ('master-data:channels:delete', ARRAY['master-data:channels:batch-delete']::text[]),
    ('master-data:channel-categories:update', ARRAY['master-data:channel-categories:enable']::text[]),
    ('master-data:remote-areas:file-upload', ARRAY['master-data:remote-areas:file-paste-upload']::text[])
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT targetPermission."id", snapshot."roleId"
FROM mapping
JOIN "_CrossModulePermissionSnapshot" snapshot ON snapshot."codes" && mapping."legacy"
JOIN "Permission" targetPermission ON targetPermission."code" = mapping."target"
ON CONFLICT DO NOTHING;

-- Historical page-wide write switches fan out to the real controls that are
-- still visible on the current page. They do not create replacement grants
-- for removed or placeholder-only operations.
WITH mapping("legacy", "target") AS (
  VALUES
    ('master-data:payer-banks:manage', 'master-data:payer-banks:create'),
    ('master-data:payer-banks:manage', 'master-data:payer-banks:update'),
    ('master-data:payer-banks:manage', 'master-data:payer-banks:delete'),
    ('master-data:customers:write', 'master-data:customers:create'),
    ('master-data:customers:write', 'master-data:customers:update'),
    ('master-data:customers:write', 'master-data:customers:delete'),
    ('master-data:customers:write', 'master-data:customers:contacts-manage'),
    ('master-data:customers:write', 'master-data:customers:export'),
    ('master-data:finance:write', 'master-data:finance:fee-name:create'),
    ('master-data:finance:write', 'master-data:finance:fee-name:update'),
    ('master-data:finance:write', 'master-data:finance:fee-name:delete'),
    ('master-data:finance:write', 'master-data:finance:fee-name:reorder'),
    ('master-data:finance:write', 'master-data:finance:settlement:create'),
    ('master-data:finance:write', 'master-data:finance:settlement:update'),
    ('master-data:finance:write', 'master-data:finance:settlement:delete'),
    ('master-data:finance:write', 'master-data:finance:cargo-type:create'),
    ('master-data:finance:write', 'master-data:finance:cargo-type:update'),
    ('master-data:finance:write', 'master-data:finance:cargo-type:delete'),
    ('master-data:finance:write', 'master-data:finance:product-name:create'),
    ('master-data:finance:write', 'master-data:finance:product-name:update'),
    ('master-data:finance:write', 'master-data:finance:product-name:delete'),
    ('master-data:agents:write', 'master-data:agents:create'),
    ('master-data:agents:write', 'master-data:agents:update'),
    ('master-data:agents:write', 'master-data:agents:delete'),
    ('master-data:agent-channels:write', 'master-data:agent-channels:create'),
    ('master-data:agent-channels:write', 'master-data:agent-channels:update'),
    ('master-data:agent-channels:write', 'master-data:agent-channels:delete'),
    ('master-data:channels:write', 'master-data:channels:create'),
    ('master-data:channels:write', 'master-data:channels:update'),
    ('master-data:channels:write', 'master-data:channels:delete'),
    ('master-data:channel-categories:write', 'master-data:channel-categories:create'),
    ('master-data:channel-categories:write', 'master-data:channel-categories:update'),
    ('master-data:channel-categories:write', 'master-data:channel-categories:delete'),
    ('master-data:remote-areas:write', 'master-data:remote-areas:file-upload'),
    ('master-data:remote-areas:write', 'master-data:remote-areas:file-delete'),
    ('master-data:remote-areas:rule-manage', 'master-data:remote-areas:file-upload'),
    ('master-data:remote-areas:rule-manage', 'master-data:remote-areas:file-delete'),
    ('master-data:exchange-rates:write', 'master-data:exchange-rates:create'),
    ('master-data:exchange-rates:write', 'master-data:exchange-rates:update'),
    ('master-data:exchange-rates:write', 'master-data:exchange-rates:disable')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT targetPermission."id", snapshot."roleId"
FROM mapping
JOIN "_CrossModulePermissionSnapshot" snapshot ON mapping."legacy" = ANY(snapshot."codes")
JOIN "Permission" targetPermission ON targetPermission."code" = mapping."target"
ON CONFLICT DO NOTHING;

-- Every current, independently assignable action opens its owning page. The
-- allowlist is deliberate: obsolete field grants and generated dead codes do
-- not expand into page access.
WITH dependency("action", "view") AS (
  VALUES
    ('business:dashboard:team-view','business:dashboard:view'),('business:dashboard:all-view','business:dashboard:view'),
    ('business:shipment:detail','business:shipment:list'),('business:shipment:self-view','business:shipment:list'),('business:shipment:team-view','business:shipment:list'),('business:shipment:all-view','business:shipment:list'),
    ('business:shipment:update-basic','business:shipment:list'),('business:shipment:delete','business:shipment:list'),('business:shipment:payment-record','business:shipment:list'),
    ('business:shipment:problem-create','business:shipment:list'),
    ('business:order-ai:assist','business:order-ai:view'),('business:order-ai:all-order-context','business:order-ai:view'),
    ('tracking:carrier-task:sync','tracking:carrier-task:view'),
    ('tracking:external:detail','tracking:external:view'),('tracking:external:import','tracking:external:view'),
    ('misc-fee:kuayue:create','misc-fee:kuayue:read'),('misc-fee:kuayue:update','misc-fee:kuayue:read'),('misc-fee:kuayue:audit','misc-fee:kuayue:read'),('misc-fee:kuayue:reverse-audit','misc-fee:kuayue:read'),('misc-fee:kuayue:void','misc-fee:kuayue:read'),('misc-fee:kuayue:hang','misc-fee:kuayue:read'),('misc-fee:kuayue:attachment-view','misc-fee:kuayue:read'),('misc-fee:kuayue:attachment-upload','misc-fee:kuayue:read'),
    ('misc-fee:pickup:create','misc-fee:pickup:read'),('misc-fee:pickup:update','misc-fee:pickup:read'),('misc-fee:pickup:audit','misc-fee:pickup:read'),('misc-fee:pickup:reverse-audit','misc-fee:pickup:read'),('misc-fee:pickup:void','misc-fee:pickup:read'),('misc-fee:pickup:match','misc-fee:pickup:read'),('misc-fee:pickup:hang','misc-fee:pickup:read'),('misc-fee:pickup:attachment-view','misc-fee:pickup:read'),('misc-fee:pickup:attachment-upload','misc-fee:pickup:read'),
    ('misc-fee:tally:create','misc-fee:tally:read'),('misc-fee:tally:update','misc-fee:tally:read'),('misc-fee:tally:confirm','misc-fee:tally:read'),('misc-fee:tally:audit','misc-fee:tally:read'),('misc-fee:tally:reverse-audit','misc-fee:tally:read'),('misc-fee:tally:void','misc-fee:tally:read'),('misc-fee:tally:hang','misc-fee:tally:read'),('misc-fee:tally:attachment-view','misc-fee:tally:read'),('misc-fee:tally:attachment-upload','misc-fee:tally:read'),
    ('misc-fee:purchase:create','misc-fee:purchase:read'),('misc-fee:purchase:update','misc-fee:purchase:read'),('misc-fee:purchase:void','misc-fee:purchase:read'),('misc-fee:purchase:hang','misc-fee:purchase:read'),('misc-fee:purchase:attachment-view','misc-fee:purchase:read'),('misc-fee:purchase:attachment-upload','misc-fee:purchase:read'),
    ('misc-fee:delivery:create','misc-fee:delivery:read'),('misc-fee:delivery:confirm','misc-fee:delivery:read'),('misc-fee:delivery:audit','misc-fee:delivery:read'),('misc-fee:delivery:reverse-audit','misc-fee:delivery:read'),('misc-fee:delivery:void','misc-fee:delivery:read'),('misc-fee:delivery:match','misc-fee:delivery:read'),('misc-fee:delivery:hang','misc-fee:delivery:read'),('misc-fee:delivery:attachment-view','misc-fee:delivery:read'),('misc-fee:delivery:attachment-upload','misc-fee:delivery:read'),
    ('misc-fee:hang:hang-approve','misc-fee:hang:read'),
    ('misc-fee:market-profit:settlement-generate','misc-fee:market-profit:read'),('misc-fee:market-profit:settlement-audit','misc-fee:market-profit:read'),('misc-fee:market-profit:settlement-reverse','misc-fee:market-profit:read'),
    ('misc-fee:warehouse-profit:settlement-generate','misc-fee:warehouse-profit:read'),('misc-fee:warehouse-profit:settlement-audit','misc-fee:warehouse-profit:read'),('misc-fee:warehouse-profit:settlement-reverse','misc-fee:warehouse-profit:read'),
    ('misc-fee:finance-profit:export','misc-fee:finance-profit:read'),('misc-fee:finance-profit:settlement-generate','misc-fee:finance-profit:read'),('misc-fee:finance-profit:settlement-audit','misc-fee:finance-profit:read'),('misc-fee:finance-profit:settlement-reverse','misc-fee:finance-profit:read'),
    ('master-data:customers:view-own','master-data:customers:read'),('master-data:customers:view-all','master-data:customers:read'),('master-data:customers:create','master-data:customers:read'),('master-data:customers:update','master-data:customers:read'),('master-data:customers:enable','master-data:customers:read'),('master-data:customers:delete','master-data:customers:read'),('master-data:customers:export','master-data:customers:read'),('master-data:customers:contacts-manage','master-data:customers:read'),('master-data:customers:contacts-disable','master-data:customers:read'),
    ('master-data:finance:fee-name:create','master-data:finance:read'),('master-data:finance:fee-name:update','master-data:finance:read'),('master-data:finance:fee-name:delete','master-data:finance:read'),('master-data:finance:fee-name:reorder','master-data:finance:read'),
    ('master-data:finance:settlement:create','master-data:finance:read'),('master-data:finance:settlement:update','master-data:finance:read'),('master-data:finance:settlement:delete','master-data:finance:read'),
    ('master-data:finance:cargo-type:create','master-data:finance:read'),('master-data:finance:cargo-type:update','master-data:finance:read'),('master-data:finance:cargo-type:delete','master-data:finance:read'),
    ('master-data:finance:product-name:create','master-data:finance:read'),('master-data:finance:product-name:update','master-data:finance:read'),('master-data:finance:product-name:delete','master-data:finance:read'),
    ('master-data:payer-banks:create','master-data:payer-banks:read'),('master-data:payer-banks:update','master-data:payer-banks:read'),('master-data:payer-banks:delete','master-data:payer-banks:read'),
    ('master-data:agents:create','master-data:agents:read'),('master-data:agents:update','master-data:agents:read'),('master-data:agents:delete','master-data:agents:read'),
    ('master-data:agent-channels:create','master-data:agent-channels:read'),('master-data:agent-channels:update','master-data:agent-channels:read'),('master-data:agent-channels:delete','master-data:agent-channels:read'),
    ('master-data:channels:create','master-data:channels:read'),('master-data:channels:update','master-data:channels:read'),('master-data:channels:delete','master-data:channels:read'),
    ('master-data:channel-categories:create','master-data:channel-categories:read'),('master-data:channel-categories:update','master-data:channel-categories:read'),('master-data:channel-categories:delete','master-data:channel-categories:read'),
    ('master-data:remote-areas:file-upload','master-data:remote-areas:read'),('master-data:remote-areas:file-delete','master-data:remote-areas:read'),
    ('master-data:exchange-rates:create','master-data:exchange-rates:read'),('master-data:exchange-rates:update','master-data:exchange-rates:read'),('master-data:exchange-rates:disable','master-data:exchange-rates:read'),
    ('master-data:assistant:ai-check','master-data:assistant:read'),('master-data:assistant:suggestion-generate','master-data:assistant:read')
), grants AS (
  SELECT DISTINCT viewPermission."id" AS "A", actionLink."B"
  FROM dependency
  JOIN "Permission" actionPermission
    ON actionPermission."code" = dependency."action"
  JOIN "_PermissionToRole" actionLink ON actionLink."A" = actionPermission."id"
  JOIN "Permission" viewPermission ON viewPermission."code" = dependency."view"
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT "A", "B" FROM grants
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_CrossModuleObsoleteCodes" ("code" text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_CrossModuleObsoleteCodes" ("code") VALUES
  ('business:dashboard:trend-view'),('business:dashboard:pending-review-summary'),
  ('business:shipment:tracking-add'),('business:shipment:update-operational'),('business:shipment:export'),('business:shipment:finance-detail-view'),('business:shipment:receivable-view'),
  ('business:shipment:payable-view'),('business:shipment:profit-view'),
  ('business:shipment:agent-weight-view'),('business:shipment:column-setting'),
  ('business:order-ai:finance-context'),('business:order-ai:export-result'),
  ('tracking:carrier-task:run'),('tracking:carrier-task:retry'),
  ('tracking:carrier-task:detail'),('tracking:carrier-task:error-view'),('tracking:carrier-task:log-view'),
  ('tracking:carrier-task:column-setting'),
  ('tracking:external:latest-view'),('tracking:external:stale-days-view'),
  ('tracking:external:import-upload'),('tracking:external:import-preview'),
  ('tracking:external:import-confirm'),('tracking:external:import-error-view'),
  ('tracking:external:unmatched-view'),('tracking:external:overwrite'),
  ('tracking:external:single-add'),
  ('tracking:external:customer-visible-update'),('tracking:external:column-setting'),
  ('tracking:external:export'),
  ('master-data:customers:write'),('master-data:customers:detail'),('master-data:customers:enable'),('master-data:customers:contacts-disable'),
  ('master-data:customers:assign-salesperson'),('master-data:customers:import'),
  ('master-data:customers:contacts-view'),
  ('master-data:customers:view-sensitive'),('master-data:customers:list-setting'),
  ('master-data:finance:write'),
  ('master-data:finance:view-sensitive'),
  ('master-data:payer-banks:manage'),
  ('master-data:agents:write'),('master-data:agents:detail'),('master-data:agents:enable'),
  ('master-data:agents:batch-enable'),('master-data:agents:batch-delete'),
  ('master-data:agents:warehouse-view'),('master-data:agents:tracking-site-view'),
  ('master-data:agents:invoice-template-view'),('master-data:agents:bank-view'),
  ('master-data:agents:invoice-template-manage'),('master-data:agents:bank-manage'),
  ('master-data:agents:integration-type-view'),('master-data:agents:list-setting'),
  ('master-data:agent-channels:write'),('master-data:agent-channels:filter-agent'),
  ('master-data:agent-channels:enable'),
  ('master-data:channels:write'),('master-data:channels:enable'),('master-data:channels:batch-delete'),
  ('master-data:channels:carrier-manage'),('master-data:channels:carrier-enable'),
  ('master-data:channels:business-type-manage'),('master-data:channels:category-manage'),
  ('master-data:channels:volume-rule-manage'),('master-data:channels:weight-rule-manage'),
  ('master-data:channels:settlement-rule-manage'),('master-data:channels:large-cargo-rule-manage'),
  ('master-data:channels:remote-rule-manage'),
  ('master-data:channel-categories:write'),('master-data:channel-categories:enable'),
  ('master-data:remote-areas:write'),('master-data:remote-areas:file-view'),
  ('master-data:remote-areas:file-paste-upload'),('master-data:remote-areas:rule-manage'),
  ('master-data:exchange-rates:write'),
  ('master-data:exchange-rates:history-view'),('master-data:exchange-rates:period-view'),
  ('master-data:exchange-rates:export'),
  ('master-data:assistant:missing-warning-view'),('master-data:assistant:stats-view'),
  ('misc-fee:kuayue:view-payable'),('misc-fee:pickup:view-payable'),
  ('misc-fee:tally:view-payable'),('misc-fee:purchase:view-payable'),
  ('misc-fee:delivery:view-payable'),('misc-fee:hang:view-payable'),
  ('misc-fee:market-profit:view-payable'),('misc-fee:warehouse-profit:view-payable'),
  ('misc-fee:finance-profit:view-payable');

-- Early role-editor versions generated the same 18 actions for every misc-fee
-- page, including operations that no page or endpoint actually exposes. Keep
-- only the current observable controls for each page and retire the rest.
INSERT INTO "_CrossModuleObsoleteCodes" ("code")
SELECT permission."code"
FROM "Permission" permission
WHERE permission."code" LIKE 'misc-fee:%'
  AND permission."code" NOT IN (
    'misc-fee:kuayue:read','misc-fee:kuayue:create','misc-fee:kuayue:update','misc-fee:kuayue:audit','misc-fee:kuayue:reverse-audit','misc-fee:kuayue:void','misc-fee:kuayue:hang','misc-fee:kuayue:attachment-view','misc-fee:kuayue:attachment-upload',
    'misc-fee:pickup:read','misc-fee:pickup:create','misc-fee:pickup:update','misc-fee:pickup:audit','misc-fee:pickup:reverse-audit','misc-fee:pickup:void','misc-fee:pickup:match','misc-fee:pickup:hang','misc-fee:pickup:attachment-view','misc-fee:pickup:attachment-upload',
    'misc-fee:tally:read','misc-fee:tally:create','misc-fee:tally:update','misc-fee:tally:confirm','misc-fee:tally:audit','misc-fee:tally:reverse-audit','misc-fee:tally:void','misc-fee:tally:hang','misc-fee:tally:attachment-view','misc-fee:tally:attachment-upload',
    'misc-fee:purchase:read','misc-fee:purchase:create','misc-fee:purchase:update','misc-fee:purchase:void','misc-fee:purchase:hang','misc-fee:purchase:attachment-view','misc-fee:purchase:attachment-upload',
    'misc-fee:delivery:read','misc-fee:delivery:create','misc-fee:delivery:confirm','misc-fee:delivery:audit','misc-fee:delivery:reverse-audit','misc-fee:delivery:void','misc-fee:delivery:match','misc-fee:delivery:hang','misc-fee:delivery:attachment-view','misc-fee:delivery:attachment-upload',
    'misc-fee:hang:read','misc-fee:hang:hang-approve',
    'misc-fee:market-profit:read','misc-fee:market-profit:settlement-generate','misc-fee:market-profit:settlement-audit','misc-fee:market-profit:settlement-reverse',
    'misc-fee:warehouse-profit:read','misc-fee:warehouse-profit:settlement-generate','misc-fee:warehouse-profit:settlement-audit','misc-fee:warehouse-profit:settlement-reverse',
    'misc-fee:finance-profit:read','misc-fee:finance-profit:export','misc-fee:finance-profit:settlement-generate','misc-fee:finance-profit:settlement-audit','misc-fee:finance-profit:settlement-reverse'
  )
ON CONFLICT ("code") DO NOTHING;

DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT permission."id"
  FROM "Permission" permission
  JOIN "_CrossModuleObsoleteCodes" obsolete ON obsolete."code" = permission."code"
);

DELETE FROM "Permission"
WHERE "code" IN (SELECT "code" FROM "_CrossModuleObsoleteCodes");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Permission"
    WHERE "code" IN (SELECT "code" FROM "_CrossModuleObsoleteCodes")
  ) THEN
    RAISE EXCEPTION 'obsolete cross-module permissions remain';
  END IF;
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" IN (
    'tracking:carrier-task:sync','tracking:external:import',
    'master-data:payer-banks:read','master-data:payer-banks:create','master-data:payer-banks:update','master-data:payer-banks:delete'
  )) <> 6 THEN
    RAISE EXCEPTION 'canonical cross-module permissions missing';
  END IF;
  IF (SELECT "rowCount" FROM "_CrossModuleProtectedCounts" WHERE "name" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_CrossModuleProtectedCounts" WHERE "name" = 'Role') <> (SELECT COUNT(*) FROM "Role")
    OR (SELECT "rowCount" FROM "_CrossModuleProtectedCounts" WHERE "name" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_CrossModuleProtectedCounts" WHERE "name" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_CrossModuleProtectedCounts" WHERE "name" = 'AuditLog') <> (SELECT COUNT(*) FROM "AuditLog") THEN
    RAISE EXCEPTION 'business data changed during permission migration';
  END IF;
  IF (SELECT "rowCount" FROM "_CrossModuleProtectedCounts" WHERE "name" = 'PermissionOutsideScope') <> (
      SELECT COUNT(*) FROM "Permission"
      WHERE "code" NOT LIKE 'business:%'
        AND "code" NOT LIKE 'tracking:%'
        AND "code" NOT LIKE 'misc-fee:%'
        AND "code" NOT LIKE 'master-data:%'
    )
    OR (SELECT "rowCount" FROM "_CrossModuleProtectedCounts" WHERE "name" = 'PermissionRoleOutsideScope') <> (
      SELECT COUNT(*)
      FROM "_PermissionToRole" link
      JOIN "Permission" permission ON permission."id" = link."A"
      WHERE permission."code" NOT LIKE 'business:%'
        AND permission."code" NOT LIKE 'tracking:%'
        AND permission."code" NOT LIKE 'misc-fee:%'
        AND permission."code" NOT LIKE 'master-data:%'
    ) THEN
    RAISE EXCEPTION 'permission migration touched an out-of-scope module';
  END IF;
END $$;

COMMIT;
