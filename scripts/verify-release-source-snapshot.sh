#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SIYUAN_RELEASE_REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
EXPECTED_WEB="${1:-}"
EXPECTED_API="${2:-}"
EXPECTED_MIGRATE="${3:-}"

[[ -n "$EXPECTED_WEB" && -n "$EXPECTED_API" && -n "$EXPECTED_MIGRATE" ]] || {
  echo "WHITELIST_SOURCE_SNAPSHOT_EXPECTATION_MISSING" >&2
  exit 2
}

fingerprints="$(SIYUAN_RELEASE_REPO_ROOT="$REPO_ROOT" bash "$SCRIPT_DIR/print-47-release-fingerprints.sh")"
actual_web="$(printf '%s\n' "$fingerprints" | sed -n 's/^WEB_FINGERPRINT=//p')"
actual_api="$(printf '%s\n' "$fingerprints" | sed -n 's/^API_FINGERPRINT=//p')"
actual_migrate="$(printf '%s\n' "$fingerprints" | sed -n 's/^MIGRATE_FINGERPRINT=//p')"

if [[ "$actual_web" != "$EXPECTED_WEB" || "$actual_api" != "$EXPECTED_API" || "$actual_migrate" != "$EXPECTED_MIGRATE" ]]; then
  echo "WHITELIST_SOURCE_SNAPSHOT_DRIFT expected_web=$EXPECTED_WEB actual_web=$actual_web expected_api=$EXPECTED_API actual_api=$actual_api expected_migrate=$EXPECTED_MIGRATE actual_migrate=$actual_migrate" >&2
  exit 83
fi

echo "WHITELIST_SOURCE_SNAPSHOT_OK"
