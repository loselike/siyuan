ALTER TABLE "WaterReceipt"
  ADD COLUMN "createdBy" TEXT,
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "paymentNoKey" TEXT;

WITH unique_creator AS (
  SELECT audit."target", MIN(audit."actorId") AS "actorId"
  FROM "AuditLog" AS audit
  WHERE audit."action" = 'finance.water_receipt.create'
  GROUP BY audit."target"
  HAVING COUNT(DISTINCT audit."actorId") = 1
)
UPDATE "WaterReceipt" AS receipt
SET
  "createdBy" = creator."username",
  "createdByUserId" = creator."id"
FROM unique_creator AS audit
INNER JOIN "User" AS creator
  ON creator."id" = audit."actorId"
WHERE audit."target" = receipt."id"
  AND receipt."createdByUserId" IS NULL;

UPDATE "WaterReceipt"
SET "paymentNoKey" = NULLIF(
  BTRIM(
    replace(
      replace(
        replace(
          replace(regexp_replace("paymentNo", '[[:cntrl:]<>]', '', 'g'), chr(8203), ''),
          chr(8204), ''
        ),
        chr(8205), ''
      ),
      chr(65279), ''
    )
  ),
  ''
)
WHERE "paymentNo" IS NOT NULL;

ALTER TABLE "WaterReceipt"
  ADD CONSTRAINT "WaterReceipt_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WaterReceipt_createdByUserId_receiptDate_idx"
  ON "WaterReceipt"("createdByUserId", "receiptDate");

CREATE UNIQUE INDEX "WaterReceipt_paymentNoKey_key"
  ON "WaterReceipt"("paymentNoKey");

CREATE UNIQUE INDEX "WaterReceipt_accountLedgerId_key"
  ON "WaterReceipt"("accountLedgerId");

INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-finance:water-receipt:read', 'finance:water-receipt:read'),
  ('p-finance:water-receipt:detail', 'finance:water-receipt:detail'),
  ('p-finance:water-receipt:create', 'finance:water-receipt:create'),
  ('p-finance:water-receipt:update', 'finance:water-receipt:update'),
  ('p-finance:water-receipt:voucher-view', 'finance:water-receipt:voucher-view'),
  ('p-finance:water-receipt:voucher-upload', 'finance:water-receipt:voucher-upload'),
  ('p-finance:water-receipt:voucher-delete', 'finance:water-receipt:voucher-delete'),
  ('p-finance:water-match:read', 'finance:water-match:read'),
  ('p-finance:water-match:receivable-view', 'finance:water-match:receivable-view'),
  ('p-finance:water-match:create', 'finance:water-match:create')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
CROSS JOIN "Role" AS role
WHERE permission."code" IN (
  'finance:water-receipt:read',
  'finance:water-receipt:detail',
  'finance:water-receipt:create',
  'finance:water-receipt:update',
  'finance:water-receipt:voucher-view',
  'finance:water-receipt:voucher-upload',
  'finance:water-receipt:voucher-delete',
  'finance:water-match:read',
  'finance:water-match:receivable-view',
  'finance:water-match:create'
)
  AND role."name" IN (
    'OPERATOR',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR'
  )
ON CONFLICT DO NOTHING;

DELETE FROM "_PermissionToRole" AS assignment
USING "Permission" AS permission, "Role" AS role
WHERE assignment."A" = permission."id"
  AND assignment."B" = role."id"
  AND role."name" IN (
    'OPERATOR',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR'
  )
  AND (
    permission."code" LIKE 'finance:water-receipt:%'
    OR permission."code" LIKE 'finance:water-match:%'
  )
  AND permission."code" NOT IN (
    'finance:water-receipt:read',
    'finance:water-receipt:detail',
    'finance:water-receipt:create',
    'finance:water-receipt:update',
    'finance:water-receipt:voucher-view',
    'finance:water-receipt:voucher-upload',
    'finance:water-receipt:voucher-delete',
    'finance:water-match:read',
    'finance:water-match:receivable-view',
    'finance:water-match:create'
  );

DELETE FROM "_PermissionToRole" AS assignment
USING "Permission" AS permission, "Role" AS role
WHERE assignment."A" = permission."id"
  AND assignment."B" = role."id"
  AND role."name" = 'UG_MARKET'
  AND (
    permission."code" LIKE 'finance:water-receipt:%'
    OR permission."code" LIKE 'finance:water-match:%'
  );
