-- Align the unfinished-tally permission catalog with the user-visible page
-- functions. Only Permission and Role<->Permission links may change.
CREATE TEMP TABLE "_PendingTallyBusinessCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_PendingTallyBusinessCounts" VALUES
  ('WarehousePackage', (SELECT COUNT(*) FROM "WarehousePackage")),
  ('WarehouseTallyTask', (SELECT COUNT(*) FROM "WarehouseTallyTask")),
  ('WarehouseRentRule', (SELECT COUNT(*) FROM "WarehouseRentRule")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

CREATE TEMP TABLE "_PendingTallyLegacyGrantCounts" (
  "permissionCode" text PRIMARY KEY,
  "roleCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_PendingTallyLegacyGrantCounts" ("permissionCode", "roleCount")
SELECT permission."code", COUNT(permissionLink."B")
FROM "Permission" permission
LEFT JOIN "_PermissionToRole" permissionLink ON permissionLink."A" = permission."id"
WHERE permission."code" IN (
  'warehouse:tally-pending:cancel',
  'warehouse:tally-pending:complete-and-ship'
)
GROUP BY permission."code";

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-wh-pending-detail-v3', 'warehouse:tally-pending:detail'),
  ('perm-wh-pending-start-v3', 'warehouse:tally-pending:start'),
  ('perm-wh-pending-restart-v3', 'warehouse:tally-pending:restart'),
  ('perm-wh-pending-sort-rule-v3', 'warehouse:tally-pending:sort-rule-manage'),
  ('perm-wh-pending-problem-view-v3', 'warehouse:tally-pending:problem-view'),
  ('perm-wh-pending-shipment-v3', 'warehouse:tally-pending:shipment-create')
ON CONFLICT ("code") DO NOTHING;

-- Preserve every existing observable capability while splitting the old
-- bundled grants into the new independent actions.
WITH mapping("target", "source") AS (
  VALUES
    ('warehouse:tally-pending:detail', 'warehouse:tally-pending:view'),
    ('warehouse:tally-pending:problem-view', 'warehouse:tally-pending:view'),
    ('warehouse:tally-pending:sort-rule-manage', 'warehouse:tally-pending:edit'),
    ('warehouse:tally-pending:start', 'warehouse:tally-pending:process'),
    ('warehouse:tally-pending:shipment-create', 'warehouse:tally-pending:complete-and-ship'),
    ('warehouse:tally-pending:restart', 'warehouse:tally-pending:cancel')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT targetPermission."id", sourceLink."B"
FROM mapping
JOIN "Permission" sourcePermission ON sourcePermission."code" = mapping."source"
JOIN "_PermissionToRole" sourceLink ON sourceLink."A" = sourcePermission."id"
JOIN "Permission" targetPermission ON targetPermission."code" = mapping."target"
ON CONFLICT DO NOTHING;

-- Action grants require the ordinary pending-task page. The problem pool is a
-- separate read resource and deliberately does not imply the ordinary list.
WITH dependency("action") AS (
  VALUES
    ('warehouse:tally-pending:detail'),
    ('warehouse:tally-pending:edit'),
    ('warehouse:tally-pending:start'),
    ('warehouse:tally-pending:process'),
    ('warehouse:tally-pending:restart'),
    ('warehouse:tally-pending:sort-rule-manage')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT viewPermission."id", actionLink."B"
FROM dependency
JOIN "Permission" actionPermission ON actionPermission."code" = dependency."action"
JOIN "_PermissionToRole" actionLink ON actionLink."A" = actionPermission."id"
JOIN "Permission" viewPermission ON viewPermission."code" = 'warehouse:tally-pending:view'
ON CONFLICT DO NOTHING;

-- Keep the two legacy grants only through this migration-before-restart
-- cutover. Every current endpoint is switched to process/restart or the
-- non-assignable shipment-create compatibility capability in the same release;
-- a follow-up migration removes the obsolete assignments after the new API is live.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "_PendingTallyLegacyGrantCounts" beforeCount
    JOIN "Permission" permission ON permission."code" = beforeCount."permissionCode"
    LEFT JOIN "_PermissionToRole" permissionLink ON permissionLink."A" = permission."id"
    GROUP BY beforeCount."permissionCode", beforeCount."roleCount"
    HAVING COUNT(permissionLink."B") <> beforeCount."roleCount"
  ) THEN
    RAISE EXCEPTION 'pending tally migration changed a hidden compatibility grant';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_PermissionToRole" actionLink
    JOIN "Permission" actionPermission ON actionPermission."id" = actionLink."A"
    WHERE actionPermission."code" IN (
      'warehouse:tally-pending:detail',
      'warehouse:tally-pending:edit',
      'warehouse:tally-pending:start',
      'warehouse:tally-pending:process',
      'warehouse:tally-pending:restart',
      'warehouse:tally-pending:sort-rule-manage'
    )
      AND NOT EXISTS (
        SELECT 1
        FROM "_PermissionToRole" viewLink
        JOIN "Permission" viewPermission ON viewPermission."id" = viewLink."A"
        WHERE viewLink."B" = actionLink."B"
          AND viewPermission."code" = 'warehouse:tally-pending:view'
      )
  ) THEN
    RAISE EXCEPTION 'pending tally action exists without its page view dependency';
  END IF;

  IF (SELECT "rowCount" FROM "_PendingTallyBusinessCounts" WHERE "tableName" = 'WarehousePackage') <> (SELECT COUNT(*) FROM "WarehousePackage")
    OR (SELECT "rowCount" FROM "_PendingTallyBusinessCounts" WHERE "tableName" = 'WarehouseTallyTask') <> (SELECT COUNT(*) FROM "WarehouseTallyTask")
    OR (SELECT "rowCount" FROM "_PendingTallyBusinessCounts" WHERE "tableName" = 'WarehouseRentRule') <> (SELECT COUNT(*) FROM "WarehouseRentRule")
    OR (SELECT "rowCount" FROM "_PendingTallyBusinessCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_PendingTallyBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_PendingTallyBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role")
  THEN
    RAISE EXCEPTION 'pending tally permission migration modified protected business rows';
  END IF;
END $$;
