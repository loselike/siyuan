INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-order-fee-payable-view', 'finance:order-fee:payable:view'),
  ('p-order-fee-payable-manage', 'finance:order-fee:payable:manage'),
  ('p-order-fee-profit-receivable-payable', 'finance:order-fee:profit:receivable-payable'),
  ('p-order-fee-profit-receivable-business', 'finance:order-fee:profit:receivable-business'),
  ('p-order-fee-profit-business-payable', 'finance:order-fee:profit:business-payable')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN ('ADMIN', 'FINANCE')
WHERE p."code" IN (
  'finance:order-fee:payable:view',
  'finance:order-fee:payable:manage',
  'finance:order-fee:profit:receivable-payable',
  'finance:order-fee:profit:receivable-business',
  'finance:order-fee:profit:business-payable'
)
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" = 'OPERATOR'
WHERE p."code" = 'finance:order-fee:profit:receivable-business'
ON CONFLICT ("A", "B") DO NOTHING;
