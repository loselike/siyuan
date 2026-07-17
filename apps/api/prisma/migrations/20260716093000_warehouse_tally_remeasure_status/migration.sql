ALTER TABLE "WarehousePackage"
ADD COLUMN "measurementStatus" TEXT NOT NULL DEFAULT 'MEASURED',
ADD COLUMN "measurementMatchedAt" TIMESTAMP(3),
ADD COLUMN "measurementMatchedBy" TEXT;

CREATE INDEX "WarehousePackage_labelNo_measurementStatus_idx"
ON "WarehousePackage"("labelNo", "measurementStatus");
