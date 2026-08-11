ALTER TABLE "Shipment" ADD COLUMN "transportStartedAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ADD COLUMN "transportCompletedAt" TIMESTAMP(3);

WITH transfer_candidates AS (
    SELECT
        "target" AS "shipmentId",
        COALESCE(
            CASE
                WHEN ("after"->>'transferNoFilledAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' THEN ("after"->>'transferNoFilledAt')::timestamptz
                ELSE NULL
            END,
            CASE
                WHEN ("after"->>'uploadedAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' THEN ("after"->>'uploadedAt')::timestamptz
                ELSE NULL
            END,
            "createdAt"
        ) AS "startedAt"
    FROM "AuditLog"
    WHERE "action" IN ('shipment.operational.update', 'shipment.label.create', 'shipment.label.upload', 'customer_service.transfer.fill')
      AND (
          ("action" = 'shipment.operational.update'
            AND NULLIF("before"->>'transferNo', '') IS NULL
            AND NULLIF("after"->>'transferNoTo', '') IS NOT NULL)
          OR ("action" = 'shipment.label.create' AND NULLIF("after"->>'transferNo', '') IS NOT NULL)
          OR ("action" = 'shipment.label.upload' AND NULLIF("before"->>'transferNo', '') IS NULL AND NULLIF("after"->>'transferNo', '') IS NOT NULL)
          OR ("action" = 'customer_service.transfer.fill' AND NULLIF("after"->>'transferNo', '') IS NOT NULL)
      )
), first_transfer AS (
    SELECT DISTINCT ON ("shipmentId") "shipmentId", "startedAt"
    FROM transfer_candidates
    ORDER BY "shipmentId", "startedAt"
)
UPDATE "Shipment" AS shipment
SET "transportStartedAt" = first_transfer."startedAt"
FROM first_transfer
WHERE shipment."id" = first_transfer."shipmentId"
  AND shipment."transportStartedAt" IS NULL;

WITH signed_candidates AS (
    SELECT
        "target" AS "shipmentId",
        COALESCE(
            CASE
                WHEN ("after"->>'signedAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' THEN ("after"->>'signedAt')::timestamptz
                ELSE NULL
            END,
            CASE
                WHEN ("after"->>'signatureConfirmedAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' THEN ("after"->>'signatureConfirmedAt')::timestamptz
                ELSE NULL
            END,
            CASE
                WHEN ("after"->>'statusAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' THEN ("after"->>'statusAt')::timestamptz
                ELSE NULL
            END,
            "createdAt"
        ) AS "completedAt"
    FROM "AuditLog"
    WHERE "action" IN ('customer_service.signature.confirm', 'shipment.sign', 'customer_service.status.update')
      AND (
          "action" IN ('customer_service.signature.confirm', 'shipment.sign')
          OR "after"->>'statusTo' = 'SIGNED'
          OR "after"->>'status' = 'SIGNED'
      )
), first_signed AS (
    SELECT DISTINCT ON ("shipmentId") "shipmentId", "completedAt"
    FROM signed_candidates
    ORDER BY "shipmentId", "completedAt"
)
UPDATE "Shipment" AS shipment
SET "transportCompletedAt" = first_signed."completedAt"
FROM first_signed
WHERE shipment."id" = first_signed."shipmentId"
  AND shipment."transportStartedAt" IS NOT NULL
  AND first_signed."completedAt" >= shipment."transportStartedAt"
  AND shipment."transportCompletedAt" IS NULL;
