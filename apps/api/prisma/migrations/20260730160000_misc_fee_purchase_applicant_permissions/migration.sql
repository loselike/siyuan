-- Only business roles may create and maintain purchase applications.
-- Finance keeps full misc-fee permissions for approval/payment handling, while
-- the market role must not inherit the OPERATOR purchase application path.
WITH purchase_permissions(code) AS (
  VALUES
    ('misc-fee:purchase:read'),
    ('misc-fee:purchase:create'),
    ('misc-fee:purchase:update'),
    ('misc-fee:purchase:void'),
    ('misc-fee:purchase:confirm'),
    ('misc-fee:purchase:hang'),
    ('misc-fee:purchase:attachment-view'),
    ('misc-fee:purchase:attachment-upload')
)
INSERT INTO "Permission" ("id", "code")
SELECT 'perm-' || md5(code), code
FROM purchase_permissions
ON CONFLICT ("code") DO NOTHING;

WITH purchase_permissions(code) AS (
  VALUES
    ('misc-fee:purchase:read'),
    ('misc-fee:purchase:create'),
    ('misc-fee:purchase:update'),
    ('misc-fee:purchase:void'),
    ('misc-fee:purchase:confirm'),
    ('misc-fee:purchase:hang'),
    ('misc-fee:purchase:attachment-view'),
    ('misc-fee:purchase:attachment-upload')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM purchase_permissions
JOIN "Permission" AS permission ON permission."code" = purchase_permissions.code
JOIN "Role" AS role ON role."name" IN (
  'OPERATOR',
  'UG_BUSINESS',
  'UG_SZ_WUHAN',
  'UG_ZZ_SIHUA',
  'UG_WH_JIUYULIAN',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR'
)
ON CONFLICT ("A", "B") DO NOTHING;

DELETE FROM "_PermissionToRole" AS assignment
USING "Permission" AS permission, "Role" AS role
WHERE assignment."A" = permission."id"
  AND assignment."B" = role."id"
  AND role."name" = 'UG_MARKET'
  AND permission."code" LIKE 'misc-fee:purchase:%';
