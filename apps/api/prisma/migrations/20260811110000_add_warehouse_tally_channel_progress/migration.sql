ALTER TABLE "WarehouseTallyTask"
  ADD COLUMN "tallyChannel" TEXT,
  ADD COLUMN "tallyProgressStatus" TEXT NOT NULL DEFAULT 'WAITING',
  ADD COLUMN "tallyStartedAt" TIMESTAMP(3),
  ADD COLUMN "tallyStartedBy" TEXT;

CREATE INDEX "WarehouseTallyTask_tallyChannel_tallyProgressStatus_createdAt_idx"
  ON "WarehouseTallyTask"("tallyChannel", "tallyProgressStatus", "createdAt");
