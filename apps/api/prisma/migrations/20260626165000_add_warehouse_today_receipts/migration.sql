ALTER TABLE "User" ADD COLUMN "site" TEXT;
ALTER TABLE "WarehousePackage" ADD COLUMN "site" TEXT;
ALTER TABLE "WarehousePackage" ADD COLUMN "salesperson" TEXT;
ALTER TABLE "WarehousePackage" ADD COLUMN "manualException" TEXT;
ALTER TABLE "WarehousePackage" ADD COLUMN "scanSource" TEXT;
CREATE INDEX "WarehousePackage_site_scanTime_idx" ON "WarehousePackage"("site", "scanTime");
CREATE INDEX "WarehousePackage_salesperson_scanTime_idx" ON "WarehousePackage"("salesperson", "scanTime");
