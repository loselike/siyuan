#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/docker-container-image-id.sh
source "$SCRIPT_DIR/lib/docker-container-image-id.sh"

docker() {
  local mode="${DOCKER_INSPECT_MODE:?}"
  [[ "$1" == inspect && "$2" == --format ]]
  case "$mode" in
    descriptor) printf '%s\n' 'sha256:runnable-manifest' ;;
    fallback) printf '%s\n' 'sha256:legacy-config' ;;
    *) return 1 ;;
  esac
}

DOCKER_INSPECT_MODE=descriptor
export DOCKER_INSPECT_MODE
[[ "$(siyuan_docker_container_image_id web-container)" == 'sha256:runnable-manifest' ]]

DOCKER_INSPECT_MODE=fallback
export DOCKER_INSPECT_MODE
[[ "$(siyuan_docker_container_image_id api-container)" == 'sha256:legacy-config' ]]

echo 'DOCKER_CONTAINER_IMAGE_ID_OK'
