-- Warehouse registrars may soft-delete an unmatched, unaudited tally fee.
-- The API keeps the final state guard and audit trail; this migration only
-- makes the existing `misc-fee:tally:void` permission available to warehouse roles.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
JOIN "Role" AS role
  ON role."name" IN ('WAREHOUSE', 'UG_WAREHOUSE_RECEIVE', 'UG_WAREHOUSE_OUTBOUND')
WHERE permission."code" = 'misc-fee:tally:void'
ON CONFLICT ("A", "B") DO NOTHING;
