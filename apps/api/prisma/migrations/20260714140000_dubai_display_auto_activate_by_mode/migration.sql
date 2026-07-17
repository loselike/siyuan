-- 迪拜空运与海运展示版本独立切换，保留旧版本以便新表转换失败时继续展示。
ALTER TABLE "DubaiPriceDisplayVersion" ADD COLUMN "isActiveAir" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DubaiPriceDisplayVersion" ADD COLUMN "isActiveSea" BOOLEAN NOT NULL DEFAULT false;

UPDATE "DubaiPriceDisplayVersion" AS "version"
SET "isActiveAir" = true
WHERE "version"."isActive" = true
  AND EXISTS (
    SELECT 1 FROM "DubaiPriceDisplayPage" AS "page"
    WHERE "page"."versionId" = "version"."id" AND "page"."mode" = 'AIR'
  );

UPDATE "DubaiPriceDisplayVersion" AS "version"
SET "isActiveSea" = true
WHERE "version"."isActive" = true
  AND EXISTS (
    SELECT 1 FROM "DubaiPriceDisplayPage" AS "page"
    WHERE "page"."versionId" = "version"."id" AND "page"."mode" = 'SEA'
  );

CREATE INDEX "DubaiPriceDisplayVersion_isActiveAir_status_updatedAt_idx" ON "DubaiPriceDisplayVersion"("isActiveAir", "status", "updatedAt");
CREATE INDEX "DubaiPriceDisplayVersion_isActiveSea_status_updatedAt_idx" ON "DubaiPriceDisplayVersion"("isActiveSea", "status", "updatedAt");
