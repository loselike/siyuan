#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"

EXPECTED_MARKER_SHA=""
CONFIRMED=false
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --expected-marker-sha) EXPECTED_MARKER_SHA="${2:-}"; shift 2 ;;
    --confirm-recovered) CONFIRMED=true; shift ;;
    *) echo "Usage: npm run release:47:resolve -- --expected-marker-sha <sha256> --confirm-recovered" >&2; exit 2 ;;
  esac
done

if [[ "$CONFIRMED" != true || ! "$EXPECTED_MARKER_SHA" =~ ^[0-9a-f]{64}$ ]]; then
  echo "Recovery resolution requires the status marker SHA and explicit --confirm-recovered." >&2
  exit 2
fi

ssh -o ConnectTimeout=20 "$SIYUAN_47_REMOTE" bash -s -- \
  "$SIYUAN_47_RELEASE_LOCK_DIR" "$SIYUAN_47_RELEASE_RECOVERY_FILE" "$EXPECTED_MARKER_SHA" <<'REMOTE_SCRIPT'
set -eu
lock_dir="$1"; recovery_file="$2"; expected_sha="$3"
if [ -d "$lock_dir" ]; then
  echo "Cannot resolve recovery while the release lock is held." >&2
  exit 75
fi
if [ ! -f "$recovery_file" ]; then
  echo "No recovery marker exists." >&2
  exit 2
fi
actual_sha="$(sha256sum "$recovery_file" | awk '{print $1}')"
if [ "$actual_sha" != "$expected_sha" ]; then
  echo "Recovery marker changed; refusing to clear it." >&2
  exit 76
fi
rm -f "$recovery_file"
echo "RELEASE_RECOVERY_STATUS=clear"
REMOTE_SCRIPT
