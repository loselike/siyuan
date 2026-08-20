#!/usr/bin/env bash
set -euo pipefail
umask 077

usage() {
  cat <<'EOF'
Usage:
  root-dirty-worktree-recovery.sh archive <dirty-root> <stable-baseline> <archive-dir>
  root-dirty-worktree-recovery.sh verify  <dirty-root> <archive-dir>
  root-dirty-worktree-recovery.sh verify-archive <archive-dir>
  root-dirty-worktree-recovery.sh cleanup <dirty-root> <archive-dir> <expected-fingerprint>

archive is read-only for the dirty worktree. cleanup refuses unless the current
path set and every protected file still match the verified archive.
EOF
}

fail() {
  echo "ROOT_RECOVERY_ERROR=$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "missing-command:$1"
}

canonical_dir() {
  (cd "$1" && pwd -P)
}

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

sha256_path() {
  local target="$1"
  if [[ -L "$target" ]]; then
    printf 'symlink:%s' "$(readlink "$target")" | shasum -a 256 | awk '{print $1}'
  elif [[ -f "$target" ]]; then
    sha256_file "$target"
  else
    fail "unsupported-path-type:$target"
  fi
}

path_size() {
  local target="$1"
  if [[ -L "$target" ]]; then
    printf '%s' "$(readlink "$target")" | wc -c | tr -d ' '
  else
    wc -c < "$target" | tr -d ' '
  fi
}

path_mode() {
  stat -f '%Lp' "$1"
}

metadata_value() {
  local archive="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' \
    "$archive/root-metadata.env"
}

inventory_value() {
  local archive="$1"
  local file_path="$2"
  local column="$3"
  awk -F '\t' -v file_path="$file_path" -v column="$column" \
    'NR > 1 && $2 == file_path { print $column; exit }' "$archive/inventory.tsv"
}

assert_current_path_matches() {
  local root="$1"
  local archive="$2"
  local file_path="$3"
  local expected_sha expected_mode actual_sha actual_mode
  expected_sha="$(inventory_value "$archive" "$file_path" 4)"
  expected_mode="$(inventory_value "$archive" "$file_path" 10)"
  [[ -n "$expected_sha" ]] || fail "inventory-entry-missing:$file_path"
  [[ -e "$root/$file_path" || -L "$root/$file_path" ]] || fail "current-path-missing:$file_path"
  actual_sha="$(sha256_path "$root/$file_path")"
  [[ "$actual_sha" == "$expected_sha" ]] || fail "current-path-sha-drifted:$file_path"
  if [[ -n "$expected_mode" ]]; then
    actual_mode="$(path_mode "$root/$file_path")"
    [[ "$actual_mode" == "$expected_mode" ]] || fail "current-path-mode-drifted:$file_path"
  fi
}

same_path_contents() {
  local left="$1"
  local right="$2"
  if [[ -L "$left" || -L "$right" ]]; then
    [[ -L "$left" && -L "$right" && "$(readlink "$left")" == "$(readlink "$right")" ]]
    return
  fi
  [[ -f "$left" && -f "$right" ]] && cmp -s "$left" "$right"
}

nul_count() {
  tr -cd '\000' < "$1" | wc -c | tr -d ' '
}

capture_paths() {
  local root="$1"
  local archive="$2"
  git -C "$root" diff --name-only -z > "$archive/tracked.zlist"
  git -C "$root" ls-files --others --exclude-standard -z > "$archive/untracked.zlist"
  {
    cat "$archive/tracked.zlist"
    cat "$archive/untracked.zlist"
  } > "$archive/all.zlist"
}

capture_candidate_worktrees() {
  local root="$1"
  local baseline="$2"
  local archive="$3"
  local candidates_raw="$archive/candidate-paths.txt"
  : > "$candidates_raw"
  printf '%s\n' "$baseline" >> "$candidates_raw"
  git -C "$root" worktree list --porcelain \
    | sed -n 's/^worktree //p' >> "$candidates_raw"
  if [[ -d "$root/.worktrees" ]]; then
    find "$root/.worktrees" -mindepth 1 -maxdepth 1 -type d -print >> "$candidates_raw"
  fi
  find "$(dirname "$root")" -mindepth 1 -maxdepth 1 -type d -name 'sunny-*' -print >> "$candidates_raw"

  : > "$archive/worktrees.tsv"
  LC_ALL=C sort -u "$candidates_raw" | while IFS= read -r candidate; do
    [[ -n "$candidate" && -d "$candidate" ]] || continue
    candidate="$(canonical_dir "$candidate")"
    [[ "$candidate" != "$root" ]] || continue
    git -C "$candidate" rev-parse --is-inside-work-tree >/dev/null 2>&1 || continue
    local branch head
    branch="$(git -C "$candidate" branch --show-current 2>/dev/null || true)"
    head="$(git -C "$candidate" rev-parse HEAD 2>/dev/null || true)"
    [[ -n "$branch" ]] || branch="detached-${head:0:12}"
    printf '%s\t%s\t%s\n' "$candidate" "$branch" "$head" >> "$archive/worktrees.tsv"
  done
  rm -f "$candidates_raw"
}

task_references() {
  local root="$1"
  local path="$2"
  if [[ "$path" == docs/dev-now/*.md ]]; then
    basename "$path" .md
    return
  fi
  [[ -d "$root/docs/dev-now" ]] || return 0
  {
    rg -l -F -- "$path" "$root/docs/dev-now" 2>/dev/null || true
  } | sed 's#.*/##; s#\.md$##' \
      | sed -n '1,8p' \
      | paste -sd, -
}

write_inventory_rows() {
  local kind="$1"
  local list="$2"
  local root="$3"
  local baseline="$4"
  local archive="$5"
  while IFS= read -r -d '' path; do
    local absolute baseline_relation sha size file_mode candidate_count candidates candidate candidate_branch candidate_head refs owner_class
    absolute="$root/$path"
    [[ -f "$absolute" || -L "$absolute" ]] || fail "listed-path-missing-or-unsupported:$path"
    sha="$(sha256_path "$absolute")"
    size="$(path_size "$absolute")"
    file_mode="$(path_mode "$absolute")"
    if [[ ! -e "$baseline/$path" && ! -L "$baseline/$path" ]]; then
      baseline_relation="missing"
    elif same_path_contents "$absolute" "$baseline/$path"; then
      baseline_relation="identical"
    else
      baseline_relation="different"
    fi

    candidate_count=0
    candidates=""
    while IFS=$'\t' read -r candidate candidate_branch candidate_head; do
      [[ -n "$candidate" ]] || continue
      if [[ -e "$candidate/$path" || -L "$candidate/$path" ]] \
        && same_path_contents "$absolute" "$candidate/$path"; then
        candidate_count=$((candidate_count + 1))
        if [[ "$candidate_count" -le 8 ]]; then
          [[ -z "$candidates" ]] || candidates="${candidates},"
          candidates="${candidates}${candidate_branch}@${candidate}"
        fi
      fi
    done < "$archive/worktrees.tsv"
    refs="$(task_references "$root" "$path")"
    if [[ "$baseline_relation" == "identical" ]]; then
      owner_class="stable-baseline"
    elif [[ "$candidate_count" -gt 0 ]]; then
      owner_class="worktree-match"
    elif [[ -n "$refs" ]]; then
      owner_class="task-reference-only"
    else
      owner_class="archive-only"
    fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "$kind" "$path" "$size" "$sha" "$baseline_relation" "$owner_class" \
      "$candidate_count" "$candidates" "$refs" "$file_mode" >> "$archive/inventory.tsv"
  done < "$list"
}

write_summary() {
  local archive="$1"
  local tracked_count untracked_count total_count stable_count worktree_count task_count archive_count
  tracked_count="$(nul_count "$archive/tracked.zlist")"
  untracked_count="$(nul_count "$archive/untracked.zlist")"
  total_count=$((tracked_count + untracked_count))
  stable_count="$(awk -F '\t' 'NR > 1 && $6 == "stable-baseline" { count++ } END { print count + 0 }' "$archive/inventory.tsv")"
  worktree_count="$(awk -F '\t' 'NR > 1 && $6 == "worktree-match" { count++ } END { print count + 0 }' "$archive/inventory.tsv")"
  task_count="$(awk -F '\t' 'NR > 1 && $6 == "task-reference-only" { count++ } END { print count + 0 }' "$archive/inventory.tsv")"
  archive_count="$(awk -F '\t' 'NR > 1 && $6 == "archive-only" { count++ } END { print count + 0 }' "$archive/inventory.tsv")"
  cat > "$archive/summary.env" <<EOF
TRACKED_COUNT=$tracked_count
UNTRACKED_COUNT=$untracked_count
TOTAL_COUNT=$total_count
STABLE_BASELINE_COUNT=$stable_count
WORKTREE_MATCH_COUNT=$worktree_count
TASK_REFERENCE_ONLY_COUNT=$task_count
ARCHIVE_ONLY_COUNT=$archive_count
EOF
}

write_checksums() {
  local archive="$1"
  (
    cd "$archive"
    shasum -a 256 \
      all.zlist content.tar.gz inventory.tsv root-metadata.env staged.patch status-v2.zlist \
      summary.env tracked.patch tracked.zlist untracked.zlist worktrees.tsv > CHECKSUMS.sha256
  )
}

verify_archive() {
  local root="$1"
  local archive="$2"
  verify_archive_payload "$archive"

  local current_dir
  current_dir="$(mktemp -d "${TMPDIR:-/tmp}/sunny-root-recovery-verify.XXXXXX")"
  trap 'rm -rf "$current_dir"' RETURN
  COPYFILE_DISABLE=1 tar -C "$current_dir" -xpzf "$archive/content.tar.gz"
  while IFS= read -r -d '' path; do
    [[ -e "$root/$path" || -L "$root/$path" ]] || fail "current-path-missing:$path"
    [[ -e "$current_dir/$path" || -L "$current_dir/$path" ]] || fail "archive-path-missing:$path"
    same_path_contents "$root/$path" "$current_dir/$path" || fail "archive-content-mismatch:$path"
  done < "$archive/all.zlist"
  rm -rf "$current_dir"
  trap - RETURN
  printf 'ROOT_RECOVERY_VERIFY=pass\n'
  printf 'ROOT_RECOVERY_FINGERPRINT=%s\n' "$(sha256_file "$archive/inventory.tsv")"
}

verify_archive_payload() {
  local archive="$1"
  [[ -d "$archive" ]] || fail "archive-not-found:$archive"
  (
    cd "$archive"
    shasum -a 256 -c CHECKSUMS.sha256 >/dev/null
  ) || fail "archive-checksum-mismatch"
  if [[ -f "$archive/FINAL_CHECKSUMS.sha256" ]]; then
    (
      cd "$archive"
      shasum -a 256 -c FINAL_CHECKSUMS.sha256 >/dev/null
    ) || fail "archive-final-checksum-mismatch"
  fi

  local current_dir kind path size expected_sha remainder expected_mode actual_sha actual_mode
  current_dir="$(mktemp -d "${TMPDIR:-/tmp}/sunny-root-recovery-payload.XXXXXX")"
  trap 'rm -rf "$current_dir"' RETURN
  COPYFILE_DISABLE=1 tar -C "$current_dir" -xpzf "$archive/content.tar.gz"
  while IFS=$'\t' read -r kind path size expected_sha remainder; do
    [[ "$kind" != "kind" ]] || continue
    [[ -e "$current_dir/$path" || -L "$current_dir/$path" ]] || fail "archive-payload-path-missing:$path"
    actual_sha="$(sha256_path "$current_dir/$path")"
    [[ "$actual_sha" == "$expected_sha" ]] || fail "archive-payload-sha-mismatch:$path"
    expected_mode="$(inventory_value "$archive" "$path" 10)"
    if [[ -n "$expected_mode" ]]; then
      actual_mode="$(path_mode "$current_dir/$path")"
      [[ "$actual_mode" == "$expected_mode" ]] || fail "archive-payload-mode-mismatch:$path"
    fi
  done < "$archive/inventory.tsv"
  rm -rf "$current_dir"
  trap - RETURN
  printf 'ROOT_RECOVERY_ARCHIVE_VERIFY=pass\n'
  printf 'ROOT_RECOVERY_FINGERPRINT=%s\n' "$(sha256_file "$archive/inventory.tsv")"
}

archive_dirty_root() {
  local root baseline archive
  root="$(canonical_dir "$1")"
  baseline="$(canonical_dir "$2")"
  archive="$3"
  [[ "$root" != "$baseline" ]] || fail "root-and-baseline-must-differ"
  [[ ! -e "$archive" ]] || fail "archive-already-exists:$archive"
  git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not-a-git-worktree:$root"
  git -C "$baseline" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not-a-git-worktree:$baseline"
  [[ -z "$(git -C "$root" diff --cached --name-only)" ]] || fail "staged-changes-require-separate-review"

  mkdir -p "$archive"
  capture_paths "$root" "$archive"
  [[ "$(nul_count "$archive/all.zlist")" -gt 0 ]] || fail "dirty-path-set-empty"
  git -C "$root" status --porcelain=v2 -z > "$archive/status-v2.zlist"
  git -C "$root" diff --binary > "$archive/tracked.patch"
  git -C "$root" diff --cached --binary > "$archive/staged.patch"
  cat > "$archive/root-metadata.env" <<EOF
ROOT=$root
ROOT_BRANCH=$(git -C "$root" branch --show-current)
ROOT_HEAD=$(git -C "$root" rev-parse HEAD)
BASELINE=$baseline
BASELINE_BRANCH=$(git -C "$baseline" branch --show-current)
BASELINE_HEAD=$(git -C "$baseline" rev-parse HEAD)
CAPTURED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
  capture_candidate_worktrees "$root" "$baseline" "$archive"
  printf 'kind\tpath\tsize\tsha256\tbaseline_relation\towner_class\tcandidate_count\tcandidates\ttask_references\tmode\n' > "$archive/inventory.tsv"
  write_inventory_rows tracked "$archive/tracked.zlist" "$root" "$baseline" "$archive"
  write_inventory_rows untracked "$archive/untracked.zlist" "$root" "$baseline" "$archive"
  write_summary "$archive"
  COPYFILE_DISABLE=1 tar -C "$root" -czf "$archive/content.tar.gz" --null -T "$archive/all.zlist"
  write_checksums "$archive"
  verify_archive "$root" "$archive"
  chmod -R go-rwx "$archive"
  cat "$archive/summary.env"
  printf 'ROOT_RECOVERY_ARCHIVE=%s\n' "$archive"
}

cleanup_dirty_root() {
  local root archive expected current_fingerprint quarantine git_dir lock_dir lock_active current_lists
  root="$(canonical_dir "$1")"
  archive="$(canonical_dir "$2")"
  expected="$3"
  git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not-a-git-worktree:$root"
  git_dir="$(git -C "$root" rev-parse --absolute-git-dir)"
  lock_dir="$git_dir/codex-root-recovery.lock"
  mkdir "$lock_dir" 2>/dev/null || fail "cleanup-lock-already-held:$lock_dir"
  lock_active=1
  current_lists=""
  cat > "$lock_dir/owner.env" <<EOF
LOCKED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
PID=$$
ROOT=$root
ARCHIVE=$archive
EOF
  cleanup_failure_receipt() {
    local status=$?
    trap - EXIT
    if [[ "$lock_active" == "1" ]]; then
      cat > "$lock_dir/failure.env" <<EOF
FAILED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
PID=$$
ROOT=$root
ARCHIVE=$archive
EXIT_STATUS=$status
RECOVERY_ACTION=inspect-lock-and-verified-archive-before-retry
EOF
    fi
    [[ -z "$current_lists" ]] || rm -rf "$current_lists"
    exit "$status"
  }
  trap cleanup_failure_receipt EXIT

  current_fingerprint="$(sha256_file "$archive/inventory.tsv")"
  [[ "$current_fingerprint" == "$expected" ]] || fail "unexpected-inventory-fingerprint"
  [[ "$(metadata_value "$archive" ROOT)" == "$root" ]] || fail "archived-root-mismatch"
  [[ "$(metadata_value "$archive" ROOT_BRANCH)" == "$(git -C "$root" branch --show-current)" ]] \
    || fail "root-branch-drifted"
  [[ "$(metadata_value "$archive" ROOT_HEAD)" == "$(git -C "$root" rev-parse HEAD)" ]] \
    || fail "root-head-drifted"
  verify_archive "$root" "$archive" >/dev/null

  current_lists="$(mktemp -d "${TMPDIR:-/tmp}/sunny-root-recovery-lists.XXXXXX")"
  capture_paths "$root" "$current_lists"
  cmp -s "$archive/tracked.zlist" "$current_lists/tracked.zlist" || fail "tracked-path-set-drifted"
  cmp -s "$archive/untracked.zlist" "$current_lists/untracked.zlist" || fail "untracked-path-set-drifted"

  quarantine="$archive/quarantine-untracked"
  [[ ! -e "$quarantine" ]] || fail "quarantine-already-exists"
  mkdir -p "$quarantine"
  while IFS= read -r -d '' path; do
    assert_current_path_matches "$root" "$archive" "$path"
    mkdir -p "$quarantine/$(dirname "$path")"
    mv "$root/$path" "$quarantine/$path"
  done < "$archive/untracked.zlist"

  while IFS= read -r -d '' path; do
    assert_current_path_matches "$root" "$archive" "$path"
    git -C "$root" restore --worktree --source=HEAD -- "$path"
  done < "$archive/tracked.zlist"
  [[ "$(metadata_value "$archive" ROOT_BRANCH)" == "$(git -C "$root" branch --show-current)" ]] \
    || fail "root-branch-changed-during-cleanup"
  [[ "$(metadata_value "$archive" ROOT_HEAD)" == "$(git -C "$root" rev-parse HEAD)" ]] \
    || fail "root-head-changed-during-cleanup"
  [[ -z "$(git -C "$root" status --porcelain)" ]] || fail "root-not-clean-after-precise-cleanup"
  verify_archive_payload "$archive" >/dev/null
  rm -rf "$current_lists"
  current_lists=""
  printf 'kind\tpath\tsha256\tmode\n' > "$archive/quarantine-manifest.tsv"
  while IFS= read -r -d '' path; do
    local expected_sha expected_mode actual_sha actual_mode
    expected_sha="$(inventory_value "$archive" "$path" 4)"
    expected_mode="$(inventory_value "$archive" "$path" 10)"
    actual_sha="$(sha256_path "$quarantine/$path")"
    actual_mode="$(path_mode "$quarantine/$path")"
    [[ "$actual_sha" == "$expected_sha" ]] || fail "quarantine-sha-mismatch:$path"
    [[ -z "$expected_mode" || "$actual_mode" == "$expected_mode" ]] || fail "quarantine-mode-mismatch:$path"
    printf 'untracked\t%s\t%s\t%s\n' "$path" "$actual_sha" "$actual_mode" \
      >> "$archive/quarantine-manifest.tsv"
  done < "$archive/untracked.zlist"
  cat > "$archive/cleanup-receipt.env" <<EOF
CLEANED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ROOT=$root
ROOT_BRANCH=$(git -C "$root" branch --show-current)
ROOT_HEAD=$(git -C "$root" rev-parse HEAD)
INVENTORY_FINGERPRINT=$current_fingerprint
UNTRACKED_QUARANTINE=$quarantine
ROOT_STATUS=clean
EOF
  cp "$lock_dir/owner.env" "$archive/cleanup-lock-receipt.env"
  (
    cd "$archive"
    : > FINAL_CHECKSUMS.sha256
    for checksum_file in \
      CHECKSUMS.sha256 cleanup-lock-receipt.env cleanup-receipt.env content.tar.gz inventory.tsv \
      quarantine-manifest.tsv root-metadata.env summary.env ownership-strength.tsv post-cleanup-summary.env; do
      [[ -f "$checksum_file" ]] || continue
      shasum -a 256 "$checksum_file" >> FINAL_CHECKSUMS.sha256
    done
  )
  chmod -R go-rwx "$archive"
  verify_archive_payload "$archive" >/dev/null
  rm -f "$lock_dir/owner.env"
  rmdir "$lock_dir"
  lock_active=0
  trap - EXIT
  printf 'ROOT_RECOVERY_CLEANUP=pass\n'
  printf 'ROOT_RECOVERY_QUARANTINE=%s\n' "$quarantine"
}

require_command git
require_command rg
require_command shasum
require_command tar

[[ $# -ge 1 ]] || { usage; exit 2; }
command_name="$1"
shift
case "$command_name" in
  archive)
    [[ $# -eq 3 ]] || { usage; exit 2; }
    archive_dirty_root "$1" "$2" "$3"
    ;;
  verify)
    [[ $# -eq 2 ]] || { usage; exit 2; }
    verify_archive "$(canonical_dir "$1")" "$(canonical_dir "$2")"
    ;;
  verify-archive)
    [[ $# -eq 1 ]] || { usage; exit 2; }
    verify_archive_payload "$(canonical_dir "$1")"
    ;;
  cleanup)
    [[ $# -eq 3 ]] || { usage; exit 2; }
    cleanup_dirty_root "$1" "$2" "$3"
    ;;
  *)
    usage
    exit 2
    ;;
esac
