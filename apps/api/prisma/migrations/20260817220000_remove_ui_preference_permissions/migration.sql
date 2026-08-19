-- Table column visibility/order is a per-user UI preference inherited from
-- the owning page view. It is not an independently assignable RBAC action.
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

CREATE TEMP TABLE "_UiPreferenceProtectedCounts" (
  "name" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_UiPreferenceProtectedCounts" ("name", "rowCount") VALUES
  ('User', (SELECT COUNT(*) FROM "User")),
  ('Role', (SELECT COUNT(*) FROM "Role")),
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog"));

DELETE FROM "_PermissionToRole" link
USING "Permission" permission
WHERE link."A" = permission."id"
  AND (
    permission."code" LIKE '%:column-setting'
    OR permission."code" LIKE '%:list-setting'
  );

DELETE FROM "Permission"
WHERE "code" LIKE '%:column-setting'
   OR "code" LIKE '%:list-setting';

DO $$
DECLARE
  item record;
  current_count bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Permission"
    WHERE "code" LIKE '%:column-setting'
       OR "code" LIKE '%:list-setting'
  ) THEN
    RAISE EXCEPTION 'UI preference permission cleanup failed';
  END IF;

  FOR item IN SELECT * FROM "_UiPreferenceProtectedCounts" LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', item."name") INTO current_count;
    IF current_count <> item."rowCount" THEN
      RAISE EXCEPTION 'Protected table % changed during UI preference cleanup: before %, after %',
        item."name", item."rowCount", current_count;
    END IF;
  END LOOP;
END $$;

COMMIT;
