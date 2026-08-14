#!/usr/bin/env bash

# Computes services that must receive the current release tag. The API
# participates whenever Web or API source changed because release state binds a
# single release ID to both runtime containers; this is independent from the
# source-level release scope reported to the caller.
siyuan_47_api_image_refresh_required() {
  [[ "${1:-false}" == true || "${2:-false}" == true ]]
}

siyuan_47_plan_build_services() {
  local web_changed="${1:-false}"
  local api_changed="${2:-false}"
  local migrate_changed="${3:-false}"
  if [[ "$migrate_changed" == true ]]; then
    printf '%s\n' db-migrate
  fi
  if siyuan_47_api_image_refresh_required "$web_changed" "$api_changed"; then
    printf '%s\n' api
  fi
  if [[ "$web_changed" == true ]]; then
    printf '%s\n' web
  fi
}

siyuan_47_plan_restart_services() {
  local web_changed="${1:-false}"
  local api_changed="${2:-false}"
  if siyuan_47_api_image_refresh_required "$web_changed" "$api_changed"; then
    printf '%s\n' api
  fi
  if [[ "$web_changed" == true ]]; then
    printf '%s\n' web
  fi
}
