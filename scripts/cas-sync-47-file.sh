#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"

SOURCE_FILE=""
TARGET_FILE=""
EXPECTED_SHA=""
PREFLIGHT_ONLY=false

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --source) SOURCE_FILE="${2:-}"; shift 2 ;;
    --target) TARGET_FILE="${2:-}"; shift 2 ;;
    --expected-sha) EXPECTED_SHA="${2:-}"; shift 2 ;;
    --preflight-only) PREFLIGHT_ONLY=true; shift ;;
    *) echo "Usage: npm run sync:47:file -- --source <candidate> --target <repo-relative-path> --expected-sha <sha256|MISSING> [--preflight-only]" >&2; exit 2 ;;
  esac
done

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Candidate source file does not exist: $SOURCE_FILE" >&2
  exit 2
fi
case "$TARGET_FILE" in
  apps/web/*|apps/api/*|packages/shared/*|deploy/*|scripts/*|docs/*|package.json|package-lock.json|tsconfig.base.json|Dockerfile.api|Dockerfile.web|docker-compose.yml|.dockerignore|AGENTS.md|.codex-state.md|CONTEXT-MAP.md) ;;
  *) echo "Target is not an allowed runtime path: $TARGET_FILE" >&2; exit 2 ;;
esac
if [[ "$TARGET_FILE" = /* || "$TARGET_FILE" == *".."* ]]; then
  echo "Target must be a safe repository-relative path: $TARGET_FILE" >&2
  exit 2
fi
if [[ ! "$TARGET_FILE" =~ ^[A-Za-z0-9._/-]+$ || "$TARGET_FILE" == *"//"* ]]; then
  echo "Target contains unsupported path characters: $TARGET_FILE" >&2
  exit 2
fi
if [[ "$EXPECTED_SHA" != "MISSING" && ! "$EXPECTED_SHA" =~ ^[0-9a-f]{64}$ ]]; then
  echo "Expected SHA must be a lowercase SHA-256 value or MISSING." >&2
  exit 2
fi

siyuan_47_verify_release_lock

CANDIDATE_SHA="$(shasum -a 256 "$SOURCE_FILE" | awk '{print $1}')"
STAGING_ROOT="${SIYUAN_47_DIR}/.codex-release-staging/${SIYUAN_47_RELEASE_LOCK_TOKEN}"
STAGING_FILE="${STAGING_ROOT}/${TARGET_FILE}"

ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
  "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" "$SIYUAN_47_DIR" "$TARGET_FILE" "$EXPECTED_SHA" "$STAGING_FILE" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"
expected_token="$2"
remote_dir="$3"
target_file="$4"
expected_sha="$5"
staging_file="$6"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
if [ "$actual_token" != "$expected_token" ]; then
  echo "47 release lock ownership changed before CAS upload." >&2
  exit 75
fi
target_path="${remote_dir}/${target_file}"
release_root="$(readlink -f -- "$remote_dir")"
if [ ! -d "$release_root" ] || [ -L "$target_path" ] || { [ -e "$target_path" ] && [ ! -f "$target_path" ]; }; then
  echo "CAS target must resolve to a regular file inside the release root: $target_file" >&2
  exit 64
fi
probe="$(dirname "$target_path")"
while [ ! -e "$probe" ]; do probe="$(dirname "$probe")"; done
probe_real="$(readlink -f -- "$probe")"
case "$probe_real" in "$release_root"|"$release_root"/*) ;; *) echo "CAS target parent escapes the release root: $target_file" >&2; exit 64 ;; esac
if [ -L "$remote_dir/.codex-release-staging" ]; then
  echo "CAS staging root must not be a symlink." >&2
  exit 64
fi
if [ -f "$target_path" ]; then
  current_sha="$(sha256sum "$target_path" | awk '{print $1}')"
else
  current_sha="MISSING"
fi
if [ "$current_sha" != "$expected_sha" ]; then
  echo "REMOTE_CHECKSUM_MISMATCH target=$target_file expected=$expected_sha actual=$current_sha" >&2
  exit 76
fi
mkdir -p "$(dirname "$staging_file")"
REMOTE_SCRIPT

if [[ "$PREFLIGHT_ONLY" == true ]]; then
  echo "REMOTE_CHECKSUM_PREFLIGHT_OK target=$TARGET_FILE expected=$EXPECTED_SHA"
  exit 0
fi

scp -q "$SOURCE_FILE" "${SIYUAN_47_REMOTE}:${STAGING_FILE}"

ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
  "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" "$SIYUAN_47_DIR" "$TARGET_FILE" "$EXPECTED_SHA" "$CANDIDATE_SHA" "$STAGING_FILE" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"
expected_token="$2"
remote_dir="$3"
target_file="$4"
expected_sha="$5"
candidate_sha="$6"
staging_file="$7"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
if [ "$actual_token" != "$expected_token" ]; then
  echo "47 release lock ownership changed during CAS upload." >&2
  exit 75
fi
target_path="${remote_dir}/${target_file}"
release_root="$(readlink -f -- "$remote_dir")"
if [ ! -d "$release_root" ] || [ -L "$target_path" ] || { [ -e "$target_path" ] && [ ! -f "$target_path" ]; }; then
  echo "CAS target must resolve to a regular file inside the release root: $target_file" >&2
  exit 64
fi
probe="$(dirname "$target_path")"
while [ ! -e "$probe" ]; do probe="$(dirname "$probe")"; done
probe_real="$(readlink -f -- "$probe")"
case "$probe_real" in "$release_root"|"$release_root"/*) ;; *) echo "CAS target parent escapes the release root: $target_file" >&2; exit 64 ;; esac
if [ -f "$target_path" ]; then
  current_sha="$(sha256sum "$target_path" | awk '{print $1}')"
else
  current_sha="MISSING"
fi
if [ "$current_sha" != "$expected_sha" ]; then
  echo "REMOTE_CHECKSUM_MISMATCH target=$target_file expected=$expected_sha actual=$current_sha" >&2
  exit 76
fi
staged_sha="$(sha256sum "$staging_file" | awk '{print $1}')"
if [ "$staged_sha" != "$candidate_sha" ]; then
  echo "Staged candidate checksum mismatch for $target_file." >&2
  exit 77
fi
backup_dir="${remote_dir}/.release-backups/cas-$(date +%Y%m%d-%H%M%S)-${expected_token%${expected_token#????????????}}"
if [ -f "$target_path" ]; then
  mkdir -p "$backup_dir/$(dirname "$target_file")"
  cp "$target_path" "$backup_dir/$target_file"
fi
mkdir -p "$(dirname "$target_path")"
target_parent_real="$(readlink -f -- "$(dirname "$target_path")")"
case "$target_parent_real" in "$release_root"|"$release_root"/*) ;; *) echo "Created CAS target parent escapes the release root: $target_file" >&2; exit 64 ;; esac
mv -T "$staging_file" "$target_path"
final_sha="$(sha256sum "$target_path" | awk '{print $1}')"
if [ "$final_sha" != "$candidate_sha" ]; then
  echo "Final checksum mismatch for $target_file." >&2
  if [ "$expected_sha" = "MISSING" ]; then
    rm -f -- "$target_path"
  else
    cp "$backup_dir/$target_file" "$target_path"
  fi
  exit 77
fi
echo "REMOTE_BEFORE_SHA=$current_sha"
echo "REMOTE_AFTER_SHA=$final_sha"
echo "BACKUP_DIR=$backup_dir"
REMOTE_SCRIPT
