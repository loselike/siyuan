DELETE FROM "_PermissionToRole" rel
USING "Permission" p, "Role" r
WHERE rel."A" = p."id"
  AND rel."B" = r."id"
  AND p."code" = 'orders:write'
  AND r."name" IN ('FINANCE', 'UG_FINANCE');

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-limit-final-review-to-finance-20260703043000',
  'system',
  'system.role_permissions.repair',
  'role-groups:finance-final-review',
  '{"reason":"final shipment review should not grant general order write access"}'::jsonb,
  '{"roles":["FINANCE","UG_FINANCE"],"removedPermissions":["orders:write"],"finalReviewPermission":"finance:settle"}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
