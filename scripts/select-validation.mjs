#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../config/validation/path-test-map.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const json = args.includes('--json');
const selfTest = args.includes('--self-test');
const baseIndex = args.indexOf('--base');
const base = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
const explicitPaths = args.filter((arg, index) => !arg.startsWith('--') && !(baseIndex >= 0 && index === baseIndex + 1));

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replaceAll('**', '::DOUBLE_STAR::').replaceAll('*', '[^/]*').replaceAll('::DOUBLE_STAR::', '.*')}$`);
}

function select(paths) {
  const matches = config.rules.filter((rule) => rule.patterns.some((pattern) => {
    const matcher = globToRegExp(pattern);
    return paths.some((path) => matcher.test(path));
  }));
  const specific = matches.filter((rule) => !['api', 'web', 'shared'].includes(rule.id));
  const selected = specific.length ? specific : matches;
  return {
    paths,
    rules: selected.map((rule) => rule.id),
    risks: [...new Set(selected.map((rule) => rule.risk))],
    effect: [...new Set(selected.flatMap((rule) => rule.effect))],
    safety: ['git diff --check', ...new Set(selected.flatMap((rule) => rule.safety).filter((command) => command !== 'git diff --check'))]
  };
}

if (selfTest) {
  const finance = select(['apps/api/src/modules/finance/catalog/finance-catalog.service.ts']);
  const prisma = select(['apps/api/prisma/schema.prisma']);
  const genericWeb = select(['apps/web/src/modules/orders/OrdersPage.tsx']);
  const financeWeb = select(['apps/web/src/modules/finance/FinanceCatalogPage.tsx']);
  const unrelatedFinanceWeb = select(['apps/web/src/modules/finance/waterReceipt/WaterReceiptPage.tsx']);
  if (finance.rules.join(',') !== 'finance-catalog-api') throw new Error('finance catalog API mapping failed');
  if (financeWeb.rules.join(',') !== 'finance-catalog-web') throw new Error('finance catalog Web mapping failed');
  if (unrelatedFinanceWeb.rules.join(',') !== 'web') throw new Error('unrelated Finance Web mapping must use generic Web rule');
  if (!prisma.risks.includes('MODEL_ESCALATION_REQUIRED')) throw new Error('Prisma escalation mapping failed');
  if (genericWeb.rules.join(',') !== 'web') throw new Error('generic Web mapping failed');
  console.log('VALIDATION_SELECTOR_SELF_TEST_OK');
  process.exit(0);
}

let paths = explicitPaths;
if (!paths.length) {
  const gitArgs = base ? ['diff', '--name-only', `${base}...HEAD`] : ['diff', '--name-only', 'HEAD'];
  paths = execFileSync('git', gitArgs, { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

const result = select(paths);
if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (!paths.length) {
  console.log('VALIDATION_SELECTION_EMPTY');
} else {
  console.log(`VALIDATION_PATHS=${paths.length}`);
  console.log(`RULES=${result.rules.join(',') || 'unmapped'}`);
  console.log(`RISK=${result.risks.join(',') || 'unmapped'}`);
  console.log('EFFECT');
  for (const command of result.effect) console.log(`- ${command}`);
  console.log('SAFETY');
  for (const command of result.safety) console.log(`- ${command}`);
}
