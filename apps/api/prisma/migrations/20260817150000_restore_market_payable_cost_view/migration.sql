-- Restore the market pending-routing payable-cost capability removed by the
-- positive permission rebuild.  This is an additive catalog/grant change only;
-- no shipment, finance, or audit rows are modified.
BEGIN;

INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-market-v2-pending-payable-cost-view', 'market:pending-routing:payable-cost:view'),
  ('perm-market-v2-pending-payable-cost-create', 'market:pending-routing:payable-cost:create'),
  ('perm-market-v2-pending-payable-cost-edit', 'market:pending-routing:payable-cost:edit'),
  ('perm-market-v2-pending-payable-cost-delete', 'market:pending-routing:payable-cost:delete')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" permission
JOIN "Role" role ON role."name" = 'UG_MARKET'
WHERE permission."code" = 'market:pending-routing:payable-cost:view'
ON CONFLICT DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" permission
JOIN "Role" role ON role."name" = 'UG_MARKET'
WHERE permission."code" IN (
  'market:pending-routing:payable-cost:create',
  'market:pending-routing:payable-cost:edit',
  'market:pending-routing:payable-cost:delete'
)
ON CONFLICT DO NOTHING;

COMMIT;
