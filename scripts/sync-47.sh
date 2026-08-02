#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/47-release-lock.sh
source "$SCRIPT_DIR/lib/47-release-lock.sh"
MODE="${1:---dry-run}"

if [[ "${MODE}" != "--dry-run" && "${MODE}" != "--apply" ]]; then
  echo "Usage: npm run sync:47 -- [--dry-run|--apply]"
  echo "Env: SIYUAN_47_REMOTE=47 SIYUAN_47_DIR=/opt/siyuan"
  exit 2
fi

if [[ "${MODE}" == "--apply" ]]; then
  siyuan_47_verify_release_lock
  expected_release_id="${SIYUAN_47_EXPECTED_RELEASE_ID:-}"
  if [[ -z "$expected_release_id" || ! "$expected_release_id" =~ ^[A-Za-z0-9._:-]+$ ]]; then
    echo "sync:47 apply requires SIYUAN_47_EXPECTED_RELEASE_ID captured at candidate start." >&2
    exit 74
  fi
  current_release_id="$(ssh -o ConnectTimeout=20 "$REMOTE" \
    "sed -n 's/^RELEASE_ID=//p' '$REMOTE_DIR/.siyuan-release-state' 2>/dev/null | tail -1")"
  [[ -n "$current_release_id" ]] || current_release_id="MISSING"
  if [[ "$current_release_id" != "$expected_release_id" ]]; then
    echo "REMOTE_RELEASE_BASELINE_MISMATCH expected=$expected_release_id actual=$current_release_id" >&2
    exit 76
  fi
fi

RSYNC_MODE=(--dry-run)
RSYNC_DELETE=(--delete)
if [[ "${MODE}" == "--apply" ]]; then
  RSYNC_MODE=()
fi

rsync -azc --itemize-changes ${RSYNC_MODE+"${RSYNC_MODE[@]}"} ${RSYNC_DELETE+"${RSYNC_DELETE[@]}"} \
  --exclude='.git' \
  --exclude='.git/' \
  --exclude='.siyuan-release-lock/' \
  --exclude='.siyuan-release-recovery-required' \
  --exclude='.siyuan-release-state' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='apps/*/dist/' \
  --exclude='packages/*/dist/' \
  --exclude='apps/api/uploads/' \
  --exclude='backups/' \
  --exclude='.release-backups/' \
  --exclude='data/quotes.json' \
  --exclude='inquiry_data/prices.json' \
  --exclude='europe-express-data/' \
  --exclude='europe-truck-data/' \
  --exclude='south-africa/prices.json' \
  --exclude='south-africa/data.json' \
  --exclude='scraped_docs/' \
  --exclude='outputs/' \
  --exclude='.codex/artifacts/' \
  --exclude='.codex/runtime/' \
  --exclude='.codex/tmp/' \
  --exclude='.codex-release-staging/' \
  --exclude='tmp/' \
  --exclude='screenshots/' \
  --exclude='worktrees/' \
  --exclude='.worktrees/' \
  --exclude='*.log' \
  --exclude='*.tsbuildinfo' \
  --exclude='.DS_Store' \
  --include='.env.example' \
  --exclude='.env' \
  --exclude='.env.*' \
  ./ "${REMOTE}:${REMOTE_DIR}/"

if [[ "${MODE}" == "--dry-run" ]]; then
  echo "Dry run complete. Re-run with: npm run sync:47 -- --apply"
else
  echo "Synced to ${REMOTE}:${REMOTE_DIR}"
fi
