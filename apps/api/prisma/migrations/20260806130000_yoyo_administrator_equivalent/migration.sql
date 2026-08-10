DO $$
DECLARE
  target_role_id TEXT;
  target_role_name TEXT;
  target_role_label TEXT;
  target_role_site TEXT;
  target_role_enabled BOOLEAN;
  previous_system_builtin BOOLEAN;
  bound_account_count INTEGER;
  expected_account_count INTEGER;
BEGIN
  SELECT "id", "name", "label", "site", "enabled", "systemBuiltin"
  INTO target_role_id, target_role_name, target_role_label, target_role_site, target_role_enabled, previous_system_builtin
  FROM "Role"
  WHERE "id" = 'r-ug_796f796fe7aea1e79086e591'
     OR "name" = 'UG_796F796FE7AEA1E79086E591';

  IF target_role_id IS NULL THEN
    RAISE NOTICE 'yoyo administrator-equivalent migration skipped: reserved production role is absent';
    RETURN;
  END IF;

  IF target_role_id IS DISTINCT FROM 'r-ug_796f796fe7aea1e79086e591'
    OR target_role_name IS DISTINCT FROM 'UG_796F796FE7AEA1E79086E591'
    OR target_role_label IS DISTINCT FROM 'yoyo管理员'
    OR target_role_site IS DISTINCT FROM '深圳思远'
    OR target_role_enabled IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'yoyo administrator-equivalent migration aborted: role identity does not match';
  END IF;

  SELECT COUNT(*)
  INTO bound_account_count
  FROM "User"
  WHERE "roleId" = target_role_id;

  SELECT COUNT(*)
  INTO expected_account_count
  FROM "User"
  WHERE "roleId" = target_role_id
    AND "username" = 'yoyo01'
    AND "enabled" = TRUE;

  IF bound_account_count <> 1 OR expected_account_count <> 1 THEN
    RAISE EXCEPTION 'yoyo administrator-equivalent migration aborted: expected exactly one enabled yoyo01 binding, found % total / % expected', bound_account_count, expected_account_count;
  END IF;

  UPDATE "Role"
  SET "systemBuiltin" = TRUE
  WHERE "id" = target_role_id;

  INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
  VALUES (
    'audit-yoyo-admin-equivalent-20260806130000',
    'system',
    'system.role.administrator_equivalent.promote',
    'role:UG_796F796FE7AEA1E79086E591',
    jsonb_build_object(
      'role', target_role_name,
      'label', target_role_label,
      'administratorEquivalent', FALSE,
      'systemBuiltin', previous_system_builtin
    ),
    '{"role":"UG_796F796FE7AEA1E79086E591","label":"yoyo管理员","administratorEquivalent":true,"effectiveRole":"ADMIN","permissions":"ALL_DYNAMIC","systemBuiltin":true}'::jsonb,
    NOW()
  )
  ON CONFLICT ("id") DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM "AuditLog"
    WHERE "id" = 'audit-yoyo-admin-equivalent-20260806130000'
      AND "actorId" = 'system'
      AND "action" = 'system.role.administrator_equivalent.promote'
      AND "target" = 'role:UG_796F796FE7AEA1E79086E591'
      AND "after" = '{"role":"UG_796F796FE7AEA1E79086E591","label":"yoyo管理员","administratorEquivalent":true,"effectiveRole":"ADMIN","permissions":"ALL_DYNAMIC","systemBuiltin":true}'::jsonb
  ) THEN
    RAISE EXCEPTION 'yoyo administrator-equivalent migration aborted: audit identity conflict';
  END IF;
END $$;
