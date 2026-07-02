CREATE TABLE IF NOT EXISTS "AgentBankAccount" (
  "id" TEXT NOT NULL,
  "agentId" TEXT,
  "agentName" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "bankAccountNo" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RMB',
  "remark" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AgentBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayablePaymentApplication" (
  "id" TEXT NOT NULL,
  "payableFinanceItemId" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "agentBankAccountId" TEXT,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RMB',
  "paymentNo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "remark" TEXT,
  "invalidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayablePaymentApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayableBillAttachment" (
  "id" TEXT NOT NULL,
  "payablePaymentApplicationId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "url" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayableBillAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgentBankAccount_agentName_enabled_idx" ON "AgentBankAccount"("agentName", "enabled");
CREATE INDEX IF NOT EXISTS "AgentBankAccount_agentId_enabled_idx" ON "AgentBankAccount"("agentId", "enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "PayablePaymentApplication_payableFinanceItemId_key" ON "PayablePaymentApplication"("payableFinanceItemId");
CREATE INDEX IF NOT EXISTS "PayablePaymentApplication_status_createdAt_idx" ON "PayablePaymentApplication"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PayablePaymentApplication_shipmentId_idx" ON "PayablePaymentApplication"("shipmentId");
CREATE INDEX IF NOT EXISTS "PayableBillAttachment_payablePaymentApplicationId_createdAt_idx" ON "PayableBillAttachment"("payablePaymentApplicationId", "createdAt");

ALTER TABLE "AgentBankAccount"
  ADD CONSTRAINT "AgentBankAccount_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayablePaymentApplication"
  ADD CONSTRAINT "PayablePaymentApplication_payableFinanceItemId_fkey"
  FOREIGN KEY ("payableFinanceItemId") REFERENCES "ShipmentFinanceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PayablePaymentApplication"
  ADD CONSTRAINT "PayablePaymentApplication_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PayablePaymentApplication"
  ADD CONSTRAINT "PayablePaymentApplication_agentBankAccountId_fkey"
  FOREIGN KEY ("agentBankAccountId") REFERENCES "AgentBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayableBillAttachment"
  ADD CONSTRAINT "PayableBillAttachment_payablePaymentApplicationId_fkey"
  FOREIGN KEY ("payablePaymentApplicationId") REFERENCES "PayablePaymentApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-finance-payable-read', 'finance:payable:read'),
  ('p-finance-payable-manage', 'finance:payable:manage'),
  ('p-finance-payable-audit', 'finance:payable:audit'),
  ('p-finance-payable-reverse', 'finance:payable:reverse'),
  ('p-finance-payable-void', 'finance:payable:void'),
  ('p-finance-payable-export', 'finance:payable:export'),
  ('p-finance-payable-payment', 'finance:payable:payment'),
  ('p-finance-payable-bank', 'finance:payable:bank'),
  ('p-finance-payable-attachment', 'finance:payable:attachment'),
  ('p-finance-payable-view-sensitive', 'finance:payable:view-sensitive'),
  ('p-finance-payable-view-profit', 'finance:payable:view-profit')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN ('ADMIN', 'FINANCE')
WHERE p."code" IN (
  'finance:payable:read',
  'finance:payable:manage',
  'finance:payable:audit',
  'finance:payable:reverse',
  'finance:payable:void',
  'finance:payable:export',
  'finance:payable:payment',
  'finance:payable:bank',
  'finance:payable:attachment',
  'finance:payable:view-sensitive',
  'finance:payable:view-profit'
)
ON CONFLICT ("A", "B") DO NOTHING;
