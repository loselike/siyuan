ALTER TABLE "WarehousePackage" ADD COLUMN IF NOT EXISTS "labelNo" TEXT;
ALTER TABLE "WarehousePackage" ADD COLUMN IF NOT EXISTS "sourcePackageId" TEXT;
ALTER TABLE "WarehousePackage" ADD COLUMN IF NOT EXISTS "sourcePackageNo" TEXT;
ALTER TABLE "WarehousePackage" ADD COLUMN IF NOT EXISTS "packageIndex" INTEGER;
ALTER TABLE "WarehousePackage" ALTER COLUMN "divisor" SET DEFAULT 6000;
