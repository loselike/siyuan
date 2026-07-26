#!/usr/bin/env bash

set -euo pipefail

REMOTE_HOST="${SIYUAN_47_REMOTE:-47}"
REMOTE_DIR="${SIYUAN_47_DIR:-/opt/siyuan}"
PRINT_DETAILS=true
FAIL_ON_DRIFT=false

for arg in "$@"; do
  case "$arg" in
    --summary)
      PRINT_DETAILS=false
      ;;
    --fail-on-drift)
      FAIL_ON_DRIFT=true
      ;;
    --help|-h)
      cat <<'USAGE'
Usage: npm run audit:47-drift -- [--summary] [--fail-on-drift]

Compares production source files in the current worktree with the source tree on 47.
The audit is read-only and does not sync, build, restart, migrate, or modify either side.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

audit_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-47-source-drift.XXXXXX")"
trap 'rm -r -- "$audit_dir"' EXIT

local_manifest="$audit_dir/local.tsv"
remote_manifest="$audit_dir/remote.tsv"

list_runtime_files() {
  {
    find apps/api apps/web packages/shared \
      \( -type d \( -name node_modules -o -name dist -o -name coverage -o -name .vite \) -prune \) -o \
      \( -type f \
        \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.prisma' -o -name '*.sql' \) \
        ! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.spec.ts' ! -name '*.spec.tsx' \
        ! -name '._*' ! -name '*.orig' \
        ! -path '*/__tests__/*' ! -path '*/test/*' ! -path '*/tests/*' ! -path '*/test-support/*' \
        -print \)

    for file_path in \
      package.json package-lock.json \
      docker-compose.yml docker-compose.prod.yml docker-compose.production.yml \
      Dockerfile.api Dockerfile.web deploy/nginx.conf \
      apps/api/package.json apps/api/Dockerfile \
      apps/web/package.json apps/web/Dockerfile \
      packages/shared/package.json; do
      [[ -f "$file_path" ]] && printf '%s\n' "$file_path"
    done
  } | LC_ALL=C sort -u
}

hash_local_file() {
  local file_path="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
  else
    sha256sum "$file_path" | awk '{print $1}'
  fi
}

while IFS= read -r file_path; do
  printf '%s\t%s\n' "$file_path" "$(hash_local_file "$file_path")"
done < <(list_runtime_files) > "$local_manifest"

ssh -o ConnectTimeout=20 "$REMOTE_HOST" bash -s -- "$REMOTE_DIR" > "$remote_manifest" <<'REMOTE_SCRIPT'
set -euo pipefail

remote_dir="$1"
cd "$remote_dir"

{
  find apps/api apps/web packages/shared \
    \( -type d \( -name node_modules -o -name dist -o -name coverage -o -name .vite \) -prune \) -o \
    \( -type f \
      \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' -o -name '*.prisma' -o -name '*.sql' \) \
      ! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.spec.ts' ! -name '*.spec.tsx' \
      ! -name '._*' ! -name '*.orig' \
      ! -path '*/__tests__/*' ! -path '*/test/*' ! -path '*/tests/*' ! -path '*/test-support/*' \
      -print \)

  for file_path in \
    package.json package-lock.json \
    docker-compose.yml docker-compose.prod.yml docker-compose.production.yml \
    Dockerfile.api Dockerfile.web deploy/nginx.conf \
    apps/api/package.json apps/api/Dockerfile \
    apps/web/package.json apps/web/Dockerfile \
    packages/shared/package.json; do
    [[ -f "$file_path" ]] && printf '%s\n' "$file_path"
  done
} | LC_ALL=C sort -u | while IFS= read -r file_path; do
  printf '%s\t%s\n' "$file_path" "$(sha256sum "$file_path" | awk '{print $1}')"
done
REMOTE_SCRIPT

node - "$local_manifest" "$remote_manifest" "$PRINT_DETAILS" "$FAIL_ON_DRIFT" <<'NODE_SCRIPT'
import { readFileSync } from 'node:fs';

const [localPath, remotePath, printDetailsArg, failOnDriftArg] = process.argv.slice(2);

function readManifest(path) {
  const entries = new Map();
  const content = readFileSync(path, 'utf8').trim();
  if (!content) return entries;

  for (const line of content.split('\n')) {
    const separator = line.indexOf('\t');
    if (separator < 1) throw new Error(`Invalid manifest line: ${line}`);
    entries.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return entries;
}

const local = readManifest(localPath);
const remote = readManifest(remotePath);
const same = [];
const changed = [];
const localOnly = [];
const remoteOnly = [];

for (const filePath of [...new Set([...local.keys(), ...remote.keys()])].sort()) {
  if (!remote.has(filePath)) localOnly.push(filePath);
  else if (!local.has(filePath)) remoteOnly.push(filePath);
  else if (local.get(filePath) === remote.get(filePath)) same.push(filePath);
  else changed.push(filePath);
}

console.log('SOURCE_DRIFT_AUDIT');
console.log(`LOCAL_COUNT=${local.size}`);
console.log(`REMOTE_COUNT=${remote.size}`);
console.log(`SAME=${same.length}`);
console.log(`CHANGED=${changed.length}`);
console.log(`LOCAL_ONLY=${localOnly.length}`);
console.log(`REMOTE_ONLY=${remoteOnly.length}`);

if (printDetailsArg === 'true') {
  for (const [label, paths] of [
    ['CHANGED', changed],
    ['LOCAL_ONLY', localOnly],
    ['REMOTE_ONLY', remoteOnly]
  ]) {
    console.log(`\n[${label}]`);
    for (const filePath of paths) console.log(filePath);
  }
}

if (failOnDriftArg === 'true' && changed.length + localOnly.length + remoteOnly.length > 0) {
  process.exit(3);
}
NODE_SCRIPT
