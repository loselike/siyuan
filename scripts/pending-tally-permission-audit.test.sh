#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-pending-tally-audit-test.XXXXXX")"
trap 'rm -rf -- "$tmp_dir"' EXIT INT TERM
mkdir -p "$tmp_dir/bin"

cat >"$tmp_dir/bin/ssh" <<'FAKE_SSH'
#!/usr/bin/env bash
cat >/dev/null
printf 'MIGRATION_ROWS|2\n'
printf 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_CREATE|%s\n' "${FAKE_SYSTEM_ROLE_CREATE:-0}"
printf 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_UPDATE|%s\n' "${FAKE_SYSTEM_ROLE_UPDATE:-0}"
printf 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_DELETE|%s\n' "${FAKE_SYSTEM_ROLE_DELETE:-0}"
printf 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_PERMISSIONS_UPDATE|%s\n' "${FAKE_SYSTEM_ROLE_PERMISSIONS_UPDATE:-0}"
printf 'ROLE_GRAPH_MUTATION_SYSTEM_ROLE_PERMISSIONS_COPY|%s\n' "${FAKE_SYSTEM_ROLE_PERMISSIONS_COPY:-0}"
printf 'CANONICAL_PERMISSION_ROWS|9\n'
printf 'LEGACY_PERMISSION_ROWS|0\n'
printf 'ACTION_GRANTS_WITHOUT_VIEW|0\n'
FAKE_SSH
chmod +x "$tmp_dir/bin/ssh"

PATH="$tmp_dir/bin:$PATH" bash "$SCRIPT_DIR/audit-47-pending-tally-permissions.sh" \
  >"$tmp_dir/pass.out" 2>"$tmp_dir/pass.err"
grep -Fq 'PENDING_TALLY_PERMISSION_AUDIT=pass' "$tmp_dir/pass.out"

for fixture in \
  FAKE_SYSTEM_ROLE_CREATE \
  FAKE_SYSTEM_ROLE_UPDATE \
  FAKE_SYSTEM_ROLE_DELETE \
  FAKE_SYSTEM_ROLE_PERMISSIONS_UPDATE \
  FAKE_SYSTEM_ROLE_PERMISSIONS_COPY; do
  set +e
  env "$fixture=1" PATH="$tmp_dir/bin:$PATH" bash "$SCRIPT_DIR/audit-47-pending-tally-permissions.sh" \
    >"$tmp_dir/$fixture.out" 2>"$tmp_dir/$fixture.err"
  status=$?
  set -e
  if [[ "$status" -eq 0 ]]; then
    echo "Expected $fixture race evidence to fail the audit." >&2
    exit 1
  fi
  grep -Fq 'reconciliation is required' "$tmp_dir/$fixture.err"
done

echo '[pending-tally-permission-audit] PASS'
