-- Enforce every historical warehouse receipt deny recorded for a role.  This
-- union is conservative: a former explicit deny is never widened by migration;
-- administrators can deliberately grant the new positive action afterwards.
CREATE TEMP TABLE "_WarehouseDenyEnforceCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;
INSERT INTO "_WarehouseDenyEnforceCounts" VALUES
  ('WarehousePackage', (SELECT COUNT(*) FROM "WarehousePackage")),
  ('WarehouseTallyTask', (SELECT COUNT(*) FROM "WarehouseTallyTask")),
  ('WarehouseRentRule', (SELECT COUNT(*) FROM "WarehouseRentRule")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

WITH historical_denies AS (
  SELECT audit."target", jsonb_agg(DISTINCT permission."code") AS "codes"
  FROM "AuditLog" audit
  CROSS JOIN LATERAL jsonb_array_elements_text(audit."after"::jsonb) permission("code")
  WHERE audit."action" IN ('system.role_permissions.update', 'system.role_permissions.copy')
    AND audit."target" LIKE 'role:%'
    AND jsonb_typeof(audit."after"::jsonb) = 'array'
    AND permission."code" LIKE 'warehouse:%block%'
  GROUP BY audit."target"
), denied("blocker", "actions") AS (
  VALUES
    ('warehouse:today-receipt:manual-create-block', ARRAY['warehouse:today-receipt:manual-create']::text[]),
    ('warehouse:today-receipt:batch-import-block', ARRAY['warehouse:today-receipt:import','warehouse:in-stock:import']::text[]),
    ('warehouse:today-receipt:batch-download-block', ARRAY['warehouse:today-receipt:export']::text[])
), blocked_role_actions AS (
  SELECT role."id" AS "roleId", unnest(denied."actions") AS "code"
  FROM historical_denies state
  JOIN "Role" role ON state."target" = 'role:' || role."name"
  CROSS JOIN denied
  WHERE state."codes" @> to_jsonb(ARRAY[denied."blocker"]::text[])
)
DELETE FROM "_PermissionToRole" link
USING blocked_role_actions blocked, "Permission" permission
WHERE link."B" = blocked."roleId"
  AND link."A" = permission."id"
  AND permission."code" = blocked."code";

DO $$
BEGIN
  IF (SELECT "rowCount" FROM "_WarehouseDenyEnforceCounts" WHERE "tableName" = 'WarehousePackage') <> (SELECT COUNT(*) FROM "WarehousePackage") OR (SELECT "rowCount" FROM "_WarehouseDenyEnforceCounts" WHERE "tableName" = 'WarehouseTallyTask') <> (SELECT COUNT(*) FROM "WarehouseTallyTask") OR (SELECT "rowCount" FROM "_WarehouseDenyEnforceCounts" WHERE "tableName" = 'WarehouseRentRule') <> (SELECT COUNT(*) FROM "WarehouseRentRule") OR (SELECT "rowCount" FROM "_WarehouseDenyEnforceCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment") OR (SELECT "rowCount" FROM "_WarehouseDenyEnforceCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User") OR (SELECT "rowCount" FROM "_WarehouseDenyEnforceCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN RAISE EXCEPTION 'warehouse deny enforcement modified protected business rows'; END IF;
END $$;
