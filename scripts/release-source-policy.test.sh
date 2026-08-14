#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/release-source-policy.sh
source "$SCRIPT_DIR/lib/release-source-policy.sh"

siyuan_47_assert_standard_release_source apply false main
siyuan_47_assert_standard_release_source apply false codex/release/phase69
siyuan_47_assert_standard_release_source dry-run false codex/feature
siyuan_47_assert_standard_release_source apply true codex/bootstrap
if siyuan_47_assert_standard_release_source apply false codex/feature 2>/dev/null; then
  echo "feature branch unexpectedly passed standard release policy" >&2
  exit 1
fi

siyuan_47_assert_whitelist_release_source main false
siyuan_47_assert_whitelist_release_source codex/feature true
if siyuan_47_assert_whitelist_release_source codex/feature false 2>/dev/null; then
  echo "feature branch unexpectedly passed whitelist release policy" >&2
  exit 1
fi

echo "RELEASE_SOURCE_POLICY_TEST_OK"
