INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-master-data-write', 'master-data:write')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN (
  'OPERATOR',
  'UG_BUSINESS',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN'
)
WHERE p."code" = 'master-data:write'
ON CONFLICT DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-restore-business-master-data-write-20260703003000',
  'system',
  'system.role_permissions.repair',
  'role-groups:business-master-data',
  '{"reason":"business users maintain their own customer master data"}'::jsonb,
  '{"roles":["OPERATOR","UG_BUSINESS","UG_BUSINESS_MANAGER","UG_BUSINESS_SUPERVISOR","UG_SZ_WUHAN","UG_ZZ_SIHUA","UG_WH_JIUYULIAN"],"permissions":["master-data:write"]}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
