-- Preserve the established workflow where business operators review their own orders.
INSERT INTO "Permission" ("id", "code")
VALUES ('perm_' || md5('finance:customer-account:read'), 'finance:customer-account:read')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission.id, role.id
FROM "Permission" AS permission
JOIN "Role" AS role ON role.name IN (
  'OPERATOR',
  'UG_BUSINESS',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR',
  'UG_MARKET',
  'UG_SZ_WUHAN',
  'UG_WH_JIUYULIAN',
  'UG_ZZ_SIHUA'
)
WHERE permission.code = 'business:review:approve'
ON CONFLICT ("A", "B") DO NOTHING;

-- Customer portal users can create and read only their own shipments and tickets;
-- repository customerId/customerVisible filters remain the authoritative data scope.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission.id, role.id
FROM "Permission" AS permission
JOIN "Role" AS role ON role.name = 'CUSTOMER'
WHERE permission.code IN (
  'business:order-entry:create',
  'business:shipment:list',
  'business:shipment:detail',
  'business:shipment:self-view',
  'customer-service:problem:view',
  'customer-service:problem:create',
  'customer-service:problem:reply',
  'customer-service:problem:close'
)
ON CONFLICT ("A", "B") DO NOTHING;

-- Business roles use company channels and must not receive internal agent identities.
DELETE FROM "_PermissionToRole" AS role_permission
USING "Permission" AS permission, "Role" AS role
WHERE role_permission."A" = permission.id
  AND role_permission."B" = role.id
  AND permission.code IN ('master-data:agents:read', 'master-data:agent-channels:read')
  AND role.name IN (
    'OPERATOR',
    'UG_BUSINESS',
    'UG_BUSINESS_MANAGER',
    'UG_BUSINESS_SUPERVISOR',
    'UG_SZ_WUHAN',
    'UG_WH_JIUYULIAN',
    'UG_ZZ_SIHUA'
  );

-- Business users keep CRUD access to their own customer records; repository scope
-- checks continue to block other salespeople's customers and salesperson reassignment.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission.id, role.id
FROM "Permission" AS permission
JOIN "Role" AS role ON role.name IN (
  'OPERATOR',
  'UG_BUSINESS',
  'UG_BUSINESS_MANAGER',
  'UG_BUSINESS_SUPERVISOR',
  'UG_SZ_WUHAN',
  'UG_WH_JIUYULIAN',
  'UG_ZZ_SIHUA'
)
WHERE permission.code IN (
  'business:shipment:finance-detail-view',
  'finance:water-receipt:voucher-view',
  'finance:water-receipt:voucher-upload',
  'finance:water-receipt:voucher-delete',
  'master-data:customers:read',
  'master-data:customers:view-own',
  'master-data:customers:detail',
  'master-data:customers:create',
  'master-data:customers:update',
  'master-data:customers:enable',
  'master-data:customers:delete',
  'master-data:customers:contacts-view',
  'master-data:customers:contacts-manage',
  'master-data:customers:contacts-disable',
  'master-data:customers:user-create',
  'master-data:customers:list-setting'
)
ON CONFLICT ("A", "B") DO NOTHING;

-- Customer portal account pages are read-only and repository filters remain
-- constrained to principal.customerId.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission.id, role.id
FROM "Permission" AS permission
JOIN "Role" AS role ON role.name = 'CUSTOMER'
WHERE permission.code = 'finance:customer-account:read'
ON CONFLICT ("A", "B") DO NOTHING;

-- Finance users retain the read-only shipment list used to reconcile business costs.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission.id, role.id
FROM "Permission" AS permission
JOIN "Role" AS role ON role.name IN (
  'FINANCE',
  'UG_FINANCE',
  'UG_PAYABLE_FINANCE'
)
WHERE permission.code = 'business:shipment:list'
ON CONFLICT ("A", "B") DO NOTHING;
