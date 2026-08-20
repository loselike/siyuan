-- Add the audited market agent-replacement capability. The shipment number and
-- all existing business rows remain untouched. Payable billing metadata already
-- exists from 20260808120000_business_cost_billing_units, so this migration only
-- extends the permission catalog.
BEGIN;

CREATE TEMP TABLE "_AgentReplacementRowCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_AgentReplacementRowCounts" ("tableName", "rowCount") VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog"));

INSERT INTO "Permission" ("id", "code")
VALUES ('perm-market-v2-routed-replace-agent', 'market:routed:replace-agent')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" permission
JOIN "Role" role ON role."name" = 'UG_MARKET'
WHERE permission."code" = 'market:routed:replace-agent'
ON CONFLICT DO NOTHING;

-- The action always carries its parent page for both built-in and custom roles.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT viewPermission."id", actionLink."B"
FROM "Permission" actionPermission
JOIN "_PermissionToRole" actionLink ON actionLink."A" = actionPermission."id"
JOIN "Permission" viewPermission ON viewPermission."code" = 'market:routed:view'
WHERE actionPermission."code" = 'market:routed:replace-agent'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'market:routed:replace-agent') THEN
    RAISE EXCEPTION 'market routed replace-agent permission was not created';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM "Role" role
    JOIN "_PermissionToRole" link ON link."B" = role."id"
    JOIN "Permission" permission ON permission."id" = link."A"
    WHERE role."name" = 'UG_MARKET'
      AND permission."code" = 'market:routed:replace-agent'
  ) THEN
    RAISE EXCEPTION 'built-in market role was not granted replace-agent';
  END IF;
  IF (SELECT "rowCount" FROM "_AgentReplacementRowCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_AgentReplacementRowCounts" WHERE "tableName" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_AgentReplacementRowCounts" WHERE "tableName" = 'AuditLog') <> (SELECT COUNT(*) FROM "AuditLog") THEN
    RAISE EXCEPTION 'agent replacement migration changed business data rows';
  END IF;
END $$;

COMMIT;
