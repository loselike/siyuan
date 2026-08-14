-- Replace module-scoped field masks with six canonical global deny rules.
-- Only Permission and its Role relation may change; protected business tables
-- are counted before and after as a hard migration guard.
CREATE TEMP TABLE "_GlobalMaskSnapshot" (
  "roleId" text NOT NULL,
  "maskKey" text NOT NULL,
  PRIMARY KEY ("roleId", "maskKey")
) ON COMMIT DROP;
CREATE TEMP TABLE "_GlobalMaskBusinessCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_GlobalMaskBusinessCounts" VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('Customer', (SELECT COUNT(*) FROM "Customer")),
  ('Agent', (SELECT COUNT(*) FROM "Agent")),
  ('PriceBook', (SELECT COUNT(*) FROM "PriceBook")),
  ('WarehousePackage', (SELECT COUNT(*) FROM "WarehousePackage")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Permission"
    WHERE "code" LIKE 'system:workspace-mask:%'
      AND "code" NOT IN (
        'system:workspace-mask:operations:agent-short-name',
        'system:workspace-mask:operations:agent-company-name',
        'system:workspace-mask:operations:agent-channel',
        'system:workspace-mask:operations:agent-data',
        'system:workspace-mask:operations:payable-cost',
        'system:workspace-mask:operations:payable-status'
      )
  ) THEN
    RAISE EXCEPTION 'unknown legacy workspace mask exists; migration stopped before cleanup';
  END IF;
END $$;

INSERT INTO "_GlobalMaskSnapshot" ("roleId", "maskKey")
SELECT link."B", split_part(permission."code", ':', 4)
FROM "_PermissionToRole" link
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" LIKE 'system:workspace-mask:%'
  AND split_part(permission."code", ':', 4) IN (
    'agent-short-name','agent-company-name','agent-channel','agent-data','payable-cost','payable-status'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-global-mask-agent-short-name', 'system:global-mask:agent-short-name'),
  ('perm-global-mask-agent-company-name', 'system:global-mask:agent-company-name'),
  ('perm-global-mask-agent-channel', 'system:global-mask:agent-channel'),
  ('perm-global-mask-agent-data', 'system:global-mask:agent-data'),
  ('perm-global-mask-payable-cost', 'system:global-mask:payable-cost'),
  ('perm-global-mask-payable-status', 'system:global-mask:payable-status')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_GlobalMaskSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'system:global-mask:' || snapshot."maskKey"
ON CONFLICT DO NOTHING;

-- The composite deny is stored with its three visible dependencies so every
-- client sees the same conflict-free state without additional checkboxes.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_GlobalMaskSnapshot" snapshot
CROSS JOIN "Permission" permission
WHERE snapshot."maskKey" = 'agent-data'
  AND permission."code" IN (
    'system:global-mask:agent-short-name',
    'system:global-mask:agent-company-name',
    'system:global-mask:agent-channel'
  )
ON CONFLICT DO NOTHING;

DELETE FROM "_PermissionToRole"
WHERE "A" IN (SELECT "id" FROM "Permission" WHERE "code" LIKE 'system:workspace-mask:%');
DELETE FROM "Permission" WHERE "code" LIKE 'system:workspace-mask:%';

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" LIKE 'system:global-mask:%') <> 6 THEN
    RAISE EXCEPTION 'global field mask catalog was not rebuilt cleanly';
  END IF;
  IF EXISTS (SELECT 1 FROM "Permission" WHERE "code" LIKE 'system:workspace-mask:%') THEN
    RAISE EXCEPTION 'legacy workspace field mask permission remains';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "_GlobalMaskSnapshot" snapshot
    WHERE NOT EXISTS (
      SELECT 1
      FROM "_PermissionToRole" link
      JOIN "Permission" permission ON permission."id" = link."A"
      WHERE link."B" = snapshot."roleId"
        AND permission."code" = 'system:global-mask:' || snapshot."maskKey"
    )
  ) THEN
    RAISE EXCEPTION 'legacy global field mask relation was not preserved';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "_PermissionToRole" compositeLink
    JOIN "Permission" compositePermission ON compositePermission."id" = compositeLink."A"
    WHERE compositePermission."code" = 'system:global-mask:agent-data'
      AND EXISTS (
        SELECT 1 FROM unnest(ARRAY[
          'system:global-mask:agent-short-name',
          'system:global-mask:agent-company-name',
          'system:global-mask:agent-channel'
        ]) dependency("code")
        WHERE NOT EXISTS (
          SELECT 1 FROM "_PermissionToRole" dependencyLink
          JOIN "Permission" dependencyPermission ON dependencyPermission."id" = dependencyLink."A"
          WHERE dependencyLink."B" = compositeLink."B"
            AND dependencyPermission."code" = dependency."code"
        )
      )
  ) THEN
    RAISE EXCEPTION 'agent-data composite mask is missing a dependency';
  END IF;
  IF (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'Customer') <> (SELECT COUNT(*) FROM "Customer")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'Agent') <> (SELECT COUNT(*) FROM "Agent")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'PriceBook') <> (SELECT COUNT(*) FROM "PriceBook")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'WarehousePackage') <> (SELECT COUNT(*) FROM "WarehousePackage")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'AuditLog') <> (SELECT COUNT(*) FROM "AuditLog")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_GlobalMaskBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN
    RAISE EXCEPTION 'global field mask migration modified protected business rows';
  END IF;
END $$;
