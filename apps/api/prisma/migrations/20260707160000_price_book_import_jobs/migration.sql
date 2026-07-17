CREATE TABLE "PriceBookImportJob" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "priceBookId" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "errorSummary" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PriceBookImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PriceBookImportJob_status_createdAt_idx" ON "PriceBookImportJob"("status", "createdAt");
CREATE INDEX "PriceBookImportJob_priceBookId_idx" ON "PriceBookImportJob"("priceBookId");
