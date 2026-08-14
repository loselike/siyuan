#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-release-source-snapshot.XXXXXX")"
trap 'rm -rf "$FIXTURE_ROOT"' EXIT

mkdir -p "$FIXTURE_ROOT/scripts" "$FIXTURE_ROOT/apps/api" "$FIXTURE_ROOT/apps/web" "$FIXTURE_ROOT/packages/shared" "$FIXTURE_ROOT/deploy"
cp "$SCRIPT_DIR/print-47-release-fingerprints.sh" "$SCRIPT_DIR/verify-release-source-snapshot.sh" "$FIXTURE_ROOT/scripts/"
printf 'api-v1\n' > "$FIXTURE_ROOT/apps/api/runtime.ts"
printf 'web-v1\n' > "$FIXTURE_ROOT/apps/web/runtime.tsx"
printf 'shared-v1\n' > "$FIXTURE_ROOT/packages/shared/runtime.ts"

fingerprints="$(SIYUAN_RELEASE_REPO_ROOT="$FIXTURE_ROOT" bash "$FIXTURE_ROOT/scripts/print-47-release-fingerprints.sh")"
web="$(printf '%s\n' "$fingerprints" | sed -n 's/^WEB_FINGERPRINT=//p')"
api="$(printf '%s\n' "$fingerprints" | sed -n 's/^API_FINGERPRINT=//p')"
migrate="$(printf '%s\n' "$fingerprints" | sed -n 's/^MIGRATE_FINGERPRINT=//p')"

SIYUAN_RELEASE_REPO_ROOT="$FIXTURE_ROOT" bash "$FIXTURE_ROOT/scripts/verify-release-source-snapshot.sh" "$web" "$api" "$migrate" >/dev/null
printf 'api-v2\n' > "$FIXTURE_ROOT/apps/api/runtime.ts"
if SIYUAN_RELEASE_REPO_ROOT="$FIXTURE_ROOT" bash "$FIXTURE_ROOT/scripts/verify-release-source-snapshot.sh" "$web" "$api" "$migrate" >"$FIXTURE_ROOT/output" 2>&1; then
  echo "source snapshot verifier accepted runtime drift" >&2
  exit 1
fi
grep -q 'WHITELIST_SOURCE_SNAPSHOT_DRIFT' "$FIXTURE_ROOT/output"
echo '[release-source-snapshot] PASS'
