INSERT INTO "Permission" ("id", "code")
VALUES ('perm-warehouse-dispatch-declaration-update', 'warehouse:dispatch-pending:declaration-update')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
JOIN "Role" AS role
  ON role."name" IN ('WAREHOUSE', 'UG_WAREHOUSE_OUTBOUND')
WHERE permission."code" = 'warehouse:dispatch-pending:declaration-update'
ON CONFLICT ("A", "B") DO NOTHING;
