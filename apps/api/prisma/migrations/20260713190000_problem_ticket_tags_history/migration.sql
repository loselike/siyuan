ALTER TABLE "ProblemTicket" ADD COLUMN "closedBy" TEXT;
ALTER TABLE "ProblemTicket" ADD COLUMN "closeReason" TEXT;
ALTER TABLE "ProblemTicket" ADD COLUMN "assistanceReason" TEXT;
ALTER TABLE "ProblemTicket" ADD COLUMN "assistanceAt" TIMESTAMP(3);
ALTER TABLE "ProblemTicket" ADD COLUMN "tagSnapshot" JSONB;

CREATE TABLE "CommonTag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scene" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "customerVisibleAllowed" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommonTag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CommonTag_scene_name_key" ON "CommonTag"("scene", "name");
CREATE INDEX "CommonTag_scene_enabled_sortOrder_idx" ON "CommonTag"("scene", "enabled", "sortOrder");
