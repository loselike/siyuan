ALTER TABLE "ProfitSettlement"
ADD CONSTRAINT "ProfitSettlement_warehouse_site_required_check"
CHECK ("type" <> 'WAREHOUSE' OR NULLIF(BTRIM("siteScope"), '') IS NOT NULL);
