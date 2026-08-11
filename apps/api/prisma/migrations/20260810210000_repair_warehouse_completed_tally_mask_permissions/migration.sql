INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-warehouse-tally-completed-reverse-review', 'warehouse:tally-completed:reverse-review'),
  ('perm-warehouse-tally-label-reprint-block', 'warehouse:tally-label:reprint-block'),
  ('perm-warehouse-tally-label-download-block', 'warehouse:tally-label:download-block')
ON CONFLICT ("code") DO NOTHING;
