CREATE TABLE "SouthAfricaRateImage" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT,
  "url" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SouthAfricaRateImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SouthAfricaRateImage_deletedAt_createdAt_idx" ON "SouthAfricaRateImage"("deletedAt", "createdAt");

CREATE TABLE "SouthAfricaRateRule" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keywords" TEXT[],
  "ratePerCbm" DECIMAL(65,30),
  "consult" BOOLEAN NOT NULL DEFAULT false,
  "remark" TEXT,
  "sourceImageId" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SouthAfricaRateRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SouthAfricaRateRule_enabled_deletedAt_idx" ON "SouthAfricaRateRule"("enabled", "deletedAt");
CREATE INDEX "SouthAfricaRateRule_category_name_idx" ON "SouthAfricaRateRule"("category", "name");

CREATE TABLE "SouthAfricaLookupPendingReview" (
  "id" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "volumeCbm" DECIMAL(65,30) NOT NULL,
  "actualWeightKg" DECIMAL(65,30),
  "packageInfo" TEXT,
  "createdBy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SouthAfricaLookupPendingReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SouthAfricaLookupPendingReview_status_createdAt_idx" ON "SouthAfricaLookupPendingReview"("status", "createdAt");
