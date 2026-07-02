INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-finance-business-cost-read', 'finance:business-cost:read'),
  ('p-finance-business-cost-manage', 'finance:business-cost:manage'),
  ('p-finance-business-cost-audit', 'finance:business-cost:audit'),
  ('p-finance-business-cost-reverse', 'finance:business-cost:reverse'),
  ('p-finance-business-cost-void', 'finance:business-cost:void'),
  ('p-finance-business-cost-export', 'finance:business-cost:export'),
  ('p-finance-business-cost-view-all', 'finance:business-cost:view-all'),
  ('p-finance-business-cost-view-agent', 'finance:business-cost:view-agent'),
  ('p-finance-business-cost-view-profit', 'finance:business-cost:view-profit')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN ('ADMIN', 'FINANCE')
WHERE p."code" IN (
  'finance:business-cost:read',
  'finance:business-cost:manage',
  'finance:business-cost:audit',
  'finance:business-cost:reverse',
  'finance:business-cost:void',
  'finance:business-cost:export',
  'finance:business-cost:view-all',
  'finance:business-cost:view-agent',
  'finance:business-cost:view-profit'
)
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" = 'OPERATOR'
WHERE p."code" IN (
  'finance:business-cost:read',
  'finance:business-cost:manage',
  'finance:business-cost:view-profit'
)
ON CONFLICT ("A", "B") DO NOTHING;
