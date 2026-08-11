INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-warehouse-tally-completed-view-block', 'warehouse:tally-completed:view-block'),
  ('perm-warehouse-tally-completed-reprint-block', 'warehouse:tally-completed:reprint-block'),
  ('perm-warehouse-tally-completed-download-block', 'warehouse:tally-completed:download-block'),
  ('perm-warehouse-tally-completed-reverse-block', 'warehouse:tally-completed:reverse-block')
ON CONFLICT ("code") DO NOTHING;
