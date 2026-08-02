ALTER TABLE "Agent"
ADD COLUMN "warehouseContactName1" TEXT,
ADD COLUMN "warehouseContactPhone1" TEXT,
ADD COLUMN "warehouseContactName2" TEXT,
ADD COLUMN "warehouseContactPhone2" TEXT,
ADD COLUMN "warehouseContactName3" TEXT,
ADD COLUMN "warehouseContactPhone3" TEXT;

UPDATE "Agent"
SET "warehouseContactName1" = NULLIF(BTRIM("warehouseContact"), '')
WHERE "warehouseContactName1" IS NULL
  AND NULLIF(BTRIM("warehouseContact"), '') IS NOT NULL;
