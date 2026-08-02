ALTER TABLE "WarehouseTallyTask"
  ADD COLUMN "rootTallyTaskId" TEXT,
  ADD COLUMN "previousTallyTaskId" TEXT,
  ADD COLUMN "tallySequence" INTEGER NOT NULL DEFAULT 1;

UPDATE "WarehouseTallyTask"
SET "tallySequence" = RIGHT("taskNo", 2)::INTEGER
WHERE "taskNo" ~ 'LH[0-9]{2}$';

UPDATE "WarehouseTallyTask"
SET "rootTallyTaskId" = "id"
WHERE "tallySequence" = 1;

UPDATE "WarehouseTallyTask" AS child
SET
  "rootTallyTaskId" = (
    SELECT root."id"
    FROM "WarehouseTallyTask" AS root
    WHERE root."taskNo" = REGEXP_REPLACE(child."taskNo", '[0-9]{2}$', '')
    LIMIT 1
  ),
  "previousTallyTaskId" = (
    SELECT previous."id"
    FROM "WarehouseTallyTask" AS previous
    WHERE previous."taskNo" = CASE
      WHEN child."tallySequence" = 2 THEN REGEXP_REPLACE(child."taskNo", '[0-9]{2}$', '')
      ELSE REGEXP_REPLACE(child."taskNo", '[0-9]{2}$', '')
        || LPAD((child."tallySequence" - 1)::TEXT, 2, '0')
    END
    LIMIT 1
  )
WHERE child."tallySequence" > 1;

UPDATE "WarehouseTallyTask"
SET
  "rootTallyTaskId" = "id",
  "previousTallyTaskId" = NULL,
  "tallySequence" = 1
WHERE "rootTallyTaskId" IS NULL;

ALTER TABLE "WarehouseTallyTask"
  ALTER COLUMN "rootTallyTaskId" SET NOT NULL;

CREATE INDEX "WarehouseTallyTask_rootTallyTaskId_status_completedAt_idx"
  ON "WarehouseTallyTask"("rootTallyTaskId", "status", "completedAt");

CREATE INDEX "WarehouseTallyTask_salesperson_completedAt_idx"
  ON "WarehouseTallyTask"("salesperson", "completedAt");
