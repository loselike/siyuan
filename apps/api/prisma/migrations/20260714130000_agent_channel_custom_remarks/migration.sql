CREATE TABLE "AgentChannelCustomRemark" (
    "id" TEXT NOT NULL,
    "legacyModule" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "realChannelName" TEXT,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentChannelCustomRemark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentChannelCustomRemark_legacyModule_agentName_channelName_key"
ON "AgentChannelCustomRemark"("legacyModule", "agentName", "channelName");

CREATE INDEX "AgentChannelCustomRemark_legacyModule_agentName_channelName_enabled_idx"
ON "AgentChannelCustomRemark"("legacyModule", "agentName", "channelName", "enabled");
