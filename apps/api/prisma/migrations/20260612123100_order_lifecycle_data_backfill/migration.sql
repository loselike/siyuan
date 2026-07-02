UPDATE "Shipment" SET "status" = 'DRAFT' WHERE "status" = 'DECLARED';
UPDATE "Shipment" SET "status" = 'WAITING_SORT' WHERE "status" = 'WAITING_RECEIVE';
UPDATE "Shipment" SET "status" = 'WAITING_DEPARTURE' WHERE "status" = 'WAITING_ONLINE';
UPDATE "Shipment" SET "status" = 'DELIVERING' WHERE "status" = 'WAITING_SIGNED';
UPDATE "Shipment" SET "status" = 'PROBLEM' WHERE "status" IN ('WAITING_RETURN', 'STUCK');
