CREATE TABLE "NotificationEventProcessing" (
    "id" TEXT NOT NULL,
    "auditLogId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationEventProcessing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationEventProcessing_auditLogId_key" ON "NotificationEventProcessing"("auditLogId");
CREATE INDEX "NotificationEventProcessing_status_nextRetryAt_lockedAt_idx" ON "NotificationEventProcessing"("status", "nextRetryAt", "lockedAt");
CREATE INDEX "NotificationEventProcessing_action_status_idx" ON "NotificationEventProcessing"("action", "status");
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");
CREATE INDEX "NotificationPreference_userId_enabled_idx" ON "NotificationPreference"("userId", "enabled");

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "NotificationEventCursor" ("key", "lastCreatedAt", "lastAuditLogId", "updatedAt")
VALUES ('station-notifications-v2', CURRENT_TIMESTAMP, '', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
