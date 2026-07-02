INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-workspace-access', 'workspace:access'),
  ('perm-orders-read', 'orders:read'),
  ('perm-orders-write', 'orders:write')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN (
  'UG_BUSINESS',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN'
)
WHERE p."code" IN ('workspace:access', 'orders:read', 'orders:write')
ON CONFLICT DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-restore-business-order-entry-permissions-20260702143000',
  'system',
  'system.role_permissions.repair',
  'role-groups:business-order-entry',
  '{"reason":"UG_BUSINESS lacked order-entry permissions on 47"}'::jsonb,
  '{"roles":["UG_BUSINESS","UG_BUSINESS_MANAGER","UG_BUSINESS_SUPERVISOR","UG_SZ_WUHAN","UG_ZZ_SIHUA","UG_WH_JIUYULIAN"],"permissions":["workspace:access","orders:read","orders:write"]}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
