CREATE INDEX "LegacyPricingRow_sourceId_agentName_minWeightKg_idx"
  ON "LegacyPricingRow"("sourceId", "agentName", "minWeightKg");

CREATE INDEX "LegacyPricingRow_sourceId_channelName_idx"
  ON "LegacyPricingRow"("sourceId", "channelName");

CREATE INDEX "LegacyPricingRow_sourceId_destinationCountry_minWeightKg_idx"
  ON "LegacyPricingRow"("sourceId", "destinationCountry", "minWeightKg");
