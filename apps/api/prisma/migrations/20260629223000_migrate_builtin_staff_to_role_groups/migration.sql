UPDATE "Role"
SET
  "label" = '管理员组',
  "description" = '系统管理员',
  "sortOrder" = 0,
  "enabled" = true,
  "systemBuiltin" = false
WHERE "name" = 'ADMIN';

UPDATE "User"
SET "roleId" = target."id"
FROM "Role" source, "Role" target
WHERE "User"."roleId" = source."id"
  AND source."name" = 'CUSTOMER_SERVICE'
  AND target."name" = 'UG_CUSTOMER_SERVICE';

UPDATE "User"
SET "roleId" = target."id"
FROM "Role" source, "Role" target
WHERE "User"."roleId" = source."id"
  AND source."name" = 'OPERATOR'
  AND target."name" = 'UG_BUSINESS';

UPDATE "User"
SET "roleId" = target."id"
FROM "Role" source, "Role" target
WHERE "User"."roleId" = source."id"
  AND source."name" = 'WAREHOUSE'
  AND target."name" = 'UG_WAREHOUSE_RECEIVE';

UPDATE "User"
SET "roleId" = target."id"
FROM "Role" source, "Role" target
WHERE "User"."roleId" = source."id"
  AND source."name" = 'FINANCE'
  AND target."name" = 'UG_FINANCE';

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-migrate-builtin-staff-role-groups-20260629223000',
  'system',
  'system.staff.role_group_migration',
  'role-groups:builtin-staff',
  '{"ADMIN":"系统管理员","CUSTOMER_SERVICE":"客服","OPERATOR":"业务员","WAREHOUSE":"仓库","FINANCE":"财务"}'::jsonb,
  '{"ADMIN":"管理员组","CUSTOMER_SERVICE":"UG_CUSTOMER_SERVICE","OPERATOR":"UG_BUSINESS","WAREHOUSE":"UG_WAREHOUSE_RECEIVE","FINANCE":"UG_FINANCE"}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
