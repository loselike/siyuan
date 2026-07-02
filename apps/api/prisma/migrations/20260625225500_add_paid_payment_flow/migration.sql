ALTER TABLE "PaymentApplication"
  ADD COLUMN IF NOT EXISTS "payerBankName" TEXT,
  ADD COLUMN IF NOT EXISTS "payerBankAccountName" TEXT,
  ADD COLUMN IF NOT EXISTS "payerBankAccountNo" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paidBy" TEXT,
  ADD COLUMN IF NOT EXISTS "paidRemark" TEXT,
  ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reversedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "reverseReason" TEXT;

ALTER TABLE "PaymentVoucher"
  ADD COLUMN IF NOT EXISTS "voucherType" TEXT NOT NULL DEFAULT 'BILL';

CREATE INDEX IF NOT EXISTS "PaymentApplication_status_paidAt_idx"
  ON "PaymentApplication"("status", "paidAt");

INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-finance-payable-paid-read', 'finance:payable:paid-read'),
  ('p-finance-payable-paid-confirm', 'finance:payable:paid-confirm'),
  ('p-finance-payable-paid-reverse', 'finance:payable:paid-reverse'),
  ('p-finance-payable-paid-export', 'finance:payable:paid-export'),
  ('p-finance-payable-paid-voucher', 'finance:payable:paid-voucher'),
  ('p-finance-payable-paid-bank-view', 'finance:payable:paid-bank-view')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN ('ADMIN', 'FINANCE')
WHERE p."code" IN (
  'finance:payable:paid-read',
  'finance:payable:paid-confirm',
  'finance:payable:paid-reverse',
  'finance:payable:paid-export',
  'finance:payable:paid-voucher',
  'finance:payable:paid-bank-view'
)
ON CONFLICT ("A", "B") DO NOTHING;
