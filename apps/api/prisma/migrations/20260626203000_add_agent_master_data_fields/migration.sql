ALTER TABLE "Agent"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "shortName" TEXT,
  ADD COLUMN "integrationType" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "warehouseAddress1" TEXT,
  ADD COLUMN "warehouseAddress2" TEXT,
  ADD COLUMN "warehouseAddress3" TEXT,
  ADD COLUMN "warehouseContact" TEXT,
  ADD COLUMN "invoiceTemplateName" TEXT,
  ADD COLUMN "invoiceTemplateUrl" TEXT;

UPDATE "Agent"
SET
  "code" = COALESCE("code", UPPER(SUBSTRING("name", 1, 6))),
  "shortName" = COALESCE("shortName", "name")
WHERE "code" IS NULL OR "shortName" IS NULL;

INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-master-data-agents-read', 'master-data:agents:read'),
  ('p-master-data-agents-write', 'master-data:agents:write')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" = 'ADMIN'
WHERE p."code" IN ('master-data:agents:read', 'master-data:agents:write')
ON CONFLICT ("A", "B") DO NOTHING;
