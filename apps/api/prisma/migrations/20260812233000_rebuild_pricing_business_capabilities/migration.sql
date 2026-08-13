-- Rebuild only the pricing authorization catalog and role relationships.
-- Price books, rows, markup rules, users, roles and all other business data are immutable here.
CREATE TEMP TABLE "_PricingRefactorRoles" ("roleId" text PRIMARY KEY) ON COMMIT DROP;
CREATE TEMP TABLE "_PricingBusinessCounts" ("tableName" text PRIMARY KEY, "rowCount" bigint NOT NULL) ON COMMIT DROP;

INSERT INTO "_PricingBusinessCounts" VALUES
  ('PriceBook', (SELECT COUNT(*) FROM "PriceBook")),
  ('PriceBookRow', (SELECT COUNT(*) FROM "PriceBookRow")),
  ('AgentMarkupRule', (SELECT COUNT(*) FROM "AgentMarkupRule")),
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role"));

INSERT INTO "_PricingRefactorRoles" ("roleId")
SELECT DISTINCT link."B"
FROM "_PermissionToRole" link
JOIN "Permission" permission ON permission."id" = link."A"
WHERE permission."code" LIKE 'pricing:%';

DELETE FROM "_PermissionToRole"
WHERE "A" IN (SELECT "id" FROM "Permission" WHERE "code" LIKE 'pricing:%');

DELETE FROM "Permission" WHERE "code" LIKE 'pricing:%';

WITH modules("module", "lookupCode") AS (
  VALUES
    ('amazon', 'pricing:lookup:amazon'),
    ('inquiry', 'pricing:lookup:europe-oversize'),
    ('europeExpress', 'pricing:lookup:europe-express'),
    ('southAfrica', 'pricing:lookup:south-africa'),
    ('usaAirSea', 'pricing:lookup:usa-air-sea'),
    ('canadaAirSea', 'pricing:lookup:canada-air-sea'),
    ('dubaiAirSea', 'pricing:lookup:dubai-air-sea')
), markup_actions("action") AS (
  VALUES ('view'), ('create'), ('update'), ('import'), ('export'), ('status'), ('delete'), ('tier')
), price_book_actions("action") AS (
  VALUES ('view'), ('import'), ('export'), ('update'), ('delete'), ('health')
), capabilities("code") AS (
  SELECT "lookupCode" FROM modules
  UNION ALL
  SELECT 'pricing:markup:' || "module" || ':' || "action" FROM modules CROSS JOIN markup_actions
  UNION ALL
  SELECT 'pricing:price-books:' || "action" FROM price_book_actions
)
INSERT INTO "Permission" ("id", "code")
SELECT 'perm-pricing-business-' || substr(md5("code"), 1, 24), "code"
FROM capabilities;

-- Test-environment compatibility: every existing role that had any pricing
-- authorization retains full pricing access. Administrators also remain a runtime bypass.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role_snapshot."roleId"
FROM "Permission" permission
CROSS JOIN "_PricingRefactorRoles" role_snapshot
WHERE permission."code" LIKE 'pricing:%'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF (SELECT "rowCount" FROM "_PricingBusinessCounts" WHERE "tableName" = 'PriceBook') <> (SELECT COUNT(*) FROM "PriceBook")
    OR (SELECT "rowCount" FROM "_PricingBusinessCounts" WHERE "tableName" = 'PriceBookRow') <> (SELECT COUNT(*) FROM "PriceBookRow")
    OR (SELECT "rowCount" FROM "_PricingBusinessCounts" WHERE "tableName" = 'AgentMarkupRule') <> (SELECT COUNT(*) FROM "AgentMarkupRule")
    OR (SELECT "rowCount" FROM "_PricingBusinessCounts" WHERE "tableName" = 'User') <> (SELECT COUNT(*) FROM "User")
    OR (SELECT "rowCount" FROM "_PricingBusinessCounts" WHERE "tableName" = 'Role') <> (SELECT COUNT(*) FROM "Role") THEN
    RAISE EXCEPTION 'pricing permission rebuild modified protected business rows';
  END IF;
END $$;
