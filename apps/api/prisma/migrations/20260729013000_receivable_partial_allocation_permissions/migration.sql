-- Allow one receivable fee to reserve multiple partial allocations before finance approval.
DROP INDEX IF EXISTS "WaterReceiptMatchRequest_pending_manual_key";
DROP INDEX IF EXISTS "WaterReceiptMatchRequest_pending_system_key";

-- Business users may maintain only their own pending allocations; repository ownership
-- and current-customer checks remain the object-level authorization boundary.
INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-finance:water-match:adjust', 'finance:water-match:adjust'),
  ('p-finance:water-match:cancel', 'finance:water-match:cancel')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
CROSS JOIN "Role" AS role
WHERE permission."code" IN (
  'finance:water-match:adjust',
  'finance:water-match:cancel'
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
