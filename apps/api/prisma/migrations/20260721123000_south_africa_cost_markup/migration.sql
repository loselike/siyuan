-- Existing South Africa rules only contain the final business quote. Keep that
-- quote unchanged and leave the new cost/markup inputs empty until operators
-- explicitly complete both values in price-book management.
ALTER TABLE "SouthAfricaRateRule"
  ADD COLUMN "costPerCbm" DECIMAL(65,30),
  ADD COLUMN "markupPerCbm" DECIMAL(65,30);

INSERT INTO "Permission" ("id", "code")
VALUES ('perm-pricing-south-africa-cost-markup-view', 'pricing:south-africa:cost-markup-view')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
JOIN "Role" AS role ON role."name" = 'UG_MARKET'
WHERE permission."code" = 'pricing:south-africa:cost-markup-view'
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-south-africa-cost-markup-permission-20260721123000',
  'system',
  'system.role_permissions.extend',
  'role-group:market-south-africa-cost-markup',
  '{"reason":"South Africa cost and markup are sensitive management fields"}'::jsonb,
  '{"roles":["UG_MARKET"],"permissions":["pricing:south-africa:cost-markup-view"]}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
