ALTER TABLE "Shipment"
ADD COLUMN IF NOT EXISTS "productNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Shipment_productNames_max_four'
      AND conrelid = '"Shipment"'::regclass
  ) THEN
    ALTER TABLE "Shipment"
    ADD CONSTRAINT "Shipment_productNames_max_four"
    CHECK (cardinality("productNames") <= 4) NOT VALID;
  END IF;
END $$;
