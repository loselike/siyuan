INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-master-data-channels-read', 'master-data:channels:read')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN (
  'OPERATOR',
  'UG_MARKET',
  'UG_BUSINESS',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN'
)
WHERE p."code" = 'master-data:channels:read'
ON CONFLICT DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-grant-business-channel-read-20260703013000',
  'system',
  'system.role_permissions.repair',
  'role-groups:business-channel-read',
  '{"reason":"business order entry must select business channels without seeing agent channel details"}'::jsonb,
  '{"roles":["OPERATOR","UG_MARKET","UG_BUSINESS","UG_BUSINESS_MANAGER","UG_BUSINESS_SUPERVISOR","UG_SZ_WUHAN","UG_ZZ_SIHUA","UG_WH_JIUYULIAN"],"permissions":["master-data:channels:read"]}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
