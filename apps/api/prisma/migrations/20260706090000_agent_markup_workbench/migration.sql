ALTER TABLE "AgentMarkupRule"
  ADD COLUMN IF NOT EXISTS "markupType" TEXT NOT NULL DEFAULT 'WEIGHT',
  ADD COLUMN IF NOT EXISTS "markupValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

UPDATE "AgentMarkupRule"
SET "markupValue" = "markupPerKg"
WHERE "markupValue" = 0 AND "markupPerKg" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AgentMarkupRule_agentName_enabled_deletedAt_idx" ON "AgentMarkupRule"("agentName", "enabled", "deletedAt");
CREATE INDEX IF NOT EXISTS "AgentMarkupRule_priority_idx" ON "AgentMarkupRule"("priority");
