-- Support both manual shipment finance items and historical system receivables.
ALTER TABLE "ReceivableFee"
  ADD COLUMN "receivedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "receiptStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN "receiptMatchSource" TEXT,
  ADD COLUMN "receiptMatchHint" TEXT,
  ADD COLUMN "receivedAt" TIMESTAMP(3);

ALTER TABLE "WaterReceiptMatch"
  ALTER COLUMN "receivableFinanceItemId" DROP NOT NULL,
  ADD COLUMN "receivableFeeId" TEXT,
  ADD COLUMN "receivableSourceType" TEXT NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "WaterReceiptMatch"
  ADD CONSTRAINT "WaterReceiptMatch_receivableFeeId_fkey"
  FOREIGN KEY ("receivableFeeId") REFERENCES "ReceivableFee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "WaterReceiptMatch_receivableFeeId_voided_idx"
  ON "WaterReceiptMatch"("receivableFeeId", "voided");
