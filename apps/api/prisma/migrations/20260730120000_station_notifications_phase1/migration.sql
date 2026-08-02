CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "audienceType" TEXT NOT NULL,
    "audienceValues" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "withdrawnById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "targetModule" TEXT,
    "targetSection" TEXT,
    "targetEntityType" TEXT,
    "targetEntityId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "announcementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationEventCursor" (
    "key" TEXT NOT NULL,
    "lastCreatedAt" TIMESTAMP(3) NOT NULL,
    "lastAuditLogId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationEventCursor_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE UNIQUE INDEX "Announcement_requestId_key" ON "Announcement"("requestId");
CREATE INDEX "Announcement_status_publishedAt_idx" ON "Announcement"("status", "publishedAt");
CREATE INDEX "Announcement_createdById_publishedAt_idx" ON "Announcement"("createdById", "publishedAt");
CREATE INDEX "Notification_category_createdAt_idx" ON "Notification"("category", "createdAt");
CREATE INDEX "Notification_sourceType_sourceId_idx" ON "Notification"("sourceType", "sourceId");
CREATE INDEX "Notification_announcementId_idx" ON "Notification"("announcementId");
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_userId_key" ON "NotificationDelivery"("notificationId", "userId");
CREATE INDEX "NotificationDelivery_userId_archivedAt_deliveredAt_idx" ON "NotificationDelivery"("userId", "archivedAt", "deliveredAt");
CREATE INDEX "NotificationDelivery_userId_readAt_idx" ON "NotificationDelivery"("userId", "readAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "NotificationEventCursor" ("key", "lastCreatedAt", "lastAuditLogId", "updatedAt")
VALUES ('shipment-review-v1', CURRENT_TIMESTAMP, '', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
