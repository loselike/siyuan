#!/usr/bin/env bash

# Release-scoped Docker image names and fencing helpers. Callers enable strict mode.

siyuan_47_release_image_suffix() {
  local release_id="$1"
  if [[ ! "$release_id" =~ ^[A-Za-z0-9._:-]+$ ]]; then
    echo "Release ID contains unsupported image-tag characters." >&2
    return 64
  fi
  printf '%s' "$release_id" | tr '[:upper:]' '[:lower:]' | tr ':/' '--'
}

siyuan_47_export_release_images() {
  local release_id="$1" suffix
  suffix="$(siyuan_47_release_image_suffix "$release_id")" || return
  export SIYUAN_API_IMAGE="siyuan-api:${suffix}"
  export SIYUAN_WEB_IMAGE="siyuan-web:${suffix}"
  export SIYUAN_MIGRATE_IMAGE="siyuan-db-migrate:${suffix}"
}

siyuan_47_image_id() {
  local image_ref="$1"
  docker image inspect --format '{{if .Descriptor}}{{.Descriptor.digest}}{{else}}{{.Id}}{{end}}' "$image_ref" 2>/dev/null | tail -1
}

siyuan_47_capture_release_image_ids() {
  local api_changed="$1" web_changed="$2" migrate_changed="$3"
  if [[ "$api_changed" == true ]]; then
    SIYUAN_47_BUILT_API_IMAGE_ID="$(siyuan_47_image_id "$SIYUAN_API_IMAGE")"
    [[ -n "$SIYUAN_47_BUILT_API_IMAGE_ID" ]] || { echo "Built API release image is unavailable: $SIYUAN_API_IMAGE" >&2; return 83; }
    export SIYUAN_47_BUILT_API_IMAGE_ID
  fi
  if [[ "$web_changed" == true ]]; then
    SIYUAN_47_BUILT_WEB_IMAGE_ID="$(siyuan_47_image_id "$SIYUAN_WEB_IMAGE")"
    [[ -n "$SIYUAN_47_BUILT_WEB_IMAGE_ID" ]] || { echo "Built Web release image is unavailable: $SIYUAN_WEB_IMAGE" >&2; return 83; }
    export SIYUAN_47_BUILT_WEB_IMAGE_ID
  fi
  if [[ "$migrate_changed" == true ]]; then
    SIYUAN_47_BUILT_MIGRATE_IMAGE_ID="$(siyuan_47_image_id "$SIYUAN_MIGRATE_IMAGE")"
    [[ -n "$SIYUAN_47_BUILT_MIGRATE_IMAGE_ID" ]] || { echo "Built migration release image is unavailable: $SIYUAN_MIGRATE_IMAGE" >&2; return 83; }
    export SIYUAN_47_BUILT_MIGRATE_IMAGE_ID
  fi
}

siyuan_47_verify_release_image_ids() {
  local api_changed="$1" web_changed="$2" migrate_changed="$3" actual
  if [[ "$api_changed" == true ]]; then
    actual="$(siyuan_47_image_id "$SIYUAN_API_IMAGE")"
    [[ -n "$actual" && "$actual" == "$SIYUAN_47_BUILT_API_IMAGE_ID" ]] || { echo "RELEASE_IMAGE_FENCE_MISMATCH service=api expected=${SIYUAN_47_BUILT_API_IMAGE_ID:-MISSING} actual=${actual:-MISSING}" >&2; return 83; }
  fi
  if [[ "$web_changed" == true ]]; then
    actual="$(siyuan_47_image_id "$SIYUAN_WEB_IMAGE")"
    [[ -n "$actual" && "$actual" == "$SIYUAN_47_BUILT_WEB_IMAGE_ID" ]] || { echo "RELEASE_IMAGE_FENCE_MISMATCH service=web expected=${SIYUAN_47_BUILT_WEB_IMAGE_ID:-MISSING} actual=${actual:-MISSING}" >&2; return 83; }
  fi
  if [[ "$migrate_changed" == true ]]; then
    actual="$(siyuan_47_image_id "$SIYUAN_MIGRATE_IMAGE")"
    [[ -n "$actual" && "$actual" == "$SIYUAN_47_BUILT_MIGRATE_IMAGE_ID" ]] || { echo "RELEASE_IMAGE_FENCE_MISMATCH service=db-migrate expected=${SIYUAN_47_BUILT_MIGRATE_IMAGE_ID:-MISSING} actual=${actual:-MISSING}" >&2; return 83; }
  fi
}
