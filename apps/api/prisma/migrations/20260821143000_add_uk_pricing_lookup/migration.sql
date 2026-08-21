-- Split United Kingdom pricing into its own independently permissioned pool.
-- The original retained workbooks remain reusable by both modules; only the
-- parsed UK rows and their book-scoped business rules move out of Europe.

BEGIN;

CREATE TEMP TABLE "_UkSplitBooks" (
  "sourceBookId" text PRIMARY KEY,
  "targetBookId" text NOT NULL UNIQUE
) ON COMMIT DROP;

CREATE TEMP TABLE "_UkSplitCounts" (
  "metric" text PRIMARY KEY,
  "value" bigint NOT NULL
) ON COMMIT DROP;

WITH capabilities("code") AS (
  VALUES
    ('pricing:lookup:uk-express'),
    ('pricing:markup:ukExpress:view'),
    ('pricing:markup:ukExpress:edit')
)
INSERT INTO "Permission" ("id", "code")
SELECT 'perm-pricing-business-' || substr(md5("code"), 1, 24), "code"
FROM capabilities
ON CONFLICT ("code") DO NOTHING;

WITH permission_mapping("sourceCode", "targetCode") AS (
  VALUES
    ('pricing:lookup:europe-express', 'pricing:lookup:uk-express'),
    ('pricing:markup:europeExpress:view', 'pricing:markup:ukExpress:view'),
    ('pricing:markup:europeExpress:edit', 'pricing:markup:ukExpress:edit')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target_permission."id", role_link."B"
FROM permission_mapping mapping
JOIN "Permission" source_permission ON source_permission."code" = mapping."sourceCode"
JOIN "_PermissionToRole" role_link ON role_link."A" = source_permission."id"
JOIN "Permission" target_permission ON target_permission."code" = mapping."targetCode"
ON CONFLICT DO NOTHING;

INSERT INTO "_UkSplitBooks" ("sourceBookId", "targetBookId")
SELECT DISTINCT book."id", 'uk-split-' || book."id"
FROM "PriceBook" book
WHERE book."deletedAt" IS NULL
  AND book."targetModule" = 'europeExpress'
  AND (
    EXISTS (
      SELECT 1
      FROM "PriceBookRow" row
      WHERE row."priceBookId" = book."id"
        AND (
          row."destinationCountry" ~ '(英国|大不列颠)'
          OR lower(regexp_replace(row."destinationCountry", '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
        )
    )
    OR EXISTS (
      SELECT 1
      FROM "LegacyPricingSource" source
      JOIN "LegacyPricingRow" row ON row."sourceId" = source."id"
      WHERE source."priceBookId" = book."id"
        AND source."deletedAt" IS NULL
        AND (
          COALESCE(row."destinationCountry", '') ~ '(英国|大不列颠)'
          OR lower(regexp_replace(COALESCE(row."destinationCountry", ''), '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
        )
    )
  );

INSERT INTO "_UkSplitCounts" ("metric", "value") VALUES
  ('price_rows_before', (
    SELECT COUNT(*)
    FROM "PriceBookRow" row
    JOIN "_UkSplitBooks" split ON split."sourceBookId" = row."priceBookId"
    WHERE (
      row."destinationCountry" ~ '(英国|大不列颠)'
      OR lower(regexp_replace(row."destinationCountry", '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
    )
  )),
  ('legacy_rows_before', (
    SELECT COUNT(*)
    FROM "LegacyPricingRow" row
    JOIN "LegacyPricingSource" source ON source."id" = row."sourceId"
    JOIN "_UkSplitBooks" split ON split."sourceBookId" = source."priceBookId"
    WHERE source."deletedAt" IS NULL
      AND (
        COALESCE(row."destinationCountry", '') ~ '(英国|大不列颠)'
        OR lower(regexp_replace(COALESCE(row."destinationCountry", ''), '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
      )
  ));

INSERT INTO "PriceBook" (
  "id", "fileName", "agentId", "agentShortName", "targetModule", "remark",
  "parserRuleVersion", "refreshStatus", "lastRuleRefreshAt", "importedAt", "deletedAt"
)
SELECT
  split."targetBookId", book."fileName", book."agentId", book."agentShortName", 'ukExpress', book."remark",
  1, 'CURRENT', CURRENT_TIMESTAMP, book."importedAt", NULL
FROM "_UkSplitBooks" split
JOIN "PriceBook" book ON book."id" = split."sourceBookId"
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PriceBookRow" (
  "id", "priceBookId", "agentName", "carrierName", "sourceSheetName", "channelName",
  "businessRouteName", "realChannelName", "warehouseCode", "destinationCountry", "postalRule",
  "minWeightKg", "maxWeightKg", "costPerKg", "currency", "transitDays", "transitLabel",
  "quoteSourceType", "surchargeFee", "surchargeDetails", "productSurchargeRemark", "specialRemark"
)
SELECT
  'uk-split-' || row."id", split."targetBookId", row."agentName", row."carrierName", row."sourceSheetName", row."channelName",
  row."businessRouteName", row."realChannelName", row."warehouseCode", row."destinationCountry", row."postalRule",
  row."minWeightKg", row."maxWeightKg", row."costPerKg", row."currency", row."transitDays", row."transitLabel",
  row."quoteSourceType", row."surchargeFee", row."surchargeDetails", row."productSurchargeRemark", row."specialRemark"
FROM "PriceBookRow" row
JOIN "_UkSplitBooks" split ON split."sourceBookId" = row."priceBookId"
WHERE (
  row."destinationCountry" ~ '(英国|大不列颠)'
  OR lower(regexp_replace(row."destinationCountry", '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "LegacyPricingSource" (
  "id", "priceBookId", "module", "fileName", "rowCount", "status", "message", "importedAt", "deletedAt"
)
SELECT
  'uk-split-' || source."id", split."targetBookId", 'ukExpress', source."fileName", 0, source."status",
  '由欧洲价格池拆分英国线路', source."importedAt", NULL
FROM "LegacyPricingSource" source
JOIN "_UkSplitBooks" split ON split."sourceBookId" = source."priceBookId"
WHERE source."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "LegacyPricingRow" row
    WHERE row."sourceId" = source."id"
      AND (
        COALESCE(row."destinationCountry", '') ~ '(英国|大不列颠)'
        OR lower(regexp_replace(COALESCE(row."destinationCountry", ''), '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
      )
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "LegacyPricingRow" (
  "id", "sourceId", "module", "agentName", "origin", "channelName", "serviceName", "warehouseCode",
  "destinationCountry", "postalRule", "minWeightKg", "maxWeightKg", "costPerKg", "cbmPrice", "tierLabel",
  "transitLabel", "productSurchargeRemark", "specialRemark", "remark", "raw"
)
SELECT
  'uk-split-' || row."id", 'uk-split-' || row."sourceId", 'ukExpress', row."agentName", row."origin", row."channelName",
  row."serviceName", row."warehouseCode", row."destinationCountry", row."postalRule", row."minWeightKg", row."maxWeightKg",
  row."costPerKg", row."cbmPrice", row."tierLabel", row."transitLabel", row."productSurchargeRemark", row."specialRemark",
  row."remark", row."raw"
FROM "LegacyPricingRow" row
JOIN "LegacyPricingSource" source ON source."id" = row."sourceId"
JOIN "_UkSplitBooks" split ON split."sourceBookId" = source."priceBookId"
WHERE source."deletedAt" IS NULL
  AND (
    COALESCE(row."destinationCountry", '') ~ '(英国|大不列颠)'
    OR lower(regexp_replace(COALESCE(row."destinationCountry", ''), '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
  )
ON CONFLICT ("id") DO NOTHING;

UPDATE "LegacyPricingSource" source
SET "rowCount" = (
  SELECT COUNT(*) FROM "LegacyPricingRow" row WHERE row."sourceId" = source."id"
)
WHERE source."priceBookId" IN (SELECT "targetBookId" FROM "_UkSplitBooks");

INSERT INTO "PriceBookImportJob" (
  "id", "fileName", "agentId", "agentShortName", "status", "filePath", "priceBookId", "targetModule",
  "kind", "parserRuleVersion", "dedupeKey", "totalRows", "processedRows", "failedRows", "message",
  "errorSummary", "createdBy", "createdAt", "updatedAt", "completedAt"
)
SELECT DISTINCT ON (split."targetBookId")
  'uk-split-' || job."id", job."fileName", job."agentId", job."agentShortName", 'SUCCESS', job."filePath",
  split."targetBookId", 'ukExpress', 'IMPORT', 1, NULL,
  (SELECT COUNT(*) FROM "LegacyPricingSource" source JOIN "LegacyPricingRow" row ON row."sourceId" = source."id" WHERE source."priceBookId" = split."targetBookId"),
  (SELECT COUNT(*) FROM "LegacyPricingSource" source JOIN "LegacyPricingRow" row ON row."sourceId" = source."id" WHERE source."priceBookId" = split."targetBookId"),
  0, '英国价格池拆分迁移完成', NULL, 'system:uk-pricing-split', job."createdAt", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "_UkSplitBooks" split
JOIN "PriceBookImportJob" job ON job."priceBookId" = split."sourceBookId"
WHERE job."kind" = 'IMPORT' AND job."filePath" IS NOT NULL AND job."status" = 'SUCCESS'
ORDER BY split."targetBookId", job."createdAt" ASC
ON CONFLICT ("id") DO NOTHING;

-- Preserve rules explicitly scoped to a split source book or a UK destination.
INSERT INTO "AgentMarkupRule" (
  "id", "legacyModule", "priceBookId", "agentName", "channelName", "realChannelName", "destinationCountry",
  "markupPerKg", "markupType", "markupValue", "markupUnit", "minChargeableValue", "maxChargeableValue",
  "priority", "enabled", "createdAt", "updatedAt", "deletedAt"
)
SELECT
  'uk-split-' || rule."id", 'ukExpress', split."targetBookId", rule."agentName", rule."channelName", rule."realChannelName",
  rule."destinationCountry", rule."markupPerKg", rule."markupType", rule."markupValue", rule."markupUnit",
  rule."minChargeableValue", rule."maxChargeableValue", rule."priority", rule."enabled", rule."createdAt", rule."updatedAt", rule."deletedAt"
FROM "AgentMarkupRule" rule
JOIN "_UkSplitBooks" split ON split."sourceBookId" = rule."priceBookId"
WHERE rule."legacyModule" IN ('europeExpress', 'ukExpress') OR rule."legacyModule" IS NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AgentPriceBookDefaultRemark" (
  "id", "agentId", "targetModule", "content", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (remark."agentId")
  'uk-split-' || remark."id", remark."agentId", 'ukExpress', remark."content", remark."createdAt", remark."updatedAt"
FROM "AgentPriceBookDefaultRemark" remark
JOIN "PriceBook" book ON book."agentId" = remark."agentId"
JOIN "_UkSplitBooks" split ON split."sourceBookId" = book."id"
WHERE remark."targetModule" = 'europeExpress'
ORDER BY remark."agentId", remark."updatedAt" DESC
ON CONFLICT ("agentId", "targetModule") DO NOTHING;

INSERT INTO "AgentMarkupRule" (
  "id", "legacyModule", "priceBookId", "agentName", "channelName", "realChannelName", "destinationCountry",
  "markupPerKg", "markupType", "markupValue", "markupUnit", "minChargeableValue", "maxChargeableValue",
  "priority", "enabled", "createdAt", "updatedAt", "deletedAt"
)
SELECT
  'uk-split-' || rule."id", 'ukExpress', NULL, rule."agentName", rule."channelName", rule."realChannelName",
  rule."destinationCountry", rule."markupPerKg", rule."markupType", rule."markupValue", rule."markupUnit",
  rule."minChargeableValue", rule."maxChargeableValue", rule."priority", rule."enabled", rule."createdAt", rule."updatedAt", rule."deletedAt"
FROM "AgentMarkupRule" rule
WHERE rule."legacyModule" = 'europeExpress'
  AND rule."priceBookId" IS NULL
  AND (
    COALESCE(rule."destinationCountry", '') ~ '(英国|大不列颠)'
    OR lower(regexp_replace(COALESCE(rule."destinationCountry", ''), '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
  )
ON CONFLICT ("id") DO NOTHING;

-- Channel remarks have no book/destination key. Copy only remarks whose exact
-- agent/channel exists in the new UK pool, leaving Europe ownership intact.
INSERT INTO "AgentChannelCustomRemark" (
  "id", "legacyModule", "agentName", "channelName", "realChannelName", "content", "enabled", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (remark."id")
  'uk-split-' || remark."id", 'ukExpress', remark."agentName", remark."channelName", remark."realChannelName",
  remark."content", remark."enabled", remark."createdAt", remark."updatedAt"
FROM "AgentChannelCustomRemark" remark
JOIN "LegacyPricingRow" row
  ON row."module" = 'ukExpress'
 AND row."agentName" = remark."agentName"
 AND row."channelName" = remark."channelName"
WHERE remark."legacyModule" = 'europeExpress'
ON CONFLICT ("legacyModule", "agentName", "channelName") DO NOTHING;

DELETE FROM "PriceBookRow" row
USING "_UkSplitBooks" split
WHERE row."priceBookId" = split."sourceBookId"
  AND (
    row."destinationCountry" ~ '(英国|大不列颠)'
    OR lower(regexp_replace(row."destinationCountry", '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
  );

DELETE FROM "LegacyPricingRow" row
USING "LegacyPricingSource" source, "_UkSplitBooks" split
WHERE row."sourceId" = source."id"
  AND source."priceBookId" = split."sourceBookId"
  AND source."deletedAt" IS NULL
  AND (
    COALESCE(row."destinationCountry", '') ~ '(英国|大不列颠)'
    OR lower(regexp_replace(COALESCE(row."destinationCountry", ''), '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
  );

UPDATE "LegacyPricingSource" source
SET "rowCount" = (
  SELECT COUNT(*) FROM "LegacyPricingRow" row WHERE row."sourceId" = source."id"
)
WHERE source."priceBookId" IN (SELECT "sourceBookId" FROM "_UkSplitBooks");

DO $$
DECLARE
  expected_price_rows bigint := (SELECT "value" FROM "_UkSplitCounts" WHERE "metric" = 'price_rows_before');
  expected_legacy_rows bigint := (SELECT "value" FROM "_UkSplitCounts" WHERE "metric" = 'legacy_rows_before');
  copied_price_rows bigint;
  copied_legacy_rows bigint;
  remaining_europe_uk_rows bigint;
  remaining_europe_uk_price_rows bigint;
  missing_retained_sources bigint;
BEGIN
  SELECT COUNT(*) INTO copied_price_rows
  FROM "PriceBookRow" row
  JOIN "_UkSplitBooks" split ON split."targetBookId" = row."priceBookId";

  SELECT COUNT(*) INTO copied_legacy_rows
  FROM "LegacyPricingRow" row
  JOIN "LegacyPricingSource" source ON source."id" = row."sourceId"
  JOIN "_UkSplitBooks" split ON split."targetBookId" = source."priceBookId"
  WHERE row."module" = 'ukExpress';

  SELECT COUNT(*) INTO remaining_europe_uk_rows
  FROM "LegacyPricingRow" row
  JOIN "LegacyPricingSource" source ON source."id" = row."sourceId"
  JOIN "_UkSplitBooks" split ON split."sourceBookId" = source."priceBookId"
  WHERE row."module" = 'europeExpress'
    AND (
      COALESCE(row."destinationCountry", '') ~ '(英国|大不列颠)'
      OR lower(regexp_replace(COALESCE(row."destinationCountry", ''), '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
    );

  SELECT COUNT(*) INTO remaining_europe_uk_price_rows
  FROM "PriceBookRow" row
  JOIN "_UkSplitBooks" split ON split."sourceBookId" = row."priceBookId"
  WHERE (
    row."destinationCountry" ~ '(英国|大不列颠)'
    OR lower(regexp_replace(row."destinationCountry", '[[:space:]_.-]+', '', 'g')) IN ('uk', 'gb', 'gbr', 'unitedkingdom', 'greatbritain')
  );

  SELECT COUNT(*) INTO missing_retained_sources
  FROM "_UkSplitBooks" split
  WHERE NOT EXISTS (
    SELECT 1 FROM "PriceBookImportJob" job
    WHERE job."priceBookId" = split."targetBookId"
      AND job."kind" = 'IMPORT'
      AND job."filePath" IS NOT NULL
  );

  IF copied_price_rows <> expected_price_rows
    OR copied_legacy_rows <> expected_legacy_rows
    OR remaining_europe_uk_rows <> 0
    OR remaining_europe_uk_price_rows <> 0
    OR missing_retained_sources <> 0 THEN
    RAISE EXCEPTION 'UK pricing split validation failed: price %/%, legacy %/%, Europe UK legacy remaining %, Europe UK price remaining %, missing source %',
      copied_price_rows, expected_price_rows, copied_legacy_rows, expected_legacy_rows,
      remaining_europe_uk_rows, remaining_europe_uk_price_rows, missing_retained_sources;
  END IF;
END $$;

COMMIT;
