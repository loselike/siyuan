#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"

ssh "${REMOTE}" "set -e
cd \"${REMOTE_DIR}\"
docker compose ps
docker compose exec -T postgres sh -lc 'psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1'" <<'SQL'
\pset pager off
\pset format aligned
\pset null NULL

SELECT 'LATEST_MIGRATION' AS metric, migration_name AS value
FROM "_prisma_migrations"
WHERE finished_at IS NOT NULL
ORDER BY finished_at DESC
LIMIT 1;

SELECT 'FINANCE_ORDER_FEE_PERMISSIONS' AS metric, COUNT(*)::text AS value
FROM "Permission"
WHERE code LIKE 'finance:order-fee:%';

SELECT 'PaymentVoucher.voucherType' AS field, COUNT(*)::text AS present
FROM information_schema.columns
WHERE table_name='PaymentVoucher' AND column_name='voucherType'
UNION ALL
SELECT 'ShipmentFinanceItem.reconciliationStatus', COUNT(*)::text
FROM information_schema.columns
WHERE table_name='ShipmentFinanceItem' AND column_name='reconciliationStatus'
UNION ALL
SELECT 'PaymentApplicationItem.payableFinanceItemId', COUNT(*)::text
FROM information_schema.columns
WHERE table_name='PaymentApplicationItem' AND column_name='payableFinanceItemId'
UNION ALL
SELECT 'PaymentApplication.payerBankAccountNo', COUNT(*)::text
FROM information_schema.columns
WHERE table_name='PaymentApplication' AND column_name='payerBankAccountNo'
UNION ALL
SELECT 'PaymentVoucher.type_OLD', COUNT(*)::text
FROM information_schema.columns
WHERE table_name='PaymentVoucher' AND column_name='type'
UNION ALL
SELECT 'ShipmentFinanceItem.status_OLD', COUNT(*)::text
FROM information_schema.columns
WHERE table_name='ShipmentFinanceItem' AND column_name='status'
UNION ALL
SELECT 'PaymentApplicationItem.financeItemId_OLD', COUNT(*)::text
FROM information_schema.columns
WHERE table_name='PaymentApplicationItem' AND column_name='financeItemId';

SELECT 'REVIEW_PENDING_SHIPPED' AS metric, COUNT(*)::text AS value
FROM "Shipment" s
JOIN "WarehousePackage" p ON p."shipmentId"=s.id
WHERE s.status='REVIEW_PENDING' AND p.status='SHIPPED'
UNION ALL
SELECT 'WAITING_SORT_SHIPPED', COUNT(*)::text
FROM "Shipment" s
JOIN "WarehousePackage" p ON p."shipmentId"=s.id
WHERE s.status='WAITING_SORT' AND p.status='SHIPPED'
UNION ALL
SELECT 'WAITING_DISPATCH_SHIPPED', COUNT(*)::text
FROM "Shipment" s
JOIN "WarehousePackage" p ON p."shipmentId"=s.id
WHERE s.status='WAITING_DISPATCH' AND p.status='SHIPPED'
UNION ALL
SELECT 'OUTBOUNDED_SHIPPED', COUNT(*)::text
FROM "Shipment" s
JOIN "WarehousePackage" p ON p."shipmentId"=s.id
WHERE s.status='OUTBOUNDED' AND p.status='SHIPPED'
UNION ALL
SELECT 'WAITING_SORT_MISSING_REVIEW', COUNT(*)::text
FROM "Shipment"
WHERE status='WAITING_SORT' AND ("reviewedAt" IS NULL OR "reviewedBy" IS NULL)
UNION ALL
SELECT 'OUTBOUNDED_MISSING_OUTBOUND_AT', COUNT(*)::text
FROM "Shipment"
WHERE status='OUTBOUNDED' AND "outboundAt" IS NULL
UNION ALL
SELECT 'SIGNED_MISSING_TRANSFER_NO', COUNT(*)::text
FROM "Shipment"
WHERE status='SIGNED' AND COALESCE("transferNo",'')=''
UNION ALL
SELECT 'SIGNED_MISSING_EVENT', COUNT(*)::text
FROM "Shipment" s
WHERE s.status='SIGNED'
  AND NOT EXISTS (
    SELECT 1
    FROM "ShipmentEvent" e
    WHERE e."shipmentId"=s.id AND e."toStatus"='SIGNED'
  );

SELECT type, "reconciliationStatus", COUNT(*)::text AS rows
FROM "ShipmentFinanceItem"
GROUP BY type, "reconciliationStatus"
ORDER BY type, "reconciliationStatus";

SELECT 'PAID_TOTAL' AS metric, COUNT(*)::text AS value
FROM "PaymentApplication"
WHERE status='PAID'
UNION ALL
SELECT 'PAID_MISSING_PAID_AT', COUNT(*)::text
FROM "PaymentApplication"
WHERE status='PAID' AND "paidAt" IS NULL
UNION ALL
SELECT 'PAID_MISSING_PAID_BY', COUNT(*)::text
FROM "PaymentApplication"
WHERE status='PAID' AND "paidBy" IS NULL
UNION ALL
SELECT 'PAID_MISSING_PAYER_BANK_ACCOUNT_NO', COUNT(*)::text
FROM "PaymentApplication"
WHERE status='PAID' AND COALESCE("payerBankAccountNo",'')=''
UNION ALL
SELECT 'BILL_TOTAL', COUNT(*)::text
FROM "PaymentVoucher"
WHERE "voucherType"='BILL'
UNION ALL
SELECT 'BILL_DIRECT_PAYMENT_APPLICATION', COUNT(*)::text
FROM "PaymentVoucher"
WHERE "voucherType"='BILL' AND "paymentApplicationId" IS NOT NULL
UNION ALL
SELECT 'BILL_PENDING_ONLY', COUNT(*)::text
FROM "PaymentVoucher"
WHERE "voucherType"='BILL' AND "paymentApplicationId" IS NULL
UNION ALL
SELECT 'BILL_PENDING_REACHABLE_FROM_PAYMENT_ITEM', COUNT(DISTINCT pv.id)::text
FROM "PaymentVoucher" pv
JOIN "PaymentApplicationItem" pai ON pai."payablePaymentApplicationId"=pv."pendingPaymentId"
WHERE pv."voucherType"='BILL' AND pv."paymentApplicationId" IS NULL
UNION ALL
SELECT 'BILL_PENDING_NOT_REACHABLE_FROM_PAYMENT_ITEM', COUNT(*)::text
FROM "PaymentVoucher" pv
WHERE pv."voucherType"='BILL'
  AND pv."paymentApplicationId" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "PaymentApplicationItem" pai
    WHERE pai."payablePaymentApplicationId"=pv."pendingPaymentId"
  );

WITH actions(action) AS (VALUES
  ('shipment.receive'),
  ('shipment.order_entry.submit'),
  ('shipment.review.approve'),
  ('shipment.route'),
  ('shipment.dispatch'),
  ('customer_service.business_data.approved'),
  ('customer_service.agent_data.approved'),
  ('shipment.operational.update'),
  ('shipment.label.create'),
  ('customer_service.status.update'),
  ('customer_service.eta.update'),
  ('customer_service.issue.attach'),
  ('shipment.sign'),
  ('customer_service.signature.confirm'),
  ('finance.water_receipt.match'),
  ('finance.payment_application.create'),
  ('finance.paid_payment.confirm'),
  ('security.permission.denied'),
  ('workflow.guard_denied')
)
SELECT a.action, COUNT(l.id)::text AS audit_count
FROM actions a
LEFT JOIN "AuditLog" l ON l.action=a.action
GROUP BY a.action
ORDER BY a.action;

WITH strict_candidates AS (
  SELECT s.id
  FROM "Shipment" s
  WHERE s.status='SIGNED'
    AND COALESCE(s."transferNo",'') <> ''
    AND s."outboundAt" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "WarehousePackage" p
      WHERE p."shipmentId"=s.id AND p.status='SHIPPED'
    )
    AND EXISTS (
      SELECT 1 FROM "ShipmentEvent" e
      WHERE e."shipmentId"=s.id AND e."toStatus"='SIGNED'
    )
    AND EXISTS (
      SELECT 1
      FROM "ShipmentFinanceItem" r
      JOIN "WaterReceiptMatch" wrm ON wrm."receivableFinanceItemId"=r.id AND wrm.voided=false
      WHERE r."shipmentId"=s.id
        AND r.type='RECEIVABLE'
        AND r."reconciliationStatus"='CONFIRMED'
    )
    AND EXISTS (
      SELECT 1
      FROM "ShipmentFinanceItem" pfi
      JOIN "PaymentApplicationItem" pai ON pai."payableFinanceItemId"=pfi.id
      JOIN "PaymentApplication" pa ON pa.id=pai."paymentApplicationId" AND pa.status='PAID'
      WHERE pfi."shipmentId"=s.id
        AND pfi.type='PAYABLE'
        AND pfi."reconciliationStatus"='CONFIRMED'
    )
)
SELECT 'STRICT_FULL_CHAIN_CANDIDATE' AS metric, COUNT(*)::text AS value
FROM strict_candidates;
SQL
