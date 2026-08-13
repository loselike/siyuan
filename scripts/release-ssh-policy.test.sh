#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-ssh.sh
source "$SCRIPT_DIR/lib/47-release-ssh.sh"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-release-ssh-test.XXXXXX")"
trap 'rm -rf -- "$tmp_dir"' EXIT INT TERM
fake_bin="$tmp_dir/bin"
mkdir -p "$fake_bin"

cat > "$fake_bin/ssh" <<'FAKE_SSH'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$SIYUAN_FAKE_SSH_ARGS"
if [[ "${SIYUAN_FAKE_SSH_EXEC:-false}" == true ]]; then
  while [[ "${1:-}" == -o ]]; do
    shift 2
  done
  shift
  exec "$@"
fi
if [[ " ${*} " == *' -G '* ]]; then
  printf 'channeltimeout session=%ss\n' "${SIYUAN_47_SSH_CHANNEL_IDLE_TIMEOUT_SECONDS:-300}"
fi
FAKE_SSH
cat > "$fake_bin/scp" <<'FAKE_SCP'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$SIYUAN_FAKE_SCP_ARGS"
FAKE_SCP
cat > "$fake_bin/timeout" <<'FAKE_TIMEOUT'
#!/usr/bin/env bash
printf '%s\n' "$@" > "$SIYUAN_FAKE_TIMEOUT_ARGS"
exit "${SIYUAN_FAKE_TIMEOUT_STATUS:-0}"
FAKE_TIMEOUT
chmod +x "$fake_bin/ssh" "$fake_bin/scp" "$fake_bin/timeout"

export PATH="$fake_bin:$PATH"
export SIYUAN_FAKE_SSH_ARGS="$tmp_dir/ssh.args"
export SIYUAN_FAKE_SCP_ARGS="$tmp_dir/scp.args"
export SIYUAN_FAKE_TIMEOUT_ARGS="$tmp_dir/timeout.args"

siyuan_47_ssh release-host bash -s -- sample
siyuan_47_scp -q source.bundle release-host:/tmp/source.bundle

grep -Fxq 'ConnectTimeout=20' "$tmp_dir/ssh.args"
grep -Fxq 'ServerAliveInterval=15' "$tmp_dir/ssh.args"
grep -Fxq 'ServerAliveCountMax=4' "$tmp_dir/ssh.args"
grep -Fxq 'release-host' "$tmp_dir/ssh.args"
grep -Fxq 'ServerAliveInterval=15' "$tmp_dir/scp.args"
grep -Fxq 'source.bundle' "$tmp_dir/scp.args"

if SIYUAN_47_SSH_SERVER_ALIVE_INTERVAL_SECONDS=invalid bash -c \
  'source "$1"; siyuan_47_ssh host true' _ "$SCRIPT_DIR/lib/47-release-ssh.sh" \
  2>"$tmp_dir/invalid"; then
  echo 'invalid keepalive policy was accepted' >&2
  exit 1
fi
grep -q 'must be positive integers' "$tmp_dir/invalid"

phase_output="$(siyuan_47_release_phase build-start)"
[[ "$phase_output" =~ ^RELEASE_PHASE=build-start\ RELEASE_PHASE_AT=[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]

lock_dir="$tmp_dir/release-lock"
mkdir -p "$lock_dir"
printf '%s\n' expected-token > "$lock_dir/token"
record_output="$(siyuan_47_record_release_phase build-start "$lock_dir" expected-token)"
grep -Fxq build-start "$lock_dir/phase"
[[ "$record_output" == RELEASE_PHASE=build-start* ]]
if siyuan_47_record_release_phase build-complete "$lock_dir" wrong-token 2>"$tmp_dir/phase-error"; then
  echo 'phase update accepted the wrong release lock token' >&2
  exit 1
fi
grep -q 'ownership changed' "$tmp_dir/phase-error"

export SIYUAN_FAKE_TIMEOUT_STATUS=124
if SIYUAN_47_BUILD_TIMEOUT_SECONDS=1 siyuan_47_run_bounded_build docker compose build \
  2>"$tmp_dir/build-timeout"; then
  echo 'bounded build accepted a timeout status' >&2
  exit 1
else
  build_status=$?
fi
[[ "$build_status" -eq 124 ]]
grep -Fxq -- '--signal=TERM' "$tmp_dir/timeout.args"
grep -Fxq -- '--kill-after=60' "$tmp_dir/timeout.args"
grep -Fxq '1' "$tmp_dir/timeout.args"
grep -Fxq 'docker' "$tmp_dir/timeout.args"
grep -q 'RELEASE_BUILD_TIMEOUT seconds=1' "$tmp_dir/build-timeout"

export SIYUAN_FAKE_TIMEOUT_STATUS=0
siyuan_47_ssh_bounded_remote 3600 release-host bash -s -- sample
grep -Fxq 'timeout' "$tmp_dir/ssh.args"
grep -Fxq -- '--signal=TERM' "$tmp_dir/ssh.args"
grep -Fxq -- '--kill-after=60' "$tmp_dir/ssh.args"
grep -Fxq '3600' "$tmp_dir/ssh.args"
grep -Fxq 'ChannelTimeout=session=300s' "$tmp_dir/ssh.args"
if siyuan_47_ssh_bounded_remote invalid release-host true 2>"$tmp_dir/remote-timeout-error"; then
  echo 'invalid remote command timeout was accepted' >&2
  exit 1
fi
grep -q 'must be positive integers' "$tmp_dir/remote-timeout-error"

export SIYUAN_FAKE_TIMEOUT_STATUS=124
if SIYUAN_47_MIGRATION_TIMEOUT_SECONDS=1 siyuan_47_run_bounded_migration docker compose run db-migrate \
  2>"$tmp_dir/migration-timeout"; then
  echo 'bounded migration accepted a timeout status' >&2
  exit 1
else
  migration_status=$?
fi
[[ "$migration_status" -eq 124 ]]
grep -q 'RELEASE_MIGRATION_TIMEOUT seconds=1 manual_database_verification=required' "$tmp_dir/migration-timeout"

export SIYUAN_47_RELEASE_LOCK_DIR="$lock_dir"
export SIYUAN_47_RELEASE_RECOVERY_FILE="$tmp_dir/recovery-required"
export SIYUAN_47_RELEASE_LOCK_TOKEN=expected-token
export SIYUAN_47_RELEASE_LOCK_OWNER=test-owner
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"
printf '%s\n' health-complete > "$lock_dir/phase"
export SIYUAN_FAKE_SSH_EXEC=true
siyuan_47_mark_release_recovery_required caller-phase 2>"$tmp_dir/recovery-error"
grep -Fxq 'phase=caller-phase' "$SIYUAN_47_RELEASE_RECOVERY_FILE"
grep -Fxq 'remote_phase=health-complete' "$SIYUAN_47_RELEASE_RECOVERY_FILE"
grep -q 'remote_phase=health-complete' "$tmp_dir/recovery-error"
recovery_status="$(siyuan_47_release_lock_status)"
[[ "$recovery_status" == *'RECOVERY_REMOTE_PHASE=health-complete'* ]]
unset SIYUAN_FAKE_SSH_EXEC

for release_script in deploy-47.sh deploy-47-whitelist.sh; do
  grep -q 'siyuan_47_run_bounded_build docker compose build' "$SCRIPT_DIR/$release_script"
  grep -q 'siyuan_47_ssh_bounded_remote.*SIYUAN_47_REMOTE_RELEASE_TIMEOUT_SECONDS' "$SCRIPT_DIR/$release_script"
  grep -q 'siyuan_47_ssh_bounded_remote.*SIYUAN_47_REMOTE_STATE_TIMEOUT_SECONDS' "$SCRIPT_DIR/$release_script"
  grep -q 'SIYUAN_47_BUILD_TIMEOUT_SECONDS:-1800' "$SCRIPT_DIR/$release_script"
  grep -q 'siyuan_47_record_release_phase build-start' "$SCRIPT_DIR/$release_script"
  grep -q 'siyuan_47_record_release_phase build-complete' "$SCRIPT_DIR/$release_script"
  grep -q 'siyuan_47_record_release_phase restart-start' "$SCRIPT_DIR/$release_script"
  grep -q 'siyuan_47_record_release_phase health-complete' "$SCRIPT_DIR/$release_script"
done
[[ "$(grep -c 'siyuan_47_ssh_bounded_remote' "$SCRIPT_DIR/capture-47-release-baseline.sh")" -eq 2 ]]
grep -Fq 'bash -s -- "$SIYUAN_47_DIR/.siyuan-release-state"' "$SCRIPT_DIR/capture-47-release-baseline.sh"
grep -Fq 'env "SIYUAN_RELEASE_REPO_ROOT=$SIYUAN_47_DIR" bash -s' "$SCRIPT_DIR/capture-47-release-baseline.sh"

echo '[release-ssh-policy] PASS'
