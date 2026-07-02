INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-orders-review-restore', 'orders:review:restore'),
  ('p-orders-review-purge', 'orders:review:purge')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN ('ADMIN', 'FINANCE')
WHERE p."code" = 'orders:review:restore'
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" = 'ADMIN'
WHERE p."code" = 'orders:review:purge'
ON CONFLICT ("A", "B") DO NOTHING;
