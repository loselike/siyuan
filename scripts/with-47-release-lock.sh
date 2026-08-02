#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"

if [[ "$#" -eq 0 ]]; then
  echo "Usage: npm run release:47:locked -- <command> [args...]" >&2
  exit 2
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
"$@"
