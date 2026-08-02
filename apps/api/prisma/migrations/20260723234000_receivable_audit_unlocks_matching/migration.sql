UPDATE "ShipmentFinanceItem"
SET "locked" = false
WHERE "type" = 'RECEIVABLE'
  AND "reconciliationStatus" = 'CONFIRMED'
  AND "locked" = true;
