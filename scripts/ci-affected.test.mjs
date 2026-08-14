#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = mkdtempSync(join(tmpdir(), 'siyuan-ci-affected-'));
execFileSync('git', ['init', '-q'], { cwd: repo });
execFileSync('git', ['config', 'user.email', 'ci@example.invalid'], { cwd: repo });
execFileSync('git', ['config', 'user.name', 'CI'], { cwd: repo });
execFileSync('mkdir', ['-p', 'apps/api/src/modules/master-data/customer-source', 'apps/web/src', 'packages/shared/src'], { cwd: repo });
writeFileSync(join(repo, 'package.json'), '{}\n');
const customerSourcePath = join(repo, 'apps/api/src/modules/master-data/customer-source/customer-source.service.ts');
writeFileSync(customerSourcePath, 'export const api = 1;\n');
execFileSync('git', ['add', '.'], { cwd: repo });
execFileSync('git', ['commit', '-qm', 'base'], { cwd: repo });
writeFileSync(customerSourcePath, 'export const api = 2;\n');
execFileSync('git', ['add', '.'], { cwd: repo });
execFileSync('git', ['commit', '-qm', 'api'], { cwd: repo });

const script = new URL('./ci-affected.mjs', import.meta.url).pathname;
const plan = JSON.parse(execFileSync(process.execPath, [script, '--base', 'HEAD^', '--json'], { cwd: repo, encoding: 'utf8' }));
if (!plan.scopes.api || plan.scopes.web || plan.scopes.shared) throw new Error('API-only change was classified incorrectly');
if (plan.validationRules.join(',') !== 'customer-source') throw new Error('Customer source validation rule was not selected');
if (!plan.commands.some((item) => item.command.includes('customer-source.service.test.ts'))) throw new Error('Customer source effect test was not selected');
if (!plan.commands.some((item) => item.command.includes('CustomerSourcesPage.test.tsx'))) throw new Error('Customer source Web contract test was not selected');

mkdirSync(join(repo, '.github/workflows'), { recursive: true });
writeFileSync(join(repo, '.github/workflows/ci.yml'), 'name: ci\n');
execFileSync('git', ['add', '.'], { cwd: repo });
execFileSync('git', ['commit', '-qm', 'governance-only'], { cwd: repo });
const governancePlan = JSON.parse(execFileSync(process.execPath, [script, '--base', 'HEAD^', '--json'], { cwd: repo, encoding: 'utf8' }));
if (!governancePlan.scopes.governance || governancePlan.scopes.api || governancePlan.scopes.shared) {
  throw new Error('Governance-only change was classified incorrectly');
}
const governanceLabels = governancePlan.commands.map((item) => item.label);
if (governanceLabels.indexOf('shared-build') === -1 || governanceLabels.indexOf('prisma-generate') === -1) {
  throw new Error('Governance-only validation omitted shared/prisma prerequisites');
}
if (governanceLabels.indexOf('shared-build') > governanceLabels.indexOf('governance')) {
  throw new Error('Shared build must precede governance');
}
if (governanceLabels.indexOf('prisma-generate') > governanceLabels.indexOf('governance')) {
  throw new Error('Prisma generation must precede governance');
}
console.log('CI_AFFECTED_SELF_TEST_OK');
