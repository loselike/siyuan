CREATE TABLE "PayerBankAccount" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "accountNoNormalized" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayerBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayerBankAccount_accountNoNormalized_key"
ON "PayerBankAccount"("accountNoNormalized");

CREATE INDEX "PayerBankAccount_bankName_accountName_idx"
ON "PayerBankAccount"("bankName", "accountName");

CREATE INDEX "PayerBankAccount_updatedAt_idx"
ON "PayerBankAccount"("updatedAt");

INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-master-data-payer-banks-read', 'master-data:payer-banks:read'),
  ('perm-master-data-payer-banks-manage', 'master-data:payer-banks:manage')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
CROSS JOIN "Role" AS role
WHERE permission."code" = 'master-data:payer-banks:read'
  AND role."name" IN ('ADMIN', 'FINANCE', 'UG_FINANCE', 'UG_PAYABLE_FINANCE')
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
CROSS JOIN "Role" AS role
WHERE permission."code" = 'master-data:payer-banks:manage'
  AND role."name" IN ('ADMIN', 'FINANCE', 'UG_FINANCE', 'UG_PAYABLE_FINANCE')
ON CONFLICT ("A", "B") DO NOTHING;
