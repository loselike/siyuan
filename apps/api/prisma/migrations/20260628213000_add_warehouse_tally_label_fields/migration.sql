ALTER TABLE "WarehouseTallyTask"
  ADD COLUMN "labelNo" TEXT,
  ADD COLUMN "labelQrContent" TEXT,
  ADD COLUMN "labelGeneratedAt" TIMESTAMP(3),
  ADD COLUMN "labelGeneratedBy" TEXT,
  ADD COLUMN "labelPrintedAt" TIMESTAMP(3),
  ADD COLUMN "labelPrintedBy" TEXT,
  ADD COLUMN "labelDownloadedAt" TIMESTAMP(3),
  ADD COLUMN "labelDownloadedBy" TEXT;

CREATE INDEX "WarehouseTallyTask_labelNo_idx" ON "WarehouseTallyTask"("labelNo");
