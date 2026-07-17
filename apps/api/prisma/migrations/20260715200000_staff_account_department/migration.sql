ALTER TABLE "User" ADD COLUMN "departmentId" TEXT;

CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Department" ("id", "name", "enabled")
SELECT 'department-business', '业务部', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Department" WHERE "name" = '业务部');

INSERT INTO "Department" ("id", "name", "enabled")
SELECT 'department-market', '市场部', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Department" WHERE "name" = '市场部');

INSERT INTO "Department" ("id", "name", "enabled")
SELECT 'department-warehouse', '仓储部', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Department" WHERE "name" = '仓储部');

INSERT INTO "Department" ("id", "name", "enabled")
SELECT 'department-customer-service', '客服部', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Department" WHERE "name" = '客服部');

INSERT INTO "Department" ("id", "name", "enabled")
SELECT 'department-finance', '财务部', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Department" WHERE "name" = '财务部');

INSERT INTO "Department" ("id", "name", "enabled")
SELECT 'department-system', '系统管理部', TRUE
WHERE NOT EXISTS (SELECT 1 FROM "Department" WHERE "name" = '系统管理部');
