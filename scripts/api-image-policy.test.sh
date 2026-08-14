#!/usr/bin/env bash
set -euo pipefail

dockerfile="${1:-Dockerfile.api}"
workflow="${2:-.github/workflows/ci.yml}"

[[ -f "$dockerfile" && -f "$workflow" ]]
grep -Fq 'RUN --mount=type=cache,id=siyuan-api-npm,target=/root/.npm,sharing=locked' "$dockerfile"
grep -Fq -- '--workspace=@siyuan/api' "$dockerfile"
grep -Fq -- '--workspace=@siyuan/shared' "$dockerfile"
grep -Fq -- '--include-workspace-root=false' "$dockerfile"
if grep -Fq 'COPY apps/web/package.json' "$dockerfile"; then
  echo 'API image must not install the Web workspace manifest.' >&2
  exit 1
fi
if grep -Fq 'metadata-file:' "$workflow"; then
  echo 'docker/build-push-action metadata-file is not a supported input.' >&2
  exit 1
fi
grep -Fq 'API_IMAGE_DIGEST: ${{ steps.build.outputs.digest }}' "$workflow"
grep -Fq 'API_IMAGE_METADATA: ${{ steps.build.outputs.metadata }}' "$workflow"
grep -Fq 'name: api-image-metadata-${{ github.sha }}' "$workflow"

echo '[api-image-policy] PASS'
