ALTER TABLE "DubaiPriceDisplayVersion"
ADD COLUMN "seaMarkupPerCbm" DECIMAL(12,2) NOT NULL DEFAULT 20,
ADD COLUMN "seaMarkupApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "seaMarkupCellCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "renderScope" TEXT NOT NULL DEFAULT 'AIR_SEA';

INSERT INTO "Permission" ("id", "code")
VALUES
  ('perm-pricing-dubai-display-markup-view', 'pricing:dubai-display:markup-view'),
  ('perm-pricing-dubai-display-markup-update', 'pricing:dubai-display:markup-update')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" AS permission
JOIN "Role" AS role ON role."name" IN ('ADMIN', 'UG_MARKET')
WHERE permission."code" IN ('pricing:dubai-display:markup-view', 'pricing:dubai-display:markup-update')
ON CONFLICT ("A", "B") DO NOTHING;

-- Preserve the old active mapping until a newly rendered safe version has
-- activated successfully. The new API excludes these false-marked rows and
-- blocks their legacy files, so a failed re-import leaves a blank display
-- without destroying the rollback/audit reference.

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-dubai-sea-markup-images-20260720203000',
  'system',
  'system.role_permissions.repair',
  'role-groups:dubai-sea-markup-images',
  '{"reason":"retire historical raw Dubai images and add internal sea price controls"}'::jsonb,
  '{"roles":["ADMIN","UG_MARKET"],"permissions":["pricing:dubai-display:markup-view","pricing:dubai-display:markup-update"],"legacyImagesBlocked":true}'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
