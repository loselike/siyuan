INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-warehouse-rent-rule-manage-block', 'warehouse:rent-rule:manage-block'),
  ('perm-warehouse-rent-detail-all-view-block', 'warehouse:rent-detail:all-view-block'),
  ('perm-warehouse-rent-detail-own-view-block', 'warehouse:rent-detail:own-view-block')
ON CONFLICT ("code") DO NOTHING;
