-- Collapse the pending-review module to two positive business capabilities.
-- Shipment and finance business rows are guarded by before/after counts.
CREATE TEMP TABLE "_PendingReviewPermissionSnapshot" (
  "roleId" text PRIMARY KEY,
  "canView" boolean NOT NULL,
  "canEdit" boolean NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE "_PendingReviewBusinessCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;

INSERT INTO "_PendingReviewBusinessCounts" VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('WarehousePackage', (SELECT COUNT(*) FROM "WarehousePackage")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

INSERT INTO "_PendingReviewPermissionSnapshot" ("roleId", "canView", "canEdit")
SELECT
  role."id",
  bool_or(permission."code" LIKE 'business:review:%'),
  bool_or(permission."code" = 'business:review:edit') OR (
    bool_or(permission."code" IN (
      'business:review:approve', 'business:review:reject', 'business:review:reverse',
      'business:review:delete', 'business:review:restore', 'business:review:purge'
    ))
    AND bool_or(permission."code" = 'business:shipment:update-basic')
  )
FROM "Role" role
JOIN "_PermissionToRole" link ON link."B" = role."id"
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" LIKE 'business:review:%'
   OR permission."code" = 'business:shipment:update-basic'
GROUP BY role."id"
HAVING bool_or(permission."code" LIKE 'business:review:%');

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-business-review-view-v2', 'business:review:view'),
  ('perm-business-review-edit-v2', 'business:review:edit')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_PendingReviewPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:review:view'
WHERE snapshot."canView" OR snapshot."canEdit"
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_PendingReviewPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:review:edit'
WHERE snapshot."canEdit"
ON CONFLICT DO NOTHING;

-- One visible edit checkbox must supply the reference data used by the editor.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT dependency."id", snapshot."roleId"
FROM "_PendingReviewPermissionSnapshot" snapshot
JOIN "Permission" dependency ON dependency."code" IN ('master-data:customers:read', 'master-data:channels:read')
WHERE snapshot."canEdit"
ON CONFLICT DO NOTHING;

DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT "id" FROM "Permission"
  WHERE "code" IN (
    'business:review:list', 'business:review:detail', 'business:review:deleted-list',
    'business:review:approve', 'business:review:reject', 'business:review:reverse',
    'business:review:delete', 'business:review:restore', 'business:review:purge',
    'business:review:finance-detail-view', 'business:review:operation-log-view'
  )
);
DELETE FROM "Permission"
WHERE "code" IN (
  'business:review:list', 'business:review:detail', 'business:review:deleted-list',
  'business:review:approve', 'business:review:reject', 'business:review:reverse',
  'business:review:delete', 'business:review:restore', 'business:review:purge',
  'business:review:finance-detail-view', 'business:review:operation-log-view'
);

DO $$
DECLARE
  changed_table text;
BEGIN
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" LIKE 'business:review:%') <> 2
    OR NOT EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'business:review:view')
    OR NOT EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'business:review:edit')
    OR EXISTS (
      SELECT 1
      FROM "_PermissionToRole" edit_link
      JOIN "Permission" edit_permission ON edit_permission."id" = edit_link."A" AND edit_permission."code" = 'business:review:edit'
      WHERE NOT EXISTS (
        SELECT 1
        FROM "_PermissionToRole" view_link
        JOIN "Permission" view_permission ON view_permission."id" = view_link."A" AND view_permission."code" = 'business:review:view'
        WHERE view_link."B" = edit_link."B"
      )
    ) THEN
    RAISE EXCEPTION 'pending-review permission catalog was not rebuilt cleanly';
  END IF;

  SELECT snapshot."tableName" INTO changed_table
  FROM "_PendingReviewBusinessCounts" snapshot
  WHERE snapshot."rowCount" <> CASE snapshot."tableName"
    WHEN 'Shipment' THEN (SELECT COUNT(*) FROM "Shipment")
    WHEN 'ShipmentFinanceItem' THEN (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    WHEN 'WarehousePackage' THEN (SELECT COUNT(*) FROM "WarehousePackage")
    WHEN 'User' THEN (SELECT COUNT(*) FROM "User")
    WHEN 'Role' THEN (SELECT COUNT(*) FROM "Role")
  END
  LIMIT 1;
  IF changed_table IS NOT NULL THEN
    RAISE EXCEPTION 'pending-review permission migration changed business table %', changed_table;
  END IF;
END $$;
