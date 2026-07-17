#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
PUBLIC_URL="${SIYUAN_47_PUBLIC_URL:-http://47.120.33.111:8899}"
MODE="apply"
FORCE_FULL=false
PRINT_FINGERPRINTS=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) MODE="dry-run" ;;
    --full) FORCE_FULL=true ;;
    --print-fingerprints) PRINT_FINGERPRINTS=true ;;
    *) echo "Usage: npm run deploy:47 -- [--dry-run] [--full]"; exit 2 ;;
  esac
done

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

fingerprint() {
  local scope="$1"
  while IFS= read -r path; do
    [[ -f "$path" ]] || continue
    case "$path" in
      */node_modules/*|*/dist/*|apps/api/uploads/*|*/.DS_Store|*.tsbuildinfo|*.log) continue ;;
    esac
    if matches_scope "$scope" "$path"; then
      printf '%s  %s\n' "$(shasum -a 256 "$path" | awk '{print $1}')" "$path"
    fi
  done < <(runtime_files | LC_ALL=C sort -u)
}

scope_hash() {
  fingerprint "$1" | shasum -a 256 | awk '{print $1}'
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

REMOTE_STATE="$(ssh -o ConnectTimeout=20 "$REMOTE" "cat '$REMOTE_DIR/.siyuan-release-state' 2>/dev/null || true")"

state_value() {
  printf '%s\n' "$REMOTE_STATE" | sed -n "s/^$1=//p" | tail -1
}

REMOTE_WEB="$(state_value WEB_FINGERPRINT)"
REMOTE_API="$(state_value API_FINGERPRINT)"
REMOTE_MIGRATE="$(state_value MIGRATE_FINGERPRINT)"

WEB_CHANGED=false
API_CHANGED=false
MIGRATE_CHANGED=false
[[ "$WEB_FINGERPRINT" != "$REMOTE_WEB" ]] && WEB_CHANGED=true
[[ "$API_FINGERPRINT" != "$REMOTE_API" ]] && API_CHANGED=true
[[ "$MIGRATE_FINGERPRINT" != "$REMOTE_MIGRATE" ]] && MIGRATE_CHANGED=true
if [[ "$FORCE_FULL" == true ]]; then
  WEB_CHANGED=true
  API_CHANGED=true
  MIGRATE_CHANGED=true
fi

SYNC_PREVIEW="$(npm run sync:47 2>&1)"
SYNC_CHANGES="$(printf '%s\n' "$SYNC_PREVIEW" | LC_ALL=C sed -n -e '/^\*deleting /p' -e '/^[<>ch\.][^[:space:]]/p')"

echo "Release scope: web=$WEB_CHANGED api=$API_CHANGED migrate=$MIGRATE_CHANGED"
if [[ -n "$SYNC_CHANGES" ]]; then
  printf '%s\n' "$SYNC_CHANGES"
else
  echo "Source sync: no differences"
fi

if [[ "$MODE" == "dry-run" ]]; then
  exit 0
fi

if [[ -n "$SYNC_CHANGES" ]]; then
  npm run sync:47 -- --apply
fi

if [[ "$WEB_CHANGED" == false && "$API_CHANGED" == false && "$MIGRATE_CHANGED" == false ]]; then
  echo "No runtime changes; deployment complete after sync."
  exit 0
fi

ssh -o ConnectTimeout=20 "$REMOTE" bash -s -- \
  "$REMOTE_DIR" "$WEB_CHANGED" "$API_CHANGED" "$MIGRATE_CHANGED" \
  "$WEB_FINGERPRINT" "$API_FINGERPRINT" "$MIGRATE_FINGERPRINT" "$RELEASE_ID" <<'REMOTE_SCRIPT'
set -euo pipefail
REMOTE_DIR="$1"
WEB_CHANGED="$2"
API_CHANGED="$3"
MIGRATE_CHANGED="$4"
WEB_FINGERPRINT="$5"
API_FINGERPRINT="$6"
MIGRATE_FINGERPRINT="$7"
RELEASE_ID="$8"
cd "$REMOTE_DIR"
export VITE_RELEASE_ID="$RELEASE_ID"
export RELEASE_ID="$RELEASE_ID"

failure_logs() {
  echo "Deployment failed; recent service logs:" >&2
  docker compose logs --tail=100 api web >&2 || true
}
trap failure_logs ERR

build_services=()
[[ "$MIGRATE_CHANGED" == true ]] && build_services+=(db-migrate)
[[ "$API_CHANGED" == true ]] && build_services+=(api)
[[ "$WEB_CHANGED" == true ]] && build_services+=(web)
docker compose build "${build_services[@]}"

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

cat > .siyuan-release-state <<STATE
WEB_FINGERPRINT=$WEB_FINGERPRINT
API_FINGERPRINT=$API_FINGERPRINT
MIGRATE_FINGERPRINT=$MIGRATE_FINGERPRINT
RELEASE_ID=$RELEASE_ID
RELEASED_AT=$(date -Iseconds)
STATE
docker compose ps
trap - ERR
REMOTE_SCRIPT

curl --retry 10 --retry-delay 1 --retry-connrefused -fsS "$PUBLIC_URL/api/health"
curl --retry 10 --retry-delay 1 --retry-connrefused -fsS -o /dev/null "$PUBLIC_URL/"
echo
echo "47 deployment completed successfully."
