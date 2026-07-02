ALTER TABLE "PaymentVoucher"
  ADD COLUMN "kuayueBillNo" TEXT,
  ADD COLUMN "kuayueCustomerCode" TEXT,
  ADD COLUMN "kuayueSystemOrderNo" TEXT,
  ADD COLUMN "kuayueAmount" DECIMAL(65,30),
  ADD COLUMN "kuayueCurrency" TEXT,
  ADD COLUMN "kuayueBillDate" TIMESTAMP(3),
  ADD COLUMN "kuayueStatus" TEXT;

CREATE INDEX "PaymentVoucher_kuayueBillNo_kuayueCustomerCode_idx" ON "PaymentVoucher"("kuayueBillNo", "kuayueCustomerCode");
