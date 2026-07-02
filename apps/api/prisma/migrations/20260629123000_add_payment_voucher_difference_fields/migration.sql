ALTER TABLE "PaymentVoucher" ADD COLUMN "differenceType" TEXT;
ALTER TABLE "PaymentVoucher" ADD COLUMN "differenceAmount" DECIMAL(65,30);
ALTER TABLE "PaymentVoucher" ADD COLUMN "differenceReason" TEXT;
ALTER TABLE "PaymentVoucher" ADD COLUMN "differenceStatus" TEXT;
ALTER TABLE "PaymentVoucher" ADD COLUMN "differenceHandledBy" TEXT;
ALTER TABLE "PaymentVoucher" ADD COLUMN "differenceHandledAt" TIMESTAMP(3);
