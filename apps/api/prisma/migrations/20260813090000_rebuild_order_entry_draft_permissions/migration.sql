-- Replace the legacy draft-save grant with three positive draft-box actions.
-- Shipment, finance, user and role business rows are protected and never modified.
CREATE TEMP TABLE "_DraftPermissionSnapshot" (
  "roleId" text PRIMARY KEY,
  "canView" boolean NOT NULL,
  "canEdit" boolean NOT NULL,
  "canDelete" boolean NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE "_DraftBusinessCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;

INSERT INTO "_DraftBusinessCounts" VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

INSERT INTO "_DraftPermissionSnapshot" ("roleId", "canView", "canEdit", "canDelete")
SELECT
  role."id",
  bool_or(permission."code" IN (
    'business:order-entry:draft-view',
    'business:order-entry:draft-save',
    'business:order-entry:draft-edit',
    'business:order-entry:draft-delete'
  )),
  bool_or(permission."code" IN ('business:order-entry:draft-save', 'business:order-entry:draft-edit')),
  bool_or(permission."code" = 'business:order-entry:draft-delete')
FROM "Role" role
JOIN "_PermissionToRole" link ON link."B" = role."id"
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" IN (
  'business:order-entry:draft-view',
  'business:order-entry:draft-save',
  'business:order-entry:draft-edit',
  'business:order-entry:draft-delete'
)
GROUP BY role."id";

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-business-order-entry-draft-view-v2', 'business:order-entry:draft-view'),
  ('perm-business-order-entry-draft-edit-v2', 'business:order-entry:draft-edit'),
  ('perm-business-order-entry-draft-delete-v2', 'business:order-entry:draft-delete'),
  ('perm-business-order-entry-view-v2', 'business:order-entry:view')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_DraftPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:order-entry:draft-view'
WHERE snapshot."canView"
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_DraftPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:order-entry:draft-edit'
WHERE snapshot."canEdit"
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_DraftPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:order-entry:draft-delete'
WHERE snapshot."canDelete"
ON CONFLICT DO NOTHING;

-- Editing a draft reuses the existing order-entry form. Persist its hidden
-- page dependency so authorization still works after a process restart.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_DraftPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:order-entry:view'
WHERE snapshot."canEdit"
ON CONFLICT DO NOTHING;

DELETE FROM "_PermissionToRole"
WHERE "A" IN (SELECT "id" FROM "Permission" WHERE "code" = 'business:order-entry:draft-save');
DELETE FROM "Permission" WHERE "code" = 'business:order-entry:draft-save';

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" IN (
    'business:order-entry:draft-view',
    'business:order-entry:draft-edit',
    'business:order-entry:draft-delete'
  )) <> 3
    OR EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'business:order-entry:draft-save') THEN
    RAISE EXCEPTION 'order-entry draft permission catalog was not rebuilt cleanly';
  END IF;
  IF (SELECT "rowCount" FROM "_DraftBusinessCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_DraftBusinessCounts" WHERE "tableName" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_DraftBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_DraftBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN
    RAISE EXCEPTION 'order-entry draft permission rebuild modified protected business rows';
  END IF;
END $$;
