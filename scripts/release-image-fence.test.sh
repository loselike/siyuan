#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-images.sh
source "$SCRIPT_DIR/lib/47-release-images.sh"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-image-fence-test.XXXXXX")"
trap 'rm -rf -- "$tmp_dir"' EXIT INT TERM
state_file="$tmp_dir/images.tsv"

docker() {
  if [[ "$1 $2 $3" != "image inspect --format" || "$4" != '{{if .Descriptor}}{{.Descriptor.digest}}{{else}}{{.Id}}{{end}}' ]]; then
    echo "unexpected fake docker command: $*" >&2
    return 2
  fi
  awk -F '\t' -v ref="$5" '$1 == ref {print $2}' "$state_file"
}

if siyuan_47_export_release_images 'unsafe release' 2>"$tmp_dir/invalid"; then
  echo 'unsafe release ID was accepted as an image tag' >&2
  exit 1
fi
grep -q 'unsupported image-tag characters' "$tmp_dir/invalid"

siyuan_47_export_release_images 'whitelist-ABC:123'
[[ "$SIYUAN_API_IMAGE" == 'siyuan-api:whitelist-abc-123' ]]
[[ "$SIYUAN_WEB_IMAGE" == 'siyuan-web:whitelist-abc-123' ]]
[[ "$SIYUAN_MIGRATE_IMAGE" == 'siyuan-db-migrate:whitelist-abc-123' ]]

# The whitelist path also verifies the exported references and the containers
# created from them, so passing the pre-start image-ID check is not sufficient.
grep -q 'RELEASE_IMAGE_EXPORT_MISMATCH' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'RELEASE_CONTAINER_IMAGE_FENCE_MISMATCH' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q "docker inspect --format '{{.Config.Image}}'" "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'docker compose up -d --no-build --pull never --remove-orphans' "$SCRIPT_DIR/deploy-47.sh"
! grep -q 'siyuan_47_run_bounded_build docker compose build' "$SCRIPT_DIR/deploy-47.sh"
grep -q 'REMOTE_SERVER_BUILD_POLICY_VIOLATION' "$SCRIPT_DIR/deploy-47.sh"
grep -q 'API_IMAGE_REFRESH_REQUIRED=true' "$SCRIPT_DIR/deploy-47.sh"
grep -q 'siyuan_47_capture_release_image_ids "\$API_IMAGE_REFRESH_REQUIRED"' "$SCRIPT_DIR/deploy-47.sh"
bash "$SCRIPT_DIR/release-service-plan.test.sh"
bash "$SCRIPT_DIR/release-build-policy.test.sh"
grep -q 'APPROVED_MIGRATIONS_ARG=.*__SIYUAN_EMPTY__' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'RELEASE_ID_ARGUMENT_INVALID' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'COMPOSE_CREATED_REPLACEMENT_REMOVED' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'COMPOSE_RECREATE_RETRY_REFUSED' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'COMPOSE_RECREATE_RETRY=once' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'candidate_status.*created.*candidate_image.*expected_image.*candidate_workdir.*remote_dir' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'SOURCE_ROLLBACK_REQUIRED=true' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'WHITELIST_SOURCE_SNAPSHOT_CAPTURE_FAILED' "$SCRIPT_DIR/deploy-47-whitelist.sh"
grep -q 'verify-release-source-snapshot.sh' "$SCRIPT_DIR/deploy-47-whitelist.sh"
[[ "$(grep -c '^verify_whitelist_source_snapshot$' "$SCRIPT_DIR/deploy-47-whitelist.sh")" -eq 2 ]]

printf '%s\t%s\n%s\t%s\n%s\t%s\n' \
  "$SIYUAN_API_IMAGE" sha256:api-a \
  "$SIYUAN_WEB_IMAGE" sha256:web-a \
  "$SIYUAN_MIGRATE_IMAGE" sha256:migrate-a > "$state_file"
siyuan_47_capture_release_image_ids true true true
siyuan_47_verify_release_image_ids true true true

# A concurrent writer changing the exact release tag must fail closed.
sed -i.bak "s/sha256:api-a/sha256:api-b/" "$state_file"
if siyuan_47_verify_release_image_ids true true true 2>"$tmp_dir/error"; then
  echo 'image fence accepted a replaced release image' >&2
  exit 1
fi
grep -q 'RELEASE_IMAGE_FENCE_MISMATCH service=api expected=sha256:api-a actual=sha256:api-b' "$tmp_dir/error"

# A second release uses a distinct tag and cannot replace the first release reference.
siyuan_47_export_release_images 'whitelist-OTHER'
[[ "$SIYUAN_API_IMAGE" == 'siyuan-api:whitelist-other' ]]

echo '[release-image-fence] PASS'
