-- Retained original price books can be rebuilt when a module parser changes.
-- Existing data deliberately starts at revision 0 so the bounded worker will
-- refresh it once the server runs the current module rule revision.
ALTER TABLE "PriceBook"
  ADD COLUMN "parserRuleVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "refreshStatus" TEXT NOT NULL DEFAULT 'CURRENT',
  ADD COLUMN "lastRuleRefreshAt" TIMESTAMP(3);

ALTER TABLE "PriceBookImportJob"
  ADD COLUMN "targetModule" TEXT,
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'IMPORT',
  ADD COLUMN "parserRuleVersion" INTEGER,
  ADD COLUMN "dedupeKey" TEXT;

ALTER TABLE "LegacyPricingSource"
  ADD COLUMN "priceBookId" TEXT;

ALTER TABLE "LegacyPricingSource"
  ADD CONSTRAINT "LegacyPricingSource_priceBookId_fkey"
  FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PriceBook_deletedAt_targetModule_parserRuleVersion_idx"
  ON "PriceBook"("deletedAt", "targetModule", "parserRuleVersion");
CREATE INDEX "PriceBookImportJob_kind_status_createdAt_idx"
  ON "PriceBookImportJob"("kind", "status", "createdAt");
CREATE UNIQUE INDEX "PriceBookImportJob_dedupeKey_key"
  ON "PriceBookImportJob"("dedupeKey");
CREATE INDEX "LegacyPricingSource_priceBookId_deletedAt_idx"
  ON "LegacyPricingSource"("priceBookId", "deletedAt");

-- Import jobs already know their resulting price book. Restore target-module
-- metadata so an application restart can resume a queued refresh safely.
UPDATE "PriceBookImportJob" AS job
SET "targetModule" = book."targetModule"
FROM "PriceBook" AS book
WHERE job."priceBookId" = book."id"
  AND job."targetModule" IS NULL;

-- Link old legacy source rows only when their original import file maps to one
-- and only one price book. Ambiguous historical duplicate file names are left
-- unlinked and reported as unavailable rather than refreshed unsafely.
WITH candidates AS (
  SELECT source."id" AS source_id, MIN(job."priceBookId") AS price_book_id
  FROM "LegacyPricingSource" AS source
  JOIN "PriceBookImportJob" AS job
    ON job."fileName" = source."fileName"
   AND job."priceBookId" IS NOT NULL
  GROUP BY source."id"
  HAVING COUNT(DISTINCT job."priceBookId") = 1
)
UPDATE "LegacyPricingSource" AS source
SET "priceBookId" = candidates.price_book_id
FROM candidates
WHERE source."id" = candidates.source_id
  AND source."priceBookId" IS NULL;
