ALTER TABLE "ShipmentFinanceItem"
  ADD COLUMN "receiptMatchSource" TEXT,
  ADD COLUMN "receiptMatchHint" TEXT;

ALTER TABLE "WaterReceiptMatch"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';
