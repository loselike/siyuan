CREATE TABLE "PriceBook" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "remark" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceBookRow" (
  "id" TEXT NOT NULL,
  "priceBookId" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "carrierName" TEXT,
  "channelName" TEXT NOT NULL,
  "businessRouteName" TEXT,
  "realChannelName" TEXT,
  "warehouseCode" TEXT,
  "destinationCountry" TEXT NOT NULL,
  "minWeightKg" DECIMAL(65,30) NOT NULL,
  "maxWeightKg" DECIMAL(65,30) NOT NULL,
  "costPerKg" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL,
  "transitDays" INTEGER,
  "transitLabel" TEXT,
  "quoteSourceType" TEXT,
  "surchargeFee" DECIMAL(65,30),
  "surchargeDetails" JSONB,
  CONSTRAINT "PriceBookRow_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PriceBookRow"
  ADD CONSTRAINT "PriceBookRow_priceBookId_fkey"
  FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
