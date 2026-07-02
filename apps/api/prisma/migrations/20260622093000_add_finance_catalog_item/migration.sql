CREATE TABLE IF NOT EXISTS "FinanceCatalogItem" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "name" TEXT NOT NULL,
  "currency" TEXT,
  "remark" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinanceCatalogItem_category_sortOrder_idx" ON "FinanceCatalogItem"("category", "sortOrder");

ALTER TABLE "CustomerAccount" ALTER COLUMN "currency" SET DEFAULT 'RMB';
ALTER TABLE "ReceivableFee" ALTER COLUMN "currency" SET DEFAULT 'RMB';
ALTER TABLE "ShipmentFinanceItem" ALTER COLUMN "currency" SET DEFAULT 'RMB';

UPDATE "CustomerAccount" SET "currency" = 'RMB' WHERE "currency" = 'CNY';
UPDATE "ReceivableFee" SET "currency" = 'RMB' WHERE "currency" = 'CNY';
UPDATE "ShipmentFinanceItem" SET "currency" = 'RMB' WHERE "currency" = 'CNY';
UPDATE "PricingRule" SET "currency" = 'RMB' WHERE "currency" = 'CNY';
UPDATE "PriceBookRow" SET "currency" = 'RMB' WHERE "currency" = 'CNY';
UPDATE "ExchangeRate" SET "quoteCurrency" = 'RMB' WHERE "quoteCurrency" = 'CNY';
