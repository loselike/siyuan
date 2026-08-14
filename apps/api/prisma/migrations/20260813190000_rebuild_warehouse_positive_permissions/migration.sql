-- Rebuild warehouse grants as positive resource:action capabilities.  Only the
-- permission catalog and Role<->Permission join table are changed; all business
-- tables are counted before/after as a migration guard.
CREATE TEMP TABLE "_WarehousePermissionSnapshot" (
  "roleId" text PRIMARY KEY,
  "codes" text[] NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE "_WarehouseBusinessCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;

INSERT INTO "_WarehouseBusinessCounts" VALUES
  ('WarehousePackage', (SELECT COUNT(*) FROM "WarehousePackage")),
  ('WarehouseTallyTask', (SELECT COUNT(*) FROM "WarehouseTallyTask")),
  ('WarehouseRentRule', (SELECT COUNT(*) FROM "WarehouseRentRule")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

INSERT INTO "_WarehousePermissionSnapshot" ("roleId", "codes")
SELECT role."id", array_agg(permission."code")
FROM "Role" role
JOIN "_PermissionToRole" link ON link."B" = role."id"
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" LIKE 'warehouse:%'
GROUP BY role."id";

INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-wh-v2-dashboard-view', 'warehouse:dashboard:view'),
  ('perm-wh-v2-today-view', 'warehouse:today-receipt:view'), ('perm-wh-v2-today-edit', 'warehouse:today-receipt:edit'), ('perm-wh-v2-today-delete', 'warehouse:today-receipt:delete'), ('perm-wh-v2-today-manual', 'warehouse:today-receipt:manual-create'), ('perm-wh-v2-today-import', 'warehouse:today-receipt:import'), ('perm-wh-v2-today-export', 'warehouse:today-receipt:export'),
  ('perm-wh-v2-stock-view', 'warehouse:in-stock:view'), ('perm-wh-v2-stock-edit', 'warehouse:in-stock:edit'), ('perm-wh-v2-stock-delete', 'warehouse:in-stock:delete'), ('perm-wh-v2-stock-split', 'warehouse:in-stock:split'), ('perm-wh-v2-stock-tally', 'warehouse:in-stock:tally'), ('perm-wh-v2-stock-order-entry', 'warehouse:in-stock:order-entry'), ('perm-wh-v2-stock-import', 'warehouse:in-stock:import'), ('perm-wh-v2-stock-export', 'warehouse:in-stock:export'),
  ('perm-wh-v2-pending-view', 'warehouse:tally-pending:view'), ('perm-wh-v2-pending-edit', 'warehouse:tally-pending:edit'), ('perm-wh-v2-pending-cancel', 'warehouse:tally-pending:cancel'), ('perm-wh-v2-pending-process', 'warehouse:tally-pending:process'), ('perm-wh-v2-pending-complete', 'warehouse:tally-pending:complete-and-ship'),
  ('perm-wh-v2-completed-view', 'warehouse:tally-completed:view'), ('perm-wh-v2-completed-print', 'warehouse:tally-completed:print'), ('perm-wh-v2-completed-download', 'warehouse:tally-completed:download'), ('perm-wh-v2-completed-scan', 'warehouse:tally-completed:scan'), ('perm-wh-v2-completed-reverse', 'warehouse:tally-completed:reverse'), ('perm-wh-v2-completed-correct', 'warehouse:tally-completed:correct'),
  ('perm-wh-v2-dispatch-view', 'warehouse:dispatch-pending:view'), ('perm-wh-v2-dispatch-edit', 'warehouse:dispatch-pending:edit'), ('perm-wh-v2-dispatch-handover', 'warehouse:dispatch-pending:handover-print'), ('perm-wh-v2-dispatch-label', 'warehouse:dispatch-pending:label-manage'), ('perm-wh-v2-dispatch-mark', 'warehouse:dispatch-pending:shipping-mark-confirm'), ('perm-wh-v2-dispatch-confirm', 'warehouse:dispatch-pending:confirm'),
  ('perm-wh-v2-outbound-view', 'warehouse:outbounded:view'), ('perm-wh-v2-outbound-export', 'warehouse:outbounded:export'),
  ('perm-wh-v2-rent-view', 'warehouse:rent-detail:view'), ('perm-wh-v2-rent-export', 'warehouse:rent-detail:export'), ('perm-wh-v2-rent-edit', 'warehouse:rent-detail:edit'), ('perm-wh-v2-rent-self', 'warehouse:rent-detail:scope-self'), ('perm-wh-v2-rent-team', 'warehouse:rent-detail:scope-team'), ('perm-wh-v2-rent-site', 'warehouse:rent-detail:scope-site'), ('perm-wh-v2-rent-all', 'warehouse:rent-detail:scope-all')
ON CONFLICT ("code") DO NOTHING;

-- Every legacy capability maps to the smallest matching replacement.  The
-- subsequent dependency pass adds exactly the module view needed by an action.
WITH mapping("target", "legacy") AS (
  VALUES
    ('warehouse:dashboard:view', ARRAY['warehouse:dashboard:view','warehouse:read','warehouse:write']::text[]),
    ('warehouse:today-receipt:view', ARRAY['warehouse:today-receipt:view','warehouse:today-receipt:filter','warehouse:today-receipt:device-log-view','warehouse:read']::text[]),
    ('warehouse:today-receipt:edit', ARRAY['warehouse:today-receipt:edit','warehouse:today-receipt:update','warehouse:today-receipt:remark-update','warehouse:today-receipt:exception-manage']::text[]),
    ('warehouse:today-receipt:delete', ARRAY['warehouse:today-receipt:delete']::text[]), ('warehouse:today-receipt:manual-create', ARRAY['warehouse:today-receipt:manual-create']::text[]), ('warehouse:today-receipt:import', ARRAY['warehouse:today-receipt:import','warehouse:today-receipt:device-import']::text[]), ('warehouse:today-receipt:export', ARRAY['warehouse:today-receipt:export']::text[]),
    ('warehouse:in-stock:view', ARRAY['warehouse:in-stock:view','warehouse:in-stock:tally-record-view','warehouse:read']::text[]),
    ('warehouse:in-stock:edit', ARRAY['warehouse:in-stock:edit','warehouse:in-stock:update','warehouse:write']::text[]), ('warehouse:in-stock:delete', ARRAY['warehouse:in-stock:delete']::text[]), ('warehouse:in-stock:split', ARRAY['warehouse:in-stock:split']::text[]), ('warehouse:in-stock:tally', ARRAY['warehouse:in-stock:tally','warehouse:in-stock:tally-start','warehouse:in-stock:batch-tally-start']::text[]), ('warehouse:in-stock:order-entry', ARRAY['warehouse:in-stock:order-entry','warehouse:in-stock:order-entry-select','warehouse:in-stock:batch-order-entry']::text[]), ('warehouse:in-stock:import', ARRAY['warehouse:in-stock:import','warehouse:in-stock:machine-import']::text[]), ('warehouse:in-stock:export', ARRAY['warehouse:in-stock:export']::text[]),
    ('warehouse:tally-pending:view', ARRAY['warehouse:tally-pending:view','warehouse:tally-pending:detail-view','warehouse:tally-pending:history-view']::text[]), ('warehouse:tally-pending:edit', ARRAY['warehouse:tally-pending:edit','warehouse:tally-pending:task-update']::text[]), ('warehouse:tally-pending:cancel', ARRAY['warehouse:tally-pending:cancel']::text[]), ('warehouse:tally-pending:process', ARRAY['warehouse:tally-pending:process','warehouse:tally-pending:task-create','warehouse:tally-pending:task-process','warehouse:tally-pending:merge-only']::text[]), ('warehouse:tally-pending:complete-and-ship', ARRAY['warehouse:tally-pending:complete-and-ship','warehouse:tally-pending:merge-and-ship']::text[]),
    ('warehouse:tally-completed:view', ARRAY['warehouse:tally-completed:view','warehouse:tally-completed:history-view','warehouse:tally-completed:detail-view']::text[]), ('warehouse:tally-completed:print', ARRAY['warehouse:tally-completed:print','warehouse:tally-label:generate','warehouse:tally-label:reprint','warehouse:tally-label:print']::text[]), ('warehouse:tally-completed:download', ARRAY['warehouse:tally-completed:download','warehouse:tally-label:download']::text[]), ('warehouse:tally-completed:scan', ARRAY['warehouse:tally-completed:scan','warehouse:tally-label:scan-apply']::text[]), ('warehouse:tally-completed:reverse', ARRAY['warehouse:tally-completed:reverse']::text[]), ('warehouse:tally-completed:correct', ARRAY['warehouse:tally-completed:correct','warehouse:tally-label:overwrite-package']::text[]),
    ('warehouse:dispatch-pending:view', ARRAY['warehouse:dispatch-pending:view']::text[]), ('warehouse:dispatch-pending:edit', ARRAY['warehouse:dispatch-pending:edit','warehouse:dispatch-pending:declaration-update']::text[]), ('warehouse:dispatch-pending:handover-print', ARRAY['warehouse:dispatch-pending:handover-print','warehouse:dispatch-pending:handover-preview']::text[]), ('warehouse:dispatch-pending:label-manage', ARRAY['warehouse:dispatch-pending:label-manage','warehouse:dispatch-pending:label-generate','warehouse:dispatch-pending:label-view','warehouse:dispatch-pending:label-void']::text[]), ('warehouse:dispatch-pending:shipping-mark-confirm', ARRAY['warehouse:dispatch-pending:shipping-mark-confirm']::text[]), ('warehouse:dispatch-pending:confirm', ARRAY['warehouse:dispatch-pending:confirm','warehouse:dispatch-pending:dispatch-confirm','warehouse:dispatch-pending:batch-dispatch-confirm']::text[]),
    ('warehouse:outbounded:view', ARRAY['warehouse:outbounded:view','warehouse:outbounded:handover-view','warehouse:outbounded:detail-view']::text[]), ('warehouse:outbounded:export', ARRAY['warehouse:outbounded:export']::text[]),
    ('warehouse:rent-detail:view', ARRAY['warehouse:rent-detail:view','warehouse:rent-rule:view']::text[]), ('warehouse:rent-detail:export', ARRAY['warehouse:rent-detail:export']::text[]), ('warehouse:rent-detail:edit', ARRAY['warehouse:rent-detail:edit','warehouse:rent-rule:manage']::text[]), ('warehouse:rent-detail:scope-self', ARRAY['warehouse:rent-detail:scope-self']::text[]), ('warehouse:rent-detail:scope-team', ARRAY['warehouse:rent-detail:scope-team']::text[]), ('warehouse:rent-detail:scope-site', ARRAY['warehouse:rent-detail:scope-site']::text[]), ('warehouse:rent-detail:scope-all', ARRAY['warehouse:rent-detail:scope-all']::text[])
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", snapshot."roleId"
FROM mapping
JOIN "_WarehousePermissionSnapshot" snapshot ON snapshot."codes" && mapping."legacy"
JOIN "Permission" permission ON permission."code" = mapping."target"
WHERE NOT (
  (mapping."target" LIKE 'warehouse:tally-pending:%' AND snapshot."codes" @> ARRAY['warehouse:tally-pending:view-block']::text[])
  OR (mapping."target" = 'warehouse:tally-pending:edit' AND snapshot."codes" @> ARRAY['warehouse:tally-pending:update-block']::text[])
  OR (mapping."target" = 'warehouse:tally-pending:cancel' AND snapshot."codes" @> ARRAY['warehouse:tally-pending:cancel-block']::text[])
  OR (mapping."target" IN ('warehouse:tally-pending:process','warehouse:tally-pending:complete-and-ship') AND snapshot."codes" @> ARRAY['warehouse:tally-pending:process-block']::text[])
  OR (mapping."target" LIKE 'warehouse:tally-completed:%' AND snapshot."codes" @> ARRAY['warehouse:tally-completed:view-block']::text[])
  OR (mapping."target" = 'warehouse:tally-completed:print' AND snapshot."codes" && ARRAY['warehouse:tally-completed:reprint-block','warehouse:tally-label:reprint-block']::text[])
  OR (mapping."target" = 'warehouse:tally-completed:download' AND snapshot."codes" && ARRAY['warehouse:tally-completed:download-block','warehouse:tally-label:download-block']::text[])
  OR (mapping."target" = 'warehouse:tally-completed:reverse' AND snapshot."codes" @> ARRAY['warehouse:tally-completed:reverse-block']::text[])
  OR (mapping."target" = 'warehouse:rent-detail:edit' AND snapshot."codes" @> ARRAY['warehouse:rent-rule:manage-block']::text[])
  OR (mapping."target" LIKE 'warehouse:rent-detail:%' AND snapshot."codes" @> ARRAY['warehouse:rent-detail:own-view-block']::text[])
)
ON CONFLICT DO NOTHING;

-- Preserve the old rent visibility outcome while translating the two negative
-- switches into exactly one positive scope.  This is intentionally separate
-- from the generic mapping above because a single legacy block means a
-- different scope than two blocks.
WITH legacy_scope AS (
  SELECT snapshot."roleId",
    CASE
      WHEN snapshot."codes" @> ARRAY['warehouse:rent-detail:all-view-block','warehouse:rent-detail:own-view-block']::text[] THEN NULL
      WHEN snapshot."codes" @> ARRAY['warehouse:rent-detail:all-view-block']::text[] THEN 'warehouse:rent-detail:scope-site'
      -- Legacy "exclude own site" has no exact positive-scope equivalent.  Do
      -- not widen it to all sites; leave it without a scope so access remains
      -- denied until an administrator explicitly chooses the replacement.
      WHEN snapshot."codes" @> ARRAY['warehouse:rent-detail:own-view-block']::text[] THEN NULL
      WHEN snapshot."codes" && ARRAY['warehouse:rent-detail:view','warehouse:rent-rule:view']::text[] THEN 'warehouse:rent-detail:scope-all'
      ELSE NULL
    END AS "target"
  FROM "_WarehousePermissionSnapshot" snapshot
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", legacy_scope."roleId"
FROM legacy_scope
JOIN "Permission" permission ON permission."code" = legacy_scope."target"
WHERE legacy_scope."target" IS NOT NULL
ON CONFLICT DO NOTHING;

-- A visible rent module must always have a usable minimum scope.  Explicit
-- migrated scopes win; otherwise use SELF rather than silently widening data.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT scopePermission."id", viewLink."B"
FROM "Permission" viewPermission
JOIN "_PermissionToRole" viewLink ON viewLink."A" = viewPermission."id"
JOIN "Permission" scopePermission ON scopePermission."code" = 'warehouse:rent-detail:scope-self'
WHERE viewPermission."code" = 'warehouse:rent-detail:view'
  AND NOT EXISTS (
    SELECT 1
    FROM "_PermissionToRole" scopeLink
    JOIN "Permission" existingScope ON existingScope."id" = scopeLink."A"
    WHERE scopeLink."B" = viewLink."B" AND existingScope."code" LIKE 'warehouse:rent-detail:scope-%'
  )
ON CONFLICT DO NOTHING;

-- Actions are individually assignable but always persist their single required
-- view dependency, so no client or controller needs a second checkbox.
WITH dependency("action", "view") AS (
  VALUES
    ('warehouse:today-receipt:edit','warehouse:today-receipt:view'), ('warehouse:today-receipt:delete','warehouse:today-receipt:view'), ('warehouse:today-receipt:manual-create','warehouse:today-receipt:view'), ('warehouse:today-receipt:import','warehouse:today-receipt:view'), ('warehouse:today-receipt:export','warehouse:today-receipt:view'),
    ('warehouse:in-stock:edit','warehouse:in-stock:view'), ('warehouse:in-stock:delete','warehouse:in-stock:view'), ('warehouse:in-stock:split','warehouse:in-stock:view'), ('warehouse:in-stock:tally','warehouse:in-stock:view'), ('warehouse:in-stock:order-entry','warehouse:in-stock:view'), ('warehouse:in-stock:import','warehouse:in-stock:view'), ('warehouse:in-stock:export','warehouse:in-stock:view'),
    ('warehouse:tally-pending:edit','warehouse:tally-pending:view'), ('warehouse:tally-pending:cancel','warehouse:tally-pending:view'), ('warehouse:tally-pending:process','warehouse:tally-pending:view'), ('warehouse:tally-pending:complete-and-ship','warehouse:tally-pending:view'),
    ('warehouse:tally-completed:print','warehouse:tally-completed:view'), ('warehouse:tally-completed:download','warehouse:tally-completed:view'), ('warehouse:tally-completed:scan','warehouse:tally-completed:view'), ('warehouse:tally-completed:reverse','warehouse:tally-completed:view'), ('warehouse:tally-completed:correct','warehouse:tally-completed:view'),
    ('warehouse:dispatch-pending:edit','warehouse:dispatch-pending:view'), ('warehouse:dispatch-pending:handover-print','warehouse:dispatch-pending:view'), ('warehouse:dispatch-pending:label-manage','warehouse:dispatch-pending:view'), ('warehouse:dispatch-pending:shipping-mark-confirm','warehouse:dispatch-pending:view'), ('warehouse:dispatch-pending:confirm','warehouse:dispatch-pending:view'),
    ('warehouse:outbounded:export','warehouse:outbounded:view'), ('warehouse:rent-detail:export','warehouse:rent-detail:view'), ('warehouse:rent-detail:edit','warehouse:rent-detail:view'),
    ('warehouse:rent-detail:scope-self','warehouse:rent-detail:view'), ('warehouse:rent-detail:scope-team','warehouse:rent-detail:view'), ('warehouse:rent-detail:scope-site','warehouse:rent-detail:view'), ('warehouse:rent-detail:scope-all','warehouse:rent-detail:view')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT viewPermission."id", actionLink."B"
FROM dependency
JOIN "Permission" actionPermission ON actionPermission."code" = dependency."action"
JOIN "_PermissionToRole" actionLink ON actionLink."A" = actionPermission."id"
JOIN "Permission" viewPermission ON viewPermission."code" = dependency."view"
ON CONFLICT DO NOTHING;

DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT "id" FROM "Permission"
  WHERE "code" LIKE 'warehouse:%' AND "code" NOT IN (
    'warehouse:dashboard:view','warehouse:today-receipt:view','warehouse:today-receipt:edit','warehouse:today-receipt:delete','warehouse:today-receipt:manual-create','warehouse:today-receipt:import','warehouse:today-receipt:export','warehouse:in-stock:view','warehouse:in-stock:edit','warehouse:in-stock:delete','warehouse:in-stock:split','warehouse:in-stock:tally','warehouse:in-stock:order-entry','warehouse:in-stock:import','warehouse:in-stock:export','warehouse:tally-pending:view','warehouse:tally-pending:edit','warehouse:tally-pending:cancel','warehouse:tally-pending:process','warehouse:tally-pending:complete-and-ship','warehouse:tally-completed:view','warehouse:tally-completed:print','warehouse:tally-completed:download','warehouse:tally-completed:scan','warehouse:tally-completed:reverse','warehouse:tally-completed:correct','warehouse:dispatch-pending:view','warehouse:dispatch-pending:edit','warehouse:dispatch-pending:handover-print','warehouse:dispatch-pending:label-manage','warehouse:dispatch-pending:shipping-mark-confirm','warehouse:dispatch-pending:confirm','warehouse:outbounded:view','warehouse:outbounded:export','warehouse:rent-detail:view','warehouse:rent-detail:export','warehouse:rent-detail:edit','warehouse:rent-detail:scope-self','warehouse:rent-detail:scope-team','warehouse:rent-detail:scope-site','warehouse:rent-detail:scope-all'
  )
);
DELETE FROM "Permission" WHERE "code" LIKE 'warehouse:%' AND "code" NOT IN (
  'warehouse:dashboard:view','warehouse:today-receipt:view','warehouse:today-receipt:edit','warehouse:today-receipt:delete','warehouse:today-receipt:manual-create','warehouse:today-receipt:import','warehouse:today-receipt:export','warehouse:in-stock:view','warehouse:in-stock:edit','warehouse:in-stock:delete','warehouse:in-stock:split','warehouse:in-stock:tally','warehouse:in-stock:order-entry','warehouse:in-stock:import','warehouse:in-stock:export','warehouse:tally-pending:view','warehouse:tally-pending:edit','warehouse:tally-pending:cancel','warehouse:tally-pending:process','warehouse:tally-pending:complete-and-ship','warehouse:tally-completed:view','warehouse:tally-completed:print','warehouse:tally-completed:download','warehouse:tally-completed:scan','warehouse:tally-completed:reverse','warehouse:tally-completed:correct','warehouse:dispatch-pending:view','warehouse:dispatch-pending:edit','warehouse:dispatch-pending:handover-print','warehouse:dispatch-pending:label-manage','warehouse:dispatch-pending:shipping-mark-confirm','warehouse:dispatch-pending:confirm','warehouse:outbounded:view','warehouse:outbounded:export','warehouse:rent-detail:view','warehouse:rent-detail:export','warehouse:rent-detail:edit','warehouse:rent-detail:scope-self','warehouse:rent-detail:scope-team','warehouse:rent-detail:scope-site','warehouse:rent-detail:scope-all'
);

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "Permission" WHERE "code" LIKE 'warehouse:%') <> 41 THEN RAISE EXCEPTION 'warehouse permission catalog was not rebuilt cleanly'; END IF;
  IF EXISTS (SELECT 1 FROM "Permission" WHERE "code" LIKE 'warehouse:%block%' OR "code" LIKE 'warehouse:%mask%') THEN RAISE EXCEPTION 'legacy warehouse block/mask permission remains'; END IF;
  IF EXISTS (
    SELECT 1
    FROM "_WarehousePermissionSnapshot" snapshot
    JOIN "Role" role ON role."id" = snapshot."roleId"
    JOIN "_PermissionToRole" link ON link."B" = role."id"
    JOIN "Permission" permission ON permission."id" = link."A"
    WHERE (snapshot."codes" @> ARRAY['warehouse:tally-pending:view-block']::text[] AND permission."code" LIKE 'warehouse:tally-pending:%')
      OR (snapshot."codes" @> ARRAY['warehouse:tally-completed:view-block']::text[] AND permission."code" LIKE 'warehouse:tally-completed:%')
      OR (snapshot."codes" @> ARRAY['warehouse:tally-pending:update-block']::text[] AND permission."code" = 'warehouse:tally-pending:edit')
      OR (snapshot."codes" @> ARRAY['warehouse:tally-pending:cancel-block']::text[] AND permission."code" = 'warehouse:tally-pending:cancel')
      OR (snapshot."codes" @> ARRAY['warehouse:tally-pending:process-block']::text[] AND permission."code" IN ('warehouse:tally-pending:process','warehouse:tally-pending:complete-and-ship'))
      OR (snapshot."codes" && ARRAY['warehouse:tally-completed:reprint-block','warehouse:tally-label:reprint-block']::text[] AND permission."code" = 'warehouse:tally-completed:print')
      OR (snapshot."codes" && ARRAY['warehouse:tally-completed:download-block','warehouse:tally-label:download-block']::text[] AND permission."code" = 'warehouse:tally-completed:download')
      OR (snapshot."codes" @> ARRAY['warehouse:tally-completed:reverse-block']::text[] AND permission."code" = 'warehouse:tally-completed:reverse')
      OR (snapshot."codes" @> ARRAY['warehouse:rent-rule:manage-block']::text[] AND permission."code" = 'warehouse:rent-detail:edit')
      OR (snapshot."codes" @> ARRAY['warehouse:rent-detail:own-view-block']::text[] AND permission."code" LIKE 'warehouse:rent-detail:%')
  ) THEN RAISE EXCEPTION 'legacy warehouse deny was widened during permission rebuild'; END IF;
  IF (SELECT "rowCount" FROM "_WarehouseBusinessCounts" WHERE "tableName" = 'WarehousePackage') <> (SELECT COUNT(*) FROM "WarehousePackage") OR (SELECT "rowCount" FROM "_WarehouseBusinessCounts" WHERE "tableName" = 'WarehouseTallyTask') <> (SELECT COUNT(*) FROM "WarehouseTallyTask") OR (SELECT "rowCount" FROM "_WarehouseBusinessCounts" WHERE "tableName" = 'WarehouseRentRule') <> (SELECT COUNT(*) FROM "WarehouseRentRule") OR (SELECT "rowCount" FROM "_WarehouseBusinessCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment") OR (SELECT "rowCount" FROM "_WarehouseBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User") OR (SELECT "rowCount" FROM "_WarehouseBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN RAISE EXCEPTION 'warehouse permission rebuild modified protected business rows'; END IF;
END $$;
