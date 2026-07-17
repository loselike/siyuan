-- South Africa material rules are the business-facing quote basis. Business
-- groups may read all rules, while every create/update/enable/delete permission
-- remains manager-only.
INSERT INTO "Permission" ("id", "code")
VALUES ('perm-pricing-south-africa-rules-read', 'pricing:south-africa:rules-read')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
JOIN "Role" AS role ON role."name" IN (
  'OPERATOR',
  'UG_MARKET',
  'UG_BUSINESS',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN'
)
WHERE permission."code" = 'pricing:south-africa:rules-read'
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-grant-business-south-africa-rule-read-20260716103000',
  'system',
  'system.role_permissions.repair',
  'role-groups:business-south-africa-rule-read',
  '{"reason":"business quote users need the complete South Africa material rule table"}'::jsonb,
  '{"roles":["OPERATOR","UG_MARKET","UG_BUSINESS","UG_BUSINESS_MANAGER","UG_BUSINESS_SUPERVISOR","UG_SZ_WUHAN","UG_ZZ_SIHUA","UG_WH_JIUYULIAN"],"permissions":["pricing:south-africa:rules-read"],"mode":"read-only"}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
