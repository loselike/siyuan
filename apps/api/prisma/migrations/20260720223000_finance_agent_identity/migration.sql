ALTER TABLE "ShipmentFinanceItem" ADD COLUMN "agentId" TEXT;
ALTER TABLE "PaymentVoucher" ADD COLUMN "agentId" TEXT;

WITH "AgentIdentity" AS (
  SELECT "id", "name", btrim("name") AS "identity" FROM "Agent" WHERE btrim("name") <> ''
  UNION ALL
  SELECT "id", "name", btrim("shortName") AS "identity" FROM "Agent" WHERE "shortName" IS NOT NULL AND btrim("shortName") <> ''
),
"UniqueAgentIdentity" AS (
  SELECT MIN("id") AS "id", MIN("name") AS "name", "identity"
  FROM "AgentIdentity"
  GROUP BY "identity"
  HAVING COUNT(DISTINCT "id") = 1
)
UPDATE "ShipmentFinanceItem" AS "item"
SET "agentId" = "identity"."id", "agentName" = "identity"."name"
FROM "UniqueAgentIdentity" AS "identity"
WHERE "item"."type" IN ('BUSINESS_COST', 'PAYABLE')
  AND "item"."agentName" IS NOT NULL
  AND btrim("item"."agentName") = "identity"."identity";

UPDATE "ShipmentFinanceItem" AS "item"
SET "agentId" = "shipment"."agentId", "agentName" = "agent"."name"
FROM "Shipment" AS "shipment"
JOIN "Agent" AS "agent" ON "agent"."id" = "shipment"."agentId"
WHERE "item"."shipmentId" = "shipment"."id"
  AND "item"."type" IN ('BUSINESS_COST', 'PAYABLE')
  AND "item"."agentId" IS NULL
  AND ("item"."agentName" IS NULL OR btrim("item"."agentName") = '');

WITH "AgentIdentity" AS (
  SELECT "id", "name", btrim("name") AS "identity" FROM "Agent" WHERE btrim("name") <> ''
  UNION ALL
  SELECT "id", "name", btrim("shortName") AS "identity" FROM "Agent" WHERE "shortName" IS NOT NULL AND btrim("shortName") <> ''
),
"UniqueAgentIdentity" AS (
  SELECT MIN("id") AS "id", MIN("name") AS "name", "identity"
  FROM "AgentIdentity"
  GROUP BY "identity"
  HAVING COUNT(DISTINCT "id") = 1
)
UPDATE "PaymentVoucher" AS "voucher"
SET "agentId" = "identity"."id", "agentName" = "identity"."name"
FROM "UniqueAgentIdentity" AS "identity"
WHERE "voucher"."agentName" IS NOT NULL
  AND btrim("voucher"."agentName") = "identity"."identity";

CREATE INDEX "ShipmentFinanceItem_agentId_idx" ON "ShipmentFinanceItem"("agentId");
CREATE INDEX "PaymentVoucher_agentId_idx" ON "PaymentVoucher"("agentId");

ALTER TABLE "ShipmentFinanceItem"
  ADD CONSTRAINT "ShipmentFinanceItem_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentVoucher"
  ADD CONSTRAINT "PaymentVoucher_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
