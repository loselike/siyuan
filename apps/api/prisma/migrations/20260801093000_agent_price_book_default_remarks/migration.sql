CREATE TABLE "AgentPriceBookDefaultRemark" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "targetModule" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPriceBookDefaultRemark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentPriceBookDefaultRemark_agentId_targetModule_key"
ON "AgentPriceBookDefaultRemark"("agentId", "targetModule");

CREATE INDEX "AgentPriceBookDefaultRemark_targetModule_agentId_idx"
ON "AgentPriceBookDefaultRemark"("targetModule", "agentId");

-- Preserve the most recent active price-book remark as the default for each
-- agent + lookup-module scope. Historical price-book records remain unchanged.
WITH latest_active_remarks AS (
    SELECT DISTINCT ON ("agentId", "targetModule")
        "agentId",
        "targetModule",
        btrim("remark") AS "content",
        "importedAt"
    FROM "PriceBook"
    WHERE "deletedAt" IS NULL
      AND "agentId" IS NOT NULL
      AND "targetModule" IS NOT NULL
      AND NULLIF(btrim(COALESCE("remark", '')), '') IS NOT NULL
    ORDER BY "agentId", "targetModule", "importedAt" DESC, "id" DESC
)
INSERT INTO "AgentPriceBookDefaultRemark" (
    "id", "agentId", "targetModule", "content", "createdAt", "updatedAt"
)
SELECT
    'price-book-default-remark-' || md5("agentId" || ':' || "targetModule"),
    "agentId",
    "targetModule",
    "content",
    "importedAt",
    "importedAt"
FROM latest_active_remarks
ON CONFLICT ("agentId", "targetModule") DO NOTHING;
