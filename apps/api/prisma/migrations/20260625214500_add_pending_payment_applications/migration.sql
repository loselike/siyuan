ALTER TABLE "PayablePaymentApplication"
  ADD COLUMN IF NOT EXISTS "payeeBankAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "applicationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "appliedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PayeeBankAccount" (
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
  CONSTRAINT "PayeeBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentApplication" (
  "id" TEXT NOT NULL,
  "applicationNo" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RMB',
  "totalAmount" DECIMAL(65,30) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'WAITING_PAYMENT',
  "payeeBankAccountId" TEXT,
  "remark" TEXT,
  "appliedBy" TEXT,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "canceledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentApplicationItem" (
  "id" TEXT NOT NULL,
  "paymentApplicationId" TEXT NOT NULL,
  "payablePaymentApplicationId" TEXT NOT NULL,
  "payableFinanceItemId" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'RMB',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentApplicationItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentVoucher" (
  "id" TEXT NOT NULL,
  "paymentApplicationId" TEXT,
  "pendingPaymentId" TEXT,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "url" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentVoucher_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PayablePaymentApplication_applicationStatus_createdAt_idx" ON "PayablePaymentApplication"("applicationStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "PayeeBankAccount_agentName_currency_enabled_idx" ON "PayeeBankAccount"("agentName", "currency", "enabled");
CREATE INDEX IF NOT EXISTS "PayeeBankAccount_agentId_currency_enabled_idx" ON "PayeeBankAccount"("agentId", "currency", "enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentApplication_applicationNo_key" ON "PaymentApplication"("applicationNo");
CREATE INDEX IF NOT EXISTS "PaymentApplication_status_appliedAt_idx" ON "PaymentApplication"("status", "appliedAt");
CREATE INDEX IF NOT EXISTS "PaymentApplication_agentName_currency_appliedAt_idx" ON "PaymentApplication"("agentName", "currency", "appliedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentApplicationItem_payablePaymentApplicationId_key" ON "PaymentApplicationItem"("payablePaymentApplicationId");
CREATE INDEX IF NOT EXISTS "PaymentApplicationItem_paymentApplicationId_idx" ON "PaymentApplicationItem"("paymentApplicationId");
CREATE INDEX IF NOT EXISTS "PaymentApplicationItem_payableFinanceItemId_idx" ON "PaymentApplicationItem"("payableFinanceItemId");
CREATE INDEX IF NOT EXISTS "PaymentVoucher_paymentApplicationId_createdAt_idx" ON "PaymentVoucher"("paymentApplicationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentVoucher_pendingPaymentId_createdAt_idx" ON "PaymentVoucher"("pendingPaymentId", "createdAt");

ALTER TABLE "PayablePaymentApplication"
  ADD CONSTRAINT "PayablePaymentApplication_payeeBankAccountId_fkey"
  FOREIGN KEY ("payeeBankAccountId") REFERENCES "PayeeBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PayeeBankAccount"
  ADD CONSTRAINT "PayeeBankAccount_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentApplication"
  ADD CONSTRAINT "PaymentApplication_payeeBankAccountId_fkey"
  FOREIGN KEY ("payeeBankAccountId") REFERENCES "PayeeBankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentApplicationItem"
  ADD CONSTRAINT "PaymentApplicationItem_paymentApplicationId_fkey"
  FOREIGN KEY ("paymentApplicationId") REFERENCES "PaymentApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentApplicationItem"
  ADD CONSTRAINT "PaymentApplicationItem_payablePaymentApplicationId_fkey"
  FOREIGN KEY ("payablePaymentApplicationId") REFERENCES "PayablePaymentApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentApplicationItem"
  ADD CONSTRAINT "PaymentApplicationItem_payableFinanceItemId_fkey"
  FOREIGN KEY ("payableFinanceItemId") REFERENCES "ShipmentFinanceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentApplicationItem"
  ADD CONSTRAINT "PaymentApplicationItem_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentVoucher"
  ADD CONSTRAINT "PaymentVoucher_paymentApplicationId_fkey"
  FOREIGN KEY ("paymentApplicationId") REFERENCES "PaymentApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
