#!/usr/bin/env bash
set -euo pipefail

REMOTE="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
MODE="${1:---dry-run}"

if [[ "${MODE}" != "--dry-run" && "${MODE}" != "--apply" ]]; then
  echo "Usage: npm run sync:47 -- [--dry-run|--apply]"
  echo "Env: SIYUAN_47_REMOTE=47 SIYUAN_47_DIR=/opt/siyuan"
  exit 2
fi

RSYNC_MODE=(--dry-run)
if [[ "${MODE}" == "--apply" ]]; then
  RSYNC_MODE=()
fi

rsync -az --delete ${RSYNC_MODE+"${RSYNC_MODE[@]}"} \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='apps/*/dist/' \
  --exclude='packages/*/dist/' \
  --exclude='scraped_docs/' \
  --exclude='outputs/' \
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
