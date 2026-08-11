-- Repair the first rollout's content-based de-duplication with a deterministic
-- source id. This is additive and preserves every legacy attachment.
INSERT INTO "PaymentVoucher" (
  "id",
  "pendingPaymentId",
  "voucherType",
  "fileName",
  "mimeType",
  "sizeBytes",
  "url",
  "uploadedBy",
  "createdAt"
)
SELECT
  concat('legacy-payable-attachment-', attachment."id"),
  attachment."payablePaymentApplicationId",
  'BILL',
  attachment."fileName",
  attachment."mimeType",
  attachment."sizeBytes",
  attachment."url",
  attachment."uploadedBy",
  attachment."createdAt"
FROM "PayableBillAttachment" AS attachment
WHERE NOT EXISTS (
  SELECT 1
  FROM "PaymentVoucher" AS voucher
  WHERE voucher."id" = concat('legacy-payable-attachment-', attachment."id")
);

UPDATE "PaymentVoucher" AS voucher
SET "paymentApplicationId" = item."paymentApplicationId"
FROM "PaymentApplicationItem" AS item
WHERE voucher."pendingPaymentId" = item."payablePaymentApplicationId"
  AND voucher."voucherType" <> 'PAYMENT_RECEIPT'
  AND voucher."paymentApplicationId" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PayableBillAttachment" AS attachment
    LEFT JOIN "PaymentVoucher" AS voucher
      ON voucher."id" = concat('legacy-payable-attachment-', attachment."id")
    WHERE voucher."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'final voucher migration left legacy attachments unmigrated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PaymentVoucher" AS voucher
    JOIN "PaymentApplicationItem" AS item
      ON item."payablePaymentApplicationId" = voucher."pendingPaymentId"
    WHERE voucher."voucherType" <> 'PAYMENT_RECEIPT'
      AND voucher."paymentApplicationId" IS DISTINCT FROM item."paymentApplicationId"
  ) THEN
    RAISE EXCEPTION 'final voucher migration left application-linked vouchers mismatched';
  END IF;
END $$;
