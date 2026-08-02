ALTER TABLE "WaterReceiptMatchRequest"
  ADD COLUMN "reviewBatchId" TEXT,
  ADD COLUMN "reversedBy" TEXT,
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reverseReason" TEXT;

UPDATE "WaterReceiptMatchRequest"
SET "reviewBatchId" = "id"
WHERE "reviewBatchId" IS NULL;

ALTER TABLE "WaterReceiptMatchRequest"
  ALTER COLUMN "reviewBatchId" SET NOT NULL;

ALTER TABLE "WaterReceiptMatchRequest"
  DROP CONSTRAINT IF EXISTS "WaterReceiptMatchRequest_status_check";

ALTER TABLE "WaterReceiptMatchRequest"
  ADD CONSTRAINT "WaterReceiptMatchRequest_status_check"
  CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVERSED'));

CREATE INDEX "WaterReceiptMatchRequest_reviewBatchId_status_idx"
  ON "WaterReceiptMatchRequest"("reviewBatchId", "status");

INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-finance:water-match:audit', 'finance:water-match:audit'),
  ('p-finance:water-match:reverse', 'finance:water-match:reverse')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target_permission."id", role_permission."B"
FROM "Permission" AS source_permission
INNER JOIN "_PermissionToRole" AS role_permission
  ON role_permission."A" = source_permission."id"
CROSS JOIN "Permission" AS target_permission
WHERE source_permission."code" = 'finance:water-match:cancel'
  AND target_permission."code" IN (
    'finance:water-match:audit',
    'finance:water-match:reverse'
  )
ON CONFLICT DO NOTHING;
