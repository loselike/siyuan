INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-warehouse-tally-pending-view-block', 'warehouse:tally-pending:view-block'),
  ('perm-warehouse-tally-pending-update-block', 'warehouse:tally-pending:update-block'),
  ('perm-warehouse-tally-pending-cancel-block', 'warehouse:tally-pending:cancel-block'),
  ('perm-warehouse-tally-pending-process-block', 'warehouse:tally-pending:process-block')
ON CONFLICT ("code") DO NOTHING;
