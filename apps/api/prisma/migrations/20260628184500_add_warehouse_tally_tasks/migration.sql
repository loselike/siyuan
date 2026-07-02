CREATE TABLE "WarehouseTallyTask" (
  "id" TEXT NOT NULL,
  "taskNo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "packageIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sourcePackageId" TEXT NOT NULL,
  "sourceCombinedOrderNo" TEXT NOT NULL,
  "customerCode" TEXT NOT NULL,
  "customerName" TEXT,
  "salesperson" TEXT,
  "packageCount" INTEGER NOT NULL,
  "originalWeightKg" DECIMAL(65,30) NOT NULL,
  "originalLengthCm" DECIMAL(65,30) NOT NULL,
  "originalWidthCm" DECIMAL(65,30) NOT NULL,
  "originalHeightCm" DECIMAL(65,30) NOT NULL,
  "originalVolumetricWeightKg" DECIMAL(65,30) NOT NULL,
  "originalVolumetricWeightKg5000" DECIMAL(65,30) NOT NULL,
  "tallyRequirement" TEXT NOT NULL,
  "remark" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedPackageCount" INTEGER,
  "completedWeightKg" DECIMAL(65,30),
  "completedLengthCm" DECIMAL(65,30),
  "completedWidthCm" DECIMAL(65,30),
  "completedHeightCm" DECIMAL(65,30),
  "completedVolumetricWeightKg" DECIMAL(65,30),
  "completedVolumetricWeightKg5000" DECIMAL(65,30),
  "completedBy" TEXT,
  "completedAt" TIMESTAMP(3),
  "labelStatus" TEXT NOT NULL DEFAULT 'NOT_GENERATED',
  CONSTRAINT "WarehouseTallyTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseTallyTask_taskNo_key" ON "WarehouseTallyTask"("taskNo");
CREATE INDEX "WarehouseTallyTask_status_createdAt_idx" ON "WarehouseTallyTask"("status", "createdAt");
CREATE INDEX "WarehouseTallyTask_customerCode_createdAt_idx" ON "WarehouseTallyTask"("customerCode", "createdAt");
CREATE INDEX "WarehouseTallyTask_sourceCombinedOrderNo_idx" ON "WarehouseTallyTask"("sourceCombinedOrderNo");
