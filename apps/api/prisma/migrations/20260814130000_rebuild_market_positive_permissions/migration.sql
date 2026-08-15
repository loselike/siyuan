-- Rebuild market management as positive capabilities.  This migration only
-- touches the permission catalog and Role<->Permission grants; it only reads
-- business-table row counts for guards and never mutates business data.
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

CREATE TEMP TABLE "_MarketPermissionSnapshot" (
  "roleId" text PRIMARY KEY,
  "codes" text[] NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE "_MarketBusinessRowCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_MarketBusinessRowCounts" ("tableName", "rowCount") VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog"));

INSERT INTO "_MarketPermissionSnapshot" ("roleId", "codes")
SELECT role."id", array_agg(permission."code")
FROM "Role" role
JOIN "_PermissionToRole" link ON link."B" = role."id"
JOIN "Permission" permission ON permission."id" = link."A"
GROUP BY role."id";

-- Only these catalog entries are the legacy market permissions replaced by
-- the 17 canonical actions below.  Keep this list explicit: a role may carry
-- an exception/extension permission that is not part of this refactor, and an
-- unknown market code must never be removed by a broad prefix delete.
CREATE TEMP TABLE "_MarketLegacyPermissionCleanup" (
  "code" text PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO "_MarketLegacyPermissionCleanup" ("code") VALUES
  ('market:dashboard:pending-summary'),
  ('market:dashboard:routed-summary'),
  ('market:dashboard:weekly-summary'),
  ('market:dashboard:agent-stats-view'),
  ('market:dashboard:channel-mode-stats-view'),
  ('market:dashboard:sensitive-summary-view'),
  ('market:dashboard:team-view'),
  ('market:dashboard:all-view'),
  ('market:pending-routing:detail'),
  ('market:pending-routing:assign'),
  ('market:pending-routing:save-draft'),
  ('market:pending-routing:confirm'),
  ('market:pending-routing:audit'),
  ('market:pending-routing:update'),
  ('market:pending-routing:delete'),
  ('market:pending-routing:operation-log-view'),
  ('market:pending-routing:business-cost-view'),
  ('market:pending-routing:payable-cost-view'),
  ('market:pending-routing:agent-channel-view'),
  ('market:pending-routing:cost-field-view'),
  ('market:pending-routing:column-setting'),
  ('market:pending-routing:route-block'),
  ('market:pending-routing:update-block'),
  ('market:pending-routing:audit-block'),
  ('market:pending-routing:operation-log-block'),
  ('market:pending-routing:business-cost-create-block'),
  ('market:pending-routing:business-cost-update-block'),
  ('market:pending-routing:business-cost-delete-block'),
  ('market:pending-routing:reroute-block'),
  ('market:routed:detail'),
  ('market:routed:update'),
  ('market:routed:log-view'),
  ('market:routed:agent-cost-view'),
  ('market:routed:cost-total-view'),
  ('market:routed:agent-channel-view'),
  ('market:routed:column-setting'),
  ('market:routed:update-block'),
  ('market:routed:reroute-block'),
  ('market:routed:log-block'),
  ('market:weekly-routing'),
  ('market:weekly-routing:view'),
  ('market:weekly-routing:detail'),
  ('market:weekly-routing:agent-stats-view'),
  ('market:weekly-routing:channel-mode-stats-view'),
  ('market:weekly-routing:cost-view'),
  ('market:weekly-routing:reroute-stats-view'),
  ('market:weekly-routing:sensitive-stats-view'),
  ('market:weekly-routing:export'),
  ('market:weekly-routing:column-setting');

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-market-v2-dashboard-view', 'market:dashboard:view'),
  ('perm-market-v2-pending-view', 'market:pending-routing:view'),
  ('perm-market-v2-pending-route', 'market:pending-routing:route'),
  ('perm-market-v2-pending-edit', 'market:pending-routing:edit'),
  ('perm-market-v2-pending-approve', 'market:pending-routing:approve'),
  ('perm-market-v2-pending-log-view', 'market:pending-routing:operation-log:view'),
  ('perm-market-v2-pending-cost-view', 'market:pending-routing:business-cost:view'),
  ('perm-market-v2-pending-cost-create', 'market:pending-routing:business-cost:create'),
  ('perm-market-v2-pending-cost-edit', 'market:pending-routing:business-cost:edit'),
  ('perm-market-v2-pending-cost-delete', 'market:pending-routing:business-cost:delete'),
  ('perm-market-v2-pending-return-review', 'market:pending-routing:return-review'),
  ('perm-market-v2-routed-view', 'market:routed:view'),
  ('perm-market-v2-routed-edit', 'market:routed:edit'),
  ('perm-market-v2-routed-reroute', 'market:routed:reroute'),
  ('perm-market-v2-routed-log-view', 'market:routed:routing-log:view'),
  ('perm-market-v2-report-view', 'market:routing-report:view'),
  ('perm-market-v2-report-export', 'market:routing-report:export')
ON CONFLICT ("code") DO NOTHING;

-- Positive legacy grants carry forward only where the corresponding negative
-- block was absent.  Cost mutations were formerly governed by the shared
-- update grant plus one operation-specific block, so each new action is
-- reconstructed independently.
WITH mapping("target", "legacy", "blocked") AS (
  VALUES
    ('market:dashboard:view', ARRAY['market:dashboard:view','market:dashboard:pending-summary','market:dashboard:routed-summary','market:dashboard:weekly-summary','market:dashboard:agent-stats-view','market:dashboard:channel-mode-stats-view','market:dashboard:sensitive-summary-view']::text[], ARRAY[]::text[]),
    ('market:pending-routing:view', ARRAY['market:pending-routing:view','market:pending-routing:detail']::text[], ARRAY[]::text[]),
    ('market:pending-routing:route', ARRAY['market:pending-routing:assign']::text[], ARRAY['market:pending-routing:route-block']::text[]),
    ('market:pending-routing:edit', ARRAY['market:pending-routing:save-draft','market:pending-routing:update']::text[], ARRAY['market:pending-routing:update-block']::text[]),
    ('market:pending-routing:approve', ARRAY['market:pending-routing:confirm','market:pending-routing:audit']::text[], ARRAY['market:pending-routing:audit-block']::text[]),
    ('market:pending-routing:operation-log:view', ARRAY['market:pending-routing:operation-log-view']::text[], ARRAY['market:pending-routing:operation-log-block']::text[]),
    ('market:pending-routing:business-cost:view', ARRAY['market:pending-routing:business-cost-view','market:pending-routing:cost-field-view']::text[], ARRAY[]::text[]),
    ('market:pending-routing:business-cost:create', ARRAY['market:pending-routing:update']::text[], ARRAY['market:pending-routing:business-cost-create-block']::text[]),
    ('market:pending-routing:business-cost:edit', ARRAY['market:pending-routing:update']::text[], ARRAY['market:pending-routing:business-cost-update-block']::text[]),
    ('market:pending-routing:business-cost:delete', ARRAY['market:pending-routing:update']::text[], ARRAY['market:pending-routing:business-cost-delete-block']::text[]),
    ('market:pending-routing:return-review', ARRAY['business:review:edit']::text[], ARRAY['market:pending-routing:reroute-block']::text[]),
    ('market:routed:view', ARRAY['market:routed:view','market:routed:detail']::text[], ARRAY[]::text[]),
    ('market:routed:edit', ARRAY['market:routed:update']::text[], ARRAY['market:routed:update-block']::text[]),
    ('market:routed:reroute', ARRAY['market:routed:reroute']::text[], ARRAY['market:routed:reroute-block']::text[]),
    ('market:routed:routing-log:view', ARRAY['market:routed:log-view']::text[], ARRAY['market:routed:log-block']::text[]),
    ('market:routing-report:view', ARRAY['market:weekly-routing:view','market:weekly-routing:detail','market:weekly-routing:agent-stats-view','market:weekly-routing:channel-mode-stats-view','market:weekly-routing:cost-view','market:weekly-routing:reroute-stats-view','market:weekly-routing:sensitive-stats-view']::text[], ARRAY[]::text[]),
    ('market:routing-report:export', ARRAY['market:weekly-routing:export']::text[], ARRAY[]::text[])
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM mapping
JOIN "_MarketPermissionSnapshot" snapshot ON snapshot."codes" && mapping."legacy"
JOIN "Permission" permission ON permission."code" = mapping."target"
WHERE NOT (snapshot."codes" && mapping."blocked")
  AND (
    mapping."target" <> 'market:pending-routing:route'
    OR snapshot."codes" @> ARRAY['market:pending-routing:assign','market:pending-routing:save-draft']::text[]
  )
  AND (
    mapping."target" <> 'market:pending-routing:approve'
    OR snapshot."codes" @> ARRAY['market:pending-routing:confirm','market:pending-routing:audit']::text[]
  )
  AND (
    mapping."target" <> 'market:pending-routing:edit'
    OR snapshot."codes" && ARRAY['market:pending-routing:update']::text[]
    OR snapshot."codes" @> ARRAY['market:pending-routing:assign','market:pending-routing:save-draft']::text[]
  )
  AND (
    mapping."target" <> 'market:pending-routing:return-review'
    OR snapshot."codes" && ARRAY['market:pending-routing:view','market:pending-routing:detail']::text[]
  )
ON CONFLICT DO NOTHING;

-- The built-in market role previously inherited broad OPERATOR grants.  These
-- three grants bypass the new market site/status decision points, so remove
-- only those obsolete inherited capabilities; other explicitly assigned
-- cross-module permissions remain untouched.
DELETE FROM "_PermissionToRole" link
USING "Role" role, "Permission" permission
WHERE link."B" = role."id"
  AND link."A" = permission."id"
  AND role."name" = 'UG_MARKET'
  AND permission."code" IN (
    'business:shipment:list',
    'business:review:edit',
    'operations:line-shipment:internal-log-view'
  );

-- Actions retain one visible parent page automatically, matching the runtime
-- permission normalizer for API and role-editor callers.
WITH dependency("action", "view") AS (
  VALUES
    ('market:pending-routing:route', 'market:pending-routing:view'),
    ('market:pending-routing:edit', 'market:pending-routing:view'),
    ('market:pending-routing:approve', 'market:pending-routing:view'),
    ('market:pending-routing:operation-log:view', 'market:pending-routing:view'),
    ('market:pending-routing:business-cost:view', 'market:pending-routing:view'),
    ('market:pending-routing:business-cost:create', 'market:pending-routing:view'),
    ('market:pending-routing:business-cost:create', 'market:pending-routing:business-cost:view'),
    ('market:pending-routing:business-cost:edit', 'market:pending-routing:view'),
    ('market:pending-routing:business-cost:edit', 'market:pending-routing:business-cost:view'),
    ('market:pending-routing:business-cost:delete', 'market:pending-routing:view'),
    ('market:pending-routing:business-cost:delete', 'market:pending-routing:business-cost:view'),
    ('market:pending-routing:return-review', 'market:pending-routing:view'),
    ('market:routed:edit', 'market:routed:view'),
    ('market:routed:reroute', 'market:routed:view'),
    ('market:routed:routing-log:view', 'market:routed:view'),
    ('market:routing-report:export', 'market:routing-report:view')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT viewPermission."id", actionLink."B"
FROM dependency
JOIN "Permission" actionPermission ON actionPermission."code" = dependency."action"
JOIN "_PermissionToRole" actionLink ON actionLink."A" = actionPermission."id"
JOIN "Permission" viewPermission ON viewPermission."code" = dependency."view"
ON CONFLICT DO NOTHING;

DELETE FROM "_PermissionToRole" link
USING "Permission" permission, "_MarketLegacyPermissionCleanup" cleanup
WHERE link."A" = permission."id"
  AND permission."code" = cleanup."code";

DELETE FROM "Permission" permission
USING "_MarketLegacyPermissionCleanup" cleanup
WHERE permission."code" = cleanup."code";

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" IN (
    'market:dashboard:view',
    'market:pending-routing:view', 'market:pending-routing:route', 'market:pending-routing:edit', 'market:pending-routing:approve', 'market:pending-routing:operation-log:view', 'market:pending-routing:business-cost:view', 'market:pending-routing:business-cost:create', 'market:pending-routing:business-cost:edit', 'market:pending-routing:business-cost:delete', 'market:pending-routing:return-review',
    'market:routed:view', 'market:routed:edit', 'market:routed:reroute', 'market:routed:routing-log:view',
    'market:routing-report:view', 'market:routing-report:export'
  )) <> 17 THEN
    RAISE EXCEPTION 'canonical market permission catalog was not rebuilt cleanly';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "Permission" permission
    JOIN "_MarketLegacyPermissionCleanup" cleanup ON cleanup."code" = permission."code"
  ) THEN
    RAISE EXCEPTION 'an explicitly retired legacy market permission remains';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "Role" role
    JOIN "_PermissionToRole" link ON link."B" = role."id"
    JOIN "Permission" permission ON permission."id" = link."A"
    WHERE role."name" = 'UG_MARKET'
      AND permission."code" IN (
        'business:shipment:list',
        'business:review:edit',
        'operations:line-shipment:internal-log-view'
      )
  ) THEN
    RAISE EXCEPTION 'built-in market role still has obsolete cross-module bypass grants';
  END IF;
  -- Blank account sites intentionally resolve to the default Shenzhen site
  -- at runtime. Do not reject those legacy accounts or write business data in
  -- this permission-only migration.
  IF EXISTS (
    SELECT 1
    FROM "Shipment" shipment
    JOIN "Customer" customer ON customer."id" = shipment."customerId"
    LEFT JOIN "User" owner ON owner."username" = COALESCE(
      NULLIF(BTRIM(customer."salesperson"), ''),
      NULLIF(BTRIM(shipment."entryBy"), '')
    )
    WHERE shipment."deletedAt" IS NULL
      AND shipment."status" IN (
        'WAITING_SORT', 'WAITING_DISPATCH', 'OUTBOUNDED', 'WAITING_DEPARTURE',
        'DEPARTED', 'ARRIVED_PORT', 'DELIVERING', 'SIGNED'
      )
      AND owner."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'market shipment owner is missing a valid user';
  END IF;
  IF (SELECT "rowCount" FROM "_MarketBusinessRowCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_MarketBusinessRowCounts" WHERE "tableName" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_MarketBusinessRowCounts" WHERE "tableName" = 'AuditLog') <> (SELECT COUNT(*) FROM "AuditLog") THEN
    RAISE EXCEPTION 'market permission migration changed business data rows';
  END IF;
END $$;

COMMIT;
