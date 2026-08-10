ALTER TABLE "ShipmentFinanceItem"
  ADD COLUMN IF NOT EXISTS "billingUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "billingQuantity" DECIMAL(65,30);

UPDATE "ShipmentFinanceItem"
SET "billingUnit" = 'KG',
    "billingQuantity" = "chargeWeightKg"
WHERE "type" = 'BUSINESS_COST'
  AND "billingUnit" IS NULL;
