#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${SIYUAN_RELEASE_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

sha256_stream() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
  else
    sha256sum | awk '{print $1}'
  fi
}

is_test_file() {
  case "$1" in
    *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*/__tests__/*) return 0 ;;
    *) return 1 ;;
  esac
}

runtime_files() {
  find apps/api apps/web packages/shared deploy -type f 2>/dev/null
  for path in package.json package-lock.json tsconfig.base.json Dockerfile.api Dockerfile.web docker-compose.yml .dockerignore; do
    [[ -f "$path" ]] && printf '%s\n' "$path"
  done
}

matches_scope() {
  local scope="$1" path="$2"
  is_test_file "$path" && return 1
  case "$scope:$path" in
    migrate:apps/api/prisma/schema.prisma|migrate:apps/api/prisma/migrations/*) return 0 ;;
    web:apps/web/*|web:packages/shared/*|web:package.json|web:package-lock.json|web:tsconfig.base.json|web:Dockerfile.web|web:docker-compose.yml|web:deploy/nginx.conf|web:.dockerignore) return 0 ;;
    api:apps/api/*|api:packages/shared/*|api:package.json|api:package-lock.json|api:tsconfig.base.json|api:Dockerfile.api|api:docker-compose.yml|api:.dockerignore) return 0 ;;
    *) return 1 ;;
  esac
}

scope_hash() {
  local scope="$1"
  while IFS= read -r path; do
    [[ -f "$path" ]] || continue
    case "$path" in */node_modules/*|*/dist/*|apps/api/uploads/*|*/.DS_Store|*.tsbuildinfo|*.log) continue ;; esac
    if matches_scope "$scope" "$path"; then
      printf '%s  %s\n' "$(sha256_file "$path")" "$path"
    fi
  done < <(runtime_files | LC_ALL=C sort -u) | sha256_stream
}

web_fingerprint="$(scope_hash web)"
api_fingerprint="$(scope_hash api)"
migrate_fingerprint="$(scope_hash migrate)"
printf 'WEB_FINGERPRINT=%s\n' "$web_fingerprint"
printf 'API_FINGERPRINT=%s\n' "$api_fingerprint"
printf 'MIGRATE_FINGERPRINT=%s\n' "$migrate_fingerprint"
printf 'RELEASE_ID=web-%s_api-%s\n' "${web_fingerprint:0:12}" "${api_fingerprint:0:12}"
