#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-release-fingerprint.XXXXXX")"
trap 'rm -rf -- "$FIXTURE_ROOT"' EXIT

mkdir -p \
  "$FIXTURE_ROOT/apps/api/src" \
  "$FIXTURE_ROOT/apps/api/prisma/migrations/20260812000000_fixture" \
  "$FIXTURE_ROOT/apps/web/src/nested" \
  "$FIXTURE_ROOT/packages/shared/src" \
  "$FIXTURE_ROOT/deploy"

printf 'api\n' > "$FIXTURE_ROOT/apps/api/src/index.ts"
printf 'schema\n' > "$FIXTURE_ROOT/apps/api/prisma/schema.prisma"
printf 'migration\n' > "$FIXTURE_ROOT/apps/api/prisma/migrations/20260812000000_fixture/migration.sql"
printf 'web\n' > "$FIXTURE_ROOT/apps/web/src/index.tsx"
printf 'shared\n' > "$FIXTURE_ROOT/packages/shared/src/index.ts"
printf 'nginx\n' > "$FIXTURE_ROOT/deploy/nginx.conf"
printf '{}\n' > "$FIXTURE_ROOT/package.json"

fingerprints() {
  SIYUAN_RELEASE_REPO_ROOT="$FIXTURE_ROOT" bash "$SCRIPT_DIR/print-47-release-fingerprints.sh"
}

before="$(fingerprints)"
printf 'apple-double\n' > "$FIXTURE_ROOT/apps/api/src/._index.ts"
printf 'apple-double\n' > "$FIXTURE_ROOT/apps/api/prisma/._schema.prisma"
printf 'apple-double\n' > "$FIXTURE_ROOT/apps/web/src/._index.tsx"
printf 'apple-double\n' > "$FIXTURE_ROOT/apps/web/src/nested/._metadata"
printf 'finder\n' > "$FIXTURE_ROOT/apps/web/src/.DS_Store"
after_artifacts="$(fingerprints)"

if [[ "$before" != "$after_artifacts" ]]; then
  echo 'release fingerprints changed after adding ignored macOS metadata artifacts' >&2
  diff -u <(printf '%s\n' "$before") <(printf '%s\n' "$after_artifacts") || true
  exit 1
fi

printf 'real-runtime-change\n' > "$FIXTURE_ROOT/apps/web/src/real-change.tsx"
after_runtime_change="$(fingerprints)"
before_web="$(printf '%s\n' "$before" | sed -n 's/^WEB_FINGERPRINT=//p')"
after_web="$(printf '%s\n' "$after_runtime_change" | sed -n 's/^WEB_FINGERPRINT=//p')"
before_api="$(printf '%s\n' "$before" | sed -n 's/^API_FINGERPRINT=//p')"
after_api="$(printf '%s\n' "$after_runtime_change" | sed -n 's/^API_FINGERPRINT=//p')"

if [[ "$before_web" == "$after_web" || "$before_api" != "$after_api" ]]; then
  echo 'release fingerprints did not preserve scope sensitivity for a real Web runtime change' >&2
  exit 1
fi

echo '[release-fingerprint-artifact-filter] PASS'
