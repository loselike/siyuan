#!/usr/bin/env bash

# Replace the canonical API without exposing Nginx to an unready upstream.
# The caller must already hold the global 47 release lock and export the new
# Compose image/release environment.

siyuan_47_wait_api_container_ready() {
  local container="$1"
  local attempts="${SIYUAN_47_API_WARMUP_ATTEMPTS:-45}"
  local sleep_seconds="${SIYUAN_47_API_WARMUP_SLEEP_SECONDS:-2}"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if docker exec "$container" node -e \
      "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" \
      </dev/null >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_seconds"
  done
  return 1
}

siyuan_47_verify_web_api_route() {
  local web_container="$1"
  local attempts="${SIYUAN_47_API_ROUTE_ATTEMPTS:-30}"
  local sleep_seconds="${SIYUAN_47_API_ROUTE_SLEEP_SECONDS:-0.2}"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if docker exec "$web_container" wget -q -O /dev/null http://127.0.0.1/api/health \
      </dev/null >/dev/null 2>&1; then
      return 0
    fi
    sleep "$sleep_seconds"
  done
  return 1
}

siyuan_47_warm_replace_api() {
  local lock_token="$1"
  local safe_token
  safe_token="$(printf '%s' "$lock_token" | tr -cd '[:alnum:]_.-')"
  [[ -n "$safe_token" ]] || { echo "API_WARM_HANDOFF_TOKEN_INVALID" >&2; return 64; }
  local candidate="siyuan-api-warm-${safe_token:0:48}"
  local web_container old_api canonical_api work_dir original_conf candidate_conf
  web_container="$(docker compose ps -q web)"
  old_api="$(docker compose ps -q api)"
  [[ -n "$web_container" && -n "$old_api" ]] || {
    echo "API_WARM_HANDOFF_BASELINE_MISSING" >&2
    return 69
  }

  work_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-api-warm-handoff.XXXXXX")"
  original_conf="$work_dir/original-nginx.conf"
  candidate_conf="$work_dir/candidate-nginx.conf"

  # Before Nginx is switched, every failure path removes the unused candidate
  # and leaves the existing canonical API untouched.
  docker compose run -d --no-deps --name "$candidate" api </dev/null >/dev/null
  if ! siyuan_47_wait_api_container_ready "$candidate"; then
    echo "API_WARM_HANDOFF_CANDIDATE_UNHEALTHY" >&2
    docker rm -f "$candidate" >/dev/null 2>&1 || true
    rm -rf -- "$work_dir"
    return 1
  fi
  if ! docker exec "$web_container" getent hosts "$candidate" </dev/null >/dev/null 2>&1; then
    echo "API_WARM_HANDOFF_CANDIDATE_UNRESOLVABLE" >&2
    docker rm -f "$candidate" >/dev/null 2>&1 || true
    rm -rf -- "$work_dir"
    return 1
  fi

  docker cp "$web_container:/etc/nginx/conf.d/default.conf" "$original_conf"
  sed "s#proxy_pass http://api:3001/api/;#proxy_pass http://${candidate}:3001/api/;#" \
    "$original_conf" > "$candidate_conf"
  if [[ "$(grep -Fc "proxy_pass http://${candidate}:3001/api/;" "$candidate_conf")" -ne 1 ]] \
    || grep -Fq 'proxy_pass http://api:3001/api/;' "$candidate_conf"; then
    echo "API_WARM_HANDOFF_PROXY_REWRITE_REFUSED" >&2
    docker rm -f "$candidate" >/dev/null 2>&1 || true
    rm -rf -- "$work_dir"
    return 1
  fi

  docker cp "$candidate_conf" "$web_container:/etc/nginx/conf.d/default.conf"
  if ! docker exec "$web_container" nginx -t </dev/null >/dev/null 2>&1; then
    docker cp "$original_conf" "$web_container:/etc/nginx/conf.d/default.conf" >/dev/null
    docker rm -f "$candidate" >/dev/null 2>&1 || true
    rm -rf -- "$work_dir"
    echo "API_WARM_HANDOFF_NGINX_CONFIG_INVALID" >&2
    return 1
  fi
  docker exec "$web_container" nginx -s reload </dev/null >/dev/null
  if ! siyuan_47_verify_web_api_route "$web_container"; then
    # The canonical API has not been touched yet, so a failed temporary route
    # can be rolled back without entering release recovery.
    docker cp "$original_conf" "$web_container:/etc/nginx/conf.d/default.conf" >/dev/null
    docker exec "$web_container" nginx -t </dev/null >/dev/null 2>&1 || true
    docker exec "$web_container" nginx -s reload </dev/null >/dev/null 2>&1 || true
    docker rm -f "$candidate" >/dev/null 2>&1 || true
    echo "API_WARM_HANDOFF_CANDIDATE_ROUTE_UNHEALTHY" >&2
    rm -rf -- "$work_dir"
    return 1
  fi

  docker compose up -d --no-build --pull never --no-deps api </dev/null
  canonical_api="$(docker compose ps -q api)"
  if [[ -z "$canonical_api" || "$canonical_api" == "$old_api" ]]; then
    echo "API_WARM_HANDOFF_CANONICAL_NOT_REPLACED" >&2
    rm -rf -- "$work_dir"
    return 1
  fi
  if ! siyuan_47_wait_api_container_ready "$canonical_api"; then
    echo "API_WARM_HANDOFF_CANONICAL_UNHEALTHY" >&2
    rm -rf -- "$work_dir"
    return 1
  fi

  docker cp "$original_conf" "$web_container:/etc/nginx/conf.d/default.conf"
  if ! docker exec "$web_container" nginx -t </dev/null >/dev/null 2>&1; then
    echo "API_WARM_HANDOFF_CANONICAL_CONFIG_INVALID" >&2
    rm -rf -- "$work_dir"
    return 1
  fi
  docker exec "$web_container" nginx -s reload </dev/null >/dev/null
  if ! siyuan_47_verify_web_api_route "$web_container"; then
    echo "API_WARM_HANDOFF_CANONICAL_ROUTE_UNHEALTHY" >&2
    rm -rf -- "$work_dir"
    return 1
  fi

  # Give graceful Nginx workers time to drain requests already sent to the
  # candidate before removing it.
  sleep "${SIYUAN_47_API_ROUTE_DRAIN_SECONDS:-1}"
  docker rm -f "$candidate" >/dev/null
  if ! siyuan_47_verify_web_api_route "$web_container"; then
    echo "API_WARM_HANDOFF_POST_DRAIN_ROUTE_UNHEALTHY" >&2
    rm -rf -- "$work_dir"
    return 1
  fi
  rm -rf -- "$work_dir"
}
