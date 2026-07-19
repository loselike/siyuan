-- WarehousePackage rows represent packages that have already been received into the warehouse.
-- PENDING was a legacy value that incorrectly leaked into the in-stock and tally workflows.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "WarehousePackage"
    WHERE "status" NOT IN ('PENDING', 'RECEIVED', 'CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED')
  ) THEN
    RAISE EXCEPTION 'WarehousePackage contains an unknown status; aborting normalization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "WarehousePackage"
    WHERE "status" = 'PENDING'
      AND (
        COALESCE("createdBy", '') <> 'warehouse-excel-import'
        OR COALESCE("scanSource", '') <> '2026年7月份仓库数据导入'
        OR "shipmentId" IS NOT NULL
        OR "archivedAt" IS NOT NULL
        OR "tallyTaskId" IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'WarehousePackage PENDING rows no longer match the verified legacy-import shape; aborting normalization';
  END IF;
END $$;

UPDATE "WarehousePackage"
SET "status" = 'RECEIVED'
WHERE "status" = 'PENDING';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "WarehouseTallyTask" AS task
    WHERE task."status" IN ('PENDING', 'PROCESSING')
      AND EXISTS (
        SELECT 1
        FROM unnest(task."packageIds") AS source("packageId")
        LEFT JOIN "WarehousePackage" AS package ON package."id" = source."packageId"
        WHERE package."id" IS NULL OR package."status" <> 'RECEIVED'
      )
  ) THEN
    RAISE EXCEPTION 'An unfinished WarehouseTallyTask references a missing or non-RECEIVED package; resolve the task before deploying';
  END IF;
END $$;

ALTER TABLE "WarehousePackage"
ADD CONSTRAINT "WarehousePackage_status_valid"
CHECK ("status" IN ('RECEIVED', 'CONSOLIDATED', 'SHIPPED', 'TALLIED_ARCHIVED'))
NOT VALID;

ALTER TABLE "WarehousePackage"
VALIDATE CONSTRAINT "WarehousePackage_status_valid";

CREATE OR REPLACE FUNCTION "prevent_pending_tally_package_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pending_task_no text;
BEGIN
  SELECT task."taskNo"
  INTO pending_task_no
  FROM "WarehouseTallyTask" AS task
  WHERE task."status" = 'PENDING'
    AND OLD."id" = ANY(task."packageIds")
  ORDER BY task."createdAt" DESC
  LIMIT 1;

  IF pending_task_no IS NOT NULL THEN
    RAISE EXCEPTION '包裹正在理货任务 % 中，请先完成当前理货任务', pending_task_no
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "WarehousePackage_pending_tally_mutation_guard"
BEFORE UPDATE OR DELETE ON "WarehousePackage"
FOR EACH ROW
EXECUTE FUNCTION "prevent_pending_tally_package_mutation"();

COMMIT;
