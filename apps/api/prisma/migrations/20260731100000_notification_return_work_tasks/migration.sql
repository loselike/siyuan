CREATE TABLE "NotificationActionTask" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceRequestId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "receivableSourceType" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "waterReceiptId" TEXT NOT NULL,
    "shipmentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetModule" TEXT NOT NULL,
    "targetSection" TEXT NOT NULL,
    "targetEntityType" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByAuditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationActionTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationActionTask_sourceRequestId_key" ON "NotificationActionTask"("sourceRequestId");
CREATE INDEX "NotificationActionTask_ownerUserId_status_openedAt_idx" ON "NotificationActionTask"("ownerUserId", "status", "openedAt");
CREATE INDEX "NotificationActionTask_ownerUserId_receivableSourceType_receivableId_status_idx" ON "NotificationActionTask"("ownerUserId", "receivableSourceType", "receivableId", "status");

CREATE TABLE "NotificationActionTaskWatermark" (
    "ownerUserId" TEXT NOT NULL,
    "receivableSourceType" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "lastSubmissionAt" TIMESTAMP(3),
    "lastSubmissionAuditLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationActionTaskWatermark_pkey" PRIMARY KEY ("ownerUserId", "receivableSourceType", "receivableId")
);
