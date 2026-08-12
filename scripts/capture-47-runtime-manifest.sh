#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
OUTPUT_ROOT="${SIYUAN_47_MANIFEST_DIR:-docs/release-manifests/47}"
CAPTURE_FORMAT="${SIYUAN_47_CAPTURE_FORMAT:-3}"
LOCAL_TMP="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-47-runtime-manifest.XXXXXX")"

case "$CAPTURE_FORMAT" in
  2|3) ;;
  *) echo "Unsupported runtime manifest capture format: $CAPTURE_FORMAT" >&2; exit 2 ;;
esac

cleanup() {
  rm -rf -- "$LOCAL_TMP"
}
trap cleanup EXIT INT TERM

archive="$LOCAL_TMP/capture.tar"

ssh -o ConnectTimeout=20 "$REMOTE" bash -s -- "$REMOTE_DIR" "$CAPTURE_FORMAT" > "$archive" <<'REMOTE_SCRIPT'
set -euo pipefail

remote_dir="$1"
capture_format="$2"
cd "$remote_dir"
# shellcheck source=lib/docker-container-image-id.sh
source scripts/lib/docker-container-image-id.sh

capture_tmp="$(mktemp -d /tmp/siyuan-47-runtime-manifest.XXXXXX)"
cleanup_remote() {
  rm -rf -- "$capture_tmp"
}
trap cleanup_remote EXIT INT TERM

sha256_file() {
  sha256sum "$1" | awk '{print $1}'
}

sha256_stream() {
  sha256sum | awk '{print $1}'
}

captured_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
release_id="$(sed -n 's/^RELEASE_ID=//p' .siyuan-release-state 2>/dev/null | tail -1)"
[[ -n "$release_id" ]] || release_id="MISSING"

case "$release_id" in
  *[!A-Za-z0-9._:-]*)
    echo "Remote release ID contains unsupported characters." >&2
    exit 80
    ;;
esac

{
  printf 'CAPTURE_FORMAT_VERSION=%s\n' "$capture_format"
  printf 'CAPTURED_AT=%s\n' "$captured_at"
  printf 'REMOTE_DIR=%s\n' "$remote_dir"
  printf 'REMOTE_RELEASE_ID=%s\n' "$release_id"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf 'SOURCE_GIT_COMMIT=%s\n' "$(git rev-parse HEAD)"
  else
    printf 'SOURCE_GIT_COMMIT=NO_GIT_CHECKOUT\n'
  fi
  if [[ -f .siyuan-release-state ]]; then
    printf 'RELEASE_STATE_SHA256=%s\n' "$(sha256_file .siyuan-release-state)"
  else
    printf 'RELEASE_STATE_SHA256=MISSING\n'
  fi
  if [[ -f .codex-state.md ]]; then
    printf 'CODEX_STATE_SHA256=%s\n' "$(sha256_file .codex-state.md)"
  else
    printf 'CODEX_STATE_SHA256=MISSING\n'
  fi
} > "$capture_tmp/metadata.env"

if [[ -f .siyuan-release-state ]]; then
  sed -n '/^\(WEB_FINGERPRINT\|API_FINGERPRINT\|MIGRATE_FINGERPRINT\|RELEASE_ID\|RELEASED_AT\|SOURCE_MODE\|GIT_COMMIT\|GIT_BRANCH\|WEB_IMAGE_ID\|API_IMAGE_ID\|RELEASE_RECEIPT_PATH\|RELEASE_RECEIPT_SHA256\)=/p' \
    .siyuan-release-state > "$capture_tmp/release-state.env"
else
  : > "$capture_tmp/release-state.env"
fi

{
  find apps/api apps/web packages/shared deploy \
    \( -type d \( -name node_modules -o -name dist -o -name coverage -o -name .vite -o -name uploads \) -prune \) -o \
    \( -type f \
      ! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.spec.ts' ! -name '*.spec.tsx' \
      ! -name '*.orig' ! -name '*.tsbuildinfo' ! -name '*.log' ! -name '._*' ! -name '.DS_Store' \
      ! -path '*/__tests__/*' \
      -print \) 2>/dev/null

  for file_path in \
    package.json package-lock.json tsconfig.base.json \
    Dockerfile.api Dockerfile.web docker-compose.yml .dockerignore; do
    [[ -f "$file_path" ]] && printf '%s\n' "$file_path"
  done
} | LC_ALL=C sort -u | while IFS= read -r file_path; do
  printf '%s\t%s\t%s\n' "$file_path" "$(stat -c '%s' "$file_path")" "$(sha256_file "$file_path")"
done > "$capture_tmp/source-files.tsv"

source_tree_sha="$(sha256_file "$capture_tmp/source-files.tsv")"
printf 'SOURCE_FILE_COUNT=%s\n' "$(wc -l < "$capture_tmp/source-files.tsv" | tr -d ' ')" >> "$capture_tmp/metadata.env"
printf 'SOURCE_TREE_MANIFEST_SHA256=%s\n' "$source_tree_sha" >> "$capture_tmp/metadata.env"

{
  find apps/api/prisma/migrations -type f -name migration.sql -print 2>/dev/null || true
  [[ -f apps/api/prisma/schema.prisma ]] && printf '%s\n' apps/api/prisma/schema.prisma
  [[ -f apps/api/prisma/migrations/migration_lock.toml ]] && printf '%s\n' apps/api/prisma/migrations/migration_lock.toml
} | LC_ALL=C sort -u | while IFS= read -r file_path; do
  printf '%s\t%s\n' "$file_path" "$(sha256_file "$file_path")"
done > "$capture_tmp/prisma-files.tsv"

container_ids="$(docker compose ps -aq 2>/dev/null || true)"
if [[ "$capture_format" == "2" ]]; then
  if [[ -n "$container_ids" ]]; then
    while IFS= read -r container_id; do
      [[ -n "$container_id" ]] || continue
      docker inspect --format '{{.Name}}{{"\t"}}{{index .Config.Labels "com.docker.compose.service"}}{{"\t"}}{{.Config.Image}}{{"\t"}}{{.Image}}{{"\t"}}{{.Created}}{{"\t"}}{{.State.Status}}{{"\t"}}{{.State.StartedAt}}' "$container_id"
    done <<< "$container_ids" | LC_ALL=C sort
  fi > "$capture_tmp/containers.tsv"
  if [[ -s "$capture_tmp/containers.tsv" ]]; then
    cut -f4 "$capture_tmp/containers.tsv" | LC_ALL=C sort -u | while IFS= read -r image_id; do
      [[ -n "$image_id" ]] || continue
      docker image inspect --format '{{.Id}}{{"\t"}}{{.Created}}{{"\t"}}{{json .RepoTags}}{{"\t"}}{{json .RepoDigests}}' "$image_id"
    done | LC_ALL=C sort > "$capture_tmp/images.tsv"
  else
    : > "$capture_tmp/images.tsv"
  fi
else
  if [[ -n "$container_ids" ]]; then
    while IFS= read -r container_id; do
      [[ -n "$container_id" ]] || continue
      runtime_image_id="$(siyuan_docker_container_image_id "$container_id")"
      [[ -n "$runtime_image_id" ]] || {
        echo "Could not resolve runtime image identity for container $container_id." >&2
        exit 81
      }
      docker inspect --format '{{.Name}}{{"\t"}}{{index .Config.Labels "com.docker.compose.service"}}{{"\t"}}{{.Config.Image}}{{"\t"}}' "$container_id" \
        | tr -d '\n'
      printf '%s\t' "$runtime_image_id"
      docker inspect --format '{{.Created}}{{"\t"}}{{.State.Status}}{{"\t"}}{{.State.StartedAt}}' "$container_id"
    done <<< "$container_ids" | LC_ALL=C sort
  fi > "$capture_tmp/containers.tsv"
  if [[ -n "$container_ids" ]]; then
    while IFS= read -r container_id; do
      [[ -n "$container_id" ]] || continue
      runtime_image_id="$(siyuan_docker_container_image_id "$container_id")"
      [[ -n "$runtime_image_id" ]] || continue
      printf '%s\t' "$runtime_image_id"
      docker inspect --format '{{.Image}}{{"\t"}}{{.Created}}{{"\t"}}{{.Config.Image}}{{"\t"}}{{json .ImageManifestDescriptor}}' "$container_id"
    done <<< "$container_ids" | LC_ALL=C sort -u > "$capture_tmp/images.tsv"
  else
    : > "$capture_tmp/images.tsv"
  fi
fi

{
  for service in api web; do
    container_id="$(docker compose ps -q "$service" 2>/dev/null | tail -1)"
    [[ -n "$container_id" ]] || continue
    for file_path in \
      /app/node_modules/.prisma/client/schema.prisma \
      /app/packages/shared/dist/index.js \
      /app/packages/shared/dist/index.d.ts \
      /usr/share/nginx/html/index.html; do
      file_hash="$(docker exec "$container_id" sha256sum "$file_path" 2>/dev/null | awk '{print $1}' || true)"
      [[ -n "$file_hash" ]] && printf '%s\t%s\t%s\n' "$service" "$file_path" "$file_hash"
    done
  done
} | LC_ALL=C sort > "$capture_tmp/runtime-artifacts.tsv"

staging_dirs=0
staging_files=0
staging_bytes=0
if [[ -d .codex-release-staging ]]; then
  staging_dirs="$(find .codex-release-staging -type d | wc -l | tr -d ' ')"
  staging_files="$(find .codex-release-staging -type f | wc -l | tr -d ' ')"
  staging_bytes="$(du -sk .codex-release-staging | awk '{print $1 * 1024}')"
fi
{
  printf 'CODEX_RELEASE_STAGING_DIRS=%s\n' "$staging_dirs"
  printf 'CODEX_RELEASE_STAGING_FILES=%s\n' "$staging_files"
  printf 'CODEX_RELEASE_STAGING_BYTES=%s\n' "$staging_bytes"
} > "$capture_tmp/preserved-artifacts.env"

for file_path in metadata.env release-state.env source-files.tsv prisma-files.tsv containers.tsv images.tsv runtime-artifacts.tsv preserved-artifacts.env; do
  printf '%s\t%s\n' "$file_path" "$(sha256_file "$capture_tmp/$file_path")"
done | LC_ALL=C sort > "$capture_tmp/bundle.sha256"

tar -C "$capture_tmp" -cf - \
  metadata.env release-state.env source-files.tsv prisma-files.tsv \
  containers.tsv images.tsv runtime-artifacts.tsv preserved-artifacts.env bundle.sha256
REMOTE_SCRIPT

mkdir -p "$LOCAL_TMP/unpacked"
tar -C "$LOCAL_TMP/unpacked" -xf "$archive"

captured_at="$(sed -n 's/^CAPTURED_AT=//p' "$LOCAL_TMP/unpacked/metadata.env")"
release_id="$(sed -n 's/^REMOTE_RELEASE_ID=//p' "$LOCAL_TMP/unpacked/metadata.env")"
capture_stamp="$(printf '%s' "$captured_at" | tr -d ':-' | sed 's/T/-/; s/Z$//')"
safe_release_id="$(printf '%s' "$release_id" | tr ':/' '__')"
destination="$OUTPUT_ROOT/${capture_stamp}-${safe_release_id}"

if [[ -e "$destination" ]]; then
  echo "Manifest destination already exists: $destination" >&2
  exit 73
fi

mkdir -p "$OUTPUT_ROOT"
mv "$LOCAL_TMP/unpacked" "$destination"
chmod a-w "$destination"/*

printf 'CAPTURED_47_MANIFEST=%s\n' "$destination"
printf 'REMOTE_RELEASE_ID=%s\n' "$release_id"
printf 'SOURCE_TREE_MANIFEST_SHA256=%s\n' \
  "$(sed -n 's/^SOURCE_TREE_MANIFEST_SHA256=//p' "$destination/metadata.env")"
