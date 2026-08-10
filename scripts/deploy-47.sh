#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
PUBLIC_URL="${SIYUAN_47_PUBLIC_URL:-http://47.120.33.111:8899}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"
MODE="apply"
FORCE_FULL=false
PRINT_FINGERPRINTS=false
LOCK_STATUS=false
EXPECTED_RELEASE_ID=""
BOOTSTRAP_MANIFEST_DIR=""
CONFIRM_BOOTSTRAP=false
BOOTSTRAP_MODE=false
BOOTSTRAP_RUNTIME_TMP=""
BOOTSTRAP_MIGRATION_EXCEPTION_FILE="config/release/47-legacy-migration-checksums.tsv"
APPROVED_BOOTSTRAP_MANIFEST_DIR="docs/release-manifests/47/20260810-042420-runtime-stage-view-20260810020229"
APPROVED_BOOTSTRAP_BUNDLE_SHA256="fb419d6d56e6ec807ebbb136a7ad8daa7791b9c94e8deb5eee192629cd0da4e4"
APPROVED_BOOTSTRAP_MIGRATION_EXCEPTIONS_SHA256="13e4dcb6aabeef0ba3585de72c105f4b7bb48c24d1159b3579e403aea2746a84"
REMOTE_MUTATION_STARTED=false
FAILURE_PHASE="standard-deploy"

sha256_file_early() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

verify_bootstrap_bundle() {
  local manifest_dir="$1"
  local expected_names actual_names entry_name entry_hash entry_extra computed_hash
  expected_names="$(printf '%s\n' containers.tsv images.tsv metadata.env preserved-artifacts.env prisma-files.tsv release-state.env runtime-artifacts.tsv source-files.tsv | LC_ALL=C sort)"
  actual_names=""
  while IFS=$'\t' read -r entry_name entry_hash entry_extra; do
    if [[ -z "$entry_name" || -z "$entry_hash" || -n "$entry_extra" || ! "$entry_hash" =~ ^[0-9a-f]{64}$ ]]; then
      echo "Bootstrap manifest bundle has an invalid TSV row." >&2
      return 1
    fi
    case "$entry_name" in
      containers.tsv|images.tsv|metadata.env|preserved-artifacts.env|prisma-files.tsv|release-state.env|runtime-artifacts.tsv|source-files.tsv) ;;
      *) echo "Bootstrap manifest bundle contains an unexpected path: $entry_name" >&2; return 1 ;;
    esac
    [[ -f "$manifest_dir/$entry_name" && ! -L "$manifest_dir/$entry_name" ]] || {
      echo "Bootstrap manifest bundle entry is not a regular file: $entry_name" >&2
      return 1
    }
    if command -v shasum >/dev/null 2>&1; then
      computed_hash="$(shasum -a 256 "$manifest_dir/$entry_name" | awk '{print $1}')"
    else
      computed_hash="$(sha256sum "$manifest_dir/$entry_name" | awk '{print $1}')"
    fi
    [[ "$computed_hash" == "$entry_hash" ]] || {
      echo "Bootstrap manifest bundle checksum mismatch: $entry_name" >&2
      return 1
    }
    actual_names+="${actual_names:+$'\n'}$entry_name"
  done < "$manifest_dir/bundle.sha256"
  if [[ "$(printf '%s\n' "$actual_names" | LC_ALL=C sort)" != "$expected_names" ]]; then
    echo "Bootstrap manifest bundle must contain each required entry exactly once." >&2
    return 1
  fi
}

validate_migration_manifest() {
  local manifest="$1"
  local migration_name migration_hash migration_extra count=0 unique_count
  while IFS='|' read -r migration_name migration_hash migration_extra; do
    if [[ -z "$migration_name" || -z "$migration_hash" || -n "$migration_extra"
      || ! "$migration_name" =~ ^[0-9]{14}_[a-z0-9_]+$
      || ! "$migration_hash" =~ ^[0-9a-f]{64}$ ]]; then
      echo "Migration manifest contains an invalid row." >&2
      return 1
    fi
    count=$((count + 1))
  done <<< "$manifest"
  unique_count="$(printf '%s\n' "$manifest" | cut -d'|' -f1 | LC_ALL=C sort -u | wc -l | tr -d ' ')"
  if [[ "$count" -eq 0 || "$unique_count" != "$count" ]]; then
    echo "Migration manifest is empty or contains duplicate names." >&2
    return 1
  fi
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dry-run) MODE="dry-run" ;;
    --full) FORCE_FULL=true ;;
    --print-fingerprints) PRINT_FINGERPRINTS=true ;;
    --lock-status) LOCK_STATUS=true ;;
    --expected-release-id)
      EXPECTED_RELEASE_ID="${2:-}"
      shift
      ;;
    --bootstrap-manifest)
      BOOTSTRAP_MANIFEST_DIR="${2:-}"
      shift
      ;;
    --confirm-bootstrap) CONFIRM_BOOTSTRAP=true ;;
    *) echo "Usage: npm run deploy:47 -- [--dry-run] [--full] [--lock-status] [--expected-release-id <id>] [--bootstrap-manifest <dir> --confirm-bootstrap]"; exit 2 ;;
  esac
  shift
done

if [[ -n "$EXPECTED_RELEASE_ID" && ! "$EXPECTED_RELEASE_ID" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "Expected release ID contains unsupported characters." >&2
  exit 2
fi
if [[ -n "$BOOTSTRAP_MANIFEST_DIR" || "$CONFIRM_BOOTSTRAP" == true ]]; then
  if [[ -z "$BOOTSTRAP_MANIFEST_DIR" || "$CONFIRM_BOOTSTRAP" != true ]]; then
    echo "Bootstrap requires both --bootstrap-manifest <dir> and --confirm-bootstrap." >&2
    exit 2
  fi
  case "$BOOTSTRAP_MANIFEST_DIR" in
    docs/release-manifests/47/*) ;;
    *) echo "Bootstrap manifest must be a repository-relative docs/release-manifests/47 directory." >&2; exit 2 ;;
  esac
  if [[ "$BOOTSTRAP_MANIFEST_DIR" == *".."* || ! -d "$BOOTSTRAP_MANIFEST_DIR" ]]; then
    echo "Bootstrap manifest path is invalid: $BOOTSTRAP_MANIFEST_DIR" >&2
    exit 2
  fi
  if [[ "$BOOTSTRAP_MANIFEST_DIR" != "$APPROVED_BOOTSTRAP_MANIFEST_DIR" ]]; then
    echo "Bootstrap is pinned to the reviewed v2 manifest: $APPROVED_BOOTSTRAP_MANIFEST_DIR" >&2
    exit 80
  fi
  BOOTSTRAP_MODE=true
fi
if [[ "$MODE" == "apply" && "$LOCK_STATUS" == false && "$PRINT_FINGERPRINTS" == false && -z "$EXPECTED_RELEASE_ID" ]]; then
  echo "deploy:47 apply requires the baseline captured when this candidate started." >&2
  echo "Run npm run release:47:baseline at task start, then pass --expected-release-id <id>." >&2
  exit 2
fi

if [[ "$MODE" == "apply" && "$LOCK_STATUS" == false && "$PRINT_FINGERPRINTS" == false ]]; then
  if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
    echo "deploy:47 apply requires a completely clean release-coordinator worktree." >&2
    exit 3
  fi
  if [[ "$BOOTSTRAP_MODE" == true ]]; then
    for manifest_file in bundle.sha256 metadata.env release-state.env source-files.tsv prisma-files.tsv containers.tsv images.tsv runtime-artifacts.tsv; do
      if [[ ! -f "$BOOTSTRAP_MANIFEST_DIR/$manifest_file" || -L "$BOOTSTRAP_MANIFEST_DIR/$manifest_file" ]] \
        || ! git ls-files --error-unmatch "$BOOTSTRAP_MANIFEST_DIR/$manifest_file" >/dev/null 2>&1; then
        echo "Bootstrap manifest must be complete and committed: $BOOTSTRAP_MANIFEST_DIR/$manifest_file" >&2
        exit 80
      fi
    done
    if [[ ! -f "$BOOTSTRAP_MIGRATION_EXCEPTION_FILE" ]] || ! git ls-files --error-unmatch "$BOOTSTRAP_MIGRATION_EXCEPTION_FILE" >/dev/null 2>&1; then
      echo "Bootstrap migration checksum exceptions must be committed." >&2
      exit 80
    fi
    if ! verify_bootstrap_bundle "$BOOTSTRAP_MANIFEST_DIR"; then
      echo "Bootstrap manifest bundle checksum validation failed." >&2
      exit 80
    fi
    manifest_release_id="$(sed -n 's/^REMOTE_RELEASE_ID=//p' "$BOOTSTRAP_MANIFEST_DIR/metadata.env")"
    manifest_source_mode="$(sed -n 's/^SOURCE_GIT_COMMIT=//p' "$BOOTSTRAP_MANIFEST_DIR/metadata.env")"
    manifest_format_version="$(sed -n 's/^CAPTURE_FORMAT_VERSION=//p' "$BOOTSTRAP_MANIFEST_DIR/metadata.env")"
    manifest_bundle_hash="$(sha256_file_early "$BOOTSTRAP_MANIFEST_DIR/bundle.sha256")"
    bootstrap_capture_commit="$(git log -n 1 --format=%H -- "$BOOTSTRAP_MANIFEST_DIR/metadata.env")"
    if [[ "$manifest_release_id" != "$EXPECTED_RELEASE_ID"
      || "$manifest_source_mode" != "NO_GIT_CHECKOUT"
      || "$manifest_format_version" != "2"
      || "$manifest_bundle_hash" != "$APPROVED_BOOTSTRAP_BUNDLE_SHA256" ]]; then
      echo "Bootstrap manifest does not describe the expected legacy release." >&2
      exit 80
    fi
    if ! [[ "$bootstrap_capture_commit" =~ ^[0-9a-f]{40}$ ]] || ! git merge-base --is-ancestor "$bootstrap_capture_commit" HEAD; then
      echo "Bootstrap candidate must descend from the committed frozen manifest." >&2
      exit 80
    fi
    if git diff --name-only "$bootstrap_capture_commit"..HEAD | grep -Fxq 'docker-compose.yml'; then
      echo "docker-compose.yml requires a separately reviewed full/infra release path." >&2
      exit 82
    fi
  else
    baseline_file="$(git rev-parse --git-path siyuan-release-baselines)/$EXPECTED_RELEASE_ID"
    if [[ ! -f "$baseline_file" ]]; then
      echo "No baseline receipt exists for $EXPECTED_RELEASE_ID; capture it from this release worktree first." >&2
      exit 80
    fi
    receipt_release_id="$(sed -n 's/^REMOTE_RELEASE_ID=//p' "$baseline_file")"
    receipt_worktree="$(sed -n 's/^WORKTREE_ROOT=//p' "$baseline_file")"
    receipt_branch="$(sed -n 's/^BRANCH=//p' "$baseline_file")"
    receipt_commit="$(sed -n 's/^BASE_COMMIT=//p' "$baseline_file")"
    current_worktree="$(git rev-parse --show-toplevel)"
    current_branch="$(git branch --show-current)"
    if [[ "$receipt_release_id" != "$EXPECTED_RELEASE_ID" || "$receipt_worktree" != "$current_worktree" || "$receipt_branch" != "$current_branch" ]]; then
      echo "Release baseline receipt does not belong to this worktree/branch." >&2
      exit 80
    fi
    if ! [[ "$receipt_commit" =~ ^[0-9a-f]{40}$ ]] || ! git merge-base --is-ancestor "$receipt_commit" HEAD; then
      echo "Current candidate is not descended from its captured 47 baseline commit." >&2
      exit 80
    fi
    if git diff --name-only "$receipt_commit"..HEAD | grep -Fxq 'docker-compose.yml'; then
      echo "docker-compose.yml requires a separately reviewed full/infra release path." >&2
      exit 82
    fi
  fi
fi

if [[ "$LOCK_STATUS" == true ]]; then
  siyuan_47_release_lock_status
  exit 0
fi

is_test_file() {
  case "$1" in
    *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*/__tests__/*) return 0 ;;
    *) return 1 ;;
  esac
}

runtime_files() {
  find apps/api apps/web packages/shared deploy -type f 2>/dev/null
  for path in package.json package-lock.json tsconfig.base.json Dockerfile.api Dockerfile.web docker-compose.yml .dockerignore; do
    [[ -f "$path" ]] && printf '%s\n' "$path"
  done
}

matches_scope() {
  local scope="$1" path="$2"
  is_test_file "$path" && return 1
  case "$scope:$path" in
    migrate:apps/api/prisma/schema.prisma|migrate:apps/api/prisma/migrations/*) return 0 ;;
    web:apps/web/*|web:packages/shared/*|web:package.json|web:package-lock.json|web:tsconfig.base.json|web:Dockerfile.web|web:docker-compose.yml|web:deploy/nginx.conf|web:.dockerignore) return 0 ;;
    api:apps/api/*|api:packages/shared/*|api:package.json|api:package-lock.json|api:tsconfig.base.json|api:Dockerfile.api|api:docker-compose.yml|api:.dockerignore) return 0 ;;
    *) return 1 ;;
  esac
}

dirty_runtime_files() {
  {
    git diff --name-only HEAD
    git ls-files --others --exclude-standard
  } | LC_ALL=C sort -u | while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    is_test_file "$path" && continue
    if matches_scope web "$path" || matches_scope api "$path" || matches_scope migrate "$path"; then
      printf '%s\n' "$path"
    fi
  done
}

fingerprint() {
  local scope="$1"
  while IFS= read -r path; do
    [[ -f "$path" ]] || continue
    case "$path" in
      */node_modules/*|*/dist/*|apps/api/uploads/*|*/.DS_Store|*.tsbuildinfo|*.log) continue ;;
    esac
    if matches_scope "$scope" "$path"; then
      printf '%s  %s\n' "$(sha256_file "$path")" "$path"
    fi
  done < <(runtime_files | LC_ALL=C sort -u)
}

scope_hash() {
  if command -v shasum >/dev/null 2>&1; then
    fingerprint "$1" | shasum -a 256 | awk '{print $1}'
  else
    fingerprint "$1" | sha256sum | awk '{print $1}'
  fi
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

WEB_FINGERPRINT="$(scope_hash web)"
API_FINGERPRINT="$(scope_hash api)"
MIGRATE_FINGERPRINT="$(scope_hash migrate)"
GIT_COMMIT="$(git rev-parse HEAD)"
GIT_BRANCH="$(git branch --show-current)"
RELEASED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RELEASE_ID="git-${GIT_COMMIT:0:12}_web-${WEB_FINGERPRINT:0:12}_api-${API_FINGERPRINT:0:12}"
if [[ "$MODE" == "apply" && "$LOCK_STATUS" == false && "$PRINT_FINGERPRINTS" == false && ( ! "$GIT_COMMIT" =~ ^[0-9a-f]{40}$ || -z "$GIT_BRANCH" ) ]]; then
  echo "deploy:47 apply requires an attached Git branch and a full source commit." >&2
  exit 85
fi
if [[ "$MODE" == "apply" && "$LOCK_STATUS" == false && "$PRINT_FINGERPRINTS" == false ]]; then
  remote_branch_commit="$(git ls-remote --heads origin "refs/heads/$GIT_BRANCH" | awk 'NR == 1 {print $1}')"
  if [[ "$remote_branch_commit" != "$GIT_COMMIT" ]]; then
    echo "deploy:47 apply requires HEAD to match the durable origin branch exactly." >&2
    exit 86
  fi
fi

if [[ "$PRINT_FINGERPRINTS" == true ]]; then
  printf 'WEB_FINGERPRINT=%s\nAPI_FINGERPRINT=%s\nMIGRATE_FINGERPRINT=%s\nRELEASE_ID=%s\n' \
    "$WEB_FINGERPRINT" "$API_FINGERPRINT" "$MIGRATE_FINGERPRINT" "$RELEASE_ID"
  exit 0
fi

cleanup_release_lock() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [[ -n "$BOOTSTRAP_RUNTIME_TMP" && -d "$BOOTSTRAP_RUNTIME_TMP" ]]; then
    rm -rf -- "$BOOTSTRAP_RUNTIME_TMP"
  fi
  if [[ "$exit_code" -ne 0 && "$REMOTE_MUTATION_STARTED" == true ]]; then
    if ! siyuan_47_mark_release_recovery_required "$FAILURE_PHASE"; then
      echo "Failed to write recovery marker; preserving the release lock to fail closed." >&2
      exit "$exit_code"
    fi
  fi
  set +e
  siyuan_47_release_release_lock
  local unlock_exit=$?
  set -e
  if [[ "$unlock_exit" -ne 0 ]]; then
    echo "Failed to release the 47 lock; ownership details remain on the server." >&2
    [[ "$exit_code" -ne 0 ]] || exit_code="$unlock_exit"
  fi
  exit "$exit_code"
}

if [[ "$MODE" == "apply" ]]; then
  siyuan_47_acquire_release_lock
  trap cleanup_release_lock EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  if [[ "$BOOTSTRAP_MODE" == true ]]; then
    if [[ -n "$(git status --porcelain --untracked-files=all)"
      || "$(git rev-parse HEAD)" != "$GIT_COMMIT"
      || "$(git branch --show-current)" != "$GIT_BRANCH"
      || "$(git ls-remote --heads origin "refs/heads/$GIT_BRANCH" | awk 'NR == 1 {print $1}')" != "$GIT_COMMIT" ]]; then
      echo "Bootstrap candidate changed while waiting for the 47 release lock." >&2
      exit 86
    fi
    BOOTSTRAP_RUNTIME_TMP="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-47-bootstrap-verify.XXXXXX")"
    bootstrap_frozen_dir="$BOOTSTRAP_RUNTIME_TMP/frozen"
    mkdir -p "$bootstrap_frozen_dir"
    for manifest_file in bundle.sha256 containers.tsv images.tsv metadata.env preserved-artifacts.env prisma-files.tsv release-state.env runtime-artifacts.tsv source-files.tsv; do
      git show "$GIT_COMMIT:$APPROVED_BOOTSTRAP_MANIFEST_DIR/$manifest_file" > "$bootstrap_frozen_dir/$manifest_file"
    done
    git show "$GIT_COMMIT:$BOOTSTRAP_MIGRATION_EXCEPTION_FILE" > "$BOOTSTRAP_RUNTIME_TMP/migration-exceptions.tsv"
    chmod -R u=rX,go= "$bootstrap_frozen_dir"
    chmod u=r,go= "$BOOTSTRAP_RUNTIME_TMP/migration-exceptions.tsv"
    BOOTSTRAP_MANIFEST_DIR="$bootstrap_frozen_dir"
    BOOTSTRAP_MIGRATION_EXCEPTION_FILE="$BOOTSTRAP_RUNTIME_TMP/migration-exceptions.tsv"
    if ! verify_bootstrap_bundle "$BOOTSTRAP_MANIFEST_DIR" \
      || [[ "$(sha256_file "$BOOTSTRAP_MANIFEST_DIR/bundle.sha256")" != "$APPROVED_BOOTSTRAP_BUNDLE_SHA256" ]] \
      || [[ "$(sed -n 's/^CAPTURE_FORMAT_VERSION=//p' "$BOOTSTRAP_MANIFEST_DIR/metadata.env")" != "2" ]] \
      || [[ "$(sha256_file "$BOOTSTRAP_MIGRATION_EXCEPTION_FILE")" != "$APPROVED_BOOTSTRAP_MIGRATION_EXCEPTIONS_SHA256" ]]; then
      echo "Committed bootstrap inputs failed lock-time verification." >&2
      exit 80
    fi
    bootstrap_exception_count="$(sed '/^#/d; /^$/d' "$BOOTSTRAP_MIGRATION_EXCEPTION_FILE" | wc -l | tr -d ' ')"
    if [[ "$bootstrap_exception_count" != "3" ]] \
      || sed '/^#/d; /^$/d' "$BOOTSTRAP_MIGRATION_EXCEPTION_FILE" | grep -Evq '^[0-9]{14}_[a-z0-9_]+\|[0-9a-f]{64}\|[0-9a-f]{64}$' \
      || [[ "$(sed '/^#/d; /^$/d' "$BOOTSTRAP_MIGRATION_EXCEPTION_FILE" | LC_ALL=C sort -u | wc -l | tr -d ' ')" != "3" ]]; then
      echo "Committed bootstrap migration exceptions are invalid." >&2
      exit 80
    fi
  fi
fi

REMOTE_STATE="$(ssh -o ConnectTimeout=20 "$REMOTE" "cat '$REMOTE_DIR/.siyuan-release-state' 2>/dev/null || true")"

state_value() {
  printf '%s\n' "$REMOTE_STATE" | sed -n "s/^$1=//p" | tail -1
}

REMOTE_WEB="$(state_value WEB_FINGERPRINT)"
REMOTE_API="$(state_value API_FINGERPRINT)"
REMOTE_MIGRATE="$(state_value MIGRATE_FINGERPRINT)"
REMOTE_RELEASE_ID="$(state_value RELEASE_ID)"
[[ -n "$REMOTE_RELEASE_ID" ]] || REMOTE_RELEASE_ID="MISSING"

if [[ "$MODE" == "apply" ]]; then
  if [[ "$BOOTSTRAP_MODE" == true ]]; then
    bootstrap_audit="$(bash "$SCRIPT_DIR/audit-47-runtime-provenance.sh")"
    printf '%s\n' "$bootstrap_audit"
    bootstrap_status="$(printf '%s\n' "$bootstrap_audit" | sed -n 's/^RUNTIME_PROVENANCE_STATUS=//p')"
    if [[ "$bootstrap_status" != "legacy-untraceable" ]]; then
      echo "Bootstrap is only allowed for the explicitly frozen legacy-untraceable runtime." >&2
      exit 84
    fi

    bootstrap_capture_output="$(SIYUAN_47_MANIFEST_DIR="$BOOTSTRAP_RUNTIME_TMP/current" bash "$SCRIPT_DIR/capture-47-runtime-manifest.sh")"
    bootstrap_current_manifest="$(printf '%s\n' "$bootstrap_capture_output" | sed -n 's/^CAPTURED_47_MANIFEST=//p')"
    [[ -n "$bootstrap_current_manifest" && -d "$bootstrap_current_manifest" ]] || { echo "Bootstrap verification capture failed." >&2; exit 80; }
    for manifest_file in release-state.env source-files.tsv prisma-files.tsv containers.tsv images.tsv runtime-artifacts.tsv; do
      if ! cmp -s "$BOOTSTRAP_MANIFEST_DIR/$manifest_file" "$bootstrap_current_manifest/$manifest_file"; then
        echo "BOOTSTRAP_REMOTE_BASELINE_DRIFT file=$manifest_file" >&2
        exit 76
      fi
    done
    for metadata_key in REMOTE_RELEASE_ID RELEASE_STATE_SHA256 SOURCE_TREE_MANIFEST_SHA256; do
      expected_metadata="$(sed -n "s/^$metadata_key=//p" "$BOOTSTRAP_MANIFEST_DIR/metadata.env")"
      actual_metadata="$(sed -n "s/^$metadata_key=//p" "$bootstrap_current_manifest/metadata.env")"
      if [[ -z "$expected_metadata" || "$expected_metadata" != "$actual_metadata" ]]; then
        echo "BOOTSTRAP_REMOTE_METADATA_DRIFT key=$metadata_key" >&2
        exit 76
      fi
    done
  else
    bash "$SCRIPT_DIR/audit-47-runtime-provenance.sh" --require-traceable
  fi
fi

echo "REMOTE_RELEASE_ID=$REMOTE_RELEASE_ID"
if [[ -n "$EXPECTED_RELEASE_ID" && "$EXPECTED_RELEASE_ID" != "$REMOTE_RELEASE_ID" ]]; then
  echo "REMOTE_RELEASE_BASELINE_MISMATCH expected=$EXPECTED_RELEASE_ID actual=$REMOTE_RELEASE_ID" >&2
  echo "Another release changed 47 after this candidate started; rebase/merge and regenerate the candidate." >&2
  exit 76
fi

WEB_CHANGED=false
API_CHANGED=false
MIGRATE_CHANGED=false
[[ "$WEB_FINGERPRINT" != "$REMOTE_WEB" ]] && WEB_CHANGED=true
[[ "$API_FINGERPRINT" != "$REMOTE_API" ]] && API_CHANGED=true
[[ "$MIGRATE_FINGERPRINT" != "$REMOTE_MIGRATE" ]] && MIGRATE_CHANGED=true
DB_MIGRATION_REQUIRED="$MIGRATE_CHANGED"
if [[ "$FORCE_FULL" == true ]]; then
  WEB_CHANGED=true
  API_CHANGED=true
fi
if [[ "$BOOTSTRAP_MODE" == true ]]; then
  WEB_CHANGED=true
  API_CHANGED=true
fi

if [[ "$MODE" == "apply" && "$BOOTSTRAP_MODE" == true ]]; then
  LOCAL_MIGRATION_MANIFEST="$({
    for migration_dir in apps/api/prisma/migrations/*; do
      [[ -d "$migration_dir" && -f "$migration_dir/migration.sql" ]] || continue
      printf '%s|%s\n' "${migration_dir##*/}" "$(sha256_file "$migration_dir/migration.sql")"
    done
  } | LC_ALL=C sort)"
  REMOTE_APPLIED_MIGRATION_MANIFEST="$(ssh -o ConnectTimeout=20 "$REMOTE" bash -s -- "$REMOTE_DIR" <<'REMOTE_SCRIPT'
set -euo pipefail
cd "$1"
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -A -t -F "|" -c "SELECT migration_name, checksum FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name"'
REMOTE_SCRIPT
)"
  if ! validate_migration_manifest "$LOCAL_MIGRATION_MANIFEST" || ! validate_migration_manifest "$REMOTE_APPLIED_MIGRATION_MANIFEST"; then
    echo "BOOTSTRAP_APPLIED_MIGRATION_MANIFEST_INVALID" >&2
    exit 79
  fi
  LOCAL_MIGRATION_NAMES="$(printf '%s\n' "$LOCAL_MIGRATION_MANIFEST" | cut -d'|' -f1)"
  REMOTE_APPLIED_MIGRATION_NAMES="$(printf '%s\n' "$REMOTE_APPLIED_MIGRATION_MANIFEST" | cut -d'|' -f1)"
  if [[ "$LOCAL_MIGRATION_NAMES" != "$REMOTE_APPLIED_MIGRATION_NAMES" ]]; then
    echo "BOOTSTRAP_APPLIED_MIGRATION_SET_MISMATCH" >&2
    echo "candidate_count=$(printf '%s\n' "$LOCAL_MIGRATION_NAMES" | sed '/^$/d' | wc -l | tr -d ' ')" >&2
    echo "production_count=$(printf '%s\n' "$REMOTE_APPLIED_MIGRATION_NAMES" | sed '/^$/d' | wc -l | tr -d ' ')" >&2
    exit 79
  fi
  production_processed=0
  while IFS='|' read -r migration_name production_hash migration_extra; do
    production_processed=$((production_processed + 1))
    candidate_hash="$(printf '%s\n' "$LOCAL_MIGRATION_MANIFEST" | sed -n "s/^$migration_name|//p")"
    if [[ "$candidate_hash" != "$production_hash" ]] && ! grep -Fxq "$migration_name|$candidate_hash|$production_hash" "$BOOTSTRAP_MIGRATION_EXCEPTION_FILE"; then
      echo "BOOTSTRAP_APPLIED_MIGRATION_CHECKSUM_MISMATCH migration=$migration_name" >&2
      exit 79
    fi
  done <<< "$REMOTE_APPLIED_MIGRATION_MANIFEST"
  if [[ "$production_processed" != "$(printf '%s\n' "$LOCAL_MIGRATION_NAMES" | wc -l | tr -d ' ')" ]]; then
    echo "BOOTSTRAP_APPLIED_MIGRATION_ROW_COUNT_MISMATCH" >&2
    exit 79
  fi
  DB_MIGRATION_REQUIRED=false
fi

SYNC_PREVIEW="$(npm run sync:47 2>&1)"
SYNC_CHANGES="$(printf '%s\n' "$SYNC_PREVIEW" | LC_ALL=C sed -n -e '/^\*deleting /p' -e '/^[<>ch\.][^[:space:]]/p')"
DIRTY_RUNTIME_FILES="$(dirty_runtime_files)"
DIRTY_RUNTIME_COUNT=0
if [[ -n "$DIRTY_RUNTIME_FILES" ]]; then
  DIRTY_RUNTIME_COUNT="$(printf '%s\n' "$DIRTY_RUNTIME_FILES" | wc -l | tr -d ' ')"
fi

if [[ "$WEB_CHANGED" == true && "$API_CHANGED" == true ]]; then
  RELEASE_SCOPE="web+api"
elif [[ "$WEB_CHANGED" == true ]]; then
  RELEASE_SCOPE="web"
elif [[ "$API_CHANGED" == true ]]; then
  RELEASE_SCOPE="api"
elif [[ "$MIGRATE_CHANGED" == true ]]; then
  RELEASE_SCOPE="migrate-only"
else
  RELEASE_SCOPE="state/docs-only"
fi
if [[ "$MIGRATE_CHANGED" == true && "$DB_MIGRATION_REQUIRED" == true ]]; then
  RELEASE_SCOPE="${RELEASE_SCOPE}+migrate"
elif [[ "$MIGRATE_CHANGED" == true ]]; then
  RELEASE_SCOPE="${RELEASE_SCOPE}+migration-source-normalization"
fi

echo "RELEASE_SCOPE=$RELEASE_SCOPE"
echo "MIGRATION_REQUIRED=$DB_MIGRATION_REQUIRED"
echo "DIRTY_RUNTIME_COUNT=$DIRTY_RUNTIME_COUNT"
echo "Release scope: web=$WEB_CHANGED api=$API_CHANGED migrate=$DB_MIGRATION_REQUIRED"
if [[ -n "$SYNC_CHANGES" ]]; then
  printf '%s\n' "$SYNC_CHANGES"
else
  echo "Source sync: no differences"
fi

if [[ "$MODE" == "dry-run" ]]; then
  if [[ -n "$DIRTY_RUNTIME_FILES" ]]; then
    echo "Dirty runtime files (apply will be blocked):"
    printf '%s\n' "$DIRTY_RUNTIME_FILES"
  fi
  exit 0
fi

if [[ "$MIGRATE_CHANGED" == true && "$BOOTSTRAP_MODE" != true ]]; then
  echo "Standard deploy does not execute an implicit pending migration set." >&2
  echo "Use deploy:47:whitelist with the reviewed schema/migration targets so the approved set can be verified." >&2
  exit 79
fi

if [[ -n "$DIRTY_RUNTIME_FILES" ]]; then
  echo "Refusing deploy:47 apply because the runtime worktree is dirty." >&2
  echo "Commit an independently verified release candidate, or use the documented 47-baseline whitelist patch flow." >&2
  printf '%s\n' "$DIRTY_RUNTIME_FILES" >&2
  exit 3
fi

if [[ -n "$SYNC_CHANGES" ]]; then
  REMOTE_MUTATION_STARTED=true
  FAILURE_PHASE="standard-sync-build-health"
  SIYUAN_47_EXPECTED_RELEASE_ID="$EXPECTED_RELEASE_ID" npm run sync:47 -- --apply
fi

if [[ "$WEB_CHANGED" == true || "$API_CHANGED" == true ]]; then
  REMOTE_MUTATION_STARTED=true
  FAILURE_PHASE="standard-build-restart-health"
fi

ssh -o ConnectTimeout=20 "$REMOTE" bash -s -- \
  "$REMOTE_DIR" "$WEB_CHANGED" "$API_CHANGED" "$DB_MIGRATION_REQUIRED" \
  "$WEB_FINGERPRINT" "$API_FINGERPRINT" "$MIGRATE_FINGERPRINT" "$RELEASE_ID" \
  "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" <<'REMOTE_SCRIPT'
set -euo pipefail
REMOTE_DIR="$1"
WEB_CHANGED="$2"
API_CHANGED="$3"
MIGRATE_CHANGED="$4"
WEB_FINGERPRINT="$5"
API_FINGERPRINT="$6"
MIGRATE_FINGERPRINT="$7"
RELEASE_ID="$8"
RELEASE_LOCK_DIR="$9"
RELEASE_LOCK_TOKEN="${10}"
cd "$REMOTE_DIR"
actual_lock_token="$(sed -n '1p' "$RELEASE_LOCK_DIR/token" 2>/dev/null || true)"
if [[ "$actual_lock_token" != "$RELEASE_LOCK_TOKEN" ]]; then
  echo "47 release lock ownership changed before build." >&2
  exit 75
fi
export VITE_RELEASE_ID="$RELEASE_ID"
export RELEASE_ID="$RELEASE_ID"

remote_fingerprints="$(bash scripts/print-47-release-fingerprints.sh)"
remote_web="$(printf '%s\n' "$remote_fingerprints" | sed -n 's/^WEB_FINGERPRINT=//p')"
remote_api="$(printf '%s\n' "$remote_fingerprints" | sed -n 's/^API_FINGERPRINT=//p')"
remote_migrate="$(printf '%s\n' "$remote_fingerprints" | sed -n 's/^MIGRATE_FINGERPRINT=//p')"
if [[ "$remote_web" != "$WEB_FINGERPRINT" || "$remote_api" != "$API_FINGERPRINT" || "$remote_migrate" != "$MIGRATE_FINGERPRINT" ]]; then
  echo "REMOTE_RELEASE_MANIFEST_MISMATCH after synchronized candidate." >&2
  exit 78
fi

failure_logs() {
  echo "Deployment failed; recent service logs:" >&2
  docker compose logs --tail=100 api web >&2 || true
}
trap failure_logs ERR

build_services=()
[[ "$MIGRATE_CHANGED" == true ]] && build_services+=(db-migrate)
[[ "$API_CHANGED" == true ]] && build_services+=(api)
[[ "$WEB_CHANGED" == true ]] && build_services+=(web)
if ((${#build_services[@]})); then
  docker compose build "${build_services[@]}"
fi

if [[ "$MIGRATE_CHANGED" == true ]]; then
  docker compose --profile tools run --rm db-migrate </dev/null
fi

restart_services=()
[[ "$API_CHANGED" == true ]] && restart_services+=(api)
[[ "$WEB_CHANGED" == true ]] && restart_services+=(web)
if ((${#restart_services[@]})); then
  docker compose up -d --remove-orphans "${restart_services[@]}"
fi

for _ in $(seq 1 45); do
  if docker compose exec -T api node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" </dev/null >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker compose exec -T api node -e "fetch('http://127.0.0.1:3001/api/health').then(async r=>{if(!r.ok)process.exit(1);console.log(await r.text())}).catch(()=>process.exit(1))" </dev/null

host_port="$(docker compose port web 80 | tail -1 | sed 's/.*://')"
container_index="$(docker compose exec -T web sha256sum /usr/share/nginx/html/index.html </dev/null | awk '{print $1}')"
served_index="$(curl --retry 10 --retry-delay 1 --retry-connrefused -fsS "http://127.0.0.1:${host_port}/" | sha256sum | awk '{print $1}')"
[[ "$container_index" == "$served_index" ]]

docker compose ps
trap - ERR
REMOTE_SCRIPT

curl --retry 10 --retry-delay 1 --retry-connrefused -fsS "$PUBLIC_URL/api/health"
curl --retry 10 --retry-delay 1 --retry-connrefused -fsS -o /dev/null "$PUBLIC_URL/"
ssh -o ConnectTimeout=20 "$REMOTE" bash -s -- \
  "$REMOTE_DIR" "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" \
  "$WEB_FINGERPRINT" "$API_FINGERPRINT" "$MIGRATE_FINGERPRINT" "$RELEASE_ID" \
  "$GIT_COMMIT" "$GIT_BRANCH" "$RELEASED_AT" <<'REMOTE_SCRIPT'
set -eu
remote_dir="$1"
lock_dir="$2"
expected_token="$3"
web_fingerprint="$4"
api_fingerprint="$5"
migrate_fingerprint="$6"
release_id="$7"
git_commit="$8"
git_branch="$9"
released_at="${10}"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
if [ "$actual_token" != "$expected_token" ]; then
  echo "47 release lock ownership changed before success-state update." >&2
  exit 75
fi
cd "$remote_dir"
web_container="$(docker compose ps -q web | tail -1)"
api_container="$(docker compose ps -q api | tail -1)"
web_image_id="$(docker inspect --format '{{.Image}}' "$web_container")"
api_image_id="$(docker inspect --format '{{.Image}}' "$api_container")"
[ -n "$web_image_id" ] && [ -n "$api_image_id" ]

receipt_dir="$remote_dir/.release-receipts"
receipt_path="$receipt_dir/$release_id.env"
receipt_tmp="$receipt_path.tmp.$expected_token"
if [ -L "$receipt_dir" ]; then
  echo "Release receipt directory must not be a symlink." >&2
  exit 83
fi
mkdir -p "$receipt_dir"
if [ "$(readlink -f "$receipt_dir")" != "$(readlink -f "$remote_dir")/.release-receipts" ] || \
   { [ -e "$receipt_path" ] && { [ -L "$receipt_path" ] || [ ! -f "$receipt_path" ]; }; }; then
  echo "Release receipt path is not a canonical regular file." >&2
  exit 83
fi
cat > "$receipt_tmp" <<RECEIPT
RECEIPT_FORMAT_VERSION=1
SOURCE_MODE=GIT_SOURCE_BUILD
RELEASE_ID=$release_id
GIT_COMMIT=$git_commit
GIT_BRANCH=$git_branch
WEB_FINGERPRINT=$web_fingerprint
API_FINGERPRINT=$api_fingerprint
MIGRATE_FINGERPRINT=$migrate_fingerprint
WEB_IMAGE_ID=$web_image_id
API_IMAGE_ID=$api_image_id
RECEIPT
if [ -e "$receipt_path" ]; then
  receipt_mode="$(stat -c '%a' "$receipt_path")"
  if [ $((8#$receipt_mode & 0222)) -ne 0 ]; then
    rm -f "$receipt_tmp"
    echo "Existing release receipt must be read-only." >&2
    exit 83
  fi
  if ! cmp -s "$receipt_tmp" "$receipt_path"; then
    rm -f "$receipt_tmp"
    echo "Immutable release receipt already exists with different content: $receipt_path" >&2
    exit 83
  fi
  rm -f "$receipt_tmp"
else
  chmod 0444 "$receipt_tmp"
  mv "$receipt_tmp" "$receipt_path"
fi
receipt_sha256="$(sha256sum "$receipt_path" | awk '{print $1}')"

state_file="$remote_dir/.siyuan-release-state"
state_tmp="$state_file.tmp.$expected_token"
cat > "$state_tmp" <<STATE
WEB_FINGERPRINT=$web_fingerprint
API_FINGERPRINT=$api_fingerprint
MIGRATE_FINGERPRINT=$migrate_fingerprint
RELEASE_ID=$release_id
RELEASED_AT=$released_at
SOURCE_MODE=GIT_SOURCE_BUILD
GIT_COMMIT=$git_commit
GIT_BRANCH=$git_branch
WEB_IMAGE_ID=$web_image_id
API_IMAGE_ID=$api_image_id
RELEASE_RECEIPT_PATH=.release-receipts/$release_id.env
RELEASE_RECEIPT_SHA256=$receipt_sha256
STATE
mv "$state_tmp" "$state_file"
REMOTE_SCRIPT
echo
echo "47 deployment completed successfully."
