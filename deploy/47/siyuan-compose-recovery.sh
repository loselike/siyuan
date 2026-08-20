#!/usr/bin/env bash
set -euo pipefail

DOCKER_BIN="${SIYUAN_DOCKER_BIN:-docker}"
CURL_BIN="${SIYUAN_CURL_BIN:-curl}"
WAIT_SECONDS="${SIYUAN_RECOVERY_WAIT_SECONDS:-120}"
POLL_SECONDS="${SIYUAN_RECOVERY_POLL_SECONDS:-2}"
PROJECT_NAME="${SIYUAN_COMPOSE_PROJECT:-siyuan}"

if ! [[ "$WAIT_SECONDS" =~ ^[1-9][0-9]*$ && "$POLL_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
  echo "Recovery wait and poll values must be positive integers." >&2
  exit 64
fi

container_name() {
  printf '%s-%s-1' "$PROJECT_NAME" "$1"
}

container_exists() {
  "$DOCKER_BIN" container inspect "$(container_name "$1")" >/dev/null 2>&1
}

container_running() {
  [[ "$("$DOCKER_BIN" inspect --format '{{.State.Running}}' "$(container_name "$1")" 2>/dev/null || true)" == true ]]
}

start_existing_container() {
  local service="$1" name
  name="$(container_name "$service")"
  if ! container_exists "$service"; then
    echo "RECOVERY_CONTAINER_MISSING service=$service container=$name" >&2
    return 82
  fi
  if ! container_running "$service"; then
    "$DOCKER_BIN" start "$name" >/dev/null
    echo "RECOVERY_CONTAINER_STARTED service=$service container=$name"
  fi
}

wait_until() {
  local label="$1"
  shift
  local deadline=$((SECONDS + WAIT_SECONDS))
  while (( SECONDS < deadline )); do
    if "$@" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$POLL_SECONDS"
  done
  echo "RECOVERY_READINESS_TIMEOUT target=$label seconds=$WAIT_SECONDS" >&2
  return 83
}

docker_ready() {
  "$DOCKER_BIN" info >/dev/null 2>&1
}

postgres_ready() {
  "$DOCKER_BIN" exec "$(container_name postgres)" sh -c \
    'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1
}

redis_ready() {
  "$DOCKER_BIN" exec "$(container_name redis)" redis-cli ping 2>/dev/null | grep -Fxq PONG
}

api_ready() {
  "$DOCKER_BIN" exec "$(container_name api)" node -e \
    "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" \
    >/dev/null 2>&1
}

web_ready() {
  local port_line host_port
  port_line="$("$DOCKER_BIN" port "$(container_name web)" 80/tcp 2>/dev/null | sed -n '1p')"
  host_port="${port_line##*:}"
  [[ "$host_port" =~ ^[1-9][0-9]*$ ]] || return 1
  "$CURL_BIN" -fsS --max-time 5 "http://127.0.0.1:${host_port}/" >/dev/null
}

wait_until docker docker_ready

start_existing_container postgres
start_existing_container redis
wait_until postgres postgres_ready
wait_until redis redis_ready

start_existing_container api
wait_until api api_ready

start_existing_container web
wait_until web web_ready

for service in postgres redis api web; do
  container_running "$service" || {
    echo "RECOVERY_CONTAINER_NOT_RUNNING service=$service" >&2
    exit 83
  }
done

echo "SIYUAN_COMPOSE_RECOVERY_STATUS=healthy"
