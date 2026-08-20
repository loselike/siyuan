#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"

MODE=status
CONFIRM_LIVE_RESTORE=false
RECOVERY_SCRIPT="$SCRIPT_DIR/../deploy/47/siyuan-compose-recovery.sh"
RECOVERY_UNIT="$SCRIPT_DIR/../deploy/47/siyuan-compose-recovery.service"
REMOTE_MUTATION_STARTED=false
FAILURE_PHASE=runtime-resilience-install

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --status) MODE=status ;;
    --apply) MODE=apply ;;
    --confirm-live-restore) CONFIRM_LIVE_RESTORE=true ;;
    *)
      echo "Usage: npm run release:47:resilience -- [--status | --apply --confirm-live-restore]" >&2
      exit 2
      ;;
  esac
  shift
done

for file in "$RECOVERY_SCRIPT" "$RECOVERY_UNIT"; do
  [[ -f "$file" && ! -L "$file" ]] || {
    echo "Runtime resilience artifact is missing or is a symlink: $file" >&2
    exit 2
  }
done

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

EXPECTED_SCRIPT_SHA="$(sha256_file "$RECOVERY_SCRIPT")"
EXPECTED_UNIT_SHA="$(sha256_file "$RECOVERY_UNIT")"

remote_status() {
  siyuan_47_ssh "$SIYUAN_47_REMOTE" bash -s -- \
    "$EXPECTED_SCRIPT_SHA" "$EXPECTED_UNIT_SHA" <<'REMOTE_SCRIPT'
set -euo pipefail
expected_script_sha="$1"
expected_unit_sha="$2"
script_path=/usr/local/libexec/siyuan/siyuan-compose-recovery
unit_path=/etc/systemd/system/siyuan-compose-recovery.service
daemon_config=/etc/docker/daemon.json

echo "DOCKER_ACTIVE=$(systemctl is-active docker 2>/dev/null || true)"
echo "DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || true)"
echo "DOCKER_LIVE_RESTORE=$(docker info --format '{{.LiveRestoreEnabled}}' 2>/dev/null || true)"
echo "RECOVERY_UNIT_ENABLED=$(systemctl is-enabled siyuan-compose-recovery.service 2>/dev/null || true)"
echo "RECOVERY_UNIT_ACTIVE=$(systemctl is-active siyuan-compose-recovery.service 2>/dev/null || true)"
if [ -f "$daemon_config" ] && [ ! -L "$daemon_config" ]; then
  python3 - "$daemon_config" <<'PY'
import json
import sys
with open(sys.argv[1], encoding="utf-8") as handle:
    config = json.load(handle)
print(f"DAEMON_CONFIG_LIVE_RESTORE={str(config.get('live-restore', False)).lower()}")
print(f"DAEMON_CONFIG_DATA_ROOT={config.get('data-root', '')}")
PY
else
  echo "DAEMON_CONFIG_LIVE_RESTORE=missing"
  echo "DAEMON_CONFIG_DATA_ROOT="
fi
for label in SCRIPT UNIT; do
  if [ "$label" = SCRIPT ]; then
    path="$script_path"; expected="$expected_script_sha"
  else
    path="$unit_path"; expected="$expected_unit_sha"
  fi
  if [ -f "$path" ] && [ ! -L "$path" ]; then
    actual="$(sha256sum "$path" | awk '{print $1}')"
  else
    actual=MISSING
  fi
  echo "RECOVERY_${label}_SHA=$actual"
  if [ "$actual" = "$expected" ]; then
    echo "RECOVERY_${label}_MATCH=true"
  else
    echo "RECOVERY_${label}_MATCH=false"
  fi
done
for service in postgres redis api web; do
  name="siyuan-$service-1"
  echo "CONTAINER_${service^^}_STATE=$(docker inspect --format '{{.State.Status}}' "$name" 2>/dev/null || echo missing)"
done
REMOTE_SCRIPT
}

if [[ "$MODE" == status ]]; then
  remote_status
  exit 0
fi

if [[ "$CONFIRM_LIVE_RESTORE" != true ]]; then
  echo "Applying Docker live restore requires --confirm-live-restore." >&2
  exit 2
fi

cleanup_release_lock() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [[ "$exit_code" -ne 0 && "$REMOTE_MUTATION_STARTED" == true ]]; then
    siyuan_47_mark_release_recovery_required "$FAILURE_PHASE" || true
  fi
  set +e
  siyuan_47_release_release_lock
  local unlock_exit=$?
  set -e
  if [[ "$unlock_exit" -ne 0 && "$exit_code" -eq 0 ]]; then
    exit_code="$unlock_exit"
  fi
  exit "$exit_code"
}

siyuan_47_acquire_release_lock
trap cleanup_release_lock EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

stage_suffix="${SIYUAN_47_RELEASE_LOCK_TOKEN:0:16}"
remote_script_stage="/tmp/siyuan-compose-recovery.$stage_suffix"
remote_unit_stage="/tmp/siyuan-compose-recovery.$stage_suffix.service"
siyuan_47_scp -q "$RECOVERY_SCRIPT" "$SIYUAN_47_REMOTE:$remote_script_stage"
siyuan_47_scp -q "$RECOVERY_UNIT" "$SIYUAN_47_REMOTE:$remote_unit_stage"

REMOTE_MUTATION_STARTED=true
siyuan_47_ssh "$SIYUAN_47_REMOTE" bash -s -- \
  "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_LOCK_TOKEN" \
  "$remote_script_stage" "$EXPECTED_SCRIPT_SHA" "$remote_unit_stage" "$EXPECTED_UNIT_SHA" <<'REMOTE_SCRIPT'
set -euo pipefail
lock_dir="$1"
expected_token="$2"
script_stage="$3"
expected_script_sha="$4"
unit_stage="$5"
expected_unit_sha="$6"

daemon_config=/etc/docker/daemon.json
script_path=/usr/local/libexec/siyuan/siyuan-compose-recovery
unit_path=/etc/systemd/system/siyuan-compose-recovery.service
state_root=/var/lib/siyuan-release-resilience
backup_root="$state_root/backups"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="$backup_root/$timestamp"
candidate_config="/tmp/siyuan-daemon.$expected_token.json"
rollback_required=false
previous_unit_enabled=false

cleanup_stage() {
  rm -f -- "$script_stage" "$unit_stage" "$candidate_config"
}

restore_path() {
  local backup="$1" target="$2" mode="$3"
  if [ -f "$backup" ]; then
    install -D -m "$mode" "$backup" "$target"
  else
    rm -f -- "$target"
  fi
}

rollback() {
  local status=$?
  trap - EXIT
  set +e
  if [ "$status" -ne 0 ] && [ "$rollback_required" = true ]; then
    restore_path "$backup_dir/daemon.json" "$daemon_config" 0644
    restore_path "$backup_dir/siyuan-compose-recovery" "$script_path" 0755
    restore_path "$backup_dir/siyuan-compose-recovery.service" "$unit_path" 0644
    systemctl daemon-reload
    if [ "$previous_unit_enabled" = true ]; then
      systemctl enable siyuan-compose-recovery.service >/dev/null 2>&1
    else
      systemctl disable --now siyuan-compose-recovery.service >/dev/null 2>&1
    fi
    dockerd --validate --config-file="$daemon_config" >/dev/null 2>&1 && systemctl reload docker
    echo "RUNTIME_RESILIENCE_ROLLBACK=attempted" >&2
  fi
  cleanup_stage
  exit "$status"
}
trap rollback EXIT

actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
[ "$actual_token" = "$expected_token" ] || exit 75
[ "$(id -u)" -eq 0 ] || { echo "Runtime resilience install requires root on 47." >&2; exit 77; }
[ "$state_root" = /var/lib/siyuan-release-resilience ] || exit 77
[ -f "$script_stage" ] && [ ! -L "$script_stage" ]
[ -f "$unit_stage" ] && [ ! -L "$unit_stage" ]
[ "$(sha256sum "$script_stage" | awk '{print $1}')" = "$expected_script_sha" ]
[ "$(sha256sum "$unit_stage" | awk '{print $1}')" = "$expected_unit_sha" ]
[ ! -L "$daemon_config" ] || { echo "Docker daemon config must not be a symlink." >&2; exit 77; }
command -v python3 >/dev/null
command -v dockerd >/dev/null
command -v systemd-analyze >/dev/null

for service in postgres redis api web; do
  docker container inspect "siyuan-$service-1" >/dev/null
done
before_snapshot="$({
  for service in postgres redis api web; do
    docker inspect --format '{{.Id}}|{{.State.StartedAt}}' "siyuan-$service-1"
  done
} | sha256sum | awk '{print $1}')"

python3 - "$daemon_config" "$candidate_config" <<'PY'
import json
import os
import sys

source, target = sys.argv[1:]
config = {}
if os.path.exists(source):
    with open(source, encoding="utf-8") as handle:
        config = json.load(handle)
if not isinstance(config, dict):
    raise SystemExit("Docker daemon config must be a JSON object")
config["live-restore"] = True
with open(target, "w", encoding="utf-8") as handle:
    json.dump(config, handle, ensure_ascii=False, indent=2, sort_keys=True)
    handle.write("\n")
PY
chmod 0600 "$candidate_config"
dockerd --validate --config-file="$candidate_config" >/dev/null

install -d -m 0700 "$backup_dir"
[ -f "$daemon_config" ] && cp -a "$daemon_config" "$backup_dir/daemon.json"
[ -f "$script_path" ] && cp -a "$script_path" "$backup_dir/siyuan-compose-recovery"
[ -f "$unit_path" ] && cp -a "$unit_path" "$backup_dir/siyuan-compose-recovery.service"
systemctl is-enabled siyuan-compose-recovery.service >/dev/null 2>&1 && previous_unit_enabled=true
rollback_required=true

install -D -m 0755 "$script_stage" "$script_path"
systemd-analyze verify "$unit_stage" >/dev/null
install -D -m 0644 "$unit_stage" "$unit_path"
install -m 0644 "$candidate_config" "$daemon_config"
systemctl daemon-reload
systemctl enable siyuan-compose-recovery.service >/dev/null
systemctl reload docker

[ "$(docker info --format '{{.LiveRestoreEnabled}}')" = true ] || {
  echo "Docker did not enable live restore after daemon reload." >&2
  exit 83
}
systemctl restart siyuan-compose-recovery.service
[ "$(systemctl is-enabled siyuan-compose-recovery.service)" = enabled ]
[ "$(systemctl is-active siyuan-compose-recovery.service)" = active ]

after_snapshot="$({
  for service in postgres redis api web; do
    docker inspect --format '{{.Id}}|{{.State.StartedAt}}' "siyuan-$service-1"
  done
} | sha256sum | awk '{print $1}')"
[ "$before_snapshot" = "$after_snapshot" ] || {
  echo "Container identity or start time changed while enabling live restore." >&2
  exit 83
}

docker exec siyuan-api-1 node -e \
  "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
host_port="$(docker port siyuan-web-1 80/tcp | sed -n '1p')"
host_port="${host_port##*:}"
curl -fsS --max-time 5 "http://127.0.0.1:${host_port}/" >/dev/null

printf 'installed_at=%s\nscript_sha=%s\nunit_sha=%s\nbackup=%s\n' \
  "$(date -Iseconds)" "$expected_script_sha" "$expected_unit_sha" "$backup_dir" \
  > "$state_root/installed.env"
chmod 0600 "$state_root/installed.env"

mapfile -t backups < <(find "$backup_root" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | LC_ALL=C sort -r)
if (( ${#backups[@]} > 3 )); then
  for old_name in "${backups[@]:3}"; do
    old_path="$backup_root/$old_name"
    case "$old_path" in
      /var/lib/siyuan-release-resilience/backups/*) rm -rf -- "$old_path" ;;
      *) echo "Refusing unsafe resilience backup cleanup: $old_path" >&2; exit 77 ;;
    esac
  done
fi

rollback_required=false
echo "RUNTIME_RESILIENCE_INSTALL=complete"
echo "DOCKER_LIVE_RESTORE=true"
echo "CONTAINERS_UNCHANGED=true"
echo "RECOVERY_UNIT=enabled-active"
REMOTE_SCRIPT

REMOTE_MUTATION_STARTED=false
remote_status
