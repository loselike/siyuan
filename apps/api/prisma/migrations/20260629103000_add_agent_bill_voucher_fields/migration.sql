ALTER TABLE "PaymentVoucher"
ADD COLUMN "billNo" TEXT,
ADD COLUMN "agentName" TEXT,
ADD COLUMN "billDate" TIMESTAMP(3),
ADD COLUMN "currency" TEXT,
ADD COLUMN "billAmount" DECIMAL(65,30),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'IMPORTED';

CREATE INDEX "PaymentVoucher_billNo_agentName_idx" ON "PaymentVoucher"("billNo", "agentName");
