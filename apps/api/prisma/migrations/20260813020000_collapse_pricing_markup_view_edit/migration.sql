-- Collapse each pricing markup module to two business-facing grants: view and edit.
-- Pricing books, rows, markup rules, users, roles and every other business row stay unchanged.
CREATE TEMP TABLE "_PricingMarkupBusinessCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;
CREATE TEMP TABLE "_PricingMarkupRoleGrants" ("roleId" text NOT NULL, "module" text NOT NULL, "canView" boolean NOT NULL, "canEdit" boolean NOT NULL) ON COMMIT DROP;

INSERT INTO "_PricingMarkupBusinessCounts" VALUES
  ('PriceBook', (SELECT COUNT(*) FROM "PriceBook")),
  ('PriceBookRow', (SELECT COUNT(*) FROM "PriceBookRow")),
  ('AgentMarkupRule', (SELECT COUNT(*) FROM "AgentMarkupRule")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

INSERT INTO "_PricingMarkupRoleGrants" ("roleId", "module", "canView", "canEdit")
SELECT link."B", split_part(permission."code", ':', 3),
  bool_or(split_part(permission."code", ':', 4) = 'view') OR
    bool_or(split_part(permission."code", ':', 4) IN ('edit', 'create', 'update', 'import', 'export', 'status', 'delete', 'tier')),
  bool_or(split_part(permission."code", ':', 4) IN ('edit', 'create', 'update', 'import', 'export', 'status', 'delete', 'tier'))
FROM "_PermissionToRole" link
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" LIKE 'pricing:markup:%'
  AND split_part(permission."code", ':', 3) IN ('amazon', 'inquiry', 'europeExpress', 'southAfrica', 'usaAirSea', 'canadaAirSea', 'dubaiAirSea')
GROUP BY link."B", split_part(permission."code", ':', 3);

DELETE FROM "_PermissionToRole"
WHERE "A" IN (
  SELECT "id" FROM "Permission"
  WHERE "code" LIKE 'pricing:markup:%'
    AND split_part("code", ':', 4) IN ('create', 'update', 'import', 'export', 'status', 'delete', 'tier')
);

DELETE FROM "Permission"
WHERE "code" LIKE 'pricing:markup:%'
  AND split_part("code", ':', 4) IN ('create', 'update', 'import', 'export', 'status', 'delete', 'tier');

INSERT INTO "Permission" ("id", "code")
SELECT 'perm-pricing-business-' || substr(md5('pricing:markup:' || module || ':edit'), 1, 24), 'pricing:markup:' || module || ':edit'
FROM (VALUES ('amazon'), ('inquiry'), ('europeExpress'), ('southAfrica'), ('usaAirSea'), ('canadaAirSea'), ('dubaiAirSea')) AS modules(module)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", grant_snapshot."roleId"
FROM "_PricingMarkupRoleGrants" grant_snapshot
JOIN "Permission" permission ON permission."code" = 'pricing:markup:' || grant_snapshot."module" || ':edit'
WHERE grant_snapshot."canEdit"
ON CONFLICT DO NOTHING;

-- Edit includes module access, so migrated editors always retain the matching view grant.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", grant_snapshot."roleId"
FROM "_PricingMarkupRoleGrants" grant_snapshot
JOIN "Permission" permission ON permission."code" = 'pricing:markup:' || grant_snapshot."module" || ':view'
WHERE grant_snapshot."canView" OR grant_snapshot."canEdit"
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM "Permission"
    WHERE "code" ~ '^pricing:markup:(amazon|inquiry|europeExpress|southAfrica|usaAirSea|canadaAirSea|dubaiAirSea):(view|edit)$'
  ) <> 14
    OR EXISTS (
      SELECT 1
      FROM "Permission"
      WHERE "code" ~ '^pricing:markup:(amazon|inquiry|europeExpress|southAfrica|usaAirSea|canadaAirSea|dubaiAirSea):(create|update|import|export|status|delete|tier)$'
    ) THEN
    RAISE EXCEPTION 'pricing markup permission collapse did not produce exactly 14 view/edit grants';
  END IF;

  IF (SELECT "rowCount" FROM "_PricingMarkupBusinessCounts" WHERE "tableName" = 'PriceBook') <> (SELECT COUNT(*) FROM "PriceBook")
    OR (SELECT "rowCount" FROM "_PricingMarkupBusinessCounts" WHERE "tableName" = 'PriceBookRow') <> (SELECT COUNT(*) FROM "PriceBookRow")
    OR (SELECT "rowCount" FROM "_PricingMarkupBusinessCounts" WHERE "tableName" = 'AgentMarkupRule') <> (SELECT COUNT(*) FROM "AgentMarkupRule")
    OR (SELECT "rowCount" FROM "_PricingMarkupBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_PricingMarkupBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN
    RAISE EXCEPTION 'pricing markup permission collapse modified protected business rows';
  END IF;
END $$;
