#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"

PUBLIC_URL="${SIYUAN_47_PUBLIC_URL:-http://47.120.33.111:8899}"
SCOPE=""
SOURCE_FILES=()
TARGET_FILES=()
EXPECTED_SHAS=()
APPLIED_TARGETS=()
APPLIED_EXPECTED_SHAS=()
APPLIED_BACKUP_DIRS=()
CAS_PHASE=false
REMOTE_MUTATION_STARTED=false
FAILURE_PHASE="whitelist-cas"
APPROVED_MIGRATIONS=()
APPROVED_MIGRATION_SPECS=()
NO_CACHE=false
ADOPT_CURRENT_RUNTIME=false

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-}"
      shift 2
      ;;
    --file)
      if [[ "$#" -lt 4 ]]; then
        echo "--file requires <candidate> <repo-relative-target> <expected-sha|MISSING>." >&2
        exit 2
      fi
      SOURCE_FILES+=("$2")
      TARGET_FILES+=("$3")
      EXPECTED_SHAS+=("$4")
      shift 4
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    --adopt-current-runtime)
      ADOPT_CURRENT_RUNTIME=true
      shift
      ;;
    *)
      echo "Usage: npm run deploy:47:whitelist -- [--no-cache] [--adopt-current-runtime] --scope <none|web|api|web+api|api+migrate|web+api+migrate> --file <candidate> <target> <expected-sha|MISSING> [--file ...]" >&2
      exit 2
      ;;
  esac
done

case "$SCOPE" in
  none|web|api|web+api|api+migrate|web+api+migrate) ;;
  *) echo "Unsupported whitelist release scope: $SCOPE" >&2; exit 2 ;;
esac
if [[ "${#SOURCE_FILES[@]}" -eq 0 ]]; then
  echo "At least one --file candidate is required." >&2
  exit 2
fi

NEEDS_WEB=false
NEEDS_API=false
NEEDS_MIGRATE=false
HAS_SCHEMA_TARGET=false
HAS_MIGRATION_TARGET=false
for index in "${!TARGET_FILES[@]}"; do
  for prior_index in "${!TARGET_FILES[@]}"; do
    (( prior_index < index )) || continue
    if [[ "${TARGET_FILES[$prior_index]}" == "${TARGET_FILES[$index]}" ]]; then
      echo "Duplicate whitelist target is not allowed: ${TARGET_FILES[$index]}" >&2
      exit 2
    fi
  done
  case "${TARGET_FILES[$index]}" in
    docker-compose.yml|deploy/*)
      if [[ "${TARGET_FILES[$index]}" != "deploy/nginx.conf" ]]; then
        echo "Infrastructure target requires a separately reviewed full/infra release path: ${TARGET_FILES[$index]}" >&2
        exit 82
      fi
      NEEDS_WEB=true
      ;;
    apps/api/prisma/migrations/*)
      NEEDS_API=true
      NEEDS_MIGRATE=true
      HAS_MIGRATION_TARGET=true
      migration_relative="${TARGET_FILES[$index]#apps/api/prisma/migrations/}"
      if [[ ! "$migration_relative" =~ ^[A-Za-z0-9_]+/migration\.sql$ ]]; then
        echo "Reviewed migration target must be exactly apps/api/prisma/migrations/<name>/migration.sql." >&2
        exit 2
      fi
      migration_name="${migration_relative%%/*}"
      migration_already_approved=false
      if [[ "${#APPROVED_MIGRATIONS[@]}" -gt 0 ]]; then
        for approved_migration in "${APPROVED_MIGRATIONS[@]}"; do
          [[ "$approved_migration" == "$migration_name" ]] && migration_already_approved=true
        done
      fi
      if [[ -n "$migration_name" && "$migration_already_approved" != true ]]; then
        APPROVED_MIGRATIONS+=("$migration_name")
      fi
      migration_candidate_sha="$(shasum -a 256 "${SOURCE_FILES[$index]}" | awk '{print $1}')"
      APPROVED_MIGRATION_SPECS+=("$migration_name=$migration_candidate_sha")
      ;;
    apps/api/prisma/schema.prisma)
      NEEDS_API=true
      NEEDS_MIGRATE=true
      HAS_SCHEMA_TARGET=true
      ;;
    apps/api/*|Dockerfile.api)
      NEEDS_API=true
      ;;
    apps/web/*|Dockerfile.web|deploy/nginx.conf)
      NEEDS_WEB=true
      ;;
    packages/shared/*|package.json|package-lock.json|tsconfig.base.json|.dockerignore)
      NEEDS_WEB=true
      NEEDS_API=true
      ;;
  esac
done

if [[ "$NEEDS_MIGRATE" == true && ( "$HAS_SCHEMA_TARGET" != true || "$HAS_MIGRATION_TARGET" != true ) ]]; then
  echo "Migration whitelist must include schema.prisma and at least one reviewed migration file together." >&2
  exit 2
fi

if [[ "$NEEDS_MIGRATE" == true && "$NEEDS_WEB" == true ]]; then
  REQUIRED_SCOPE="web+api+migrate"
elif [[ "$NEEDS_MIGRATE" == true ]]; then
  REQUIRED_SCOPE="api+migrate"
elif [[ "$NEEDS_WEB" == true && "$NEEDS_API" == true ]]; then
  REQUIRED_SCOPE="web+api"
elif [[ "$NEEDS_WEB" == true ]]; then
  REQUIRED_SCOPE="web"
elif [[ "$NEEDS_API" == true ]]; then
  REQUIRED_SCOPE="api"
else
  REQUIRED_SCOPE="none"
fi
if [[ "$SCOPE" != "$REQUIRED_SCOPE" ]]; then
  echo "Whitelist scope mismatch: requested=$SCOPE required=$REQUIRED_SCOPE for the declared targets." >&2
  exit 2
fi
if [[ "$ADOPT_CURRENT_RUNTIME" == true ]]; then
  if [[ "$SCOPE" != none ]]; then
    echo "Runtime adoption is only allowed for a zero-build scope none governance release." >&2
    exit 2
  fi
  for target_file in "${TARGET_FILES[@]}"; do
    case "$target_file" in
      scripts/*) ;;
      *) echo "Runtime adoption may only publish release-governance scripts: $target_file" >&2; exit 2 ;;
    esac
  done
fi
APPROVED_MIGRATIONS_CSV=""
APPROVED_MIGRATION_SPECS_CSV=""
if [[ "${#APPROVED_MIGRATIONS[@]}" -gt 0 ]]; then
  APPROVED_MIGRATIONS_CSV="$(IFS=,; printf '%s' "${APPROVED_MIGRATIONS[*]}")"
fi
if [[ "${#APPROVED_MIGRATION_SPECS[@]}" -gt 0 ]]; then
  APPROVED_MIGRATION_SPECS_CSV="$(IFS=,; printf '%s' "${APPROVED_MIGRATION_SPECS[*]}")"
fi
APPROVED_MIGRATIONS_ARG="${APPROVED_MIGRATIONS_CSV:-__SIYUAN_EMPTY__}"

cleanup_release_lock() {
  local exit_code=$?
  trap - EXIT INT TERM
  local rollback_succeeded=false
  local preserve_lock=false
  if [[ "$exit_code" -ne 0 && "$CAS_PHASE" == true && "${#APPLIED_TARGETS[@]}" -gt 0 ]]; then
    rollback_args=()
    for index in "${!APPLIED_TARGETS[@]}"; do
      rollback_args+=("${APPLIED_TARGETS[$index]}" "${APPLIED_EXPECTED_SHAS[$index]}" "${APPLIED_BACKUP_DIRS[$index]}")
    done
    if ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
      "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" "$SIYUAN_47_DIR" "${rollback_args[@]}" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"; expected_token="$2"; remote_dir="$3"; shift 3
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
[ "$actual_token" = "$expected_token" ] || { echo "Cannot rollback CAS batch after lock ownership changed." >&2; exit 75; }
while [ "$#" -gt 0 ]; do
  target_file="$1"; expected_sha="$2"; backup_dir="$3"; shift 3
  target_path="$remote_dir/$target_file"
  if [ "$expected_sha" = "MISSING" ]; then
    rm -f -- "$target_path"
  else
    backup_file="$backup_dir/$target_file"
    backup_sha="$(sha256sum "$backup_file" | awk '{print $1}')"
    [ "$backup_sha" = "$expected_sha" ] || { echo "Rollback backup checksum mismatch: $target_file" >&2; exit 77; }
    restore_tmp="$target_path.rollback.$expected_token"
    cp "$backup_file" "$restore_tmp"
    mv -T "$restore_tmp" "$target_path"
    restored_sha="$(sha256sum "$target_path" | awk '{print $1}')"
    [ "$restored_sha" = "$expected_sha" ] || { echo "Rollback checksum mismatch: $target_file" >&2; exit 77; }
  fi
  echo "CAS_BATCH_ROLLED_BACK=$target_file"
done
REMOTE_SCRIPT
    then
      rollback_succeeded=true
    else
      echo "CAS batch rollback failed; the 47 source tree may require recovery from .release-backups." >&2
    fi
  fi
  if [[ "$exit_code" -ne 0 && "$REMOTE_MUTATION_STARTED" == true && ( "$CAS_PHASE" != true || "$rollback_succeeded" != true ) ]]; then
    if ! siyuan_47_mark_release_recovery_required "$FAILURE_PHASE"; then
      echo "Failed to write recovery marker; preserving the release lock to fail closed." >&2
      preserve_lock=true
    fi
  fi
  if [[ "$preserve_lock" == true ]]; then
    exit "$exit_code"
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

siyuan_47_acquire_release_lock
trap cleanup_release_lock EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
CAS_PHASE=true

PREVIOUS_RELEASE_ID="$(ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" \
  "sed -n 's/^RELEASE_ID=//p' '$SIYUAN_47_DIR/.siyuan-release-state' 2>/dev/null | tail -1")"
[[ -n "$PREVIOUS_RELEASE_ID" ]] || PREVIOUS_RELEASE_ID="MISSING"
runtime_image_state_match="$(ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- "$SIYUAN_47_DIR" <<'REMOTE_SCRIPT'
set -euo pipefail
remote_dir="$1"
cd "$remote_dir"
# shellcheck source=lib/docker-container-image-id.sh
source scripts/lib/docker-container-image-id.sh
state_value() {
  sed -n "s/^$1=//p" .siyuan-release-state 2>/dev/null | tail -1
}
web_expected="$(state_value WEB_IMAGE_ID)"
api_expected="$(state_value API_IMAGE_ID)"
web_container="$(docker compose ps -q web 2>/dev/null | tail -1)"
api_container="$(docker compose ps -q api 2>/dev/null | tail -1)"
web_actual="$(siyuan_docker_container_image_id "$web_container")"
api_actual="$(siyuan_docker_container_image_id "$api_container")"
if [[ -z "$web_actual" || -z "$api_actual" ]]; then
  printf 'unavailable\n'
elif [[ -n "$web_expected" && -n "$api_expected" && "$web_expected" == "$web_actual" && "$api_expected" == "$api_actual" ]]; then
  printf 'true\n'
else
  printf 'false\n'
fi
REMOTE_SCRIPT
)"
if [[ "$runtime_image_state_match" == unavailable ]]; then
  echo "RUNTIME_IMAGE_UNAVAILABLE: Web/API running image identity could not be resolved." >&2
  exit 83
elif [[ "$runtime_image_state_match" != true ]]; then
  if [[ "$ADOPT_CURRENT_RUNTIME" != true ]]; then
    echo "RUNTIME_IMAGE_STATE_MISMATCH: whitelist release refused before source mutation." >&2
    echo "Inspect the running release and use --adopt-current-runtime only for a reviewed, zero-build governance release." >&2
    exit 83
  fi
  echo "RUNTIME_IMAGE_STATE_ADOPTION=reviewed-zero-build-governance-release"
  curl --retry 3 --retry-delay 1 --retry-connrefused -fsS -o /dev/null "$PUBLIC_URL/api/health"
  curl --retry 3 --retry-delay 1 --retry-connrefused -fsS -o /dev/null "$PUBLIC_URL/"
fi
WHITELIST_RELEASE_ID="whitelist-$(
  {
    printf '%s\n' "$PREVIOUS_RELEASE_ID"
    for index in "${!SOURCE_FILES[@]}"; do
      printf '%s  %s\n' "$(shasum -a 256 "${SOURCE_FILES[$index]}" | awk '{print $1}')" "${TARGET_FILES[$index]}"
    done
  } | shasum -a 256 | awk '{print substr($1, 1, 24)}'
)"

# Validate every candidate and every expected remote baseline before mutating any
# target. The lock prevents compliant publishers from changing the checked state;
# each following CAS still verifies again to fail closed on lock-bypassing writes.
for index in "${!SOURCE_FILES[@]}"; do
  "$SCRIPT_DIR/cas-sync-47-file.sh" \
    --source "${SOURCE_FILES[$index]}" \
    --target "${TARGET_FILES[$index]}" \
    --expected-sha "${EXPECTED_SHAS[$index]}" \
    --preflight-only
done

REMOTE_MUTATION_STARTED=true
for index in "${!SOURCE_FILES[@]}"; do
  cas_output="$("$SCRIPT_DIR/cas-sync-47-file.sh" \
    --source "${SOURCE_FILES[$index]}" \
    --target "${TARGET_FILES[$index]}" \
    --expected-sha "${EXPECTED_SHAS[$index]}")"
  printf '%s\n' "$cas_output"
  backup_dir="$(printf '%s\n' "$cas_output" | sed -n 's/^BACKUP_DIR=//p' | tail -1)"
  [[ -n "$backup_dir" ]] || { echo "CAS result did not return a backup directory." >&2; exit 77; }
  APPLIED_TARGETS+=("${TARGET_FILES[$index]}")
  APPLIED_EXPECTED_SHAS+=("${EXPECTED_SHAS[$index]}")
  APPLIED_BACKUP_DIRS+=("$backup_dir")
done

if [[ "$NEEDS_MIGRATE" == true ]]; then
  ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
    "$SIYUAN_47_DIR" "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" "$APPROVED_MIGRATIONS_CSV" "$APPROVED_MIGRATION_SPECS_CSV" <<'REMOTE_SCRIPT'
set -euo pipefail
remote_dir="$1"; lock_dir="$2"; expected_token="$3"; approved_migrations_csv="$4"; approved_migration_specs_csv="$5"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
[[ "$actual_token" == "$expected_token" ]] || exit 75
cd "$remote_dir"
applied_migrations="$(docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name"')"
pending_migrations="$(
  for migration_dir in apps/api/prisma/migrations/*; do
    [[ -d "$migration_dir" ]] || continue
    migration_name="${migration_dir##*/}"
    printf '%s\n' "$applied_migrations" | grep -Fxq "$migration_name" || printf '%s\n' "$migration_name"
  done | LC_ALL=C sort
)"
approved_migrations="$(printf '%s' "$approved_migrations_csv" | tr ',' '\n' | sed '/^$/d' | LC_ALL=C sort)"
while IFS= read -r migration_spec; do
  [[ -n "$migration_spec" ]] || continue
  migration_name="${migration_spec%%=*}"
  approved_sha="${migration_spec#*=}"
  migration_file="apps/api/prisma/migrations/$migration_name/migration.sql"
  actual_sha="$(sha256sum "$migration_file" | awk '{print $1}')"
  if [[ "$actual_sha" != "$approved_sha" ]]; then
    echo "APPROVED_MIGRATION_CHECKSUM_MISMATCH migration=$migration_name" >&2
    exit 79
  fi
done < <(printf '%s' "$approved_migration_specs_csv" | tr ',' '\n')
if [[ "$pending_migrations" != "$approved_migrations" ]]; then
  echo "PENDING_MIGRATION_SET_MISMATCH" >&2
  echo "approved=$(printf '%s' "$approved_migrations" | tr '\n' ',')" >&2
  echo "pending=$(printf '%s' "$pending_migrations" | tr '\n' ',')" >&2
  exit 79
fi
REMOTE_SCRIPT
fi
CAS_PHASE=false
FAILURE_PHASE="whitelist-build-migrate-restart-health"

if [[ "$SCOPE" != "none" ]]; then
  ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
  "$SIYUAN_47_DIR" "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" "$SCOPE" "$APPROVED_MIGRATIONS_ARG" "$NO_CACHE" "$WHITELIST_RELEASE_ID" <<'REMOTE_SCRIPT'
set -euo pipefail
remote_dir="$1"
lock_dir="$2"
expected_token="$3"
scope="$4"
approved_migrations_csv="${5:-}"
no_cache="${6:-false}"
whitelist_release_id="${7:-unknown}"
[[ "$approved_migrations_csv" == __SIYUAN_EMPTY__ ]] && approved_migrations_csv=""
if [[ ! "$whitelist_release_id" =~ ^whitelist-[0-9a-f]{24}$ ]]; then
  echo "RELEASE_ID_ARGUMENT_INVALID actual=$whitelist_release_id" >&2
  exit 83
fi
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
if [[ "$actual_token" != "$expected_token" ]]; then
  echo "47 release lock ownership changed before whitelist build." >&2
  exit 75
fi
cd "$remote_dir"
# shellcheck source=lib/47-release-images.sh
source scripts/lib/47-release-images.sh
siyuan_47_export_release_images "$whitelist_release_id"
export VITE_RELEASE_ID="$whitelist_release_id"
export RELEASE_ID="$whitelist_release_id"
if [[ "${SIYUAN_API_IMAGE:-}" != "siyuan-api:${whitelist_release_id}" \
  || "${SIYUAN_WEB_IMAGE:-}" != "siyuan-web:${whitelist_release_id}" \
  || "${SIYUAN_MIGRATE_IMAGE:-}" != "siyuan-db-migrate:${whitelist_release_id}" ]]; then
  echo "RELEASE_IMAGE_EXPORT_MISMATCH release=$whitelist_release_id" >&2
  exit 83
fi

build_services=()
restart_services=()
case "$scope" in
  web) build_services+=(web); restart_services+=(web) ;;
  api) build_services+=(api); restart_services+=(api) ;;
  web+api) build_services+=(api web); restart_services+=(api web) ;;
  api+migrate) build_services+=(db-migrate api); restart_services+=(api) ;;
  web+api+migrate) build_services+=(db-migrate api web); restart_services+=(api web) ;;
esac

failure_logs() {
  echo "Whitelist deployment failed; recent service logs:" >&2
  docker compose logs --tail=100 api web >&2 || true
}
trap failure_logs ERR

build_args=()
if [[ "$no_cache" == true ]]; then
  build_args+=(--no-cache)
fi
build_args+=(--build-arg "VITE_RELEASE_ID=$whitelist_release_id")
api_changed=false
web_changed=false
migrate_changed=false
[[ "$scope" == *api* ]] && api_changed=true
[[ "$scope" == *web* ]] && web_changed=true
[[ "$scope" == *migrate* ]] && migrate_changed=true
docker compose build "${build_args[@]}" "${build_services[@]}"
siyuan_47_capture_release_image_ids "$api_changed" "$web_changed" "$migrate_changed"
siyuan_47_verify_release_image_ids "$api_changed" "$web_changed" "$migrate_changed"
if [[ "$scope" == *"+migrate" ]]; then
  siyuan_47_verify_release_image_ids "$api_changed" "$web_changed" "$migrate_changed"
  docker compose --profile tools run --rm db-migrate </dev/null
fi
if [[ "$scope" == *api* || "$scope" == *web* ]]; then
  siyuan_47_verify_release_image_ids "$api_changed" "$web_changed" "$migrate_changed"
fi
docker compose up -d --no-deps "${restart_services[@]}"

for service in "${restart_services[@]}"; do
  expected_image=""
  case "$service" in
    api) expected_image="$SIYUAN_API_IMAGE" ;;
    web) expected_image="$SIYUAN_WEB_IMAGE" ;;
  esac
  container_id="$(docker compose ps -q "$service" | tail -1)"
  running_image_ref="$(docker inspect --format '{{.Config.Image}}' "$container_id" 2>/dev/null | tail -1)"
  if [[ -z "$container_id" || "$running_image_ref" != "$expected_image" ]]; then
    echo "RELEASE_CONTAINER_IMAGE_FENCE_MISMATCH service=$service expected=$expected_image actual=${running_image_ref:-MISSING}" >&2
    exit 83
  fi
done

for _ in $(seq 1 45); do
  if docker compose exec -T api node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" </dev/null >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
docker compose exec -T api node -e "fetch('http://127.0.0.1:3001/api/health').then(async r=>{if(!r.ok)process.exit(1);console.log(await r.text())}).catch(()=>process.exit(1))" </dev/null

if [[ "$scope" == *"web"* ]]; then
  host_port="$(docker compose port web 80 | tail -1 | sed 's/.*://')"
  container_index="$(docker compose exec -T web sha256sum /usr/share/nginx/html/index.html </dev/null | awk '{print $1}')"
  served_index="$(curl --retry 10 --retry-delay 1 --retry-connrefused -fsS "http://127.0.0.1:${host_port}/" | sha256sum | awk '{print $1}')"
  [[ "$container_index" == "$served_index" ]]
fi
docker compose ps
trap - ERR
REMOTE_SCRIPT

  curl --retry 10 --retry-delay 1 --retry-connrefused -fsS "$PUBLIC_URL/api/health"
  if [[ "$SCOPE" == *"web"* ]]; then
    curl --retry 10 --retry-delay 1 --retry-connrefused -fsS -o /dev/null "$PUBLIC_URL/"
  fi
else
  echo "Whitelist files synchronized under the 47 release lock; no service rebuild requested."
fi
ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
  "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" "$SIYUAN_47_DIR" "$WHITELIST_RELEASE_ID" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"
expected_token="$2"
remote_dir="$3"
release_id="$4"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
if [ "$actual_token" != "$expected_token" ]; then
  echo "47 release lock ownership changed before whitelist state update." >&2
  exit 75
fi
state_file="$remote_dir/.siyuan-release-state"
state_tmp="$state_file.tmp.$expected_token"
# shellcheck source=lib/docker-container-image-id.sh
source "$remote_dir/scripts/lib/docker-container-image-id.sh"
fingerprints="$(bash "$remote_dir/scripts/print-47-release-fingerprints.sh")"
web_fingerprint="$(printf '%s\n' "$fingerprints" | sed -n 's/^WEB_FINGERPRINT=//p')"
api_fingerprint="$(printf '%s\n' "$fingerprints" | sed -n 's/^API_FINGERPRINT=//p')"
migrate_fingerprint="$(printf '%s\n' "$fingerprints" | sed -n 's/^MIGRATE_FINGERPRINT=//p')"
[[ -n "$web_fingerprint" && -n "$api_fingerprint" && -n "$migrate_fingerprint" ]]
web_container="$(cd "$remote_dir" && docker compose ps -q web 2>/dev/null | tail -1)"
api_container="$(cd "$remote_dir" && docker compose ps -q api 2>/dev/null | tail -1)"
web_image_id="$(siyuan_docker_container_image_id "$web_container")"
api_image_id="$(siyuan_docker_container_image_id "$api_container")"
cat > "$state_tmp" <<STATE
WEB_FINGERPRINT=$web_fingerprint
API_FINGERPRINT=$api_fingerprint
MIGRATE_FINGERPRINT=$migrate_fingerprint
RELEASE_ID=$release_id
RELEASED_AT=$(date -Iseconds)
SOURCE_MODE=WHITELIST_CAS
WEB_IMAGE_ID=$web_image_id
API_IMAGE_ID=$api_image_id
STATE
mv "$state_tmp" "$state_file"
REMOTE_SCRIPT
echo
echo "47 whitelist deployment completed successfully under the global release lock."
