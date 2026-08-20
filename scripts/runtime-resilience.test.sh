#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECOVERY_SCRIPT="$SCRIPT_DIR/../deploy/47/siyuan-compose-recovery.sh"
UNIT_FILE="$SCRIPT_DIR/../deploy/47/siyuan-compose-recovery.service"
INSTALLER="$SCRIPT_DIR/install-47-runtime-resilience.sh"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-runtime-resilience-test.XXXXXX")"
trap 'rm -rf -- "$tmp_dir"' EXIT INT TERM

cat > "$tmp_dir/docker" <<'FAKE_DOCKER'
#!/usr/bin/env bash
set -eu
state_dir="${FAKE_DOCKER_STATE:?}"
printf '%s\n' "$*" >> "$state_dir/commands"
case "${1:-}" in
  info) exit 0 ;;
  container)
    [ "${2:-}" = inspect ] || exit 2
    name="${3:-}"
    [ -f "$state_dir/$name" ]
    ;;
  inspect)
    name="${4:-}"
    [ "${2:-}" = --format ] || exit 2
    [ -f "$state_dir/$name" ] || exit 1
    cat "$state_dir/$name"
    ;;
  start)
    printf 'true\n' > "$state_dir/$2"
    ;;
  exec)
    if [ "${2:-}" = siyuan-redis-1 ]; then printf 'PONG\n'; fi
    exit 0
    ;;
  port)
    printf '0.0.0.0:18899\n'
    ;;
  *) exit 2 ;;
esac
FAKE_DOCKER
cat > "$tmp_dir/curl" <<'FAKE_CURL'
#!/usr/bin/env bash
exit 0
FAKE_CURL
chmod +x "$tmp_dir/docker" "$tmp_dir/curl"
mkdir -p "$tmp_dir/state"
for service in postgres redis web; do printf 'true\n' > "$tmp_dir/state/siyuan-$service-1"; done
printf 'false\n' > "$tmp_dir/state/siyuan-api-1"

FAKE_DOCKER_STATE="$tmp_dir/state" \
SIYUAN_DOCKER_BIN="$tmp_dir/docker" \
SIYUAN_CURL_BIN="$tmp_dir/curl" \
SIYUAN_RECOVERY_WAIT_SECONDS=2 \
SIYUAN_RECOVERY_POLL_SECONDS=1 \
  bash "$RECOVERY_SCRIPT" > "$tmp_dir/output"

grep -Fxq 'RECOVERY_CONTAINER_STARTED service=api container=siyuan-api-1' "$tmp_dir/output"
grep -Fxq 'SIYUAN_COMPOSE_RECOVERY_STATUS=healthy' "$tmp_dir/output"
grep -Fxq 'start siyuan-api-1' "$tmp_dir/state/commands"
! grep -Eq 'compose (up|build|pull)|container create| run ' "$tmp_dir/state/commands"

grep -Fq 'PartOf=docker.service' "$UNIT_FILE"
grep -Fq 'ExecStart=/usr/local/libexec/siyuan/siyuan-compose-recovery' "$UNIT_FILE"
grep -Fq 'WantedBy=docker.service' "$UNIT_FILE"
grep -Fq 'dockerd --validate --config-file="$candidate_config"' "$INSTALLER"
grep -Fq 'systemctl reload docker' "$INSTALLER"
grep -Fq 'CONTAINERS_UNCHANGED=true' "$INSTALLER"

echo '[runtime-resilience] PASS'
