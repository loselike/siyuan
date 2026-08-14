#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const json = args.includes('--json');
const baseIndex = args.indexOf('--base');
const timingIndex = args.indexOf('--timings');
const base = baseIndex >= 0 ? args[baseIndex + 1] : process.env.SIYUAN_CI_BASE || 'HEAD^';
const timingPath = timingIndex >= 0
  ? resolve(args[timingIndex + 1])
  : resolve(process.env.RUNNER_TEMP || '/tmp', 'siyuan-ci-affected-timings.json');
const selectorPath = fileURLToPath(new URL('./select-validation.mjs', import.meta.url));

function changedPaths() {
  try {
    return execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean);
  }
}

const paths = changedPaths();
const touches = (prefix) => paths.some((path) => path === prefix || path.startsWith(`${prefix}/`));
const rootRuntime = paths.some((path) => [
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
  'Dockerfile.api',
  'Dockerfile.web',
  'docker-compose.yml',
  '.dockerignore'
].includes(path));
const shared = rootRuntime || touches('packages/shared');
const api = rootRuntime || shared || touches('apps/api');
const web = rootRuntime || shared || touches('apps/web');
const prisma = touches('apps/api/prisma');
const governance = rootRuntime || paths.some((path) =>
  path === 'AGENTS.md'
  || path.startsWith('.github/')
  || path.startsWith('.codex/')
  || path.startsWith('scripts/')
  || path.startsWith('config/')
  || path === 'docs/dev-thread-rules.md'
);

const commands = [];
const add = (label, command, commandArgs) => commands.push({ label, command, args: commandArgs });
const addShell = (label, shell) => commands.push({ label, shell });
add('diff-check', 'git', ['diff', '--check', base, 'HEAD']);
// Governance includes the security contract test, which imports Prisma and the
// built Shared package even when the changed files are only workflow/scripts.
// Keep those prerequisites in the plan so a governance-only PR is reproducible.
if (api || web || shared || governance) add('shared-build', 'npm', ['run', 'build', '-w', '@siyuan/shared']);
if (prisma || api || governance) add('prisma-generate', 'npm', ['run', 'prisma:generate', '-w', '@siyuan/api']);
if (api) add('api-typecheck', 'npm', ['run', 'typecheck', '-w', '@siyuan/api']);
if (web) add('web-typecheck', 'npm', ['run', 'typecheck', '-w', '@siyuan/web']);
const selection = JSON.parse(execFileSync(process.execPath, [selectorPath, '--json', ...paths], { encoding: 'utf8' }));
const concreteEffects = [...new Set(selection.effect.filter((command) => (
  !command.includes('<') && command !== 'npm run governance:check'
)))];
for (const [index, command] of concreteEffects.entries()) addShell(`effect-${index + 1}`, command);
if (governance) add('governance', 'npm', ['run', 'governance:check']);
if (!api && !web && !shared && !governance) add('context-governance', 'npm', ['run', 'context:check']);

const plan = {
  base,
  paths,
  scopes: { shared, api, web, prisma, governance },
  validationRules: selection.rules,
  commands: commands.map((item) => ({
    label: item.label,
    command: item.shell ?? [item.command, ...item.args].join(' ')
  }))
};

if (!execute) {
  console.log(json ? JSON.stringify(plan, null, 2) : plan.commands.map((item) => `${item.label}: ${item.command}`).join('\n'));
  process.exit(0);
}

const startedAt = new Date().toISOString();
const timings = [];
for (const item of commands) {
  const start = performance.now();
  const result = item.shell
    ? spawnSync('/bin/sh', ['-lc', item.shell], { stdio: 'inherit', env: process.env })
    : spawnSync(item.command, item.args, { stdio: 'inherit', env: process.env });
  const durationMs = Math.round(performance.now() - start);
  timings.push({ label: item.label, durationMs, exitCode: result.status ?? 1 });
  if (result.status !== 0) {
    mkdirSync(dirname(timingPath), { recursive: true });
    writeFileSync(timingPath, `${JSON.stringify({ ...plan, startedAt, finishedAt: new Date().toISOString(), timings }, null, 2)}\n`);
    process.exit(result.status ?? 1);
  }
}
mkdirSync(dirname(timingPath), { recursive: true });
writeFileSync(timingPath, `${JSON.stringify({ ...plan, startedAt, finishedAt: new Date().toISOString(), timings }, null, 2)}\n`);
console.log(`CI_AFFECTED_OK timings=${timingPath}`);
