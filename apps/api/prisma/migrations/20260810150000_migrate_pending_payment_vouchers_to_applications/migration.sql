-- Preserve legacy payable attachments in the unified voucher table before
-- assigning every bill voucher to its corresponding payment application.
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
  WHERE voucher."pendingPaymentId" = attachment."payablePaymentApplicationId"
    AND voucher."fileName" = attachment."fileName"
    AND COALESCE(voucher."url", '') = COALESCE(attachment."url", '')
);

-- Keep pendingPaymentId as the original source reference. The application id
-- is added rather than replacing it, so historical line-level traceability is
-- retained while the voucher is visible on the aggregated application.
UPDATE "PaymentVoucher" AS voucher
SET "paymentApplicationId" = item."paymentApplicationId"
FROM "PaymentApplicationItem" AS item
WHERE voucher."pendingPaymentId" = item."payablePaymentApplicationId"
  AND voucher."voucherType" <> 'PAYMENT_RECEIPT'
  AND voucher."paymentApplicationId" IS NULL;
