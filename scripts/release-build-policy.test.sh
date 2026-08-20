#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STANDARD="$SCRIPT_DIR/deploy-47.sh"
WHITELIST="$SCRIPT_DIR/deploy-47-whitelist.sh"
tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/siyuan-release-build-policy-test.XXXXXX")"
trap 'rm -rf -- "$tmp_dir"' EXIT INT TERM

grep -Fq 'Standard 47 runtime releases require CI-built immutable images via --image-manifest.' "$STANDARD"
grep -Fq 'REMOTE_SERVER_BUILD_POLICY_VIOLATION' "$STANDARD"
! grep -Fq 'siyuan_47_run_bounded_build docker compose build' "$STANDARD"
grep -Fq 'bootstrap/source-bundle is only compatible with the reviewed current-baseline cutover' "$STANDARD"
grep -Fq "^ghcr\\.io/loselike/siyuan-api@sha256:" "$STANDARD"
grep -Fq "^ghcr\\.io/loselike/siyuan-db-migrate@sha256:" "$STANDARD"
grep -Fq "^ghcr\\.io/loselike/siyuan-web@sha256:" "$STANDARD"
grep -Fq 'gh attestation verify "oci://$verified_image"' "$STANDARD"
grep -Fq -- '--signer-workflow loselike/siyuan/.github/workflows/ci.yml' "$STANDARD"
grep -Fq -- '--source-digest "$GIT_COMMIT"' "$STANDARD"
grep -Fq -- '--source-ref refs/heads/main' "$STANDARD"
grep -Fq -- '--deny-self-hosted-runners' "$STANDARD"

set +e
bash "$WHITELIST" \
  --scope api \
  --file "$SCRIPT_DIR/../apps/api/src/main.ts" apps/api/src/main.ts MISSING \
  >"$tmp_dir/no-break-glass.out" 2>"$tmp_dir/no-break-glass.err"
status=$?
set -e
if [[ "$status" -ne 89 ]]; then
  cat "$tmp_dir/no-break-glass.err" >&2
  echo "Expected whitelist build policy to exit 89, got $status." >&2
  exit 1
fi
grep -Fq 'Whitelist runtime releases are break-glass only' "$tmp_dir/no-break-glass.err"

grep -Fq 'EMERGENCY_BUILD_REASON_SHA256=' "$WHITELIST"
grep -Fq 'build_provenance=EMERGENCY_SERVER_BUILD' "$WHITELIST"
grep -Fq 'emergency-build-start' "$WHITELIST"

echo '[release-build-policy] PASS'
