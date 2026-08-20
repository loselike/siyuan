#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-service-plan.sh
source "$SCRIPT_DIR/lib/47-release-service-plan.sh"

assert_lines() {
  local label="$1"
  local expected="$2"
  shift 2
  local actual
  actual="$(printf '%s\n' "$@")"
  [[ "$actual" == "$expected" ]] || {
    printf 'service plan mismatch (%s): expected=%q actual=%q\n' "$label" "$expected" "$actual" >&2
    exit 1
  }
}

siyuan_47_api_image_refresh_required true false
! siyuan_47_api_image_refresh_required false false

assert_lines 'web-only build' $'api\nweb' $(siyuan_47_plan_build_services true false false)
assert_lines 'web-only restart' $'api\nweb' $(siyuan_47_plan_restart_services true false)
assert_lines 'api-only build' 'api' $(siyuan_47_plan_build_services false true false)
assert_lines 'api-only restart' 'api' $(siyuan_47_plan_restart_services false true)
assert_lines 'web-and-api build' $'api\nweb' $(siyuan_47_plan_build_services true true false)
assert_lines 'migration-only build' 'db-migrate' $(siyuan_47_plan_build_services false false true)
[[ -z "$(siyuan_47_plan_restart_services false false)" ]]

echo '[release-service-plan] PASS'
