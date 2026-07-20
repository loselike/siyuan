#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

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

const failures = [];

for (const path of [...requiredAgentFiles, ...requiredMigrationFiles]) {
  if (!existsSync(path)) failures.push(`required file is missing: ${path}`);
}

const devRules = readFileSync('docs/dev-thread-rules.md', 'utf8');
const agentRules = readFileSync('AGENTS.md', 'utf8');
const releaseRules = readFileSync('docs/47-cloud-docker-release.md', 'utf8');
for (const forbiddenLine of ['npm test', 'npm run test:web', 'npm run test:api']) {
  if (devRules.split(/\r?\n/).some((line) => line.trim() === forbiddenLine)) {
    failures.push(`unsafe command remains in docs/dev-thread-rules.md: ${forbiddenLine}`);
  }
}

for (const [path, content, requiredText] of [
  ['AGENTS.md', agentRules, '代码修改 -> 本地最小效果与安全验证 -> 必要审查 -> 精确发布 47 -> 47 线上 API/代码/容器验证 -> 汇报结果'],
  ['AGENTS.md', agentRules, 'Codex 不操作浏览器、不做截图验收'],
  ['AGENTS.md', agentRules, '由用户进行最终视觉验收'],
  ['docs/dev-thread-rules.md', devRules, '无浏览器验收与 47 验证流程'],
  ['docs/47-cloud-docker-release.md', releaseRules, '发布后验收只使用服务端和代码证据']
]) {
  if (!content.includes(requiredText)) failures.push(`${path} is missing acceptance rule: ${requiredText}`);
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
const forceFullBlock = deployScript.match(/if \[\[ "\$FORCE_FULL" == true \]\]; then([\s\S]*?)\nfi/)?.[1] ?? '';
if (/MIGRATE_CHANGED=true/.test(forceFullBlock)) {
  failures.push('--full must not force Prisma migration execution');
}
if (!deployScript.includes('MIGRATION_REQUIRED=$MIGRATE_CHANGED')) {
  failures.push('deploy dry-run must print MIGRATION_REQUIRED');
}
if (!deployScript.includes('DIRTY_RUNTIME_COUNT=$DIRTY_RUNTIME_COUNT') || !deployScript.includes('Refusing deploy:47 apply because the runtime worktree is dirty.')) {
  failures.push('deploy:47 must fail closed on a dirty runtime worktree');
}
if (!syncScript.includes("--exclude='.release-backups/'")) {
  failures.push('sync:47 must preserve remote .release-backups');
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
