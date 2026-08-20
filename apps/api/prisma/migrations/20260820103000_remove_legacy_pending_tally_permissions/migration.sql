-- Finish the unfinished-tally permission cutover after the canonical API is
-- online. Re-map legacy grants once more, then remove the obsolete catalog
-- entries. Only Permission and Role<->Permission links may change.
BEGIN;

-- Use the same transaction-scoped mutex as the API role-save/copy paths. The
-- lock is the first statement so every following READ COMMITTED statement
-- observes role grants only after any in-flight save has completed.
SELECT pg_advisory_xact_lock(
  hashtextextended('system-role-permissions-and-direct-managers', 0)
);

CREATE TEMP TABLE "_PendingTallyCleanupBusinessCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_PendingTallyCleanupBusinessCounts" VALUES
  ('WarehousePackage', (SELECT COUNT(*) FROM "WarehousePackage")),
  ('WarehouseTallyTask', (SELECT COUNT(*) FROM "WarehouseTallyTask")),
  ('WarehouseRentRule', (SELECT COUNT(*) FROM "WarehouseRentRule")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

CREATE TEMP TABLE "_PendingTallyCleanupMappings" (
  "target" text NOT NULL,
  "source" text NOT NULL,
  PRIMARY KEY ("target", "source")
) ON COMMIT DROP;

INSERT INTO "_PendingTallyCleanupMappings" ("target", "source") VALUES
  ('warehouse:tally-pending:shipment-create', 'warehouse:tally-pending:complete-and-ship'),
  ('warehouse:tally-pending:restart', 'warehouse:tally-pending:cancel');

-- Re-run only the two legacy compatibility mappings immediately before
-- cleanup. The four other phase-one mapping targets are independently
-- configurable after phase one and must not be re-derived from their parents.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT targetPermission."id", sourceLink."B"
FROM "_PendingTallyCleanupMappings" mapping
JOIN "Permission" sourcePermission ON sourcePermission."code" = mapping."source"
JOIN "_PermissionToRole" sourceLink ON sourceLink."A" = sourcePermission."id"
JOIN "Permission" targetPermission ON targetPermission."code" = mapping."target"
ON CONFLICT DO NOTHING;

-- Canonical operational actions require the ordinary pending-task page. The
-- separate problem pool and hidden shipment capability deliberately do not.
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "_PendingTallyCleanupMappings" mapping
    JOIN "Permission" sourcePermission ON sourcePermission."code" = mapping."source"
    JOIN "_PermissionToRole" sourceLink ON sourceLink."A" = sourcePermission."id"
    WHERE NOT EXISTS (
      SELECT 1
      FROM "Permission" targetPermission
      JOIN "_PermissionToRole" targetLink ON targetLink."A" = targetPermission."id"
      WHERE targetPermission."code" = mapping."target"
        AND targetLink."B" = sourceLink."B"
    )
  ) THEN
    RAISE EXCEPTION 'pending tally cleanup did not preserve every legacy grant';
  END IF;
END $$;

DELETE FROM "_PermissionToRole" permissionLink
USING "Permission" permission
WHERE permissionLink."A" = permission."id"
  AND permission."code" IN (
    'warehouse:tally-pending:cancel',
    'warehouse:tally-pending:complete-and-ship'
  );

DELETE FROM "Permission"
WHERE "code" IN (
  'warehouse:tally-pending:cancel',
  'warehouse:tally-pending:complete-and-ship'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Permission"
    WHERE "code" IN (
      'warehouse:tally-pending:cancel',
      'warehouse:tally-pending:complete-and-ship'
    )
  ) THEN
    RAISE EXCEPTION 'legacy pending tally permissions remain';
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

  IF (SELECT "rowCount" FROM "_PendingTallyCleanupBusinessCounts" WHERE "tableName" = 'WarehousePackage') <> (SELECT COUNT(*) FROM "WarehousePackage")
    OR (SELECT "rowCount" FROM "_PendingTallyCleanupBusinessCounts" WHERE "tableName" = 'WarehouseTallyTask') <> (SELECT COUNT(*) FROM "WarehouseTallyTask")
    OR (SELECT "rowCount" FROM "_PendingTallyCleanupBusinessCounts" WHERE "tableName" = 'WarehouseRentRule') <> (SELECT COUNT(*) FROM "WarehouseRentRule")
    OR (SELECT "rowCount" FROM "_PendingTallyCleanupBusinessCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_PendingTallyCleanupBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_PendingTallyCleanupBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role")
  THEN
    RAISE EXCEPTION 'pending tally permission cleanup modified protected business rows';
  END IF;
END $$;

COMMIT;
