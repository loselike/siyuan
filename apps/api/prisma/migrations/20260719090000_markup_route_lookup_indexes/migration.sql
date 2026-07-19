-- Keep route-directory pagination and a selected route preview on narrow indexes.
CREATE INDEX "PriceBookRow_markup_route_lookup_idx"
ON "PriceBookRow"("priceBookId", "channelName", "realChannelName", "destinationCountry", "minWeightKg");

CREATE INDEX "AgentMarkupRule_route_tiers_lookup_idx"
ON "AgentMarkupRule"("priceBookId", "agentName", "channelName", "realChannelName", "destinationCountry", "markupUnit", "enabled", "deletedAt", "minChargeableValue");
