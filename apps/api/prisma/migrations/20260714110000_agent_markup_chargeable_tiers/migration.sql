-- Preserve existing markup rules as fallbacks while adding optional channel-tier dimensions.
ALTER TABLE "AgentMarkupRule" ADD COLUMN "markupUnit" TEXT;
ALTER TABLE "AgentMarkupRule" ADD COLUMN "minChargeableValue" DECIMAL(65,30);
ALTER TABLE "AgentMarkupRule" ADD COLUMN "maxChargeableValue" DECIMAL(65,30);

CREATE INDEX "AgentMarkupRule_legacyModule_agentName_channelName_markupUnit_enabled_deletedAt_idx"
  ON "AgentMarkupRule"("legacyModule", "agentName", "channelName", "markupUnit", "enabled", "deletedAt");
