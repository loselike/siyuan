INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-master-data-customers-read', 'master-data:customers:read'),
  ('perm-master-data-customers-write', 'master-data:customers:write'),
  ('perm-master-data-finance-read', 'master-data:finance:read'),
  ('perm-master-data-finance-write', 'master-data:finance:write'),
  ('perm-master-data-agent-channels-read', 'master-data:agent-channels:read'),
  ('perm-master-data-agent-channels-write', 'master-data:agent-channels:write'),
  ('perm-master-data-channel-categories-read', 'master-data:channel-categories:read'),
  ('perm-master-data-channel-categories-write', 'master-data:channel-categories:write'),
  ('perm-master-data-remote-areas-read', 'master-data:remote-areas:read'),
  ('perm-master-data-remote-areas-write', 'master-data:remote-areas:write'),
  ('perm-master-data-exchange-rates-read', 'master-data:exchange-rates:read'),
  ('perm-master-data-exchange-rates-write', 'master-data:exchange-rates:write'),
  ('perm-master-data-assistant-read', 'master-data:assistant:read')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target."id", role_link."B"
FROM "_PermissionToRole" role_link
JOIN "Permission" source ON source."id" = role_link."A"
JOIN "Permission" target ON target."code" IN (
  'master-data:customers:read',
  'master-data:finance:read',
  'master-data:remote-areas:read',
  'master-data:exchange-rates:read',
  'master-data:assistant:read'
)
WHERE source."code" = 'master-data:read'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target."id", role_link."B"
FROM "_PermissionToRole" role_link
JOIN "Permission" source ON source."id" = role_link."A"
JOIN "Permission" target ON target."code" IN (
  'master-data:customers:write',
  'master-data:finance:write',
  'master-data:remote-areas:write',
  'master-data:exchange-rates:write'
)
WHERE source."code" = 'master-data:write'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target."id", role_link."B"
FROM "_PermissionToRole" role_link
JOIN "Permission" source ON source."id" = role_link."A"
JOIN "Permission" target ON target."code" = 'master-data:agent-channels:read'
WHERE source."code" = 'master-data:agents:read'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target."id", role_link."B"
FROM "_PermissionToRole" role_link
JOIN "Permission" source ON source."id" = role_link."A"
JOIN "Permission" target ON target."code" = 'master-data:agent-channels:write'
WHERE source."code" = 'master-data:agents:write'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target."id", role_link."B"
FROM "_PermissionToRole" role_link
JOIN "Permission" source ON source."id" = role_link."A"
JOIN "Permission" target ON target."code" = 'master-data:channel-categories:read'
WHERE source."code" = 'master-data:channels:read'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT target."id", role_link."B"
FROM "_PermissionToRole" role_link
JOIN "Permission" source ON source."id" = role_link."A"
JOIN "Permission" target ON target."code" = 'master-data:channel-categories:write'
WHERE source."code" = 'master-data:channels:write'
ON CONFLICT DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-split-master-data-permissions-20260703023000',
  'system',
  'system.role_permissions.repair',
  'role-groups:master-data-secondary-permissions',
  '{"reason":"基础资料二级功能需要出现在角色权限分配中，保留旧权限并补细分权限"}'::jsonb,
  '{"permissions":["master-data:customers:read","master-data:customers:write","master-data:finance:read","master-data:finance:write","master-data:agent-channels:read","master-data:agent-channels:write","master-data:channel-categories:read","master-data:channel-categories:write","master-data:remote-areas:read","master-data:remote-areas:write","master-data:exchange-rates:read","master-data:exchange-rates:write","master-data:assistant:read"]}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
