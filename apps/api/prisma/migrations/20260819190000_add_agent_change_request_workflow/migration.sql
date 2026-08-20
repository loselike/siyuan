-- Replace the market-only routed edit with an audited customer-service request
-- and market resolution workflow. Business rows and shipment status are not
-- changed by this permission migration.
BEGIN;

CREATE TEMP TABLE "_AgentChangeRequestRowCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_AgentChangeRequestRowCounts" ("tableName", "rowCount") VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog"));

INSERT INTO "Permission" ("id", "code")
VALUES ('perm-cs-transfer-request-agent-change', 'customer-service:transfer:request-agent-change')
ON CONFLICT ("code") DO NOTHING;

-- Existing roles that can fill transfer numbers receive the new observable
-- customer-service action. Its parent view permission remains required.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT requestPermission."id", writeLink."B"
FROM "Permission" writePermission
JOIN "_PermissionToRole" writeLink ON writeLink."A" = writePermission."id"
JOIN "Permission" requestPermission ON requestPermission."code" = 'customer-service:transfer:request-agent-change'
WHERE writePermission."code" = 'customer-service:transfer:write'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT viewPermission."id", requestLink."B"
FROM "Permission" requestPermission
JOIN "_PermissionToRole" requestLink ON requestLink."A" = requestPermission."id"
JOIN "Permission" viewPermission ON viewPermission."code" = 'customer-service:transfer:view'
WHERE requestPermission."code" = 'customer-service:transfer:request-agent-change'
ON CONFLICT DO NOTHING;

-- The old button/API path is intentionally retired; market changes now require
-- a pending customer-service request and the existing replace-agent capability.
DELETE FROM "_PermissionToRole"
WHERE "A" IN (SELECT "id" FROM "Permission" WHERE "code" = 'market:routed:edit');

DELETE FROM "Permission" WHERE "code" = 'market:routed:edit';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Permission"
    WHERE "code" = 'customer-service:transfer:request-agent-change'
  ) THEN
    RAISE EXCEPTION 'customer-service agent-change request permission was not created';
  END IF;
  IF EXISTS (SELECT 1 FROM "Permission" WHERE "code" = 'market:routed:edit') THEN
    RAISE EXCEPTION 'retired market:routed:edit permission still exists';
  END IF;
  IF (SELECT "rowCount" FROM "_AgentChangeRequestRowCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_AgentChangeRequestRowCounts" WHERE "tableName" = 'ShipmentFinanceItem') <> (SELECT COUNT(*) FROM "ShipmentFinanceItem")
    OR (SELECT "rowCount" FROM "_AgentChangeRequestRowCounts" WHERE "tableName" = 'AuditLog') <> (SELECT COUNT(*) FROM "AuditLog") THEN
    RAISE EXCEPTION 'agent change request migration changed business data rows';
  END IF;
END $$;

COMMIT;
