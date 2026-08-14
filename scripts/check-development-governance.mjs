#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const requiredAgentFiles = [
  '.codex/config.toml',
  '.codex/agents/sunny_mapper.toml',
  '.codex/agents/sunny_frontend.toml',
  '.codex/agents/sunny_backend.toml',
  '.codex/agents/sunny_verifier.toml',
  '.codex/agents/sunny_reviewer.toml',
  '.codex/agents/sunny_risk_reviewer.toml'
];

const requiredMigrationFiles = [
  'apps/api/prisma/migrations/20260717160000_water_receipt_match_receivable_sources/migration.sql',
  'apps/api/prisma/migrations/20260719090000_markup_route_lookup_indexes/migration.sql',
  'apps/api/prisma/migrations/20260719143000_normalize_warehouse_package_received_status/migration.sql'
];

const requiredGovernanceFiles = [
  'scripts/check-context-governance.mjs',
  'scripts/archive-context.mjs',
  'scripts/check-architecture-governance.mjs',
  'scripts/architecture-baseline.mjs',
  'config/architecture/governance-baseline.json',
  'config/architecture/module-boundaries.json',
  'scripts/select-validation.mjs',
  'config/validation/path-test-map.json',
  'scripts/lib/docker-container-image-id.sh',
  'scripts/lib/47-release-images.sh',
  'scripts/release-image-fence.test.sh',
  'scripts/docker-container-image-id.test.sh',
  'scripts/release-fingerprint-artifact-filter.test.sh',
  'scripts/lib/47-release-ssh.sh',
  'scripts/release-ssh-policy.test.sh',
  'scripts/lib/release-source-policy.sh',
  'scripts/release-source-policy.test.sh',
  'scripts/ci-affected.mjs',
  'scripts/ci-affected.test.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/full-regression.yml'
];

const failures = [];

for (const path of [...requiredAgentFiles, ...requiredMigrationFiles, ...requiredGovernanceFiles]) {
  if (!existsSync(path)) failures.push(`required file is missing: ${path}`);
}

const devRules = readFileSync('docs/dev-thread-rules.md', 'utf8');
const agentRules = readFileSync('AGENTS.md', 'utf8');
const releaseRules = readFileSync('docs/47-cloud-docker-release.md', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const codexConfig = readFileSync('.codex/config.toml', 'utf8');
const contextCheckScript = readFileSync('scripts/check-context-governance.mjs', 'utf8');
for (const forbiddenLine of ['npm test', 'npm run test:web', 'npm run test:api']) {
  if (devRules.split(/\r?\n/).some((line) => line.trim() === forbiddenLine)) {
    failures.push(`unsafe command remains in docs/dev-thread-rules.md: ${forbiddenLine}`);
  }
}

for (const [path, content, requiredText] of [
  ['AGENTS.md', agentRules, '代码修改 -> 本地最小效果与安全验证 -> 必要审查 -> 精确发布 47 -> 47 线上 API/代码/容器验证 -> 汇报结果'],
  ['AGENTS.md', agentRules, 'Codex 不操作浏览器、不做截图验收'],
  ['AGENTS.md', agentRules, '由用户进行最终视觉验收'],
  ['AGENTS.md', agentRules, '验证码和浏览器点击耗时高、稳定性差'],
  ['AGENTS.md', agentRules, '定位根因 -> 修改代码 -> 最小相关本地验证 -> 重新精确发布 -> 重新线上验证'],
  ['AGENTS.md', agentRules, '发生 `stream disconnected`、工具中断、上下文恢复'],
  ['AGENTS.md', agentRules, '未取得真实页面截图不是阻断项'],
  ['AGENTS.md', agentRules, '47 是全局串行资源'],
  ['AGENTS.md', agentRules, '远端全链路发布锁'],
  ['AGENTS.md', agentRules, '不调用多个代理重复扫描同一范围'],
  ['AGENTS.md', agentRules, 'Codex 不会因 `AGENTS.md` 自动切换当前主线程模型'],
  ['AGENTS.md', agentRules, 'docs/archive/codex-state/'],
  ['AGENTS.md', agentRules, 'npm run context:check'],
  ['docs/dev-thread-rules.md', devRules, '无浏览器验收与 47 验证流程'],
  ['docs/dev-thread-rules.md', devRules, '47 发布使用单一全局队列'],
  ['docs/47-cloud-docker-release.md', releaseRules, '发布后验收只使用服务端和代码证据'],
  ['docs/47-cloud-docker-release.md', releaseRules, '线上验证失败不结束任务'],
  ['docs/47-cloud-docker-release.md', releaseRules, 'checksum 条件更新']
]) {
  if (!content.includes(requiredText)) failures.push(`${path} is missing acceptance rule: ${requiredText}`);
}

for (const requiredScript of ['context:check', 'context:archive', 'validation:select', 'release:47:baseline', 'release:47:manifest', 'audit:47:provenance', 'deploy:47:whitelist', 'architecture:check']) {
  if (!packageJson.scripts?.[requiredScript]) failures.push(`package.json is missing governance command: ${requiredScript}`);
}
if (!packageJson.scripts?.['governance:check']?.includes('npm run context:check')) {
  failures.push('governance:check must include context:check');
}
for (const requiredConfig of [
  'model = "gpt-5.6-terra"',
  'model_reasoning_effort = "medium"',
  '[models.new_thread]',
  'max_concurrent_threads_per_session = 2',
  'default_subagent_model = "gpt-5.6-luna"'
]) {
  if (!codexConfig.includes(requiredConfig)) failures.push(`.codex/config.toml is missing routing rule: ${requiredConfig}`);
}
for (const requiredContextRule of ['maxStateBytes = 16 * 1024', 'maxActiveFiles = 12', 'terminal and must be archived']) {
  if (!contextCheckScript.includes(requiredContextRule)) failures.push(`context governance is missing rule: ${requiredContextRule}`);
}

for (const forbiddenText of [
  '必须检查实际渲染页面或截图',
  'UI 重构默认只落本地',
  '并启动页面做浏览器验证',
  '未经用户确认直接发布 UI 重构到 47'
]) {
  if (agentRules.includes(forbiddenText) || devRules.includes(forbiddenText)) {
    failures.push(`obsolete browser/hold-before-release rule remains: ${forbiddenText}`);
  }
}

const deployScript = readFileSync('scripts/deploy-47.sh', 'utf8');
const syncScript = readFileSync('scripts/sync-47.sh', 'utf8');
const releaseLockScript = readFileSync('scripts/lib/47-release-lock.sh', 'utf8');
const releaseSshScript = readFileSync('scripts/lib/47-release-ssh.sh', 'utf8');
const releaseImageScript = readFileSync('scripts/lib/47-release-images.sh', 'utf8');
const whitelistDeployScript = readFileSync('scripts/deploy-47-whitelist.sh', 'utf8');
const casSyncScript = readFileSync('scripts/cas-sync-47-file.sh', 'utf8');
const captureBaselineScript = readFileSync('scripts/capture-47-release-baseline.sh', 'utf8');
const bootstrapMigrationExceptions = readFileSync('config/release/47-legacy-migration-checksums.tsv', 'utf8');
const bootstrapMigrationExceptionsSha256 = createHash('sha256').update(bootstrapMigrationExceptions).digest('hex');
const fingerprintScript = readFileSync('scripts/print-47-release-fingerprints.sh', 'utf8');
const resolveRecoveryScript = readFileSync('scripts/resolve-47-release-recovery.sh', 'utf8');
const containerImageIdScript = readFileSync('scripts/lib/docker-container-image-id.sh', 'utf8');
const runtimeManifestScript = readFileSync('scripts/capture-47-runtime-manifest.sh', 'utf8');
const releaseSourcePolicyScript = readFileSync('scripts/lib/release-source-policy.sh', 'utf8');
const provenanceAuditScript = readFileSync('scripts/audit-47-runtime-provenance.sh', 'utf8');
if (!syncScript.includes("--exclude='node_modules'") || !syncScript.includes("--exclude='node_modules/'")) {
  failures.push('47 sync must exclude node_modules directories and root symlinks');
}
const forceFullBlock = deployScript.match(/if \[\[ "\$FORCE_FULL" == true \]\]; then([\s\S]*?)\nfi/)?.[1] ?? '';
if (/MIGRATE_CHANGED=true/.test(forceFullBlock)) {
  failures.push('--full must not force Prisma migration execution');
}
if (!deployScript.includes('MIGRATION_REQUIRED=$DB_MIGRATION_REQUIRED')) {
  failures.push('deploy dry-run must print MIGRATION_REQUIRED');
}
if (!deployScript.includes('siyuan_47_assert_standard_release_source')
  || !whitelistDeployScript.includes('siyuan_47_assert_whitelist_release_source')
  || !releaseSourcePolicyScript.includes('main|codex/release/*')
  || !releaseSourcePolicyScript.includes('SIYUAN_47_EMERGENCY_RELEASE')) {
  failures.push('47 release entrypoints must enforce the unique main/release branch policy and explicit emergency CAS override');
}
for (const immutableImageGate of [
  '--image-manifest',
  'BUILD_MODE=',
  'immutable-image-promotion',
  'docker compose --profile tools pull',
  'docker compose up -d --no-build',
  'GHCR_DIGESTS',
  'IMAGE_MANIFEST_SHA256='
]) {
  if (!deployScript.includes(immutableImageGate)) failures.push(`immutable image promotion is missing gate: ${immutableImageGate}`);
}
if (!provenanceAuditScript.includes('immutable-image-provenance-mismatch')
  || !provenanceAuditScript.includes('GHCR_DIGESTS')) {
  failures.push('runtime provenance must validate immutable GHCR digest evidence');
}
if (!deployScript.includes('state/docs-only synchronization completed successfully; runtime release state was preserved.')
  || !deployScript.includes('SOURCE_BUNDLE_PATH_ARG="${SOURCE_BUNDLE_PATH:-__SIYUAN_NONE__}"')
  || !deployScript.includes('[ "$source_bundle_path" != __SIYUAN_NONE__ ] || source_bundle_path=""')) {
  failures.push('standard deploy must preserve runtime state for docs-only sync and transport empty source-bundle fields safely');
}
for (const bootstrapGate of [
  '--bootstrap-manifest',
  '--confirm-bootstrap',
  '--current-baseline-cutover',
  'BOOTSTRAP_REMOTE_BASELINE_DRIFT',
  'BOOTSTRAP_APPLIED_MIGRATION_SET_MISMATCH',
  'Bootstrap is only allowed for the explicitly frozen legacy-untraceable runtime.'
]) {
  if (!deployScript.includes(bootstrapGate)) failures.push(`bootstrap cutover is missing fail-closed gate: ${bootstrapGate}`);
}
for (const currentCutoverGate of [
  'Current baseline cutover requires --bootstrap-manifest, --confirm-bootstrap and --source-bundle.',
  'manifest_format_version" != "3"',
  'bootstrap_capture_format=3',
  'bootstrap_status" == traceable',
  'chmod -R u+w "$BOOTSTRAP_RUNTIME_TMP"'
]) {
  if (!deployScript.includes(currentCutoverGate)) failures.push(`current baseline cutover is missing fail-closed gate: ${currentCutoverGate}`);
}
for (const sourceBundleGate of [
  '--source-bundle',
  'git bundle create',
  'git bundle verify',
  'git bundle list-heads',
  'init --bare',
  'must be read-only',
  '.release-bundles/',
  'SOURCE_PROVENANCE="GIT_BUNDLE"'
]) {
  if (!deployScript.includes(sourceBundleGate) && !fingerprintScript.includes(sourceBundleGate)) {
    failures.push(`GitHub-independent deploy is missing durable source bundle gate: ${sourceBundleGate}`);
  }
}
const imageMismatchGateIndex = provenanceAuditScript.indexOf('if [[ -z "$web_image_expected"');
const whitelistSourceGateIndex = provenanceAuditScript.indexOf('elif [[ "$source_mode" == WHITELIST_CAS ]]');
if (imageMismatchGateIndex < 0 || whitelistSourceGateIndex < 0 || imageMismatchGateIndex > whitelistSourceGateIndex) {
  failures.push('runtime provenance must report running-image mismatch before classifying whitelist source provenance');
}
if (!provenanceAuditScript.includes('release-source-bundle-checksum-mismatch')
  || !provenanceAuditScript.includes('release-source-bundle-is-writable')
  || !provenanceAuditScript.includes('init --bare')
  || !provenanceAuditScript.includes('git bundle list-heads')
  || !syncScript.includes("--exclude='.release-bundles/'")) {
  failures.push('durable source bundles must be checksum-audited and excluded from source mirroring');
}
if (!deployScript.includes('47-legacy-migration-checksums.tsv')
  || !deployScript.includes('13e4dcb6aabeef0ba3585de72c105f4b7bb48c24d1159b3579e403aea2746a84')
  || bootstrapMigrationExceptionsSha256 !== '13e4dcb6aabeef0ba3585de72c105f4b7bb48c24d1159b3579e403aea2746a84') {
  failures.push('bootstrap cutover must bind the exact reviewed legacy migration checksum exceptions');
}
if (!deployScript.includes('DIRTY_RUNTIME_COUNT=$DIRTY_RUNTIME_COUNT') || !deployScript.includes('Refusing deploy:47 apply because the runtime worktree is dirty.')) {
  failures.push('deploy:47 must fail closed on a dirty runtime worktree');
}
if (!deployScript.includes('requires a completely clean release-coordinator worktree') || !deployScript.includes('git diff --name-only HEAD')) {
  failures.push('deploy:47 must reject staged, unstaged and untracked candidate changes');
}
if (!syncScript.includes("--exclude='.release-backups/'")) {
  failures.push('sync:47 must preserve remote .release-backups');
}
if (!syncScript.includes("--exclude='/.release-current'") || !syncScript.includes("--exclude='/.release-staging/'")) {
  failures.push('sync:47 must preserve the active release pointer and recovery staging evidence');
}
if (!syncScript.includes("--exclude='.git'") || !syncScript.includes("--exclude='.git/'")) {
  failures.push('sync:47 must exclude both a standard .git directory and a worktree .git pointer file');
}
if (!syncScript.includes("--exclude='.siyuan-release-lock/'")) {
  failures.push('sync:47 must preserve the active remote release lock directory during exact-tree deletion');
}
if (!syncScript.includes("--exclude='.siyuan-release-recovery-required'")) {
  failures.push('sync:47 must preserve the fail-closed release recovery marker');
}
if (!syncScript.includes('SIYUAN_47_EXPECTED_RELEASE_ID') || !syncScript.includes('RSYNC_DELETE=(--delete)')) {
  failures.push('standard exact-tree sync must require the captured release baseline before applying deletions');
}
if (!syncScript.includes("--exclude='.codex-release-staging/'") || !syncScript.includes("--exclude='tmp/'")) {
  failures.push('sync:47 must preserve release staging and temporary candidate directories');
}
if (!syncScript.includes("--exclude='.release-manifests/'") || !syncScript.includes("--exclude='.release-receipts/'")) {
  failures.push('sync:47 must preserve immutable release manifests and receipts');
}
if (!syncScript.includes("--exclude='.release-whitelist.lock'")) {
  failures.push('sync:47 must preserve the whitelist coordination marker');
}
if (!syncScript.includes("--exclude='docs/release-manifests/'") || !syncScript.includes("--exclude='config/'")) {
  failures.push('sync:47 must preserve local/remote evidence and configuration namespaces');
}
if (!deployScript.includes('siyuan_47_acquire_release_lock') || deployScript.indexOf('siyuan_47_acquire_release_lock') > deployScript.indexOf('REMOTE_STATE=')) {
  failures.push('deploy:47 must acquire the global release lock before reading remote release state');
}
if (!deployScript.includes('REMOTE_RELEASE_BASELINE_MISMATCH') || !deployScript.includes('--expected-release-id')) {
  failures.push('standard deploy must reject a candidate whose captured 47 release baseline changed');
}
if (!deployScript.includes('audit-47-runtime-provenance.sh" --require-traceable') || !captureBaselineScript.includes('audit-47-runtime-provenance.sh" --require-traceable')) {
  failures.push('standard baseline capture and deploy must block untraceable remote runtime state');
}
if (!deployScript.includes('REMOTE_RELEASE_MANIFEST_MISMATCH') || deployScript.lastIndexOf('.siyuan-release-state') < deployScript.lastIndexOf('curl --retry 10')) {
  failures.push('standard deploy must verify the remote manifest and write success state only after public health checks');
}
for (const requiredReceiptField of ['SOURCE_MODE=GIT_SOURCE_BUILD', 'GIT_COMMIT=$git_commit', 'WEB_IMAGE_ID=$web_image_id', 'API_IMAGE_ID=$api_image_id', 'RELEASE_RECEIPT_SHA256=$receipt_sha256']) {
  if (!deployScript.includes(requiredReceiptField)) {
    failures.push(`standard deploy receipt is missing field: ${requiredReceiptField}`);
  }
}
if (!deployScript.includes('.release-receipts') || !deployScript.includes('Immutable release receipt already exists with different content')) {
  failures.push('standard deploy must write an immutable, conflict-detecting release receipt');
}
if (!deployScript.includes('requires an attached Git branch and a full source commit')) {
  failures.push('standard deploy must reject detached or invalid Git candidates');
}
if (!deployScript.includes('requires HEAD to match the durable origin branch exactly') || !captureBaselineScript.includes('requires HEAD to match the durable origin branch exactly')) {
  failures.push('standard release candidates must be recoverable from an exact durable origin branch');
}
if (!deployScript.includes('Release receipt directory must not be a symlink') || !deployScript.includes('Existing release receipt must be read-only')) {
  failures.push('standard release receipts must reject symlink escapes and writable prior receipts');
}
if (!whitelistDeployScript.includes('SOURCE_MODE=WHITELIST_CAS')) {
  failures.push('whitelist releases must identify their non-Git source mode explicitly');
}
if (!deployScript.includes('Standard deploy does not execute an implicit pending migration set.')) {
  failures.push('standard deploy must route reviewed migrations through the pending-set-aware whitelist flow');
}
if (!captureBaselineScript.includes('siyuan_47_acquire_release_lock') || !captureBaselineScript.includes('EXPECTED_RELEASE_ID=')) {
  failures.push('47 baseline capture must read the release ID under the global lock');
}
if (!captureBaselineScript.includes('RELEASE_BASELINE_TREE_MISMATCH') || !captureBaselineScript.includes('BASELINE_RECEIPT=') || !deployScript.includes('git merge-base --is-ancestor')) {
  failures.push('standard release baseline must bind an exact remote tree to the same worktree branch and ancestor commit');
}
if ((captureBaselineScript.match(/siyuan_47_ssh_bounded_remote/g) ?? []).length !== 2
  || !captureBaselineScript.includes('bash -s -- "$SIYUAN_47_DIR/.siyuan-release-state"')
  || !captureBaselineScript.includes('env "SIYUAN_RELEASE_REPO_ROOT=$SIYUAN_47_DIR" bash -s')) {
  failures.push('47 baseline capture must bound remote reads and SSH channel EOF waits');
}
if (!syncScript.includes('siyuan_47_verify_release_lock')) {
  failures.push('sync:47 apply must verify the global release lock');
}
if (!releaseLockScript.includes('.siyuan-release-lock') || !releaseLockScript.includes('SIYUAN_47_RELEASE_LOCK_WAIT_SECONDS')) {
  failures.push('47 release lock helper must provide one remote queue lock with bounded waiting');
}
if (!releaseLockScript.includes('heartbeat_at') || !releaseLockScript.includes('siyuan_47_start_release_lock_heartbeat')) {
  failures.push('47 release lock must expose a heartbeat for audited stale-lock recovery');
}
if (!releaseLockScript.includes('47-release-ssh.sh')
  || !releaseSshScript.includes('ServerAliveInterval')
  || !releaseSshScript.includes('ServerAliveCountMax')
  || !releaseSshScript.includes('siyuan_47_scp')) {
  failures.push('47 release SSH/SCP must share bounded connect and keepalive policy');
}
for (const releaseScript of [deployScript, whitelistDeployScript]) {
  if (!releaseScript.includes('siyuan_47_run_bounded_build docker compose build')
    || !releaseScript.includes('SIYUAN_47_BUILD_TIMEOUT_SECONDS:-1800')
    || !releaseScript.includes('siyuan_47_record_release_phase build-start')
    || !releaseScript.includes('siyuan_47_record_release_phase health-complete')) {
    failures.push('47 runtime build paths must emit phases and enforce a bounded plain-progress build');
  }
}
if (!releaseSshScript.includes('timeout --signal=TERM --kill-after=60')
  || !releaseSshScript.includes('RELEASE_BUILD_TIMEOUT')
  || !releaseSshScript.includes('RELEASE_MIGRATION_TIMEOUT')
  || !releaseSshScript.includes('manual_database_verification=required')
  || !releaseSshScript.includes('ChannelTimeout=session=')
  || !releaseSshScript.includes('ssh -G')
  || !releaseLockScript.includes('remote_phase=$remote_phase')) {
  failures.push('47 failed releases must retain the bounded-build and last-remote-phase recovery evidence');
}
for (const releaseScript of [deployScript, whitelistDeployScript]) {
  if (!releaseScript.includes('siyuan_47_ssh_bounded_remote "$SIYUAN_47_REMOTE_RELEASE_TIMEOUT_SECONDS"')) {
    failures.push('47 release paths must bound the complete remote runtime command');
  }
  if (!releaseScript.includes('SIYUAN_47_REMOTE_STATE_TIMEOUT_SECONDS')) {
    failures.push('47 release paths must bound the remote success-state command');
  }
  if (!releaseScript.includes('siyuan_47_run_bounded_migration docker compose')) {
    failures.push('47 migration paths must have an independent timeout and manual-verification failure mode');
  }
}
if (!releaseLockScript.includes('RELEASE_RECOVERY_REQUIRED') || !releaseLockScript.includes('exit 81')) {
  failures.push('47 release queue must block after an unresolved post-mutation failure');
}
if (!releaseImageScript.includes('RELEASE_IMAGE_FENCE_MISMATCH')
  || !releaseImageScript.includes('.Descriptor.digest')
  || !releaseImageScript.includes('siyuan_47_capture_release_image_ids')
  || !releaseImageScript.includes('siyuan_47_verify_release_image_ids')
  || !deployScript.includes('siyuan_47_export_release_images "$RELEASE_ID"')
  || !whitelistDeployScript.includes('siyuan_47_export_release_images "$whitelist_release_id"')
  || !whitelistDeployScript.includes('RELEASE_IMAGE_EXPORT_MISMATCH')
  || !whitelistDeployScript.includes('RELEASE_CONTAINER_IMAGE_FENCE_MISMATCH')
  || !whitelistDeployScript.includes('APPROVED_MIGRATIONS_ARG="${APPROVED_MIGRATIONS_CSV:-__SIYUAN_EMPTY__}"')
  || !whitelistDeployScript.includes('RELEASE_ID_ARGUMENT_INVALID')
  || !whitelistDeployScript.includes('COMPOSE_CREATED_REPLACEMENT_REMOVED')
  || !whitelistDeployScript.includes('COMPOSE_RECREATE_RETRY_REFUSED')
  || !whitelistDeployScript.includes('COMPOSE_RECREATE_RETRY=once')
  || !whitelistDeployScript.includes('SOURCE_ROLLBACK_REQUIRED=true')
  || !whitelistDeployScript.includes('WHITELIST_SOURCE_SNAPSHOT_CAPTURE_FAILED')
  || !whitelistDeployScript.includes('verify-release-source-snapshot.sh')
  || !whitelistDeployScript.includes("docker inspect --format '{{.Config.Image}}'")) {
  failures.push('47 runtime releases must use release-scoped images and verify build IDs plus running container references');
}
if (!resolveRecoveryScript.includes('--expected-marker-sha') || !resolveRecoveryScript.includes('--confirm-recovered')) {
  failures.push('release recovery marker must only clear through an explicit checksum-bound resolution command');
}
if (!whitelistDeployScript.includes('siyuan_47_acquire_release_lock') || !whitelistDeployScript.includes('cas-sync-47-file.sh')) {
  failures.push('whitelist deploy must hold the global release lock while applying CAS candidates');
}
if (!whitelistDeployScript.includes('--preflight-only') || !whitelistDeployScript.includes('Duplicate whitelist target is not allowed')) {
  failures.push('whitelist deploy must preflight every checksum before the first mutation and reject duplicate targets');
}
if (!whitelistDeployScript.includes('Whitelist scope mismatch') || !whitelistDeployScript.includes('WHITELIST_RELEASE_ID')) {
  failures.push('whitelist deploy must derive scope from targets and advance the remote release baseline');
}
if (!whitelistDeployScript.includes('RUNTIME_IMAGE_STATE_MISMATCH')
  || !whitelistDeployScript.includes('RUNTIME_IMAGE_UNAVAILABLE')
  || !whitelistDeployScript.includes('--adopt-current-runtime')
  || !whitelistDeployScript.includes('Runtime adoption may only publish release-governance scripts')
  || !whitelistDeployScript.includes('reviewed-zero-build-governance-release')) {
  failures.push('whitelist deploy must fail closed on release-state image drift and tightly scope explicit runtime adoption');
}
if (!whitelistDeployScript.includes('WEB_FINGERPRINT=$web_fingerprint') || !whitelistDeployScript.includes('MIGRATE_FINGERPRINT=$migrate_fingerprint')) {
  failures.push('whitelist success state must use fingerprints recomputed from the actual remote tree');
}
if (!containerImageIdScript.includes('ImageManifestDescriptor')
  || !containerImageIdScript.includes('{{else}}{{.Image}}')
  || !whitelistDeployScript.includes('siyuan_docker_container_image_id')
  || !deployScript.includes('siyuan_docker_container_image_id')
  || !provenanceAuditScript.includes('siyuan_docker_container_image_id')
  || !runtimeManifestScript.includes('siyuan_docker_container_image_id')
  || !runtimeManifestScript.includes('SIYUAN_47_CAPTURE_FORMAT:-3')
  || !deployScript.includes('SIYUAN_47_CAPTURE_FORMAT=2')) {
  failures.push('release state, provenance audit and default runtime capture must share runnable Docker manifest identity while preserving the frozen v2 bootstrap verifier');
}
if (!fingerprintScript.includes('scope_hash web') || !fingerprintScript.includes('scope_hash migrate')) {
  failures.push('portable release fingerprint helper must cover web, api and migration manifests');
}
if (!fingerprintScript.includes('*/._*') || !deployScript.includes('*/._*')) {
  failures.push('release fingerprints must ignore AppleDouble metadata in portable and standard deploy implementations');
}
if (!syncScript.includes("--exclude='._*'") || !syncScript.includes('COPYFILE_DISABLE=1') || !syncScript.includes('COPY_EXTENDED_ATTRIBUTES_DISABLE=1')) {
  failures.push('source synchronization must neither transfer nor synthesize AppleDouble metadata');
}
if (fingerprintScript.includes('*/test-support/*') || fingerprintScript.includes('*/testSupport/*') || deployScript.includes('*/test-support/*') || deployScript.includes('*/testSupport/*')) {
  failures.push('release fingerprints must include non-test files under test-support because API TypeScript compiles all src/**/*.ts');
}
if (!whitelistDeployScript.includes('PENDING_MIGRATION_SET_MISMATCH') || !whitelistDeployScript.includes('APPROVED_MIGRATIONS_CSV')) {
  failures.push('whitelist migration release must reject an unapproved remote pending-migration set');
}
if (!whitelistDeployScript.includes('Migration whitelist must include schema.prisma')) {
  failures.push('migration whitelist must not publish schema-only or migration-only candidates');
}
if (!whitelistDeployScript.includes('Reviewed migration target must be exactly') || !whitelistDeployScript.includes('APPROVED_MIGRATION_CHECKSUM_MISMATCH')) {
  failures.push('approved migrations must bind exact migration.sql targets and candidate checksums');
}
if (!whitelistDeployScript.includes('Infrastructure target requires a separately reviewed full/infra release path') || !deployScript.includes('docker-compose.yml requires a separately reviewed full/infra release path')) {
  failures.push('generic standard/whitelist flows must reject infrastructure-wide Compose changes');
}
if (!whitelistDeployScript.includes('CAS_BATCH_ROLLED_BACK') || !whitelistDeployScript.includes('CAS_PHASE')) {
  failures.push('multi-file whitelist CAS must rollback earlier replacements when the batch mutation phase fails');
}
if (!casSyncScript.includes('REMOTE_CHECKSUM_MISMATCH') || !casSyncScript.includes('siyuan_47_verify_release_lock')) {
  failures.push('whitelist file sync must fail closed on remote checksum changes and verify lock ownership');
}
if (!casSyncScript.includes('readlink -f') || !casSyncScript.includes('mv -T')) {
  failures.push('whitelist CAS must reject symlink/path escapes and replace only a regular-file target');
}

for (const path of requiredAgentFiles) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf8');
  if (/(api[_-]?key|jwt[_-]?secret|password)\s*=\s*["'][^<][^"']+/i.test(content)) {
    failures.push(`possible secret assignment in ${path}`);
  }
}

for (const path of ['.codex/artifacts/example.png', '.codex/runtime/session.json', '.codex/tmp/state']) {
  try {
    execFileSync('git', ['check-ignore', '-q', path], { stdio: 'ignore' });
  } catch {
    failures.push(`gitignore does not protect ${path}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`[governance:check] ${failure}`);
  process.exit(1);
}

console.log('[governance:check] PASS');
