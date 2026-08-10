ALTER TABLE "WaterReceiptMatch"
  ADD COLUMN "rmbAmount" DECIMAL(65,30),
  ADD COLUMN "receivableAmount" DECIMAL(65,30),
  ADD COLUMN "receivableCurrency" TEXT,
  ADD COLUMN "receiptExchangeRate" DECIMAL(65,30),
  ADD COLUMN "receivableExchangeRate" DECIMAL(65,30);

ALTER TABLE "WaterReceiptMatchRequest"
  ADD COLUMN "rmbAmount" DECIMAL(65,30),
  ADD COLUMN "receivableAmount" DECIMAL(65,30),
  ADD COLUMN "receivableCurrency" TEXT,
  ADD COLUMN "receiptExchangeRate" DECIMAL(65,30),
  ADD COLUMN "receivableExchangeRate" DECIMAL(65,30);
