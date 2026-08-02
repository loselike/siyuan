CREATE TABLE "WaterReceiptMatchRequest" (
    "id" TEXT NOT NULL,
    "waterReceiptId" TEXT NOT NULL,
    "receivableFinanceItemId" TEXT,
    "receivableFeeId" TEXT,
    "receivableSourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "shipmentId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "approvedMatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterReceiptMatchRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WaterReceiptMatchRequest_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "WaterReceiptMatchRequest_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT "WaterReceiptMatchRequest_receivable_check" CHECK (
        ("receivableSourceType" = 'SYSTEM' AND "receivableFeeId" IS NOT NULL AND "receivableFinanceItemId" IS NULL)
        OR
        ("receivableSourceType" = 'MANUAL' AND "receivableFinanceItemId" IS NOT NULL AND "receivableFeeId" IS NULL)
    )
);

CREATE INDEX "WaterReceiptMatchRequest_waterReceiptId_status_requestedAt_idx"
ON "WaterReceiptMatchRequest"("waterReceiptId", "status", "requestedAt");

CREATE INDEX "WaterReceiptMatchRequest_receivableFinanceItemId_status_idx"
ON "WaterReceiptMatchRequest"("receivableFinanceItemId", "status");

CREATE INDEX "WaterReceiptMatchRequest_receivableFeeId_status_idx"
ON "WaterReceiptMatchRequest"("receivableFeeId", "status");

CREATE INDEX "WaterReceiptMatchRequest_shipmentId_status_idx"
ON "WaterReceiptMatchRequest"("shipmentId", "status");

CREATE INDEX "WaterReceiptMatchRequest_requestedByUserId_status_idx"
ON "WaterReceiptMatchRequest"("requestedByUserId", "status");

CREATE UNIQUE INDEX "WaterReceiptMatchRequest_pending_manual_key"
ON "WaterReceiptMatchRequest"("receivableFinanceItemId")
WHERE "status" = 'PENDING' AND "receivableFinanceItemId" IS NOT NULL;

CREATE UNIQUE INDEX "WaterReceiptMatchRequest_pending_system_key"
ON "WaterReceiptMatchRequest"("receivableFeeId")
WHERE "status" = 'PENDING' AND "receivableFeeId" IS NOT NULL;

ALTER TABLE "WaterReceiptMatchRequest"
ADD CONSTRAINT "WaterReceiptMatchRequest_waterReceiptId_fkey"
FOREIGN KEY ("waterReceiptId") REFERENCES "WaterReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WaterReceiptMatchRequest"
ADD CONSTRAINT "WaterReceiptMatchRequest_receivableFinanceItemId_fkey"
FOREIGN KEY ("receivableFinanceItemId") REFERENCES "ShipmentFinanceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WaterReceiptMatchRequest"
ADD CONSTRAINT "WaterReceiptMatchRequest_receivableFeeId_fkey"
FOREIGN KEY ("receivableFeeId") REFERENCES "ReceivableFee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WaterReceiptMatchRequest"
ADD CONSTRAINT "WaterReceiptMatchRequest_shipmentId_fkey"
FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
