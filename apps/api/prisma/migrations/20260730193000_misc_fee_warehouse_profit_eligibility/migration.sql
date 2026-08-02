ALTER TABLE "MiscFeeRecord"
ADD COLUMN "ownerSiteSnapshot" TEXT,
ADD COLUMN "profitEligibleAt" TIMESTAMP(3);

UPDATE "MiscFeeRecord" AS fee
SET "ownerSiteSnapshot" = NULLIF(BTRIM(owner_user."site"), '')
FROM "Customer" AS customer
LEFT JOIN LATERAL (
  SELECT "site"
  FROM "User"
  WHERE "enabled" = TRUE
    AND (
      "username" = customer."salesperson"
      OR "name" = customer."salesperson"
      OR "nickname" = customer."salesperson"
    )
  ORDER BY CASE WHEN "username" = customer."salesperson" THEN 0 ELSE 1 END, "username" ASC
  LIMIT 1
) AS owner_user ON TRUE
WHERE fee."customerId" = customer."id"
  AND fee."ownerType" = 'WAREHOUSE';

UPDATE "MiscFeeRecord"
SET "profitEligibleAt" = GREATEST("confirmedAt", "reviewedAt")
WHERE "ownerType" = 'WAREHOUSE'
  AND "confirmationStatus" = 'CONFIRMED'
  AND "auditStatus" = 'APPROVED'
  AND "confirmedAt" IS NOT NULL
  AND "reviewedAt" IS NOT NULL;

CREATE INDEX "MiscFeeRecord_ownerType_ownerSiteSnapshot_profitEligibleAt_idx"
ON "MiscFeeRecord"("ownerType", "ownerSiteSnapshot", "profitEligibleAt");
