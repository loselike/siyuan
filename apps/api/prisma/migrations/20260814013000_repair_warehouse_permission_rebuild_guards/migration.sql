-- Repair roles whose latest pre-rebuild permission snapshot explicitly denied
-- a warehouse receipt action.  The base rebuild now handles these denials for
-- fresh databases; this migration repairs environments where the rebuild was
-- already applied before the deny guards were added.
CREATE TEMP TABLE "_WarehouseRepairBusinessCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;
INSERT INTO "_WarehouseRepairBusinessCounts" VALUES
  ('WarehousePackage', (SELECT COUNT(*) FROM "WarehousePackage")),
  ('WarehouseTallyTask', (SELECT COUNT(*) FROM "WarehouseTallyTask")),
  ('WarehouseRentRule', (SELECT COUNT(*) FROM "WarehouseRentRule")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

WITH latest_role_state AS (
  SELECT DISTINCT ON (audit."target") audit."target", audit."before"
  FROM "AuditLog" audit
  WHERE audit."action" IN ('system.role_permissions.update', 'system.role_permissions.copy')
    AND audit."target" LIKE 'role:%'
    AND jsonb_typeof(audit."before"::jsonb) = 'array'
  ORDER BY audit."target", audit."createdAt" DESC
), denied("blocker", "actions") AS (
  VALUES
    ('warehouse:today-receipt:manual-create-block', ARRAY['warehouse:today-receipt:manual-create']::text[]),
    ('warehouse:today-receipt:batch-import-block', ARRAY['warehouse:today-receipt:import','warehouse:in-stock:import']::text[]),
    ('warehouse:today-receipt:batch-download-block', ARRAY['warehouse:today-receipt:export']::text[])
), blocked_role_actions AS (
  SELECT role."id" AS "roleId", unnest(denied."actions") AS "code"
  FROM latest_role_state state
  JOIN "Role" role ON state."target" = 'role:' || role."name"
  CROSS JOIN denied
  WHERE state."before"::jsonb @> to_jsonb(ARRAY[denied."blocker"]::text[])
)
DELETE FROM "_PermissionToRole" link
USING blocked_role_actions blocked, "Permission" permission
WHERE link."B" = blocked."roleId"
  AND link."A" = permission."id"
  AND permission."code" = blocked."code";

DO $$
BEGIN
  IF (SELECT "rowCount" FROM "_WarehouseRepairBusinessCounts" WHERE "tableName" = 'WarehousePackage') <> (SELECT COUNT(*) FROM "WarehousePackage") OR (SELECT "rowCount" FROM "_WarehouseRepairBusinessCounts" WHERE "tableName" = 'WarehouseTallyTask') <> (SELECT COUNT(*) FROM "WarehouseTallyTask") OR (SELECT "rowCount" FROM "_WarehouseRepairBusinessCounts" WHERE "tableName" = 'WarehouseRentRule') <> (SELECT COUNT(*) FROM "WarehouseRentRule") OR (SELECT "rowCount" FROM "_WarehouseRepairBusinessCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment") OR (SELECT "rowCount" FROM "_WarehouseRepairBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User") OR (SELECT "rowCount" FROM "_WarehouseRepairBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN RAISE EXCEPTION 'warehouse permission repair modified protected business rows'; END IF;
END $$;
