CREATE TABLE "AgentChannel" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "channelName" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "AgentChannel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentChannel_agentId_idx" ON "AgentChannel"("agentId");

ALTER TABLE "AgentChannel"
  ADD CONSTRAINT "AgentChannel_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
