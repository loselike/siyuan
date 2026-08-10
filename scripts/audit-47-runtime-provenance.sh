#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
REQUIRE_TRACEABLE=false

if [[ "${1:-}" == "--require-traceable" ]]; then
  REQUIRE_TRACEABLE=true
elif [[ "$#" -gt 0 ]]; then
  echo "Usage: npm run audit:47:provenance -- [--require-traceable]" >&2
  exit 2
fi

result="$(ssh -o ConnectTimeout=20 "$REMOTE" bash -s -- "$REMOTE_DIR" <<'REMOTE_SCRIPT'
set -euo pipefail
remote_dir="$1"
cd "$remote_dir"

state_file=.siyuan-release-state
state_value() {
  sed -n "s/^$1=//p" "$state_file" 2>/dev/null | tail -1
}

release_id="$(state_value RELEASE_ID)"
source_mode="$(state_value SOURCE_MODE)"
git_commit="$(state_value GIT_COMMIT)"
git_branch="$(state_value GIT_BRANCH)"
web_fingerprint="$(state_value WEB_FINGERPRINT)"
api_fingerprint="$(state_value API_FINGERPRINT)"
migrate_fingerprint="$(state_value MIGRATE_FINGERPRINT)"
web_image_expected="$(state_value WEB_IMAGE_ID)"
api_image_expected="$(state_value API_IMAGE_ID)"
receipt_path="$(state_value RELEASE_RECEIPT_PATH)"
receipt_sha_expected="$(state_value RELEASE_RECEIPT_SHA256)"

web_container="$(docker compose ps -q web 2>/dev/null | tail -1)"
api_container="$(docker compose ps -q api 2>/dev/null | tail -1)"
web_image_actual="$(docker inspect --format '{{.Image}}' "$web_container" 2>/dev/null || true)"
api_image_actual="$(docker inspect --format '{{.Image}}' "$api_container" 2>/dev/null || true)"
api_release_id_actual="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$api_container" 2>/dev/null | sed -n 's/^RELEASE_ID=//p' | tail -1)"

status=traceable
reason=ok
if [[ "$source_mode" == WHITELIST_CAS ]]; then
  status=non-git-source
  reason=whitelist-cas-is-not-a-git-source-build
elif [[ ! "$git_commit" =~ ^[0-9a-f]{40}$ || -z "$git_branch" || "$source_mode" != GIT_SOURCE_BUILD ]]; then
  status=legacy-untraceable
  reason=missing-git-source-provenance
elif [[ -z "$web_image_expected" || -z "$api_image_expected" || "$web_image_expected" != "$web_image_actual" || "$api_image_expected" != "$api_image_actual" ]]; then
  status=mismatch
  reason=running-image-does-not-match-release-state
elif [[ "$api_release_id_actual" != "$release_id" ]]; then
  status=mismatch
  reason=api-runtime-release-id-does-not-match-release-state
elif [[ ! "$receipt_path" =~ ^\.release-receipts/[A-Za-z0-9._:-]+\.env$ ]]; then
  status=mismatch
  reason=invalid-or-missing-release-receipt-path
elif [[ -L .release-receipts || ! -d .release-receipts || "$(readlink -f .release-receipts)" != "$(readlink -f "$remote_dir")/.release-receipts" ]]; then
  status=mismatch
  reason=release-receipt-directory-is-not-canonical
elif [[ -L "$receipt_path" || ! -f "$receipt_path" ]]; then
  status=mismatch
  reason=release-receipt-missing
else
  receipt_sha_actual="$(sha256sum "$receipt_path" | awk '{print $1}')"
  receipt_mode="$(stat -c '%a' "$receipt_path")"
  receipt_value() {
    sed -n "s/^$1=//p" "$receipt_path" | tail -1
  }
  expected_release_id="git-${git_commit:0:12}_web-${web_fingerprint:0:12}_api-${api_fingerprint:0:12}"
  if (( (8#$receipt_mode & 0222) != 0 )); then
    status=mismatch
    reason=release-receipt-is-writable
  elif [[ ! "$receipt_sha_expected" =~ ^[0-9a-f]{64}$ || "$receipt_sha_expected" != "$receipt_sha_actual" ]]; then
    status=mismatch
    reason=release-receipt-checksum-mismatch
  elif [[ "$release_id" != "$expected_release_id" || \
          "$(receipt_value RECEIPT_FORMAT_VERSION)" != 1 || \
          "$(receipt_value SOURCE_MODE)" != GIT_SOURCE_BUILD || \
          "$(receipt_value RELEASE_ID)" != "$release_id" || \
          "$(receipt_value GIT_COMMIT)" != "$git_commit" || \
          "$(receipt_value GIT_BRANCH)" != "$git_branch" || \
          "$(receipt_value WEB_FINGERPRINT)" != "$web_fingerprint" || \
          "$(receipt_value API_FINGERPRINT)" != "$api_fingerprint" || \
          "$(receipt_value MIGRATE_FINGERPRINT)" != "$migrate_fingerprint" || \
          "$(receipt_value WEB_IMAGE_ID)" != "$web_image_actual" || \
          "$(receipt_value API_IMAGE_ID)" != "$api_image_actual" ]]; then
    status=mismatch
    reason=release-receipt-content-mismatch
  fi
fi

printf 'RUNTIME_PROVENANCE_STATUS=%s\n' "$status"
printf 'RUNTIME_PROVENANCE_REASON=%s\n' "$reason"
printf 'RELEASE_ID=%s\n' "${release_id:-MISSING}"
printf 'SOURCE_MODE=%s\n' "${source_mode:-MISSING}"
printf 'GIT_COMMIT=%s\n' "${git_commit:-MISSING}"
printf 'GIT_BRANCH=%s\n' "${git_branch:-MISSING}"
printf 'WEB_IMAGE_MATCH=%s\n' "$([[ -n "$web_image_expected" && "$web_image_expected" == "$web_image_actual" ]] && echo true || echo false)"
printf 'API_IMAGE_MATCH=%s\n' "$([[ -n "$api_image_expected" && "$api_image_expected" == "$api_image_actual" ]] && echo true || echo false)"
printf 'API_RELEASE_ID_MATCH=%s\n' "$([[ -n "$release_id" && "$release_id" == "$api_release_id_actual" ]] && echo true || echo false)"
REMOTE_SCRIPT
)"

printf '%s\n' "$result"
status="$(printf '%s\n' "$result" | sed -n 's/^RUNTIME_PROVENANCE_STATUS=//p')"
if [[ "$REQUIRE_TRACEABLE" == true && "$status" != traceable ]]; then
  echo "47 runtime provenance is not release-safe; source synchronization, image rebuild and migration remain blocked." >&2
  exit 84
fi
