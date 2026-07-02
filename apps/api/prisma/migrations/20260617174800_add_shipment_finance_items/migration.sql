CREATE TABLE "ShipmentFinanceItem" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CNY',
  "settlementMethod" TEXT,
  "reconciliationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "agentName" TEXT,
  "chargeWeightKg" DECIMAL(65,30),
  "unitPrice" DECIMAL(65,30),
  "remark" TEXT,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "voided" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShipmentFinanceItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShipmentFinanceItem"
ADD CONSTRAINT "ShipmentFinanceItem_shipmentId_fkey"
FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ShipmentFinanceItem_shipmentId_type_idx" ON "ShipmentFinanceItem"("shipmentId", "type");
