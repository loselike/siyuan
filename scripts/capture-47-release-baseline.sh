#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  echo "Release baseline capture requires a clean release-coordinator worktree." >&2
  exit 3
fi

branch="$(git branch --show-current)"
base_commit="$(git rev-parse HEAD)"
if [[ -z "$branch" || ! "$base_commit" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Release baseline capture requires an attached Git branch and a full source commit." >&2
  exit 85
fi
remote_branch_commit="$(git ls-remote --heads origin "refs/heads/$branch" | awk 'NR == 1 {print $1}')"
if [[ "$remote_branch_commit" != "$base_commit" ]]; then
  echo "Release baseline capture requires HEAD to match the durable origin branch exactly." >&2
  exit 86
fi

cleanup_release_lock() {
  local exit_code=$?
  trap - EXIT INT TERM
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

bash "$SCRIPT_DIR/audit-47-runtime-provenance.sh" --require-traceable

remote_release_id="$(ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" \
  "sed -n 's/^RELEASE_ID=//p' '$SIYUAN_47_DIR/.siyuan-release-state' 2>/dev/null | tail -1")"
if [[ -z "$remote_release_id" ]]; then
  remote_release_id="MISSING"
fi
if [[ ! "$remote_release_id" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "Remote release ID contains unsupported characters." >&2
  exit 80
fi
local_fingerprints="$(bash "$SCRIPT_DIR/print-47-release-fingerprints.sh")"
remote_fingerprints="$(ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" \
  "SIYUAN_RELEASE_REPO_ROOT='$SIYUAN_47_DIR' bash -s" < "$SCRIPT_DIR/print-47-release-fingerprints.sh")"
for field in WEB_FINGERPRINT API_FINGERPRINT MIGRATE_FINGERPRINT; do
  local_value="$(printf '%s\n' "$local_fingerprints" | sed -n "s/^$field=//p")"
  remote_value="$(printf '%s\n' "$remote_fingerprints" | sed -n "s/^$field=//p")"
  if [[ -z "$local_value" || "$local_value" != "$remote_value" ]]; then
    echo "RELEASE_BASELINE_TREE_MISMATCH field=$field" >&2
    echo "The release worktree must first integrate the current 47 source baseline." >&2
    exit 80
  fi
done

baseline_dir="$(git rev-parse --git-path siyuan-release-baselines)"
mkdir -p "$baseline_dir"
baseline_file="$baseline_dir/$remote_release_id"
baseline_tmp="$baseline_file.tmp.$$"
cat > "$baseline_tmp" <<BASELINE
REMOTE_RELEASE_ID=$remote_release_id
WORKTREE_ROOT=$REPO_ROOT
BRANCH=$branch
BASE_COMMIT=$base_commit
BASELINE
mv "$baseline_tmp" "$baseline_file"
printf 'EXPECTED_RELEASE_ID=%s\n' "$remote_release_id"
printf 'BASELINE_RECEIPT=%s\n' "$baseline_file"
