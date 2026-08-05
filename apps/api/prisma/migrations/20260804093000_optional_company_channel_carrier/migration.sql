ALTER TABLE "Channel" ALTER COLUMN "carrierId" DROP NOT NULL;
ALTER TABLE "Channel" ALTER COLUMN "category" SET DEFAULT '';

-- Remove only the legacy frontend fallback: a non-express channel with a blank
-- category that was silently attached to DHL. Explicit carrier/category choices
-- and all express channels remain untouched.
UPDATE "Channel"
SET "carrierId" = NULL
WHERE "businessType" <> 'EXPRESS'
  AND NULLIF(btrim(COALESCE("category", '')), '') IS NULL
  AND "carrierId" IN (
    SELECT "id"
    FROM "Carrier"
    WHERE upper(btrim("name")) = 'DHL'
  );
