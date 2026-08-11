UPDATE "WarehouseTallyTask"
SET "tallyProgressStatus" = CASE
  WHEN "status" = 'COMPLETED' THEN 'COMPLETED'
  ELSE 'WAITING'
END;
