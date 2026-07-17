-- Scope agent markup rules to a price book when the business rule belongs to a specific uploaded xls.
ALTER TABLE "AgentMarkupRule" ADD COLUMN "priceBookId" TEXT;

CREATE INDEX "AgentMarkupRule_priceBookId_agentName_enabled_deletedAt_idx"
  ON "AgentMarkupRule"("priceBookId", "agentName", "enabled", "deletedAt");
