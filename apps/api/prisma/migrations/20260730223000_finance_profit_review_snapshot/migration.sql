ALTER TABLE "ReceivableFee"
ADD COLUMN "profitExchangeRate" DECIMAL(18, 8),
ADD COLUMN "profitRmbAmount" DECIMAL(18, 2),
ADD COLUMN "profitEffectiveAt" TIMESTAMP(3);

ALTER TABLE "ShipmentFinanceItem"
ADD COLUMN "profitExchangeRate" DECIMAL(18, 8),
ADD COLUMN "profitRmbAmount" DECIMAL(18, 2),
ADD COLUMN "profitEffectiveAt" TIMESTAMP(3);

UPDATE "ReceivableFee"
SET "profitExchangeRate" = 1,
    "profitRmbAmount" = ROUND("amount", 2),
    "profitEffectiveAt" = COALESCE("reviewedAt", "createdAt")
WHERE "reconciliationStatus" = 'CONFIRMED'
  AND UPPER(COALESCE("currency", 'RMB')) = 'RMB';

UPDATE "ShipmentFinanceItem"
SET "profitExchangeRate" = 1,
    "profitRmbAmount" = ROUND("amount", 2),
    "profitEffectiveAt" = COALESCE("reviewedAt", "createdAt")
WHERE "reconciliationStatus" = 'CONFIRMED'
  AND UPPER(COALESCE("currency", 'RMB')) = 'RMB';

WITH "ReceivableFeeSnapshots" AS (
  SELECT fee."id",
         rate."rate",
         COALESCE(fee."reviewedAt", fee."createdAt") AS "effectiveAt"
  FROM "ReceivableFee" fee
  JOIN LATERAL (
    SELECT exchange."rate"
    FROM "ExchangeRate" exchange
    WHERE exchange."baseCurrency" = UPPER(fee."currency")
      AND exchange."quoteCurrency" = 'RMB'
      AND exchange."enabled" = TRUE
      AND exchange."activeAt" <= COALESCE(fee."reviewedAt", fee."createdAt")
      AND (exchange."endAt" IS NULL OR exchange."endAt" >= COALESCE(fee."reviewedAt", fee."createdAt"))
    ORDER BY exchange."activeAt" DESC
    LIMIT 1
  ) rate ON TRUE
  WHERE fee."reconciliationStatus" = 'CONFIRMED'
    AND UPPER(COALESCE(fee."currency", 'RMB')) <> 'RMB'
)
UPDATE "ReceivableFee" fee
SET "profitExchangeRate" = snapshot."rate",
    "profitRmbAmount" = ROUND(fee."amount" * snapshot."rate", 2),
    "profitEffectiveAt" = snapshot."effectiveAt"
FROM "ReceivableFeeSnapshots" snapshot
WHERE fee."id" = snapshot."id"
  AND fee."profitRmbAmount" IS NULL;

WITH "ShipmentFinanceItemSnapshots" AS (
  SELECT item."id",
         rate."rate",
         COALESCE(item."reviewedAt", item."createdAt") AS "effectiveAt"
  FROM "ShipmentFinanceItem" item
  JOIN LATERAL (
    SELECT exchange."rate"
    FROM "ExchangeRate" exchange
    WHERE exchange."baseCurrency" = UPPER(item."currency")
      AND exchange."quoteCurrency" = 'RMB'
      AND exchange."enabled" = TRUE
      AND exchange."activeAt" <= COALESCE(item."reviewedAt", item."createdAt")
      AND (exchange."endAt" IS NULL OR exchange."endAt" >= COALESCE(item."reviewedAt", item."createdAt"))
    ORDER BY exchange."activeAt" DESC
    LIMIT 1
  ) rate ON TRUE
  WHERE item."reconciliationStatus" = 'CONFIRMED'
    AND UPPER(COALESCE(item."currency", 'RMB')) <> 'RMB'
)
UPDATE "ShipmentFinanceItem" item
SET "profitExchangeRate" = snapshot."rate",
    "profitRmbAmount" = ROUND(item."amount" * snapshot."rate", 2),
    "profitEffectiveAt" = snapshot."effectiveAt"
FROM "ShipmentFinanceItemSnapshots" snapshot
WHERE item."id" = snapshot."id"
  AND item."profitRmbAmount" IS NULL;

CREATE INDEX "ReceivableFee_profitEffectiveAt_idx"
ON "ReceivableFee"("profitEffectiveAt");

CREATE INDEX "ShipmentFinanceItem_type_profitEffectiveAt_idx"
ON "ShipmentFinanceItem"("type", "profitEffectiveAt");
