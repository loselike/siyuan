ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "volumeDivisor" INTEGER NOT NULL DEFAULT 5000;
ALTER TABLE "Channel" ADD COLUMN IF NOT EXISTS "roundingRule" TEXT NOT NULL DEFAULT 'NONE';

CREATE TABLE IF NOT EXISTS "AgentMarkupRule" (
  "id" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "channelName" TEXT,
  "realChannelName" TEXT,
  "destinationCountry" TEXT,
  "markupPerKg" DECIMAL(65,30) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentMarkupRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehousePackage" (
  "id" TEXT NOT NULL,
  "customerCode" TEXT NOT NULL,
  "customerOrderNo" TEXT NOT NULL,
  "domesticTrackingNo" TEXT NOT NULL,
  "combinedOrderNo" TEXT NOT NULL,
  "systemOrderNo" TEXT,
  "shipmentId" TEXT,
  "receivingChannel" TEXT NOT NULL,
  "destinationCountry" TEXT,
  "expectedTotalPackageCount" INTEGER,
  "packageCount" INTEGER NOT NULL DEFAULT 1,
  "weightKg" DECIMAL(65,30) NOT NULL,
  "lengthCm" DECIMAL(65,30) NOT NULL,
  "widthCm" DECIMAL(65,30) NOT NULL,
  "heightCm" DECIMAL(65,30) NOT NULL,
  "cbm" DECIMAL(65,30) NOT NULL,
  "volumetricWeightKg" DECIMAL(65,30) NOT NULL,
  "chargeableWeightKg" DECIMAL(65,30) NOT NULL,
  "divisor" INTEGER NOT NULL DEFAULT 5000,
  "roundingRule" TEXT NOT NULL DEFAULT 'NONE',
  "scanTime" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RECEIVED',
  "exceptions" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehousePackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehouseConsolidation" (
  "id" TEXT NOT NULL,
  "consolidationNo" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "shipmentId" TEXT,
  "systemOrderNo" TEXT,
  "totalPackages" INTEGER NOT NULL,
  "totalActualWeightKg" DECIMAL(65,30) NOT NULL,
  "totalVolumetricWeightKg" DECIMAL(65,30) NOT NULL,
  "totalChargeableWeightKg" DECIMAL(65,30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WarehouseConsolidation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WarehouseConsolidationItem" (
  "id" TEXT NOT NULL,
  "consolidationId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  CONSTRAINT "WarehouseConsolidationItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseConsolidation_consolidationNo_key" ON "WarehouseConsolidation"("consolidationNo");
CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseConsolidationItem_consolidationId_packageId_key" ON "WarehouseConsolidationItem"("consolidationId", "packageId");

ALTER TABLE "WarehouseConsolidationItem"
  ADD CONSTRAINT "WarehouseConsolidationItem_consolidationId_fkey"
  FOREIGN KEY ("consolidationId") REFERENCES "WarehouseConsolidation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseConsolidationItem"
  ADD CONSTRAINT "WarehouseConsolidationItem_packageId_fkey"
  FOREIGN KEY ("packageId") REFERENCES "WarehousePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
