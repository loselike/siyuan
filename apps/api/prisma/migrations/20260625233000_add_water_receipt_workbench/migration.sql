ALTER TABLE "ShipmentFinanceItem"
  ADD COLUMN IF NOT EXISTS "receivedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "receiptStatus" TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ShipmentFinanceItem_receiptStatus_createdAt_idx"
  ON "ShipmentFinanceItem"("receiptStatus", "createdAt");

CREATE TABLE IF NOT EXISTS "WaterReceipt" (
  "id" TEXT NOT NULL,
  "receiptNo" TEXT NOT NULL,
  "site" TEXT NOT NULL DEFAULT '思远收款',
  "customerId" TEXT,
  "customerCode" TEXT,
  "customerName" TEXT,
  "salesperson" TEXT,
  "receiptMethod" TEXT,
  "receiptDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "matchedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "balance" DECIMAL(65,30) NOT NULL,
  "paymentNo" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "remark" TEXT,
  "arrivedAt" TIMESTAMP(3),
  "arrivedBy" TEXT,
  "archivedAt" TIMESTAMP(3),
  "archivedBy" TEXT,
  "voidedAt" TIMESTAMP(3),
  "voidedBy" TEXT,
  "voidedReason" TEXT,
  "adjustReason" TEXT,
  "accountLedgerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaterReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WaterReceiptMatch" (
  "id" TEXT NOT NULL,
  "waterReceiptId" TEXT NOT NULL,
  "receivableFinanceItemId" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "voided" BOOLEAN NOT NULL DEFAULT false,
  "voidedAt" TIMESTAMP(3),
  "voidedBy" TEXT,
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaterReceiptMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WaterReceiptVoucher" (
  "id" TEXT NOT NULL,
  "waterReceiptId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "url" TEXT,
  "uploadedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaterReceiptVoucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WaterReceipt_receiptNo_key" ON "WaterReceipt"("receiptNo");
CREATE UNIQUE INDEX IF NOT EXISTS "WaterReceiptVoucher_waterReceiptId_key" ON "WaterReceiptVoucher"("waterReceiptId");
CREATE INDEX IF NOT EXISTS "WaterReceipt_status_receiptDate_idx" ON "WaterReceipt"("status", "receiptDate");
CREATE INDEX IF NOT EXISTS "WaterReceipt_customerId_receiptDate_idx" ON "WaterReceipt"("customerId", "receiptDate");
CREATE INDEX IF NOT EXISTS "WaterReceipt_receiptNo_idx" ON "WaterReceipt"("receiptNo");
CREATE INDEX IF NOT EXISTS "WaterReceiptMatch_waterReceiptId_createdAt_idx" ON "WaterReceiptMatch"("waterReceiptId", "createdAt");
CREATE INDEX IF NOT EXISTS "WaterReceiptMatch_receivableFinanceItemId_voided_idx" ON "WaterReceiptMatch"("receivableFinanceItemId", "voided");
CREATE INDEX IF NOT EXISTS "WaterReceiptMatch_shipmentId_idx" ON "WaterReceiptMatch"("shipmentId");
CREATE INDEX IF NOT EXISTS "WaterReceiptVoucher_waterReceiptId_createdAt_idx" ON "WaterReceiptVoucher"("waterReceiptId", "createdAt");

ALTER TABLE "WaterReceipt"
  ADD CONSTRAINT "WaterReceipt_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WaterReceipt"
  ADD CONSTRAINT "WaterReceipt_accountLedgerId_fkey"
  FOREIGN KEY ("accountLedgerId") REFERENCES "AccountLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WaterReceiptMatch"
  ADD CONSTRAINT "WaterReceiptMatch_waterReceiptId_fkey"
  FOREIGN KEY ("waterReceiptId") REFERENCES "WaterReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WaterReceiptMatch"
  ADD CONSTRAINT "WaterReceiptMatch_receivableFinanceItemId_fkey"
  FOREIGN KEY ("receivableFinanceItemId") REFERENCES "ShipmentFinanceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WaterReceiptMatch"
  ADD CONSTRAINT "WaterReceiptMatch_shipmentId_fkey"
  FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WaterReceiptVoucher"
  ADD CONSTRAINT "WaterReceiptVoucher_waterReceiptId_fkey"
  FOREIGN KEY ("waterReceiptId") REFERENCES "WaterReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "WaterReceipt" (
  "id", "receiptNo", "site", "customerId", "customerCode", "customerName", "salesperson",
  "receiptMethod", "receiptDate", "amount", "matchedAmount", "balance", "paymentNo",
  "status", "remark", "arrivedAt", "arrivedBy", "accountLedgerId", "createdAt", "updatedAt"
)
SELECT
  'wr-' || l."id",
  'SD' || to_char(l."createdAt", 'YYYYMMDD') || lpad(row_number() OVER (PARTITION BY date(l."createdAt") ORDER BY l."createdAt", l."id")::text, 3, '0'),
  '思远收款',
  c."id",
  c."code",
  c."code" || '-' || c."name",
  c."salesperson",
  COALESCE(l."note", '账户收款'),
  l."createdAt",
  l."amount",
  GREATEST(l."amount" - l."balance", 0),
  l."balance",
  l."id",
  CASE WHEN l."balance" <= 0 THEN 'ARCHIVED' ELSE 'ARRIVED' END,
  l."note",
  l."createdAt",
  'system',
  l."id",
  l."createdAt",
  CURRENT_TIMESTAMP
FROM "AccountLedger" l
LEFT JOIN "Customer" c ON c."id" = l."partyId"
WHERE l."partyType" = 'CUSTOMER'
ON CONFLICT ("receiptNo") DO NOTHING;

INSERT INTO "Permission" ("id", "code")
VALUES
  ('p-finance-water-receipt-read', 'finance:water-receipt:read'),
  ('p-finance-water-receipt-manage', 'finance:water-receipt:manage'),
  ('p-finance-water-receipt-arrive', 'finance:water-receipt:arrive'),
  ('p-finance-water-receipt-match', 'finance:water-receipt:match'),
  ('p-finance-water-receipt-adjust', 'finance:water-receipt:adjust'),
  ('p-finance-water-receipt-void', 'finance:water-receipt:void'),
  ('p-finance-water-receipt-archive', 'finance:water-receipt:archive'),
  ('p-finance-water-receipt-export', 'finance:water-receipt:export'),
  ('p-finance-water-receipt-voucher', 'finance:water-receipt:voucher'),
  ('p-finance-water-receipt-view-all', 'finance:water-receipt:view-all')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" IN ('ADMIN', 'FINANCE')
WHERE p."code" LIKE 'finance:water-receipt:%'
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT p."id", r."id"
FROM "Permission" p
JOIN "Role" r ON r."name" = 'OPERATOR'
WHERE p."code" = 'finance:water-receipt:read'
ON CONFLICT ("A", "B") DO NOTHING;
