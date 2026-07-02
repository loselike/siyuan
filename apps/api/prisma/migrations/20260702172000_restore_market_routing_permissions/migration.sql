INSERT INTO "Role" ("id", "name", "label", "description", "site", "sortOrder", "enabled", "systemBuiltin")
VALUES ('r-ug-market', 'UG_MARKET', '市场部', '处理排货', '深圳思远', 6, true, false)
ON CONFLICT ("name") DO UPDATE SET
  "label" = COALESCE("Role"."label", EXCLUDED."label"),
  "description" = COALESCE("Role"."description", EXCLUDED."description"),
  "site" = COALESCE("Role"."site", EXCLUDED."site"),
  "sortOrder" = COALESCE("Role"."sortOrder", EXCLUDED."sortOrder"),
  "enabled" = true,
  "systemBuiltin" = false;

INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-workspace-access', 'workspace:access'),
  ('perm-orders-read', 'orders:read'),
  ('perm-orders-write', 'orders:write'),
  ('perm-routing-read', 'routing:read'),
  ('perm-routing-write', 'routing:write'),
  ('perm-warehouse-read', 'warehouse:read'),
  ('perm-tracking-read', 'tracking:read'),
  ('perm-pricing-lookup', 'pricing:lookup'),
  ('perm-finance-business-cost-read', 'finance:business-cost:read'),
  ('perm-finance-business-cost-manage', 'finance:business-cost:manage'),
  ('perm-master-data-read', 'master-data:read')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" = 'UG_MARKET'
WHERE p."code" IN (
  'workspace:access',
  'orders:read',
  'orders:write',
  'routing:read',
  'routing:write',
  'warehouse:read',
  'tracking:read',
  'pricing:lookup',
  'finance:business-cost:read',
  'finance:business-cost:manage',
  'master-data:read'
)
ON CONFLICT DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-restore-market-routing-permissions-20260702172000',
  'system',
  'system.role_permissions.repair',
  'role:UG_MARKET',
  '{"reason":"UG_MARKET lacked routing permissions on 47 lifecycle sample"}'::jsonb,
  '{"role":"UG_MARKET","permissions":["workspace:access","orders:read","orders:write","routing:read","routing:write","warehouse:read","tracking:read","pricing:lookup","finance:business-cost:read","finance:business-cost:manage","master-data:read"]}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
