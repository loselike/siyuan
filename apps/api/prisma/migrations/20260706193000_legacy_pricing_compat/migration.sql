CREATE TABLE "LegacyPricingSource" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ok',
  "message" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "LegacyPricingSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegacyPricingRow" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "origin" TEXT,
  "channelName" TEXT NOT NULL,
  "serviceName" TEXT,
  "warehouseCode" TEXT,
  "destinationCountry" TEXT,
  "postalRule" TEXT,
  "minWeightKg" DECIMAL(65,30),
  "maxWeightKg" DECIMAL(65,30),
  "costPerKg" DECIMAL(65,30),
  "cbmPrice" DECIMAL(65,30),
  "tierLabel" TEXT,
  "transitLabel" TEXT,
  "productSurchargeRemark" TEXT,
  "specialRemark" TEXT,
  "remark" TEXT,
  "raw" JSONB NOT NULL,
  CONSTRAINT "LegacyPricingRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LegacyPricingSource_module_deletedAt_importedAt_idx" ON "LegacyPricingSource"("module", "deletedAt", "importedAt");
CREATE INDEX "LegacyPricingRow_module_agentName_idx" ON "LegacyPricingRow"("module", "agentName");
CREATE INDEX "LegacyPricingRow_module_warehouseCode_idx" ON "LegacyPricingRow"("module", "warehouseCode");
CREATE INDEX "LegacyPricingRow_module_destinationCountry_idx" ON "LegacyPricingRow"("module", "destinationCountry");
ALTER TABLE "LegacyPricingRow" ADD CONSTRAINT "LegacyPricingRow_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LegacyPricingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
