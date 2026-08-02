-- Business users now complete business assignment on payable-first pickup fees;
-- they no longer create, edit, hang, or upload payable-side pickup records.
DELETE FROM "_PermissionToRole" AS role_permission
USING "Permission" AS permission, "Role" AS role
WHERE role_permission."A" = permission."id"
  AND role_permission."B" = role."id"
  AND role."name" IN (
    'OPERATOR',
    'UG_BUSINESS',
    'UG_SZ_WUHAN',
    'UG_ZZ_SIHUA',
    'UG_WH_JIUYULIAN',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR'
  )
  AND permission."code" IN (
    'misc-fee:pickup:create',
    'misc-fee:pickup:update',
    'misc-fee:pickup:hang',
    'misc-fee:pickup:attachment-upload'
  );
