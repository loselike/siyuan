#!/usr/bin/env bash

# Release-source policy is intentionally independent from SSH and Docker so it
# can fail before a production lock, source upload or image mutation begins.

siyuan_47_current_branch() {
  git branch --show-current 2>/dev/null || true
}

siyuan_47_is_release_branch() {
  local branch="$1"
  case "$branch" in
    main|codex/release/*) return 0 ;;
    *) return 1 ;;
  esac
}

siyuan_47_assert_standard_release_source() {
  local mode="$1"
  local current_baseline_cutover="$2"
  local branch="${3:-$(siyuan_47_current_branch)}"
  if [[ "$mode" != apply || "$current_baseline_cutover" == true ]]; then
    return 0
  fi
  if ! siyuan_47_is_release_branch "$branch"; then
    echo "Standard 47 releases are restricted to main or codex/release/*; current branch: ${branch:-detached}." >&2
    return 87
  fi
}

siyuan_47_assert_whitelist_release_source() {
  local branch="${1:-$(siyuan_47_current_branch)}"
  local emergency="${2:-${SIYUAN_47_EMERGENCY_RELEASE:-false}}"
  if siyuan_47_is_release_branch "$branch"; then
    return 0
  fi
  if [[ "$emergency" == true ]]; then
    return 0
  fi
  echo "Whitelist CAS is emergency-only outside main/codex/release/*; set SIYUAN_47_EMERGENCY_RELEASE=true after explicit review." >&2
  return 87
}
