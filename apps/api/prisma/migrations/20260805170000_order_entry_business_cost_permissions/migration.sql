INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-business:order-entry:business-cost-view', 'business:order-entry:business-cost-view'),
  ('p-business:order-entry:business-cost-write', 'business:order-entry:business-cost-write')
ON CONFLICT ("code") DO NOTHING;

-- Preserve each role's current order-entry behavior once, while leaving the
-- finance audit permissions independent after this migration.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target_permission."id", role_permission."B"
FROM "Permission" AS source_permission
INNER JOIN "_PermissionToRole" AS role_permission
  ON role_permission."A" = source_permission."id"
CROSS JOIN "Permission" AS target_permission
WHERE (
    source_permission."code" = 'finance:business-cost:read'
    AND target_permission."code" = 'business:order-entry:business-cost-view'
  )
  OR (
    source_permission."code" = 'finance:business-cost:manage'
    AND target_permission."code" IN (
      'business:order-entry:business-cost-view',
      'business:order-entry:business-cost-write'
    )
  )
ON CONFLICT DO NOTHING;
