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
REMOTE_MUTATION_STARTED=false
FAILURE_PHASE="standard-deploy"

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
    *) echo "Usage: npm run deploy:47 -- [--dry-run] [--full] [--lock-status] [--expected-release-id <id>]"; exit 2 ;;
  esac
  shift
done

if [[ -n "$EXPECTED_RELEASE_ID" && ! "$EXPECTED_RELEASE_ID" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "Expected release ID contains unsupported characters." >&2
  exit 2
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
RELEASE_ID="web-${WEB_FINGERPRINT:0:12}_api-${API_FINGERPRINT:0:12}"

if [[ "$PRINT_FINGERPRINTS" == true ]]; then
  printf 'WEB_FINGERPRINT=%s\nAPI_FINGERPRINT=%s\nMIGRATE_FINGERPRINT=%s\nRELEASE_ID=%s\n' \
    "$WEB_FINGERPRINT" "$API_FINGERPRINT" "$MIGRATE_FINGERPRINT" "$RELEASE_ID"
  exit 0
fi

cleanup_release_lock() {
  local exit_code=$?
  trap - EXIT INT TERM
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
if [[ "$FORCE_FULL" == true ]]; then
  WEB_CHANGED=true
  API_CHANGED=true
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
[[ "$MIGRATE_CHANGED" == true ]] && RELEASE_SCOPE="${RELEASE_SCOPE}+migrate"

echo "RELEASE_SCOPE=$RELEASE_SCOPE"
echo "MIGRATION_REQUIRED=$MIGRATE_CHANGED"
echo "DIRTY_RUNTIME_COUNT=$DIRTY_RUNTIME_COUNT"
echo "Release scope: web=$WEB_CHANGED api=$API_CHANGED migrate=$MIGRATE_CHANGED"
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

if [[ "$MIGRATE_CHANGED" == true ]]; then
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
  "$REMOTE_DIR" "$WEB_CHANGED" "$API_CHANGED" "$MIGRATE_CHANGED" \
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
  "$WEB_FINGERPRINT" "$API_FINGERPRINT" "$MIGRATE_FINGERPRINT" "$RELEASE_ID" <<'REMOTE_SCRIPT'
set -eu
remote_dir="$1"
lock_dir="$2"
expected_token="$3"
web_fingerprint="$4"
api_fingerprint="$5"
migrate_fingerprint="$6"
release_id="$7"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
if [ "$actual_token" != "$expected_token" ]; then
  echo "47 release lock ownership changed before success-state update." >&2
  exit 75
fi
state_file="$remote_dir/.siyuan-release-state"
state_tmp="$state_file.tmp.$expected_token"
cat > "$state_tmp" <<STATE
WEB_FINGERPRINT=$web_fingerprint
API_FINGERPRINT=$api_fingerprint
MIGRATE_FINGERPRINT=$migrate_fingerprint
RELEASE_ID=$release_id
RELEASED_AT=$(date -Iseconds)
STATE
mv "$state_tmp" "$state_file"
REMOTE_SCRIPT
echo
echo "47 deployment completed successfully."
