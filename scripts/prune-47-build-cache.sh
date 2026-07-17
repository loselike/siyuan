#!/usr/bin/env bash
set -euo pipefail

MAX_USED_SPACE="${SIYUAN_BUILDKIT_MAX_USED_SPACE:-6gb}"
RESERVED_SPACE="${SIYUAN_BUILDKIT_RESERVED_SPACE:-2gb}"
UNUSED_FOR="${SIYUAN_BUILDKIT_UNUSED_FOR:-168h}"

echo "[$(date -Iseconds)] BuildKit cache cleanup started"
docker buildx prune \
  --force \
  --filter "until=${UNUSED_FOR}" \
  --max-used-space "${MAX_USED_SPACE}" \
  --reserved-space "${RESERVED_SPACE}"
docker system df
echo "[$(date -Iseconds)] BuildKit cache cleanup completed"
