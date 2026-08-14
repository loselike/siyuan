#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = mkdtempSync(join(tmpdir(), 'siyuan-ci-affected-'));
execFileSync('git', ['init', '-q'], { cwd: repo });
execFileSync('git', ['config', 'user.email', 'ci@example.invalid'], { cwd: repo });
execFileSync('git', ['config', 'user.name', 'CI'], { cwd: repo });
execFileSync('mkdir', ['-p', 'apps/api/src', 'apps/web/src', 'packages/shared/src'], { cwd: repo });
writeFileSync(join(repo, 'package.json'), '{}\n');
writeFileSync(join(repo, 'apps/api/src/example.ts'), 'export const api = 1;\n');
execFileSync('git', ['add', '.'], { cwd: repo });
execFileSync('git', ['commit', '-qm', 'base'], { cwd: repo });
writeFileSync(join(repo, 'apps/api/src/example.ts'), 'export const api = 2;\n');
execFileSync('git', ['add', '.'], { cwd: repo });
execFileSync('git', ['commit', '-qm', 'api'], { cwd: repo });

const script = new URL('./ci-affected.mjs', import.meta.url).pathname;
const plan = JSON.parse(execFileSync(process.execPath, [script, '--base', 'HEAD^', '--json'], { cwd: repo, encoding: 'utf8' }));
if (!plan.scopes.api || plan.scopes.web || plan.scopes.shared) throw new Error('API-only change was classified incorrectly');
if (!plan.commands.some((item) => item.label === 'api-tests')) throw new Error('API test command was not selected');
if (plan.commands.some((item) => item.label === 'web-tests')) throw new Error('Web tests were selected for API-only change');
console.log('CI_AFFECTED_SELF_TEST_OK');
