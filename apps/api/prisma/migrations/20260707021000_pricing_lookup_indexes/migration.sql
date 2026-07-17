CREATE INDEX "PriceBookRow_priceBookId_destinationCountry_minWeightKg_idx"
  ON "PriceBookRow"("priceBookId", "destinationCountry", "minWeightKg");

CREATE INDEX "PriceBookRow_destinationCountry_warehouseCode_minWeightKg_idx"
  ON "PriceBookRow"("destinationCountry", "warehouseCode", "minWeightKg");

CREATE INDEX "LegacyPricingRow_sourceId_module_idx"
  ON "LegacyPricingRow"("sourceId", "module");

CREATE INDEX "LegacyPricingRow_module_destinationCountry_minWeightKg_idx"
  ON "LegacyPricingRow"("module", "destinationCountry", "minWeightKg");

CREATE INDEX "LegacyPricingRow_module_agentName_minWeightKg_idx"
  ON "LegacyPricingRow"("module", "agentName", "minWeightKg");

CREATE INDEX "LegacyPricingRow_module_warehouseCode_minWeightKg_idx"
  ON "LegacyPricingRow"("module", "warehouseCode", "minWeightKg");
