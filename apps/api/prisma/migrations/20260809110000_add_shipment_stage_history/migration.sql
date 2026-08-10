CREATE TABLE "ShipmentStageHistory" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL,
    "exitedAt" TIMESTAMP(3),
    "visitNo" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'STATUS_EVENT',
    "exitReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentStageHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShipmentStageHistory_shipmentId_enteredAt_idx" ON "ShipmentStageHistory"("shipmentId", "enteredAt");
CREATE INDEX "ShipmentStageHistory_shipmentId_stageKey_enteredAt_idx" ON "ShipmentStageHistory"("shipmentId", "stageKey", "enteredAt");
CREATE INDEX "ShipmentStageHistory_stageKey_exitedAt_enteredAt_idx" ON "ShipmentStageHistory"("stageKey", "exitedAt", "enteredAt");
CREATE UNIQUE INDEX "ShipmentStageHistory_shipmentId_stageKey_visitNo_key" ON "ShipmentStageHistory"("shipmentId", "stageKey", "visitNo");
ALTER TABLE "ShipmentStageHistory" ADD CONSTRAINT "ShipmentStageHistory_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "AuditLog_target_createdAt_idx" ON "AuditLog"("target", "createdAt");
