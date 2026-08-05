ALTER TABLE "ShipmentFinanceItem"
ADD COLUMN "chargeUnit" TEXT NOT NULL DEFAULT 'KG';

ALTER TABLE "ShipmentFinanceItem"
ADD CONSTRAINT "ShipmentFinanceItem_chargeUnit_check"
CHECK ("chargeUnit" IN ('KG', 'CBM'));
