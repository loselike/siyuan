#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"

result="$(ssh -o ConnectTimeout=20 "$REMOTE" "set -e
cd \"$REMOTE_DIR\"
docker compose exec -T postgres sh -lc 'psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -v ON_ERROR_STOP=1 -At -F \"|\"'" <<'SQL'
WITH target_migrations(name) AS (VALUES
  ('20260820100000_refine_pending_tally_permissions'),
  ('20260820103000_remove_legacy_pending_tally_permissions')
)
SELECT 'MIGRATION_ROWS', COUNT(*)
FROM "_prisma_migrations" migration
JOIN target_migrations target ON target.name = migration.migration_name
WHERE migration.finished_at IS NOT NULL
  AND migration.rolled_back_at IS NULL;

WITH risky_action(action, metric) AS (VALUES
  ('system.role.create', 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_CREATE'),
  ('system.role.update', 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_UPDATE'),
  ('system.role.delete', 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_DELETE'),
  ('system.role_permissions.update', 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_PERMISSIONS_UPDATE'),
  ('system.role_permissions.copy', 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_PERMISSIONS_COPY')
), phase_one AS (
  SELECT started_at
  FROM "_prisma_migrations"
  WHERE migration_name = '20260820100000_refine_pending_tally_permissions'
    AND finished_at IS NOT NULL
    AND rolled_back_at IS NULL
), phase_two AS (
  SELECT finished_at
  FROM "_prisma_migrations"
  WHERE migration_name = '20260820103000_remove_legacy_pending_tally_permissions'
    AND finished_at IS NOT NULL
    AND rolled_back_at IS NULL
)
SELECT risky_action.metric, COUNT(audit.id)
FROM risky_action
CROSS JOIN phase_one
CROSS JOIN phase_two
LEFT JOIN "AuditLog" audit
  ON audit.action = risky_action.action
  AND audit."createdAt" >= phase_one.started_at - INTERVAL '1 minute'
  AND audit."createdAt" <= phase_two.finished_at
GROUP BY risky_action.action, risky_action.metric
ORDER BY risky_action.action;

WITH expected(code) AS (VALUES
  ('warehouse:tally-pending:view'),
  ('warehouse:tally-pending:detail'),
  ('warehouse:tally-pending:edit'),
  ('warehouse:tally-pending:start'),
  ('warehouse:tally-pending:process'),
  ('warehouse:tally-pending:restart'),
  ('warehouse:tally-pending:sort-rule-manage'),
  ('warehouse:tally-pending:problem-view'),
  ('warehouse:tally-pending:shipment-create')
)
SELECT 'CANONICAL_PERMISSION_ROWS', COUNT(*)
FROM "Permission" permission
JOIN expected ON expected.code = permission.code;

SELECT 'LEGACY_PERMISSION_ROWS', COUNT(*)
FROM "Permission"
WHERE code IN (
  'warehouse:tally-pending:cancel',
  'warehouse:tally-pending:complete-and-ship'
);

WITH dependency(action) AS (VALUES
  ('warehouse:tally-pending:detail'),
  ('warehouse:tally-pending:edit'),
  ('warehouse:tally-pending:start'),
  ('warehouse:tally-pending:process'),
  ('warehouse:tally-pending:restart'),
  ('warehouse:tally-pending:sort-rule-manage')
)
SELECT 'ACTION_GRANTS_WITHOUT_VIEW', COUNT(*)
FROM "_PermissionToRole" action_link
JOIN "Permission" action_permission ON action_permission.id = action_link."A"
JOIN dependency ON dependency.action = action_permission.code
WHERE NOT EXISTS (
  SELECT 1
  FROM "_PermissionToRole" view_link
  JOIN "Permission" view_permission ON view_permission.id = view_link."A"
  WHERE view_link."B" = action_link."B"
    AND view_permission.code = 'warehouse:tally-pending:view'
);
SQL
)"

printf '%s\n' "$result"

metric() {
  local key="$1"
  printf '%s\n' "$result" | awk -F '|' -v key="$key" '$1 == key { print $2 }'
}

[[ "$(metric MIGRATION_ROWS)" == 2 ]] || {
  echo "Pending-tally migration audit failed: both migrations must be applied exactly once." >&2
  exit 1
}
for role_graph_metric in \
  ROLE_GRAPH_MUTATION_SYSTEM_ROLE_CREATE \
  ROLE_GRAPH_MUTATION_SYSTEM_ROLE_UPDATE \
  ROLE_GRAPH_MUTATION_SYSTEM_ROLE_DELETE \
  ROLE_GRAPH_MUTATION_SYSTEM_ROLE_PERMISSIONS_UPDATE \
  ROLE_GRAPH_MUTATION_SYSTEM_ROLE_PERMISSIONS_COPY; do
  [[ "$(metric "$role_graph_metric")" == 0 ]] || {
    echo "Pending-tally migration audit found a role/permission graph mutation in the unsafe phase-one window ($role_graph_metric); reconciliation is required." >&2
    exit 1
  }
done
[[ "$(metric CANONICAL_PERMISSION_ROWS)" == 9 ]] || {
  echo "Pending-tally migration audit failed: canonical permission catalog is incomplete." >&2
  exit 1
}
[[ "$(metric LEGACY_PERMISSION_ROWS)" == 0 ]] || {
  echo "Pending-tally migration audit failed: legacy permissions remain." >&2
  exit 1
}
[[ "$(metric ACTION_GRANTS_WITHOUT_VIEW)" == 0 ]] || {
  echo "Pending-tally migration audit failed: an operational action lacks the page-view dependency." >&2
  exit 1
}

echo 'PENDING_TALLY_PERMISSION_AUDIT=pass'
