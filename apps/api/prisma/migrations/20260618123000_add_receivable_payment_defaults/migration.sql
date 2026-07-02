ALTER TABLE "Customer"
ADD COLUMN "defaultSettlementMethod" TEXT;

ALTER TABLE "ShipmentFinanceItem"
ADD COLUMN "paymentNo" TEXT;
