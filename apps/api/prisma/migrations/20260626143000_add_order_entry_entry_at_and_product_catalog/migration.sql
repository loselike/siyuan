ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "entryAt" TIMESTAMP(3);
UPDATE "Shipment" SET "entryAt" = "createdAt" WHERE "entryAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Shipment_entryAt_idx" ON "Shipment"("entryAt");
