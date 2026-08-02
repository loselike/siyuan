ALTER TABLE "Channel"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Channel_deletedAt_enabled_name_idx"
ON "Channel"("deletedAt", "enabled", "name");
