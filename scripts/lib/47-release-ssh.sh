#!/usr/bin/env bash

# Shared SSH transport policy for 47 release commands. Callers enable strict
# shell mode. Keepalives detect a dead transport; phase output from the remote
# release script keeps long-running builds observable without exposing data.
# Remote commands are bounded on the server so a lost client cannot leave the
# build, migration, restart, or state writer running indefinitely.

SIYUAN_47_SSH_CONNECT_TIMEOUT_SECONDS="${SIYUAN_47_SSH_CONNECT_TIMEOUT_SECONDS:-20}"
SIYUAN_47_SSH_SERVER_ALIVE_INTERVAL_SECONDS="${SIYUAN_47_SSH_SERVER_ALIVE_INTERVAL_SECONDS:-15}"
SIYUAN_47_SSH_SERVER_ALIVE_COUNT_MAX="${SIYUAN_47_SSH_SERVER_ALIVE_COUNT_MAX:-4}"
SIYUAN_47_BUILD_TIMEOUT_SECONDS="${SIYUAN_47_BUILD_TIMEOUT_SECONDS:-1800}"
SIYUAN_47_MIGRATION_TIMEOUT_SECONDS="${SIYUAN_47_MIGRATION_TIMEOUT_SECONDS:-900}"
SIYUAN_47_REMOTE_RELEASE_TIMEOUT_SECONDS="${SIYUAN_47_REMOTE_RELEASE_TIMEOUT_SECONDS:-3600}"
SIYUAN_47_REMOTE_STATE_TIMEOUT_SECONDS="${SIYUAN_47_REMOTE_STATE_TIMEOUT_SECONDS:-300}"
SIYUAN_47_SSH_CHANNEL_IDLE_TIMEOUT_SECONDS="${SIYUAN_47_SSH_CHANNEL_IDLE_TIMEOUT_SECONDS:-300}"

siyuan_47_validate_release_ssh_policy() {
  if ! [[ "$SIYUAN_47_SSH_CONNECT_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ \
    && "$SIYUAN_47_SSH_SERVER_ALIVE_INTERVAL_SECONDS" =~ ^[1-9][0-9]*$ \
    && "$SIYUAN_47_SSH_SERVER_ALIVE_COUNT_MAX" =~ ^[1-9][0-9]*$ ]]; then
    echo "47 SSH timeout and keepalive settings must be positive integers." >&2
    return 64
  fi
}

siyuan_47_ssh() {
  siyuan_47_validate_release_ssh_policy || return
  command ssh \
    -o "ConnectTimeout=$SIYUAN_47_SSH_CONNECT_TIMEOUT_SECONDS" \
    -o "ServerAliveInterval=$SIYUAN_47_SSH_SERVER_ALIVE_INTERVAL_SECONDS" \
    -o "ServerAliveCountMax=$SIYUAN_47_SSH_SERVER_ALIVE_COUNT_MAX" \
    "$@"
}

siyuan_47_scp() {
  siyuan_47_validate_release_ssh_policy || return
  command scp \
    -o "ConnectTimeout=$SIYUAN_47_SSH_CONNECT_TIMEOUT_SECONDS" \
    -o "ServerAliveInterval=$SIYUAN_47_SSH_SERVER_ALIVE_INTERVAL_SECONDS" \
    -o "ServerAliveCountMax=$SIYUAN_47_SSH_SERVER_ALIVE_COUNT_MAX" \
    "$@"
}

siyuan_47_ssh_bounded_remote() {
  local timeout_seconds="$1"
  local remote="$2"
  shift 2
  if ! [[ "$timeout_seconds" =~ ^[1-9][0-9]*$ \
    && "$SIYUAN_47_SSH_CHANNEL_IDLE_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
    echo "47 remote command and SSH channel timeouts must be positive integers." >&2
    return 64
  fi
  if ! command ssh -G -o "ChannelTimeout=session=${SIYUAN_47_SSH_CHANNEL_IDLE_TIMEOUT_SECONDS}s" \
    "$remote" </dev/null 2>/dev/null | grep -Fxq \
    "channeltimeout session=${SIYUAN_47_SSH_CHANNEL_IDLE_TIMEOUT_SECONDS}s"; then
    echo "Local OpenSSH does not support the required ChannelTimeout policy." >&2
    return 64
  fi
  siyuan_47_ssh -o "ChannelTimeout=session=${SIYUAN_47_SSH_CHANNEL_IDLE_TIMEOUT_SECONDS}s" \
    "$remote" timeout --signal=TERM --kill-after=60 "$timeout_seconds" "$@"
}

siyuan_47_release_phase() {
  local phase="$1"
  printf 'RELEASE_PHASE=%s RELEASE_PHASE_AT=%s\n' "$phase" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

siyuan_47_record_release_phase() {
  local phase="$1"
  local lock_dir="$2"
  local expected_token="$3"
  local actual_token phase_tmp
  if ! [[ "$phase" =~ ^[a-z0-9-]+$ ]]; then
    echo "47 release phase contains unsupported characters." >&2
    return 64
  fi
  actual_token="$(sed -n '1p' "$lock_dir/token" 2>/dev/null || true)"
  if [[ "$actual_token" != "$expected_token" ]]; then
    echo "47 release lock ownership changed before phase update: $phase" >&2
    return 75
  fi
  phase_tmp="$lock_dir/phase.tmp.$expected_token"
  printf '%s\n' "$phase" > "$phase_tmp"
  mv "$phase_tmp" "$lock_dir/phase"
  siyuan_47_release_phase "$phase"
}

siyuan_47_run_bounded_build() {
  if ! [[ "$SIYUAN_47_BUILD_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
    echo "SIYUAN_47_BUILD_TIMEOUT_SECONDS must be a positive integer." >&2
    return 64
  fi
  local status=0
  command timeout --signal=TERM --kill-after=60 \
    "$SIYUAN_47_BUILD_TIMEOUT_SECONDS" "$@" || status=$?
  if [[ "$status" -eq 124 || "$status" -eq 137 ]]; then
    echo "RELEASE_BUILD_TIMEOUT seconds=$SIYUAN_47_BUILD_TIMEOUT_SECONDS" >&2
  fi
  return "$status"
}

siyuan_47_run_bounded_migration() {
  if ! [[ "$SIYUAN_47_MIGRATION_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
    echo "SIYUAN_47_MIGRATION_TIMEOUT_SECONDS must be a positive integer." >&2
    return 64
  fi
  local status=0
  command timeout --signal=TERM --kill-after=60 \
    "$SIYUAN_47_MIGRATION_TIMEOUT_SECONDS" "$@" || status=$?
  if [[ "$status" -eq 124 || "$status" -eq 137 ]]; then
    echo "RELEASE_MIGRATION_TIMEOUT seconds=$SIYUAN_47_MIGRATION_TIMEOUT_SECONDS manual_database_verification=required" >&2
  fi
  return "$status"
}
