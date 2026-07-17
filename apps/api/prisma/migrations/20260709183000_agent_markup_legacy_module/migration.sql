-- Add optional lookup module ownership for agent markup rules.
ALTER TABLE "AgentMarkupRule" ADD COLUMN "legacyModule" TEXT;

CREATE INDEX "AgentMarkupRule_legacyModule_priceBookId_agentName_enabled_deletedAt_idx"
  ON "AgentMarkupRule"("legacyModule", "priceBookId", "agentName", "enabled", "deletedAt");

CREATE INDEX "AgentMarkupRule_legacyModule_agentName_enabled_deletedAt_idx"
  ON "AgentMarkupRule"("legacyModule", "agentName", "enabled", "deletedAt");
