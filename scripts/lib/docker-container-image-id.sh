#!/usr/bin/env bash

# Returns the immutable runnable manifest digest when Docker exposes it. Older
# daemons do not provide ImageManifestDescriptor, so preserve the legacy
# container config image ID as a conservative fallback.
siyuan_docker_container_image_id() {
  local container_id="$1"
  docker inspect --format '{{if .ImageManifestDescriptor}}{{.ImageManifestDescriptor.digest}}{{else}}{{.Image}}{{end}}' \
    "$container_id" 2>/dev/null || true
}
