#!/usr/bin/env bash

# Shared 47 release-lock helpers. Callers must enable their own strict shell mode.

SIYUAN_47_REMOTE="${SIYUAN_47_REMOTE:-47}"
SIYUAN_47_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
SIYUAN_47_RELEASE_LOCK_DIR="${SIYUAN_47_RELEASE_LOCK_DIR:-${SIYUAN_47_DIR}/.siyuan-release-lock}"
SIYUAN_47_RELEASE_RECOVERY_FILE="${SIYUAN_47_RELEASE_RECOVERY_FILE:-${SIYUAN_47_DIR}/.siyuan-release-recovery-required}"
SIYUAN_47_RELEASE_LOCK_WAIT_SECONDS="${SIYUAN_47_RELEASE_LOCK_WAIT_SECONDS:-900}"
SIYUAN_47_RELEASE_LOCK_POLL_SECONDS="${SIYUAN_47_RELEASE_LOCK_POLL_SECONDS:-10}"
SIYUAN_47_RELEASE_LOCK_HEARTBEAT_SECONDS="${SIYUAN_47_RELEASE_LOCK_HEARTBEAT_SECONDS:-30}"

siyuan_47_release_lock_token() {
  printf '%s\n' "$(hostname):$$:${RANDOM}:$(date +%s%N)" | shasum -a 256 | awk '{print $1}'
}

siyuan_47_release_lock_owner() {
  local branch thread_id
  branch="$(git branch --show-current 2>/dev/null || true)"
  thread_id="${CODEX_THREAD_ID:-manual}"
  printf '%s' "${thread_id}:${branch:-detached}:$(hostname):$$" | tr -cs '[:alnum:]_.:@/-' '_'
}

siyuan_47_release_lock_status() {
  ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
    "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_RECOVERY_FILE" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"
recovery_file="$2"
if [ -f "$recovery_file" ]; then
  echo "RELEASE_RECOVERY_STATUS=required"
  echo "RECOVERY_MARKER_SHA=$(sha256sum "$recovery_file" | awk '{print $1}')"
  sed -n 's/^\(owner\|phase\|recorded_at\)=/RECOVERY_\1=/p' "$recovery_file" | tr '[:lower:]' '[:upper:]'
else
  echo "RELEASE_RECOVERY_STATUS=clear"
fi
if [ ! -d "$lock_dir" ]; then
  echo "RELEASE_LOCK_STATUS=free"
  exit 0
fi
echo "RELEASE_LOCK_STATUS=held"
for field in owner started_at heartbeat_at token; do
  if [ -f "$lock_dir/$field" ]; then
    value="$(sed -n '1p' "$lock_dir/$field")"
    if [ "$field" = "token" ]; then
      value="${value%${value#????????????}}..."
    fi
    printf '%s=%s\n' "$(printf '%s' "$field" | tr '[:lower:]' '[:upper:]')" "$value"
  fi
done
REMOTE_SCRIPT
}

siyuan_47_mark_release_recovery_required() {
  local phase="$1"
  local token="${SIYUAN_47_RELEASE_LOCK_TOKEN:-}"
  local owner="${SIYUAN_47_RELEASE_LOCK_OWNER:-unknown}"
  [[ -n "$token" ]] || return 74
  ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
    "$SIYUAN_47_RELEASE_LOCK_DIR" "$token" "$SIYUAN_47_RELEASE_RECOVERY_FILE" "$owner" "$phase" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"; expected_token="$2"; recovery_file="$3"; owner="$4"; phase="$5"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
[ "$actual_token" = "$expected_token" ] || exit 75
recovery_tmp="$recovery_file.tmp.$expected_token"
cat > "$recovery_tmp" <<RECOVERY
owner=$owner
phase=$phase
recorded_at=$(date -Iseconds)
RECOVERY
mv "$recovery_tmp" "$recovery_file"
echo "RELEASE_RECOVERY_REQUIRED phase=$phase" >&2
REMOTE_SCRIPT
}

siyuan_47_start_release_lock_heartbeat() {
  local token="${SIYUAN_47_RELEASE_LOCK_TOKEN:-}"
  [[ -n "$token" ]] || return 74
  (
    while sleep "$SIYUAN_47_RELEASE_LOCK_HEARTBEAT_SECONDS"; do
      ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
        "$SIYUAN_47_RELEASE_LOCK_DIR" "$token" <<'REMOTE_SCRIPT' >/dev/null 2>&1 || exit
set -eu
lock_dir="$1"
expected_token="$2"
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
[ "$actual_token" = "$expected_token" ] || exit 75
date -Iseconds > "$lock_dir/heartbeat_at"
REMOTE_SCRIPT
    done
  ) &
  export SIYUAN_47_RELEASE_LOCK_HEARTBEAT_PID=$!
}

siyuan_47_stop_release_lock_heartbeat() {
  local heartbeat_pid="${SIYUAN_47_RELEASE_LOCK_HEARTBEAT_PID:-}"
  if [[ -n "$heartbeat_pid" ]]; then
    kill "$heartbeat_pid" 2>/dev/null || true
    wait "$heartbeat_pid" 2>/dev/null || true
    unset SIYUAN_47_RELEASE_LOCK_HEARTBEAT_PID
  fi
}

siyuan_47_verify_release_lock() {
  local token="${SIYUAN_47_RELEASE_LOCK_TOKEN:-}"
  if [[ -z "$token" ]]; then
    echo "47 release lock token is missing; run through deploy:47 or release:47:locked." >&2
    return 74
  fi
  ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
    "$SIYUAN_47_RELEASE_LOCK_DIR" "$token" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"
expected_token="$2"
if [ ! -d "$lock_dir" ] || [ ! -f "$lock_dir/token" ]; then
  echo "47 release lock is not held." >&2
  exit 74
fi
actual_token="$(sed -n '1p' "$lock_dir/token")"
if [ "$actual_token" != "$expected_token" ]; then
  echo "47 release lock is held by another release." >&2
  exit 75
fi
REMOTE_SCRIPT
}

siyuan_47_acquire_release_lock() {
  if [[ -n "${SIYUAN_47_RELEASE_LOCK_TOKEN:-}" ]]; then
    siyuan_47_verify_release_lock
    return
  fi
  if ! [[ "$SIYUAN_47_RELEASE_LOCK_WAIT_SECONDS" =~ ^[0-9]+$ && "$SIYUAN_47_RELEASE_LOCK_POLL_SECONDS" =~ ^[1-9][0-9]*$ && "$SIYUAN_47_RELEASE_LOCK_HEARTBEAT_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
    echo "Release-lock wait, poll and heartbeat values must be valid integers." >&2
    return 64
  fi

  local token owner started_at deadline output status
  token="$(siyuan_47_release_lock_token)"
  owner="$(siyuan_47_release_lock_owner)"
  started_at="$(date -Iseconds)"
  deadline=$(( $(date +%s) + SIYUAN_47_RELEASE_LOCK_WAIT_SECONDS ))

  while true; do
    if output="$(ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
      "$SIYUAN_47_DIR" "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_RECOVERY_FILE" "$token" "$owner" "$started_at" <<'REMOTE_SCRIPT'
set -eu
remote_dir="$1"
lock_dir="$2"
recovery_file="$3"
token="$4"
owner="$5"
started_at="$6"
expected_lock_dir="${remote_dir}/.siyuan-release-lock"
if [ "$lock_dir" != "$expected_lock_dir" ]; then
  echo "Unexpected release lock path: $lock_dir" >&2
  exit 64
fi
if [ -f "$recovery_file" ]; then
  echo "47 release recovery is required before another release may start." >&2
  echo "RECOVERY_MARKER_SHA=$(sha256sum "$recovery_file" | awk '{print $1}')" >&2
  exit 81
fi
if mkdir "$lock_dir" 2>/dev/null; then
  printf '%s\n' "$token" > "$lock_dir/token"
  printf '%s\n' "$owner" > "$lock_dir/owner"
  printf '%s\n' "$started_at" > "$lock_dir/started_at"
  printf '%s\n' "$started_at" > "$lock_dir/heartbeat_at"
  echo "RELEASE_LOCK_ACQUIRED=$owner"
  exit 0
fi
echo "47 release lock is busy:" >&2
for field in owner started_at; do
  if [ -f "$lock_dir/$field" ]; then
    printf '  %s=%s\n' "$field" "$(sed -n '1p' "$lock_dir/$field")" >&2
  fi
done
exit 75
REMOTE_SCRIPT
    )"; then
      export SIYUAN_47_RELEASE_LOCK_TOKEN="$token"
      export SIYUAN_47_RELEASE_LOCK_OWNER="$owner"
      siyuan_47_start_release_lock_heartbeat
      printf '%s\n' "$output"
      return 0
    else
      status=$?
    fi

    if [[ "$status" -ne 75 ]]; then
      printf '%s\n' "$output" >&2
      return "$status"
    fi
    if (( $(date +%s) >= deadline )); then
      printf '%s\n' "$output" >&2
      echo "Timed out waiting for the 47 release queue after ${SIYUAN_47_RELEASE_LOCK_WAIT_SECONDS}s." >&2
      return 75
    fi
    printf '%s\n' "$output" >&2
    echo "Waiting ${SIYUAN_47_RELEASE_LOCK_POLL_SECONDS}s for the 47 release queue..." >&2
    sleep "$SIYUAN_47_RELEASE_LOCK_POLL_SECONDS"
  done
}

siyuan_47_release_release_lock() {
  local token="${SIYUAN_47_RELEASE_LOCK_TOKEN:-}"
  [[ -n "$token" ]] || return 0
  siyuan_47_stop_release_lock_heartbeat
  ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
    "$SIYUAN_47_DIR" "$SIYUAN_47_RELEASE_LOCK_DIR" "$token" <<'REMOTE_SCRIPT'
set -eu
remote_dir="$1"
lock_dir="$2"
expected_token="$3"
expected_lock_dir="${remote_dir}/.siyuan-release-lock"
if [ "$lock_dir" != "$expected_lock_dir" ]; then
  echo "Unexpected release lock path: $lock_dir" >&2
  exit 64
fi
if [ ! -d "$lock_dir" ]; then
  exit 0
fi
actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
if [ "$actual_token" != "$expected_token" ]; then
  echo "Release lock ownership changed; refusing to remove it." >&2
  exit 75
fi
rm -f "$lock_dir/token" "$lock_dir/owner" "$lock_dir/started_at" "$lock_dir/heartbeat_at"
rmdir "$lock_dir"
REMOTE_SCRIPT
  unset SIYUAN_47_RELEASE_LOCK_TOKEN SIYUAN_47_RELEASE_LOCK_OWNER
}
