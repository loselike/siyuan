-- Restore the independently assignable paid-payment water-receipt delete action.
-- Only the permission catalog and role links change; payment and voucher rows are protected.
BEGIN;

CREATE TEMP TABLE "_PaidVoucherDeleteProtectedCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_PaidVoucherDeleteProtectedCounts" ("tableName", "rowCount") VALUES
  ('PaymentApplication', (SELECT COUNT(*) FROM "PaymentApplication")),
  ('PaymentApplicationItem', (SELECT COUNT(*) FROM "PaymentApplicationItem")),
  ('PaymentVoucher', (SELECT COUNT(*) FROM "PaymentVoucher")),
  ('PayablePaymentApplication', (SELECT COUNT(*) FROM "PayablePaymentApplication")),
  ('ShipmentFinanceItem', (SELECT COUNT(*) FROM "ShipmentFinanceItem")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog"));

INSERT INTO "Permission" ("id", "code")
VALUES (
  'perm-finance-v3-' || substr(md5('finance:paid-payment:voucher-delete'), 1, 24),
  'finance:paid-payment:voucher-delete'
)
ON CONFLICT ("code") DO NOTHING;

-- Roles already trusted to upload payment evidence receive the corresponding
-- correction action. Administrators may later assign or remove it independently.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT deletePermission."id", uploadLink."B"
FROM "Permission" uploadPermission
JOIN "_PermissionToRole" uploadLink ON uploadLink."A" = uploadPermission."id"
JOIN "Permission" deletePermission ON deletePermission."code" = 'finance:paid-payment:voucher-delete'
WHERE uploadPermission."code" = 'finance:paid-payment:voucher-upload'
ON CONFLICT DO NOTHING;

-- The observable delete action needs its page and voucher visibility context.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT dependency."id", deleteLink."B"
FROM "Permission" deletePermission
JOIN "_PermissionToRole" deleteLink ON deleteLink."A" = deletePermission."id"
JOIN "Permission" dependency ON dependency."code" IN (
  'finance:paid-payment:read',
  'finance:paid-payment:voucher-view'
)
WHERE deletePermission."code" = 'finance:paid-payment:voucher-delete'
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  item record;
  current_count bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Permission"
    WHERE "code" = 'finance:paid-payment:voucher-delete'
  ) THEN
    RAISE EXCEPTION 'paid-payment voucher-delete permission was not created';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Permission" uploadPermission
    JOIN "_PermissionToRole" uploadLink ON uploadLink."A" = uploadPermission."id"
    WHERE uploadPermission."code" = 'finance:paid-payment:voucher-upload'
      AND NOT EXISTS (
        SELECT 1
        FROM "Permission" deletePermission
        JOIN "_PermissionToRole" deleteLink ON deleteLink."A" = deletePermission."id"
        WHERE deletePermission."code" = 'finance:paid-payment:voucher-delete'
          AND deleteLink."B" = uploadLink."B"
      )
  ) THEN
    RAISE EXCEPTION 'paid-payment voucher-delete grants were not restored';
  END IF;

  FOR item IN SELECT * FROM "_PaidVoucherDeleteProtectedCounts" LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', item."tableName") INTO current_count;
    IF current_count <> item."rowCount" THEN
      RAISE EXCEPTION 'Protected table % changed during paid voucher delete migration: before %, after %',
        item."tableName", item."rowCount", current_count;
    END IF;
  END LOOP;
END $$;

COMMIT;
