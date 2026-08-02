CREATE TABLE "MojiaRequestSample" (
    "id" TEXT NOT NULL,
    "deviceNo" TEXT,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "warehousePackageId" TEXT,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MojiaRequestSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MojiaRequestSample_expiresAt_idx" ON "MojiaRequestSample"("expiresAt");
CREATE INDEX "MojiaRequestSample_deviceNo_receivedAt_idx" ON "MojiaRequestSample"("deviceNo", "receivedAt");
CREATE INDEX "MojiaRequestSample_result_receivedAt_idx" ON "MojiaRequestSample"("result", "receivedAt");
CREATE INDEX "MojiaRequestSample_payloadHash_idx" ON "MojiaRequestSample"("payloadHash");
