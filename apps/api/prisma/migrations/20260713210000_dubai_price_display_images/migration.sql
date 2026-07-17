-- Dubai 原表展示版本及按工作表分页的图片资产。
ALTER TABLE "PriceBook" ADD COLUMN "targetModule" TEXT;
CREATE INDEX "PriceBook_deletedAt_targetModule_importedAt_idx" ON "PriceBook"("deletedAt", "targetModule", "importedAt");

CREATE TABLE "DubaiPriceDisplayVersion" (
    "id" TEXT NOT NULL,
    "priceBookId" TEXT,
    "originalName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "salesSafe" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "unassignedSheets" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DubaiPriceDisplayVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DubaiPriceDisplayPage" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "pageNo" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DubaiPriceDisplayPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DubaiPriceDisplayPage_versionId_sheetName_pageNo_key" ON "DubaiPriceDisplayPage"("versionId", "sheetName", "pageNo");
CREATE INDEX "DubaiPriceDisplayVersion_isActive_status_createdAt_idx" ON "DubaiPriceDisplayVersion"("isActive", "status", "createdAt");
CREATE INDEX "DubaiPriceDisplayVersion_priceBookId_idx" ON "DubaiPriceDisplayVersion"("priceBookId");
CREATE INDEX "DubaiPriceDisplayPage_versionId_mode_sheetName_pageNo_idx" ON "DubaiPriceDisplayPage"("versionId", "mode", "sheetName", "pageNo");
ALTER TABLE "DubaiPriceDisplayPage" ADD CONSTRAINT "DubaiPriceDisplayPage_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DubaiPriceDisplayVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
