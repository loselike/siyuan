-- Rebuild order-entry authorization as three positive business capabilities.
-- No shipment, finance, user or role business row is modified.
CREATE TEMP TABLE "_OrderEntryPermissionSnapshot" (
  "roleId" text PRIMARY KEY,
  "canEdit" boolean NOT NULL,
  "canBusinessCost" boolean NOT NULL,
  "canPayableFee" boolean NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE "_OrderEntryBusinessCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;

INSERT INTO "_OrderEntryBusinessCounts" VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

INSERT INTO "_OrderEntryPermissionSnapshot" ("roleId", "canEdit", "canBusinessCost", "canPayableFee")
SELECT
  role."id",
  bool_or(permission."code" IN ('business:order-entry:create', 'business:order-entry:draft-edit', 'business:order-entry:edit')),
  bool_or(permission."code" IN ('business:order-entry:business-cost-write', 'business:order-entry:business-cost'))
    OR (bool_or(permission."code" = 'business:order-entry:view') AND NOT bool_or(permission."code" = 'business:order-entry:business-cost-mask')),
  bool_or(permission."code" = 'business:order-entry:payable-fee')
    OR (bool_or(permission."code" = 'business:order-entry:view') AND NOT bool_or(permission."code" = 'business:order-entry:payable-fee-mask'))
FROM "Role" role
JOIN "_PermissionToRole" link ON link."B" = role."id"
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" IN (
  'business:order-entry:view', 'business:order-entry:create', 'business:order-entry:draft-edit', 'business:order-entry:edit',
  'business:order-entry:business-cost', 'business:order-entry:business-cost-view',
  'business:order-entry:business-cost-write', 'business:order-entry:business-cost-mask',
  'business:order-entry:payable-fee', 'business:order-entry:payable-fee-mask'
)
GROUP BY role."id";

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-business-order-entry-edit-v2', 'business:order-entry:edit'),
  ('perm-business-order-entry-business-cost-v2', 'business:order-entry:business-cost'),
  ('perm-business-order-entry-payable-fee-v2', 'business:order-entry:payable-fee')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_OrderEntryPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:order-entry:edit'
WHERE snapshot."canEdit"
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_OrderEntryPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:order-entry:business-cost'
WHERE snapshot."canBusinessCost"
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM "_OrderEntryPermissionSnapshot" snapshot
JOIN "Permission" permission ON permission."code" = 'business:order-entry:payable-fee'
WHERE snapshot."canPayableFee"
ON CONFLICT DO NOTHING;

-- Persist hidden prerequisites so one visible checkbox is sufficient even for
-- callers that read stored role links directly instead of runtime normalization.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT dependency."id", snapshot."roleId"
FROM "_OrderEntryPermissionSnapshot" snapshot
JOIN "Permission" dependency ON dependency."code" IN ('business:order-entry:view', 'business:order-entry:draft-view')
WHERE snapshot."canEdit" OR snapshot."canBusinessCost" OR snapshot."canPayableFee"
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT dependency."id", snapshot."roleId"
FROM "_OrderEntryPermissionSnapshot" snapshot
JOIN "Permission" dependency ON dependency."code" IN (
  'business:order-entry:create',
  'business:order-entry:warehouse-package-select',
  'business:order-entry:draft-edit',
  'business:order-entry:submit-review',
  'business:order-entry:invoice-upload',
  'business:order-entry:label-upload'
)
WHERE snapshot."canEdit"
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT dependency."id", snapshot."roleId"
FROM "_OrderEntryPermissionSnapshot" snapshot
JOIN "Permission" dependency ON dependency."code" = 'master-data:agents:read'
WHERE snapshot."canBusinessCost" OR snapshot."canPayableFee"
ON CONFLICT DO NOTHING;

DELETE FROM "_PermissionToRole"
WHERE "A" IN (SELECT "id" FROM "Permission" WHERE "code" IN (
  'business:order-entry:business-cost-view',
  'business:order-entry:business-cost-write',
  'business:order-entry:business-cost-mask',
  'business:order-entry:payable-fee-mask'
));
DELETE FROM "Permission" WHERE "code" IN (
  'business:order-entry:business-cost-view',
  'business:order-entry:business-cost-write',
  'business:order-entry:business-cost-mask',
  'business:order-entry:payable-fee-mask'
);

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" IN (
    'business:order-entry:edit',
    'business:order-entry:business-cost',
    'business:order-entry:payable-fee'
  )) <> 3
    OR EXISTS (SELECT 1 FROM "Permission" WHERE "code" IN (
      'business:order-entry:business-cost-view',
      'business:order-entry:business-cost-write',
      'business:order-entry:business-cost-mask',
      'business:order-entry:payable-fee-mask'
    )) THEN
    RAISE EXCEPTION 'order-entry permission catalog was not rebuilt cleanly';
  END IF;
  IF (SELECT "rowCount" FROM "_OrderEntryBusinessCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_OrderEntryBusinessCounts" WHERE "tableName" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_OrderEntryBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_OrderEntryBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN
    RAISE EXCEPTION 'order-entry permission rebuild modified protected business rows';
  END IF;
END $$;
