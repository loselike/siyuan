ALTER TABLE "Shipment"
  ADD COLUMN IF NOT EXISTS "inboundNo" TEXT,
  ADD COLUMN IF NOT EXISTS "receiverName" TEXT,
  ADD COLUMN IF NOT EXISTS "receiverCompany" TEXT,
  ADD COLUMN IF NOT EXISTS "receiverPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "receiverAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "receiverCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "receiverState" TEXT,
  ADD COLUMN IF NOT EXISTS "receiverPostalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "fbaWarehouseCode" TEXT;

CREATE INDEX IF NOT EXISTS "Shipment_inboundNo_idx" ON "Shipment"("inboundNo");
CREATE INDEX IF NOT EXISTS "Shipment_fbaWarehouseCode_idx" ON "Shipment"("fbaWarehouseCode");
