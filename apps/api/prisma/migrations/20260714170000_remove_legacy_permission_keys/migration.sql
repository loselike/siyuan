-- Remove the pre-function-matrix grants. Audit rows intentionally retain their
-- historical text; only live role bindings and permission definitions are pruned.
WITH legacy_codes(code) AS (
  VALUES
    ('workspace:access'),
    ('orders:read'), ('orders:write'), ('orders:review:reverse'), ('orders:review:restore'), ('orders:review:purge'),
    ('routing:read'), ('routing:write'),
    ('warehouse:read'), ('warehouse:write'),
    ('tracking:read'), ('tracking:write'),
    ('problems:read'), ('problems:write'),
    ('pricing:lookup'), ('pricing:manage'),
    ('finance:read'), ('finance:settle'), ('reports:read'),
    ('master-data:read'), ('master-data:write'),
    ('system:manage'), ('common-tags:manage')
)
DELETE FROM "_PermissionToRole"
WHERE "A" IN (SELECT "id" FROM "Permission" WHERE "code" IN (SELECT "code" FROM legacy_codes));

WITH legacy_codes(code) AS (
  VALUES
    ('workspace:access'),
    ('orders:read'), ('orders:write'), ('orders:review:reverse'), ('orders:review:restore'), ('orders:review:purge'),
    ('routing:read'), ('routing:write'),
    ('warehouse:read'), ('warehouse:write'),
    ('tracking:read'), ('tracking:write'),
    ('problems:read'), ('problems:write'),
    ('pricing:lookup'), ('pricing:manage'),
    ('finance:read'), ('finance:settle'), ('reports:read'),
    ('master-data:read'), ('master-data:write'),
    ('system:manage'), ('common-tags:manage')
)
DELETE FROM "Permission" WHERE "code" IN (SELECT "code" FROM legacy_codes);

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'permission-cleanup-20260714170000',
  'system',
  'system.permission.legacy_cleanup',
  'permission-matrix',
  '{"legacyPermissionKeys":22}',
  '{"liveLegacyBindings":0}',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
