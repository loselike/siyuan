#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-api-warm-handoff.sh
source "$SCRIPT_DIR/lib/47-api-warm-handoff.sh"

fixture_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-api-warm-handoff-test.XXXXXX")"
trap 'rm -rf -- "$fixture_dir"' EXIT INT TERM
mkdir -p "$fixture_dir/bin"

cat > "$fixture_dir/bin/docker" <<'FAKE_DOCKER'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_DOCKER_LOG"

if [[ "${1:-}" == compose && "${2:-}" == ps && "${3:-}" == -q && "${4:-}" == web ]]; then
  echo web-1
  exit 0
fi
if [[ "${1:-}" == compose && "${2:-}" == ps && "${3:-}" == -q && "${4:-}" == api ]]; then
  [[ -f "$FAKE_DOCKER_STATE/canonical-up" ]] && echo api-new || echo api-old
  exit 0
fi
if [[ "${1:-}" == compose && "${2:-}" == run ]]; then
  echo candidate-id
  exit 0
fi
if [[ "${1:-}" == compose && "${2:-}" == up ]]; then
  touch "$FAKE_DOCKER_STATE/canonical-up"
  exit 0
fi
if [[ "${1:-}" == exec && "${2:-}" == siyuan-api-warm-token-123 && "${3:-}" == node ]]; then
  [[ "${FAIL_CANDIDATE:-false}" != true ]]
  exit
fi
if [[ "${1:-}" == exec && "${2:-}" == api-new && "${3:-}" == node ]]; then
  exit 0
fi
if [[ "${1:-}" == exec && "${2:-}" == web-1 && "${3:-}" == getent ]]; then
  exit 0
fi
if [[ "${1:-}" == exec && "${2:-}" == web-1 && "${3:-}" == nginx ]]; then
  exit 0
fi
if [[ "${1:-}" == exec && "${2:-}" == web-1 && "${3:-}" == wget ]]; then
  current_route="$(sed -n '1p' "$FAKE_DOCKER_STATE/current-route" 2>/dev/null || true)"
  if [[ "$current_route" == candidate && "${FAIL_CANDIDATE_ROUTE:-false}" == true ]]; then
    exit 1
  fi
  [[ "$current_route" == candidate || "$current_route" == canonical ]]
  exit
fi
if [[ "${1:-}" == cp && "${2:-}" == web-1:/etc/nginx/conf.d/default.conf ]]; then
  printf '%s\n' 'location ^~ /api/ {' '  proxy_pass http://api:3001/api/;' '}' > "$3"
  exit 0
fi
if [[ "${1:-}" == cp && "${3:-}" == web-1:/etc/nginx/conf.d/default.conf ]]; then
  if grep -Fq 'siyuan-api-warm-token-123:3001' "$2"; then
    touch "$FAKE_DOCKER_STATE/routed-candidate"
    printf '%s\n' candidate > "$FAKE_DOCKER_STATE/current-route"
  else
    touch "$FAKE_DOCKER_STATE/routed-canonical"
    printf '%s\n' canonical > "$FAKE_DOCKER_STATE/current-route"
  fi
  exit 0
fi
if [[ "${1:-}" == rm && "${2:-}" == -f && "${3:-}" == siyuan-api-warm-token-123 ]]; then
  touch "$FAKE_DOCKER_STATE/candidate-removed"
  exit 0
fi

echo "unexpected fake docker invocation: $*" >&2
exit 91
FAKE_DOCKER
chmod +x "$fixture_dir/bin/docker"

export PATH="$fixture_dir/bin:$PATH"
export FAKE_DOCKER_LOG="$fixture_dir/docker.log"
export FAKE_DOCKER_STATE="$fixture_dir/state"
export SIYUAN_47_API_WARMUP_ATTEMPTS=2
export SIYUAN_47_API_WARMUP_SLEEP_SECONDS=0
export SIYUAN_47_API_ROUTE_ATTEMPTS=2
export SIYUAN_47_API_ROUTE_SLEEP_SECONDS=0
export SIYUAN_47_API_ROUTE_DRAIN_SECONDS=0
mkdir -p "$FAKE_DOCKER_STATE"

siyuan_47_warm_replace_api token-123

[[ -f "$FAKE_DOCKER_STATE/routed-candidate" ]]
[[ -f "$FAKE_DOCKER_STATE/canonical-up" ]]
[[ -f "$FAKE_DOCKER_STATE/routed-canonical" ]]
[[ -f "$FAKE_DOCKER_STATE/candidate-removed" ]]
candidate_route_line="$(grep -n 'cp .*candidate.* web-1:/etc/nginx/conf.d/default.conf' "$FAKE_DOCKER_LOG" | cut -d: -f1 | head -1)"
canonical_up_line="$(grep -n '^compose up .* api$' "$FAKE_DOCKER_LOG" | cut -d: -f1 | head -1)"
canonical_route_line="$(grep -n 'cp .*original.* web-1:/etc/nginx/conf.d/default.conf' "$FAKE_DOCKER_LOG" | cut -d: -f1 | head -1)"
candidate_remove_line="$(grep -n '^rm -f siyuan-api-warm-token-123$' "$FAKE_DOCKER_LOG" | cut -d: -f1 | head -1)"
[[ "$candidate_route_line" -lt "$canonical_up_line" ]]
[[ "$canonical_up_line" -lt "$canonical_route_line" ]]
[[ "$canonical_route_line" -lt "$candidate_remove_line" ]]

rm -f "$FAKE_DOCKER_STATE"/* "$FAKE_DOCKER_LOG"
FAIL_CANDIDATE=true
export FAIL_CANDIDATE
if siyuan_47_warm_replace_api token-123; then
  echo 'candidate health failure must stop the handoff' >&2
  exit 1
fi
[[ ! -f "$FAKE_DOCKER_STATE/canonical-up" ]]
[[ -f "$FAKE_DOCKER_STATE/candidate-removed" ]]
! grep -q '^compose up .* api$' "$FAKE_DOCKER_LOG"

rm -f "$FAKE_DOCKER_STATE"/* "$FAKE_DOCKER_LOG"
unset FAIL_CANDIDATE
FAIL_CANDIDATE_ROUTE=true
export FAIL_CANDIDATE_ROUTE
if siyuan_47_warm_replace_api token-123; then
  echo 'candidate route failure must stop and roll back the handoff' >&2
  exit 1
fi
[[ ! -f "$FAKE_DOCKER_STATE/canonical-up" ]]
[[ -f "$FAKE_DOCKER_STATE/routed-canonical" ]]
[[ -f "$FAKE_DOCKER_STATE/candidate-removed" ]]
! grep -q '^compose up .* api$' "$FAKE_DOCKER_LOG"

echo '[release-api-warm-handoff] PASS'
